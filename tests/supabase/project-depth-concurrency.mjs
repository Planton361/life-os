import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";

const container = process.argv[2];
if (!/^supabase_db_life-os-(sr104b-target|z1-e2e-)/.test(container ?? "")) {
  throw new Error("Canonical local or disposable Life OS database container required");
}
const args = ["exec", "-i", container, "psql", "-X", "-qAt", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"];
function run(sql) {
  const result = spawnSync("docker", args, { input: sql, encoding: "utf8", timeout: 10000 });
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout.trim();
}
function runFailure(sql, pattern) {
  const result = spawnSync("docker", args, { input: sql, encoding: "utf8", timeout: 10000 });
  assert.notEqual(result.status, 0, "Concurrent command unexpectedly committed");
  assert.match(result.stderr, pattern);
}
const userId = randomUUID();
const projectId = randomUUID();
const archiveProjectId = randomUUID();
const resourceId = randomUUID();
const auth = `set local role authenticated;select set_config('request.jwt.claim.sub','${userId}',true);`;
const commandFor = (id, key, operation, revision, cycle, payload) =>
  `select public.project_depth_command('${id}','${key}','${operation}',${revision},${cycle},'${JSON.stringify(payload).replaceAll("'", "''")}'::jsonb)`;
const command = (key, operation, revision, cycle, payload) =>
  commandFor(projectId, key, operation, revision, cycle, payload);
async function hold(sql) {
  const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
  const barrier = new Promise((resolve, reject) => {
    child.stdout.on("data", (chunk) => {
      if (chunk.toString().includes("COMMAND_HELD")) resolve();
    });
    child.on("error", reject);
  });
  const exit = new Promise((resolve) => child.on("close", resolve));
  child.stdin.end(`begin;${auth}${sql};select 'COMMAND_HELD';select pg_sleep(1);commit;`);
  await Promise.race([barrier, exit.then(() => { throw new Error(`First writer exited before barrier: ${stderr}`); })]);
  return async () => assert.equal(await exit, 0, stderr);
}

try {
  run(`insert into auth.users(instance_id,id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
    values('${userId}','${userId}','authenticated','authenticated','project-depth-${userId}@example.test',
    '{"provider":"email","providers":["email"]}','{}',now(),now());
    insert into public.projects(id,user_id,title,status) values('${projectId}','${userId}','Concurrency fixture','active');`);
  let revision = 0;
  run(`begin;${auth}${command(randomUUID(),"result.set",revision,0,{desired_result:"Concurrency result"})};commit;`);
  revision = Number(run(`select completion_revision from public.projects where id='${projectId}';`));
  const criterionResult = run(`begin;${auth}${command(randomUUID(),"criterion.create",revision,0,{text:"Criterion satisfied",sort_order:0})};commit;`);
  const criterionId = JSON.parse(criterionResult.split("\n").find((line) => line.startsWith("{"))).criterion_id;
  revision = Number(run(`select completion_revision from public.projects where id='${projectId}';`));
  let context = JSON.parse(run(`begin;${auth}select public.project_review_context('${projectId}');commit;`).split("\n").find((line) => line.startsWith("{")));
  const payload = {
    fingerprint: context.fingerprint, decision: "completed", result_accepted: true,
    rationale: "Concurrent acceptance", criteria: [{ id: criterionId, assessment: "satisfied" }],
    archived_ids: [], resource_ids: [], open_work_acknowledged: false,
  };
  const firstKey = randomUUID();
  const release = await hold(command(firstKey,"review.submit",revision,0,payload));
  runFailure(`begin;${auth}${command(randomUUID(),"review.submit",revision,0,payload)};commit;`, /PROJECT_STALE|could not serialize access/);
  await release();
  assert.equal(Number(run(`select count(*) from public.project_reviews where project_id='${projectId}' and decision='completed';`)), 1);
  const retry = run(`begin;${auth}${command(firstKey,"review.submit",revision,0,payload)};commit;`);
  assert.match(retry, /review_id/);
  runFailure(`begin;${auth}${command(firstKey,"review.submit",revision,0,{...payload,rationale:"Different payload"})};commit;`, /PROJECT_COMMAND_KEY_CONFLICT/);
  console.log("PASS concurrent completion, same-key retry, different-payload conflict");

  revision = Number(run(`select completion_revision from public.projects where id='${projectId}';`));
  const reopenKey = randomUUID();
  const releaseReopen = await hold(command(reopenKey,"project.reopen",revision,0,{}));
  runFailure(`begin;${auth}${command(randomUUID(),"project.reopen",revision,0,{})};commit;`, /PROJECT_STALE|could not serialize access/);
  await releaseReopen();
  assert.equal(Number(run(`select completion_cycle from public.projects where id='${projectId}';`)), 1);
  assert.equal(Number(run(`select count(*) from public.project_lifecycle_events where project_id='${projectId}' and event_type='reopened';`)), 1);
  console.log("PASS concurrent Reopen and monotone cycle");

  run(`begin;${auth}insert into public.resources(id,user_id,title,type,url)
    values('${resourceId}','${userId}','Evidence before edit','link','https://example.org/evidence');
    select public.set_project_resource_role('${projectId}','${resourceId}','reference');commit;`);
  revision = Number(run(`select completion_revision from public.projects where id='${projectId}';`));
  context = JSON.parse(run(`begin;${auth}select public.project_review_context('${projectId}');commit;`).split("\n").find((line) => line.startsWith("{")));
  const evidencePayload = {
    fingerprint: context.fingerprint, decision: "continue", result_accepted: false,
    rationale: "Evidence race", criteria: [{ id: criterionId, assessment: "not_assessed" }],
    archived_ids: [], resource_ids: [resourceId], open_work_acknowledged: false,
  };
  const releaseEdit = await hold(`update public.resources set title='Evidence after edit' where id='${resourceId}'`);
  runFailure(`begin;${auth}${command(randomUUID(),"review.submit",revision,1,evidencePayload)};commit;`,
    /PROJECT_STALE_CONTEXT/);
  await releaseEdit();
  context = JSON.parse(run(`begin;${auth}select public.project_review_context('${projectId}');commit;`).split("\n").find((line) => line.startsWith("{")));
  const releaseUnlink = await hold(`delete from public.resource_relations where resource_id='${resourceId}' and target_type='project' and target_id='${projectId}'`);
  runFailure(`begin;${auth}${command(randomUUID(),"review.submit",revision,1,{...evidencePayload,fingerprint:context.fingerprint})};commit;`,
    /PROJECT_RESOURCE_UNAVAILABLE|PROJECT_STALE_CONTEXT/);
  await releaseUnlink();
  run(`begin;${auth}select public.set_project_resource_role('${projectId}','${resourceId}','reference');commit;`);
  context = JSON.parse(run(`begin;${auth}select public.project_review_context('${projectId}');commit;`).split("\n").find((line) => line.startsWith("{")));
  const releaseResourceArchive = await hold(`update public.resources set archived_at=now() where id='${resourceId}'`);
  runFailure(`begin;${auth}${command(randomUUID(),"review.submit",revision,1,{...evidencePayload,fingerprint:context.fingerprint})};commit;`,
    /PROJECT_RESOURCE_UNAVAILABLE|PROJECT_STALE_CONTEXT/);
  await releaseResourceArchive();
  assert.equal(Number(run(`select count(*) from public.project_reviews where project_id='${projectId}' and completion_cycle=1;`)), 0);
  console.log("PASS Resource edit, unlink and archive races leave no partial Review");

  context = JSON.parse(run(`begin;${auth}select public.project_review_context('${projectId}');commit;`).split("\n").find((line) => line.startsWith("{")));
  const nextCompletion = {...payload, fingerprint: context.fingerprint, rationale: "New cycle acceptance", resource_ids: []};
  const releaseCompletion = await hold(command(randomUUID(),"review.submit",revision,1,nextCompletion));
  runFailure(`begin;${auth}${command(randomUUID(),"project.reopen",revision,1,{})};commit;`, /PROJECT_STALE/);
  await releaseCompletion();
  assert.equal(run(`select status from public.projects where id='${projectId}';`), "completed");
  console.log("PASS Reopen versus Completion serializes on Project revision");

  run(`insert into public.projects(id,user_id,title,status) values('${archiveProjectId}','${userId}','Archive race fixture','active');`);
  run(`begin;${auth}${commandFor(archiveProjectId,randomUUID(),"result.set",0,0,{desired_result:"Archive race result"})};commit;`);
  let archiveRevision = Number(run(`select completion_revision from public.projects where id='${archiveProjectId}';`));
  const archiveCriterionResult = run(`begin;${auth}${commandFor(archiveProjectId,randomUUID(),"criterion.create",archiveRevision,0,{text:"Archive race criterion",sort_order:0})};commit;`);
  const archiveCriterionId = JSON.parse(archiveCriterionResult.split("\n").find((line) => line.startsWith("{"))).criterion_id;
  archiveRevision = Number(run(`select completion_revision from public.projects where id='${archiveProjectId}';`));
  const archiveContext = JSON.parse(run(`begin;${auth}select public.project_review_context('${archiveProjectId}');commit;`).split("\n").find((line) => line.startsWith("{")));
  const archivePayload = {...payload, fingerprint:archiveContext.fingerprint,
    criteria:[{id:archiveCriterionId,assessment:"satisfied"}], resource_ids:[]};
  const releaseArchive = await hold(commandFor(archiveProjectId,randomUUID(),"project.archive",archiveRevision,0,{}));
  runFailure(`begin;${auth}${commandFor(archiveProjectId,randomUUID(),"review.submit",archiveRevision,0,archivePayload)};commit;`,
    /PROJECT_STALE/);
  await releaseArchive();
  assert.equal(Number(run(`select count(*) from public.project_reviews where project_id='${archiveProjectId}';`)), 0);
  assert.equal(run(`select status from public.projects where id='${archiveProjectId}';`), "archived");
  console.log("PASS Project Archive versus Review leaves no fabricated Review");
} finally {
  // Fixture cleanup is explicitly scoped to synthetic UUIDs and is not an app path.
  run(`delete from public.project_review_amendments where user_id='${userId}';
    delete from public.project_review_resources where user_id='${userId}';
    delete from public.project_review_work where user_id='${userId}';
    delete from public.project_review_criteria where user_id='${userId}';
    delete from public.project_reviews where user_id='${userId}';
    delete from public.project_lifecycle_events where user_id='${userId}';
    delete from public.project_command_receipts where user_id='${userId}';
    delete from public.project_completion_criteria where user_id='${userId}';
    delete from public.resource_relations where user_id='${userId}';
    delete from public.resources where user_id='${userId}';
    delete from public.projects where id in ('${projectId}','${archiveProjectId}') and user_id='${userId}';
    delete from auth.users where id='${userId}';`);
}

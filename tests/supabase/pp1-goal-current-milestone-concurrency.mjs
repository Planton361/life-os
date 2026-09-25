import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";

const container = process.argv[2];
if (!/^supabase_db_life-os-(r210-disposable-|z1-e2e-)/.test(container ?? ""))
  throw new Error("Disposable database container required");

const args = [
  "exec",
  "-i",
  container,
  "psql",
  "-X",
  "-qAt",
  "-U",
  "postgres",
  "-d",
  "postgres",
  "-v",
  "ON_ERROR_STOP=1",
];
const run = (sql) => {
  const result = spawnSync("docker", args, { input: sql, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout.trim();
};
const auth = (userId) =>
  `set local role authenticated;select set_config('request.jwt.claim.sub','${userId}',true);`;

async function runHeldSwitch(userId, goalId, milestoneId, commandId) {
  const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  let signal;
  const locked = new Promise((resolve) => (signal = resolve));
  child.stdout.on("data", (value) => {
    stdout += value.toString();
    if (stdout.includes("GOAL_LOCK_HELD")) signal();
  });
  child.stderr.on("data", (value) => (stderr += value.toString()));
  const finished = new Promise((resolve) =>
    child.on("close", (code) => resolve({ code, stdout, stderr })),
  );
  child.stdin.end(
    `begin;${auth(userId)}select public.set_goal_current_milestone('${goalId}','${milestoneId}',null,'${commandId}','${commandId}');select 'GOAL_LOCK_HELD';select pg_sleep(0.7);commit;`,
  );
  await Promise.race([
    locked,
    finished.then((result) => {
      throw new Error(
        `Writer exited before holding the Goal lock: ${result.stderr}`,
      );
    }),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("Goal lock barrier timed out")),
        10_000,
      ),
    ),
  ]);
  return { child, finished };
}

async function compete(isolation) {
  const userId = randomUUID();
  const goalId = randomUUID();
  const [firstId, secondId, thirdId] = [
    randomUUID(),
    randomUUID(),
    randomUUID(),
  ];
  run(
    `insert into auth.users(instance_id,id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values('${userId}','${userId}','authenticated','authenticated','journey-${userId}@example.test','{"provider":"email","providers":["email"]}','{}',now(),now());insert into public.goals(id,user_id,title,status) values('${goalId}','${userId}','Goal concurrency ${isolation}','active');insert into public.goal_milestones(id,user_id,goal_id,title,status,sort_order) values('${firstId}','${userId}','${goalId}','Current','active',0),('${secondId}','${userId}','${goalId}','First planned','planned',1),('${thirdId}','${userId}','${goalId}','Second planned','planned',2);`,
  );

  const writer = await runHeldSwitch(userId, goalId, secondId, randomUUID());
  const competitor = await new Promise((resolve) => {
    const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (value) => (stdout += value.toString()));
    child.stderr.on("data", (value) => (stderr += value.toString()));
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(
      `begin isolation level ${isolation};${auth(userId)}select public.set_goal_current_milestone('${goalId}','${thirdId}',null,'${randomUUID()}','concurrent-${isolation}');commit;`,
    );
  });
  const first = await writer.finished;
  assert.equal(first.code, 0, first.stderr);
  if (isolation === "read committed")
    assert.equal(competitor.code, 0, competitor.stderr);
  else if (competitor.code !== 0)
    assert.match(competitor.stderr, /could not serialize access/i);

  const current = run(
    `select count(*)::text||':'||coalesce((array_agg(id::text))[1],'') from public.goal_milestones where user_id='${userId}' and goal_id='${goalId}' and archived_at is null and status='active';`,
  );
  const [count, id] = current.split(":");
  assert.equal(count, "1", `${isolation}: current state ${current}`);
  assert.ok(
    [secondId, thirdId].includes(id),
    `${isolation}: unexpected final Current ${id}`,
  );
  if (competitor.code === 0) assert.equal(id, thirdId);
  else assert.equal(id, secondId);
  console.log(`PASS ${isolation}: exactly one Current milestone (${id})`);
}

await compete("read committed");
await compete("repeatable read");

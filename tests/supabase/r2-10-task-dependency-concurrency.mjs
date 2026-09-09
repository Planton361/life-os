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
  const r = spawnSync("docker", args, { input: sql, encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr);
  return r.stdout;
};
const uid = randomUUID();
run(
  `insert into auth.users(instance_id,id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values('${uid}','${uid}','authenticated','authenticated','r210-${uid}@example.test','{"provider":"email","providers":["email"]}','{}',now(),now());`,
);
const auth = `set local role authenticated;select set_config('request.jwt.claim.sub','${uid}',true);`;
async function compete(isolation, first, second) {
  const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
  let stderr = "";
  child.stderr.on("data", (v) => (stderr += v));
  let signal;
  const locked = new Promise((resolve) => (signal = resolve));
  child.stdout.on("data", (v) => {
    if (v.toString().includes("GRAPH_LOCK_HELD")) signal();
  });
  const finished = new Promise((resolve) => child.on("close", resolve));
  child.stdin.end(
    `begin;${auth}${first};select 'GRAPH_LOCK_HELD';select pg_sleep(1);commit;`,
  );
  await Promise.race([
    locked,
    finished.then(() => {
      throw new Error(`Writer exited before barrier: ${stderr}`);
    }),
  ]);
  const loser = await new Promise((resolve) => {
    const c = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
    let error = "";
    c.stderr.on("data", (v) => (error += v));
    c.stdout.resume();
    c.on("close", (code) => resolve({ code, error }));
    c.stdin.end(
      `begin isolation level ${isolation};${auth}select count(*) from public.task_dependencies;${second};commit;`,
    );
  });
  assert.equal(await finished, 0, stderr);
  assert.notEqual(loser.code, 0, "Concurrent invalid graph committed");
  assert.match(
    loser.error,
    /DEPENDENCY_(CYCLE|BLOCKED|COMPLETED_SUCCESSOR)|could not serialize access/,
  );
}
for (const isolation of ["read committed", "repeatable read"]) {
  for (const scenario of ["cycle", "completion", "reopen"]) {
    const p = randomUUID(),
      a = randomUUID(),
      b = randomUUID();
    run(
      `begin;${auth}insert into public.projects(id,user_id,title) values('${p}','${uid}','Concurrency ${scenario}');insert into public.tasks(id,user_id,project_id,title) values('${a}','${uid}','${p}','A'),('${b}','${uid}','${p}','B');${scenario === "reopen" ? `select public.complete_linked_task('${a}',now());select public.complete_linked_task('${b}',now());` : ""}commit;`,
    );
    const edge = (x, y) =>
      `insert into public.task_dependencies(user_id,project_id,predecessor_task_id,successor_task_id) values('${uid}','${p}','${x}','${y}')`;
    await compete(
      isolation,
      scenario === "reopen"
        ? `update public.tasks set status='planned',completed_at=null where id='${a}'`
        : edge(a, b),
      scenario === "cycle"
        ? edge(b, a)
        : scenario === "completion"
          ? `select public.complete_linked_task('${b}',now())`
          : edge(a, b),
    );
    console.log(`PASS ${isolation}: ${scenario}`);
  }
}

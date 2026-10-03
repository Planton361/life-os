import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";

const container = process.argv[2];
if (!/^supabase_db_life-os-z1-e2e-/.test(container ?? ""))
  throw Error("Disposable local DB required");
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
function run(sql) {
  const r = spawnSync("docker", args, {
    input: sql,
    encoding: "utf8",
    timeout: 15_000,
  });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
}
function session() {
  const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
  let output = "",
    error = "";
  child.stdout.on("data", (v) => {
    output += v;
  });
  child.stderr.on("data", (v) => {
    error += v;
  });
  const done = new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve(output) : reject(Error(error)),
    );
  });
  return { child, done, output: () => output };
}
async function until(check, message) {
  const deadline = Date.now() + 5_000;
  while (!check()) {
    if (Date.now() >= deadline) throw Error(message);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}
const u = randomUUID(),
  area = randomUUID();
const auth = `set local role authenticated;select set_config('request.jwt.claim.sub','${u}',true);`;
try {
  run(`insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data)
    values('${u}','authenticated','authenticated','area-race-${u}@example.test','{}','{}');
    insert into public.areas(id,user_id,key,name) values('${area}','${u}','coding','Race Area');`);
  for (const mutation of ["name='Updated Area'", "archived_at=now()"]) {
    const holder = session(),
      waiter = session();
    const holderName = `area-holder-${randomUUID()}`,
      waiterName = `area-waiter-${randomUUID()}`;
    try {
      holder.child.stdin
        .write(`set application_name='${holderName}';begin;${auth}
        select public.skill_development_command(null,'${randomUUID()}','skill.create',null,
        '{"name":"Lock race","area_id":"${area}"}');select 'HELD';\n`);
      await until(
        () => holder.output().includes("HELD"),
        "Skill command lock barrier missing",
      );
      waiter.child.stdin
        .end(`set application_name='${waiterName}';begin;set local statement_timeout='10s';${auth}
        update public.areas set ${mutation} where id='${area}';commit;select 'UPDATED';`);
      await until(
        () =>
          run(`select exists(select 1 from pg_stat_activity w join pg_stat_activity h
        on h.pid=any(pg_blocking_pids(w.pid)) where w.application_name='${waiterName}'
        and h.application_name='${holderName}' and w.wait_event_type='Lock')`) ===
          "t",
        "Concurrent Area update did not wait on the Skill command transaction",
      );
      assert.ok(
        !waiter.output().includes("UPDATED"),
        "Area changed before validating transaction ended",
      );
      holder.child.stdin.end("commit;\n");
      await holder.done;
      assert.match(await waiter.done, /UPDATED/);
      assert.equal(
        run(`select ${mutation.startsWith("name") ? "name='Updated Area'" : "archived_at is not null"}
        from public.areas where id='${area}'`),
        "t",
      );
    } finally {
      holder.child.stdin.end("rollback;\n");
      await Promise.allSettled([holder.done, waiter.done]);
    }
  }
  console.log(
    "PASS two sessions: Skill command FOR SHARE blocks owner Area update and archive until transaction commit",
  );
} finally {
  run(`delete from auth.users where id='${u}';`);
}

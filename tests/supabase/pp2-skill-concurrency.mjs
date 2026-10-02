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
function run(sql, fail) {
  const r = spawnSync("docker", args, {
    input: sql,
    encoding: "utf8",
    timeout: 15000,
  });
  if (fail) {
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, fail);
  } else {
    assert.equal(r.status, 0, r.stderr);
    return r.stdout.trim();
  }
}
const u = randomUUID();
const auth = `set local role authenticated;select set_config('request.jwt.claim.sub','${u}',true);`;
let skill = null;
const cmd = (op, rev, payload, key = randomUUID()) =>
  `select public.skill_development_command(${skill ? `'${skill}'` : "null"},'${key}','${op}',${rev ?? "null"},'${JSON.stringify(payload).replaceAll("'", "''")}'::jsonb)`;
const tx = (sql) => `begin;${auth}${sql};commit;`;
const receipt = (s) => JSON.parse(s.split("\n").find((l) => l.startsWith("{")));
async function hold(sql) {
  const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
  let out = "",
    err = "";
  const exit = new Promise((resolve) => child.on("close", resolve));
  const barrier = new Promise((resolve, reject) => {
    child.stdout.on("data", (v) => {
      out += v;
      if (out.includes("HELD")) resolve();
    });
    child.stderr.on("data", (v) => (err += v));
    child.on("error", reject);
  });
  child.stdin.end(
    `begin;${auth}${sql};select 'HELD';select pg_sleep(1);commit;`,
  );
  await Promise.race([
    barrier,
    exit.then(() => {
      throw Error(err || "Barrier missing");
    }),
  ]);
  return async () => {
    assert.equal(await exit, 0, err);
    return out;
  };
}
try {
  run(
    `insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data)values('${u}','authenticated','authenticated','pp2-${u}@example.test','{}','{}');`,
  );
  const key = randomUUID(),
    create = cmd("skill.create", null, { name: "Concurrency" }, key),
    finishCreate = await hold(create),
    second = receipt(run(tx(create))),
    first = receipt(await finishCreate());
  assert.deepEqual(first, second);
  skill = first.skill_id;
  assert.equal(
    run(`select count(*) from public.skills where user_id='${u}'`),
    "1",
  );
  let rev = 0;
  const exec = (op, p) => {
    const r = receipt(run(tx(cmd(op, rev, p))));
    rev++;
    return r;
  };
  const a = exec("target.create", { title: "A" }).target_id,
    b = exec("target.create", { title: "B" }).target_id;
  let release = await hold(cmd("target.current", rev, { target_id: a }));
  run(tx(cmd("target.current", rev, { target_id: b })), /SKILL_STALE/);
  await release();
  rev++;
  assert.equal(
    run(
      `select count(*) from public.skill_development_targets where skill_id='${skill}' and status='current'`,
    ),
    "1",
  );
  const e = exec("evidence.create", {
    title: "Observed",
    evidence_date: "2026-09-01",
    source_type: "manual_note",
    source_id: null,
  }).evidence_id;
  release = await hold(
    cmd("evidence.correct", rev, {
      evidence_id: e,
      title: "Corrected",
      evidence_date: "2026-09-01",
      source_type: "manual_note",
      source_id: null,
      reason: "Correction race",
    }),
  );
  run(
    tx(
      cmd("review.submit", rev, {
        target_id: a,
        decision: "completed",
        note: "Review race",
        open_milestones_acknowledged: true,
        evidence: [{ id: e, revision: 1 }],
      }),
    ),
    /SKILL_STALE/,
  );
  await release();
  rev++;
  assert.equal(
    run(
      `select count(*) from public.skill_development_reviews where skill_id='${skill}'`,
    ),
    "0",
  );
  release = await hold(cmd("target.archive", rev, { target_id: a }));
  run(
    tx(cmd("target.edit", rev, { target_id: a, title: "Lost save" })),
    /SKILL_STALE/,
  );
  await release();
  rev++;
  assert.equal(
    run(`select title from public.skill_development_targets where id='${a}'`),
    "A",
  );
  assert.equal(
    Number(
      run(`select development_revision from public.skills where id='${skill}'`),
    ),
    rev,
  );
  console.log(
    "PASS two-session Create/retry, Current switch, Correction/Review, Archive/save: exactly one commit, stale loser, no lost writes",
  );
} finally {
  run(`delete from auth.users where id='${u}';`);
}

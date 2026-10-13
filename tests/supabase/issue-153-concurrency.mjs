import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

// Called only by the verified, fresh-container harness; never takes a URL.
export async function proveInboxReleaseConcurrency({
  name,
  database,
  sql,
  output,
}) {
  assert.match(name, /^life-os-153-lint-[0-9a-f-]+$/);
  assert.equal(database, "life_os_153_head");
  const results = [];
  const args = [
    "exec",
    "--interactive",
    "--user",
    "postgres",
    name,
    "psql",
    "-X",
    "-qAt",
    "-v",
    "ON_ERROR_STOP=1",
    "-d",
    database,
  ];
  function session() {
    const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "",
      stderr = "";
    child.stdout.on("data", (c) => {
      stdout += c;
    });
    child.stderr.on("data", (c) => {
      stderr += c;
    });
    const exit = new Promise((resolve) =>
      child.once("close", (code) => resolve(code)),
    );
    async function marker(text) {
      const deadline = Date.now() + 10_000;
      while (!stdout.includes(text)) {
        assert.ok(
          child.exitCode === null && Date.now() < deadline,
          stderr || "Missing session barrier",
        );
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    }
    return { child, exit, marker, text: () => ({ stdout, stderr }) };
  }
  for (const isolation of ["read committed", "repeatable read"]) {
    for (const winner of ["metadata", "release", "archive"]) {
      const user = randomUUID(),
        project = randomUUID(),
        task = randomUUID();
      sql(
        database,
        `insert into auth.users(id,instance_id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values('${user}','${user}','authenticated','authenticated','153-${user}@example.test','{}','{}',now(),now());
        insert into public.projects(id,user_id,title,status) values('${project}','${user}','153 race Parent','active');
        insert into public.tasks(id,user_id,title,status,project_id) values('${task}','${user}','Original','inbox','${project}');`,
      );
      const token = sql(
        database,
        `select updated_at::text from public.tasks where id='${task}';`,
      ).trim();
      const release = `select (public.release_inbox_task('${task}','${token}')).status;`;
      const auth = `set local role authenticated;select set_config('request.jwt.claim.sub','${user}',true);set local statement_timeout='8s';`;
      const mutation =
        winner === "metadata"
          ? `update public.tasks set title='Concurrent metadata' where id='${task}';`
          : winner === "release"
            ? release
            : `select public.project_depth_command('${project}','${randomUUID()}','project.archive',0,0,'{}');`;
      const a = session(),
        b = session(),
        applicationName = `153-${randomUUID()}`;
      try {
        a.child.stdin.write(`begin;${auth}${mutation}select '153_HELD';\n`);
        await a.marker("153_HELD");
        const loser =
          winner === "release"
            ? `update public.tasks set status='inbox',title='Stale editor' where id='${task}' and updated_at='${token}';`
            : release;
        b.child.stdin.end(
          `begin isolation level ${isolation};${auth}set local application_name='${applicationName}';select status from public.tasks where id='${task}';select '153_ENTER';${loser}commit;`,
        );
        await b.marker("153_ENTER");
        const deadline = Date.now() + 8_000;
        while (
          sql(
            database,
            `select count(*) from pg_stat_activity where application_name='${applicationName}' and wait_event_type='Lock';`,
          ).trim() !== "1"
        ) {
          assert.ok(
            Date.now() < deadline && b.child.exitCode === null,
            "Second connection did not wait on first writer",
          );
          await new Promise((resolve) => setTimeout(resolve, 25));
        }
        a.child.stdin.end("commit;\n");
        assert.equal(await a.exit, 0, a.text().stderr);
        const code = await b.exit;
        if (winner === "release" && isolation === "read committed")
          assert.equal(code, 0, b.text().stderr);
        else {
          assert.notEqual(
            code,
            0,
            "Losing stale release unexpectedly committed",
          );
          assert.match(
            b.text().stderr,
            isolation === "repeatable read"
              ? /could not serialize access/
              : winner === "archive"
                ? /TASK_PROJECT_ARCHIVED/
                : /TASK_RELEASE_STALE/,
          );
        }
        const row = JSON.parse(
          sql(
            database,
            `select json_build_object('status',status,'title',title) from public.tasks where id='${task}';`,
          ).trim(),
        );
        assert.deepEqual(row, {
          status: winner === "release" ? "planned" : "inbox",
          title: winner === "metadata" ? "Concurrent metadata" : "Original",
        });
        results.push({
          isolation,
          winner,
          loserExit: code,
          first: a.text(),
          second: b.text(),
          status: "PASS",
        });
        console.log(
          `PASS actual PostgreSQL concurrent ${winner} first / ${isolation}`,
        );
      } finally {
        for (const s of [a, b])
          if (s.child.exitCode === null) s.child.stdin.end("rollback;\n");
        await Promise.all([a.exit, b.exit]);
      }
    }
  }
  output(results);
  return "PASS: six held-lock races, RC and RR";
}

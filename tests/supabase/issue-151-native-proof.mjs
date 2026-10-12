// Optional portable PostgreSQL validation, no repository dependency or Docker.
// Install embedded-postgres@18.4.0-beta.17 into a fresh real-temp directory named
// life-os-151-pg-*, hydrate the package's native symlinks, then pass that directory.
// No connection URL or existing database is accepted. All clusters are new and
// stopped in finally; no personal runtime, remote DB, credentials or files used.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { createServer } from "node:net";
import { spawnSync } from "node:child_process";

const root = realpathSync(process.argv[2]);
assert.equal(dirname(root), realpathSync(tmpdir()));
assert.match(root, /\/life-os-151-pg-[^/]+$/);
const pkg = JSON.parse(
  readFileSync(
    join(root, "node_modules/embedded-postgres/package.json"),
    "utf8",
  ),
);
assert.equal(pkg.version, "18.4.0-beta.17");
const { default: EmbeddedPostgres } = await import(
  pathToFileURL(join(root, "node_modules/embedded-postgres/dist/index.js")).href
);
const listener = createServer();
await new Promise((r) => listener.listen(0, "127.0.0.1", r));
const port = listener.address().port;
await new Promise((r) => listener.close(r));
const directory = mkdtempSync(join(root, "native-cluster-"));
// PostgreSQL Unix socket paths are limited to 108 bytes on this host.
const socketDirectory = mkdtempSync("/tmp/life-os-151-socket-");
const pg = new EmbeddedPostgres({
  databaseDir: join(directory, "db"),
  port,
  user: "postgres",
  password: randomUUID(),
  persistent: true,
  createPostgresUser: false,
  postgresFlags: ["-h", "127.0.0.1", "-k", socketDirectory],
  onLog: (message) => {
    if (/FATAL/.test(message)) console.error(message);
  },
  onError: (e) => console.error(String(e)),
});
let admin;
const setup = `CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth; CREATE SCHEMA extensions; CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
CREATE TABLE auth.users(id uuid PRIMARY KEY,instance_id uuid,aud text,role text,email text,encrypted_password text,email_confirmed_at timestamptz,raw_app_meta_data jsonb,raw_user_meta_data jsonb,created_at timestamptz,updated_at timestamptz);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth,extensions TO authenticated,anon,service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,anon,service_role;`;
try {
  await pg.initialise();
  await pg.start();
  admin = pg.getPgClient();
  await admin.connect();
  console.log((await admin.query("SELECT version()")).rows[0].version);
  await admin.query(setup);
  const migration = "20261012113000_task_parent_completion_guard.sql";
  const files = readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort();
  assert.equal(files.at(-1), migration);
  for (const file of files.filter((f) => f !== migration))
    await admin.query(readFileSync(join("supabase/migrations", file), "utf8"));
  const sql = readFileSync(
    "tests/supabase/issue-151-task-parent-completion.sql",
    "utf8",
  );
  let red;
  try {
    await admin.query(sql);
  } catch (error) {
    red = error.message;
  } finally {
    await admin.query("ROLLBACK");
  }
  assert.match(
    red ?? "",
    /Write unexpectedly succeeded: select public.complete_linked_task/,
  );
  console.log("RED: archived Parent Completion succeeds on unchanged base");
  await admin.query(
    readFileSync(join("supabase/migrations", migration), "utf8"),
  );
  await admin.query(sql);
  console.log(
    "GREEN: #151 direct/alternative/RPC/Source/RLS/rollback SQL suite",
  );
  for (const file of [
    "sr1-03-source-linked-task-write-boundary.sql",
    "r2-10-task-dependencies.sql",
  ]) {
    await admin.query(readFileSync(join("tests/supabase", file), "utf8"));
    console.log("PASS existing", file);
  }
  for (const isolation of ["READ COMMITTED", "REPEATABLE READ"])
    for (const path of ["rpc", "timestamp", "meal"])
      for (const archiveFirst of [true, false]) {
        const uid = randomUUID();
        await admin.query("INSERT INTO auth.users(id) VALUES($1)", [uid]);
        await admin.query("BEGIN; SET LOCAL ROLE authenticated");
        await admin.query(
          "SELECT set_config('request.jwt.claim.sub',$1,true)",
          [uid],
        );
        const project = (
          await admin.query(
            "INSERT INTO public.projects(user_id,title,status) VALUES($1,'#151 race','active') RETURNING id",
            [uid],
          )
        ).rows[0].id;
        let meal, task;
        if (path === "meal") {
          meal = (
            await admin.query(
              "INSERT INTO public.meals(user_id,date,meal_type,title) VALUES($1,'2026-10-12','lunch','#151 race Meal') RETURNING id",
              [uid],
            )
          ).rows[0].id;
          task = (
            await admin.query(
              "SELECT (public.schedule_linked_source('meal',$1,'2026-10-12','2026-10-12T12:00:00Z',30)).id",
              [meal],
            )
          ).rows[0].id;
          await admin.query(
            "UPDATE public.tasks SET project_id=$1 WHERE id=$2",
            [project, task],
          );
        } else
          task = (
            await admin.query(
              "INSERT INTO public.tasks(user_id,project_id,title,status) VALUES($1,$2,'#151 race Task','planned') RETURNING id",
              [uid, project],
            )
          ).rows[0].id;
        await admin.query("COMMIT");
        const a = pg.getPgClient(),
          b = pg.getPgClient();
        await a.connect();
        await b.connect();
        try {
          for (const client of [a, b]) {
            await client.query(
              `BEGIN ISOLATION LEVEL ${isolation}; SET LOCAL ROLE authenticated; SET LOCAL statement_timeout='5s'`,
            );
            await client.query(
              "SELECT set_config('request.jwt.claim.sub',$1,true)",
              [uid],
            );
            await client.query("SELECT count(*) FROM public.projects"); // establish RR snapshot
          }
          const archive = (c) =>
            c.query(
              "SELECT public.project_depth_command($1,$2,'project.archive',0,0,'{}')",
              [project, randomUUID()],
            );
          const complete = (c) =>
            path === "timestamp"
              ? c.query(
                  "UPDATE public.tasks SET completed_at=clock_timestamp() WHERE id=$1",
                  [task],
                )
              : path === "meal"
                ? c.query(
                    "SELECT public.complete_linked_meal($1,clock_timestamp())",
                    [meal],
                  )
                : c.query(
                    "SELECT public.complete_linked_task($1,clock_timestamp())",
                    [task],
                  );
          await (archiveFirst ? archive(a) : complete(a));
          const second = (archiveFirst ? complete(b) : archive(b)).then(
            () => ({ ok: true }),
            (error) => ({
              ok: false,
              code: error.code,
              message: error.message,
            }),
          );
          const started = Date.now();
          while (true) {
            const state = (
              await admin.query(
                "SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1",
                [b.processID],
              )
            ).rows[0];
            if (state?.wait_event_type === "Lock") break;
            assert.ok(
              Date.now() - started < 4000,
              "Second transaction did not reach real lock wait",
            );
            await new Promise((r) => setTimeout(r, 20));
          }
          await a.query("COMMIT");
          const response = await second;
          if (response.ok) await b.query("COMMIT");
          else await b.query("ROLLBACK");
          if (archiveFirst) {
            assert.equal(response.ok, false);
            assert.ok(
              response.code === "40001" ||
                response.message.includes("TASK_PROJECT_ARCHIVED"),
              JSON.stringify(response),
            );
            const t = (
              await admin.query(
                "SELECT status,completed_at FROM public.tasks WHERE id=$1",
                [task],
              )
            ).rows[0];
            assert.equal(t.status, "planned");
            assert.equal(t.completed_at, null);
            if (meal)
              assert.equal(
                (
                  await admin.query(
                    "SELECT completed_at FROM public.meals WHERE id=$1",
                    [meal],
                  )
                ).rows[0].completed_at,
                null,
              );
          } else {
            // RR may abort archive after the completion's row-version update. A retry
            // is a separate normal command; it never retroactively rejects history.
            if (!response.ok) assert.equal(response.code, "40001");
            assert.ok(
              (
                await admin.query(
                  "SELECT completed_at FROM public.tasks WHERE id=$1",
                  [task],
                )
              ).rows[0].completed_at,
            );
          }
          console.log(
            "PASS MVCC",
            isolation,
            path,
            archiveFirst ? "archive-first" : "complete-first",
            response.ok ? "COMMIT" : response.code,
          );
        } finally {
          await a.end();
          await b.end();
        }
      }
  console.log(
    "PostgreSQL proof: PASS (12 real independent-connection lock races)",
  );
  if (process.argv[3]) {
    const cli = realpathSync(process.argv[3]);
    assert.equal(dirname(dirname(cli)), realpathSync(tmpdir()));
    assert.match(dirname(cli), /\/life-os-151-tools-[^/]+$/);
    const connection = `postgresql://postgres:${encodeURIComponent(pg.options.password)}@127.0.0.1:${port}/postgres?sslmode=disable`;
    for (const args of [
      ["lint", "--level", "warning"],
      [
        "advisors",
        "--type",
        "security",
        "--level",
        "warn",
        "--fail-on",
        "none",
      ],
    ]) {
      const r = spawnSync(cli, ["db", ...args, "--db-url", connection], {
        encoding: "utf8",
        timeout: 30_000,
      });
      console.log(
        "ISOLATED_CLI",
        args[0],
        "exit",
        r.status,
        "signal",
        r.signal,
        r.stdout,
        r.stderr,
      );
      if (r.status !== 0) process.exitCode = 1;
    }
  }
} finally {
  if (admin) await admin.end();
  if (pg.process?.exitCode === null && pg.process?.signalCode === null)
    await pg.stop();
}

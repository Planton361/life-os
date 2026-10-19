// #151 only: actual Supabase lint on a fresh CI-local PostgreSQL 18.4 with
// plpgsql_check installed. No connection URL, existing container or DB accepted.
// Refuses workstation Docker: the personal Mac runtime is never touched.
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  baseRevision,
  compareEvidence,
  selfTest,
} from "./issue-151-sql-lint-gate.mjs";

assert.equal(
  process.env.GITHUB_ACTIONS,
  "true",
  "Ephemeral GitHub runner required",
);
assert.equal(process.env.RUNNER_OS, "Linux", "Ephemeral Linux runner required");
assert.equal(process.versions.node, "24.21.0");
const base = baseRevision;
assert.equal(
  process.env.ISSUE151_BASE_SHA,
  base,
  "PR base changed: no implicit baseline update",
);
const image =
  "postgres:18.4-bookworm@sha256:882236b897e39051d2368c5ccc6cda944904723506b2dfc97f2a8f5bc9afa382";
const checker = {
  version: "2.10.13-1.pgdg12+1",
  url: "https://apt.postgresql.org/pub/repos/apt/pool/main/p/plpgsql-check/postgresql-18-plpgsql-check_2.10.13-1.pgdg12+1_amd64.deb",
  sha256: "228d14fde4883f7dfc9bd4971e6cbef6a081de7c2ab6248ac25053dad20fe27d",
};
const name = `life-os-151-lint-${randomUUID()}`,
  password = randomUUID();
const output = resolve("test-results/issue-151-sql-lint");
mkdirSync(output, { recursive: true });
const temp = mkdtempSync(join(tmpdir(), "life-os-151-lint-"));
const evidence = {
  base,
  image,
  checker,
  head: null,
  isolation: null,
  databases: {},
  classification: null,
  cleanup: null,
};
const redact = (s = "") => s.replaceAll(password, "<disposable-password>");
function run(command, args, input, timeout = 120_000) {
  const r = spawnSync(command, args, {
    input,
    encoding: "utf8",
    timeout,
    maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, POSTGRES_PASSWORD: password },
  });
  if (r.status !== 0)
    throw new Error(
      `${command} failed (exit=${r.status},signal=${r.signal}): ${redact(r.stderr)} ${redact(r.stdout)}`,
    );
  return r.stdout;
}
const sql = (database, statement) =>
  run(
    "docker",
    [
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
    ],
    statement,
  );
const jsonSql = (database, statement) =>
  JSON.parse(sql(database, statement).trim());
const setup = `CREATE SCHEMA auth; CREATE SCHEMA extensions; CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
CREATE TABLE auth.users(id uuid PRIMARY KEY,instance_id uuid,aud text,role text,email text,encrypted_password text,email_confirmed_at timestamptz,raw_app_meta_data jsonb,raw_user_meta_data jsonb,created_at timestamptz,updated_at timestamptz);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth,extensions TO authenticated,anon,service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,anon,service_role;`;
let started = false;
try {
  evidence.head = run("git", ["rev-parse", "HEAD"]).trim();
  assert.equal(
    evidence.head,
    process.env.ISSUE151_HEAD_SHA,
    "Not the exact PR head",
  );
  assert.equal(run("git", ["merge-base", base, "HEAD"]).trim(), base);
  assert.ok(
    !process.env.DOCKER_HOST,
    "Remote Docker endpoints are not accepted",
  );
  const dockerContext = JSON.parse(run("docker", ["context", "inspect"]))[0];
  assert.match(dockerContext.Endpoints.docker.Host, /^unix:\/\//);
  evidence.dockerEndpoint = dockerContext.Endpoints.docker.Host;
  // No apt upgrade: install only the checksum-verified extension package into
  // our container. The official immutable image supplies the unchanged server.
  const response = await fetch(checker.url);
  assert.equal(response.status, 200);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    checker.sha256,
  );
  const deb = join(temp, "plpgsql-check.deb");
  writeFileSync(deb, bytes, { mode: 0o600 });
  run("docker", [
    "run",
    "--detach",
    "--rm",
    "--name",
    name,
    "--label",
    "life-os.issue=151",
    "--label",
    `life-os.disposable=${process.env.GITHUB_RUN_ID}`,
    "--publish",
    "127.0.0.1::5432",
    "--env",
    "POSTGRES_PASSWORD",
    image,
  ]);
  started = true;
  const inspect = JSON.parse(run("docker", ["inspect", name]))[0];
  assert.equal(inspect.Config.Labels["life-os.issue"], "151");
  assert.equal(
    inspect.Config.Labels["life-os.disposable"],
    process.env.GITHUB_RUN_ID,
  );
  assert.ok(inspect.Mounts.every((m) => m.Type === "volume"));
  const binding = inspect.NetworkSettings.Ports["5432/tcp"];
  assert.equal(binding.length, 1);
  assert.equal(binding[0].HostIp, "127.0.0.1");
  assert.match(binding[0].HostPort, /^\d+$/);
  evidence.isolation = {
    container: inspect.Id,
    name,
    labels: inspect.Config.Labels,
    host: binding[0],
    mounts: inspect.Mounts.map(({ Type, Name, Destination }) => ({
      Type,
      Name,
      Destination,
    })),
  };
  for (let attempt = 0; ; attempt++) {
    const r = spawnSync(
      "docker",
      ["exec", name, "pg_isready", "-U", "postgres"],
      { encoding: "utf8" },
    );
    if (r.status === 0) break;
    assert.ok(attempt < 30, "Own disposable PostgreSQL did not become ready");
    await new Promise((r) => setTimeout(r, 1000));
  }
  run("docker", ["cp", deb, `${name}:/tmp/plpgsql-check.deb`]);
  evidence.packageInstall = run("docker", [
    "exec",
    "--user",
    "root",
    name,
    "dpkg",
    "--install",
    "/tmp/plpgsql-check.deb",
  ]);
  sql(
    "postgres",
    "CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;",
  );
  const cli = resolve("node_modules/.bin/supabase");
  evidence.cliVersion = run(cli, ["--version"]).trim();
  assert.equal(evidence.cliVersion, "2.107.0");
  writeFileSync(
    join(output, "lint-help.txt"),
    run(cli, ["db", "lint", "--help"]),
  );
  writeFileSync(
    join(output, "advisor-help.txt"),
    run(cli, ["db", "advisors", "--help"]),
  );
  for (const variant of ["base", "head"]) {
    const database = `life_os_151_${variant}`;
    sql("postgres", `CREATE DATABASE ${database} TEMPLATE template0;`);
    // Supabase's administrative connection resolves extensions as well as public
    // functions. Plain official PostgreSQL defaults omit that extension schema.
    sql(
      "postgres",
      `ALTER DATABASE ${database} SET search_path=public,extensions;`,
    );
    sql(database, setup);
    const paths =
      variant === "base"
        ? run("git", [
            "ls-tree",
            "-r",
            "--name-only",
            base,
            "--",
            "supabase/migrations",
          ])
            .trim()
            .split("\n")
            .filter((f) => f.endsWith(".sql"))
        : readdirSync("supabase/migrations")
            .filter((f) => f.endsWith(".sql"))
            .sort()
            .map((f) => `supabase/migrations/${f}`);
    assert.equal(paths.length, variant === "base" ? 64 : 65);
    const migrations = [];
    for (const path of paths) {
      const body =
        variant === "base"
          ? run("git", ["show", `${base}:${path}`])
          : readFileSync(path, "utf8");
      sql(database, body);
      migrations.push({
        path,
        sha256: createHash("sha256").update(body).digest("hex"),
      });
    }
    sql(database, "CREATE EXTENSION plpgsql_check WITH SCHEMA extensions;");
    const identity = jsonSql(
      database,
      "SELECT json_build_object('database',current_database(),'serverVersion',current_setting('server_version'),'serverVersionNum',current_setting('server_version_num'),'extensionVersion',(SELECT extversion FROM pg_extension WHERE extname='plpgsql_check'),'extensionSchema',(SELECT nspname FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE extname='plpgsql_check'));",
    );
    assert.equal(identity.serverVersionNum, "180004");
    assert.ok(identity.extensionVersion);
    const url = `postgresql://postgres:${password}@127.0.0.1:${binding[0].HostPort}/${database}?sslmode=disable`;
    const checks = {};
    for (const [kind, args] of [
      ["lint", ["--level", "warning", "--fail-on", "none"]],
      [
        "advisors",
        ["--type", "security", "--level", "warn", "--fail-on", "none"],
      ],
    ]) {
      const r = spawnSync(cli, ["db", kind, ...args, "--db-url", url], {
        encoding: "utf8",
        timeout: 60_000,
        maxBuffer: 16 * 1024 * 1024,
      });
      const stdout = redact(r.stdout),
        stderr = redact(r.stderr);
      writeFileSync(join(output, `${variant}-${kind}-stdout.json`), stdout);
      writeFileSync(join(output, `${variant}-${kind}-stderr.txt`), stderr);
      console.log(
        `${variant} ${kind} exit=${r.status}\nstdout:\n${stdout}\nstderr:\n${stderr}`,
      );
      checks[kind] = { exitCode: r.status, signal: r.signal, stdout, stderr };
      evidence.databases[variant] = { identity, migrations, checks };
      if (r.status !== 0) {
        const debug = spawnSync(
          cli,
          ["db", kind, ...args, "--db-url", url, "--debug"],
          { encoding: "utf8", timeout: 60_000, maxBuffer: 16 * 1024 * 1024 },
        );
        writeFileSync(
          join(output, `${variant}-${kind}-debug.txt`),
          redact(debug.stdout) + redact(debug.stderr),
        );
      }
      assert.equal(
        r.status,
        0,
        `${variant} actual ${kind} failed: ${stderr} ${stdout}`,
      );
      // The Linux CLI prints the explicit clean result on stderr with empty
      // stdout, while findings are JSON. Retain both, and never infer clean
      // results from exit 0 alone.
      const cleanText =
        kind === "advisors" ? /No issues found/ : /No schema errors found/;
      const parsed = stdout.trim()
        ? JSON.parse(stdout)
        : cleanText.test(stderr)
          ? { results: [] }
          : null;
      assert.ok(parsed, "Empty CLI output without an explicit clean result");
      assert.notEqual(parsed?._tag, "Error", "CLI operation reported an Error");
      const results = Array.isArray(parsed) ? parsed : parsed.results;
      assert.ok(
        Array.isArray(results),
        "Unknown CLI result shape: retained output, no inferred PASS",
      );
      checks[kind].results = results;
    }
    if (variant === "head") {
      const strict = spawnSync(
        cli,
        [
          "db",
          "lint",
          "--level",
          "warning",
          "--fail-on",
          "warning",
          "--db-url",
          url,
        ],
        { encoding: "utf8", timeout: 60_000, maxBuffer: 16 * 1024 * 1024 },
      );
      checks.strictLint = {
        exitCode: strict.status,
        signal: strict.signal,
        stdout: redact(strict.stdout),
        stderr: redact(strict.stderr),
      };
      writeFileSync(
        join(output, "head-lint-strict-stdout.json"),
        checks.strictLint.stdout,
      );
      writeFileSync(
        join(output, "head-lint-strict-stderr.txt"),
        checks.strictLint.stderr,
      );
      console.log(
        `head strict lint exit=${strict.status}\nstdout:\n${checks.strictLint.stdout}\nstderr:\n${checks.strictLint.stderr}`,
      );
      assert.equal(
        strict.status,
        checks.lint.results.length ? 1 : 0,
        "Strict warning gate must agree with actual findings",
      );
      sql(
        database,
        readFileSync(
          "tests/supabase/issue-151-task-parent-completion.sql",
          "utf8",
        ),
      );
      evidence.headSqlRegression = "PASS";
    }
    console.log(
      `${variant}: PostgreSQL ${identity.serverVersion}; plpgsql_check ${identity.extensionVersion}; ${migrations.length} migrations; actual lint/advisor exit 0`,
    );
  }
  // The approved gate admits only the complete, fingerprinted known baseline.
  // The absolute CLI warning gate above stays nonzero and fully documented.
  evidence.classification = compareEvidence(evidence);
  evidence.comparisonSelfTest = selfTest(evidence);
  writeFileSync(
    join(output, "comparison-self-test.json"),
    JSON.stringify(evidence.comparisonSelfTest, null, 2),
  );
  console.log(
    `Differential gate self-test: PASS ${evidence.comparisonSelfTest.length} cases`,
  );
  console.log(JSON.stringify(evidence.classification));
} catch (error) {
  evidence.failure = redact(String(error));
  console.error(evidence.failure);
  process.exitCode = 1;
} finally {
  if (started) {
    const logs = spawnSync("docker", ["logs", name], {
      encoding: "utf8",
      timeout: 30_000,
      maxBuffer: 16 * 1024 * 1024,
    });
    assert.equal(logs.status, 0, "Server log evidence failed");
    writeFileSync(
      join(output, "postgres-server-log.txt"),
      redact(logs.stdout) + redact(logs.stderr),
    );
    const verify = JSON.parse(run("docker", ["inspect", name]))[0];
    assert.equal(
      verify.Config.Labels["life-os.disposable"],
      process.env.GITHUB_RUN_ID,
    );
    run("docker", ["stop", "--time", "10", name]);
    evidence.cleanup =
      "Only the verified own --rm container and its anonymous volume removed";
  }
  writeFileSync(join(output, "proof.json"), JSON.stringify(evidence, null, 2), {
    mode: 0o600,
  });
}

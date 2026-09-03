#!/usr/bin/env node
import { createReadStream } from "node:fs";
import { access, readFile, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

const REQUIRED_FILES = ["roles.sql", "schema.sql", "data.sql", "manifest.json"];
const DEFAULT_IMAGE = process.env.LIFE_OS_RESTORE_SMOKE_IMAGE ?? "postgres:17-alpine";
const RESULT_FILE = "restore-smoke-result.json";
const CONTAINER_DB = "life_os_restore_smoke";
const MAINTENANCE_DB = "postgres";
const CONTAINER_USER = "postgres";
const CONTAINER_PASSWORD = "life_os_restore_smoke";
const WAIT_TIMEOUT_MS = 60_000;
const READY_STABILITY_MS = 1_000;
const COMPATIBILITY_BOOTSTRAP_ROLES = [
  "anon",
  "authenticated",
  "service_role",
  "authenticator",
  "supabase_admin",
  "supabase_auth_admin",
  "dashboard_user",
];
const COMPATIBILITY_BOOTSTRAP_SQL = `
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'authenticator') then
    create role authenticator nologin noinherit;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'supabase_admin') then
    create role supabase_admin nologin noinherit createdb createrole replication bypassrls;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    create role supabase_auth_admin nologin noinherit;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'dashboard_user') then
    create role dashboard_user nologin noinherit createrole;
  end if;
end
$$;

grant anon to authenticator;
grant authenticated to authenticator;
grant service_role to authenticator;
`;
const INTEGRITY_TABLES = ["profiles", "tasks", "projects", "resources", "meals"];

function backupDirFromArg() {
  const input = process.argv[2];
  if (!input) {
    throw new Error("Pass a backup folder, for example: pnpm backup:local:restore-smoke backups/local-drills/<timestamp>");
  }

  return resolve(process.cwd(), input);
}

function timestampForName(date = new Date()) {
  return date.toISOString().replace(/[^0-9]/g, "").slice(0, 14);
}

function sanitized(text) {
  return (text || "").slice(0, 1600);
}

function resultBase(status, phase, reason, detail = "") {
  return {
    status,
    checkedAt: new Date().toISOString(),
    image: DEFAULT_IMAGE,
    artifactNames: REQUIRED_FILES,
    compatibilityBootstrapRoles: COMPATIBILITY_BOOTSTRAP_ROLES,
    phase,
    reason,
    detail: sanitized(detail),
    notes: [
      "Active local Life OS database was not changed.",
      "No db reset, remote DB, or deployment was used.",
      "Generated SQL contents were not printed.",
      "Compatibility bootstrap is limited to the temporary restore-smoke container.",
    ],
  };
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve) => {
    const stdinMode = options.inputFile ? "pipe" : "ignore";
    const stdoutMode = options.captureStdout ? "pipe" : "ignore";
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: options.env ?? process.env,
      stdio: [stdinMode, stdoutMode, "pipe"],
    });

    let stdout = "";
    let stderr = "";
    if (child.stdout) {
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
    }

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      resolve({ ok: false, code: null, stderr: error.message });
    });

    child.on("close", (code) => {
      resolve({ ok: code === 0, code, stdout: sanitized(stdout), stderr: sanitized(stderr) });
    });

    if (options.inputFile) {
      const stream = createReadStream(options.inputFile);
      stream.on("error", (error) => {
        child.stdin.destroy(error);
      });
      child.stdin.on("error", (error) => {
        if (error.code !== "EPIPE") child.stdin.destroy(error);
      });
      stream.pipe(child.stdin);
    }
  });
}

async function runRequired(command, args, options = {}) {
  const result = await runCommand(command, args, options);
  if (!result.ok) {
    throw new Error(`${options.label ?? command} failed with exit code ${result.code}. ${result.stderr}`);
  }
}

async function writeResult(backupDir, result) {
  await writeFile(join(backupDir, RESULT_FILE), `${JSON.stringify(result, null, 2)}\n`, "utf8");
}

async function validateBackupFolder(backupDir) {
  const dirStat = await stat(backupDir);
  if (!dirStat.isDirectory()) {
    throw new Error("Backup path is not a directory.");
  }

  for (const fileName of REQUIRED_FILES) {
    const filePath = join(backupDir, fileName);
    await access(filePath);
    const fileStat = await stat(filePath);
    if (!fileStat.isFile() || fileStat.size === 0) {
      throw new Error(`${fileName} is missing or empty.`);
    }
  }

  let manifest;
  try {
    manifest = JSON.parse(await readFile(join(backupDir, "manifest.json"), "utf8"));
  } catch {
    throw new Error("manifest.json is not valid backup metadata.");
  }

  if (
    manifest?.runtime?.classification !== "CANONICAL_TARGET" ||
    manifest?.runtime?.dockerProject !== "life-os-sr104b-target" ||
    !manifest?.integrity ||
    !Array.isArray(manifest?.integrity?.canonicalTables) ||
    !manifest?.integrity?.rowCounts
  ) {
    throw new Error("Backup metadata does not prove a guarded canonical Target backup.");
  }

  return manifest;
}

async function restoredIntegritySnapshot(containerName) {
  const query = `
    select json_build_object(
      'migrationCount', (select count(*) from supabase_migrations.schema_migrations),
      'canonicalTables', (select coalesce(json_agg(tablename order by tablename), '[]'::json)
        from pg_tables where schemaname = 'public' and tablename = any(array['profiles','tasks','projects','resources','meals'])),
      'rowCounts', (select json_object_agg(table_name, row_count)
        from (
          select 'profiles'::text as table_name, count(*)::bigint as row_count from public.profiles
          union all select 'tasks', count(*)::bigint from public.tasks
          union all select 'projects', count(*)::bigint from public.projects
          union all select 'resources', count(*)::bigint from public.resources
          union all select 'meals', count(*)::bigint from public.meals
        ) counts)
    )::text;
  `;
  const result = await runCommand("docker", psqlCommand(containerName, CONTAINER_DB, ["-At", "-c", query]), {
    captureStdout: true,
  });
  if (!result.ok) throw new Error("Restored integrity metadata query failed.");

  try {
    return JSON.parse(result.stdout.trim());
  } catch {
    throw new Error("Restored integrity metadata was unreadable.");
  }
}

function assertRestoredIntegrity(manifest, restored) {
  const expected = manifest.integrity;
  const expectedTables = [...INTEGRITY_TABLES].sort();
  if (
    expected.migrationCount !== restored.migrationCount ||
    JSON.stringify(expected.canonicalTables) !== JSON.stringify(expectedTables) ||
    JSON.stringify(restored.canonicalTables) !== JSON.stringify(expectedTables) ||
    JSON.stringify(expected.rowCounts) !== JSON.stringify(restored.rowCounts)
  ) {
    throw new Error("Restored migration/schema/data aggregate fingerprint did not match the backup manifest.");
  }
}

async function recordResult(backupDir, status, phase, reason, detail = "") {
  await writeResult(backupDir, resultBase(status, phase, reason, detail));
  console.log(`Restore smoke result written to ${join(backupDir, RESULT_FILE).replace(`${process.cwd()}/`, "")}`);
}

async function isContainerRunning(containerName) {
  const result = await runCommand("docker", ["inspect", "-f", "{{.State.Running}}", containerName], {
    captureStdout: true,
  });
  return result.ok && result.stdout.trim() === "true";
}

async function waitForPostgresReady(containerName) {
  const startedAt = Date.now();
  let lastDetail = "";

  while (Date.now() - startedAt < WAIT_TIMEOUT_MS) {
    if (!(await isContainerRunning(containerName))) {
      throw new Error("Temporary restore-smoke Postgres container exited before readiness.");
    }

    const probe = await runCommand("docker", [
      "exec",
      containerName,
      "pg_isready",
      "-h",
      "127.0.0.1",
      "-p",
      "5432",
      "-U",
      CONTAINER_USER,
      "-d",
      MAINTENANCE_DB,
    ]);

    if (probe.ok) {
      await new Promise((resolve) => setTimeout(resolve, READY_STABILITY_MS));

      const confirm = await runCommand("docker", [
        "exec",
        containerName,
        "pg_isready",
        "-h",
        "127.0.0.1",
        "-p",
        "5432",
        "-U",
        CONTAINER_USER,
        "-d",
        MAINTENANCE_DB,
      ]);

      if (confirm.ok) return;
      lastDetail = confirm.stderr;
    } else {
      lastDetail = probe.stderr;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Temporary restore-smoke Postgres container did not become ready. ${lastDetail}`);
}

function psqlCommand(containerName, databaseName, extraArgs = []) {
  return [
    "exec",
    "-i",
    "-e",
    `PGPASSWORD=${CONTAINER_PASSWORD}`,
    containerName,
    "psql",
    "-v",
    "ON_ERROR_STOP=1",
    "-h",
    "127.0.0.1",
    "-p",
    "5432",
    "-U",
    CONTAINER_USER,
    "-d",
    databaseName,
    ...extraArgs,
  ];
}

function classifyRestoreFailure(error) {
  const detail = error instanceof Error ? error.message : String(error);
  const normalized = detail.toLowerCase();

  if (/role "[^"]+" does not exist/i.test(detail) || normalized.includes("role does not exist")) {
    return {
      status: "BLOCKED_RESTORE_SMOKE_ROLE_COMPATIBILITY",
      reason: "Restore-smoke SQL requires Supabase/Postgres roles that are not present in the isolated container.",
      detail,
    };
  }

  if (
    normalized.includes("schema \"auth\" does not exist") ||
    normalized.includes("function auth.") ||
    normalized.includes("auth.uid") ||
    normalized.includes("auth.jwt") ||
    normalized.includes("auth schema")
  ) {
    return {
      status: "BLOCKED_RESTORE_SMOKE_AUTH_SCHEMA_COMPATIBILITY",
      reason: "Restore-smoke SQL requires Supabase Auth schema objects that were not safely bootstrapped.",
      detail,
    };
  }

  if (
    normalized.includes("extension") ||
    normalized.includes("could not open extension control file") ||
    normalized.includes("must be owner of extension") ||
    normalized.includes("schema \"extensions\" does not exist")
  ) {
    return {
      status: "BLOCKED_RESTORE_SMOKE_EXTENSION_COMPATIBILITY",
      reason: "Restore-smoke SQL requires Postgres/Supabase extension compatibility not present in the isolated container.",
      detail,
    };
  }

  return {
    status: "BLOCKED_RESTORE_SMOKE_SQL_COMPATIBILITY",
    reason: "Restore-smoke SQL was not compatible with the isolated Postgres container.",
    detail,
  };
}

async function main() {
  const backupDir = backupDirFromArg();
  let manifest;

  try {
    manifest = await validateBackupFolder(backupDir);
  } catch (error) {
    await recordResult(
      backupDir,
      "BLOCKED_RESTORE_SMOKE_ARTIFACTS",
      "artifact validation",
      "Backup folder is missing required restore-smoke artifacts.",
      error instanceof Error ? error.message : String(error),
    );
    process.exitCode = 1;
    return;
  }

  const dockerInfo = await runCommand("docker", ["info", "--format", "{{.ServerVersion}}"]);
  if (!dockerInfo.ok) {
    await recordResult(
      backupDir,
      "BLOCKED_RESTORE_SMOKE_ENVIRONMENT",
      "docker availability",
      "Docker daemon is not available.",
      dockerInfo.stderr,
    );
    process.exitCode = 1;
    return;
  }

  const imageCheck = await runCommand("docker", ["image", "inspect", DEFAULT_IMAGE]);
  if (!imageCheck.ok) {
    await recordResult(
      backupDir,
      "BLOCKED_RESTORE_SMOKE_ENVIRONMENT",
      "image availability",
      "Restore-smoke Docker image is not present locally. Pulling images is outside this script.",
      imageCheck.stderr,
    );
    process.exitCode = 1;
    return;
  }

  const containerName = `life-os-restore-smoke-${timestampForName()}-${process.pid}`;
  let containerStarted = false;
  let currentPhase = "container start";

  try {
    await runRequired(
      "docker",
      [
        "run",
        "--rm",
        "-d",
        "--name",
        containerName,
        "-e",
        `POSTGRES_PASSWORD=${CONTAINER_PASSWORD}`,
        "-e",
        `POSTGRES_DB=${CONTAINER_DB}`,
        DEFAULT_IMAGE,
      ],
      { label: "restore smoke container start" },
    );
    containerStarted = true;

    currentPhase = "container readiness";
    await waitForPostgresReady(containerName);

    currentPhase = "supabase compatibility bootstrap";
    await runRequired("docker", psqlCommand(containerName, MAINTENANCE_DB, ["-c", COMPATIBILITY_BOOTSTRAP_SQL]), {
      label: "supabase compatibility bootstrap",
    });

    for (const step of [
      { phase: "restore schema", file: "schema.sql", database: CONTAINER_DB },
      { phase: "restore data", file: "data.sql", database: CONTAINER_DB },
    ]) {
      try {
        await runRequired("docker", psqlCommand(containerName, step.database), {
          inputFile: join(backupDir, step.file),
          label: step.phase,
        });
      } catch (error) {
        const classification = classifyRestoreFailure(error);
        await recordResult(
          backupDir,
          classification.status,
          step.phase,
          classification.reason,
          classification.detail,
        );
        process.exitCode = 1;
        return;
      }
    }

    currentPhase = "integrity verification";
    const restoredIntegrity = await restoredIntegritySnapshot(containerName);
    assertRestoredIntegrity(manifest, restoredIntegrity);

    currentPhase = "result write";
    await writeResult(backupDir, {
      status: "PASS_ISOLATED_READABLE_RESTORE",
      checkedAt: new Date().toISOString(),
      image: DEFAULT_IMAGE,
      artifactNames: REQUIRED_FILES,
      compatibilityBootstrapRoles: COMPATIBILITY_BOOTSTRAP_ROLES,
      phase: "restore complete",
      reason: "Schema, migration history, and aggregate canonical-table data restored into an isolated Postgres container after a temporary Supabase role bootstrap.",
      detail: "",
      notes: [
        "The captured roles artifact was validated but intentionally not replayed; the temporary compatibility bootstrap supplies only the fixed Supabase roles needed for schema grants.",
        "Schema, data, migration history, and aggregate canonical-table integrity were verified in an isolated temporary Postgres container.",
        "This is a local logical restore-smoke, not a full Supabase application-runtime or production restore claim.",
        "Active local Life OS database was not changed.",
        "No db reset, remote DB, or deployment was used.",
        "Generated SQL contents were not printed.",
        "Compatibility bootstrap is limited to the temporary restore-smoke container.",
      ],
    });

    console.log(`Restore smoke passed. Result written to ${join(backupDir, RESULT_FILE).replace(`${process.cwd()}/`, "")}`);
  } catch (error) {
    const environmentPhases = new Set(["container start", "container readiness"]);
    let status = environmentPhases.has(currentPhase)
      ? "BLOCKED_RESTORE_SMOKE_ENVIRONMENT"
      : "FAILED_RESTORE_SMOKE_UNKNOWN";
    let reason = environmentPhases.has(currentPhase)
      ? "Restore-smoke container did not start or become ready."
      : "Restore-smoke failed after container readiness for an unexpected reason.";

    if (currentPhase === "supabase compatibility bootstrap") {
      status = "BLOCKED_RESTORE_SMOKE_ROLE_COMPATIBILITY";
      reason = "Temporary Supabase role compatibility bootstrap failed in the isolated container.";
    }

    await recordResult(
      backupDir,
      status,
      currentPhase,
      reason,
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    if (containerStarted) {
      await runCommand("docker", ["stop", containerName]);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

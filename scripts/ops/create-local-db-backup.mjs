#!/usr/bin/env node
import { createWriteStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import {
  CANONICAL_TARGET_PROJECT,
  assertCanonicalTargetRuntime,
  assertOptionalDbUrlTargetsCanonicalTarget,
  run,
} from "./local-runtime-contract.mjs";

const DRILL_VERSION = "z1-canonical-target-logical-v2";
const BACKUP_ROOT = join(process.cwd(), "backups", "local-drills");
const SCHEMAS = ["public", "auth", "supabase_migrations"];
const INTEGRITY_TABLES = ["profiles", "tasks", "projects", "resources", "meals"];

function timestampForPath(date = new Date()) {
  return date.toISOString().replaceAll("-", "").replaceAll(":", "").replace(/\.\d{3}Z$/, "Z");
}

function runDockerDump(containerName, args, outputFile, label) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", containerName, ...args], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    const fileStream = createWriteStream(outputFile, { flags: "w" });
    child.stdout.pipe(fileStream);
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    let childCode = null;
    let childError = null;
    let streamError = null;
    let streamFinished = false;

    const settle = () => {
      if (childCode === null || !streamFinished) return;
      if (childError) return reject(new Error(`${label} failed to start: ${childError.message}`));
      if (streamError) return reject(new Error(`${label} could not write its local artifact.`));
      if (childCode !== 0) return reject(new Error(`${label} failed with exit code ${childCode}. ${stderr.slice(0, 1200)}`));
      resolve();
    };

    child.on("error", (error) => {
      childError = error;
      childCode = -1;
      settle();
    });
    child.on("close", (code) => {
      childCode = code ?? -1;
      settle();
    });
    fileStream.on("error", (error) => {
      streamError = error;
      streamFinished = true;
      settle();
    });
    fileStream.on("finish", () => {
      streamFinished = true;
      settle();
    });
  });
}

async function writeManifest(backupDir, manifest) {
  await writeFile(join(backupDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

async function targetIntegritySnapshot(containerName) {
  const query = `
    select json_build_object(
      'migrationCount', (select count(*) from supabase_migrations.schema_migrations),
      'canonicalTables', (select coalesce(json_agg(tablename order by tablename), '[]'::json)
        from pg_tables where schemaname = 'public' and tablename = any(array[${INTEGRITY_TABLES.map((table) => `'${table}'`).join(",")}])) ,
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
  const result = await run("docker", ["exec", containerName, "psql", "-U", "postgres", "-d", "postgres", "-At", "-v", "ON_ERROR_STOP=1", "-c", query]);
  if (!result.ok) throw new Error("Canonical Target integrity metadata query failed.");

  let snapshot;
  try {
    snapshot = JSON.parse(result.stdout.trim());
  } catch {
    throw new Error("Canonical Target integrity metadata was unreadable.");
  }

  if (
    snapshot.migrationCount < 1 ||
    JSON.stringify(snapshot.canonicalTables) !== JSON.stringify([...INTEGRITY_TABLES].sort())
  ) {
    throw new Error("Canonical Target schema fingerprint does not meet the backup contract.");
  }
  return snapshot;
}

async function main() {
  const canonicalTarget = await assertCanonicalTargetRuntime();
  assertOptionalDbUrlTargetsCanonicalTarget(process.env.LIFE_OS_LOCAL_DB_URL, canonicalTarget);
  const integrity = await targetIntegritySnapshot(canonicalTarget.containerName);

  const createdAt = new Date().toISOString();
  const backupDir = join(BACKUP_ROOT, timestampForPath(new Date(createdAt)));
  const rolesFile = join(backupDir, "roles.sql");
  const schemaFile = join(backupDir, "schema.sql");
  const dataFile = join(backupDir, "data.sql");
  const artifactNames = ["roles.sql", "schema.sql", "data.sql", "manifest.json"];
  const baseManifest = {
    drillVersion: DRILL_VERSION,
    createdAt,
    artifactNames,
    schemas: SCHEMAS,
    integrity,
    runtime: {
      classification: "CANONICAL_TARGET",
      dockerProject: CANONICAL_TARGET_PROJECT,
    },
    commands: [
      { name: "dump roles", artifact: "roles.sql" },
      { name: "dump schema", artifact: "schema.sql" },
      { name: "dump data", artifact: "data.sql" },
    ],
    status: "BACKUP_STARTED",
    notes: [
      "The backup command targets only the guarded canonical Target Docker database container.",
      "If LIFE_OS_LOCAL_DB_URL is supplied for an operator workflow, it is checked against the Target port and never written to this manifest.",
      "Backup artifacts may contain local personal data and must stay under ignored backups/ paths.",
      "Do not commit, paste, or print generated SQL files.",
    ],
  };

  await mkdir(backupDir, { recursive: true });
  await writeManifest(backupDir, baseManifest);

  try {
    await runDockerDump(canonicalTarget.containerName, ["pg_dumpall", "-U", "postgres", "--roles-only"], rolesFile, "roles dump");
    await runDockerDump(
      canonicalTarget.containerName,
      [
        "pg_dump",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "--schema-only",
        "--clean",
        "--if-exists",
        ...SCHEMAS.map((schema) => `--schema=${schema}`),
      ],
      schemaFile,
      "schema dump",
    );
    await runDockerDump(
      canonicalTarget.containerName,
      ["pg_dump", "-U", "postgres", "-d", "postgres", "--data-only", "--inserts", ...SCHEMAS.map((schema) => `--schema=${schema}`)],
      dataFile,
      "data dump",
    );

    await writeManifest(backupDir, {
      ...baseManifest,
      completedAt: new Date().toISOString(),
      status: "BACKUP_CREATED",
    });

    console.log(`Local backup drill artifacts written under ${backupDir.replace(`${process.cwd()}/`, "")}`);
  } catch (error) {
    await writeManifest(backupDir, {
      ...baseManifest,
      completedAt: new Date().toISOString(),
      status: "BACKUP_FAILED",
      error: error instanceof Error ? error.message : "Unknown backup failure.",
    });

    throw error;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

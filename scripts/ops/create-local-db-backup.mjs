#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";

const REQUIRED_ENV_MESSAGE =
  "Set LIFE_OS_LOCAL_DB_URL in your local shell. Do not commit or print it.";

const DRILL_VERSION = "w1.1b.4-local-db-logical-v1";
const BACKUP_ROOT = join(process.cwd(), "backups", "local-drills");
const SCHEMAS = "public,auth";

function timestampForPath(date = new Date()) {
  return date.toISOString().replaceAll("-", "").replaceAll(":", "").replace(/\.\d{3}Z$/, "Z");
}

function assertDbUrl(value) {
  if (!value) {
    throw new Error(REQUIRED_ENV_MESSAGE);
  }

  if (!value.startsWith("postgres://") && !value.startsWith("postgresql://")) {
    throw new Error("LIFE_OS_LOCAL_DB_URL must be a Postgres connection string. Do not print it.");
  }
}

function sanitizedError(errorText) {
  if (!errorText) return "Command failed without stderr.";
  return errorText.replaceAll(process.env.LIFE_OS_LOCAL_DB_URL ?? "", "[redacted-db-url]").slice(0, 1600);
}

function runSupabaseDump(args, label) {
  return new Promise((resolve, reject) => {
    const child = spawn("pnpm", ["exec", "supabase", "db", "dump", ...args], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "ignore", "pipe"],
    });

    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      reject(new Error(`${label} failed to start: ${error.message}`));
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${label} failed with exit code ${code}. ${sanitizedError(stderr)}`));
    });
  });
}

async function writeManifest(backupDir, manifest) {
  await writeFile(join(backupDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

async function main() {
  const dbUrl = process.env.LIFE_OS_LOCAL_DB_URL;
  assertDbUrl(dbUrl);

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
    schemas: SCHEMAS.split(","),
    commands: [
      { name: "dump roles", artifact: "roles.sql" },
      { name: "dump schema", artifact: "schema.sql" },
      { name: "dump data", artifact: "data.sql" },
    ],
    status: "BACKUP_STARTED",
    notes: [
      "DB URL is read only from LIFE_OS_LOCAL_DB_URL and is never written to this manifest.",
      "Backup artifacts may contain local personal data and must stay under ignored backups/ paths.",
      "Do not commit, paste, or print generated SQL files.",
    ],
  };

  await mkdir(backupDir, { recursive: true });
  await writeManifest(backupDir, baseManifest);

  try {
    await runSupabaseDump(["--db-url", dbUrl, "--role-only", "--file", rolesFile], "roles dump");
    await runSupabaseDump(["--db-url", dbUrl, "--schema", SCHEMAS, "--file", schemaFile], "schema dump");
    await runSupabaseDump(
      ["--db-url", dbUrl, "--schema", SCHEMAS, "--data-only", "--use-copy", "--file", dataFile],
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

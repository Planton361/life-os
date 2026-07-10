#!/usr/bin/env node
import { createReadStream } from "node:fs";
import { access, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

const REQUIRED_FILES = ["roles.sql", "schema.sql", "data.sql", "manifest.json"];
const DEFAULT_IMAGE = process.env.LIFE_OS_RESTORE_SMOKE_IMAGE ?? "postgres:17-alpine";
const RESULT_FILE = "restore-smoke-result.json";
const CONTAINER_DB = "life_os_restore_smoke";
const CONTAINER_USER = "postgres";
const CONTAINER_PASSWORD = "life_os_restore_smoke";

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

function runCommand(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: options.env ?? process.env,
      stdio: options.inputFile ? ["pipe", "ignore", "pipe"] : ["ignore", "ignore", "pipe"],
    });

    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      resolve({ ok: false, code: null, stderr: error.message });
    });

    child.on("close", (code) => {
      resolve({ ok: code === 0, code, stderr: sanitized(stderr) });
    });

    if (options.inputFile) {
      const stream = createReadStream(options.inputFile);
      stream.on("error", (error) => {
        child.stdin.destroy(error);
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
}

async function block(backupDir, reason, detail = "") {
  const result = {
    status: "BLOCKED_RESTORE_SMOKE_ENVIRONMENT",
    checkedAt: new Date().toISOString(),
    image: DEFAULT_IMAGE,
    artifactNames: REQUIRED_FILES,
    reason,
    detail: sanitized(detail),
    notes: [
      "Active local Life OS database was not changed.",
      "No db reset, remote DB, or deployment was used.",
      "Generated SQL contents were not printed.",
    ],
  };

  await writeResult(backupDir, result);
  console.log(`Restore smoke safely blocked. Result written to ${join(backupDir, RESULT_FILE).replace(`${process.cwd()}/`, "")}`);
}

async function main() {
  const backupDir = backupDirFromArg();
  await validateBackupFolder(backupDir);

  const dockerInfo = await runCommand("docker", ["info", "--format", "{{.ServerVersion}}"]);
  if (!dockerInfo.ok) {
    await block(backupDir, "Docker daemon is not available.", dockerInfo.stderr);
    return;
  }

  const imageCheck = await runCommand("docker", ["image", "inspect", DEFAULT_IMAGE]);
  if (!imageCheck.ok) {
    await block(
      backupDir,
      "Restore-smoke Docker image is not present locally. Pulling images is outside this script.",
      imageCheck.stderr,
    );
    return;
  }

  const containerName = `life-os-restore-smoke-${timestampForName()}`;
  let containerStarted = false;

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

    let ready = false;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const probe = await runCommand("docker", [
        "exec",
        containerName,
        "pg_isready",
        "-U",
        CONTAINER_USER,
        "-d",
        CONTAINER_DB,
      ]);
      if (probe.ok) {
        ready = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (!ready) {
      throw new Error("Temporary restore-smoke Postgres container did not become ready.");
    }

    const psqlBase = [
      "exec",
      "-i",
      "-e",
      `PGPASSWORD=${CONTAINER_PASSWORD}`,
      containerName,
      "psql",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      CONTAINER_USER,
      "-d",
      CONTAINER_DB,
    ];

    await runRequired("docker", psqlBase, {
      inputFile: join(backupDir, "roles.sql"),
      label: "restore roles",
    });
    await runRequired("docker", psqlBase, {
      inputFile: join(backupDir, "schema.sql"),
      label: "restore schema",
    });
    await runRequired("docker", psqlBase, {
      inputFile: join(backupDir, "data.sql"),
      label: "restore data",
    });

    await writeResult(backupDir, {
      status: "RESTORE_SMOKE_PASS",
      checkedAt: new Date().toISOString(),
      image: DEFAULT_IMAGE,
      artifactNames: REQUIRED_FILES,
      notes: [
        "Roles, schema, and data restored into an isolated temporary Postgres container.",
        "Active local Life OS database was not changed.",
        "No db reset, remote DB, or deployment was used.",
        "Generated SQL contents were not printed.",
      ],
    });

    console.log(`Restore smoke passed. Result written to ${join(backupDir, RESULT_FILE).replace(`${process.cwd()}/`, "")}`);
  } catch (error) {
    await block(
      backupDir,
      "Restore-smoke failed in isolated Postgres and is treated as a technical blocker.",
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

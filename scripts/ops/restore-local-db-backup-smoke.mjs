#!/usr/bin/env node
import { createReadStream } from "node:fs";
import { access, stat, writeFile } from "node:fs/promises";
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
    phase,
    reason,
    detail: sanitized(detail),
    notes: [
      "Active local Life OS database was not changed.",
      "No db reset, remote DB, or deployment was used.",
      "Generated SQL contents were not printed.",
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

function psqlCommand(containerName, databaseName) {
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
  ];
}

async function main() {
  const backupDir = backupDirFromArg();

  try {
    await validateBackupFolder(backupDir);
  } catch (error) {
    await recordResult(
      backupDir,
      "BLOCKED_RESTORE_SMOKE_ARTIFACTS",
      "artifact validation",
      "Backup folder is missing required restore-smoke artifacts.",
      error instanceof Error ? error.message : String(error),
    );
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

    for (const step of [
      { phase: "restore roles", file: "roles.sql", database: MAINTENANCE_DB },
      { phase: "restore schema", file: "schema.sql", database: CONTAINER_DB },
      { phase: "restore data", file: "data.sql", database: CONTAINER_DB },
    ]) {
      try {
        await runRequired("docker", psqlCommand(containerName, step.database), {
          inputFile: join(backupDir, step.file),
          label: step.phase,
        });
      } catch (error) {
        await recordResult(
          backupDir,
          "BLOCKED_RESTORE_SMOKE_SQL_COMPATIBILITY",
          step.phase,
          "Restore-smoke SQL was not compatible with the isolated Postgres container.",
          error instanceof Error ? error.message : String(error),
        );
        return;
      }
    }

    currentPhase = "result write";
    await writeResult(backupDir, {
      status: "PASS",
      checkedAt: new Date().toISOString(),
      image: DEFAULT_IMAGE,
      artifactNames: REQUIRED_FILES,
      phase: "restore complete",
      reason: "Roles, schema, and data restored into isolated Postgres.",
      detail: "",
      notes: [
        "Roles, schema, and data restored into an isolated temporary Postgres container.",
        "Active local Life OS database was not changed.",
        "No db reset, remote DB, or deployment was used.",
        "Generated SQL contents were not printed.",
      ],
    });

    console.log(`Restore smoke passed. Result written to ${join(backupDir, RESULT_FILE).replace(`${process.cwd()}/`, "")}`);
  } catch (error) {
    const environmentPhases = new Set(["container start", "container readiness"]);
    const status = environmentPhases.has(currentPhase)
      ? "BLOCKED_RESTORE_SMOKE_ENVIRONMENT"
      : "FAILED_RESTORE_SMOKE_UNKNOWN";
    const reason = environmentPhases.has(currentPhase)
      ? "Restore-smoke container did not start or become ready."
      : "Restore-smoke failed after container readiness for an unexpected reason.";

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

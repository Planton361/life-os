import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { request } from "node:http";
import { dirname, join } from "node:path";
import { hostname } from "node:os";
import { randomUUID } from "node:crypto";
import { atomicJson, appEnvironment, pause } from "./preview-cd-host.mjs";
import {
  databaseIdentity,
  digest,
  inspectDatabase,
} from "./linux-preview-database.mjs";

export function linuxGrant(config, release, owner, instance = randomUUID()) {
  return {
    version: 2,
    schema: 10,
    instance,
    host: hostname(),
    uid: process.getuid(),
    ...databaseIdentity(config.database),
    owner,
    origin: config.origin,
    login: config.ownerLogin,
    release: { ...release },
  };
}

// Child output can contain private paths, logins or data. Retain only a bounded
// tail and report fixed categories, never the output itself.
const diagnosticCategories = [
  ["LINUX_OPERATOR_PARENT_REQUIRED", "PARENT_REQUIRED"],
  ["PREVIEW_LAUNCH_DENIED", "PREVIEW_DENIED"],
  ["PREVIEW_COMPOSITION_REQUIRED", "PREVIEW_COMPOSITION"],
  ["PATH_BOUNDARY_INVALID", "PATH_BOUNDARY"],
  ["SQLITE_WRITER_ALREADY_RUNNING", "WRITER_BUSY"],
  ["SQLITE_SCHEMA_VERSION_MISMATCH", "SCHEMA_MISMATCH"],
  ["SQLITE_OWNER_INVALID", "OWNER_INVALID"],
  ["SQLITE_INTEGRITY_FAILED", "INTEGRITY_FAILED"],
  ["SQLITE_COMPATIBILITY_NOT_READY", "COMPATIBILITY_NOT_READY"],
  ["SQLITE_CANONICAL_CATALOG_INVALID", "CATALOG_INVALID"],
  ["HOSTED_APPLICATION_CONFIGURATION_REQUIRED", "HOSTED_CONFIGURATION"],
  ["LIFE_OS_RUNTIME_STARTUP_DENIED", "RUNTIME_DENIED"],
];
const diagnosticLimit = 16_384;

function childFailure(result, output) {
  if (result.spawnFailed) return "LINUX_PREVIEW_CHILD_SPAWN_FAILED";
  const diagnostic =
    diagnosticCategories.find(([code]) => output.includes(code))?.[1] ??
    "UNCLASSIFIED";
  if (Number.isInteger(result.code) && result.code >= 0 && result.code <= 255)
    return `LINUX_PREVIEW_CHILD_EXIT_${result.code}_${diagnostic}`;
  const signal = ["SIGINT", "SIGTERM", "SIGKILL", "SIGHUP"].includes(result.signal)
    ? result.signal
    : "OTHER";
  return `LINUX_PREVIEW_CHILD_SIGNAL_${signal}_${diagnostic}`;
}

export async function runLinuxApplication(config, release, grantPath) {
  const child = spawn(
    config.node,
    [
      "--import",
      join(release.path, "scripts/ops/linux-preview-parent.mjs"),
      "scripts/ops/run-preview-production.mjs",
    ],
    {
      cwd: release.path,
      env: {
        ...appEnvironment({ ...config, preview: { version: 2, grantPath } }),
        LIFE_OS_LINUX_OPERATOR_PID: String(process.pid),
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let stdout = "", stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout = (stdout + chunk.toString()).slice(-diagnosticLimit);
  });
  child.stderr.on("data", (chunk) => {
    stderr = (stderr + chunk.toString()).slice(-diagnosticLimit);
  });
  const stop = () => child.kill("SIGTERM");
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  try {
    const result = await new Promise((resolve) => {
      // `close` follows stdio drain; `exit` alone can lose the last diagnostic.
      child.once("close", (code, signal) => resolve({ code, signal }));
      child.once("error", () => resolve({ spawnFailed: true }));
    });
    if (![130, 143].includes(result.code))
      throw new Error(childFailure(result, `${stderr}\n${stdout}`));
  } finally {
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
  }
}

function get(port, config, path) {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        host: "127.0.0.1",
        port,
        path,
        method: "GET",
        headers: {
          host: new URL(config.origin).host,
          "tailscale-user-login": config.ownerLogin,
          cookie: "life_os_profile=manual",
        },
      },
      (response) => {
        let html = "";
        response.on("data", (chunk) => {
          html += chunk;
        });
        response.on("end", () =>
          resolve({ status: response.statusCode, html }),
        );
        response.on("error", reject);
      },
    );
    req.setTimeout(5000, () =>
      req.destroy(new Error("LINUX_RESTORE_READ_TIMEOUT")),
    );
    req.on("error", reject);
    req.end();
  });
}

// Normal Next application + hosted auth/read services + existing preview
// launcher; only the verified restore has a grant and alternate loopback port.
// GET-only: no reset, form submit, migration, source lease or personal listener.
export async function proveRestoredApplication(config, release, proof) {
  const folder = dirname(proof.restore),
    restoreConfig = { ...config, database: proof.restore },
    grantPath = join(folder, "restore-grant.json");
  atomicJson(grantPath, linuxGrant(restoreConfig, release, proof.source.owner));
  atomicJson(join(folder, "restore-launch.json"), {
    restore: proof.restore,
    identity: proof.restoreIdentity,
    pid: process.pid,
  });
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  if ([3000, 3001].includes(port))
    throw new Error("LINUX_RESTORE_PORT_RESERVED");
  const child = spawn(
    config.node,
    [
      "--import",
      join(release.path, "scripts/ops/linux-preview-parent.mjs"),
      "--import",
      join(release.path, "scripts/ops/linux-preview-restore-port.mjs"),
      "scripts/ops/run-preview-production.mjs",
    ],
    {
      cwd: release.path,
      env: {
        ...appEnvironment({
          ...restoreConfig,
          preview: { version: 2, grantPath },
        }),
        LIFE_OS_LINUX_RESTORE_PORT: String(port),
        LIFE_OS_LINUX_OPERATOR_PID: String(process.pid),
      },
      stdio: ["ignore", "ignore", "ignore"],
    },
  );
  const exited = new Promise((resolve) => {
    child.once("exit", (code, signal) => resolve({ code, signal }));
    child.once("error", () => resolve({ code: -1 }));
  });
  let cancelled = false;
  const cancel = () => {
    cancelled = true;
    child.kill("SIGTERM");
  };
  const stop = () => child.kill("SIGTERM");
  process.once("SIGINT", cancel);
  process.once("SIGTERM", cancel);
  try {
    let ready = false;
    for (let n = 0; n < 150; n++) {
      if (child.exitCode !== null || child.signalCode !== null) break;
      try {
        const result = await get(port, config, "/settings");
        if (
          result.status === 200 &&
          result.html.includes("Testdaten zurücksetzen")
        ) {
          ready = true;
          break;
        }
      } catch {
        /* exact child may still be starting */
      }
      await pause(100);
    }
    if (!ready) throw new Error("LINUX_RESTORED_APPLICATION_FAILED");
    for (const path of ["/dashboard", "/today", "/projects", "/life/journal"]) {
      const result = await get(port, config, path);
      if (result.status !== 200 || !result.html.includes("life-os-canvas"))
        throw new Error("LINUX_RESTORED_APPLICATION_FAILED");
    }
  } finally {
    stop();
    let timer;
    try {
      const result = await Promise.race([
        exited,
        new Promise((_, reject) => {
          timer = setTimeout(
            () => reject(new Error("LINUX_RESTORE_SHUTDOWN_BLOCKED")),
            30_000,
          );
        }),
      ]);
      if (result.code !== 143 && result.code !== 130)
        throw new Error("LINUX_RESTORE_SHUTDOWN_BLOCKED");
    } finally {
      clearTimeout(timer);
      process.removeListener("SIGINT", cancel);
      process.removeListener("SIGTERM", cancel);
      // Preserve all restore/backup artifacts. Never force-kill a SQLite writer.
    }
  }
  if (cancelled) throw new Error("LINUX_OPERATOR_CANCELLED");
  const after = inspectDatabase(release.path, proof.restore, { rows: true });
  if (
    digest(after.data) !== digest(proof.data) ||
    after.schemaHash !== proof.schemaHash
  )
    throw new Error("LINUX_RESTORED_APPLICATION_CHANGED_DATA");
  proof.application = "PASS";
}

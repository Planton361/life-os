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
      stdio: ["ignore", "ignore", "ignore"],
    },
  );
  const stop = () => child.kill("SIGTERM");
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  try {
    const result = await new Promise((resolve) => {
      child.once("exit", (code, signal) => resolve({ code, signal }));
      child.once("error", () => resolve({ code: -1 }));
    });
    if (![130, 143].includes(result.code))
      throw new Error("LINUX_PREVIEW_APPLICATION_FAILED");
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

import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync, realpathSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { productionDatabaseModule } from "../../scripts/ops/sqlite-server-modules.mjs";

// Real existing gateway only. No Serve configuration, auth headers, personal
// database path, environment-file reads or synthetic authentication.
assert.equal(process.versions.node, "24.21.0");
const status = spawnSync("tailscale", ["status", "--json"], {
  encoding: "utf8",
});
assert.equal(status.status, 0, "Tailscale status unavailable");
const state = JSON.parse(status.stdout);
assert.equal(state.BackendState, "Running");
const login = state.User?.[state.Self.UserID]?.LoginName;
assert.ok(login, "Real Tailscale owner login required");
const origin = `https://${state.Self.DNSName.replace(/\.$/, "")}`;
const serve = spawnSync("tailscale", ["serve", "status"], { encoding: "utf8" });
assert.equal(serve.status, 0);
assert.ok(serve.stdout.includes(origin));
assert.ok(serve.stdout.includes("http://127.0.0.1:3000"));
// Refuse to interrupt an existing app or attach mutations to its datastore.
const probe = createServer();
await new Promise((resolve, reject) => {
  probe.once("error", reject);
  probe.listen(3000, "127.0.0.1", resolve);
});
await new Promise((resolve) => probe.close(resolve));
const directory = mkdtempSync(
  join(realpathSync(tmpdir()), "life-os-112-manual-"),
);
const path = join(directory, "canonical.db");
const { bootstrapProductionDatabase, verifyProductionApplicationDatabase } =
  productionDatabaseModule();
bootstrapProductionDatabase(path, {
  ownerId: randomUUID(),
  displayName: "Issue 112 disposable technical owner",
  timezone: "Europe/Berlin",
});
assert.equal(
  verifyProductionApplicationDatabase(path).datasetKind,
  "canonical",
);
const app = spawn(
  process.execPath,
  [
    "--import",
    fileURLToPath(new URL("./no-supabase-network.mjs", import.meta.url)),
    "scripts/ops/run-production.mjs",
  ],
  {
    env: {
      PATH: process.env.PATH,
      TMPDIR: realpathSync(tmpdir()),
      NODE_ENV: "production",
      LIFE_OS_APPLICATION_RUNTIME: "sqlite-hosted",
      LIFE_OS_HOSTED_SQLITE_PATH: path,
      LIFE_OS_HOSTED_ORIGIN: origin,
      LIFE_OS_HOSTED_OWNER_LOGIN: login,
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let output = "";
app.stdout.on("data", (b) => (output += b));
app.stderr.on("data", (b) => (output += b));
const exited = new Promise((resolve) =>
  app.once("exit", (code, signal) => resolve({ code, signal })),
);
try {
  const deadline = performance.now() + 15000;
  let ready = false;
  while (performance.now() < deadline) {
    assert.equal(app.exitCode, null, "Isolated app exited");
    try {
      const response = await fetch(origin + "/dashboard", {
        headers: { cookie: "life_os_profile=manual" },
      });
      const html = await response.text();
      ready =
        response.ok &&
        html.includes("dashboard-daily") &&
        !html.includes("Manual-Daten gesperrt");
      if (ready) break;
    } catch {
      /* listener starting */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, "Real Tailscale authenticated Manual access unavailable");
  process.stdout.write(
    "#112 isolated canonical SQLite 83/83; real Tailscale Manual access PASS\n",
  );
  const result = await new Promise((resolve) => {
    const child = spawn(
      "pnpm",
      [
        "exec",
        "playwright",
        "test",
        "--config",
        "tests/issue-112-playwright.config.ts",
      ],
      {
        env: {
          PATH: process.env.PATH,
          TMPDIR: realpathSync(tmpdir()),
          LIFE_OS_112_GATEWAY_ORIGIN: origin,
          LIFE_OS_112_DISPOSABLE_HOSTED: "1",
          LIFE_OS_112_OUTPUT: join(directory, "browser"),
        },
        stdio: "inherit",
      },
    );
    child.once("exit", resolve);
  });
  assert.equal(result, 0, "#112 browser proof failed");
  assert.ok(
    !/Supabase network|hydration|Error:/i.test(output),
    "Isolated app console error",
  );
  process.stdout.write(`#112 proof PASS; technical artifacts: ${directory}\n`);
} finally {
  if (app.exitCode === null && app.signalCode === null) app.kill("SIGTERM");
  let timer;
  try {
    const stopped = await Promise.race([
      exited,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("#112 shutdown timeout")),
          10000,
        );
      }),
    ]);
    assert.equal(stopped.code, 143);
  } finally {
    clearTimeout(timer);
    if (app.exitCode === null && app.signalCode === null) app.kill("SIGKILL");
  }
}

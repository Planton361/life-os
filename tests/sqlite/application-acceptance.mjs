import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

// No existing profile, auth state, database, Docker or Supabase runtime is used.
// Each proof owns its fresh private fixture, native preflight/seal and processes.
assert.equal(process.versions.node, "24.21.0");
const resourceOnly = process.argv.includes("--resources");
async function run(command, args) {
  const child = spawn(command, args, {
    stdio: "inherit",
    env: {
      PATH: process.env.PATH,
      TMPDIR: realpathSync(tmpdir()),
      NODE_ENV: "production",
      NEXT_TELEMETRY_DISABLED: "1",
      NODE_OPTIONS: `--import=${fileURLToPath(new URL("./no-supabase-network.mjs", import.meta.url))}`,
    },
  });
  const result = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
  assert.equal(
    result.code,
    0,
    `${command} ${args.join(" ")}: ${JSON.stringify(result)}`,
  );
}
await run("pnpm", [
  "exec",
  "vitest",
  "run",
  "--config",
  "tests/sqlite/application-vitest.config.mjs",
]);
await run("pnpm", ["build"]);
for (const proof of resourceOnly
  ? ["application-resource-proof.mjs"]
  : ["application-smoke.mjs", "application-browser-proof.mjs"])
  await run(process.execPath, [fileURLToPath(new URL(proof, import.meta.url))]);

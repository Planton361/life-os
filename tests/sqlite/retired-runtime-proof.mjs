// Negative production proof only. No profile or database paths are configured,
// and only the retired crash endpoint is requested. Requires a current build.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";

async function port() {
  const server = createServer();
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const address = server.address();
  const value = address.port;
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return value;
}
function start(value, retired) {
  const child = spawn(process.execPath, ["scripts/ops/run-production.mjs", "--hostname", "127.0.0.1", "--port", String(value)], {
    env: { PATH: process.env.PATH, NODE_ENV: "production", ...(retired ? { LIFE_OS_37_PROOF: "1" } : {}) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  const ready = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.stdout.on("data", chunk => { output += chunk.toString(); if (/Ready in/.test(output)) resolve(); });
    child.stderr.on("data", chunk => { output += chunk.toString(); });
    child.once("exit", () => reject(new Error("PRODUCTION_STARTUP_FAILED")));
  });
  // The rejected startup's ready promise is intentionally not awaited.
  ready.catch(() => {});
  const done = new Promise((resolve, reject) => { child.once("error", reject); child.once("exit", (code, signal) => resolve({ code, signal })); });
  const timeout = setTimeout(() => child.kill("SIGKILL"), 15_000);
  return { child, ready, done, output: () => output, timeout };
}
const denied = start(await port(), true);
try {
  const result = await denied.done;
  assert.notEqual(result.code, 0);
  assert.equal(result.signal, null, denied.output());
  assert.match(denied.output(), /RETIRED_SQLITE_PROOF_CONFIGURATION_DENIED/);
  assert.doesNotMatch(denied.output(), /Ready in/);
  process.stdout.write("PASS retired proof configuration fails production startup\n");
} finally { clearTimeout(denied.timeout); }

const cleanPort = await port(), clean = start(cleanPort, false);
try {
  await clean.ready;
  const response = await fetch(`http://127.0.0.1:${cleanPort}/api/issue-37/crash`, { method: "POST", signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, 404);
  process.stdout.write("PASS retired crash endpoint is unavailable in production\n");
} finally { clean.child.kill("SIGTERM"); await clean.done; clearTimeout(clean.timeout); }

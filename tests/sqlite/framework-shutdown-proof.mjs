import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { compileRuntime } from "./compile-runtime.mjs";

const require = createRequire(import.meta.url);
const compiled = compileRuntime();
const { initializeSyntheticDatabase } = require(join(compiled, "synthetic-database.js"));
const { SqliteRuntime } = require(join(compiled, "runtime.js"));
const owner = "11600000-0000-4000-8000-000000000001";
for (const signal of ["SIGTERM", "SIGINT"]) {
 for (const outcome of ["commit", "rollback"]) {
  const directory = mkdtempSync(join(realpathSync(tmpdir()), "life-os-116-next-drain-"));
  const path = join(directory, "synthetic.db"), id = randomUUID();
  initializeSyntheticDatabase(path, owner);
  const preload = join(directory, "drain.cjs");
  // Attach a disposable proof handler to the real Next HTTP server. Product
  // routes remain untouched. Both the command and shutdown binding are actual
  // feature source; Next owns server drain and its normal signal exit status.
  writeFileSync(preload, `
const { SqliteRuntime, bindFrameworkShutdown } = require(${JSON.stringify(join(compiled, "runtime.js"))});
const { issueOwnerContext } = require(${JSON.stringify(join(compiled, "owner-context.js"))});
const store = new SqliteRuntime(${JSON.stringify(path)}, { syntheticProof: true });
const context = issueOwnerContext(${JSON.stringify(owner)});
bindFrameworkShutdown(store);
const http = require("node:http"), createServer = http.createServer;
http.createServer = function (...args) {
  const index = args.findIndex(arg => typeof arg === "function");
  const handler = args[index];
  args[index] = function (request, response) {
    if (request.url !== "/__116-drain") return handler.call(this, request, response);
    try { store.command(context, "task.create", (db, user) => {
      db.prepare("INSERT INTO tasks(id,user_id,title,created_at,updated_at) VALUES(?,?,'Drain proof',?,?)").run(${JSON.stringify(id)}, user, "2026-10-06T10:00:00.000000Z", "2026-10-06T10:00:00.000000Z");
      process.send({ event: "OPEN_TRANSACTION" });
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
      if (${JSON.stringify(outcome)} === "rollback") throw new Error("CONTROLLED_ROLLBACK");
    }); } catch (error) { if (error.message !== "CONTROLLED_ROLLBACK") throw error; }
    setTimeout(() => {
      let denied = false;
      try { store.command(context, "task.create", () => {}); }
      catch (error) { denied = error.message === "SQLITE_RUNTIME_DRAINING"; }
      const retained = !!store.read(context, db => db.prepare("SELECT id FROM tasks WHERE id=?").get(${JSON.stringify(id)}));
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ denied, retained }));
    }, 300);
  };
  const server = createServer.apply(this, args);
  server.once("listening", () => process.send({ event: "LISTENING", port: server.address().port }));
  return server;
};
`, { mode: 0o600 });
  const child = spawn(process.execPath, ["--require", preload, "scripts/ops/run-production.mjs", "-p", "0", "-H", "127.0.0.1"], {
    env: { PATH: process.env.PATH, NODE_ENV: "production" }, stdio: ["ignore", "pipe", "pipe", "ipc"],
  });
  let errors = "", output = "";
  child.stderr.on("data", chunk => { errors += chunk; });
  child.stdout.on("data", chunk => { output += chunk; });
  const done = new Promise(resolve => child.once("exit", (code, killed) => resolve({ code, killed })));
  const timer = setTimeout(() => child.kill("SIGKILL"), 20_000);
  try {
    const port = await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.on("message", message => { if (message.event === "LISTENING") resolve(message.port); });
      child.once("exit", () => reject(new Error(errors + output)));
    });
    // Wait for Next's request handlers (LISTENING precedes readiness).
    await fetch(`http://127.0.0.1:${port}/api/issue-37/crash`, { method: "POST" });
    child.on("message", message => { if (message.event === "OPEN_TRANSACTION") child.kill(signal); });
    const response = await fetch(`http://127.0.0.1:${port}/__116-drain`);
    assert.deepEqual(await response.json(), { denied: true, retained: outcome === "commit" });
    assert.deepEqual(await done, { code: signal === "SIGINT" ? 130 : 143, killed: null });
    const db = new Database(path, { readonly: true });
    assert.deepEqual(db.prepare("SELECT writer_pid,writer_host,writer_token FROM runtime_metadata").get(), { writer_pid: null, writer_host: null, writer_token: null });
    assert.equal(db.pragma("integrity_check", { simple: true }), "ok");
    assert.deepEqual(db.pragma("foreign_key_check"), []);
    assert.equal(db.prepare("SELECT id FROM tasks WHERE id=?").get(id)?.id, outcome === "commit" ? id : undefined);
    db.close();
    const restarted = new SqliteRuntime(path, { syntheticProof: true }); restarted.close();
    process.stdout.write(`${signal}/${outcome}: Next request drained, command ${outcome}, new write denied, lease released, restart PASS\n`);
  } finally {
    clearTimeout(timer);
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    await done;
  }
 }
}

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { backup } from "node:sqlite";
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { setup, openDb, owner, proofPath } from "./fixture.mjs";

const [dbArg, backupArg, restoreArg, markerArg, portArg = "37338"] = process.argv.slice(2);
if (!dbArg || !backupArg || !restoreArg || !markerArg) {
  throw new Error("usage: node recovery.mjs NEW.db BACKUP.db RESTORE.db MARKER.json [port]");
}
const dbPath = proofPath(dbArg);
const backupPath = proofPath(backupArg);
const restorePath = proofPath(restoreArg);
const markerPath = resolve(markerArg);
if (!markerPath.startsWith("/private/tmp/life-os-37-proof/") || !markerPath.endsWith(".json") ||
  [backupPath, restorePath, markerPath].some(existsSync)) {
  throw new Error("Fresh disposable backup, restore and marker paths required");
}
const port = Number(portArg);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Invalid port");
const baseURL = `http://127.0.0.1:${port}`;
const token = "issue37-synthetic-recovery-session";
const cookie = `life_os_37_proof_owner=${token}`;
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const appCommand = resolve("node_modules/next/dist/bin/next");

async function start(path, marker) {
  const child = spawn(process.execPath, [appCommand, "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: resolve("."),
    env: {
      ...process.env,
      LIFE_OS_37_PROOF: "1",
      LIFE_OS_37_SQLITE_DB: path,
      LIFE_OS_37_OWNER_TOKEN: token,
      ...(marker ? { LIFE_OS_37_CRASH_MARKER: marker } : {}),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let logs = "";
  child.stdout.on("data", (chunk) => { logs += chunk; });
  child.stderr.on("data", (chunk) => { logs += chunk; });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error(`Next exited: ${logs}`);
    try {
      const response = await fetch(baseURL + "/dashboard", { headers: { cookie } });
      const html = await response.text();
      if (response.ok && html.includes("Synthetic Goal")) return { child, logs: () => logs };
    } catch {}
    await sleep(50);
  }
  child.kill("SIGKILL");
  throw new Error(`Next did not serve synthetic Dashboard: ${logs}`);
}

async function stop(child, signal) {
  const exited = new Promise((done) => child.once("exit", done));
  child.kill(signal);
  await exited;
}

async function appReads() {
  const paths = [
    "/dashboard", "/today", "/portfolio",
    "/tasks/37000000-0000-4000-8003-000000000001",
    "/projects/37000000-0000-4000-8002-000000000001",
    "/goals/37000000-0000-4000-8001-000000000001",
  ];
  for (const path of paths) {
    const response = await fetch(baseURL + path, { headers: { cookie } });
    const html = await response.text();
    assert.equal(response.status, 200, path);
    assert.ok(html.includes("Synthetic "), path);
  }
  return paths;
}

function snapshot(path) {
  const db = openDb(path);
  try {
    assert.equal(db.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
    assert.equal(db.prepare("PRAGMA foreign_key_check").all().length, 0);
    const tables = ["owners","goals","projects","tasks","task_dependencies","source_records","schedule_source_links","goal_milestones","goal_achievement_events"];
    const counts = Object.fromEntries(tables.map((table) => [table, db.prepare(`SELECT count(*) AS n FROM ${table}`).get().n]));
    const ids = Object.fromEntries(["goals","projects","tasks"].map((table) => [table,
      db.prepare(`SELECT id FROM ${table} WHERE user_id=? ORDER BY id`).all(owner).map((row) => row.id)]));
    const projections = {
      dashboard: db.prepare("SELECT id,title,status FROM tasks WHERE user_id=? AND archived_at IS NULL ORDER BY id LIMIT 9").all(owner),
      today: db.prepare("SELECT id,title,planned_date,scheduled_start_at,status FROM tasks WHERE user_id=? AND planned_date IS NOT NULL ORDER BY id").all(owner),
      task: db.prepare("SELECT id,title,status,project_id,goal_id FROM tasks WHERE user_id=? AND id=?").get(owner,"37000000-0000-4000-8003-000000000001"),
      project: db.prepare("SELECT id,title,status,goal_id FROM projects WHERE user_id=? AND id=?").get(owner,"37000000-0000-4000-8002-000000000001"),
      goal: db.prepare("SELECT id,title,status FROM goals WHERE user_id=? AND id=?").get(owner,"37000000-0000-4000-8001-000000000001"),
    };
    return {
      userVersion: db.prepare("PRAGMA user_version").get().user_version,
      schemaHash: createHash("sha256").update(db.prepare("SELECT type,name,sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY type,name").all().map((row) => JSON.stringify(row)).join("\n")).digest("hex"),
      counts, ids,
      projectionHash: createHash("sha256").update(JSON.stringify(projections)).digest("hex"),
    };
  } finally { db.close(); }
}

setup(dbPath);
const committedTaskId = randomUUID();
{
  const committed = openDb(dbPath);
  const now = new Date().toISOString();
  committed.exec("BEGIN IMMEDIATE");
  committed.prepare(`INSERT INTO tasks(id,user_id,title,status,priority,created_at,updated_at)
    VALUES(?,?,'Synthetic committed recovery write','planned','P2',?,?)`)
    .run(committedTaskId, owner, now, now);
  committed.exec("COMMIT");
  committed.close();
}
let active;
try {
  active = await start(dbPath, markerPath);
  const crashRequest = fetch(baseURL + "/api/issue-37/crash", { method: "POST", headers: { cookie } }).catch(() => null);
  for (let attempt = 0; attempt < 100 && !existsSync(markerPath); attempt++) await sleep(50);
  assert.ok(existsSync(markerPath), `Crash marker missing: ${active.logs()}`);
  const marker = JSON.parse(readFileSync(markerPath, "utf8"));
  assert.equal(marker.pid, active.child.pid);
  await stop(active.child, "SIGKILL");
  active = null;
  await crashRequest;
  const db = openDb(dbPath);
  assert.equal(db.prepare("SELECT count(*) AS n FROM tasks WHERE id=?").get(marker.taskId).n, 0);
  assert.equal(db.prepare("SELECT count(*) AS n FROM tasks WHERE id=?").get(committedTaskId).n, 1);
  assert.equal(db.prepare("SELECT count(*) AS n FROM tasks WHERE user_id=?").get(owner).n, 81);
  assert.equal(db.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
  assert.equal(db.prepare("PRAGMA foreign_key_check").all().length, 0);
  const checkpoint = db.prepare("PRAGMA wal_checkpoint(TRUNCATE)").get();
  assert.equal(checkpoint.busy, 0);
  await backup(db, backupPath);
  db.close();
  copyFileSync(backupPath, restorePath, 1);
  const before = snapshot(dbPath);
  const after = snapshot(restorePath);
  assert.deepEqual(after, before);
  active = await start(dbPath);
  const originalRoutes = await appReads();
  await stop(active.child, "SIGTERM");
  active = await start(restorePath);
  const restoredRoutes = await appReads();
  await stop(active.child, "SIGTERM");
  active = null;
  console.log(JSON.stringify({ status:"PASS", killedPid:marker.pid, uncommittedTaskAbsent:true, committedTaskPresent:true,
    checkpoint, schemaHash:before.schemaHash, projectionHash:before.projectionHash,
    counts:before.counts, originalRoutes, restoredRoutes, backupPath, restorePath }));
} finally {
  if (active?.child && active.child.exitCode === null) await stop(active.child, "SIGKILL");
}

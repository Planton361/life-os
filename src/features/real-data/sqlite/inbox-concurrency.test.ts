import { fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { initializeSyntheticDatabase } from "./synthetic-database";
import { SqliteRuntime } from "./runtime";
import { issueOwnerContext } from "./owner-context";
import { compileRuntime } from "../../../../tests/sqlite/compile-runtime.mjs";
const compiled = compileRuntime(), owner = "11600000-0000-4000-8000-000000000001", at = "2026-10-06T10:00:00.123456Z";
type Reply = { ready?: boolean; held?: boolean; ok?: boolean; error?: string };
async function worker(path: string) {
  const child = fork("tests/sqlite/inbox-race-worker.mjs", [compiled, path, owner], { stdio: ["ignore", "ignore", "pipe", "ipc"] });
  const queue: Reply[] = [], waiting: ((r: Reply) => void)[] = [];
  let stderr = "", exited = false;
  child.stderr?.on("data", chunk => { stderr += chunk; });
  child.on("message", message => { const waiter = waiting.shift(); if (waiter) waiter(message as Reply); else queue.push(message as Reply); });
  const next = () => queue.length ? Promise.resolve(queue.shift()!) : new Promise<Reply>((resolve, reject) => {
    if (exited) reject(new Error(stderr));
    else { waiting.push(resolve); child.once("exit", () => { if (waiting.includes(resolve)) reject(new Error(stderr || "Worker exited without response")); }); }
  });
  const exit = new Promise<void>(resolve => child.once("exit", () => { exited = true; resolve(); }));
  expect(await next()).toEqual({ ready: true });
  return { child, next, exit, pending: () => queue.length };
}
for (const operation of ["save", "complete"] as const) it(`serializes held ${operation} against stale completion and asserts no duplicate/orphan domain rows`, async () => {
  const path = join(mkdtempSync(join(realpathSync(tmpdir()), "life-os-116-inbox-race-")), "synthetic.db");
  initializeSyntheticDatabase(path, owner);
  const context = issueOwnerContext(owner), store = new SqliteRuntime(path, { syntheticProof: true }), id = randomUUID();
  store.command(context, "inbox.capture", db => db.prepare("INSERT INTO inbox_items(id,user_id,title,body,captured_at,created_at,updated_at) VALUES(?,?,'Capture','Body',?,?,?)").run(id, owner, at, at, at));
  const input = { inboxItemId: id, expectedUpdatedAt: at, title: "Winner clarification", body: "Body", nextAction: "Do it", missingInfo: null, priority: "P2", energy: null, durationMinutes: null, areaId: null, reviewNeeded: false, todayCandidate: false, deadlineHint: null, route: "task", targetId: null };
  const a = await worker(path), b = await worker(path);
  try {
    a.child.send({ operation, input, hold: true });
    expect(await a.next()).toEqual({ held: true });
    b.child.send({ operation: "complete", input: { ...input, title: "Stale loser" } });
    await new Promise(resolve => setTimeout(resolve, 80));
    expect(b.pending()).toBe(0);
    a.child.send("commit");
    const [first, second] = await Promise.all([a.next(), b.next()]);
    expect(first.ok).toBe(true);
    expect(second).toEqual({ ok: false, error: operation === "save" ? "INBOX_STALE" : "INBOX_OPEN_ITEM_UNAVAILABLE" });
    await Promise.all([a.exit, b.exit]);
    expect(store.read(context, db => db.prepare("SELECT title,status,original_title FROM inbox_items WHERE user_id=? AND id=?").get(owner, id))).toEqual({ title: "Winner clarification", status: operation === "save" ? "clarified" : "triaged", original_title: "Capture" });
    expect(store.read(context, db => db.prepare("SELECT count(*) AS n FROM tasks WHERE user_id=?").get(owner))).toEqual({ n: BigInt(operation === "save" ? 0 : 1) });
    for (const table of ["projects", "goals", "resources"]) expect(store.read(context, db => db.prepare(`SELECT count(*) AS n FROM ${table} WHERE user_id=?`).get(owner))).toEqual({ n: BigInt(0) });
  } finally {
    for (const w of [a, b]) if (w.child.exitCode === null && w.child.signalCode === null) w.child.kill("SIGKILL");
    await Promise.all([a.exit, b.exit]); store.close();
  }
}, 15000);

import { mkdtempSync, chmodSync, realpathSync, linkSync, symlinkSync } from "node:fs";
import { tmpdir, hostname } from "node:os";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { initializeSyntheticDatabase } from "./synthetic-database";
import { issueOwnerContext, type OwnerContext } from "./owner-context";
import { configureConnection, SqliteRuntime } from "./runtime";

const ownerA = "11600000-0000-4000-8000-000000000001";
const ownerB = "11600000-0000-4000-8000-000000000002";
const now = "2026-10-06T10:00:00.123456Z";
function fixture() {
  const directory = mkdtempSync(join(realpathSync(tmpdir()), "life-os-116-runtime-"));
  const path = join(directory, "synthetic.db");
  initializeSyntheticDatabase(path, ownerA);
  return { path, directory, context: issueOwnerContext(ownerA) };
}
function project(db: Database.Database, owner: string, id: string) {
  db.prepare("INSERT INTO projects(id,user_id,title,status,created_at,updated_at) VALUES(?,?,'Synthetic Project','active',?,?)").run(id, owner, now, now);
}
function task(db: Database.Database, owner: string, id: string, projectId: string) {
  db.prepare("INSERT INTO tasks(id,user_id,title,project_id,created_at,updated_at) VALUES(?,?,'Synthetic Task',?,?,?)").run(id, owner, projectId, now, now);
}

describe("SQLite runtime foundation", () => {
  it("recovers a stale identity even when its PID has been reused by a live process", () => {
    const { path } = fixture();
    const db = new Database(path);
    db.prepare("UPDATE runtime_metadata SET writer_pid=?,writer_host=?,writer_token=?").run(process.pid, hostname(), randomUUID());
    db.close();
    const store = new SqliteRuntime(path, { syntheticProof: true });
    store.close();
  });
  it("fails closed on a foreign host identity and releases the failed startup lock", () => {
    const { path } = fixture();
    const db = new Database(path);
    db.prepare("UPDATE runtime_metadata SET writer_pid=1,writer_host='foreign-synthetic-host',writer_token=?").run(randomUUID());
    expect(() => new SqliteRuntime(path, { syntheticProof: true })).toThrow("SQLITE_WRITER_HOST_MISMATCH");
    db.prepare("UPDATE runtime_metadata SET writer_pid=NULL,writer_host=NULL,writer_token=NULL").run();
    db.close();
    const store = new SqliteRuntime(path, { syntheticProof: true }); store.close();
  });
  it("denies a second live process and recovers its kernel lease after SIGKILL", async () => {
    const { path } = fixture();
    const child = spawn(process.execPath, ["tests/sqlite/lease-writer.mjs", path], { stdio: ["pipe", "pipe", "pipe"] });
    let output = "", errors = "";
    const exited = new Promise<void>((resolve, reject) => { child.once("error", reject); child.once("exit", () => resolve()); });
    try {
      await new Promise<void>((resolve, reject) => {
        child.stdout.on("data", chunk => { output += chunk; if (output.includes("READY")) resolve(); });
        child.stderr.on("data", chunk => { errors += chunk; });
        child.once("error", reject);
        child.once("exit", () => { if (!output.includes("READY")) reject(new Error(errors)); });
      });
      expect(() => new SqliteRuntime(path, { syntheticProof: true })).toThrow("SQLITE_WRITER_ALREADY_RUNNING");
      child.kill("SIGKILL"); await exited;
      const store = new SqliteRuntime(path, { syntheticProof: true }); store.close();
      const db = new Database(path);
      expect(db.prepare("SELECT writer_pid,writer_host,writer_token FROM runtime_metadata").get()).toEqual({ writer_pid: null, writer_host: null, writer_token: null });
      db.close();
    } finally { if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL"); await exited; }
  }, 15_000);
  it("stops new writes during drain, retains reads, and checkpoints only outside commands", () => {
    const { path, context } = fixture(); const store = new SqliteRuntime(path, { syntheticProof: true });
    const id = randomUUID();
    store.command(context, "project.create", (db, owner) => {
      project(db, owner, id);
      expect(() => store.close()).toThrow("SQLITE_COMMAND_IN_PROGRESS");
    });
    store.stopWrites();
    expect(() => store.command(context, "project.create", () => 1)).toThrow("SQLITE_RUNTIME_DRAINING");
    expect(store.read(context, db => db.prepare("SELECT id FROM projects").get())).toEqual({ id });
    store.close();
    const restarted = new SqliteRuntime(path, { syntheticProof: true }); restarted.close();
  });
  it("allows one app writer and safely releases its lease for restart", () => {
    const { path } = fixture();
    const first = new SqliteRuntime(path, { syntheticProof: true });
    try { expect(() => new SqliteRuntime(path, { syntheticProof: true })).toThrow("SQLITE_WRITER_ALREADY_RUNNING"); }
    finally { first.close(); }
    const restarted = new SqliteRuntime(path, { syntheticProof: true });
    restarted.close();
  });
  it("retains its OS lock after another connection in the same process fails to acquire", async () => {
    const { path } = fixture();
    const store = new SqliteRuntime(path, { syntheticProof: true });
    try {
      expect(() => new SqliteRuntime(path, { syntheticProof: true })).toThrow("SQLITE_WRITER_ALREADY_RUNNING");
      const child = spawn(process.execPath, ["tests/sqlite/lease-writer.mjs", path], { stdio: ["pipe", "pipe", "pipe"] });
      let errors = "";
      child.stderr.on("data", chunk => { errors += chunk; });
      const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
      try {
        const code = await new Promise<number | null>((resolve, reject) => { child.once("error", reject); child.once("exit", resolve); });
        expect(code).toBe(1);
        expect(errors).toContain("SQLITE_WRITER_ALREADY_RUNNING");
      } finally { clearTimeout(timer); if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL"); }
    } finally { store.close(); }
  });
  it("fails closed on missing DB, incomplete compatibility and public file permissions", () => {
    const { path, directory } = fixture();
    expect(() => new SqliteRuntime(join(directory, "missing.db"))).toThrow();
    expect(() => new SqliteRuntime(path)).toThrow("SQLITE_COMPATIBILITY_NOT_READY");
    chmodSync(path, 0o644);
    expect(() => new SqliteRuntime(path, { syntheticProof: true })).toThrow("SQLITE_FILE_BOUNDARY_INVALID");
  });
  it("denies alternate inode aliases and a substituted lease symlink", () => {
    const aliasFixture = fixture();
    linkSync(aliasFixture.path, join(aliasFixture.directory, "alias.db"));
    expect(() => new SqliteRuntime(aliasFixture.path, { syntheticProof: true })).toThrow("SQLITE_FILE_BOUNDARY_INVALID");
    const { path, directory } = fixture();
    symlinkSync(path, join(directory, "synthetic.db.writer-lease.db"));
    expect(() => new SqliteRuntime(path, { syntheticProof: true })).toThrow("SQLITE_LEASE_FILE_BOUNDARY_INVALID");
  });
  it("proves effective pragmas and opaque Owner A / B / unauthenticated boundaries", () => {
    const { path, context } = fixture();
    const store = new SqliteRuntime(path, { syntheticProof: true });
    try {
      expect(store.read(context, (db, owner) => {
        expect(owner).toBe(ownerA);
        return db.prepare("SELECT id FROM profiles WHERE id=?").get(owner);
      })).toEqual({ id: ownerA });
      for (const invalid of [undefined, null, { ownerId: ownerA }, issueOwnerContext(ownerB)])
        expect(() => store.read(invalid as OwnerContext, () => 1)).toThrow();
      expect(() => store.command(issueOwnerContext(ownerB), "task.create", () => 1)).toThrow("OWNER_DENIED");
      const db = new Database(path);
      try { expect(configureConnection(db).sqlite.version).toBe("3.53.4"); }
      finally { db.close(); }
    } finally { store.close(); }
  });
  it("rolls back on thrown invariants and rejects writes in read transactions", () => {
    const { path, context } = fixture(); const store = new SqliteRuntime(path, { syntheticProof: true });
    const id = randomUUID();
    try {
      expect(() => store.command(context, "project.create", (db, owner) => { project(db, owner, id); throw new Error("controlled failure"); })).toThrow("controlled failure");
      expect(store.read(context, (db, owner) => db.prepare("SELECT id FROM projects WHERE user_id=?").all(owner))).toEqual([]);
      expect(() => store.read(context, (db, owner) => project(db, owner, id))).toThrow();
      expect(() => store.command(context, "project.create", (db, owner) => { project(db, owner, id); return Promise.resolve(1); })).toThrow("ASYNC_SQLITE_TRANSACTION_DENIED");
      expect(store.read(context, (db, owner) => db.prepare("SELECT id FROM projects WHERE user_id=?").all(owner))).toEqual([]);
    } finally { store.close(); }
  });
  it("rejects unscoped native writes even outside the repository", () => {
    const { path } = fixture(); const db = new Database(path);
    db.function("life_owner", () => null);
    try {
      expect(() => project(db, ownerA, randomUUID())).toThrow("OWNER_DENIED");
      db.function("life_owner", () => ownerB);
      expect(() => project(db, ownerA, randomUUID())).toThrow("OWNER_DENIED");
    } finally { db.close(); }
  });
  it("translates dependency graph / blocked completion / cross-owner constraints", () => {
    const { path, context } = fixture(); const store = new SqliteRuntime(path, { syntheticProof: true });
    const p = randomUUID(), a = randomUUID(), b = randomUUID();
    try {
      store.command(context, "task.create", (db, owner) => { project(db, owner, p); task(db, owner, a, p); task(db, owner, b, p); });
      const dependency = (from: string, to: string) => store.command(context, "dependency.add", (db, owner) => db.prepare("INSERT INTO task_dependencies(id,user_id,project_id,predecessor_task_id,successor_task_id,created_at) VALUES(?,?,?,?,?,?)").run(randomUUID(), owner, p, from, to, now));
      dependency(a, b);
      expect(() => dependency(b, a)).toThrow("DEPENDENCY_CYCLE");
      expect(() => store.command(context, "task.complete", (db, owner) => db.prepare("UPDATE tasks SET status='done',completed_at=? WHERE user_id=? AND id=?").run(now, owner, b))).toThrow("DEPENDENCY_BLOCKED");
      store.command(context, "task.complete", (db, owner) => {
        db.prepare("UPDATE tasks SET status='done',completed_at=? WHERE user_id=? AND id=?").run(now, owner, a);
        db.prepare("UPDATE tasks SET status='done',completed_at=? WHERE user_id=? AND id=?").run(now, owner, b);
      });
      expect(() => store.command(context, "task.move", (db, owner) => db.prepare("UPDATE tasks SET project_id=NULL WHERE user_id=? AND id=?").run(owner, a))).toThrow("DEPENDENCY_PROJECT_MOVE");
      expect(() => store.command(context, "task.create", (db) => task(db, ownerB, randomUUID(), p))).toThrow("OWNER_DENIED");
    } finally { store.close(); }
  });
});

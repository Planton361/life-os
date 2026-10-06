import { mkdtempSync, chmodSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
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
  it("allows one app writer and safely releases its lease for restart", () => {
    const { path } = fixture();
    const first = new SqliteRuntime(path, { syntheticProof: true });
    try { expect(() => new SqliteRuntime(path, { syntheticProof: true })).toThrow("SQLITE_WRITER_ALREADY_RUNNING"); }
    finally { first.close(); }
    const restarted = new SqliteRuntime(path, { syntheticProof: true });
    restarted.close();
  });
  it("fails closed on missing DB, incomplete compatibility and public file permissions", () => {
    const { path, directory } = fixture();
    expect(() => new SqliteRuntime(join(directory, "missing.db"))).toThrow();
    expect(() => new SqliteRuntime(path)).toThrow("SQLITE_COMPATIBILITY_NOT_READY");
    chmodSync(path, 0o644);
    expect(() => new SqliteRuntime(path, { syntheticProof: true })).toThrow("SQLITE_FILE_BOUNDARY_INVALID");
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

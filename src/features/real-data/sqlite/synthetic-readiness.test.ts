import {
  mkdtempSync,
  realpathSync,
  chmodSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import Database from "better-sqlite3";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { initializeSyntheticDatabase } from "./synthetic-database";
import {
  sealSyntheticApplicationDatabase,
  verifySyntheticApplicationDatabase,
} from "./synthetic-readiness";
import { SqliteRuntime } from "./runtime";

const owner = "11600000-0000-4000-8000-000000000001";
function fixture() {
  const directory = mkdtempSync(
    join(realpathSync(tmpdir()), "life-os-116-sealing-"),
  );
  const path = join(directory, "synthetic.db");
  initializeSyntheticDatabase(path, owner);
  return { directory, path };
}
function change(path: string, sql: string) {
  const db = new Database(path);
  try {
    db.exec(sql);
  } finally {
    db.close();
  }
}
describe("synthetic application readiness sealing", () => {
  it("keeps fresh initialization unready and opens a deliberately sealed DB through normal runtime", () => {
    const { path } = fixture();
    expect(() => verifySyntheticApplicationDatabase(path)).toThrow(
      "SQLITE_COMPATIBILITY_NOT_READY",
    );
    expect(() => new SqliteRuntime(path)).toThrow(
      "SQLITE_COMPATIBILITY_NOT_READY",
    );
    expect(sealSyntheticApplicationDatabase(path)).toEqual({
      ownerId: owner,
      datasetKind: "synthetic",
      schemaVersion: 10,
    });
    const application = new SqliteRuntime(path);
    application.close();
  });
  it.each([
    [
      "UPDATE runtime_metadata SET dataset_kind='canonical'",
      "SYNTHETIC_DATABASE_REQUIRED",
    ],
    [
      "UPDATE runtime_metadata SET schema_version=8",
      "SQLITE_SCHEMA_VERSION_MISMATCH",
    ],
    ["PRAGMA user_version=8", "SQLITE_SCHEMA_VERSION_MISMATCH"],
    ["DROP TABLE task_steps", "SQLITE_CANONICAL_CATALOG_INVALID"],
    [
      "CREATE TABLE unexpected_business_table(id TEXT)",
      "SQLITE_CANONICAL_CATALOG_INVALID",
    ],
  ])("refuses promotion: %s", (sql, code) => {
    const { path } = fixture();
    change(path, sql);
    expect(() => sealSyntheticApplicationDatabase(path)).toThrow(code);
    const db = new Database(path);
    expect(
      db.prepare("SELECT compatibility_ready v FROM runtime_metadata").get(),
    ).toEqual({ v: 0 });
    db.close();
  });
  it("rejects damaged integrity and broken foreign keys without promotion", () => {
    const damaged = fixture();
    writeFileSync(damaged.path, Buffer.alloc(4096), { mode: 0o600 });
    expect(() => sealSyntheticApplicationDatabase(damaged.path)).toThrow();
    const { path } = fixture();
    const db = new Database(path);
    db.function("life_owner", () => owner);
    db.pragma("foreign_keys=OFF");
    db.prepare(
      "INSERT INTO areas(id,user_id,key,name,created_at,updated_at) VALUES(?,?,'coding','Corrupt proof',?,?)",
    ).run(
      "11600000-0000-4000-8000-000000000002",
      owner,
      "2026-10-07T00:00:00Z",
      "2026-10-07T00:00:00Z",
    );
    db.exec("DROP TRIGGER profiles_owner_delete;DELETE FROM profiles");
    db.close();
    expect(() => sealSyntheticApplicationDatabase(path)).toThrow(
      "SQLITE_INTEGRITY_FAILED",
    );
    const reopened = new Database(path, { readonly: true });
    expect(
      reopened
        .prepare("SELECT compatibility_ready v FROM runtime_metadata")
        .get(),
    ).toEqual({ v: 0 });
    reopened.close();
  });
  it("denies files and directories outside the private synthetic boundary", () => {
    const { path, directory } = fixture();
    chmodSync(path, 0o644);
    expect(() => sealSyntheticApplicationDatabase(path)).toThrow(
      "SQLITE_FILE_BOUNDARY_INVALID",
    );
    chmodSync(path, 0o600);
    const link = join(directory, "link.db");
    symlinkSync(path, link);
    expect(() => sealSyntheticApplicationDatabase(link)).toThrow(
      "SQLITE_FILE_BOUNDARY_INVALID",
    );
    chmodSync(directory, 0o755);
    expect(() => sealSyntheticApplicationDatabase(path)).toThrow(
      "SQLITE_DIRECTORY_BOUNDARY_INVALID",
    );
  });
});

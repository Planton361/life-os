import { describe, expect, it, vi } from "vitest";
import {
  chmodSync,
  mkdtempSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import Database from "better-sqlite3";
import {
  bootstrapProductionDatabase,
  verifyProductionApplicationDatabase,
} from "./production-bootstrap";
import * as runtime from "./runtime";
import { issueOwnerContext } from "./owner-context";

const owner = {
  ownerId: "11800000-0000-4000-8000-000000000001",
  displayName: "Fresh owner",
  timezone: "Europe/Berlin",
};
function fresh() {
  return join(
    mkdtempSync(join(realpathSync(tmpdir()), "life-os-118-production-")),
    "canonical.db",
  );
}

describe("fresh production canonical bootstrap", () => {
  it("creates exactly 83 canonical tables and one owner, seals and opens the normal production runtime", () => {
    const path = fresh();
    expect(bootstrapProductionDatabase(path, owner)).toEqual({
      ownerId: owner.ownerId,
      schemaVersion: runtime.schemaVersion,
      datasetKind: "canonical",
    });
    const store = new runtime.SqliteRuntime(path);
    try {
      store.read(issueOwnerContext(owner.ownerId), (db) => {
        expect(
          db
            .prepare(
              "SELECT count(*) n FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'",
            )
            .get(),
        ).toEqual({ n: BigInt(84) });
        expect(
          db.prepare("SELECT id,display_name FROM profiles").all(),
        ).toEqual([{ id: owner.ownerId, display_name: owner.displayName }]);
        expect(db.pragma("journal_mode", { simple: true })).toBe("wal");
        expect(Number(db.pragma("synchronous", { simple: true }))).toBe(2);
        expect(Number(db.pragma("foreign_keys", { simple: true }))).toBe(1);
        expect(Number(db.pragma("busy_timeout", { simple: true }))).toBe(5000);
        expect(db.pragma("integrity_check", { simple: true })).toBe("ok");
        expect(db.pragma("foreign_key_check")).toEqual([]);
      });
    } finally {
      store.close();
    }
    expect(() => bootstrapProductionDatabase(path, owner)).toThrow();
    expect(verifyProductionApplicationDatabase(path).datasetKind).toBe(
      "canonical",
    );
  });
  it("refuses malformed, incomplete, extra-table, unready and incorrect metadata targets", () => {
    const malformed = fresh();
    writeFileSync(malformed, "invalid database", { mode: 0o600 });
    expect(() => bootstrapProductionDatabase(malformed, owner)).toThrow();
    expect(() => verifyProductionApplicationDatabase(malformed)).toThrow();
    for (const sql of [
      "DROP TABLE task_steps",
      "CREATE TABLE unexpected(id TEXT)",
      "UPDATE runtime_metadata SET compatibility_ready=0",
      "UPDATE runtime_metadata SET schema_version=0",
      "UPDATE runtime_metadata SET dataset_kind='synthetic'",
      "UPDATE runtime_metadata SET owner_id='11800000-0000-4000-8000-000000000099'",
    ]) {
      const path = fresh();
      bootstrapProductionDatabase(path, owner);
      const db = new Database(path);
      db.exec(sql);
      db.close();
      expect(() => verifyProductionApplicationDatabase(path)).toThrow();
      expect(() => bootstrapProductionDatabase(path, owner)).toThrow();
    }
  });
  it("leaves readiness zero when the aggregate preflight fails", () => {
    const path = fresh();
    const validator = vi
      .spyOn(runtime, "aggregatePreflight")
      .mockImplementation(() => {
        throw new Error("PREFLIGHT_FAILED");
      });
    try {
      expect(() => bootstrapProductionDatabase(path, owner)).toThrow(
        "PREFLIGHT_FAILED",
      );
    } finally {
      validator.mockRestore();
    }
    const db = new Database(path, { readonly: true });
    expect(
      db.prepare("SELECT compatibility_ready FROM runtime_metadata").get(),
    ).toEqual({ compatibility_ready: 0 });
    db.close();
    expect(() => new runtime.SqliteRuntime(path)).toThrow(
      "SQLITE_COMPATIBILITY_NOT_READY",
    );
  });
  it("refuses unsafe paths, symlinks, permissive files/directories and untrusted bootstrap fields", () => {
    expect(() => bootstrapProductionDatabase("relative.db", owner)).toThrow(
      "SQLITE_PATH_INVALID",
    );
    const path = fresh();
    const directory = dirname(path);
    chmodSync(directory, 0o755);
    expect(() => bootstrapProductionDatabase(path, owner)).toThrow(
      "SQLITE_DIRECTORY_BOUNDARY_INVALID",
    );
    const target = fresh();
    bootstrapProductionDatabase(target, owner);
    const link = fresh();
    symlinkSync(target, link);
    expect(() => bootstrapProductionDatabase(link, owner)).toThrow();
    expect(() => verifyProductionApplicationDatabase(link)).toThrow();
    chmodSync(target, 0o644);
    expect(() => verifyProductionApplicationDatabase(target)).toThrow(
      "SQLITE_FILE_BOUNDARY_INVALID",
    );
    expect(() =>
      bootstrapProductionDatabase(fresh(), { ...owner, userId: "browser" }),
    ).toThrow("SQLITE_BOOTSTRAP_OWNER_INVALID");
    expect(() =>
      bootstrapProductionDatabase(fresh(), { ...owner, timezone: "invalid" }),
    ).toThrow("SQLITE_BOOTSTRAP_OWNER_INVALID");
  });
});

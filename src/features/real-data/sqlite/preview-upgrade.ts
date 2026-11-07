import "server-only";
import Database from "better-sqlite3";
import { initializeCanonicalSchema } from "./canonical-schema";
import {
  previewDeleteGuards,
  resetMetadataSchema,
  schemaFingerprint,
} from "./reset-schema";
import {
  canonicalPath,
  configureConnection,
  aggregatePreflight,
  assertCanonicalCatalog,
  verifyNodeAndDriver,
  registerCodecs,
} from "./runtime";
import { acquireWriterLease } from "./writer-lease";
import { lstatSync } from "node:fs";

// Every main-schema row in rowid order; the upgrades prove data is unchanged.
function dataSnapshot(db: Database.Database) {
  return JSON.stringify(
    db
      .prepare(
        "SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name",
      )
      .all()
      .map((row) => {
        const name = (row as { name: string }).name;
        return [
          name,
          db.prepare(`SELECT * FROM "${name}" ORDER BY rowid`).all(),
        ];
      }),
    (_, value) => (typeof value === "bigint" ? String(value) : value),
  );
}

// Operator-only forward migration. No Action/runtime-start import or automatic
// upgrade. The caller proves exact-main CI, backup and compatible fallback first.
export function upgradePreviewSchemaV9(path: string) {
  verifyNodeAndDriver();
  canonicalPath(path);
  const identity = lstatSync(path);
  const unlock = acquireWriterLease(path);
  const db = new Database(path, { fileMustExist: true });
  const expected = new Database(":memory:");
  try {
    configureConnection(db);
    registerCodecs(expected);
    initializeCanonicalSchema(expected, { legacyV9: true });
    if (schemaFingerprint(db) !== schemaFingerprint(expected))
      throw new Error("UPGRADE_V9_SCHEMA_REQUIRED");
    const meta = db
      .prepare("SELECT * FROM runtime_metadata WHERE singleton=1")
      .get() as {
      owner_id: string;
      dataset_kind: string;
      schema_version: bigint;
      compatibility_ready: bigint;
      writer_pid: bigint | null;
    };
    if (
      !meta ||
      meta.dataset_kind !== "canonical" ||
      Number(meta.schema_version) !== 9 ||
      Number(db.pragma("user_version", { simple: true })) !== 9 ||
      Number(meta.compatibility_ready) !== 1 ||
      meta.writer_pid !== null
    )
      throw new Error("UPGRADE_STOPPED_CANONICAL_V9_REQUIRED");
    db.function("life_owner", () => meta.owner_id);
    db.function("life_command", () => "preview.upgrade");
    const snapshot = () => dataSnapshot(db);
    const before = snapshot();
    db.transaction(() => {
      assertCanonicalCatalog(db);
      aggregatePreflight(db, meta.owner_id);
      const guards = db
        .prepare(
          "SELECT name,sql FROM sqlite_schema WHERE type='trigger' AND sql LIKE '%BEFORE DELETE%' ORDER BY name",
        )
        .all() as { name: string; sql: string }[];
      let changed = 0;
      for (const guard of guards) {
        const next = previewDeleteGuards(guard.sql);
        if (next !== guard.sql) {
          // Replacing versioned guard definitions is limited to this migration;
          // the Reset operation never alters/drops any schema object.
          db.exec(`DROP TRIGGER "${guard.name}"`);
          db.exec(next);
          changed++;
        }
      }
      if (changed !== 46) throw new Error("UPGRADE_GUARD_CATALOG_MISMATCH");
      if (before !== snapshot()) throw new Error("UPGRADE_DATA_CHANGED");
      db.exec(resetMetadataSchema);
      db.prepare(
        "UPDATE runtime_metadata SET schema_version=10,dataset_epoch=life_uuid() WHERE singleton=1",
      ).run();
      db.pragma("user_version=10");
      const target = new Database(":memory:");
      try {
        registerCodecs(target);
        initializeCanonicalSchema(target, { legacyV10: true });
        if (schemaFingerprint(db) !== schemaFingerprint(target))
          throw new Error("UPGRADE_TARGET_SCHEMA_INVALID");
      } finally {
        target.close();
      }
      if (
        db.pragma("integrity_check", { simple: true }) !== "ok" ||
        (db.pragma("foreign_key_check") as unknown[]).length
      )
        throw new Error("UPGRADE_INTEGRITY_FAILED");
      aggregatePreflight(db, meta.owner_id);
      const afterIdentity = lstatSync(path);
      if (
        identity.dev !== afterIdentity.dev ||
        identity.ino !== afterIdentity.ino
      )
        throw new Error("UPGRADE_IDENTITY_CHANGED");
    }).immediate();
    db.pragma("wal_checkpoint(TRUNCATE)");
    return { schema: 10, owner: meta.owner_id };
  } finally {
    expected.close();
    db.close();
    unlock();
  }
}

// Operator-only v10→v11 migration (#192): inbox_items admits an untitled
// capture. SQLite cannot relax NOT NULL in place, so the table is rebuilt in the
// same file inside one IMMEDIATE transaction with every rowid, id and value
// unchanged. Any failure rolls back to the untouched v10 database.
export function upgradePreviewSchemaV10(path: string) {
  verifyNodeAndDriver();
  canonicalPath(path);
  const identity = lstatSync(path);
  const unlock = acquireWriterLease(path);
  const db = new Database(path, { fileMustExist: true });
  const expected = new Database(":memory:");
  const target = new Database(":memory:");
  try {
    configureConnection(db);
    registerCodecs(expected);
    initializeCanonicalSchema(expected, { legacyV10: true });
    registerCodecs(target);
    initializeCanonicalSchema(target);
    if (schemaFingerprint(db) !== schemaFingerprint(expected))
      throw new Error("UPGRADE_V10_SCHEMA_REQUIRED");
    const meta = db
      .prepare("SELECT * FROM runtime_metadata WHERE singleton=1")
      .get() as {
      owner_id: string;
      dataset_kind: string;
      schema_version: bigint;
      compatibility_ready: bigint;
      writer_pid: bigint | null;
    };
    if (
      !meta ||
      meta.dataset_kind !== "canonical" ||
      Number(meta.schema_version) !== 10 ||
      Number(db.pragma("user_version", { simple: true })) !== 10 ||
      Number(meta.compatibility_ready) !== 1 ||
      meta.writer_pid !== null
    )
      throw new Error("UPGRADE_STOPPED_CANONICAL_V10_REQUIRED");
    db.function("life_owner", () => meta.owner_id);
    db.function("life_command", () => "preview.upgrade");
    const columns = (source: Database.Database) =>
      (source.pragma("table_info(inbox_items)") as { name: string }[]).map(
        (column) => column.name,
      );
    const names = columns(target);
    if (names.join() !== columns(db).join())
      throw new Error("UPGRADE_INBOX_COLUMNS_CHANGED");
    const list = names.map((name) => `"${name}"`).join(",");
    const definitions = target
      .prepare(
        "SELECT type,sql FROM sqlite_schema WHERE tbl_name='inbox_items' AND sql IS NOT NULL ORDER BY type='table' DESC,name",
      )
      .all() as { type: string; sql: string }[];
    const before = dataSnapshot(db);
    // foreign_keys cannot change inside a transaction. The rebuild keeps every
    // referenced inbox id, and foreign_key_check proves all references below.
    db.pragma("foreign_keys=OFF");
    try {
      db.transaction(() => {
        assertCanonicalCatalog(db);
        aggregatePreflight(db, meta.owner_id);
        db.exec(
          `CREATE TEMP TABLE inbox_items_v10 AS SELECT rowid AS v10_rowid,${list} FROM main.inbox_items`,
        );
        // Dropping the table also drops its own triggers and indexes; the exact
        // v11 definitions are recreated after the rows are restored, so no
        // capture/owner trigger rewrites a copied row.
        db.exec("DROP TABLE main.inbox_items");
        db.exec(definitions[0].sql);
        db.exec(
          `INSERT INTO main.inbox_items(rowid,${list}) SELECT v10_rowid,${list} FROM temp.inbox_items_v10 ORDER BY v10_rowid`,
        );
        db.exec("DROP TABLE temp.inbox_items_v10");
        for (const definition of definitions.slice(1)) db.exec(definition.sql);
        if (before !== dataSnapshot(db)) throw new Error("UPGRADE_DATA_CHANGED");
        db.prepare(
          "UPDATE runtime_metadata SET schema_version=11,dataset_epoch=life_uuid() WHERE singleton=1",
        ).run();
        db.pragma("user_version=11");
        if (schemaFingerprint(db) !== schemaFingerprint(target))
          throw new Error("UPGRADE_TARGET_SCHEMA_INVALID");
        if (
          db.pragma("integrity_check", { simple: true }) !== "ok" ||
          (db.pragma("foreign_key_check") as unknown[]).length
        )
          throw new Error("UPGRADE_INTEGRITY_FAILED");
        aggregatePreflight(db, meta.owner_id);
        const afterIdentity = lstatSync(path);
        if (
          identity.dev !== afterIdentity.dev ||
          identity.ino !== afterIdentity.ino
        )
          throw new Error("UPGRADE_IDENTITY_CHANGED");
      }).immediate();
    } finally {
      db.pragma("foreign_keys=ON");
    }
    db.pragma("wal_checkpoint(TRUNCATE)");
    return { schema: 11, owner: meta.owner_id };
  } finally {
    target.close();
    expected.close();
    db.close();
    unlock();
  }
}

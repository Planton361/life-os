import "server-only";
import Database from "better-sqlite3";
import { createHash } from "node:crypto";
import { dirname } from "node:path";
import { realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { privateDatabasePath, reserveFreshDatabase } from "./file-boundary";
import { configureConnection, registerCodecs, schemaVersion } from "./runtime";

export function inspectSyntheticDatabase(path: string) {
  privateDatabasePath(path);
  if (!dirname(path).startsWith(`${realpathSync(tmpdir())}/life-os-116-`)) throw new Error("SYNTHETIC_PATH_REQUIRED");
  const db = new Database(path, { readonly: true, fileMustExist: true });
  try {
    registerCodecs(db);
    db.defaultSafeIntegers(true);
    const meta = db.prepare("SELECT dataset_kind,schema_version FROM runtime_metadata WHERE singleton=1").get() as { dataset_kind: string; schema_version: bigint };
    if (meta.dataset_kind !== "synthetic" || Number(meta.schema_version) !== schemaVersion) throw new Error("SYNTHETIC_DATABASE_REQUIRED");
    if (db.pragma("integrity_check", { simple: true }) !== "ok" || (db.pragma("foreign_key_check") as unknown[]).length) throw new Error("RESTORE_INTEGRITY_FAILED");
    const tables = db.prepare("SELECT name,sql FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as { name: string; sql: string }[];
    const schema = db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").all();
    const counts: Record<string, number> = {};
    const projections: Record<string, string> = {};
    const encode = (value: unknown) => JSON.stringify(value, (_, v) => typeof v === "bigint" ? { bigint: v.toString() } : v);
    for (const { name } of tables) {
      // The catalog is trusted schema metadata; validate before quoting. Never
      // accept a browser-supplied table or field name as an SQL identifier.
      if (!/^[a-z_]+$/.test(name)) throw new Error("RESTORE_CATALOG_INVALID");
      if (name === "runtime_metadata") continue; // operational PID is not domain truth
      const rows = db.prepare(`SELECT * FROM "${name}"`).all();
      counts[name] = rows.length;
      const canonicalRows = rows.map((row) => encode(row)).sort();
      projections[name] = createHash("sha256").update(encode(canonicalRows)).digest("hex");
    }
    return { schemaVersion: Number(meta.schema_version), schemaHash: createHash("sha256").update(encode(schema)).digest("hex"), counts, projections };
  } finally { db.close(); }
}

export async function restoreSyntheticBackup(source: string, destination: string) {
  const before = inspectSyntheticDatabase(source);
  if (!dirname(destination).startsWith(`${realpathSync(tmpdir())}/life-os-116-`)) throw new Error("SYNTHETIC_PATH_REQUIRED");
  reserveFreshDatabase(destination);
  const db = new Database(source, { readonly: true, fileMustExist: true });
  try { await db.backup(destination); } finally { db.close(); }
  const restored = new Database(destination, { fileMustExist: true });
  try {
    configureConnection(restored);
    // The new path has no app writer. A copied live source PID must never act
    // as a lease on an independently verified restore candidate.
    restored.prepare("UPDATE runtime_metadata SET writer_pid=NULL,writer_host=NULL,writer_token=NULL WHERE singleton=1").run();
    restored.pragma("wal_checkpoint(TRUNCATE)");
  } finally { restored.close(); }
  const after = inspectSyntheticDatabase(destination);
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error("RESTORE_COMPARISON_FAILED");
  return after;
}

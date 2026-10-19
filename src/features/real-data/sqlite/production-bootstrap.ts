import "server-only";
import Database from "better-sqlite3";
import { z } from "zod";
import { initializeCanonicalSchema } from "./canonical-schema";
import { reserveFreshDatabase } from "./file-boundary";
import { timestamp, uuid } from "./codecs";
import {
  aggregatePreflight,
  assertCanonicalCatalog,
  canonicalPath,
  configureConnection,
  registerCodecs,
  runtimeVersions,
  schemaVersion,
  verifyNodeAndDriver,
} from "./runtime";

const bootstrapOwner = z
  .object({
    ownerId: z.uuid(),
    displayName: z.string().trim().min(1).max(200),
    timezone: z.string().refine((value) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: value });
        return true;
      } catch {
        return false;
      }
    }),
  })
  .strict();

/** Server/operator input only. Never called by an Action or HTTP endpoint. */
export function bootstrapProductionDatabase(path: string, input: unknown) {
  const parsed = bootstrapOwner.safeParse(input);
  if (!parsed.success) throw new Error("SQLITE_BOOTSTRAP_OWNER_INVALID");
  const owner = parsed.data;
  owner.ownerId = uuid(owner.ownerId);
  verifyNodeAndDriver();
  reserveFreshDatabase(path);
  const db = new Database(path, { fileMustExist: true });
  db.function("life_owner", () => owner.ownerId);
  db.function("life_command", () => "runtime.bootstrap");
  try {
    configureConnection(db);
    db.transaction(() => {
      initializeCanonicalSchema(db);
      db.prepare(
        "INSERT INTO runtime_metadata(singleton,schema_version,dataset_kind,owner_id) VALUES(1,?,'canonical',?)",
      ).run(schemaVersion, owner.ownerId);
      db.prepare("UPDATE runtime_metadata SET dataset_epoch=life_uuid() WHERE singleton=1").run();
      const now = timestamp(new Date().toISOString());
      db.prepare(
        "INSERT INTO profiles(id,display_name,timezone,created_at,updated_at) VALUES(?,?,?,?,?)",
      ).run(owner.ownerId, owner.displayName, owner.timezone, now, now);
      db.pragma(`user_version=${schemaVersion}`);
    }).immediate();
    // Readiness promotion and invariant checks share a transaction. An error
    // leaves either an invalid/empty file or complete schema with readiness 0.
    db.transaction(() => {
      verifyProductionConnection(db, false);
      aggregatePreflight(db, owner.ownerId);
      db.prepare(
        "UPDATE runtime_metadata SET compatibility_ready=1 WHERE singleton=1",
      ).run();
      verifyProductionConnection(db, true);
    }).immediate();
    db.pragma("wal_checkpoint(TRUNCATE)");
  } catch (error) {
    // Also revoke readiness if a post-promotion checkpoint fails.
    try {
      db.prepare(
        "UPDATE runtime_metadata SET compatibility_ready=0 WHERE singleton=1",
      ).run();
    } catch {
      /* incomplete schema stays unready */
    }
    throw error;
  } finally {
    db.close();
  }
  return Object.freeze({
    ownerId: owner.ownerId,
    schemaVersion,
    datasetKind: "canonical" as const,
  });
}

function verifyProductionConnection(
  db: Database.Database,
  readyRequired: boolean,
) {
  const meta = db
    .prepare(
      "SELECT schema_version,dataset_kind,owner_id,compatibility_ready FROM runtime_metadata WHERE singleton=1",
    )
    .get() as
    | {
        schema_version: number | bigint;
        dataset_kind: string;
        owner_id: string;
        compatibility_ready: number | bigint;
      }
    | undefined;
  if (!meta || meta.dataset_kind !== "canonical")
    throw new Error("CANONICAL_DATABASE_REQUIRED");
  if (
    Number(meta.schema_version) !== schemaVersion ||
    Number(db.pragma("user_version", { simple: true })) !== schemaVersion
  )
    throw new Error("SQLITE_SCHEMA_VERSION_MISMATCH");
  if (
    (db.prepare("SELECT sqlite_version() v").get() as { v: string }).v !==
    runtimeVersions.sqlite
  )
    throw new Error("SQLITE_RUNTIME_VERSION_MISMATCH");
  if (db.pragma("journal_mode", { simple: true }) !== "wal")
    throw new Error("SQLITE_POLICY_MISMATCH");
  assertCanonicalCatalog(db);
  if (
    db.pragma("integrity_check", { simple: true }) !== "ok" ||
    (db.pragma("foreign_key_check") as unknown[]).length
  )
    throw new Error("SQLITE_INTEGRITY_FAILED");
  const ownerId = uuid(meta.owner_id);
  const profiles = db.prepare("SELECT id FROM profiles").all() as {
    id: string;
  }[];
  if (profiles.length !== 1 || profiles[0].id !== ownerId)
    throw new Error("SQLITE_OWNER_INVALID");
  if (readyRequired && Number(meta.compatibility_ready) !== 1)
    throw new Error("SQLITE_COMPATIBILITY_NOT_READY");
  return Object.freeze({
    ownerId,
    schemaVersion,
    datasetKind: "canonical" as const,
  });
}

/** Read-only hosted startup preflight; applicationRuntime enforces connection policy/lease. */
export function verifyProductionApplicationDatabase(path: string) {
  verifyNodeAndDriver();
  canonicalPath(path);
  const db = new Database(path, { readonly: true, fileMustExist: true });
  try {
    registerCodecs(db);
    db.defaultSafeIntegers(true);
    const verified = verifyProductionConnection(db, true);
    db.function("life_owner", () => verified.ownerId);
    db.function("life_command", () => "runtime.preflight");
    aggregatePreflight(db, verified.ownerId);
    return verified;
  } finally {
    db.close();
  }
}

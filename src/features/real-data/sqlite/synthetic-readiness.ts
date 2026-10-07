import "server-only";
import Database from "better-sqlite3";
import driverPackage from "better-sqlite3/package.json";
import { dirname } from "node:path";
import { lstatSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { privateDatabasePath } from "./file-boundary";
import { canonicalTableNames } from "./canonical-catalog";
import {
  registerCodecs,
  runtimeVersions,
  schemaVersion,
  SqliteRuntime,
} from "./runtime";
import { issueOwnerContext } from "./owner-context";
import { uuid } from "./codecs";

/** Only disposable #116 directories are eligible; this is not migration tooling. */
export function verifySyntheticApplicationDatabase(
  path: string,
  readyRequired = true,
) {
  privateDatabasePath(path);
  const directory = dirname(path);
  const root = realpathSync(tmpdir());
  if (
    !directory.startsWith(`${root}/life-os-116-`) ||
    dirname(directory) !== root
  )
    throw new Error("FRESH_SYNTHETIC_PATH_REQUIRED");
  const stat = lstatSync(path);
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.nlink !== 1 ||
    realpathSync(path) !== path ||
    (stat.mode & 0o077) !== 0 ||
    (process.getuid && stat.uid !== process.getuid())
  )
    throw new Error("SQLITE_FILE_BOUNDARY_INVALID");
  if (
    process.versions.node !== runtimeVersions.node ||
    driverPackage.version !== runtimeVersions.driver
  )
    throw new Error("SQLITE_RUNTIME_VERSION_MISMATCH");
  const db = new Database(path, { readonly: true, fileMustExist: true });
  try {
    registerCodecs(db);
    const meta = db
      .prepare(
        "SELECT dataset_kind,schema_version,owner_id,compatibility_ready FROM runtime_metadata WHERE singleton=1",
      )
      .get() as
      | {
          dataset_kind: string;
          schema_version: number;
          owner_id: string;
          compatibility_ready: number;
        }
      | undefined;
    if (!meta || meta.dataset_kind !== "synthetic")
      throw new Error("SYNTHETIC_DATABASE_REQUIRED");
    if (
      meta.schema_version !== schemaVersion ||
      db.pragma("user_version", { simple: true }) !== schemaVersion
    )
      throw new Error("SQLITE_SCHEMA_VERSION_MISMATCH");
    if (
      (db.prepare("SELECT sqlite_version() v").get() as { v: string }).v !==
      runtimeVersions.sqlite
    )
      throw new Error("SQLITE_RUNTIME_VERSION_MISMATCH");
    const tables = (
      db
        .prepare(
          "SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'",
        )
        .all() as { name: string }[]
    ).map((r) => r.name);
    const expected = new Set<string>([
      ...canonicalTableNames,
      "runtime_metadata",
    ]);
    if (
      canonicalTableNames.length !== 83 ||
      expected.size !== 84 ||
      tables.length !== expected.size ||
      tables.some((name) => !expected.has(name))
    )
      throw new Error("SQLITE_CANONICAL_CATALOG_INVALID");
    if (
      db.pragma("integrity_check", { simple: true }) !== "ok" ||
      (db.pragma("foreign_key_check") as unknown[]).length
    )
      throw new Error("SQLITE_INTEGRITY_FAILED");
    const ownerId = uuid(meta.owner_id);
    if (!db.prepare("SELECT id FROM profiles WHERE id=?").get(ownerId))
      throw new Error("SYNTHETIC_OWNER_REQUIRED");
    if (readyRequired && meta.compatibility_ready !== 1)
      throw new Error("SQLITE_COMPATIBILITY_NOT_READY");
    return Object.freeze({
      ownerId,
      schemaVersion,
      datasetKind: "synthetic" as const,
    });
  } finally {
    db.close();
  }
}

/** Deliberate, synthetic-only promotion after native policy and aggregate checks. */
export function sealSyntheticApplicationDatabase(path: string) {
  const verified = verifySyntheticApplicationDatabase(path, false);
  const store = new SqliteRuntime(path, { syntheticProof: true });
  try {
    const owner = issueOwnerContext(verified.ownerId);
    // Run the real backend's Goal/Project/Skill/Reward pre-COMMIT self-checks.
    // Promotion shares that transaction: any invariant failure rolls it back.
    store.command(owner, "runtime.synthetic.seal", (db) => {
      db.prepare(
        "UPDATE runtime_metadata SET compatibility_ready=1 WHERE singleton=1 AND dataset_kind='synthetic' AND schema_version=? AND owner_id=?",
      ).run(schemaVersion, verified.ownerId);
    });
  } finally {
    store.close();
  }
  return verifySyntheticApplicationDatabase(path);
}

import { createHash } from "node:crypto";
import { lstatSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { boundary } from "./preview-cd-host.mjs";
import { upgradeNativeDependencies } from "./preview-upgrade-native-loader.mjs";

export function databaseIdentity(path) {
  boundary(dirname(path), { directory: true });
  const s = boundary(path);
  if (
    (s.mode & 0o777) !== 0o600 ||
    (lstatSync(dirname(path)).mode & 0o777) !== 0o700
  )
    throw new Error("LINUX_DATABASE_BOUNDARY_INVALID");
  return { device: s.dev, inode: s.ino, uid: s.uid };
}
const encode = (v) =>
  JSON.stringify(v, (_, x) =>
    typeof x === "bigint" ? { bigint: x.toString() } : x,
  );
export const digest = (v) =>
  createHash("sha256").update(encode(v)).digest("hex");
export function fileDigest(path) {
  boundary(path);
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

// Read-only connection, no lease, checkpoint, migration, seeding or source write.
// SQLite backup() supplies a consistent snapshot even with a live WAL writer.
export function inspectDatabase(release, path, { rows = false } = {}) {
  const identity = databaseIdentity(path);
  const { require, Database } = upgradeNativeDependencies(release);
  const native = (name) =>
    require(join(release, `src/features/real-data/sqlite/${name}.ts`));
  const verified = native(
    "production-bootstrap",
  ).verifyProductionApplicationDatabase(path);
  const db = new Database(path, { readonly: true, fileMustExist: true });
  try {
    native("runtime").registerCodecs(db);
    db.defaultSafeIntegers(true);
    return db.transaction(() => {
      native("reset-schema").assertCanonicalSchemaDefinition(db);
      const schema = db
        .prepare(
          "SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name",
        )
        .all();
      const data = {};
      const epoch = db
        .prepare("SELECT dataset_epoch FROM runtime_metadata WHERE singleton=1")
        .get().dataset_epoch;
      if (rows)
        for (const name of native("canonical-catalog").canonicalTableNames) {
          if (!/^[a-z_]+$/.test(name)) throw new Error("LINUX_CATALOG_INVALID");
          const records = db.prepare(`SELECT * FROM "${name}"`).all();
          data[name] = {
            count: records.length,
            hash: digest(records.map(encode).sort()),
          };
        }
      return {
        identity,
        owner: verified.ownerId,
        schema: 10,
        epoch,
        schemaHash: digest(schema),
        ...(rows ? { data } : {}),
      };
    })();
  } finally {
    db.close();
  }
}

async function onlineCopy(release, source, destination) {
  databaseIdentity(source);
  boundary(dirname(destination), { directory: true });
  const { Database } = upgradeNativeDependencies(release);
  writeFileSync(destination, "", { mode: 0o600, flag: "wx" });
  const db = new Database(source, { readonly: true, fileMustExist: true });
  try {
    await db.backup(destination);
  } finally {
    db.close();
  }
  const target = databaseIdentity(destination);
  const original = databaseIdentity(source);
  if (target.device === original.device && target.inode === original.inode)
    throw new Error("LINUX_RESTORE_NOT_ISOLATED");
}

export async function backupAndRestore(release, source, folder) {
  const before = inspectDatabase(release, source);
  const backup = join(folder, "online-backup.db");
  const restore = join(folder, "restore.db");
  await onlineCopy(release, source, backup);
  const snapshot = inspectDatabase(release, backup, { rows: true });
  await onlineCopy(release, backup, restore);
  const restored = inspectDatabase(release, restore, { rows: true });
  if (
    snapshot.schemaHash !== restored.schemaHash ||
    snapshot.owner !== restored.owner ||
    digest(snapshot.data) !== digest(restored.data) ||
    digest(before) !== digest(inspectDatabase(release, source))
  )
    throw new Error("LINUX_RECOVERY_COMPARISON_FAILED");
  return {
    createdAt: new Date().toISOString(),
    source: before,
    backup,
    backupHash: fileDigest(backup),
    restore,
    restoreIdentity: restored.identity,
    schemaHash: snapshot.schemaHash,
    data: snapshot.data,
  };
}

export function verifyRecovery(release, source, proof) {
  const age = Date.now() - Date.parse(proof.createdAt);
  if (
    proof.version !== 1 ||
    !Number.isFinite(age) ||
    age < 0 ||
    age > 60 * 60_000 ||
    proof.application !== "PASS" ||
    digest(proof.source) !== digest(inspectDatabase(release, source)) ||
    fileDigest(proof.backup) !== proof.backupHash
  )
    throw new Error("LINUX_RECOVERY_PROOF_INVALID");
  const backup = inspectDatabase(release, proof.backup, { rows: true });
  const restore = inspectDatabase(release, proof.restore, { rows: true });
  if (
    backup.schemaHash !== proof.schemaHash ||
    restore.schemaHash !== proof.schemaHash ||
    digest(backup.data) !== digest(proof.data) ||
    digest(restore.data) !== digest(proof.data) ||
    digest(restore.identity) !== digest(proof.restoreIdentity) ||
    restore.owner !== proof.source.owner ||
    backup.owner !== proof.source.owner
  )
    throw new Error("LINUX_RECOVERY_PROOF_INVALID");
}

import "server-only";
import Database from "better-sqlite3";
import driverPackage from "better-sqlite3/package.json";
import { lstatSync, realpathSync } from "node:fs";
import { hostname } from "node:os";
import { isAbsolute, resolve } from "node:path";
import { requireOwnerContext, type OwnerContext } from "./owner-context";
import { privateDatabasePath, reserveFreshDatabase } from "./file-boundary";
import { compareDecimals, decimal, numeric } from "./codecs";
import { canonicalTableNames } from "./canonical-catalog";

export const runtimeVersions = Object.freeze({ node: "24.21.0", driver: "13.0.3", sqlite: "3.53.4" });
export const schemaVersion = 1;
type Metadata = { schema_version: number; dataset_kind: string; owner_id: string; compatibility_ready: number; writer_pid: number | null; writer_host: string | null };
type GlobalRuntime = typeof globalThis & { __lifeOsSqliteRuntime?: { path: string; store: SqliteRuntime } };

function verifyNodeAndDriver() {
  if (process.versions.node !== runtimeVersions.node || driverPackage.version !== runtimeVersions.driver)
    throw new Error("SQLITE_RUNTIME_VERSION_MISMATCH");
}

function canonicalPath(path: string) {
  privateDatabasePath(path);
  if (!isAbsolute(path) || resolve(path) !== path) throw new Error("SQLITE_PATH_INVALID");
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || realpathSync(path) !== path || (stat.mode & 0o077) !== 0)
    throw new Error("SQLITE_FILE_BOUNDARY_INVALID");
  return path;
}

export function registerCodecs(db: Database.Database) {
  db.function("decimal_compare", { deterministic: true }, (left, right) => {
    if (left === null || right === null) return null;
    return compareDecimals(String(left), String(right));
  });
  db.function("decimal_fits", { deterministic: true }, (value, precision, scale) => {
    if (value === null) return null;
    try { return numeric(String(value), Number(precision), Number(scale)) === decimal(String(value)) ? 1 : 0; }
    catch { return 0; }
  });
}
export function configureConnection(db: Database.Database) {
  registerCodecs(db);
  db.pragma("foreign_keys=ON");
  db.pragma("busy_timeout=5000");
  db.pragma("journal_mode=WAL");
  db.pragma("synchronous=FULL");
  db.pragma("wal_autocheckpoint=1000");
  // Read large INTEGER values as bigint, never rounded numbers.
  db.defaultSafeIntegers(true);
  const values = {
    sqlite: db.prepare("SELECT sqlite_version() AS version").get() as { version: string },
    journal: db.pragma("journal_mode", { simple: true }),
    synchronous: db.pragma("synchronous", { simple: true }),
    foreignKeys: db.pragma("foreign_keys", { simple: true }),
    timeout: db.pragma("busy_timeout", { simple: true }),
  };
  if (values.sqlite.version !== runtimeVersions.sqlite || values.journal !== "wal" || Number(values.synchronous) !== 2 || Number(values.foreignKeys) !== 1 || Number(values.timeout) !== 5000)
    throw new Error("SQLITE_POLICY_MISMATCH");
  return values;
}

export class SqliteRuntime {
  #db: Database.Database;
  #owner: string;
  #currentOwner: string | null = null;
  #command: string | null = null;
  #closed = false;
  #backupPending = false;

  constructor(path: string, options: { syntheticProof?: boolean } = {}) {
    verifyNodeAndDriver();
    this.#db = new Database(canonicalPath(path), { fileMustExist: true, timeout: 5000 });
    this.#db.function("life_owner", () => this.#currentOwner);
    this.#db.function("life_command", () => this.#command);
    try {
      configureConnection(this.#db);
      const version = Number(this.#db.pragma("user_version", { simple: true }));
      const meta = this.#db.prepare("SELECT * FROM runtime_metadata WHERE singleton=1").get() as Metadata | undefined;
      if (!meta || version !== schemaVersion || Number(meta.schema_version) !== schemaVersion)
        throw new Error("SQLITE_SCHEMA_VERSION_MISMATCH");
      if (Number(meta.compatibility_ready) !== 1 && !options.syntheticProof)
        throw new Error("SQLITE_COMPATIBILITY_NOT_READY");
      if (!options.syntheticProof) {
        const tables = new Set((this.#db.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all() as { name: string }[]).map((table) => table.name));
        if (canonicalTableNames.some((name) => !tables.has(name))) throw new Error("SQLITE_CANONICAL_CATALOG_INCOMPLETE");
      }
      if (options.syntheticProof && meta.dataset_kind !== "synthetic") throw new Error("SYNTHETIC_DATABASE_REQUIRED");
      if (this.#db.pragma("integrity_check", { simple: true }) !== "ok" || (this.#db.pragma("foreign_key_check") as unknown[]).length)
        throw new Error("SQLITE_INTEGRITY_FAILED");
      this.#owner = meta.owner_id;
      this.#acquireWriter();
    } catch (error) { this.#db.close(); throw error; }
  }

  #acquireWriter() {
    this.#db.transaction(() => {
      const row = this.#db.prepare("SELECT writer_pid,writer_host FROM runtime_metadata WHERE singleton=1").get() as Metadata;
      if (row.writer_pid !== null) {
        if (row.writer_host !== hostname()) throw new Error("SQLITE_WRITER_HOST_MISMATCH");
        let alive = true;
        try { process.kill(Number(row.writer_pid), 0); }
        catch (error) { if ((error as NodeJS.ErrnoException).code === "ESRCH") alive = false; }
        if (alive) throw new Error("SQLITE_WRITER_ALREADY_RUNNING");
      }
      this.#db.prepare("UPDATE runtime_metadata SET writer_pid=?,writer_host=? WHERE singleton=1").run(process.pid, hostname());
    }).immediate();
  }

  // This callback is an internal repository/command capability. It is never
  // exported from the feature's public barrel or passed to a Client Component.
  // Every SQL read in a repository must retain its explicit owner predicate.
  read<T>(context: OwnerContext, body: (db: Database.Database, ownerId: string) => T): T {
    return this.#scope(context, null, () => {
      this.#db.pragma("query_only=ON");
      try { return this.#db.transaction(() => this.#sync(body(this.#db, this.#owner)))(); }
      finally { this.#db.pragma("query_only=OFF"); }
    });
  }

  command<T>(context: OwnerContext, kind: string, body: (db: Database.Database, ownerId: string) => T): T {
    if (!/^[a-z][a-z_.]+$/.test(kind)) throw new Error("COMMAND_KIND_INVALID");
    return this.#scope(context, kind, () => this.#db.transaction(() => this.#sync(body(this.#db, this.#owner))).immediate());
  }

  #sync<T>(value: T): T {
    if (value && typeof (value as { then?: unknown }).then === "function") throw new Error("ASYNC_SQLITE_TRANSACTION_DENIED");
    return value;
  }

  #scope<T>(context: OwnerContext, command: string | null, body: () => T): T {
    if (this.#closed) throw new Error("SQLITE_RUNTIME_CLOSED");
    const ownerId = requireOwnerContext(context);
    if (ownerId !== this.#owner) throw new Error("OWNER_DENIED");
    if (this.#currentOwner !== null) throw new Error("NESTED_SQLITE_SCOPE_DENIED");
    this.#currentOwner = ownerId; this.#command = command;
    try { return body(); }
    finally { this.#currentOwner = null; this.#command = null; }
  }

  async backup(destination: string) {
    if (this.#closed || this.#db.inTransaction || this.#backupPending) throw new Error("SQLITE_BACKUP_UNAVAILABLE");
    reserveFreshDatabase(destination);
    // Never copy a live database while WAL is active, or overwrite an existing
    // backup/canonical file. A failed backup leaves an invalid private target;
    // verification must succeed before it can be considered a backup.
    this.#backupPending = true;
    try { await this.#db.backup(destination); }
    finally { this.#backupPending = false; }
  }

  close() {
    if (this.#closed) return;
    if (this.#backupPending) throw new Error("SQLITE_BACKUP_IN_PROGRESS");
    this.#db.prepare("UPDATE runtime_metadata SET writer_pid=NULL,writer_host=NULL WHERE singleton=1 AND writer_pid=? AND writer_host=?").run(process.pid, hostname());
    this.#db.pragma("wal_checkpoint(TRUNCATE)");
    this.#db.close(); this.#closed = true;
  }
}

export function applicationRuntime(path: string): SqliteRuntime {
  const global = globalThis as GlobalRuntime;
  if (global.__lifeOsSqliteRuntime) {
    if (global.__lifeOsSqliteRuntime.path !== path) throw new Error("SQLITE_SINGLETON_PATH_CHANGED");
    return global.__lifeOsSqliteRuntime.store;
  }
  const store = new SqliteRuntime(path);
  global.__lifeOsSqliteRuntime = { path, store };
  process.once("SIGTERM", () => { store.close(); process.exit(0); });
  process.once("SIGINT", () => { store.close(); process.exit(0); });
  return store;
}

import { markDatasetStaleSubmission } from "../runtime/submitted-dataset-epoch";
import "server-only";
import {
  currentPreviewGrant,
  isPreviewComposition,
  requirePreviewReset,
  type PreviewResetAdmission,
} from "./preview-grant";
import { ownerDatasetEpoch } from "./owner-context";
import { deletePreviewDataset } from "./preview-reset-plan";
import {
  schemaFingerprint,
  assertCanonicalSchemaDefinition,
} from "./reset-schema";
import { z } from "zod";
import Database from "better-sqlite3";
import driverPackage from "better-sqlite3/package.json";
import { lstatSync, realpathSync } from "node:fs";
import { hostname } from "node:os";
import { randomUUID } from "node:crypto";
import { isAbsolute, resolve } from "node:path";
import { requireOwnerContext, type OwnerContext } from "./owner-context";
import { privateDatabasePath, reserveFreshDatabase } from "./file-boundary";
import {
  compareDecimals,
  decimal,
  numeric,
  uuid,
  timestamp,
  localDate,
} from "./codecs";
import { canonicalTableNames } from "./canonical-catalog";
import { acquireWriterLease } from "./writer-lease";
import { safeProjectUrl, trimProjectText } from "./project-canonical";
import {
  projectCommitSnapshot,
  validateProjectCommit,
  advanceProjectMetadata,
} from "./project-invariants";
import { goalCommitSnapshot, validateGoalCommit } from "./goal-invariants";

import {
  validateSkillCommit,
  skillCommitSnapshot,
  validateSkillBoundary,
} from "./skill-invariants";

import { validateRewardCommit } from "./reward-invariants";

export const runtimeVersions = Object.freeze({
  node: "24.21.0",
  driver: "13.0.3",
  sqlite: "3.53.4",
});

export const schemaVersion = 10;
type Metadata = {
  schema_version: number;
  dataset_kind: string;
  owner_id: string;
  compatibility_ready: number;
  writer_pid: number | null;
  writer_host: string | null;
};
type GlobalRuntime = typeof globalThis & {
  __lifeOsSqliteRuntime?: { path: string; store: SqliteRuntime };
};

export function verifyNodeAndDriver() {
  if (
    process.versions.node !== runtimeVersions.node ||
    driverPackage.version !== runtimeVersions.driver
  )
    throw new Error("SQLITE_RUNTIME_VERSION_MISMATCH");
}

export function canonicalPath(path: string) {
  privateDatabasePath(path);
  if (!isAbsolute(path) || resolve(path) !== path)
    throw new Error("SQLITE_PATH_INVALID");
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
  return path;
}

function nextTimestamp(old: string, now: string) {
  const prior = timestamp(old),
    current = timestamp(now);
  if (current > prior) return current;
  const micros =
    BigInt(Date.parse(prior.slice(0, 23) + "Z")) * BigInt(1000) +
    BigInt(prior.slice(23, 26)) +
    BigInt(1);
  return (
    new Date(Number(micros / BigInt(1000))).toISOString().slice(0, 23) +
    String(micros % BigInt(1000)).padStart(3, "0") +
    "Z"
  );
}

export function registerCodecs(db: Database.Database) {
  db.function("project_safe_url", { deterministic: true }, (value) =>
    safeProjectUrl(value === null ? null : String(value)),
  );
  db.function("project_hash_valid", { deterministic: true }, (value) =>
    /^[a-f0-9]{64}$/.test(String(value)) ? 1 : 0,
  );
  db.function("project_text_valid", { deterministic: true }, (value, limit) =>
    value !== null &&
    !String(value).includes("\u0000") &&
    String(value).isWellFormed() &&
    trimProjectText(String(value)) === value &&
    [...String(value)].length >= 1 &&
    [...String(value)].length <= Number(limit)
      ? 1
      : 0,
  );
  db.function("life_uuid", () => randomUUID());
  let lastTimestamp = "1970-01-01T00:00:00.000000Z";
  db.function("life_now", () => {
    lastTimestamp = nextTimestamp(
      lastTimestamp,
      timestamp(new Date().toISOString()),
    );
    return lastTimestamp;
  });
  db.function("next_timestamp", { deterministic: true }, (old, now) =>
    nextTimestamp(String(old), String(now)),
  );
  db.function("decimal_finite", { deterministic: true }, (value) => {
    try {
      return /^(?:NaN|-?Infinity)$/.test(decimal(String(value))) ? 0 : 1;
    } catch {
      return 0;
    }
  });
  for (const [name, codec] of [
    ["codec_uuid_valid", uuid],
    ["codec_timestamp_valid", timestamp],
    ["codec_date_valid", localDate],
  ] as const)
    db.function(name, { deterministic: true }, (value) => {
      try {
        return codec(String(value)) === String(value) ? 1 : 0;
      } catch {
        return 0;
      }
    });
  db.function("decimal_compare", { deterministic: true }, (left, right) => {
    if (left === null || right === null) return null;
    return compareDecimals(String(left), String(right));
  });
  db.function(
    "decimal_fits",
    { deterministic: true },
    (value, precision, scale) => {
      if (value === null) return null;
      try {
        return numeric(String(value), Number(precision), Number(scale)) ===
          decimal(String(value))
          ? 1
          : 0;
      } catch {
        return 0;
      }
    },
  );
}
export function configureConnection(db: Database.Database) {
  registerCodecs(db);
  db.function("life_preview_reset_admitted", () => 0);
  db.pragma("foreign_keys=ON");
  db.pragma("busy_timeout=5000");
  db.pragma("journal_mode=WAL");
  db.pragma("synchronous=FULL");
  db.pragma("wal_autocheckpoint=1000");
  // Read large INTEGER values as bigint, never rounded numbers.
  db.defaultSafeIntegers(true);
  const values = {
    sqlite: db.prepare("SELECT sqlite_version() AS version").get() as {
      version: string;
    },
    journal: db.pragma("journal_mode", { simple: true }),
    synchronous: db.pragma("synchronous", { simple: true }),
    foreignKeys: db.pragma("foreign_keys", { simple: true }),
    timeout: db.pragma("busy_timeout", { simple: true }),
  };
  if (
    values.sqlite.version !== runtimeVersions.sqlite ||
    values.journal !== "wal" ||
    Number(values.synchronous) !== 2 ||
    Number(values.foreignKeys) !== 1 ||
    Number(values.timeout) !== 5000
  )
    throw new Error("SQLITE_POLICY_MISMATCH");
  return values;
}

export function assertCanonicalCatalog(db: Database.Database) {
  const tables = (
    db
      .prepare(
        "SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      )
      .all() as { name: string }[]
  ).map((row) => row.name);
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
}

// The same aggregate validators used by normal command commits, without writes.
export function aggregatePreflight(db: Database.Database, ownerId: string) {
  validateProjectCommit(db, ownerId, projectCommitSnapshot(db, ownerId));
  validateGoalCommit(db, ownerId, goalCommitSnapshot(db, ownerId));
  validateSkillCommit(db, ownerId);
  validateSkillBoundary(db, ownerId, skillCommitSnapshot(db, ownerId));
  validateRewardCommit(db, ownerId);
}

export class SqliteRuntime {
  #db: Database.Database;
  #path: string;
  #resetAdmitted = false;
  #schemaFingerprint = "";
  #challenges = new Map<
    string,
    {
      admission: PreviewResetAdmission;
      session: string;
      instance: string;
      epoch: string;
      revision: string;
      expires: number;
      commandId: string;
    }
  >();
  #owner: string;
  #currentOwner: string | null = null;
  #command: string | null = null;
  #closed = false;
  #backupPending = false;
  #draining = false;
  #writerToken = randomUUID();
  #releaseWriter: () => void;

  constructor(path: string, options: { syntheticProof?: boolean } = {}) {
    verifyNodeAndDriver();
    canonicalPath(path);
    this.#path = path;
    this.#releaseWriter = acquireWriterLease(path);
    try {
      this.#db = new Database(path, { fileMustExist: true, timeout: 5000 });
    } catch (error) {
      this.#releaseWriter();
      throw error;
    }
    this.#db.function("life_owner", () => this.#currentOwner);
    this.#db.function("life_command", () => this.#command);
    try {
      configureConnection(this.#db);
      this.#db.function("life_preview_reset_admitted", () =>
        this.#resetAdmitted ? 1 : 0,
      );
      const version = Number(this.#db.pragma("user_version", { simple: true }));
      const meta = this.#db
        .prepare("SELECT * FROM runtime_metadata WHERE singleton=1")
        .get() as Metadata | undefined;
      if (
        !meta ||
        version !== schemaVersion ||
        Number(meta.schema_version) !== schemaVersion
      )
        throw new Error("SQLITE_SCHEMA_VERSION_MISMATCH");
      if (Number(meta.compatibility_ready) !== 1 && !options.syntheticProof)
        throw new Error("SQLITE_COMPATIBILITY_NOT_READY");
      if (!options.syntheticProof) {
        assertCanonicalCatalog(this.#db);
        assertCanonicalSchemaDefinition(this.#db);
      }
      if (options.syntheticProof && meta.dataset_kind !== "synthetic")
        throw new Error("SYNTHETIC_DATABASE_REQUIRED");
      if (
        this.#db.pragma("integrity_check", { simple: true }) !== "ok" ||
        (this.#db.pragma("foreign_key_check") as unknown[]).length
      )
        throw new Error("SQLITE_INTEGRITY_FAILED");
      if (!["canonical", "synthetic"].includes(meta.dataset_kind))
        throw new Error("SQLITE_DATASET_KIND_INVALID");
      if (meta.dataset_kind === "canonical") {
        const profiles = this.#db.prepare("SELECT id FROM profiles").all() as {
          id: string;
        }[];
        if (profiles.length !== 1 || profiles[0].id !== uuid(meta.owner_id))
          throw new Error("SQLITE_OWNER_INVALID");
      }
      this.#owner = meta.owner_id;
      if (isPreviewComposition()) {
        if (meta.dataset_kind !== "canonical")
          throw new Error("CANONICAL_PREVIEW_REQUIRED");
        currentPreviewGrant(path, this.#owner);
      }
      this.#schemaFingerprint = schemaFingerprint(this.#db);
      this.#acquireWriter();
    } catch (error) {
      this.#db.close();
      this.#releaseWriter();
      throw error;
    }
  }

  #acquireWriter() {
    this.#db
      .transaction(() => {
        const row = this.#db
          .prepare(
            "SELECT writer_pid,writer_host FROM runtime_metadata WHERE singleton=1",
          )
          .get() as Metadata;
        if (row.writer_host !== null && row.writer_host !== hostname())
          throw new Error("SQLITE_WRITER_HOST_MISMATCH");
        // The already-held OS lock proves that no cooperating writer is alive.
        // A reused PID must never prevent recovery or impersonate the lease owner.
        this.#db
          .prepare(
            "UPDATE runtime_metadata SET writer_pid=?,writer_host=?,writer_token=? WHERE singleton=1",
          )
          .run(process.pid, hostname(), this.#writerToken);
      })
      .immediate();
  }

  // This callback is an internal repository/command capability. It is never
  // exported from the feature's public barrel or passed to a Client Component.
  // Every SQL read in a repository must retain its explicit owner predicate.
  read<T>(
    context: OwnerContext,
    body: (db: Database.Database, ownerId: string) => T,
  ): T {
    return this.#scope(context, null, () => {
      this.#db.pragma("query_only=ON");
      try {
        return this.#db.transaction(() =>
          this.#sync(body(this.#db, this.#owner)),
        )();
      } finally {
        this.#db.pragma("query_only=OFF");
      }
    });
  }

  command<T>(
    context: OwnerContext,
    kind: string,
    body: (db: Database.Database, ownerId: string) => T,
  ): T {
    if (this.#draining) throw new Error("SQLITE_RUNTIME_DRAINING");
    if (kind === "project.metadata")
      throw new Error("PROJECT_REVISION_SERVER_OWNED");
    if (!/^[a-z][a-z_.]+$/.test(kind)) throw new Error("COMMAND_KIND_INVALID");
    return this.#scope(context, kind, () =>
      this.#db
        .transaction(() => {
          if (isPreviewComposition()) {
            currentPreviewGrant(this.#path, this.#owner);
            if (
              ownerDatasetEpoch(context) !==
              (
                this.#db
                  .prepare(
                    "SELECT dataset_epoch AS epoch FROM runtime_metadata WHERE singleton=1",
                  )
                  .get() as { epoch: string }
              ).epoch
            ) {
              markDatasetStaleSubmission();
              throw new Error("DATASET_STALE_REFRESH_REQUIRED");
            }
          }
          const skillBefore = skillCommitSnapshot(this.#db, this.#owner);
          const before = goalCommitSnapshot(this.#db, this.#owner);
          const projectBefore = projectCommitSnapshot(this.#db, this.#owner);
          const result = this.#sync(body(this.#db, this.#owner));
          advanceProjectMetadata(this.#db, this.#owner, projectBefore, () => {
            this.#command = "project.metadata";
          });
          this.#command = kind;
          validateProjectCommit(this.#db, this.#owner, projectBefore);
          validateGoalCommit(this.#db, this.#owner, before);
          validateSkillCommit(this.#db, this.#owner);
          validateSkillBoundary(this.#db, this.#owner, skillBefore);
          validateRewardCommit(this.#db, this.#owner);
          this.#db
            .prepare(
              "UPDATE runtime_metadata SET data_revision=data_revision+1 WHERE singleton=1",
            )
            .run();
          return result;
        })
        .immediate(),
    );
  }

  datasetState(context: OwnerContext): { epoch: string; revision: string } {
    return this.read(context, (db) => {
      const row = db
        .prepare(
          "SELECT dataset_epoch AS epoch,data_revision AS revision FROM runtime_metadata WHERE singleton=1",
        )
        .get() as { epoch: string; revision: bigint };
      return { epoch: row.epoch, revision: String(row.revision) };
    });
  }

  preparePreviewReset(context: OwnerContext, admission: PreviewResetAdmission) {
    requirePreviewReset(admission, this.#path, requireOwnerContext(context));
    if (this.#draining || this.#backupPending)
      throw new Error("RESET_UNAVAILABLE");
    const state = this.datasetState(context);
    const token = randomUUID() + randomUUID();
    const commandId = randomUUID();
    const expires = Date.now() + 120_000;
    // Expired challenges never accumulate; at most one live challenge/session.
    for (const [key, value] of this.#challenges)
      if (value.expires <= Date.now() || value.session === admission.session)
        this.#challenges.delete(key);
    this.#challenges.set(token, {
      ...state,
      expires,
      commandId,
      admission,
      session: admission.session,
      instance: admission.instance,
    });
    return Object.freeze({ token, commandId, expires, epoch: state.epoch });
  }

  previewResetReceipt(
    context: OwnerContext,
    admission: PreviewResetAdmission,
    commandId: string,
  ) {
    requirePreviewReset(admission, this.#path, requireOwnerContext(context));
    return this.read(context, (db) => {
      const row = db
        .prepare("SELECT reset_receipt FROM runtime_metadata WHERE singleton=1")
        .get() as { reset_receipt: string | null };
      if (!row.reset_receipt) return null;
      const parsed = z
        .object({
          commandId: z.uuid(),
          session: z.string().min(1).max(128),
          instance: z.uuid(),
          epoch: z.uuid(),
        })
        .strict()
        .safeParse(JSON.parse(row.reset_receipt));
      if (!parsed.success) throw new Error("RESET_RECEIPT_INVALID");
      const receipt = parsed.data;
      return receipt.commandId === commandId &&
        receipt.session === admission.session &&
        receipt.instance === admission.instance
        ? { commandId, epoch: receipt.epoch }
        : null;
    });
  }

  executePreviewReset(
    context: OwnerContext,
    admission: PreviewResetAdmission,
    input: { token: string; commandId: string; confirmation: string },
  ) {
    requirePreviewReset(admission, this.#path, requireOwnerContext(context));
    if (input.confirmation !== "ZURÜCKSETZEN")
      throw new Error("RESET_CONFIRMATION_REQUIRED");
    // Replay precedes challenge/epoch validation. The persisted receipt survives
    // restart and new data; it can acknowledge, never execute another DELETE.
    const receipt = this.previewResetReceipt(
      context,
      admission,
      input.commandId,
    );
    if (receipt) return receipt;
    const challenge = this.#challenges.get(input.token);
    this.#challenges.delete(input.token);
    if (
      !challenge ||
      challenge.commandId !== input.commandId ||
      challenge.session !== admission.session ||
      challenge.instance !== admission.instance ||
      challenge.expires <= Date.now()
    )
      throw new Error("RESET_CHALLENGE_INVALID");
    if (this.#draining || this.#backupPending)
      throw new Error("RESET_UNAVAILABLE");
    return this.#scope(context, "preview.reset", () =>
      this.#db
        .transaction(() => {
          requirePreviewReset(admission, this.#path, this.#owner);
          const meta = this.#db
            .prepare(
              "SELECT dataset_epoch,data_revision FROM runtime_metadata WHERE singleton=1",
            )
            .get() as { dataset_epoch: string; data_revision: bigint };
          if (
            meta.dataset_epoch !== challenge.epoch ||
            String(meta.data_revision) !== challenge.revision
          )
            throw new Error("RESET_DATA_CHANGED_REFRESH_REQUIRED");
          if (schemaFingerprint(this.#db) !== this.#schemaFingerprint)
            throw new Error("RESET_SCHEMA_CHANGED");
          assertCanonicalCatalog(this.#db);
          aggregatePreflight(this.#db, this.#owner);
          const profile = JSON.stringify(
            this.#db.prepare("SELECT * FROM profiles").all(),
          );
          const epoch = randomUUID();
          this.#db.pragma("defer_foreign_keys=ON");
          this.#resetAdmitted = true;
          try {
            deletePreviewDataset(this.#db, this.#owner);
          } finally {
            this.#resetAdmitted = false;
          }
          if (
            this.#db.pragma("integrity_check", { simple: true }) !== "ok" ||
            (this.#db.pragma("foreign_key_check") as unknown[]).length
          )
            throw new Error("RESET_INTEGRITY_FAILED");
          if (
            schemaFingerprint(this.#db) !== this.#schemaFingerprint ||
            JSON.stringify(this.#db.prepare("SELECT * FROM profiles").all()) !==
              profile
          )
            throw new Error("RESET_PROTECTED_STATE_CHANGED");
          aggregatePreflight(this.#db, this.#owner);
          const technicalReceipt = JSON.stringify({
            commandId: input.commandId,
            session: admission.session,
            instance: admission.instance,
            epoch,
          });
          this.#db
            .prepare(
              "UPDATE runtime_metadata SET dataset_epoch=?,data_revision=data_revision+1,reset_receipt=? WHERE singleton=1",
            )
            .run(epoch, technicalReceipt);
          requirePreviewReset(admission, this.#path, this.#owner);
          return Object.freeze({ commandId: input.commandId, epoch });
        })
        .immediate(),
    );
  }

  #sync<T>(value: T): T {
    if (value && typeof (value as { then?: unknown }).then === "function")
      throw new Error("ASYNC_SQLITE_TRANSACTION_DENIED");
    return value;
  }

  #scope<T>(context: OwnerContext, command: string | null, body: () => T): T {
    if (this.#closed) throw new Error("SQLITE_RUNTIME_CLOSED");
    const ownerId = requireOwnerContext(context);
    if (ownerId !== this.#owner) throw new Error("OWNER_DENIED");
    if (this.#currentOwner !== null)
      throw new Error("NESTED_SQLITE_SCOPE_DENIED");
    this.#currentOwner = ownerId;
    this.#command = command;
    try {
      return body();
    } finally {
      this.#currentOwner = null;
      this.#command = null;
    }
  }

  async backup(destination: string) {
    if (
      this.#closed ||
      this.#draining ||
      this.#db.inTransaction ||
      this.#backupPending
    )
      throw new Error("SQLITE_BACKUP_UNAVAILABLE");
    reserveFreshDatabase(destination);
    // Never copy a live database while WAL is active, or overwrite an existing
    // backup/canonical file. A failed backup leaves an invalid private target;
    // verification must succeed before it can be considered a backup.
    this.#backupPending = true;
    try {
      await this.#db.backup(destination);
    } finally {
      this.#backupPending = false;
    }
  }

  stopWrites() {
    this.#draining = true;
  }

  close() {
    if (this.#closed) return;
    if (this.#backupPending) throw new Error("SQLITE_BACKUP_IN_PROGRESS");
    if (this.#db.inTransaction) throw new Error("SQLITE_COMMAND_IN_PROGRESS");
    this.stopWrites();
    this.#db
      .prepare(
        "UPDATE runtime_metadata SET writer_pid=NULL,writer_host=NULL,writer_token=NULL WHERE singleton=1 AND writer_token=?",
      )
      .run(this.#writerToken);
    this.#db.pragma("wal_checkpoint(TRUNCATE)");
    this.#db.close();
    this.#closed = true;
    this.#releaseWriter();
  }
}

// Next owns HTTP draining and process termination. Signals only close the write
// admission gate; synchronous commands have finished before JS handles a signal.
// Next's exit occurs after server.close()/nextServer.close(), including after tasks.
// The synchronous exit hook then checkpoints/closes the DB and releases its lock.
export function bindFrameworkShutdown(store: SqliteRuntime): () => void {
  const drain = () => store.stopWrites();
  const close = () => store.close();
  process.prependOnceListener("SIGTERM", drain);
  process.prependOnceListener("SIGINT", drain);
  process.once("exit", close);
  return () => {
    process.removeListener("SIGTERM", drain);
    process.removeListener("SIGINT", drain);
    process.removeListener("exit", close);
  };
}

export function applicationRuntime(path: string): SqliteRuntime {
  const global = globalThis as GlobalRuntime;
  if (global.__lifeOsSqliteRuntime) {
    if (global.__lifeOsSqliteRuntime.path !== path)
      throw new Error("SQLITE_SINGLETON_PATH_CHANGED");
    return global.__lifeOsSqliteRuntime.store;
  }
  const store = new SqliteRuntime(path);
  global.__lifeOsSqliteRuntime = { path, store };
  bindFrameworkShutdown(store);
  return store;
}

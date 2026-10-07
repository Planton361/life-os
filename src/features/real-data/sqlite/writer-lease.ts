import "server-only";
import Database from "better-sqlite3";
import { lstatSync, realpathSync } from "node:fs";
import { reserveFreshDatabase } from "./file-boundary";

// Operational lock only: no domain data or second application datastore. Keep
// this inode permanently; unlinking a lock file can allow two independent locks.
// SQLite's local-filesystem OS lock is released by the kernel even on SIGKILL.
export function acquireWriterLease(databasePath: string): () => void {
  const path = `${databasePath}.writer-lease.db`;
  try { reserveFreshDatabase(path); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || realpathSync(path) !== path ||
      (stat.mode & 0o077) !== 0 || (process.getuid && stat.uid !== process.getuid()))
    throw new Error("SQLITE_LEASE_FILE_BOUNDARY_INVALID");
  const lease = new Database(path, { fileMustExist: true, timeout: 0 });
  try {
    lease.pragma("journal_mode=DELETE");
    lease.exec("BEGIN EXCLUSIVE");
    // A rollback-mode EXCLUSIVE lock is held for the entire writer lifetime.
    // PID, hostname and token in the canonical DB are diagnostics, not liveness.
  } catch (error) {
    lease.close();
    if ((error as { code?: string }).code === "SQLITE_BUSY") throw new Error("SQLITE_WRITER_ALREADY_RUNNING");
    throw error;
  }
  let released = false;
  return () => {
    if (released) return;
    lease.exec("ROLLBACK");
    lease.close();
    released = true;
  };
}

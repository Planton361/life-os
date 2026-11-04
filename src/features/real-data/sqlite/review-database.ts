import "server-only";
import Database from "better-sqlite3";
import { existsSync, rmSync } from "node:fs";
import {
  bootstrapProductionDatabase,
  verifyProductionApplicationDatabase,
} from "./production-bootstrap";
import { acquireWriterLease } from "./writer-lease";
import { privateDatabasePath } from "./file-boundary";
import { registerCodecs } from "./runtime";
import { uuid } from "./codecs";

// Explicit local test identity. A database owned by anyone else (for example a
// copied personal database) is never opened or reset by the review runtime.
export const REVIEW_OWNER_ID = "00000000-0000-4000-8000-000000000001";

/** Creates the empty review database once; an existing file is kept as is. */
export function ensureReviewDatabase(path: string) {
  if (!existsSync(path))
    bootstrapProductionDatabase(path, {
      ownerId: REVIEW_OWNER_ID,
      displayName: "Review-Tester",
      timezone: "Europe/Berlin",
    });
  return verifyReviewDatabase(path);
}

export function verifyReviewDatabase(path: string) {
  const verified = verifyProductionApplicationDatabase(path);
  if (verified.ownerId !== REVIEW_OWNER_ID)
    throw new Error("REVIEW_DATABASE_OWNER_DENIED");
  return verified;
}

/** Explicit operator reset only; refuses while a server holds the writer lease. */
export function resetReviewDatabase(path: string) {
  privateDatabasePath(path);
  const release = acquireWriterLease(path);
  try {
    if (existsSync(path)) {
      const db = new Database(path, { readonly: true, fileMustExist: true });
      let owner: string | undefined;
      try {
        registerCodecs(db);
        const row = (
          db
            .prepare("SELECT owner_id FROM runtime_metadata WHERE singleton=1")
            .get() as { owner_id: string } | undefined
        );
        owner = row && uuid(row.owner_id);
      } finally {
        db.close();
      }
      if (owner !== REVIEW_OWNER_ID)
        throw new Error("REVIEW_DATABASE_OWNER_DENIED");
      for (const suffix of ["", "-wal", "-shm"])
        rmSync(`${path}${suffix}`, { force: true });
    }
  } finally {
    release();
  }
  return ensureReviewDatabase(path);
}

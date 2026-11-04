import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { bootstrapProductionDatabase } from "./production-bootstrap";
import {
  REVIEW_OWNER_ID,
  ensureReviewDatabase,
  resetReviewDatabase,
  verifyReviewDatabase,
} from "./review-database";
import { acquireWriterLease } from "./writer-lease";

const fresh = () =>
  join(mkdtempSync(join(realpathSync(tmpdir()), "life-os-review-")), "review.db");
const taskCount = (path: string) => {
  const db = new Database(path, { readonly: true });
  try {
    return (db.prepare("SELECT count(*) n FROM tasks").get() as { n: number }).n;
  } finally {
    db.close();
  }
};

describe("local review database", () => {
  it("starts empty, keeps an existing database and resets only on request", () => {
    const path = fresh();
    expect(ensureReviewDatabase(path).ownerId).toBe(REVIEW_OWNER_ID);
    expect(taskCount(path)).toBe(0);
    ensureReviewDatabase(path); // second start: no re-bootstrap, no reset
    expect(verifyReviewDatabase(path).ownerId).toBe(REVIEW_OWNER_ID);
    expect(resetReviewDatabase(path).ownerId).toBe(REVIEW_OWNER_ID);
    expect(taskCount(path)).toBe(0);
  });

  it("refuses to open or reset a database owned by anyone else", () => {
    const path = fresh();
    bootstrapProductionDatabase(path, {
      ownerId: "11800000-0000-4000-8000-000000000001",
      displayName: "Personal",
      timezone: "Europe/Berlin",
    });
    expect(() => verifyReviewDatabase(path)).toThrow("REVIEW_DATABASE_OWNER_DENIED");
    expect(() => resetReviewDatabase(path)).toThrow("REVIEW_DATABASE_OWNER_DENIED");
    const db = new Database(path, { readonly: true });
    expect(db.prepare("SELECT display_name FROM profiles").get()).toEqual({
      display_name: "Personal",
    });
    db.close();
  });

  it("refuses a reset while a server holds the writer lease", () => {
    const path = fresh();
    ensureReviewDatabase(path);
    const release = acquireWriterLease(path);
    try {
      expect(() => resetReviewDatabase(path)).toThrow("SQLITE_WRITER_ALREADY_RUNNING");
    } finally {
      release();
    }
  });
});

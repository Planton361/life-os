import { randomUUID } from "node:crypto";
import { chmodSync, lstatSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { initializeCanonicalSchema } from "./canonical-schema";
import { executeProjectDepthInTransaction } from "./commands/project-depth-commands";
import { issueOwnerContext } from "./owner-context";
import { upgradePreviewSchemaV11 } from "./preview-upgrade";
import { projectDepthCommand, readSqliteProjectDepth } from "./repositories/project-depth-repository";
import { projectReviewContext } from "./repositories/project-depth-read";
import { schemaFingerprint } from "./reset-schema";
import { configureConnection, registerCodecs, SqliteRuntime } from "./runtime";

// #198 operator v11→v12 rehearsal on disposable, populated files only.
function fingerprint(options: { legacyV11?: boolean }) {
  const db = new Database(":memory:");
  try {
    registerCodecs(db);
    initializeCanonicalSchema(db, options);
    return schemaFingerprint(db);
  } finally {
    db.close();
  }
}
// A v11 canonical file with every Project lifecycle shape v11 can hold.
function v11Database() {
  const root = mkdtempSync(join(realpathSync(tmpdir()), "life-os-198-"));
  chmodSync(root, 0o700);
  const path = join(root, "application.db"), owner = randomUUID();
  writeFileSync(path, "", { mode: 0o600 });
  const db = new Database(path);
  const ids = { reviewed: randomUUID(), legacy: randomUUID(), archived: randomUUID() };
  let command = "runtime.bootstrap";
  try {
    configureConnection(db);
    db.function("life_owner", () => owner);
    db.function("life_command", () => command);
    initializeCanonicalSchema(db, { legacyV11: true });
    db.prepare("INSERT INTO runtime_metadata(singleton,schema_version,dataset_kind,owner_id,compatibility_ready) VALUES(1,11,'canonical',?,1)").run(owner);
    db.prepare("INSERT INTO profiles(id,display_name,created_at,updated_at) VALUES(?,'v11 operator fixture',life_now(),life_now())").run(owner);
    for (const [name, id] of Object.entries(ids))
      db.prepare("INSERT INTO projects(id,user_id,title,status,created_at,updated_at) VALUES(?,?,?,'active',life_now(),life_now())").run(id, owner, `v11 ${name} Project`);
    db.prepare("INSERT INTO tasks(id,user_id,project_id,title,status,created_at,updated_at) VALUES(?,?,?,'Open v11 Task','planned',life_now(),life_now())").run(randomUUID(), owner, ids.reviewed);
    db.prepare("INSERT INTO project_milestones(id,user_id,project_id,title,status,sort_order,created_at,updated_at) VALUES(?,?,?,'Open v11 Milestone','open',0,life_now(),life_now())").run(randomUUID(), owner, ids.reviewed);
    const run = (projectId: string, operation: string, payload: Record<string, unknown>) => {
      const p = db.prepare("SELECT completion_revision AS r,completion_cycle AS c FROM projects WHERE id=?").get(projectId) as { r: number; c: number };
      command = `project.${operation}`;
      try {
        return db.transaction(() => executeProjectDepthInTransaction(db, owner, { projectId, commandId: randomUUID(), operation, expectedRevision: String(p.r), expectedCycle: String(p.c), payload }))();
      } finally {
        command = "runtime.bootstrap";
      }
    };
    run(ids.reviewed, "result.set", { desired_result: "v11 result" });
    const criterion = String(run(ids.reviewed, "criterion.create", { text: "v11 criterion", sort_order: "0" }).criterion_id);
    const review = (decision: string) => {
      const ctx = projectReviewContext(db, owner, ids.reviewed);
      return { fingerprint: ctx.fingerprint, decision, result_accepted: decision === "completed", rationale: `v11 ${decision}`, criteria: [{ id: criterion, assessment: decision === "completed" ? "satisfied" : "not_assessed" }], archived_ids: [], archived_criteria_acknowledged: false, evidence: [], open_work_acknowledged: decision === "completed", ...(decision === "completed" ? { open_work_disposition: "Bleibt offen" } : {}) };
    };
    run(ids.reviewed, "review.submit", review("continue"));
    run(ids.reviewed, "review.submit", review("completed"));
    run(ids.reviewed, "project.reopen", {});
    // A legacy completion from before Project Depth, then its one Reopen.
    command = "project.project.status.set";
    db.prepare("UPDATE projects SET status='completed' WHERE id=?").run(ids.legacy);
    command = "runtime.bootstrap";
    run(ids.legacy, "project.reopen", {});
    run(ids.archived, "project.archive", {});
    db.pragma("user_version=11");
  } finally {
    db.close();
  }
  return { path, owner, ids };
}
function read<T>(path: string, body: (db: Database.Database) => T): T {
  const db = new Database(path, { readonly: true, fileMustExist: true });
  try {
    registerCodecs(db);
    db.defaultSafeIntegers(true);
    return body(db);
  } finally {
    db.close();
  }
}
const tables = ["projects", "tasks", "project_milestones", "project_completion_criteria", "project_reviews", "project_review_criteria", "project_lifecycle_events", "project_review_amendments", "project_command_receipts", "profiles"];
const allRows = (db: Database.Database) =>
  Object.fromEntries(tables.map((t) => [t, db.prepare(`SELECT rowid AS r,* FROM ${t} ORDER BY rowid`).all()]));

it("upgrades a populated v11 database in place without changing any row, reference or lifecycle fact", () => {
  const f = v11Database();
  const inode = lstatSync(f.path).ino;
  const before = read(f.path, allRows);
  expect(before.project_reviews).toHaveLength(2);
  expect(before.project_lifecycle_events.map((e) => [(e as { event_kind: string }).event_kind, (e as { prior_completion_kind: string | null }).prior_completion_kind])).toEqual([
    ["reopened", "review"],
    ["reopened", "legacy_without_review"],
    ["archived", null],
  ]);
  expect(read(f.path, schemaFingerprint)).toBe(fingerprint({ legacyV11: true }));
  expect(() => new SqliteRuntime(f.path)).toThrow("SQLITE_SCHEMA_VERSION_MISMATCH");

  expect(upgradePreviewSchemaV11(f.path)).toEqual({ schema: 12, owner: f.owner });

  expect(lstatSync(f.path).ino).toBe(inode);
  expect(read(f.path, allRows)).toEqual(before);
  expect(read(f.path, schemaFingerprint)).toBe(fingerprint({}));
  read(f.path, (db) => {
    expect(db.pragma("user_version", { simple: true })).toBe(BigInt(12));
    expect(db.prepare("SELECT schema_version FROM runtime_metadata").get()).toEqual({ schema_version: BigInt(12) });
    expect(db.pragma("integrity_check", { simple: true })).toBe("ok");
    expect(db.pragma("foreign_key_check")).toEqual([]);
  });
  expect(() => upgradePreviewSchemaV11(f.path)).toThrow("UPGRADE_V11_SCHEMA_REQUIRED");
});

it("upgraded data admits repeated direct completion and keeps v11 Review and legacy history labelled", () => {
  const f = v11Database();
  const history = read(f.path, (db) => ({
    reviews: db.prepare("SELECT * FROM project_reviews ORDER BY rowid").all(),
    events: db.prepare("SELECT * FROM project_lifecycle_events ORDER BY rowid").all(),
  }));
  upgradePreviewSchemaV11(f.path);
  const store = new SqliteRuntime(f.path), context = issueOwnerContext(f.owner);
  try {
    const run = (projectId: string, operation: string, payload: Record<string, unknown>) => {
      const ctx = readSqliteProjectDepth(store, context, projectId).context;
      return projectDepthCommand(store, context, { projectId, commandId: randomUUID(), operation, expectedRevision: ctx.completion_revision, expectedCycle: ctx.completion_cycle, payload });
    };
    // The legacy Project already used its one legacy Reopen; direct cycles still work.
    for (const projectId of [f.ids.legacy, f.ids.reviewed])
      for (let i = 0; i < 2; i++) {
        run(projectId, "project.status.set", { status: "completed" });
        expect(readSqliteProjectDepth(store, context, projectId).context.current_completion_kind).toBe("direct");
        run(projectId, "project.reopen", {});
      }
    expect(() => run(f.ids.archived, "project.status.set", { status: "completed" })).toThrow("PROJECT_ARCHIVED");
    const kinds = (projectId: string) =>
      readSqliteProjectDepth(store, context, projectId).lifecycle
        .slice()
        .reverse()
        .map((e) => [e.event_kind, e.prior_completion_kind]);
    expect(kinds(f.ids.legacy)).toEqual([
      ["reopened", "legacy_without_review"],
      ["completed", null],
      ["reopened", "direct"],
      ["completed", null],
      ["reopened", "direct"],
    ]);
    expect(kinds(f.ids.reviewed)[0]).toEqual(["reopened", "review"]);
  } finally {
    store.close();
  }
  read(f.path, (db) => {
    expect(db.prepare("SELECT * FROM project_reviews ORDER BY rowid").all()).toEqual(history.reviews);
    expect(db.prepare("SELECT * FROM project_lifecycle_events ORDER BY rowid LIMIT 3").all()).toEqual(history.events);
  });
});

it("a v11 file cannot hold a direct completion fact, and a failed upgrade rolls back to the untouched v11 database", () => {
  const f = v11Database();
  // The v11 schema itself rejects the `completed` lifecycle fact (why v12 exists).
  const db = new Database(f.path);
  try {
    configureConnection(db);
    db.function("life_owner", () => f.owner);
    db.function("life_command", () => "project.project.status.set");
    const p = db.prepare("SELECT completion_revision AS r,completion_cycle AS c FROM projects WHERE id=?").get(f.ids.legacy) as { r: number; c: number };
    expect(() => db.transaction(() => executeProjectDepthInTransaction(db, f.owner, { projectId: f.ids.legacy, commandId: randomUUID(), operation: "project.status.set", expectedRevision: String(p.r), expectedCycle: String(p.c), payload: { status: "completed" } }))()).toThrow();
    // A dangling reference makes the post-rebuild integrity proof fail.
    db.function("life_command", () => "runtime.bootstrap");
    db.pragma("foreign_keys=OFF");
    db.prepare("INSERT INTO tasks(id,user_id,title,source_inbox_item_id,created_at,updated_at) VALUES(?,?,'Dangling',?,life_now(),life_now())").run(randomUUID(), f.owner, randomUUID());
  } finally {
    db.close();
  }
  const before = read(f.path, allRows);
  expect(() => upgradePreviewSchemaV11(f.path)).toThrow("UPGRADE_INTEGRITY_FAILED");
  expect(read(f.path, allRows)).toEqual(before);
  expect(read(f.path, schemaFingerprint)).toBe(fingerprint({ legacyV11: true }));
  read(f.path, (reader) => {
    expect(reader.pragma("user_version", { simple: true })).toBe(BigInt(11));
    expect(reader.prepare("SELECT schema_version,writer_pid FROM runtime_metadata").get()).toEqual({ schema_version: BigInt(11), writer_pid: null });
  });
});

import { randomUUID } from "node:crypto";
import { chmodSync, lstatSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { initializeCanonicalSchema } from "./canonical-schema";
import { routeSavedInboxItem, saveInboxClarification } from "./commands/inbox-commands";
import { issueOwnerContext } from "./owner-context";
import { upgradePreviewSchemaV10 } from "./preview-upgrade";
import { createSqliteInboxRepository } from "./repositories/inbox-repository";
import { schemaFingerprint } from "./reset-schema";
import { configureConnection, registerCodecs, SqliteRuntime } from "./runtime";

// #192 operator v10→v11 rehearsal on disposable files only.
const at = "2026-11-07T10:00:00.123456Z";
function fingerprint(options: { legacyV10?: boolean }) {
  const db = new Database(":memory:");
  try {
    registerCodecs(db);
    initializeCanonicalSchema(db, options);
    return schemaFingerprint(db);
  } finally {
    db.close();
  }
}
function v10Database() {
  const root = mkdtempSync(join(realpathSync(tmpdir()), "life-os-192-"));
  chmodSync(root, 0o700);
  const path = join(root, "application.db"), owner = randomUUID();
  writeFileSync(path, "", { mode: 0o600 });
  const db = new Database(path);
  const ids = { titled: randomUUID(), clarified: randomUUID(), triaged: randomUUID(), archived: randomUUID() };
  try {
    configureConnection(db);
    db.function("life_owner", () => owner);
    db.function("life_command", () => "runtime.bootstrap");
    initializeCanonicalSchema(db, { legacyV10: true });
    db.prepare("INSERT INTO runtime_metadata(singleton,schema_version,dataset_kind,owner_id,compatibility_ready) VALUES(1,10,'canonical',?,1)").run(owner);
    db.prepare("INSERT INTO profiles(id,display_name,created_at,updated_at) VALUES(?,'v10 operator fixture',life_now(),life_now())").run(owner);
    const capture = db.prepare("INSERT INTO inbox_items(id,user_id,title,body,source,captured_at,created_at,updated_at) VALUES(?,?,?,?,'inbox.quick_capture',?,?,?)");
    // v10 Quick Thoughts carried the historical nine-word title.
    for (const [name, id] of Object.entries(ids))
      capture.run(id, owner, `v10 ${name} capture with a long historical nine word title`.split(" ").slice(0, 9).join(" "), `Full v10 capture text for ${name}`, at, at, at);
    const clarify = (id: string) => saveInboxClarification(db, owner, { inboxItemId: id, expectedUpdatedAt: at, title: `Clarified ${id.slice(0, 4)}`, body: "Kept body", nextAction: "Next", missingInfo: null, priority: "P1", energy: null, durationMinutes: null, areaId: null, reviewNeeded: false, todayCandidate: false, deadlineHint: null });
    clarify(ids.clarified);
    routeSavedInboxItem(db, owner, { inboxItemId: ids.triaged, expectedUpdatedAt: clarify(ids.triaged).updated_at, route: "task", targetId: null });
    routeSavedInboxItem(db, owner, { inboxItemId: ids.archived, expectedUpdatedAt: at, route: "resource", targetId: null });
    db.prepare("INSERT INTO journal_entries(id,user_id,entry_date,title,body,created_at,updated_at) VALUES(?,?,'2026-11-06','v10 data','Must survive migration',life_now(),life_now())").run(randomUUID(), owner);
    db.pragma("user_version=10");
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
const allRows = (db: Database.Database) => ({
  inbox: db.prepare("SELECT rowid AS r,* FROM inbox_items ORDER BY rowid").all(),
  tasks: db.prepare("SELECT * FROM tasks ORDER BY rowid").all(),
  resources: db.prepare("SELECT * FROM resources ORDER BY rowid").all(),
  journal: db.prepare("SELECT * FROM journal_entries ORDER BY rowid").all(),
  profiles: db.prepare("SELECT * FROM profiles ORDER BY rowid").all(),
});

it("upgrades a populated v10 database in place without changing any row or Task reference", () => {
  const f = v10Database();
  const inode = lstatSync(f.path).ino;
  const before = read(f.path, allRows);
  expect(before.inbox).toHaveLength(4);
  expect(before.tasks).toHaveLength(1);
  expect(read(f.path, schemaFingerprint)).toBe(fingerprint({ legacyV10: true }));
  expect(() => new SqliteRuntime(f.path)).toThrow("SQLITE_SCHEMA_VERSION_MISMATCH");

  expect(upgradePreviewSchemaV10(f.path)).toEqual({ schema: 11, owner: f.owner });

  expect(lstatSync(f.path).ino).toBe(inode);
  expect(read(f.path, allRows)).toEqual(before);
  expect(read(f.path, schemaFingerprint)).toBe(fingerprint({}));
  read(f.path, (db) => {
    expect(db.pragma("user_version", { simple: true })).toBe(BigInt(11));
    expect(db.prepare("SELECT schema_version FROM runtime_metadata").get()).toEqual({ schema_version: BigInt(11) });
    expect(db.pragma("foreign_key_check")).toEqual([]);
    expect(db.prepare("SELECT t.source_inbox_item_id AS source, i.created_task_id = t.id AS linked FROM tasks t JOIN inbox_items i ON i.user_id=t.user_id AND i.id=t.source_inbox_item_id").all()).toEqual([{ source: f.ids.triaged, linked: BigInt(1) }]);
    expect(db.prepare("SELECT source FROM resources").get()).toEqual({ source: `inbox:${f.ids.archived}` });
  });
  expect(() => upgradePreviewSchemaV10(f.path)).toThrow("UPGRADE_V10_SCHEMA_REQUIRED");
});

it("upgraded data admits untitled captures and keeps every original capture immutable", async () => {
  const f = v10Database();
  upgradePreviewSchemaV10(f.path);
  const store = new SqliteRuntime(f.path), context = issueOwnerContext(f.owner);
  let id: string;
  try {
    const captured = await createSqliteInboxRepository(store, context).createInboxItem({ body: "Gedanke ohne Titel nach dem Upgrade", profileId: f.owner, source: "inbox.quick_capture", userId: f.owner });
    if (!captured.ok) throw new Error("Capture failed");
    expect(captured.data).toMatchObject({ title: null, clarification: { originalTitle: null, originalBody: "Gedanke ohne Titel nach dem Upgrade" } });
    id = captured.data.id;
    for (const [target, column] of [[id, "original_body"], [id, "original_title"], [f.ids.titled, "original_body"], [f.ids.titled, "original_title"]])
      expect(() => store.command(context, "inbox.proof", (db) => db.prepare(`UPDATE inbox_items SET ${column}='rewritten' WHERE user_id=? AND id=?`).run(f.owner, target))).toThrow("INBOX_ORIGINAL_IMMUTABLE");
  } finally {
    store.close();
  }
  expect(read(f.path, (db) => db.prepare("SELECT title,original_title,original_body FROM inbox_items WHERE id=?").get(id))).toEqual({ title: null, original_title: null, original_body: "Gedanke ohne Titel nach dem Upgrade" });
});

it("a failed upgrade rolls back to the untouched v10 database", () => {
  const f = v10Database();
  // A dangling reference makes the post-rebuild integrity proof fail.
  const db = new Database(f.path);
  try {
    configureConnection(db);
    db.function("life_owner", () => f.owner);
    db.function("life_command", () => "runtime.bootstrap");
    db.pragma("foreign_keys=OFF");
    db.prepare("INSERT INTO tasks(id,user_id,title,source_inbox_item_id,created_at,updated_at) VALUES(?,?,'Dangling',?,life_now(),life_now())").run(randomUUID(), f.owner, randomUUID());
  } finally {
    db.close();
  }
  const before = read(f.path, allRows);
  expect(() => upgradePreviewSchemaV10(f.path)).toThrow("UPGRADE_INTEGRITY_FAILED");
  expect(read(f.path, allRows)).toEqual(before);
  expect(read(f.path, schemaFingerprint)).toBe(fingerprint({ legacyV10: true }));
  read(f.path, (reader) => {
    expect(reader.pragma("user_version", { simple: true })).toBe(BigInt(10));
    expect(reader.prepare("SELECT schema_version,writer_pid FROM runtime_metadata").get()).toEqual({ schema_version: BigInt(10), writer_pid: null });
  });
});

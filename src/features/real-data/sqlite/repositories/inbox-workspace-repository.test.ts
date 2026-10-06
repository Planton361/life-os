import { randomUUID } from "node:crypto";
import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { initializeSyntheticDatabase } from "../synthetic-database";
import { issueOwnerContext, type OwnerContext } from "../owner-context";
import { SqliteRuntime } from "../runtime";
import { createSqliteInboxWorkspaceRepository } from "./inbox-workspace-repository";
import { skillDevelopmentCommand } from "./skill-development-repository";
import type { InboxCompletionInput } from "../../schemas/inbox-workspace.schemas";
const owner = "11600000-0000-4000-8000-000000000001", at = "2026-10-06T10:00:00.123456Z";
function fixture() {
  const path = join(mkdtempSync(join(realpathSync(tmpdir()), "life-os-116-inbox-")), "synthetic.db");
  initializeSyntheticDatabase(path, owner);
  const store = new SqliteRuntime(path, { syntheticProof: true }), context = issueOwnerContext(owner);
  const capture = () => {
    const id = randomUUID();
    store.command(context, "inbox.capture", db => db.prepare("INSERT INTO inbox_items(id,user_id,title,body,captured_at,created_at,updated_at) VALUES(?,?,'Original','Full original text',?,?,?)").run(id, owner, at, at, at));
    return id;
  };
  return { path, store, context, capture, repo: createSqliteInboxWorkspaceRepository(store, context) };
}
const completion = (id: string): InboxCompletionInput => ({ inboxItemId: id, expectedUpdatedAt: at, title: "Clarified title", body: "Clarified body", nextAction: "Next action", missingInfo: "Missing detail", priority: "P1", energy: "low", durationMinutes: 20, areaId: null, reviewNeeded: true, todayCandidate: true, deadlineHint: "2026-10-25", route: "task", targetId: null });
it("ports every saved routing destination and preserves capture, planning signals and canonical Note", () => {
  const f = fixture();
  try {
    const project = randomUUID(), goal = randomUUID();
    f.store.command(f.context, "inbox.context", db => {
      db.prepare("INSERT INTO projects(id,user_id,title,created_at,updated_at) VALUES(?,?,'Project',life_now(),life_now())").run(project, owner);
      db.prepare("INSERT INTO goals(id,user_id,title,created_at,updated_at) VALUES(?,?,'Goal',life_now(),life_now())").run(goal, owner);
    });
    const skill = skillDevelopmentCommand(f.store, f.context, { operation: "skill.create", commandId: randomUUID(), skillId: null, expectedRevision: null, payload: { name: "Inbox skill" } });
    const skillId = f.store.read(f.context, db => (db.prepare("SELECT id FROM skills WHERE user_id=?").get(owner) as { id: string }).id);
    expect(skill).toBeDefined();
    for (const route of ["task", "existing_project", "existing_goal", "existing_skill", "project", "goal", "resource", "note", "archive"] as const) {
      const id = f.capture(), input = { ...completion(id), route, targetId: route === "existing_project" ? project : route === "existing_goal" ? goal : route === "existing_skill" ? skillId : null };
      const result = f.repo.complete(input);
      expect(result.error, route).toBeNull();
      if (!result.data) throw new Error(route);
      const state = f.store.read(f.context, db => db.prepare("SELECT * FROM inbox_items WHERE user_id=? AND id=?").get(owner, id)) as { original_title: string; original_body: string; title: string; status: string; next_action: string; today_candidate: bigint };
      expect(state).toMatchObject({ original_title: "Original", original_body: "Full original text", title: input.title, next_action: input.nextAction, today_candidate: BigInt(1), status: result.data.kind === "task" ? "triaged" : "archived" });
      if (result.data.kind === "task") {
        const task = f.store.read(f.context, db => db.prepare("SELECT * FROM tasks WHERE user_id=? AND id=?").get(owner, result.data!.id)) as { id: string; description: string; status: string; due_at: string; planned_date: string | null };
        expect(task).toMatchObject({ description: "Clarified body\n\nMissing Info: Missing detail\n\nNächste Aktion: Next action", status: "inbox", due_at: "2026-10-25T22:59:59.000000Z" });
        expect(task.planned_date).not.toBeNull();
      }
      if (route === "existing_skill") expect(f.store.read(f.context, db => db.prepare("SELECT skill_id FROM task_skill_links WHERE user_id=? AND task_id=?").get(owner, result.data!.id))).toEqual({ skill_id: skillId });
      if (route === "note") expect(f.store.read(f.context, db => db.prepare("SELECT type,source FROM resources WHERE user_id=? AND id=?").get(owner, result.data!.id))).toEqual({ type: "note", source: `inbox:${id}` });
      expect(f.repo.complete(input).error).not.toBeNull();
    }
  } finally { f.store.close(); }
});
it("rolls final clarification back on invalid destination and injected destination failure; save/route uses exact stale token", () => {
  const f = fixture(), id = f.capture();
  try {
    for (const route of ["existing_project", "existing_goal", "existing_skill"] as const) {
      expect(f.repo.complete({ ...completion(id), route, targetId: randomUUID() }).error).not.toBeNull();
      expect(f.store.read(f.context, db => db.prepare("SELECT title,status,updated_at FROM inbox_items WHERE user_id=? AND id=?").get(owner, id))).toEqual({ title: "Original", status: "raw", updated_at: at });
    }
    f.store.command(f.context, "inbox.proof", db => db.exec("CREATE TRIGGER proof_fail_destination AFTER INSERT ON resources BEGIN SELECT RAISE(ABORT,'PROOF_FAILURE'); END;"));
    expect(f.repo.complete({ ...completion(id), route: "resource" }).error).not.toBeNull();
    expect(f.store.read(f.context, db => db.prepare("SELECT count(*) AS n FROM resources WHERE user_id=?").get(owner))).toEqual({ n: BigInt(0) });
    expect(f.store.read(f.context, db => db.prepare("SELECT title,status,updated_at FROM inbox_items WHERE user_id=? AND id=?").get(owner, id))).toEqual({ title: "Original", status: "raw", updated_at: at });
    f.store.command(f.context, "inbox.proof", db => db.exec("DROP TRIGGER proof_fail_destination"));
    const saved = f.repo.save(completion(id));
    expect(saved.error).toBeNull();
    if (!saved.data) throw new Error("Save failed");
    expect(f.repo.route(completion(id)).error?.code).toBe("PT409");
    const routed = f.repo.route({ ...completion(id), expectedUpdatedAt: saved.data.updated_at });
    expect(routed.error).toBeNull();
    expect(f.store.read(f.context, db => db.prepare("SELECT count(*) AS n FROM tasks WHERE user_id=?").get(owner))).toEqual({ n: BigInt(1) });
  } finally { f.store.close(); }
});
it("denies unissued/foreign contexts, invalid clarification and raw capture rewrites", () => {
  const f = fixture(), id = f.capture();
  try {
    for (const context of [issueOwnerContext(randomUUID()), {} as OwnerContext]) expect(createSqliteInboxWorkspaceRepository(f.store, context).complete(completion(id)).error).not.toBeNull();
    expect(f.repo.complete({ ...completion(id), areaId: randomUUID() }).error).not.toBeNull();
    expect(f.repo.complete({ ...completion(id), title: " " }).error).not.toBeNull();
    expect(() => f.store.command(f.context, "inbox.update", db => db.prepare("UPDATE inbox_items SET original_title='Rewritten' WHERE user_id=? AND id=?").run(owner, id))).toThrow("INBOX_ORIGINAL_IMMUTABLE");
    expect(f.store.read(f.context, db => db.prepare("SELECT count(*) AS n FROM tasks WHERE user_id=?").get(owner))).toEqual({ n: BigInt(0) });
  } finally { f.store.close(); }
});

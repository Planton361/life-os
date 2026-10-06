import { randomUUID } from "node:crypto";
import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { initializeSyntheticDatabase } from "../synthetic-database";
import { issueOwnerContext, type OwnerContext } from "../owner-context";
import { SqliteRuntime } from "../runtime";
import { createSqliteTaskStepRepository } from "./task-step-repository";

const owner = "11600000-0000-4000-8000-000000000001";
function fixture() {
  const path = join(mkdtempSync(join(realpathSync(tmpdir()), "life-os-116-steps-")), "synthetic.db");
  initializeSyntheticDatabase(path, owner);
  const context = issueOwnerContext(owner), store = new SqliteRuntime(path, { syntheticProof: true }), task = randomUUID();
  store.command(context, "task.create", db => db.prepare("INSERT INTO tasks(id,user_id,title,created_at,updated_at) VALUES(?,?,'Parent',life_now(),life_now())").run(task, owner));
  return { path, store, context, task, repo: createSqliteTaskStepRepository(store, context) };
}
it("retains Step identity, completion instant, ordering and archive through restart", () => {
  const f = fixture();
  let stable = "", completion: string | null = null;
  try {
    expect(f.repo.write("create", { taskId: f.task, title: " First ", position: 1 })).toBe(true);
    expect(f.repo.write("create", { taskId: f.task, title: "Second", position: 0 })).toBe(true);
    expect(f.repo.write("create", { taskId: f.task, title: "Tie", position: 0 })).toBe(true);
    expect(f.repo.read(f.task).map(row => row.title)).toEqual(["Second", "Tie", "First"]);
    stable = f.repo.read(f.task)[2].id;
    const input = { taskId: f.task, stepId: stable, title: "First edited", position: 0, completed: true };
    expect(f.repo.write("update", input)).toBe(true);
    completion = f.repo.read(f.task).find(row => row.id === stable)!.completed_at;
    expect(completion).not.toBeNull();
    expect(f.repo.write("update", input)).toBe(true);
    expect(f.repo.read(f.task)[0]).toMatchObject({ id: stable, completed_at: completion, title: "First edited" });
    expect(f.repo.write("update", { ...input, completed: false })).toBe(true);
    expect(f.repo.read(f.task)[0].completed_at).toBeNull();
    expect(f.repo.write("update", input)).toBe(true);
    completion = f.repo.read(f.task)[0].completed_at;
    const archived = f.repo.read(f.task)[1].id;
    expect(f.repo.write("archive", { taskId: f.task, stepId: archived })).toBe(true);
    expect(f.repo.write("update", { ...input, stepId: archived })).toBe(false);
    expect(f.repo.write("archive", { taskId: f.task, stepId: archived })).toBe(false);
  } finally { f.store.close(); }
  const restart = new SqliteRuntime(f.path, { syntheticProof: true });
  try {
    expect(createSqliteTaskStepRepository(restart, f.context).read(f.task)).toHaveLength(2);
    expect(createSqliteTaskStepRepository(restart, f.context).read(f.task)[0]).toMatchObject({ id: stable, completed_at: completion });
  } finally { restart.close(); }
});
it("denies forged/foreign scopes, missing and archived parents, invalid input and raw identity/history bypass", () => {
  const f = fixture();
  try {
    for (const context of [issueOwnerContext(randomUUID()), {} as OwnerContext]) {
      const repo = createSqliteTaskStepRepository(f.store, context);
      expect(repo.write("create", { taskId: f.task, title: "Denied" })).toBe(false);
      expect(() => repo.read(f.task)).toThrow();
    }
    expect(f.repo.write("create", { taskId: randomUUID(), title: "Missing parent" })).toBe(false);
    expect(f.repo.write("create", { taskId: f.task, title: " ", position: 0 })).toBe(false);
    expect(f.repo.write("create", { taskId: f.task, title: "Too big", position: 2147483648 })).toBe(false);
    expect(f.repo.write("create", { taskId: f.task, title: "Owned" })).toBe(true);
    const step = f.repo.read(f.task)[0].id;
    expect(() => f.store.command(f.context, "step.update", db => db.prepare("UPDATE task_steps SET id=? WHERE user_id=? AND id=?").run(randomUUID(), owner, step))).toThrow("STEP_IDENTITY_IMMUTABLE");
    expect(() => f.store.command(f.context, "step.create", db => db.prepare("INSERT INTO task_steps(id,user_id,task_id,title,created_at,updated_at) VALUES(?,?,?,'Foreign',life_now(),life_now())").run(randomUUID(), randomUUID(), f.task))).toThrow();
    expect(() => f.store.command(f.context, "step.delete", db => db.prepare("DELETE FROM task_steps WHERE user_id=? AND id=?").run(owner, step))).toThrow("STEP_ARCHIVE_REQUIRED");
    f.store.command(f.context, "task.archive", db => db.prepare("UPDATE tasks SET archived_at=life_now() WHERE user_id=? AND id=?").run(owner, f.task));
    expect(f.repo.write("create", { taskId: f.task, title: "Archived parent" })).toBe(false);
    expect(f.repo.write("archive", { taskId: f.task, stepId: step })).toBe(false);
    expect(() => f.store.command(f.context, "step.update", db => db.prepare("UPDATE task_steps SET title='Bypass' WHERE user_id=? AND id=?").run(owner, step))).toThrow("STEP_UNAVAILABLE");
    expect(f.repo.read(f.task)).toEqual([]);
  } finally { f.store.close(); }
});

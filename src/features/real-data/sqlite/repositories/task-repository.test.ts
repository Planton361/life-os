import { randomUUID } from "node:crypto";
import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { initializeSyntheticDatabase } from "../synthetic-database";
import { issueOwnerContext } from "../owner-context";
import { SqliteRuntime } from "../runtime";
import { createSqliteTaskRepository } from "./task-repository";
import { scheduleLinkedSource, sourceTaskCommands } from "../commands/source-commands";

const owner = "11600000-0000-4000-8000-000000000001";
const now = "2026-10-06T10:00:00.123456Z";
function fixture() {
  const path = join(mkdtempSync(join(realpathSync(tmpdir()), "life-os-116-task-")), "synthetic.db");
  initializeSyntheticDatabase(path, owner);
  const context = issueOwnerContext(owner), store = new SqliteRuntime(path, { syntheticProof: true });
  return { path, store, context, repo: createSqliteTaskRepository(store, context, sourceTaskCommands) };
}
const input = { userId: owner, profileId: owner, title: "Synthetic canonical Task" };
describe("native Task compatibility", () => {
  it("creates, edits, schedules, completes, reopens and persists on a new connection", async () => {
    const f = fixture();
    const created = await f.repo.createTask(input); expect(created.ok).toBe(true);
    if (!created.ok) throw new Error(created.error.message);
    const taskId = created.data.id, scope = { userId: owner, profileId: owner, taskId };
    try {
      expect((await f.repo.updateTask({ ...scope, title: "Edited native Task" })).ok).toBe(true);
      expect((await f.repo.scheduleTask({ ...scope, plannedDate: "2026-10-06", scheduledStartAt: "2026-10-06T12:00:00+02:00", durationMinutes: 30 })).ok).toBe(true);
      const completed = await f.repo.completeTask({ ...scope, completedAt: now });
      expect(completed.ok && completed.data.completedAt).toBe(now);
      expect((await f.repo.reopenTask(scope)).ok).toBe(true);
      expect((await f.repo.unscheduleTask(scope)).ok).toBe(true);
      const forged = await f.repo.createTask({ ...input, userId: randomUUID() }); expect(forged.ok).toBe(false);
      const badProfile = await f.repo.getPortfolioTasks(owner, randomUUID()); expect(badProfile.ok).toBe(false);
    } finally { f.store.close(); }
    const restarted = new SqliteRuntime(f.path, { syntheticProof: true });
    try {
      const tasks = await createSqliteTaskRepository(restarted, f.context, sourceTaskCommands).getTasksForToday(owner, owner, "2026-10-06");
      expect(tasks.ok && tasks.data.map((task) => ({ id: task.id, title: task.title, status: task.status, start: task.scheduledStartAt, completed: task.completedAt }))).toEqual([{ id: taskId, title: "Edited native Task", status: "planned", start: null, completed: null }]);
    } finally { restarted.close(); }
  });
  it("keeps PostgreSQL null ordering and separates planning date from time block", async () => {
    const f = fixture();
    try {
      const untimed = await f.repo.createTask({ ...input, plannedDate: "2026-10-06" });
      const timed = await f.repo.createTask({ ...input, plannedDate: "2026-10-06", scheduledStartAt: now });
      if (!untimed.ok || !timed.ok) throw new Error("fixture failed");
      const result = await f.repo.getTasksForToday(owner, owner, "2026-10-06");
      expect(result.ok && result.data.map((task) => task.id)).toEqual([timed.data.id, untimed.data.id]);
    } finally { f.store.close(); }
  });
  it("rolls linked Meal + Task back when a predecessor blocks completion", async () => {
    const f = fixture(); const meal = randomUUID(), project = randomUUID();
    try {
      f.store.command(f.context, "nutrition.create", (db, user) => {
        db.prepare("INSERT INTO projects(id,user_id,title,status,created_at,updated_at) VALUES(?,?,'Linked Project','active',?,?)").run(project, user, now, now);
        db.prepare("INSERT INTO meals(id,user_id,date,meal_type,title,created_at,updated_at) VALUES(?,?,'2026-10-06','lunch','Synthetic meal',?,?)").run(meal, user, now, now);
      });
      const linked = f.store.command(f.context, "source.schedule", (db, user) => scheduleLinkedSource(db, user, "meal", meal, "2026-10-06", now, 30));
      expect((await f.repo.updateTask({ ...input, taskId: linked.id, projectId: project })).ok).toBe(true);
      const predecessor = await f.repo.createTask({ ...input, projectId: project });
      if (!predecessor.ok) throw new Error("fixture failed");
      f.store.command(f.context, "dependency.add", (db, user) => db.prepare("INSERT INTO task_dependencies(id,user_id,project_id,predecessor_task_id,successor_task_id,created_at) VALUES(?,?,?,?,?,?)").run(randomUUID(), user, project, predecessor.data.id, linked.id, now));
      expect((await f.repo.completeTask({ ...input, taskId: linked.id, completedAt: now })).ok).toBe(false);
      expect(f.store.read(f.context, (db, user) => db.prepare("SELECT completed_at FROM meals WHERE user_id=? AND id=?").get(user, meal))).toEqual({ completed_at: null });
      expect((await f.repo.completeTask({ ...input, taskId: predecessor.data.id, completedAt: now })).ok).toBe(true);
      expect((await f.repo.completeTask({ ...input, taskId: linked.id, completedAt: now })).ok).toBe(true);
      expect(f.store.read(f.context, (db, user) => db.prepare("SELECT completed_at FROM meals WHERE user_id=? AND id=?").get(user, meal))).toEqual({ completed_at: now });
      expect((await f.repo.reopenTask({ ...input, taskId: linked.id })).ok).toBe(false);
      expect(() => f.store.command(f.context, "task.update", (db, user) => db.prepare("UPDATE tasks SET completed_at=NULL,status='planned' WHERE user_id=? AND id=?").run(user, linked.id))).toThrow("SOURCE_COMMAND_REQUIRED");
    } finally { f.store.close(); }
  });
  it("does not complete linked Review or workout without domain evidence", async () => {
    const f = fixture(); const review = randomUUID();
    try {
      f.store.command(f.context, "review.create", (db, user) => db.prepare("INSERT INTO review_records(id,user_id,kind,period_start,period_end,timezone,created_at,updated_at) VALUES(?,?,'daily','2026-10-06','2026-10-06','Europe/Berlin',?,?)").run(review, user, now, now));
      const linked = f.store.command(f.context, "source.schedule", (db, user) => scheduleLinkedSource(db, user, "review", review, "2026-10-06", now, 30));
      const completion = await f.repo.completeTask({ ...input, taskId: linked.id, completedAt: now });
      expect(completion.ok).toBe(false);
      expect(!completion.ok && completion.error.message).toBe("SOURCE_REVIEW_FLOW_REQUIRED");
      expect(f.store.read(f.context, (db, user) => db.prepare("SELECT status FROM review_records WHERE user_id=? AND id=?").get(user, review))).toEqual({ status: "draft" });
    } finally { f.store.close(); }
  });
});

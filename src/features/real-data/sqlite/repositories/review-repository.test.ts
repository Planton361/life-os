import { randomUUID } from "node:crypto";
import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { initializeSyntheticDatabase } from "../synthetic-database";
import { SqliteRuntime } from "../runtime";
import { issueOwnerContext } from "../owner-context";
import { scheduleLinkedSource, sourceTaskCommands } from "../commands/source-commands";
import { createSqliteTaskRepository } from "./task-repository";
import { createSqliteReviewRepository } from "./review-repository";

const owner = "11600000-0000-4000-8000-000000000001";
const input = { userId: owner, profileId: owner, kind: "daily" as const, periodStart: "2026-10-06", periodEnd: "2026-10-06", timezone: "Europe/Berlin", wins: ["Synthetic win"], blockers: [], openLoops: [], carryTaskIds: [], status: "draft" as const };
function fixture() {
  const path = join(mkdtempSync(join(realpathSync(tmpdir()), "life-os-116-review-")), "synthetic.db");
  initializeSyntheticDatabase(path, owner);
  const context = issueOwnerContext(owner), store = new SqliteRuntime(path, { syntheticProof: true });
  return { path, store, context, reviews: createSqliteReviewRepository(store, context), tasks: createSqliteTaskRepository(store, context, sourceTaskCommands) };
}
describe("native Review compatibility", () => {
  it("reconciles carry selection idempotently, restores its snapshot and preserves later planning", async () => {
    const f = fixture();
    const original = "2026-10-06T10:00:00.123456Z";
    try {
      const created = await f.tasks.createTask({ userId: owner, profileId: owner, title: "Synthetic carry", plannedDate: "2026-10-06", scheduledStartAt: original });
      if (!created.ok) throw new Error(created.error.message);
      const id = created.data.id;
      const first = await f.reviews.saveReview({ ...input, carryTaskIds: [id, id] });
      if (!first.ok) throw new Error(first.error.message);
      const readTask = () => f.store.read(f.context, db => db.prepare("SELECT planned_date,scheduled_start_at FROM tasks WHERE user_id=? AND id=?").get(owner, id));
      expect(readTask()).toEqual({ planned_date: "2026-10-07", scheduled_start_at: null });
      const decisions = await f.reviews.getTaskDecisions(owner, first.data.id);
      expect(decisions.ok && decisions.data).toHaveLength(1);
      const repeated = await f.reviews.saveReview({ ...input, carryTaskIds: [id] });
      expect(repeated.ok && repeated.data.id).toBe(first.data.id);
      expect(await f.reviews.getTaskDecisions(owner, first.data.id)).toEqual(decisions);
      expect((await f.reviews.saveReview(input)).ok).toBe(true);
      expect(readTask()).toEqual({ planned_date: "2026-10-06", scheduled_start_at: original });
      expect((await f.reviews.saveReview({ ...input, carryTaskIds: [id] })).ok).toBe(true);
      expect((await f.tasks.scheduleTask({ userId: owner, profileId: owner, taskId: id, plannedDate: "2026-10-09", scheduledStartAt: "2026-10-09T12:00:00Z" })).ok).toBe(true);
      expect((await f.reviews.saveReview(input)).ok).toBe(true);
      expect(readTask()).toEqual({ planned_date: "2026-10-09", scheduled_start_at: "2026-10-09T12:00:00.000000Z" });
      expect((await f.reviews.saveReview({ ...input, carryTaskIds: [randomUUID()], outcome: "must roll back" })).ok).toBe(false);
      const result = await f.reviews.getReviewByPeriod(owner, owner, "daily", input.periodStart);
      expect(result.ok && result.data?.outcome).toBe(null);
      expect((await f.reviews.getReviewsInRange(randomUUID(), owner, "2026-10-01", "2026-10-31")).ok).toBe(false);
    } finally { f.store.close(); }
  });
  it("completes Review and linked Task atomically and preserves stable identity/completion on repeat", async () => {
    const f = fixture();
    let savedId = "", completedAt: string | null = null;
    try {
      const initial = await f.reviews.saveReview(input);
      if (!initial.ok) throw new Error(initial.error.message);
      savedId = initial.data.id;
      const linked = f.store.command(f.context, "source.schedule", (db, user) => scheduleLinkedSource(db, user, "review", savedId, "2026-10-07", "2026-10-07T10:00:00Z", 30));
      const completed = await f.reviews.saveReview({ ...input, status: "completed" });
      expect(completed.ok).toBe(true);
      if (!completed.ok) throw new Error(completed.error.message);
      completedAt = completed.data.completedAt;
      expect(f.store.read(f.context, db => db.prepare("SELECT status,completed_at FROM tasks WHERE user_id=? AND id=?").get(owner, linked.id))).toEqual({ status: "done", completed_at: completedAt });
      const repeat = await f.reviews.saveReview({ ...input, status: "completed", outcome: "Persisted synthetic outcome" });
      expect(repeat.ok && repeat.data.completedAt).toBe(completedAt);
      expect(repeat.ok && repeat.data.id).toBe(savedId);
    } finally { f.store.close(); }
    const restarted = new SqliteRuntime(f.path, { syntheticProof: true });
    try {
      const loaded = await createSqliteReviewRepository(restarted, f.context).getReviewByPeriod(owner, owner, "daily", input.periodStart);
      expect(loaded.ok && loaded.data).toMatchObject({ id: savedId, completedAt, wins: ["Synthetic win"], outcome: "Persisted synthetic outcome" });
    } finally { restarted.close(); }
  });
});

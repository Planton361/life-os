import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  sourceReviewFixture,
  owner,
  scope,
  daily,
  at,
} from "../../../../tests/sqlite/source-review-fixture";
import { SqliteRuntime } from "./runtime";
import { inspectSyntheticDatabase, restoreSyntheticBackup } from "./recovery";
import { createSqliteScheduleSourceRepository } from "./repositories/schedule-source-repository";
import { createSqliteReviewRepository } from "./repositories/review-repository";
import {
  createSqliteResourceRepository,
  createSqliteProjectArtifactRepository,
} from "./repositories/resource-repository";
import { createSqliteTaskRepository } from "./repositories/task-repository";
import {
  sourceTaskCommands,
  reconcileCompletedSource,
} from "./commands/source-commands";

it("preserves populated canonical sources, artifacts and Review planning history through restart, online backup and isolated restore", async () => {
  const f = sourceReviewFixture();
  let reviewId = "",
    weeklyId = "";
  try {
    const carry = await f.tasks.createTask({
      ...scope,
      title: "Carry history",
      plannedDate: "2026-10-06",
      scheduledStartAt: at,
      projectId: f.project,
    });
    if (!carry.ok) throw new Error("Fixture failed");
    const review = await f.reviews.saveReview({
      ...daily,
      carryTaskIds: [carry.data.id],
      outcome: "Daily historical outcome",
      planningNote: "Carry into tomorrow",
    });
    if (!review.ok) throw new Error("Fixture failed");
    reviewId = review.data.id;
    const weekly = await f.reviews.saveReview({
      ...daily,
      kind: "weekly",
      periodStart: "2026-10-05",
      periodEnd: "2026-10-11",
      outcome: "Weekly outcome",
      nextPeriodFocus: "Stable focus",
    });
    if (!weekly.ok) throw new Error("Fixture failed");
    weeklyId = weekly.data.id;
    for (const [type, id] of [
      ["meal", f.meal],
      ["review", reviewId],
      ["review", weeklyId],
      ["running_plan_item", f.runningItem],
      ["strength_plan", f.strengthPlan],
    ] as const)
      expect(
        (
          await f.sources.schedule({
            sourceType: type,
            sourceId: id,
            plannedDate: "2026-10-06",
            scheduledStartAt: at,
            durationMinutes: 30,
          })
        ).error,
      ).toBeNull();
    expect((await f.sources.completeLinkedMeal(f.meal, at)).error).toBeNull();
    expect(
      (
        await f.reviews.saveReview({
          ...daily,
          status: "completed",
          carryTaskIds: [carry.data.id],
          outcome: "Daily historical outcome",
          planningNote: "Carry into tomorrow",
        })
      ).ok,
    ).toBe(true);
    const session = randomUUID();
    f.store.command(f.context, "synthetic.recorded_facts", (db) => {
      db.prepare(
        "INSERT INTO running_sessions(id,user_id,plan_item_id,session_date,distance_km,duration_minutes,status,completed_at,created_at,updated_at) VALUES(?,?,?,'2026-10-06','5.123',30,'completed',?,?,?)",
      ).run(randomUUID(), owner, f.runningItem, at, at, at);
      db.prepare(
        "INSERT INTO strength_sessions(id,user_id,plan_id,session_date,started_at,status,completed_at,created_at,updated_at) VALUES(?,?,?,'2026-10-06',?,'completed',?,?,?)",
      ).run(session, owner, f.strengthPlan, at, at, at, at);
      db.prepare(
        "INSERT INTO strength_set_logs(id,user_id,session_id,exercise_id,set_order,repetitions,weight_kg,recorded_at) VALUES(?,?,?,?,1,8,'12.125',?)",
      ).run(randomUUID(), owner, session, f.exercise, at);
    });
    for (const [type, id] of [
      ["running_plan_item", f.runningItem],
      ["strength_plan", f.strengthPlan],
    ] as const)
      f.store.command(f.context, "source.complete", (db) =>
        reconcileCompletedSource(db, owner, type, id, at),
      );
    const a = await f.resources.createResource({
        ...scope,
        title: "Original Primary",
        body: "Full immutable reference 🧭",
        type: "research",
        areaId: f.area,
      }),
      b = await f.resources.createResource({
        ...scope,
        title: "Final Primary",
        type: "decision",
      });
    if (!a.ok || !b.ok) throw new Error("Fixture failed");
    for (const id of [a.data.id, b.data.id])
      expect(
        await f.artifacts.setProjectResourceRole({
          projectId: f.project,
          resourceId: id,
          role: "primary_artifact",
        }),
      ).toBe(true);
    for (const [type, id] of [
      ["goal", f.goal],
      ["task", carry.data.id],
      ["skill", f.skill],
      ["resource", b.data.id],
    ] as const)
      expect(
        (
          await f.resources.linkResource({
            ...scope,
            resourceId: a.data.id,
            targetType: type,
            targetId: id,
            relationType: "context",
          })
        ).ok,
      ).toBe(true);
  } finally {
    f.store.close();
  }
  const before = inspectSyntheticDatabase(f.path);
  expect(before.counts).toMatchObject({
    tasks: 6,
    schedule_source_links: 5,
    resources: 2,
    resource_relations: 6,
    review_records: 2,
    review_task_decisions: 1,
    running_sessions: 1,
    strength_sessions: 1,
    strength_set_logs: 1,
    skill_command_receipts: 1,
  });
  async function projection(runtime: SqliteRuntime) {
    const sources = createSqliteScheduleSourceRepository(runtime, f.context),
      reviews = createSqliteReviewRepository(runtime, f.context),
      resources = createSqliteResourceRepository(runtime, f.context);
    const result = {
      links: await sources.getLinks(owner),
      tasks: await createSqliteTaskRepository(
        runtime,
        f.context,
        sourceTaskCommands,
      ).getPortfolioTasks(owner, owner),
      daily: await reviews.getReviewByPeriod(
        owner,
        owner,
        "daily",
        daily.periodStart,
      ),
      weekly: await reviews.getReviewByPeriod(
        owner,
        owner,
        "weekly",
        "2026-10-05",
      ),
      decisions: await reviews.getTaskDecisions(owner, reviewId),
      resources: await resources.getResourcesByUser(owner, owner),
      backlinks: await resources.getResourceRelationsForTarget(
        owner,
        owner,
        "project",
        f.project,
      ),
      artifacts: createSqliteProjectArtifactRepository(
        runtime,
        f.context,
      ).readProjectResourceUses(f.project),
      history: runtime.read(f.context, (db) => ({
        snapshots: db
          .prepare(
            "SELECT id,task_id,target_date,original_planned_date,original_scheduled_start_at,planning_snapshot_captured FROM review_task_decisions WHERE user_id=? ORDER BY id",
          )
          .all(owner),
        sourceCompletion: db
          .prepare(
            "SELECT l.source_type,l.source_id,l.task_id,t.status,t.completed_at FROM schedule_source_links l JOIN tasks t ON t.user_id=l.user_id AND t.id=l.task_id WHERE l.user_id=? ORDER BY l.id",
          )
          .all(owner),
      })),
    };
    expect(
      result.artifacts.filter((a) => a.role === "primary_artifact"),
    ).toHaveLength(1);
    expect(result.history.snapshots[0]).toMatchObject({
      original_planned_date: "2026-10-06",
      original_scheduled_start_at: at,
      planning_snapshot_captured: BigInt(1),
      target_date: "2026-10-07",
    });
    expect(
      result.history.sourceCompletion.filter(
        (row) => (row as { status: string }).status === "done",
      ),
    ).toHaveLength(4);
    expect(result.daily).toMatchObject({
      ok: true,
      data: {
        id: reviewId,
        status: "completed",
        outcome: "Daily historical outcome",
      },
    });
    expect(result.weekly).toMatchObject({
      ok: true,
      data: { id: weeklyId, status: "draft", nextPeriodFocus: "Stable focus" },
    });
    expect(
      runtime.read(f.context, (db) =>
        db.prepare("SELECT compatibility_ready FROM runtime_metadata").get(),
      ),
    ).toEqual({ compatibility_ready: BigInt(0) });
    return result;
  }
  const restarted = new SqliteRuntime(f.path, { syntheticProof: true });
  try {
    const original = await projection(restarted),
      backup = join(f.directory, "online.db"),
      restored = join(f.directory, "restore.db");
    expect(inspectSyntheticDatabase(f.path)).toEqual(before);
    await restarted.backup(backup);
    expect(inspectSyntheticDatabase(backup)).toEqual(before);
    expect(await restoreSyntheticBackup(backup, restored)).toEqual(before);
    const candidate = new SqliteRuntime(restored, { syntheticProof: true });
    try {
      expect(await projection(candidate)).toEqual(original);
    } finally {
      candidate.close();
    }
  } finally {
    restarted.close();
  }
});

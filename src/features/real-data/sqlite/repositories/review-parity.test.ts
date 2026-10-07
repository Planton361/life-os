import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  sourceReviewFixture,
  owner,
  scope,
  daily,
  at,
} from "../../../../../tests/sqlite/source-review-fixture";
import { createSqliteReviewRepository } from "./review-repository";
import { issueOwnerContext, type OwnerContext } from "../owner-context";
import { configureConnection } from "../runtime";

it("saves Weekly canonical fields and stable completion, reads ordered periods, and reconciles source completion", async () => {
  const f = sourceReviewFixture();
  try {
    const input = {
      ...daily,
      kind: "weekly" as const,
      periodStart: "2026-10-05",
      periodEnd: "2026-10-11",
      timezone: "America/New_York",
      wins: ["Win one", "Win two"],
      blockers: ["Blocker"],
      openLoops: ["Open loop"],
      outcome: "Outcome",
      nextPeriodFocus: "Focus",
      planningNote: "Plan",
    };
    const first = await f.reviews.saveReview(input);
    if (!first.ok) throw new Error("Fixture failed");
    const linked = await f.sources.schedule({
      sourceType: "review",
      sourceId: first.data.id,
      plannedDate: "2026-10-12",
      scheduledStartAt: "2026-10-12T10:00:00Z",
      durationMinutes: 45,
    });
    if (!linked.data) throw new Error("No link");
    expect(
      (await f.sources.completeLinkedTask(linked.data.id, at)).error,
    ).not.toBeNull();
    const saved = await f.reviews.saveReview({ ...input, status: "completed" });
    if (!saved.ok) throw new Error("Save failed");
    expect(saved.data).toMatchObject({
      id: first.data.id,
      timezone: "America/New_York",
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      wins: input.wins,
      blockers: input.blockers,
      openLoops: input.openLoops,
      outcome: "Outcome",
      nextPeriodFocus: "Focus",
      planningNote: "Plan",
      status: "completed",
    });
    const repeated = await f.reviews.saveReview({
      ...input,
      status: "completed",
      outcome: "Edited Outcome",
    });
    expect(repeated.ok && repeated.data.completedAt).toBe(
      saved.data.completedAt,
    );
    expect(
      (
        await f.sources.schedule({
          sourceType: "review",
          sourceId: first.data.id,
          plannedDate: "2026-10-13",
          scheduledStartAt: "2026-10-13T10:00:00Z",
          durationMinutes: 40,
        })
      ).data,
    ).toMatchObject({
      id: linked.data.id,
      status: "done",
      completed_at: saved.data.completedAt,
    });
    expect(
      (await f.reviews.saveReview({ ...input, carryTaskIds: [randomUUID()] }))
        .ok,
    ).toBe(false);
    expect((await f.reviews.saveReview(daily)).ok).toBe(true);
    const range = await f.reviews.getReviewsInRange(
      owner,
      owner,
      "2026-10-01",
      "2026-10-31",
    );
    expect(range.ok && range.data.map((r) => r.periodStart)).toEqual([
      "2026-10-06",
      "2026-10-05",
    ]);
    const reset = await f.reviews.saveReview({ ...input, status: "draft" });
    expect(reset.ok && reset.data.completedAt).toBeNull();
    // Canonical save resets Review truth; explicit source scheduling reconciles the Task.
    const rescheduled = await f.sources.schedule({
      sourceType: "review",
      sourceId: first.data.id,
      plannedDate: "2026-10-13",
      scheduledStartAt: "2026-10-13T10:00:00Z",
      durationMinutes: 40,
    });
    expect(rescheduled.data).toMatchObject({
      status: "planned",
      completed_at: null,
    });
  } finally {
    f.store.close();
  }
});

it("rolls Review and Decisions back on carry Task failure or blocked linked Review completion", async () => {
  const f = sourceReviewFixture();
  try {
    const carry = await f.tasks.createTask({
      ...scope,
      title: "Carry Task",
      projectId: f.project,
      plannedDate: "2026-10-06",
      scheduledStartAt: at,
    });
    if (!carry.ok) throw new Error("Fixture failed");
    const first = await f.reviews.saveReview({
      ...daily,
      outcome: "Persisted",
    });
    if (!first.ok) throw new Error("Fixture failed");
    f.store.command(f.context, "synthetic.failpoint", (db) =>
      db.exec(
        `CREATE TRIGGER test_carry_failure BEFORE UPDATE OF planned_date ON tasks WHEN NEW.id='${carry.data.id}' BEGIN SELECT RAISE(ABORT,'TEST_CARRY_FAILURE'); END;`,
      ),
    );
    expect(
      (
        await f.reviews.saveReview({
          ...daily,
          outcome: "Must rollback",
          carryTaskIds: [carry.data.id],
        })
      ).ok,
    ).toBe(false);
    expect(
      await f.reviews.getReviewByPeriod(
        owner,
        owner,
        "daily",
        daily.periodStart,
      ),
    ).toMatchObject({
      ok: true,
      data: { id: first.data.id, outcome: "Persisted" },
    });
    expect(
      await f.reviews.getTaskDecisions(owner, first.data.id),
    ).toMatchObject({ ok: true, data: [] });
    f.store.command(f.context, "synthetic.failpoint", (db) =>
      db.exec("DROP TRIGGER test_carry_failure"),
    );
    const linked = await f.sources.schedule({
      sourceType: "review",
      sourceId: first.data.id,
      plannedDate: "2026-10-06",
      scheduledStartAt: at,
      durationMinutes: 30,
    });
    if (!linked.data) throw new Error("Fixture failed");
    expect(
      (
        await f.tasks.updateTask({
          ...scope,
          taskId: linked.data.id,
          projectId: f.project,
        })
      ).ok,
    ).toBe(true);
    f.store.command(f.context, "dependency.add", (db) =>
      db
        .prepare(
          "INSERT INTO task_dependencies(id,user_id,project_id,predecessor_task_id,successor_task_id,created_at) VALUES(?,?,?,?,?,?)",
        )
        .run(
          randomUUID(),
          owner,
          f.project,
          carry.data.id,
          linked.data!.id,
          at,
        ),
    );
    expect(
      (
        await f.reviews.saveReview({
          ...daily,
          status: "completed",
          outcome: "Must rollback",
          carryTaskIds: [carry.data.id],
        })
      ).ok,
    ).toBe(false);
    expect(
      await f.reviews.getReviewByPeriod(
        owner,
        owner,
        "daily",
        daily.periodStart,
      ),
    ).toMatchObject({
      ok: true,
      data: { status: "draft", completedAt: null, outcome: "Persisted" },
    });
    expect(
      f.store.read(f.context, (db) =>
        db
          .prepare(
            "SELECT planned_date,scheduled_start_at FROM tasks WHERE user_id=? AND id=?",
          )
          .get(owner, carry.data.id),
      ),
    ).toEqual({ planned_date: "2026-10-06", scheduled_start_at: at });
    expect(
      await f.reviews.getTaskDecisions(owner, first.data.id),
    ).toMatchObject({ ok: true, data: [] });
    expect(
      (
        await f.tasks.completeTask({
          ...scope,
          taskId: carry.data.id,
          completedAt: at,
        })
      ).ok,
    ).toBe(true);
    expect(
      (await f.reviews.saveReview({ ...daily, status: "completed" })).ok,
    ).toBe(true);
    expect(
      f.store.read(f.context, (db) =>
        db
          .prepare("SELECT status FROM tasks WHERE user_id=? AND id=?")
          .get(owner, linked.data!.id),
      ),
    ).toEqual({ status: "done" });
  } finally {
    f.store.close();
  }
});

it("retains original planning snapshot and decision identity when selected Task is later manually rescheduled", async () => {
  const f = sourceReviewFixture();
  try {
    const carry = await f.tasks.createTask({
      ...scope,
      title: "Carry",
      plannedDate: "2026-10-06",
      scheduledStartAt: at,
    });
    if (!carry.ok) throw new Error("Fixture failed");
    expect(
      (await f.reviews.saveReview({ ...daily, carryTaskIds: [carry.data.id] }))
        .ok,
    ).toBe(true);
    const decisions = () =>
      f.store.read(f.context, (db) =>
        db
          .prepare("SELECT * FROM review_task_decisions WHERE user_id=?")
          .all(owner),
      );
    const original = decisions();
    expect(
      (
        await f.tasks.scheduleTask({
          ...scope,
          taskId: carry.data.id,
          plannedDate: "2026-10-09",
          scheduledStartAt: "2026-10-09T12:00:00Z",
        })
      ).ok,
    ).toBe(true);
    expect(
      (
        await f.reviews.saveReview({
          ...daily,
          carryTaskIds: [carry.data.id],
          planningNote: "Updated planning",
        })
      ).ok,
    ).toBe(true);
    expect(decisions()).toEqual(original);
    expect(
      f.store.read(f.context, (db) =>
        db
          .prepare(
            "SELECT planned_date,scheduled_start_at FROM tasks WHERE user_id=? AND id=?",
          )
          .get(owner, carry.data.id),
      ),
    ).toEqual({
      planned_date: "2026-10-09",
      scheduled_start_at: "2026-10-09T12:00:00.000000Z",
    });
    expect((await f.reviews.saveReview(daily)).ok).toBe(true);
    expect(decisions()).toEqual([]);
  } finally {
    f.store.close();
  }
});

it("denies cross-owner Review Tasks, read scopes, forged context and direct foreign Decisions", async () => {
  const f = sourceReviewFixture(),
    foreign = randomUUID(),
    taskId = randomUUID(),
    raw = new Database(f.path);
  let current = foreign;
  configureConnection(raw);
  raw.function("life_owner", () => current);
  raw.function("life_command", () => "review.save");
  try {
    raw
      .prepare("INSERT INTO profiles(id,created_at,updated_at) VALUES(?,?,?)")
      .run(foreign, at, at);
    raw
      .prepare(
        "INSERT INTO tasks(id,user_id,title,created_at,updated_at) VALUES(?,?,'Foreign Task',?,?)",
      )
      .run(taskId, foreign, at, at);
    current = owner;
    expect(
      (await f.reviews.saveReview({ ...daily, carryTaskIds: [taskId] })).ok,
    ).toBe(false);
    expect(
      await f.reviews.getReviewByPeriod(
        owner,
        owner,
        "daily",
        daily.periodStart,
      ),
    ).toEqual({ ok: true, data: null });
    const initial = await f.reviews.saveReview(daily);
    if (!initial.ok) throw new Error("Fixture failed");
    expect(() =>
      raw
        .prepare(
          "INSERT INTO review_task_decisions(id,user_id,review_id,task_id,decision,target_date,created_at) VALUES(?,?,?,?,'carry_forward','2026-10-07',?)",
        )
        .run(randomUUID(), owner, initial.data.id, taskId, at),
    ).toThrow(/FOREIGN KEY/);
    expect(
      (
        await f.reviews.saveReview({
          ...daily,
          userId: foreign,
          profileId: foreign,
        })
      ).ok,
    ).toBe(false);
    expect(
      (
        await f.reviews.getReviewByPeriod(
          foreign,
          foreign,
          "daily",
          daily.periodStart,
        )
      ).ok,
    ).toBe(false);
    expect(
      (await f.reviews.getTaskDecisions(foreign, initial.data.id)).ok,
    ).toBe(false);
    expect(() =>
      createSqliteReviewRepository(f.store, { ownerId: owner } as OwnerContext),
    ).toThrow("OWNER_CONTEXT_REQUIRED");
    expect(
      (
        await createSqliteReviewRepository(
          f.store,
          issueOwnerContext(foreign),
        ).getReviewByPeriod(foreign, foreign, "daily", daily.periodStart)
      ).ok,
    ).toBe(false);
  } finally {
    raw.close();
    f.store.close();
  }
});

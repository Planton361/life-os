import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  sourceReviewFixture,
  scope,
  owner,
  at,
  daily,
} from "../../../../../tests/sqlite/source-review-fixture";
import { issueOwnerContext, type OwnerContext } from "../owner-context";
import { configureConnection } from "../runtime";
import { createSqliteScheduleSourceRepository } from "./schedule-source-repository";
import { reconcileCompletedSource } from "../commands/source-commands";

it("schedules all four canonical sources with stable links, validates source state and preserves Task context", async () => {
  const f = sourceReviewFixture();
  try {
    const review = await f.reviews.saveReview(daily);
    if (!review.ok) throw new Error("Fixture failed");
    for (const [type, id] of [
      ["meal", f.meal],
      ["review", review.data.id],
      ["running_plan_item", f.runningItem],
      ["strength_plan", f.strengthPlan],
    ] as const) {
      const input = {
        sourceType: type,
        sourceId: id,
        plannedDate: "2026-10-07",
        scheduledStartAt: "2026-10-07T12:00:00.123456+02:00",
        durationMinutes: 30,
      };
      const scheduled = await f.sources.schedule(input);
      expect(scheduled.error).toBeNull();
      if (!scheduled.data) throw new Error("No Task");
      const taskId = scheduled.data.id;
      expect(
        (
          await f.tasks.updateTask({
            ...scope,
            taskId,
            projectId: f.project,
            goalId: f.goal,
            areaId: f.area,
            priority: "P1",
            energy: "high",
          })
        ).ok,
      ).toBe(true);
      const repeat = await f.sources.schedule({
        ...input,
        plannedDate: "2026-10-08",
        scheduledStartAt: "2026-10-08T12:00:00Z",
        durationMinutes: 60,
      });
      expect(repeat.data).toMatchObject({
        id: taskId,
        project_id: f.project,
        goal_id: f.goal,
        area_id: f.area,
        priority: "P1",
        energy: "high",
        planned_date: "2026-10-08",
        scheduled_start_at: "2026-10-08T12:00:00.000000Z",
      });
      const links = await f.sources.getLinks(owner);
      expect(links.data?.filter((l) => l.source_id === id)).toEqual([
        { source_id: id, source_type: type, task_id: taskId, user_id: owner },
      ]);
      if (type !== "meal") {
        expect(
          (
            await f.tasks.updateTask({
              ...scope,
              taskId,
              plannedDate: "2026-10-09",
            })
          ).ok,
        ).toBe(false);
        expect(
          (
            await f.tasks.scheduleTask({
              ...scope,
              taskId,
              plannedDate: "2026-10-09",
            })
          ).ok,
        ).toBe(true);
      } else {
        expect(
          (
            await f.tasks.updateTask({
              ...scope,
              taskId,
              plannedDate: "2026-10-09",
            })
          ).ok,
        ).toBe(false);
        expect(
          (await f.sources.unscheduleLinkedMeal(taskId, "2026-10-09", 45))
            .error,
        ).toBeNull();
        expect(
          f.store.read(f.context, (db) =>
            db
              .prepare(
                "SELECT date,planned_at FROM meals WHERE user_id=? AND id=?",
              )
              .get(owner, id),
          ),
        ).toEqual({ date: "2026-10-09", planned_at: null });
      }
      for (const patch of [
        "status='done',completed_at='2026-10-06T10:00:00.123456Z'",
        "status='canceled'",
        "status='archived'",
        "archived_at='2026-10-06T10:00:00.123456Z'",
      ])
        expect(() =>
          f.store.command(f.context, "task.raw", (db) =>
            db
              .prepare(`UPDATE tasks SET ${patch} WHERE user_id=? AND id=?`)
              .run(owner, taskId),
          ),
        ).toThrow(/SOURCE_COMMAND_REQUIRED|SOURCE_DOMAIN_COMPLETION_REQUIRED/);
      if (type === "meal")
        for (const patch of [
          "planned_date=NULL",
          "scheduled_start_at=NULL,duration_minutes=12",
          "planned_date='2026-10-10',scheduled_start_at='2026-10-10T10:00:00.000000Z'",
        ])
          expect(() =>
            f.store.command(f.context, "task.raw", (db) =>
              db
                .prepare(`UPDATE tasks SET ${patch} WHERE user_id=? AND id=?`)
                .run(owner, taskId),
            ),
          ).toThrow("SOURCE_COMMAND_REQUIRED");
      expect(
        (await f.sources.completeLinkedTask(taskId, at)).error === null,
      ).toBe(type === "meal");
      if (type === "meal")
        expect(() =>
          f.store.command(f.context, "task.raw", (db) =>
            db
              .prepare(
                "UPDATE tasks SET status='planned',completed_at=NULL WHERE user_id=? AND id=?",
              )
              .run(owner, taskId),
          ),
        ).toThrow("SOURCE_COMMAND_REQUIRED");
    }
    expect(
      f.store.read(f.context, (db) =>
        db.prepare("SELECT count(*) n FROM schedule_source_links").get(),
      ),
    ).toEqual({ n: BigInt(4) });
    expect((await f.sources.getLinks(randomUUID())).error).not.toBeNull();
    for (const invalid of [
      { sourceType: "invalid" },
      { sourceId: randomUUID() },
      { plannedDate: "2026-02-30" },
      { scheduledStartAt: "bad" },
      { durationMinutes: 0 },
      { durationMinutes: 1441 },
    ])
      expect(
        (
          await f.sources.schedule({
            sourceType: "meal",
            sourceId: f.meal,
            plannedDate: "2026-10-06",
            scheduledStartAt: at,
            durationMinutes: 30,
            ...invalid,
          } as Parameters<typeof f.sources.schedule>[0])
        ).error,
      ).not.toBeNull();
    f.store.command(f.context, "synthetic.archive", (db) =>
      db
        .prepare(
          "UPDATE running_plans SET archived_at=? WHERE user_id=? AND id=?",
        )
        .run(at, owner, f.runningPlan),
    );
    expect(
      (
        await f.sources.schedule({
          sourceType: "running_plan_item",
          sourceId: f.runningItem,
          plannedDate: "2026-10-06",
          scheduledStartAt: at,
          durationMinutes: 30,
        })
      ).error,
    ).not.toBeNull();
  } finally {
    f.store.close();
  }
});

it("uses genuine session facts without fabricating workouts, and rolls back either side of Meal completion", async () => {
  const f = sourceReviewFixture();
  try {
    const tasks: string[] = [];
    for (const [type, id] of [
      ["running_plan_item", f.runningItem],
      ["strength_plan", f.strengthPlan],
    ] as const) {
      const result = await f.sources.schedule({
        sourceType: type,
        sourceId: id,
        plannedDate: "2026-10-06",
        scheduledStartAt: at,
        durationMinutes: 30,
      });
      if (!result.data) throw new Error("Fixture failed");
      tasks.push(result.data.id);
      expect(
        (await f.sources.completeLinkedTask(result.data.id, at)).error,
      ).not.toBeNull();
    }
    expect(
      f.store.read(f.context, (db) =>
        db
          .prepare(
            "SELECT (SELECT count(*) FROM running_sessions)+(SELECT count(*) FROM strength_sessions) n",
          )
          .get(),
      ),
    ).toEqual({ n: BigInt(0) });
    const session = randomUUID();
    f.store.command(f.context, "synthetic.measured_facts", (db) => {
      db.prepare(
        "INSERT INTO running_sessions(id,user_id,plan_item_id,session_date,distance_km,duration_minutes,status,completed_at,created_at,updated_at) VALUES(?,?,?,'2026-10-06','5.123',30,'completed',?,?,?)",
      ).run(randomUUID(), owner, f.runningItem, at, at, at);
      db.prepare(
        "INSERT INTO strength_sessions(id,user_id,plan_id,session_date,started_at,status,completed_at,created_at,updated_at) VALUES(?,?,?,'2026-10-06',?,'completed',?,?,?)",
      ).run(session, owner, f.strengthPlan, at, at, at, at);
    });
    expect(
      (await f.sources.completeLinkedTask(tasks[1], at)).error,
    ).not.toBeNull();
    f.store.command(f.context, "synthetic.measured_facts", (db) =>
      db
        .prepare(
          "INSERT INTO strength_set_logs(id,user_id,session_id,exercise_id,set_order,repetitions,weight_kg,recorded_at) VALUES(?,?,?,?,1,8,'10.125',?)",
        )
        .run(randomUUID(), owner, session, f.exercise, at),
    );
    for (const [type, id] of [
      ["running_plan_item", f.runningItem],
      ["strength_plan", f.strengthPlan],
    ] as const) {
      const result = f.store.command(f.context, "source.complete", (db) =>
        reconcileCompletedSource(db, owner, type, id, "2026-10-07T10:00:00Z"),
      );
      expect(result?.completed_at).toBe(at);
    }
    const scheduled = await f.sources.schedule({
      sourceType: "meal",
      sourceId: f.meal,
      plannedDate: "2026-10-06",
      scheduledStartAt: at,
      durationMinutes: 30,
    });
    if (!scheduled.data) throw new Error("Fixture failed");
    f.store.command(f.context, "synthetic.failpoint", (db) =>
      db.exec(
        "CREATE TRIGGER test_task_failure BEFORE UPDATE OF status ON tasks WHEN NEW.id='" +
          scheduled.data!.id +
          "' AND NEW.status='done' BEGIN SELECT RAISE(ABORT,'TEST_TASK_FAILURE'); END;",
      ),
    );
    expect(
      (await f.sources.completeLinkedMeal(f.meal, at)).error,
    ).not.toBeNull();
    expect(
      f.store.read(f.context, (db) =>
        db
          .prepare("SELECT completed_at FROM meals WHERE user_id=? AND id=?")
          .get(owner, f.meal),
      ),
    ).toEqual({ completed_at: null });
    f.store.command(f.context, "synthetic.failpoint", (db) =>
      db.exec("DROP TRIGGER test_task_failure"),
    );
    expect((await f.sources.completeLinkedMeal(f.meal, at)).error).toBeNull();
    expect(
      (await f.sources.completeLinkedMeal(f.meal, "2026-10-07T10:00:00Z")).data
        ?.completed_at,
    ).toBe(at);
    expect(
      (
        await f.sources.schedule({
          sourceType: "meal",
          sourceId: f.meal,
          plannedDate: "2026-10-08",
          scheduledStartAt: "2026-10-08T10:00:00Z",
          durationMinutes: 45,
        })
      ).data,
    ).toMatchObject({
      id: scheduled.data.id,
      status: "done",
      completed_at: at,
    });
    expect(
      (await f.sources.completeLinkedTask(tasks[0], "2026-10-07T12:00:00Z"))
        .data?.completed_at,
    ).toBe(at);
  } finally {
    f.store.close();
  }
});

it("denies issued foreign and forged source contexts and raw foreign source tuples", async () => {
  const f = sourceReviewFixture(),
    foreign = randomUUID(),
    meal = randomUUID(),
    raw = new Database(f.path);
  let current = foreign;
  configureConnection(raw);
  raw.function("life_owner", () => current);
  raw.function("life_command", () => "source.schedule");
  try {
    raw
      .prepare("INSERT INTO profiles(id,created_at,updated_at) VALUES(?,?,?)")
      .run(foreign, at, at);
    raw
      .prepare(
        "INSERT INTO meals(id,user_id,date,meal_type,title,created_at,updated_at) VALUES(?,?,'2026-10-06','lunch','Foreign meal',?,?)",
      )
      .run(meal, foreign, at, at);
    const review = randomUUID(),
      plan = randomUUID(),
      item = randomUUID(),
      strength = randomUUID();
    raw
      .prepare(
        "INSERT INTO review_records(id,user_id,kind,period_start,period_end,timezone,created_at,updated_at) VALUES(?,?,'daily','2026-10-06','2026-10-06','Europe/Berlin',?,?)",
      )
      .run(review, foreign, at, at);
    raw
      .prepare(
        "INSERT INTO running_plans(id,user_id,name,goal,created_at,updated_at) VALUES(?,?,'Foreign Plan','Goal',?,?)",
      )
      .run(plan, foreign, at, at);
    raw
      .prepare(
        "INSERT INTO running_plan_items(id,user_id,plan_id,title,sort_order,created_at,updated_at) VALUES(?,?,?,'Foreign Run',0,?,?)",
      )
      .run(item, foreign, plan, at, at);
    raw
      .prepare(
        "INSERT INTO strength_plans(id,user_id,name,goal,created_at,updated_at) VALUES(?,?,'Foreign Strength','Goal',?,?)",
      )
      .run(strength, foreign, at, at);
    const task = await f.tasks.createTask({ ...scope, title: "Owned Task" });
    if (!task.ok) throw new Error("Fixture failed");
    current = owner;
    for (const [sourceType, sourceId] of [
      ["meal", meal],
      ["review", review],
      ["running_plan_item", item],
      ["strength_plan", strength],
    ] as const) {
      expect(
        (
          await f.sources.schedule({
            sourceType,
            sourceId,
            plannedDate: "2026-10-06",
            scheduledStartAt: at,
            durationMinutes: 30,
          })
        ).error,
      ).not.toBeNull();
      expect(() =>
        raw
          .prepare(
            "INSERT INTO schedule_source_links(id,user_id,source_type,source_id,task_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?)",
          )
          .run(randomUUID(), owner, sourceType, sourceId, task.data.id, at, at),
      ).toThrow("SOURCE_OWNER_OR_ACTIVE_DENIED");
    }
    expect(
      f.store.read(f.context, (db) =>
        db
          .prepare(
            "SELECT count(*) n FROM schedule_source_links WHERE user_id=?",
          )
          .get(owner),
      ),
    ).toEqual({ n: BigInt(0) });
    expect(() =>
      createSqliteScheduleSourceRepository(f.store, {
        ownerId: owner,
      } as OwnerContext),
    ).toThrow("OWNER_CONTEXT_REQUIRED");
    expect(
      (
        await createSqliteScheduleSourceRepository(
          f.store,
          issueOwnerContext(foreign),
        ).getLinks(foreign)
      ).error,
    ).not.toBeNull();
  } finally {
    raw.close();
    f.store.close();
  }
});

it("rolls first source scheduling back after Task/link creation and rejects raw link identity/cardinality bypass", async () => {
  const f = sourceReviewFixture();
  try {
    f.store.command(f.context, "synthetic.failpoint", (db) =>
      db.exec(
        `CREATE TRIGGER test_source_failure BEFORE UPDATE OF date ON meals WHEN NEW.id='${f.meal}' BEGIN SELECT RAISE(ABORT,'TEST_SOURCE_FAILURE'); END;`,
      ),
    );
    const input = {
      sourceType: "meal" as const,
      sourceId: f.meal,
      plannedDate: "2026-10-06",
      scheduledStartAt: at,
      durationMinutes: 30,
    };
    expect((await f.sources.schedule(input)).error).not.toBeNull();
    expect(
      f.store.read(f.context, (db) =>
        db
          .prepare(
            "SELECT (SELECT count(*) FROM tasks) tasks,(SELECT count(*) FROM schedule_source_links) links",
          )
          .get(),
      ),
    ).toEqual({ tasks: BigInt(0), links: BigInt(0) });
    f.store.command(f.context, "synthetic.failpoint", (db) =>
      db.exec("DROP TRIGGER test_source_failure"),
    );
    const scheduled = await f.sources.schedule(input);
    if (!scheduled.data) throw new Error("Fixture failed");
    const link = f.store.read(f.context, (db) =>
      db
        .prepare(
          "SELECT * FROM schedule_source_links WHERE user_id=? AND source_id=?",
        )
        .get(owner, f.meal),
    ) as { id: string };
    expect(() =>
      f.store.command(f.context, "source.schedule", (db) =>
        db
          .prepare(
            "UPDATE schedule_source_links SET task_id=? WHERE user_id=? AND id=?",
          )
          .run(randomUUID(), owner, link.id),
      ),
    ).toThrow("SOURCE_LINK_IMMUTABLE");
    expect(() =>
      f.store.command(f.context, "task.raw", (db) =>
        db
          .prepare("DELETE FROM schedule_source_links WHERE user_id=? AND id=?")
          .run(owner, link.id),
      ),
    ).toThrow("SOURCE_COMMAND_REQUIRED");
    expect(() =>
      f.store.command(f.context, "task.raw", (db) =>
        db
          .prepare(
            "INSERT INTO schedule_source_links(id,user_id,source_type,source_id,task_id,created_at,updated_at) VALUES(?,?,'meal',?,?,?,?)",
          )
          .run(randomUUID(), owner, f.meal, scheduled.data!.id, at, at),
      ),
    ).toThrow("SOURCE_COMMAND_REQUIRED");
    expect(() =>
      f.store.command(f.context, "source.schedule", (db) =>
        db
          .prepare(
            "INSERT INTO schedule_source_links(id,user_id,source_type,source_id,task_id,created_at,updated_at) VALUES(?,?,'meal',?,?,?,?)",
          )
          .run(randomUUID(), owner, f.meal, scheduled.data!.id, at, at),
      ),
    ).toThrow(/UNIQUE/);
    expect(
      f.store.read(f.context, (db) =>
        db
          .prepare(
            "SELECT id FROM schedule_source_links WHERE user_id=? AND source_id=?",
          )
          .get(owner, f.meal),
      ),
    ).toEqual({ id: link.id });
  } finally {
    f.store.close();
  }
});

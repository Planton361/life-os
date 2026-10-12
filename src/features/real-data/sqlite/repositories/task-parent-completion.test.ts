import { randomUUID } from "node:crypto";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  sourceReviewFixture,
  scope,
  owner,
  at,
  daily,
} from "../../../../../tests/sqlite/source-review-fixture";
import {
  nutritionTrainingFixture,
  runningInput,
  result,
} from "../../../../../tests/sqlite/nutrition-training-fixture";
import { SqliteRuntime } from "../runtime";
import { createSqliteTaskRepository } from "./task-repository";
import {
  sourceTaskCommands,
  scheduleLinkedSource,
} from "../commands/source-commands";
import { assertTaskCompletionParent } from "../task-completion-parent";

for (const archive of ["archived_at", "status"] as const) {
  for (const write of ["complete", "update", "detach", "move"] as const) {
    it(`rejects ${write} with persisted Parent ${archive}, preserving the entire transaction after reopen`, async () => {
      const f = sourceReviewFixture();
      let taskId = "";
      try {
        const task = await f.tasks.createTask({
          ...scope,
          title: `#151 ${randomUUID()}`,
          status: "planned",
          projectId: f.project,
        });
        if (!task.ok) throw new Error(task.error.message);
        taskId = task.data.id;
        f.store.command(f.context, "synthetic.initialize", (db) => {
          db.prepare(
            `UPDATE projects SET ${archive}=? WHERE user_id=? AND id=?`,
          ).run(archive === "status" ? "archived" : at, owner, f.project);
        });
        const snapshot = () =>
          f.store.read(f.context, (db) => ({
            task: db
              .prepare("SELECT * FROM tasks WHERE user_id=? AND id=?")
              .get(owner, taskId),
            project: db
              .prepare("SELECT * FROM projects WHERE user_id=? AND id=?")
              .get(owner, f.project),
            revision: db
              .prepare("SELECT data_revision FROM runtime_metadata")
              .get(),
          }));
        const before = snapshot();
        const result =
          write === "complete"
            ? await f.tasks.completeTask({ ...scope, taskId, completedAt: at })
            : await f.tasks.updateTask({
                ...scope,
                taskId,
                status: "done",
                title: "Must roll back",
                ...(write === "detach"
                  ? { projectId: null }
                  : write === "move"
                    ? { projectId: randomUUID() }
                    : {}),
              });
        expect(result).toMatchObject({
          ok: false,
          error: { message: "TASK_PROJECT_ARCHIVED" },
        });
        expect(snapshot()).toEqual(before);
      } finally {
        f.store.close();
      }
      const reopened = new SqliteRuntime(f.path, { syntheticProof: true });
      try {
        const tasks = await createSqliteTaskRepository(
          reopened,
          f.context,
          sourceTaskCommands,
        ).getPortfolioTasks(owner, owner);
        expect(
          tasks.ok && tasks.data.find((t) => t.id === taskId),
        ).toMatchObject({
          status: "planned",
          completedAt: null,
          projectId: f.project,
        });
      } finally {
        reopened.close();
      }
    });
  }
}

it("continues completing standalone and nonarchived Project Tasks, preserving scope denial", async () => {
  const f = sourceReviewFixture();
  try {
    for (const projectId of [undefined, f.project]) {
      const task = await f.tasks.createTask({
        ...scope,
        title: `#151 positive ${randomUUID()}`,
        status: "planned",
        projectId,
      });
      if (!task.ok) throw new Error(task.error.message);
      expect(
        (
          await f.tasks.completeTask({
            ...scope,
            taskId: task.data.id,
            userId: randomUUID(),
            completedAt: at,
          })
        ).ok,
      ).toBe(false);
      expect(
        (
          await f.tasks.completeTask({
            ...scope,
            taskId: task.data.id,
            completedAt: at,
          })
        ).ok,
      ).toBe(true);
      expect(
        (await f.tasks.reopenTask({ ...scope, taskId: task.data.id })).ok,
      ).toBe(true);
      expect(
        (
          await f.tasks.updateTask({
            ...scope,
            taskId: task.data.id,
            status: "done",
          })
        ).ok,
      ).toBe(true);
    }
  } finally {
    f.store.close();
  }
});

for (const archive of ["archived_at", "status"] as const) {
  for (const kind of [
    "meal",
    "review",
    "running_plan_item",
    "strength_plan",
  ] as const) {
    it(`rolls ${kind} domain history and Task back atomically for Parent ${archive}`, async () => {
      const f = nutritionTrainingFixture();
      try {
        const review =
          kind === "review" ? result(await f.reviews.saveReview(daily)) : null;
        const sourceId =
          kind === "meal"
            ? f.meal
            : kind === "review"
              ? review!.id
              : kind === "running_plan_item"
                ? f.runningItem
                : f.strengthPlan;
        const linked = await f.sources.schedule({
          sourceType: kind,
          sourceId,
          plannedDate: "2026-10-06",
          scheduledStartAt: at,
          durationMinutes: 30,
        });
        if (!linked.data) throw new Error(linked.error?.message);
        result(
          await f.tasks.updateTask({
            ...scope,
            taskId: linked.data.id,
            projectId: f.project,
          }),
        );
        const session =
          kind === "strength_plan"
            ? result(
                await f.training.startStrengthSession(owner, {
                  planId: f.strengthPlan,
                  sessionDate: "2026-10-06",
                  notes: "#151",
                }),
              )
            : null;
        if (session)
          result(
            await f.training.addStrengthSet(owner, {
              sessionId: session.id,
              exerciseId: f.exercise,
              setOrder: 1,
              repetitions: 8,
              weightKg: 20,
              notes: null,
            }),
          );
        const complete = async () =>
          kind === "meal"
            ? (
                await f.nutrition.completeMeal({
                  ...scope,
                  mealId: f.meal,
                  completedAt: at,
                })
              ).ok
            : kind === "review"
              ? (await f.reviews.saveReview({ ...daily, status: "completed" }))
                  .ok
              : kind === "running_plan_item"
                ? (
                    await f.training.saveRunningSession(owner, {
                      ...runningInput,
                      planItemId: f.runningItem,
                    })
                  ).ok
                : await f.training.completeStrengthSession(owner, session!.id);
        const capture = () =>
          f.store.read(f.context, (db) =>
            Object.fromEntries(
              [
                "tasks",
                "meals",
                "review_records",
                "review_task_decisions",
                "running_sessions",
                "strength_sessions",
                "strength_set_logs",
                "schedule_source_links",
                "project_lifecycle_events",
                "project_command_receipts",
              ].map((table) => [
                table,
                db
                  .prepare(
                    `SELECT * FROM ${table} WHERE user_id=? ORDER BY rowid`,
                  )
                  .all(owner),
              ]),
            ),
          );
        f.store.command(f.context, "synthetic.initialize", (db) =>
          db
            .prepare(
              `UPDATE projects SET ${archive}=? WHERE user_id=? AND id=?`,
            )
            .run(archive === "status" ? "archived" : at, owner, f.project),
        );
        const before = capture();
        expect(await complete()).toBe(false);
        expect(capture()).toEqual(before);
        // A fresh allowed Parent makes precisely the same real Domain flow work.
        const validParent = randomUUID();
        f.store.command(f.context, "synthetic.initialize", (db) => {
          db.prepare(
            "INSERT INTO projects(id,user_id,title,status,created_at,updated_at) VALUES(?,?,'#151 valid Source Parent','active',?,?)",
          ).run(validParent, owner, at, at);
          db.prepare(
            "UPDATE tasks SET project_id=? WHERE user_id=? AND id=?",
          ).run(validParent, owner, linked.data!.id);
        });
        expect(await complete()).toBe(true);
        expect(
          f.store.read(f.context, (db) =>
            db
              .prepare(
                "SELECT status,completed_at FROM tasks WHERE user_id=? AND id=?",
              )
              .get(owner, linked.data!.id),
          ),
        ).toMatchObject({ status: "done", completed_at: expect.any(String) });
      } finally {
        f.store.close();
      }
    });
  }
}

for (const patch of [
  "status='done'",
  "completed_at='2026-10-06T10:00:00.123456Z'",
  "status='done',project_id=NULL",
] as const) {
  it(`rolls alternative native SQL ${patch} and unrelated writes back at COMMIT`, async () => {
    const f = sourceReviewFixture();
    try {
      const t = result(
        await f.tasks.createTask({
          ...scope,
          title: `#151 raw ${randomUUID()}`,
          projectId: f.project,
        }),
      );
      f.store.command(f.context, "synthetic.initialize", (db) =>
        db
          .prepare(
            "UPDATE projects SET status='archived' WHERE user_id=? AND id=?",
          )
          .run(owner, f.project),
      );
      const revision = f.store.datasetState(f.context);
      expect(() =>
        f.store.command(f.context, "task.update", (db) => {
          db.prepare(
            "UPDATE tasks SET title='Should roll back' WHERE user_id=? AND id=?",
          ).run(owner, t.id);
          db.prepare(`UPDATE tasks SET ${patch} WHERE user_id=? AND id=?`).run(
            owner,
            t.id,
          );
        }),
      ).toThrow("TASK_PROJECT_ARCHIVED");
      expect(f.store.datasetState(f.context)).toEqual(revision);
      expect(
        f.store.read(f.context, (db) =>
          db
            .prepare(
              "SELECT title,status,completed_at,project_id FROM tasks WHERE user_id=? AND id=?",
            )
            .get(owner, t.id),
        ),
      ).toEqual({
        title: t.title,
        status: "planned",
        completed_at: null,
        project_id: f.project,
      });
    } finally {
      f.store.close();
    }
  });
}

it("fails closed for missing/foreign Parent and retains completed historical Tasks when a Project is later archived", async () => {
  const f = sourceReviewFixture();
  try {
    expect(() =>
      f.store.read(f.context, (db) =>
        assertTaskCompletionParent(db, randomUUID(), f.project),
      ),
    ).toThrow("TASK_PROJECT_NOT_FOUND");
    expect(() =>
      f.store.read(f.context, (db) =>
        assertTaskCompletionParent(db, owner, randomUUID()),
      ),
    ).toThrow("TASK_PROJECT_NOT_FOUND");
    const t = result(
      await f.tasks.createTask({
        ...scope,
        title: "#151 completed history",
        projectId: f.project,
      }),
    );
    result(
      await f.tasks.completeTask({ ...scope, taskId: t.id, completedAt: at }),
    );
    f.store.command(f.context, "synthetic.initialize", (db) =>
      db
        .prepare(
          "UPDATE projects SET status='archived' WHERE user_id=? AND id=?",
        )
        .run(owner, f.project),
    );
    expect(
      f.store.read(f.context, (db) =>
        db
          .prepare(
            "SELECT status,completed_at FROM tasks WHERE user_id=? AND id=?",
          )
          .get(owner, t.id),
      ),
    ).toEqual({ status: "done", completed_at: at });
  } finally {
    f.store.close();
  }
});

it("guards completed Source schedule reconciliation under an archived Parent", async () => {
  const f = sourceReviewFixture();
  try {
    const scheduled = await f.sources.schedule({
      sourceType: "meal",
      sourceId: f.meal,
      plannedDate: "2026-10-06",
      scheduledStartAt: at,
      durationMinutes: 30,
    });
    if (!scheduled.data) throw new Error(scheduled.error?.message);
    result(
      await f.tasks.updateTask({
        ...scope,
        taskId: scheduled.data.id,
        projectId: f.project,
      }),
    );
    // Disposable legacy fixture: source fact exists but Task is still planned.
    f.store.command(f.context, "source.complete", (db) => {
      db.prepare(
        "UPDATE meals SET completed_at=? WHERE user_id=? AND id=?",
      ).run(at, owner, f.meal);
    });
    f.store.command(f.context, "synthetic.initialize", (db) => {
      db.prepare(
        "UPDATE projects SET status='archived' WHERE user_id=? AND id=?",
      ).run(owner, f.project);
    });
    const revision = f.store.datasetState(f.context);
    expect(() =>
      f.store.command(f.context, "source.schedule", (db) =>
        scheduleLinkedSource(db, owner, "meal", f.meal, "2026-10-07", at, 60),
      ),
    ).toThrow("TASK_PROJECT_ARCHIVED");
    const denied = await f.sources.schedule({
      sourceType: "meal",
      sourceId: f.meal,
      plannedDate: "2026-10-07",
      scheduledStartAt: at,
      durationMinutes: 60,
    });
    expect(denied.data).toBeNull();
    expect(denied.error).not.toBeNull();
    expect(f.store.datasetState(f.context)).toEqual(revision);
    expect(
      f.store.read(f.context, (db) =>
        db
          .prepare(
            "SELECT status,completed_at,planned_date,duration_minutes FROM tasks WHERE user_id=? AND id=?",
          )
          .get(owner, scheduled.data!.id),
      ),
    ).toEqual({
      status: "planned",
      completed_at: null,
      planned_date: "2026-10-06",
      duration_minutes: BigInt(30),
    });
  } finally {
    f.store.close();
  }
});

it("adds no Parent-completion restriction for paused, blocked or completed Projects", () => {
  const f = sourceReviewFixture();
  try {
    for (const status of ["paused", "blocked", "completed"]) {
      const id = randomUUID();
      f.store.command(f.context, "synthetic.initialize", (db) =>
        db
          .prepare(
            "INSERT INTO projects(id,user_id,title,status,created_at,updated_at) VALUES(?,?,'#151 existing lifecycle',?,?,?)",
          )
          .run(id, owner, status, at, at),
      );
      expect(() =>
        f.store.read(f.context, (db) =>
          assertTaskCompletionParent(db, owner, id),
        ),
      ).not.toThrow();
    }
  } finally {
    f.store.close();
  }
});

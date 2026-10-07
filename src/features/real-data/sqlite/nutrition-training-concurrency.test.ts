import { fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  owner,
  scope,
  at,
} from "../../../../tests/sqlite/source-review-fixture";
import { compileRuntime } from "../../../../tests/sqlite/compile-runtime.mjs";
import {
  nutritionTrainingFixture,
  result,
  runningInput,
  exerciseInput,
} from "../../../../tests/sqlite/nutrition-training-fixture";
const compiled = compileRuntime();
type Reply = { ready?: boolean; held?: boolean; ok?: boolean; error?: string };
async function worker(path: string) {
  const child = fork(
    "tests/sqlite/nutrition-training-race-worker.mjs",
    [compiled, path, owner],
    { stdio: ["ignore", "ignore", "pipe", "ipc"] },
  );
  const queue: Reply[] = [],
    waiting: ((r: Reply) => void)[] = [];
  let stderr = "",
    exited = false;
  child.stderr?.on("data", (chunk) => {
    stderr += chunk;
  });
  child.on("message", (message) => {
    const waiter = waiting.shift();
    if (waiter) waiter(message as Reply);
    else queue.push(message as Reply);
  });
  const next = () =>
    queue.length
      ? Promise.resolve(queue.shift()!)
      : new Promise<Reply>((resolve, reject) => {
          if (exited) reject(new Error(stderr));
          else {
            waiting.push(resolve);
            child.once("exit", () => {
              if (waiting.includes(resolve))
                reject(new Error(stderr || "Worker exited without response"));
            });
          }
        });
  const exit = new Promise<void>((resolve) =>
    child.once("exit", () => {
      exited = true;
      resolve();
    }),
  );
  expect(await next()).toEqual({ ready: true });
  return { child, next, exit, pending: () => queue.length };
}

async function race(path: string, first: object, second: object) {
  const a = await worker(path),
    b = await worker(path);
  try {
    a.child.send({ ...first, hold: true });
    expect(await a.next()).toEqual({ held: true });
    b.child.send(second);
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(b.pending()).toBe(0);
    a.child.send("commit");
    const replies = await Promise.all([a.next(), b.next()]);
    await Promise.all([a.exit, b.exit]);
    return replies;
  } finally {
    for (const w of [a, b])
      if (w.child.exitCode === null && w.child.signalCode === null)
        w.child.kill("SIGKILL");
    await Promise.all([a.exit, b.exit]);
  }
}

it("serializes competing planner assignments into one canonical occupied slot", async () => {
  const f = nutritionTrainingFixture();
  try {
    const recipe = result(
      await f.nutrition.createRecipe({ ...scope, title: "Plan", tags: [] }),
    );
    const a = randomUUID(),
      b = randomUUID();
    const assignment = (id: string) => ({
      operation: "planner",
      input: [
        {
          kind: "assign",
          id,
          recipeId: recipe.id,
          date: "2026-10-07",
          mealType: "lunch",
        },
      ],
    });
    expect(await race(f.path, assignment(a), assignment(b))).toEqual([
      { ok: true },
      { ok: false, error: "OCCUPIED_SLOT" },
    ]);
    expect(
      f.store.read(f.context, (db) =>
        db
          .prepare(
            "SELECT id,recipe_id,servings FROM meals WHERE date='2026-10-07' AND meal_type='lunch'",
          )
          .all(),
      ),
    ).toEqual([{ id: a, recipe_id: recipe.id, servings: "1" }]);
  } finally {
    f.store.close();
  }
}, 15000);
it("rejects stale planner move after another process changes the Meal without partial Task timing", async () => {
  const f = nutritionTrainingFixture();
  try {
    const task = await f.sources.schedule({
      sourceType: "meal",
      sourceId: f.meal,
      plannedDate: "2026-10-06",
      scheduledStartAt: at,
      durationMinutes: 30,
    });
    if (!task.data) throw new Error("Fixture");
    const meal = f.store.read(f.context, (db) =>
      db.prepare("SELECT updated_at FROM meals WHERE id=?").get(f.meal),
    ) as { updated_at: string };
    const move = (date: string) => ({
      operation: "planner",
      input: [
        {
          kind: "move",
          id: f.meal,
          date,
          mealType: "lunch",
          expectedUpdatedAt: meal.updated_at,
        },
      ],
    });
    expect(await race(f.path, move("2026-10-07"), move("2026-10-08"))).toEqual([
      { ok: true },
      { ok: false, error: "STALE_MEAL" },
    ]);
    expect(
      f.store.read(f.context, (db) =>
        db
          .prepare(
            "SELECT m.date,m.planned_at,t.planned_date,t.scheduled_start_at FROM meals m JOIN schedule_source_links l ON l.source_id=m.id AND l.user_id=m.user_id JOIN tasks t ON t.id=l.task_id AND t.user_id=l.user_id WHERE m.id=?",
          )
          .get(f.meal),
      ),
    ).toEqual({
      date: "2026-10-07",
      planned_at: "2026-10-07T10:00:00.123456Z",
      planned_date: "2026-10-07",
      scheduled_start_at: "2026-10-07T10:00:00.123456Z",
    });
  } finally {
    f.store.close();
  }
}, 15000);
for (const first of ["remove", "complete", "schedule"] as const)
  it(`serializes planner removal vs ${first} with no orphan source link`, async () => {
    const f = nutritionTrainingFixture();
    try {
      const scheduled = await f.sources.schedule({
        sourceType: "meal",
        sourceId: f.meal,
        plannedDate: "2026-10-06",
        scheduledStartAt: at,
        durationMinutes: 30,
      });
      if (!scheduled.data) throw new Error("Fixture");
      const meal = f.store.read(f.context, (db) =>
        db.prepare("SELECT updated_at FROM meals WHERE id=?").get(f.meal),
      ) as { updated_at: string };
      const remove = {
          operation: "planner",
          input: [
            { kind: "remove", id: f.meal, expectedUpdatedAt: meal.updated_at },
          ],
        },
        complete = {
          operation: "complete",
          input: { taskId: scheduled.data.id, completedAt: at },
        },
        schedule = {
          operation: "schedule",
          input: {
            sourceType: "meal",
            sourceId: f.meal,
            plannedDate: "2026-10-07",
            scheduledStartAt: "2026-10-07T10:00:00.123456Z",
            durationMinutes: 30,
          },
        };
      const replies = await race(
        f.path,
        first === "remove"
          ? remove
          : first === "complete"
            ? complete
            : schedule,
        first === "remove" ? complete : remove,
      );
      expect(replies[0]).toEqual({ ok: true });
      expect(replies[1].ok).toBe(false);
      const state = f.store.read(f.context, (db) => ({
        meal: db
          .prepare("SELECT date,completed_at FROM meals WHERE id=?")
          .get(f.meal),
        task: db
          .prepare(
            "SELECT status,completed_at,planned_date FROM tasks WHERE id=?",
          )
          .get(scheduled.data!.id),
        links: db
          .prepare("SELECT * FROM schedule_source_links WHERE source_id=?")
          .all(f.meal),
      }));
      if (first === "remove") {
        expect(state.meal).toBeUndefined();
        expect(state.links).toHaveLength(0);
        expect(state.task).toMatchObject({
          status: "archived",
          completed_at: null,
        });
      } else {
        expect(state.links).toHaveLength(1);
        expect(state.meal).toMatchObject({
          date: first === "complete" ? "2026-10-06" : "2026-10-07",
          completed_at: first === "complete" ? at : null,
        });
        expect(state.task).toMatchObject({
          status: first === "complete" ? "done" : "planned",
          completed_at: first === "complete" ? at : null,
        });
      }
    } finally {
      f.store.close();
    }
  }, 15000);
for (const kind of ["running_plan_item", "strength_plan"] as const)
  for (const first of ["complete", "reopen"] as const)
    it(`${kind} ${first} vs predecessor mutation preserves atomic genuine session facts`, async () => {
      const f = nutritionTrainingFixture();
      try {
        const task = await f.sources.schedule({
          sourceType: kind,
          sourceId:
            kind === "running_plan_item" ? f.runningItem : f.strengthPlan,
          plannedDate: "2026-10-06",
          scheduledStartAt: at,
          durationMinutes: 30,
        });
        if (!task.data) throw new Error("Fixture");
        const predecessor = result(
          await f.tasks.createTask({
            ...scope,
            title: "Predecessor",
            projectId: f.project,
          }),
        );
        result(
          await f.tasks.updateTask({
            ...scope,
            taskId: task.data.id,
            projectId: f.project,
          }),
        );
        result(
          await f.tasks.completeTask({
            ...scope,
            taskId: predecessor.id,
            completedAt: at,
          }),
        );
        f.store.command(f.context, "dependency.add", (db) =>
          db
            .prepare(
              "INSERT INTO task_dependencies(id,user_id,project_id,predecessor_task_id,successor_task_id,created_at) VALUES(?,?,?,?,?,?)",
            )
            .run(
              randomUUID(),
              owner,
              f.project,
              predecessor.id,
              task.data!.id,
              at,
            ),
        );
        const session =
          kind === "strength_plan"
            ? result(
                await f.training.startStrengthSession(owner, {
                  planId: f.strengthPlan,
                  sessionDate: "2026-10-06",
                  notes: null,
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
        const complete =
          kind === "running_plan_item"
            ? {
                operation: "running",
                kind: "running.session",
                input: { ...runningInput, planItemId: f.runningItem },
              }
            : {
                operation: "strength",
                kind: "strength.complete",
                input: { id: session!.id },
              };
        const reopen = {
          operation: "reopen",
          input: { taskId: predecessor.id },
        };
        expect(
          await race(
            f.path,
            first === "complete" ? complete : reopen,
            first === "complete" ? reopen : complete,
          ),
        ).toEqual(
          first === "complete"
            ? [{ ok: true }, { ok: true }]
            : [{ ok: true }, { ok: false, error: "DEPENDENCY_BLOCKED" }],
        );
        const snapshot = result(await f.training.getSnapshot(owner));
        if (kind === "running_plan_item")
          expect(snapshot.runningSessions).toHaveLength(
            first === "complete" ? 1 : 0,
          );
        else
          expect(snapshot.strengthSessions[0].status).toBe(
            first === "complete" ? "completed" : "in_progress",
          );
        expect(
          f.store.read(f.context, (db) =>
            db
              .prepare("SELECT status,completed_at FROM tasks WHERE id=?")
              .get(task.data!.id),
          ),
        ).toMatchObject({
          status: first === "complete" ? "done" : "planned",
          completed_at: first === "complete" ? expect.any(String) : null,
        });
      } finally {
        f.store.close();
      }
    }, 15000);
it("serializes repeated Strength completion idempotently into one stable completion fact", async () => {
  const f = nutritionTrainingFixture();
  try {
    await f.sources.schedule({
      sourceType: "strength_plan",
      sourceId: f.strengthPlan,
      plannedDate: "2026-10-06",
      scheduledStartAt: at,
      durationMinutes: 30,
    });
    const session = result(
      await f.training.startStrengthSession(owner, {
        planId: f.strengthPlan,
        sessionDate: "2026-10-06",
        notes: null,
      }),
    );
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
    const complete = {
      operation: "strength",
      kind: "strength.complete",
      input: { id: session.id },
    };
    expect(await race(f.path, complete, complete)).toEqual([
      { ok: true },
      { ok: true },
    ]);
    expect(
      f.store.read(f.context, (db) =>
        db
          .prepare(
            "SELECT s.status,s.completed_at,t.completed_at task_at FROM strength_sessions s JOIN schedule_source_links l ON l.user_id=s.user_id AND l.source_id=s.plan_id JOIN tasks t ON t.user_id=l.user_id AND t.id=l.task_id WHERE s.id=?",
          )
          .get(session.id),
      ),
    ).toEqual({
      status: "completed",
      completed_at: expect.any(String),
      task_at: expect.any(String),
    });
    const snapshot = result(await f.training.getSnapshot(owner));
    expect(snapshot.strengthSessions).toHaveLength(1);
    expect(snapshot.strengthSetLogs).toHaveLength(1);
  } finally {
    f.store.close();
  }
}, 15000);
it("serializes concurrent edits to one Running session without changing its first completion timestamp", async () => {
  const f = nutritionTrainingFixture();
  try {
    await f.sources.schedule({
      sourceType: "running_plan_item",
      sourceId: f.runningItem,
      plannedDate: "2026-10-06",
      scheduledStartAt: at,
      durationMinutes: 30,
    });
    const session = result(
      await f.training.saveRunningSession(owner, {
        ...runningInput,
        planItemId: f.runningItem,
      }),
    );
    const edit = (distanceKm: number) => ({
      operation: "running",
      kind: "running.session",
      input: {
        ...runningInput,
        planItemId: f.runningItem,
        sessionId: session.id,
        distanceKm,
      },
    });
    expect(await race(f.path, edit(6.125), edit(7.25))).toEqual([
      { ok: true },
      { ok: true },
    ]);
    expect(
      result(await f.training.getSnapshot(owner)).runningSessions,
    ).toHaveLength(1);
    expect(
      f.store.read(f.context, (db) =>
        db
          .prepare(
            "SELECT s.distance_km,s.completed_at,t.completed_at task_at FROM running_sessions s JOIN schedule_source_links l ON l.user_id=s.user_id AND l.source_id=s.plan_item_id JOIN tasks t ON t.user_id=l.user_id AND t.id=l.task_id WHERE s.id=?",
          )
          .get(session.id),
      ),
    ).toEqual({
      distance_km: "7.25",
      completed_at: session.completedAt,
      task_at: session.completedAt,
    });
  } finally {
    f.store.close();
  }
}, 15000);
it("serializes Exercise definition plus complete muscle replacement with no mixed mapping", async () => {
  const f = nutritionTrainingFixture();
  try {
    const exercise = result(
      await f.training.saveExercise(owner, exerciseInput),
    );
    const edit = (name: string, muscles: string[]) => ({
      operation: "exercise",
      kind: "exercise.save",
      input: { ...exerciseInput, exerciseId: exercise.id, name, muscles },
    });
    expect(
      await race(
        f.path,
        edit("A", ["Back", "Biceps"]),
        edit("B", ["Quadriceps", "Calves"]),
      ),
    ).toEqual([{ ok: true }, { ok: true }]);
    expect(
      result(await f.training.getSnapshot(owner)).exercises.find(
        (e) => e.id === exercise.id,
      ),
    ).toMatchObject({
      name: "B",
      muscles: expect.arrayContaining(["Quadriceps", "Calves"]),
    });
    expect(
      f.store.read(f.context, (db) =>
        db
          .prepare(
            "SELECT muscle_group FROM exercise_muscles WHERE exercise_id=? ORDER BY muscle_group",
          )
          .all(exercise.id),
      ),
    ).toEqual([{ muscle_group: "Calves" }, { muscle_group: "Quadriceps" }]);
  } finally {
    f.store.close();
  }
}, 15000);

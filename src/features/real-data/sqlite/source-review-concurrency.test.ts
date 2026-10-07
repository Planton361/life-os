import { fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  sourceReviewFixture,
  owner,
  scope,
  at,
  daily,
} from "../../../../tests/sqlite/source-review-fixture";
import { compileRuntime } from "../../../../tests/sqlite/compile-runtime.mjs";
const compiled = compileRuntime();
type Reply = { ready?: boolean; held?: boolean; ok?: boolean; error?: string };
async function worker(path: string) {
  const child = fork(
    "tests/sqlite/source-review-race-worker.mjs",
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

it("serializes same-source scheduling into one stable Task/link and canonical final Meal timing", async () => {
  const f = sourceReviewFixture();
  try {
    const input = {
      sourceType: "meal",
      sourceId: f.meal,
      plannedDate: "2026-10-06",
      scheduledStartAt: at,
      durationMinutes: 30,
    };
    expect(
      await race(
        f.path,
        { operation: "schedule", input },
        {
          operation: "schedule",
          input: {
            ...input,
            plannedDate: "2026-10-08",
            scheduledStartAt: "2026-10-08T12:00:00.000000Z",
            durationMinutes: 45,
          },
        },
      ),
    ).toEqual([{ ok: true }, { ok: true }]);
    const state = f.store.read(f.context, (db) =>
      db
        .prepare(
          "SELECT l.source_id,l.task_id,t.id,t.planned_date,t.scheduled_start_at,t.duration_minutes,m.date,m.planned_at FROM schedule_source_links l JOIN tasks t ON t.user_id=l.user_id AND t.id=l.task_id JOIN meals m ON m.user_id=l.user_id AND m.id=l.source_id WHERE l.user_id=?",
        )
        .all(owner),
    );
    expect(state).toHaveLength(1);
    expect(state[0]).toMatchObject({
      source_id: f.meal,
      planned_date: "2026-10-08",
      scheduled_start_at: "2026-10-08T12:00:00.000000Z",
      date: "2026-10-08",
      planned_at: "2026-10-08T12:00:00.000000Z",
      duration_minutes: BigInt(45),
    });
    expect(
      f.store.read(f.context, (db) =>
        db.prepare("SELECT count(*) n FROM tasks WHERE user_id=?").get(owner),
      ),
    ).toEqual({ n: BigInt(1) });
  } finally {
    f.store.close();
  }
}, 15000);

it("serializes source completion against generic mutation with coupled immutable completion", async () => {
  const f = sourceReviewFixture();
  try {
    const result = await f.sources.schedule({
      sourceType: "meal",
      sourceId: f.meal,
      plannedDate: "2026-10-06",
      scheduledStartAt: at,
      durationMinutes: 30,
    });
    if (!result.data) throw new Error("Fixture failed");
    expect(
      await race(
        f.path,
        {
          operation: "complete",
          input: { taskId: result.data.id, completedAt: at },
        },
        { operation: "raw", input: { taskId: result.data.id } },
      ),
    ).toEqual([{ ok: true }, { ok: false, error: "SOURCE_COMMAND_REQUIRED" }]);
    expect(
      f.store.read(f.context, (db) =>
        db
          .prepare(
            "SELECT t.status,t.completed_at,m.completed_at meal_completed_at FROM tasks t JOIN schedule_source_links l ON l.user_id=t.user_id AND l.task_id=t.id JOIN meals m ON m.user_id=l.user_id AND m.id=l.source_id WHERE t.user_id=? AND t.id=?",
          )
          .get(owner, result.data!.id),
      ),
    ).toEqual({ status: "done", completed_at: at, meal_completed_at: at });
  } finally {
    f.store.close();
  }
}, 15000);

for (const first of ["complete", "reopen"] as const)
  it(`serializes ${first} versus dependency reopen/completion and retains canonical final history`, async () => {
    const f = sourceReviewFixture();
    try {
      const result = await f.sources.schedule({
        sourceType: "meal",
        sourceId: f.meal,
        plannedDate: "2026-10-06",
        scheduledStartAt: at,
        durationMinutes: 30,
      });
      if (!result.data) throw new Error("Fixture failed");
      const taskId = result.data.id;
      const predecessor = await f.tasks.createTask({
        ...scope,
        title: "Predecessor",
        projectId: f.project,
      });
      if (!predecessor.ok) throw new Error("Fixture failed");
      expect(
        (await f.tasks.updateTask({ ...scope, taskId, projectId: f.project }))
          .ok,
      ).toBe(true);
      expect(
        (
          await f.tasks.completeTask({
            ...scope,
            taskId: predecessor.data.id,
            completedAt: at,
          })
        ).ok,
      ).toBe(true);
      f.store.command(f.context, "dependency.add", (db) =>
        db
          .prepare(
            "INSERT INTO task_dependencies(id,user_id,project_id,predecessor_task_id,successor_task_id,created_at) VALUES(?,?,?,?,?,?)",
          )
          .run(randomUUID(), owner, f.project, predecessor.data.id, taskId, at),
      );
      const complete = {
          operation: "complete",
          input: { taskId, completedAt: at },
        },
        reopen = {
          operation: "reopen",
          input: { taskId: predecessor.data.id },
        };
      const replies = await race(
        f.path,
        first === "complete" ? complete : reopen,
        first === "complete" ? reopen : complete,
      );
      expect(replies).toEqual(
        first === "complete"
          ? [{ ok: true }, { ok: true }]
          : [{ ok: true }, { ok: false, error: "DEPENDENCY_BLOCKED" }],
      );
      expect(
        f.store.read(f.context, (db) =>
          db
            .prepare(
              "SELECT status,completed_at FROM tasks WHERE user_id=? AND id=?",
            )
            .get(owner, predecessor.data.id),
        ),
      ).toEqual({ status: "planned", completed_at: null });
      expect(
        f.store.read(f.context, (db) =>
          db
            .prepare(
              "SELECT status,completed_at FROM tasks WHERE user_id=? AND id=?",
            )
            .get(owner, taskId),
        ),
      ).toEqual({
        status: first === "complete" ? "done" : "planned",
        completed_at: first === "complete" ? at : null,
      });
      expect(
        f.store.read(f.context, (db) =>
          db
            .prepare("SELECT completed_at FROM meals WHERE user_id=? AND id=?")
            .get(owner, f.meal),
        ),
      ).toEqual({ completed_at: first === "complete" ? at : null });
    } finally {
      f.store.close();
    }
  }, 15000);

it("serializes competing Primary promotion with one Primary and complete loser demotion", async () => {
  const f = sourceReviewFixture();
  try {
    const a = await f.resources.createResource({
        ...scope,
        title: "Primary A",
        type: "research",
      }),
      b = await f.resources.createResource({
        ...scope,
        title: "Primary B",
        type: "research",
      });
    if (!a.ok || !b.ok) throw new Error("Fixture failed");
    const request = (id: string) => ({
      operation: "primary",
      input: { projectId: f.project, resourceId: id, role: "primary_artifact" },
    });
    expect(await race(f.path, request(a.data.id), request(b.data.id))).toEqual([
      { ok: true },
      { ok: true },
    ]);
    const rows = f.store.read(f.context, (db) =>
      db
        .prepare(
          "SELECT resource_id,project_role FROM resource_relations WHERE user_id=? AND target_type='project' AND target_id=? ORDER BY project_role",
        )
        .all(owner, f.project),
    );
    expect(rows).toEqual([
      { resource_id: a.data.id, project_role: "additional_artifact" },
      { resource_id: b.data.id, project_role: "primary_artifact" },
    ]);
  } finally {
    f.store.close();
  }
}, 15000);

it("serializes overlapping Daily saves without lost original snapshots or duplicate decisions", async () => {
  const f = sourceReviewFixture();
  try {
    const ids = [];
    for (const title of ["Carry A", "Carry B", "Carry C"]) {
      const result = await f.tasks.createTask({
        ...scope,
        title,
        plannedDate: "2026-10-06",
        scheduledStartAt: at,
      });
      if (!result.ok) throw new Error("Fixture failed");
      ids.push(result.data.id);
    }
    expect(
      await race(
        f.path,
        {
          operation: "review",
          input: { ...daily, carryTaskIds: ids.slice(0, 2), outcome: "first" },
        },
        {
          operation: "review",
          input: {
            ...daily,
            carryTaskIds: ids.slice(1),
            outcome: "serialized last",
          },
        },
      ),
    ).toEqual([{ ok: true }, { ok: true }]);
    const review = await f.reviews.getReviewByPeriod(
      owner,
      owner,
      "daily",
      daily.periodStart,
    );
    expect(review.ok && review.data?.outcome).toBe("serialized last");
    const decisions = f.store.read(f.context, (db) =>
      db
        .prepare(
          "SELECT task_id,target_date,original_planned_date,original_scheduled_start_at,planning_snapshot_captured FROM review_task_decisions WHERE user_id=? ORDER BY task_id",
        )
        .all(owner),
    ) as { task_id: string }[];
    expect(decisions.map((d) => d.task_id)).toEqual(ids.slice(1).sort());
    for (const decision of decisions)
      expect(decision).toMatchObject({
        target_date: "2026-10-07",
        original_planned_date: "2026-10-06",
        original_scheduled_start_at: at,
        planning_snapshot_captured: BigInt(1),
      });
    for (const id of ids)
      expect(
        f.store.read(f.context, (db) =>
          db
            .prepare(
              "SELECT planned_date,scheduled_start_at FROM tasks WHERE user_id=? AND id=?",
            )
            .get(owner, id),
        ),
      ).toEqual({
        planned_date: id === ids[0] ? "2026-10-06" : "2026-10-07",
        scheduled_start_at: id === ids[0] ? at : null,
      });
    expect(
      f.store.read(f.context, (db) =>
        db
          .prepare("SELECT count(*) n FROM review_records WHERE user_id=?")
          .get(owner),
      ),
    ).toEqual({ n: BigInt(1) });
  } finally {
    f.store.close();
  }
}, 15000);

import { randomUUID } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { expect, it } from "vitest";
import { taskStepProgress } from "@/features/entities/workbench/task-step-progress";
import { currentTaskStepProgress } from "@/features/dashboard/current-task-progress";
import { readDashboardTaskSteps } from "./dashboard-task-steps-read";
import { supabaseApplicationReads } from "./supabase-adapter";
import type { SupabaseClientLike } from "../supabase/database.types";
import { initializeSyntheticDatabase } from "../sqlite/synthetic-database";
import { SqliteRuntime } from "../sqlite/runtime";
import { issueOwnerContext } from "../sqlite/owner-context";
import { createSqliteTaskStepRepository } from "../sqlite/repositories/task-step-repository";
import { sqliteApplicationReads } from "./sqlite-read-services";

const taskId = randomUUID();
const step = (completed = false, archived = false) => ({
  task_id: taskId,
  completed_at: completed ? "2026-10-23T10:00:00Z" : null,
  archived_at: archived ? "2026-10-23T11:00:00Z" : null,
});

it("matches canonical semantics for zero, 1/1, 2/4, all-done and archived steps", async () => {
  for (const steps of [
    [],
    [step(true)],
    [step(true), step(true), step(), step()],
    [step(true), step(true)],
    [step(true, true), step()],
  ]) {
    expect(await readDashboardTaskSteps(taskId, async () => steps)).toEqual({
      state: "available",
      taskId,
      ...taskStepProgress(steps),
    });
  }
  expect(currentTaskStepProgress(taskId, []).state).toBe("available");
  expect(currentTaskStepProgress(taskId, null)).toEqual({
    state: "unavailable",
    taskId,
  });
});

it("fails closed for invalid IDs, errors, malformed rows and a different selected Task", async () => {
  for (const reader of [
    async () => {
      throw new Error("private database detail");
    },
    async () => [{ invalid: true }],
    async () => [{ ...step(), task_id: randomUUID() }],
  ]) {
    expect(await readDashboardTaskSteps(taskId, reader)).toEqual({
      state: "unavailable",
      taskId,
    });
  }
  expect(
    await readDashboardTaskSteps("not-a-task", async () => {
      throw new Error("must not read");
    }),
  ).toEqual({ state: "unavailable", taskId: "not-a-task" });
});

function supabaseFixture({ failedPage = -1, missingParent = false } = {}) {
  const calls: {
    table: string;
    filters: [string, unknown][];
    start?: number;
  }[] = [];
  const all = Array.from({ length: 1001 }, (_, i) => step(i % 2 === 0));
  const client = {
    from(table: string) {
      const call: (typeof calls)[number] = { table, filters: [] };
      calls.push(call);
      const query = {
        select: () => query,
        order: () => query,
        eq: (key: string, value: unknown) => {
          call.filters.push([key, value]);
          return query;
        },
        is: (key: string, value: unknown) => {
          call.filters.push([key, value]);
          return query;
        },
        maybeSingle: async () => ({
          data: missingParent ? null : { id: taskId },
          error: null,
        }),
        range: async (start: number, end: number) => {
          call.start = start;
          return start === failedPage
            ? { data: null, error: { message: "private" } }
            : { data: all.slice(start, end + 1), error: null };
        },
      };
      return query;
    },
  } as unknown as SupabaseClientLike;
  return {
    reads: supabaseApplicationReads(client, "authenticated-owner"),
    calls,
  };
}

it("uses an owned active parent and paginates only that Task's steps, never a global Workbench read", async () => {
  const f = supabaseFixture();
  expect(await f.reads.dashboardTaskSteps(taskId)).toMatchObject({
    total: 1001,
    completed: 501,
    percent: 50,
  });
  expect(f.calls.map((c) => c.table)).toEqual([
    "tasks",
    "task_steps",
    "task_steps",
    "task_steps",
  ]);
  expect(f.calls[0].filters).toEqual([
    ["user_id", "authenticated-owner"],
    ["id", taskId],
    ["archived_at", null],
  ]);
  for (const call of f.calls.slice(1))
    expect(call.filters).toEqual([
      ["user_id", "authenticated-owner"],
      ["task_id", taskId],
      ["archived_at", null],
    ]);
  expect(f.calls.slice(1).map((c) => c.start)).toEqual([0, 500, 1000]);
});

it("discards a partial Supabase read and never queries steps for an inaccessible parent", async () => {
  const f = supabaseFixture({ failedPage: 500 });
  expect(await f.reads.dashboardTaskSteps(taskId)).toEqual({
    state: "unavailable",
    taskId,
  });
  const denied = supabaseFixture({ missingParent: true });
  expect(await denied.reads.dashboardTaskSteps(taskId)).toEqual({
    state: "unavailable",
    taskId,
  });
  expect(denied.calls.map((c) => c.table)).toEqual(["tasks"]);
});

it("projects native Step writes, selection, archive and restart without completing the parent", async () => {
  const ownerId = randomUUID(),
    otherTask = randomUUID();
  const path = join(
    mkdtempSync(join(tmpdir(), "life-os-116-172-steps-")),
    "synthetic.db",
  );
  initializeSyntheticDatabase(path, ownerId);
  const owner = issueOwnerContext(ownerId);
  let store = new SqliteRuntime(path, { syntheticProof: true });
  try {
    store.command(owner, "task.create", (db) => {
      const insert = db.prepare(
        "INSERT INTO tasks(id,user_id,title,status,created_at,updated_at) VALUES(?,?,'#172 synthetic','active',life_now(),life_now())",
      );
      for (const id of [taskId, otherTask]) insert.run(id, ownerId);
    });
    const reads = () => sqliteApplicationReads(store, owner);
    const repo = createSqliteTaskStepRepository(store, owner);
    expect(await reads().dashboardTaskSteps(taskId)).toMatchObject({
      total: 0,
      percent: null,
    });
    for (const title of ["First", "Second", "Third", "Fourth"])
      expect(repo.write("create", { taskId, title })).toBe(true);
    const steps = repo.read(taskId);
    for (const s of steps.slice(0, 2))
      expect(
        repo.write("update", {
          taskId,
          stepId: s.id,
          title: s.title,
          position: s.position,
          completed: true,
        }),
      ).toBe(true);
    expect(await reads().dashboardTaskSteps(taskId)).toMatchObject({
      total: 4,
      completed: 2,
      percent: 50,
    });
    expect(await reads().dashboardTaskSteps(otherTask)).toMatchObject({
      total: 0,
      percent: null,
    });
    expect(
      await sqliteApplicationReads(
        store,
        issueOwnerContext(randomUUID()),
      ).dashboardTaskSteps(taskId),
    ).toEqual({ state: "unavailable", taskId });
    for (const s of steps.slice(2))
      expect(repo.write("archive", { taskId, stepId: s.id })).toBe(true);
    expect(await reads().dashboardTaskSteps(taskId)).toMatchObject({
      total: 2,
      completed: 2,
      percent: 100,
    });
    expect(
      store.read(owner, (db) =>
        db
          .prepare("SELECT status,completed_at FROM tasks WHERE id=?")
          .get(taskId),
      ),
    ).toEqual({ status: "active", completed_at: null });
    expect(
      repo.write("update", {
        taskId,
        stepId: steps[0].id,
        title: steps[0].title,
        position: steps[0].position,
        completed: false,
      }),
    ).toBe(true);
    store.close();
    store = new SqliteRuntime(path, { syntheticProof: true });
    expect(await reads().dashboardTaskSteps(taskId)).toMatchObject({
      total: 2,
      completed: 1,
      percent: 50,
    });
    store.command(owner, "task.archive", (db) =>
      db
        .prepare("UPDATE tasks SET archived_at=life_now() WHERE id=?")
        .run(taskId),
    );
    expect(await reads().dashboardTaskSteps(taskId)).toEqual({
      state: "unavailable",
      taskId,
    });
  } finally {
    store.close();
  }
});

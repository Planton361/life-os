import { randomUUID } from "node:crypto";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  sourceReviewFixture,
  owner,
  scope,
} from "../../../../../tests/sqlite/source-review-fixture";
import { createSqliteCanonicalBaseRepository } from "./canonical-base-repository";
import { result } from "../../../../../tests/sqlite/nutrition-training-fixture";
it("native canonical base captures draft Goals, Project metadata and reload-stable Daily Log references", async () => {
  const f = sourceReviewFixture();
  try {
    const r = createSqliteCanonicalBaseRepository(f.store, f.context);
    const goal = r.goal({
      ...scope,
      title: "Goal capture",
      status: "active",
      areaId: f.area,
    });
    expect(goal.status).toBe("draft");
    const project = r.project({
      ...scope,
      title: "Project capture",
      goalId: goal.id,
      areaId: f.area,
      status: "active",
    });
    expect(
      r.project({ ...scope, projectId: project.id, title: "Edited" }, true)
        .title,
    ).toBe("Edited");
    expect(() =>
      r.project({ ...scope, projectId: project.id, status: "completed" }, true),
    ).toThrow("PROJECT_LIFECYCLE_COMMAND_REQUIRED");
    expect(() =>
      r.goal({ ...scope, userId: randomUUID(), title: "Foreign" }),
    ).toThrow("OWNER_DENIED");
    const task = result(
      await f.tasks.createTask({
        ...scope,
        title: "Task",
        projectId: String(project.id),
      }),
    );
    const day = r.daily({
      ...scope,
      localDate: "2026-10-01",
      timezone: "Europe/Berlin",
      openingNote: "Open",
    });
    expect(
      r.daily({
        ...scope,
        localDate: "2026-10-01",
        timezone: "Europe/Berlin",
        openingNote: "Edited",
      }).id,
    ).toBe(day.id);
    const link = r.linkDaily({
      ...scope,
      dailyLogId: day.id,
      taskId: task.id,
      role: "planned",
    });
    expect(
      r.linkDaily({
        ...scope,
        dailyLogId: day.id,
        taskId: task.id,
        role: "planned",
      }).id,
    ).toBe(link.id);
    expect(
      r.closeDaily({ ...scope, dailyLogId: day.id, closingNote: "Closed" })
        .status,
    ).toBe("closed");
    expect(r.read(owner, "daily_log_tasks")).toHaveLength(1);
  } finally {
    f.store.close();
  }
});
it("native Project Milestones preserve active exclusivity, reordering, assignment and archive unlink", async () => {
  const f = sourceReviewFixture();
  try {
    const r = createSqliteCanonicalBaseRepository(f.store, f.context);
    const a = r.milestone(owner, {
      projectId: f.project,
      operation: "save",
      title: "First",
      status: "active",
    }) as string;
    const b = r.milestone(owner, {
      projectId: f.project,
      operation: "save",
      title: "Second",
      status: "active",
    }) as string;
    expect(
      r
        .read(owner, "project_milestones")
        .filter((m) => m.status === "active")
        .map((m) => m.id),
    ).toEqual([b]);
    r.milestone(owner, {
      projectId: f.project,
      operation: "up",
      milestoneId: b,
    });
    expect(
      r.read(owner, "project_milestones").find((m) => m.id === b)?.sort_order,
    ).toBe(BigInt(0));
    const task = result(
      await f.tasks.createTask({
        ...scope,
        title: "Task",
        projectId: f.project,
      }),
    );
    r.milestone(owner, {
      projectId: f.project,
      operation: "assign",
      milestoneId: a,
      taskId: task.id,
    });
    r.milestone(owner, {
      projectId: f.project,
      operation: "archive",
      milestoneId: a,
    });
    expect(
      f.store.read(f.context, (db) =>
        db
          .prepare("SELECT milestone_id FROM tasks WHERE user_id=? AND id=?")
          .get(owner, task.id),
      ),
    ).toEqual({ milestone_id: null });
    expect(() =>
      r.milestone(owner, {
        projectId: f.project,
        operation: "assign",
        milestoneId: a,
        taskId: task.id,
      }),
    ).toThrow();
  } finally {
    f.store.close();
  }
});

import { describe, expect, it } from "vitest";
import { projectMilestoneGroups } from "./project-milestones";
import { projectMilestoneInputSchema } from "../../real-data/schemas/project-milestone.schemas";
describe("project milestones", () => {
  const stage = (
    id: string,
    status = "open",
    sort_order = 0,
    archived_at: string | null = null,
  ) => ({ id, status, sort_order, project_id: "p", archived_at });
  const task = (
    id: string,
    milestone_id: string | null,
    status = "planned",
  ) => ({ id, milestone_id, status, project_id: "p", archived_at: null });
  it("groups each canonical task once; progress never completes a milestone", () => {
    const result = projectMilestoneGroups(
      "p",
      [stage("a"), stage("b", "done")],
      [task("1", "a", "done"), task("2", null), task("3", "b")],
    );
    expect(result.groups[0].done).toBe(1);
    expect(result.groups[0].milestone.status).toBe("open");
    expect(result.unassigned.map((t) => t.id)).toEqual(["2"]);
    expect(result.tasksDone).toBe(1);
    expect(result.milestonesDone).toBe(1);
    expect(
      result.groups.flatMap((g) => g.tasks).length + result.unassigned.length,
    ).toBe(3);
  });
  it("sorts open/active before done, retaining sort_order and id within each partition", () => {
    const result = projectMilestoneGroups(
      "p",
      [
        stage("z", "done", 0),
        stage("b", "active", 2),
        stage("a", "open", 1),
        stage("c", "open", 2),
        stage("y", "done", 0),
        stage("x", "done", 4),
        stage("archived", "open", 3, "now"),
        { ...stage("foreign", "open", 0), project_id: "other" },
      ],
      [{ ...task("foreign", null), project_id: "other" }],
    );
    expect(result.groups.map((g) => g.milestone.id)).toEqual([
      "a",
      "b",
      "c",
      "y",
      "z",
      "x",
    ]);
    expect(result.taskCount).toBe(0);
  });
  it("preserves inherited Task row order in each group and unassigned work", () => {
    const result = projectMilestoneGroups(
      "p",
      [stage("a")],
      [
        task("new-waiting", "a", "waiting"),
        task("new-unassigned", null, "waiting"),
        task("older-ready", "a"),
        task("old-unassigned", null),
      ],
    );
    expect(result.groups[0].tasks.map((t) => t.id)).toEqual([
      "new-waiting",
      "older-ready",
    ]);
    expect(result.unassigned.map((t) => t.id)).toEqual([
      "new-unassigned",
      "old-unassigned",
    ]);
  });
  it("accepts unassignment but rejects invalid operations, missing identity and impossible dates", () => {
    const projectId = "00000000-0000-4000-8000-000000000001";
    expect(
      projectMilestoneInputSchema.safeParse({
        projectId,
        operation: "assign",
        taskId: projectId,
        milestoneId: "",
      }).success,
    ).toBe(true);
    for (const input of [
      { operation: "save", title: " " },
      { operation: "up" },
      { operation: "assign" },
      { operation: "save", title: "A", targetDate: "2026-02-30" },
      { operation: "delete" },
      { operation: "save", title: "A", status: "sprint" },
    ])
      expect(
        projectMilestoneInputSchema.safeParse({ projectId, ...input }).success,
      ).toBe(false);
  });
});

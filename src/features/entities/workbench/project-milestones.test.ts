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
  it("respects stage order, completed stages last, excludes history and other projects", () => {
    const result = projectMilestoneGroups(
      "p",
      [
        stage("z", "done"),
        stage("b", "active", 1),
        stage("a", "open", 0),
        stage("archived", "open", 3, "now"),
      ],
      [{ ...task("foreign", null), project_id: "other" }],
    );
    expect(result.groups.map((g) => g.milestone.id)).toEqual(["a", "b", "z"]);
    expect(result.taskCount).toBe(0);
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

import { describe, expect, it } from "vitest";
import {
  hasTaskGoalConflict,
  projectGoalChangeConflictsWithDirectTasks,
  resolveTaskGoalAlignment,
} from "./task-goal-alignment";

describe("task/project goal alignment", () => {
  it("keeps a direct goal without a project", () => {
    expect(resolveTaskGoalAlignment("goal-a", null)).toBe("direct");
  });

  it("derives the goal from a project when the task has no direct goal", () => {
    expect(resolveTaskGoalAlignment(null, "goal-a")).toBe("via_project");
  });

  it("allows a direct goal when the project has no goal", () => {
    expect(resolveTaskGoalAlignment("goal-a", null)).toBe("direct");
  });

  it("marks matching direct and inherited goals as one redundant relation", () => {
    expect(resolveTaskGoalAlignment("goal-a", "goal-a")).toBe("redundant");
  });

  it("detects conflicting direct and inherited goals", () => {
    expect(resolveTaskGoalAlignment("goal-a", "goal-b")).toBe("conflict");
    expect(hasTaskGoalConflict("goal-a", "goal-b")).toBe(true);
  });

  it("allows a project goal change without conflicting direct task goals", () => {
    expect(
      projectGoalChangeConflictsWithDirectTasks("goal-a", [null, "goal-a"]),
    ).toBe(false);
  });

  it("rejects a project goal change that conflicts with a direct task goal", () => {
    expect(
      projectGoalChangeConflictsWithDirectTasks("goal-b", [null, "goal-a"]),
    ).toBe(true);
  });
});

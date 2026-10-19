import { describe, expect, it } from "vitest";
import { projectTaskGuidance } from "./project-guidance";

describe("Project executable Task guidance", () => {
  it("prioritizes first Task capture for an empty Project", () => {
    expect(
      projectTaskGuidance({
        archived: false,
        taskCount: 0,
        readyTaskIds: [],
        blockedCount: 0,
      }),
    ).toEqual({ kind: "empty" });
  });

  it("highlights a Task only when one READY Task is unambiguous", () => {
    expect(
      projectTaskGuidance({
        archived: false,
        taskCount: 3,
        readyTaskIds: ["ready-task"],
        blockedCount: 2,
      }),
    ).toEqual({ kind: "single-ready", taskId: "ready-task" });
  });

  it("preserves user choice when multiple Tasks are READY", () => {
    expect(
      projectTaskGuidance({
        archived: false,
        taskCount: 3,
        readyTaskIds: ["ready-a", "ready-b"],
        blockedCount: 1,
      }),
    ).toEqual({ kind: "multiple-ready", count: 2 });
  });

  it("points all-blocked work to blocker context without selecting a Task", () => {
    expect(
      projectTaskGuidance({
        archived: false,
        taskCount: 3,
        readyTaskIds: [],
        blockedCount: 3,
      }),
    ).toEqual({ kind: "all-blocked", count: 3 });
  });

  it("keeps archived Projects read-only and completed work unmodified", () => {
    expect(
      projectTaskGuidance({
        archived: true,
        taskCount: 1,
        readyTaskIds: ["ready-task"],
        blockedCount: 0,
      }),
    ).toEqual({ kind: "archived" });
    expect(
      projectTaskGuidance({
        archived: false,
        taskCount: 2,
        readyTaskIds: [],
        blockedCount: 0,
      }),
    ).toEqual({ kind: "no-open-work" });
  });
  it("keeps completed Projects read-only even with executable or empty work", () => {
    for (const taskCount of [0, 1]) {
      expect(
        projectTaskGuidance({
          archived: false,
          completed: true,
          taskCount,
          readyTaskIds: taskCount ? ["open-task"] : [],
          blockedCount: 0,
        }),
      ).toEqual({ kind: "completed" });
    }
    expect(
      projectTaskGuidance({
        archived: true,
        completed: true,
        taskCount: 1,
        readyTaskIds: ["open-task"],
        blockedCount: 0,
      }),
    ).toEqual({ kind: "archived" });
  });
});

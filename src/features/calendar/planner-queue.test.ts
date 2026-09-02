import { describe, expect, it } from "vitest";
import type { LifeGoal, LifeProject, LifeTask } from "../entities/types";
import { buildPlannerQueue } from "./planner-queue";

const goal = (id: string): LifeGoal => ({
  areaId: "work",
  currentValue: "",
  description: "",
  horizon: "quarter",
  id,
  linkedProjectIds: [],
  linkedTaskIds: [],
  measure: "",
  milestoneIds: [],
  nextStep: "",
  progress: 0,
  reviewNotes: [],
  remaining: "",
  status: "active",
  targetValue: "",
  title: id,
  why: "",
});

const project = (id: string, goalId?: string): LifeProject => ({
  activity: [],
  areaId: "work",
  blocker: undefined,
  deadline: undefined,
  description: "",
  focusThisWeek: false,
  goalId,
  id,
  milestoneIds: [],
  nextStep: "",
  notes: [],
  phase: "active",
  priority: "P2",
  progress: 0,
  risk: undefined,
  skillIds: [],
  status: "active",
  taskIds: [],
  title: id,
});

const task = (id: string, overrides: Partial<LifeTask> = {}): LifeTask => ({
  areaId: "work",
  description: "",
  evidence: [],
  id,
  nextStep: "",
  priority: "P2",
  reviewNeeded: false,
  status: "active",
  timeline: [],
  title: id,
  type: "task",
  ...overrides,
});

function queue(tasks: readonly LifeTask[]) {
  return buildPlannerQueue({
    goals: [goal("goal-a"), goal("goal-b")],
    projects: [project("project-a", "goal-a")],
    skillsByTaskId: new Map([
      ["project-task", [{ id: "skill-a", title: "skill-a" }]],
    ]),
    tasks,
    today: "2026-09-02",
    weekEnd: "2026-09-06",
    weekStart: "2026-08-31",
  });
}

describe("canonical planner queue", () => {
  it("ranks each open, unscheduled occurrence exactly once with an explainable group", () => {
    const items = queue([
      task("backlog"),
      task("project-task", { projectId: "project-a" }),
      task("recurring", {
        instanceDate: "2026-09-02",
        isGenerated: true,
        type: "routine",
      }),
      task("due", { dueAt: "2026-09-04T09:00:00.000Z", priority: "P0" }),
      task("overdue", { dueAt: "2026-09-01T09:00:00.000Z" }),
      task("scheduled", { startTime: "09:00" }),
      task("completed", { status: "done" }),
      task("waiting", { status: "waiting" }),
    ]);

    expect(items.map((item) => item.id)).toEqual([
      "overdue",
      "due",
      "recurring",
      "project-task",
      "backlog",
    ]);
    expect(items.map((item) => item.rankingGroup)).toEqual([
      "overdue",
      "due_this_week",
      "recurring_due",
      "project_next_work",
      "backlog",
    ]);
    expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
  });

  it("preserves project, inherited-goal, skill, and source context without a second task copy", () => {
    const [item] = queue([
      task("project-task", {
        projectId: "project-a",
        scheduleSource: { id: "source", type: "meal" },
      }),
    ]);

    expect(item).toMatchObject({
      goal: { alignment: "via_project", id: "goal-a" },
      project: { id: "project-a" },
      scheduleSourceType: "meal",
      skills: [{ id: "skill-a" }],
    });
  });

  it("keeps every established source-linked task as a canonical queue task", () => {
    const items = queue([
      task("meal", { scheduleSource: { id: "meal-source", type: "meal" } }),
      task("review", { scheduleSource: { id: "review-source", type: "review" } }),
      task("running", {
        scheduleSource: { id: "running-source", type: "running_plan_item" },
      }),
      task("strength", {
        scheduleSource: { id: "strength-source", type: "strength_plan" },
      }),
    ]);

    expect(items.map((item) => item.scheduleSourceType)).toEqual([
      "meal",
      "review",
      "running_plan_item",
      "strength_plan",
    ]);
  });

  it("keeps direct and inherited copies of the same goal as one deterministic context", () => {
    const [item] = queue([
      task("project-task", { goalId: "goal-a", projectId: "project-a" }),
    ]);

    expect(item.goal).toMatchObject({ alignment: "redundant", id: "goal-a" });
  });
});

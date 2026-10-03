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
  dependencyAvailability: "READY",
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
  it("fails closed for BLOCKED and unknown truth before ranking and the existing limit", () => {
    const candidates = Array.from({ length: 110 }, (_, i) =>
      task(`ready-${String(i).padStart(3, "0")}`),
    );
    const items = queue([
      task("blocked-overdue", {
        dependencyAvailability: "BLOCKED",
        dueAt: "2026-01-01",
      }),
      task("unknown-overdue", {
        dependencyAvailability: undefined,
        dueAt: "2026-01-01",
      }),
      ...candidates,
    ]).slice(0, 100);
    expect(items.map((i) => i.id)).toEqual(
      candidates.slice(0, 100).map((t) => t.id),
    );
  });

  it("preserves group, deadline, priority, planning date, creation and ID tie-breaks for the READY subset", () => {
    const ready = [
      task("goal", { goalId: "goal-a" }),
      task("project", { projectId: "project-a" }),
      task("recurring", { isGenerated: true, instanceDate: "2026-09-02" }),
      task("due-later", { dueAt: "2026-09-04", priority: "P0" }),
      task("due-sooner", { dueAt: "2026-09-03", priority: "P3" }),
      task("overdue-later", { dueAt: "2026-09-01", priority: "P0" }),
      task("overdue-sooner", { dueAt: "2026-08-30", priority: "P3" }),
      task("priority", { priority: "P0" }),
      task("date", { date: "2026-09-02" }),
      task("created", { createdAt: "2026-01-01" }),
      task("b", { createdAt: "2026-01-02" }),
      task("a", { createdAt: "2026-01-02" }),
    ];
    const expected = [
      "overdue-sooner",
      "overdue-later",
      "due-sooner",
      "due-later",
      "recurring",
      "project",
      "goal",
      "priority",
      "date",
      "created",
      "a",
      "b",
    ];
    expect(queue(ready).map((i) => i.id)).toEqual(expected);
    expect(
      queue([
        ...ready,
        ...ready.map((t) => ({
          ...t,
          id: `blocked-${t.id}`,
          dependencyAvailability: "BLOCKED" as const,
        })),
      ]).map((i) => i.id),
    ).toEqual(expected);
  });
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
      task("review", {
        scheduleSource: { id: "review-source", type: "review" },
      }),
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

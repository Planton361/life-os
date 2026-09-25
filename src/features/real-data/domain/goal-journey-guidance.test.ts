import { describe, expect, it } from "vitest";
import {
  buildGoalOutcomeSummary,
  deriveGoalJourneyGuidance,
  type GoalMilestone,
  type GoalOutcome,
  type GoalOutcomeCriterion,
  type GoalPathTaskContext,
} from "./goal-outcome";
import type { TaskDependencyGraph } from "./task-dependencies";

const criterion: GoalOutcomeCriterion = {
  id: "criterion-1",
  userId: "user-1",
  goalId: "goal-1",
  goalMilestoneId: null,
  title: "Final outcome is accepted",
  criterionType: "boolean",
  unit: null,
  target: null,
  direction: null,
  createdAt: "2026-09-25T00:00:00.000Z",
  updatedAt: "2026-09-25T00:00:00.000Z",
  archivedAt: null,
  evaluations: [],
  latestEvaluation: {
    id: "evaluation-1",
    userId: "user-1",
    criterionId: "criterion-1",
    deferred: false,
    booleanValue: true,
    numericValue: null,
    unit: null,
    evaluatedAt: "2026-09-25T00:00:00.000Z",
    createdAt: "2026-09-25T00:00:00.000Z",
    note: null,
  },
};

function milestone(
  id: string,
  status: GoalMilestone["status"],
  sortOrder = 0,
): GoalMilestone {
  return {
    id,
    userId: "user-1",
    goalId: "goal-1",
    title: `Milestone ${id}`,
    description: `A verifiable outcome for ${id}.`,
    targetDate: null,
    status,
    sortOrder,
    createdAt: "2026-09-25T00:00:00.000Z",
    updatedAt: "2026-09-25T00:00:00.000Z",
    archivedAt: null,
  };
}

function task(id: string, status = "planned"): GoalPathTaskContext {
  return {
    id,
    title: `Task ${id}`,
    status,
    projectId: null,
    plannedDate: null,
    dueAt: null,
    archivedAt: null,
  };
}

function support(taskId: string, milestoneId = "current") {
  return {
    id: `support-${taskId}`,
    goalId: "goal-1",
    goalMilestoneId: milestoneId,
    targetId: taskId,
    targetTitle: `Task ${taskId}`,
    createdAt: "2026-09-25T00:00:00.000Z",
  };
}

function goal(overrides: Partial<GoalOutcome> = {}): GoalOutcome {
  const values = {
    goalId: "goal-1",
    goalTitle: "Life OS fertig bringen",
    goalDescription: "A user-facing outcome.",
    goalWhy: "A clear reason.",
    goalHorizon: "quarter",
    targetDate: null,
    updatedAt: "2026-09-25T00:00:00.000Z",
    goalStatus: "active" as const,
    achievedAt: null,
    achievementNote: null,
    milestones: [] as GoalMilestone[],
    criteria: [criterion],
    projectSupport: [],
    taskSupport: [],
    projects: [],
    tasks: [] as GoalPathTaskContext[],
    nextStep: {
      state: "planning" as const,
      kind: "goal" as const,
      id: "goal-1",
      title: "Plan a step",
      href: "/goals/goal-1",
      reason: "Planning is needed.",
      blockers: [],
    },
    milestoneHistory: [],
    achievementHistory: [],
    summary: buildGoalOutcomeSummary({
      goalId: "goal-1",
      goalStatus: "active",
      achievedAt: null,
      milestones: [],
      criteria: [criterion],
    }),
  };
  const merged = { ...values, ...overrides };
  return {
    ...merged,
    summary:
      overrides.summary ??
      buildGoalOutcomeSummary({
        goalId: merged.goalId,
        goalStatus: merged.goalStatus,
        achievedAt: merged.achievedAt,
        milestones: merged.milestones,
        criteria: merged.criteria,
      }),
  };
}

function graph(
  tasks: GoalPathTaskContext[],
  dependencies: TaskDependencyGraph["dependencies"] = [],
): TaskDependencyGraph {
  return {
    tasks: tasks.map((item) => ({
      id: item.id,
      title: item.title,
      project_id: item.projectId,
      status: item.status,
      completed_at: ["done", "completed"].includes(item.status)
        ? "2026-09-25T00:00:00.000Z"
        : null,
      archived_at: item.archivedAt,
    })),
    dependencies,
  };
}

describe("Goal Journey guidance", () => {
  it("asks for one Definition of Done action before journey planning", () => {
    const guidance = deriveGoalJourneyGuidance(
      goal({ criteria: [], milestones: [milestone("planned", "planned")] }),
      graph([]),
    );

    expect(guidance.action).toBe("define_outcome");
    expect(guidance.reason).toContain("später erkennst");
  });

  it("asks for the first milestone when the outcome is defined", () => {
    const guidance = deriveGoalJourneyGuidance(goal(), graph([]));
    expect(guidance.action).toBe("create_first_milestone");
  });

  it("asks the user to select a current milestone when the journey has no current", () => {
    const guidance = deriveGoalJourneyGuidance(
      goal({ milestones: [milestone("planned", "planned")] }),
      graph([]),
    );
    expect(guidance.action).toBe("select_current_milestone");
  });

  it("opens one READY task from the current milestone", () => {
    const ready = task("ready");
    const guidance = deriveGoalJourneyGuidance(
      goal({
        milestones: [milestone("current", "active")],
        tasks: [ready],
        taskSupport: [support("ready")],
      }),
      graph([ready]),
    );
    expect(guidance).toMatchObject({
      action: "open_ready_task",
      task: { id: "ready" },
      blockers: [],
    });
  });

  it("uses only real Task Dependencies for blocker guidance", () => {
    const blocked = task("blocked");
    const predecessor = task("predecessor", "waiting");
    const guidance = deriveGoalJourneyGuidance(
      goal({
        milestones: [milestone("current", "active")],
        tasks: [blocked],
        taskSupport: [support("blocked")],
      }),
      graph(
        [blocked, predecessor],
        [
          {
            id: "dependency-1",
            predecessor_task_id: "predecessor",
            successor_task_id: "blocked",
          },
        ],
      ),
    );
    expect(guidance).toMatchObject({
      action: "resolve_blocker",
      task: { id: "blocked" },
      blockers: [{ id: "predecessor", title: "Task predecessor" }],
    });
  });

  it("does not treat unassociated Goal work as current-milestone work", () => {
    const unassigned = task("unassigned");
    const guidance = deriveGoalJourneyGuidance(
      goal({
        milestones: [milestone("current", "active")],
        tasks: [unassigned],
      }),
      graph([unassigned]),
    );
    expect(guidance.action).toBe("create_next_task");
    expect(guidance.reason).toContain("noch keine Aufgabe zugeordnet");
  });

  it("asks for explicit Milestone Review after supported work is complete", () => {
    const completed = task("completed", "done");
    const guidance = deriveGoalJourneyGuidance(
      goal({
        milestones: [milestone("current", "active")],
        tasks: [completed],
        taskSupport: [support("completed")],
      }),
      graph([completed]),
    );
    expect(guidance).toMatchObject({
      action: "review_milestone",
      task: null,
    });
  });

  it("asks for Goal Review only after all milestones are achieved", () => {
    const guidance = deriveGoalJourneyGuidance(
      goal({ milestones: [milestone("done", "achieved")] }),
      graph([]),
    );
    expect(guidance.action).toBe("review_goal");
    expect(guidance.reason).toContain("ausdrücklich");
  });

  it("keeps an achieved Goal outcome-first with one status action", () => {
    const guidance = deriveGoalJourneyGuidance(
      goal({ goalStatus: "achieved", achievedAt: "2026-09-24T00:00:00Z" }),
      graph([]),
    );
    expect(guidance.action).toBe("achieved");
    expect(guidance.task).toBeNull();
  });

  it("returns to explicit Milestone Review after reopening an achieved Milestone", () => {
    const completed = task("completed", "done");
    const guidance = deriveGoalJourneyGuidance(
      goal({
        milestones: [milestone("current", "active")],
        tasks: [completed],
        taskSupport: [support("completed")],
      }),
      graph([completed]),
    );
    expect(guidance.action).toBe("review_milestone");
  });
});

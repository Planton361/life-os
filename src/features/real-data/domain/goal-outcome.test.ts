import { describe, expect, it } from "vitest";
import {
  buildGoalOutcomeSummary,
  criterionEvaluationState,
  deriveGoalNextStep,
  latestGoalAchievementEvent,
  projectGoalEvidenceReferences,
  resolveGoalAchievementBasisEventId,
  type GoalAchievementEvent,
  type GoalOutcomeCriterion,
  type GoalEvidenceReference,
} from "./goal-outcome";
import type { TaskDependencyGraph } from "./task-dependencies";

function criterion(
  overrides: Partial<GoalOutcomeCriterion> = {},
): GoalOutcomeCriterion {
  return {
    id: "criterion-1",
    userId: "user-1",
    goalId: "goal-1",
    goalMilestoneId: null,
    title: "Criterion",
    criterionType: "numeric",
    unit: "hours",
    target: 10,
    direction: "at_least",
    createdAt: "2026-09-20T00:00:00.000Z",
    updatedAt: "2026-09-20T00:00:00.000Z",
    archivedAt: null,
    evaluations: [],
    latestEvaluation: null,
    ...overrides,
  };
}

describe("Goal outcome semantics", () => {
  it.each(["draft", "paused", "active"] as const)("gates a ready %s Goal by lifecycle", (goalStatus) => {
    const readyCriterion = criterion({
      criterionType: "boolean",
      latestEvaluation: {
        id: "evaluation", userId: "user-1", criterionId: "criterion-1",
        deferred: false, booleanValue: true, numericValue: null, unit: null,
        evaluatedAt: "2026-09-21T00:00:00Z", createdAt: "2026-09-21T00:00:00Z", note: null,
      },
    });
    const summary = buildGoalOutcomeSummary({
      goalId: "goal-1", goalStatus, achievedAt: null, criteria: [readyCriterion], milestones: [],
    });
    expect(summary.metCriteriaCount).toBe(1);
    expect(summary.readyToAchieve).toBe(goalStatus === "active");
    if (goalStatus !== "active") expect(summary.blockers).toContain("Nur aktive Goals können erreicht werden. Goal zuerst aktivieren.");
  });
  it("evaluates numeric directions without converting units or percentages", () => {
    expect(
      criterionEvaluationState(criterion({ direction: "at_least", target: 0 }), {
        deferred: false,
        booleanValue: null,
        numericValue: 0,
      }),
    ).toBe("met");
    expect(
      criterionEvaluationState(criterion({ direction: "at_most", target: -2 }), {
        deferred: false,
        booleanValue: null,
        numericValue: -2.5,
      }),
    ).toBe("met");
    expect(
      criterionEvaluationState(criterion({ direction: "exact", target: 1.25 }), {
        deferred: false,
        booleanValue: null,
        numericValue: 1.25,
      }),
    ).toBe("met");
  });

  it("keeps boolean false distinct from an unverified criterion", () => {
    const booleanCriterion = criterion({
      criterionType: "boolean",
      direction: null,
      target: null,
      unit: null,
    });
    expect(
      criterionEvaluationState(booleanCriterion, {
        deferred: false,
        booleanValue: false,
        numericValue: null,
      }),
    ).toBe("not_met");
    expect(criterionEvaluationState(booleanCriterion, null)).toBe("unverified");
  });

  it("reports explicit readiness blockers and ignores archived rows", () => {
    const summary = buildGoalOutcomeSummary({
      goalId: "goal-1",
      goalStatus: "active",
      achievedAt: null,
      criteria: [
        criterion({
          latestEvaluation: {
            id: "evaluation-1",
            userId: "user-1",
            criterionId: "criterion-1",
            deferred: false,
            booleanValue: true,
            numericValue: null,
            unit: null,
            evaluatedAt: "2026-09-20T00:00:00.000Z",
            note: null,
            createdAt: "2026-09-20T00:00:00.000Z",
          },
          criterionType: "boolean",
          direction: null,
          target: null,
          unit: null,
        }),
        criterion({ id: "criterion-2", archivedAt: "2026-09-20T00:00:00.000Z" }),
      ],
      milestones: [
        {
          id: "milestone-1",
          userId: "user-1",
          goalId: "goal-1",
          title: "Milestone",
          description: null,
          targetDate: null,
          status: "achieved",
          sortOrder: 0,
          createdAt: "2026-09-20T00:00:00.000Z",
          updatedAt: "2026-09-20T00:00:00.000Z",
          archivedAt: null,
        },
      ],
    });
    expect(summary.readyToAchieve).toBe(true);
    expect(summary.activeCriteriaCount).toBe(1);
    expect(summary.achievedMilestoneCount).toBe(1);
  });

  it("keeps an explicit deferred evaluation visible but not met", () => {
    const booleanCriterion = criterion({
      criterionType: "boolean",
      direction: null,
      target: null,
      unit: null,
      latestEvaluation: {
        id: "evaluation-deferred",
        userId: "user-1",
        criterionId: "criterion-1",
        deferred: true,
        booleanValue: null,
        numericValue: null,
        unit: null,
        evaluatedAt: "2026-09-20T00:00:00.000Z",
        note: "Later",
        createdAt: "2026-09-20T00:00:00.000Z",
      },
    });

    expect(criterionEvaluationState(booleanCriterion, booleanCriterion.latestEvaluation)).toBe("deferred");
    const summary = buildGoalOutcomeSummary({
      goalId: "goal-1",
      goalStatus: "active",
      achievedAt: null,
      criteria: [booleanCriterion],
      milestones: [],
    });
    expect(summary.deferredCriteriaCount).toBe(1);
    expect(summary.readyToAchieve).toBe(false);
    expect(summary.blockers).toContain("1 Kriterium/Kriterien deferred.");
  });

  it("treats a retracted revision as open and chooses the canonical next step", () => {
    const booleanCriterion = criterion({
      criterionType: "boolean",
      direction: null,
      target: null,
      unit: null,
      latestEvaluation: {
        id: "evaluation-retracted",
        userId: "user-1",
        criterionId: "criterion-1",
        deferred: false,
        booleanValue: null,
        numericValue: null,
        unit: null,
        evaluatedAt: "2026-09-21T00:00:00Z",
        createdAt: "2026-09-21T00:00:00Z",
        note: null,
        retracted: true,
        revisionKind: "retraction",
      },
    });
    expect(criterionEvaluationState(booleanCriterion, booleanCriterion.latestEvaluation)).toBe("unverified");

    expect(
      deriveGoalNextStep({
        goalId: "goal-1",
        goalStatus: "active",
        tasks: [
          { id: "planned", title: "Planned task", status: "planned", projectId: null, plannedDate: "2026-09-25", dueAt: null, archivedAt: null },
        ],
        projects: [],
      }),
    ).toMatchObject({ kind: "task", id: "planned", href: "/tasks/planned" });
  });

  it("excludes waiting work and exposes the canonical predecessor until it is done", () => {
    const graph: TaskDependencyGraph = {
      tasks: [
        {
          id: "predecessor",
          title: "Waiting predecessor",
          project_id: "project-1",
          status: "waiting",
          completed_at: null,
          archived_at: null,
        },
        {
          id: "successor",
          title: "Executable successor",
          project_id: "project-1",
          status: "planned",
          completed_at: null,
          archived_at: null,
        },
      ],
      dependencies: [
        {
          id: "dependency-1",
          predecessor_task_id: "predecessor",
          successor_task_id: "successor",
        },
      ],
    };
    const input = {
      goalId: "goal-1",
      goalStatus: "active" as const,
      tasks: [
        {
          id: "predecessor",
          title: "Waiting predecessor",
          status: "waiting",
          projectId: "project-1",
          plannedDate: null,
          dueAt: null,
          archivedAt: null,
        },
        {
          id: "successor",
          title: "Executable successor",
          status: "planned",
          projectId: "project-1",
          plannedDate: null,
          dueAt: null,
          archivedAt: null,
        },
      ],
      projects: [],
      dependencyGraph: graph,
    };
    expect(deriveGoalNextStep(input)).toMatchObject({
      state: "blocked",
      id: "successor",
      blockers: [{ id: "predecessor", title: "Waiting predecessor" }],
    });
    graph.tasks[0].status = "done";
    graph.tasks[0].completed_at = "2026-09-21T10:00:00Z";
    expect(deriveGoalNextStep(input)).toMatchObject({
      state: "ready",
      id: "successor",
      blockers: [],
    });
  });

  it("projects evidence from the successor chain, independent of row order and timestamps", () => {
    const reference = (overrides: Partial<GoalEvidenceReference>) => ({
      id: "reference",
      referenceGroupId: "group",
      action: "attached" as const,
      sourceType: "project" as const,
      sourceId: "source",
      sourceTitle: "Source",
      sourceContext: null,
      supersedesReferenceId: null,
      reason: null,
      retrospective: false,
      occurredAt: null,
      recordedAt: "2026-09-21T10:00:00Z",
      ...overrides,
    });
    const original = reference({ id: "a" });
    const replacement = reference({
      id: "b",
      action: "replaced",
      sourceId: "replacement",
      sourceTitle: "Replacement",
      supersedesReferenceId: "a",
      reason: "Correction",
    });
    const withdrawn = reference({
      id: "c",
      action: "withdrawn",
      supersedesReferenceId: "b",
      reason: "Withdrawn",
    });
    const supplement = reference({
      id: "d",
      referenceGroupId: "supplement-group",
      action: "supplemented",
      sourceId: "supplement",
      sourceTitle: "Supplement",
      reason: "Retrospective context",
      retrospective: true,
    });
    const projection = projectGoalEvidenceReferences([
      withdrawn,
      supplement,
      original,
      replacement,
    ]);
    expect(projection.active.map((item) => item.id)).toEqual(["d"]);
    expect(projection.history).toHaveLength(4);
  });

  it("resolves Goal achievement basis to the immutable root through multiple amendments", () => {
    expect(
      resolveGoalAchievementBasisEventId("amendment-2", [
        { id: "root", correctsEventId: null },
        { id: "amendment-1", correctsEventId: "root" },
        { id: "amendment-2", correctsEventId: "amendment-1" },
      ]),
    ).toBe("root");
  });

  it("uses recording order for the effective achievement revision", () => {
    const makeEvent = (
      overrides: Partial<GoalAchievementEvent>,
    ): GoalAchievementEvent => ({
      id: "achieved",
      goalId: "goal-1",
      episodeId: "episode-1",
      eventType: "achieved",
      occurredAt: "2026-09-21T10:00:00.000Z",
      recordedAt: "2026-09-21T10:00:01.000Z",
      goalTitleSnapshot: "Goal",
      priorStatus: "active",
      resultingStatus: "achieved",
      achievementNote: "Original",
      legacyState: null,
      correctsEventId: null,
      correctionReason: null,
      retrospective: false,
      commandId: null,
      criterionBasis: [],
      milestoneBasis: [],
      evidence: [],
      evidenceHistory: [],
      ...overrides,
    });
    const original = makeEvent({});
    const amendment = makeEvent({
      id: "amendment",
      eventType: "amended",
      occurredAt: "2026-09-20T09:30:00.000Z",
      recordedAt: "2026-09-21T10:01:00.000Z",
      achievementNote: "Corrected",
      correctsEventId: original.id,
    });

    expect(latestGoalAchievementEvent([original, amendment])).toBe(amendment);
  });
});

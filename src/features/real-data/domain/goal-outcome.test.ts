import { describe, expect, it } from "vitest";
import {
  buildGoalOutcomeSummary,
  criterionEvaluationState,
  type GoalOutcomeCriterion,
} from "./goal-outcome";

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
  it("evaluates numeric directions without converting units or percentages", () => {
    expect(
      criterionEvaluationState(criterion({ direction: "at_least", target: 0 }), {
        booleanValue: null,
        numericValue: 0,
      }),
    ).toBe("met");
    expect(
      criterionEvaluationState(criterion({ direction: "at_most", target: -2 }), {
        booleanValue: null,
        numericValue: -2.5,
      }),
    ).toBe("met");
    expect(
      criterionEvaluationState(criterion({ direction: "exact", target: 1.25 }), {
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
});

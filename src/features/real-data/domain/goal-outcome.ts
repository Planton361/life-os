export const goalMilestoneStatuses = [
  "planned",
  "active",
  "achieved",
  "archived",
] as const;

export type GoalMilestoneStatus = (typeof goalMilestoneStatuses)[number];

export const goalCriterionTypes = ["boolean", "numeric"] as const;
export type GoalCriterionType = (typeof goalCriterionTypes)[number];

export const goalCriterionDirections = ["at_least", "at_most", "exact"] as const;
export type GoalCriterionDirection = (typeof goalCriterionDirections)[number];

export type GoalCriterionEvaluationState =
  | "met"
  | "not_met"
  | "unverified"
  | "deferred";

export type GoalMilestone = {
  id: string;
  userId: string;
  goalId: string;
  title: string;
  description: string | null;
  targetDate: string | null;
  status: GoalMilestoneStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type GoalCriterionEvaluation = {
  id: string;
  userId: string;
  criterionId: string;
  deferred: boolean;
  booleanValue: boolean | null;
  numericValue: number | null;
  unit: string | null;
  evaluatedAt: string;
  note: string | null;
  createdAt: string;
};

export type GoalOutcomeCriterion = {
  id: string;
  userId: string;
  goalId: string;
  goalMilestoneId: string | null;
  title: string;
  criterionType: GoalCriterionType;
  unit: string | null;
  target: number | null;
  direction: GoalCriterionDirection | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  evaluations: readonly GoalCriterionEvaluation[];
  latestEvaluation: GoalCriterionEvaluation | null;
};

export type GoalOutcomeSupportLink = {
  id: string;
  goalId: string;
  goalMilestoneId: string;
  targetId: string;
  targetTitle: string;
  createdAt: string;
};

export type GoalOutcomeSummary = {
  goalId: string;
  activeCriteriaCount: number;
  metCriteriaCount: number;
  unverifiedCriteriaCount: number;
  deferredCriteriaCount: number;
  activeMilestoneCount: number;
  achievedMilestoneCount: number;
  readyToAchieve: boolean;
  blockers: readonly string[];
  status: "draft" | "active" | "paused" | "achieved" | "archived";
  achievedAt: string | null;
};

export type GoalOutcome = {
  goalId: string;
  goalTitle: string;
  goalStatus: GoalOutcomeSummary["status"];
  achievedAt: string | null;
  achievementNote: string | null;
  milestones: readonly GoalMilestone[];
  criteria: readonly GoalOutcomeCriterion[];
  projectSupport: readonly GoalOutcomeSupportLink[];
  taskSupport: readonly GoalOutcomeSupportLink[];
  summary: GoalOutcomeSummary;
};

function numericValue(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function criterionEvaluationState(
  criterion: Pick<
    GoalOutcomeCriterion,
    "criterionType" | "target" | "direction"
  >,
  evaluation: Pick<
    GoalCriterionEvaluation,
    "booleanValue" | "numericValue" | "deferred"
  > | null | undefined,
): GoalCriterionEvaluationState {
  if (!evaluation) return "unverified";
  if (evaluation.deferred) return "deferred";

  if (criterion.criterionType === "boolean") {
    return evaluation.booleanValue === true ? "met" : "not_met";
  }

  const current = numericValue(evaluation.numericValue);
  const target = numericValue(criterion.target);
  if (current === null || target === null || !criterion.direction) {
    return "unverified";
  }

  if (criterion.direction === "at_least") {
    return current >= target ? "met" : "not_met";
  }
  if (criterion.direction === "at_most") {
    return current <= target ? "met" : "not_met";
  }
  return current === target ? "met" : "not_met";
}

export function buildGoalOutcomeSummary(
  outcome: Pick<GoalOutcome, "goalId" | "goalStatus" | "achievedAt" | "milestones" | "criteria">,
): GoalOutcomeSummary {
  const activeCriteria = outcome.criteria.filter((criterion) => !criterion.archivedAt);
  const activeMilestones = outcome.milestones.filter((milestone) => !milestone.archivedAt);
  const metCriteriaCount = activeCriteria.filter(
    (criterion) => criterionEvaluationState(criterion, criterion.latestEvaluation) === "met",
  ).length;
  const unverifiedCriteriaCount = activeCriteria.filter(
    (criterion) => criterionEvaluationState(criterion, criterion.latestEvaluation) === "unverified",
  ).length;
  const deferredCriteriaCount = activeCriteria.filter(
    (criterion) => criterionEvaluationState(criterion, criterion.latestEvaluation) === "deferred",
  ).length;
  const blockers: string[] = [];

  if (activeCriteria.length === 0) blockers.push("Mindestens ein aktives Kriterium definieren.");
  if (activeCriteria.some(
    (criterion) => criterionEvaluationState(criterion, criterion.latestEvaluation) !== "met",
  )) {
    blockers.push(`${metCriteriaCount} von ${activeCriteria.length} Kriterien erfüllt.`);
  }
  if (deferredCriteriaCount > 0) {
    blockers.push(`${deferredCriteriaCount} Kriterium/Kriterien deferred.`);
  }
  const unfinishedMilestones = activeMilestones.filter(
    (milestone) => milestone.status !== "achieved",
  );
  if (unfinishedMilestones.length > 0) {
    blockers.push(`${unfinishedMilestones.length} Milestone(s) noch nicht erreicht.`);
  }

  return {
    goalId: outcome.goalId,
    activeCriteriaCount: activeCriteria.length,
    metCriteriaCount,
    unverifiedCriteriaCount,
    deferredCriteriaCount,
    activeMilestoneCount: activeMilestones.length,
    achievedMilestoneCount: activeMilestones.length - unfinishedMilestones.length,
    readyToAchieve: blockers.length === 0,
    blockers,
    status: outcome.goalStatus,
    achievedAt: outcome.achievedAt,
  };
}

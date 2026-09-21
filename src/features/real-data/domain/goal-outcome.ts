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
  recordedAt?: string;
  note: string | null;
  createdAt: string;
  goalIdSnapshot?: string | null;
  goalMilestoneIdSnapshot?: string | null;
  criterionTitleSnapshot?: string | null;
  criterionTypeSnapshot?: GoalCriterionType | null;
  unitSnapshot?: string | null;
  targetSnapshot?: number | null;
  directionSnapshot?: GoalCriterionDirection | null;
  revisionKind?: "evaluation" | "correction" | "retraction";
  supersedesEvaluationId?: string | null;
  correctionReason?: string | null;
  retracted?: boolean;
  retrospective?: boolean;
  legacyState?: Record<string, unknown> | null;
  evidence?: readonly GoalEvidenceReference[];
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

export type GoalEvidenceSourceType =
  | "task"
  | "project"
  | "project_milestone"
  | "resource"
  | "review_record"
  | "goal_criterion_evaluation";

export type GoalEvidenceReference = {
  id: string;
  referenceGroupId: string;
  action: "attached" | "replaced" | "withdrawn";
  sourceType: GoalEvidenceSourceType;
  sourceId: string;
  sourceTitle: string;
  sourceContext: Record<string, unknown> | null;
  supersedesReferenceId: string | null;
  reason: string | null;
  occurredAt: string | null;
  recordedAt: string;
};

export type GoalMilestoneAchievementEvent = {
  id: string;
  goalId: string;
  milestoneId: string;
  episodeId: string;
  eventType: "achieved" | "reopened" | "amended";
  occurredAt: string | null;
  recordedAt: string;
  goalTitleSnapshot: string | null;
  milestoneTitleSnapshot: string | null;
  milestoneDescriptionSnapshot: string | null;
  priorStatus: GoalMilestoneStatus | null;
  resultingStatus: GoalMilestoneStatus | null;
  note: string | null;
  legacyState: Record<string, unknown> | null;
  correctsEventId: string | null;
  correctionReason: string | null;
  retrospective: boolean;
  commandId: string | null;
  evidence: readonly GoalEvidenceReference[];
};

export type GoalAchievementCriterionBasis = {
  criterionId: string;
  evaluationId: string | null;
  criterionTitleSnapshot: string | null;
  criterionTypeSnapshot: GoalCriterionType | null;
  goalMilestoneIdSnapshot: string | null;
  unitSnapshot: string | null;
  targetSnapshot: number | null;
  directionSnapshot: GoalCriterionDirection | null;
  evaluationStateSnapshot: string | null;
  evaluationOccurredAt: string | null;
  legacyState: Record<string, unknown> | null;
};

export type GoalAchievementMilestoneBasis = {
  milestoneId: string;
  achievementEpisodeId: string | null;
  milestoneTitleSnapshot: string | null;
  resultingStatusSnapshot: GoalMilestoneStatus | null;
  legacyState: Record<string, unknown> | null;
};

export type GoalAchievementEvent = {
  id: string;
  goalId: string;
  episodeId: string;
  eventType: "achieved" | "reopened" | "amended";
  occurredAt: string | null;
  recordedAt: string;
  goalTitleSnapshot: string | null;
  goalDescriptionSnapshot: string | null;
  goalWhySnapshot: string | null;
  priorStatus: "draft" | "active" | "paused" | "achieved" | "archived" | null;
  resultingStatus: "draft" | "active" | "paused" | "achieved" | "archived" | null;
  achievementNote: string | null;
  legacyState: Record<string, unknown> | null;
  correctsEventId: string | null;
  correctionReason: string | null;
  retrospective: boolean;
  commandId: string | null;
  criterionBasis: readonly GoalAchievementCriterionBasis[];
  milestoneBasis: readonly GoalAchievementMilestoneBasis[];
  evidence: readonly GoalEvidenceReference[];
};

export type GoalPathTaskContext = {
  id: string;
  title: string;
  status: string;
  projectId: string | null;
  plannedDate: string | null;
  dueAt: string | null;
  archivedAt: string | null;
};

export type GoalPathProjectContext = {
  id: string;
  title: string;
  status: string;
  nextStep: string | null;
  targetDate: string | null;
  archivedAt: string | null;
};

export type GoalNextStepCue = {
  kind: "task" | "project" | "goal";
  id: string | null;
  title: string;
  href: string | null;
  reason: string;
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
  goalDescription: string | null;
  goalWhy: string | null;
  goalHorizon: string | null;
  targetDate: string | null;
  updatedAt: string;
  goalStatus: GoalOutcomeSummary["status"];
  achievedAt: string | null;
  achievementNote: string | null;
  milestones: readonly GoalMilestone[];
  criteria: readonly GoalOutcomeCriterion[];
  projectSupport: readonly GoalOutcomeSupportLink[];
  taskSupport: readonly GoalOutcomeSupportLink[];
  projects: readonly GoalPathProjectContext[];
  tasks: readonly GoalPathTaskContext[];
  nextStep: GoalNextStepCue;
  milestoneHistory: readonly GoalMilestoneAchievementEvent[];
  achievementHistory: readonly GoalAchievementEvent[];
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
  if ("retracted" in evaluation && evaluation.retracted) return "unverified";
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

const readyTaskStatuses = new Set(["inbox", "planned", "active", "waiting", "someday"]);

function taskSortScore(task: GoalPathTaskContext) {
  const statusScore = task.status === "active" ? 0 : task.status === "planned" ? 1 : 2;
  const date = task.dueAt ?? task.plannedDate ?? "9999-12-31";
  return `${statusScore}:${date}:${task.title.toLocaleLowerCase()}:${task.id}`;
}

export function deriveGoalNextStep(input: {
  goalId: string;
  goalStatus: GoalOutcomeSummary["status"];
  tasks: readonly GoalPathTaskContext[];
  projects: readonly GoalPathProjectContext[];
}): GoalNextStepCue {
  const activeTasks = input.tasks
    .filter((task) => !task.archivedAt && readyTaskStatuses.has(task.status))
    .sort((left, right) => taskSortScore(left).localeCompare(taskSortScore(right)));
  const task = activeTasks[0];
  if (task) {
    return {
      kind: "task",
      id: task.id,
      title: task.title,
      href: `/tasks/${task.id}`,
      reason: task.status === "active" ? "Bereits aktiver nächster Task." : "Bereits geplanter nächster Task." ,
    };
  }

  const project = input.projects
    .filter((candidate) => !candidate.archivedAt && candidate.status !== "completed" && candidate.status !== "archived")
    .sort((left, right) => `${left.status}:${left.targetDate ?? "9999-12-31"}:${left.title}`.localeCompare(`${right.status}:${right.targetDate ?? "9999-12-31"}:${right.title}`))[0];
  if (project) {
    return {
      kind: "project",
      id: project.id,
      title: project.nextStep?.trim() || project.title,
      href: `/projects/${project.id}`,
      reason: project.nextStep?.trim() ? "Next Step aus dem kanonischen Project-Kontext." : "Project-Kontext als nächster sichtbarer Schritt.",
    };
  }

  return {
    kind: "goal",
    id: input.goalId,
    title: input.goalStatus === "achieved" ? "Outcome und Verlauf prüfen." : "Einen nächsten Task oder ein Project aus diesem Goal anlegen.",
    href: `/goals/${input.goalId}#weg-zum-ziel`,
    reason: input.goalStatus === "achieved" ? "Goal ist erreicht; der Verlauf bleibt die führende Orientierung." : "Noch kein kanonischer Task- oder Project-Schritt vorhanden.",
  };
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

  if (outcome.goalStatus !== "active") {
    blockers.push("Nur aktive Goals können erreicht werden. Goal zuerst aktivieren.");
  }

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

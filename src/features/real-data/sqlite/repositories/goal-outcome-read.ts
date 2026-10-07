import "server-only";
import type Database from "better-sqlite3";
import type {
  GoalAchievementEvent,
  GoalMilestoneAchievementEvent,
  GoalCriterionEvaluation,
  GoalOutcomeCriterion,
  GoalEvidenceReference,
  GoalMilestone,
  GoalOutcome,
  GoalOutcomeSupportLink,
} from "../../domain/goal-outcome";
import {
  buildGoalOutcomeSummary,
  deriveGoalNextStep,
  projectGoalEvidenceReferences,
  correctionChainEventIds,
  latestGoalAchievementEventInEpisode,
  latestGoalMilestoneAchievementEventInEpisode,
  resolveGoalAchievementBasisEventId,
} from "../../domain/goal-outcome";
import type { TaskDependencyGraph } from "../../domain/task-dependencies";
import { decimal, decimalFromNumber, safeNumber } from "../codecs";
import type { GoalRow } from "../goal-invariants";
import { goalRow, goalRows, requireGoalRow } from "../commands/goal-commands";

const str = (value: GoalRow[string]) => (value === null ? null : String(value));
const json = (value: GoalRow[string]) =>
  value === null
    ? null
    : (JSON.parse(String(value)) as Record<string, unknown>);
// UI Number fields are compatibility projections. Retain exact decimal fields;
// unrepresentable values become null rather than silently rounded numbers.
const number = (value: GoalRow[string]) => {
  if (value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) && decimalFromNumber(n) === decimal(String(value))
    ? n
    : null;
};
export const mapGoalMilestone = (r: GoalRow): GoalMilestone => ({
  id: String(r.id),
  userId: String(r.user_id),
  goalId: String(r.goal_id),
  title: String(r.title),
  description: str(r.description),
  targetDate: str(r.target_date),
  status: r.status as GoalMilestone["status"],
  sortOrder: safeNumber(r.sort_order as bigint),
  createdAt: String(r.created_at),
  updatedAt: String(r.updated_at),
  archivedAt: str(r.archived_at),
});
export const mapGoalEvaluation = (r: GoalRow): GoalCriterionEvaluation => ({
  id: String(r.id),
  userId: String(r.user_id),
  criterionId: String(r.criterion_id),
  deferred: !!r.is_deferred,
  booleanValue: r.boolean_value === null ? null : !!r.boolean_value,
  numericValue: number(r.numeric_value),
  numericValueExact: str(r.numeric_value),
  unit: str(r.unit),
  evaluatedAt: String(r.evaluated_at),
  recordedAt: String(r.recorded_at),
  note: str(r.note),
  createdAt: String(r.created_at),
  goalIdSnapshot: str(r.goal_id_snapshot),
  goalMilestoneIdSnapshot: str(r.goal_milestone_id_snapshot),
  criterionTitleSnapshot: str(r.criterion_title_snapshot),
  criterionTypeSnapshot:
    r.criterion_type_snapshot as GoalCriterionEvaluation["criterionTypeSnapshot"],
  unitSnapshot: str(r.unit_snapshot),
  targetSnapshot: number(r.target_snapshot),
  targetSnapshotExact: str(r.target_snapshot),
  directionSnapshot:
    r.direction_snapshot as GoalCriterionEvaluation["directionSnapshot"],
  revisionKind: r.revision_kind as GoalCriterionEvaluation["revisionKind"],
  supersedesEvaluationId: str(r.supersedes_evaluation_id),
  correctionReason: str(r.correction_reason),
  retracted: !!r.is_retracted,
  retrospective: !!r.retrospective,
  legacyState: json(r.legacy_state),
  evidence: [],
  evidenceHistory: [],
});
export const mapGoalCriterion = (
  r: GoalRow,
  evaluations: readonly GoalCriterionEvaluation[] = [],
): GoalOutcomeCriterion => ({
  id: String(r.id),
  userId: String(r.user_id),
  goalId: String(r.goal_id),
  goalMilestoneId: str(r.goal_milestone_id),
  title: String(r.title),
  criterionType: r.criterion_type as GoalOutcomeCriterion["criterionType"],
  unit: str(r.unit),
  target: number(r.target),
  targetExact: str(r.target),
  direction: r.direction as GoalOutcomeCriterion["direction"],
  createdAt: String(r.created_at),
  updatedAt: String(r.updated_at),
  archivedAt: str(r.archived_at),
  evaluations,
  latestEvaluation: evaluations[0] ?? null,
});
const mapEvidence = (r: GoalRow): GoalEvidenceReference => ({
  id: String(r.id),
  referenceGroupId: String(r.reference_group_id),
  action: r.reference_action as GoalEvidenceReference["action"],
  sourceType: r.source_type as GoalEvidenceReference["sourceType"],
  sourceId: String(r.source_id),
  sourceTitle: String(r.source_title_snapshot ?? ""),
  sourceContext: json(r.source_context_snapshot),
  supersedesReferenceId: str(r.supersedes_reference_id),
  reason: str(r.reason),
  retrospective: !!r.retrospective,
  occurredAt: str(r.occurred_at),
  recordedAt: String(r.recorded_at),
});

export function readGoalOutcome(
  db: Database.Database,
  owner: string,
  id: string,
  dependencyGraph?: TaskDependencyGraph,
): GoalOutcome {
  const goal = requireGoalRow(
    goalRow(db, "SELECT * FROM goals WHERE user_id=? AND id=?", owner, id),
    "GOAL_NOT_FOUND",
  );
  const milestones = goalRows(
    db,
    "SELECT * FROM goal_milestones WHERE user_id=? AND goal_id=? ORDER BY sort_order,created_at,id",
    owner,
    id,
  ).map(mapGoalMilestone);
  const evidence = (table: string, join: string, goalPredicate: string) =>
    goalRows(
      db,
      `SELECT r.* FROM ${table} r ${join} WHERE r.user_id=? AND ${goalPredicate}=?`,
      owner,
      id,
    );
  const criterionEvidence = evidence(
    "goal_criterion_evaluation_evidence",
    "JOIN goal_criterion_evaluations e ON e.id=r.evaluation_id AND e.user_id=r.user_id JOIN goal_outcome_criteria c ON c.id=e.criterion_id AND c.user_id=e.user_id",
    "c.goal_id",
  );
  const evaluations = goalRows(
    db,
    "SELECT e.* FROM goal_criterion_evaluations e JOIN goal_outcome_criteria c ON c.id=e.criterion_id AND c.user_id=e.user_id WHERE e.user_id=? AND c.goal_id=? ORDER BY e.evaluated_at DESC,e.recorded_at DESC,e.created_at DESC,e.id DESC",
    owner,
    id,
  ).map((r) => {
    const mapped = mapGoalEvaluation(r),
      ledger = projectGoalEvidenceReferences(
        criterionEvidence
          .filter((e) => e.evaluation_id === r.id)
          .map(mapEvidence),
      );
    return {
      ...mapped,
      evidence: ledger.active,
      evidenceHistory: ledger.history,
    };
  });
  const criteria = goalRows(
    db,
    "SELECT * FROM goal_outcome_criteria WHERE user_id=? AND goal_id=? ORDER BY created_at,id",
    owner,
    id,
  ).map((r) =>
    mapGoalCriterion(
      r,
      evaluations.filter((e) => e.criterionId === r.id),
    ),
  );
  const milestoneEvents = goalRows(
    db,
    "SELECT * FROM goal_milestone_achievement_events WHERE user_id=? AND goal_id=? ORDER BY occurred_at DESC NULLS LAST,recorded_at DESC,id DESC",
    owner,
    id,
  );
  const goalEvents = goalRows(
    db,
    "SELECT * FROM goal_achievement_events WHERE user_id=? AND goal_id=? ORDER BY occurred_at DESC NULLS LAST,recorded_at DESC,id DESC",
    owner,
    id,
  );
  const milestoneEvidence = evidence(
    "goal_milestone_achievement_evidence",
    "JOIN goal_milestone_achievement_events e ON e.user_id=r.user_id AND e.id=r.achievement_event_id",
    "e.goal_id",
  );
  const achievementEvidence = evidence(
    "goal_achievement_evidence",
    "JOIN goal_achievement_events e ON e.user_id=r.user_id AND e.id=r.achievement_event_id",
    "e.goal_id",
  );
  const criterionBasis = evidence(
    "goal_achievement_criterion_basis",
    "JOIN goal_achievement_events e ON e.user_id=r.user_id AND e.id=r.achievement_event_id",
    "e.goal_id",
  );
  const milestoneBasis = evidence(
    "goal_achievement_milestone_basis",
    "JOIN goal_achievement_events e ON e.user_id=r.user_id AND e.id=r.achievement_event_id",
    "e.goal_id",
  );
  const commonEvent = (r: GoalRow) => ({
    id: String(r.id),
    goalId: String(r.goal_id),
    episodeId: String(r.episode_id),
    eventType: r.event_type as GoalAchievementEvent["eventType"],
    occurredAt: str(r.occurred_at),
    recordedAt: String(r.recorded_at),
    goalTitleSnapshot: str(r.goal_title_snapshot),
    legacyState: json(r.legacy_state),
    correctsEventId: str(r.corrects_event_id),
    correctionReason: str(r.correction_reason),
    retrospective: !!r.retrospective,
    commandId: str(r.command_id),
  });
  const milestoneLocal: GoalMilestoneAchievementEvent[] = milestoneEvents.map(
    (r) => {
      const ledger = projectGoalEvidenceReferences(
        milestoneEvidence
          .filter((e) => e.achievement_event_id === r.id)
          .map(mapEvidence),
      );
      return {
        ...commonEvent(r),
        milestoneId: String(r.goal_milestone_id),
        milestoneTitleSnapshot: str(r.goal_milestone_title_snapshot),
        milestoneDescriptionSnapshot: str(
          r.goal_milestone_description_snapshot,
        ),
        priorStatus: r.prior_status as GoalMilestone["status"],
        resultingStatus: r.resulting_status as GoalMilestone["status"],
        note: str(r.note),
        evidence: ledger.active,
        evidenceHistory: ledger.history,
      };
    },
  );
  const goalLocal: GoalAchievementEvent[] = goalEvents.map((r) => {
    const root = resolveGoalAchievementBasisEventId(
      String(r.id),
      goalEvents.map((e) => ({
        id: String(e.id),
        correctsEventId: str(e.corrects_event_id),
      })),
    );
    const ledger = projectGoalEvidenceReferences(
      achievementEvidence
        .filter((e) => e.achievement_event_id === r.id)
        .map(mapEvidence),
    );
    return {
      ...commonEvent(r),
      priorStatus: r.prior_status as GoalAchievementEvent["priorStatus"],
      resultingStatus:
        r.resulting_status as GoalAchievementEvent["resultingStatus"],
      achievementNote: str(r.achievement_note),
      evidence: ledger.active,
      evidenceHistory: ledger.history,
      criterionBasis: criterionBasis
        .filter((b) => b.achievement_event_id === root)
        .map((b) => ({
          criterionId: String(b.criterion_id),
          evaluationId: str(b.evaluation_id),
          criterionTitleSnapshot: str(b.criterion_title_snapshot),
          criterionTypeSnapshot:
            b.criterion_type_snapshot as GoalOutcomeCriterion["criterionType"],
          goalMilestoneIdSnapshot: str(b.goal_milestone_id_snapshot),
          unitSnapshot: str(b.unit_snapshot),
          targetSnapshot: number(b.target_snapshot),
          targetSnapshotExact: str(b.target_snapshot),
          directionSnapshot:
            b.direction_snapshot as GoalOutcomeCriterion["direction"],
          evaluationStateSnapshot: str(b.evaluation_state_snapshot),
          evaluationOccurredAt: str(b.evaluation_occurred_at),
          legacyState: json(b.legacy_state),
        })),
      milestoneBasis: milestoneBasis
        .filter((b) => b.achievement_event_id === root)
        .map((b) => ({
          milestoneId: String(b.milestone_id),
          achievementEpisodeId: str(b.achievement_episode_id),
          milestoneTitleSnapshot: str(b.milestone_title_snapshot),
          resultingStatusSnapshot:
            b.resulting_status_snapshot as GoalMilestone["status"],
          legacyState: json(b.legacy_state),
        })),
    };
  });
  const milestoneHistory = milestoneLocal.map((e) => {
    if (
      latestGoalMilestoneAchievementEventInEpisode(milestoneLocal, e.episodeId)
        ?.id !== e.id
    )
      return e;
    const ids = new Set(correctionChainEventIds(e.id, milestoneLocal));
    const ledger = projectGoalEvidenceReferences(
      milestoneEvidence
        .filter((r) => ids.has(String(r.achievement_event_id)))
        .map(mapEvidence),
    );
    return { ...e, evidence: ledger.active, evidenceHistory: ledger.history };
  });
  const achievementHistory = goalLocal.map((e) => {
    if (
      latestGoalAchievementEventInEpisode(goalLocal, e.episodeId)?.id !== e.id
    )
      return e;
    const ids = new Set(correctionChainEventIds(e.id, goalLocal));
    const ledger = projectGoalEvidenceReferences(
      achievementEvidence
        .filter((r) => ids.has(String(r.achievement_event_id)))
        .map(mapEvidence),
    );
    return { ...e, evidence: ledger.active, evidenceHistory: ledger.history };
  });
  const projects = goalRows(
    db,
    "SELECT * FROM projects WHERE user_id=? AND goal_id=?",
    owner,
    id,
  ).map((p) => ({
    id: String(p.id),
    title: String(p.title),
    status: String(p.status),
    nextStep: str(p.next_step),
    targetDate: str(p.target_date),
    archivedAt: str(p.archived_at),
  }));
  const tasks = goalRows(
    db,
    "SELECT t.* FROM tasks t LEFT JOIN projects p ON p.id=t.project_id AND p.user_id=t.user_id WHERE t.user_id=? AND (t.goal_id=? OR p.goal_id=?)",
    owner,
    id,
    id,
  ).map((t) => ({
    id: String(t.id),
    title: String(t.title),
    status: String(t.status),
    projectId: str(t.project_id),
    plannedDate: str(t.planned_date),
    dueAt: str(t.due_at),
    archivedAt: str(t.archived_at),
  }));
  const support = (family: "project" | "task"): GoalOutcomeSupportLink[] =>
    goalRows(
      db,
      `SELECT s.*,t.title AS target_title FROM goal_milestone_${family}_support s JOIN ${family === "project" ? "projects" : "tasks"} t ON t.user_id=s.user_id AND t.id=s.${family}_id WHERE s.user_id=? AND s.goal_id=?`,
      owner,
      id,
    ).map((r) => ({
      id: String(r.id),
      goalId: id,
      goalMilestoneId: String(r.goal_milestone_id),
      targetId: String(r[`${family}_id`]),
      targetTitle: String(r.target_title),
      createdAt: String(r.created_at),
    }));
  const goalStatus = goal.status as GoalOutcome["goalStatus"],
    achievedAt = str(goal.achieved_at);
  return {
    goalId: id,
    goalTitle: String(goal.title),
    goalDescription: str(goal.description),
    goalWhy: str(goal.why),
    goalHorizon: str(goal.horizon),
    targetDate: str(goal.target_date),
    updatedAt: String(goal.updated_at),
    goalStatus,
    achievedAt,
    achievementNote: str(goal.achievement_note),
    milestones,
    criteria,
    projects,
    tasks,
    projectSupport: support("project"),
    taskSupport: support("task"),
    milestoneHistory,
    achievementHistory,
    summary: buildGoalOutcomeSummary({
      goalId: id,
      goalStatus,
      achievedAt,
      milestones,
      criteria,
    }),
    nextStep: deriveGoalNextStep({
      goalId: id,
      goalStatus,
      projects,
      tasks,
      dependencyGraph,
    }),
  };
}

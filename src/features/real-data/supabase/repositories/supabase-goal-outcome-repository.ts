import { createHash, randomUUID } from "node:crypto";
import type {
  GoalAchievementCriterionBasis,
  GoalAchievementEvent,
  GoalAchievementMilestoneBasis,
  GoalCriterionEvaluation,
  GoalEvidenceReference,
  GoalMilestoneAchievementEvent,
  GoalMilestone,
  GoalOutcome,
  GoalOutcomeCriterion,
  GoalOutcomeSupportLink,
} from "../../domain/goal-outcome";
import {
  buildGoalOutcomeSummary,
  correctionChainEventIds,
  criterionEvaluationState,
  deriveGoalNextStep,
  latestGoalAchievementEventInEpisode,
  latestGoalMilestoneAchievementEventInEpisode,
  projectGoalEvidenceReferences,
  resolveGoalAchievementBasisEventId,
} from "../../domain/goal-outcome";
import type { TaskDependencyGraph } from "../../domain/task-dependencies";
import type {
  GoalAchieveInput,
  GoalAchievementAmendInput,
  GoalAchievementEvidenceInput,
  GoalCriterionEvaluationInput,
  GoalCriterionEvidenceInput,
  GoalMilestoneArchiveInput,
  GoalMilestoneCreateInput,
  GoalMilestoneReorderInput,
  GoalMilestoneStatusInput,
  GoalMilestoneUpdateInput,
  GoalOutcomeCriterionArchiveInput,
  GoalOutcomeCriterionCreateInput,
  GoalProjectSupportInput,
  GoalReopenInput,
  GoalMilestoneEvidenceInput,
  GoalMilestoneAmendInput,
  GoalSupportRemoveInput,
  GoalTaskSupportInput,
} from "../../schemas/goal-outcome.schemas";
import type {
  RepositoryListResult,
  RepositoryResult,
} from "../../repositories/repository-result";
import type {
  SupabaseClientLike,
  SupabaseQueryResult,
  TableRow,
} from "../database.types";
import type {
  GoalCriterionEvaluationRow,
  GoalMilestoneRow,
  GoalOutcomeCriterionRow,
  GoalMilestoneProjectSupportRow,
  GoalMilestoneTaskSupportRow,
  GoalRow,
  GoalAchievementCriterionBasisRow,
  GoalAchievementEventRow,
  GoalAchievementMilestoneBasisRow,
  GoalAchievementEvidenceRow,
  GoalCriterionEvaluationEvidenceRow,
  GoalMilestoneAchievementEventRow,
  GoalMilestoneAchievementEvidenceRow,
} from "../row-types";

type GoalSummaryRow = Pick<
  GoalRow,
  | "id"
  | "title"
  | "description"
  | "why"
  | "horizon"
  | "target_date"
  | "status"
  | "achieved_at"
  | "achievement_note"
  | "updated_at"
  | "archived_at"
>;
type ProjectTitleRow = Pick<
  TableRow<"projects">,
  | "id"
  | "title"
  | "goal_id"
  | "status"
  | "next_step"
  | "target_date"
  | "archived_at"
>;
type TaskTitleRow = Pick<
  TableRow<"tasks">,
  | "id"
  | "title"
  | "goal_id"
  | "project_id"
  | "status"
  | "planned_date"
  | "due_at"
  | "archived_at"
>;

type OutcomeFailure = RepositoryResult<never>;

function failure(
  code: "adapter_unavailable" | "conflict" | "forbidden" | "not_found",
  message: string,
): OutcomeFailure {
  return { error: { code, message }, ok: false };
}

function dbFailure(
  operation: string,
  error?: { message?: string | null },
): OutcomeFailure {
  const message = error?.message ?? "";
  const known: Record<string, string> = {
    GOAL_ACHIEVEMENT_REQUIRES_ACTIVE:
      "Nur aktive Goals können erreicht werden. Goal zuerst aktivieren.",
    GOAL_ACHIEVEMENT_NO_ACTIVE_CRITERIA:
      "Mindestens ein aktives Kriterium ist erforderlich.",
    GOAL_ACHIEVEMENT_CRITERIA_NOT_MET:
      "Alle aktiven Kriterien müssen erfüllt sein.",
    GOAL_ACHIEVEMENT_MILESTONES_NOT_ACHIEVED:
      "Alle nicht archivierten Etappen müssen erreicht sein.",
    GOAL_ACHIEVEMENT_GOAL_ARCHIVED:
      "Ein archiviertes Goal kann nicht erreicht werden.",
    GOAL_ARCHIVED: "Ein archiviertes Goal kann nicht verändert werden.",
    GOAL_CRITERION_ARCHIVED:
      "Ein archiviertes Kriterium kann nicht bewertet werden.",
    GOAL_CRITERION_ACHIEVED_REQUIRES_REOPEN:
      "Öffne das Ziel zuerst wieder, bevor du das Kriterium änderst.",
    GOAL_DEFERRED_EVALUATION_SHAPE:
      "Deferred-Bewertungen dürfen keinen Wert oder keine Einheit enthalten.",
    GOAL_NUMERIC_EVALUATION_UNIT:
      "Die Einheit der Bewertung muss exakt zum Kriterium passen.",
    GOAL_BOOLEAN_EVALUATION_SHAPE:
      "Boolean-Kriterien akzeptieren nur true oder false.",
    GOAL_PROJECT_SUPPORT_TARGET_INVALID:
      "Das Project gehört nicht zu diesem Goal oder ist archiviert.",
    GOAL_TASK_SUPPORT_TARGET_INVALID:
      "Der Task gehört nicht mehr zum aktiven Benutzerkontext.",
    GOAL_TASK_SUPPORT_GOAL_CONFLICT:
      "Der Task hat widersprüchliche direkte und geerbte Goal-Zuordnungen.",
    GOAL_TASK_SUPPORT_GOAL_MISMATCH: "Der Task gehört nicht zu diesem Goal.",
    GOAL_MILESTONE_ARCHIVED:
      "Eine archivierte Etappe kann nicht verknüpft werden.",
    GOAL_MILESTONE_STATUS_TRANSITION_INVALID:
      "Dieser Etappenstatuswechsel ist im akzeptierten Lebenszyklus nicht erlaubt.",
    GOAL_STALE_STATE:
      "Der Stand hat sich geändert. Lade das Goal neu und wiederhole die Entscheidung.",
    GOAL_COMMAND_FINGERPRINT_MISMATCH:
      "Diese Entscheidung wurde bereits mit einem anderen Inhalt verwendet.",
    GOAL_MILESTONE_ACHIEVE_REQUIRES_ACTIVE:
      "Eine Etappe muss aktiv sein, bevor sie erreicht werden kann.",
    GOAL_MILESTONE_OPEN_EPISODE_NOT_FOUND:
      "Für diese Etappe wurde keine offene Erreichungsepisode gefunden.",
    GOAL_OPEN_EPISODE_NOT_FOUND:
      "Für dieses Goal wurde keine offene Erreichungsepisode gefunden.",
    GOAL_REOPEN_REQUIRES_ACHIEVED:
      "Nur ein erreichtes Goal kann wieder geöffnet werden.",
    GOAL_MILESTONE_EVENT_NOT_FOUND:
      "Die Etappenentscheidung ist im aktuellen Benutzerkontext nicht verfügbar.",
    GOAL_EVENT_NOT_FOUND:
      "Die Zielentscheidung ist im aktuellen Benutzerkontext nicht verfügbar.",
    GOAL_EVENT_CORRECTION_REASON_REQUIRED:
      "Für eine Verlaufsänderung ist ein Begründung erforderlich.",
    GOAL_EVIDENCE_ACTION_INVALID: "Diese Belegänderung ist nicht erlaubt.",
    GOAL_EVIDENCE_REFERENCE_REQUIRED:
      "Eine bestehende Belegreferenz muss ausgewählt werden.",
    GOAL_EVIDENCE_REFERENCE_NOT_FOUND:
      "Die zu ändernde Belegreferenz wurde nicht gefunden.",
    GOAL_EVIDENCE_REFERENCE_ALREADY_SUPERSEDED:
      "Diese Belegreferenz wurde bereits korrigiert; verwende die letzte Referenz der Kette.",
    GOAL_EVIDENCE_REASON_REQUIRED:
      "Für Ersetzen, Zurücknehmen oder retrospektives Ergänzen ist ein Grund erforderlich.",
    GOAL_EVIDENCE_SOURCE_REQUIRED:
      "Für diese Belegänderung muss eine aktive Quelle ausgewählt werden.",
    GOAL_EVIDENCE_REPLACEMENT_SAME_SOURCE:
      "Ein Ersatz muss auf eine neue zulässige Quelle zeigen.",
    GOAL_RETROSPECTIVE_SUPPLEMENT_REQUIRED:
      "Retrospektive Ergänzungen müssen ausdrücklich markiert werden.",
    GOAL_EVIDENCE_SOURCE_INVALID:
      "Die Belegquelle ist nicht mehr aktiv oder gehört nicht zum aktuellen Benutzer.",
    GOAL_EVIDENCE_SOURCE_TYPE_INVALID:
      "Dieser Belegtyp ist für diese Entscheidung nicht erlaubt.",
    GOAL_CONTEXT_AREA_INVALID:
      "Die Area gehört nicht zum aktuellen Benutzerkontext.",
  };
  const knownMessage = Object.entries(known).find(([key]) =>
    message.includes(key),
  )?.[1];
  if (knownMessage) return failure("conflict", knownMessage);
  return failure("adapter_unavailable", `Unable to ${operation}.`);
}

function notFound(entity: string): OutcomeFailure {
  return failure(
    "not_found",
    `${entity} wurde im aktuellen Benutzerkontext nicht gefunden.`,
  );
}

function forbidden(): OutcomeFailure {
  return failure(
    "forbidden",
    "Der angeforderte Scope gehört nicht zum aktuellen Benutzer.",
  );
}

function mapMilestone(row: GoalMilestoneRow): GoalMilestone {
  return {
    id: row.id,
    userId: row.user_id,
    goalId: row.goal_id,
    title: row.title,
    description: row.description,
    targetDate: row.target_date,
    status: row.status,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

function mapEvaluation(
  row: GoalCriterionEvaluationRow,
): GoalCriterionEvaluation {
  return {
    id: row.id,
    userId: row.user_id,
    criterionId: row.criterion_id,
    deferred: row.is_deferred,
    booleanValue: row.boolean_value,
    numericValue: row.numeric_value,
    unit: row.unit,
    evaluatedAt: row.evaluated_at,
    recordedAt: row.recorded_at,
    note: row.note,
    createdAt: row.created_at,
    goalIdSnapshot: row.goal_id_snapshot,
    goalMilestoneIdSnapshot: row.goal_milestone_id_snapshot,
    criterionTitleSnapshot: row.criterion_title_snapshot,
    criterionTypeSnapshot: row.criterion_type_snapshot,
    unitSnapshot: row.unit_snapshot,
    targetSnapshot: row.target_snapshot,
    directionSnapshot: row.direction_snapshot,
    revisionKind: row.revision_kind as GoalCriterionEvaluation["revisionKind"],
    supersedesEvaluationId: row.supersedes_evaluation_id,
    correctionReason: row.correction_reason,
    retracted: row.is_retracted,
    retrospective: row.retrospective,
    legacyState: asRecord(row.legacy_state),
    evidence: [],
    evidenceHistory: [],
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function sourceType(value: string): GoalEvidenceReference["sourceType"] {
  return value as GoalEvidenceReference["sourceType"];
}

function mapEvidence(
  row:
    | GoalCriterionEvaluationEvidenceRow
    | GoalMilestoneAchievementEvidenceRow
    | GoalAchievementEvidenceRow,
): GoalEvidenceReference {
  return {
    id: row.id,
    referenceGroupId: row.reference_group_id,
    action: row.reference_action as GoalEvidenceReference["action"],
    sourceType: sourceType(row.source_type),
    sourceId: row.source_id,
    sourceTitle: row.source_title_snapshot ?? "Unbenannte Quelle",
    sourceContext: asRecord(row.source_context_snapshot),
    supersedesReferenceId: row.supersedes_reference_id,
    reason: row.reason,
    retrospective: row.retrospective,
    occurredAt: row.occurred_at,
    recordedAt: row.recorded_at,
  };
}

function evidenceProjection(
  rows: readonly (
    | GoalCriterionEvaluationEvidenceRow
    | GoalMilestoneAchievementEvidenceRow
    | GoalAchievementEvidenceRow
  )[],
) {
  return projectGoalEvidenceReferences(rows.map(mapEvidence));
}

function effectiveEvidenceProjection<
  T extends {
    id: string;
    episode_id: string;
    corrects_event_id: string | null;
  },
  E extends GoalMilestoneAchievementEvidenceRow | GoalAchievementEvidenceRow,
>(
  eventId: string,
  eventRows: readonly T[],
  evidenceRows: readonly E[],
) {
  const chainEventIds = new Set(
    correctionChainEventIds(
      eventId,
      eventRows.map((row) => ({
        id: row.id,
        episodeId: row.episode_id,
        correctsEventId: row.corrects_event_id,
      })),
    ),
  );
  return evidenceProjection(
    evidenceRows.filter((row) => chainEventIds.has(row.achievement_event_id)),
  );
}

export function projectEffectiveGoalAchievementEvidence(
  eventId: string,
  eventRows: readonly Pick<
    GoalAchievementEventRow,
    "id" | "episode_id" | "corrects_event_id"
  >[],
  evidenceRows: readonly GoalAchievementEvidenceRow[],
) {
  return effectiveEvidenceProjection(eventId, eventRows, evidenceRows);
}

export function projectEffectiveMilestoneAchievementEvidence(
  eventId: string,
  eventRows: readonly Pick<
    GoalMilestoneAchievementEventRow,
    "id" | "episode_id" | "corrects_event_id"
  >[],
  evidenceRows: readonly GoalMilestoneAchievementEvidenceRow[],
) {
  return effectiveEvidenceProjection(eventId, eventRows, evidenceRows);
}

function mapMilestoneEvent(
  row: GoalMilestoneAchievementEventRow,
  evidence: readonly GoalEvidenceReference[],
  evidenceHistory: readonly GoalEvidenceReference[],
): GoalMilestoneAchievementEvent {
  return {
    id: row.id,
    goalId: row.goal_id,
    milestoneId: row.goal_milestone_id,
    episodeId: row.episode_id,
    eventType: row.event_type as GoalMilestoneAchievementEvent["eventType"],
    occurredAt: row.occurred_at,
    recordedAt: row.recorded_at,
    goalTitleSnapshot: row.goal_title_snapshot,
    milestoneTitleSnapshot: row.goal_milestone_title_snapshot,
    milestoneDescriptionSnapshot: row.goal_milestone_description_snapshot,
    priorStatus: row.prior_status,
    resultingStatus: row.resulting_status,
    note: row.note,
    legacyState: asRecord(row.legacy_state),
    correctsEventId: row.corrects_event_id,
    correctionReason: row.correction_reason,
    retrospective: row.retrospective,
    commandId: row.command_id,
    evidence,
    evidenceHistory,
  };
}

function mapGoalAchievementEvent(
  row: GoalAchievementEventRow,
  criterionBasis: readonly GoalAchievementCriterionBasis[],
  milestoneBasis: readonly GoalAchievementMilestoneBasis[],
  evidence: readonly GoalEvidenceReference[],
  evidenceHistory: readonly GoalEvidenceReference[],
): GoalAchievementEvent {
  return {
    id: row.id,
    goalId: row.goal_id,
    episodeId: row.episode_id,
    eventType: row.event_type as GoalAchievementEvent["eventType"],
    occurredAt: row.occurred_at,
    recordedAt: row.recorded_at,
    goalTitleSnapshot: row.goal_title_snapshot,
    priorStatus: row.prior_status,
    resultingStatus: row.resulting_status,
    achievementNote: row.achievement_note,
    legacyState: asRecord(row.legacy_state),
    correctsEventId: row.corrects_event_id,
    correctionReason: row.correction_reason,
    retrospective: row.retrospective,
    commandId: row.command_id,
    criterionBasis,
    milestoneBasis,
    evidence,
    evidenceHistory,
  };
}

function fingerprint(commandKind: string, payload: Record<string, unknown>) {
  return createHash("sha256")
    .update(JSON.stringify({ commandKind, payload }))
    .digest("hex");
}

type GoalCommandResult = Record<string, unknown>;

export type GoalContextProjectInput = {
  userId: string;
  goalId: string;
  milestoneId: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  nextStep?: string;
  targetDate?: string;
  areaId?: string;
  commandId?: string;
};

export type GoalContextTaskInput = {
  userId: string;
  goalId: string;
  milestoneId: string;
  title: string;
  description?: string;
  priority?: string;
  energy?: string;
  plannedDate?: string;
  dueAt?: string;
  durationMinutes?: number;
  areaId?: string;
  commandId?: string;
};

async function executeGoalCommand(
  client: SupabaseClientLike,
  commandKind: string,
  payload: Record<string, unknown>,
  commandId?: string,
): Promise<RepositoryResult<GoalCommandResult>> {
  const id = commandId ?? randomUUID();
  const result = (await client.rpc("execute_goal_command", {
    p_command_kind: commandKind,
    p_command_id: id,
    p_request_fingerprint: fingerprint(commandKind, payload),
    p_payload: payload as unknown as import("@/types/supabase").Json,
  })) as SupabaseQueryResult<GoalCommandResult>;
  if (result.error) return dbFailure(`execute ${commandKind}`, result.error);
  return { ok: true, data: result.data ?? {} };
}

export async function createGoalContextProject(
  client: SupabaseClientLike,
  input: GoalContextProjectInput,
): Promise<RepositoryResult<{ id: string }>> {
  const scoped = scopeFailure(input);
  if (scoped) return scoped;
  const command = await executeGoalCommand(
    client,
    "project.context.create",
    {
      user_id: input.userId,
      goal_id: input.goalId,
      milestone_id: input.milestoneId,
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? "idea",
      priority: input.priority ?? "P2",
      next_step: input.nextStep ?? null,
      target_date: input.targetDate ?? null,
      area_id: input.areaId ?? null,
    },
    input.commandId,
  );
  if (!command.ok) return command;
  const id =
    typeof command.data.project_id === "string"
      ? command.data.project_id
      : null;
  return id
    ? { ok: true, data: { id } }
    : dbFailure("read created Goal Project");
}

export async function createGoalContextTask(
  client: SupabaseClientLike,
  input: GoalContextTaskInput,
): Promise<RepositoryResult<{ id: string }>> {
  const scoped = scopeFailure(input);
  if (scoped) return scoped;
  const command = await executeGoalCommand(
    client,
    "task.context.create",
    {
      user_id: input.userId,
      goal_id: input.goalId,
      milestone_id: input.milestoneId,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority ?? "P2",
      energy: input.energy ?? null,
      planned_date: input.plannedDate ?? null,
      due_at: input.dueAt ?? null,
      duration_minutes: input.durationMinutes ?? null,
      area_id: input.areaId ?? null,
    },
    input.commandId,
  );
  if (!command.ok) return command;
  const id =
    typeof command.data.task_id === "string" ? command.data.task_id : null;
  return id ? { ok: true, data: { id } } : dbFailure("read created Goal Task");
}

function mapCriterion(
  row: GoalOutcomeCriterionRow,
  evaluations: readonly GoalCriterionEvaluation[],
): GoalOutcomeCriterion {
  const criterionEvaluations = evaluations
    .filter((evaluation) => evaluation.criterionId === row.id)
    .sort(
      (left, right) =>
        right.evaluatedAt.localeCompare(left.evaluatedAt) ||
        (right.recordedAt ?? "").localeCompare(left.recordedAt ?? "") ||
        right.createdAt.localeCompare(left.createdAt) ||
        right.id.localeCompare(left.id),
    );
  return {
    id: row.id,
    userId: row.user_id,
    goalId: row.goal_id,
    goalMilestoneId: row.goal_milestone_id,
    title: row.title,
    criterionType: row.criterion_type,
    unit: row.unit,
    target: row.target,
    direction: row.direction,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
    evaluations: criterionEvaluations,
    latestEvaluation: criterionEvaluations[0] ?? null,
  };
}

function mapProjectSupport(
  row: GoalMilestoneProjectSupportRow,
  titles: ReadonlyMap<string, string>,
): GoalOutcomeSupportLink {
  return {
    id: row.id,
    goalId: row.goal_id,
    goalMilestoneId: row.goal_milestone_id,
    targetId: row.project_id,
    targetTitle: titles.get(row.project_id) ?? "Project",
    createdAt: row.created_at,
  };
}

function mapTaskSupport(
  row: GoalMilestoneTaskSupportRow,
  titles: ReadonlyMap<string, string>,
): GoalOutcomeSupportLink {
  return {
    id: row.id,
    goalId: row.goal_id,
    goalMilestoneId: row.goal_milestone_id,
    targetId: row.task_id,
    targetTitle: titles.get(row.task_id) ?? "Task",
    createdAt: row.created_at,
  };
}

function scopeFailure(input: { userId: string; profileId?: string }) {
  return !input.profileId || input.userId === input.profileId
    ? null
    : forbidden();
}

async function ownedGoal(
  client: SupabaseClientLike,
  userId: string,
  goalId: string,
  includeArchived = false,
) {
  let query = client
    .from("goals")
    .select("id,title,status,achieved_at,achievement_note,archived_at")
    .eq("user_id", userId)
    .eq("id", goalId);
  if (!includeArchived) query = query.is("archived_at", null);
  return (await query.maybeSingle()) as SupabaseQueryResult<GoalSummaryRow>;
}

async function activeMilestone(
  client: SupabaseClientLike,
  userId: string,
  goalId: string,
  milestoneId: string,
) {
  return (await client
    .from("goal_milestones")
    .select("*")
    .eq("user_id", userId)
    .eq("goal_id", goalId)
    .eq("id", milestoneId)
    .is("archived_at", null)
    .maybeSingle()) as SupabaseQueryResult<GoalMilestoneRow>;
}

async function activeCriterion(
  client: SupabaseClientLike,
  userId: string,
  goalId: string,
  criterionId: string,
) {
  return (await client
    .from("goal_outcome_criteria")
    .select("*")
    .eq("user_id", userId)
    .eq("goal_id", goalId)
    .eq("id", criterionId)
    .is("archived_at", null)
    .maybeSingle()) as SupabaseQueryResult<GoalOutcomeCriterionRow>;
}

export async function getGoalOutcome(
  client: SupabaseClientLike,
  userId: string,
  goalId: string,
  dependencyGraph?: TaskDependencyGraph,
): Promise<RepositoryResult<GoalOutcome>> {
  const [
    goalResult,
    milestoneResult,
    criterionResult,
    evaluationResult,
    projectSupportResult,
    taskSupportResult,
    projectsResult,
    tasksResult,
    milestoneEventsResult,
    achievementEventsResult,
    criterionBasisResult,
    milestoneBasisResult,
    criterionEvidenceResult,
    milestoneEvidenceResult,
    achievementEvidenceResult,
  ] = await Promise.all([
    client
      .from("goals")
      .select(
        "id,title,description,why,horizon,target_date,status,achieved_at,achievement_note,updated_at,archived_at",
      )
      .eq("user_id", userId)
      .eq("id", goalId)
      .maybeSingle() as unknown as Promise<SupabaseQueryResult<GoalSummaryRow>>,
    client
      .from("goal_milestones")
      .select("*")
      .eq("user_id", userId)
      .eq("goal_id", goalId)
      .order("sort_order")
      .order("created_at")
      .order("id"),
    client
      .from("goal_outcome_criteria")
      .select("*")
      .eq("user_id", userId)
      .eq("goal_id", goalId)
      .order("created_at")
      .order("id"),
    client
      .from("goal_criterion_evaluations")
      .select("*")
      .eq("user_id", userId)
      .order("evaluated_at", { ascending: false })
      .order("recorded_at", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }),
    client
      .from("goal_milestone_project_support")
      .select("*")
      .eq("user_id", userId)
      .eq("goal_id", goalId),
    client
      .from("goal_milestone_task_support")
      .select("*")
      .eq("user_id", userId)
      .eq("goal_id", goalId),
    client
      .from("projects")
      .select("id,title,goal_id,status,next_step,target_date,archived_at")
      .eq("user_id", userId)
      .eq("goal_id", goalId),
    client
      .from("tasks")
      .select(
        "id,title,goal_id,project_id,status,planned_date,due_at,archived_at",
      )
      .eq("user_id", userId),
    client
      .from("goal_milestone_achievement_events")
      .select("*")
      .eq("user_id", userId)
      .eq("goal_id", goalId)
      .order("occurred_at", { ascending: false })
      .order("recorded_at", { ascending: false })
      .order("id", { ascending: false }),
    client
      .from("goal_achievement_events")
      .select("*")
      .eq("user_id", userId)
      .eq("goal_id", goalId)
      .order("occurred_at", { ascending: false })
      .order("recorded_at", { ascending: false })
      .order("id", { ascending: false }),
    client
      .from("goal_achievement_criterion_basis")
      .select("*")
      .eq("user_id", userId),
    client
      .from("goal_achievement_milestone_basis")
      .select("*")
      .eq("user_id", userId),
    client
      .from("goal_criterion_evaluation_evidence")
      .select("*")
      .eq("user_id", userId),
    client
      .from("goal_milestone_achievement_evidence")
      .select("*")
      .eq("user_id", userId),
    client.from("goal_achievement_evidence").select("*").eq("user_id", userId),
  ]);

  if (goalResult.error) return dbFailure("load Goal outcome", goalResult.error);
  if (!goalResult.data) return notFound("Goal");
  if (
    [
      milestoneResult,
      criterionResult,
      evaluationResult,
      projectSupportResult,
      taskSupportResult,
      projectsResult,
      tasksResult,
      milestoneEventsResult,
      achievementEventsResult,
      criterionBasisResult,
      milestoneBasisResult,
      criterionEvidenceResult,
      milestoneEvidenceResult,
      achievementEvidenceResult,
    ].some((result) => result.error)
  ) {
    return dbFailure("load Goal outcome");
  }

  const milestones = (milestoneResult.data ?? []) as GoalMilestoneRow[];
  const evaluations = (
    (evaluationResult.data ?? []) as GoalCriterionEvaluationRow[]
  ).map(mapEvaluation);
  const projectTitles = new Map(
    ((projectsResult.data ?? []) as ProjectTitleRow[]).map((row) => [
      row.id,
      row.title,
    ]),
  );
  const taskTitles = new Map(
    ((tasksResult.data ?? []) as TaskTitleRow[]).map((row) => [
      row.id,
      row.title,
    ]),
  );
  const projectRows = (projectsResult.data ?? []) as ProjectTitleRow[];
  const taskRows = (tasksResult.data ?? []) as TaskTitleRow[];
  const projectIds = new Set(projectRows.map((row) => row.id));
  const milestoneEventRows = (milestoneEventsResult.data ??
    []) as GoalMilestoneAchievementEventRow[];
  const achievementEventRows = (achievementEventsResult.data ??
    []) as GoalAchievementEventRow[];
  const criterionBasisRows = (criterionBasisResult.data ??
    []) as GoalAchievementCriterionBasisRow[];
  const milestoneBasisRows = (milestoneBasisResult.data ??
    []) as GoalAchievementMilestoneBasisRow[];
  const criterionEvidenceRows = (criterionEvidenceResult.data ??
    []) as GoalCriterionEvaluationEvidenceRow[];
  const milestoneEvidenceRows = (milestoneEvidenceResult.data ??
    []) as GoalMilestoneAchievementEvidenceRow[];
  const achievementEvidenceRows = (achievementEvidenceResult.data ??
    []) as GoalAchievementEvidenceRow[];
  const evaluationEvidenceByEvaluation = new Map<
    string,
    ReturnType<typeof evidenceProjection>
  >();
  for (const evaluationId of new Set(
    criterionEvidenceRows.map((row) => row.evaluation_id),
  )) {
    evaluationEvidenceByEvaluation.set(
      evaluationId,
      evidenceProjection(
        criterionEvidenceRows.filter(
          (row) => row.evaluation_id === evaluationId,
        ),
      ),
    );
  }
  const milestoneEvidenceByEvent = new Map<
    string,
    ReturnType<typeof evidenceProjection>
  >();
  for (const eventId of new Set(
    milestoneEvidenceRows.map((row) => row.achievement_event_id),
  )) {
    milestoneEvidenceByEvent.set(
      eventId,
      evidenceProjection(
        milestoneEvidenceRows.filter(
          (row) => row.achievement_event_id === eventId,
        ),
      ),
    );
  }
  const achievementEvidenceByEvent = new Map<
    string,
    ReturnType<typeof evidenceProjection>
  >();
  for (const eventId of new Set(
    achievementEvidenceRows.map((row) => row.achievement_event_id),
  )) {
    achievementEvidenceByEvent.set(
      eventId,
      evidenceProjection(
        achievementEvidenceRows.filter(
          (row) => row.achievement_event_id === eventId,
        ),
      ),
    );
  }
  const criteria = (
    (criterionResult.data ?? []) as GoalOutcomeCriterionRow[]
  ).map((row) => {
    const mapped = mapCriterion(row, evaluations);
    const withEvidence = mapped.evaluations.map((evaluation) => ({
      ...evaluation,
      evidence: evaluationEvidenceByEvaluation.get(evaluation.id)?.active ?? [],
      evidenceHistory:
        evaluationEvidenceByEvaluation.get(evaluation.id)?.history ?? [],
    }));
    return {
      ...mapped,
      evaluations: withEvidence,
      latestEvaluation: withEvidence[0] ?? null,
    };
  });
  const milestoneHistoryLocal = milestoneEventRows.map((row) =>
    mapMilestoneEvent(
      row,
      milestoneEvidenceByEvent.get(row.id)?.active ?? [],
      milestoneEvidenceByEvent.get(row.id)?.history ?? [],
    ),
  );
  const effectiveMilestoneEventIds = new Set(
    [...new Set(milestoneHistoryLocal.map((event) => event.episodeId))]
      .map((episodeId) =>
        latestGoalMilestoneAchievementEventInEpisode(
          milestoneHistoryLocal,
          episodeId,
        )?.id,
      )
      .filter((id): id is string => Boolean(id)),
  );
  const milestoneHistory = milestoneHistoryLocal.map((event) => {
    if (!effectiveMilestoneEventIds.has(event.id)) return event;
    const effectiveEvidence = projectEffectiveMilestoneAchievementEvidence(
      event.id,
      milestoneEventRows,
      milestoneEvidenceRows,
    );
    return {
      ...event,
      evidence: effectiveEvidence.active,
      evidenceHistory: effectiveEvidence.history,
    };
  });
  const basisEventId = (eventId: string) =>
    resolveGoalAchievementBasisEventId(
      eventId,
      achievementEventRows.map((event) => ({
        id: event.id,
        correctsEventId: event.corrects_event_id,
      })),
    );
  const achievementHistoryLocal = achievementEventRows.map((row) =>
    mapGoalAchievementEvent(
      row,
      criterionBasisRows
        .filter((basis) => basis.achievement_event_id === basisEventId(row.id))
        .map((basis) => ({
          criterionId: basis.criterion_id,
          evaluationId: basis.evaluation_id,
          criterionTitleSnapshot: basis.criterion_title_snapshot,
          criterionTypeSnapshot: basis.criterion_type_snapshot,
          goalMilestoneIdSnapshot: basis.goal_milestone_id_snapshot,
          unitSnapshot: basis.unit_snapshot,
          targetSnapshot: basis.target_snapshot,
          directionSnapshot: basis.direction_snapshot,
          evaluationStateSnapshot: basis.evaluation_state_snapshot,
          evaluationOccurredAt: basis.evaluation_occurred_at,
          legacyState: asRecord(basis.legacy_state),
        })),
      milestoneBasisRows
        .filter((basis) => basis.achievement_event_id === basisEventId(row.id))
        .map((basis) => ({
          milestoneId: basis.milestone_id,
          achievementEpisodeId: basis.achievement_episode_id,
          milestoneTitleSnapshot: basis.milestone_title_snapshot,
          resultingStatusSnapshot: basis.resulting_status_snapshot,
          legacyState: asRecord(basis.legacy_state),
        })),
      achievementEvidenceByEvent.get(row.id)?.active ?? [],
      achievementEvidenceByEvent.get(row.id)?.history ?? [],
    ),
  );
  const effectiveAchievementEventIds = new Set(
    [...new Set(achievementHistoryLocal.map((event) => event.episodeId))]
      .map((episodeId) =>
        latestGoalAchievementEventInEpisode(
          achievementHistoryLocal,
          episodeId,
        )?.id,
      )
      .filter((id): id is string => Boolean(id)),
  );
  const achievementHistory = achievementHistoryLocal.map((event) => {
    if (!effectiveAchievementEventIds.has(event.id)) return event;
    const effectiveEvidence = projectEffectiveGoalAchievementEvidence(
      event.id,
      achievementEventRows,
      achievementEvidenceRows,
    );
    return {
      ...event,
      evidence: effectiveEvidence.active,
      evidenceHistory: effectiveEvidence.history,
    };
  });
  const outcomeBase = {
    goalId,
    goalStatus: goalResult.data.status,
    achievedAt: goalResult.data.achieved_at,
    milestones: milestones.map(mapMilestone),
    criteria,
  } as const;
  const summary = buildGoalOutcomeSummary(outcomeBase);

  return {
    ok: true,
    data: {
      goalId,
      goalTitle: goalResult.data.title,
      goalDescription: goalResult.data.description,
      goalWhy: goalResult.data.why,
      goalHorizon: goalResult.data.horizon,
      targetDate: goalResult.data.target_date,
      updatedAt: goalResult.data.updated_at,
      goalStatus: goalResult.data.status,
      achievedAt: goalResult.data.achieved_at,
      achievementNote: goalResult.data.achievement_note,
      milestones: outcomeBase.milestones,
      criteria,
      projectSupport: (
        (projectSupportResult.data ?? []) as GoalMilestoneProjectSupportRow[]
      ).map((row) => mapProjectSupport(row, projectTitles)),
      taskSupport: (
        (taskSupportResult.data ?? []) as GoalMilestoneTaskSupportRow[]
      ).map((row) => mapTaskSupport(row, taskTitles)),
      projects: projectRows.map((row) => ({
        id: row.id,
        title: row.title,
        status: row.status,
        nextStep: row.next_step,
        targetDate: row.target_date,
        archivedAt: row.archived_at,
      })),
      tasks: taskRows
        .filter(
          (row) =>
            row.goal_id === goalId ||
            (row.project_id !== null && projectIds.has(row.project_id)),
        )
        .map((row) => ({
          id: row.id,
          title: row.title,
          status: row.status,
          projectId: row.project_id,
          plannedDate: row.planned_date,
          dueAt: row.due_at,
          archivedAt: row.archived_at,
        })),
      nextStep: deriveGoalNextStep({
        goalId,
        goalStatus: goalResult.data.status,
        dependencyGraph,
        tasks: taskRows
          .filter(
            (row) =>
              row.goal_id === goalId ||
              (row.project_id !== null && projectIds.has(row.project_id)),
          )
          .map((row) => ({
            id: row.id,
            title: row.title,
            status: row.status,
            projectId: row.project_id,
            plannedDate: row.planned_date,
            dueAt: row.due_at,
            archivedAt: row.archived_at,
          })),
        projects: projectRows.map((row) => ({
          id: row.id,
          title: row.title,
          status: row.status,
          nextStep: row.next_step,
          targetDate: row.target_date,
          archivedAt: row.archived_at,
        })),
      }),
      milestoneHistory,
      achievementHistory,
      summary,
    },
  };
}

export async function getGoalOutcomeSummaries(
  client: SupabaseClientLike,
  userId: string,
  goalIds?: readonly string[],
): Promise<
  RepositoryListResult<import("../../domain/goal-outcome").GoalOutcomeSummary>
> {
  if (goalIds && goalIds.length === 0) return { ok: true, data: [] };
  let goalsQuery = client
    .from("goals")
    .select("id,title,status,achieved_at,achievement_note,archived_at")
    .eq("user_id", userId)
    .is("archived_at", null);
  if (goalIds) goalsQuery = goalsQuery.in("id", goalIds);
  const [goalsResult, milestonesResult, criteriaResult, evaluationsResult] =
    await Promise.all([
      goalsQuery,
      client.from("goal_milestones").select("*").eq("user_id", userId),
      client.from("goal_outcome_criteria").select("*").eq("user_id", userId),
      client
        .from("goal_criterion_evaluations")
        .select("*")
        .eq("user_id", userId)
        .order("evaluated_at", { ascending: false })
        .order("created_at", { ascending: false })
        .order("id", { ascending: false }),
    ]);
  if (
    [goalsResult, milestonesResult, criteriaResult, evaluationsResult].some(
      (result) => result.error,
    )
  )
    return dbFailure("load Goal outcome summaries");
  const goals = (goalsResult.data ?? []) as GoalSummaryRow[];
  const milestones = (milestonesResult.data ?? []) as GoalMilestoneRow[];
  const evaluationRows = (
    (evaluationsResult.data ?? []) as GoalCriterionEvaluationRow[]
  ).map(mapEvaluation);
  const criteria = (criteriaResult.data ?? []) as GoalOutcomeCriterionRow[];
  return {
    ok: true,
    data: goals.map((goal) => {
      const goalCriteria = criteria
        .filter((criterion) => criterion.goal_id === goal.id)
        .map((criterion) => mapCriterion(criterion, evaluationRows));
      return buildGoalOutcomeSummary({
        goalId: goal.id,
        goalStatus: goal.status,
        achievedAt: goal.achieved_at,
        criteria: goalCriteria,
        milestones: milestones
          .filter((milestone) => milestone.goal_id === goal.id)
          .map(mapMilestone),
      });
    }),
  };
}

export async function createGoalMilestone(
  client: SupabaseClientLike,
  input: GoalMilestoneCreateInput,
): Promise<RepositoryResult<GoalMilestone>> {
  const scoped = scopeFailure(input);
  if (scoped) return scoped;
  const goal = await ownedGoal(client, input.userId, input.goalId);
  if (goal.error) return dbFailure("load Goal", goal.error);
  if (!goal.data) return notFound("Goal");
  if (goal.data.status === "achieved")
    return failure(
      "conflict",
      "Ein erreichtes Goal kann keine neuen Milestones erhalten.",
    );
  const result = (await client
    .from("goal_milestones")
    .insert({
      user_id: input.userId,
      goal_id: input.goalId,
      title: input.title,
      description: input.description ?? null,
      target_date: input.targetDate ?? null,
      status: input.status,
      sort_order: input.sortOrder,
    })
    .select("*")
    .single()) as SupabaseQueryResult<GoalMilestoneRow>;
  if (result.error) return dbFailure("create Goal milestone", result.error);
  if (!result.data) return notFound("Goal milestone");
  return { ok: true, data: mapMilestone(result.data) };
}

export async function updateGoalMilestone(
  client: SupabaseClientLike,
  input: GoalMilestoneUpdateInput,
): Promise<RepositoryResult<GoalMilestone>> {
  const scoped = scopeFailure(input);
  if (scoped) return scoped;
  const goal = await ownedGoal(client, input.userId, input.goalId);
  if (goal.error) return dbFailure("load Goal", goal.error);
  if (!goal.data) return notFound("Goal");
  if (goal.data.status === "achieved")
    return failure(
      "conflict",
      "Ein erreichtes Goal kann nicht verändert werden.",
    );
  const result = (await client
    .from("goal_milestones")
    .update({
      title: input.title,
      description: input.description ?? null,
      target_date: input.targetDate ?? null,
    })
    .eq("user_id", input.userId)
    .eq("goal_id", input.goalId)
    .eq("id", input.milestoneId)
    .is("archived_at", null)
    .select("*")
    .maybeSingle()) as SupabaseQueryResult<GoalMilestoneRow>;
  if (result.error) return dbFailure("update Goal milestone", result.error);
  if (!result.data) return notFound("Goal milestone");
  return { ok: true, data: mapMilestone(result.data) };
}

export async function setGoalMilestoneStatus(
  client: SupabaseClientLike,
  input: GoalMilestoneStatusInput,
): Promise<RepositoryResult<GoalMilestone>> {
  const scoped = scopeFailure(input);
  if (scoped) return scoped;
  const goal = await ownedGoal(client, input.userId, input.goalId);
  if (goal.error) return dbFailure("load Goal", goal.error);
  if (!goal.data) return notFound("Goal");
  if (goal.data.status === "achieved")
    return failure(
      "conflict",
      "Ein erreichtes Goal kann nicht verändert werden.",
    );
  const current = await activeMilestone(
    client,
    input.userId,
    input.goalId,
    input.milestoneId,
  );
  if (current.error) return dbFailure("load Goal milestone", current.error);
  if (!current.data) return notFound("Goal milestone");
  if (current.data.status === "archived")
    return failure(
      "conflict",
      "Ein archivierter Milestone kann nicht verändert werden.",
    );
  if (
    input.status === "achieved" ||
    (input.status === "active" && current.data.status === "achieved")
  ) {
    const command = await executeGoalCommand(
      client,
      input.status === "achieved" ? "milestone.achieve" : "milestone.reopen",
      {
        goal_id: input.goalId,
        milestone_id: input.milestoneId,
        expected_updated_at: input.expectedUpdatedAt ?? current.data.updated_at,
      },
      input.commandId,
    );
    if (!command.ok) return command;
    const refreshed = await activeMilestone(
      client,
      input.userId,
      input.goalId,
      input.milestoneId,
    );
    if (refreshed.error)
      return dbFailure("reload Goal milestone", refreshed.error);
    if (!refreshed.data) return notFound("Goal milestone");
    return { ok: true, data: mapMilestone(refreshed.data) };
  }
  const allowedTransitions: Record<
    "planned" | "active" | "achieved",
    readonly string[]
  > = {
    planned: ["planned", "active"],
    active: ["active", "planned", "achieved"],
    achieved: ["achieved", "active"],
  };
  if (!allowedTransitions[current.data.status].includes(input.status)) {
    return failure(
      "conflict",
      "Dieser Etappenstatuswechsel ist im akzeptierten Lebenszyklus nicht erlaubt.",
    );
  }
  const result = (await client
    .from("goal_milestones")
    .update({ status: input.status })
    .eq("user_id", input.userId)
    .eq("goal_id", input.goalId)
    .eq("id", input.milestoneId)
    .is("archived_at", null)
    .select("*")
    .single()) as SupabaseQueryResult<GoalMilestoneRow>;
  if (result.error)
    return dbFailure("update Goal milestone status", result.error);
  if (!result.data) return notFound("Goal milestone");
  return { ok: true, data: mapMilestone(result.data) };
}

export async function archiveGoalMilestone(
  client: SupabaseClientLike,
  input: GoalMilestoneArchiveInput,
): Promise<RepositoryResult<{ id: string }>> {
  const scoped = scopeFailure(input);
  if (scoped) return scoped;
  const goal = await ownedGoal(client, input.userId, input.goalId);
  if (goal.error) return dbFailure("load Goal", goal.error);
  if (!goal.data) return notFound("Goal");
  if (goal.data.status === "achieved")
    return failure(
      "conflict",
      "Ein erreichtes Goal kann nicht verändert werden.",
    );
  const result = (await client
    .from("goal_milestones")
    .update({ status: "archived", archived_at: new Date().toISOString() })
    .eq("user_id", input.userId)
    .eq("goal_id", input.goalId)
    .eq("id", input.milestoneId)
    .is("archived_at", null)
    .select("id")
    .maybeSingle()) as SupabaseQueryResult<{ id: string }>;
  if (result.error) return dbFailure("archive Goal milestone", result.error);
  if (!result.data) return notFound("Goal milestone");
  return { ok: true, data: result.data };
}

export async function reorderGoalMilestone(
  client: SupabaseClientLike,
  input: GoalMilestoneReorderInput,
): Promise<RepositoryResult<{ id: string }>> {
  const scoped = scopeFailure(input);
  if (scoped) return scoped;
  const goal = await ownedGoal(client, input.userId, input.goalId);
  if (goal.error) return dbFailure("load Goal", goal.error);
  if (!goal.data) return notFound("Goal");
  if (goal.data.status === "achieved")
    return failure(
      "conflict",
      "Ein erreichtes Goal kann nicht verändert werden.",
    );
  const current = await activeMilestone(
    client,
    input.userId,
    input.goalId,
    input.milestoneId,
  );
  if (current.error) return dbFailure("load Goal milestone", current.error);
  if (!current.data) return notFound("Goal milestone");
  const siblingsResult = await client
    .from("goal_milestones")
    .select("id,sort_order")
    .eq("user_id", input.userId)
    .eq("goal_id", input.goalId)
    .is("archived_at", null)
    .order("sort_order")
    .order("id");
  if (siblingsResult.error)
    return dbFailure("load Goal milestone order", siblingsResult.error);
  const siblings = (siblingsResult.data ?? []) as Array<
    Pick<GoalMilestoneRow, "id" | "sort_order">
  >;
  const index = siblings.findIndex((row) => row.id === input.milestoneId);
  const nextIndex = input.direction === "up" ? index - 1 : index + 1;
  if (index < 0 || nextIndex < 0 || nextIndex >= siblings.length)
    return { ok: true, data: { id: input.milestoneId } };
  const other = siblings[nextIndex]!;
  const first = await client
    .from("goal_milestones")
    .update({ sort_order: other.sort_order })
    .eq("user_id", input.userId)
    .eq("id", current.data.id);
  if (first.error) return dbFailure("reorder Goal milestone", first.error);
  const second = await client
    .from("goal_milestones")
    .update({ sort_order: current.data.sort_order })
    .eq("user_id", input.userId)
    .eq("id", other.id);
  if (second.error) return dbFailure("reorder Goal milestone", second.error);
  return { ok: true, data: { id: input.milestoneId } };
}

export async function createGoalCriterion(
  client: SupabaseClientLike,
  input: GoalOutcomeCriterionCreateInput,
): Promise<RepositoryResult<GoalOutcomeCriterion>> {
  const scoped = scopeFailure(input);
  if (scoped) return scoped;
  const goal = await ownedGoal(client, input.userId, input.goalId);
  if (goal.error) return dbFailure("load Goal", goal.error);
  if (!goal.data) return notFound("Goal");
  if (goal.data.status === "achieved")
    return failure(
      "conflict",
      "Ein erreichtes Goal kann keine neuen Kriterien erhalten.",
    );
  if (input.goalMilestoneId) {
    const milestone = await activeMilestone(
      client,
      input.userId,
      input.goalId,
      input.goalMilestoneId,
    );
    if (milestone.error)
      return dbFailure("load Goal milestone", milestone.error);
    if (!milestone.data) return notFound("Goal milestone");
  }
  const result = (await client
    .from("goal_outcome_criteria")
    .insert({
      user_id: input.userId,
      goal_id: input.goalId,
      goal_milestone_id: input.goalMilestoneId ?? null,
      title: input.title,
      criterion_type: input.criterionType,
      unit: input.criterionType === "numeric" ? (input.unit ?? null) : null,
      target: input.criterionType === "numeric" ? (input.target ?? null) : null,
      direction:
        input.criterionType === "numeric" ? (input.direction ?? null) : null,
    })
    .select("*")
    .single()) as SupabaseQueryResult<GoalOutcomeCriterionRow>;
  if (result.error) return dbFailure("create Goal criterion", result.error);
  if (!result.data) return notFound("Goal criterion");
  return { ok: true, data: mapCriterion(result.data, []) };
}

export async function archiveGoalCriterion(
  client: SupabaseClientLike,
  input: GoalOutcomeCriterionArchiveInput,
): Promise<RepositoryResult<{ id: string }>> {
  const scoped = scopeFailure(input);
  if (scoped) return scoped;
  const goal = await ownedGoal(client, input.userId, input.goalId);
  if (goal.error) return dbFailure("load Goal", goal.error);
  if (!goal.data) return notFound("Goal");
  if (goal.data.status === "achieved")
    return failure(
      "conflict",
      "Ein erreichtes Goal kann nicht verändert werden.",
    );
  const result = (await client
    .from("goal_outcome_criteria")
    .update({ archived_at: new Date().toISOString() })
    .eq("user_id", input.userId)
    .eq("goal_id", input.goalId)
    .eq("id", input.criterionId)
    .is("archived_at", null)
    .select("id")
    .maybeSingle()) as SupabaseQueryResult<{ id: string }>;
  if (result.error) return dbFailure("archive Goal criterion", result.error);
  if (!result.data) return notFound("Goal criterion");
  return { ok: true, data: result.data };
}

export async function appendGoalCriterionEvaluation(
  client: SupabaseClientLike,
  input: GoalCriterionEvaluationInput,
): Promise<RepositoryResult<GoalCriterionEvaluation>> {
  return appendGoalCriterionRevision(client, input, "criterion.evaluate");
}

export async function appendGoalCriterionRevision(
  client: SupabaseClientLike,
  input: GoalCriterionEvaluationInput,
  commandKind: "criterion.evaluate" | "criterion.correct" | "criterion.retract",
): Promise<RepositoryResult<GoalCriterionEvaluation>> {
  const scoped = scopeFailure(input);
  if (scoped) return scoped;
  const goal = await ownedGoal(client, input.userId, input.goalId);
  if (goal.error) return dbFailure("load Goal", goal.error);
  if (!goal.data) return notFound("Goal");
  if (goal.data.status === "achieved")
    return failure(
      "conflict",
      "Ein erreichtes Goal kann nicht verändert werden.",
    );
  const criterion = await activeCriterion(
    client,
    input.userId,
    input.goalId,
    input.criterionId,
  );
  if (criterion.error) return dbFailure("load Goal criterion", criterion.error);
  if (!criterion.data) return notFound("Goal criterion");
  if (criterion.data.criterion_type !== input.criterionType)
    return failure(
      "conflict",
      "Der Kriterientyp hat sich geändert; bitte neu laden.",
    );
  if (
    input.evaluationState === "value" &&
    input.criterionType === "numeric" &&
    input.unit?.trim() !== criterion.data.unit
  )
    return failure(
      "conflict",
      "Die Einheit der Bewertung muss exakt zum Kriterium passen.",
    );
  const command = await executeGoalCommand(
    client,
    commandKind,
    {
      goal_id: input.goalId,
      criterion_id: input.criterionId,
      expected_latest_evaluation_id: input.expectedLatestEvaluationId ?? null,
      deferred:
        commandKind === "criterion.retract"
          ? false
          : input.evaluationState === "deferred",
      boolean_value:
        commandKind === "criterion.retract"
          ? null
          : (input.booleanValue ?? null),
      numeric_value:
        commandKind === "criterion.retract"
          ? null
          : (input.numericValue ?? null),
      unit: commandKind === "criterion.retract" ? null : (input.unit ?? null),
      note: input.note ?? null,
      correction_reason: input.correctionReason ?? null,
      retrospective: input.retrospective ?? false,
    },
    input.commandId,
  );
  if (!command.ok) return command;
  const evaluationId =
    typeof command.data.evaluation_id === "string"
      ? command.data.evaluation_id
      : null;
  if (!evaluationId) return dbFailure("read saved Goal criterion evaluation");
  const result = (await client
    .from("goal_criterion_evaluations")
    .select("*")
    .eq("user_id", input.userId)
    .eq("id", evaluationId)
    .maybeSingle()) as SupabaseQueryResult<GoalCriterionEvaluationRow>;
  if (result.error)
    return dbFailure("read saved Goal criterion evaluation", result.error);
  if (!result.data) return notFound("Goal criterion evaluation");
  return { ok: true, data: mapEvaluation(result.data) };
}

export async function addGoalCriterionEvidence(
  client: SupabaseClientLike,
  input: GoalCriterionEvidenceInput,
): Promise<RepositoryResult<{ referencesChanged: number }>> {
  const scoped = scopeFailure(input);
  if (scoped) return scoped;
  const command = await executeGoalCommand(
    client,
    "criterion.evidence",
    {
      goal_id: input.goalId,
      evaluation_id: input.evaluationId,
      action: input.action,
      retrospective: input.retrospective ?? false,
      references: (input.references ?? []).map((reference) => ({
        source_type: reference.sourceType ?? null,
        source_id: reference.sourceId ?? null,
        supersedes_reference_id: reference.supersedesReferenceId ?? null,
        reason: reference.reason ?? null,
      })),
    },
    input.commandId,
  );
  if (!command.ok) return command;
  return {
    ok: true,
    data: {
      referencesChanged:
        typeof command.data.references_changed === "number"
          ? command.data.references_changed
          : input.references.length,
    },
  };
}

export async function addGoalMilestoneEvidence(
  client: SupabaseClientLike,
  input: GoalMilestoneEvidenceInput,
): Promise<RepositoryResult<{ referencesChanged: number }>> {
  const scoped = scopeFailure(input);
  if (scoped) return scoped;
  const command = await executeGoalCommand(
    client,
    "milestone.evidence",
    {
      goal_id: input.goalId,
      milestone_id: input.milestoneId,
      achievement_event_id: input.achievementEventId ?? null,
      action: input.action,
      retrospective: input.retrospective ?? false,
      references: (input.references ?? []).map((reference) => ({
        source_type: reference.sourceType ?? null,
        source_id: reference.sourceId ?? null,
        supersedes_reference_id: reference.supersedesReferenceId ?? null,
        reason: reference.reason ?? null,
      })),
    },
    input.commandId,
  );
  if (!command.ok) return command;
  return {
    ok: true,
    data: {
      referencesChanged:
        typeof command.data.references_changed === "number"
          ? command.data.references_changed
          : input.references.length,
    },
  };
}

export async function addGoalAchievementEvidence(
  client: SupabaseClientLike,
  input: GoalAchievementEvidenceInput,
): Promise<RepositoryResult<{ referencesChanged: number }>> {
  const scoped = scopeFailure(input);
  if (scoped) return scoped;
  const command = await executeGoalCommand(
    client,
    "goal.evidence",
    {
      goal_id: input.goalId,
      achievement_event_id: input.achievementEventId,
      action: input.action,
      retrospective: input.retrospective ?? false,
      references: (input.references ?? []).map((reference) => ({
        source_type: reference.sourceType ?? null,
        source_id: reference.sourceId ?? null,
        supersedes_reference_id: reference.supersedesReferenceId ?? null,
        reason: reference.reason ?? null,
      })),
    },
    input.commandId,
  );
  if (!command.ok) return command;
  return {
    ok: true,
    data: {
      referencesChanged:
        typeof command.data.references_changed === "number"
          ? command.data.references_changed
          : input.references.length,
    },
  };
}

export async function amendGoalMilestoneAchievementEvent(
  client: SupabaseClientLike,
  input: GoalMilestoneAmendInput,
): Promise<RepositoryResult<{ id: string }>> {
  const scoped = scopeFailure(input);
  if (scoped) return scoped;
  const command = await executeGoalCommand(
    client,
    "milestone.amend",
    {
      goal_id: input.goalId,
      milestone_id: input.milestoneId,
      event_id: input.eventId,
      occurred_at: input.occurredAt ?? null,
      note: input.note ?? null,
      correction_reason: input.correctionReason,
      retrospective: input.retrospective ?? false,
    },
    input.commandId,
  );
  if (!command.ok) return command;
  const id =
    typeof command.data.event_id === "string" ? command.data.event_id : null;
  return id
    ? { ok: true, data: { id } }
    : dbFailure("read amended Etappe history");
}

export async function amendGoalAchievementEvent(
  client: SupabaseClientLike,
  input: GoalAchievementAmendInput,
): Promise<RepositoryResult<{ id: string }>> {
  const scoped = scopeFailure(input);
  if (scoped) return scoped;
  const command = await executeGoalCommand(
    client,
    "goal.amend",
    {
      goal_id: input.goalId,
      event_id: input.eventId,
      occurred_at: input.occurredAt ?? null,
      achievement_note: input.achievementNote ?? null,
      correction_reason: input.correctionReason,
      retrospective: input.retrospective ?? false,
    },
    input.commandId,
  );
  if (!command.ok) return command;
  const id =
    typeof command.data.event_id === "string" ? command.data.event_id : null;
  return id
    ? { ok: true, data: { id } }
    : dbFailure("read amended Goal history");
}

export async function addGoalProjectSupport(
  client: SupabaseClientLike,
  input: GoalProjectSupportInput,
): Promise<RepositoryResult<{ id: string }>> {
  const scoped = scopeFailure(input);
  if (scoped) return scoped;
  const goal = await ownedGoal(client, input.userId, input.goalId);
  if (goal.error) return dbFailure("load Goal", goal.error);
  if (!goal.data) return notFound("Goal");
  if (goal.data.status === "achieved")
    return failure(
      "conflict",
      "Ein erreichtes Goal kann nicht verändert werden.",
    );
  const milestone = await activeMilestone(
    client,
    input.userId,
    input.goalId,
    input.goalMilestoneId,
  );
  if (milestone.error) return dbFailure("load Goal milestone", milestone.error);
  if (!milestone.data) return notFound("Goal milestone");
  const project = (await client
    .from("projects")
    .select("id,goal_id,archived_at")
    .eq("user_id", input.userId)
    .eq("id", input.projectId)
    .is("archived_at", null)
    .maybeSingle()) as SupabaseQueryResult<
    Pick<ProjectTitleRow, "id" | "goal_id" | "archived_at">
  >;
  if (project.error) return dbFailure("load Project", project.error);
  if (!project.data || project.data.goal_id !== input.goalId)
    return failure("conflict", "Das Project gehört nicht zu diesem Goal.");
  const result = (await client
    .from("goal_milestone_project_support")
    .insert({
      user_id: input.userId,
      goal_id: input.goalId,
      goal_milestone_id: input.goalMilestoneId,
      project_id: input.projectId,
    })
    .select("id")
    .single()) as SupabaseQueryResult<{ id: string }>;
  if (result.error) return dbFailure("link Project support", result.error);
  if (!result.data) return notFound("Project support");
  return { ok: true, data: result.data };
}

export async function removeGoalProjectSupport(
  client: SupabaseClientLike,
  input: GoalSupportRemoveInput,
): Promise<RepositoryResult<{ id: string }>> {
  const scoped = scopeFailure(input);
  if (scoped) return scoped;
  const result = (await client
    .from("goal_milestone_project_support")
    .delete()
    .eq("user_id", input.userId)
    .eq("goal_id", input.goalId)
    .eq("id", input.supportId)
    .select("id")
    .maybeSingle()) as SupabaseQueryResult<{ id: string }>;
  if (result.error) return dbFailure("remove Project support", result.error);
  if (!result.data) return notFound("Project support");
  return { ok: true, data: result.data };
}

export async function addGoalTaskSupport(
  client: SupabaseClientLike,
  input: GoalTaskSupportInput,
): Promise<RepositoryResult<{ id: string }>> {
  const scoped = scopeFailure(input);
  if (scoped) return scoped;
  const goal = await ownedGoal(client, input.userId, input.goalId);
  if (goal.error) return dbFailure("load Goal", goal.error);
  if (!goal.data) return notFound("Goal");
  if (goal.data.status === "achieved")
    return failure(
      "conflict",
      "Ein erreichtes Goal kann nicht verändert werden.",
    );
  const milestone = await activeMilestone(
    client,
    input.userId,
    input.goalId,
    input.goalMilestoneId,
  );
  if (milestone.error) return dbFailure("load Goal milestone", milestone.error);
  if (!milestone.data) return notFound("Goal milestone");
  const task = (await client
    .from("tasks")
    .select("id,title,goal_id,project_id,archived_at")
    .eq("user_id", input.userId)
    .eq("id", input.taskId)
    .is("archived_at", null)
    .maybeSingle()) as SupabaseQueryResult<TaskTitleRow>;
  if (task.error) return dbFailure("load Task", task.error);
  if (!task.data)
    return failure("conflict", "Der Task ist nicht mehr verfügbar.");
  let projectGoal: string | null = null;
  if (task.data.project_id) {
    const project = (await client
      .from("projects")
      .select("goal_id,archived_at")
      .eq("user_id", input.userId)
      .eq("id", task.data.project_id)
      .is("archived_at", null)
      .maybeSingle()) as SupabaseQueryResult<
      Pick<ProjectTitleRow, "goal_id" | "archived_at">
    >;
    if (project.error) return dbFailure("load Task Project", project.error);
    projectGoal = project.data?.goal_id ?? null;
  }
  if (task.data.goal_id && projectGoal && task.data.goal_id !== projectGoal)
    return failure(
      "conflict",
      "Der Task hat widersprüchliche direkte und geerbte Goal-Zuordnungen.",
    );
  if ((task.data.goal_id ?? projectGoal) !== input.goalId)
    return failure("conflict", "Der Task gehört nicht zu diesem Goal.");
  const result = (await client
    .from("goal_milestone_task_support")
    .insert({
      user_id: input.userId,
      goal_id: input.goalId,
      goal_milestone_id: input.goalMilestoneId,
      task_id: input.taskId,
    })
    .select("id")
    .single()) as SupabaseQueryResult<{ id: string }>;
  if (result.error) return dbFailure("link Task support", result.error);
  if (!result.data) return notFound("Task support");
  return { ok: true, data: result.data };
}

export async function removeGoalTaskSupport(
  client: SupabaseClientLike,
  input: GoalSupportRemoveInput,
): Promise<RepositoryResult<{ id: string }>> {
  const scoped = scopeFailure(input);
  if (scoped) return scoped;
  const result = (await client
    .from("goal_milestone_task_support")
    .delete()
    .eq("user_id", input.userId)
    .eq("goal_id", input.goalId)
    .eq("id", input.supportId)
    .select("id")
    .maybeSingle()) as SupabaseQueryResult<{ id: string }>;
  if (result.error) return dbFailure("remove Task support", result.error);
  if (!result.data) return notFound("Task support");
  return { ok: true, data: result.data };
}

export async function achieveGoal(
  client: SupabaseClientLike,
  input: GoalAchieveInput,
): Promise<RepositoryResult<{ id: string }>> {
  const scoped = scopeFailure(input);
  if (scoped) return scoped;
  const command = await executeGoalCommand(
    client,
    "goal.achieve",
    {
      goal_id: input.goalId,
      expected_updated_at: input.expectedUpdatedAt ?? null,
      note: input.note ?? null,
      references: (input.references ?? []).map((reference) => ({
        source_type: reference.sourceType,
        source_id: reference.sourceId,
        reason: reference.reason ?? null,
      })),
    },
    input.commandId,
  );
  if (!command.ok) return command;
  const id =
    typeof command.data.goal_id === "string"
      ? command.data.goal_id
      : input.goalId;
  return { ok: true, data: { id } };
}

export async function reopenGoal(
  client: SupabaseClientLike,
  input: GoalReopenInput,
): Promise<RepositoryResult<{ id: string }>> {
  const scoped = scopeFailure(input);
  if (scoped) return scoped;
  const command = await executeGoalCommand(
    client,
    "goal.reopen",
    {
      goal_id: input.goalId,
      expected_updated_at: input.expectedUpdatedAt ?? null,
    },
    input.commandId,
  );
  if (!command.ok) return command;
  const id =
    typeof command.data.goal_id === "string"
      ? command.data.goal_id
      : input.goalId;
  return { ok: true, data: { id } };
}

export function criterionStateLabel(criterion: GoalOutcomeCriterion) {
  const state = criterionEvaluationState(criterion, criterion.latestEvaluation);
  if (state === "met") return "erfüllt";
  if (state === "not_met") return "nicht erfüllt";
  if (state === "deferred") return "deferred";
  return "unbewertet";
}

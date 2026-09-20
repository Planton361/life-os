import type {
  GoalCriterionEvaluation,
  GoalMilestone,
  GoalOutcome,
  GoalOutcomeCriterion,
  GoalOutcomeSupportLink,
} from "../../domain/goal-outcome";
import {
  buildGoalOutcomeSummary,
  criterionEvaluationState,
} from "../../domain/goal-outcome";
import type {
  GoalAchieveInput,
  GoalCriterionEvaluationInput,
  GoalMilestoneArchiveInput,
  GoalMilestoneCreateInput,
  GoalMilestoneReorderInput,
  GoalMilestoneStatusInput,
  GoalMilestoneUpdateInput,
  GoalOutcomeCriterionArchiveInput,
  GoalOutcomeCriterionCreateInput,
  GoalProjectSupportInput,
  GoalReopenInput,
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
} from "../row-types";

type GoalSummaryRow = Pick<
  GoalRow,
  "id" | "title" | "status" | "achieved_at" | "achievement_note" | "archived_at"
>;
type ProjectTitleRow = Pick<
  TableRow<"projects">,
  "id" | "title" | "goal_id" | "archived_at"
>;
type TaskTitleRow = Pick<
  TableRow<"tasks">,
  "id" | "title" | "goal_id" | "project_id" | "archived_at"
>;

type OutcomeFailure = RepositoryResult<never>;

function failure(
  code: "adapter_unavailable" | "conflict" | "forbidden" | "not_found",
  message: string,
): OutcomeFailure {
  return { error: { code, message }, ok: false };
}

function dbFailure(operation: string, error?: { message?: string | null }): OutcomeFailure {
  const message = error?.message ?? "";
  const known: Record<string, string> = {
    GOAL_ACHIEVEMENT_NO_ACTIVE_CRITERIA:
      "Mindestens ein aktives Kriterium ist erforderlich.",
    GOAL_ACHIEVEMENT_CRITERIA_NOT_MET:
      "Alle aktiven Kriterien müssen erfüllt sein.",
    GOAL_ACHIEVEMENT_MILESTONES_NOT_ACHIEVED:
      "Alle nicht archivierten Milestones müssen erreicht sein.",
    GOAL_ACHIEVEMENT_GOAL_ARCHIVED: "Ein archiviertes Goal kann nicht erreicht werden.",
    GOAL_ARCHIVED: "Ein archiviertes Goal kann nicht verändert werden.",
    GOAL_CRITERION_ARCHIVED: "Ein archiviertes Kriterium kann nicht bewertet werden.",
    GOAL_NUMERIC_EVALUATION_UNIT: "Die Einheit der Bewertung muss exakt zum Kriterium passen.",
    GOAL_BOOLEAN_EVALUATION_SHAPE: "Boolean-Kriterien akzeptieren nur true oder false.",
    GOAL_PROJECT_SUPPORT_TARGET_INVALID:
      "Das Project gehört nicht zu diesem Goal oder ist archiviert.",
    GOAL_TASK_SUPPORT_TARGET_INVALID:
      "Der Task gehört nicht mehr zum aktiven Benutzerkontext.",
    GOAL_TASK_SUPPORT_GOAL_CONFLICT:
      "Der Task hat widersprüchliche direkte und geerbte Goal-Zuordnungen.",
    GOAL_TASK_SUPPORT_GOAL_MISMATCH:
      "Der Task gehört nicht zu diesem Goal.",
    GOAL_MILESTONE_ARCHIVED: "Ein archivierter Milestone kann nicht verknüpft werden.",
  };
  const knownMessage = Object.entries(known).find(([key]) => message.includes(key))?.[1];
  if (knownMessage) return failure("conflict", knownMessage);
  return failure("adapter_unavailable", `Unable to ${operation}.`);
}

function notFound(entity: string): OutcomeFailure {
  return failure("not_found", `${entity} wurde im aktuellen Benutzerkontext nicht gefunden.`);
}

function forbidden(): OutcomeFailure {
  return failure("forbidden", "Der angeforderte Scope gehört nicht zum aktuellen Benutzer.");
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

function mapEvaluation(row: GoalCriterionEvaluationRow): GoalCriterionEvaluation {
  return {
    id: row.id,
    userId: row.user_id,
    criterionId: row.criterion_id,
    booleanValue: row.boolean_value,
    numericValue: row.numeric_value,
    unit: row.unit,
    evaluatedAt: row.evaluated_at,
    note: row.note,
    createdAt: row.created_at,
  };
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

function scopeFailure(input: { userId: string; profileId: string }) {
  return input.userId === input.profileId ? null : forbidden();
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
): Promise<RepositoryResult<GoalOutcome>> {
  const [goalResult, milestoneResult, criterionResult, evaluationResult, projectSupportResult, taskSupportResult, projectsResult, tasksResult] = await Promise.all([
    ownedGoal(client, userId, goalId, true),
    client.from("goal_milestones").select("*").eq("user_id", userId).eq("goal_id", goalId).order("sort_order").order("created_at").order("id"),
    client.from("goal_outcome_criteria").select("*").eq("user_id", userId).eq("goal_id", goalId).order("created_at").order("id"),
    client.from("goal_criterion_evaluations").select("*").eq("user_id", userId).order("evaluated_at", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: false }),
    client.from("goal_milestone_project_support").select("*").eq("user_id", userId).eq("goal_id", goalId),
    client.from("goal_milestone_task_support").select("*").eq("user_id", userId).eq("goal_id", goalId),
    client.from("projects").select("id,title,goal_id,archived_at").eq("user_id", userId).eq("goal_id", goalId),
    client.from("tasks").select("id,title,goal_id,project_id,archived_at").eq("user_id", userId).is("archived_at", null),
  ]);

  if (goalResult.error) return dbFailure("load Goal outcome", goalResult.error);
  if (!goalResult.data) return notFound("Goal");
  if ([milestoneResult, criterionResult, evaluationResult, projectSupportResult, taskSupportResult, projectsResult, tasksResult].some((result) => result.error)) {
    return dbFailure("load Goal outcome");
  }

  const milestones = (milestoneResult.data ?? []) as GoalMilestoneRow[];
  const evaluations = ((evaluationResult.data ?? []) as GoalCriterionEvaluationRow[]).map(mapEvaluation);
  const criteria = ((criterionResult.data ?? []) as GoalOutcomeCriterionRow[]).map((row) => mapCriterion(row, evaluations));
  const projectTitles = new Map(((projectsResult.data ?? []) as ProjectTitleRow[]).map((row) => [row.id, row.title]));
  const taskTitles = new Map(((tasksResult.data ?? []) as TaskTitleRow[]).map((row) => [row.id, row.title]));
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
      goalStatus: goalResult.data.status,
      achievedAt: goalResult.data.achieved_at,
      achievementNote: goalResult.data.achievement_note,
      milestones: outcomeBase.milestones,
      criteria,
      projectSupport: ((projectSupportResult.data ?? []) as GoalMilestoneProjectSupportRow[]).map((row) => mapProjectSupport(row, projectTitles)),
      taskSupport: ((taskSupportResult.data ?? []) as GoalMilestoneTaskSupportRow[]).map((row) => mapTaskSupport(row, taskTitles)),
      summary,
    },
  };
}

export async function getGoalOutcomeSummaries(
  client: SupabaseClientLike,
  userId: string,
  goalIds?: readonly string[],
): Promise<RepositoryListResult<import("../../domain/goal-outcome").GoalOutcomeSummary>> {
  if (goalIds && goalIds.length === 0) return { ok: true, data: [] };
  let goalsQuery = client
    .from("goals")
    .select("id,title,status,achieved_at,achievement_note,archived_at")
    .eq("user_id", userId)
    .is("archived_at", null);
  if (goalIds) goalsQuery = goalsQuery.in("id", goalIds);
  const [goalsResult, milestonesResult, criteriaResult, evaluationsResult] = await Promise.all([
    goalsQuery,
    client.from("goal_milestones").select("*").eq("user_id", userId),
    client.from("goal_outcome_criteria").select("*").eq("user_id", userId),
    client.from("goal_criterion_evaluations").select("*").eq("user_id", userId).order("evaluated_at", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: false }),
  ]);
  if ([goalsResult, milestonesResult, criteriaResult, evaluationsResult].some((result) => result.error)) return dbFailure("load Goal outcome summaries");
  const goals = (goalsResult.data ?? []) as GoalSummaryRow[];
  const milestones = (milestonesResult.data ?? []) as GoalMilestoneRow[];
  const evaluationRows = ((evaluationsResult.data ?? []) as GoalCriterionEvaluationRow[]).map(mapEvaluation);
  const criteria = (criteriaResult.data ?? []) as GoalOutcomeCriterionRow[];
  return {
    ok: true,
    data: goals.map((goal) => {
      const goalCriteria = criteria.filter((criterion) => criterion.goal_id === goal.id).map((criterion) => mapCriterion(criterion, evaluationRows));
      return buildGoalOutcomeSummary({
        goalId: goal.id,
        goalStatus: goal.status,
        achievedAt: goal.achieved_at,
        criteria: goalCriteria,
        milestones: milestones.filter((milestone) => milestone.goal_id === goal.id).map(mapMilestone),
      });
    }),
  };
}

export async function createGoalMilestone(client: SupabaseClientLike, input: GoalMilestoneCreateInput): Promise<RepositoryResult<GoalMilestone>> {
  const scoped = scopeFailure(input);
  if (scoped) return scoped;
  const goal = await ownedGoal(client, input.userId, input.goalId);
  if (goal.error) return dbFailure("load Goal", goal.error);
  if (!goal.data) return notFound("Goal");
  if (goal.data.status === "achieved") return failure("conflict", "Ein erreichtes Goal kann keine neuen Milestones erhalten.");
  const result = (await client.from("goal_milestones").insert({
    user_id: input.userId,
    goal_id: input.goalId,
    title: input.title,
    description: input.description ?? null,
    target_date: input.targetDate ?? null,
    status: input.status,
    sort_order: input.sortOrder,
  }).select("*").single()) as SupabaseQueryResult<GoalMilestoneRow>;
  if (result.error) return dbFailure("create Goal milestone", result.error);
  if (!result.data) return notFound("Goal milestone");
  return { ok: true, data: mapMilestone(result.data) };
}

export async function updateGoalMilestone(client: SupabaseClientLike, input: GoalMilestoneUpdateInput): Promise<RepositoryResult<GoalMilestone>> {
  const scoped = scopeFailure(input);
  if (scoped) return scoped;
  const goal = await ownedGoal(client, input.userId, input.goalId);
  if (goal.error) return dbFailure("load Goal", goal.error);
  if (!goal.data) return notFound("Goal");
  if (goal.data.status === "achieved") return failure("conflict", "Ein erreichtes Goal kann nicht verändert werden.");
  const result = (await client.from("goal_milestones").update({
    title: input.title,
    description: input.description ?? null,
    target_date: input.targetDate ?? null,
  }).eq("user_id", input.userId).eq("goal_id", input.goalId).eq("id", input.milestoneId).is("archived_at", null).select("*").maybeSingle()) as SupabaseQueryResult<GoalMilestoneRow>;
  if (result.error) return dbFailure("update Goal milestone", result.error);
  if (!result.data) return notFound("Goal milestone");
  return { ok: true, data: mapMilestone(result.data) };
}

export async function setGoalMilestoneStatus(client: SupabaseClientLike, input: GoalMilestoneStatusInput): Promise<RepositoryResult<GoalMilestone>> {
  const scoped = scopeFailure(input);
  if (scoped) return scoped;
  const goal = await ownedGoal(client, input.userId, input.goalId);
  if (goal.error) return dbFailure("load Goal", goal.error);
  if (!goal.data) return notFound("Goal");
  if (goal.data.status === "achieved") return failure("conflict", "Ein erreichtes Goal kann nicht verändert werden.");
  const current = await activeMilestone(client, input.userId, input.goalId, input.milestoneId);
  if (current.error) return dbFailure("load Goal milestone", current.error);
  if (!current.data) return notFound("Goal milestone");
  if (current.data.status === "achieved" && input.status !== "achieved") return failure("conflict", "Ein erreichter Milestone kann nicht zurückgestuft werden.");
  const result = (await client.from("goal_milestones").update({ status: input.status }).eq("user_id", input.userId).eq("goal_id", input.goalId).eq("id", input.milestoneId).is("archived_at", null).select("*").single()) as SupabaseQueryResult<GoalMilestoneRow>;
  if (result.error) return dbFailure("update Goal milestone status", result.error);
  if (!result.data) return notFound("Goal milestone");
  return { ok: true, data: mapMilestone(result.data) };
}

export async function archiveGoalMilestone(client: SupabaseClientLike, input: GoalMilestoneArchiveInput): Promise<RepositoryResult<{ id: string }>> {
  const scoped = scopeFailure(input);
  if (scoped) return scoped;
  const goal = await ownedGoal(client, input.userId, input.goalId);
  if (goal.error) return dbFailure("load Goal", goal.error);
  if (!goal.data) return notFound("Goal");
  if (goal.data.status === "achieved") return failure("conflict", "Ein erreichtes Goal kann nicht verändert werden.");
  const result = (await client.from("goal_milestones").update({ status: "archived", archived_at: new Date().toISOString() }).eq("user_id", input.userId).eq("goal_id", input.goalId).eq("id", input.milestoneId).is("archived_at", null).select("id").maybeSingle()) as SupabaseQueryResult<{ id: string }>;
  if (result.error) return dbFailure("archive Goal milestone", result.error);
  if (!result.data) return notFound("Goal milestone");
  return { ok: true, data: result.data };
}

export async function reorderGoalMilestone(client: SupabaseClientLike, input: GoalMilestoneReorderInput): Promise<RepositoryResult<{ id: string }>> {
  const scoped = scopeFailure(input);
  if (scoped) return scoped;
  const goal = await ownedGoal(client, input.userId, input.goalId);
  if (goal.error) return dbFailure("load Goal", goal.error);
  if (!goal.data) return notFound("Goal");
  if (goal.data.status === "achieved") return failure("conflict", "Ein erreichtes Goal kann nicht verändert werden.");
  const current = await activeMilestone(client, input.userId, input.goalId, input.milestoneId);
  if (current.error) return dbFailure("load Goal milestone", current.error);
  if (!current.data) return notFound("Goal milestone");
  const siblingsResult = await client.from("goal_milestones").select("id,sort_order").eq("user_id", input.userId).eq("goal_id", input.goalId).is("archived_at", null).order("sort_order").order("id");
  if (siblingsResult.error) return dbFailure("load Goal milestone order", siblingsResult.error);
  const siblings = (siblingsResult.data ?? []) as Array<Pick<GoalMilestoneRow, "id" | "sort_order">>;
  const index = siblings.findIndex((row) => row.id === input.milestoneId);
  const nextIndex = input.direction === "up" ? index - 1 : index + 1;
  if (index < 0 || nextIndex < 0 || nextIndex >= siblings.length) return { ok: true, data: { id: input.milestoneId } };
  const other = siblings[nextIndex]!;
  const first = await client.from("goal_milestones").update({ sort_order: other.sort_order }).eq("user_id", input.userId).eq("id", current.data.id);
  if (first.error) return dbFailure("reorder Goal milestone", first.error);
  const second = await client.from("goal_milestones").update({ sort_order: current.data.sort_order }).eq("user_id", input.userId).eq("id", other.id);
  if (second.error) return dbFailure("reorder Goal milestone", second.error);
  return { ok: true, data: { id: input.milestoneId } };
}

export async function createGoalCriterion(client: SupabaseClientLike, input: GoalOutcomeCriterionCreateInput): Promise<RepositoryResult<GoalOutcomeCriterion>> {
  const scoped = scopeFailure(input);
  if (scoped) return scoped;
  const goal = await ownedGoal(client, input.userId, input.goalId);
  if (goal.error) return dbFailure("load Goal", goal.error);
  if (!goal.data) return notFound("Goal");
  if (goal.data.status === "achieved") return failure("conflict", "Ein erreichtes Goal kann keine neuen Kriterien erhalten.");
  if (input.goalMilestoneId) {
    const milestone = await activeMilestone(client, input.userId, input.goalId, input.goalMilestoneId);
    if (milestone.error) return dbFailure("load Goal milestone", milestone.error);
    if (!milestone.data) return notFound("Goal milestone");
  }
  const result = (await client.from("goal_outcome_criteria").insert({
    user_id: input.userId,
    goal_id: input.goalId,
    goal_milestone_id: input.goalMilestoneId ?? null,
    title: input.title,
    criterion_type: input.criterionType,
    unit: input.criterionType === "numeric" ? input.unit ?? null : null,
    target: input.criterionType === "numeric" ? input.target ?? null : null,
    direction: input.criterionType === "numeric" ? input.direction ?? null : null,
  }).select("*").single()) as SupabaseQueryResult<GoalOutcomeCriterionRow>;
  if (result.error) return dbFailure("create Goal criterion", result.error);
  if (!result.data) return notFound("Goal criterion");
  return { ok: true, data: mapCriterion(result.data, []) };
}

export async function archiveGoalCriterion(client: SupabaseClientLike, input: GoalOutcomeCriterionArchiveInput): Promise<RepositoryResult<{ id: string }>> {
  const scoped = scopeFailure(input);
  if (scoped) return scoped;
  const goal = await ownedGoal(client, input.userId, input.goalId);
  if (goal.error) return dbFailure("load Goal", goal.error);
  if (!goal.data) return notFound("Goal");
  if (goal.data.status === "achieved") return failure("conflict", "Ein erreichtes Goal kann nicht verändert werden.");
  const result = (await client.from("goal_outcome_criteria").update({ archived_at: new Date().toISOString() }).eq("user_id", input.userId).eq("goal_id", input.goalId).eq("id", input.criterionId).is("archived_at", null).select("id").maybeSingle()) as SupabaseQueryResult<{ id: string }>;
  if (result.error) return dbFailure("archive Goal criterion", result.error);
  if (!result.data) return notFound("Goal criterion");
  return { ok: true, data: result.data };
}

export async function appendGoalCriterionEvaluation(client: SupabaseClientLike, input: GoalCriterionEvaluationInput): Promise<RepositoryResult<GoalCriterionEvaluation>> {
  const scoped = scopeFailure(input);
  if (scoped) return scoped;
  const goal = await ownedGoal(client, input.userId, input.goalId);
  if (goal.error) return dbFailure("load Goal", goal.error);
  if (!goal.data) return notFound("Goal");
  if (goal.data.status === "achieved") return failure("conflict", "Ein erreichtes Goal kann nicht verändert werden.");
  const criterion = await activeCriterion(client, input.userId, input.goalId, input.criterionId);
  if (criterion.error) return dbFailure("load Goal criterion", criterion.error);
  if (!criterion.data) return notFound("Goal criterion");
  if (criterion.data.criterion_type !== input.criterionType) return failure("conflict", "Der Kriterientyp hat sich geändert; bitte neu laden.");
  if (input.criterionType === "numeric" && input.unit?.trim() !== criterion.data.unit) return failure("conflict", "Die Einheit der Bewertung muss exakt zum Kriterium passen.");
  const result = (await client.from("goal_criterion_evaluations").insert({
    user_id: input.userId,
    criterion_id: input.criterionId,
    boolean_value: input.criterionType === "boolean" ? input.booleanValue ?? null : null,
    numeric_value: input.criterionType === "numeric" ? input.numericValue ?? null : null,
    unit: input.criterionType === "numeric" ? input.unit ?? null : null,
    note: input.note ?? null,
  }).select("*").single()) as SupabaseQueryResult<GoalCriterionEvaluationRow>;
  if (result.error) return dbFailure("save Goal criterion evaluation", result.error);
  if (!result.data) return notFound("Goal criterion evaluation");
  return { ok: true, data: mapEvaluation(result.data) };
}

export async function addGoalProjectSupport(client: SupabaseClientLike, input: GoalProjectSupportInput): Promise<RepositoryResult<{ id: string }>> {
  const scoped = scopeFailure(input);
  if (scoped) return scoped;
  const goal = await ownedGoal(client, input.userId, input.goalId);
  if (goal.error) return dbFailure("load Goal", goal.error);
  if (!goal.data) return notFound("Goal");
  if (goal.data.status === "achieved") return failure("conflict", "Ein erreichtes Goal kann nicht verändert werden.");
  const milestone = await activeMilestone(client, input.userId, input.goalId, input.goalMilestoneId);
  if (milestone.error) return dbFailure("load Goal milestone", milestone.error);
  if (!milestone.data) return notFound("Goal milestone");
  const project = (await client.from("projects").select("id,goal_id,archived_at").eq("user_id", input.userId).eq("id", input.projectId).is("archived_at", null).maybeSingle()) as SupabaseQueryResult<Pick<ProjectTitleRow, "id" | "goal_id" | "archived_at">>;
  if (project.error) return dbFailure("load Project", project.error);
  if (!project.data || project.data.goal_id !== input.goalId) return failure("conflict", "Das Project gehört nicht zu diesem Goal.");
  const result = (await client.from("goal_milestone_project_support").insert({ user_id: input.userId, goal_id: input.goalId, goal_milestone_id: input.goalMilestoneId, project_id: input.projectId }).select("id").single()) as SupabaseQueryResult<{ id: string }>;
  if (result.error) return dbFailure("link Project support", result.error);
  if (!result.data) return notFound("Project support");
  return { ok: true, data: result.data };
}

export async function removeGoalProjectSupport(client: SupabaseClientLike, input: GoalSupportRemoveInput): Promise<RepositoryResult<{ id: string }>> {
  const scoped = scopeFailure(input);
  if (scoped) return scoped;
  const result = (await client.from("goal_milestone_project_support").delete().eq("user_id", input.userId).eq("goal_id", input.goalId).eq("id", input.supportId).select("id").maybeSingle()) as SupabaseQueryResult<{ id: string }>;
  if (result.error) return dbFailure("remove Project support", result.error);
  if (!result.data) return notFound("Project support");
  return { ok: true, data: result.data };
}

export async function addGoalTaskSupport(client: SupabaseClientLike, input: GoalTaskSupportInput): Promise<RepositoryResult<{ id: string }>> {
  const scoped = scopeFailure(input);
  if (scoped) return scoped;
  const goal = await ownedGoal(client, input.userId, input.goalId);
  if (goal.error) return dbFailure("load Goal", goal.error);
  if (!goal.data) return notFound("Goal");
  if (goal.data.status === "achieved") return failure("conflict", "Ein erreichtes Goal kann nicht verändert werden.");
  const milestone = await activeMilestone(client, input.userId, input.goalId, input.goalMilestoneId);
  if (milestone.error) return dbFailure("load Goal milestone", milestone.error);
  if (!milestone.data) return notFound("Goal milestone");
  const task = (await client.from("tasks").select("id,title,goal_id,project_id,archived_at").eq("user_id", input.userId).eq("id", input.taskId).is("archived_at", null).maybeSingle()) as SupabaseQueryResult<TaskTitleRow>;
  if (task.error) return dbFailure("load Task", task.error);
  if (!task.data) return failure("conflict", "Der Task ist nicht mehr verfügbar.");
  let projectGoal: string | null = null;
  if (task.data.project_id) {
    const project = (await client.from("projects").select("goal_id,archived_at").eq("user_id", input.userId).eq("id", task.data.project_id).is("archived_at", null).maybeSingle()) as SupabaseQueryResult<Pick<ProjectTitleRow, "goal_id" | "archived_at">>;
    if (project.error) return dbFailure("load Task Project", project.error);
    projectGoal = project.data?.goal_id ?? null;
  }
  if (task.data.goal_id && projectGoal && task.data.goal_id !== projectGoal) return failure("conflict", "Der Task hat widersprüchliche direkte und geerbte Goal-Zuordnungen.");
  if ((task.data.goal_id ?? projectGoal) !== input.goalId) return failure("conflict", "Der Task gehört nicht zu diesem Goal.");
  const result = (await client.from("goal_milestone_task_support").insert({ user_id: input.userId, goal_id: input.goalId, goal_milestone_id: input.goalMilestoneId, task_id: input.taskId }).select("id").single()) as SupabaseQueryResult<{ id: string }>;
  if (result.error) return dbFailure("link Task support", result.error);
  if (!result.data) return notFound("Task support");
  return { ok: true, data: result.data };
}

export async function removeGoalTaskSupport(client: SupabaseClientLike, input: GoalSupportRemoveInput): Promise<RepositoryResult<{ id: string }>> {
  const scoped = scopeFailure(input);
  if (scoped) return scoped;
  const result = (await client.from("goal_milestone_task_support").delete().eq("user_id", input.userId).eq("goal_id", input.goalId).eq("id", input.supportId).select("id").maybeSingle()) as SupabaseQueryResult<{ id: string }>;
  if (result.error) return dbFailure("remove Task support", result.error);
  if (!result.data) return notFound("Task support");
  return { ok: true, data: result.data };
}

export async function achieveGoal(client: SupabaseClientLike, input: GoalAchieveInput): Promise<RepositoryResult<{ id: string }>> {
  const scoped = scopeFailure(input);
  if (scoped) return scoped;
  const result = (await client.from("goals").update({ status: "achieved", achievement_note: input.note ?? null }).eq("user_id", input.userId).eq("id", input.goalId).is("archived_at", null).select("id").maybeSingle()) as SupabaseQueryResult<{ id: string }>;
  if (result.error) return dbFailure("achieve Goal", result.error);
  if (!result.data) return notFound("Goal");
  return { ok: true, data: result.data };
}

export async function reopenGoal(client: SupabaseClientLike, input: GoalReopenInput): Promise<RepositoryResult<{ id: string }>> {
  const scoped = scopeFailure(input);
  if (scoped) return scoped;
  const result = (await client.from("goals").update({ status: "active", achieved_at: null, achievement_note: null }).eq("user_id", input.userId).eq("id", input.goalId).eq("status", "achieved").is("archived_at", null).select("id").maybeSingle()) as SupabaseQueryResult<{ id: string }>;
  if (result.error) return dbFailure("reopen Goal", result.error);
  if (!result.data) return notFound("erreichtes Goal");
  return { ok: true, data: result.data };
}

export function criterionStateLabel(criterion: GoalOutcomeCriterion) {
  const state = criterionEvaluationState(criterion, criterion.latestEvaluation);
  if (state === "met") return "erfüllt";
  if (state === "not_met") return "nicht erfüllt";
  return "unbewertet";
}

import {
  taskDependencyContext,
  type TaskDependencyGraph,
} from "./task-dependencies";

export const goalMilestoneStatuses = [
  "planned",
  "active",
  "achieved",
  "archived",
] as const;

export type GoalMilestoneStatus = (typeof goalMilestoneStatuses)[number];

export const goalCriterionTypes = ["boolean", "numeric"] as const;
export type GoalCriterionType = (typeof goalCriterionTypes)[number];

export const goalCriterionDirections = [
  "at_least",
  "at_most",
  "exact",
] as const;
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
  evidenceHistory?: readonly GoalEvidenceReference[];
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
  action: "attached" | "replaced" | "withdrawn" | "supplemented";
  sourceType: GoalEvidenceSourceType;
  sourceId: string;
  sourceTitle: string;
  sourceContext: Record<string, unknown> | null;
  supersedesReferenceId: string | null;
  reason: string | null;
  retrospective: boolean;
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
  evidenceHistory: readonly GoalEvidenceReference[];
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
  priorStatus: "draft" | "active" | "paused" | "achieved" | "archived" | null;
  resultingStatus:
    | "draft"
    | "active"
    | "paused"
    | "achieved"
    | "archived"
    | null;
  achievementNote: string | null;
  legacyState: Record<string, unknown> | null;
  correctsEventId: string | null;
  correctionReason: string | null;
  retrospective: boolean;
  commandId: string | null;
  criterionBasis: readonly GoalAchievementCriterionBasis[];
  milestoneBasis: readonly GoalAchievementMilestoneBasis[];
  evidence: readonly GoalEvidenceReference[];
  evidenceHistory: readonly GoalEvidenceReference[];
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
  state: "ready" | "blocked" | "planning";
  kind: "task" | "project" | "goal";
  id: string | null;
  title: string;
  href: string | null;
  reason: string;
  blockers: readonly { id: string | null; title: string }[];
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

export type GoalJourneyAction =
  | "achieved"
  | "archived"
  | "define_outcome"
  | "create_first_milestone"
  | "select_current_milestone"
  | "resolve_blocker"
  | "open_ready_task"
  | "create_next_task"
  | "review_milestone"
  | "review_goal";

export type GoalJourneyGuidance = {
  action: GoalJourneyAction;
  title: string;
  reason: string;
  task: GoalPathTaskContext | null;
  blockers: readonly { id: string | null; title: string }[];
};

type AchievementEpisodeEvent = {
  id: string;
  episodeId: string;
  eventType: "achieved" | "reopened" | "amended";
  occurredAt: string | null;
  resultingStatus: string | null;
  recordedAt: string;
  correctsEventId: string | null;
};

function recordedOrder(
  left: Pick<AchievementEpisodeEvent, "recordedAt" | "id">,
  right: Pick<AchievementEpisodeEvent, "recordedAt" | "id">,
) {
  return (
    right.recordedAt.localeCompare(left.recordedAt) ||
    right.id.localeCompare(left.id)
  );
}

function lifecycleOrder(
  left: Pick<AchievementEpisodeEvent, "occurredAt" | "recordedAt" | "id">,
  right: Pick<AchievementEpisodeEvent, "occurredAt" | "recordedAt" | "id">,
) {
  if (left.occurredAt && right.occurredAt) {
    return (
      right.occurredAt.localeCompare(left.occurredAt) ||
      recordedOrder(left, right)
    );
  }
  if (left.occurredAt) return -1;
  if (right.occurredAt) return 1;
  return recordedOrder(left, right);
}

function latestEffectiveEpisodeEvent<T extends AchievementEpisodeEvent>(
  events: readonly T[],
  episodeId: string,
) {
  const candidates = events.filter(
    (event) =>
      event.episodeId === episodeId &&
      (event.eventType === "achieved" || event.eventType === "amended") &&
      event.resultingStatus === "achieved",
  );
  const correctedEventIds = new Set(
    candidates
      .map((event) => event.correctsEventId)
      .filter((id): id is string => Boolean(id)),
  );
  return (
    candidates
      .filter((event) => !correctedEventIds.has(event.id))
      .sort(recordedOrder)[0] ??
    candidates.sort(recordedOrder)[0] ??
    null
  );
}

/**
 * Finds the episode that still represents the current achieved state.
 *
 * A reopen closes an episode permanently. Later amendments are historical
 * assertions about that episode and must not reopen it, even when their
 * recorded_at value is newer than the next episode's achievement.
 */
export function currentOpenAchievementEpisodeId(
  events: readonly AchievementEpisodeEvent[],
  currentStatus: string,
): string | null {
  if (currentStatus !== "achieved") return null;

  const episodes = new Map<string, AchievementEpisodeEvent[]>();
  for (const event of events) {
    const episode = episodes.get(event.episodeId) ?? [];
    episode.push(event);
    episodes.set(event.episodeId, episode);
  }

  return (
    [...episodes.entries()]
      .filter(
        ([, episode]) =>
          !episode.some((event) => event.eventType === "reopened"),
      )
      .map(([episodeId, episode]) => ({
        episodeId,
        achievement: episode
          .filter(
            (event) =>
              event.eventType === "achieved" &&
              event.resultingStatus === "achieved",
          )
          .sort(lifecycleOrder)[0],
      }))
      .filter(
        (
          candidate,
        ): candidate is {
          episodeId: string;
          achievement: AchievementEpisodeEvent;
        } => Boolean(candidate.achievement),
      )
      .sort((left, right) =>
        lifecycleOrder(left.achievement, right.achievement),
      )
      .at(0)?.episodeId ?? null
  );
}

export function latestGoalAchievementEventInEpisode(
  events: readonly GoalAchievementEvent[],
  episodeId: string,
): GoalAchievementEvent | null {
  return latestEffectiveEpisodeEvent(events, episodeId);
}

export function currentGoalAchievementEvent(
  events: readonly GoalAchievementEvent[],
  goalStatus: GoalOutcomeSummary["status"],
): GoalAchievementEvent | null {
  const episodeId = currentOpenAchievementEpisodeId(events, goalStatus);
  return episodeId
    ? latestGoalAchievementEventInEpisode(events, episodeId)
    : null;
}

export function latestGoalMilestoneAchievementEventInEpisode(
  events: readonly GoalMilestoneAchievementEvent[],
  episodeId: string,
): GoalMilestoneAchievementEvent | null {
  return latestEffectiveEpisodeEvent(events, episodeId);
}

export function currentGoalMilestoneAchievementEvent(
  milestoneId: string,
  milestoneStatus: GoalMilestoneStatus,
  events: readonly GoalMilestoneAchievementEvent[],
): GoalMilestoneAchievementEvent | null {
  const milestoneEvents = events.filter(
    (event) => event.milestoneId === milestoneId,
  );
  const episodeId = currentOpenAchievementEpisodeId(
    milestoneEvents,
    milestoneStatus,
  );
  return episodeId
    ? latestGoalMilestoneAchievementEventInEpisode(milestoneEvents, episodeId)
    : null;
}

export function latestGoalAchievementEvent(
  events: readonly GoalAchievementEvent[],
  goalStatus: GoalOutcomeSummary["status"] = "achieved",
): GoalAchievementEvent | null {
  return currentGoalAchievementEvent(events, goalStatus);
}

function evidenceSort(
  left: GoalEvidenceReference,
  right: GoalEvidenceReference,
) {
  return (
    right.recordedAt.localeCompare(left.recordedAt) ||
    right.id.localeCompare(left.id)
  );
}

/**
 * Projects a linear evidence ledger without relying on timestamp ordering to
 * decide which correction won. A valid chain has one leaf per reference group;
 * the successor relation remains authoritative even when recorded_at ties.
 */
export function projectGoalEvidenceReferences(
  references: readonly GoalEvidenceReference[],
) {
  const history = [...references].sort(evidenceSort);
  const supersededIds = new Set(
    history
      .map((reference) => reference.supersedesReferenceId)
      .filter((id): id is string => Boolean(id)),
  );
  const active = history
    .filter((reference) => !supersededIds.has(reference.id))
    .filter((reference) => reference.action !== "withdrawn")
    .sort(evidenceSort);
  return { active, history };
}

export function resolveAchievementCorrectionRootEventId<
  T extends Pick<GoalAchievementEvent, "id" | "correctsEventId">,
>(eventId: string, events: readonly T[]) {
  const byId = new Map(events.map((event) => [event.id, event]));
  const seen = new Set<string>();
  let currentId = eventId;
  while (!seen.has(currentId)) {
    seen.add(currentId);
    const parentId = byId.get(currentId)?.correctsEventId;
    if (!parentId || !byId.has(parentId)) break;
    currentId = parentId;
  }
  return currentId;
}

export function correctionChainEventIds<
  T extends Pick<GoalAchievementEvent, "id" | "correctsEventId"> & {
    episodeId: string;
  },
>(eventId: string, events: readonly T[]) {
  const target = events.find((event) => event.id === eventId);
  if (!target) return [] as string[];
  const rootId = resolveAchievementCorrectionRootEventId(eventId, events);
  return events
    .filter(
      (event) =>
        event.episodeId === target.episodeId &&
        resolveAchievementCorrectionRootEventId(event.id, events) === rootId,
    )
    .map((event) => event.id);
}

/** Resolve the immutable basis owner for an achieved event amendment chain. */
export function resolveGoalAchievementBasisEventId(
  eventId: string,
  events: readonly Pick<GoalAchievementEvent, "id" | "correctsEventId">[],
) {
  return resolveAchievementCorrectionRootEventId(eventId, events);
}

function numericValue(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function criterionEvaluationState(
  criterion: Pick<
    GoalOutcomeCriterion,
    "criterionType" | "target" | "direction"
  >,
  evaluation:
    | Pick<
        GoalCriterionEvaluation,
        "booleanValue" | "numericValue" | "deferred"
      >
    | null
    | undefined,
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

const executableTaskStatuses = new Set(["planned", "active"]);

function taskSortScore(task: GoalPathTaskContext) {
  const statusScore =
    task.status === "active" ? 0 : task.status === "planned" ? 1 : 2;
  const date = task.dueAt ?? task.plannedDate ?? "9999-12-31";
  return `${statusScore}:${date}:${task.title.toLocaleLowerCase()}:${task.id}`;
}

export function deriveGoalNextStep(input: {
  goalId: string;
  goalStatus: GoalOutcomeSummary["status"];
  tasks: readonly GoalPathTaskContext[];
  projects: readonly GoalPathProjectContext[];
  dependencyGraph?: TaskDependencyGraph;
}): GoalNextStepCue {
  const dependencyGraph = input.dependencyGraph ?? {
    tasks: [],
    dependencies: [],
  };
  const candidateTasks = input.tasks
    .filter(
      (task) => !task.archivedAt && executableTaskStatuses.has(task.status),
    )
    .sort((left, right) =>
      taskSortScore(left).localeCompare(taskSortScore(right)),
    );
  const readyTasks = candidateTasks.filter(
    (task) =>
      taskDependencyContext(dependencyGraph, task.id).availability === "READY",
  );
  const task = readyTasks[0];
  if (task) {
    return {
      state: "ready",
      kind: "task",
      id: task.id,
      title: task.title,
      href: `/tasks/${task.id}`,
      reason:
        task.status === "active"
          ? "Bereits aktiver nächster Task."
          : "Bereits geplanter nächster Task.",
      blockers: [],
    };
  }

  const blockedTask = candidateTasks.find(
    (candidate) =>
      taskDependencyContext(dependencyGraph, candidate.id).availability ===
      "BLOCKED",
  );
  if (blockedTask) {
    const blockers = taskDependencyContext(
      dependencyGraph,
      blockedTask.id,
    ).blockers.map(({ task: predecessor }) => ({
      id: predecessor?.id ?? null,
      title: predecessor?.title ?? "Unbekannter Vorgänger",
    }));
    return {
      state: "blocked",
      kind: "task",
      id: blockedTask.id,
      title: blockedTask.title,
      href: `/tasks/${blockedTask.id}`,
      reason: blockers.length
        ? `Blockiert durch: ${blockers.map((blocker) => blocker.title).join(", ")}.`
        : "Blockiert durch einen nicht verfügbaren Vorgänger.",
      blockers,
    };
  }

  const project = input.projects
    .filter(
      (candidate) =>
        !candidate.archivedAt &&
        candidate.status !== "completed" &&
        candidate.status !== "archived",
    )
    .sort((left, right) =>
      `${left.status}:${left.targetDate ?? "9999-12-31"}:${left.title}`.localeCompare(
        `${right.status}:${right.targetDate ?? "9999-12-31"}:${right.title}`,
      ),
    )[0];
  if (project) {
    return {
      state: "planning",
      kind: "project",
      id: project.id,
      title: project.nextStep?.trim() || project.title,
      href: `/projects/${project.id}`,
      reason: project.nextStep?.trim()
        ? "Next Step aus dem kanonischen Project-Kontext."
        : "Project-Kontext als nächster sichtbarer Planungsschritt; noch nicht ausführbar.",
      blockers: [],
    };
  }

  return {
    state: "planning",
    kind: "goal",
    id: input.goalId,
    title:
      input.goalStatus === "achieved"
        ? "Outcome und Verlauf prüfen."
        : "Einen nächsten Task oder ein Project aus diesem Goal anlegen.",
    href: `/goals/${input.goalId}#weg-zum-ziel`,
    reason:
      input.goalStatus === "achieved"
        ? "Goal ist erreicht; der Verlauf bleibt die führende Orientierung."
        : candidateTasks.length === 0
          ? "Kein ausführbarer Task vorhanden; einen nächsten Schritt bewusst planen."
          : "Noch kein kanonischer Task- oder Project-Schritt vorhanden.",
    blockers: [],
  };
}

export function buildGoalOutcomeSummary(
  outcome: Pick<
    GoalOutcome,
    "goalId" | "goalStatus" | "achievedAt" | "milestones" | "criteria"
  >,
): GoalOutcomeSummary {
  const activeCriteria = outcome.criteria.filter(
    (criterion) => !criterion.archivedAt,
  );
  const activeMilestones = outcome.milestones.filter(
    (milestone) => !milestone.archivedAt,
  );
  const metCriteriaCount = activeCriteria.filter(
    (criterion) =>
      criterionEvaluationState(criterion, criterion.latestEvaluation) === "met",
  ).length;
  const unverifiedCriteriaCount = activeCriteria.filter(
    (criterion) =>
      criterionEvaluationState(criterion, criterion.latestEvaluation) ===
      "unverified",
  ).length;
  const deferredCriteriaCount = activeCriteria.filter(
    (criterion) =>
      criterionEvaluationState(criterion, criterion.latestEvaluation) ===
      "deferred",
  ).length;
  const blockers: string[] = [];

  if (outcome.goalStatus !== "active") {
    blockers.push(
      "Nur aktive Goals können erreicht werden. Goal zuerst aktivieren.",
    );
  }

  if (activeCriteria.length === 0)
    blockers.push("Mindestens ein aktives Kriterium definieren.");
  if (
    activeCriteria.some(
      (criterion) =>
        criterionEvaluationState(criterion, criterion.latestEvaluation) !==
        "met",
    )
  ) {
    blockers.push(
      `${metCriteriaCount} von ${activeCriteria.length} Kriterien erfüllt.`,
    );
  }
  if (deferredCriteriaCount > 0) {
    blockers.push(`${deferredCriteriaCount} Kriterium/Kriterien deferred.`);
  }
  const unfinishedMilestones = activeMilestones.filter(
    (milestone) => milestone.status !== "achieved",
  );
  if (unfinishedMilestones.length > 0) {
    blockers.push(
      `${unfinishedMilestones.length} Etappe(n) noch nicht erreicht.`,
    );
  }

  return {
    goalId: outcome.goalId,
    activeCriteriaCount: activeCriteria.length,
    metCriteriaCount,
    unverifiedCriteriaCount,
    deferredCriteriaCount,
    activeMilestoneCount: activeMilestones.length,
    achievedMilestoneCount:
      activeMilestones.length - unfinishedMilestones.length,
    readyToAchieve: blockers.length === 0,
    blockers,
    status: outcome.goalStatus,
    achievedAt: outcome.achievedAt,
  };
}

/**
 * Selects the one user-facing Goal action from canonical Goal, Milestone,
 * support and Task Dependency state. Milestone order never affects readiness.
 */
export function deriveGoalJourneyGuidance(
  outcome: GoalOutcome,
  dependencyGraph: TaskDependencyGraph,
): GoalJourneyGuidance {
  const activeMilestones = outcome.milestones.filter(
    (milestone) => !milestone.archivedAt && milestone.status !== "archived",
  );
  const unfinishedMilestones = activeMilestones.filter(
    (milestone) => milestone.status !== "achieved",
  );
  const currentMilestone = activeMilestones.find(
    (milestone) => milestone.status === "active",
  );
  const noTask: GoalPathTaskContext | null = null;

  if (outcome.goalStatus === "achieved") {
    return {
      action: "achieved",
      title: "Erreichtes Ergebnis",
      reason:
        "Das Ergebnis bleibt zusammen mit seiner damaligen Grundlage und dem Verlauf nachvollziehbar.",
      task: noTask,
      blockers: [],
    };
  }
  if (outcome.goalStatus === "archived") {
    return {
      action: "archived",
      title: "Archiviertes Ziel",
      reason:
        "Dieses Ziel ist schreibgeschützt. Die frühere Journey und ihre Entscheidungen bleiben nachvollziehbar.",
      task: noTask,
      blockers: [],
    };
  }

  const activeCriteria = outcome.criteria.filter(
    (criterion) => !criterion.archivedAt,
  );
  if (activeCriteria.length === 0) {
    return {
      action: "define_outcome",
      title: "Definition of Done festlegen",
      reason:
        "Lege fest, woran du später erkennst, dass das gewünschte Ergebnis erreicht ist.",
      task: noTask,
      blockers: [],
    };
  }

  if (activeMilestones.length === 0) {
    return {
      action: "create_first_milestone",
      title: "Die erste Etappe planen",
      reason:
        "Die Definition of Done steht. Forme jetzt den Weg in ein überprüfbares Zwischenresultat.",
      task: noTask,
      blockers: [],
    };
  }

  if (!currentMilestone && unfinishedMilestones.length > 0) {
    return {
      action: "select_current_milestone",
      title: "Eine aktuelle Etappe festlegen",
      reason:
        "Es gibt noch offene Etappen, aber keine aktuelle. Wähle bewusst, woran du jetzt arbeitest.",
      task: noTask,
      blockers: [],
    };
  }

  if (!currentMilestone) {
    return {
      action: "review_goal",
      title: "Das Ergebnis gegen die Definition of Done prüfen",
      reason: outcome.summary.readyToAchieve
        ? "Alle Etappen sind bestätigt. Prüfe jetzt das finale Ergebnis und entscheide ausdrücklich über die Zielerreichung."
        : `Alle Etappen sind bestätigt. Für das finale Review fehlt noch: ${outcome.summary.blockers.join(" ")}`,
      task: noTask,
      blockers: [],
    };
  }

  const supportedTaskIds = new Set(
    outcome.taskSupport
      .filter((link) => link.goalMilestoneId === currentMilestone.id)
      .map((link) => link.targetId),
  );
  const currentTasks = outcome.tasks.filter(
    (task) => supportedTaskIds.has(task.id) && !task.archivedAt,
  );
  const candidateTasks = currentTasks
    .filter((task) => executableTaskStatuses.has(task.status))
    .sort((left, right) =>
      taskSortScore(left).localeCompare(taskSortScore(right)),
    );
  const blocked = candidateTasks.find(
    (task) =>
      taskDependencyContext(dependencyGraph, task.id).availability ===
      "BLOCKED",
  );
  if (blocked) {
    const blockers = taskDependencyContext(
      dependencyGraph,
      blocked.id,
    ).blockers.map(({ task }) => ({
      id: task?.id ?? null,
      title: task?.title ?? "Unbekannter Vorgänger",
    }));
    return {
      action: "resolve_blocker",
      title: blocked.title,
      reason: blockers.length
        ? `Diese Aufgabe wartet auf ${blockers.map((item) => `„${item.title}“`).join(", ")}.`
        : "Diese Aufgabe wartet auf eine offene Aufgaben-Voraussetzung.",
      task: blocked,
      blockers,
    };
  }

  const ready = candidateTasks.find(
    (task) =>
      taskDependencyContext(dependencyGraph, task.id).availability === "READY",
  );
  if (ready) {
    return {
      action: "open_ready_task",
      title: ready.title,
      reason:
        "Diese Aufgabe gehört zur aktuellen Etappe und hat keine offene Aufgaben-Voraussetzung.",
      task: ready,
      blockers: [],
    };
  }

  if (
    currentTasks.length > 0 &&
    currentTasks.every((task) => ["done", "completed"].includes(task.status))
  ) {
    return {
      action: "review_milestone",
      title: currentMilestone.title,
      reason: `Die geplanten Aufgaben dieser Etappe sind abgeschlossen. Prüfe das Zwischenresultat „${currentMilestone.title}“ und bestätige es ausdrücklich.`,
      task: noTask,
      blockers: [],
    };
  }

  return {
    action: "create_next_task",
    title: currentMilestone.title,
    reason:
      currentTasks.length === 0
        ? "Der aktuellen Etappe ist noch keine Aufgabe zugeordnet. Plane einen konkreten nächsten Schritt."
        : "Für die aktuelle Etappe gibt es keine startbare Aufgabe. Plane einen konkreten nächsten Schritt oder prüfe die Aufgaben-Voraussetzungen.",
    task: noTask,
    blockers: [],
  };
}

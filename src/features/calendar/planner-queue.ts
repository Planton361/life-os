import { resolveTaskGoalAlignment } from "../real-data/domain/task-goal-alignment";
import type {
  EntityPriority,
  LifeGoal,
  LifeProject,
  LifeTask,
} from "../entities/types";
import type {
  PlannerQueueGoalContext,
  PlannerQueueItem,
  PlannerQueueRankGroup,
  PlannerQueueSkillContext,
} from "./calendar-types";

type PlannerQueueInput = {
  goals: readonly LifeGoal[];
  projects: readonly LifeProject[];
  skillsByTaskId: ReadonlyMap<string, readonly PlannerQueueSkillContext[]>;
  tasks: readonly LifeTask[];
  today: string;
  weekEnd: string;
  weekStart: string;
};

const priorityOrder: Record<EntityPriority, number> = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
  none: 4,
};

const rankOrder: Record<PlannerQueueRankGroup, number> = {
  overdue: 0,
  due_this_week: 1,
  recurring_due: 2,
  project_next_work: 3,
  goal_context_work: 4,
  backlog: 5,
};

function dateOnly(value: string | undefined) {
  return value?.slice(0, 10);
}

function isOpenTask(task: LifeTask) {
  return (
    task.status !== "done" &&
    task.status !== "canceled" &&
    task.status !== "waiting"
  );
}

function isInRange(date: string | undefined, start: string, end: string) {
  return Boolean(date && date >= start && date <= end);
}

function goalContext(
  task: LifeTask,
  project: LifeProject | undefined,
  goalById: ReadonlyMap<string, LifeGoal>,
): PlannerQueueGoalContext | undefined {
  const directGoal = task.goalId ? goalById.get(task.goalId) : undefined;
  const inheritedGoal = project?.goalId
    ? goalById.get(project.goalId)
    : undefined;
  const alignment = resolveTaskGoalAlignment(
    directGoal?.id,
    inheritedGoal?.id,
  );
  const goal = directGoal ?? inheritedGoal;

  if (!goal) return undefined;

  return {
    alignment,
    id: goal.id,
    title: goal.title,
  };
}

function rankingForTask(
  task: LifeTask,
  project: LifeProject | undefined,
  input: PlannerQueueInput,
): { group: PlannerQueueRankGroup; reason: string } {
  const dueDate = dateOnly(task.dueAt);

  if (dueDate && dueDate < input.today) {
    return { group: "overdue", reason: "Overdue" };
  }

  if (dueDate && isInRange(dueDate, input.today, input.weekEnd)) {
    return {
      group: "due_this_week",
      reason: dueDate === input.today ? "Due today" : `Due ${dueDate}`,
    };
  }

  if (
    task.isGenerated &&
    (isInRange(task.instanceDate, input.weekStart, input.weekEnd) ||
      Boolean(task.instanceDate && task.instanceDate < input.today))
  ) {
    return { group: "recurring_due", reason: "Recurring due" };
  }

  if (project?.status === "active") {
    return { group: "project_next_work", reason: "Project next work" };
  }

  if (task.goalId) {
    return { group: "goal_context_work", reason: "Direct goal work" };
  }

  return { group: "backlog", reason: "Backlog" };
}

function comparePlannerQueueItems(left: PlannerQueueItem, right: PlannerQueueItem) {
  const groupCompare = rankOrder[left.rankingGroup] - rankOrder[right.rankingGroup];
  if (groupCompare !== 0) return groupCompare;

  if (
    left.rankingGroup === "overdue" ||
    left.rankingGroup === "due_this_week"
  ) {
    const deadlineCompare = (left.dueDate ?? "9999-12-31").localeCompare(
      right.dueDate ?? "9999-12-31",
    );
    if (deadlineCompare !== 0) return deadlineCompare;
  }

  const priorityCompare = priorityOrder[left.priority] - priorityOrder[right.priority];
  if (priorityCompare !== 0) return priorityCompare;

  const plannedDateCompare = (left.plannedDate ?? "9999-12-31").localeCompare(
    right.plannedDate ?? "9999-12-31",
  );
  if (plannedDateCompare !== 0) return plannedDateCompare;

  const createdCompare = (left.createdAt ?? "").localeCompare(right.createdAt ?? "");
  if (createdCompare !== 0) return createdCompare;

  return left.id.localeCompare(right.id);
}

/**
 * Builds a single deterministic planning queue from canonical task occurrences.
 * It intentionally does not create or persist any scheduling state.
 */
export function buildPlannerQueue(input: PlannerQueueInput): PlannerQueueItem[] {
  const projectById = new Map(input.projects.map((project) => [project.id, project]));
  const goalById = new Map(input.goals.map((goal) => [goal.id, goal]));

  return input.tasks
    .filter(isOpenTask)
    .filter((task) => !task.startTime)
    .map((task) => {
      const project = task.projectId ? projectById.get(task.projectId) : undefined;
      const ranking = rankingForTask(task, project, input);

      return {
        accent: undefined,
        area: task.areaId,
        createdAt: task.createdAt,
        dueDate: dateOnly(task.dueAt),
        durationMinutes: task.durationMinutes ?? 30,
        goal: goalContext(task, project, goalById),
        id: task.id,
        isRecurringOccurrence: Boolean(task.isGenerated),
        plannedDate: task.date,
        priority: task.priority,
        project: project ? { id: project.id, title: project.title } : undefined,
        rankingGroup: ranking.group,
        rankingReason: ranking.reason,
        scheduleSourceType: task.scheduleSource?.type,
        skills: input.skillsByTaskId.get(task.id) ?? [],
        title: task.title,
      } satisfies PlannerQueueItem;
    })
    .sort(comparePlannerQueueItems);
}

export const plannerQueueRankGroupLabels: Record<PlannerQueueRankGroup, string> = {
  overdue: "Overdue",
  due_this_week: "Due this week",
  recurring_due: "Recurring due",
  project_next_work: "Project next work",
  goal_context_work: "Goal context work",
  backlog: "Backlog",
};

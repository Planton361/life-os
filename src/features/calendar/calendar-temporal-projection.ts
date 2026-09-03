export type CalendarTemporalTask = {
  dueDate?: string | null;
  id: string;
  isRecurringOccurrence?: boolean;
  plannedDate?: string | null;
  scheduledDate?: string | null;
  status: string;
  title: string;
};

export type CalendarTemporalProject = {
  deadline?: string | null;
  id: string;
  title: string;
};

export type CalendarTemporalGoal = {
  id: string;
  targetDate?: string | null;
  title: string;
};

export type CalendarTemporalSignalKind =
  | "planned_task"
  | "scheduled_task"
  | "task_deadline"
  | "project_deadline"
  | "goal_target";

export type CalendarTemporalSignal = {
  date: string;
  id: string;
  isOverdue: boolean;
  isRecurringOccurrence?: boolean;
  kind: CalendarTemporalSignalKind;
  sourceId: string;
  title: string;
};

function datePart(value: string | null | undefined) {
  if (!value) return null;

  const date = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function isOpenTaskStatus(status: string) {
  return status !== "done" && status !== "canceled" && status !== "archived";
}

const signalOrder: Record<CalendarTemporalSignalKind, number> = {
  task_deadline: 0,
  project_deadline: 1,
  goal_target: 2,
  scheduled_task: 3,
  planned_task: 4,
};

export function buildCalendarTemporalSignals({
  goals,
  projects,
  tasks,
  today,
}: Readonly<{
  goals: readonly CalendarTemporalGoal[];
  projects: readonly CalendarTemporalProject[];
  tasks: readonly CalendarTemporalTask[];
  today: string;
}>): CalendarTemporalSignal[] {
  const signals: CalendarTemporalSignal[] = [];

  for (const task of tasks) {
    const scheduledDate = datePart(task.scheduledDate);
    if (scheduledDate) {
      signals.push({
        date: scheduledDate,
        id: `scheduled-task-${task.id}`,
        isOverdue: false,
        kind: "scheduled_task",
        sourceId: task.id,
        title: task.title,
      });
    }

    const plannedDate = datePart(task.plannedDate);
    if (plannedDate && !scheduledDate) {
      signals.push({
        date: plannedDate,
        id: `planned-task-${task.id}`,
        isOverdue: false,
        isRecurringOccurrence: task.isRecurringOccurrence,
        kind: "planned_task",
        sourceId: task.id,
        title: task.title,
      });
    }

    const dueDate = datePart(task.dueDate);
    if (dueDate) {
      signals.push({
        date: dueDate,
        id: `task-deadline-${task.id}`,
        isOverdue: dueDate < today && isOpenTaskStatus(task.status),
        kind: "task_deadline",
        sourceId: task.id,
        title: task.title,
      });
    }
  }

  for (const project of projects) {
    const deadline = datePart(project.deadline);
    if (!deadline) continue;
    signals.push({
      date: deadline,
      id: `project-deadline-${project.id}`,
      isOverdue: false,
      kind: "project_deadline",
      sourceId: project.id,
      title: project.title,
    });
  }

  for (const goal of goals) {
    const targetDate = datePart(goal.targetDate);
    if (!targetDate) continue;
    signals.push({
      date: targetDate,
      id: `goal-target-${goal.id}`,
      isOverdue: false,
      kind: "goal_target",
      sourceId: goal.id,
      title: goal.title,
    });
  }

  return signals.sort(
    (left, right) =>
      left.date.localeCompare(right.date) ||
      signalOrder[left.kind] - signalOrder[right.kind] ||
      left.title.localeCompare(right.title) ||
      left.id.localeCompare(right.id),
  );
}

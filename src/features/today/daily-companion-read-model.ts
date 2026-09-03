export type DailyCompanionTask = {
  date?: string;
  id: string;
  startTime?: string;
  status: string;
};

export type DailyCompanionTaskProjection<T extends DailyCompanionTask> = {
  completed: readonly T[];
  open: readonly T[];
  planned: readonly T[];
  scheduled: readonly T[];
};

function isVisibleTodayTask(task: DailyCompanionTask, today: string) {
  return task.date === today && task.status !== "canceled" && task.status !== "archived";
}

function isCompleted(task: DailyCompanionTask) {
  return task.status === "done";
}

/** Read-only protocol projection; review decisions remain their own canonical source. */
export function buildDailyCompanionTaskProjection<T extends DailyCompanionTask>(
  tasks: readonly T[],
  today: string,
): DailyCompanionTaskProjection<T> {
  const planned = tasks.filter((task) => isVisibleTodayTask(task, today));

  return {
    completed: planned.filter(isCompleted),
    open: planned.filter((task) => !isCompleted(task)),
    planned,
    scheduled: planned.filter((task) => Boolean(task.startTime)),
  };
}

export function dailyCompanionTaskStatusLabel(task: DailyCompanionTask) {
  if (isCompleted(task)) return "Done";
  if (task.startTime) return "Scheduled";
  return "Open planned";
}

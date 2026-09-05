import type { LifeTask } from "@/features/entities/types";

export const dashboardTimeZone = "Europe/Berlin";

const priorityRank: Record<LifeTask["priority"], number> = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
  none: 4,
};

const statusRank: Record<LifeTask["status"], number> = {
  active: 0,
  planned: 1,
  someday: 3,
  waiting: 2,
  inbox: 3,
  done: 4,
  canceled: 5,
};

function zonedParts(date: Date, timeZone = dashboardTimeZone) {
  const parts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(date);
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? "00";

  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    hour: Number(part("hour")),
    minute: Number(part("minute")),
  };
}

export function dashboardLocalDate(
  date = new Date(),
  timeZone = dashboardTimeZone,
) {
  return zonedParts(date, timeZone).date;
}

export function dashboardLocalDayProgress(
  date = new Date(),
  timeZone = dashboardTimeZone,
) {
  const { hour, minute } = zonedParts(date, timeZone);
  const elapsedMinutes = hour * 60 + minute;
  const progress = Math.max(
    0,
    Math.min(100, Math.round((elapsedMinutes / (24 * 60)) * 100)),
  );

  return {
    elapsedMinutes,
    label: "Today",
    progress,
    value: `${progress}%`,
  };
}

/** Calendar progress only: month, ISO week and local day. No task or profile data. */
export function dashboardCalendarTimeProgress(
  date = new Date(),
  timeZone = dashboardTimeZone,
) {
  const { date: localDate, hour, minute } = zonedParts(date, timeZone);
  const [year, month, day] = localDate.split("-").map(Number);
  const elapsedDayMinutes = hour * 60 + minute;
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const mondayOffset = weekday === 0 ? 6 : weekday - 1;
  const elapsedWeekMinutes = mondayOffset * 24 * 60 + elapsedDayMinutes;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const elapsedMonthMinutes = (day - 1) * 24 * 60 + elapsedDayMinutes;
  const percentage = (elapsed: number, total: number) =>
    Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));

  return [
    { label: "Month", progress: percentage(elapsedMonthMinutes, daysInMonth * 24 * 60) },
    { label: "Week", progress: percentage(elapsedWeekMinutes, 7 * 24 * 60) },
    { label: "Day", progress: percentage(elapsedDayMinutes, 24 * 60) },
  ].map((row) => ({ ...row, value: `${row.progress}%` }));
}

function taskTimeRank(task: LifeTask) {
  return task.startTime ?? "99:99";
}

function taskDeadlineRank(task: LifeTask) {
  return task.date ?? "9999-12-31";
}

/** Stable policy: state, time, priority, date, persisted recency, id. */
export function compareDashboardTasks(left: LifeTask, right: LifeTask) {
  const statusCompare = statusRank[left.status] - statusRank[right.status];
  if (statusCompare !== 0) return statusCompare;

  const timeCompare = taskTimeRank(left).localeCompare(taskTimeRank(right));
  if (timeCompare !== 0) return timeCompare;

  const priorityCompare =
    priorityRank[left.priority] - priorityRank[right.priority];
  if (priorityCompare !== 0) return priorityCompare;

  const dateCompare = taskDeadlineRank(left).localeCompare(
    taskDeadlineRank(right),
  );
  if (dateCompare !== 0) return dateCompare;

  const recencyCompare = (
    right.updatedAt ??
    right.createdAt ??
    ""
  ).localeCompare(left.updatedAt ?? left.createdAt ?? "");
  if (recencyCompare !== 0) return recencyCompare;

  return left.id.localeCompare(right.id);
}

export function dashboardTasksForDate(
  tasks: readonly LifeTask[],
  date = dashboardLocalDate(),
) {
  return [...tasks]
    .filter((task) => task.date === date)
    .filter((task) => task.status !== "done" && task.status !== "canceled")
    .sort(compareDashboardTasks);
}

export function dashboardTaskSelection(tasks: readonly LifeTask[]) {
  const ranked = [...tasks].sort(compareDashboardTasks);

  return { current: ranked[0] ?? null, upNext: ranked.slice(1, 4) };
}

export function scheduledFocusMinutes(tasks: readonly LifeTask[]) {
  return tasks.reduce(
    (total, task) =>
      total + (task.startTime ? Math.max(1, task.durationMinutes ?? 30) : 0),
    0,
  );
}

export const habitWindows = ["Morning", "Midday", "Evening"] as const;
export type HabitWindow = (typeof habitWindows)[number];

export type Habit = {
  id: string;
  userId: string;
  profileId: string;
  name: string;
  unit: string | null;
  dailyTarget: number | null;
  defaultIncrement: number;
  window: HabitWindow;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type HabitLog = {
  id: string;
  habitId: string;
  userId: string;
  profileId: string;
  value: number;
  recordedAt: string;
  localDate: string;
  timezone: string;
  archivedAt: string | null;
};

export type HabitWindowSettings = {
  timezone: string;
  morningStartsAt: string;
  middayStartsAt: string;
  eveningStartsAt: string;
};

export type HabitSnapshot = {
  habits: Habit[];
  logs: HabitLog[];
  settings: HabitWindowSettings;
};

export type HabitProgress = {
  currentValue: number;
  percentage: number | null;
  overachieved: boolean;
};

function minutes(time: string) {
  const match = /^(\d{2}):(\d{2})/.exec(time);
  if (!match) return -1;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function resolveHabitWindow(
  localTime: string,
  settings: HabitWindowSettings,
): HabitWindow {
  const value = minutes(localTime);
  const morning = minutes(settings.morningStartsAt);
  const midday = minutes(settings.middayStartsAt);
  const evening = minutes(settings.eveningStartsAt);

  if (value >= morning && value < midday) return "Morning";
  if (value >= midday && value < evening) return "Midday";
  return "Evening";
}

export function aggregateHabitDay(logs: readonly HabitLog[]) {
  return logs.reduce((total, log) => total + log.value, 0);
}

export function habitProgress(
  currentValue: number,
  dailyTarget: number | null,
): HabitProgress {
  if (dailyTarget === null || dailyTarget <= 0) {
    return { currentValue, overachieved: false, percentage: null };
  }

  const percentage = (currentValue / dailyTarget) * 100;
  return { currentValue, overachieved: percentage > 100, percentage };
}

export function orderedDashboardHabits<T extends Pick<Habit, "sortOrder">>(
  habits: readonly T[],
) {
  return [...habits]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .slice(0, 8);
}

export function latestHabitLog(logs: readonly HabitLog[]) {
  return (
    [...logs]
      .filter((log) => log.archivedAt === null)
      .sort((left, right) => {
        const time = right.recordedAt.localeCompare(left.recordedAt);
        return time || right.id.localeCompare(left.id);
      })[0] ?? null
  );
}

export function localDateInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(date);
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? "00";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function localTimeInTimeZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    timeZone,
  }).format(date);
}

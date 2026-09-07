import {
  localDateInTimeZone,
  type Habit,
  type HabitLog,
  type HabitSnapshot,
} from "../../real-data/domain/habit";
export function shiftDay(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function habitDays(
  habit: Habit,
  logs: readonly HabitLog[],
  today: string,
  count: number,
  timezone: string,
) {
  const created = localDateInTimeZone(new Date(habit.createdAt), timezone);
  return Array.from({ length: count }, (_, i) => {
    const date = shiftDay(today, i - count + 1);
    const active = logs.filter(
      (log) =>
        log.habitId === habit.id && !log.archivedAt && log.localDate === date,
    );
    const value = active.reduce((sum, log) => sum + log.value, 0);
    return {
      date,
      value,
      logs: active.length,
      eligible: date >= created,
      completed: habit.dailyTarget !== null && value >= habit.dailyTarget,
    };
  });
}
export function habitSummary(snapshot: HabitSnapshot, today: string) {
  const habits = snapshot.habits.filter((habit) => !habit.archivedAt);
  const logs = snapshot.logs.filter(
    (log) => !log.archivedAt && log.localDate <= today,
  );
  return {
    active: habits.length,
    completed: habits.filter(
      (habit) =>
        habitDays(habit, logs, today, 1, snapshot.settings.timezone)[0]
          .completed,
    ).length,
    targeted: habits.filter((habit) => habit.dailyTarget !== null).length,
    weekActiveDays: new Set(
      logs
        .filter((log) => log.localDate >= shiftDay(today, -6))
        .map((log) => log.localDate),
    ).size,
    monthLogs: logs.filter((log) => log.localDate.startsWith(today.slice(0, 7)))
      .length,
  };
}

import type { Habit, HabitLog, HabitWindowSettings } from "../../domain";
import type { TableRow } from "../database.types";

export function mapHabit(row: TableRow<"habits">): Habit {
  return {
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    dailyTarget: row.daily_target === null ? null : Number(row.daily_target),
    defaultIncrement: Number(row.default_increment),
    id: row.id,
    name: row.name,
    profileId: row.profile_id,
    sortOrder: row.sort_order,
    unit: row.unit,
    updatedAt: row.updated_at,
    userId: row.user_id,
    window: row.time_window as Habit["window"],
  };
}

export function mapHabitLog(row: TableRow<"habit_logs">): HabitLog {
  return {
    archivedAt: row.archived_at,
    habitId: row.habit_id,
    id: row.id,
    localDate: row.local_date,
    profileId: row.profile_id,
    recordedAt: row.recorded_at,
    timezone: row.timezone,
    userId: row.user_id,
    value: Number(row.value),
  };
}

export function mapHabitWindowSettings(
  row: Pick<
    TableRow<"profiles">,
    | "habit_evening_starts_at"
    | "habit_midday_starts_at"
    | "habit_morning_starts_at"
    | "timezone"
  >,
): HabitWindowSettings {
  return {
    eveningStartsAt: row.habit_evening_starts_at.slice(0, 5),
    middayStartsAt: row.habit_midday_starts_at.slice(0, 5),
    morningStartsAt: row.habit_morning_starts_at.slice(0, 5),
    timezone: row.timezone,
  };
}

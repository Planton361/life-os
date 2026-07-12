import type { MoodEntry, SleepEntry, WeightEntry, WeightGoal } from "../../domain";
import type { TableRow } from "../database.types";

export const mapMoodEntry = (row: TableRow<"mood_entries">): MoodEntry => ({ id: row.id, userId: row.user_id, profileId: row.profile_id, mood: row.mood as MoodEntry["mood"], recordedAt: row.recorded_at, localDate: row.local_date, timezone: row.timezone });
export const mapSleepEntry = (row: TableRow<"sleep_entries">): SleepEntry => ({ id: row.id, userId: row.user_id, profileId: row.profile_id, sleepDate: row.sleep_date, durationMinutes: row.duration_minutes, quality: row.quality, note: row.note });
export const mapWeightEntry = (row: TableRow<"weight_entries">): WeightEntry => ({ id: row.id, userId: row.user_id, profileId: row.profile_id, measuredOn: row.measured_on, weightKg: Number(row.weight_kg) });
export const mapWeightGoal = (row: TableRow<"weight_goals">): WeightGoal => ({ id: row.id, userId: row.user_id, profileId: row.profile_id, targetWeightKg: Number(row.target_weight_kg), targetDate: row.target_date });

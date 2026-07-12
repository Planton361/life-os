import type { ProfileId, UserId } from "./ids";

export const moodValues = ["calm", "content", "focused", "tired", "anxious", "stressed", "happy"] as const;
export type MoodValue = (typeof moodValues)[number];

export type MoodEntry = { id: string; userId: UserId; profileId: ProfileId; mood: MoodValue; recordedAt: string; localDate: string; timezone: string };
export type SleepEntry = { id: string; userId: UserId; profileId: ProfileId; sleepDate: string; durationMinutes: number; quality: number | null; note: string | null };
export type WeightEntry = { id: string; userId: UserId; profileId: ProfileId; measuredOn: string; weightKg: number };
export type WeightGoal = { id: string; userId: UserId; profileId: ProfileId; targetWeightKg: number; targetDate: string | null };

export type HealthSnapshot = {
  moods: readonly MoodEntry[];
  sleep: readonly SleepEntry[];
  weights: readonly WeightEntry[];
  weightGoal: WeightGoal | null;
};

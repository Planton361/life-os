import type { HealthSnapshot } from "../../domain";
import type { MoodEntryInput, SleepEntryInput, WeightEntryInput, WeightGoalInput } from "../../schemas";
import type { SupabaseClientLike } from "../database.types";
import { mapMoodEntry, mapSleepEntry, mapWeightEntry, mapWeightGoal } from "../mappers/health.mapper";

export function createSupabaseHealthRepository(client: SupabaseClientLike) {
  const scoped = (userId: string, profileId: string) => userId === profileId;
  return {
    async ensureProfile(userId: string, profileId: string) {
      if (!scoped(userId, profileId)) return false;
      const result = await client.from("profiles").upsert({ id: profileId, timezone: "Europe/Berlin" }, { onConflict: "id", ignoreDuplicates: true });
      return !result.error;
    },
    async getSnapshot(userId: string, profileId: string): Promise<HealthSnapshot | null> {
      if (!scoped(userId, profileId)) return null;
      const [moods, sleep, weights, goal] = await Promise.all([
        client.from("mood_entries").select("*").eq("user_id", userId).is("archived_at", null).order("recorded_at", { ascending: false }).limit(30),
        client.from("sleep_entries").select("*").eq("user_id", userId).order("sleep_date", { ascending: false }).limit(30),
        client.from("weight_entries").select("*").eq("user_id", userId).order("measured_on", { ascending: false }).limit(90),
        client.from("weight_goals").select("*").eq("user_id", userId).maybeSingle(),
      ]);
      if (moods.error || sleep.error || weights.error || goal.error) return null;
      return { moods: (moods.data ?? []).map(mapMoodEntry), sleep: (sleep.data ?? []).map(mapSleepEntry), weights: (weights.data ?? []).map(mapWeightEntry), weightGoal: goal.data ? mapWeightGoal(goal.data) : null };
    },
    async addMood(userId: string, profileId: string, input: MoodEntryInput) {
      if (!scoped(userId, profileId)) return false;
      const result = await client.from("mood_entries").insert({ local_date: input.localDate, mood: input.mood, profile_id: profileId, timezone: input.timezone, user_id: userId });
      return !result.error;
    },
    async undoTodayMood(userId: string, profileId: string, localDate: string) {
      if (!scoped(userId, profileId)) return false;
      const latest = await client.from("mood_entries").select("id").eq("user_id", userId).eq("local_date", localDate).is("archived_at", null).order("recorded_at", { ascending: false }).limit(1).maybeSingle();
      if (latest.error || !latest.data) return false;
      const result = await client.from("mood_entries").update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", latest.data.id).eq("user_id", userId);
      return !result.error;
    },
    async saveSleep(userId: string, profileId: string, input: SleepEntryInput) {
      if (!scoped(userId, profileId)) return false;
      const result = await client.from("sleep_entries").upsert({ duration_minutes: input.durationMinutes, note: input.note ?? null, profile_id: profileId, quality: input.quality ?? null, sleep_date: input.sleepDate, updated_at: new Date().toISOString(), user_id: userId }, { onConflict: "user_id,sleep_date" });
      return !result.error;
    },
    async saveWeight(userId: string, profileId: string, input: WeightEntryInput) {
      if (!scoped(userId, profileId)) return false;
      const result = await client.from("weight_entries").upsert({ measured_on: input.measuredOn, profile_id: profileId, updated_at: new Date().toISOString(), user_id: userId, weight_kg: input.weightKg }, { onConflict: "user_id,measured_on" });
      return !result.error;
    },
    async saveWeightGoal(userId: string, profileId: string, input: WeightGoalInput) {
      if (!scoped(userId, profileId)) return false;
      const result = await client.from("weight_goals").upsert({ profile_id: profileId, target_date: input.targetDate ?? null, target_weight_kg: input.targetWeightKg, updated_at: new Date().toISOString(), user_id: userId }, { onConflict: "user_id" });
      return !result.error;
    },
  };
}

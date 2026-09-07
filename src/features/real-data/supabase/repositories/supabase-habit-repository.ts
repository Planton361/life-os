import type { Habit, HabitSnapshot } from "../../domain";
import type {
  CreateHabitInput,
  HabitWindowSettingsInput,
  UpdateHabitInput,
} from "../../schemas";
import type { RepositoryResult } from "../../repositories/repository-result";
import { mapHabit, mapHabitLog, mapHabitWindowSettings } from "../mappers";
import type { SupabaseClientLike } from "../database.types";

function failure(message: string): RepositoryResult<never> {
  return { error: { code: "adapter_unavailable", message }, ok: false };
}

function scoped(userId: string, profileId: string) {
  return userId === profileId;
}

export function createSupabaseHabitRepository(client: SupabaseClientLike) {
  async function ensureProfile(userId: string, profileId: string) {
    if (!scoped(userId, profileId)) return false;
    const result = await client
      .from("profiles")
      .upsert(
        { id: profileId, timezone: "Europe/Berlin" },
        { ignoreDuplicates: true, onConflict: "id" },
      );
    return !result.error;
  }

  async function ownedHabit(
    userId: string,
    habitId: string,
    activeOnly = false,
  ) {
    let query = client
      .from("habits")
      .select("*")
      .eq("user_id", userId)
      .eq("id", habitId);
    if (activeOnly) query = query.is("archived_at", null);
    const result = await query.maybeSingle();
    return result.error || !result.data ? null : mapHabit(result.data);
  }

  return {
    ensureProfile,

    async getSettings(userId: string, profileId: string) {
      if (!scoped(userId, profileId)) return null;
      const result = await client
        .from("profiles")
        .select(
          "timezone,habit_morning_starts_at,habit_midday_starts_at,habit_evening_starts_at",
        )
        .eq("id", profileId)
        .maybeSingle();
      return result.error || !result.data
        ? null
        : mapHabitWindowSettings(result.data);
    },

    async getSnapshot(
      userId: string,
      profileId: string,
      startDate: string,
      endDate: string,
    ): Promise<RepositoryResult<HabitSnapshot>> {
      if (!scoped(userId, profileId)) return failure("Habit scope is invalid.");
      const [habits, logs, profile] = await Promise.all([
        client
          .from("habits")
          .select("*")
          .eq("user_id", userId)
          .order("time_window")
          .order("sort_order"),
        client
          .from("habit_logs")
          .select("*")
          .eq("user_id", userId)
          .gte("local_date", startDate)
          .lte("local_date", endDate)
          .is("archived_at", null)
          .order("recorded_at", { ascending: false }),
        client
          .from("profiles")
          .select(
            "timezone,habit_morning_starts_at,habit_midday_starts_at,habit_evening_starts_at",
          )
          .eq("id", profileId)
          .maybeSingle(),
      ]);
      if (habits.error || logs.error || profile.error || !profile.data) {
        return failure("Unable to load habit snapshot.");
      }
      return {
        data: {
          habits: (habits.data ?? []).map(mapHabit),
          logs: (logs.data ?? []).map(mapHabitLog),
          settings: mapHabitWindowSettings(profile.data),
        },
        ok: true,
      };
    },

    async createHabit(
      userId: string,
      profileId: string,
      input: CreateHabitInput,
      automaticSlot = false,
    ): Promise<RepositoryResult<Habit>> {
      if (!scoped(userId, profileId)) return failure("Habit scope is invalid.");
      let sortOrder = input.sortOrder;
      if (automaticSlot) {
        const occupied = await client.from("habits").select("sort_order")
          .eq("user_id", userId).eq("time_window", input.window).is("archived_at", null);
        if (occupied.error) return failure("Habit slots could not be loaded.");
        const used = new Set((occupied.data ?? []).map(row => row.sort_order));
        const next = Array.from({ length: 8 }, (_, index) => index + 1).find(slot => !used.has(slot));
        if (!next) return failure("Alle acht Habit-Plätze sind belegt.");
        sortOrder = next;
      }
      const result = await client
        .from("habits")
        .insert({
          daily_target: input.dailyTarget ?? null,
          default_increment: input.defaultIncrement,
          name: input.name,
          profile_id: profileId,
          sort_order: sortOrder,
          time_window: input.window,
          unit: input.unit,
          user_id: userId,
        })
        .select("*")
        .single();
      return result.error || !result.data
        ? failure(
            "Habit slot is unavailable or the habit could not be created.",
          )
        : { data: mapHabit(result.data), ok: true };
    },

    async updateHabit(
      userId: string,
      profileId: string,
      input: UpdateHabitInput,
    ): Promise<RepositoryResult<Habit>> {
      if (!scoped(userId, profileId)) return failure("Habit scope is invalid.");
      const existing = await ownedHabit(userId, input.habitId, true);
      if (!existing) return failure("Habit was not found in the current user scope.");
      let sortOrder = existing.sortOrder;
      if (existing.window !== input.window) {
        const occupied = await client.from("habits").select("sort_order")
          .eq("user_id", userId).eq("time_window", input.window).is("archived_at", null);
        if (occupied.error) return failure("Habit slots could not be loaded.");
        const used = new Set((occupied.data ?? []).map(row => row.sort_order));
        const available = Array.from({length:8}, (_, i)=>i+1).find(slot=>!used.has(slot));
        if (!available) return failure("Alle acht Habit-Plätze sind belegt.");
        sortOrder = used.has(sortOrder) ? available : sortOrder;
      }
      const result = await client
        .from("habits")
        .update({
          daily_target: input.dailyTarget ?? null,
          default_increment: input.defaultIncrement,
          name: input.name,
          sort_order: sortOrder,
          time_window: input.window,
          unit: input.unit,
        })
        .eq("id", input.habitId)
        .eq("user_id", userId)
        .select("*")
        .single();
      return result.error || !result.data
        ? failure(
            "Habit slot is unavailable or the habit could not be updated.",
          )
        : { data: mapHabit(result.data), ok: true };
    },

    async archiveHabit(userId: string, profileId: string, habitId: string) {
      if (
        !scoped(userId, profileId) ||
        !(await ownedHabit(userId, habitId, true))
      ) {
        return false;
      }
      const result = await client
        .from("habits")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", habitId)
        .eq("user_id", userId);
      return !result.error;
    },

    async addLog(
      userId: string,
      profileId: string,
      habitId: string,
    ): Promise<RepositoryResult<"incremented" | "already_at_target">> {
      if (!scoped(userId, profileId)) return failure("Habit scope is invalid.");
      const result = await client.rpc("increment_habit_for_local_day", {
        p_habit_id: habitId,
      });
      const status = result.data?.[0]?.status;
      if (result.error || (status !== "incremented" && status !== "already_at_target"))
        return failure("Habit could not be incremented.");
      return { data: status, ok: true };
    },

    async undoLatestLog(
      userId: string,
      profileId: string,
      habitId: string,
      localDate: string,
    ) {
      if (!scoped(userId, profileId) || !(await ownedHabit(userId, habitId)))
        return false;
      const latest = await client
        .from("habit_logs")
        .select("id")
        .eq("user_id", userId)
        .eq("habit_id", habitId)
        .eq("local_date", localDate)
        .is("archived_at", null)
        .order("recorded_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latest.error || !latest.data) return false;
      const result = await client
        .from("habit_logs")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", latest.data.id)
        .eq("user_id", userId);
      return !result.error;
    },

    async updateSettings(
      userId: string,
      profileId: string,
      input: HabitWindowSettingsInput,
    ) {
      if (!scoped(userId, profileId)) return false;
      const result = await client
        .from("profiles")
        .update({
          habit_evening_starts_at: input.eveningStartsAt,
          habit_midday_starts_at: input.middayStartsAt,
          habit_morning_starts_at: input.morningStartsAt,
        })
        .eq("id", profileId);
      return !result.error;
    },
  };
}

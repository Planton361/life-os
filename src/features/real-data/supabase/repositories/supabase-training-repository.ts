import type { TrainingSnapshot } from "../../domain/training";
import type { ExerciseInput, RunningPlanInput, RunningPlanItemInput, RunningSessionInput, StrengthPlanInput, StrengthPlanItemInput, StrengthSessionInput, StrengthSetInput } from "../../schemas/training.schema";
import type { RepositoryResult } from "../../repositories/repository-result";
import { mapExercise, mapRunningPlan, mapRunningPlanItem, mapRunningSession, mapStrengthPlan, mapStrengthPlanItem, mapStrengthSession, mapStrengthSetLog } from "../mappers/training.mapper";
import type { SupabaseClientLike } from "../database.types";
import type { MuscleGroup } from "../../domain/training";

const fail = (message: string): RepositoryResult<never> => ({ error: { code: "adapter_unavailable", message }, ok: false });
const rpcNullable = <T>(value: T | null) => value as T;

export function createSupabaseTrainingRepository(client: SupabaseClientLike) {
  async function owns(table: "running_plans" | "running_plan_items" | "running_sessions" | "exercises" | "strength_plans" | "strength_sessions", userId: string, id: string, active = false) {
    let query = client.from(table).select("id").eq("id", id).eq("user_id", userId);
    if (active) query = query.is("archived_at", null);
    const result = await query.maybeSingle();
    return !result.error && Boolean(result.data);
  }

  return {
    async getSnapshot(userId: string): Promise<RepositoryResult<TrainingSnapshot>> {
      const [runningPlans, runningItems, runningSessions, exercises, muscles, strengthPlans, strengthItems, strengthSessions, setLogs] = await Promise.all([
        client.from("running_plans").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        client.from("running_plan_items").select("*").eq("user_id", userId).order("sort_order"),
        client.from("running_sessions").select("*").eq("user_id", userId).order("session_date", { ascending: false }).order("created_at", { ascending: false }),
        client.from("exercises").select("*").eq("user_id", userId).order("name"),
        client.from("exercise_muscles").select("exercise_id,muscle_group").eq("user_id", userId),
        client.from("strength_plans").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        client.from("strength_plan_items").select("*").eq("user_id", userId).order("sort_order"),
        client.from("strength_sessions").select("*").eq("user_id", userId).order("session_date", { ascending: false }).order("created_at", { ascending: false }),
        client.from("strength_set_logs").select("*").eq("user_id", userId).order("recorded_at", { ascending: false }),
      ]);
      if ([runningPlans, runningItems, runningSessions, exercises, muscles, strengthPlans, strengthItems, strengthSessions, setLogs].some((result) => result.error)) return fail("Unable to load training data.");
      const musclesByExercise = new Map<string, MuscleGroup[]>();
      for (const row of muscles.data ?? []) musclesByExercise.set(row.exercise_id, [...(musclesByExercise.get(row.exercise_id) ?? []), row.muscle_group as MuscleGroup]);
      return { ok: true, data: {
        runningPlans: (runningPlans.data ?? []).map(mapRunningPlan), runningPlanItems: (runningItems.data ?? []).map(mapRunningPlanItem), runningSessions: (runningSessions.data ?? []).map(mapRunningSession),
        exercises: (exercises.data ?? []).map((row) => mapExercise(row, musclesByExercise.get(row.id) ?? [])), strengthPlans: (strengthPlans.data ?? []).map(mapStrengthPlan), strengthPlanItems: (strengthItems.data ?? []).map(mapStrengthPlanItem), strengthSessions: (strengthSessions.data ?? []).map(mapStrengthSession), strengthSetLogs: (setLogs.data ?? []).map(mapStrengthSetLog),
      } };
    },

    async saveRunningPlan(userId: string, input: RunningPlanInput) {
      if (input.planId && !(await owns("running_plans", userId, input.planId))) return fail("Running plan is outside the current user scope.");
      const query = input.planId ? client.from("running_plans").update({ name: input.name, goal: input.goal, updated_at: new Date().toISOString() }).eq("id", input.planId).eq("user_id", userId) : client.from("running_plans").insert({ user_id: userId, name: input.name, goal: input.goal });
      const result = await query.select("*").single();
      return result.error || !result.data ? fail("Running plan could not be saved.") : { ok: true as const, data: mapRunningPlan(result.data) };
    },
    async addRunningPlanItem(userId: string, input: RunningPlanItemInput) {
      if (!(await owns("running_plans", userId, input.planId, true))) return fail("Running plan is outside the current user scope.");
      if (input.itemId && !(await owns("running_plan_items", userId, input.itemId, true))) return fail("Running unit is outside the current user scope.");
      const values = { plan_id: input.planId, title: input.title, planned_distance_km: input.plannedDistanceKm, planned_duration_minutes: input.plannedDurationMinutes, sort_order: input.sortOrder, updated_at: new Date().toISOString() };
      const query = input.itemId ? client.from("running_plan_items").update(values).eq("id", input.itemId).eq("user_id", userId) : client.from("running_plan_items").insert({ ...values, user_id: userId });
      const result = await query.select("*").single();
      return result.error || !result.data ? fail("Running unit could not be added.") : { ok: true as const, data: mapRunningPlanItem(result.data) };
    },
    async saveRunningSession(userId: string, input: RunningSessionInput) {
      if (input.planItemId && !(await owns("running_plan_items", userId, input.planItemId, true))) return fail("Running unit is outside the current user scope.");
      if (input.sessionId && !(await owns("running_sessions", userId, input.sessionId))) return fail("Running session is outside the current user scope.");
      const startedAt = input.startTime ? new Date(`${input.sessionDate}T${input.startTime}:00+02:00`).toISOString() : null;
      const result = await client.rpc("save_completed_running_session", { p_session_id: rpcNullable<string>(input.sessionId ?? null), p_plan_item_id: rpcNullable<string>(input.planItemId), p_session_date: input.sessionDate, p_started_at: rpcNullable<string>(startedAt), p_distance_km: input.distanceKm, p_duration_minutes: input.durationMinutes, p_average_heart_rate: rpcNullable<number>(input.averageHeartRate), p_notes: rpcNullable<string>(input.notes), p_completed_at: new Date().toISOString() });
      if (result.error || !result.data) return fail("Running session and scheduled task could not be saved atomically.");
      return { ok: true as const, data: mapRunningSession(result.data) };
    },
    async archive(userId: string, table: "running_plans" | "running_sessions" | "exercises" | "strength_plans", id: string) {
      if (!(await owns(table, userId, id, true))) return false;
      const result = await client.from(table).update({ archived_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId);
      return !result.error;
    },
    async saveExercise(userId: string, input: ExerciseInput) {
      if (input.exerciseId && !(await owns("exercises", userId, input.exerciseId))) return fail("Exercise is outside the current user scope.");
      const result = await client.rpc("save_exercise_with_muscles", { p_exercise_id: rpcNullable<string>(input.exerciseId ?? null), p_name: input.name, p_description: rpcNullable<string>(input.description), p_equipment: rpcNullable<string>(input.equipment), p_muscles: [...input.muscles] });
      return result.error || !result.data ? fail("Exercise and muscle mappings could not be saved atomically.") : { ok: true as const, data: mapExercise(result.data, input.muscles) };
    },
    async saveStrengthPlan(userId: string, input: StrengthPlanInput) {
      if (input.planId && !(await owns("strength_plans", userId, input.planId))) return fail("Strength plan is outside the current user scope.");
      const query = input.planId ? client.from("strength_plans").update({ name: input.name, goal: input.goal, updated_at: new Date().toISOString() }).eq("id", input.planId).eq("user_id", userId) : client.from("strength_plans").insert({ user_id: userId, name: input.name, goal: input.goal });
      const result = await query.select("*").single();
      return result.error || !result.data ? fail("Strength plan could not be saved.") : { ok: true as const, data: mapStrengthPlan(result.data) };
    },
    async addStrengthPlanItem(userId: string, input: StrengthPlanItemInput) {
      if (!(await owns("strength_plans", userId, input.planId, true)) || !(await owns("exercises", userId, input.exerciseId, true))) return fail("Plan or exercise is outside the current user scope.");
      if (input.itemId) {
        const existing = await client.from("strength_plan_items").select("id").eq("id", input.itemId).eq("user_id", userId).maybeSingle();
        if (existing.error || !existing.data) return fail("Plan exercise is outside the current user scope.");
      }
      const values = { plan_id: input.planId, exercise_id: input.exerciseId, sort_order: input.sortOrder, target_sets: input.targetSets, target_reps: input.targetReps, target_weight_kg: input.targetWeightKg, updated_at: new Date().toISOString() };
      const query = input.itemId ? client.from("strength_plan_items").update(values).eq("id", input.itemId).eq("user_id", userId) : client.from("strength_plan_items").insert({ ...values, user_id: userId });
      const result = await query.select("*").single();
      return result.error || !result.data ? fail("Plan exercise could not be added.") : { ok: true as const, data: mapStrengthPlanItem(result.data) };
    },
    async startStrengthSession(userId: string, input: StrengthSessionInput) {
      if (!(await owns("strength_plans", userId, input.planId, true))) return fail("Strength plan is outside the current user scope.");
      const result = await client.from("strength_sessions").insert({ user_id: userId, plan_id: input.planId, session_date: input.sessionDate, notes: input.notes }).select("*").single();
      return result.error || !result.data ? fail("Strength session could not be started.") : { ok: true as const, data: mapStrengthSession(result.data) };
    },
    async addStrengthSet(userId: string, input: StrengthSetInput) {
      if (!(await owns("strength_sessions", userId, input.sessionId, true)) || !(await owns("exercises", userId, input.exerciseId))) return fail("Session or exercise is outside the current user scope.");
      const result = await client.from("strength_set_logs").insert({ user_id: userId, session_id: input.sessionId, exercise_id: input.exerciseId, set_order: input.setOrder, repetitions: input.repetitions, weight_kg: input.weightKg, notes: input.notes }).select("*").single();
      return result.error || !result.data ? fail("Set log could not be saved.") : { ok: true as const, data: mapStrengthSetLog(result.data) };
    },
    async completeStrengthSession(userId: string, sessionId: string) {
      if (!(await owns("strength_sessions", userId, sessionId, true))) return false;
      const result = await client.rpc("complete_strength_session", { p_session_id: sessionId, p_completed_at: new Date().toISOString() });
      return !result.error;
    },
  };
}

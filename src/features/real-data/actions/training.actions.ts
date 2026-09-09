"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exerciseInputSchema, runningPlanInputSchema, runningPlanItemInputSchema, runningSessionInputSchema, strengthPlanInputSchema, strengthPlanItemInputSchema, strengthSessionInputSchema, strengthSetInputSchema, trainingIdInputSchema } from "../schemas/training.schema";
import { createSupabaseTrainingRepository } from "../supabase/repositories/supabase-training-repository";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { createAuthenticatedSupabaseServerClient } from "@/lib/supabase/server";

const value = (data: FormData, key: string) => { const item = data.get(key); return typeof item === "string" ? item.trim() : ""; };
const target = (data: FormData) => value(data, "returnTo") === "/health/strength" ? "/health/strength" : "/health/running";

function finish(path: string, state: "blocked" | "error" | "saved"): never {
  revalidatePath("/portfolio");
  revalidatePath("/projects/[projectId]", "page");
  revalidatePath("/tasks/[taskId]", "page");
  for (const route of ["/dashboard", "/today", "/calendar", "/health", "/health/running", "/health/strength"]) revalidatePath(route);
  redirect(`${path}?training=${state}&trainingUpdate=${Date.now()}`);
}

async function context(path: string) {
  if ((await getCurrentLifeOsProfileId()) !== "manual") finish(path, "blocked");
  const auth = await createAuthenticatedSupabaseServerClient();
  if (!auth.ok) finish(path, "blocked");
  return { repository: createSupabaseTrainingRepository(auth.client), userId: auth.user.id };
}

export async function saveRunningPlanAction(data: FormData) {
  const path = "/health/running";
  const parsed = runningPlanInputSchema.safeParse({ planId: value(data, "planId") || undefined, name: value(data, "name"), goal: value(data, "goal") });
  if (!parsed.success) finish(path, "error");
  const { repository, userId } = await context(path);
  finish(path, (await repository.saveRunningPlan(userId, parsed.data)).ok ? "saved" : "error");
}

export async function addRunningPlanItemAction(data: FormData) {
  const path = "/health/running";
  const parsed = runningPlanItemInputSchema.safeParse({ itemId: value(data, "itemId") || undefined, planId: value(data, "planId"), title: value(data, "title"), plannedDistanceKm: value(data, "plannedDistanceKm"), plannedDurationMinutes: value(data, "plannedDurationMinutes"), sortOrder: value(data, "sortOrder") });
  if (!parsed.success) finish(path, "error");
  const { repository, userId } = await context(path);
  finish(path, (await repository.addRunningPlanItem(userId, parsed.data)).ok ? "saved" : "error");
}

export async function saveRunningSessionAction(data: FormData) {
  const path = "/health/running";
  const parsed = runningSessionInputSchema.safeParse({ sessionId: value(data, "sessionId") || undefined, planItemId: value(data, "planItemId"), sessionDate: value(data, "sessionDate"), startTime: value(data, "startTime"), distanceKm: value(data, "distanceKm"), durationMinutes: value(data, "durationMinutes"), averageHeartRate: value(data, "averageHeartRate"), notes: value(data, "notes") });
  if (!parsed.success) finish(path, "error");
  const { repository, userId } = await context(path);
  finish(path, (await repository.saveRunningSession(userId, parsed.data)).ok ? "saved" : "error");
}

export async function saveExerciseAction(data: FormData) {
  const path = "/health/strength";
  const parsed = exerciseInputSchema.safeParse({ exerciseId: value(data, "exerciseId") || undefined, name: value(data, "name"), description: value(data, "description"), equipment: value(data, "equipment"), muscles: data.getAll("muscles").filter((item): item is string => typeof item === "string") });
  if (!parsed.success) finish(path, "error");
  const { repository, userId } = await context(path);
  finish(path, (await repository.saveExercise(userId, parsed.data)).ok ? "saved" : "error");
}

export async function saveStrengthPlanAction(data: FormData) {
  const path = "/health/strength";
  const parsed = strengthPlanInputSchema.safeParse({ planId: value(data, "planId") || undefined, name: value(data, "name"), goal: value(data, "goal") });
  if (!parsed.success) finish(path, "error");
  const { repository, userId } = await context(path);
  finish(path, (await repository.saveStrengthPlan(userId, parsed.data)).ok ? "saved" : "error");
}

export async function addStrengthPlanItemAction(data: FormData) {
  const path = "/health/strength";
  const parsed = strengthPlanItemInputSchema.safeParse({ itemId: value(data, "itemId") || undefined, planId: value(data, "planId"), exerciseId: value(data, "exerciseId"), sortOrder: value(data, "sortOrder"), targetSets: value(data, "targetSets"), targetReps: value(data, "targetReps"), targetWeightKg: value(data, "targetWeightKg") });
  if (!parsed.success) finish(path, "error");
  const { repository, userId } = await context(path);
  finish(path, (await repository.addStrengthPlanItem(userId, parsed.data)).ok ? "saved" : "error");
}

export async function startStrengthSessionAction(data: FormData) {
  const path = "/health/strength";
  const parsed = strengthSessionInputSchema.safeParse({ planId: value(data, "planId"), sessionDate: value(data, "sessionDate"), notes: value(data, "notes") });
  if (!parsed.success) finish(path, "error");
  const { repository, userId } = await context(path);
  finish(path, (await repository.startStrengthSession(userId, parsed.data)).ok ? "saved" : "error");
}

export async function addStrengthSetAction(data: FormData) {
  const path = "/health/strength";
  const parsed = strengthSetInputSchema.safeParse({ sessionId: value(data, "sessionId"), exerciseId: value(data, "exerciseId"), setOrder: value(data, "setOrder"), repetitions: value(data, "repetitions"), weightKg: value(data, "weightKg"), notes: value(data, "notes") });
  if (!parsed.success) finish(path, "error");
  const { repository, userId } = await context(path);
  finish(path, (await repository.addStrengthSet(userId, parsed.data)).ok ? "saved" : "error");
}

export async function completeStrengthSessionAction(data: FormData) {
  const path = "/health/strength";
  const parsed = trainingIdInputSchema.safeParse({ id: value(data, "id") });
  if (!parsed.success) finish(path, "error");
  const { repository, userId } = await context(path);
  finish(path, (await repository.completeStrengthSession(userId, parsed.data.id)) ? "saved" : "error");
}

export async function archiveTrainingAction(data: FormData) {
  const path = target(data);
  const parsed = trainingIdInputSchema.safeParse({ id: value(data, "id") });
  const table = value(data, "table");
  if (!parsed.success || !["running_plans", "running_sessions", "exercises", "strength_plans"].includes(table)) finish(path, "error");
  const { repository, userId } = await context(path);
  finish(path, await repository.archive(userId, table as "running_plans" | "running_sessions" | "exercises" | "strength_plans", parsed.data.id) ? "saved" : "error");
}

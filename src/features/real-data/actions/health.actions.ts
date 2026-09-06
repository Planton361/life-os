"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { dashboardLocalDate, dashboardTimeZone } from "@/features/dashboard/dashboard-read-model";
import { moodEntryInputSchema, sleepEntryInputSchema, weightEntryInputSchema, weightGoalInputSchema } from "../schemas";
import { createSupabaseHealthRepository } from "../supabase";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { createAuthenticatedSupabaseServerClient } from "@/lib/supabase/server";

function value(formData: FormData, key: string) { const item = formData.get(key); return typeof item === "string" ? item.trim() : ""; }
function moodTarget(formData: FormData) {
  const path = value(formData, "returnTo") === "/health/mental" ? "/health/mental" : "/dashboard";
  const window = value(formData, "dashboardWindow");
  return path === "/dashboard" && ["Morning", "Midday", "Evening"].includes(window) ? `${path}?habitWindow=${window}` : path;
}
function feedbackTarget(target: string, state: string) { return `${target}${target.includes("?") ? "&" : "?"}health=${state}`; }
function revalidateHealth() { revalidatePath("/today"); revalidatePath("/dashboard"); revalidatePath("/health"); revalidatePath("/health/mental"); }
async function context(target: string) {
  if ((await getCurrentLifeOsProfileId()) !== "manual") redirect(feedbackTarget(target, "blocked"));
  const auth = await createAuthenticatedSupabaseServerClient();
  if (!auth.ok) redirect(feedbackTarget(target, "blocked"));
  return { repository: createSupabaseHealthRepository(auth.client), userId: auth.user.id };
}
function finish(target: string, state: "saved" | "error"): never { revalidateHealth(); redirect(feedbackTarget(target, state)); }

export async function saveMoodAction(formData: FormData) {
  const target = moodTarget(formData);
  const parsed = moodEntryInputSchema.safeParse({ mood: value(formData, "mood").toLowerCase(), localDate: dashboardLocalDate(), timezone: dashboardTimeZone });
  if (!parsed.success) redirect(feedbackTarget(target, "validation"));
  const { repository, userId } = await context(target);
  if (!(await repository.ensureProfile(userId, userId))) finish(target, "error");
  finish(target, (await repository.addMood(userId, userId, parsed.data)) ? "saved" : "error");
}
export async function undoTodayMoodAction(formData: FormData) {
  const target = moodTarget(formData);
  const { repository, userId } = await context(target);
  if (!(await repository.ensureProfile(userId, userId))) finish(target, "error");
  finish(target, (await repository.undoTodayMood(userId, userId, dashboardLocalDate())) ? "saved" : "error");
}
export async function saveSleepAction(formData: FormData) {
  const target = "/health/mental";
  const parsed = sleepEntryInputSchema.safeParse({ sleepDate: value(formData, "sleepDate"), durationMinutes: Number(value(formData, "hours")) * 60 + Number(value(formData, "minutes")), quality: value(formData, "quality") || undefined, note: value(formData, "note") || undefined });
  if (!parsed.success) finish(target, "error");
  const { repository, userId } = await context(target);
  if (!(await repository.ensureProfile(userId, userId))) finish(target, "error");
  finish(target, (await repository.saveSleep(userId, userId, parsed.data)) ? "saved" : "error");
}
export async function saveWeightAction(formData: FormData) {
  const target = "/health";
  const parsed = weightEntryInputSchema.safeParse({ measuredOn: value(formData, "measuredOn"), weightKg: value(formData, "weightKg") });
  if (!parsed.success) finish(target, "error");
  const { repository, userId } = await context(target);
  if (!(await repository.ensureProfile(userId, userId))) finish(target, "error");
  finish(target, (await repository.saveWeight(userId, userId, parsed.data)) ? "saved" : "error");
}
export async function saveWeightGoalAction(formData: FormData) {
  const target = "/health";
  const parsed = weightGoalInputSchema.safeParse({ targetWeightKg: value(formData, "targetWeightKg"), targetDate: value(formData, "targetDate") || undefined });
  if (!parsed.success) finish(target, "error");
  const { repository, userId } = await context(target);
  if (!(await repository.ensureProfile(userId, userId))) finish(target, "error");
  finish(target, (await repository.saveWeightGoal(userId, userId, parsed.data)) ? "saved" : "error");
}

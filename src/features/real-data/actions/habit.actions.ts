"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createHabitInputSchema,
  habitIdInputSchema,
  habitWindowSettingsInputSchema,
  localDateInTimeZone,
  updateHabitInputSchema,
} from "@/features/real-data";
import { createSupabaseHabitRepository } from "@/features/real-data/supabase";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { createAuthenticatedSupabaseServerClient } from "@/lib/supabase/server";

function value(formData: FormData, key: string) {
  const item = formData.get(key);
  return typeof item === "string" ? item.trim() : "";
}

function target(formData: FormData) {
  const requested = value(formData, "returnTo");
  return requested === "/dashboard" ? "/dashboard" : "/health/habits";
}

function finish(path: string, state: "blocked" | "error" | "saved"): never {
  revalidatePath("/dashboard");
  revalidatePath("/health");
  revalidatePath("/health/habits");
  revalidatePath("/today");
  revalidatePath("/review/daily");
  const params = new URLSearchParams({
    habit: state,
    habitUpdate: Date.now().toString(),
  });
  redirect(`${path}?${params.toString()}`);
}

async function context(path: string) {
  if ((await getCurrentLifeOsProfileId()) !== "manual") finish(path, "blocked");
  const auth = await createAuthenticatedSupabaseServerClient();
  if (!auth.ok) finish(path, "blocked");
  const repository = createSupabaseHabitRepository(auth.client);
  if (!(await repository.ensureProfile(auth.user.id, auth.user.id)))
    finish(path, "error");
  return { repository, userId: auth.user.id };
}

function habitInput(formData: FormData) {
  return {
    dailyTarget: value(formData, "dailyTarget"),
    defaultIncrement: value(formData, "defaultIncrement"),
    name: value(formData, "name"),
    sortOrder: value(formData, "sortOrder"),
    unit: value(formData, "unit"),
    window: value(formData, "window"),
  };
}

export async function createHabitAction(formData: FormData) {
  const path = target(formData);
  const parsed = createHabitInputSchema.safeParse(habitInput(formData));
  if (!parsed.success) finish(path, "error");
  const { repository, userId } = await context(path);
  const result = await repository.createHabit(userId, userId, parsed.data);
  finish(path, result.ok ? "saved" : "error");
}

export async function updateHabitAction(formData: FormData) {
  const path = target(formData);
  const parsed = updateHabitInputSchema.safeParse({
    ...habitInput(formData),
    habitId: value(formData, "habitId"),
  });
  if (!parsed.success) finish(path, "error");
  const { repository, userId } = await context(path);
  const result = await repository.updateHabit(userId, userId, parsed.data);
  finish(path, result.ok ? "saved" : "error");
}

export async function archiveHabitAction(formData: FormData) {
  const path = target(formData);
  const parsed = habitIdInputSchema.safeParse({
    habitId: value(formData, "habitId"),
  });
  if (!parsed.success) finish(path, "error");
  const { repository, userId } = await context(path);
  finish(
    path,
    (await repository.archiveHabit(userId, userId, parsed.data.habitId))
      ? "saved"
      : "error",
  );
}

export async function incrementHabitAction(formData: FormData) {
  const path = target(formData);
  const parsed = habitIdInputSchema.safeParse({
    habitId: value(formData, "habitId"),
  });
  if (!parsed.success) finish(path, "error");
  const { repository, userId } = await context(path);
  const settings = await repository.getSettings(userId, userId);
  if (!settings) finish(path, "error");
  const result = await repository.addLog(
    userId,
    userId,
    parsed.data.habitId,
    localDateInTimeZone(new Date(), settings.timezone),
    settings.timezone,
  );
  finish(path, result.ok ? "saved" : "error");
}

export async function undoHabitAction(formData: FormData) {
  const path = target(formData);
  const parsed = habitIdInputSchema.safeParse({
    habitId: value(formData, "habitId"),
  });
  if (!parsed.success) finish(path, "error");
  const { repository, userId } = await context(path);
  const settings = await repository.getSettings(userId, userId);
  if (!settings) finish(path, "error");
  finish(
    path,
    (await repository.undoLatestLog(
      userId,
      userId,
      parsed.data.habitId,
      localDateInTimeZone(new Date(), settings.timezone),
    ))
      ? "saved"
      : "error",
  );
}

export async function updateHabitWindowSettingsAction(formData: FormData) {
  const path = "/health/habits";
  const parsed = habitWindowSettingsInputSchema.safeParse({
    eveningStartsAt: value(formData, "eveningStartsAt"),
    middayStartsAt: value(formData, "middayStartsAt"),
    morningStartsAt: value(formData, "morningStartsAt"),
  });
  if (!parsed.success) finish(path, "error");
  const { repository, userId } = await context(path);
  finish(
    path,
    (await repository.updateSettings(userId, userId, parsed.data))
      ? "saved"
      : "error",
  );
}

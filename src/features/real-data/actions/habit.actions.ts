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
  if (requested !== "/dashboard") {
    const selected = habitIdInputSchema.safeParse({ habitId: value(formData, "habitId") });
    return selected.success ? `/health/habits?selected=${selected.data.habitId}` : "/health/habits";
  }
  const window = value(formData, "dashboardWindow");
  return ["Morning", "Midday", "Evening"].includes(window)
    ? `/dashboard?habitWindow=${window}`
    : "/dashboard";
}

function finish(path: string, state: "blocked" | "error" | "saved", quietDashboard = false): never {
  revalidatePath("/dashboard");
  revalidatePath("/health");
  revalidatePath("/health/habits");
  revalidatePath("/today");
  revalidatePath("/review/daily");
  if (quietDashboard && state === "saved" && path.startsWith("/dashboard")) redirect(path);
  const params = new URLSearchParams({
    habit: state,
    habitUpdate: Date.now().toString(),
  });
  redirect(`${path}${path.includes("?") ? "&" : "?"}${params.toString()}`);
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
  const result = await repository.addLog(
    userId,
    userId,
    parsed.data.habitId,
  );
  if (result.ok && result.data === "already_at_target") {
    // Refresh a stale projection without manufacturing a success notification.
    for (const route of ["/dashboard", "/health", "/health/habits", "/today", "/review/daily"])
      revalidatePath(route);
    redirect(path);
  }
  finish(path, result.ok ? "saved" : "error", true);
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
    true,
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

export async function createDashboardHabitAction(formData: FormData) {
  const parsed = createHabitInputSchema.safeParse({ ...habitInput(formData), sortOrder: 1 });
  if (!parsed.success) return { ok: false as const, errors: parsed.error.flatten().fieldErrors, error: "Bitte prüfe die markierten Felder." };
  const { repository, userId } = await context(target(formData));
  const result = await repository.createHabit(userId, userId, parsed.data, true);
  if (!result.ok) return { ok: false as const, errors: {}, error: "Habit konnte nicht angelegt werden. Prüfe die freien Plätze." };
  for (const path of ["/dashboard", "/health/habits", "/health", "/today"]) revalidatePath(path);
  return { ok: true as const, errors: {}, error: "" };
}

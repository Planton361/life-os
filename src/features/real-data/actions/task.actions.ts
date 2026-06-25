"use server";

import { revalidatePath } from "next/cache";
import { scheduleTaskInputSchema } from "@/features/real-data";
import { createSupabaseTaskRepository } from "@/features/real-data/supabase";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { createAuthenticatedSupabaseServerClient } from "@/lib/supabase/server";

export type TaskScheduleActionResult = {
  message: string;
  status: "blocked" | "error" | "success";
  taskId?: string;
};

const appTimeZone = "Europe/Berlin";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function localDateLabel(date = new Date(), timeZone = appTimeZone) {
  const parts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(date);
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? "00";

  return `${part("year")}-${part("month")}-${part("day")}`;
}

function stableTodayScheduleStart(localDate: string) {
  return `${localDate}T09:00:00.000Z`;
}

function revalidateTaskProjectionRoutes() {
  revalidatePath("/portfolio");
  revalidatePath("/today");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
}

function authBlockedMessage(
  error: "auth_error" | "invalid_session" | "missing_env" | "unauthenticated",
) {
  if (error === "missing_env") {
    return "Supabase ist lokal noch nicht konfiguriert.";
  }

  if (error === "invalid_session") {
    return "Die Supabase Session ist ungültig. Setze sie in den Settings zurück und melde dich neu an.";
  }

  if (error === "auth_error") {
    return "Supabase Auth konnte die Session nicht prüfen. Setze sie in den Settings zurück.";
  }

  return "Melde dich an, um Tasks zu planen.";
}

export async function scheduleTaskForTodayAction(
  formData: FormData,
): Promise<TaskScheduleActionResult> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId !== "manual") {
    return {
      message: "Wechsle ins Manual-Profil, um Tasks zu planen.",
      status: "blocked",
    };
  }

  const auth = await createAuthenticatedSupabaseServerClient();

  if (!auth.ok) {
    return {
      message: authBlockedMessage(auth.error),
      status: "blocked",
    };
  }

  const mode = formString(formData, "mode") === "schedule" ? "schedule" : "plan";
  const plannedDate = localDateLabel();
  const parsed = scheduleTaskInputSchema.safeParse({
    durationMinutes: mode === "schedule" ? 30 : undefined,
    plannedDate,
    profileId: auth.user.id,
    scheduledStartAt:
      mode === "schedule" ? stableTodayScheduleStart(plannedDate) : undefined,
    taskId: formString(formData, "taskId"),
    userId: auth.user.id,
  });

  if (!parsed.success) {
    return {
      message: "Der Task konnte nicht geplant werden.",
      status: "error",
    };
  }

  const repository = createSupabaseTaskRepository(auth.client);
  const result = await repository.scheduleTask(parsed.data);

  if (!result.ok) {
    return {
      message: "Der Task konnte nicht in Supabase geplant werden.",
      status: "error",
    };
  }

  revalidateTaskProjectionRoutes();

  return {
    message:
      mode === "schedule" ? "Task für heute terminiert." : "Task für heute geplant.",
    status: "success",
    taskId: result.data.id,
  };
}

export async function scheduleTaskForTodayFormAction(
  formData: FormData,
): Promise<void> {
  await scheduleTaskForTodayAction(formData);
}

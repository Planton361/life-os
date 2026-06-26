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

function isLocalDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isLocalTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function zonedLocalDateTimeToIso(
  localDate: string,
  localTime: string,
  timeZone = appTimeZone,
) {
  const [year, month, day] = localDate.split("-").map(Number);
  const [hour, minute] = localTime.split(":").map(Number);
  const desiredUtcMs = Date.UTC(year, month - 1, day, hour, minute);
  const utcGuess = new Date(desiredUtcMs);
  const parts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(utcGuess);
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? "00";
  const renderedAsUtcMs = Date.UTC(
    Number(part("year")),
    Number(part("month")) - 1,
    Number(part("day")),
    Number(part("hour")),
    Number(part("minute")),
  );
  const offsetMs = renderedAsUtcMs - utcGuess.getTime();

  return new Date(desiredUtcMs - offsetMs).toISOString();
}

function durationMinutesFromForm(formData: FormData, mode: "plan" | "schedule") {
  const rawDuration = formString(formData, "durationMinutes");

  if (!rawDuration) return mode === "schedule" ? 30 : undefined;

  const duration = Number(rawDuration);

  return Number.isInteger(duration) && duration > 0 ? duration : undefined;
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
  const plannedDateInput = formString(formData, "plannedDate");
  const plannedDate = isLocalDate(plannedDateInput)
    ? plannedDateInput
    : localDateLabel();
  const scheduledTimeInput = formString(formData, "scheduledTime");
  const scheduledTime = isLocalTime(scheduledTimeInput)
    ? scheduledTimeInput
    : "09:00";
  const scheduledStartAtInput = formString(formData, "scheduledStartAt");
  const scheduledStartAt =
    mode === "schedule"
      ? scheduledStartAtInput || zonedLocalDateTimeToIso(plannedDate, scheduledTime)
      : undefined;
  const parsed = scheduleTaskInputSchema.safeParse({
    durationMinutes: durationMinutesFromForm(formData, mode),
    plannedDate,
    profileId: auth.user.id,
    scheduledStartAt,
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

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  archiveTaskInputSchema,
  completeTaskInputSchema,
  createTaskInputSchema,
  reopenTaskInputSchema,
  rescheduleTaskInputSchema,
  scheduleTaskInputSchema,
  unscheduleTaskInputSchema,
} from "@/features/real-data";
import { createSupabaseTaskRepository } from "@/features/real-data/supabase";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { createAuthenticatedSupabaseServerClient } from "@/lib/supabase/server";

export type TaskScheduleActionResult = {
  message: string;
  status: "blocked" | "error" | "success";
  taskId?: string;
};

export type TaskLifecycleActionResult = {
  message: string;
  status: "blocked" | "error" | "success";
  taskId?: string;
};

const appTimeZone = "Europe/Berlin";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalFormString(formData: FormData, key: string) {
  return formString(formData, key) || undefined;
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

function portfolioTaskDescriptionFromForm(formData: FormData) {
  const description = optionalFormString(formData, "description");
  const nextAction = optionalFormString(formData, "nextAction");

  return [description, nextAction ? `Nächste Aktion: ${nextAction}` : null]
    .filter(Boolean)
    .join("\n\n") || undefined;
}

function portfolioTaskReturnView(formData: FormData) {
  const returnView = formString(formData, "returnView");

  if (returnView === "all" || returnView === "projects") return returnView;

  return "tasks";
}

function portfolioTaskReturnUrl(formData: FormData, state: string) {
  const params = new URLSearchParams({
    targetCreate: state,
    view: portfolioTaskReturnView(formData),
  });
  const selectedProjectId = optionalFormString(formData, "selectedProjectId");

  if (selectedProjectId) {
    params.set("selected", selectedProjectId);
  }

  return `/portfolio?${params.toString()}`;
}

function scheduledStartAtFromForm(formData: FormData, plannedDate: string) {
  const scheduledStartAtInput = formString(formData, "scheduledStartAt");

  if (scheduledStartAtInput) return scheduledStartAtInput;

  const scheduledTimeInput = formString(formData, "scheduledTime");
  const scheduledTime = isLocalTime(scheduledTimeInput)
    ? scheduledTimeInput
    : "09:00";

  return zonedLocalDateTimeToIso(plannedDate, scheduledTime);
}

function revalidateTaskProjectionRoutes() {
  revalidatePath("/portfolio");
  revalidatePath("/today");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
}

function authBlockedMessage(
  error: "auth_error" | "invalid_session" | "missing_env" | "unauthenticated",
  actionLabel = "planen",
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

  return `Melde dich an, um Tasks zu ${actionLabel}.`;
}

async function getAuthenticatedManualTaskContext(actionLabel: string) {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId !== "manual") {
    return {
      ok: false as const,
      result: {
        message: `Wechsle ins Manual-Profil, um Tasks zu ${actionLabel}.`,
        status: "blocked" as const,
      },
    };
  }

  const auth = await createAuthenticatedSupabaseServerClient();

  if (!auth.ok) {
    return {
      ok: false as const,
      result: {
        message: authBlockedMessage(auth.error, actionLabel),
        status: "blocked" as const,
      },
    };
  }

  return {
    auth,
    ok: true as const,
  };
}

async function validateProjectScope(
  context: Awaited<ReturnType<typeof getAuthenticatedManualTaskContext>>,
  projectId: string | undefined,
) {
  if (!projectId || !context.ok) return true;

  const result = await context.auth.client
    .from("projects")
    .select("id")
    .eq("user_id", context.auth.user.id)
    .eq("id", projectId)
    .is("archived_at", null)
    .maybeSingle();

  return !result.error && Boolean(result.data);
}

export async function scheduleTaskForTodayAction(
  formData: FormData,
): Promise<TaskScheduleActionResult> {
  const context = await getAuthenticatedManualTaskContext("planen");

  if (!context.ok) return context.result;

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
    profileId: context.auth.user.id,
    scheduledStartAt,
    taskId: formString(formData, "taskId"),
    userId: context.auth.user.id,
  });

  if (!parsed.success) {
    return {
      message: "Der Task konnte nicht geplant werden.",
      status: "error",
    };
  }

  const repository = createSupabaseTaskRepository(context.auth.client);
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

export async function createPortfolioTaskAction(
  formData: FormData,
): Promise<TaskLifecycleActionResult> {
  const context = await getAuthenticatedManualTaskContext("erstellen");

  if (!context.ok) return context.result;

  const todayCandidate = formData.get("todayCandidate") === "on";
  const projectId = optionalFormString(formData, "projectId");

  if (!(await validateProjectScope(context, projectId))) {
    return {
      message: "Das Project konnte nicht als Task-Kontext bestätigt werden.",
      status: "error",
    };
  }

  const parsed = createTaskInputSchema.safeParse({
    description: portfolioTaskDescriptionFromForm(formData),
    durationMinutes: durationMinutesFromForm(formData, "plan"),
    energy: optionalFormString(formData, "energy"),
    plannedDate: todayCandidate ? localDateLabel() : undefined,
    priority: formString(formData, "priority") || "none",
    projectId,
    profileId: context.auth.user.id,
    status: "planned",
    title: formString(formData, "title"),
    userId: context.auth.user.id,
  });

  if (!parsed.success) {
    return {
      message: "Gib einen gültigen Task-Titel ein.",
      status: "error",
    };
  }

  const repository = createSupabaseTaskRepository(context.auth.client);
  const result = await repository.createTask(parsed.data);

  if (!result.ok) {
    return {
      message: "Der Task konnte in Supabase nicht erstellt werden.",
      status: "error",
    };
  }

  revalidateTaskProjectionRoutes();

  return {
    message: "Task erstellt.",
    status: "success",
    taskId: result.data.id,
  };
}

export async function createPortfolioTaskFormAction(
  formData: FormData,
): Promise<void> {
  const result = await createPortfolioTaskAction(formData);

  if (result.status === "success") {
    redirect(portfolioTaskReturnUrl(formData, "task_created"));
  }

  redirect(portfolioTaskReturnUrl(formData, result.status));
}

export async function completeTaskAction(
  formData: FormData,
): Promise<TaskLifecycleActionResult> {
  const context = await getAuthenticatedManualTaskContext("erledigen");

  if (!context.ok) return context.result;

  const parsed = completeTaskInputSchema.safeParse({
    completedAt: formString(formData, "completedAt") || new Date().toISOString(),
    completionNote: formString(formData, "completionNote") || undefined,
    profileId: context.auth.user.id,
    taskId: formString(formData, "taskId"),
    userId: context.auth.user.id,
  });

  if (!parsed.success) {
    return {
      message: "Der Task konnte nicht abgeschlossen werden.",
      status: "error",
    };
  }

  const repository = createSupabaseTaskRepository(context.auth.client);
  const result = await repository.completeTask(parsed.data);

  if (!result.ok) {
    return {
      message: "Der Task konnte in Supabase nicht abgeschlossen werden.",
      status: "error",
    };
  }

  revalidateTaskProjectionRoutes();

  return {
    message: "Task abgeschlossen.",
    status: "success",
    taskId: result.data.id,
  };
}

export async function reopenTaskAction(
  formData: FormData,
): Promise<TaskLifecycleActionResult> {
  const context = await getAuthenticatedManualTaskContext("wieder öffnen");

  if (!context.ok) return context.result;

  const parsed = reopenTaskInputSchema.safeParse({
    profileId: context.auth.user.id,
    taskId: formString(formData, "taskId"),
    userId: context.auth.user.id,
  });

  if (!parsed.success) {
    return {
      message: "Der Task konnte nicht wieder geöffnet werden.",
      status: "error",
    };
  }

  const repository = createSupabaseTaskRepository(context.auth.client);
  const result = await repository.reopenTask(parsed.data);

  if (!result.ok) {
    return {
      message: "Der Task konnte in Supabase nicht wieder geöffnet werden.",
      status: "error",
    };
  }

  revalidateTaskProjectionRoutes();

  return {
    message: "Task wieder geöffnet.",
    status: "success",
    taskId: result.data.id,
  };
}

export async function archiveTaskAction(
  formData: FormData,
): Promise<TaskLifecycleActionResult> {
  const context = await getAuthenticatedManualTaskContext("archivieren");

  if (!context.ok) return context.result;

  const parsed = archiveTaskInputSchema.safeParse({
    archivedAt: formString(formData, "archivedAt") || new Date().toISOString(),
    profileId: context.auth.user.id,
    taskId: formString(formData, "taskId"),
    userId: context.auth.user.id,
  });

  if (!parsed.success) {
    return {
      message: "Der Task konnte nicht archiviert werden.",
      status: "error",
    };
  }

  const repository = createSupabaseTaskRepository(context.auth.client);
  const result = await repository.archiveTask(parsed.data);

  if (!result.ok) {
    return {
      message: "Der Task konnte in Supabase nicht archiviert werden.",
      status: "error",
    };
  }

  revalidateTaskProjectionRoutes();

  return {
    message: "Task archiviert.",
    status: "success",
    taskId: result.data.id,
  };
}

export async function unscheduleTaskAction(
  formData: FormData,
): Promise<TaskLifecycleActionResult> {
  const context = await getAuthenticatedManualTaskContext("entterminieren");

  if (!context.ok) return context.result;

  const parsed = unscheduleTaskInputSchema.safeParse({
    profileId: context.auth.user.id,
    taskId: formString(formData, "taskId"),
    userId: context.auth.user.id,
  });

  if (!parsed.success) {
    return {
      message: "Der Task konnte nicht entterminiert werden.",
      status: "error",
    };
  }

  const repository = createSupabaseTaskRepository(context.auth.client);
  const result = await repository.unscheduleTask(parsed.data);

  if (!result.ok) {
    return {
      message: "Der Task konnte in Supabase nicht entterminiert werden.",
      status: "error",
    };
  }

  revalidateTaskProjectionRoutes();

  return {
    message: "Task entterminiert.",
    status: "success",
    taskId: result.data.id,
  };
}

export async function rescheduleTaskAction(
  formData: FormData,
): Promise<TaskLifecycleActionResult> {
  const context = await getAuthenticatedManualTaskContext("umplanen");

  if (!context.ok) return context.result;

  const plannedDateInput = formString(formData, "plannedDate");
  const plannedDate = isLocalDate(plannedDateInput)
    ? plannedDateInput
    : localDateLabel();
  const parsed = rescheduleTaskInputSchema.safeParse({
    durationMinutes: durationMinutesFromForm(formData, "schedule"),
    plannedDate,
    profileId: context.auth.user.id,
    scheduledStartAt: scheduledStartAtFromForm(formData, plannedDate),
    taskId: formString(formData, "taskId"),
    userId: context.auth.user.id,
  });

  if (!parsed.success) {
    return {
      message: "Der Task konnte nicht umgeplant werden.",
      status: "error",
    };
  }

  const repository = createSupabaseTaskRepository(context.auth.client);
  const result = await repository.rescheduleTask(parsed.data);

  if (!result.ok) {
    return {
      message: "Der Task konnte in Supabase nicht umgeplant werden.",
      status: "error",
    };
  }

  revalidateTaskProjectionRoutes();

  return {
    message: "Task umgeplant.",
    status: "success",
    taskId: result.data.id,
  };
}

export async function completeTaskFormAction(formData: FormData): Promise<void> {
  await completeTaskAction(formData);
}

export async function reopenTaskFormAction(formData: FormData): Promise<void> {
  await reopenTaskAction(formData);
}

export async function archiveTaskFormAction(formData: FormData): Promise<void> {
  await archiveTaskAction(formData);
}

export async function unscheduleTaskFormAction(
  formData: FormData,
): Promise<void> {
  await unscheduleTaskAction(formData);
}

export async function rescheduleTaskFormAction(
  formData: FormData,
): Promise<void> {
  await rescheduleTaskAction(formData);
}

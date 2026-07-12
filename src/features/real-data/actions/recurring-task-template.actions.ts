"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createRecurringTaskTemplateInputSchema,
  deactivateRecurringTaskTemplateInputSchema,
  recurringTaskTemplateInputSchema,
  updateRecurringTaskTemplateActionInputSchema,
  updateRecurringTaskTemplateInputSchema,
} from "@/features/real-data";
import { createSupabaseRecurringTaskTemplateRepository } from "@/features/real-data/supabase";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { createAuthenticatedSupabaseServerClient } from "@/lib/supabase/server";

export type RecurringTaskTemplateActionResult = {
  message: string;
  status: "blocked" | "error" | "success";
  templateId?: string;
};

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalFormString(formData: FormData, key: string) {
  return formString(formData, key) || undefined;
}

function optionalFormStringIfPresent(formData: FormData, key: string) {
  if (!formData.has(key)) return undefined;

  return optionalFormString(formData, key) ?? null;
}

function optionalFormNumber(formData: FormData, key: string) {
  if (!formData.has(key)) return undefined;

  const raw = formString(formData, key);
  if (!raw) return null;
  const value = Number(raw);

  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function optionalFormBoolean(formData: FormData, key: string) {
  if (!formData.has(key)) return undefined;

  const value = formString(formData, key).toLowerCase();

  if (value === "true" || value === "on" || value === "1") return true;
  if (value === "false" || value === "off" || value === "0") return false;

  return undefined;
}

function recurrenceRuleFromForm(formData: FormData) {
  const raw = formString(formData, "recurrenceRule");
  if (!raw) return undefined;

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

function recurrenceRuleFromFrequencyForm(formData: FormData) {
  const frequency = formString(formData, "frequency");
  const rawInterval = Number(formString(formData, "interval"));
  const interval =
    Number.isInteger(rawInterval) && rawInterval > 0 ? rawInterval : 1;

  if (frequency === "daily") {
    return {
      frequency: "daily",
      interval,
      version: "v1",
    };
  }

  if (frequency === "weekly") {
    const byWeekday = formData
      .getAll("byWeekday")
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 1 && value <= 7);

    return {
      byWeekday,
      frequency: "weekly",
      interval,
      version: "v1",
    };
  }

  return undefined;
}

function revalidateRecurringTemplateRoutes() {
  revalidatePath("/portfolio");
  revalidatePath("/dashboard");
  revalidatePath("/today");
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

  return "Melde dich an, um Recurring Templates zu verwalten.";
}

function repositoryFailureMessage(message: string) {
  if (message.includes("Area")) {
    return "Der Area-Kontext konnte nicht bestätigt werden.";
  }

  if (message.includes("Project")) {
    return "Der Project-Kontext konnte nicht bestätigt werden.";
  }

  if (message.includes("Goal")) {
    return "Der Goal-Kontext konnte nicht bestätigt werden.";
  }

  if (message.includes("Recurring task template")) {
    return "Das Recurring Template wurde im aktuellen User-Scope nicht gefunden.";
  }

  return "Das Recurring Template konnte nicht gespeichert werden.";
}

async function getAuthenticatedRecurringTemplateContext() {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId !== "manual") {
    return {
      ok: false as const,
      result: {
        message:
          "Wechsle ins Manual-Profil, um Recurring Templates zu verwalten.",
        status: "blocked" as const,
      },
    };
  }

  const auth = await createAuthenticatedSupabaseServerClient();

  if (!auth.ok) {
    return {
      ok: false as const,
      result: {
        message: authBlockedMessage(auth.error),
        status: "blocked" as const,
      },
    };
  }

  return {
    auth,
    ok: true as const,
  };
}

export async function createRecurringTaskTemplateAction(
  formData: FormData,
): Promise<RecurringTaskTemplateActionResult> {
  const context = await getAuthenticatedRecurringTemplateContext();

  if (!context.ok) return context.result;

  const actionInput = recurringTaskTemplateInputSchema.safeParse({
    areaId: optionalFormString(formData, "areaId"),
    description: optionalFormString(formData, "description"),
    durationMinutes: optionalFormNumber(formData, "durationMinutes"),
    endsOn: optionalFormString(formData, "endsOn"),
    energy: optionalFormString(formData, "energy"),
    goalId: optionalFormString(formData, "goalId"),
    isActive: optionalFormBoolean(formData, "isActive"),
    nextAction: optionalFormString(formData, "nextAction"),
    priority: optionalFormString(formData, "priority"),
    projectId: optionalFormString(formData, "projectId"),
    recurrenceRule:
      recurrenceRuleFromForm(formData) ??
      recurrenceRuleFromFrequencyForm(formData),
    startsOn: formString(formData, "startsOn"),
    timezone: formString(formData, "timezone"),
    title: formString(formData, "title"),
  });

  if (!actionInput.success) {
    return {
      message: "Gib gültige Recurring-Template-Daten ein.",
      status: "error",
    };
  }

  const parsed = createRecurringTaskTemplateInputSchema.safeParse({
    ...actionInput.data,
    profileId: context.auth.user.id,
    userId: context.auth.user.id,
  });

  if (!parsed.success) {
    return {
      message: "Das Recurring Template konnte nicht validiert werden.",
      status: "error",
    };
  }

  const repository = createSupabaseRecurringTaskTemplateRepository(
    context.auth.client,
  );
  const result = await repository.createRecurringTaskTemplate(parsed.data);

  if (!result.ok) {
    return {
      message: repositoryFailureMessage(result.error.message),
      status: "error",
    };
  }

  revalidateRecurringTemplateRoutes();

  return {
    message: "Recurring Template erstellt.",
    status: "success",
    templateId: result.data.id,
  };
}

function todayTemplateReturnUrl(result: RecurringTaskTemplateActionResult) {
  const params = new URLSearchParams({
    recurringTemplate: result.status === "success" ? "created" : result.status,
  });

  return `/today?${params.toString()}`;
}

function recurringTemplateReturnUrl(
  result: RecurringTaskTemplateActionResult,
  success: "activated" | "paused" | "updated",
) {
  const params = new URLSearchParams({
    recurringTemplate: result.status === "success" ? success : result.status,
  });

  return `/today?${params.toString()}`;
}

export async function createRecurringTaskTemplateTodayFormAction(
  formData: FormData,
): Promise<void> {
  const result = await createRecurringTaskTemplateAction(formData);

  redirect(todayTemplateReturnUrl(result));
}

export async function updateRecurringTaskTemplateAction(
  formData: FormData,
): Promise<RecurringTaskTemplateActionResult> {
  const context = await getAuthenticatedRecurringTemplateContext();

  if (!context.ok) return context.result;

  const actionInput = updateRecurringTaskTemplateActionInputSchema.safeParse({
    areaId: optionalFormStringIfPresent(formData, "areaId"),
    description: optionalFormStringIfPresent(formData, "description"),
    durationMinutes: optionalFormNumber(formData, "durationMinutes"),
    endsOn: optionalFormStringIfPresent(formData, "endsOn"),
    energy: optionalFormStringIfPresent(formData, "energy"),
    goalId: optionalFormStringIfPresent(formData, "goalId"),
    isActive: optionalFormBoolean(formData, "isActive"),
    nextAction: optionalFormStringIfPresent(formData, "nextAction"),
    priority: optionalFormStringIfPresent(formData, "priority"),
    projectId: optionalFormStringIfPresent(formData, "projectId"),
    recurrenceRule:
      recurrenceRuleFromForm(formData) ??
      recurrenceRuleFromFrequencyForm(formData),
    startsOn: optionalFormStringIfPresent(formData, "startsOn"),
    templateId: formString(formData, "templateId"),
    timezone: optionalFormStringIfPresent(formData, "timezone"),
    title: optionalFormStringIfPresent(formData, "title"),
  });

  if (!actionInput.success) {
    return {
      message: "Gib gültige Recurring-Template-Daten ein.",
      status: "error",
    };
  }

  const parsed = updateRecurringTaskTemplateInputSchema.safeParse({
    ...actionInput.data,
    profileId: context.auth.user.id,
    userId: context.auth.user.id,
  });

  if (!parsed.success) {
    return {
      message: "Das Recurring Template konnte nicht validiert werden.",
      status: "error",
    };
  }

  const repository = createSupabaseRecurringTaskTemplateRepository(
    context.auth.client,
  );
  const result = await repository.updateRecurringTaskTemplate(parsed.data);

  if (!result.ok) {
    return {
      message: repositoryFailureMessage(result.error.message),
      status: "error",
    };
  }

  revalidateRecurringTemplateRoutes();

  return {
    message: "Recurring Template aktualisiert.",
    status: "success",
    templateId: result.data.id,
  };
}

export async function updateRecurringTaskTemplateTodayFormAction(
  formData: FormData,
): Promise<void> {
  const result = await updateRecurringTaskTemplateAction(formData);
  redirect(recurringTemplateReturnUrl(result, "updated"));
}

export async function deactivateRecurringTaskTemplateAction(
  formData: FormData,
): Promise<RecurringTaskTemplateActionResult> {
  const context = await getAuthenticatedRecurringTemplateContext();

  if (!context.ok) return context.result;

  const parsed = deactivateRecurringTaskTemplateInputSchema.safeParse({
    profileId: context.auth.user.id,
    templateId: formString(formData, "templateId"),
    userId: context.auth.user.id,
  });

  if (!parsed.success) {
    return {
      message: "Das Recurring Template konnte nicht validiert werden.",
      status: "error",
    };
  }

  const repository = createSupabaseRecurringTaskTemplateRepository(
    context.auth.client,
  );
  const result = await repository.deactivateRecurringTaskTemplate(parsed.data);

  if (!result.ok) {
    return {
      message: repositoryFailureMessage(result.error.message),
      status: "error",
    };
  }

  revalidateRecurringTemplateRoutes();

  return {
    message: "Recurring Template deaktiviert.",
    status: "success",
    templateId: result.data.id,
  };
}

export async function deactivateRecurringTaskTemplateTodayFormAction(
  formData: FormData,
): Promise<void> {
  const result = await deactivateRecurringTaskTemplateAction(formData);
  redirect(recurringTemplateReturnUrl(result, "paused"));
}

export async function reactivateRecurringTaskTemplateTodayFormAction(
  formData: FormData,
): Promise<void> {
  const nextFormData = new FormData();
  nextFormData.set("templateId", formString(formData, "templateId"));
  nextFormData.set("isActive", "true");
  const result = await updateRecurringTaskTemplateAction(nextFormData);
  redirect(recurringTemplateReturnUrl(result, "activated"));
}

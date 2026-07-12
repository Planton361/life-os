"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  generateRecurringTaskInstancesForDate,
  generateRecurringTaskInstancesForRange,
  type RecurringTaskGenerationSkippedTemplate,
} from "@/features/real-data";
import {
  generateRecurringTaskInstancesForDateActionInputSchema,
  generateRecurringTaskInstancesForRangeActionInputSchema,
} from "@/features/real-data";
import {
  createSupabaseRecurringTaskTemplateRepository,
  createSupabaseTaskRepository,
} from "@/features/real-data/supabase";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { createAuthenticatedSupabaseServerClient } from "@/lib/supabase/server";

export type RecurringTaskGenerationActionResult = {
  existingCount: number;
  generatedCount: number;
  message: string;
  skippedTemplates: RecurringTaskGenerationSkippedTemplate[];
  status: "blocked" | "error" | "success";
  taskIds: string[];
};

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function emptyGenerationResult(
  status: RecurringTaskGenerationActionResult["status"],
  message: string,
): RecurringTaskGenerationActionResult {
  return {
    existingCount: 0,
    generatedCount: 0,
    message,
    skippedTemplates: [],
    status,
    taskIds: [],
  };
}

function revalidateGeneratedTaskRoutes() {
  revalidatePath("/portfolio");
  revalidatePath("/today");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
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

  return "Melde dich an, um Recurring Task Instances zu erzeugen.";
}

async function getAuthenticatedGenerationContext() {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId !== "manual") {
    return {
      ok: false as const,
      result: emptyGenerationResult(
        "blocked",
        "Wechsle ins Manual-Profil, um Recurring Task Instances zu erzeugen.",
      ),
    };
  }

  const auth = await createAuthenticatedSupabaseServerClient();

  if (!auth.ok) {
    return {
      ok: false as const,
      result: emptyGenerationResult("blocked", authBlockedMessage(auth.error)),
    };
  }

  return {
    auth,
    ok: true as const,
  };
}

function actionResultFromGeneration(
  message: string,
  generated: { id: string }[],
  existing: { id: string }[],
  skippedTemplates: RecurringTaskGenerationSkippedTemplate[],
): RecurringTaskGenerationActionResult {
  return {
    existingCount: existing.length,
    generatedCount: generated.length,
    message,
    skippedTemplates,
    status: "success",
    taskIds: [...generated, ...existing].map((task) => task.id),
  };
}

export async function generateRecurringTaskInstancesForDateAction(
  formData: FormData,
): Promise<RecurringTaskGenerationActionResult> {
  const context = await getAuthenticatedGenerationContext();

  if (!context.ok) return context.result;

  const parsed =
    generateRecurringTaskInstancesForDateActionInputSchema.safeParse({
      date: formString(formData, "date"),
    });

  if (!parsed.success) {
    return emptyGenerationResult(
      "error",
      "Gib ein gültiges Generierungsdatum ein.",
    );
  }

  const result = await generateRecurringTaskInstancesForDate(
    {
      date: parsed.data.date,
      profileId: context.auth.user.id,
      userId: context.auth.user.id,
    },
    {
      recurringTaskTemplates: createSupabaseRecurringTaskTemplateRepository(
        context.auth.client,
      ),
      tasks: createSupabaseTaskRepository(context.auth.client),
    },
  );

  if (!result.ok) {
    return emptyGenerationResult(
      "error",
      "Recurring Task Instances konnten nicht erzeugt werden.",
    );
  }

  revalidateGeneratedTaskRoutes();

  return actionResultFromGeneration(
    "Recurring Task Instances erzeugt.",
    result.data.generated,
    result.data.existing,
    result.data.skippedTemplates,
  );
}

export async function generateRecurringTaskInstancesForRangeAction(
  formData: FormData,
): Promise<RecurringTaskGenerationActionResult> {
  const context = await getAuthenticatedGenerationContext();

  if (!context.ok) return context.result;

  const parsed =
    generateRecurringTaskInstancesForRangeActionInputSchema.safeParse({
      endDate: formString(formData, "endDate"),
      startDate: formString(formData, "startDate"),
    });

  if (!parsed.success) {
    return emptyGenerationResult(
      "error",
      "Gib einen gültigen Generierungszeitraum bis maximal 31 Tage ein.",
    );
  }

  const result = await generateRecurringTaskInstancesForRange(
    {
      endDate: parsed.data.endDate,
      profileId: context.auth.user.id,
      startDate: parsed.data.startDate,
      userId: context.auth.user.id,
    },
    {
      recurringTaskTemplates: createSupabaseRecurringTaskTemplateRepository(
        context.auth.client,
      ),
      tasks: createSupabaseTaskRepository(context.auth.client),
    },
  );

  if (!result.ok) {
    return emptyGenerationResult(
      "error",
      "Recurring Task Instances konnten nicht erzeugt werden.",
    );
  }

  revalidateGeneratedTaskRoutes();

  return actionResultFromGeneration(
    "Recurring Task Instances erzeugt.",
    result.data.generated,
    result.data.existing,
    result.data.skippedTemplates,
  );
}

function todayGenerationReturnUrl(result: RecurringTaskGenerationActionResult) {
  const params = new URLSearchParams();

  if (result.status !== "success") {
    params.set("recurringGeneration", result.status);
  } else if (result.generatedCount > 0) {
    params.set("recurringGeneration", "generated");
  } else {
    params.set("recurringGeneration", "idle");
  }

  return `/today?${params.toString()}`;
}

export async function generateRecurringTaskInstancesForTodayFormAction(
  formData: FormData,
): Promise<void> {
  const result = await generateRecurringTaskInstancesForDateAction(formData);

  redirect(todayGenerationReturnUrl(result));
}

export async function generateRecurringTaskInstancesForRangeTodayFormAction(
  formData: FormData,
): Promise<void> {
  const result = await generateRecurringTaskInstancesForRangeAction(formData);
  redirect(todayGenerationReturnUrl(result));
}

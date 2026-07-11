"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createGoalInputSchema,
  createProjectInputSchema,
  updateGoalInputSchema,
  updateProjectInputSchema,
} from "@/features/real-data";
import {
  createSupabaseGoalRepository,
  createSupabaseProjectRepository,
} from "@/features/real-data/supabase";
import type { SupabaseClientLike } from "@/features/real-data/supabase";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { createAuthenticatedSupabaseServerClient } from "@/lib/supabase/server";

export type PortfolioTargetCreateActionResult = {
  goalId?: string;
  message: string;
  projectId?: string;
  status: "blocked" | "error" | "success";
};

export type PortfolioProjectEditActionResult = {
  message: string;
  projectId?: string;
  status: "blocked" | "error" | "success";
};

export type PortfolioGoalEditActionResult = {
  goalId?: string;
  message: string;
  status: "blocked" | "error" | "success";
};

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalFormString(formData: FormData, key: string) {
  return formString(formData, key) || undefined;
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

  return "Melde dich an, um Portfolio-Targets zu erstellen.";
}

function revalidatePortfolioTargetRoutes() {
  revalidatePath("/portfolio");
  revalidatePath("/inbox");
  revalidatePath("/dashboard");
  revalidatePath("/today");
  revalidatePath("/calendar");
}

function projectActionReturnUrl(
  state: string,
  formData: FormData,
  projectId?: string,
) {
  const params = new URLSearchParams({
    targetCreate: state,
    view: "projects",
  });
  const selectedProjectId = optionalFormString(formData, "selectedProjectId");

  if (projectId ?? selectedProjectId) {
    params.set("selected", projectId ?? selectedProjectId ?? "");
  }

  return `/portfolio?${params.toString()}`;
}

function redirectToProjectActionState(
  state: string,
  formData: FormData,
  projectId?: string,
) {
  redirect(projectActionReturnUrl(state, formData, projectId));
}

function goalActionReturnUrl(state: string, formData: FormData, goalId?: string) {
  const params = new URLSearchParams({
    targetCreate: state,
    view: "goals",
  });
  const selectedGoalId = optionalFormString(formData, "selectedGoalId");

  if (goalId ?? selectedGoalId) {
    params.set("selected", goalId ?? selectedGoalId ?? "");
  }

  return `/portfolio?${params.toString()}`;
}

function redirectToGoalActionState(
  state: string,
  formData: FormData,
  goalId?: string,
) {
  redirect(goalActionReturnUrl(state, formData, goalId));
}

type PortfolioCreateReturnView = "all" | "goals" | "projects";

function returnViewFromForm(
  formData: FormData,
  fallback: Exclude<PortfolioCreateReturnView, "all">,
): PortfolioCreateReturnView {
  const returnView = formString(formData, "returnView");

  if (returnView === "all" || returnView === "goals" || returnView === "projects") {
    return returnView;
  }

  return fallback;
}

function portfolioCreateReturnUrl(
  state: string,
  view: PortfolioCreateReturnView,
  formData?: FormData,
  createdEntityId?: string,
) {
  const params = new URLSearchParams({
    targetCreate: state,
    view,
  });
  const selectedGoalId = formData
    ? optionalFormString(formData, "selectedGoalId")
    : undefined;

  if (selectedGoalId) {
    params.set("selected", selectedGoalId);
  } else if (createdEntityId) {
    params.set("selected", createdEntityId);
  }

  return `/portfolio?${params.toString()}`;
}

function redirectToPortfolioCreateState(
  state: string,
  view: PortfolioCreateReturnView,
  formData?: FormData,
  createdEntityId?: string,
) {
  redirect(portfolioCreateReturnUrl(state, view, formData, createdEntityId));
}

async function validateGoalScope(
  client: SupabaseClientLike,
  userId: string,
  goalId: string | undefined,
) {
  if (!goalId) return true;

  const result = await client
    .from("goals")
    .select("id")
    .eq("user_id", userId)
    .eq("id", goalId)
    .is("archived_at", null)
    .maybeSingle();

  return !result.error && Boolean(result.data);
}

export async function createProjectAction(
  formData: FormData,
): Promise<PortfolioTargetCreateActionResult> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId !== "manual") {
    return {
      message: "Wechsle ins Manual-Profil, um Projects zu erstellen.",
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

  const goalId = optionalFormString(formData, "goalId");

  if (!(await validateGoalScope(auth.client, auth.user.id, goalId))) {
    return {
      message: "Das Goal konnte nicht als Project-Kontext bestätigt werden.",
      status: "error",
    };
  }

  const parsed = createProjectInputSchema.safeParse({
    description: optionalFormString(formData, "description"),
    goalId,
    profileId: auth.user.id,
    title: formString(formData, "title"),
    userId: auth.user.id,
  });

  if (!parsed.success) {
    return {
      message: "Gib einen gültigen Project-Titel ein.",
      status: "error",
    };
  }

  const repository = createSupabaseProjectRepository(auth.client);
  const result = await repository.createProject(parsed.data);

  if (!result.ok) {
    return {
      message: "Das Project konnte nicht gespeichert werden.",
      status: "error",
    };
  }

  revalidatePortfolioTargetRoutes();

  return {
    message: "Project erstellt.",
    projectId: result.data.id,
    status: "success",
  };
}

async function getAuthenticatedManualProjectContext(actionLabel: string) {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId !== "manual") {
    return {
      ok: false as const,
      result: {
        message: `Wechsle ins Manual-Profil, um Projects zu ${actionLabel}.`,
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

export async function updateProjectAction(
  formData: FormData,
): Promise<PortfolioProjectEditActionResult> {
  const context = await getAuthenticatedManualProjectContext("bearbeiten");

  if (!context.ok) return context.result;

  const parsed = updateProjectInputSchema.safeParse({
    description: optionalFormString(formData, "description"),
    nextStep: optionalFormString(formData, "nextStep"),
    profileId: context.auth.user.id,
    projectId: formString(formData, "projectId"),
    status: optionalFormString(formData, "status"),
    title: optionalFormString(formData, "title"),
    userId: context.auth.user.id,
  });

  if (!parsed.success) {
    return {
      message: "Das Project konnte nicht aktualisiert werden.",
      status: "error",
    };
  }

  const repository = createSupabaseProjectRepository(context.auth.client);
  const result = await repository.updateProject(parsed.data);

  if (!result.ok) {
    return {
      message: "Das Project konnte nicht in Supabase aktualisiert werden.",
      status: "error",
    };
  }

  revalidatePortfolioTargetRoutes();

  return {
    message: "Project aktualisiert.",
    projectId: result.data.id,
    status: "success",
  };
}

export async function archiveProjectAction(
  formData: FormData,
): Promise<PortfolioProjectEditActionResult> {
  const context = await getAuthenticatedManualProjectContext("archivieren");

  if (!context.ok) return context.result;

  const parsed = updateProjectInputSchema.safeParse({
    profileId: context.auth.user.id,
    projectId: formString(formData, "projectId"),
    status: "archived",
    userId: context.auth.user.id,
  });

  if (!parsed.success) {
    return {
      message: "Das Project konnte nicht archiviert werden.",
      status: "error",
    };
  }

  const repository = createSupabaseProjectRepository(context.auth.client);
  const result = await repository.updateProject(parsed.data);

  if (!result.ok) {
    return {
      message: "Das Project konnte nicht in Supabase archiviert werden.",
      status: "error",
    };
  }

  revalidatePortfolioTargetRoutes();

  return {
    message: "Project archiviert.",
    projectId: result.data.id,
    status: "success",
  };
}

async function getAuthenticatedManualGoalContext(actionLabel: string) {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId !== "manual") {
    return {
      ok: false as const,
      result: {
        message: `Wechsle ins Manual-Profil, um Goals zu ${actionLabel}.`,
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

export async function createGoalAction(
  formData: FormData,
): Promise<PortfolioTargetCreateActionResult> {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId !== "manual") {
    return {
      message: "Wechsle ins Manual-Profil, um Goals zu erstellen.",
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

  const parsed = createGoalInputSchema.safeParse({
    description: optionalFormString(formData, "description"),
    profileId: auth.user.id,
    title: formString(formData, "title"),
    userId: auth.user.id,
  });

  if (!parsed.success) {
    return {
      message: "Gib einen gültigen Goal-Titel ein.",
      status: "error",
    };
  }

  const repository = createSupabaseGoalRepository(auth.client);
  const result = await repository.createGoal(parsed.data);

  if (!result.ok) {
    return {
      message: "Das Goal konnte nicht gespeichert werden.",
      status: "error",
    };
  }

  revalidatePortfolioTargetRoutes();

  return {
    goalId: result.data.id,
    message: "Goal erstellt.",
    status: "success",
  };
}

export async function updateGoalAction(
  formData: FormData,
): Promise<PortfolioGoalEditActionResult> {
  const context = await getAuthenticatedManualGoalContext("bearbeiten");

  if (!context.ok) return context.result;

  const parsed = updateGoalInputSchema.safeParse({
    description: optionalFormString(formData, "description"),
    goalId: formString(formData, "goalId"),
    horizon: optionalFormString(formData, "horizon"),
    profileId: context.auth.user.id,
    status: optionalFormString(formData, "status"),
    title: optionalFormString(formData, "title"),
    userId: context.auth.user.id,
  });

  if (!parsed.success) {
    return {
      message: "Das Goal konnte nicht aktualisiert werden.",
      status: "error",
    };
  }

  const repository = createSupabaseGoalRepository(context.auth.client);
  const result = await repository.updateGoal(parsed.data);

  if (!result.ok) {
    return {
      message: "Das Goal konnte nicht in Supabase aktualisiert werden.",
      status: "error",
    };
  }

  revalidatePortfolioTargetRoutes();

  return {
    goalId: result.data.id,
    message: "Goal aktualisiert.",
    status: "success",
  };
}

export async function archiveGoalAction(
  formData: FormData,
): Promise<PortfolioGoalEditActionResult> {
  const context = await getAuthenticatedManualGoalContext("archivieren");

  if (!context.ok) return context.result;

  const parsed = updateGoalInputSchema.safeParse({
    goalId: formString(formData, "goalId"),
    profileId: context.auth.user.id,
    status: "archived",
    userId: context.auth.user.id,
  });

  if (!parsed.success) {
    return {
      message: "Das Goal konnte nicht archiviert werden.",
      status: "error",
    };
  }

  const repository = createSupabaseGoalRepository(context.auth.client);
  const result = await repository.updateGoal(parsed.data);

  if (!result.ok) {
    return {
      message: "Das Goal konnte nicht in Supabase archiviert werden.",
      status: "error",
    };
  }

  revalidatePortfolioTargetRoutes();

  return {
    goalId: result.data.id,
    message: "Goal archiviert.",
    status: "success",
  };
}

export async function createProjectFormAction(formData: FormData): Promise<void> {
  const result = await createProjectAction(formData);
  const returnView = returnViewFromForm(formData, "projects");

  if (result.status === "success") {
    redirectToPortfolioCreateState(
      "project_created",
      returnView,
      formData,
      result.projectId,
    );
  }

  redirectToPortfolioCreateState(result.status, returnView, formData);
}

export async function createGoalFormAction(formData: FormData): Promise<void> {
  const result = await createGoalAction(formData);
  const returnView = returnViewFromForm(formData, "goals");

  if (result.status === "success") {
    redirectToPortfolioCreateState(
      "goal_created",
      returnView,
      formData,
      result.goalId,
    );
  }

  redirectToPortfolioCreateState(result.status, returnView, formData);
}

export async function updateProjectFormAction(formData: FormData): Promise<void> {
  const result = await updateProjectAction(formData);

  if (result.status === "success") {
    redirectToProjectActionState("project_updated", formData, result.projectId);
  }

  redirectToProjectActionState(result.status, formData);
}

export async function archiveProjectFormAction(formData: FormData): Promise<void> {
  const result = await archiveProjectAction(formData);

  if (result.status === "success") {
    redirectToProjectActionState("project_archived", formData);
  }

  redirectToProjectActionState(result.status, formData);
}

export async function updateGoalFormAction(formData: FormData): Promise<void> {
  const result = await updateGoalAction(formData);

  if (result.status === "success") {
    redirectToGoalActionState("goal_updated", formData, result.goalId);
  }

  redirectToGoalActionState(result.status, formData);
}

export async function archiveGoalFormAction(formData: FormData): Promise<void> {
  const result = await archiveGoalAction(formData);

  if (result.status === "success") {
    redirectToGoalActionState("goal_archived", formData);
  }

  redirectToGoalActionState(result.status, formData);
}

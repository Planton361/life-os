"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createGoalInputSchema,
  createProjectInputSchema,
} from "@/features/real-data";
import {
  createSupabaseGoalRepository,
  createSupabaseProjectRepository,
} from "@/features/real-data/supabase";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { createAuthenticatedSupabaseServerClient } from "@/lib/supabase/server";

export type PortfolioTargetCreateActionResult = {
  goalId?: string;
  message: string;
  projectId?: string;
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

type PortfolioCreateReturnView = "all" | "goals" | "projects";

function returnViewFromForm(
  formData: FormData,
  fallback: Exclude<PortfolioCreateReturnView, "all">,
): PortfolioCreateReturnView {
  return formString(formData, "returnView") === "all" ? "all" : fallback;
}

function redirectToPortfolioCreateState(
  state: string,
  view: PortfolioCreateReturnView,
) {
  redirect(`/portfolio?view=${view}&targetCreate=${state}`);
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

  const parsed = createProjectInputSchema.safeParse({
    description: optionalFormString(formData, "description"),
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

export async function createProjectFormAction(formData: FormData): Promise<void> {
  const result = await createProjectAction(formData);
  const returnView = returnViewFromForm(formData, "projects");

  if (result.status === "success") {
    redirectToPortfolioCreateState("project_created", returnView);
  }

  redirectToPortfolioCreateState(result.status, returnView);
}

export async function createGoalFormAction(formData: FormData): Promise<void> {
  const result = await createGoalAction(formData);
  const returnView = returnViewFromForm(formData, "goals");

  if (result.status === "success") {
    redirectToPortfolioCreateState("goal_created", returnView);
  }

  redirectToPortfolioCreateState(result.status, returnView);
}

"use server";

import { revalidatePath } from "next/cache";
import {
  mealCompleteInputSchema,
  mealCreateInputSchema,
  mealUpdateInputSchema,
  recipeArchiveInputSchema,
  recipeCreateInputSchema,
  recipeUpdateInputSchema,
} from "@/features/real-data";
import { createSupabaseNutritionRepository } from "@/features/real-data/supabase";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { createAuthenticatedSupabaseServerClient } from "@/lib/supabase/server";

export type NutritionActionResult = {
  mealId?: string;
  message: string;
  recipeId?: string;
  status: "blocked" | "error" | "success";
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

  return optionalFormString(formData, key);
}

function optionalFormNumber(formData: FormData, key: string) {
  if (!formData.has(key)) return undefined;

  const value = Number(formString(formData, key));

  return Number.isFinite(value) ? value : undefined;
}

function tagsFromForm(formData: FormData) {
  const tags = formData
    .getAll("tags")
    .flatMap((value) =>
      typeof value === "string" ? value.split(",") : [],
    )
    .map((tag) => tag.trim())
    .filter(Boolean);

  return tags.length > 0 ? tags : undefined;
}

function nutritionEstimateFromForm(formData: FormData) {
  if (!formData.has("nutritionEstimate")) return undefined;

  const raw = formString(formData, "nutritionEstimate");
  if (!raw) return undefined;

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

function revalidateNutritionRoutes() {
  revalidatePath("/nutrition");
  revalidatePath("/dashboard");
  revalidatePath("/today");
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

  return "Melde dich an, um Nutrition-Daten zu speichern.";
}

function repositoryFailureMessage(message: string) {
  if (message.includes("Area")) {
    return "Der Area-Kontext konnte nicht bestätigt werden.";
  }

  if (message.includes("Recipe")) {
    return "Das Recipe wurde im aktuellen User-Scope nicht gefunden.";
  }

  if (message.includes("Meal")) {
    return "Das Meal wurde im aktuellen User-Scope nicht gefunden.";
  }

  return "Nutrition-Daten konnten nicht gespeichert werden.";
}

async function getAuthenticatedNutritionContext() {
  const profileId = await getCurrentLifeOsProfileId();

  if (profileId !== "manual") {
    return {
      ok: false as const,
      result: {
        message: "Wechsle ins Manual-Profil, um Nutrition-Daten zu speichern.",
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

export async function createRecipeAction(
  formData: FormData,
): Promise<NutritionActionResult> {
  const context = await getAuthenticatedNutritionContext();

  if (!context.ok) return context.result;

  const parsed = recipeCreateInputSchema.safeParse({
    areaId: optionalFormString(formData, "areaId"),
    instructions: optionalFormString(formData, "instructions"),
    nutritionEstimate: nutritionEstimateFromForm(formData),
    prepMinutes: optionalFormNumber(formData, "prepMinutes"),
    servings: optionalFormNumber(formData, "servings"),
    source: optionalFormString(formData, "source"),
    summary: optionalFormString(formData, "summary"),
    tags: tagsFromForm(formData),
    title: formString(formData, "title"),
  });

  if (!parsed.success) {
    return {
      message: "Gib gültige Recipe-Daten ein.",
      status: "error",
    };
  }

  const repository = createSupabaseNutritionRepository(context.auth.client);
  const result = await repository.createRecipe({
    ...parsed.data,
    profileId: context.auth.user.id,
    userId: context.auth.user.id,
  });

  if (!result.ok) {
    return {
      message: repositoryFailureMessage(result.error.message),
      status: "error",
    };
  }

  revalidateNutritionRoutes();

  return {
    message: "Recipe erstellt.",
    recipeId: result.data.id,
    status: "success",
  };
}

export async function updateRecipeAction(
  formData: FormData,
): Promise<NutritionActionResult> {
  const context = await getAuthenticatedNutritionContext();

  if (!context.ok) return context.result;

  const parsed = recipeUpdateInputSchema.safeParse({
    areaId: optionalFormStringIfPresent(formData, "areaId"),
    instructions: optionalFormStringIfPresent(formData, "instructions"),
    nutritionEstimate: nutritionEstimateFromForm(formData),
    prepMinutes: optionalFormNumber(formData, "prepMinutes"),
    recipeId: formString(formData, "recipeId"),
    servings: optionalFormNumber(formData, "servings"),
    source: optionalFormStringIfPresent(formData, "source"),
    summary: optionalFormStringIfPresent(formData, "summary"),
    tags: formData.has("tags") ? tagsFromForm(formData) : undefined,
    title: optionalFormStringIfPresent(formData, "title"),
  });

  if (!parsed.success) {
    return {
      message: "Gib gültige Recipe-Daten ein.",
      status: "error",
    };
  }

  const repository = createSupabaseNutritionRepository(context.auth.client);
  const result = await repository.updateRecipe({
    ...parsed.data,
    profileId: context.auth.user.id,
    userId: context.auth.user.id,
  });

  if (!result.ok) {
    return {
      message: repositoryFailureMessage(result.error.message),
      status: "error",
    };
  }

  revalidateNutritionRoutes();

  return {
    message: "Recipe aktualisiert.",
    recipeId: result.data.id,
    status: "success",
  };
}

export async function archiveRecipeAction(
  formData: FormData,
): Promise<NutritionActionResult> {
  const context = await getAuthenticatedNutritionContext();

  if (!context.ok) return context.result;

  const parsed = recipeArchiveInputSchema.safeParse({
    recipeId: formString(formData, "recipeId"),
  });

  if (!parsed.success) {
    return {
      message: "Das Recipe konnte nicht validiert werden.",
      status: "error",
    };
  }

  const repository = createSupabaseNutritionRepository(context.auth.client);
  const result = await repository.archiveRecipe({
    ...parsed.data,
    profileId: context.auth.user.id,
    userId: context.auth.user.id,
  });

  if (!result.ok) {
    return {
      message: repositoryFailureMessage(result.error.message),
      status: "error",
    };
  }

  revalidateNutritionRoutes();

  return {
    message: "Recipe archiviert.",
    recipeId: result.data.id,
    status: "success",
  };
}

export async function createMealAction(
  formData: FormData,
): Promise<NutritionActionResult> {
  const context = await getAuthenticatedNutritionContext();

  if (!context.ok) return context.result;

  const parsed = mealCreateInputSchema.safeParse({
    completedAt: optionalFormString(formData, "completedAt"),
    date: formString(formData, "date"),
    mealType: formString(formData, "mealType"),
    notes: optionalFormString(formData, "notes"),
    plannedAt: optionalFormString(formData, "plannedAt"),
    recipeId: optionalFormString(formData, "recipeId"),
    title: formString(formData, "title"),
  });

  if (!parsed.success) {
    return {
      message: "Gib gültige Meal-Daten ein.",
      status: "error",
    };
  }

  const repository = createSupabaseNutritionRepository(context.auth.client);
  const result = await repository.createMeal({
    ...parsed.data,
    profileId: context.auth.user.id,
    userId: context.auth.user.id,
  });

  if (!result.ok) {
    return {
      message: repositoryFailureMessage(result.error.message),
      status: "error",
    };
  }

  revalidateNutritionRoutes();

  return {
    mealId: result.data.id,
    message: "Meal erstellt.",
    status: "success",
  };
}

export async function updateMealAction(
  formData: FormData,
): Promise<NutritionActionResult> {
  const context = await getAuthenticatedNutritionContext();

  if (!context.ok) return context.result;

  const parsed = mealUpdateInputSchema.safeParse({
    completedAt: optionalFormStringIfPresent(formData, "completedAt"),
    date: optionalFormStringIfPresent(formData, "date"),
    mealId: formString(formData, "mealId"),
    mealType: optionalFormStringIfPresent(formData, "mealType"),
    notes: optionalFormStringIfPresent(formData, "notes"),
    plannedAt: optionalFormStringIfPresent(formData, "plannedAt"),
    recipeId: optionalFormStringIfPresent(formData, "recipeId"),
    title: optionalFormStringIfPresent(formData, "title"),
  });

  if (!parsed.success) {
    return {
      message: "Gib gültige Meal-Daten ein.",
      status: "error",
    };
  }

  const repository = createSupabaseNutritionRepository(context.auth.client);
  const result = await repository.updateMeal({
    ...parsed.data,
    profileId: context.auth.user.id,
    userId: context.auth.user.id,
  });

  if (!result.ok) {
    return {
      message: repositoryFailureMessage(result.error.message),
      status: "error",
    };
  }

  revalidateNutritionRoutes();

  return {
    mealId: result.data.id,
    message: "Meal aktualisiert.",
    status: "success",
  };
}

export async function completeMealAction(
  formData: FormData,
): Promise<NutritionActionResult> {
  const context = await getAuthenticatedNutritionContext();

  if (!context.ok) return context.result;

  const parsed = mealCompleteInputSchema.safeParse({
    completedAt: optionalFormString(formData, "completedAt"),
    mealId: formString(formData, "mealId"),
  });

  if (!parsed.success) {
    return {
      message: "Das Meal konnte nicht validiert werden.",
      status: "error",
    };
  }

  const repository = createSupabaseNutritionRepository(context.auth.client);
  const result = await repository.completeMeal({
    ...parsed.data,
    profileId: context.auth.user.id,
    userId: context.auth.user.id,
  });

  if (!result.ok) {
    return {
      message: repositoryFailureMessage(result.error.message),
      status: "error",
    };
  }

  revalidateNutritionRoutes();

  return {
    mealId: result.data.id,
    message: "Meal abgeschlossen.",
    status: "success",
  };
}

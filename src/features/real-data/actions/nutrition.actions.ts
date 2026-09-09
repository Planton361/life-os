"use server";
import { dependencyErrorMessage } from "../supabase/repositories/task-dependency-repository";

import { runningStartInstant } from "../domain/running-time";
import { scheduleSourceInputSchema } from "../schemas/schedule-source.schema";
import { nutritionPlanInputSchema } from "../schemas/nutrition.schema";
import { revalidatePath } from "next/cache";
import {
  mealCompleteInputSchema,
  mealCreateInputSchema,
  mealUpdateInputSchema,
  recipeArchiveInputSchema,
  recipeCreateInputSchema,
  recipeIngredientCreateInputSchema,
  recipeIngredientDeleteInputSchema,
  recipeIngredientUpdateInputSchema,
  recipeUpdateInputSchema,
  type RecipeIngredient as RealDataRecipeIngredient,
} from "@/features/real-data";
import {
  createSupabaseNutritionRepository,
  createSupabaseScheduleSourceRepository,
} from "@/features/real-data/supabase";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { createAuthenticatedSupabaseServerClient } from "@/lib/supabase/server";

export type NutritionActionResult = {
  ingredient?: NutritionIngredientActionPayload;
  ingredientId?: string;
  mealId?: string;
  message: string;
  recipeId?: string;
  status: "blocked" | "error" | "success";
};

export type NutritionIngredientActionPayload = {
  id: string;
  name: string;
  note: string | null;
  position: number;
  quantity: number | null;
  recipeId: string;
  unit: string | null;
};

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function formStringIfPresent(formData: FormData, key: string) {
  if (!formData.has(key)) return undefined;

  return formString(formData, key);
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

function nullableFormString(formData: FormData, key: string) {
  const value = formString(formData, key);

  return value || null;
}

function nullableFormStringIfPresent(formData: FormData, key: string) {
  if (!formData.has(key)) return undefined;

  return nullableFormString(formData, key);
}

function nullableFormNumber(formData: FormData, key: string) {
  const raw = formString(formData, key);

  if (!raw) return null;

  const value = Number(raw);

  return Number.isFinite(value) ? value : raw;
}

function nullableFormNumberIfPresent(formData: FormData, key: string) {
  if (!formData.has(key)) return undefined;

  return nullableFormNumber(formData, key);
}

function tagsFromForm(formData: FormData) {
  const tags = formData
    .getAll("tags")
    .flatMap((value) => (typeof value === "string" ? value.split(",") : []))
    .map((tag) => tag.trim())
    .filter(Boolean);

  return tags.length > 0 ? tags : undefined;
}

function nutritionEstimateFromForm(formData: FormData) {
  const keys = ["calories", "protein", "carbs", "fat"];
  if (keys.some((key) => formData.has(`estimate_${key}`))) {
    const values = keys.map((key) => formString(formData, `estimate_${key}`));
    if (values.some((v) => v && (!Number.isFinite(Number(v)) || Number(v) < 0)))
      return "invalid estimate";
    return Object.fromEntries(
      keys.flatMap((key, i) => (values[i] ? [[key, Number(values[i])]] : [])),
    );
  }
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
  revalidatePath("/portfolio");
  revalidatePath("/projects/[projectId]", "page");
  revalidatePath("/tasks/[taskId]", "page");
  revalidatePath("/nutrition/grocery");
  revalidatePath("/calendar");
  revalidatePath("/nutrition");
  revalidatePath("/nutrition/meal-planner");
  revalidatePath("/nutrition/recipes");
  revalidatePath("/nutrition/recipes/[recipeId]", "page");
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
  if (message.includes("DEPENDENCY_")) return dependencyErrorMessage(message);
  if (message.includes("source-aware Calendar")) {
    return "Geplante Meals werden über die Calendar-Steuerung umgeplant oder entterminiert.";
  }
  if (message.includes("Area")) {
    return "Der Area-Kontext konnte nicht bestätigt werden.";
  }

  if (message.includes("Ingredient")) {
    return "Die Zutat wurde im aktuellen User-Scope nicht gefunden.";
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

function recipeIngredientPayload(
  ingredient: RealDataRecipeIngredient,
): NutritionIngredientActionPayload {
  return {
    id: ingredient.id,
    name: ingredient.name,
    note: ingredient.note,
    position: ingredient.position,
    quantity: ingredient.quantity,
    recipeId: ingredient.recipeId,
    unit: ingredient.unit,
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
      message: "Gib gültige Rezeptdaten ein.",
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
    message: "Rezept erstellt.",
    recipeId: result.data.id,
    status: "success",
  };
}

export async function createRecipeFormStateAction(
  _previousState: NutritionActionResult,
  formData: FormData,
): Promise<NutritionActionResult> {
  return createRecipeAction(formData);
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
    tags: formData.has("tags") ? (tagsFromForm(formData) ?? []) : undefined,
    title: optionalFormStringIfPresent(formData, "title"),
  });

  if (!parsed.success) {
    return {
      message: "Gib gültige Rezeptdaten ein.",
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
    message: "Rezept aktualisiert.",
    recipeId: result.data.id,
    status: "success",
  };
}

export async function updateRecipeFormStateAction(
  _previousState: NutritionActionResult,
  formData: FormData,
): Promise<NutritionActionResult> {
  return updateRecipeAction(formData);
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
    message: "Rezept archiviert.",
    recipeId: result.data.id,
    status: "success",
  };
}

export async function archiveRecipeFormStateAction(
  _previousState: NutritionActionResult,
  formData: FormData,
): Promise<NutritionActionResult> {
  return archiveRecipeAction(formData);
}

export async function createRecipeIngredientAction(
  formData: FormData,
): Promise<NutritionActionResult> {
  const context = await getAuthenticatedNutritionContext();

  if (!context.ok) return context.result;

  const parsed = recipeIngredientCreateInputSchema.safeParse({
    name: formString(formData, "name"),
    note: nullableFormString(formData, "note"),
    position: optionalFormNumber(formData, "position"),
    quantity: nullableFormNumber(formData, "quantity"),
    recipeId: formString(formData, "recipeId"),
    unit: nullableFormString(formData, "unit"),
  });

  if (!parsed.success) {
    return {
      message: "Gib gültige Zutaten-Daten ein.",
      status: "error",
    };
  }

  const repository = createSupabaseNutritionRepository(context.auth.client);
  const result = await repository.createRecipeIngredient({
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
    ingredient: recipeIngredientPayload(result.data),
    ingredientId: result.data.id,
    message: "Zutat erstellt.",
    recipeId: result.data.recipeId,
    status: "success",
  };
}

export async function createRecipeIngredientFormStateAction(
  _previousState: NutritionActionResult,
  formData: FormData,
): Promise<NutritionActionResult> {
  return createRecipeIngredientAction(formData);
}

export async function updateRecipeIngredientAction(
  formData: FormData,
): Promise<NutritionActionResult> {
  const context = await getAuthenticatedNutritionContext();

  if (!context.ok) return context.result;

  const parsed = recipeIngredientUpdateInputSchema.safeParse({
    ingredientId: formString(formData, "ingredientId"),
    name: formStringIfPresent(formData, "name"),
    note: nullableFormStringIfPresent(formData, "note"),
    position: optionalFormNumber(formData, "position"),
    quantity: nullableFormNumberIfPresent(formData, "quantity"),
    recipeId: optionalFormStringIfPresent(formData, "recipeId"),
    unit: nullableFormStringIfPresent(formData, "unit"),
  });

  if (!parsed.success) {
    return {
      message: "Gib gültige Zutaten-Daten ein.",
      status: "error",
    };
  }

  const repository = createSupabaseNutritionRepository(context.auth.client);
  const result = await repository.updateRecipeIngredient({
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
    ingredient: recipeIngredientPayload(result.data),
    ingredientId: result.data.id,
    message: "Zutat aktualisiert.",
    recipeId: result.data.recipeId,
    status: "success",
  };
}

export async function updateRecipeIngredientFormStateAction(
  _previousState: NutritionActionResult,
  formData: FormData,
): Promise<NutritionActionResult> {
  return updateRecipeIngredientAction(formData);
}

export async function deleteRecipeIngredientAction(
  formData: FormData,
): Promise<NutritionActionResult> {
  const context = await getAuthenticatedNutritionContext();

  if (!context.ok) return context.result;

  const parsed = recipeIngredientDeleteInputSchema.safeParse({
    ingredientId: formString(formData, "ingredientId"),
    recipeId: optionalFormStringIfPresent(formData, "recipeId"),
  });

  if (!parsed.success) {
    return {
      message: "Die Zutat konnte nicht validiert werden.",
      status: "error",
    };
  }

  const repository = createSupabaseNutritionRepository(context.auth.client);
  const result = await repository.deleteRecipeIngredient({
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
    ingredient: recipeIngredientPayload(result.data),
    ingredientId: result.data.id,
    message: "Zutat entfernt.",
    recipeId: result.data.recipeId,
    status: "success",
  };
}

export async function deleteRecipeIngredientFormStateAction(
  _previousState: NutritionActionResult,
  formData: FormData,
): Promise<NutritionActionResult> {
  return deleteRecipeIngredientAction(formData);
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
    requestId: formString(formData, "requestId"),
    servings: optionalFormNumber(formData, "servings"),
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

export async function createMealFormStateAction(
  _previousState: NutritionActionResult,
  formData: FormData,
): Promise<NutritionActionResult> {
  return createMealAction(formData);
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
    notes: nullableFormStringIfPresent(formData, "notes"),
    plannedAt: nullableFormStringIfPresent(formData, "plannedAt"),
    recipeId: nullableFormStringIfPresent(formData, "recipeId"),
    servings: nullableFormNumberIfPresent(formData, "servings"),
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

export async function updateMealFormStateAction(
  _previousState: NutritionActionResult,
  formData: FormData,
): Promise<NutritionActionResult> {
  return updateMealAction(formData);
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

  const completedAt = parsed.data.completedAt ?? new Date().toISOString();
  const linkedResult = await createSupabaseScheduleSourceRepository(
    context.auth.client,
  ).completeLinkedMeal(parsed.data.mealId, completedAt);
  const result =
    linkedResult.error || !linkedResult.data
      ? { ok: false as const }
      : { data: { id: linkedResult.data.id }, ok: true as const };

  if (!result.ok) {
    return {
      message: repositoryFailureMessage(
        linkedResult.error?.message ?? "complete meal",
      ),
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

export async function completeMealFormStateAction(
  _previousState: NutritionActionResult,
  formData: FormData,
): Promise<NutritionActionResult> {
  return completeMealAction(formData);
}

export async function applyNutritionPlanAction(
  input: unknown,
): Promise<NutritionActionResult> {
  const context = await getAuthenticatedNutritionContext();
  if (!context.ok) return context.result;
  const parsed = nutritionPlanInputSchema.safeParse(input);
  if (!parsed.success)
    return { status: "error", message: "Die Planänderung ist ungültig." };
  const { error } = await context.auth.client.rpc("apply_nutrition_plan", {
    p_operations: parsed.data,
  });
  if (error)
    return {
      status: "error",
      message: error.message.includes("occupied slot")
        ? "Dieser Platz ist bereits belegt. Keine Mahlzeit wurde verändert."
        : error.message.includes("stale")
          ? "Der Plan wurde inzwischen geändert. Bitte neu laden."
          : "Die Planänderung konnte nicht gespeichert werden. Bitte neu laden und erneut versuchen.",
    };
  revalidateNutritionRoutes();
  return { status: "success", message: "Essensplan gespeichert." };
}

export async function scheduleNutritionMealAction(
  _previous: NutritionActionResult,
  form: FormData,
): Promise<NutritionActionResult> {
  const context = await getAuthenticatedNutritionContext();
  if (!context.ok) return context.result;
  const date = formString(form, "plannedDate");
  const parsed = scheduleSourceInputSchema.safeParse({
    sourceType: "meal",
    sourceId: formString(form, "sourceId"),
    plannedDate: date,
    scheduledStartAt: runningStartInstant(
      date,
      formString(form, "scheduledTime"),
    ),
    durationMinutes: formString(form, "durationMinutes"),
  });
  if (!parsed.success)
    return {
      status: "error",
      message: "Bitte ein gültiges Datum, eine Uhrzeit und Dauer angeben.",
    };
  const result = await createSupabaseScheduleSourceRepository(
    context.auth.client,
  ).schedule(parsed.data);
  if (result.error)
    return {
      status: "error",
      message: "Die Zeitplanung konnte nicht gespeichert werden.",
    };
  revalidateNutritionRoutes();
  return { status: "success", message: "Mahlzeit im Kalender geplant." };
}

import {
  mealTypes,
  type Meal,
  type MealType,
  type NutritionEstimate,
  type Recipe,
  type RecipeIngredient,
} from "../../domain";
import type {
  MealCompleteInput,
  MealCreateInput,
  MealUpdateInput,
  RecipeIngredientCreateInput,
  RecipeIngredientUpdateInput,
  RecipeCreateInput,
  RecipeUpdateInput,
} from "../../schemas";
import type {
  MealInsert,
  MealRow,
  MealUpdate,
  RecipeIngredientInsert,
  RecipeIngredientRow,
  RecipeIngredientUpdate,
  RecipeInsert,
  RecipeRow,
  RecipeUpdate,
} from "../row-types";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function mapTags(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];

  return value.filter((tag): tag is string => typeof tag === "string");
}

function mapNutritionEstimate(value: unknown): NutritionEstimate | null {
  return isPlainObject(value) ? value : null;
}

function mapNutritionEstimateToJson(
  value: NutritionEstimate | undefined,
): RecipeInsert["nutrition_estimate"] | undefined {
  return value as RecipeInsert["nutrition_estimate"] | undefined;
}

function mapTagsToJson(
  value: readonly string[] | undefined,
): RecipeInsert["tags"] | undefined {
  return value as RecipeInsert["tags"] | undefined;
}

function isMealType(value: string): value is MealType {
  return mealTypes.includes(value as MealType);
}

function mapMealType(value: string): MealType {
  if (!isMealType(value)) {
    throw new Error("Unsupported meal type.");
  }

  return value;
}

function mapNullableNumeric(value: number | string | null): number | null {
  if (value === null) return null;

  const numeric = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numeric)) {
    throw new Error("Unsupported numeric value.");
  }

  return numeric;
}

export function mapRecipeRowToDomain(row: RecipeRow): Recipe {
  return {
    areaId: row.area_id,
    createdAt: row.created_at,
    id: row.id,
    instructions: row.instructions,
    isArchived: row.is_archived,
    nutritionEstimate: mapNutritionEstimate(row.nutrition_estimate),
    prepMinutes: row.prep_minutes,
    profileId: row.user_id,
    servings: row.servings,
    source: row.source,
    summary: row.summary,
    tags: mapTags(row.tags),
    title: row.title,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

export function mapMealRowToDomain(row: MealRow): Meal {
  return {
    completedAt: row.completed_at,
    createdAt: row.created_at,
    date: row.date,
    id: row.id,
    mealType: mapMealType(row.meal_type),
    notes: row.notes,
    plannedAt: row.planned_at,
    profileId: row.user_id,
    recipeId: row.recipe_id,
    servings: mapNullableNumeric(row.servings) ?? 1,
    title: row.title,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

export function mapRecipeIngredientRowToDomain(
  row: RecipeIngredientRow,
): RecipeIngredient {
  return {
    createdAt: row.created_at,
    id: row.id,
    name: row.name,
    note: row.note,
    position: row.position,
    profileId: row.user_id,
    quantity: mapNullableNumeric(row.quantity),
    recipeId: row.recipe_id,
    unit: row.unit,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

export function mapRecipeCreateInputToInsert(
  input: RecipeCreateInput,
  userId: string,
): RecipeInsert {
  const insert: RecipeInsert = {
    title: input.title,
    user_id: userId,
  };

  if (input.areaId !== undefined) insert.area_id = input.areaId;
  if (input.instructions !== undefined) insert.instructions = input.instructions;
  if (input.nutritionEstimate !== undefined) {
    insert.nutrition_estimate = mapNutritionEstimateToJson(
      input.nutritionEstimate,
    );
  }
  if (input.prepMinutes !== undefined) insert.prep_minutes = input.prepMinutes;
  if (input.servings !== undefined) insert.servings = input.servings;
  if (input.source !== undefined) insert.source = input.source;
  if (input.summary !== undefined) insert.summary = input.summary;
  if (input.tags !== undefined) insert.tags = mapTagsToJson(input.tags);

  return insert;
}

export function mapRecipeIngredientCreateInputToInsert(
  input: RecipeIngredientCreateInput,
  userId: string,
): RecipeIngredientInsert {
  const insert: RecipeIngredientInsert = {
    name: input.name,
    recipe_id: input.recipeId,
    user_id: userId,
  };

  if (input.note !== undefined) insert.note = input.note;
  if (input.position !== undefined) insert.position = input.position;
  if (input.quantity !== undefined) insert.quantity = input.quantity;
  if (input.unit !== undefined) insert.unit = input.unit;

  return insert;
}

export function mapRecipeUpdateInputToPatch(
  input: RecipeUpdateInput,
): RecipeUpdate {
  const patch: RecipeUpdate = {};

  if (input.areaId !== undefined) patch.area_id = input.areaId;
  if (input.instructions !== undefined) patch.instructions = input.instructions;
  if (input.nutritionEstimate !== undefined) {
    patch.nutrition_estimate = mapNutritionEstimateToJson(
      input.nutritionEstimate,
    );
  }
  if (input.prepMinutes !== undefined) patch.prep_minutes = input.prepMinutes;
  if (input.servings !== undefined) patch.servings = input.servings;
  if (input.source !== undefined) patch.source = input.source;
  if (input.summary !== undefined) patch.summary = input.summary;
  if (input.tags !== undefined) patch.tags = mapTagsToJson(input.tags);
  if (input.title !== undefined) patch.title = input.title;

  return patch;
}

export function mapRecipeIngredientUpdateInputToPatch(
  input: RecipeIngredientUpdateInput,
): RecipeIngredientUpdate {
  const patch: RecipeIngredientUpdate = {};

  if (input.name !== undefined) patch.name = input.name;
  if (input.note !== undefined) patch.note = input.note;
  if (input.position !== undefined) patch.position = input.position;
  if (input.quantity !== undefined) patch.quantity = input.quantity;
  if (input.unit !== undefined) patch.unit = input.unit;

  return patch;
}

export function mapMealCreateInputToInsert(
  input: MealCreateInput,
  userId: string,
): MealInsert {
  const insert: MealInsert = {
    date: input.date,
    id: input.requestId,
    meal_type: input.mealType,
    title: input.title,
    user_id: userId,
  };

  if (input.completedAt !== undefined) insert.completed_at = input.completedAt;
  if (input.notes !== undefined) insert.notes = input.notes;
  if (input.plannedAt !== undefined) insert.planned_at = input.plannedAt;
  if (input.recipeId !== undefined) insert.recipe_id = input.recipeId;
  if (input.servings !== undefined) insert.servings = input.servings;

  return insert;
}

export function mapMealUpdateInputToPatch(input: MealUpdateInput): MealUpdate {
  const patch: MealUpdate = {};

  if (input.completedAt !== undefined) patch.completed_at = input.completedAt;
  if (input.date !== undefined) patch.date = input.date;
  if (input.mealType !== undefined) patch.meal_type = input.mealType;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.plannedAt !== undefined) patch.planned_at = input.plannedAt;
  if (input.recipeId !== undefined) patch.recipe_id = input.recipeId;
  if (input.servings !== undefined) patch.servings = input.servings;
  if (input.title !== undefined) patch.title = input.title;

  return patch;
}

export function mapMealCompleteInputToPatch(
  input: MealCompleteInput,
): MealUpdate {
  return {
    completed_at: input.completedAt ?? new Date().toISOString(),
  };
}

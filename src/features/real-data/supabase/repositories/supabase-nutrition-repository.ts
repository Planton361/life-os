import type { Meal, Recipe, RecipeIngredient } from "../../domain";
import type { NutritionRepository } from "../../repositories";
import type {
  RepositoryListResult,
  RepositoryResult,
} from "../../repositories/repository-result";
import {
  mapMealCompleteInputToPatch,
  mapMealCreateInputToInsert,
  mapMealRowToDomain,
  mapMealUpdateInputToPatch,
  mapRecipeIngredientCreateInputToInsert,
  mapRecipeIngredientRowToDomain,
  mapRecipeIngredientUpdateInputToPatch,
  mapRecipeCreateInputToInsert,
  mapRecipeRowToDomain,
  mapRecipeUpdateInputToPatch,
} from "../mappers";
import { realDataTableNames } from "../database.types";
import type {
  SupabaseClientLike,
  SupabaseQueryResult,
} from "../database.types";
import type {
  MealRow,
  MealUpdate,
  RecipeIngredientRow,
  RecipeIngredientUpdate,
  RecipeRow,
  RecipeUpdate,
} from "../row-types";

type RepositoryFailure = RepositoryResult<never>;

function profileScopeFailure(
  userId: string,
  profileId: string,
): RepositoryFailure | null {
  if (userId === profileId) return null;

  return {
    error: {
      code: "forbidden",
      message: "The requested profile is outside the current user scope.",
    },
    ok: false,
  };
}

function adapterFailure(operation: string): RepositoryFailure {
  return {
    error: {
      code: "adapter_unavailable",
      message: `Unable to ${operation}.`,
    },
    ok: false,
  };
}

function notFoundFailure(entity: string): RepositoryFailure {
  return {
    error: {
      code: "not_found",
      message: `${entity} was not found in the current user scope.`,
    },
    ok: false,
  };
}

function validationFailure(message: string): RepositoryFailure {
  return {
    error: {
      code: "validation_error",
      message,
    },
    ok: false,
  };
}

function rangeLengthInDays(startDate: string, endDate: string) {
  const start = Date.parse(`${startDate}T00:00:00.000Z`);
  const end = Date.parse(`${endDate}T00:00:00.000Z`);

  return Math.floor((end - start) / 86_400_000) + 1;
}

function validateMealRange(
  startDate: string,
  endDate: string,
): RepositoryFailure | null {
  if (Date.parse(endDate) < Date.parse(startDate)) {
    return validationFailure("Expected endDate to be on or after startDate.");
  }

  if (rangeLengthInDays(startDate, endDate) > 31) {
    return validationFailure("Expected a meal date range of at most 31 days.");
  }

  return null;
}

async function verifyAreaOwnership(
  client: SupabaseClientLike,
  userId: string,
  areaId: string | null | undefined,
): Promise<boolean> {
  if (areaId === undefined || areaId === null) return true;

  const result = (await client
    .from("areas")
    .select("id")
    .eq("user_id", userId)
    .eq("id", areaId)
    .is("archived_at", null)
    .maybeSingle()) as SupabaseQueryResult<{ id: string }>;

  return Boolean(!result.error && result.data);
}

async function verifyActiveRecipeOwnership(
  client: SupabaseClientLike,
  userId: string,
  recipeId: string | null | undefined,
): Promise<boolean> {
  if (recipeId === undefined || recipeId === null) return true;

  const result = (await client
    .from(realDataTableNames.recipes)
    .select("id")
    .eq("user_id", userId)
    .eq("id", recipeId)
    .eq("is_archived", false)
    .maybeSingle()) as SupabaseQueryResult<{ id: string }>;

  return Boolean(!result.error && result.data);
}

async function verifyIngredientOwnership(
  client: SupabaseClientLike,
  userId: string,
  ingredientId: string,
  recipeId: string | null | undefined,
): Promise<boolean> {
  let query = client
    .from(realDataTableNames.recipeIngredients)
    .select("id, recipe_id")
    .eq("user_id", userId)
    .eq("id", ingredientId);

  if (recipeId !== undefined && recipeId !== null) {
    query = query.eq("recipe_id", recipeId);
  }

  const result = (await query.maybeSingle()) as SupabaseQueryResult<{
    id: string;
    recipe_id: string;
  }>;

  if (result.error || !result.data) return false;

  return verifyActiveRecipeOwnership(client, userId, result.data.recipe_id);
}

function mapRecipeRows(
  rows: readonly RecipeRow[],
): RepositoryListResult<Recipe> {
  return {
    data: rows.map(mapRecipeRowToDomain),
    ok: true,
  };
}

function mapRecipeIngredientRows(
  rows: readonly RecipeIngredientRow[],
): RepositoryListResult<RecipeIngredient> {
  try {
    return {
      data: rows.map(mapRecipeIngredientRowToDomain),
      ok: true,
    };
  } catch {
    return adapterFailure("map recipe ingredients");
  }
}

function mapMealRows(rows: readonly MealRow[]): RepositoryListResult<Meal> {
  try {
    return {
      data: rows.map(mapMealRowToDomain),
      ok: true,
    };
  } catch {
    return adapterFailure("map meals");
  }
}

async function loadRecipeIngredientById(
  client: SupabaseClientLike,
  userId: string,
  ingredientId: string,
): Promise<RepositoryResult<RecipeIngredient>> {
  const result = (await client
    .from(realDataTableNames.recipeIngredients)
    .select("*")
    .eq("user_id", userId)
    .eq("id", ingredientId)
    .maybeSingle()) as SupabaseQueryResult<RecipeIngredientRow>;

  if (result.error) return adapterFailure("load recipe ingredient");
  if (!result.data) return notFoundFailure("Ingredient");

  try {
    return {
      data: mapRecipeIngredientRowToDomain(result.data),
      ok: true,
    };
  } catch {
    return adapterFailure("map recipe ingredient");
  }
}

async function loadRecipeById(
  client: SupabaseClientLike,
  userId: string,
  recipeId: string,
): Promise<RepositoryResult<Recipe>> {
  const result = (await client
    .from(realDataTableNames.recipes)
    .select("*")
    .eq("user_id", userId)
    .eq("id", recipeId)
    .maybeSingle()) as SupabaseQueryResult<RecipeRow>;

  if (result.error) return adapterFailure("load recipe");
  if (!result.data) return notFoundFailure("Recipe");

  return {
    data: mapRecipeRowToDomain(result.data),
    ok: true,
  };
}

async function loadMealById(
  client: SupabaseClientLike,
  userId: string,
  mealId: string,
): Promise<RepositoryResult<Meal>> {
  const result = (await client
    .from(realDataTableNames.meals)
    .select("*")
    .eq("user_id", userId)
    .eq("id", mealId)
    .maybeSingle()) as SupabaseQueryResult<MealRow>;

  if (result.error) return adapterFailure("load meal");
  if (!result.data) return notFoundFailure("Meal");

  try {
    return {
      data: mapMealRowToDomain(result.data),
      ok: true,
    };
  } catch {
    return adapterFailure("map meal");
  }
}

async function updateRecipeById(
  client: SupabaseClientLike,
  userId: string,
  recipeId: string,
  patch: RecipeUpdate,
  operation: string,
): Promise<RepositoryResult<Recipe>> {
  if (Object.keys(patch).length === 0) {
    return loadRecipeById(client, userId, recipeId);
  }

  const result = (await client
    .from(realDataTableNames.recipes)
    .update(patch)
    .eq("user_id", userId)
    .eq("id", recipeId)
    .select("*")
    .single()) as SupabaseQueryResult<RecipeRow>;

  if (result.error) return adapterFailure(operation);
  if (!result.data) return notFoundFailure("Recipe");

  return {
    data: mapRecipeRowToDomain(result.data),
    ok: true,
  };
}

async function updateRecipeIngredientById(
  client: SupabaseClientLike,
  userId: string,
  ingredientId: string,
  patch: RecipeIngredientUpdate,
  operation: string,
): Promise<RepositoryResult<RecipeIngredient>> {
  if (Object.keys(patch).length === 0) {
    return loadRecipeIngredientById(client, userId, ingredientId);
  }

  const result = (await client
    .from(realDataTableNames.recipeIngredients)
    .update(patch)
    .eq("user_id", userId)
    .eq("id", ingredientId)
    .select("*")
    .single()) as SupabaseQueryResult<RecipeIngredientRow>;

  if (result.error) return adapterFailure(operation);
  if (!result.data) return notFoundFailure("Ingredient");

  try {
    return {
      data: mapRecipeIngredientRowToDomain(result.data),
      ok: true,
    };
  } catch {
    return adapterFailure("map recipe ingredient");
  }
}

async function updateMealById(
  client: SupabaseClientLike,
  userId: string,
  mealId: string,
  patch: MealUpdate,
  operation: string,
): Promise<RepositoryResult<Meal>> {
  if (Object.keys(patch).length === 0) {
    return loadMealById(client, userId, mealId);
  }

  const result = (await client
    .from(realDataTableNames.meals)
    .update(patch)
    .eq("user_id", userId)
    .eq("id", mealId)
    .select("*")
    .single()) as SupabaseQueryResult<MealRow>;

  if (result.error) return adapterFailure(operation);
  if (!result.data) return notFoundFailure("Meal");

  try {
    return {
      data: mapMealRowToDomain(result.data),
      ok: true,
    };
  } catch {
    return adapterFailure("map meal");
  }
}

export function createSupabaseNutritionRepository(
  client: SupabaseClientLike,
): NutritionRepository {
  return {
    async archiveRecipe(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

      return updateRecipeById(
        client,
        input.userId,
        input.recipeId,
        { is_archived: true },
        "archive recipe",
      );
    },

    async completeMeal(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

      return updateMealById(
        client,
        input.userId,
        input.mealId,
        mapMealCompleteInputToPatch(input),
        "complete meal",
      );
    },

    async createMeal(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

      const recipeOwned = await verifyActiveRecipeOwnership(
        client,
        input.userId,
        input.recipeId,
      );
      if (!recipeOwned) return notFoundFailure("Recipe");

      const result = (await client
        .from(realDataTableNames.meals)
        .insert(mapMealCreateInputToInsert(input, input.userId))
        .select("*")
        .single()) as SupabaseQueryResult<MealRow>;

      if (result.error) return adapterFailure("create meal");
      if (!result.data) return notFoundFailure("Meal");

      try {
        return {
          data: mapMealRowToDomain(result.data),
          ok: true,
        };
      } catch {
        return adapterFailure("map meal");
      }
    },

    async createRecipe(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

      const areaOwned = await verifyAreaOwnership(
        client,
        input.userId,
        input.areaId,
      );
      if (!areaOwned) return notFoundFailure("Area");

      const result = (await client
        .from(realDataTableNames.recipes)
        .insert(mapRecipeCreateInputToInsert(input, input.userId))
        .select("*")
        .single()) as SupabaseQueryResult<RecipeRow>;

      if (result.error) return adapterFailure("create recipe");
      if (!result.data) return notFoundFailure("Recipe");

      return {
        data: mapRecipeRowToDomain(result.data),
        ok: true,
      };
    },

    async createRecipeIngredient(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

      const recipeOwned = await verifyActiveRecipeOwnership(
        client,
        input.userId,
        input.recipeId,
      );
      if (!recipeOwned) return notFoundFailure("Recipe");

      const result = (await client
        .from(realDataTableNames.recipeIngredients)
        .insert(mapRecipeIngredientCreateInputToInsert(input, input.userId))
        .select("*")
        .single()) as SupabaseQueryResult<RecipeIngredientRow>;

      if (result.error) return adapterFailure("create recipe ingredient");
      if (!result.data) return notFoundFailure("Ingredient");

      try {
        return {
          data: mapRecipeIngredientRowToDomain(result.data),
          ok: true,
        };
      } catch {
        return adapterFailure("map recipe ingredient");
      }
    },

    async deleteRecipeIngredient(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

      const ingredientOwned = await verifyIngredientOwnership(
        client,
        input.userId,
        input.ingredientId,
        input.recipeId,
      );
      if (!ingredientOwned) return notFoundFailure("Ingredient");

      const result = (await client
        .from(realDataTableNames.recipeIngredients)
        .delete()
        .eq("user_id", input.userId)
        .eq("id", input.ingredientId)
        .select("*")
        .single()) as SupabaseQueryResult<RecipeIngredientRow>;

      if (result.error) return adapterFailure("delete recipe ingredient");
      if (!result.data) return notFoundFailure("Ingredient");

      try {
        return {
          data: mapRecipeIngredientRowToDomain(result.data),
          ok: true,
        };
      } catch {
        return adapterFailure("map recipe ingredient");
      }
    },

    async getActiveRecipesByUser(userId, profileId) {
      const scopeFailure = profileScopeFailure(userId, profileId);
      if (scopeFailure) return scopeFailure;

      const result = (await client
        .from(realDataTableNames.recipes)
        .select("*")
        .eq("user_id", userId)
        .eq("is_archived", false)
        .order("updated_at", { ascending: false })) as SupabaseQueryResult<
        readonly RecipeRow[]
      >;

      if (result.error) return adapterFailure("load active recipes");

      return mapRecipeRows(result.data ?? []);
    },

    async getRecipeIngredients(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

      const recipeOwned = await verifyActiveRecipeOwnership(
        client,
        input.userId,
        input.recipeId,
      );
      if (!recipeOwned) return notFoundFailure("Recipe");

      const result = (await client
        .from(realDataTableNames.recipeIngredients)
        .select("*")
        .eq("user_id", input.userId)
        .eq("recipe_id", input.recipeId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true })) as SupabaseQueryResult<
        readonly RecipeIngredientRow[]
      >;

      if (result.error) return adapterFailure("load recipe ingredients");

      return mapRecipeIngredientRows(result.data ?? []);
    },

    async getMealsByUserAndDateRange(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

      const rangeFailure = validateMealRange(input.startDate, input.endDate);
      if (rangeFailure) return rangeFailure;

      const result = (await client
        .from(realDataTableNames.meals)
        .select("*")
        .eq("user_id", input.userId)
        .gte("date", input.startDate)
        .lte("date", input.endDate)
        .order("date", { ascending: true })
        .order("planned_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true })) as SupabaseQueryResult<
        readonly MealRow[]
      >;

      if (result.error) return adapterFailure("load meals");

      return mapMealRows(result.data ?? []);
    },

    async getRecipesByUser(userId, profileId) {
      const scopeFailure = profileScopeFailure(userId, profileId);
      if (scopeFailure) return scopeFailure;

      const result = (await client
        .from(realDataTableNames.recipes)
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })) as SupabaseQueryResult<
        readonly RecipeRow[]
      >;

      if (result.error) return adapterFailure("load recipes");

      return mapRecipeRows(result.data ?? []);
    },

    async updateMeal(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

      const recipeOwned = await verifyActiveRecipeOwnership(
        client,
        input.userId,
        input.recipeId,
      );
      if (!recipeOwned) return notFoundFailure("Recipe");

      return updateMealById(
        client,
        input.userId,
        input.mealId,
        mapMealUpdateInputToPatch(input),
        "update meal",
      );
    },

    async updateRecipe(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

      const areaOwned = await verifyAreaOwnership(
        client,
        input.userId,
        input.areaId,
      );
      if (!areaOwned) return notFoundFailure("Area");

      return updateRecipeById(
        client,
        input.userId,
        input.recipeId,
        mapRecipeUpdateInputToPatch(input),
        "update recipe",
      );
    },

    async updateRecipeIngredient(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

      const ingredientOwned = await verifyIngredientOwnership(
        client,
        input.userId,
        input.ingredientId,
        input.recipeId,
      );
      if (!ingredientOwned) return notFoundFailure("Ingredient");

      return updateRecipeIngredientById(
        client,
        input.userId,
        input.ingredientId,
        mapRecipeIngredientUpdateInputToPatch(input),
        "update recipe ingredient",
      );
    },
  };
}

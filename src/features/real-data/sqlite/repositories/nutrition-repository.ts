import "server-only";
import type { NutritionRepository } from "../../repositories";
import type { RepositoryResult } from "../../repositories/repository-result";
import { mealDateRangeInputSchema } from "../../schemas/nutrition.schema";
import {
  mapMealRowToDomain,
  mapRecipeIngredientRowToDomain,
  mapRecipeRowToDomain,
} from "../../supabase/mappers/nutrition.mapper";
import type {
  MealRow,
  RecipeIngredientRow,
  RecipeRow,
} from "../../supabase/row-types";
import { decimal, decimalFromNumber, safeNumber, uuid } from "../codecs";
import { requireOwnerContext, type OwnerContext } from "../owner-context";
import type { SqliteRuntime } from "../runtime";
import {
  applyNutritionPlan,
  nutritionCommand,
  row,
  validate,
  type StoredRow,
} from "../commands/nutrition-commands";

export function numericProjection(row: StoredRow): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      typeof value === "bigint" ? safeNumber(value) : value,
    ]),
  );
}
export const mealProjection = (value: StoredRow) =>
  mapMealRowToDomain(numericProjection(value) as MealRow);
// Keep arbitrary PostgreSQL numeric available through an exact native DTO.
// The legacy product DTO is only emitted when its Number conversion is safe.
export type ExactRecipeIngredient = Omit<
  ReturnType<typeof mapRecipeIngredientRowToDomain>,
  "quantity"
> & { quantity: string | null };
export function exactIngredientProjection(
  value: StoredRow,
): ExactRecipeIngredient {
  return {
    ...mapRecipeIngredientRowToDomain({
      ...numericProjection(value),
      quantity: null,
    } as RecipeIngredientRow),
    quantity: value.quantity as string | null,
  };
}
export function ingredientProjection(value: StoredRow) {
  const amount = value.quantity as string | null;
  if (amount !== null) {
    const number = Number(amount);
    if (
      !Number.isFinite(number) ||
      (Number.isInteger(number) && !Number.isSafeInteger(number)) ||
      decimalFromNumber(number) !== decimal(amount)
    )
      throw new Error("UNSAFE_DECIMAL_PROJECTION");
  }
  return mapRecipeIngredientRowToDomain(
    numericProjection(value) as RecipeIngredientRow,
  );
}
export const recipeProjection = (value: StoredRow) =>
  mapRecipeRowToDomain({
    ...numericProjection(value),
    is_archived: Boolean(value.is_archived),
    tags: JSON.parse(value.tags as string),
    nutrition_estimate: value.nutrition_estimate
      ? JSON.parse(value.nutrition_estimate as string)
      : null,
  } as RecipeRow);
const fail = (
  code: "forbidden" | "adapter_unavailable" = "adapter_unavailable",
): RepositoryResult<never> => ({
  ok: false,
  error: {
    code,
    message: "Nutrition operation rejected in the issued owner scope.",
  },
});

export function createSqliteNutritionRepository(
  store: SqliteRuntime,
  context: OwnerContext,
): NutritionRepository & {
  createExactRecipeIngredient(input: {
    userId: string;
    profileId: string;
    recipeId: string;
    name: string;
    quantity?: string | null;
    unit?: string | null;
    note?: string | null;
    position?: number;
  }): Promise<RepositoryResult<ExactRecipeIngredient>>;
  updateExactRecipeIngredient(input: {
    userId: string;
    profileId: string;
    ingredientId: string;
    recipeId?: string;
    name?: string;
    quantity?: string | null;
    unit?: string | null;
    note?: string | null;
    position?: number;
  }): Promise<RepositoryResult<ExactRecipeIngredient>>;
  getExactRecipeIngredients(input: {
    userId: string;
    profileId: string;
    recipeId: string;
  }): Promise<RepositoryResult<ExactRecipeIngredient[]>>;
  applyNutritionPlan(
    userId: string,
    operations: unknown,
  ): Promise<RepositoryResult<null>>;
} {
  const owner = requireOwnerContext(context);
  const scoped = (user: string, profile = user) =>
    user === owner && profile === owner;
  function write<T>(
    input: { userId: string; profileId: string },
    op: string,
    project: (row: StoredRow) => T,
  ): RepositoryResult<T> {
    if (!scoped(input.userId, input.profileId)) return fail("forbidden");
    try {
      return store.command(
        context,
        op === "meal.complete" ? "source.complete" : "nutrition.write",
        (db) => ({
          ok: true as const,
          data: project(nutritionCommand(db, owner, op, input)!),
        }),
      );
    } catch {
      return fail();
    }
  }
  function recipes(user: string, profile: string, active: boolean) {
    if (!scoped(user, profile)) return fail("forbidden");
    try {
      return store.read(context, (db) => ({
        ok: true as const,
        data: (
          db
            .prepare(
              `SELECT * FROM recipes WHERE user_id=? ${active ? "AND is_archived=0" : ""} ORDER BY updated_at DESC,id`,
            )
            .all(owner) as StoredRow[]
        ).map(recipeProjection),
      }));
    } catch {
      return fail();
    }
  }
  return {
    async createRecipe(input) {
      return write(input, "recipe.create", recipeProjection);
    },
    async updateRecipe(input) {
      return write(input, "recipe.update", recipeProjection);
    },
    async archiveRecipe(input) {
      return write(input, "recipe.archive", recipeProjection);
    },
    async createExactRecipeIngredient(input) {
      return write(input, "ingredient.create", exactIngredientProjection);
    },
    async updateExactRecipeIngredient(input) {
      return write(input, "ingredient.update", exactIngredientProjection);
    },
    async getExactRecipeIngredients(input) {
      if (!scoped(input.userId, input.profileId)) return fail("forbidden");
      try {
        return store.read(context, (db) => {
          row(db, "recipes", owner, input.recipeId);
          return {
            ok: true as const,
            data: (
              db
                .prepare(
                  "SELECT * FROM recipe_ingredients WHERE user_id=? AND recipe_id=? ORDER BY position,created_at,id",
                )
                .all(owner, uuid(input.recipeId)) as StoredRow[]
            ).map(exactIngredientProjection),
          };
        });
      } catch {
        return fail();
      }
    },
    async createRecipeIngredient(input) {
      return write(input, "ingredient.create", ingredientProjection);
    },
    async updateRecipeIngredient(input) {
      return write(input, "ingredient.update", ingredientProjection);
    },
    async deleteRecipeIngredient(input) {
      return write(input, "ingredient.delete", ingredientProjection);
    },
    async createMeal(input) {
      return write(input, "meal.create", mealProjection);
    },
    async updateMeal(input) {
      return write(input, "meal.update", mealProjection);
    },
    async completeMeal(input) {
      return write(input, "meal.complete", mealProjection);
    },
    async getRecipesByUser(user, profile) {
      return recipes(user, profile, false);
    },
    async getActiveRecipesByUser(user, profile) {
      return recipes(user, profile, true);
    },
    async getRecipeIngredients(input) {
      if (!scoped(input.userId, input.profileId)) return fail("forbidden");
      try {
        return store.read(context, (db) => {
          // Historical projections retain ingredients of archived recipes.
          row(db, "recipes", owner, input.recipeId);
          return {
            ok: true as const,
            data: (
              db
                .prepare(
                  "SELECT * FROM recipe_ingredients WHERE user_id=? AND recipe_id=? ORDER BY position,created_at,id",
                )
                .all(owner, uuid(input.recipeId)) as StoredRow[]
            ).map(ingredientProjection),
          };
        });
      } catch {
        return fail();
      }
    },
    async getMealsByUserAndDateRange(input) {
      if (!scoped(input.userId, input.profileId)) return fail("forbidden");
      try {
        const range = validate(mealDateRangeInputSchema, input);
        return store.read(context, (db) => ({
          ok: true as const,
          data: (
            db
              .prepare(
                "SELECT * FROM meals WHERE user_id=? AND date>=? AND date<=? ORDER BY date,planned_at IS NULL,planned_at,created_at,id",
              )
              .all(owner, range.startDate, range.endDate) as StoredRow[]
          ).map(mealProjection),
        }));
      } catch {
        return fail();
      }
    },
    async applyNutritionPlan(user, operations) {
      if (!scoped(user)) return fail("forbidden");
      try {
        return store.command(context, "nutrition.plan", (db) => {
          applyNutritionPlan(db, owner, operations);
          return { ok: true as const, data: null };
        });
      } catch {
        return fail();
      }
    },
  };
}

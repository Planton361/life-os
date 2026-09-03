import { describe, expect, it } from "vitest";
import type { Meal, Recipe, RecipeIngredient } from "@/features/real-data";
import { generateGroceryDraft } from "./grocery-generation";

describe("generateGroceryDraft", () => {
  it("scales deterministic ingredient demand by the persisted meal serving count", () => {
    const recipe = {
      id: "recipe-1",
      servings: 2,
      title: "Serving recipe",
    } as Recipe;
    const meal = {
      completedAt: null,
      id: "meal-1",
      recipeId: recipe.id,
      servings: 0.5,
    } as Meal;
    const ingredient = {
      id: "ingredient-1",
      name: "Lentils",
      note: null,
      quantity: 200,
      recipeId: recipe.id,
      unit: "g",
    } as RecipeIngredient;

    const draft = generateGroceryDraft({
      ingredientsByRecipeId: new Map([[recipe.id, [ingredient]]]),
      meals: [meal],
      recipes: [recipe],
    });

    expect(draft.items).toEqual([
      expect.objectContaining({
        name: "Lentils",
        quantity: 50,
        sourceMealIds: [meal.id],
        unit: "g",
      }),
    ]);
  });
});

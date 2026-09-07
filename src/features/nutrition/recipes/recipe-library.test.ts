import { expect, it } from "vitest";
import { filterRecipeList, getRecipeReadiness } from "./recipe-utils";
import type { Recipe } from "../meal-planner/meal-planner-types";
const recipe: Recipe = {
  id: "one",
  title: "Linsen",
  description: "Suppe",
  defaultServings: 2,
  mealTypes: ["lunch"],
  tags: ["vegetarian"],
  ingredients: [
    {
      id: "ingredient",
      name: "Rote Linsen",
      amount: 200,
      unit: "g",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    },
  ],
  instructions: [{ id: "step", order: 1, text: "Kochen" }],
  totals: { calories: 600, protein: 40, carbs: 80, fat: 12 },
  nutritionEstimateAvailable: true,
};
it("uses canonical recipe estimates even when ingredients have no food database macros", () => {
  expect(getRecipeReadiness(recipe)).toBe("ready");
  expect(
    getRecipeReadiness({
      ...recipe,
      nutritionEstimateAvailable: false,
      totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    }),
  ).toBe("needs_macros");
});
it("searches ingredients and respects meal, tag and readiness filters without inventing suggestions", () => {
  expect(
    filterRecipeList([recipe], "rote", "lunch", "vegetarian", "ready"),
  ).toHaveLength(1);
  expect(
    filterRecipeList([recipe], "rote", "breakfast", "all", "all"),
  ).toHaveLength(0);
  expect(
    filterRecipeList([recipe], "missing", "all", "all", "all"),
  ).toHaveLength(0);
});

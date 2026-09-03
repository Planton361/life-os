import type { Meal, Recipe, RecipeIngredient } from "@/features/real-data";

export type GroceryDraftItem = {
  id: string;
  name: string;
  note: string | null;
  quantity: number | null;
  unit: string | null;
  sourceMealIds: readonly string[];
};

export type UnresolvedGroceryMeal = {
  id: string;
  date: string;
  mealType: Meal["mealType"];
  title: string;
  reason: "missing_recipe" | "missing_ingredients";
};

export type GroceryDraftProjection = {
  items: readonly GroceryDraftItem[];
  mealsConsidered: number;
  unresolvedMeals: readonly UnresolvedGroceryMeal[];
};

function normalized(value: string | null) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function aggregationKey(ingredient: RecipeIngredient) {
  return [
    ingredient.name.trim().toLocaleLowerCase("de-DE"),
    normalized(ingredient.unit)?.toLocaleLowerCase("de-DE") ?? "",
    normalized(ingredient.note)?.toLocaleLowerCase("de-DE") ?? "",
  ].join("\u0000");
}

export function generateGroceryDraft(input: {
  ingredientsByRecipeId: ReadonlyMap<string, readonly RecipeIngredient[]>;
  meals: readonly Meal[];
  recipes: readonly Recipe[];
}): GroceryDraftProjection {
  const recipesById = new Map(input.recipes.map((recipe) => [recipe.id, recipe]));
  const items = new Map<string, GroceryDraftItem>();
  const unresolvedMeals: UnresolvedGroceryMeal[] = [];
  const meals = input.meals.filter((meal) => meal.completedAt === null);

  for (const meal of meals) {
    const recipe = meal.recipeId ? recipesById.get(meal.recipeId) : undefined;
    const ingredients = recipe
      ? input.ingredientsByRecipeId.get(recipe.id) ?? []
      : [];

    if (!recipe || ingredients.length === 0) {
      unresolvedMeals.push({
        id: meal.id,
        date: meal.date,
        mealType: meal.mealType,
        title: meal.title,
        reason: recipe ? "missing_ingredients" : "missing_recipe",
      });
      continue;
    }

    const recipeServings = recipe.servings ?? 1;
    const scale = meal.servings / recipeServings;

    for (const ingredient of ingredients) {
      const key = aggregationKey(ingredient);
      const current = items.get(key);
      const quantity = ingredient.quantity === null
        ? null
        : ingredient.quantity * scale;

      if (!current) {
        items.set(key, {
          id: `grocery-draft-${items.size + 1}`,
          name: ingredient.name.trim(),
          note: normalized(ingredient.note),
          quantity,
          unit: normalized(ingredient.unit),
          sourceMealIds: [meal.id],
        });
        continue;
      }

      items.set(key, {
        ...current,
        quantity:
          current.quantity === null || quantity === null
            ? null
            : current.quantity + quantity,
        sourceMealIds: [...new Set([...current.sourceMealIds, meal.id])],
      });
    }
  }

  return {
    items: [...items.values()].sort((left, right) =>
      left.name.localeCompare(right.name, "de-DE"),
    ),
    mealsConsidered: meals.length,
    unresolvedMeals,
  };
}

import type {
  IngredientAdjustment,
  MacroKey,
  MacroStatus,
  MealPlanDay,
  MealPlanWeek,
  MealType,
  NutritionMacroTarget,
  Recipe,
  RecipeFilter,
  RecipeFit,
  RecipeSort,
} from "./meal-planner-types";

export const mealTypes: readonly MealType[] = ["breakfast", "lunch", "dinner"];

export const macroKeys: readonly MacroKey[] = [
  "calories",
  "protein",
  "carbs",
  "fat",
];

export const mealTypeLabels: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

export function getMealTypeMatchScore(recipe: Recipe, mealType: MealType) {
  return recipe.mealTypes.includes(mealType) ? 1 : 0;
}

export function formatMealTypeList(mealTypesForRecipe: readonly MealType[]) {
  return mealTypesForRecipe.map((mealType) => mealTypeLabels[mealType]).join(" / ");
}

export const macroLabels: Record<MacroKey, string> = {
  calories: "Calories",
  protein: "Protein",
  carbs: "Carbs",
  fat: "Fat",
};

export const macroUnits: Record<MacroKey, "kcal" | "g"> = {
  calories: "kcal",
  protein: "g",
  carbs: "g",
  fat: "g",
};

export function emptyTotals(): NutritionMacroTarget {
  return {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  };
}

export function roundMacro(value: number) {
  return Math.round(value * 10) / 10;
}

export function formatMacro(value: number, unit: "kcal" | "g") {
  return `${Math.round(value)} ${unit}`;
}

export function formatDateLabel(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${date}T00:00:00`));
}

export function formatWeekRange(week: MealPlanWeek) {
  const first = week.days[0]?.date ?? week.weekStartsOn;
  const last = week.days.at(-1)?.date ?? week.weekStartsOn;

  return `${formatDateLabel(first)} - ${formatDateLabel(last)}`;
}

export function calculateRecipeTotals(
  recipe: Recipe,
  servings = recipe.defaultServings,
  adjustments: readonly IngredientAdjustment[] = [],
): NutritionMacroTarget {
  const scale = servings / recipe.defaultServings;

  return recipe.ingredients.reduce<NutritionMacroTarget>((totals, ingredient) => {
    const adjustedAmount = adjustments.find(
      (adjustment) => adjustment.ingredientId === ingredient.id,
    )?.amount;
    const effectiveAmount = adjustedAmount ?? ingredient.amount * scale;
    const ingredientScale = ingredient.amount > 0 ? effectiveAmount / ingredient.amount : 0;

    return {
      calories: totals.calories + ingredient.calories * ingredientScale,
      protein: totals.protein + ingredient.protein * ingredientScale,
      carbs: totals.carbs + ingredient.carbs * ingredientScale,
      fat: totals.fat + ingredient.fat * ingredientScale,
    };
  }, emptyTotals());
}

export function recipeById(recipes: readonly Recipe[], recipeId: string) {
  return recipes.find((recipe) => recipe.id === recipeId) ?? null;
}

export function calculateDayTotals(
  day: MealPlanDay,
  recipes: readonly Recipe[],
): NutritionMacroTarget {
  return day.slots.reduce<NutritionMacroTarget>((totals, slot) => {
    if (!slot.plannedMeal) {
      return totals;
    }

    const recipe = recipeById(recipes, slot.plannedMeal.recipeId);

    if (!recipe) {
      return totals;
    }

    const mealTotals = calculateRecipeTotals(
      recipe,
      slot.plannedMeal.servings,
      slot.plannedMeal.ingredientAdjustments,
    );

    return {
      calories: totals.calories + mealTotals.calories,
      protein: totals.protein + mealTotals.protein,
      carbs: totals.carbs + mealTotals.carbs,
      fat: totals.fat + mealTotals.fat,
    };
  }, emptyTotals());
}

export function calculateMacroStatus(
  actual: number,
  target: number,
  macro: MacroKey,
): MacroStatus {
  if (target <= 0) {
    return {
      kind: "open",
      label: "Open",
      detail: `${macroLabels[macro]} target not set`,
      percentage: 0,
    };
  }

  const ratio = actual / target;
  const percentage = Math.min(140, Math.round(ratio * 100));
  const delta = Math.round(Math.abs(target - actual));
  const unit = macroUnits[macro];

  if (ratio > 1.05) {
    return {
      kind: "over",
      label: "Over",
      detail: `${macroLabels[macro]} over: ${formatMacro(delta, unit)} above target`,
      percentage,
    };
  }

  if (ratio >= 0.95) {
    return {
      kind: "on_target",
      label: "On target",
      detail:
        macro === "calories"
          ? "Day balanced after dinner"
          : `${macroLabels[macro]} on target`,
      percentage,
    };
  }

  if (ratio >= 0.85) {
    return {
      kind: "close",
      label: "Close",
      detail: `${macroLabels[macro]} close: ${formatMacro(delta, unit)} remaining`,
      percentage,
    };
  }

  return {
    kind: "open",
    label: "Open",
    detail: `${macroLabels[macro]} open: ${formatMacro(delta, unit)} remaining`,
    percentage,
  };
}

export function statusAccent(status: MacroStatus["kind"]) {
  if (status === "on_target") {
    return "var(--accent-green)" as const;
  }

  if (status === "close") {
    return "var(--accent-yellow)" as const;
  }

  if (status === "over") {
    return "var(--accent-red)" as const;
  }

  return "var(--accent-orange)" as const;
}

export function calculateRecipeFit(
  recipe: Recipe,
  selectedDayTotals: NutritionMacroTarget,
  targets: NutritionMacroTarget,
  selectedMealType: MealType | null = null,
): RecipeFit {
  const recipeTotals = calculateRecipeTotals(recipe);
  const after = {
    calories: selectedDayTotals.calories + recipeTotals.calories,
    protein: selectedDayTotals.protein + recipeTotals.protein,
    carbs: selectedDayTotals.carbs + recipeTotals.carbs,
    fat: selectedDayTotals.fat + recipeTotals.fat,
  };
  const proteinGapBefore = targets.protein - selectedDayTotals.protein;
  const calorieRatioAfter = targets.calories > 0 ? after.calories / targets.calories : 1;
  const proteinRatioAfter = targets.protein > 0 ? after.protein / targets.protein : 1;
  const carbRatioAfter = targets.carbs > 0 ? after.carbs / targets.carbs : 1;
  const fatRatioAfter = targets.fat > 0 ? after.fat / targets.fat : 1;
  const mealTypeMatches = selectedMealType
    ? getMealTypeMatchScore(recipe, selectedMealType) === 1
    : false;
  let score = 0;

  if (mealTypeMatches) {
    score += 4;
  }

  if (proteinGapBefore > 0 && recipeTotals.protein >= Math.min(35, proteinGapBefore)) {
    score += 3;
  }

  if (calorieRatioAfter <= 1.05) {
    score += 2;
  }

  if (proteinRatioAfter >= 0.85) {
    score += 1;
  }

  if (carbRatioAfter > 1.05) {
    score -= 1;
  }

  if (fatRatioAfter > 1.05) {
    score -= 1;
  }

  if (selectedMealType && mealTypeMatches) {
    return {
      label: `${mealTypeLabels[selectedMealType]} match`,
      detail: `Tagged for ${mealTypeLabels[selectedMealType].toLowerCase()} and adds ${Math.round(
        recipeTotals.protein,
      )} g protein`,
      score,
      accent: "var(--accent-orange)",
    };
  }

  if (proteinGapBefore > 25 && recipeTotals.protein >= 30) {
    return {
      label: "Helps protein target",
      detail: `Adds ${Math.round(recipeTotals.protein)} g protein`,
      score,
      accent: "var(--accent-orange)",
    };
  }

  if (calorieRatioAfter <= 1) {
    return {
      label: "Keeps calories in range",
      detail: `${Math.round(targets.calories - after.calories)} kcal room after add`,
      score,
      accent: "var(--accent-green)",
    };
  }

  if (recipeTotals.carbs >= 70) {
    return {
      label: "High carb",
      detail: `${Math.round(recipeTotals.carbs)} g carbs in this recipe`,
      score,
      accent: "var(--accent-yellow)",
    };
  }

  if (selectedMealType && !mealTypeMatches) {
    return {
      label: "Other option",
      detail: `Not tagged for ${mealTypeLabels[
        selectedMealType
      ].toLowerCase()}, but macros remain usable`,
      score,
      accent: "var(--accent-cyan)",
    };
  }

  return {
    label: "Balanced fit",
    detail: "Moderate macro impact",
    score,
    accent: "var(--accent-cyan)",
  };
}

export function filterRecipes(
  recipes: readonly Recipe[],
  filter: RecipeFilter,
  query: string,
) {
  const normalizedQuery = query.trim().toLowerCase();

  return recipes.filter((recipe) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      recipe.title.toLowerCase().includes(normalizedQuery) ||
      recipe.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery)) ||
      recipe.mealTypes.some((mealType) =>
        mealTypeLabels[mealType].toLowerCase().includes(normalizedQuery),
      );

    if (!matchesQuery) {
      return false;
    }

    if (filter === "all") {
      return true;
    }

    return recipe.tags.includes(filter);
  });
}

export function sortRecipes(
  recipes: readonly Recipe[],
  sort: RecipeSort,
  fits: ReadonlyMap<string, RecipeFit>,
  selectedMealType: MealType | null = null,
) {
  return [...recipes].sort((left, right) => {
    if (selectedMealType) {
      const mealTypeMatchDelta =
        getMealTypeMatchScore(right, selectedMealType) -
        getMealTypeMatchScore(left, selectedMealType);

      if (mealTypeMatchDelta !== 0) {
        return mealTypeMatchDelta;
      }
    }

    if (sort === "protein") {
      return right.totals.protein - left.totals.protein;
    }

    if (sort === "calories") {
      return left.totals.calories - right.totals.calories;
    }

    if (sort === "recent") {
      return left.title.localeCompare(right.title);
    }

    return (fits.get(right.id)?.score ?? 0) - (fits.get(left.id)?.score ?? 0);
  });
}

export function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + days);

  return next.toISOString().slice(0, 10);
}

export function shiftWeek(week: MealPlanWeek, offsetWeeks: number): MealPlanWeek {
  if (offsetWeeks === 0) {
    return week;
  }

  const dayOffset = offsetWeeks * 7;
  const weekStartsOn = addDays(week.weekStartsOn, dayOffset);

  return {
    id: `${week.id}-offset-${offsetWeeks}`,
    weekStartsOn,
    days: week.days.map((day) => {
      const date = addDays(day.date, dayOffset);

      return {
        ...day,
        date,
        slots: day.slots.map((slot) => ({
          ...slot,
          date,
          plannedMeal: slot.plannedMeal
            ? {
                ...slot.plannedMeal,
                id: `${slot.plannedMeal.id}-offset-${offsetWeeks}`,
                date,
              }
            : undefined,
        })),
      };
    }),
  };
}

import type {
  IngredientUnit,
  MealType,
  NutritionMacroTarget,
  Recipe,
  RecipeIngredient,
  RecipeInstruction,
  RecipeReadiness,
} from "../meal-planner/meal-planner-types";
import { emptyTotals, mealTypeLabels } from "../meal-planner/meal-planner-utils";

export type RecipeTag =
  | "high-protein"
  | "low-carb"
  | "quick"
  | "meal-prep"
  | "vegetarian";

export type ReadinessFilter = "all" | "ready" | "needs_info" | "draft";

export type RecipeFormMode = "new" | "edit";

export type RecipeStats = {
  totalRecipes: number;
  activeRecipes: number;
  readyForPlanner: number;
  needsMacros: number;
  needsIngredients: number;
  averageTotalMinutes: number;
  mealTypeCoverage: string;
};

export const recipeTagOptions: readonly RecipeTag[] = [
  "high-protein",
  "low-carb",
  "quick",
  "meal-prep",
  "vegetarian",
];

export const recipeTagLabels: Record<RecipeTag, string> = {
  "high-protein": "Proteinreich",
  "low-carb": "Kohlenhydratarm",
  quick: "Schnell",
  "meal-prep": "Meal prep",
  vegetarian: "Vegetarisch",
};

export const ingredientUnitOptions: readonly IngredientUnit[] = [
  "g",
  "ml",
  "piece",
  "tbsp",
  "tsp",
];

export const readinessFilterLabels: Record<ReadinessFilter, string> = {
  all: "Alle",
  ready: "Vollständig",
  needs_info: "Angaben fehlen",
  draft: "Entwurf",
};

export const readinessMeta: Record<
  RecipeReadiness,
  { label: string; helper: string; accent: string }
> = {
  ready: {
    label: "Vollständig",
    helper: "Rezeptangaben vollständig",
    accent: "var(--accent-green)",
  },
  needs_macros: {
    label: "Nährwerte fehlen",
    helper: "Optionale Nährwertschätzung fehlt",
    accent: "var(--accent-orange)",
  },
  needs_ingredients: {
    label: "Zutaten fehlen",
    helper: "Noch keine Zutaten hinterlegt",
    accent: "var(--accent-yellow)",
  },
  needs_instructions: {
    label: "Zubereitung fehlt",
    helper: "Zubereitungsschritte fehlen",
    accent: "var(--accent-cyan)",
  },
  draft: {
    label: "Entwurf",
    helper: "Titel, Mahlzeit oder Portionen fehlen",
    accent: "var(--accent-purple)",
  },
};

export const recipeImageOptions: readonly {
  label: string;
  imageUrl: string;
  imageAlt: string;
}[] = [
  {
    label: "Skyr bowl",
    imageUrl: "/images/recipes/skyr-oats.svg",
    imageAlt: "Abstract bowl with oats and berries",
  },
  {
    label: "Protein bowl",
    imageUrl: "/images/recipes/protein-bowl.svg",
    imageAlt: "Abstract protein bowl with vegetables",
  },
  {
    label: "Vegetable pan",
    imageUrl: "/images/recipes/rice-vegetable-pan.svg",
    imageAlt: "Abstract rice and vegetable pan",
  },
  {
    label: "Salmon plate",
    imageUrl: "/images/recipes/salmon-potatoes.svg",
    imageAlt: "Abstract salmon with potatoes",
  },
  {
    label: "Tofu bowl",
    imageUrl: "/images/recipes/tofu-bowl.svg",
    imageAlt: "Abstract tofu bowl",
  },
  {
    label: "Omelette",
    imageUrl: "/images/recipes/omelette.svg",
    imageAlt: "Abstract omelette with vegetables",
  },
  {
    label: "Chicken wrap",
    imageUrl: "/images/recipes/chicken-wrap.svg",
    imageAlt: "Abstract chicken wrap",
  },
  {
    label: "Tomato pasta",
    imageUrl: "/images/recipes/pasta-tomato.svg",
    imageAlt: "Abstract pasta with tomato sauce",
  },
  {
    label: "Lentil curry",
    imageUrl: "/images/recipes/lentil-curry.svg",
    imageAlt: "Abstract lentil curry",
  },
  {
    label: "Cottage cheese",
    imageUrl: "/images/recipes/cottage-cheese-plate.svg",
    imageAlt: "Abstract cottage cheese plate",
  },
];

function isFiniteNumber(value: number) {
  return Number.isFinite(value);
}

function cleanNumber(value: number) {
  if (!isFiniteNumber(value)) {
    return 0;
  }

  return Math.max(0, Math.round(value * 10) / 10);
}

function hasText(value: string | undefined) {
  return Boolean(value?.trim());
}

export function calculateIngredientTotals(
  ingredients: readonly RecipeIngredient[],
): NutritionMacroTarget {
  return ingredients.reduce<NutritionMacroTarget>(
    (totals, ingredient) => ({
      calories: totals.calories + cleanNumber(ingredient.calories),
      protein: totals.protein + cleanNumber(ingredient.protein),
      carbs: totals.carbs + cleanNumber(ingredient.carbs),
      fat: totals.fat + cleanNumber(ingredient.fat),
    }),
    emptyTotals(),
  );
}

export function formatRecipeMinutes(minutes: number | undefined) {
  return `${Math.max(0, Math.round(minutes ?? 0))} min`;
}

export function getRecipeTotalMinutes(recipe: Recipe) {
  return Math.max(0, Math.round(recipe.prepMinutes ?? 0)) +
    Math.max(0, Math.round(recipe.cookMinutes ?? 0));
}

export function getTagLabel(tag: string) {
  return recipeTagLabels[tag as RecipeTag] ?? mealTypeLabels[tag as MealType] ?? tag.replaceAll("-", " ");
}

export function cloneRecipe(recipe: Recipe): Recipe {
  return {
    ...recipe,
    mealTypes: [...recipe.mealTypes],
    tags: [...recipe.tags],
    ingredients: recipe.ingredients.map((ingredient) => ({ ...ingredient })),
    instructions: recipe.instructions.map((instruction) => ({ ...instruction })),
    totals: { ...recipe.totals },
  };
}

export function createBlankRecipe(timestamp = Date.now()): Recipe {
  const image = recipeImageOptions[0];
  const date = new Date(timestamp).toISOString().slice(0, 10);

  return {
    id: `recipe-${timestamp}`,
    title: "",
    description: "",
    mealTypes: [],
    tags: [],
    defaultServings: 1,
    prepMinutes: 0,
    cookMinutes: 0,
    imageUrl: image.imageUrl,
    imageAlt: image.imageAlt,
    ingredients: [],
    instructions: [],
    totals: emptyTotals(),
    createdAt: date,
    updatedAt: date,
    archived: false,
  };
}

export function createBlankIngredient(timestamp = Date.now()): RecipeIngredient {
  return {
    id: `ingredient-${timestamp}`,
    name: "",
    amount: 0,
    unit: "g",
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  };
}

export function createBlankInstruction(
  order: number,
  timestamp = Date.now(),
): RecipeInstruction {
  return {
    id: `instruction-${timestamp}-${order}`,
    order,
    text: "",
  };
}

export function duplicateRecipe(recipe: Recipe, timestamp = Date.now()): Recipe {
  const date = new Date(timestamp).toISOString().slice(0, 10);
  const duplicate = cloneRecipe(recipe);

  return {
    ...duplicate,
    id: `${recipe.id}-copy-${timestamp}`,
    title: `${recipe.title} copy`,
    archived: false,
    createdAt: date,
    updatedAt: date,
    ingredients: duplicate.ingredients.map((ingredient, index) => ({
      ...ingredient,
      id: `${ingredient.id}-copy-${timestamp}-${index}`,
    })),
    instructions: duplicate.instructions.map((instruction, index) => ({
      ...instruction,
      id: `${instruction.id}-copy-${timestamp}-${index}`,
      order: index + 1,
    })),
  };
}

export function normalizeRecipeForSave(recipe: Recipe): Recipe {
  const now = new Date().toISOString().slice(0, 10);
  const ingredients = recipe.ingredients
    .filter((ingredient) => hasText(ingredient.name))
    .map((ingredient) => ({
      ...ingredient,
      name: ingredient.name.trim(),
      amount: cleanNumber(ingredient.amount),
      calories: cleanNumber(ingredient.calories),
      protein: cleanNumber(ingredient.protein),
      carbs: cleanNumber(ingredient.carbs),
      fat: cleanNumber(ingredient.fat),
    }));
  const instructions = recipe.instructions
    .filter((instruction) => hasText(instruction.text))
    .map((instruction, index) => ({
      ...instruction,
      order: index + 1,
      text: instruction.text.trim(),
    }));
  const totals =
    ingredients.length > 0
      ? calculateIngredientTotals(ingredients)
      : {
          calories: cleanNumber(recipe.totals.calories),
          protein: cleanNumber(recipe.totals.protein),
          carbs: cleanNumber(recipe.totals.carbs),
          fat: cleanNumber(recipe.totals.fat),
        };
  const selectedImage = recipeImageOptions.find(
    (option) => option.imageUrl === recipe.imageUrl,
  );

  return {
    ...recipe,
    title: recipe.title.trim(),
    description: recipe.description?.trim(),
    tags: recipe.tags.filter((tag, index) => recipe.tags.indexOf(tag) === index),
    prepMinutes: cleanNumber(recipe.prepMinutes ?? 0),
    cookMinutes: cleanNumber(recipe.cookMinutes ?? 0),
    imageAlt: selectedImage?.imageAlt ?? recipe.imageAlt,
    ingredients,
    instructions,
    totals,
    updatedAt: now,
  };
}

export function getRecipeReadiness(recipe: Recipe): RecipeReadiness {
  if (
    !hasText(recipe.title) ||
    recipe.mealTypes.length === 0 ||
    !isFiniteNumber(recipe.defaultServings) ||
    recipe.defaultServings <= 0
  ) {
    return "draft";
  }

  if (
    recipe.ingredients.length === 0 ||
    recipe.ingredients.every((ingredient) => !hasText(ingredient.name))
  ) {
    return "needs_ingredients";
  }

  const hasInvalidIngredient = recipe.ingredients.some(
    (ingredient) =>
      !hasText(ingredient.name) ||
      ingredient.amount < 0 ||
      ingredient.calories < 0 ||
      ingredient.protein < 0 ||
      ingredient.carbs < 0 ||
      ingredient.fat < 0,
  );
  const totals = recipe.nutritionEstimateAvailable !== undefined
    ? recipe.totals
    : recipe.ingredients.length > 0 ? calculateIngredientTotals(recipe.ingredients) : recipe.totals;

  if (
    hasInvalidIngredient ||
    (recipe.availableMacros !== undefined && recipe.availableMacros.length < 4) ||
    totals.calories <= 0 ||
    totals.protein < 0 ||
    totals.carbs < 0 ||
    totals.fat < 0
  ) {
    return "needs_macros";
  }

  if (
    recipe.instructions.length === 0 ||
    recipe.instructions.every((instruction) => !hasText(instruction.text))
  ) {
    return "needs_instructions";
  }

  return "ready";
}

export function recipeMatchesReadinessFilter(
  recipe: Recipe,
  filter: ReadinessFilter,
) {
  const readiness = getRecipeReadiness(recipe);

  if (filter === "all") {
    return true;
  }

  if (filter === "ready") {
    return readiness === "ready";
  }

  if (filter === "draft") {
    return readiness === "draft";
  }

  return readiness === "needs_macros" ||
    readiness === "needs_ingredients" ||
    readiness === "needs_instructions";
}

export function filterRecipeList(
  recipes: readonly Recipe[],
  query: string,
  mealType: MealType | "all",
  tag: RecipeTag | "all",
  readiness: ReadinessFilter,
) {
  const normalizedQuery = query.trim().toLowerCase();

  return recipes.filter((recipe) => {
    if (recipe.archived) {
      return false;
    }

    if (mealType !== "all" && !recipe.mealTypes.includes(mealType)) {
      return false;
    }

    if (tag !== "all" && !recipe.tags.includes(tag)) {
      return false;
    }

    if (!recipeMatchesReadinessFilter(recipe, readiness)) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = [
      recipe.title,
      recipe.description ?? "",
      ...recipe.tags.map(getTagLabel),
      ...recipe.ingredients.map((ingredient) => ingredient.name),
      ...recipe.mealTypes.map((type) => mealTypeLabels[type]),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

export function summarizeRecipes(recipes: readonly Recipe[]): RecipeStats {
  const activeRecipes = recipes.filter((recipe) => !recipe.archived);
  const readinessCounts = activeRecipes.reduce(
    (counts, recipe) => {
      counts[getRecipeReadiness(recipe)] += 1;
      return counts;
    },
    {
      ready: 0,
      needs_macros: 0,
      needs_ingredients: 0,
      needs_instructions: 0,
      draft: 0,
    } satisfies Record<RecipeReadiness, number>,
  );
  const totalMinutes = activeRecipes.reduce(
    (sum, recipe) => sum + getRecipeTotalMinutes(recipe),
    0,
  );
  const mealTypeCoverage = (["breakfast", "lunch", "dinner"] as const)
    .filter((mealType) =>
      activeRecipes.some((recipe) => recipe.mealTypes.includes(mealType)),
    )
    .map((mealType) => mealTypeLabels[mealType])
    .join(" / ");

  return {
    totalRecipes: recipes.length,
    activeRecipes: activeRecipes.length,
    readyForPlanner: readinessCounts.ready,
    needsMacros: readinessCounts.needs_macros,
    needsIngredients: readinessCounts.needs_ingredients,
    averageTotalMinutes:
      activeRecipes.length > 0 ? Math.round(totalMinutes / activeRecipes.length) : 0,
    mealTypeCoverage: mealTypeCoverage || "Keine Mahlzeitentypen",
  };
}

export function validateRecipeDraft(recipe: Recipe) {
  const errors: string[] = [];

  if (!hasText(recipe.title)) {
    errors.push("Title is required.");
  }

  if (recipe.mealTypes.length === 0) {
    errors.push("Select at least one meal type.");
  }

  if (!isFiniteNumber(recipe.defaultServings) || recipe.defaultServings <= 0) {
    errors.push("Servings must be greater than zero.");
  }

  if (
    !isFiniteNumber(recipe.prepMinutes ?? 0) ||
    !isFiniteNumber(recipe.cookMinutes ?? 0) ||
    (recipe.prepMinutes ?? 0) < 0 ||
    (recipe.cookMinutes ?? 0) < 0
  ) {
    errors.push("Prep and cook minutes must be zero or higher.");
  }

  recipe.ingredients.forEach((ingredient, index) => {
    const row = index + 1;

    if (ingredient.amount < 0) {
      errors.push(`Ingredient ${row} amount must be zero or higher.`);
    }

    if (
      ingredient.calories < 0 ||
      ingredient.protein < 0 ||
      ingredient.carbs < 0 ||
      ingredient.fat < 0
    ) {
      errors.push(`Ingredient ${row} macros must be zero or higher.`);
    }
  });

  if (
    recipe.totals.calories < 0 ||
    recipe.totals.protein < 0 ||
    recipe.totals.carbs < 0 ||
    recipe.totals.fat < 0
  ) {
    errors.push("Macro totals must be zero or higher.");
  }

  return {
    canSave: errors.length === 0,
    errors,
  };
}

import type {
  MealPlanWeek,
  PlannedMeal,
  Recipe,
  RecipeIngredient,
} from "../meal-planner/meal-planner-types";
import { mealTypeLabels, recipeById } from "../meal-planner/meal-planner-utils";
import type {
  GroceryCategory,
  GroceryDemandItem,
  GroceryListItem,
  GrocerySummary,
  GroceryUnit,
  IngredientConfidence,
  IngredientReference,
  MealAvailability,
  MissingIngredient,
  MustHaveItem,
  PantryItem,
  ReceiptLineItem,
} from "./grocery-types";

type RecipeAvailability = Pick<
  MealAvailability,
  | "status"
  | "coveredIngredientCount"
  | "totalIngredientCount"
  | "missingIngredients"
>;

export const groceryCategoryOrder: readonly GroceryCategory[] = [
  "produce",
  "dairy",
  "meat_fish",
  "grains",
  "pantry",
  "frozen",
  "spices",
  "drinks",
  "hygiene",
  "household",
  "other",
];

export const groceryCategoryLabels: Record<GroceryCategory, string> = {
  produce: "Produce",
  dairy: "Dairy",
  meat_fish: "Meat / Fish",
  grains: "Grains",
  pantry: "Pantry",
  frozen: "Frozen",
  spices: "Spices",
  drinks: "Drinks",
  hygiene: "Hygiene",
  household: "Household",
  other: "Other",
};

export const groceryUnitOptions: readonly GroceryUnit[] = [
  "g",
  "kg",
  "ml",
  "l",
  "piece",
  "tbsp",
  "tsp",
];

export const groceryCategoryOptions = groceryCategoryOrder;

export const confidenceLabels: Record<IngredientConfidence, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const categoryOverrides: Record<
  string,
  { canonicalName: string; category: GroceryCategory; defaultUnit: GroceryUnit }
> = {
  avocado: { canonicalName: "avocado", category: "produce", defaultUnit: "g" },
  berries: { canonicalName: "berries", category: "produce", defaultUnit: "g" },
  bread: { canonicalName: "bread", category: "grains", defaultUnit: "g" },
  "boiled egg": { canonicalName: "eggs", category: "dairy", defaultUnit: "piece" },
  "chicken breast": {
    canonicalName: "chicken breast",
    category: "meat_fish",
    defaultUnit: "g",
  },
  "coconut milk": {
    canonicalName: "coconut milk",
    category: "pantry",
    defaultUnit: "ml",
  },
  "cottage cheese": {
    canonicalName: "cottage cheese",
    category: "dairy",
    defaultUnit: "g",
  },
  coffee: { canonicalName: "coffee", category: "pantry", defaultUnit: "g" },
  "dish soap": {
    canonicalName: "dish soap",
    category: "household",
    defaultUnit: "piece",
  },
  eggs: { canonicalName: "eggs", category: "dairy", defaultUnit: "piece" },
  feta: { canonicalName: "feta", category: "dairy", defaultUnit: "g" },
  lentils: { canonicalName: "lentils", category: "pantry", defaultUnit: "g" },
  mozzarella: { canonicalName: "mozzarella", category: "dairy", defaultUnit: "g" },
  oats: { canonicalName: "oats", category: "grains", defaultUnit: "g" },
  "olive oil": { canonicalName: "olive oil", category: "pantry", defaultUnit: "ml" },
  pasta: { canonicalName: "pasta", category: "grains", defaultUnit: "g" },
  potatoes: { canonicalName: "potatoes", category: "produce", defaultUnit: "g" },
  quinoa: { canonicalName: "quinoa", category: "grains", defaultUnit: "g" },
  rice: { canonicalName: "rice", category: "grains", defaultUnit: "g" },
  salt: { canonicalName: "salt", category: "spices", defaultUnit: "g" },
  salmon: { canonicalName: "salmon", category: "meat_fish", defaultUnit: "g" },
  salad: { canonicalName: "salad", category: "produce", defaultUnit: "g" },
  skyr: { canonicalName: "skyr", category: "dairy", defaultUnit: "g" },
  "soy sauce": { canonicalName: "soy sauce", category: "pantry", defaultUnit: "ml" },
  spinach: { canonicalName: "spinach", category: "produce", defaultUnit: "g" },
  tahini: { canonicalName: "tahini", category: "pantry", defaultUnit: "ml" },
  "toilet paper": {
    canonicalName: "toilet paper",
    category: "household",
    defaultUnit: "piece",
  },
  tofu: { canonicalName: "tofu", category: "dairy", defaultUnit: "g" },
  tomato: { canonicalName: "tomato", category: "produce", defaultUnit: "g" },
  "tomato sauce": {
    canonicalName: "tomato sauce",
    category: "pantry",
    defaultUnit: "g",
  },
  vegetables: { canonicalName: "vegetables", category: "produce", defaultUnit: "g" },
  toothpaste: {
    canonicalName: "toothpaste",
    category: "hygiene",
    defaultUnit: "piece",
  },
  "trash bags": {
    canonicalName: "trash bags",
    category: "household",
    defaultUnit: "piece",
  },
  water: { canonicalName: "water", category: "drinks", defaultUnit: "l" },
  wrap: { canonicalName: "wholegrain wrap", category: "grains", defaultUnit: "piece" },
  "wholegrain wrap": {
    canonicalName: "wholegrain wrap",
    category: "grains",
    defaultUnit: "piece",
  },
  "yogurt dressing": {
    canonicalName: "yogurt dressing",
    category: "dairy",
    defaultUnit: "g",
  },
};

const groceryVisuals: Record<string, { imageUrl: string; imageAlt: string }> = {
  berries: {
    imageUrl: "/images/grocery/berries.svg",
    imageAlt: "Berries grocery placeholder",
  },
  "dish soap": {
    imageUrl: "/images/grocery/dish-soap.svg",
    imageAlt: "Dish soap grocery placeholder",
  },
  oats: {
    imageUrl: "/images/grocery/oats.svg",
    imageAlt: "Oats grocery placeholder",
  },
  "olive oil": {
    imageUrl: "/images/grocery/olive-oil.svg",
    imageAlt: "Olive oil grocery placeholder",
  },
  potatoes: {
    imageUrl: "/images/grocery/potatoes.svg",
    imageAlt: "Potatoes grocery placeholder",
  },
  rice: {
    imageUrl: "/images/grocery/rice.svg",
    imageAlt: "Rice grocery placeholder",
  },
  skyr: {
    imageUrl: "/images/grocery/skyr.svg",
    imageAlt: "Skyr grocery placeholder",
  },
  spinach: {
    imageUrl: "/images/grocery/spinach.svg",
    imageAlt: "Spinach grocery placeholder",
  },
  "toilet paper": {
    imageUrl: "/images/grocery/toilet-paper.svg",
    imageAlt: "Toilet paper grocery placeholder",
  },
  water: {
    imageUrl: "/images/grocery/water.svg",
    imageAlt: "Water bottle grocery placeholder",
  },
};

export function groceryVisualFor(canonicalName: string) {
  return (
    groceryVisuals[canonicalName] ?? {
      imageUrl: "/images/grocery/fallback.svg",
      imageAlt: `${titleCase(canonicalName)} grocery placeholder`,
    }
  );
}

function titleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function normalizeIngredientName(name: string) {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(cooked|mixed|side|wholegrain)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.includes("skyr sauce")) {
    return "skyr";
  }

  if (normalized.includes("chicken")) {
    return "chicken breast";
  }

  if (normalized.includes("rice")) {
    return "rice";
  }

  if (normalized.includes("vegetable")) {
    return "vegetables";
  }

  if (normalized.includes("wrap")) {
    return "wholegrain wrap";
  }

  if (normalized.includes("toilet paper")) {
    return "toilet paper";
  }

  if (normalized.includes("dish soap")) {
    return "dish soap";
  }

  if (normalized.includes("trash bag")) {
    return "trash bags";
  }

  return normalized;
}

function inferCategory(canonicalName: string): GroceryCategory {
  if (
    ["berries", "vegetables", "potatoes", "salad", "tomato", "avocado", "spinach"].includes(
      canonicalName,
    )
  ) {
    return "produce";
  }

  if (
    ["skyr", "eggs", "feta", "mozzarella", "cottage cheese", "tofu", "yogurt dressing"].includes(
      canonicalName,
    )
  ) {
    return "dairy";
  }

  if (["chicken breast", "salmon"].includes(canonicalName)) {
    return "meat_fish";
  }

  if (["oats", "rice", "quinoa", "pasta", "bread", "wholegrain wrap"].includes(canonicalName)) {
    return "grains";
  }

  if (["water"].includes(canonicalName)) {
    return "drinks";
  }

  if (["toothpaste"].includes(canonicalName)) {
    return "hygiene";
  }

  if (["dish soap", "toilet paper", "trash bags"].includes(canonicalName)) {
    return "household";
  }

  return "pantry";
}

function defaultUnitFor(unit: GroceryUnit, canonicalName: string): GroceryUnit {
  if (categoryOverrides[canonicalName]?.defaultUnit) {
    return categoryOverrides[canonicalName].defaultUnit;
  }

  if (unit === "kg") {
    return "g";
  }

  if (unit === "l") {
    return "ml";
  }

  if (unit === "tbsp" || unit === "tsp") {
    return "ml";
  }

  return unit;
}

export function ingredientReferenceFor(
  name: string,
  unit: GroceryUnit = "g",
): IngredientReference {
  const normalized = normalizeIngredientName(name);
  const override = categoryOverrides[normalized];
  const canonicalName = override?.canonicalName ?? normalized;
  const defaultUnit = defaultUnitFor(override?.defaultUnit ?? unit, canonicalName);

  return {
    id: `ingredient-${canonicalName.replace(/[^a-z0-9]+/g, "-")}`,
    name: titleCase(canonicalName),
    canonicalName,
    category: override?.category ?? inferCategory(canonicalName),
    defaultUnit,
    ...groceryVisualFor(canonicalName),
  };
}

function toBaseQuantity(quantity: number, unit: GroceryUnit) {
  if (unit === "kg") {
    return { quantity: quantity * 1000, unit: "g" as GroceryUnit };
  }

  if (unit === "l") {
    return { quantity: quantity * 1000, unit: "ml" as GroceryUnit };
  }

  if (unit === "tbsp") {
    return { quantity: quantity * 15, unit: "ml" as GroceryUnit };
  }

  if (unit === "tsp") {
    return { quantity: quantity * 5, unit: "ml" as GroceryUnit };
  }

  return { quantity, unit };
}

function fromBaseQuantity(quantity: number, unit: GroceryUnit) {
  if (unit === "kg") {
    return quantity / 1000;
  }

  if (unit === "l") {
    return quantity / 1000;
  }

  if (unit === "tbsp") {
    return quantity / 15;
  }

  if (unit === "tsp") {
    return quantity / 5;
  }

  return quantity;
}

function roundQuantity(value: number) {
  return Math.round(value * 10) / 10;
}

export function formatGroceryQuantity(value: number, unit: GroceryUnit) {
  const rounded = roundQuantity(value);

  return `${Number.isInteger(rounded) ? Math.round(rounded) : rounded} ${unit}`;
}

function scaledIngredient(
  ingredient: RecipeIngredient,
  servingsScale: number,
) {
  const reference = ingredientReferenceFor(ingredient.name, ingredient.unit);
  const base = toBaseQuantity(ingredient.amount * servingsScale, ingredient.unit);

  return {
    reference,
    quantity: roundQuantity(base.quantity),
    unit: base.unit,
  };
}

export function aggregateWeeklyIngredientDemand(
  week: MealPlanWeek,
  recipes: readonly Recipe[],
) {
  const demandMap = new Map<string, GroceryDemandItem>();

  week.days.forEach((day) => {
    day.slots.forEach((slot) => {
      const plannedMeal = slot.plannedMeal;

      if (!plannedMeal) {
        return;
      }

      const recipe = recipeById(recipes, plannedMeal.recipeId);

      if (!recipe) {
        return;
      }

      const servingsScale = plannedMeal.servings / recipe.defaultServings;

      recipe.ingredients.forEach((ingredient) => {
        const scaled = scaledIngredient(ingredient, servingsScale);
        const key = `${scaled.reference.canonicalName}-${scaled.unit}`;
        const current = demandMap.get(key);
        const source = {
          mealId: plannedMeal.id,
          recipeId: recipe.id,
          recipeTitle: recipe.title,
          date: day.date,
          mealType: slot.mealType,
          quantity: scaled.quantity,
          unit: scaled.unit,
        };

        if (!current) {
          demandMap.set(key, {
            id: `demand-${key}`,
            ingredientId: scaled.reference.id,
            name: scaled.reference.name,
            canonicalName: scaled.reference.canonicalName,
            category: scaled.reference.category,
            requiredQuantity: scaled.quantity,
            availableQuantity: 0,
            missingQuantity: scaled.quantity,
            unit: scaled.unit,
            sourceMealIds: [plannedMeal.id],
            sourceRecipeIds: [recipe.id],
            sourceMustHaveItemIds: [],
            sourceTypes: ["meal_plan" as const],
            sources: [source],
            status: "missing",
            imageUrl: scaled.reference.imageUrl,
            imageAlt: scaled.reference.imageAlt,
          });
          return;
        }

        current.requiredQuantity = roundQuantity(
          current.requiredQuantity + scaled.quantity,
        );
        current.missingQuantity = current.requiredQuantity;
        current.sourceMealIds = [...new Set([...current.sourceMealIds, plannedMeal.id])];
        current.sourceRecipeIds = [...new Set([...current.sourceRecipeIds, recipe.id])];
        current.sourceTypes = [
          ...new Set<GroceryDemandItem["sourceTypes"][number]>([
            ...current.sourceTypes,
            "meal_plan",
          ]),
        ];
        current.sources.push(source);
      });
    });
  });

  return [...demandMap.values()].sort((left, right) => {
    const categoryDelta =
      groceryCategoryOrder.indexOf(left.category) -
      groceryCategoryOrder.indexOf(right.category);

    return categoryDelta === 0 ? left.name.localeCompare(right.name) : categoryDelta;
  });
}

function pantryQuantityFor(
  canonicalName: string,
  unit: GroceryUnit,
  pantryItems: readonly PantryItem[],
) {
  return pantryItems.reduce((total, item) => {
    if (item.canonicalName !== canonicalName) {
      return total;
    }

    const base = toBaseQuantity(item.quantity, item.unit);

    if (base.unit !== unit) {
      return total;
    }

    return total + base.quantity;
  }, 0);
}

export function matchDemandWithPantry(
  demandItems: readonly GroceryDemandItem[],
  pantryItems: readonly PantryItem[],
): GroceryDemandItem[] {
  return demandItems.map((item) => {
    const availableQuantity = roundQuantity(
      pantryQuantityFor(item.canonicalName, item.unit, pantryItems),
    );
    const missingQuantity = roundQuantity(
      Math.max(0, item.requiredQuantity - availableQuantity),
    );
    const status: GroceryDemandItem["status"] =
      missingQuantity === 0
        ? "covered"
        : availableQuantity > 0
          ? "partial"
          : "missing";

    return {
      ...item,
      availableQuantity,
      missingQuantity,
      status,
    };
  });
}

export function createMustHaveDemand(
  mustHaveItems: readonly MustHaveItem[],
  pantryItems: readonly PantryItem[],
): GroceryDemandItem[] {
  return mustHaveItems
    .filter((item) => item.enabled)
    .map((item): GroceryDemandItem => {
      const reference = ingredientReferenceFor(item.name, item.unit ?? "piece");
      const desiredQuantity = item.desiredQuantity ?? 1;
      const base = toBaseQuantity(desiredQuantity, item.unit ?? reference.defaultUnit);
      const pantryQuantity = pantryQuantityFor(
        reference.canonicalName,
        base.unit,
        pantryItems,
      );
      const explicitCurrent =
        typeof item.currentQuantity === "number"
          ? toBaseQuantity(item.currentQuantity, item.unit ?? reference.defaultUnit)
          : null;
      const availableQuantity =
        explicitCurrent && explicitCurrent.unit === base.unit
          ? explicitCurrent.quantity
          : pantryQuantity;
      const missingQuantity = item.desiredQuantity
        ? roundQuantity(Math.max(0, base.quantity - availableQuantity))
        : availableQuantity > 0
          ? 0
          : 1;
      const status: GroceryDemandItem["status"] =
        missingQuantity === 0
          ? "covered"
          : availableQuantity > 0
            ? "partial"
            : "missing";
      const visual = groceryVisualFor(reference.canonicalName);

      return {
        id: `must-demand-${item.id}`,
        ingredientId: item.ingredientId ?? reference.id,
        name: item.name,
        canonicalName: reference.canonicalName,
        category: item.category,
        requiredQuantity: roundQuantity(base.quantity),
        availableQuantity: roundQuantity(availableQuantity),
        missingQuantity,
        unit: base.unit,
        sourceMealIds: [],
        sourceRecipeIds: [],
        sourceMustHaveItemIds: [item.id],
        sourceTypes: ["must_have" as const],
        sources: [],
        status,
        imageUrl: item.imageUrl ?? visual.imageUrl,
        imageAlt: item.imageAlt ?? visual.imageAlt,
      };
    })
    .filter((item) => item.missingQuantity > 0)
    .sort((left, right) => {
      const categoryDelta =
        groceryCategoryOrder.indexOf(left.category) -
        groceryCategoryOrder.indexOf(right.category);

      return categoryDelta === 0 ? left.name.localeCompare(right.name) : categoryDelta;
    });
}

export function mergeShoppingDemand(
  mealPlanDemand: readonly GroceryDemandItem[],
  mustHaveDemand: readonly GroceryDemandItem[],
): GroceryDemandItem[] {
  const demandMap = new Map<string, GroceryDemandItem>();

  [...mealPlanDemand, ...mustHaveDemand].forEach((item) => {
    const key = `${item.canonicalName}-${item.unit}`;
    const current = demandMap.get(key);

    if (!current) {
      demandMap.set(key, {
        ...item,
        sourceMealIds: [...item.sourceMealIds],
        sourceRecipeIds: [...item.sourceRecipeIds],
        sourceMustHaveItemIds: [...item.sourceMustHaveItemIds],
        sourceTypes: [...item.sourceTypes],
        sources: [...item.sources],
      });
      return;
    }

    const requiredQuantity = roundQuantity(
      Math.max(current.requiredQuantity, item.requiredQuantity),
    );
    const availableQuantity = roundQuantity(
      Math.max(current.availableQuantity, item.availableQuantity),
    );
    const missingQuantity = roundQuantity(
      Math.max(current.missingQuantity, item.missingQuantity),
    );
    const status: GroceryDemandItem["status"] =
      missingQuantity === 0
        ? "covered"
        : availableQuantity > 0
          ? "partial"
          : "missing";

    demandMap.set(key, {
      ...current,
      requiredQuantity,
      availableQuantity,
      missingQuantity,
      status,
      sourceMealIds: [...new Set([...current.sourceMealIds, ...item.sourceMealIds])],
      sourceRecipeIds: [
        ...new Set([...current.sourceRecipeIds, ...item.sourceRecipeIds]),
      ],
      sourceMustHaveItemIds: [
        ...new Set([
          ...current.sourceMustHaveItemIds,
          ...item.sourceMustHaveItemIds,
        ]),
      ],
      sourceTypes: [...new Set([...current.sourceTypes, ...item.sourceTypes])],
      sources: [...current.sources, ...item.sources],
      imageUrl: current.imageUrl ?? item.imageUrl,
      imageAlt: current.imageAlt ?? item.imageAlt,
    });
  });

  return [...demandMap.values()].sort((left, right) => {
    const categoryDelta =
      groceryCategoryOrder.indexOf(left.category) -
      groceryCategoryOrder.indexOf(right.category);

    return categoryDelta === 0 ? left.name.localeCompare(right.name) : categoryDelta;
  });
}

export function createGroceryListFromDemand(
  demandItems: readonly GroceryDemandItem[],
): GroceryListItem[] {
  return demandItems
    .filter((item) => item.missingQuantity > 0)
    .map((item) => ({
      id: `list-${item.id}`,
      ingredientId: item.ingredientId,
      name: item.name,
      canonicalName: item.canonicalName,
      category: item.category,
      quantityToBuy: item.missingQuantity,
      unit: item.unit,
      status: "to_buy",
      demandStatus: item.status,
      sourceDemandItemIds: [item.id],
      sourceTypes: item.sourceTypes,
      imageUrl: item.imageUrl,
      imageAlt: item.imageAlt,
    }));
}

export function applyReceiptItemsToPantry(
  receiptItems: readonly ReceiptLineItem[],
  pantryItems: readonly PantryItem[],
) {
  const next = pantryItems.map((item) => ({ ...item }));
  const today = new Date().toISOString().slice(0, 10);

  receiptItems
    .filter((item) => item.accepted)
    .forEach((receiptItem) => {
      const reference = ingredientReferenceFor(receiptItem.name, receiptItem.unit);
      const base = toBaseQuantity(receiptItem.estimatedQuantity, receiptItem.unit);
      const existing = next.find(
        (item) =>
          item.canonicalName === reference.canonicalName &&
          toBaseQuantity(item.quantity, item.unit).unit === base.unit,
      );

      if (existing) {
        const existingBase = toBaseQuantity(existing.quantity, existing.unit);
        existing.quantity = roundQuantity(
          fromBaseQuantity(existingBase.quantity + base.quantity, existing.unit),
        );
        existing.confidence = receiptItem.confidence;
        existing.source = "receipt";
        existing.updatedAt = today;
        return;
      }

      next.push({
        id: `pantry-${reference.canonicalName.replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
        ingredientId: reference.id,
        name: reference.name,
        canonicalName: reference.canonicalName,
        category: reference.category,
        quantity: roundQuantity(base.quantity),
        unit: base.unit,
        confidence: receiptItem.confidence,
        source: "receipt",
        updatedAt: today,
        imageUrl: reference.imageUrl,
        imageAlt: reference.imageAlt,
      });
    });

  return next;
}

function missingIngredientsForRecipe(
  recipe: Recipe,
  servings: number,
  pantryItems: readonly PantryItem[],
) {
  const ingredientMap = new Map<string, MissingIngredient & { requiredQuantity: number }>();
  const servingsScale = servings / recipe.defaultServings;

  recipe.ingredients.forEach((ingredient) => {
    const scaled = scaledIngredient(ingredient, servingsScale);
    const key = `${scaled.reference.canonicalName}-${scaled.unit}`;
    const current = ingredientMap.get(key);

    if (!current) {
      ingredientMap.set(key, {
        ingredientId: scaled.reference.id,
        name: scaled.reference.name,
        canonicalName: scaled.reference.canonicalName,
        missingQuantity: 0,
        requiredQuantity: scaled.quantity,
        unit: scaled.unit,
      });
      return;
    }

    current.requiredQuantity = roundQuantity(
      current.requiredQuantity + scaled.quantity,
    );
  });

  return [...ingredientMap.values()]
    .map((item) => {
      const available = pantryQuantityFor(item.canonicalName, item.unit, pantryItems);

      return {
        ingredientId: item.ingredientId,
        name: item.name,
        canonicalName: item.canonicalName,
        missingQuantity: roundQuantity(Math.max(0, item.requiredQuantity - available)),
        unit: item.unit,
      };
    })
    .filter((item) => item.missingQuantity > 0);
}

export function calculateRecipeAvailability(
  recipe: Recipe,
  servings: number,
  pantryItems: readonly PantryItem[],
): RecipeAvailability {
  const missingIngredients = missingIngredientsForRecipe(recipe, servings, pantryItems);
  const totalIngredientCount = new Set(
    recipe.ingredients.map((ingredient) =>
      ingredientReferenceFor(ingredient.name, ingredient.unit).canonicalName,
    ),
  ).size;
  const missingCount = missingIngredients.length;
  const coveredIngredientCount = Math.max(0, totalIngredientCount - missingCount);
  const status: MealAvailability["status"] =
    missingCount === 0
      ? "available"
      : coveredIngredientCount > 0
        ? "partial"
        : "missing";

  return {
    status,
    coveredIngredientCount,
    totalIngredientCount,
    missingIngredients,
  };
}

export function calculateMealAvailability(
  plannedMeal: PlannedMeal,
  recipe: Recipe,
  pantryItems: readonly PantryItem[],
): MealAvailability {
  const availability = calculateRecipeAvailability(
    recipe,
    plannedMeal.servings,
    pantryItems,
  );

  return {
    id: `availability-${plannedMeal.id}`,
    plannedMeal,
    recipe,
    date: plannedMeal.date,
    mealType: plannedMeal.mealType,
    ...availability,
  };
}

export function calculateMealAvailabilityList(
  week: MealPlanWeek,
  recipes: readonly Recipe[],
  pantryItems: readonly PantryItem[],
) {
  return week.days.flatMap((day) =>
    day.slots.flatMap((slot) => {
      if (!slot.plannedMeal) {
        return [];
      }

      const recipe = recipeById(recipes, slot.plannedMeal.recipeId);

      if (!recipe) {
        return [];
      }

      return [
        {
          ...calculateMealAvailability(slot.plannedMeal, recipe, pantryItems),
          date: day.date,
          mealType: slot.mealType,
        },
      ];
    }),
  );
}

export function deductMealIngredientsFromPantry(
  plannedMeal: PlannedMeal,
  recipe: Recipe,
  pantryItems: readonly PantryItem[],
) {
  const next = pantryItems.map((item) => ({ ...item }));
  const today = new Date().toISOString().slice(0, 10);
  const servingsScale = plannedMeal.servings / recipe.defaultServings;

  recipe.ingredients.forEach((ingredient) => {
    const scaled = scaledIngredient(ingredient, servingsScale);
    let remaining = scaled.quantity;

    next
      .filter((item) => item.canonicalName === scaled.reference.canonicalName)
      .forEach((item) => {
        if (remaining <= 0) {
          return;
        }

        const base = toBaseQuantity(item.quantity, item.unit);

        if (base.unit !== scaled.unit) {
          return;
        }

        const deducted = Math.min(base.quantity, remaining);

        item.quantity = roundQuantity(
          Math.max(0, fromBaseQuantity(base.quantity - deducted, item.unit)),
        );
        item.source = "meal_deduction";
        item.updatedAt = today;
        remaining = roundQuantity(remaining - deducted);
      });
  });

  return next;
}

export function addPantryQuantity(
  pantryItems: readonly PantryItem[],
  name: string,
  quantity: number,
  unit: GroceryUnit,
  source: PantryItem["source"] = "manual",
  confidence: IngredientConfidence = "medium",
) {
  const reference = ingredientReferenceFor(name, unit);
  const base = toBaseQuantity(quantity, unit);
  const today = new Date().toISOString().slice(0, 10);
  const next = pantryItems.map((item) => ({ ...item }));
  const existing = next.find(
    (item) =>
      item.canonicalName === reference.canonicalName &&
      toBaseQuantity(item.quantity, item.unit).unit === base.unit,
  );

  if (existing) {
    const existingBase = toBaseQuantity(existing.quantity, existing.unit);

    existing.quantity = roundQuantity(
      fromBaseQuantity(existingBase.quantity + base.quantity, existing.unit),
    );
    existing.source = source;
    existing.confidence = confidence;
    existing.updatedAt = today;
    return next;
  }

  return [
    ...next,
    {
      id: `pantry-${reference.canonicalName.replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      ingredientId: reference.id,
      name: reference.name,
      canonicalName: reference.canonicalName,
      category: reference.category,
      quantity: roundQuantity(base.quantity),
      unit: base.unit,
      confidence,
      source,
      updatedAt: today,
      imageUrl: reference.imageUrl,
      imageAlt: reference.imageAlt,
    },
  ];
}

export function updatePantryQuantity(
  pantryItems: readonly PantryItem[],
  itemId: string,
  quantity: number,
) {
  const today = new Date().toISOString().slice(0, 10);

  return pantryItems.map((item) =>
    item.id === itemId
      ? {
          ...item,
          quantity: Math.max(0, roundQuantity(quantity)),
          updatedAt: today,
        }
      : item,
  );
}

export function createStubReceiptLines(receiptUploadId: string): ReceiptLineItem[] {
  return [
    {
      id: `${receiptUploadId}-skyr`,
      receiptUploadId,
      rawLabel: "SKYR NATUR 500G",
      matchedIngredientId: "ingredient-skyr",
      name: "Skyr",
      category: "dairy",
      estimatedQuantity: 500,
      unit: "g",
      confidence: "medium",
      accepted: true,
    },
    {
      id: `${receiptUploadId}-oats`,
      receiptUploadId,
      rawLabel: "HAFERFLOCKEN 1KG",
      matchedIngredientId: "ingredient-oats",
      name: "Oats",
      category: "grains",
      estimatedQuantity: 1000,
      unit: "g",
      confidence: "medium",
      accepted: true,
    },
    {
      id: `${receiptUploadId}-chicken`,
      receiptUploadId,
      rawLabel: "HAEHNCHEN 400G",
      matchedIngredientId: "ingredient-chicken-breast",
      name: "Chicken breast",
      category: "meat_fish",
      estimatedQuantity: 400,
      unit: "g",
      confidence: "low",
      accepted: true,
    },
    {
      id: `${receiptUploadId}-potatoes`,
      receiptUploadId,
      rawLabel: "KARTOFFELN 1KG",
      matchedIngredientId: "ingredient-potatoes",
      name: "Potatoes",
      category: "produce",
      estimatedQuantity: 1000,
      unit: "g",
      confidence: "medium",
      accepted: true,
    },
  ];
}

export function summarizeGrocery(
  groceryItems: readonly GroceryListItem[],
  pantryItems: readonly PantryItem[],
  receiptsPendingReview: number,
): GrocerySummary {
  const activeItems = groceryItems.filter((item) => item.status === "to_buy");

  return {
    toBuyItems: activeItems.length,
    fromMealPlan: activeItems.filter((item) =>
      item.sourceTypes.includes("meal_plan"),
    ).length,
    fromMustList: activeItems.filter((item) =>
      item.sourceTypes.includes("must_have"),
    ).length,
    inStockItems: pantryItems.length,
    receiptsPendingReview,
  };
}

export function copyShoppingItemNames(items: readonly GroceryListItem[]) {
  return [
    ...new Set(
      items
        .filter((item) => item.status === "to_buy")
        .map((item) => item.name.trim())
        .filter(Boolean),
    ),
  ].join("\n");
}

export function mealAvailabilityLabel(status: MealAvailability["status"], missingCount = 0) {
  if (status === "available") {
    return "Available";
  }

  if (status === "partial") {
    return "Partial";
  }

  return missingCount > 0 ? `Missing ${missingCount}` : "Missing items";
}

export function mealSourceLabel(source: GroceryDemandItem["sources"][number]) {
  return `${mealTypeLabels[source.mealType]} ${source.date}`;
}

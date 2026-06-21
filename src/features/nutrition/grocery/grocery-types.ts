import type {
  MealType,
  PlannedMeal,
  Recipe,
} from "../meal-planner/meal-planner-types";

export type GroceryUnit = "g" | "kg" | "ml" | "l" | "piece" | "tbsp" | "tsp";

export type GroceryCategory =
  | "produce"
  | "dairy"
  | "meat_fish"
  | "grains"
  | "pantry"
  | "frozen"
  | "spices"
  | "drinks"
  | "hygiene"
  | "household"
  | "other";

export type InventorySource =
  | "manual"
  | "receipt"
  | "meal_deduction"
  | "grocery_checkoff"
  | "mock";

export type IngredientConfidence = "high" | "medium" | "low";

export type GroceryVisual = {
  imageUrl?: string;
  imageAlt?: string;
};

export type IngredientReference = GroceryVisual & {
  id: string;
  name: string;
  canonicalName: string;
  category: GroceryCategory;
  defaultUnit: GroceryUnit;
};

export type PantryItem = GroceryVisual & {
  id: string;
  ingredientId: string;
  name: string;
  canonicalName: string;
  category: GroceryCategory;
  quantity: number;
  unit: GroceryUnit;
  confidence: IngredientConfidence;
  source: InventorySource;
  updatedAt: string;
  expiresAt?: string;
};

export type GroceryDemandSource = {
  mealId: string;
  recipeId: string;
  recipeTitle: string;
  date: string;
  mealType: MealType;
  quantity: number;
  unit: GroceryUnit;
};

export type GroceryDemandItemSourceType = "meal_plan" | "must_have";

export type GroceryDemandItem = GroceryVisual & {
  id: string;
  ingredientId: string;
  name: string;
  canonicalName: string;
  category: GroceryCategory;
  requiredQuantity: number;
  availableQuantity: number;
  missingQuantity: number;
  unit: GroceryUnit;
  sourceMealIds: string[];
  sourceRecipeIds: string[];
  sourceMustHaveItemIds: string[];
  sourceTypes: GroceryDemandItemSourceType[];
  sources: GroceryDemandSource[];
  status: "covered" | "partial" | "missing";
};

export type GroceryListItem = GroceryVisual & {
  id: string;
  ingredientId: string;
  name: string;
  canonicalName: string;
  category: GroceryCategory;
  quantityToBuy: number;
  unit: GroceryUnit;
  status: "to_buy" | "checked" | "ignored";
  demandStatus: GroceryDemandItem["status"];
  sourceDemandItemIds: string[];
  sourceTypes: GroceryDemandItemSourceType[];
};

export type ReceiptUpload = {
  id: string;
  fileName: string;
  uploadedAt: string;
  status: "pending_review" | "reviewed" | "failed";
  parserMode: "stub" | "manual" | "future_ocr";
};

export type ReceiptLineItem = {
  id: string;
  receiptUploadId: string;
  rawLabel: string;
  matchedIngredientId?: string;
  name: string;
  category: GroceryCategory;
  estimatedQuantity: number;
  unit: GroceryUnit;
  confidence: IngredientConfidence;
  accepted: boolean;
};

export type MustHaveItem = GroceryVisual & {
  id: string;
  ingredientId?: string;
  name: string;
  canonicalName: string;
  category: GroceryCategory;
  desiredQuantity?: number;
  currentQuantity?: number;
  unit?: GroceryUnit;
  priority: "low" | "normal" | "high";
  enabled: boolean;
};

export type MealAvailabilityStatus = "available" | "partial" | "missing";

export type MissingIngredient = {
  ingredientId: string;
  name: string;
  canonicalName: string;
  missingQuantity: number;
  unit: GroceryUnit;
};

export type MealAvailability = {
  id: string;
  plannedMeal: PlannedMeal;
  recipe: Recipe;
  date: string;
  mealType: MealType;
  status: MealAvailabilityStatus;
  coveredIngredientCount: number;
  totalIngredientCount: number;
  missingIngredients: MissingIngredient[];
};

export type GrocerySummary = {
  toBuyItems: number;
  fromMealPlan: number;
  fromMustList: number;
  inStockItems: number;
  receiptsPendingReview: number;
};

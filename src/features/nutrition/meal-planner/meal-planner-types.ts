import type { ContentStateMeta } from "@/features/content-state";
import type { LifeOsProfileId } from "@/features/profile-data/types";

export type MealType = "breakfast" | "lunch" | "dinner";

export type MacroKey = "calories" | "protein" | "carbs" | "fat";

export type NutritionMacroTarget = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type NutritionProfileName =
  | "Normal"
  | "High Protein"
  | "Low Carb"
  | "Cut"
  | "Maintenance";

export type NutritionProfile = {
  id: string;
  name: NutritionProfileName;
  description: string;
  targets: NutritionMacroTarget;
};

export type IngredientUnit = "g" | "ml" | "piece" | "tbsp" | "tsp";

export type RecipeIngredient = {
  id: string;
  name: string;
  amount: number;
  unit: IngredientUnit;
  displayUnit?: string | null;
  note?: string | null;
  position?: number;
  quantity?: number | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type RecipeInstruction = {
  id: string;
  order: number;
  text: string;
};

export type RecipeReadiness =
  | "ready"
  | "needs_macros"
  | "needs_ingredients"
  | "needs_instructions"
  | "draft";

export type Recipe = {
  id: string;
  title: string;
  description?: string;
  mealTypes: MealType[];
  tags: string[];
  defaultServings: number;
  prepMinutes?: number;
  cookMinutes?: number;
  imageUrl?: string;
  imageAlt?: string;
  ingredients: RecipeIngredient[];
  instructions: RecipeInstruction[];
  totals: NutritionMacroTarget;
  createdAt?: string;
  updatedAt?: string;
  archived?: boolean;
};

export type IngredientAdjustment = {
  ingredientId: string;
  amount: number;
};

export type PlannedMeal = {
  id: string;
  recipeId: string;
  mealType: MealType;
  date: string;
  servings: number;
  ingredientAdjustments: IngredientAdjustment[];
};

export type MealPlanSlot = {
  date: string;
  mealType: MealType;
  plannedMeal?: PlannedMeal;
};

export type MealPlanDay = {
  date: string;
  label: string;
  slots: MealPlanSlot[];
};

export type MealPlanWeek = {
  id: string;
  weekStartsOn: string;
  days: MealPlanDay[];
};

export type SelectedMealSlot = {
  date: string;
  mealType: MealType;
};

export type MacroStatusKind = "open" | "close" | "on_target" | "over";

export type MacroStatus = {
  kind: MacroStatusKind;
  label: "Open" | "Close" | "On target" | "Over";
  detail: string;
  percentage: number;
};

export type RecipeFit = {
  label: string;
  detail: string;
  score: number;
  accent: NutritionAccent;
};

export type RecipeFilter =
  | "all"
  | "high-protein"
  | "low-carb"
  | "quick"
  | "meal-prep"
  | "vegetarian";

export type RecipeSort = "best-fit" | "protein" | "calories" | "recent";

export type NutritionAccent =
  | "var(--accent-blue)"
  | "var(--accent-green)"
  | "var(--accent-orange)"
  | "var(--accent-red)"
  | "var(--accent-purple)"
  | "var(--accent-cyan)"
  | "var(--accent-yellow)";

export type MealPlannerViewModel = {
  profileId?: LifeOsProfileId;
  contentStates?: {
    page: ContentStateMeta;
    targetProfile: ContentStateMeta;
    weekPlan: ContentStateMeta;
    inspector: ContentStateMeta;
    recipeSuggestions: ContentStateMeta;
  };
  actionsEnabled?: boolean;
  header: {
    eyebrow: "Life OS / Nutrition / Meal Planner";
    title: "Meal Planner";
    subline: "Plan your week - Breakfast, lunch and dinner";
    weekLabel: string;
  };
  pageContract: {
    pageType: "Workflow / Area Subpage";
    primaryPurpose: string;
    writes: string;
    reads: string;
    canonicalSource: string;
    sensitiveData: "health_sensitive";
    primaryDecision: string;
    mainZone: "Weekly meal matrix";
    emptyState: string;
    mobileOrder: string;
  };
  profiles: readonly NutritionProfile[];
  defaultProfileId: string;
  recipes: readonly Recipe[];
  week: MealPlanWeek;
};

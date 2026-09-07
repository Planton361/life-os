import type { ContentStateMeta } from "@/features/content-state";
import type { LifeOsProfileId } from "@/features/profile-data/types";

export type NutritionAccent =
  | "var(--accent-blue)"
  | "var(--accent-green)"
  | "var(--accent-orange)"
  | "var(--accent-red)"
  | "var(--accent-purple)"
  | "var(--accent-cyan)"
  | "var(--accent-yellow)";

export type NutritionPeriod = "today" | "week" | "month";

export type NutritionMetricType =
  | "calories"
  | "protein"
  | "carbs"
  | "fat"
  | "water";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack" | "other";

export type MealSource = "manual" | "meal_planner" | "recipe" | "imported";

export type NutritionGoalStatus = "on_track" | "open" | "exceeded";

export type NutritionDay = {
  date: string;
  calorie_target: number;
  calorie_actual: number;
  protein_target: number;
  protein_actual: number;
  carbs_target: number;
  carbs_actual: number;
  fat_target: number;
  fat_actual: number;
  water_target: number;
  water_actual: number;
};

export type MealEntry = {
  date?: string;
  id: string;
  meal_type: MealType;
  title: string;
  planned_at?: string;
  consumed_at?: string;
  calories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
  nutritionEstimateAvailable?: boolean;
  availableMacros?: readonly ("calories" | "protein" | "carbs" | "fat")[];
  source: MealSource;
};

export type NutritionGoal = {
  type: NutritionMetricType;
  target: number;
  period: NutritionPeriod;
  status: NutritionGoalStatus;
};

export type NutritionMetricViewModel = {
  type: NutritionMetricType;
  label: string;
  actual: number;
  target: number;
  unit: "kcal" | "g" | "L";
  valueLabel: string;
  meta: string;
  remainingLabel: string;
  percentage: number;
  accent: NutritionAccent;
};

export type NutritionWeekBalanceItem = {
  day: string;
  value: number;
  label: string;
};

export type NutritionAdherenceViewModel = {
  planned: number;
  eaten: number;
  replaced: number;
  open: number;
  statement: string;
};

export type NutritionPriorityViewModel = {
  id: string;
  label: string;
  detail: string;
  actionLabel: string;
  accent: NutritionAccent;
};

export type NutritionWeightTrendViewModel = {
  periodLabel: string;
  statement: string;
  values: readonly number[];
  axisLabel: string;
};

export type NutritionGrocerySignalViewModel = {
  missingCount: number;
  ingredients: readonly string[];
  actionLabel: "View grocery list";
  href: "/nutrition/grocery";
  linkedMealsLabel: string;
};

export type NutritionOverviewViewModel = {
  profileId?: LifeOsProfileId;
  contentStates?: {
    page: ContentStateMeta;
    todayNutrition: ContentStateMeta;
    nextMeal: ContentStateMeta;
    priorities: ContentStateMeta;
    weekBalance: ContentStateMeta;
    adherence: ContentStateMeta;
    hydration: ContentStateMeta;
    recentMeals: ContentStateMeta;
    weightTrend: ContentStateMeta;
    grocerySignal: ContentStateMeta;
  };
  actionsEnabled?: boolean;
  unavailableReason?: string;
  recipeOptions?: readonly {
    id: string;
    title: string;
  }[];
  header: {
    eyebrow: "Life OS / Nutrition";
    title: "Nutrition Overview";
    summary: string;
    dateLabel: string;
    primaryAction: "Log meal";
    secondaryActions: readonly {
      label: string;
      href: "/nutrition/meal-planner" | "/nutrition/grocery";
    }[];
  };
  pageContract: {
    pageType: "Area Overview";
    primaryPurpose: string;
    writes: string;
    reads: string;
    canonicalSource: string;
    sensitiveData: "standard_private" | "health_sensitive";
    mobileOrder: string;
  };
  day: NutritionDay;
  goals: readonly NutritionGoal[];
  meals: readonly MealEntry[];
  weekBalance: readonly NutritionWeekBalanceItem[];
  weekBalanceStatement: string;
  adherence: NutritionAdherenceViewModel;
  priorities: readonly NutritionPriorityViewModel[];
  weightTrend: NutritionWeightTrendViewModel;
  grocerySignal: NutritionGrocerySignalViewModel;
};

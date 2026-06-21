import type {
  MealEntry,
  NutritionAdherenceViewModel,
  NutritionDay,
  NutritionGoal,
  NutritionGrocerySignalViewModel,
  NutritionPriorityViewModel,
  NutritionWeekBalanceItem,
  NutritionWeightTrendViewModel,
} from "./nutrition-types";

export const nutritionDay: NutritionDay = {
  date: "2026-06-21",
  calorie_target: 2250,
  calorie_actual: 1740,
  protein_target: 120,
  protein_actual: 96,
  carbs_target: 240,
  carbs_actual: 188,
  fat_target: 70,
  fat_actual: 48,
  water_target: 2.4,
  water_actual: 1.6,
};

export const mealEntries: readonly MealEntry[] = [
  {
    id: "meal-breakfast-2026-06-21",
    meal_type: "breakfast",
    title: "Skyr + Haferflocken",
    consumed_at: "2026-06-21T08:10:00",
    calories: 420,
    macros: {
      protein: 34,
      carbs: 52,
      fat: 8,
    },
    source: "manual",
  },
  {
    id: "meal-lunch-2026-06-21",
    meal_type: "lunch",
    title: "Reis-Gemuese-Pfanne",
    consumed_at: "2026-06-21T12:25:00",
    calories: 610,
    macros: {
      protein: 24,
      carbs: 82,
      fat: 18,
    },
    source: "recipe",
  },
  {
    id: "meal-snack-2026-06-21",
    meal_type: "snack",
    title: "Protein Shake",
    consumed_at: "2026-06-21T16:20:00",
    calories: 180,
    macros: {
      protein: 28,
      carbs: 8,
      fat: 2,
    },
    source: "manual",
  },
  {
    id: "meal-dinner-2026-06-21",
    meal_type: "dinner",
    title: "Protein Bowl mit Gemuese",
    planned_at: "2026-06-21T19:00:00",
    calories: 510,
    macros: {
      protein: 38,
      carbs: 54,
      fat: 18,
    },
    source: "meal_planner",
  },
];

export const nutritionGoals: readonly NutritionGoal[] = [
  {
    type: "calories",
    target: 2250,
    period: "today",
    status: "on_track",
  },
  {
    type: "protein",
    target: 120,
    period: "today",
    status: "open",
  },
  {
    type: "water",
    target: 2.4,
    period: "today",
    status: "open",
  },
];

export const weekBalance: readonly NutritionWeekBalanceItem[] = [
  { day: "Mo", value: 0.72, label: "72%" },
  { day: "Tu", value: 0.88, label: "88%" },
  { day: "We", value: 0.64, label: "64%" },
  { day: "Th", value: 0.91, label: "91%" },
  { day: "Fr", value: 0.7, label: "70%" },
  { day: "Sa", value: 0.82, label: "82%" },
  { day: "Su", value: 0.77, label: "77%" },
];

export const nutritionAdherence: NutritionAdherenceViewModel = {
  planned: 9,
  eaten: 6,
  replaced: 2,
  open: 1,
  statement:
    "Sachliche Abweichung ohne Bewertung: zwei Mahlzeiten wurden ersetzt, eine ist noch offen.",
};

export const nutritionPriorities: readonly NutritionPriorityViewModel[] = [
  {
    id: "protein",
    label: "Protein",
    detail: "24 g offen - passend zur geplanten Bowl",
    actionLabel: "Review meal",
    accent: "var(--accent-orange)",
  },
  {
    id: "vegetables",
    label: "Vegetables",
    detail: "Heute bisher nur 1 Portion protokolliert",
    actionLabel: "Add side",
    accent: "var(--accent-green)",
  },
  {
    id: "water",
    label: "Water",
    detail: "0.8 L offen - zwei kleine Glaeser reichen",
    actionLabel: "Add 300 ml",
    accent: "var(--accent-blue)",
  },
];

export const weightTrend: NutritionWeightTrendViewModel = {
  periodLabel: "30 days",
  statement:
    "Ruhiger Trend: -0.4 kg in 30 Tagen. Kontext bleibt Ernaehrung + Routine.",
  values: [84.6, 84.5, 84.7, 84.4, 84.34, 84.27, 84.2],
  axisLabel: "84.2 kg · 30-day view",
};

export const grocerySignal: NutritionGrocerySignalViewModel = {
  missingCount: 8,
  ingredients: [
    "Chicken breast",
    "Potatoes",
    "Salmon",
    "Berries",
    "Wraps",
    "Feta",
  ],
  actionLabel: "View grocery list",
  href: "/nutrition/grocery",
  linkedMealsLabel: "6 meals affected - 1 receipt pending",
};

import type {
  AreaId,
  LocalDateString,
  MealId,
  ProfileId,
  RecipeId,
  UserScopedEntity,
} from "./ids";

export const mealTypes = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "other",
] as const;

export type MealType = (typeof mealTypes)[number];
export type NutritionEstimate = Record<string, unknown>;

export type Recipe = UserScopedEntity & {
  id: RecipeId;
  profileId: ProfileId;
  areaId: AreaId | null;
  title: string;
  summary: string | null;
  instructions: string | null;
  servings: number | null;
  prepMinutes: number | null;
  tags: readonly string[];
  nutritionEstimate: NutritionEstimate | null;
  source: string | null;
  isArchived: boolean;
};

export type RecipeIngredient = UserScopedEntity & {
  id: string;
  profileId: ProfileId;
  recipeId: RecipeId;
  name: string;
  quantity: number | null;
  unit: string | null;
  note: string | null;
  position: number;
};

export type Meal = UserScopedEntity & {
  id: MealId;
  profileId: ProfileId;
  recipeId: RecipeId | null;
  date: LocalDateString;
  mealType: MealType;
  title: string;
  plannedAt: string | null;
  completedAt: string | null;
  notes: string | null;
};

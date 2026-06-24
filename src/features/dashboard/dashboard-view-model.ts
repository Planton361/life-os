import { dashboardMockData } from "./mock-data";
import { recipes } from "@/features/nutrition/meal-planner/meal-planner-mock-data";
import type {
  DashboardActivePortfolio,
  DashboardAntiRotActions,
  DashboardChallengesRewardFocus,
  DashboardCommandCenterMeta,
  DashboardDailyControl,
  DashboardHabitTrackers,
  DashboardMeals,
  DashboardMealRecipeOption,
  DashboardNutrientBalance,
  DashboardQuickCapture,
  DashboardRunningRecovery,
  DashboardTodayAgenda,
  DashboardWeightLossGoal,
} from "./types";

const recipeOptions = recipes
  .filter((recipe) => !recipe.archived)
  .map(
    (recipe): DashboardMealRecipeOption => ({
      id: recipe.id,
      title: recipe.title,
      mealTypes: recipe.mealTypes,
      calories: recipe.totals.calories,
      protein: recipe.totals.protein,
      carbs: recipe.totals.carbs,
      fat: recipe.totals.fat,
    }),
  );

export type DashboardCommandCenterViewModel = {
  commandCenter: DashboardCommandCenterMeta;
  quickCapture: DashboardQuickCapture;
  dailyControl: DashboardDailyControl;
};

export type DashboardHealthNutritionViewModel = {
  weightLossGoal: DashboardWeightLossGoal;
  nutrientBalance: DashboardNutrientBalance;
  meals: DashboardMeals;
  runningRecovery: DashboardRunningRecovery;
};

export type DashboardViewModel = {
  commandCenter: DashboardCommandCenterViewModel;
  todayAgenda: DashboardTodayAgenda;
  healthNutrition: DashboardHealthNutritionViewModel;
  habitTrackers: DashboardHabitTrackers;
  activePortfolio: DashboardActivePortfolio;
  antiRotActions: DashboardAntiRotActions;
  challengesRewardFocus: DashboardChallengesRewardFocus;
};

export function getDashboardViewModel(): DashboardViewModel {
  return {
    commandCenter: {
      commandCenter: dashboardMockData.commandCenter,
      quickCapture: dashboardMockData.quickCapture,
      dailyControl: dashboardMockData.dailyControl,
    },
    todayAgenda: dashboardMockData.todayAgenda,
    healthNutrition: {
      weightLossGoal: dashboardMockData.weightLossGoal,
      nutrientBalance: dashboardMockData.nutrientBalance,
      meals: {
        ...dashboardMockData.meals,
        recipeOptions,
      },
      runningRecovery: dashboardMockData.runningRecovery,
    },
    habitTrackers: dashboardMockData.habitTrackers,
    activePortfolio: dashboardMockData.activePortfolio,
    antiRotActions: dashboardMockData.antiRotActions,
    challengesRewardFocus: dashboardMockData.challengesRewardFocus,
  };
}

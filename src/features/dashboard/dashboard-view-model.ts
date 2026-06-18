import { dashboardMockData } from "./mock-data";
import type {
  DashboardActivePortfolio,
  DashboardAntiRotActions,
  DashboardChallengesRewardFocus,
  DashboardCommandCenterMeta,
  DashboardDailyControl,
  DashboardHabitTrackers,
  DashboardMeals,
  DashboardNutrientBalance,
  DashboardQuickCapture,
  DashboardRunningRecovery,
  DashboardTodayAgenda,
  DashboardWeightLossGoal,
} from "./types";

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
      meals: dashboardMockData.meals,
      runningRecovery: dashboardMockData.runningRecovery,
    },
    habitTrackers: dashboardMockData.habitTrackers,
    activePortfolio: dashboardMockData.activePortfolio,
    antiRotActions: dashboardMockData.antiRotActions,
    challengesRewardFocus: dashboardMockData.challengesRewardFocus,
  };
}

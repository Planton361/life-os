import { dashboardMockData } from "./mock-data";
import { recipes } from "@/features/nutrition/meal-planner/meal-planner-mock-data";
import { resolveContentStateMeta } from "@/features/content-state";
import type {
  DashboardActivePortfolio,
  DashboardAntiRotActions,
  DashboardChallengesRewardFocus,
  DashboardCommandCenterMeta,
  DashboardDailyControl,
  DashboardHabitTrackers,
  DashboardMetric,
  DashboardMeals,
  DashboardMealRecipeOption,
  DashboardNutrientBalance,
  DashboardProfileId,
  DashboardQuickCapture,
  DashboardRunningRecovery,
  DashboardTimeProgressRow,
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
  profileId: DashboardProfileId;
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
  profileId: DashboardProfileId;
  commandCenter: DashboardCommandCenterViewModel;
  todayAgenda: DashboardTodayAgenda;
  healthNutrition: DashboardHealthNutritionViewModel;
  habitTrackers: DashboardHabitTrackers;
  activePortfolio: DashboardActivePortfolio;
  antiRotActions: DashboardAntiRotActions;
  challengesRewardFocus: DashboardChallengesRewardFocus;
};

function percentBetween(start: Date, end: Date, now: Date) {
  const total = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();

  if (total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
}

function startOfIsoWeek(date: Date) {
  const next = new Date(date);
  const day = next.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + mondayOffset);

  return next;
}

export function getSystemTimeProgress(now = new Date()): DashboardTimeProgressRow[] {
  const weekStart = startOfIsoWeek(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear() + 1, 0, 1);
  const rows = [
    { label: "Week", progress: percentBetween(weekStart, weekEnd, now) },
    { label: "Month", progress: percentBetween(monthStart, monthEnd, now) },
    { label: "Year", progress: percentBetween(yearStart, yearEnd, now) },
  ];

  return rows.map((row) => ({
    ...row,
    value: `${row.progress}%`,
  }));
}

function berlinHour(now: Date) {
  const hour = new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    hour12: false,
    timeZone: "Europe/Berlin",
  }).format(now);

  return Number(hour);
}

export function getDashboardGreeting(name: string, now = new Date()) {
  const hour = berlinHour(now);
  const period =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return `${period}, ${name}`;
}

export function getDashboardDateLabel(now = new Date()) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "long",
    timeZone: "Europe/Berlin",
    weekday: "long",
  }).format(now);
}

function annotateMetric(metric: DashboardMetric): DashboardMetric {
  return {
    ...metric,
    contentState:
      metric.contentState ??
      resolveContentStateMeta({
        hasHistory: true,
        hasPrimaryValue: true,
        itemCount: 1,
      }),
  };
}

function withDemoContentState(viewModel: DashboardViewModel): DashboardViewModel {
  const commandCenter = viewModel.commandCenter.commandCenter;
  const visibleChallengeCount = viewModel.challengesRewardFocus.items.filter(
    (challenge) => challenge.cadence === "Daily",
  ).length;

  return {
    ...viewModel,
    commandCenter: {
      ...viewModel.commandCenter,
      commandCenter: {
        ...commandCenter,
        contentState: resolveContentStateMeta({
          capacity: commandCenter.metrics.length,
          itemCount: commandCenter.metrics.length,
        }),
        dateLabel: getDashboardDateLabel(),
        greeting: getDashboardGreeting("Anton"),
        metrics: commandCenter.metrics.map(annotateMetric),
        timeProgress: getSystemTimeProgress(),
      },
      dailyControl: {
        ...viewModel.commandCenter.dailyControl,
        contentState: resolveContentStateMeta({
          capacity: 4,
          itemCount: 4,
        }),
      },
      quickCapture: {
        ...viewModel.commandCenter.quickCapture,
        contentState: resolveContentStateMeta({
          capacity: 1,
          itemCount: 1,
        }),
      },
    },
    todayAgenda: {
      ...viewModel.todayAgenda,
      contentState: resolveContentStateMeta({
        capacity: 9,
        itemCount: viewModel.todayAgenda.events.length,
      }),
    },
    healthNutrition: {
      weightLossGoal: {
        ...viewModel.healthNutrition.weightLossGoal,
        contentState: resolveContentStateMeta({
          hasHistory: true,
          hasPrimaryValue: true,
          itemCount: 1,
        }),
      },
      nutrientBalance: {
        ...viewModel.healthNutrition.nutrientBalance,
        contentState: resolveContentStateMeta({
          capacity: 3,
          itemCount: viewModel.healthNutrition.nutrientBalance.items.length,
        }),
      },
      meals: {
        ...viewModel.healthNutrition.meals,
        contentState: resolveContentStateMeta({
          capacity: 3,
          itemCount: viewModel.healthNutrition.meals.items.length,
        }),
        items: viewModel.healthNutrition.meals.items.map((meal) => ({
          ...meal,
          state: meal.state ?? "planned",
        })),
      },
      runningRecovery: {
        ...viewModel.healthNutrition.runningRecovery,
        contentState: resolveContentStateMeta({
          hasHistory: true,
          hasPrimaryValue: true,
          itemCount: 1,
        }),
      },
    },
    habitTrackers: {
      ...viewModel.habitTrackers,
      contentState: resolveContentStateMeta({
        capacity: 8,
        itemCount:
          viewModel.habitTrackers.habitsByWindow[
            viewModel.habitTrackers.activeWindow
          ].length,
      }),
    },
    activePortfolio: {
      ...viewModel.activePortfolio,
      contentState: resolveContentStateMeta({
        capacity: 4,
        itemCount: Math.min(4, viewModel.activePortfolio.items.length),
      }),
    },
    antiRotActions: {
      ...viewModel.antiRotActions,
      contentState: resolveContentStateMeta({
        capacity: viewModel.antiRotActions.actions.length,
        itemCount: viewModel.antiRotActions.actions.length,
      }),
    },
    challengesRewardFocus: {
      ...viewModel.challengesRewardFocus,
      contentState: resolveContentStateMeta({
        capacity: 3,
        itemCount: visibleChallengeCount,
      }),
    },
  };
}

export function getDashboardViewModel(): DashboardViewModel {
  return withDemoContentState({
    profileId: "demo",
    commandCenter: {
      profileId: "demo",
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
  });
}

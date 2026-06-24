import {
  grocerySignal,
  mealEntries,
  nutritionAdherence,
  nutritionDay,
  nutritionGoals,
  nutritionPriorities,
  weekBalance,
  weightTrend,
} from "./nutrition-mock-data";
import type {
  NutritionDay,
  NutritionMetricType,
  NutritionMetricViewModel,
  NutritionOverviewViewModel,
} from "./nutrition-types";

function clampPercentage(actual: number, target: number) {
  if (target <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((actual / target) * 100));
}

function formatNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(value);
}

function metricValue(day: NutritionDay, type: NutritionMetricType) {
  if (type === "calories") {
    return {
      actual: day.calorie_actual,
      target: day.calorie_target,
      unit: "kcal" as const,
    };
  }

  if (type === "protein") {
    return {
      actual: day.protein_actual,
      target: day.protein_target,
      unit: "g" as const,
    };
  }

  if (type === "carbs") {
    return {
      actual: day.carbs_actual,
      target: day.carbs_target,
      unit: "g" as const,
    };
  }

  if (type === "fat") {
    return {
      actual: day.fat_actual,
      target: day.fat_target,
      unit: "g" as const,
    };
  }

  return {
    actual: day.water_actual,
    target: day.water_target,
    unit: "L" as const,
  };
}

export function buildNutritionMetrics(
  day: NutritionDay,
): NutritionMetricViewModel[] {
  const metricMeta: Record<
    NutritionMetricType,
    {
      label: string;
      accent: NutritionMetricViewModel["accent"];
      precision: number;
    }
  > = {
    calories: {
      label: "Energy",
      accent: "var(--accent-yellow)",
      precision: 0,
    },
    protein: {
      label: "Protein",
      accent: "var(--accent-orange)",
      precision: 0,
    },
    carbs: {
      label: "Carbs",
      accent: "var(--accent-cyan)",
      precision: 0,
    },
    fat: {
      label: "Fat",
      accent: "var(--accent-purple)",
      precision: 0,
    },
    water: {
      label: "Hydration",
      accent: "var(--accent-blue)",
      precision: 1,
    },
  };

  return (["calories", "protein", "carbs", "fat", "water"] as const).map(
    (type) => {
      const value = metricValue(day, type);
      const meta = metricMeta[type];
      const remaining = Math.max(0, value.target - value.actual);
      const actual = formatNumber(value.actual, meta.precision);
      const target = formatNumber(value.target, meta.precision);
      const remainingValue = formatNumber(remaining, meta.precision);
      const percentage = clampPercentage(value.actual, value.target);

      return {
        type,
        label: meta.label,
        actual: value.actual,
        target: value.target,
        unit: value.unit,
        valueLabel: `${actual} / ${target} ${value.unit}`,
        meta: `${percentage}% complete · ${remainingValue} ${value.unit} left`,
        remainingLabel: `${remainingValue} ${value.unit} left`,
        percentage,
        accent: meta.accent,
      };
    },
  );
}

export function getNutritionOverviewViewModel(): NutritionOverviewViewModel {
  return {
    header: {
      eyebrow: "Life OS / Nutrition",
      title: "Nutrition Overview",
      summary:
        "Today · 21 Jun 2026 · Ernährungskontext, Planung und nächste Handlung",
      dateLabel: "Today · 21 Jun 2026",
      primaryAction: "Log meal",
      secondaryActions: [
        {
          label: "Open meal planner",
          href: "/nutrition/meal-planner",
        },
        {
          label: "View grocery list",
          href: "/nutrition/grocery",
        },
      ],
    },
    pageContract: {
      pageType: "Area Overview",
      primaryPurpose:
        "Make today's nutrition status and the next useful action clear.",
      writes: "local UI state only in Phase 2",
      reads:
        "Mock views for daily_records, meals, recipes, grocery_items and nutrition goals.",
      canonicalSource:
        "Future canonical nutrition entities; this page projects typed mock data.",
      sensitiveData: "standard_private",
      mobileOrder:
        "Header, Today Nutrition, Next Meal, Nutrition Priorities, Week Balance, Hydration, Recent Meals, Weight Trend, Grocery Signal.",
    },
    day: nutritionDay,
    goals: nutritionGoals,
    meals: mealEntries,
    weekBalance,
    weekBalanceStatement:
      "Protein-Ziel an 4/7 Tagen erreicht; Wasser war die häufigste Lücke.",
    adherence: nutritionAdherence,
    priorities: nutritionPriorities,
    weightTrend,
    grocerySignal,
  };
}

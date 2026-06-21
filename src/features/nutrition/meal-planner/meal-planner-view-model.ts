import {
  mealPlanWeek,
  nutritionProfiles,
  recipes,
} from "./meal-planner-mock-data";
import { formatWeekRange } from "./meal-planner-utils";
import type { MealPlannerViewModel } from "./meal-planner-types";

export function getMealPlannerViewModel(): MealPlannerViewModel {
  return {
    header: {
      eyebrow: "Life OS / Nutrition / Meal Planner",
      title: "Meal Planner",
      subline: "Plan your week - Breakfast, lunch and dinner",
      weekLabel: formatWeekRange(mealPlanWeek),
    },
    pageContract: {
      pageType: "Workflow / Area Subpage",
      primaryPurpose:
        "Plan breakfast, lunch and dinner across the week while checking daily macro targets.",
      writes: "local UI state only in Phase 2",
      reads:
        "Typed mock recipes, meal plan slots and nutrition target profiles.",
      canonicalSource:
        "Future meals, recipes, grocery_items and Nutrition Settings entities.",
      sensitiveData: "health_sensitive",
      primaryDecision:
        "Which recipe belongs in the selected slot, and whether the day stays close to target.",
      mainZone: "Weekly meal matrix",
      emptyState:
        "Select a meal slot to plan breakfast, lunch or dinner.",
      mobileOrder:
        "Header, target profile, day switcher, selected day slots, inspector, recipe suggestions.",
    },
    profiles: nutritionProfiles,
    defaultProfileId: "normal",
    recipes,
    week: mealPlanWeek,
  };
}

import {
  mealPlanWeek,
  recipes,
} from "../meal-planner/meal-planner-mock-data";
import { formatWeekRange } from "../meal-planner/meal-planner-utils";
import {
  initialMustHaveItems,
  initialPantryItems,
  initialReceiptLineItems,
  initialReceiptUploads,
} from "./grocery-mock-data";
import {
  aggregateWeeklyIngredientDemand,
  createGroceryListFromDemand,
  createMustHaveDemand,
  matchDemandWithPantry,
  mergeShoppingDemand,
  summarizeGrocery,
} from "./grocery-utils";
import type {
  GroceryDemandItem,
  GrocerySummary,
  MustHaveItem,
  PantryItem,
  ReceiptLineItem,
  ReceiptUpload,
} from "./grocery-types";
import type { MealPlanWeek, Recipe } from "../meal-planner/meal-planner-types";

export type GroceryViewModel = {
  header: {
    eyebrow: "Life OS / Nutrition / Grocery";
    title: "Grocery";
    subline: "Plan shopping from meal plans, must-have items and pantry estimates.";
    weekLabel: string;
  };
  pageContract: {
    pageType: "Workflow / Area Subpage";
    primaryPurpose: string;
    writes: "local UI state only in Phase 2";
    reads: string;
    canonicalSource: string;
    sensitiveData: "health_sensitive";
    primaryDecision: string;
    mainZone: "To buy and in stock workbench";
    emptyState: string;
    mobileOrder: string;
  };
  week: MealPlanWeek;
  recipes: readonly Recipe[];
  pantryItems: readonly PantryItem[];
  mustHaveItems: readonly MustHaveItem[];
  receiptUploads: readonly ReceiptUpload[];
  receiptLineItems: readonly ReceiptLineItem[];
  initialDemand: readonly GroceryDemandItem[];
  summary: GrocerySummary;
};

export function getGroceryViewModel(): GroceryViewModel {
  const mealPlanDemand = matchDemandWithPantry(
    aggregateWeeklyIngredientDemand(mealPlanWeek, recipes),
    initialPantryItems,
  );
  const mustHaveDemand = createMustHaveDemand(
    initialMustHaveItems,
    initialPantryItems,
  );
  const initialDemand = mergeShoppingDemand(mealPlanDemand, mustHaveDemand);
  const groceryItems = createGroceryListFromDemand(initialDemand);
  const receiptsPendingReview = initialReceiptUploads.filter(
    (receipt) => receipt.status === "pending_review",
  ).length;

  return {
    header: {
      eyebrow: "Life OS / Nutrition / Grocery",
      title: "Grocery",
      subline:
        "Plan shopping from meal plans, must-have items and pantry estimates.",
      weekLabel: formatWeekRange(mealPlanWeek),
    },
    pageContract: {
      pageType: "Workflow / Area Subpage",
      primaryPurpose:
        "Turn planned meals, always-stock items and estimated pantry stock into a weekly shopping workflow.",
      writes: "local UI state only in Phase 2",
      reads: "shared meal planner recipes, planned meals, must-have mock data, pantry mock data and receipt stubs",
      canonicalSource:
        "Future recipes, meals, grocery_items, pantry_items, must_have_items and receipt records.",
      sensitiveData: "health_sensitive",
      primaryDecision:
        "Which items still need to be bought, and which items are already in stock.",
      mainZone: "To buy and in stock workbench",
      emptyState:
        "Plan meals or add pantry stock to calculate weekly shopping demand.",
      mobileOrder:
        "Header, summary, to buy, in stock, must-list management, receipt inbox.",
    },
    week: mealPlanWeek,
    recipes,
    pantryItems: initialPantryItems,
    mustHaveItems: initialMustHaveItems,
    receiptUploads: initialReceiptUploads,
    receiptLineItems: initialReceiptLineItems,
    initialDemand,
    summary: summarizeGrocery(groceryItems, initialPantryItems, receiptsPendingReview),
  };
}

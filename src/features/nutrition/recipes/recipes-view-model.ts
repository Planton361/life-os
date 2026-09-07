import type { ContentStateMeta } from "@/features/content-state";
import type { LifeOsProfileId } from "@/features/profile-data/types";
import type { Recipe } from "../meal-planner/meal-planner-types";
import { recipes } from "../meal-planner/meal-planner-mock-data";
import { summarizeRecipes, type RecipeStats } from "./recipe-utils";

export type RecipesViewModel = {
  profileId?: LifeOsProfileId;
  contentStates?: {
    page: ContentStateMeta;
    summary: ContentStateMeta;
    browser: ContentStateMeta;
    selectedRecipe: ContentStateMeta;
  };
  actionsEnabled?: boolean;
  unavailableReason?: string;
  header: {
    eyebrow: "Life OS / Nutrition / Recipes";
    title: "Recipes";
    subline: "Reusable meal definitions for meal planning and grocery signals.";
  };
  pageContract: {
    pageType: "Entity Workbench";
    primaryPurpose: string;
    writes: string;
    reads: string;
    canonicalSource: string;
    sensitiveData: "health_sensitive";
    primaryDecision: string;
    mainZone: "Recipe browser and selected recipe inspector";
    emptyState: string;
    mobileOrder: string;
  };
  recipes: readonly Recipe[];
  stats: RecipeStats;
};

export function getRecipesViewModel(): RecipesViewModel {
  return {
    header: {
      eyebrow: "Life OS / Nutrition / Recipes",
      title: "Recipes",
      subline: "Reusable meal definitions for meal planning and grocery signals.",
    },
    pageContract: {
      pageType: "Entity Workbench",
      primaryPurpose:
        "Maintain recipes that can be reused by the meal planner and grocery signals.",
      writes: "local UI state only in Phase 2",
      reads: "shared meal planner recipe mock data",
      canonicalSource: "src/features/nutrition/meal-planner/meal-planner-mock-data.ts",
      sensitiveData: "health_sensitive",
      primaryDecision: "Whether a recipe is ready for planner suggestions.",
      mainZone: "Recipe browser and selected recipe inspector",
      emptyState: "No active recipes match the current filters.",
      mobileOrder:
        "Header, summary, filters, recipe cards, selected recipe detail, editor dialog.",
    },
    recipes,
    stats: summarizeRecipes(recipes),
  };
}

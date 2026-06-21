import type { Metadata } from "next";
import { RecipesView, getRecipesViewModel } from "@/features/nutrition/recipes";

export const metadata: Metadata = {
  title: "Recipes | Life OS",
  description:
    "Recipe workbench for reusable meal definitions, macros, ingredients and planner readiness.",
};

export default function RecipesPage() {
  const viewModel = getRecipesViewModel();

  return <RecipesView viewModel={viewModel} />;
}

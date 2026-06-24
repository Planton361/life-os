import type { Metadata } from "next";
import { getRecipesViewModel } from "@/features/profile-data";

export const metadata: Metadata = {
  title: "Recipes | Life OS",
  description:
    "Recipe workbench for reusable meal definitions, macros, ingredients and planner readiness.",
};

export default async function RecipesPage() {
  const { RecipesView } =
    await import("@/features/nutrition/recipes");
  const viewModel = await getRecipesViewModel();

  return <RecipesView viewModel={viewModel} />;
}

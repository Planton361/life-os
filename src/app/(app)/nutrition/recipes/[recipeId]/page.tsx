import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRecipesViewModel } from "@/features/profile-data";
import { RecipesView } from "@/features/nutrition/recipes";

export const metadata: Metadata = {
  title: "Recipe Detail | Life OS",
};

export default async function RecipeDetailPage({
  params,
}: Readonly<{
  params: Promise<{ recipeId: string }>;
}>) {
  const { recipeId } = await params;

  const viewModel = await getRecipesViewModel();
  if (!viewModel.recipes.some(recipe => recipe.id === recipeId && !recipe.archived)) notFound();
  return <RecipesView viewModel={viewModel} initialRecipeId={recipeId} />;
}

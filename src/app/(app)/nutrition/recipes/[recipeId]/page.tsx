import type { Metadata } from "next";
import { DetailStubPage } from "@/components/layout/detail-stub-page";

export const metadata: Metadata = {
  title: "Recipe Detail | Life OS",
};

export default async function RecipeDetailPage({
  params,
}: Readonly<{
  params: Promise<{ recipeId: string }>;
}>) {
  const { recipeId } = await params;

  return (
    <DetailStubPage
      accent="var(--accent-yellow)"
      dataSource="recipes plus planned meals, macro targets, ingredients, and grocery links."
      entityId={recipeId}
      entityLabel="Recipe"
      summary="Minimal recipe detail target for Meals Today links."
      title="Recipe Detail"
    />
  );
}

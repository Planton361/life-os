import { getNutritionOverviewViewModel } from "@/features/profile-data";

export const metadata = {
  title: "Nutrition Overview | Life OS",
  description:
    "Area dashboard for today's nutrition status, next meal action, hydration, meal plan adherence and grocery signal.",
};

export default async function NutritionPage() {
  const { NutritionOverviewPage } =
    await import("@/features/nutrition");
  const viewModel = await getNutritionOverviewViewModel();

  return <NutritionOverviewPage viewModel={viewModel} />;
}

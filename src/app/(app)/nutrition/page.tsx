import {
  NutritionOverviewPage,
  getNutritionOverviewViewModel,
} from "@/features/nutrition";

export const metadata = {
  title: "Nutrition Overview | Life OS",
  description:
    "Area dashboard for today's nutrition status, next meal action, hydration, meal plan adherence and grocery signal.",
};

export default function NutritionPage() {
  const viewModel = getNutritionOverviewViewModel();

  return <NutritionOverviewPage viewModel={viewModel} />;
}

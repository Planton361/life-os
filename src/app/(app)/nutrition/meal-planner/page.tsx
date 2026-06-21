import type { Metadata } from "next";
import { MealPlannerView } from "@/features/nutrition/meal-planner/meal-planner-view";
import { getMealPlannerViewModel } from "@/features/nutrition/meal-planner/meal-planner-view-model";

export const metadata: Metadata = {
  title: "Meal Planner | Life OS",
  description:
    "Weekly breakfast, lunch and dinner planner with local recipe suggestions and macro targets.",
};

export default function MealPlannerPage() {
  const viewModel = getMealPlannerViewModel();

  return <MealPlannerView viewModel={viewModel} />;
}

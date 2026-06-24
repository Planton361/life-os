import type { Metadata } from "next";
import { getMealPlannerViewModel } from "@/features/profile-data";

export const metadata: Metadata = {
  title: "Meal Planner | Life OS",
  description:
    "Weekly breakfast, lunch and dinner planner with local recipe suggestions and macro targets.",
};

export default async function MealPlannerPage() {
  const { MealPlannerView } =
    await import("@/features/nutrition/meal-planner/meal-planner-view");
  const viewModel = await getMealPlannerViewModel();

  return <MealPlannerView viewModel={viewModel} />;
}

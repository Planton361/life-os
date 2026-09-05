import type { Metadata } from "next";
import { getMealPlannerViewModel } from "@/features/profile-data";

export const metadata: Metadata = {
  title: "Meal Planner | Life OS",
  description:
    "Weekly breakfast, lunch and dinner planner with local recipe suggestions and macro targets.",
};

export default async function MealPlannerPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ slot?: string }> }>) {
  const { MealPlannerView } =
    await import("@/features/nutrition/meal-planner/meal-planner-view");
  const viewModel = await getMealPlannerViewModel();
  const slot = (await searchParams).slot;
  const mealType = slot === "breakfast" || slot === "lunch" || slot === "dinner" ? slot : null;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" });
  const day = viewModel.week.days.find((candidate) => candidate.date === today) ?? viewModel.week.days[0];

  return <MealPlannerView initialSelectedSlot={mealType && day ? { date: day.date, mealType } : null} viewModel={viewModel} />;
}

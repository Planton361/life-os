import type { Metadata } from "next";
import { getHabitsAnalyticsViewModel } from "@/features/profile-data";

export default async function HabitsPage() {
  const { HabitsAnalyticsPage } =
    await import("@/features/health/habits/components/habits-analytics-page");
  const viewModel = await getHabitsAnalyticsViewModel();

  return <HabitsAnalyticsPage viewModel={viewModel} />;
}

export const metadata: Metadata = {
  title: "Habits | Life OS",
  description:
    "Habits V1 analytics detail page for rhythm, consistency and repair patterns.",
};

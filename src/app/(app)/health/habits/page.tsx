import type { Metadata } from "next";
import { HabitsAnalyticsPage } from "@/features/health/habits/components/habits-analytics-page";
import { getHabitsAnalyticsViewModel } from "@/features/health/habits/habits-view-model";

export default function HabitsPage() {
  const viewModel = getHabitsAnalyticsViewModel();

  return <HabitsAnalyticsPage viewModel={viewModel} />;
}

export const metadata: Metadata = {
  title: "Habits | Life OS",
  description:
    "Habits V1 analytics detail page for rhythm, consistency and repair patterns.",
};

import type { Metadata } from "next";
import { getHabitsAnalyticsViewModel } from "@/features/profile-data";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { getHabitTrackingPageData } from "@/features/health/habits/habit-tracking-data";
import { HabitTrackingPage } from "@/features/health/habits/components/habit-tracking-page";

export const dynamic = "force-dynamic";

export default async function HabitsPage({ searchParams }: Readonly<{ searchParams: Promise<{ habit?: string | string[]; selected?: string; period?: string }> }>) {
  if ((await getCurrentLifeOsProfileId()) !== "demo") {
    const {habit, selected, period} = await searchParams;
    return <HabitTrackingPage selected={selected} period={period} data={await getHabitTrackingPageData()} feedback={Array.isArray(habit) ? habit[0] : habit} />;
  }
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

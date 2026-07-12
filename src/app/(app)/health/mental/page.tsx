import type { Metadata } from "next";
import { getMentalHealthViewModel } from "@/features/profile-data";
import { MentalHealthActionLandingPage } from "@/features/health/mental-health-page";
import { getHealthTrackingData } from "@/features/health/health-tracking";
import { MoodHistoryPanel, SleepTrackingPanel } from "@/features/health/components/health-tracking-panel";

export const metadata: Metadata = {
  title: "Mental Health | Life OS",
  description:
    "Self-checks, mood patterns and repair routines for Health & Fitness.",
};

export default async function MentalHealthPage({ searchParams }: { searchParams: Promise<{ health?: string }> }) {
  const [viewModel, tracking, params] = await Promise.all([getMentalHealthViewModel(), getHealthTrackingData(), searchParams]);

  return <><MentalHealthActionLandingPage viewModel={viewModel} /><div className="mx-auto mt-2 grid w-full max-w-[2208px] gap-2"><MoodHistoryPanel data={tracking} /><SleepTrackingPanel data={tracking} status={params.health} /></div></>;
}

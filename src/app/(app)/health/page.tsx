import type { Metadata } from "next";
import { getHealthOverviewViewModel } from "@/features/profile-data";
import { getHealthTrackingData } from "@/features/health/health-tracking";
import { WeightTrackingPanel } from "@/features/health/components/health-tracking-panel";

export const metadata: Metadata = {
  title: "Health & Fitness | Life OS",
  description:
    "Area overview for mental health, habits, running and strength signals.",
};

export default async function HealthPage({ searchParams }: { searchParams: Promise<{ health?: string }> }) {
  const { HealthOverviewPage } =
    await import("@/features/health");
  const [viewModel, tracking, params] = await Promise.all([getHealthOverviewViewModel(), getHealthTrackingData(), searchParams]);

  return <><HealthOverviewPage viewModel={viewModel} /><div className="mx-auto mt-2 w-full max-w-[2208px]"><WeightTrackingPanel data={tracking} status={params.health} /></div></>;
}

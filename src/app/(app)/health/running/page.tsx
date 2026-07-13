import type { Metadata } from "next";
import { getRunningTrackerViewModel } from "@/features/profile-data";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { getTrainingPageData } from "@/features/health/training-data";
import { RunningManagementPage } from "@/features/health/training-management-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Running Tracker | Life OS",
  description:
    "Beginner running planner and quiet analytics detail page for Life OS.",
};

export default async function RunningPage({ searchParams }: { searchParams: Promise<{ training?: string | string[] }> }) {
  if ((await getCurrentLifeOsProfileId()) === "manual") {
    const data = await getTrainingPageData();
    const training = (await searchParams).training;
    return <RunningManagementPage feedback={Array.isArray(training) ? training[0] : training} links={data.scheduleLinks} mode={data.mode === "manual" ? "manual" : "auth-blocked"} snapshot={data.snapshot}/>;
  }
  const { RunningTrackerPage } =
    await import("@/features/health/running");
  const viewModel = await getRunningTrackerViewModel();

  return <RunningTrackerPage viewModel={viewModel} />;
}

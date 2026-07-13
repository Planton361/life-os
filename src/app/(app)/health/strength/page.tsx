import type { Metadata } from "next";
import { getStrengthTrackerViewModel } from "@/features/profile-data";
import { getCurrentLifeOsProfileId } from "@/features/profile-data/profile-cookie";
import { getTrainingPageData } from "@/features/health/training-data";
import { StrengthManagementPage } from "@/features/health/training-management-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Strength Tracker | Life OS",
  description:
    "Beginner strength planner and quiet progression context for Life OS.",
};

export default async function StrengthPage({ searchParams }: { searchParams: Promise<{ training?: string | string[] }> }) {
  if ((await getCurrentLifeOsProfileId()) === "manual") {
    const data = await getTrainingPageData();
    const training = (await searchParams).training;
    return <StrengthManagementPage feedback={Array.isArray(training) ? training[0] : training} links={data.scheduleLinks} mode={data.mode === "manual" ? "manual" : "auth-blocked"} snapshot={data.snapshot}/>;
  }
  const { StrengthTrackerPage } =
    await import("@/features/health/strength-tracker");
  const viewModel = await getStrengthTrackerViewModel();

  return <StrengthTrackerPage viewModel={viewModel} />;
}

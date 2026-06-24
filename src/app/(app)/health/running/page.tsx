import type { Metadata } from "next";
import { getRunningTrackerViewModel } from "@/features/profile-data";

export const metadata: Metadata = {
  title: "Running Tracker | Life OS",
  description:
    "Beginner running planner and quiet analytics detail page for Life OS.",
};

export default async function RunningPage() {
  const { RunningTrackerPage } =
    await import("@/features/health/running");
  const viewModel = await getRunningTrackerViewModel();

  return <RunningTrackerPage viewModel={viewModel} />;
}

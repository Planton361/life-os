import type { Metadata } from "next";
import {
  RunningTrackerPage,
  getRunningTrackerViewModel,
} from "@/features/health/running";

export const metadata: Metadata = {
  title: "Running Tracker | Life OS",
  description:
    "Beginner running planner and quiet analytics detail page for Life OS.",
};

export default function RunningPage() {
  const viewModel = getRunningTrackerViewModel();

  return <RunningTrackerPage viewModel={viewModel} />;
}

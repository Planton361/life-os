import type { Metadata } from "next";
import { getStrengthTrackerViewModel } from "@/features/profile-data";

export const metadata: Metadata = {
  title: "Strength Tracker | Life OS",
  description:
    "Beginner strength planner and quiet progression context for Life OS.",
};

export default async function StrengthPage() {
  const { StrengthTrackerPage } =
    await import("@/features/health/strength-tracker");
  const viewModel = await getStrengthTrackerViewModel();

  return <StrengthTrackerPage viewModel={viewModel} />;
}

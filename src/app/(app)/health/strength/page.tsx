import type { Metadata } from "next";
import {
  StrengthTrackerPage,
  getStrengthTrackerViewModel,
} from "@/features/health/strength-tracker";

export const metadata: Metadata = {
  title: "Strength Tracker | Life OS",
  description:
    "Beginner strength planner and quiet progression context for Life OS.",
};

export default function StrengthPage() {
  const viewModel = getStrengthTrackerViewModel();

  return <StrengthTrackerPage viewModel={viewModel} />;
}

import type { Metadata } from "next";
import { MentalHealthActionLandingPage } from "@/features/health/mental-health-page";
import { getMentalHealthViewModel } from "@/features/health/mental-health-view-model";

export const metadata: Metadata = {
  title: "Mental Health | Life OS",
  description:
    "Self-checks, mood patterns and repair routines for Health & Fitness.",
};

export default function MentalHealthPage() {
  const viewModel = getMentalHealthViewModel();

  return <MentalHealthActionLandingPage viewModel={viewModel} />;
}

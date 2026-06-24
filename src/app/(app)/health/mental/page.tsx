import type { Metadata } from "next";
import { getMentalHealthViewModel } from "@/features/profile-data";
import { MentalHealthActionLandingPage } from "@/features/health/mental-health-page";

export const metadata: Metadata = {
  title: "Mental Health | Life OS",
  description:
    "Self-checks, mood patterns and repair routines for Health & Fitness.",
};

export default async function MentalHealthPage() {
  const viewModel = await getMentalHealthViewModel();

  return <MentalHealthActionLandingPage viewModel={viewModel} />;
}

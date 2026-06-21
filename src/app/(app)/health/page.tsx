import type { Metadata } from "next";
import {
  HealthOverviewPage,
  getHealthOverviewViewModel,
} from "@/features/health";

export const metadata: Metadata = {
  title: "Health & Fitness | Life OS",
  description:
    "Area overview for mental health, habits, running and strength signals.",
};

export default function HealthPage() {
  const viewModel = getHealthOverviewViewModel();

  return <HealthOverviewPage viewModel={viewModel} />;
}

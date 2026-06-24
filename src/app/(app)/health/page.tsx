import type { Metadata } from "next";
import { getHealthOverviewViewModel } from "@/features/profile-data";

export const metadata: Metadata = {
  title: "Health & Fitness | Life OS",
  description:
    "Area overview for mental health, habits, running and strength signals.",
};

export default async function HealthPage() {
  const { HealthOverviewPage } =
    await import("@/features/health");
  const viewModel = await getHealthOverviewViewModel();

  return <HealthOverviewPage viewModel={viewModel} />;
}

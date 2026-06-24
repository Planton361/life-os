import type { Metadata } from "next";
import { getWorkOverviewViewModel } from "@/features/profile-data";

export const metadata: Metadata = {
  title: "Work Overview | Life OS",
  description:
    "Work log, outcomes, architecture context and wiki lookup for personal work context.",
};

export default async function WorkPage() {
  const { WorkOverviewPage } =
    await import("@/features/work");

  return <WorkOverviewPage viewModel={await getWorkOverviewViewModel()} />;
}

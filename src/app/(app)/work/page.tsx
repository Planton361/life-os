import type { Metadata } from "next";
import { getWorkOverviewViewModel, WorkOverviewPage } from "@/features/work";

export const metadata: Metadata = {
  title: "Work Overview | Life OS",
  description:
    "Work log, outcomes, architecture context and wiki lookup for personal work context.",
};

export default function WorkPage() {
  return <WorkOverviewPage viewModel={getWorkOverviewViewModel()} />;
}

import type { Metadata } from "next";
import { getWorkLogViewModel, WorkLogPage } from "@/features/work";

export const metadata: Metadata = {
  title: "Work Log | Life OS",
  description:
    "Tasks, activities, outcomes and local work notes for personal work context.",
};

export default function WorkLogRoute() {
  return <WorkLogPage viewModel={getWorkLogViewModel()} />;
}

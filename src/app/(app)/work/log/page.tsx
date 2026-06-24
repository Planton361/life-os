import type { Metadata } from "next";
import { getWorkLogViewModel } from "@/features/profile-data";

export const metadata: Metadata = {
  title: "Work Log | Life OS",
  description:
    "Tasks, activities, outcomes and local work notes for personal work context.",
};

export default async function WorkLogRoute() {
  const { WorkLogPage } = await import("@/features/work");

  return <WorkLogPage viewModel={await getWorkLogViewModel()} />;
}

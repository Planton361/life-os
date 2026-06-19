import type { Metadata } from "next";
import { TodayMemoryLogPage, getTodayViewModel } from "@/features/today";

export const metadata: Metadata = {
  title: "Today | Life OS",
};

export default function TodayPage() {
  const viewModel = getTodayViewModel();

  return <TodayMemoryLogPage viewModel={viewModel} />;
}

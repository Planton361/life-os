import type { Metadata } from "next";
import { TodayMemoryLogPage } from "@/features/today";
import { getTodayViewModel } from "@/features/profile-data";

export const metadata: Metadata = {
  title: "Today | Life OS",
};

export default async function TodayPage() {
  const viewModel = await getTodayViewModel();

  return <TodayMemoryLogPage viewModel={viewModel} />;
}

import type { Metadata } from "next";
import { getCodingOverviewViewModel } from "@/features/profile-data";

export const metadata: Metadata = {
  title: "Coding Overview | Life OS",
  description:
    "Area dashboard for coding focus, repository attention, agent reviews, recent sessions and technical knowledge.",
};

export default async function CodingPage() {
  const { CodingOverviewPage } =
    await import("@/features/coding");
  const viewModel = await getCodingOverviewViewModel();

  return <CodingOverviewPage viewModel={viewModel} />;
}

import type { Metadata } from "next";
import {
  CodingOverviewPage,
  getCodingOverviewViewModel,
} from "@/features/coding";

export const metadata: Metadata = {
  title: "Coding Overview | Life OS",
  description:
    "Area dashboard for coding focus, repository attention, agent reviews, recent sessions and technical knowledge.",
};

export default function CodingPage() {
  const viewModel = getCodingOverviewViewModel();

  return <CodingOverviewPage viewModel={viewModel} />;
}

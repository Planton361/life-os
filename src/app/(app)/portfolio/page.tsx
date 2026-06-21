import type { Metadata } from "next";
import { Suspense } from "react";
import {
  PortfolioPage as PortfolioWorkbenchPage,
  getPortfolioViewModel,
} from "@/features/portfolio";

export const metadata: Metadata = {
  title: "Portfolio | Life OS",
  description:
    "Active workbench for tasks, projects, goals and skills in context.",
};

export default function PortfolioPage() {
  const viewModel = getPortfolioViewModel();

  return (
    <Suspense fallback={null}>
      <PortfolioWorkbenchPage viewModel={viewModel} />
    </Suspense>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { PortfolioPage as PortfolioWorkbenchPage } from "@/features/portfolio";
import { getPortfolioViewModel } from "@/features/profile-data";

export const metadata: Metadata = {
  title: "Portfolio | Life OS",
  description:
    "Active workbench for tasks, projects, goals and skills in context.",
};

export default async function PortfolioPage() {
  const viewModel = await getPortfolioViewModel();

  return (
    <Suspense fallback={null}>
      <PortfolioWorkbenchPage viewModel={viewModel} />
    </Suspense>
  );
}

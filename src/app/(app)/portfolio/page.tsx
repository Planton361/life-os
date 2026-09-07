import type { Metadata } from "next";
import { Suspense } from "react";
import { PortfolioPage as PortfolioWorkbenchPage } from "@/features/portfolio";
import { getPortfolioViewModel } from "@/features/profile-data";
import { ManualDbAuthNotice } from "@/features/real-data/manual-db-auth-notice";

export const metadata: Metadata = {
  title: "Portfolio | Life OS",
  description:
    "Active workbench for tasks, projects, goals and skills in context.",
};

export default async function PortfolioPage() {
  const viewModel = await getPortfolioViewModel();

  return (
    <div className="flex min-h-0 flex-col xl:h-full" id="portfolio-workspace">
      <div className="w-full shrink-0 [&:not(:empty)]:mb-3">
        <ManualDbAuthNotice />
      </div>
      <Suspense fallback={null}>
        <PortfolioWorkbenchPage viewModel={viewModel} />
      </Suspense>
    </div>
  );
}

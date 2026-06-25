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
    <>
      <div className="mx-auto mb-3 w-full max-w-[2208px]">
        <ManualDbAuthNotice />
      </div>
      <Suspense fallback={null}>
        <PortfolioWorkbenchPage viewModel={viewModel} />
      </Suspense>
    </>
  );
}

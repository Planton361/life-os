import { Pill } from "@/components/layout/route-page-primitives";
import type { PortfolioViewModel } from "../types";

export function PortfolioPageHeader({
  header,
  pageContract,
}: Readonly<{
  header: PortfolioViewModel["header"];
  pageContract: PortfolioViewModel["pageContract"];
}>) {
  return (
    <header className="overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.74)] shadow-[0_8px_22px_rgba(0,0,0,.12)]">
      <div className="grid gap-3 bg-[linear-gradient(90deg,rgba(217,146,79,.045),transparent_44%)] px-4 py-3 sm:px-4 xl:grid-cols-[minmax(0,1fr)_minmax(380px,auto)] xl:items-center">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-orange)]">
            {header.eyebrow}
          </p>
          <h1 className="mt-0.5 text-[28px] font-semibold leading-none text-[var(--text-primary)] sm:text-[30px]">
            {header.title}
          </h1>
          <p className="mt-1.5 max-w-3xl text-xs leading-4 text-[var(--text-secondary)]">
            {header.summary}
          </p>
          <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
            {header.dateRange}
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-1.5 xl:items-end">
          <div className="flex flex-wrap gap-1.5 xl:justify-end">
            <Pill accent="var(--accent-orange)">Active Portfolio</Pill>
            <Pill quiet>{pageContract.pageType}</Pill>
          </div>
          <p className="max-w-xl text-left text-[10px] leading-4 text-[var(--text-muted)] xl:text-right">
            {pageContract.canonicalSource}
          </p>
        </div>
      </div>
    </header>
  );
}

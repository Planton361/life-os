import Link from "next/link";
import { cn } from "@/lib/cn";
import type {
  PortfolioOption,
  PortfolioScopeFilter,
  PortfolioSortMode,
  PortfolioView,
} from "../types";

function segmentedLinkClass(active: boolean) {
  return cn(
    "min-h-7 shrink-0 rounded-full border px-3 text-[10px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
    active
      ? "border-[rgba(217,146,79,.34)] bg-[rgba(217,146,79,.16)] text-[var(--text-primary)]"
      : "border-transparent text-[var(--text-muted)] hover:bg-[rgba(148,163,184,.05)] hover:text-[var(--text-secondary)]",
  );
}

function chipLinkClass(active: boolean) {
  return cn(
    "inline-flex min-h-7 shrink-0 items-center rounded-full border px-3 text-[10px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
    active
      ? "border-[rgba(95,200,215,.34)] bg-[rgba(95,200,215,.16)] text-[var(--text-primary)]"
      : "border-[var(--border-subtle)] bg-[rgba(18,28,43,.68)] text-[var(--text-secondary)] hover:border-[var(--border-default)]",
  );
}

export function PortfolioFilterBar({
  views,
  filters,
  sorts,
  activeView,
  activeFilter,
  sortMode,
  visibleCount,
  totalCount,
  getViewHref,
  getFilterHref,
  getSortHref,
}: Readonly<{
  views: PortfolioOption<PortfolioView>[];
  filters: PortfolioOption<PortfolioScopeFilter>[];
  sorts: PortfolioOption<PortfolioSortMode>[];
  activeView: PortfolioView;
  activeFilter: PortfolioScopeFilter;
  sortMode: PortfolioSortMode;
  visibleCount: number;
  totalCount: number;
  getViewHref: (view: PortfolioView) => `/${string}`;
  getFilterHref: (filter: PortfolioScopeFilter) => `/${string}`;
  getSortHref: (sort: PortfolioSortMode) => `/${string}`;
}>) {
  return (
    <section
      aria-label="Portfolio view, scope and sort controls"
      className="rounded-[14px] border border-[rgba(148,163,184,.08)] bg-[rgba(11,17,28,.48)] px-3 py-2"
    >
      <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="min-w-0">
          <div className="-mx-1 overflow-x-auto px-1">
            <div className="flex w-max min-w-full rounded-full border border-[var(--border-subtle)] bg-[rgba(11,17,28,.72)] p-1">
              {views.map((view) => (
                <Link
                  aria-current={view.value === activeView ? "page" : undefined}
                  className={segmentedLinkClass(view.value === activeView)}
                  href={getViewHref(view.value)}
                  key={view.value}
                >
                  {view.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)] xl:text-right">
          {visibleCount} of {totalCount} visible
        </p>
      </div>

      <div className="mt-2 grid gap-2 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="min-w-0">
          <div className="-mx-1 overflow-x-auto px-1">
            <div className="flex w-max min-w-full items-center gap-1.5">
              <p className="mr-1 shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
                Scope
              </p>
              {filters.map((filter) => (
                <Link
                  aria-current={
                    filter.value === activeFilter ? "true" : undefined
                  }
                  className={chipLinkClass(filter.value === activeFilter)}
                  href={getFilterHref(filter.value)}
                  key={filter.value}
                >
                  {filter.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="-mx-1 overflow-x-auto px-1">
          <div className="flex w-max min-w-full items-center gap-1.5 xl:min-w-0 xl:justify-end">
            <p className="mr-1 shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
              Sort
            </p>
            {sorts.map((sort) => (
              <Link
                aria-current={sort.value === sortMode ? "true" : undefined}
                className={chipLinkClass(sort.value === sortMode)}
                href={getSortHref(sort.value)}
                key={sort.value}
                title={sort.description}
              >
                {sort.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

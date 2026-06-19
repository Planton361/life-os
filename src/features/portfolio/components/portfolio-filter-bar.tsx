import { cn } from "@/lib/cn";
import type {
  PortfolioOption,
  PortfolioScopeFilter,
  PortfolioSortMode,
  PortfolioView,
} from "../types";

function segmentedButtonClass(active: boolean) {
  return cn(
    "min-h-7 shrink-0 rounded-full border px-3 text-[10px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
    active
      ? "border-[rgba(217,146,79,.34)] bg-[rgba(217,146,79,.16)] text-[var(--text-primary)]"
      : "border-transparent text-[var(--text-muted)] hover:bg-[rgba(148,163,184,.05)] hover:text-[var(--text-secondary)]",
  );
}

function chipButtonClass(active: boolean) {
  return cn(
    "min-h-7 shrink-0 rounded-full border px-3 text-[10px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
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
  onViewChange,
  onFilterChange,
  onSortChange,
}: Readonly<{
  views: PortfolioOption<PortfolioView>[];
  filters: PortfolioOption<PortfolioScopeFilter>[];
  sorts: PortfolioOption<PortfolioSortMode>[];
  activeView: PortfolioView;
  activeFilter: PortfolioScopeFilter;
  sortMode: PortfolioSortMode;
  visibleCount: number;
  totalCount: number;
  onViewChange: (view: PortfolioView) => void;
  onFilterChange: (filter: PortfolioScopeFilter) => void;
  onSortChange: (sort: PortfolioSortMode) => void;
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
                <button
                  aria-pressed={view.value === activeView}
                  className={segmentedButtonClass(view.value === activeView)}
                  key={view.value}
                  onClick={() => onViewChange(view.value)}
                  type="button"
                >
                  {view.label}
                </button>
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
                <button
                  aria-pressed={filter.value === activeFilter}
                  className={chipButtonClass(filter.value === activeFilter)}
                  key={filter.value}
                  onClick={() => onFilterChange(filter.value)}
                  type="button"
                >
                  {filter.label}
                </button>
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
              <button
                aria-pressed={sort.value === sortMode}
                className={chipButtonClass(sort.value === sortMode)}
                key={sort.value}
                onClick={() => onSortChange(sort.value)}
                title={sort.description}
                type="button"
              >
                {sort.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

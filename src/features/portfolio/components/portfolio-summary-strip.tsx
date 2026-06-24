import { accentStyle } from "@/components/layout/route-page-primitives";
import type { PortfolioStat } from "../types";

export function PortfolioSummaryStrip({
  stats,
}: Readonly<{
  stats: PortfolioStat[];
}>) {
  return (
    <section
      aria-label="Portfolio summary"
      className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6"
    >
      {stats.map((stat, index) => (
        <article
          className="min-h-[58px] rounded-[12px] border border-[color-mix(in_srgb,var(--accent)_20%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent)_6%,rgba(15,23,36,.68))] px-3 py-2"
          key={`portfolio-summary-stat-${index}`}
          style={accentStyle(stat.accent)}
        >
          <div className="flex min-w-0 items-start gap-2">
            <span
              aria-hidden="true"
              className="mt-1 size-1.5 shrink-0 rounded-full bg-[var(--accent)]"
            />
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold text-[var(--text-muted)]">
                {stat.label}
              </p>
              <p className="mt-0.5 truncate text-[18px] font-semibold leading-5 text-[var(--text-primary)]">
                {stat.value}
              </p>
              <p className="mt-0.5 truncate text-[10px] leading-4 text-[var(--text-secondary)]">
                {stat.detail}
              </p>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

import { Pill } from "@/components/layout/route-page-primitives";
import type { RunningViewModel } from "../types";
import {
  ActionLink,
  HealthMetricCard,
  HealthPanel,
  SectionEmptyState,
  Sparkline,
} from "./health-overview-primitives";

export function RunningPanel({
  data,
}: Readonly<{
  data: RunningViewModel;
}>) {
  return (
    <HealthPanel
      accent="var(--accent-orange)"
      badge={data.loadStatus}
      subtitle={data.subtitle}
      title={data.title}
    >
      <div className="grid min-h-0 gap-3 xl:flex xl:flex-1 xl:flex-col min-[1900px]:justify-between min-[1900px]:gap-4">
        <div className="grid gap-2 sm:grid-cols-3 min-[1900px]:gap-3">
          {data.metrics.map((metric, index) => (
            <HealthMetricCard key={`running-metric-${index}`} metric={metric} />
          ))}
        </div>

        {data.trends.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:flex-1 min-[1900px]:gap-4">
            {data.trends.map((trend, index) => (
            <section
              aria-labelledby={`${trend.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-heading`}
              className="flex min-h-[150px] flex-col rounded-[13px] border border-[rgba(148,163,184,.10)] bg-[rgba(11,17,28,.38)] p-3 min-[1900px]:min-h-[230px] min-[1900px]:p-4"
              key={`running-trend-${index}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3
                    className="text-[11px] font-semibold text-[var(--text-secondary)]"
                    id={`${trend.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-heading`}
                  >
                    {trend.title}
                  </h3>
                  <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
                    {trend.statement}
                  </p>
                </div>
                <Pill accent={trend.accent} quiet>
                  trend
                </Pill>
              </div>
              <div className="mt-auto pt-3">
                <Sparkline
                  accent={trend.accent}
                  title={trend.title}
                  values={trend.values}
                />
              </div>
            </section>
            ))}
          </div>
        ) : (
          <SectionEmptyState
            description="Laufeinheiten erscheinen hier, sobald du eine Session dokumentierst."
            title="Noch keine Laufeinheiten"
          />
        )}

        <section
          aria-labelledby="running-next-run-heading"
          className="mt-auto flex flex-col gap-3 rounded-[13px] border border-[rgba(217,146,79,.18)] bg-[rgba(217,146,79,.07)] p-3 sm:flex-row sm:items-center sm:justify-between min-[1900px]:p-4"
        >
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              {data.nextRun.label}
            </p>
            <h3
              className="mt-1 text-[15px] font-semibold leading-5 text-[var(--text-primary)]"
              id="running-next-run-heading"
            >
              {data.nextRun.title}
            </h3>
            <p className="mt-1 text-[10px] leading-4 text-[var(--text-secondary)]">
              {data.nextRun.detail}
            </p>
          </div>
          <ActionLink accent="var(--accent-orange)" href={data.nextRun.href}>
            {data.nextRun.actionLabel}
          </ActionLink>
        </section>
      </div>
    </HealthPanel>
  );
}

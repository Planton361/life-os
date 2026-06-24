import { accentStyle } from "@/components/layout/route-page-primitives";
import type { StrengthViewModel } from "../types";
import {
  ActionLink,
  HealthMetricCard,
  HealthPanel,
  SectionEmptyState,
  barHeightStyle,
} from "./health-overview-primitives";

export function StrengthPanel({
  data,
}: Readonly<{
  data: StrengthViewModel;
}>) {
  return (
    <HealthPanel
      accent="var(--accent-red)"
      badge={data.badge}
      subtitle={data.subtitle}
      title={data.title}
    >
      <div className="grid min-h-0 gap-3 xl:flex xl:flex-1 xl:flex-col min-[1900px]:justify-between min-[1900px]:gap-4">
        <div className="grid gap-2 sm:grid-cols-3 min-[1900px]:gap-3">
          {data.metrics.map((metric) => (
            <HealthMetricCard key={metric.label} metric={metric} />
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,.95fr)] xl:flex-1 min-[1900px]:gap-4">
          <section
            aria-labelledby="training-pattern-heading"
            className="flex flex-col rounded-[13px] border border-[rgba(148,163,184,.10)] bg-[rgba(11,17,28,.38)] p-3 min-[1900px]:p-4"
          >
            <h3
              className="text-[12px] font-semibold text-[var(--text-primary)]"
              id="training-pattern-heading"
            >
              {data.trainingPattern.title}
            </h3>
            {data.trainingPattern.days.length > 0 ? (
              <div className="mt-4 flex h-24 items-end gap-2 min-[1900px]:h-36 min-[1900px]:gap-3">
                {data.trainingPattern.days.map((day) => (
                <div
                  aria-label={`${day.day}: ${day.label}`}
                  className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
                  key={`${day.day}-${day.label}`}
                  role="img"
                  style={accentStyle(day.accent)}
                >
                  <span
                    aria-hidden="true"
                    className="h-[var(--bar-height)] w-full max-w-5 rounded-t-[5px] bg-[color-mix(in_srgb,var(--accent)_74%,transparent)]"
                    style={barHeightStyle(day.intensity)}
                  />
                  <span className="truncate text-[9px] text-[var(--text-muted)]">
                    {day.day}
                  </span>
                </div>
                ))}
              </div>
            ) : (
              <SectionEmptyState
                className="mt-4"
                description="Krafteinheiten erscheinen hier, sobald du eine Session dokumentierst."
                title="Noch keine Krafteinheiten"
              />
            )}
            <p className="mt-auto pt-3 text-[10px] leading-4 text-[var(--text-muted)]">
              {data.trainingPattern.note}
            </p>
          </section>

          <section
            aria-labelledby="session-balance-heading"
            className="rounded-[13px] border border-[rgba(148,163,184,.10)] bg-[rgba(11,17,28,.38)] p-3 min-[1900px]:flex min-[1900px]:flex-col min-[1900px]:justify-center min-[1900px]:p-4"
          >
            <h3
              className="text-[12px] font-semibold text-[var(--text-primary)]"
              id="session-balance-heading"
            >
              {data.sessionBalance.title}
            </h3>
            {data.sessionBalance.items.length > 0 ? (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 min-[1900px]:gap-3">
                {data.sessionBalance.items.map((item) => (
                <article
                  className="rounded-[10px] border border-[color-mix(in_srgb,var(--accent)_20%,transparent)] bg-[color-mix(in_srgb,var(--accent)_6%,rgba(15,23,36,.56))] px-2.5 py-2 min-[1900px]:p-3"
                  key={item.label}
                  style={accentStyle(item.accent)}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="size-1.5 rounded-full bg-[var(--accent)]"
                    />
                    <p className="truncate text-[10px] text-[var(--text-muted)]">
                      {item.label}
                    </p>
                  </div>
                  <p className="mt-1 text-[15px] font-semibold text-[var(--text-primary)]">
                    {item.count}
                  </p>
                </article>
                ))}
              </div>
            ) : (
              <SectionEmptyState
                className="mt-4"
                description="Session-Typen erscheinen nach den ersten lokalen Eintraegen."
                title="Noch keine Session-Balance"
              />
            )}
          </section>
        </div>

        <section
          aria-labelledby="strength-next-session-heading"
          className="mt-auto flex flex-col gap-3 rounded-[13px] border border-[rgba(221,107,95,.18)] bg-[rgba(221,107,95,.07)] p-3 sm:flex-row sm:items-center sm:justify-between min-[1900px]:p-4"
        >
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              {data.nextSession.label}
            </p>
            <h3
              className="mt-1 text-[15px] font-semibold leading-5 text-[var(--text-primary)]"
              id="strength-next-session-heading"
            >
              {data.nextSession.title}
            </h3>
            <p className="mt-1 text-[10px] leading-4 text-[var(--text-secondary)]">
              {data.nextSession.detail}
            </p>
          </div>
          <ActionLink accent="var(--accent-red)" href={data.nextSession.href}>
            {data.nextSession.actionLabel}
          </ActionLink>
        </section>
      </div>
    </HealthPanel>
  );
}

import { accentStyle } from "@/components/layout/route-page-primitives";
import type { ContentStateMeta } from "@/features/content-state";
import { cn } from "@/lib/cn";
import type {
  HabitHeatmapRowViewModel,
  HabitsViewModel,
  HealthProfileId,
} from "../types";
import {
  ActionLink,
  HealthMetricCard,
  HealthPanel,
  SectionEmptyState,
} from "./health-overview-primitives";

const heatLevelLabels = ["none", "light", "steady", "strong"] as const;

function heatLevelClass(level: number) {
  if (level >= 3) {
    return "border-[color-mix(in_srgb,var(--accent)_58%,transparent)] bg-[color-mix(in_srgb,var(--accent)_58%,transparent)]";
  }

  if (level === 2) {
    return "border-[color-mix(in_srgb,var(--accent)_38%,transparent)] bg-[color-mix(in_srgb,var(--accent)_36%,transparent)]";
  }

  if (level === 1) {
    return "border-[color-mix(in_srgb,var(--accent)_22%,transparent)] bg-[color-mix(in_srgb,var(--accent)_20%,transparent)]";
  }

  return "border-[rgba(82,97,120,.18)] bg-[rgba(82,97,120,.14)]";
}

function HabitHeatmapRow({
  row,
}: Readonly<{
  row: HabitHeatmapRowViewModel;
}>) {
  return (
    <div className="grid gap-2 sm:grid-cols-[72px_minmax(0,1fr)] sm:items-center min-[1900px]:gap-3">
      <p className="text-[10px] font-semibold text-[var(--text-secondary)]">
        {row.label}
      </p>
      <div
        aria-label={`${row.label} habit heatmap for June`}
        className="grid grid-cols-[repeat(10,minmax(0,1fr))] gap-1 sm:grid-cols-[repeat(15,minmax(0,1fr))] 2xl:grid-cols-[repeat(30,minmax(0,1fr))] min-[1900px]:gap-1.5"
        role="list"
        style={accentStyle("var(--accent-cyan)")}
      >
        {row.values.map((value, index) => (
          <span
            aria-label={`${row.label} day ${index + 1}: ${
              heatLevelLabels[value] ?? "none"
            }`}
            className={cn(
              "aspect-square min-h-2 rounded-[3px] border min-[1900px]:rounded-[4px]",
              heatLevelClass(value),
            )}
            key={`habit-heatmap-day-${index}`}
            role="listitem"
          />
        ))}
      </div>
    </div>
  );
}

export function HabitsPanel({
  data,
  profileId,
  state,
}: Readonly<{
  data: HabitsViewModel;
  profileId: HealthProfileId;
  state: ContentStateMeta;
}>) {
  return (
    <HealthPanel
      accent="var(--accent-cyan)"
      badge={data.badge}
      contentState={state}
      profileId={profileId}
      sectionName="habits"
      subtitle={data.subtitle}
      title={data.title}
    >
      <div className="grid min-h-0 gap-3 xl:flex xl:flex-1 xl:flex-col min-[1900px]:justify-between min-[1900px]:gap-4">
        <div className="grid gap-2 sm:grid-cols-3 min-[1900px]:gap-3">
          {data.metrics.map((metric, index) => (
            <HealthMetricCard key={`habits-metric-${index}`} metric={metric} />
          ))}
        </div>

        <section
          aria-labelledby="habit-heatmap-heading"
          className="rounded-[13px] border border-[rgba(148,163,184,.10)] bg-[rgba(11,17,28,.36)] p-3 xl:flex-1 min-[1900px]:flex min-[1900px]:flex-col min-[1900px]:justify-center min-[1900px]:p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3
              className="text-[12px] font-semibold text-[var(--text-primary)]"
              id="habit-heatmap-heading"
            >
              {data.heatmap.title}
            </h3>
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
              <span>{data.heatmap.legend.low}</span>
              {[0, 1, 2, 3].map((level) => (
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-2.5 rounded-[3px] border",
                    heatLevelClass(level),
                  )}
                  key={level}
                  style={accentStyle("var(--accent-cyan)")}
                />
              ))}
              <span>{data.heatmap.legend.high}</span>
            </div>
          </div>
          {data.heatmap.rows.length > 0 ? (
            <div className="mt-4 grid gap-3 min-[1900px]:gap-5">
              {data.heatmap.rows.map((row, index) => (
              <HabitHeatmapRow key={`habit-heatmap-row-${index}`} row={row} />
              ))}
            </div>
          ) : (
            <SectionEmptyState
              className="mt-4"
              description="Routinen erscheinen hier, sobald du sie lokal erfasst."
              title="Noch keine Routinen"
            />
          )}
        </section>

        <section
          aria-labelledby="habit-next-focus-heading"
          className="mt-auto flex flex-col gap-3 rounded-[13px] border border-[rgba(95,200,215,.16)] bg-[rgba(95,200,215,.06)] p-3 sm:flex-row sm:items-center sm:justify-between min-[1900px]:p-4"
        >
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              {data.nextFocus.label}
            </p>
            <h3
              className="mt-1 text-[14px] font-semibold leading-5 text-[var(--text-primary)]"
              id="habit-next-focus-heading"
            >
              {data.nextFocus.title}
            </h3>
          </div>
          <ActionLink accent="var(--accent-cyan)" href={data.nextFocus.href}>
            {data.nextFocus.actionLabel}
          </ActionLink>
        </section>
      </div>
    </HealthPanel>
  );
}

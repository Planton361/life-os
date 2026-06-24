import type { CSSProperties, ReactNode } from "react";
import {
  EmptyState,
  Pill,
  accentStyle,
} from "@/components/layout/route-page-primitives";
import {
  contentStateDataAttributes,
  type ContentStateMeta,
} from "@/features/content-state";
import { cn } from "@/lib/cn";
import type {
  HabitAccent,
  HabitDayIntensity,
  HabitDaySignal,
  HabitPatternRowViewModel,
  HabitSummaryMetricViewModel,
  HabitsProfileId,
  HabitsAnalyticsPageViewModel,
  RepairLoopViewModel,
  TodayHabitScheduleItemViewModel,
  WeeklyRhythmInsightViewModel,
} from "../habits-types";

type ProgressStyle = CSSProperties & {
  "--progress-width"?: string;
};

function progressStyle(value: number): ProgressStyle {
  return {
    "--progress-width": `${Math.max(0, Math.min(100, value))}%`,
  };
}

function titleId(title: string) {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-section`;
}

function ProgressBar({
  value,
  label,
  accent,
}: Readonly<{
  value: number;
  label: string;
  accent: HabitAccent;
}>) {
  return (
    <div
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={value}
      className="h-1.5 overflow-hidden rounded-full bg-[rgba(82,97,120,.34)]"
      role="meter"
      style={{ ...accentStyle(accent), ...progressStyle(value) }}
    >
      <span
        aria-hidden="true"
        className="block h-full w-[var(--progress-width)] rounded-full bg-[var(--accent)]"
      />
    </div>
  );
}

function Panel({
  title,
  subtitle,
  badge,
  accent = "var(--accent-red)",
  className,
  bodyClassName,
  contentState,
  profileId,
  sectionName,
  children,
}: Readonly<{
  title: string;
  subtitle?: string;
  badge?: string;
  accent?: HabitAccent;
  className?: string;
  bodyClassName?: string;
  contentState?: ContentStateMeta;
  profileId?: HabitsProfileId;
  sectionName?: string;
  children: ReactNode;
}>) {
  const id = titleId(title);

  return (
    <section
      aria-labelledby={id}
      {...(contentState && profileId
        ? contentStateDataAttributes(contentState, profileId)
        : {})}
      {...(sectionName ? { "data-habits-section": sectionName } : {})}
      className={cn(
        "min-w-0 overflow-hidden rounded-[18px] border border-[color-mix(in_srgb,var(--accent)_22%,var(--border-subtle))] bg-[rgba(15,23,36,.82)] shadow-[0_8px_22px_rgba(0,0,0,.12)]",
        className,
      )}
      style={accentStyle(accent)}
    >
      <div className="border-b border-[var(--border-subtle)] bg-[linear-gradient(90deg,color-mix(in_srgb,var(--accent)_8%,rgba(18,28,43,.78)),rgba(18,28,43,.50)_66%)] px-3 py-2">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              className="text-[15px] font-semibold leading-5 text-[var(--text-primary)]"
              id={id}
            >
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 text-[10px] leading-3 text-[var(--text-secondary)]">
                {subtitle}
              </p>
            ) : null}
          </div>
          {badge ? <Pill accent={accent}>{badge}</Pill> : null}
        </div>
      </div>
      <div className={cn("p-2", bodyClassName)}>{children}</div>
    </section>
  );
}

function MetricCard({
  metric,
}: Readonly<{
  metric: HabitSummaryMetricViewModel;
}>) {
  return (
    <article
      className="min-w-0 rounded-[12px] border border-[color-mix(in_srgb,var(--accent)_20%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent)_6%,rgba(15,23,36,.68))] px-2.5 py-1.5"
      style={accentStyle(metric.accent)}
    >
      <p className="truncate text-[10px] font-semibold text-[var(--text-muted)]">
        {metric.label}
      </p>
      <p className="truncate text-[16px] font-semibold leading-5 text-[var(--text-primary)]">
        {metric.value}
      </p>
      <p className="truncate text-[10px] leading-3 text-[var(--text-secondary)]">
        {metric.detail}
      </p>
    </article>
  );
}

function HabitsHeader({
  header,
  profileId,
  state,
}: Readonly<{
  header: HabitsAnalyticsPageViewModel["header"];
  profileId: HabitsProfileId;
  state: ContentStateMeta;
}>) {
  return (
    <header
      className="min-w-0 overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.82)] shadow-[0_8px_22px_rgba(0,0,0,.12)]"
      data-habits-section="header"
      {...contentStateDataAttributes(state, profileId)}
    >
      <div className="grid gap-2 bg-[linear-gradient(90deg,rgba(221,107,95,.06),transparent_54%)] px-4 py-2 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] xl:items-center">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-[var(--text-muted)]">
            {header.breadcrumb.join(" / ")}
          </p>
          <h1 className="mt-0.5 text-[26px] font-semibold leading-none text-[var(--text-primary)] sm:text-[28px]">
            {header.title}
          </h1>
          <p className="mt-1 max-w-3xl text-[11px] leading-4 text-[var(--text-secondary)]">
            {header.subtitle}
          </p>
          <p className="mt-0.5 text-[10px] leading-3 text-[var(--text-muted)]">
            {header.meta}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {header.pills.map((pill, index) => (
              <Pill accent={pill.accent} key={`habit-header-pill-${index}`}>
                {pill.value}
              </Pill>
            ))}
          </div>
        </div>

        <article
          className="min-w-0 rounded-[14px] border border-[color-mix(in_srgb,var(--accent)_24%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent)_7%,rgba(11,17,28,.54))] p-2"
          style={accentStyle(header.todaySignal.accent)}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            {header.todaySignal.label}
          </p>
          <p className="mt-1 text-[19px] font-semibold leading-6 text-[var(--text-primary)]">
            {header.todaySignal.value}
          </p>
          <p className="mt-0.5 text-[10px] leading-3 text-[var(--text-secondary)]">
            {header.todaySignal.detail}
          </p>
          <div className="mt-1.5">
            <ProgressBar
              accent={header.todaySignal.accent}
              label={header.todaySignal.progressLabel}
              value={header.todaySignal.progress}
            />
          </div>
        </article>
      </div>
    </header>
  );
}

function SummaryStrip({
  metrics,
  profileId,
  state,
}: Readonly<{
  metrics: readonly HabitSummaryMetricViewModel[];
  profileId: HabitsProfileId;
  state: ContentStateMeta;
}>) {
  return (
    <section
      aria-label="Habit analytics summary"
      className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-6"
      data-habits-section="summary"
      {...contentStateDataAttributes(state, profileId)}
    >
      {metrics.map((metric, index) => (
        <MetricCard key={`habit-summary-${index}`} metric={metric} />
      ))}
    </section>
  );
}

const heatIntensityLabels: Record<HabitDayIntensity, string> = {
  0: "missed signal",
  1: "light",
  2: "partial",
  3: "steady",
  4: "strong",
};

function heatIntensityClass(intensity: HabitDayIntensity) {
  if (intensity === 4) {
    return "border-[color-mix(in_srgb,var(--accent)_62%,transparent)] bg-[color-mix(in_srgb,var(--accent)_62%,transparent)]";
  }

  if (intensity === 3) {
    return "border-[color-mix(in_srgb,var(--accent)_46%,transparent)] bg-[color-mix(in_srgb,var(--accent)_42%,transparent)]";
  }

  if (intensity === 2) {
    return "border-[color-mix(in_srgb,var(--accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--accent)_24%,transparent)]";
  }

  if (intensity === 1) {
    return "border-[color-mix(in_srgb,var(--accent)_18%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]";
  }

  return "border-[rgba(82,97,120,.20)] bg-[rgba(82,97,120,.12)]";
}

function HeatmapCell({
  signal,
}: Readonly<{
  signal: HabitDaySignal;
}>) {
  return (
    <span
      aria-label={signal.label}
      className={cn(
        "h-2.5 rounded-[3px] border",
        heatIntensityClass(signal.intensity),
      )}
      role="listitem"
      title={`${signal.date}: ${heatIntensityLabels[signal.intensity]}`}
    />
  );
}

function HeatmapRow({
  row,
}: Readonly<{
  row: HabitsAnalyticsPageViewModel["heatmap"]["rows"][number];
}>) {
  return (
    <div
      className="grid gap-1.5 rounded-[10px] border border-[color-mix(in_srgb,var(--accent)_16%,var(--border-subtle))] bg-[rgba(11,17,28,.30)] px-2 py-1.5 xl:grid-cols-[66px_minmax(0,1fr)_34px] xl:items-center"
      style={accentStyle(row.accent)}
    >
      <div className="flex items-center justify-between gap-2 xl:block">
        <p className="truncate text-[10px] font-semibold text-[var(--text-primary)]">
          {row.label}
        </p>
        <p className="shrink-0 text-[10px] font-semibold text-[var(--accent)]">
          {row.completionRate}%
        </p>
      </div>
      <div className="-mx-1 overflow-x-auto px-1">
        <div
          aria-label={`${row.label} June consistency heatmap with labelled intensity cells`}
          className="grid min-w-[360px] grid-cols-[repeat(30,minmax(0,1fr))] gap-0.5"
          role="list"
        >
          {row.signals.map((signal) => (
            <HeatmapCell
              key={`${row.id}-${signal.dayOfMonth}`}
              signal={signal}
            />
          ))}
        </div>
      </div>
      <p className="hidden text-right text-[9px] leading-3 text-[var(--text-muted)] xl:block">
        30d
      </p>
    </div>
  );
}

function HeatmapLegend({
  legend,
}: Readonly<{
  legend: HabitsAnalyticsPageViewModel["heatmap"]["legend"];
}>) {
  return (
    <div
      className="flex items-center gap-1 text-[9px] text-[var(--text-muted)]"
      style={accentStyle("var(--accent-red)")}
    >
      <span>{legend.low}</span>
      {[0, 1, 2, 3, 4].map((level) => (
        <span
          aria-hidden="true"
          className={cn(
            "h-1.5 w-2.5 rounded-[3px] border",
            heatIntensityClass(level as HabitDayIntensity),
          )}
          key={level}
        />
      ))}
      <span>{legend.high}</span>
    </div>
  );
}

function PatternReadCard({
  patternRead,
}: Readonly<{
  patternRead: HabitsAnalyticsPageViewModel["heatmap"]["patternRead"];
}>) {
  return (
    <aside className="rounded-[12px] border border-[rgba(221,107,95,.18)] bg-[rgba(221,107,95,.06)] p-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {patternRead.title}
      </p>
      <p className="mt-1 text-[11px] leading-4 text-[var(--text-secondary)]">
        {patternRead.copy}
      </p>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {patternRead.metrics.map((metric, index) => (
          <article
            className="rounded-[10px] border border-[color-mix(in_srgb,var(--accent)_20%,var(--border-subtle))] bg-[rgba(11,17,28,.34)] px-2 py-1.5"
            key={`habit-pattern-metric-${index}`}
            style={accentStyle(metric.accent)}
          >
            <p className="text-[10px] font-semibold text-[var(--text-muted)]">
              {metric.label}
            </p>
            <p className="text-[15px] font-semibold leading-5 text-[var(--text-primary)]">
              {metric.value}
            </p>
          </article>
        ))}
      </div>
    </aside>
  );
}

function MonthlyHeatmapPanel({
  heatmap,
  className,
  profileId,
  state,
}: Readonly<{
  heatmap: HabitsAnalyticsPageViewModel["heatmap"];
  className?: string;
  profileId: HabitsProfileId;
  state: ContentStateMeta;
}>) {
  return (
    <Panel
      accent="var(--accent-red)"
      badge="June"
      className={className}
      contentState={state}
      profileId={profileId}
      sectionName="heatmap"
      subtitle={heatmap.statement}
      title={heatmap.title}
    >
      {heatmap.rows.length > 0 ? (
        <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(210px,260px)] xl:items-start">
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] leading-3 text-[var(--text-secondary)]">
                Four groups, compact scan. Each cell has an accessible label.
              </p>
              <HeatmapLegend legend={heatmap.legend} />
            </div>
            <div className="grid gap-1">
              {heatmap.rows.map((row) => (
                <HeatmapRow key={row.id} row={row} />
              ))}
            </div>
          </div>
          <PatternReadCard patternRead={heatmap.patternRead} />
        </div>
      ) : (
        <EmptyState
          description="Habit-Analytics erscheint, sobald Routinen oder Logs existieren."
          title="Noch keine Habit-Signale"
        />
      )}
    </Panel>
  );
}

function DotRow({
  dots,
  label,
  accent,
}: Readonly<{
  dots: readonly boolean[];
  label: string;
  accent: HabitAccent;
}>) {
  return (
    <div
      aria-label={label}
      className="flex items-center gap-1"
      role="img"
      style={accentStyle(accent)}
    >
      {dots.map((active, index) => (
        <span
          aria-hidden="true"
          className={cn(
            "size-1.5 rounded-full",
            active ? "bg-[var(--accent)]" : "bg-[rgba(82,97,120,.50)]",
          )}
          key={`${label}-${index}`}
        />
      ))}
    </div>
  );
}

function statusAccent(status: HabitPatternRowViewModel["status"]) {
  if (status === "Stable" || status === "Good" || status === "Useful") {
    return "var(--accent-green)";
  }

  if (status === "Repair") {
    return "var(--accent-red)";
  }

  if (status === "Fragile") {
    return "var(--accent-purple)";
  }

  return "var(--accent-orange)";
}

function PatternRow({
  row,
}: Readonly<{
  row: HabitPatternRowViewModel;
}>) {
  return (
    <article
      className="grid gap-1.5 rounded-[10px] border border-[rgba(148,163,184,.10)] bg-[rgba(11,17,28,.34)] px-2 py-1.5 xl:grid-cols-[minmax(120px,.95fr)_76px_72px_minmax(74px,.55fr)_86px_minmax(130px,1fr)] xl:items-center"
      style={accentStyle(row.accent)}
    >
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold text-[var(--text-primary)]">
          {row.habit}
        </p>
        <p className="mt-0.5 text-[10px] text-[var(--text-muted)] xl:hidden">
          {row.group} · {row.target}
        </p>
      </div>
      <p className="hidden truncate text-[10px] text-[var(--text-secondary)] xl:block">
        {row.group}
      </p>
      <p className="hidden truncate text-[10px] text-[var(--text-secondary)] xl:block">
        {row.target}
      </p>
      <Pill accent={statusAccent(row.status)}>{row.status}</Pill>
      <div className="grid gap-1">
        <DotRow
          accent={row.accent}
          dots={row.sevenDayDots}
          label={`${row.habit}: 7 day completion dots`}
        />
        <ProgressBar
          accent={row.accent}
          label={`${row.habit}: ${row.thirtyDayProgress}% 30 day progress`}
          value={row.thirtyDayProgress}
        />
      </div>
      <p className="text-[10px] leading-3 text-[var(--text-secondary)]">
        {row.nextAction}
      </p>
    </article>
  );
}

function HabitPatternTable({
  patternTable,
  className,
  profileId,
  state,
}: Readonly<{
  patternTable: HabitsAnalyticsPageViewModel["patternTable"];
  className?: string;
  profileId: HabitsProfileId;
  state: ContentStateMeta;
}>) {
  return (
    <Panel
      accent="var(--accent-orange)"
      className={className}
      contentState={state}
      profileId={profileId}
      sectionName="pattern-table"
      subtitle={patternTable.statement}
      title={patternTable.title}
    >
      <div className="mb-0.5 hidden grid-cols-[minmax(120px,.95fr)_76px_72px_minmax(74px,.55fr)_86px_minmax(130px,1fr)] px-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)] xl:grid">
        <span>Habit</span>
        <span>Group</span>
        <span>Target</span>
        <span>Status</span>
        <span>7d / 30d</span>
        <span>Next action</span>
      </div>
      <div className="grid gap-1">
        {patternTable.rows.length > 0 ? (
          patternTable.rows.map((row) => (
            <PatternRow key={row.habit} row={row} />
          ))
        ) : (
          <EmptyState
            description="Routinen und Logs erscheinen hier, sobald sie lokal existieren."
            title="Noch keine Habit-Zeilen"
          />
        )}
      </div>
    </Panel>
  );
}

function RepairLoopCard({
  item,
}: Readonly<{
  item: RepairLoopViewModel;
}>) {
  return (
    <article
      className="rounded-[12px] border border-[color-mix(in_srgb,var(--accent)_18%,var(--border-subtle))] bg-[rgba(11,17,28,.34)] p-2"
      style={accentStyle(item.accent)}
    >
      <p className="text-[12px] font-semibold leading-4 text-[var(--text-primary)]">
        {item.title}
      </p>
      <p className="mt-0.5 text-[10px] leading-3 text-[var(--text-secondary)]">
        Reset: {item.reset}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1">
        <Pill accent={item.accent}>{item.triggers}</Pill>
        <Pill accent="var(--accent-green)" quiet>
          {item.repaired}
        </Pill>
      </div>
    </article>
  );
}

function RepairLoopsPanel({
  repairLoops,
  className,
  profileId,
  state,
}: Readonly<{
  repairLoops: HabitsAnalyticsPageViewModel["repairLoops"];
  className?: string;
  profileId: HabitsProfileId;
  state: ContentStateMeta;
}>) {
  return (
    <Panel
      accent="var(--accent-cyan)"
      className={className}
      contentState={state}
      profileId={profileId}
      sectionName="repair-loops"
      title={repairLoops.title}
    >
      <div className="grid gap-1.5 md:grid-cols-3">
        {repairLoops.items.length > 0 ? (
          repairLoops.items.map((item, index) => (
            <RepairLoopCard item={item} key={`habit-repair-loop-${index}`} />
          ))
        ) : (
          <EmptyState
            description="Repair Loops erscheinen nach lokalen Habit-Signalen."
            title="Noch keine Repair Loops"
          />
        )}
      </div>
    </Panel>
  );
}

function InterpretationFooter({
  interpretation,
  className,
}: Readonly<{
  interpretation: HabitsAnalyticsPageViewModel["interpretation"];
  className?: string;
}>) {
  const id = titleId(interpretation.title);

  return (
    <section
      aria-labelledby={id}
      className={cn(
        "min-w-0 rounded-[16px] border border-[rgba(66,184,131,.18)] bg-[rgba(66,184,131,.06)] px-3 py-2 shadow-[0_8px_22px_rgba(0,0,0,.12)]",
        className,
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2
            className="text-[14px] font-semibold leading-4 text-[var(--text-primary)]"
            id={id}
          >
            {interpretation.title}
          </h2>
          <p className="mt-0.5 text-[10px] leading-3 text-[var(--text-secondary)]">
            {interpretation.copy}
          </p>
        </div>
        <Pill accent="var(--accent-green)">{interpretation.pill}</Pill>
      </div>
    </section>
  );
}

function ScheduleItem({
  item,
}: Readonly<{
  item: TodayHabitScheduleItemViewModel;
}>) {
  return (
    <li className="grid grid-cols-[38px_8px_minmax(0,1fr)] gap-1.5">
      <time
        className="pt-1.5 text-right text-[9px] font-medium text-[var(--text-muted)]"
        dateTime={item.time}
      >
        {item.time}
      </time>
      <div className="relative flex justify-center">
        <span
          aria-hidden="true"
          className="absolute top-0 h-full w-px bg-[rgba(148,163,184,.14)]"
        />
        <span
          aria-hidden="true"
          className="relative mt-1.5 size-1.5 rounded-full bg-[var(--accent)]"
          style={accentStyle(item.accent)}
        />
      </div>
      <article
        className="min-w-0 rounded-[10px] border border-[color-mix(in_srgb,var(--accent)_18%,var(--border-subtle))] bg-[rgba(11,17,28,.34)] px-2 py-1"
        style={accentStyle(item.accent)}
      >
        <p className="truncate text-[11px] font-semibold leading-4 text-[var(--text-primary)]">
          <span className="mr-1 text-[9px] text-[var(--accent)]">
            {item.status}
          </span>
          {item.title}
        </p>
        <p className="truncate text-[9px] leading-3 text-[var(--text-secondary)]">
          {item.detail}
        </p>
      </article>
    </li>
  );
}

function TodayHabitSchedule({
  schedule,
  className,
  profileId,
  state,
}: Readonly<{
  schedule: HabitsAnalyticsPageViewModel["todaySchedule"];
  className?: string;
  profileId: HabitsProfileId;
  state: ContentStateMeta;
}>) {
  return (
    <Panel
      accent="var(--accent-red)"
      className={className}
      contentState={state}
      profileId={profileId}
      sectionName="today-schedule"
      subtitle={schedule.subtitle}
      title={schedule.title}
    >
      <ol className="grid gap-1">
        {schedule.items.length > 0 ? (
          schedule.items.map((item) => (
            <ScheduleItem item={item} key={`${item.time}-${item.title}`} />
          ))
        ) : (
          <EmptyState
            description="Habit-Zeitpunkte erscheinen, sobald ein lokaler Zeitplan existiert."
            title="Noch kein Habit-Zeitplan"
          />
        )}
      </ol>
    </Panel>
  );
}

function HabitDetailFocus({
  focus,
  className,
  profileId,
  state,
}: Readonly<{
  focus: HabitsAnalyticsPageViewModel["detailFocus"];
  className?: string;
  profileId: HabitsProfileId;
  state: ContentStateMeta;
}>) {
  const hasFocus = state.itemCount > 0;

  return (
    <Panel
      accent={focus.accent}
      badge={hasFocus ? "selected" : undefined}
      className={className}
      contentState={state}
      profileId={profileId}
      sectionName="detail-focus"
      subtitle={focus.subtitle}
      title={focus.title}
    >
      {hasFocus ? (
        <article className="rounded-[11px] border border-[rgba(221,107,95,.20)] bg-[rgba(221,107,95,.06)] px-2 py-1.5">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <p className="truncate text-[13px] font-semibold leading-4 text-[var(--text-primary)]">
            {focus.habit}
          </p>
          <span className="shrink-0 text-[10px] font-semibold text-[var(--accent)]">
            21:30
          </span>
        </div>
        <p className="mt-0.5 truncate text-[10px] leading-3 text-[var(--text-secondary)]">
          {focus.frictionNote}
        </p>
        </article>
      ) : (
        <EmptyState
          description="Ein Habit-Fokus erscheint, sobald eine lokale Routine ausgewählt ist."
          title="Noch kein Habit-Fokus"
        />
      )}
      <div className="mt-1.5 grid grid-cols-[minmax(0,.75fr)_minmax(0,1fr)] gap-1.5">
        <article className="rounded-[10px] border border-[rgba(148,163,184,.10)] bg-[rgba(11,17,28,.34)] px-2 py-1.5">
          <p className="text-[10px] font-semibold text-[var(--text-muted)]">
            {focus.sevenDayStatus}
          </p>
          <p className="text-[12px] font-semibold leading-4 text-[var(--text-primary)]">
            fragile
          </p>
        </article>
        <article className="rounded-[10px] border border-[rgba(148,163,184,.10)] bg-[rgba(11,17,28,.34)] px-2 py-1.5">
          <p className="text-[10px] font-semibold text-[var(--text-muted)]">
            {focus.thirtyDayTrend}
          </p>
          <div className="mt-1">
            <ProgressBar
              accent={focus.accent}
              label="Evening shutdown 30 day trend: 58%"
              value={focus.progress}
            />
          </div>
        </article>
      </div>
      <button
        className={cn(
          "mt-1.5 inline-flex min-h-7 w-full items-center justify-center rounded-full border border-[rgba(221,107,95,.34)] bg-[rgba(221,107,95,.12)] px-3 text-[10px] font-semibold text-[var(--text-primary)] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
          hasFocus
            ? "hover:border-[rgba(221,107,95,.50)]"
            : "cursor-not-allowed opacity-55",
        )}
        disabled={!hasFocus}
        type="button"
      >
        {focus.actionLabel}
      </button>
    </Panel>
  );
}

function WeeklyInsightRow({
  row,
}: Readonly<{
  row: WeeklyRhythmInsightViewModel;
}>) {
  return (
    <article
      className="rounded-[10px] border border-[color-mix(in_srgb,var(--accent)_16%,var(--border-subtle))] bg-[rgba(11,17,28,.34)] px-2 py-1.5"
      style={accentStyle(row.accent)}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold leading-4 text-[var(--text-primary)]">
            {row.title}
          </p>
          <p className="truncate text-[9px] leading-3 text-[var(--text-secondary)]">
            {row.detail}
          </p>
        </div>
        <Pill accent={row.accent}>{row.status}</Pill>
      </div>
    </article>
  );
}

function WeeklyRhythmInsights({
  insights,
  className,
  profileId,
  state,
}: Readonly<{
  insights: HabitsAnalyticsPageViewModel["weeklyRhythmInsights"];
  className?: string;
  profileId: HabitsProfileId;
  state: ContentStateMeta;
}>) {
  return (
    <Panel
      accent="var(--accent-purple)"
      className={className}
      contentState={state}
      profileId={profileId}
      sectionName="weekly-rhythm"
      title={insights.title}
    >
      <div className="grid gap-1">
        {insights.rows.length > 0 ? (
          insights.rows.slice(0, 3).map((row, index) => (
            <WeeklyInsightRow key={`habit-weekly-insight-${index}`} row={row} />
          ))
        ) : (
          <EmptyState
            description="Wochenrhythmus erscheint nach lokalen Habit-Logs."
            title="Noch kein Wochenrhythmus"
          />
        )}
      </div>
    </Panel>
  );
}

function BoundaryCard({
  boundary,
  className,
}: Readonly<{
  boundary: HabitsAnalyticsPageViewModel["boundary"];
  className?: string;
}>) {
  const id = titleId(boundary.title);

  return (
    <section
      aria-labelledby={id}
      className={cn(
        "min-w-0 rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.82)] p-2 shadow-[0_8px_22px_rgba(0,0,0,.12)]",
        className,
      )}
    >
      <h2
        className="text-[15px] font-semibold leading-5 text-[var(--text-primary)]"
        id={id}
      >
        {boundary.title}
      </h2>
      <ul className="mt-1.5 grid gap-1.5">
        {["Signals, not judgement", "no diagnosis", "reviewed automation"].map(
          (bullet, index) => (
            <li
              className="grid grid-cols-[5px_minmax(0,1fr)] gap-2 text-[10px] leading-3 text-[var(--text-secondary)]"
              key={`habit-boundary-bullet-${index}`}
            >
              <span
                aria-hidden="true"
                className="mt-1 size-1 rounded-full bg-[var(--accent-cyan)]"
              />
              <span>{bullet}</span>
            </li>
          ),
        )}
      </ul>
    </section>
  );
}

export function HabitsAnalyticsPage({
  viewModel,
}: Readonly<{
  viewModel: HabitsAnalyticsPageViewModel;
}>) {
  return (
    <div
      className="mx-auto flex w-full max-w-[2208px] flex-col gap-1.5 pb-0"
      data-habits-section="page"
      {...contentStateDataAttributes(
        viewModel.contentStates.page,
        viewModel.profileId,
      )}
    >
      <HabitsHeader
        header={viewModel.header}
        profileId={viewModel.profileId}
        state={viewModel.contentStates.header}
      />
      <SummaryStrip
        metrics={viewModel.summary}
        profileId={viewModel.profileId}
        state={viewModel.contentStates.summary}
      />

      <div className="grid min-w-0 gap-1.5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] xl:items-start">
        <TodayHabitSchedule
          className="order-1 xl:order-2"
          profileId={viewModel.profileId}
          schedule={viewModel.todaySchedule}
          state={viewModel.contentStates.todaySchedule}
        />
        <MonthlyHeatmapPanel
          className="order-2 self-start xl:order-1"
          heatmap={viewModel.heatmap}
          profileId={viewModel.profileId}
          state={viewModel.contentStates.heatmap}
        />
      </div>
      <HabitPatternTable
        patternTable={viewModel.patternTable}
        profileId={viewModel.profileId}
        state={viewModel.contentStates.patternTable}
      />
      <RepairLoopsPanel
        profileId={viewModel.profileId}
        repairLoops={viewModel.repairLoops}
        state={viewModel.contentStates.repairLoops}
      />
      <div className="grid min-w-0 gap-1.5 xl:grid-cols-[minmax(280px,.95fr)_minmax(0,1.15fr)_minmax(260px,.85fr)]">
        <HabitDetailFocus
          focus={viewModel.detailFocus}
          profileId={viewModel.profileId}
          state={viewModel.contentStates.detailFocus}
        />
        <WeeklyRhythmInsights
          insights={viewModel.weeklyRhythmInsights}
          profileId={viewModel.profileId}
          state={viewModel.contentStates.weeklyRhythmInsights}
        />
        <BoundaryCard boundary={viewModel.boundary} />
      </div>
      <InterpretationFooter interpretation={viewModel.interpretation} />
    </div>
  );
}

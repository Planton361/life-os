import type { CSSProperties } from "react";
import {
  dashboardMockData,
  type DashboardCurrentTask,
  type DashboardDailyControl,
  type DashboardQueueItem,
} from "@/features/dashboard";
import { cn } from "@/lib/cn";

const { commandCenter, quickCapture } = dashboardMockData;
const metrics = commandCenter.metrics;
const timeRows = commandCenter.timeProgress;

function accentStyle(accent: string, progress?: number): CSSProperties {
  return {
    "--accent": accent,
    "--progress": `${progress ?? 0}%`,
  } as CSSProperties;
}

function ProgressBar({
  progress,
  accent,
  quiet = false,
}: Readonly<{
  progress: number;
  accent: string;
  quiet?: boolean;
}>) {
  return (
    <div className="h-1.5 rounded-full bg-[rgba(168,183,204,.11)]">
      <div
        aria-hidden="true"
        className={cn(
          "h-full w-[var(--progress)] rounded-full",
          quiet
            ? "bg-[color-mix(in_srgb,var(--accent)_42%,transparent)]"
            : "bg-[color-mix(in_srgb,var(--accent)_82%,transparent)]",
        )}
        style={accentStyle(accent, progress)}
      />
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  progress,
  accent,
  compact = false,
}: Readonly<(typeof metrics)[number] & { compact?: boolean }>) {
  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-[13px] border border-[var(--border-subtle)] bg-[#101a2a] p-2.5 pb-3",
        compact && "2xl:p-2 2xl:pb-2.5",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-medium leading-tight text-[var(--text-secondary)]">
            {label}
          </p>
          <p
            className={cn(
              "mt-1 text-[19px] font-semibold leading-none text-[var(--text-secondary)]",
              compact && "2xl:mt-0.5 2xl:text-[17px]",
            )}
          >
            {value}
          </p>
        </div>
        <span
          aria-hidden="true"
          className={cn(
            "mt-2.5 grid size-6 place-items-center rounded-full border border-[color-mix(in_srgb,var(--accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]",
            compact && "2xl:mt-2",
          )}
          style={{ "--accent": accent } as CSSProperties}
        >
          <span
            className="size-2.5 rounded-full bg-[var(--accent)] shadow-[0_0_18px_color-mix(in_srgb,var(--accent)_60%,transparent)]"
          />
        </span>
      </div>
      <p
        className={cn(
          "mt-1 text-[10px] font-medium leading-tight text-[var(--text-muted)]",
          compact && "2xl:mt-0.5",
        )}
      >
        {detail}
      </p>
      <div className={cn("mt-auto pt-2", compact && "2xl:pt-1")}>
        <ProgressBar accent={accent} progress={progress} />
      </div>
    </article>
  );
}

function QuickThought() {
  return (
    <section
      aria-labelledby="quick-thought-title"
      className="flex h-[265px] flex-col rounded-[var(--panel-radius)] border border-[rgba(91,124,250,.22)] bg-[rgba(15,26,43,.90)] p-3 shadow-[0_8px_22px_rgba(0,0,0,.12)]"
    >
      <div className="flex items-center justify-between">
        <h2
          className="text-[13px] font-semibold text-[var(--text-primary)]"
          id="quick-thought-title"
        >
          {quickCapture.title}
        </h2>
        <span className="text-[11px] font-semibold text-[var(--text-primary)]">
          {quickCapture.destinationLabel}
        </span>
      </div>
      <div className="mt-2 flex flex-1 flex-col rounded-[18px] border border-[rgba(91,124,250,.23)] bg-[rgba(15,26,43,.90)] p-3">
        <div className="border-l-4 border-[rgba(91,124,250,.82)] pl-3">
          <p className="text-[10px] font-medium text-[var(--text-secondary)]">
            {quickCapture.placeholder}
          </p>
          <p className="mt-2 text-[9px] font-medium text-[var(--text-faint)]">
            {quickCapture.helperText}
          </p>
        </div>
        <div className="mt-4 space-y-2" aria-hidden="true">
          <div className="h-[3px] w-20 rounded-full bg-[rgba(91,124,250,.26)]" />
          <div className="h-[3px] w-14 rounded-full bg-[rgba(91,124,250,.18)]" />
        </div>
        <div className="mt-auto flex justify-center">
          <span className="rounded-full border border-[rgba(91,124,250,.34)] bg-[rgba(91,124,250,.16)] px-8 py-2 text-[10px] font-medium text-[var(--text-secondary)]">
            {quickCapture.captureLabel}
          </span>
        </div>
      </div>
      <div className="mt-2 flex flex-nowrap justify-center gap-1 overflow-hidden">
        {quickCapture.kinds.map((type) => (
          <span
            className="shrink-0 rounded-full border border-[rgba(91,124,250,.20)] bg-[rgba(91,124,250,.09)] px-2 py-0.5 text-[9px] font-medium text-[var(--text-secondary)]"
            key={type}
          >
            {type}
          </span>
        ))}
      </div>
    </section>
  );
}

function DailyControlStatusPill({
  label,
}: Readonly<{
  label: string;
}>) {
  return (
    <span className="rounded-full border border-[rgba(91,124,250,.24)] bg-[rgba(17,28,46,.96)] px-3 py-1 text-[10px] font-medium text-[var(--text-secondary)]">
      {label}
    </span>
  );
}

function DailyControlCurrentTask({
  task,
}: Readonly<{
  task: DashboardCurrentTask;
}>) {
  return (
    <article className="h-[204px] rounded-[18px] border border-[rgba(91,124,250,.28)] bg-[rgba(21,36,58,.98)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase text-[var(--text-secondary)]">
            {task.sectionLabel}
          </p>
          <p className="mt-1 text-[10px] font-medium text-[var(--text-secondary)]">
            {task.timeRemainingLabel}
          </p>
        </div>
        <DailyControlStatusPill label={task.statusLabel} />
      </div>
      <p className="mt-3 text-[21px] font-semibold leading-[1.18] text-[var(--text-primary)]">
        {task.title}
      </p>
      <p className="mt-3 text-[11px] font-medium text-[var(--text-secondary)]">
        {task.contextLabel}
      </p>
      <div className="mt-2">
        <ProgressBar accent={task.accent} progress={task.progress} />
      </div>
      <span className="mt-3 flex min-h-[24px] items-center justify-center rounded-full border border-[rgba(91,124,250,.36)] bg-[rgba(91,124,250,.18)] text-[10px] font-medium text-[var(--text-secondary)]">
        {task.actionLabel}
      </span>
    </article>
  );
}

function DailyControlQueueItem({
  item,
}: Readonly<{
  item: DashboardQueueItem;
}>) {
  return (
    <article
      className="grid min-h-12 grid-cols-[4px_8px_minmax(0,1fr)_76px_10px] items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[#111c2e] pr-2"
    >
      <span className="h-full rounded-full bg-[rgba(91,124,250,.72)]" />
      <span className="size-2 rounded-full bg-[var(--accent-blue)]" />
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-[var(--text-secondary)]">
          {item.title}
        </p>
        <p className="mt-0.5 truncate text-[10px] font-medium text-[var(--text-secondary)]">
          {item.meta}
        </p>
      </div>
      <span className="rounded-full border border-[rgba(91,124,250,.24)] px-2 py-1 text-center text-[10px] font-medium text-[var(--text-secondary)]">
        {item.tag}
      </span>
      <span aria-hidden="true" className="text-base text-[var(--text-secondary)]">
        ›
      </span>
    </article>
  );
}

function DailyControlQueue({
  data,
}: Readonly<{
  data: DashboardDailyControl;
}>) {
  return (
    <section
      aria-label={data.queueTitle}
      className="h-[204px] min-w-0 rounded-[13px] px-1"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">
            {data.queueTitle}
          </h3>
          <p className="text-[10px] font-semibold text-[var(--text-secondary)]">
            {data.queueSubtitle}
          </p>
        </div>
        <DailyControlStatusPill label={data.queueSummary} />
      </div>
      <div className="mt-2 space-y-1.5">
        {data.queue.map((item) => (
          <DailyControlQueueItem item={item} key={item.title} />
        ))}
      </div>
    </section>
  );
}

function DailyControl() {
  const data = dashboardMockData.dailyControl;

  return (
    <section
      aria-labelledby="daily-control-title"
      className="grid min-h-[265px] gap-3 overflow-hidden rounded-[var(--panel-radius)] border border-[rgba(91,124,250,.30)] bg-[#15243a] p-3 shadow-[0_16px_40px_rgba(0,0,0,.24)] lg:h-[265px] lg:grid-cols-[236px_minmax(0,1fr)]"
    >
      <div className="lg:col-span-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <h2
            className="text-sm font-semibold text-[var(--text-primary)]"
            id="daily-control-title"
          >
            {data.title}
          </h2>
          <p className="text-[10px] font-medium text-[var(--text-muted)]">
            {data.subtitle}
          </p>
        </div>
      </div>

      <DailyControlCurrentTask task={data.currentTask} />
      <DailyControlQueue data={data} />
    </section>
  );
}

function TimeProgress() {
  return (
    <section
      aria-labelledby="time-progress-title"
      className="h-full overflow-hidden rounded-[var(--panel-radius)] border border-[var(--border-subtle)] bg-[#0d1625] p-3 shadow-[0_10px_26px_rgba(0,0,0,.14)]"
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_96px]">
        <div>
          <h2
            className="text-xs font-medium text-[var(--text-secondary)]"
            id="time-progress-title"
          >
            Time Progress
          </h2>
          <div className="mt-2 space-y-1.5">
            {timeRows.map((row) => (
              <div
                className="grid grid-cols-[72px_minmax(0,1fr)_32px] items-center gap-2"
                key={row.label}
              >
                <p className="text-[10px] font-medium uppercase text-[var(--text-muted)]">
                  {row.label}
                </p>
                <ProgressBar
                  accent="var(--accent-blue)"
                  progress={row.progress}
                  quiet
                />
                <p className="text-[10px] font-medium text-[var(--text-muted)]">
                  {row.value}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[18px] border border-[rgba(168,183,204,.10)] bg-[rgba(168,183,204,.07)] p-2 text-center">
          <div aria-hidden="true" className="mx-auto h-6 w-12 rounded-full bg-[rgba(168,183,204,.30)]" />
          <p className="mt-2 text-[9px] font-medium text-[var(--text-muted)]">
            {commandCenter.weather.temperatureLabel}
          </p>
          <p className="mt-0.5 text-[9px] font-medium text-[var(--text-muted)]">
            {commandCenter.weather.periodLabel}
          </p>
        </div>
      </div>
    </section>
  );
}

function MoodBoard() {
  const moodAccent = "var(--accent-green)";

  return (
    <section
      aria-labelledby="mood-title"
      className="h-full overflow-hidden rounded-[var(--panel-radius)] border border-[rgba(66,184,131,.18)] bg-[#0d1625] p-3 shadow-[0_10px_26px_rgba(0,0,0,.14)]"
    >
      <div className="grid h-full gap-3 sm:grid-cols-[132px_minmax(0,1fr)] sm:items-center">
        <div className="flex h-full flex-col justify-center">
          <p className="text-[10px] font-semibold uppercase text-[rgba(66,184,131,.78)]">
            {commandCenter.moodCheck.eyebrow}
          </p>
          <h2
            className="mt-1 text-base font-semibold text-[var(--text-primary)]"
            id="mood-title"
          >
            {commandCenter.moodCheck.title}
          </h2>
          <p className="mt-1 text-[10px] font-medium text-[var(--text-muted)]">
            {commandCenter.moodCheck.prompt}
          </p>
        </div>
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-7 place-items-center rounded-full bg-[rgba(66,184,131,.13)] text-sm text-[var(--accent-green)]">
                :)
              </span>
              <div>
                <p className="text-lg font-semibold text-[var(--text-primary)]">
                  {commandCenter.moodCheck.moodLabel}
                </p>
                <p className="mt-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                  {commandCenter.moodCheck.detail}
                </p>
              </div>
            </div>
            <p className="text-[10px] font-semibold text-[rgba(66,184,131,.78)]">
              {commandCenter.moodCheck.scoreLabel}
            </p>
          </div>
          <div className="mt-2">
            <ProgressBar
              accent={moodAccent}
              progress={commandCenter.moodCheck.progress}
              quiet
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {commandCenter.moodCheck.options.map(
              (mood) => (
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[9px] font-medium",
                    mood === commandCenter.moodCheck.activeOption
                      ? "border-[rgba(66,184,131,.28)] bg-[rgba(66,184,131,.13)] text-[var(--text-secondary)]"
                      : "border-[var(--border-subtle)] bg-[rgba(168,183,204,.05)] text-[var(--text-muted)]",
                  )}
                  key={mood}
                >
                  {mood}
                </span>
              ),
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function CommandCenter() {
  return (
    <header className="px-3 pt-3">
      <div className="rounded-[var(--panel-radius)] border border-[var(--border-subtle)] bg-[rgba(12,20,34,.94)] p-3 shadow-[0_10px_26px_rgba(0,0,0,.14)]">
        <div className="grid gap-3 2xl:h-[var(--top-zone-height)] 2xl:grid-cols-[580px_278px_minmax(700px,1fr)_600px] 2xl:items-start 2xl:gap-[9px] 2xl:overflow-hidden">
          <section
            aria-label="Command Center Stats"
            className="p-1 2xl:h-[265px] 2xl:overflow-hidden"
          >
            <p className="text-3xl font-semibold text-[var(--text-secondary)]">
              {commandCenter.greeting}
            </p>
            <p className="mt-2 text-xs font-medium text-[var(--text-secondary)]">
              {commandCenter.dateLabel} · {commandCenter.dayTypeLabel}
            </p>
            <div className="mt-5 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3 2xl:h-[181px] 2xl:grid-rows-[88px_81px] 2xl:gap-y-3">
              {metrics.map((metric, index) => (
                <MetricCard
                  compact={index >= 3}
                  key={metric.label}
                  {...metric}
                />
              ))}
            </div>
          </section>

          <QuickThought />
          <DailyControl />

          <div className="grid h-[265px] grid-rows-[104px_minmax(0,1fr)] gap-3 overflow-hidden">
            <TimeProgress />
            <MoodBoard />
          </div>
        </div>
      </div>
    </header>
  );
}

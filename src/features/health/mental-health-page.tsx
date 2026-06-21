import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { Pill, accentStyle } from "@/components/layout/route-page-primitives";
import {
  DotRhythm,
  barHeightStyle,
} from "@/features/health/components/health-overview-primitives";
import { cn } from "@/lib/cn";
import type {
  MentalHealthAccent,
  MentalHealthActionViewModel,
  MentalHealthBoundaryViewModel,
  MentalHealthCheckItemViewModel,
  MentalHealthMetricViewModel,
  MentalHealthMoodViewModel,
  MentalHealthPageViewModel,
  MentalHealthRoutineViewModel,
  MentalHealthSleepBarViewModel,
} from "./mental-health-view-model";

type ProgressStyle = CSSProperties & {
  "--progress-width"?: string;
};

function titleId(title: string) {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-section`;
}

function progressStyle(value: number): ProgressStyle {
  return {
    "--progress-width": `${Math.max(0, Math.min(100, value))}%`,
  };
}

function MentalPanel({
  title,
  subtitle,
  badge,
  accent = "var(--accent-purple)",
  className,
  children,
}: Readonly<{
  title: string;
  subtitle: string;
  badge?: string;
  accent?: MentalHealthAccent;
  className?: string;
  children: ReactNode;
}>) {
  const id = titleId(title);

  return (
    <section
      aria-labelledby={id}
      className={cn(
        "min-w-0 overflow-hidden rounded-[18px] border border-[color-mix(in_srgb,var(--accent)_24%,var(--border-subtle))] bg-[rgba(15,23,36,.82)] shadow-[0_8px_22px_rgba(0,0,0,.12)]",
        className,
      )}
      style={accentStyle(accent)}
    >
      <div className="border-b border-[var(--border-subtle)] bg-[linear-gradient(90deg,color-mix(in_srgb,var(--accent)_9%,rgba(18,28,43,.78)),rgba(18,28,43,.50)_66%)] px-4 py-2.5">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              className="text-[17px] font-semibold leading-5 text-[var(--text-primary)]"
              id={id}
            >
              {title}
            </h2>
            <p className="mt-1 text-[10px] leading-4 text-[var(--text-secondary)]">
              {subtitle}
            </p>
          </div>
          {badge ? <Pill accent={accent}>{badge}</Pill> : null}
        </div>
      </div>
      <div className="p-2.5 min-[1900px]:p-3">{children}</div>
    </section>
  );
}

function TextButton({
  children,
  accent = "var(--accent-purple)",
}: Readonly<{
  children: ReactNode;
  accent?: MentalHealthAccent;
}>) {
  return (
    <button
      className="inline-flex min-h-9 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--accent)_32%,transparent)] bg-[color-mix(in_srgb,var(--accent)_13%,rgba(18,28,43,.80))] px-3 text-[10px] font-semibold text-[var(--text-primary)] transition hover:border-[color-mix(in_srgb,var(--accent)_48%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] 2xl:min-h-8"
      style={accentStyle(accent)}
      type="button"
    >
      {children}
    </button>
  );
}

function TextLink({
  href,
  children,
  accent = "var(--accent-purple)",
  quiet = false,
}: Readonly<{
  href: `/${string}`;
  children: ReactNode;
  accent?: MentalHealthAccent;
  quiet?: boolean;
}>) {
  return (
    <Link
      className={cn(
        "inline-flex min-h-9 items-center justify-center rounded-full border px-3 text-[10px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] 2xl:min-h-8",
        quiet
          ? "border-[var(--border-subtle)] bg-[rgba(18,28,43,.72)] text-[var(--text-secondary)] hover:border-[color-mix(in_srgb,var(--accent)_32%,transparent)] hover:text-[var(--text-primary)]"
          : "border-[color-mix(in_srgb,var(--accent)_38%,transparent)] bg-[color-mix(in_srgb,var(--accent)_16%,rgba(18,28,43,.80))] text-[var(--text-primary)] hover:border-[color-mix(in_srgb,var(--accent)_52%,transparent)]",
      )}
      href={href}
      style={accentStyle(accent)}
    >
      {children}
    </Link>
  );
}

function ProgressBar({
  value,
  label,
  accent,
}: Readonly<{
  value: number;
  label: string;
  accent: MentalHealthAccent;
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

function MetricCard({
  metric,
}: Readonly<{
  metric: MentalHealthMetricViewModel;
}>) {
  return (
    <article
      className="min-w-0 rounded-[12px] border border-[color-mix(in_srgb,var(--accent)_20%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent)_6%,rgba(11,17,28,.46))] px-3 py-1.5"
      style={accentStyle(metric.accent)}
    >
      <p className="truncate text-[10px] font-semibold text-[var(--text-muted)]">
        {metric.label}
      </p>
      <p className="mt-0.5 truncate text-[17px] font-semibold leading-5 text-[var(--text-primary)]">
        {metric.value}
      </p>
      <p className="mt-0.5 truncate text-[10px] leading-4 text-[var(--text-secondary)]">
        {metric.detail}
      </p>
      {metric.progress && metric.progressLabel ? (
        <div className="mt-1.5">
          <ProgressBar
            accent={metric.accent}
            label={`${metric.label}: ${metric.progressLabel}`}
            value={metric.progress}
          />
        </div>
      ) : null}
    </article>
  );
}

function MentalHealthHeader({
  header,
}: Readonly<{
  header: MentalHealthPageViewModel["header"];
}>) {
  return (
    <header className="min-w-0 overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.82)] shadow-[0_8px_22px_rgba(0,0,0,.12)]">
      <div className="grid gap-3 bg-[linear-gradient(90deg,rgba(155,124,246,.065),transparent_54%)] px-4 py-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(260px,330px)] xl:items-center">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-[var(--text-muted)]">
            {header.breadcrumb.join(" / ")}
          </p>
          <h1 className="mt-1 text-[28px] font-semibold leading-none text-[var(--text-primary)] sm:text-[30px]">
            {header.title}
          </h1>
          <p className="mt-1.5 max-w-3xl text-xs leading-5 text-[var(--text-secondary)]">
            {header.subtitle}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {header.pills.map((pill) => (
              <Pill accent={pill.accent} key={pill.label}>
                {pill.label}
              </Pill>
            ))}
          </div>
        </div>

        <article
          className="min-w-0 rounded-[14px] border border-[color-mix(in_srgb,var(--accent)_22%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent)_7%,rgba(11,17,28,.54))] p-2.5"
          style={accentStyle(header.signal.accent)}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            {header.signal.label}
          </p>
          <div className="mt-1.5 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[20px] font-semibold leading-6 text-[var(--text-primary)]">
                {header.signal.value}
              </p>
              <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-secondary)]">
                {header.signal.detail}
              </p>
            </div>
            {header.signal.progress && header.signal.progressLabel ? (
              <div className="w-28 shrink-0">
                <ProgressBar
                  accent={header.signal.accent}
                  label={`${header.signal.label}: ${header.signal.progressLabel}`}
                  value={header.signal.progress}
                />
              </div>
            ) : null}
          </div>
        </article>
      </div>
    </header>
  );
}

function CheckItem({
  item,
}: Readonly<{
  item: MentalHealthCheckItemViewModel;
}>) {
  return (
    <article
      className="min-w-0 rounded-[11px] border border-[color-mix(in_srgb,var(--accent)_18%,var(--border-subtle))] bg-[rgba(11,17,28,.32)] px-2.5 py-1.5 text-center"
      style={accentStyle(item.accent)}
    >
      <span
        aria-hidden="true"
        className="mx-auto block size-1.5 rounded-full bg-[var(--accent)]"
      />
      <p className="mt-1.5 truncate text-[11px] font-semibold text-[var(--text-primary)]">
        {item.label}
      </p>
      <p className="mt-0.5 truncate text-[10px] font-semibold text-[var(--accent)]">
        {item.value}
      </p>
      <p className="mt-0.5 truncate text-[9px] text-[var(--text-muted)]">
        {item.detail}
      </p>
    </article>
  );
}

function TodayCheckInPanel({
  checkIn,
  className,
}: Readonly<{
  checkIn: MentalHealthPageViewModel["checkIn"];
  className?: string;
}>) {
  return (
    <MentalPanel
      accent="var(--accent-purple)"
      badge={checkIn.badge}
      className={className}
      subtitle={checkIn.subtitle}
      title={checkIn.title}
    >
      <div className="rounded-[14px] border border-[rgba(148,163,184,.10)] bg-[rgba(11,17,28,.32)] p-2.5">
        <p className="text-[24px] font-semibold leading-none text-[var(--text-primary)]">
          {checkIn.messageTitle}
        </p>
        <p className="mt-1.5 max-w-2xl text-xs leading-4 text-[var(--text-secondary)]">
          {checkIn.message}
        </p>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-5">
        {checkIn.items.map((item) => (
          <CheckItem item={item} key={item.label} />
        ))}
      </div>

      <div className="mt-2 flex flex-col gap-2 rounded-[13px] border border-[rgba(148,163,184,.10)] bg-[rgba(11,17,28,.34)] p-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            {checkIn.nextRepair.label}
          </p>
          <p className="mt-1 text-sm font-semibold leading-5 text-[var(--text-primary)]">
            {checkIn.nextRepair.value}
          </p>
        </div>
        <TextButton>{checkIn.actionLabel}</TextButton>
      </div>
    </MentalPanel>
  );
}

function MoodCard({
  mood,
}: Readonly<{
  mood: MentalHealthMoodViewModel;
}>) {
  return (
    <article
      className="min-w-0 rounded-[11px] border border-[color-mix(in_srgb,var(--accent)_18%,var(--border-subtle))] bg-[rgba(11,17,28,.32)] p-2.5"
      style={accentStyle(mood.accent)}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[11px] font-semibold text-[var(--text-primary)]">
          {mood.label}
        </p>
        <p className="shrink-0 text-[10px] text-[var(--text-muted)]">
          {mood.value}
        </p>
      </div>
      <p className="mt-1 truncate text-[10px] text-[var(--text-secondary)]">
        {mood.detail}
      </p>
      <div className="mt-2">
        <DotRhythm
          accent={mood.accent}
          dense
          label={`${mood.label}: ${mood.value}, ${mood.detail}`}
          pattern={mood.pattern}
        />
      </div>
    </article>
  );
}

function MoodPatternPanel({
  moodPattern,
  className,
}: Readonly<{
  moodPattern: MentalHealthPageViewModel["moodPattern"];
  className?: string;
}>) {
  return (
    <MentalPanel
      accent="var(--accent-purple)"
      badge={moodPattern.rangeLabel}
      className={className}
      subtitle={moodPattern.subtitle}
      title={moodPattern.title}
    >
      <div className="grid gap-1.5 sm:grid-cols-2 min-[1900px]:grid-cols-3">
        {moodPattern.moods.map((mood) => (
          <MoodCard key={mood.label} mood={mood} />
        ))}
      </div>

      <div className="mt-2 rounded-[13px] border border-[rgba(148,163,184,.10)] bg-[rgba(11,17,28,.34)] p-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          Interpretation
        </p>
        <p className="mt-1 text-[11px] leading-4 text-[var(--text-secondary)]">
          {moodPattern.interpretation}
        </p>
      </div>
    </MentalPanel>
  );
}

function CurrentSignalPanel({
  currentSignal,
  className,
}: Readonly<{
  currentSignal: MentalHealthPageViewModel["currentSignal"];
  className?: string;
}>) {
  return (
    <MentalPanel
      accent="var(--accent-blue)"
      className={className}
      subtitle={currentSignal.subtitle}
      title={currentSignal.title}
    >
      <div className="grid gap-2 sm:grid-cols-3">
        {currentSignal.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>
      <div className="mt-2 rounded-[13px] border border-[rgba(148,163,184,.10)] bg-[rgba(11,17,28,.34)] p-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          {currentSignal.interpretation.label}
        </p>
        <p className="mt-1 text-[12px] font-semibold leading-5 text-[var(--text-primary)]">
          {currentSignal.interpretation.value}
        </p>
        <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-secondary)]">
          {currentSignal.interpretation.detail}
        </p>
      </div>
      <div className="mt-2 rounded-[13px] border border-[rgba(66,184,131,.18)] bg-[rgba(66,184,131,.06)] p-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          {currentSignal.nextStep.label}
        </p>
        <p className="mt-1 text-[12px] font-semibold leading-5 text-[var(--text-primary)]">
          {currentSignal.nextStep.value}
        </p>
        <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-secondary)]">
          {currentSignal.nextStep.detail}
        </p>
      </div>
    </MentalPanel>
  );
}

function SleepBar({
  bar,
}: Readonly<{
  bar: MentalHealthSleepBarViewModel;
}>) {
  return (
    <div
      aria-label={`${bar.day}: ${bar.label}`}
      className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1"
      role="img"
    >
      <div className="flex h-16 items-end rounded-full bg-[rgba(82,97,120,.18)]">
        <span
          aria-hidden="true"
          className="block h-[var(--bar-height)] w-full rounded-full bg-[rgba(155,124,246,.76)]"
          style={barHeightStyle(bar.value)}
        />
      </div>
      <span className="truncate text-center text-[9px] text-[var(--text-muted)]">
        {bar.day}
      </span>
    </div>
  );
}

function SleepRecoveryPanel({
  sleepRecovery,
  className,
}: Readonly<{
  sleepRecovery: MentalHealthPageViewModel["sleepRecovery"];
  className?: string;
}>) {
  return (
    <MentalPanel
      accent="var(--accent-cyan)"
      badge="Recovery context"
      className={className}
      subtitle={sleepRecovery.subtitle}
      title={sleepRecovery.title}
    >
      <div className="grid gap-2 sm:grid-cols-3">
        {sleepRecovery.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>

      <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(180px,.8fr)]">
        <section
          aria-label="Sleep rhythm for the last 7 days"
          className="flex min-h-[96px] items-end gap-2 rounded-[13px] border border-[rgba(148,163,184,.10)] bg-[rgba(11,17,28,.34)] px-3 py-2.5"
        >
          {sleepRecovery.bars.map((bar) => (
            <SleepBar bar={bar} key={bar.day} />
          ))}
        </section>

        <section className="rounded-[13px] border border-[rgba(148,163,184,.10)] bg-[rgba(11,17,28,.34)] p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            {sleepRecovery.tonightCue.label}
          </p>
          <p className="mt-1.5 text-sm font-semibold leading-5 text-[var(--text-primary)]">
            {sleepRecovery.tonightCue.value}
          </p>
          <p className="mt-1 text-[10px] leading-4 text-[var(--text-secondary)]">
            {sleepRecovery.tonightCue.detail}
          </p>
        </section>
      </div>
    </MentalPanel>
  );
}

function JournalRhythmPanel({
  journalRhythm,
  className,
}: Readonly<{
  journalRhythm: MentalHealthPageViewModel["journalRhythm"];
  className?: string;
}>) {
  return (
    <MentalPanel
      accent="var(--accent-purple)"
      badge={journalRhythm.value}
      className={className}
      subtitle={journalRhythm.subtitle}
      title={journalRhythm.title}
    >
      <div className="rounded-[13px] border border-[rgba(148,163,184,.10)] bg-[rgba(11,17,28,.34)] p-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Last 7 reflections
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
              {journalRhythm.value}
            </p>
          </div>
          <DotRhythm
            accent="var(--accent-purple)"
            label={`Journal rhythm: ${journalRhythm.value}`}
            pattern={journalRhythm.pattern}
          />
        </div>
      </div>

      <div className="mt-2 grid gap-2 md:grid-cols-2">
        <section className="rounded-[13px] border border-[rgba(148,163,184,.10)] bg-[rgba(11,17,28,.34)] p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            {journalRhythm.focus.label}
          </p>
          <p className="mt-1 text-[12px] font-semibold leading-5 text-[var(--text-primary)]">
            {journalRhythm.focus.value}
          </p>
        </section>
        <section className="rounded-[13px] border border-[rgba(148,163,184,.10)] bg-[rgba(11,17,28,.34)] p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            {journalRhythm.lastReflection.label}
          </p>
          <p className="mt-1 text-[12px] font-semibold leading-5 text-[var(--text-primary)]">
            {journalRhythm.lastReflection.value}
          </p>
          <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-secondary)]">
            {journalRhythm.lastReflection.detail}
          </p>
        </section>
      </div>

      <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <section className="rounded-[13px] border border-[rgba(148,163,184,.10)] bg-[rgba(11,17,28,.34)] p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            {journalRhythm.prompt.label}
          </p>
          <p className="mt-1.5 text-sm font-semibold leading-5 text-[var(--text-primary)]">
            {journalRhythm.prompt.value}
          </p>
          <p className="mt-1 text-[10px] leading-4 text-[var(--text-secondary)]">
            {journalRhythm.prompt.detail}
          </p>
        </section>
        <TextLink accent="var(--accent-purple)" href={journalRhythm.href}>
          {journalRhythm.actionLabel}
        </TextLink>
      </div>
    </MentalPanel>
  );
}

function RoutineRow({
  routine,
}: Readonly<{
  routine: MentalHealthRoutineViewModel;
}>) {
  return (
    <article
      className="grid gap-2 rounded-[12px] border border-[color-mix(in_srgb,var(--accent)_18%,var(--border-subtle))] bg-[rgba(11,17,28,.32)] px-2.5 py-2 sm:grid-cols-[minmax(110px,.7fr)_minmax(0,1fr)_110px] sm:items-center"
      style={accentStyle(routine.accent)}
    >
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold text-[var(--text-primary)]">
          {routine.title}
        </p>
        <p className="mt-1 truncate text-[10px] text-[var(--accent)]">
          {routine.readinessLabel}
        </p>
      </div>
      <p className="min-w-0 text-[10px] leading-4 text-[var(--text-secondary)]">
        {routine.detail}
      </p>
      <ProgressBar
        accent={routine.accent}
        label={`${routine.title}: ${routine.readinessLabel}`}
        value={routine.readiness}
      />
    </article>
  );
}

function RepairRoutinesPanel({
  repairRoutines,
  className,
}: Readonly<{
  repairRoutines: MentalHealthPageViewModel["repairRoutines"];
  className?: string;
}>) {
  return (
    <MentalPanel
      accent="var(--accent-green)"
      className={className}
      subtitle={repairRoutines.subtitle}
      title={repairRoutines.title}
    >
      <div className="grid gap-2">
        {repairRoutines.routines.map((routine) => (
          <RoutineRow key={routine.title} routine={routine} />
        ))}
      </div>
      <div className="mt-2 rounded-[13px] border border-[rgba(66,184,131,.18)] bg-[rgba(66,184,131,.06)] p-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          {repairRoutines.recommendedToday.label}
        </p>
        <p className="mt-1 text-[12px] font-semibold leading-5 text-[var(--text-primary)]">
          {repairRoutines.recommendedToday.value}
        </p>
        <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-secondary)]">
          {repairRoutines.recommendedToday.detail}
        </p>
      </div>
    </MentalPanel>
  );
}

function TimelineAction({
  action,
}: Readonly<{
  action: MentalHealthActionViewModel;
}>) {
  return (
    <li className="relative grid grid-cols-[52px_10px_minmax(0,1fr)] gap-2">
      <time
        className="pt-4 text-right text-[10px] font-medium text-[var(--text-muted)]"
        dateTime={action.time}
      >
        {action.time}
      </time>
      <div className="relative flex justify-center">
        <span
          aria-hidden="true"
          className="absolute top-0 h-full w-px bg-[rgba(148,163,184,.16)]"
        />
        <span
          aria-hidden="true"
          className="relative mt-4 size-2 rounded-full bg-[var(--accent)]"
          style={accentStyle(action.accent)}
        />
      </div>
      <article
        className="min-w-0 rounded-[13px] border border-[color-mix(in_srgb,var(--accent)_20%,var(--border-subtle))] bg-[rgba(18,28,43,.50)] px-3 py-2"
        style={accentStyle(action.accent)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-[var(--accent)]">
              {action.status}
            </p>
            <h3 className="mt-1 text-[13px] font-semibold leading-4 text-[var(--text-primary)]">
              {action.title}
            </h3>
            <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-secondary)]">
              {action.detail}
            </p>
          </div>
          <span
            aria-hidden="true"
            className="mt-1 size-1.5 shrink-0 rounded-full bg-[var(--accent)]"
          />
        </div>
      </article>
    </li>
  );
}

function MentalHealthActionsPanel({
  actions,
  className,
}: Readonly<{
  actions: MentalHealthPageViewModel["actions"];
  className?: string;
}>) {
  return (
    <MentalPanel
      accent="var(--accent-purple)"
      badge={actions.badge}
      className={className}
      subtitle={actions.subtitle}
      title={actions.title}
    >
      <ol className="grid gap-2">
        {actions.items.map((action) => (
          <TimelineAction
            action={action}
            key={`${action.time}-${action.title}`}
          />
        ))}
      </ol>

      <div className="mt-3 rounded-[14px] border border-[rgba(148,163,184,.10)] bg-[rgba(11,17,28,.34)] p-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          {actions.decisionRule.label}
        </p>
        <p className="mt-1.5 text-sm font-semibold leading-5 text-[var(--text-primary)]">
          {actions.decisionRule.value}
        </p>
        <p className="mt-1 text-[10px] leading-4 text-[var(--text-secondary)]">
          {actions.decisionRule.detail}
        </p>
        <div className="mt-2 max-w-36">
          <ProgressBar
            accent="var(--accent-green)"
            label={actions.decisionRule.progressLabel}
            value={actions.decisionRule.progress}
          />
        </div>
      </div>

      <div className="mt-2 flex flex-wrap justify-end gap-2">
        <TextLink accent="var(--accent-cyan)" href={actions.todayHref} quiet>
          {actions.todayLabel}
        </TextLink>
        <TextLink accent="var(--accent-purple)" href={actions.journalHref}>
          {actions.journalLabel}
        </TextLink>
      </div>
    </MentalPanel>
  );
}

function BoundaryCard({
  item,
}: Readonly<{
  item: MentalHealthBoundaryViewModel;
}>) {
  return (
    <article
      className="grid min-w-0 grid-cols-[4px_minmax(0,1fr)] gap-2.5 rounded-[12px] border border-[color-mix(in_srgb,var(--accent)_16%,var(--border-subtle))] bg-[rgba(11,17,28,.32)] px-3 py-2.5"
      style={accentStyle(item.accent)}
    >
      <span
        aria-hidden="true"
        className="h-full rounded-full bg-[var(--accent)]"
      />
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold text-[var(--text-primary)]">
          {item.title}
        </p>
        <p className="mt-1 text-[10px] leading-4 text-[var(--text-secondary)]">
          {item.detail}
        </p>
      </div>
    </article>
  );
}

function SafetyBoundariesStrip({
  safety,
  className,
}: Readonly<{
  safety: MentalHealthPageViewModel["safety"];
  className?: string;
}>) {
  const id = titleId(safety.title);

  return (
    <section
      aria-labelledby={id}
      className={cn(
        "min-w-0 overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.86)] shadow-[0_8px_22px_rgba(0,0,0,.12)]",
        className,
      )}
    >
      <div className="h-0.5 bg-[var(--accent-purple)]" />
      <div className="px-4 py-4">
        <h2
          className="text-[18px] font-semibold leading-6 text-[var(--text-primary)]"
          id={id}
        >
          {safety.title}
        </h2>
        <p className="mt-1 max-w-4xl text-xs leading-5 text-[var(--text-secondary)]">
          {safety.subtitle}
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {safety.items.map((item) => (
            <BoundaryCard item={item} key={item.title} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function MentalHealthActionLandingPage({
  viewModel,
}: Readonly<{
  viewModel: MentalHealthPageViewModel;
}>) {
  return (
    <div className="mx-auto flex w-full max-w-[2208px] flex-col gap-1.5 pb-3">
      <MentalHealthHeader header={viewModel.header} />

      <div className="grid min-w-0 gap-1.5 xl:grid-cols-2 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(390px,520px)] 2xl:items-start">
        <TodayCheckInPanel
          checkIn={viewModel.checkIn}
          className="order-1 2xl:order-none 2xl:col-start-1 2xl:row-start-1"
        />
        <MentalHealthActionsPanel
          actions={viewModel.actions}
          className="order-2 xl:row-span-2 2xl:order-none 2xl:col-start-3 2xl:row-span-3 2xl:row-start-1"
        />
        <CurrentSignalPanel
          className="order-3 2xl:order-none 2xl:col-start-1 2xl:row-start-3"
          currentSignal={viewModel.currentSignal}
        />
        <MoodPatternPanel
          className="order-4 2xl:order-none 2xl:col-start-1 2xl:row-start-2"
          moodPattern={viewModel.moodPattern}
        />
        <SleepRecoveryPanel
          className="order-5 2xl:order-none 2xl:col-start-2 2xl:row-start-1"
          sleepRecovery={viewModel.sleepRecovery}
        />
        <JournalRhythmPanel
          className="order-6 2xl:order-none 2xl:col-start-2 2xl:row-start-2"
          journalRhythm={viewModel.journalRhythm}
        />
        <RepairRoutinesPanel
          className="order-7 2xl:order-none 2xl:col-start-2 2xl:row-start-3"
          repairRoutines={viewModel.repairRoutines}
        />
        <SafetyBoundariesStrip
          className="order-8 xl:col-span-2 2xl:order-none 2xl:col-span-2 2xl:col-start-1 2xl:row-start-4"
          safety={viewModel.safety}
        />
      </div>
    </div>
  );
}

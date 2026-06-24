import { Pill, accentStyle } from "@/components/layout/route-page-primitives";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";
import type { RunningTrackerPageViewModel } from "../running-tracker-types";
import {
  Dot,
  RunningActionButton,
  RunningChip,
  RunningMetricCard,
  RunningPanel,
  RunningProgressBar,
  barHeightStyle,
} from "./running-tracker-primitives";

type SectionClassName = {
  className?: string;
};

function MiniPanel({
  title,
  badge,
  accent,
  children,
  className,
}: Readonly<
  SectionClassName & {
    title: string;
    badge?: string;
    accent: string;
    children: ReactNode;
  }
>) {
  return (
    <section
      aria-labelledby={`${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-mini`}
      className={cn(
        "min-w-0 overflow-hidden rounded-[14px] border border-[color-mix(in_srgb,var(--accent)_18%,var(--border-subtle))] bg-[rgba(15,23,36,.78)]",
        className,
      )}
      style={accentStyle(accent)}
    >
      <div className="flex min-w-0 items-center justify-between gap-2 border-b border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--accent)_6%,rgba(18,28,43,.58))] px-2.5 py-1.5">
        <h2
          className="truncate text-[12px] font-semibold leading-4 text-[var(--text-primary)]"
          id={`${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-mini`}
        >
          {title}
        </h2>
        {badge ? (
          <span className="shrink-0 rounded-full border border-[color-mix(in_srgb,var(--accent)_24%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] px-2 py-0.5 text-[9px] font-semibold text-[var(--text-secondary)]">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="p-2">{children}</div>
    </section>
  );
}

function TinyStatus({
  label,
  value,
  accent,
}: Readonly<{
  label: string;
  value: string;
  accent: string;
}>) {
  return (
    <div
      className="min-w-0 rounded-[10px] border border-[color-mix(in_srgb,var(--accent)_16%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent)_5%,rgba(11,17,28,.46))] px-2 py-1"
      style={accentStyle(accent)}
    >
      <p className="truncate text-[9px] font-semibold leading-3 text-[var(--text-muted)]">
        {label}
      </p>
      <p className="truncate text-[11px] font-semibold leading-4 text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

export function RunningHeader({
  header,
}: Readonly<{
  header: RunningTrackerPageViewModel["header"];
}>) {
  return (
    <header className="min-w-0 overflow-hidden rounded-[18px] border border-[rgba(221,107,95,.16)] bg-[rgba(15,23,36,.82)] shadow-[0_8px_22px_rgba(0,0,0,.12)] xl:rounded-[16px]">
      <div className="grid gap-4 bg-[linear-gradient(90deg,rgba(221,107,95,.065),transparent_58%)] px-4 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] lg:items-center xl:gap-3 xl:px-3 xl:py-2.5">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-[var(--accent-orange)] xl:leading-3">
            {header.breadcrumb.join(" / ")}
          </p>
          <h1 className="mt-1 text-[30px] font-semibold leading-none text-[var(--text-primary)] sm:text-[34px] xl:text-[27px]">
            {header.title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-5 text-[var(--text-secondary)] xl:mt-1 xl:truncate xl:text-[11px] xl:leading-4">
            {header.description}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5 xl:mt-2 xl:gap-1">
            {header.pills.map((pill, index) => (
              <Pill accent={pill.accent} key={`running-header-pill-${index}`}>
                {pill.label}
              </Pill>
            ))}
          </div>
        </div>

        <article
          aria-label={`${header.decision.label}: ${header.decision.title}, ${header.decision.duration}, ${header.decision.effort}, readiness ${header.decision.readiness}`}
          className="min-w-0 rounded-[16px] border border-[color-mix(in_srgb,var(--accent)_28%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent)_8%,rgba(11,17,28,.58))] p-3 xl:p-2.5"
          style={accentStyle(header.decision.accent)}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)] xl:leading-3">
            {header.decision.label}
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3 xl:mt-1.5 xl:gap-2">
            <div>
              <p className="text-2xl font-semibold leading-7 text-[var(--text-primary)] xl:text-[18px] xl:leading-5">
                {header.decision.title}
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--text-secondary)] xl:text-[11px]">
                {header.decision.duration}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-[11px] font-semibold text-[var(--text-secondary)]">
                {header.decision.effort}
              </p>
              <p className="mt-1 text-xl font-semibold leading-6 text-[var(--text-primary)] xl:text-[16px] xl:leading-5">
                readiness {header.decision.readiness}
              </p>
            </div>
          </div>
          <div className="mt-3 xl:mt-2">
            <RunningProgressBar
              accent={header.decision.accent}
              label={`Readiness ${header.decision.readiness}`}
              value={header.decision.progress}
            />
          </div>
          <p className="mt-3 text-[11px] leading-4 text-[var(--text-secondary)] xl:mt-2 xl:truncate xl:text-[10px] xl:leading-3">
            {header.decision.detail}
          </p>
        </article>
      </div>
    </header>
  );
}

export function SummaryStrip({
  metrics,
}: Readonly<{
  metrics: RunningTrackerPageViewModel["summary"];
}>) {
  return (
    <section
      aria-label="Running tracker summary"
      className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6 xl:gap-1.5"
    >
      {metrics.map((metric, index) => (
        <RunningMetricCard compact key={`running-summary-${index}`} metric={metric} />
      ))}
    </section>
  );
}

function ChipGroup({
  title,
  children,
}: Readonly<{
  title: string;
  children: ReactNode;
}>) {
  return (
    <div className="min-w-0">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {title}
      </h3>
      <div className="mt-2 flex flex-wrap gap-1.5 xl:mt-1.5 xl:gap-1">{children}</div>
    </div>
  );
}

export function BeginnerPlannerSection({
  planner,
  className,
}: Readonly<
  SectionClassName & {
    planner: RunningTrackerPageViewModel["planner"];
  }
>) {
  return (
    <RunningPanel
      accent="var(--accent-orange)"
      badge="P0"
      bodyClassName="grid gap-4 xl:min-h-0 xl:gap-2"
      className={className}
      p0
      subtitle={planner.subtitle}
      title={planner.title}
    >
      <div className="grid gap-4 xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] xl:gap-3">
        <div className="grid gap-4 xl:content-start xl:gap-2">
          <ChipGroup title="Goal Type">
            {planner.goalTypes.map((chip, index) => (
              <RunningChip chip={chip} key={`running-goal-type-${index}`} />
            ))}
          </ChipGroup>

          <ChipGroup title="Beginner Goal">
            {planner.beginnerGoals.map((chip, index) => (
              <RunningChip chip={chip} key={`running-beginner-goal-${index}`} />
            ))}
          </ChipGroup>

          <div className="grid gap-4 md:grid-cols-2 xl:gap-2">
            <ChipGroup title="Available Time">
              {planner.availableTimes.map((chip, index) => (
                <RunningChip chip={chip} key={`running-available-time-${index}`} />
              ))}
            </ChipGroup>
            <ChipGroup title="Effort Target">
              {planner.effortTargets.map((chip, index) => (
                <RunningChip chip={chip} key={`running-effort-target-${index}`} />
              ))}
            </ChipGroup>
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Optional Target Inputs
            </h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:mt-1.5 xl:gap-1.5">
              {planner.optionalInputs.map((input, index) => (
                <article
                  className="min-w-0 rounded-[13px] border border-[color-mix(in_srgb,var(--accent)_18%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent)_5%,rgba(11,17,28,.50))] p-3 xl:p-2"
                  key={`running-optional-input-${index}`}
                  style={accentStyle(input.accent)}
                >
                  <p className="text-[10px] font-semibold text-[var(--text-muted)]">
                    {input.label}
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-5 text-[var(--text-primary)] xl:text-[12px] xl:leading-4">
                    {input.value}
                  </p>
                  <p className="mt-1 text-[10px] leading-4 text-[var(--text-secondary)] xl:leading-3">
                    {input.helper}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>

        <article className="min-w-0 rounded-[16px] border border-[rgba(217,146,79,.24)] bg-[rgba(217,146,79,.075)] p-3 xl:p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            {planner.suggestedPlan.title}
          </p>
          <p className="mt-1 text-[12px] leading-5 text-[var(--text-secondary)] xl:text-[10px] xl:leading-3">
            {planner.suggestedPlan.detail}
          </p>
          <ol className="mt-3 grid gap-2 xl:mt-2 xl:gap-1.5">
            {planner.suggestedPlan.steps.map((step, index) => (
              <li
                className="grid grid-cols-[28px_minmax(0,1fr)] gap-2 rounded-[12px] border border-[color-mix(in_srgb,var(--accent)_18%,var(--border-subtle))] bg-[rgba(11,17,28,.38)] p-2.5 xl:grid-cols-[22px_minmax(0,1fr)] xl:p-1.5"
                key={`running-planner-step-${index}`}
                style={accentStyle(step.accent)}
              >
                <span className="flex size-7 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--accent)_32%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[11px] font-semibold text-[var(--text-primary)] xl:size-[22px] xl:text-[10px]">
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-5 text-[var(--text-primary)] xl:text-[12px] xl:leading-4">
                    {step.label}
                  </span>
                  <span className="block text-[10px] leading-4 text-[var(--text-secondary)] xl:leading-3">
                    {step.detail}
                  </span>
                </span>
              </li>
            ))}
          </ol>

          <div className="mt-4 flex flex-wrap gap-2 xl:mt-2 xl:gap-1.5">
            {planner.primaryActions.map((action, index) => (
              <RunningActionButton action={action} key={`running-planner-primary-${index}`} />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2 border-t border-[var(--border-subtle)] pt-3 xl:gap-1.5 xl:pt-2">
            {planner.secondaryActions.map((action, index) => (
              <RunningActionButton action={action} key={`running-planner-secondary-${index}`} />
            ))}
          </div>
        </article>
      </div>
    </RunningPanel>
  );
}

export function TodayRunPlanSection({
  todayPlan,
  className,
}: Readonly<
  SectionClassName & {
    todayPlan: RunningTrackerPageViewModel["todayPlan"];
  }
>) {
  return (
    <RunningPanel
      accent="var(--accent-red)"
      badge="P1"
      className={className}
      title={todayPlan.title}
    >
      <p className="text-xl font-semibold leading-6 text-[var(--text-primary)]">
        {todayPlan.plan}
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        {todayPlan.details.map((detail, index) => (
          <RunningMetricCard compact key={`running-today-detail-${index}`} metric={detail} />
        ))}
      </div>

      <div className="mt-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          Checklist
        </h3>
        <ul className="mt-2 grid gap-1.5">
          {todayPlan.checklist.map((item, index) => (
            <li
              className="flex min-h-8 items-center gap-2 rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(168,183,204,.035)] px-2.5 text-[11px] text-[var(--text-secondary)]"
              key={`running-today-checklist-${index}`}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-4 items-center justify-center rounded-full border text-[9px]",
                  item.done
                    ? "border-[rgba(66,184,131,.36)] bg-[rgba(66,184,131,.14)] text-[var(--text-primary)]"
                    : "border-[rgba(148,163,184,.18)] bg-[rgba(11,17,28,.38)] text-[var(--text-muted)]",
                )}
              >
                {item.done ? "ok" : ""}
              </span>
              <span>{item.label}</span>
              <span className="ml-auto text-[9px] font-semibold text-[var(--text-muted)]">
                {item.done ? "done" : "ready"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {todayPlan.actions.map((action, index) => (
          <RunningActionButton action={action} key={`running-today-action-${index}`} />
        ))}
      </div>
    </RunningPanel>
  );
}

export function RecentRunReviewSection({
  review,
  className,
}: Readonly<
  SectionClassName & {
    review: RunningTrackerPageViewModel["review"];
  }
>) {
  return (
    <RunningPanel
      accent="var(--accent-yellow)"
      badge="P1/P2"
      className={className}
      title={review.title}
    >
      <p className="text-[13px] font-semibold leading-5 text-[var(--text-primary)]">
        {review.lastRun}
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
        {review.metrics.map((metric, index) => (
          <RunningMetricCard compact key={`running-review-metric-${index}`} metric={metric} />
        ))}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {review.signals.map((signal, index) => (
          <article
            className="rounded-[12px] border border-[color-mix(in_srgb,var(--accent)_18%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent)_5%,rgba(11,17,28,.46))] p-2.5"
            key={`running-review-signal-${index}`}
            style={accentStyle(signal.accent)}
          >
            <p className="text-[10px] font-semibold text-[var(--text-muted)]">
              {signal.label}
            </p>
            <p className="mt-1 text-[13px] font-semibold leading-4 text-[var(--text-primary)]">
              {signal.value}
            </p>
            <p className="mt-1 text-[10px] leading-4 text-[var(--text-secondary)]">
              {signal.detail}
            </p>
          </article>
        ))}
      </div>
      <div className="mt-3 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(168,183,204,.035)] p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          Learnings
        </p>
        <ul className="mt-2 grid gap-1.5 text-[11px] leading-4 text-[var(--text-secondary)]">
          {review.learnings.map((learning, index) => (
            <li className="flex gap-2" key={`running-learning-${index}`}>
              <Dot accent="var(--accent-green)" />
              <span>{learning}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] leading-4 text-[var(--text-secondary)]">
          <span className="font-semibold text-[var(--text-primary)]">
            Next adjustment:
          </span>{" "}
          {review.nextAdjustment}
        </p>
      </div>
      <div className="mt-3">
        <RunningActionButton action={review.action} />
      </div>
    </RunningPanel>
  );
}

export function WeeklyRhythmSection({
  rhythm,
  className,
}: Readonly<
  SectionClassName & {
    rhythm: RunningTrackerPageViewModel["rhythm"];
  }
>) {
  return (
    <RunningPanel
      accent="var(--accent-cyan)"
      badge="P2"
      className={className}
      subtitle={rhythm.subtitle}
      title={rhythm.title}
    >
      <ol className="grid gap-2 sm:grid-cols-7 xl:grid-cols-1 2xl:grid-cols-7">
        {rhythm.days.map((day, index) => (
          <li
            className="min-w-0 rounded-[12px] border border-[color-mix(in_srgb,var(--accent)_18%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent)_5%,rgba(11,17,28,.44))] p-2"
            key={`running-rhythm-day-${index}`}
            style={accentStyle(day.accent)}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold text-[var(--text-muted)]">
                {day.day}
              </span>
              <Dot accent={day.accent} active={day.active} />
            </div>
            <p className="mt-2 text-[11px] font-semibold leading-4 text-[var(--text-primary)]">
              {day.label}
            </p>
            <p className="mt-1 text-[9px] leading-3 text-[var(--text-muted)]">
              {day.status}
            </p>
          </li>
        ))}
      </ol>
    </RunningPanel>
  );
}

export function LoadRecoverySection({
  loadRecovery,
  className,
}: Readonly<
  SectionClassName & {
    loadRecovery: RunningTrackerPageViewModel["loadRecovery"];
  }
>) {
  return (
    <RunningPanel
      accent="var(--accent-yellow)"
      badge="P2"
      className={className}
      title={loadRecovery.title}
    >
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        {[loadRecovery.weeklyLoad, loadRecovery.recoverySignal].map((item, index) => (
          <article
            className="rounded-[13px] border border-[color-mix(in_srgb,var(--accent)_20%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent)_6%,rgba(11,17,28,.52))] p-3"
            key={`running-load-recovery-${index}`}
            style={accentStyle(item.accent)}
          >
            <p className="text-[10px] font-semibold text-[var(--text-muted)]">
              {item.label}
            </p>
            <p className="mt-1 text-lg font-semibold leading-6 text-[var(--text-primary)]">
              {item.value}
            </p>
            <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-secondary)]">
              {item.detail}
            </p>
            <div className="mt-2">
              <RunningProgressBar
                accent={item.accent}
                label={`${item.label}: ${item.value}`}
                value={item.progress}
              />
            </div>
          </article>
        ))}
      </div>

      <div className="mt-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          Intensity split
        </h3>
        <div className="mt-2 grid gap-2">
          {loadRecovery.intensitySplit.map((split, index) => (
            <div
              className="grid grid-cols-[72px_minmax(0,1fr)_52px] items-center gap-2 text-[10px]"
              key={`running-intensity-split-${index}`}
              style={accentStyle(split.accent)}
            >
              <span className="font-semibold text-[var(--text-secondary)]">
                {split.label}
              </span>
              <RunningProgressBar
                accent={split.accent}
                label={`${split.label} intensity split ${split.value}%`}
                value={split.value}
              />
              <span className="text-right text-[var(--text-muted)]">
                {split.value}% {split.detail}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-3 rounded-[12px] border border-[rgba(221,107,95,.20)] bg-[rgba(221,107,95,.075)] p-3 text-[11px] font-semibold leading-4 text-[var(--text-primary)]">
        {loadRecovery.guardrail}
      </p>
    </RunningPanel>
  );
}

export function DesktopRightColumn({
  todayPlan,
  review,
  rhythm,
  loadRecovery,
  className,
}: Readonly<
  SectionClassName & {
    todayPlan: RunningTrackerPageViewModel["todayPlan"];
    review: RunningTrackerPageViewModel["review"];
    rhythm: RunningTrackerPageViewModel["rhythm"];
    loadRecovery: RunningTrackerPageViewModel["loadRecovery"];
  }
>) {
  return (
    <div className={cn("hidden min-h-0 gap-2 xl:grid", className)}>
      <MiniPanel accent="var(--accent-red)" badge="P1" title={todayPlan.title}>
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <p className="text-[15px] font-semibold leading-5 text-[var(--text-primary)]">
            {todayPlan.plan}
          </p>
          <div className="flex flex-wrap gap-1">
            {todayPlan.actions.slice(0, 2).map((action, index) => (
              <RunningActionButton action={action} key={`running-mini-action-${index}`} />
            ))}
          </div>
        </div>
        <div className="mt-2 grid gap-1 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
          {todayPlan.details.map((detail, index) => (
            <TinyStatus
              accent={detail.accent}
              key={`running-mini-detail-${index}`}
              label={detail.label}
              value={detail.value}
            />
          ))}
        </div>
        <ul className="mt-2 grid gap-1 sm:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
          {todayPlan.checklist.map((item, index) => (
            <li
              className="flex min-h-6 items-center gap-1.5 rounded-[9px] border border-[var(--border-subtle)] bg-[rgba(168,183,204,.035)] px-2 text-[10px] leading-3 text-[var(--text-secondary)]"
              key={`running-mini-checklist-${index}`}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  item.done
                    ? "bg-[var(--accent-green)]"
                    : "bg-[rgba(127,141,163,.58)]",
                )}
              />
              <span className="truncate">{item.label}</span>
              <span className="sr-only">{item.done ? "done" : "ready"}</span>
            </li>
          ))}
        </ul>
      </MiniPanel>

      <MiniPanel accent="var(--accent-yellow)" badge="P1/P2" title={review.title}>
        <p className="truncate text-[12px] font-semibold leading-4 text-[var(--text-primary)]">
          {review.lastRun}
        </p>
        <div className="mt-2 grid gap-1 sm:grid-cols-3">
          {review.metrics.map((metric, index) => (
            <TinyStatus
              accent={metric.accent}
              key={`running-mini-review-metric-${index}`}
              label={metric.label}
              value={metric.value}
            />
          ))}
        </div>
        <div className="mt-2 grid gap-1 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
          {review.signals.map((signal, index) => (
            <TinyStatus
              accent={signal.accent}
              key={`running-mini-signal-${index}`}
              label={signal.label}
              value={signal.value}
            />
          ))}
        </div>
        <p className="mt-2 text-[10px] leading-3 text-[var(--text-secondary)]">
          {review.learnings.join(" ")}
        </p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-[10px] font-semibold leading-3 text-[var(--text-primary)]">
            Next adjustment: {review.nextAdjustment}
          </p>
          <RunningActionButton action={review.action} />
        </div>
      </MiniPanel>

      <MiniPanel
        accent="var(--accent-cyan)"
        badge="P2"
        className="min-h-0"
        title="Weekly Rhythm / Load"
      >
        <ol className="grid gap-1 sm:grid-cols-7">
          {rhythm.days.map((day, index) => (
            <li
              className="min-w-0 rounded-[9px] border border-[color-mix(in_srgb,var(--accent)_16%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent)_5%,rgba(11,17,28,.44))] px-1.5 py-1"
              key={`running-mini-rhythm-day-${index}`}
              style={accentStyle(day.accent)}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[9px] font-semibold text-[var(--text-muted)]">
                  {day.day}
                </span>
                <Dot accent={day.accent} active={day.active} />
              </div>
              <p className="mt-1 truncate text-[10px] font-semibold leading-3 text-[var(--text-primary)]">
                {day.label}
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {[loadRecovery.weeklyLoad, loadRecovery.recoverySignal].map((item, index) => (
            <div key={`running-mini-load-${index}`} style={accentStyle(item.accent)}>
              <div className="flex items-center justify-between gap-2 text-[10px]">
                <span className="font-semibold text-[var(--text-secondary)]">
                  {item.label}
                </span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {item.value}
                </span>
              </div>
              <div className="mt-1">
                <RunningProgressBar
                  accent={item.accent}
                  label={`${item.label}: ${item.value}`}
                  value={item.progress}
                />
              </div>
              <p className="mt-1 truncate text-[9px] leading-3 text-[var(--text-muted)]">
                {item.detail}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-2 grid gap-1 sm:grid-cols-3">
          {loadRecovery.intensitySplit.map((split, index) => (
            <TinyStatus
              accent={split.accent}
              key={`running-mini-intensity-${index}`}
              label={split.label}
              value={`${split.value}% ${split.detail}`}
            />
          ))}
        </div>
        <p className="mt-2 rounded-[10px] border border-[rgba(221,107,95,.18)] bg-[rgba(221,107,95,.065)] px-2 py-1.5 text-[10px] font-semibold leading-3 text-[var(--text-primary)]">
          {loadRecovery.guardrail}
        </p>
      </MiniPanel>
    </div>
  );
}

export function ContextSection({
  context,
  className,
}: Readonly<
  SectionClassName & {
    context: RunningTrackerPageViewModel["context"];
  }
>) {
  return (
    <RunningPanel
      accent="var(--accent-blue)"
      badge="P2/P3"
      className={className}
      subtitle={context.subtitle}
      title={context.title}
    >
      <ol className="grid gap-2">
        {context.items.map((item) => (
          <li
            className="grid grid-cols-[34px_minmax(0,1fr)] gap-2 rounded-[12px] border border-[color-mix(in_srgb,var(--accent)_16%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent)_4%,rgba(11,17,28,.44))] p-2.5"
            key={item.rank}
            style={accentStyle(item.accent)}
          >
            <span className="text-[10px] font-semibold text-[var(--accent)]">
              {item.rank}
            </span>
            <span className="min-w-0">
              <span className="block text-[12px] font-semibold leading-4 text-[var(--text-primary)]">
                {item.label}
              </span>
              <span className="block text-[10px] leading-4 text-[var(--text-secondary)]">
                {item.detail}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </RunningPanel>
  );
}

export function BottomAnalyticsStrip({
  context,
  distanceTrend,
  recentRuns,
  boundaries,
  className,
}: Readonly<
  SectionClassName & {
    context: RunningTrackerPageViewModel["context"];
    distanceTrend: RunningTrackerPageViewModel["distanceTrend"];
    recentRuns: RunningTrackerPageViewModel["recentRuns"];
    boundaries: RunningTrackerPageViewModel["boundaries"];
  }
>) {
  return (
    <section
      aria-label="Running support analytics"
      className={cn(
        "hidden min-h-0 grid-cols-[minmax(0,1.12fr)_minmax(0,.86fr)_minmax(0,.98fr)_minmax(0,.84fr)] gap-2 xl:grid",
        className,
      )}
    >
      <MiniPanel accent="var(--accent-blue)" badge="P2/P3" title={context.title}>
        <ol className="grid gap-1 sm:grid-cols-2">
          {context.items.map((item) => (
            <li
              className="grid grid-cols-[22px_minmax(0,1fr)] gap-1 rounded-[9px] border border-[color-mix(in_srgb,var(--accent)_14%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent)_4%,rgba(11,17,28,.44))] px-1.5 py-1"
              key={item.rank}
              style={accentStyle(item.accent)}
            >
              <span className="text-[9px] font-semibold leading-3 text-[var(--accent)]">
                {item.rank}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[10px] font-semibold leading-3 text-[var(--text-primary)]">
                  {item.label}
                </span>
                <span className="block truncate text-[9px] leading-3 text-[var(--text-muted)]">
                  {item.detail}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </MiniPanel>

      <MiniPanel
        accent="var(--accent-orange)"
        badge="P3"
        title={distanceTrend.title}
      >
        <p className="truncate text-[10px] leading-3 text-[var(--text-secondary)]">
          {distanceTrend.statement}
        </p>
        <div
          aria-label={`${distanceTrend.title}: ${distanceTrend.statement}`}
          className="mt-2 flex h-16 items-end gap-1 rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.36)] px-2 py-1.5"
          role="img"
        >
          {distanceTrend.bars.map((bar, index) => (
            <div
              className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
              key={`running-mini-distance-bar-${index}`}
            >
              <span
                aria-hidden="true"
                className="h-[var(--bar-height)] w-full max-w-5 rounded-t-[4px] bg-[var(--accent)] opacity-80"
                style={{
                  ...accentStyle(bar.accent),
                  ...barHeightStyle(bar.value),
                }}
              />
              <span className="text-[8px] font-semibold text-[var(--text-muted)]">
                {bar.label}
              </span>
              <span className="sr-only">
                {bar.label}: {bar.display}
              </span>
            </div>
          ))}
        </div>
      </MiniPanel>

      <MiniPanel accent="var(--accent-cyan)" badge="P3" title={recentRuns.title}>
        <ul className="grid gap-1">
          {recentRuns.items.map((run, index) => (
            <li
              className="grid grid-cols-[48px_minmax(0,1fr)_54px] items-center gap-1 rounded-[9px] border border-[color-mix(in_srgb,var(--accent)_14%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent)_4%,rgba(11,17,28,.44))] px-1.5 py-1"
              key={`running-mini-recent-run-${index}`}
              style={accentStyle(run.accent)}
            >
              <span className="text-[9px] font-semibold text-[var(--text-muted)]">
                {run.date}
              </span>
              <span className="min-w-0 truncate text-[10px] font-semibold leading-3 text-[var(--text-primary)]">
                {run.title} - {run.distance}
              </span>
              <span className="truncate text-right text-[9px] text-[var(--text-muted)]">
                {run.effort}
              </span>
            </li>
          ))}
        </ul>
      </MiniPanel>

      <MiniPanel
        accent="var(--accent-green)"
        badge="Rules"
        title="Beginner Running Boundaries"
      >
        <div className="grid gap-1 sm:grid-cols-2">
          {boundaries.map((boundary, index) => (
            <article
              className="min-w-0 rounded-[9px] border border-[color-mix(in_srgb,var(--accent)_14%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent)_4%,rgba(11,17,28,.44))] px-1.5 py-1"
              key={`running-mini-boundary-${index}`}
              style={accentStyle(boundary.accent)}
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <Dot accent={boundary.accent} />
                <h3 className="truncate text-[10px] font-semibold leading-3 text-[var(--text-primary)]">
                  {boundary.label}
                </h3>
              </div>
              <p className="mt-1 truncate text-[9px] leading-3 text-[var(--text-muted)]">
                {boundary.detail}
              </p>
            </article>
          ))}
        </div>
      </MiniPanel>
    </section>
  );
}

export function DistanceTrendSection({
  distanceTrend,
  className,
}: Readonly<
  SectionClassName & {
    distanceTrend: RunningTrackerPageViewModel["distanceTrend"];
  }
>) {
  return (
    <RunningPanel
      accent="var(--accent-orange)"
      badge="P3"
      className={className}
      title={distanceTrend.title}
    >
      <p className="text-[12px] leading-5 text-[var(--text-secondary)]">
        {distanceTrend.statement}
      </p>
      <div
        aria-label={`${distanceTrend.title}: ${distanceTrend.statement}`}
        className="mt-4 flex h-36 items-end gap-2 rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.36)] px-3 py-3"
        role="img"
      >
        {distanceTrend.bars.map((bar, index) => (
          <div
            className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
            key={`running-distance-bar-${index}`}
          >
            <span
              aria-hidden="true"
              className="h-[var(--bar-height)] w-full max-w-8 rounded-t-[6px] bg-[var(--accent)] opacity-80"
              style={{ ...accentStyle(bar.accent), ...barHeightStyle(bar.value) }}
            />
            <span className="text-[9px] font-semibold text-[var(--text-muted)]">
              {bar.label}
            </span>
            <span className="sr-only">
              {bar.label}: {bar.display}
            </span>
          </div>
        ))}
      </div>
    </RunningPanel>
  );
}

export function RecentRunsSection({
  recentRuns,
  className,
}: Readonly<
  SectionClassName & {
    recentRuns: RunningTrackerPageViewModel["recentRuns"];
  }
>) {
  return (
    <RunningPanel
      accent="var(--accent-cyan)"
      badge="P3"
      className={className}
      subtitle={recentRuns.subtitle}
      title={recentRuns.title}
    >
      <ul className="grid gap-2">
        {recentRuns.items.map((run, index) => (
          <li
            className="grid gap-2 rounded-[12px] border border-[color-mix(in_srgb,var(--accent)_16%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent)_4%,rgba(11,17,28,.44))] p-2.5 sm:grid-cols-[84px_minmax(0,1fr)_auto] sm:items-center"
            key={`running-recent-run-${index}`}
            style={accentStyle(run.accent)}
          >
            <span className="text-[10px] font-semibold text-[var(--text-muted)]">
              {run.date}
            </span>
            <span className="min-w-0">
              <span className="block text-[12px] font-semibold leading-4 text-[var(--text-primary)]">
                {run.title}
              </span>
              <span className="block text-[10px] leading-4 text-[var(--text-secondary)]">
                {run.distance} - {run.duration} - {run.effort}
              </span>
            </span>
            <span className="inline-flex min-h-6 items-center rounded-full border border-[color-mix(in_srgb,var(--accent)_24%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] px-2 text-[10px] font-semibold text-[var(--text-secondary)]">
              {run.status}
            </span>
          </li>
        ))}
      </ul>
    </RunningPanel>
  );
}

export function BoundariesStrip({
  boundaries,
}: Readonly<{
  boundaries: RunningTrackerPageViewModel["boundaries"];
}>) {
  return (
    <section
      aria-label="Beginner running boundaries"
      className="grid gap-2 rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.76)] p-3 shadow-[0_8px_22px_rgba(0,0,0,.12)] sm:grid-cols-2 xl:grid-cols-4"
    >
      <h2 className="sr-only">Beginner Running Boundaries</h2>
      {boundaries.map((boundary, index) => (
        <article
          className="min-w-0 rounded-[12px] border border-[color-mix(in_srgb,var(--accent)_16%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent)_5%,rgba(11,17,28,.44))] p-3"
          key={`running-boundary-${index}`}
          style={accentStyle(boundary.accent)}
        >
          <div className="flex items-center gap-2">
            <Dot accent={boundary.accent} />
            <h3 className="text-[12px] font-semibold leading-4 text-[var(--text-primary)]">
              {boundary.label}
            </h3>
          </div>
          <p className="mt-1 text-[10px] leading-4 text-[var(--text-secondary)]">
            {boundary.detail}
          </p>
        </article>
      ))}
    </section>
  );
}

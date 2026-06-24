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
import type { ReactNode } from "react";
import type {
  StrengthProfileId,
  StrengthTrackerPageViewModel,
} from "../strength-tracker-types";
import {
  Dot,
  StrengthActionButton,
  StrengthChip,
  StrengthMetricCard,
  StrengthPanel,
  StrengthProgressBar,
  barHeightStyle,
} from "./strength-tracker-primitives";

type SectionClassName = {
  className?: string;
};

type StrengthSectionState = {
  profileId: StrengthProfileId;
  state: ContentStateMeta;
};

function ChipGroup({
  title,
  children,
}: Readonly<{
  title: string;
  children: ReactNode;
}>) {
  return (
    <div className="min-w-0">
      <h3 className="text-[11px] font-semibold uppercase text-[var(--text-muted)]">
        {title}
      </h3>
      <div className="mt-2 flex flex-wrap gap-1.5 xl:mt-1.5 xl:gap-1">
        {children}
      </div>
    </div>
  );
}

export function StrengthHeader({
  header,
  profileId,
  state,
}: Readonly<{
  header: StrengthTrackerPageViewModel["header"];
  profileId: StrengthProfileId;
  state: ContentStateMeta;
}>) {
  return (
    <header
      className="min-w-0 overflow-hidden rounded-[18px] border border-[rgba(217,146,79,.16)] bg-[rgba(15,23,36,.82)] shadow-[0_8px_22px_rgba(0,0,0,.12)] xl:rounded-[16px]"
      data-strength-section="header"
      {...contentStateDataAttributes(state, profileId)}
    >
      <div className="grid gap-4 bg-[color-mix(in_srgb,var(--accent-orange)_6%,rgba(18,28,43,.82))] px-4 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,560px)] lg:items-center xl:gap-3 xl:px-3 xl:py-2.5">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-[var(--text-muted)] xl:leading-3">
            {header.breadcrumb.join(" / ")}
          </p>
          <h1 className="mt-1 text-[30px] font-semibold leading-none text-[var(--text-primary)] sm:text-[34px] xl:text-[27px]">
            {header.title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-5 text-[var(--text-secondary)] xl:mt-1 xl:text-[11px] xl:leading-4">
            {header.description}
          </p>
          <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
            {header.meta}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5 xl:mt-2 xl:gap-1">
            {header.pills.map((pill, index) => (
              <Pill accent={pill.accent} key={`strength-header-pill-${index}`}>
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
          <p className="text-[10px] font-semibold uppercase text-[var(--accent-orange)] xl:leading-3">
            {header.decision.label}
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3 xl:mt-1.5 xl:gap-2">
            <div>
              <p className="text-2xl font-semibold leading-7 text-[var(--text-primary)] xl:text-[18px] xl:leading-5">
                {header.decision.title}
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--text-secondary)] xl:text-[11px]">
                {header.decision.duration} · {header.decision.effort}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xl font-semibold leading-6 text-[var(--accent-green)] xl:text-[16px] xl:leading-5">
                {header.decision.readiness}
              </p>
              <p className="mt-1 text-[10px] font-semibold text-[var(--text-muted)]">
                readiness
              </p>
            </div>
          </div>
          <div className="mt-3 xl:mt-2">
            <StrengthProgressBar
              accent="var(--accent-green)"
              label={`Readiness ${header.decision.readiness}`}
              value={header.decision.progress}
            />
          </div>
          <p className="mt-3 text-[11px] leading-4 text-[var(--text-secondary)] xl:mt-2 xl:text-[10px] xl:leading-3">
            {header.decision.detail}
          </p>
        </article>
      </div>
    </header>
  );
}

export function SummaryStrip({
  metrics,
  profileId,
  state,
}: Readonly<{
  metrics: StrengthTrackerPageViewModel["summary"];
  profileId: StrengthProfileId;
  state: ContentStateMeta;
}>) {
  return (
    <section
      aria-label="Strength tracker summary"
      className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6 xl:gap-1.5"
      data-strength-section="summary"
      {...contentStateDataAttributes(state, profileId)}
    >
      {metrics.map((metric, index) => (
        <StrengthMetricCard compact key={`strength-summary-${index}`} metric={metric} />
      ))}
    </section>
  );
}

export function StrengthSessionPlannerSection({
  planner,
  className,
  profileId,
  state,
}: Readonly<
  SectionClassName &
    StrengthSectionState & {
    planner: StrengthTrackerPageViewModel["planner"];
  }
>) {
  const hasSuggestedSession = planner.suggestedSession.steps.length > 0;

  return (
    <StrengthPanel
      accent="var(--accent-orange)"
      badge="P0"
      bodyClassName="grid gap-4 xl:min-h-0 xl:gap-3"
      className={className}
      contentState={state}
      p0
      profileId={profileId}
      sectionName="planner"
      subtitle={planner.subtitle}
      title={planner.title}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,390px)] xl:gap-3">
        <div className="grid gap-4 xl:content-start xl:gap-2.5">
          <ChipGroup title="Session Type">
            {planner.sessionTypes.map((chip, index) => (
              <StrengthChip chip={chip} key={`strength-session-type-${index}`} />
            ))}
          </ChipGroup>

          <ChipGroup title="Training Focus">
            {planner.trainingFocus.map((chip, index) => (
              <StrengthChip chip={chip} key={`strength-training-focus-${index}`} />
            ))}
          </ChipGroup>

          <div className="grid gap-4 md:grid-cols-2 xl:gap-2">
            <ChipGroup title="Available Time">
              {planner.availableTimes.map((chip, index) => (
                <StrengthChip chip={chip} key={`strength-available-time-${index}`} />
              ))}
            </ChipGroup>
            <ChipGroup title="Effort Target">
              {planner.effortTargets.map((chip, index) => (
                <StrengthChip chip={chip} key={`strength-effort-target-${index}`} />
              ))}
            </ChipGroup>
          </div>

          <ChipGroup title="Equipment">
            {planner.equipment.map((chip, index) => (
              <StrengthChip chip={chip} key={`strength-equipment-${index}`} />
            ))}
          </ChipGroup>

          <div>
            <h3 className="text-[11px] font-semibold uppercase text-[var(--text-muted)]">
              Movement context
            </h3>
            {planner.movementInputs.length > 0 ? (
              <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:mt-1.5 xl:gap-1.5">
                {planner.movementInputs.map((input, index) => (
                  <article
                    className="min-w-0 rounded-[13px] border border-[color-mix(in_srgb,var(--accent)_18%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent)_5%,rgba(11,17,28,.50))] p-3 xl:p-2"
                    key={`strength-movement-input-${index}`}
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
            ) : (
              <div className="mt-2">
                <EmptyState
                  description="Bewegungskontext erscheint nach lokalen Kraftsessions."
                  title="Noch kein Krafttrainingskontext"
                />
              </div>
            )}
          </div>
        </div>

        <article className="min-w-0 rounded-[16px] border border-[rgba(217,146,79,.24)] bg-[rgba(217,146,79,.075)] p-3 xl:p-2.5">
          <p className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">
            {planner.suggestedSession.title}
          </p>
          <p className="mt-1 text-[16px] font-semibold leading-6 text-[var(--text-primary)] xl:text-[13px] xl:leading-4">
            {planner.suggestedSession.detail}
          </p>
          {hasSuggestedSession ? (
            <ol className="mt-3 grid gap-2 xl:mt-2 xl:gap-1.5">
              {planner.suggestedSession.steps.map((step, index) => (
                <li
                  className="grid grid-cols-[28px_minmax(0,1fr)] gap-2 rounded-[12px] border border-[color-mix(in_srgb,var(--accent)_18%,var(--border-subtle))] bg-[rgba(11,17,28,.38)] p-2.5 xl:grid-cols-[22px_minmax(0,1fr)] xl:p-1.5"
                  key={`strength-planner-step-${index}`}
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
          ) : (
            <div className="mt-3">
              <EmptyState
                description="Sobald lokale Sessions existieren, kann hier eine Session geplant werden."
                title="Noch kein Krafttrainingskontext"
              />
            </div>
          )}

          <p className="mt-3 rounded-[12px] border border-[rgba(66,184,131,.20)] bg-[rgba(66,184,131,.075)] p-3 text-[11px] font-semibold leading-4 text-[var(--text-primary)] xl:mt-2 xl:p-2">
            Target: {planner.suggestedSession.target}
          </p>

          {planner.primaryActions.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2 xl:mt-2 xl:gap-1.5">
              {planner.primaryActions.map((action, index) => (
                <StrengthActionButton action={action} key={`strength-planner-primary-${index}`} />
              ))}
            </div>
          ) : null}
          {planner.secondaryActions.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2 border-t border-[var(--border-subtle)] pt-3 xl:gap-1.5 xl:pt-2">
              {planner.secondaryActions.map((action, index) => (
                <StrengthActionButton action={action} key={`strength-planner-secondary-${index}`} />
              ))}
            </div>
          ) : null}
        </article>
      </div>
    </StrengthPanel>
  );
}

export function TodayStrengthPlanSection({
  todayPlan,
  className,
  profileId,
  state,
}: Readonly<
  SectionClassName &
    StrengthSectionState & {
    todayPlan: StrengthTrackerPageViewModel["todayPlan"];
  }
>) {
  return (
    <StrengthPanel
      accent="var(--accent-red)"
      badge="P1"
      className={className}
      contentState={state}
      profileId={profileId}
      sectionName="today-plan"
      title={todayPlan.title}
    >
      <p className="text-xl font-semibold leading-6 text-[var(--text-primary)]">
        {todayPlan.plan}
      </p>
      {todayPlan.details.length > 0 ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {todayPlan.details.map((detail, index) => (
            <StrengthMetricCard compact key={`strength-today-detail-${index}`} metric={detail} />
          ))}
        </div>
      ) : (
        <div className="mt-3">
          <EmptyState
            description="Eine geplante Kraftsession erscheint, sobald lokale Session-Daten existieren."
            title="Noch keine Kraftsession geplant"
          />
        </div>
      )}

      {todayPlan.checklist.length > 0 ? (
        <div className="mt-4">
        <h3 className="text-[11px] font-semibold uppercase text-[var(--text-muted)]">
          Checklist
        </h3>
        <ul className="mt-2 grid gap-1.5">
          {todayPlan.checklist.map((item, index) => (
            <li
              className="flex min-h-8 items-center gap-2 rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(168,183,204,.035)] px-2.5 text-[11px] text-[var(--text-secondary)]"
              key={`strength-today-checklist-${index}`}
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
      ) : null}

      {todayPlan.actions.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {todayPlan.actions.map((action, index) => (
            <StrengthActionButton action={action} key={`strength-today-action-${index}`} />
          ))}
        </div>
      ) : null}
    </StrengthPanel>
  );
}

export function RecentSessionReviewSection({
  review,
  className,
  profileId,
  state,
}: Readonly<
  SectionClassName &
    StrengthSectionState & {
    review: StrengthTrackerPageViewModel["review"];
  }
>) {
  return (
    <StrengthPanel
      accent="var(--accent-yellow)"
      badge="P1/P2"
      className={className}
      contentState={state}
      profileId={profileId}
      sectionName="review"
      title={review.title}
    >
      <p className="text-[13px] font-semibold leading-5 text-[var(--text-primary)]">
        {review.lastSession}
      </p>
      {review.metrics.length > 0 ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
          {review.metrics.map((metric, index) => (
            <StrengthMetricCard compact key={`strength-review-metric-${index}`} metric={metric} />
          ))}
        </div>
      ) : (
        <div className="mt-3">
          <EmptyState
            description="Session-Review erscheint nach der ersten lokalen Kraftsession."
            title="Noch keine letzte Session"
          />
        </div>
      )}
      {review.signals.length > 0 ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {review.signals.map((signal, index) => (
            <article
              className="rounded-[12px] border border-[color-mix(in_srgb,var(--accent)_18%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent)_5%,rgba(11,17,28,.46))] p-2.5"
              key={`strength-review-signal-${index}`}
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
      ) : null}
      {review.metrics.length > 0 ? (
        <div className="mt-3 grid gap-2">
        <p className="rounded-[12px] border border-[rgba(66,184,131,.20)] bg-[rgba(66,184,131,.065)] p-3 text-[11px] leading-4 text-[var(--text-secondary)]">
          <span className="font-semibold text-[var(--text-primary)]">
            Learned:
          </span>{" "}
          {review.learning.replace("Learned: ", "")}
        </p>
        <p className="rounded-[12px] border border-[rgba(217,146,79,.22)] bg-[rgba(217,146,79,.07)] p-3 text-[11px] leading-4 text-[var(--text-secondary)]">
          <span className="font-semibold text-[var(--text-primary)]">
            Next adjustment:
          </span>{" "}
          {review.adjustment.replace("Next adjustment: ", "")}
        </p>
        </div>
      ) : null}
      {review.action.label ? (
        <div className="mt-3">
          <StrengthActionButton action={review.action} />
        </div>
      ) : null}
    </StrengthPanel>
  );
}

export function WeeklyStrengthRhythmSection({
  rhythmBalance,
  className,
  profileId,
  state,
}: Readonly<
  SectionClassName &
    StrengthSectionState & {
    rhythmBalance: StrengthTrackerPageViewModel["rhythmBalance"];
  }
>) {
  return (
    <StrengthPanel
      accent="var(--accent-cyan)"
      badge="P2"
      className={className}
      contentState={state}
      profileId={profileId}
      sectionName="rhythm"
      subtitle={rhythmBalance.subtitle}
      title={rhythmBalance.title}
    >
      {rhythmBalance.days.length > 0 ? (
        <ol className="grid gap-2 sm:grid-cols-7 xl:grid-cols-7">
          {rhythmBalance.days.map((day, index) => (
            <li
              className="min-w-0 rounded-[12px] border border-[color-mix(in_srgb,var(--accent)_18%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent)_5%,rgba(11,17,28,.44))] p-2"
              key={`strength-rhythm-day-${index}`}
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
      ) : (
        <EmptyState
          description="Kraftrhythmus erscheint nach lokalen Sessions."
          title="Noch kein Kraftrhythmus"
        />
      )}

      {rhythmBalance.balance.length > 0 ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-5">
          {rhythmBalance.balance.map((item, index) => (
            <article
              className="rounded-[12px] border border-[color-mix(in_srgb,var(--accent)_18%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent)_5%,rgba(11,17,28,.44))] p-2.5"
              key={`strength-rhythm-balance-${index}`}
              style={accentStyle(item.accent)}
            >
              <p className="text-[10px] font-semibold text-[var(--text-muted)]">
                {item.label}
              </p>
              <p className="mt-1 text-[13px] font-semibold leading-4 text-[var(--text-primary)]">
                {item.value}
              </p>
              <p className="mt-1 text-[10px] leading-3 text-[var(--text-secondary)]">
                {item.detail}
              </p>
            </article>
          ))}
        </div>
      ) : null}
      <p className="mt-3 rounded-[12px] border border-[rgba(217,146,79,.22)] bg-[rgba(217,146,79,.07)] p-3 text-[11px] font-semibold leading-4 text-[var(--text-primary)]">
        {rhythmBalance.statement}
      </p>
    </StrengthPanel>
  );
}

export function TrainingLoadRecoverySection({
  loadRecovery,
  className,
  profileId,
  state,
}: Readonly<
  SectionClassName &
    StrengthSectionState & {
    loadRecovery: StrengthTrackerPageViewModel["loadRecovery"];
  }
>) {
  return (
    <StrengthPanel
      accent="var(--accent-yellow)"
      badge="P2"
      className={className}
      contentState={state}
      profileId={profileId}
      sectionName="load-recovery"
      title={loadRecovery.title}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        {[loadRecovery.weeklyLoad, loadRecovery.recoverySignal].map((item, index) => (
          <article
            className="rounded-[13px] border border-[color-mix(in_srgb,var(--accent)_20%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent)_6%,rgba(11,17,28,.52))] p-3"
            key={`strength-load-recovery-${index}`}
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
              <StrengthProgressBar
                accent={item.accent}
                label={`${item.label}: ${item.value}`}
                value={item.progress}
              />
            </div>
          </article>
        ))}
      </div>

      <div className="mt-3">
        <h3 className="text-[11px] font-semibold uppercase text-[var(--text-muted)]">
          Volume split
        </h3>
        {loadRecovery.volumeSplit.length > 0 ? (
          <div className="mt-2 grid gap-2">
            {loadRecovery.volumeSplit.map((split, index) => (
              <div
                className="grid grid-cols-[72px_minmax(0,1fr)_52px] items-center gap-2 text-[10px]"
                key={`strength-volume-split-${index}`}
                style={accentStyle(split.accent)}
              >
                <span className="font-semibold text-[var(--text-secondary)]">
                  {split.label}
                </span>
                <StrengthProgressBar
                  accent={split.accent}
                  label={`${split.label} volume split ${split.value}%`}
                  value={split.value}
                />
                <span className="text-right text-[var(--text-muted)]">
                  {split.detail}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2">
            <EmptyState
              description="Training Load und Recovery erscheinen nach lokalen Sessions."
              title="Noch keine Load-Daten"
            />
          </div>
        )}
      </div>

      <p className="mt-3 rounded-[12px] border border-[rgba(221,107,95,.20)] bg-[rgba(221,107,95,.075)] p-3 text-[11px] font-semibold leading-4 text-[var(--text-primary)]">
        {loadRecovery.guardrail}
      </p>
    </StrengthPanel>
  );
}

export function ExerciseProgressionContextSection({
  progression,
  className,
  profileId,
  state,
}: Readonly<
  SectionClassName &
    StrengthSectionState & {
    progression: StrengthTrackerPageViewModel["progression"];
  }
>) {
  return (
    <StrengthPanel
      accent="var(--accent-blue)"
      badge="P2"
      className={className}
      contentState={state}
      profileId={profileId}
      sectionName="progression"
      subtitle={progression.subtitle}
      title={progression.title}
    >
      {progression.rules.length > 0 ? (
        <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          {progression.rules.map((rule) => (
            <li
              className="grid grid-cols-[34px_minmax(0,1fr)] gap-2 rounded-[12px] border border-[color-mix(in_srgb,var(--accent)_16%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent)_4%,rgba(11,17,28,.44))] p-2.5"
              key={rule.rank}
              style={accentStyle(rule.accent)}
            >
              <span className="text-[10px] font-semibold text-[var(--accent)]">
                {rule.rank}
              </span>
              <span className="min-w-0">
                <span className="block text-[12px] font-semibold leading-4 text-[var(--text-primary)]">
                  {rule.label}
                </span>
                <span className="block text-[10px] leading-4 text-[var(--text-secondary)]">
                  {rule.detail}
                </span>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState
          description="Progressionskontext erscheint nach lokalen Sessions."
          title="Noch kein Progressionskontext"
        />
      )}
      <p className="mt-3 text-[11px] font-semibold leading-4 text-[var(--text-primary)]">
        {progression.footer}
      </p>
    </StrengthPanel>
  );
}

export function StrengthTrendSection({
  trend,
  className,
  profileId,
  state,
}: Readonly<
  SectionClassName &
    StrengthSectionState & {
    trend: StrengthTrackerPageViewModel["trend"];
  }
>) {
  return (
    <StrengthPanel
      accent="var(--accent-green)"
      badge="P2"
      className={className}
      contentState={state}
      profileId={profileId}
      sectionName="trend"
      title={trend.title}
    >
      {trend.weeks.length > 0 ? (
        <>
          <div className="flex min-h-[150px] items-end gap-2 rounded-[13px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.35)] px-3 pb-3 pt-4">
            {trend.weeks.map((week, index) => (
              <div
                className="flex min-w-0 flex-1 flex-col items-center gap-2"
                key={`strength-trend-week-${index}`}
                style={accentStyle(week.accent)}
              >
                <div className="flex h-20 w-full items-end justify-center rounded-[10px] bg-[rgba(168,183,204,.035)] px-2 py-1">
                  <span
                    aria-label={`${week.label}: ${week.sessions}, ${week.sets}, ${week.stableLifts}`}
                    className="block h-[var(--bar-height)] w-full max-w-9 rounded-t-[8px] bg-[var(--accent)] opacity-80"
                    role="img"
                    style={barHeightStyle(week.value)}
                  />
                </div>
                <div className="min-w-0 text-center">
                  <p className="truncate text-[10px] font-semibold text-[var(--text-primary)]">
                    {week.label}
                  </p>
                  <p className="truncate text-[9px] leading-3 text-[var(--text-muted)]">
                    {week.sessions}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <ul className="mt-3 grid gap-1.5">
            {trend.weeks.map((week, index) => (
              <li
                className="grid grid-cols-[72px_minmax(0,1fr)] gap-2 rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(168,183,204,.035)] px-2.5 py-2 text-[10px]"
                key={`strength-trend-week-detail-${index}`}
              >
                <span className="font-semibold text-[var(--text-primary)]">
                  {week.label}
                </span>
                <span className="text-[var(--text-secondary)]">
                  {week.sessions} · {week.sets} · {week.stableLifts}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <EmptyState
          description="Strength-Trends erscheinen nach lokalen Sessions."
          title="Noch keine Strength-Trends"
        />
      )}
      <p className="mt-3 text-[11px] leading-4 text-[var(--text-secondary)]">
        {trend.statement}
      </p>
    </StrengthPanel>
  );
}

export function RecentSetsSection({
  recentSets,
  className,
  profileId,
  state,
}: Readonly<
  SectionClassName &
    StrengthSectionState & {
    recentSets: StrengthTrackerPageViewModel["recentSets"];
  }
>) {
  return (
    <StrengthPanel
      accent="var(--accent-cyan)"
      badge="P2/P3"
      className={className}
      contentState={state}
      profileId={profileId}
      sectionName="recent-sets"
      subtitle={recentSets.subtitle}
      title={recentSets.title}
    >
      {recentSets.items.length > 0 ? (
        <ul className="grid gap-2">
          {recentSets.items.map((item, index) => (
            <li
              className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-2 rounded-[12px] border border-[color-mix(in_srgb,var(--accent)_16%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent)_4%,rgba(11,17,28,.44))] p-2.5 text-[10px]"
              key={`strength-recent-set-${index}`}
              style={accentStyle(item.accent)}
            >
              <span className="font-semibold text-[var(--text-muted)]">
                {item.date}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-semibold leading-4 text-[var(--text-primary)]">
                  {item.exercise} · {item.load}
                </span>
                <span className="block truncate leading-4 text-[var(--text-secondary)]">
                  {item.result}
                </span>
              </span>
              <span className="rounded-full border border-[color-mix(in_srgb,var(--accent)_24%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] px-2 py-1 text-[9px] font-semibold text-[var(--text-secondary)]">
                {item.status}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          description="Set-Logs erscheinen nach der ersten lokalen Session."
          title="Noch keine Sets"
        />
      )}
      <p className="mt-3 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(168,183,204,.035)] p-3 text-[11px] leading-4 text-[var(--text-secondary)]">
        {recentSets.note}
      </p>
    </StrengthPanel>
  );
}

export function BeginnerStrengthBoundariesSection({
  boundaries,
  className,
}: Readonly<
  SectionClassName & {
    boundaries: StrengthTrackerPageViewModel["boundaries"];
  }
>) {
  return (
    <StrengthPanel
      accent="var(--accent-red)"
      badge="Guardrails"
      className={className}
      title={boundaries.title}
    >
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {boundaries.items.map((item, index) => (
          <article
            className="rounded-[12px] border border-[color-mix(in_srgb,var(--accent)_18%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent)_5%,rgba(11,17,28,.44))] p-3"
            key={`strength-boundary-${index}`}
            style={accentStyle(item.accent)}
          >
            <p className="text-[12px] font-semibold leading-4 text-[var(--text-primary)]">
              {item.label}
            </p>
            <p className="mt-1 text-[10px] leading-4 text-[var(--text-secondary)]">
              {item.detail}
            </p>
          </article>
        ))}
      </div>
      <p className="mt-3 text-[11px] font-semibold leading-4 text-[var(--text-secondary)]">
        {boundaries.footer}
      </p>
    </StrengthPanel>
  );
}

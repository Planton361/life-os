import type { CSSProperties, ReactNode } from "react";
import {
  dashboardMockData,
  type DashboardAgendaEvent,
  type DashboardTodayAgenda,
  type PortfolioItemKind,
} from "@/features/dashboard";
import { cn } from "@/lib/cn";

type AccentStyle = CSSProperties & {
  "--accent"?: string;
  "--progress"?: string;
};

type AgendaSlotStyle = CSSProperties & {
  "--agenda-top"?: string;
};

const agendaEventSlots = [
  "2.5%",
  "10.5%",
  "22.5%",
  "32%",
  "40%",
  "51.5%",
  "60%",
  "72%",
  "85%",
] as const;

function styleFor(accent: string, progress?: number): AccentStyle {
  return {
    "--accent": accent,
    "--progress": `${progress ?? 0}%`,
  };
}

function agendaEventSlotStyle(index: number): AgendaSlotStyle {
  return {
    "--agenda-top": agendaEventSlots[index] ?? `${index * 10}%`,
  };
}

function topPositionStyle(position: number): CSSProperties {
  return {
    top: `${position}%`,
  };
}

function currentTimeLabelStyle(position: number): CSSProperties {
  return {
    top: `calc(${position}% - 22px)`,
  };
}

function statusClassName(status: DashboardAgendaEvent["status"]) {
  if (status === "next" || status === "active") {
    return "border-[rgba(91,124,250,.54)]";
  }

  if (status === "blocked") {
    return "border-[rgba(221,107,95,.44)]";
  }

  if (status === "done") {
    return "border-[rgba(148,163,184,.18)]";
  }

  return "";
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
    <div className="h-1.5 rounded-full bg-[rgba(168,183,204,.15)]">
      <div
        aria-hidden="true"
        className={cn(
          "h-full w-[var(--progress)] rounded-full",
          quiet
            ? "bg-[color-mix(in_srgb,var(--accent)_46%,transparent)]"
            : "bg-[color-mix(in_srgb,var(--accent)_64%,transparent)]",
        )}
        style={styleFor(accent, progress)}
      />
    </div>
  );
}

function Pill({
  children,
  accent = "var(--accent-blue)",
  quiet = false,
}: Readonly<{
  children: ReactNode;
  accent?: string;
  quiet?: boolean;
}>) {
  return (
    <span
      className={cn(
        "rounded-full border px-3 py-1 text-[10px] font-medium",
        quiet
          ? "border-[var(--border-subtle)] bg-[rgba(168,183,204,.05)] text-[var(--text-muted)]"
          : "border-[color-mix(in_srgb,var(--accent)_24%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--text-secondary)]",
      )}
      style={styleFor(accent)}
    >
      {children}
    </span>
  );
}

function Panel({
  title,
  subtitle,
  children,
  className,
  headerAccessory,
  titleClassName,
}: Readonly<{
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  headerAccessory?: ReactNode;
  titleClassName?: string;
}>) {
  return (
    <section
      aria-labelledby={`${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-title`}
      className={cn(
        "overflow-hidden rounded-[var(--panel-radius)] border border-[var(--border-subtle)] bg-[var(--surface-1)] shadow-[0_8px_22px_rgba(0,0,0,.12)]",
        className,
      )}
    >
      <div className="border-b border-[var(--border-subtle)] bg-[rgba(14,23,38,.72)] px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              className={cn(
                "font-semibold text-[var(--text-primary)]",
                titleClassName ?? "text-lg",
              )}
              id={`${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-title`}
            >
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 text-[10px] font-semibold text-[var(--text-secondary)]">
                {subtitle}
              </p>
            ) : null}
          </div>
          {headerAccessory ? <div className="min-w-0">{headerAccessory}</div> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

const {
  activePortfolio,
  antiRotActions,
  challengesRewardFocus,
  habitTrackers,
  meals,
  nutrientBalance,
  runningRecovery,
  weightLossGoal,
} = dashboardMockData;

const antiRot = antiRotActions.actions;
const challenges = challengesRewardFocus.items;
const habits = habitTrackers.habits;
const projects = activePortfolio.items;
const runStats = runningRecovery.stats;

function countPortfolioKind(kind: PortfolioItemKind) {
  return projects.reduce(
    (count, project) => (project.kind === kind ? count + 1 : count),
    0,
  );
}

const activePortfolioCounters = [
  {
    label: "Projects",
    value: countPortfolioKind("project"),
  },
  {
    label: "Goals",
    value: countPortfolioKind("goal"),
  },
  {
    label: "Skills",
    value: countPortfolioKind("skill"),
  },
] as const;

export function WeightLossGoal() {
  return (
    <section
      aria-labelledby="weight-loss-goal-title"
      className="h-[188px] overflow-hidden rounded-[var(--panel-radius)] border border-[rgba(66,184,131,.12)] bg-[#0f1724] p-5 shadow-[0_8px_22px_rgba(0,0,0,.12)] 2xl:h-[184px] 2xl:px-[28px] 2xl:py-[22px]"
    >
      <h2
        className="text-lg font-semibold text-[var(--text-primary)]"
        id="weight-loss-goal-title"
      >
        {weightLossGoal.title}
      </h2>
      <p className="mt-4 text-[31px] font-semibold leading-none text-[var(--text-primary)]">
        {weightLossGoal.currentWeight}
      </p>
      <p className="mt-2 text-[9px] font-semibold leading-tight text-[var(--text-muted)]">
        {weightLossGoal.targetLabel}
      </p>
      <p className="mt-3 text-[10px] font-semibold text-[var(--text-muted)]">
        {weightLossGoal.progressLabel}
      </p>
      <div className="mt-2">
        <ProgressBar
          accent={weightLossGoal.accent}
          progress={weightLossGoal.progress}
          quiet
        />
      </div>
    </section>
  );
}

export function NutrientBalance() {
  return (
    <section
      aria-labelledby="nutrient-balance-title"
      className="h-[188px] overflow-hidden rounded-[var(--panel-radius)] border border-[rgba(217,146,79,.12)] bg-[#0f1724] p-5 shadow-[0_8px_22px_rgba(0,0,0,.12)] 2xl:h-[184px] 2xl:p-[18px]"
    >
      <h2
        className="text-lg font-semibold text-[var(--text-primary)]"
        id="nutrient-balance-title"
      >
        {nutrientBalance.title}
      </h2>
      <div className="mt-3 space-y-2.5">
        {nutrientBalance.items.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold text-[var(--text-muted)]">
                {item.label}
              </p>
              <p className="text-[10px] font-semibold text-[var(--text-secondary)]">
                {item.value}
              </p>
            </div>
            <div className="mt-2">
              <ProgressBar
                accent={item.accent}
                progress={item.progress}
                quiet
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AgendaViewSwitch({
  agenda,
}: Readonly<{
  agenda: DashboardTodayAgenda;
}>) {
  return (
    <div className="flex w-[286px] max-w-full rounded-full border border-[rgba(91,124,250,.24)] bg-[#0d1727] p-1 text-center text-[10px] font-medium text-[var(--text-muted)]">
      {agenda.views.map((view) => (
        <span
          className={cn(
            "flex-1 rounded-full px-3 py-1.5",
            view === agenda.activeView &&
              "border border-[rgba(91,124,250,.24)]",
          )}
          key={view}
        >
          {view}
        </span>
      ))}
    </div>
  );
}

function AgendaHourRail({
  hours,
}: Readonly<{
  hours: DashboardTodayAgenda["hours"];
}>) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-[var(--border-subtle)] bg-[#0b1423] py-2">
      {hours.map((time) => (
        <div
          className="flex h-8 items-start justify-end pr-2 text-[11px] font-medium text-[var(--text-secondary)] 2xl:h-[40.35px]"
          key={time}
        >
          {time}
        </div>
      ))}
    </div>
  );
}

function AgendaEventCard({
  event,
}: Readonly<{
  event: DashboardAgendaEvent;
}>) {
  const metaLabel = `${event.time} · ${event.areaLabel} · ${event.typeLabel} · ${event.statusLabel}`;
  const eventStyle: AccentStyle = {
    ...styleFor(event.accent),
    background: "color-mix(in srgb, var(--accent) 7%, #0d1625)",
  };

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-[13px] border bg-[#0d1625] p-2.5 pl-4",
        event.tall ? "min-h-[58px]" : "min-h-[42px]",
        statusClassName(event.status),
        event.strong && event.status !== "blocked" && "border-[rgba(221,107,95,.44)]",
      )}
      style={eventStyle}
    >
      <span
        aria-hidden="true"
        className="absolute bottom-0 left-0 top-0 w-1 bg-[color-mix(in_srgb,var(--accent)_64%,transparent)]"
      />
      <div className="grid gap-1.5 sm:grid-cols-[184px_minmax(0,1fr)_156px] sm:items-center">
        <div className="min-w-0">
          <h3
            className={cn(
              "truncate text-xs text-[var(--text-secondary)]",
              (event.status === "active" || event.status === "next" || event.strong) &&
                "font-semibold text-[var(--text-primary)]",
            )}
          >
            {event.title}
          </h3>
          <p className="mt-1 truncate text-[10px] font-medium leading-tight text-[var(--text-muted)]">
            {metaLabel}
          </p>
        </div>
        <div className="min-w-0">
          <p
            className={cn(
              "truncate text-[11px] leading-tight text-[var(--text-muted)]",
              event.strong && "font-semibold text-[var(--text-primary)]",
            )}
          >
            {event.note}
          </p>
          {event.nextAction ? (
            <p className="mt-0.5 truncate text-[10px] font-medium leading-tight text-[var(--text-secondary)]">
              {event.nextAction}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
          <AgendaPill accent={event.accent}>{event.relevanceLabel}</AgendaPill>
          {event.attentionLabel ? (
            <AgendaPill accent={event.accent}>{event.attentionLabel}</AgendaPill>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function AgendaPill({
  children,
  accent,
}: Readonly<{
  children: ReactNode;
  accent: string;
}>) {
  return (
    <span
      className="rounded-full border border-[color-mix(in_srgb,var(--accent)_24%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] px-2.5 py-0.5 text-[9px] font-medium text-[var(--text-secondary)]"
      style={styleFor(accent)}
    >
      {children}
    </span>
  );
}

export function MealsToday() {
  return (
    <Panel
      className="border-[rgba(217,146,79,.12)] bg-[#0f1724] 2xl:h-[384px]"
      title={meals.title}
    >
      <div className="space-y-3 p-4 2xl:space-y-2 2xl:p-3">
        {meals.items.map((meal) => (
          <article
            className="grid min-h-[84px] grid-cols-[64px_minmax(0,1fr)] gap-4 rounded-[14px] border border-[var(--border-subtle)] bg-[#101a2a] p-3 2xl:min-h-[92px] 2xl:grid-cols-[72px_minmax(0,1fr)]"
            key={meal.type}
          >
            <div className="rounded-[14px] border border-[rgba(217,146,79,.10)] bg-[rgba(217,146,79,.09)] 2xl:h-[68px] 2xl:w-[72px]" />
            <div className="min-w-0 py-0.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <Pill accent="var(--accent-yellow)">{meal.type}</Pill>
                <h3 className="text-xs font-semibold text-[var(--text-secondary)]">
                  {meal.name}
                </h3>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 text-[10px] font-medium text-[var(--text-secondary)]">
                <span>{meal.kcal}</span>
                {meal.macros.map((macro) => (
                  <span key={macro}>{macro}</span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}

export function RunningTracker() {
  const modeSwitch = (
    <div className="flex w-[294px] max-w-full rounded-full border border-[var(--border-subtle)] bg-[#0b1422] p-0.5 text-center text-[10px] font-semibold text-[var(--text-primary)]">
      {runningRecovery.modes.map((view) => (
        <span
          className={cn(
            "flex-1 rounded-full px-3 py-0.5",
            view === runningRecovery.activeMode && "border border-[var(--border-subtle)]",
          )}
          key={view}
        >
          {view}
        </span>
      ))}
    </div>
  );

  return (
    <Panel
      className="border-[rgba(221,107,95,.12)] bg-[#0f1724] 2xl:h-[226px]"
      headerAccessory={modeSwitch}
      subtitle={runningRecovery.subtitle}
      title={runningRecovery.title}
    >
      <div className="p-3 2xl:flex 2xl:h-[152px] 2xl:flex-col 2xl:justify-between 2xl:p-2.5">
        <div className="grid gap-3 sm:grid-cols-3 2xl:gap-2">
          {runStats.map((stat) => (
            <article
              className="rounded-[14px] border border-[var(--border-subtle)] bg-[#101a2a] p-2.5 2xl:min-h-[52px] 2xl:p-2"
              key={stat.label}
            >
              <p className="text-[10px] font-medium text-[var(--text-muted)]">
                {stat.label}
              </p>
              <div className="mt-1.5 flex items-baseline justify-between gap-3">
                <p className="text-base font-semibold text-[var(--text-primary)]">
                  {stat.value}
                </p>
                <p className="text-[10px] font-medium text-[var(--text-secondary)]">
                  {stat.delta}
                </p>
              </div>
            </article>
          ))}
        </div>
        <article className="mt-2 grid gap-3 rounded-[14px] border border-[var(--border-subtle)] bg-[#101a2a] p-2.5 sm:grid-cols-[minmax(0,1fr)_150px_56px] sm:items-center 2xl:mt-0 2xl:min-h-[62px] 2xl:gap-2 2xl:p-2">
          <div>
            <p className="text-[10px] font-semibold text-[var(--text-primary)]">
              {runningRecovery.rhythm.title}
            </p>
            <p className="mt-1 text-[10px] font-semibold text-[var(--text-primary)]">
              {runningRecovery.rhythm.detail}
            </p>
          </div>
          <ProgressBar
            accent={runningRecovery.rhythm.accent}
            progress={runningRecovery.rhythm.progress}
            quiet
          />
          <Pill accent={runningRecovery.rhythm.accent}>
            {runningRecovery.rhythm.statusLabel}
          </Pill>
        </article>
      </div>
    </Panel>
  );
}

export function TodayAgenda() {
  const data = dashboardMockData.todayAgenda;

  return (
    <section
      aria-labelledby="today-agenda-title"
      className="overflow-hidden rounded-[var(--panel-radius)] border border-[rgba(91,124,250,.30)] bg-[#0e1828] shadow-[0_16px_40px_rgba(0,0,0,.24)] 2xl:h-[820px]"
    >
      <div className="border-b border-[var(--border-subtle)] bg-[rgba(14,23,38,.72)] px-5 py-4 2xl:h-[86px] 2xl:px-[30px] 2xl:py-0">
        <div className="flex flex-wrap items-center justify-between gap-4 2xl:h-full">
          <h2
            className="text-[28px] font-semibold text-[var(--text-primary)]"
            id="today-agenda-title"
          >
            {data.title}
          </h2>
          <div className="flex flex-wrap items-center gap-6">
            <AgendaViewSwitch agenda={data} />
          </div>
        </div>
      </div>
      <div className="relative grid h-[clamp(560px,54vh,650px)] min-h-0 grid-cols-[56px_minmax(0,1fr)] gap-3 p-3 2xl:mt-[6px] 2xl:h-[780px] 2xl:grid-cols-[64px_minmax(0,1fr)] 2xl:gap-5 2xl:px-[22px] 2xl:py-0">
        <AgendaHourRail hours={data.hours} />
        <div className="relative min-h-0 overflow-hidden rounded-[16px] border border-[var(--border-subtle)] bg-[#0b1423] p-2.5">
          <div
            aria-hidden="true"
            className="absolute left-0 right-0 z-10 h-0.5 bg-[rgba(221,107,95,.95)]"
            style={topPositionStyle(data.currentTimePositionPercent)}
          />
          <p
            className="absolute right-3 z-10 text-xs font-semibold text-[var(--accent-red)]"
            style={currentTimeLabelStyle(data.currentTimePositionPercent)}
          >
            {data.currentTimeLabel}
          </p>
          <div className="relative h-full space-y-2 overflow-hidden pr-1 2xl:space-y-0 2xl:pr-0">
            {data.events.map((event, index) => (
              <div
                className="2xl:absolute 2xl:left-0 2xl:right-1 2xl:top-[var(--agenda-top)]"
                key={event.title}
                style={agendaEventSlotStyle(index)}
              >
                <AgendaEventCard event={event} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function HabitTrackers() {
  const windowSwitch = (
    <div className="flex min-w-0 items-center justify-end">
      <div className="flex w-[270px] max-w-full rounded-full border border-[var(--border-subtle)] bg-[#0c1422] p-0.5 text-center text-[10px] font-semibold text-[var(--text-primary)]">
        {habitTrackers.windows.map((view) => (
          <span
            className={cn(
              "flex-1 rounded-full px-3 py-0.5",
              view === habitTrackers.activeWindow &&
                "border border-[var(--border-subtle)]",
            )}
            key={view}
          >
            {view}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <Panel
      className="bg-[#101827] 2xl:h-[260px]"
      headerAccessory={windowSwitch}
      title={habitTrackers.title}
    >
      <div className="p-4 2xl:px-[28px] 2xl:pb-1.5 2xl:pt-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 2xl:grid-cols-[130px_130px_130px_130px] 2xl:gap-x-[14px] 2xl:gap-y-5">
          {habits.map((habit) => (
            <article
              className="min-h-[68px] rounded-[14px] border border-[var(--border-subtle)] bg-[#101a2a] p-2.5"
              key={habit.label}
            >
              <div className="flex items-start gap-2.5">
                <span className="grid size-6 shrink-0 place-items-center rounded-full border border-[var(--border-subtle)] text-[10px] font-semibold text-[var(--text-primary)]">
                  {habit.marker}
                </span>
                <div className="min-w-0">
                  <h3 className="text-[10px] font-semibold text-[var(--text-primary)]">
                    {habit.label}
                  </h3>
                  <p className="mt-0.5 text-[11px] font-semibold leading-tight text-[var(--text-primary)]">
                    {habit.value}
                  </p>
                </div>
              </div>
              <div
                className="mt-2 flex gap-1.5"
                aria-label={`${habit.done} of ${habit.total} completed`}
              >
                {Array.from({ length: habit.total }).map((_, index) => (
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      index < habit.done
                        ? "bg-[var(--accent-purple)]"
                        : "bg-[rgba(148,163,184,.24)]",
                    )}
                    key={`${habit.label}-${index}`}
                  />
                ))}
              </div>
            </article>
          ))}
          <article className="grid min-h-[68px] place-items-center rounded-[14px] border border-[var(--border-subtle)] bg-[#101a2a] p-2.5 text-center">
            <div>
              <p className="text-lg font-semibold leading-none text-[var(--text-primary)]">+</p>
              <p className="mt-1.5 text-[10px] font-semibold text-[var(--text-primary)]">
                {habitTrackers.addHabitLabel}
              </p>
            </div>
          </article>
        </div>
      </div>
    </Panel>
  );
}

export function ActivePortfolio() {
  const headerCounters = (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {activePortfolioCounters.map((counter) => (
        <span
          className="rounded-full border border-[var(--border-subtle)] bg-[#0b1422] px-2.5 py-1 text-[9px] font-semibold text-[var(--text-secondary)]"
          key={counter.label}
        >
          {counter.value} {counter.label}
        </span>
      ))}
    </div>
  );

  return (
    <Panel
      className="bg-[#101827] 2xl:h-[546px]"
      headerAccessory={headerCounters}
      subtitle={activePortfolio.subtitle}
      title={activePortfolio.title}
      titleClassName="text-xl"
    >
      <div className="p-4 2xl:px-[26px] 2xl:pb-3 2xl:pt-4">
        <div className="mb-3 rounded-[13px] border border-[var(--border-subtle)] bg-[#0b1422] p-3 2xl:mb-6">
          <div className="grid gap-3 sm:grid-cols-[132px_minmax(0,1fr)] sm:items-center">
            <div>
              <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                {activePortfolio.viewTitle}
              </p>
              <p className="mt-1 text-[10px] font-semibold text-[var(--text-primary)]">
                {activePortfolio.viewSubtitle}
              </p>
            </div>
            <div className="flex rounded-[13px] border border-[var(--border-subtle)] bg-[#0b1422] p-1 text-center text-[10px] font-semibold text-[var(--text-primary)]">
              {activePortfolio.views.map((view) => (
                <span
                  className={cn(
                    "flex-1 rounded-full px-3 py-1.5",
                    view === activePortfolio.activeView &&
                      "border border-[var(--border-subtle)]",
                  )}
                  key={view}
                >
                  {view}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-[263px_263px] 2xl:gap-3">
          {projects.map((project) => (
            <article
              className="rounded-[13px] border bg-[#101a2a] p-3 2xl:min-h-[162px]"
              key={project.title}
              style={{
                borderColor: "color-mix(in srgb, var(--accent) 26%, transparent)",
                "--accent": project.accent,
              } as AccentStyle}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="size-2.5 rounded-full bg-[var(--accent)]" />
                  <h3 className="truncate text-sm font-semibold text-[var(--text-primary)]">
                    {project.title}
                  </h3>
                </div>
                <Pill accent={project.accent}>{project.label}</Pill>
              </div>
              <p className="mt-3 text-[10px] font-medium text-[var(--text-secondary)]">
                Next
              </p>
              <p className="mt-1 text-[10px] font-medium text-[var(--text-secondary)]">
                {project.next}
              </p>
              <div className="mt-2.5 flex items-center justify-between gap-3">
                <p className="text-[10px] font-medium text-[var(--text-secondary)]">
                  {project.meta}
                </p>
                <p className="text-[10px] font-medium text-[var(--text-secondary)]">
                  {project.progress}%
                </p>
              </div>
              <div className="mt-2">
                <ProgressBar accent={project.accent} progress={project.progress} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </Panel>
  );
}

export function AntiRotActions() {
  return (
    <Panel
      className="border-[rgba(168,183,204,.10)] bg-[#0c1320] 2xl:h-[205px]"
      title={antiRotActions.title}
    >
      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-5 2xl:grid-cols-[256px_256px_257px_257px_257px] 2xl:gap-[15px] 2xl:px-[36px] 2xl:pb-0 2xl:pt-2">
        {antiRot.map((action) => (
          <article
            className="flex flex-col justify-between rounded-[13px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--accent)_4%,transparent)] p-3 2xl:h-[125px] 2xl:p-2.5"
            key={action.title}
            style={styleFor(action.accent)}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="size-2 rounded-full bg-[var(--accent)]" />
                <h3 className="truncate text-[10px] font-semibold text-[var(--text-secondary)]">
                  {action.title}
                </h3>
              </div>
              <span className="text-[8px] font-medium text-[var(--text-muted)]">
                {antiRotActions.donePrompt}
              </span>
            </div>
            <div className="mt-3 2xl:mt-2">
              <Pill accent={action.accent}>{action.type}</Pill>
            </div>
            <dl className="mt-3 space-y-1.5 text-[8px] font-medium leading-tight text-[var(--text-muted)] 2xl:mt-2 2xl:space-y-1">
              <div className="flex gap-2">
                <dt>Bad habit:</dt>
                <dd>{action.bad}</dd>
              </div>
            </dl>
            <div className="mt-3 flex items-center gap-2 2xl:mt-2">
              <Pill quiet>{action.effort}</Pill>
              <span className="text-[8px] font-medium text-[var(--text-muted)]">
                {action.time}
              </span>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}

export function Challenges() {
  return (
    <section
      aria-labelledby="challenges-title"
      className="overflow-hidden rounded-[var(--panel-radius)] border border-[rgba(216,180,90,.12)] bg-[#0c1320] shadow-[0_8px_22px_rgba(0,0,0,.12)] 2xl:h-[205px]"
    >
      <div className="p-4 2xl:px-[31px] 2xl:py-[10px]">
        <h2
          className="text-lg font-semibold text-[var(--text-primary)]"
          id="challenges-title"
        >
          {challengesRewardFocus.title}
        </h2>
        <div className="mb-3 mt-3 flex min-h-8 items-center justify-between gap-3 rounded-full border border-[rgba(216,180,90,.16)] bg-[rgba(216,180,90,.06)] px-4 2xl:mb-2 2xl:mt-2 2xl:h-[27px]">
          <p className="text-xs font-semibold text-[var(--text-secondary)]">
            {challengesRewardFocus.summary}
          </p>
          <p className="text-[8px] font-medium text-[var(--text-muted)]">
            {challengesRewardFocus.measurementLabel}
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3 2xl:grid-cols-[240px_240px_240px] 2xl:gap-[12px]">
          {challenges.map((challenge) => (
            <article
              className="flex flex-col justify-between rounded-[13px] border border-[rgba(216,180,90,.11)] bg-[#0f1724] p-3 2xl:h-[108px] 2xl:p-2.5"
              key={challenge.title}
            >
              <div className="flex items-start gap-3">
                <span className="mt-1 size-2 rounded-full bg-[var(--accent-yellow)]" />
                <h3 className="text-[10px] font-semibold text-[var(--text-secondary)]">
                  {challenge.title}
                </h3>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 2xl:mt-2">
                <Pill accent="var(--accent-yellow)">{challenge.type}</Pill>
                <span className="text-[8px] font-medium text-[var(--text-muted)]">
                  {challenge.status}
                </span>
              </div>
              {challenge.progress > 0 ? (
                <div className="mt-3 2xl:mt-2">
                  <ProgressBar
                    accent="var(--accent-yellow)"
                    progress={challenge.progress}
                  />
                </div>
              ) : null}
              <p className="mt-3 text-[8px] font-medium text-[var(--text-muted)] 2xl:mt-2">
                {challenge.footer}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

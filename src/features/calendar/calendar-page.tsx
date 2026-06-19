import { Pill, accentStyle } from "@/components/layout/route-page-primitives";
import type {
  CalendarViewModel,
  CalendarWeekStatViewModel,
} from "./calendar-types";
import { CalendarPageHeader } from "./components/calendar-page-header";
import { CalendarRightPanel } from "./components/calendar-right-panel";
import { CalendarScopeRow } from "./components/calendar-scope-row";
import { CalendarWeekSurface } from "./components/calendar-week-surface";

function WeekStatCard({
  stat,
}: Readonly<{
  stat: CalendarWeekStatViewModel;
}>) {
  return (
    <article
      className="min-h-[48px] rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.46)] px-2.5 py-1.5"
      style={accentStyle(stat.accent)}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span
          aria-hidden="true"
          className="h-7 w-1 rounded-full bg-[var(--accent)]"
        />
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold text-[var(--text-muted)]">
            {stat.label}
          </p>
          <p className="mt-0.5 truncate text-[13px] font-semibold leading-4 text-[var(--text-primary)]">
            {stat.value} {stat.detail}
          </p>
        </div>
      </div>
    </article>
  );
}

function CalendarWeekOverview({
  viewModel,
}: Readonly<{
  viewModel: CalendarViewModel;
}>) {
  return (
    <section
      aria-labelledby="calendar-week-overview-heading"
      className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.68)] px-3 py-2"
    >
      <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(580px,auto)] xl:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              className="text-[15px] font-semibold text-[var(--text-primary)]"
              id="calendar-week-overview-heading"
            >
              {viewModel.weekStats.title}
            </h2>
            <Pill accent="var(--accent-cyan)">focus week</Pill>
          </div>
          <p className="mt-1 max-w-3xl text-[10px] leading-4 text-[var(--text-muted)]">
            {viewModel.weekStats.summary}
          </p>
        </div>
        <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-5">
          {viewModel.weekStats.stats.map((stat) => (
            <WeekStatCard key={stat.label} stat={stat} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CalendarSourceContract({
  viewModel,
}: Readonly<{
  viewModel: CalendarViewModel;
}>) {
  return (
    <section
      aria-label="Calendar source of truth contract"
      className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.36)] px-3 py-2"
    >
      <div className="flex flex-col gap-2 text-[10px] leading-4 text-[var(--text-muted)] xl:flex-row xl:items-center xl:justify-between">
        <p>
          <span className="font-semibold text-[var(--text-secondary)]">
            Page Type:
          </span>{" "}
          {viewModel.pageContract.pageType}
        </p>
        <p className="max-w-4xl">
          {viewModel.pageContract.canonicalSource}
        </p>
      </div>
    </section>
  );
}

export function CalendarPlanningPage({
  viewModel,
}: Readonly<{
  viewModel: CalendarViewModel;
}>) {
  return (
    <div className="mx-auto flex w-full max-w-[2208px] flex-col gap-2 pb-6 xl:h-[calc(100dvh-1.25rem)] xl:min-h-0 xl:pb-0">
      <CalendarPageHeader header={viewModel.header} />
      <CalendarScopeRow
        filters={viewModel.filters}
        projects={viewModel.projectsThisWeek}
      />
      <CalendarWeekOverview viewModel={viewModel} />

      <div className="grid min-w-0 gap-2 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_minmax(400px,440px)] 2xl:grid-cols-[minmax(0,1fr)_minmax(440px,520px)]">
        <div className="grid min-w-0 gap-2 xl:min-h-0 xl:grid-rows-[minmax(0,1fr)_auto]">
          <CalendarWeekSurface viewModel={viewModel} />
          <CalendarSourceContract viewModel={viewModel} />
        </div>
        <CalendarRightPanel
          panel={viewModel.rightPanel}
          selectedBlock={viewModel.selectedBlock}
        />
      </div>
    </div>
  );
}

import { Pill } from "@/components/layout/route-page-primitives";
import { cn } from "@/lib/cn";
import type { CalendarView, CalendarViewModel } from "../calendar-types";
import { CalendarCreateMenu } from "./calendar-create-flow";

export function CalendarPageHeader({
  header,
  onCreateBlock,
  onMovePeriod,
  onToday,
  onViewChange,
  profileId,
  resolveDayId,
  schedulableTasks,
}: Readonly<{
  header: CalendarViewModel["header"];
  onCreateBlock: Parameters<typeof CalendarCreateMenu>[0]["onCreateBlock"];
  onMovePeriod: (direction: -1 | 1) => void;
  onToday: () => void;
  onViewChange: (view: CalendarView) => void;
  profileId: CalendarViewModel["profileId"];
  resolveDayId: (date: string) => string;
  schedulableTasks: CalendarViewModel["schedulableTasks"];
}>) {
  return (
    <header className="overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.72)] shadow-[0_8px_22px_rgba(0,0,0,.12)]">
      <div className="grid gap-3 bg-[linear-gradient(90deg,rgba(95,200,215,.045),transparent_44%)] px-4 py-3 sm:px-4 xl:grid-cols-[minmax(0,1fr)_minmax(420px,auto)] xl:items-center">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-cyan)]">
            {header.eyebrow}
          </p>
          <h1 className="mt-0.5 text-[28px] font-semibold leading-none text-[var(--text-primary)] sm:text-[30px]">
            {header.title}
          </h1>
          <p className="mt-1.5 max-w-3xl text-xs leading-4 text-[var(--text-secondary)]">
            {header.summary}
          </p>
        </div>

        <div className="grid gap-1.5 xl:justify-items-end">
          <div className="flex flex-wrap items-center gap-2">
            <Pill quiet>{header.dateRange}</Pill>
            {profileId !== "manual" ? (
              <CalendarCreateMenu
                defaults={{
                  date: "2026-06-12",
                  dayLabel: "Thu 12 June",
                  endTime: "17:00",
                  startTime: "15:30",
                }}
                onCreateBlock={onCreateBlock}
                resolveDayId={resolveDayId}
                tasks={schedulableTasks}
              />
            ) : null}
            <>
              <button
                className="rounded-full border border-[var(--border-subtle)] bg-[rgba(18,28,43,.82)] px-3 py-1 text-[10px] font-semibold text-[var(--text-primary)] transition hover:border-[var(--border-default)] hover:bg-[rgba(23,34,53,.82)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                onClick={onToday}
                type="button"
              >
                {header.controls.currentAction}
              </button>
              <button
                aria-label="Previous period"
                className="size-6 rounded-full border border-[var(--border-subtle)] bg-[rgba(18,28,43,.74)] text-[12px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                onClick={() => onMovePeriod(-1)}
                type="button"
              >
                {"<"}
              </button>
              <button
                aria-label="Next period"
                className="size-6 rounded-full border border-[var(--border-subtle)] bg-[rgba(18,28,43,.74)] text-[12px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                onClick={() => onMovePeriod(1)}
                type="button"
              >
                {">"}
              </button>
            </>
          </div>

          <div className="flex w-full min-w-0 flex-wrap rounded-full border border-[var(--border-subtle)] bg-[rgba(11,17,28,.72)] p-1 xl:w-[476px]">
            {header.controls.views
              .filter((view) => view.label !== "Year")
              .map((view, index) => (
              <button
                aria-pressed={view.active ? "true" : "false"}
                className={cn(
                  "min-h-6 flex-1 rounded-full px-3 text-[10px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
                  view.active
                    ? "border border-[rgba(95,200,215,.28)] bg-[rgba(95,200,215,.16)] text-[var(--text-primary)]"
                    : "border border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                )}
                key={`calendar-view-${index}`}
                onClick={() => onViewChange(view.label.toLowerCase() as CalendarView)}
                type="button"
              >
                {view.label}
              </button>
              ))}
          </div>

          <p className="max-w-[476px] text-[10px] leading-4 text-[var(--text-faint)]">
            Manual scheduling writes canonical task time fields through the
            Planner Queue and Inspector. Free calendar events remain deferred.
          </p>
        </div>
      </div>
    </header>
  );
}

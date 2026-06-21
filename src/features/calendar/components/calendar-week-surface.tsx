import {
  CALENDAR_DAY_END_MINUTES,
  CALENDAR_DAY_START_MINUTES,
} from "../calendar-mock-data";
import type { CalendarViewModel } from "../calendar-types";
import {
  CalendarAllDayBlock,
  CalendarTimedBlock,
} from "./calendar-block";
import { cn } from "@/lib/cn";

function hourToMinutes(hour: string) {
  const [hours, minutes] = hour.split(":").map(Number);

  return hours * 60 + minutes;
}

function hourTop(hour: string) {
  const range = CALENDAR_DAY_END_MINUTES - CALENDAR_DAY_START_MINUTES;
  const offset = hourToMinutes(hour) - CALENDAR_DAY_START_MINUTES;

  return Math.max(0, Math.min(100, (offset / range) * 100));
}

export function CalendarWeekSurface({
  viewModel,
}: Readonly<{
  viewModel: CalendarViewModel;
}>) {
  return (
    <section
      aria-labelledby="calendar-week-surface-heading"
      className="min-w-0 overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.74)] shadow-[0_8px_22px_rgba(0,0,0,.12)] xl:flex xl:min-h-0 xl:flex-col"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] bg-[rgba(14,23,38,.76)] px-3 py-2">
        <div className="min-w-0">
          <h2
            className="text-[14px] font-semibold text-[var(--text-primary)]"
            id="calendar-week-surface-heading"
          >
            Outlook Week Surface
          </h2>
          <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-muted)]">
            Projected time blocks keep source entities visible.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[10px] text-[var(--text-muted)]">
          <span>Current time {viewModel.currentTime.label}</span>
          <span aria-hidden="true">·</span>
          <span>Selected Thu 12</span>
          <span aria-hidden="true">·</span>
          <span>Create from slot in right panel</span>
        </div>
      </div>

      <div className="overflow-x-auto xl:min-h-0 xl:flex-1">
        <div className="min-w-[1040px] xl:flex xl:h-full xl:min-h-0 xl:flex-col">
          <div className="grid grid-cols-[64px_repeat(7,minmax(138px,1fr))] border-b border-[var(--border-subtle)]">
            <div className="border-r border-[var(--border-subtle)] bg-[rgba(11,17,28,.34)]" />
            {viewModel.days.map((day) => (
              <div
                className={cn(
                  "border-r border-[var(--border-subtle)] px-2 py-2 text-center last:border-r-0",
                  day.isToday && "bg-[rgba(95,200,215,.06)]",
                )}
                key={day.id}
              >
                <p className="text-[10px] font-semibold text-[var(--text-secondary)]">
                  {day.weekday} {day.dayNumber}
                </p>
                {day.isToday ? (
                  <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-cyan)]">
                    Today
                  </p>
                ) : (
                  <p className="mt-1 text-[9px] text-[var(--text-faint)]">
                    week view
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[64px_repeat(7,minmax(138px,1fr))] border-b border-[var(--border-subtle)]">
            <div className="flex items-start justify-center border-r border-[var(--border-subtle)] bg-[rgba(11,17,28,.34)] px-2 py-3 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">
              All day
            </div>
            {viewModel.days.map((day) => {
              const dayBlocks = viewModel.allDayBlocks.filter(
                (block) => block.dayId === day.id,
              );

              return (
                <div
                  className={cn(
                    "min-h-[50px] border-r border-[var(--border-subtle)] p-1.5 last:border-r-0",
                    day.isToday && "bg-[rgba(95,200,215,.055)]",
                  )}
                  key={day.id}
                >
                  <div className="grid gap-1">
                    {dayBlocks.map((block) => (
                      <CalendarAllDayBlock
                        block={block}
                        key={block.id}
                        selected={block.id === viewModel.selectedBlock.id}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="relative h-[620px] min-h-[520px] xl:min-h-0 xl:flex-1">
            <div className="grid h-full grid-cols-[64px_repeat(7,minmax(138px,1fr))]">
              <div className="relative border-r border-[var(--border-subtle)] bg-[rgba(11,17,28,.34)]">
                {viewModel.hours.map((hour) => (
                  <time
                    className="absolute right-2 -translate-y-1/2 text-[9px] font-medium text-[var(--text-faint)]"
                    dateTime={hour}
                    key={hour}
                    style={{ top: `${hourTop(hour)}%` }}
                  >
                    {hour}
                  </time>
                ))}
              </div>

              {viewModel.days.map((day) => {
                const dayBlocks = viewModel.timedBlocks.filter(
                  (block) => block.dayId === day.id,
                );

                return (
                  <div
                    aria-label={day.fullLabel}
                    className={cn(
                      "relative overflow-hidden border-r border-[var(--border-subtle)] last:border-r-0",
                      day.isToday && "bg-[rgba(95,200,215,.055)]",
                    )}
                    key={day.id}
                  >
                    {viewModel.hours.map((hour) => (
                      <span
                        aria-hidden="true"
                        className="absolute left-0 right-0 h-px bg-[rgba(148,163,184,.08)]"
                        key={hour}
                        style={{ top: `${hourTop(hour)}%` }}
                      />
                    ))}
                    {dayBlocks.map((block) => (
                      <CalendarTimedBlock block={block} key={block.id} />
                    ))}
                  </div>
                );
              })}
            </div>

            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-[64px] right-0 h-px bg-[rgba(221,107,95,.82)]"
              style={{ top: `${viewModel.currentTime.top}%` }}
            >
              <span className="absolute -left-[52px] -top-2 rounded-full border border-[rgba(221,107,95,.26)] bg-[rgba(18,28,43,.94)] px-2 py-0.5 text-[9px] font-semibold text-[var(--accent-red)]">
                {viewModel.currentTime.label}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] px-3 py-2">
            <div className="flex flex-wrap gap-2.5 text-[10px] text-[var(--text-muted)]">
              {[
                ["Event", "var(--accent-green)"],
                ["Task Block", "var(--accent-blue)"],
                ["Focus Block", "var(--accent-cyan)"],
                ["Batch Block", "var(--accent-purple)"],
                ["Routine", "var(--accent-orange)"],
                ["Meal", "var(--accent-yellow)"],
                ["Workout", "var(--accent-red)"],
                ["Review", "var(--accent-cyan)"],
                ["Deadline / Reminder", "var(--accent-orange)"],
              ].map(([label, accent]) => (
                <span className="inline-flex items-center gap-1.5" key={label}>
                  <span
                    aria-hidden="true"
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: accent }}
                  />
                  {label}
                </span>
              ))}
            </div>
            <p className="text-[10px] leading-4 text-[var(--text-faint)]">
              Color supports scanning only. Every block includes text label,
              type and status.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

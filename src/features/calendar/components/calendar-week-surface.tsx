import {
  CALENDAR_DAY_END_MINUTES,
  CALENDAR_DAY_START_MINUTES,
} from "../calendar-mock-data";
import {
  calendarMinutesToTime,
  calendarSlotFromRelativeOffset,
  resizedCalendarDuration,
} from "../calendar-pointer-utils";
import type {
  CalendarTimedBlockViewModel,
  CalendarViewModel,
} from "../calendar-types";
import { CalendarAllDayBlock, CalendarTimedBlock } from "./calendar-block";
import { cn } from "@/lib/cn";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

const TIME_GUTTER_WIDTH = 56;

const emptyCalendarStateContent = {
  title: "Noch keine Termine oder Zeitblöcke",
  description:
    "Geplante Aufgaben mit Uhrzeit erscheinen hier. Aufgaben ohne Uhrzeit bleiben in der Planning Queue.",
};

function hourToMinutes(hour: string) {
  const [hours, minutes] = hour.split(":").map(Number);

  return hours * 60 + minutes;
}

function minutesToTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function hourTop(hour: string) {
  const range = CALENDAR_DAY_END_MINUTES - CALENDAR_DAY_START_MINUTES;
  const offset = hourToMinutes(hour) - CALENDAR_DAY_START_MINUTES;

  return Math.max(0, Math.min(100, (offset / range) * 100));
}

function calendarHourRows() {
  const rows: string[] = [];

  for (
    let minutes = CALENDAR_DAY_START_MINUTES;
    minutes <= CALENDAR_DAY_END_MINUTES;
    minutes += 60
  ) {
    rows.push(minutesToTime(minutes));
  }

  return rows;
}

type WeekDragState = {
  durationMinutes: number;
  kind: "block" | "queue";
  pointerId: number;
  startX: number;
  startY: number;
  taskId: string;
};

type WeekDropSlot = {
  date: string;
  dayId: string;
  startTime: string;
};

const POINTER_DRAG_THRESHOLD_PX = 8;

type ResizeState = {
  block: CalendarTimedBlockViewModel;
  durationMinutes: number;
};

function CalendarWeekEmptyOverlay() {
  return (
    <div className="pointer-events-none absolute left-[80px] right-4 top-[34%] z-10 flex justify-center">
      <div className="max-w-[460px] rounded-[12px] border border-dashed border-[var(--border-default)] bg-[rgba(11,17,28,.88)] px-4 py-4 text-center shadow-[0_12px_28px_rgba(0,0,0,.22)] backdrop-blur-[2px]">
        <p className="text-[13px] font-semibold text-[var(--text-secondary)]">
          {emptyCalendarStateContent.title}
        </p>
        <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
          {emptyCalendarStateContent.description}
        </p>
      </div>
    </div>
  );
}

export function CalendarWeekSurface({
  activeDrag,
  onBlockPointerStart,
  onDropTask,
  onPointerDragEnd,
  onSelectBlock,
  onSelectSlot,
  onResizeTask,
  pointerEnabled = false,
  selectedBlockId,
  viewModel,
}: Readonly<{
  activeDrag?: WeekDragState;
  onBlockPointerStart: (
    block: CalendarTimedBlockViewModel,
    pointer: { clientX: number; clientY: number; pointerId: number },
  ) => void;
  onDropTask: (payload: { drag: WeekDragState; slot: WeekDropSlot }) => void;
  onPointerDragEnd: () => void;
  onSelectBlock: (blockId: string) => void;
  onSelectSlot: (slot: {
    dayId: string;
    dayLabel: string;
    date: string;
    startTime: string;
    endTime: string;
    label: string;
  }) => void;
  onResizeTask: (
    block: CalendarTimedBlockViewModel,
    durationMinutes: number,
  ) => void;
  pointerEnabled?: boolean;
  selectedBlockId?: string;
  viewModel: CalendarViewModel;
}>) {
  const hourRows = calendarHourRows();
  const dayColumnRefs = useRef(new Map<string, HTMLDivElement>());
  const resizeStateRef = useRef<ResizeState | null>(null);
  const [dropPreview, setDropPreview] = useState<WeekDropSlot | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const hasBlocks =
    viewModel.allDayBlocks.length > 0 || viewModel.timedBlocks.length > 0;

  const relativeOffsetForDay = useCallback((dayId: string, clientY: number) => {
    const column = dayColumnRefs.current.get(dayId);
    if (!column) return null;

    const bounds = column.getBoundingClientRect();
    if (bounds.height <= 0) return null;

    return Math.max(0, Math.min(1, (clientY - bounds.top) / bounds.height));
  }, []);

  const dropSlotForDay = useCallback(
    (
      day: CalendarViewModel["days"][number],
      clientY: number,
      drag: WeekDragState | undefined,
    ): WeekDropSlot | null => {
      if (!drag) return null;
      const relativeOffset = relativeOffsetForDay(day.id, clientY);
      if (relativeOffset === null) return null;
      const startMinutes = calendarSlotFromRelativeOffset({
        durationMinutes: drag.durationMinutes,
        relativeOffset,
      });

      return {
        date: day.date,
        dayId: day.id,
        startTime: calendarMinutesToTime(startMinutes),
      };
    },
    [relativeOffsetForDay],
  );

  function handleResizeStart(
    block: CalendarTimedBlockViewModel,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const nextState = {
      block,
      durationMinutes: block.durationMinutes,
    };
    resizeStateRef.current = nextState;
    setResizeState(nextState);
  }

  useEffect(() => {
    function updateResize(clientY: number) {
      const current = resizeStateRef.current;
      if (!current) return null;
      const relativeOffset = relativeOffsetForDay(current.block.dayId, clientY);
      if (relativeOffset === null) return current;
      const durationMinutes = resizedCalendarDuration({
        relativeOffset,
        startMinutes: current.block.startMinutes,
      });
      const nextState = { ...current, durationMinutes };
      resizeStateRef.current = nextState;
      setResizeState(nextState);
      return nextState;
    }

    function handlePointerMove(event: globalThis.PointerEvent) {
      updateResize(event.clientY);
    }

    function handlePointerUp(event: globalThis.PointerEvent) {
      const completed = updateResize(event.clientY);
      resizeStateRef.current = null;
      setResizeState(null);
      if (
        completed &&
        completed.durationMinutes !== completed.block.durationMinutes
      ) {
        onResizeTask(completed.block, completed.durationMinutes);
      }
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [onResizeTask, relativeOffsetForDay]);

  useEffect(() => {
    if (!activeDrag) {
      return;
    }
    const pointerDrag: WeekDragState = activeDrag;

    function resolveDropSlot(event: globalThis.PointerEvent) {
      if (event.pointerId !== pointerDrag.pointerId) return null;
      if (
        Math.hypot(
          event.clientX - pointerDrag.startX,
          event.clientY - pointerDrag.startY,
        ) < POINTER_DRAG_THRESHOLD_PX
      ) {
        return null;
      }
      const target = document.elementFromPoint(event.clientX, event.clientY);
      const dayId = target?.closest<HTMLElement>("[data-calendar-day]")?.dataset
        .calendarDay;
      const day = viewModel.days.find((candidate) => candidate.id === dayId);

      return day ? dropSlotForDay(day, event.clientY, pointerDrag) : null;
    }

    function handlePointerMove(event: globalThis.PointerEvent) {
      setDropPreview(resolveDropSlot(event));
    }

    function handlePointerUp(event: globalThis.PointerEvent) {
      const slot = resolveDropSlot(event);
      setDropPreview(null);
      if (slot) {
        onDropTask({ drag: pointerDrag, slot });
      } else {
        onPointerDragEnd();
      }
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [
    activeDrag,
    dropSlotForDay,
    onDropTask,
    onPointerDragEnd,
    viewModel.days,
  ]);

  return (
    <section
      aria-labelledby="calendar-week-surface-heading"
      className="calendar-timegrid min-w-0 overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.74)] shadow-[0_8px_22px_rgba(0,0,0,.12)] xl:flex xl:min-h-[720px] xl:flex-col 2xl:min-h-[760px]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] bg-[rgba(14,23,38,.76)] px-3 py-2">
        <div className="min-w-0">
          <h2
            className="text-[14px] font-semibold text-[var(--text-primary)]"
            id="calendar-week-surface-heading"
          >
            Week Timegrid
          </h2>
          <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-muted)]">
            Scheduled task blocks appear here; planned tasks without time stay
            in the Planner Queue.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[10px] text-[var(--text-muted)]">
          <span>Current time {viewModel.currentTime.label}</span>
          <span aria-hidden="true">·</span>
          <span>Free slots select context</span>
          <span aria-hidden="true">·</span>
          <span>Prepared create opens in the Inspector</span>
        </div>
      </div>

      <div className="calendar-grid-scroll overflow-auto xl:flex-1">
        <div className="calendar-grid-content min-w-[1040px] xl:flex xl:h-full xl:min-h-[660px] xl:flex-col 2xl:min-h-[700px]">
          <div className="grid grid-cols-[56px_repeat(7,minmax(138px,1fr))] border-b border-[var(--border-subtle)]">
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

          <div className="grid grid-cols-[56px_repeat(7,minmax(138px,1fr))] border-b border-[var(--border-subtle)]">
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
                        onSelect={onSelectBlock}
                        selected={block.id === selectedBlockId}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="calendar-hours relative h-[816px] min-h-[640px] xl:h-auto xl:min-h-[680px] xl:flex-1 2xl:min-h-[760px]">
            <div
              className="grid h-full grid-cols-[56px_repeat(7,minmax(138px,1fr))]"
              style={{
                gridTemplateRows: hourRows
                  .map(
                    (hour) =>
                      `minmax(0, ${Math.min(60, CALENDAR_DAY_END_MINUTES - hourToMinutes(hour))}fr)`,
                  )
                  .join(" "),
              }}
            >
              {hourRows.map((hour) => (
                <div className="contents" key={`calendar-week-row-${hour}`}>
                  <div className="relative border-r border-t border-[rgba(148,163,184,.18)] bg-[rgba(11,17,28,.34)]">
                    <time
                      className="absolute right-2 top-2 text-[9px] font-medium leading-none text-[var(--text-faint)]"
                      dateTime={hour}
                    >
                      {hour}
                    </time>
                  </div>
                  {viewModel.days.map((day) => (
                    <div
                      aria-hidden="true"
                      className={cn(
                        "border-r border-t border-[rgba(148,163,184,.16)] last:border-r-0",
                        day.isToday
                          ? "bg-[rgba(95,200,215,.06)]"
                          : "bg-[rgba(11,17,28,.08)]",
                      )}
                      key={`calendar-week-cell-${day.id}-${hour}`}
                    />
                  ))}
                </div>
              ))}
            </div>

            <div
              className="absolute inset-y-0 right-0 grid"
              style={{
                gridTemplateColumns: "repeat(7, minmax(138px, 1fr))",
                left: TIME_GUTTER_WIDTH,
              }}
            >
              {viewModel.days.map((day) => {
                const dayBlocks = viewModel.timedBlocks.filter(
                  (block) => block.dayId === day.id,
                );

                return (
                  <div
                    aria-label={day.fullLabel}
                    className={cn(
                      "relative overflow-hidden",
                      activeDrag && "bg-[rgba(95,200,215,.035)]",
                    )}
                    data-calendar-day={day.id}
                    data-calendar-date={day.date}
                    key={day.id}
                    ref={(node) => {
                      if (node) {
                        dayColumnRefs.current.set(day.id, node);
                      } else {
                        dayColumnRefs.current.delete(day.id);
                      }
                    }}
                  >
                    {viewModel.hours.map((hour) => (
                      <button
                        aria-label={`Select free slot on ${day.fullLabel} at ${hour}`}
                        className="absolute left-0 right-0 z-[1] h-8 -translate-y-1/2 border-0 bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--focus-ring)]"
                        key={hour}
                        onClick={() => {
                          const startMinutes = hourToMinutes(hour);
                          const endMinutes = startMinutes + 60;
                          const endHour = minutesToTime(endMinutes);

                          onSelectSlot({
                            dayId: day.id,
                            dayLabel: `${day.weekday} ${day.dayNumber} June`,
                            date: day.date,
                            startTime: hour,
                            endTime: endHour,
                            label: "Selected time slot",
                          });
                        }}
                        style={{ top: `${hourTop(hour)}%` }}
                        title={`Select ${day.fullLabel} ${hour}`}
                        type="button"
                      />
                    ))}
                    {dayBlocks.map((block) => (
                      <CalendarTimedBlock
                        block={block}
                        dragging={
                          activeDrag?.kind === "block" &&
                          activeDrag.taskId === block.taskId
                        }
                        key={block.id}
                        onPointerDown={
                          pointerEnabled && block.taskId
                            ? (event) => {
                                if (event.button !== 0) return;
                                onBlockPointerStart(block, {
                                  clientX: event.clientX,
                                  clientY: event.clientY,
                                  pointerId: event.pointerId,
                                });
                              }
                            : undefined
                        }
                        onResizePointerDown={
                          pointerEnabled && block.taskId
                            ? (event) => handleResizeStart(block, event)
                            : undefined
                        }
                        onSelect={onSelectBlock}
                        previewDurationMinutes={
                          resizeState?.block.id === block.id
                            ? resizeState.durationMinutes
                            : undefined
                        }
                        selected={block.id === selectedBlockId}
                      />
                    ))}
                    {dropPreview?.dayId === day.id ? (
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-1 z-[2] h-8 rounded-[7px] border border-dashed border-[rgba(95,200,215,.62)] bg-[rgba(95,200,215,.12)]"
                        style={{
                          top: `${hourTop(dropPreview.startTime)}%`,
                        }}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-[56px] right-0 z-[2] h-px bg-[rgba(221,107,95,.82)]"
              style={{ top: `${viewModel.currentTime.top}%` }}
            >
              <span className="absolute -left-[52px] -top-2 rounded-full border border-[rgba(221,107,95,.26)] bg-[rgba(18,28,43,.94)] px-2 py-0.5 text-[9px] font-semibold text-[var(--accent-red)]">
                {viewModel.currentTime.label}
              </span>
            </div>
            {!hasBlocks ? <CalendarWeekEmptyOverlay /> : null}
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
              ].map(([label, accent], index) => (
                <span
                  className="inline-flex items-center gap-1.5"
                  key={`calendar-legend-${index}`}
                >
                  <span
                    aria-hidden="true"
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: accent }}
                  />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

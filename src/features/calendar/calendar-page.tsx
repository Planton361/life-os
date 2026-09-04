"use client";

import { useMemo, useState, useTransition } from "react";
import { Pill, accentStyle } from "@/components/layout/route-page-primitives";
import {
  rescheduleTaskAction,
  scheduleTaskForTodayAction,
  scheduleTaskForTodayFormAction,
} from "@/features/real-data/actions/task.actions";
import { cn } from "@/lib/cn";
import { useRouter, useSearchParams } from "next/navigation";
import { type ContentStateMeta } from "@/features/content-state";
import {
  CALENDAR_DAY_END_MINUTES,
  CALENDAR_DAY_START_MINUTES,
} from "./calendar-mock-data";
import type { CalendarRawTimedBlock } from "./calendar-view-model";
import { buildCalendarTimedBlocks } from "./calendar-view-model";
import type {
  CalendarAllDayBlockViewModel,
  CalendarBlockStatus,
  CalendarDayViewModel,
  CalendarScope,
  CalendarSelectedTimeSlotViewModel,
  CalendarTimedBlockViewModel,
  CalendarView,
  CalendarViewModel,
  CalendarWeekStatViewModel,
} from "./calendar-types";
import {
  calendarBlockStatusLabels,
  calendarBlockTypeLabels,
} from "./calendar-types";
import { findVisibleSchedulingConflict } from "./calendar-visible-conflict";
import {
  CalendarAllDayBlock,
  CalendarTimedBlock,
} from "./components/calendar-block";
import { CalendarPageHeader } from "./components/calendar-page-header";
import { CalendarRightPanel } from "./components/calendar-right-panel";
import { CalendarScopeRow } from "./components/calendar-scope-row";
import { CalendarWeekSurface } from "./components/calendar-week-surface";

type Selection =
  | { kind: "block"; blockId: string }
  | { kind: "queue"; taskId: string }
  | { kind: "slot"; slot: CalendarSelectedTimeSlotViewModel }
  | { kind: "day"; dayId: string }
  | { kind: "month"; month: number };

type DateParts = {
  date: Date;
  iso: string;
};

type PointerDragState = {
  durationMinutes: number;
  kind: "block" | "queue";
  pointerId: number;
  startX: number;
  startY: number;
  taskId: string;
};

type PointerSchedulingProposal = {
  durationMinutes: number;
  kind: "schedule" | "reschedule";
  plannedDate: string;
  scheduledTime: string;
  taskId: string;
};

type PointerConflictProposal = PointerSchedulingProposal & {
  conflictTitle: string;
  conflictTimeLabel: string;
};

const MOCK_TODAY = todayDateIso();
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const queueInputClass =
  "mt-1 min-h-8 w-full rounded-[9px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.76)] px-2.5 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--focus-ring)]";

function todayDateIso() {
  return formatIsoDate(new Date());
}

function durationLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
}

function scheduleDurationOptions(minutes: number) {
  return Array.from(new Set([minutes, 15, 30, 45, 60, 90, 120])).sort(
    (left, right) => left - right,
  );
}

function stripTimedBlock(
  block: CalendarTimedBlockViewModel,
): CalendarRawTimedBlock {
  const { compact, density, durationMinutes, layout, ...rawBlock } = block;

  void compact;
  void density;
  void durationMinutes;
  void layout;

  return rawBlock;
}

function parseIsoDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day));
}

function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number) {
  const date = parseIsoDate(iso);
  date.setUTCDate(date.getUTCDate() + days);

  return formatIsoDate(date);
}

function addMonths(iso: string, months: number) {
  const date = parseIsoDate(iso);
  date.setUTCMonth(date.getUTCMonth() + months);

  return formatIsoDate(date);
}

function addYears(iso: string, years: number) {
  const date = parseIsoDate(iso);
  date.setUTCFullYear(date.getUTCFullYear() + years);

  return formatIsoDate(date);
}

function startOfMonth(iso: string) {
  const date = parseIsoDate(iso);
  date.setUTCDate(1);

  return formatIsoDate(date);
}

function dayLabel(iso: string) {
  const date = parseIsoDate(iso);

  return `${weekdayNames[date.getUTCDay()]} ${String(date.getUTCDate()).padStart(2, "0")} ${monthNames[date.getUTCMonth()]}`;
}

const emptyCalendarStateContent = {
  title: "Noch keine Termine oder Zeitblöcke",
  description:
    "Geplante Aufgaben mit Uhrzeit erscheinen hier. Aufgaben ohne Uhrzeit bleiben in der Planning Queue.",
};

function contentStateAttributes(
  meta: ContentStateMeta,
  profileId: CalendarViewModel["profileId"],
) {
  return {
    "data-capacity": meta.capacity?.toString() ?? undefined,
    "data-content-state": meta.state,
    "data-item-count": meta.itemCount.toString(),
    "data-profile-id": profileId,
  };
}

function dateLabel(iso: string) {
  const date = parseIsoDate(iso);

  return `${weekdayNames[date.getUTCDay()]} ${String(date.getUTCDate()).padStart(2, "0")} ${monthNames[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function monthLabel(iso: string) {
  const date = parseIsoDate(iso);

  return `${monthNames[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function yearLabel(iso: string) {
  return String(parseIsoDate(iso).getUTCFullYear());
}

function weekLabel(days: readonly CalendarDayViewModel[]) {
  const first = days[0];
  const last = days[days.length - 1];

  if (!first || !last) {
    return "Selected week";
  }

  const end = parseIsoDate(last.date);

  return `${first.dayNumber}-${last.dayNumber} ${monthNames[end.getUTCMonth()]} ${end.getUTCFullYear()}`;
}

function weekRangeLabel(iso: string) {
  const selected = parseIsoDate(iso);
  const start = new Date(selected);
  const weekday = start.getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  start.setUTCDate(start.getUTCDate() + mondayOffset);

  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);

  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const startLabel = sameMonth
    ? String(start.getUTCDate()).padStart(2, "0")
    : `${String(start.getUTCDate()).padStart(2, "0")} ${monthNames[start.getUTCMonth()]}`;
  const endLabel = `${String(end.getUTCDate()).padStart(2, "0")} ${monthNames[end.getUTCMonth()]}${sameYear ? "" : ` ${end.getUTCFullYear()}`}`;

  return `${startLabel}-${endLabel} ${end.getUTCFullYear()}`;
}

function isIsoDate(value: string | null) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function isCalendarView(value: string | null): value is CalendarView {
  return value === "day" || value === "week" || value === "month" || value === "year";
}

function calendarDayForDate(date: string, today: string): CalendarDayViewModel {
  const parsed = parseIsoDate(date);

  return {
    date,
    dayNumber: String(parsed.getUTCDate()).padStart(2, "0"),
    fullLabel: dateLabel(date),
    id: `day-${date}`,
    isToday: date === today,
    weekday: weekdayNames[parsed.getUTCDay()] ?? "Day",
  };
}

function calendarDaysForWeek(selectedDate: string, today: string) {
  const selected = parseIsoDate(selectedDate);
  const weekday = selected.getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  selected.setUTCDate(selected.getUTCDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(selected);
    date.setUTCDate(selected.getUTCDate() + index);
    return calendarDayForDate(formatIsoDate(date), today);
  });
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
}

function minutesToTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function offsetTime(time: string, offset: number) {
  return minutesToTime(timeToMinutes(time) + offset);
}

function pointerConflictForProposal(
  proposal: PointerSchedulingProposal,
  timedBlocks: readonly CalendarTimedBlockViewModel[],
) {
  const conflict = findVisibleSchedulingConflict(proposal, timedBlocks);

  if (!conflict) return null;

  return {
    ...proposal,
    conflictTimeLabel: conflict.timeLabel,
    conflictTitle: conflict.title,
  } satisfies PointerConflictProposal;
}

function PointerSchedulingStatus({
  conflict,
  onCancel,
  onConfirm,
  pending,
  result,
}: Readonly<{
  conflict: PointerConflictProposal | null;
  onCancel: () => void;
  onConfirm: () => void;
  pending: boolean;
  result: { message: string; status: "blocked" | "error" | "success" } | null;
}>) {
  if (!conflict && !result) return null;

  return (
    <section
      aria-live="polite"
      className="relative z-20 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.94)] px-3 py-2 shadow-[0_8px_18px_rgba(0,0,0,.16)]"
      data-calendar-section="pointer-scheduling-status"
    >
      {conflict ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-[var(--text-secondary)]">
              Sichtbarer Konflikt mit {conflict.conflictTitle} um{" "}
              {conflict.conflictTimeLabel}.
            </p>
            <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-muted)]">
              Der Pointer-Drop ist angehalten. Bestätige bewusst den bestehenden
              kanonischen Task-Zeitpfad; geprüft werden nur geladene Blöcke.
            </p>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button
              className="min-h-8 rounded-full border border-[var(--border-subtle)] bg-[rgba(18,28,43,.72)] px-3 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
              onClick={onCancel}
              type="button"
            >
              Abbrechen
            </button>
            <button
              className="min-h-8 rounded-full border border-[rgba(221,107,95,.34)] bg-[rgba(221,107,95,.12)] px-3 text-[10px] font-semibold text-[var(--text-primary)] transition hover:border-[rgba(221,107,95,.52)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={pending}
              onClick={onConfirm}
              type="button"
            >
              {pending ? "Speichern …" : "Trotzdem terminieren"}
            </button>
          </div>
        </div>
      ) : null}
      {result ? (
        <p
          className="text-[10px] leading-4 text-[var(--text-secondary)]"
          role={result.status === "success" ? "status" : "alert"}
        >
          {result.message}
        </p>
      ) : null}
    </section>
  );
}

function hourToTop(hour: string) {
  const range = CALENDAR_DAY_END_MINUTES - CALENDAR_DAY_START_MINUTES;
  const offset = timeToMinutes(hour) - CALENDAR_DAY_START_MINUTES;

  return Math.max(0, Math.min(100, (offset / range) * 100));
}

function scopeMatches(
  block:
    | CalendarAllDayBlockViewModel
    | CalendarTimedBlockViewModel
    | CalendarRawTimedBlock,
  scope: CalendarScope,
) {
  if (scope === "All") return true;
  if (scope === "Events") return block.type === "event";
  if (scope === "Tasks")
    return block.type === "task_block" || block.source === "task";
  if (scope === "Focus")
    return block.type === "focus_block" || block.type === "batch_block";
  if (scope === "Routines") return block.type === "routine";
  if (scope === "Projects") return block.source === "project";
  if (scope === "Meals") return block.type === "meal";
  if (scope === "Health")
    return block.source === "health" || block.type === "workout";
  if (scope === "Reviews")
    return block.type === "review" || block.source === "review";
  return block.type === "deadline" || block.type === "reminder";
}

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
  activeView,
  viewModel,
  contentState,
  profileId,
}: Readonly<{
  activeView: CalendarView;
  viewModel: CalendarViewModel;
  contentState: ContentStateMeta;
  profileId: CalendarViewModel["profileId"];
}>) {
  return (
    <section
      aria-labelledby="calendar-week-overview-heading"
      data-calendar-section="week-overview"
      {...contentStateAttributes(contentState, profileId)}
      className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.68)] px-3 py-2"
    >
      <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(580px,auto)] xl:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              className="text-[15px] font-semibold text-[var(--text-primary)]"
              id="calendar-week-overview-heading"
            >
              {activeView === "week"
                ? "Week View"
                : `${activeView[0].toUpperCase()}${activeView.slice(1)} View`}
            </h2>
            <Pill accent="var(--accent-cyan)">planning surface</Pill>
          </div>
          <p className="mt-1 max-w-3xl text-[10px] leading-4 text-[var(--text-muted)]">
            {viewModel.weekStats.summary}
          </p>
        </div>
        <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-5">
          {viewModel.weekStats.stats.map((stat, index) => (
            <WeekStatCard key={`calendar-week-stat-${index}`} stat={stat} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CalendarEmptyPageHeader({
  header,
  onMovePeriod,
  onToday,
  onViewChange,
}: Readonly<{
  header: CalendarViewModel["header"];
  onMovePeriod: (direction: -1 | 1) => void;
  onToday: () => void;
  onViewChange: (view: CalendarView) => void;
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
            <button
              className="rounded-full border border-[var(--border-subtle)] bg-[rgba(18,28,43,.82)] px-3 py-1 text-[10px] font-semibold text-[var(--text-primary)] transition hover:border-[var(--border-default)] hover:bg-[rgba(23,34,53,.82)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
              onClick={onToday}
              type="button"
            >
              {header.controls.currentAction}
            </button>
            <button
              aria-label="Previous week"
              className="size-6 rounded-full border border-[var(--border-subtle)] bg-[rgba(18,28,43,.74)] text-[12px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
              onClick={() => onMovePeriod(-1)}
              type="button"
            >
              {"<"}
            </button>
            <button
              aria-label="Next week"
              className="size-6 rounded-full border border-[var(--border-subtle)] bg-[rgba(18,28,43,.74)] text-[12px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
              onClick={() => onMovePeriod(1)}
              type="button"
            >
              {">"}
            </button>
          </div>

          <div className="flex w-full min-w-0 flex-wrap rounded-full border border-[var(--border-subtle)] bg-[rgba(11,17,28,.72)] p-1 xl:w-[476px]">
            {header.controls.views.map((view, index) => (
              <button
                aria-pressed={view.active ? "true" : "false"}
                className={cn(
                  "min-h-6 flex-1 rounded-full px-3 text-[10px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
                  view.active
                    ? "border border-[rgba(95,200,215,.28)] bg-[rgba(95,200,215,.16)] text-[var(--text-primary)]"
                    : "border border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                )}
                key={`calendar-empty-view-${index}`}
                onClick={() =>
                  onViewChange(view.label.toLowerCase() as CalendarView)
                }
                type="button"
              >
                {view.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

function CalendarSourceContract({
  viewModel,
  contentState,
  profileId,
}: Readonly<{
  viewModel: CalendarViewModel;
  contentState: ContentStateMeta;
  profileId: CalendarViewModel["profileId"];
}>) {
  return (
    <section
      aria-label="Calendar source of truth contract"
      data-calendar-section="calendar-source-contract"
      {...contentStateAttributes(contentState, profileId)}
      className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.36)] px-3 py-2"
    >
      <div className="flex flex-col gap-2 text-[10px] leading-4 text-[var(--text-muted)] xl:flex-row xl:items-center xl:justify-between">
        <p>
          <span className="font-semibold text-[var(--text-secondary)]">
            Page Type:
          </span>{" "}
          {viewModel.pageContract.pageType}
        </p>
        <p className="max-w-4xl">{viewModel.pageContract.canonicalSource}</p>
      </div>
    </section>
  );
}

function EmptyCalendarState({
  title = emptyCalendarStateContent.title,
  description = emptyCalendarStateContent.description,
}: Readonly<{
  description?: string;
  title?: string;
}>) {
  return (
    <div className="rounded-[12px] border border-dashed border-[var(--border-default)] bg-[rgba(168,183,204,.05)] px-4 py-5 text-center">
      <p className="text-[13px] font-semibold text-[var(--text-secondary)]">
        {title}
      </p>
      <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
        {description}
      </p>
    </div>
  );
}

function CalendarEmptyRightPanel({
  planningQueueContentState,
  profileId,
  selectedDay,
  tasks,
}: Readonly<{
  planningQueueContentState: ContentStateMeta;
  profileId: CalendarViewModel["profileId"];
  selectedDay?: CalendarDayViewModel;
  tasks: readonly CalendarViewModel["schedulableTasks"][number][];
}>) {
  const visibleTasks = tasks.slice(0, 4);

  return (
    <aside
      aria-labelledby="calendar-right-panel-heading"
      className="overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.86)] shadow-[0_8px_22px_rgba(0,0,0,.12)] xl:flex xl:min-h-0 xl:flex-col"
    >
      <div className="border-b border-[var(--border-subtle)] bg-[rgba(18,28,43,.54)] px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-cyan)]">
              Calendar Inspector
            </p>
            <h2
              className="mt-0.5 text-[18px] font-semibold leading-6 text-[var(--text-primary)]"
              id="calendar-right-panel-heading"
            >
              Kein Zeitblock ausgewählt
            </h2>
          </div>
          <Pill accent="var(--accent-cyan)">bereit</Pill>
        </div>
      </div>

      <div className="grid gap-2 p-2.5 xl:min-h-0 xl:flex-1 xl:content-start xl:overflow-y-auto">
        <section
          aria-labelledby="calendar-empty-context-heading"
          className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.46)] p-3"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
            Day context
          </p>
          <h3
            className="mt-1 text-[15px] font-semibold leading-5 text-[var(--text-primary)]"
            id="calendar-empty-context-heading"
          >
            {selectedDay?.fullLabel ?? "Kein spezifischer Tag ausgewählt"}
          </h3>
          <p className="mt-2 text-[11px] leading-4 text-[var(--text-muted)]">
            Wähle einen Zeitblock oder plane eine Aufgabe mit Uhrzeit.
          </p>
        </section>

        <section
          aria-labelledby="calendar-empty-time-settings-heading"
          className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.42)] p-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3
                className="text-[13px] font-semibold text-[var(--text-primary)]"
                id="calendar-empty-time-settings-heading"
              >
                Time Settings
              </h3>
              <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-muted)]">
                Keine Zeitdaten vorhanden. Aktionen werden aktiv, sobald ein
                echter Zeitblock ausgewählt ist.
              </p>
            </div>
            <Pill quiet>—</Pill>
          </div>
          <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {[
              "Save time",
              "Cancel",
              "Move later",
              "Duplicate",
              "Mark done",
            ].map((label) => (
              <button
                className="min-h-8 rounded-full border border-[var(--border-subtle)] bg-[rgba(18,28,43,.72)] px-3 text-[10px] font-semibold text-[var(--text-secondary)] opacity-50"
                disabled
                key={`calendar-empty-action-${label}`}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="calendar-empty-planning-queue-heading"
          className="rounded-[12px] border border-[rgba(148,163,184,.10)] bg-[rgba(11,17,28,.34)] p-3"
          data-calendar-section="planning-queue"
          {...contentStateAttributes(planningQueueContentState, profileId)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3
                className="text-[13px] font-semibold text-[var(--text-primary)]"
                id="calendar-empty-planning-queue-heading"
              >
                Calendar Planner Queue
              </h3>
              <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-muted)]">
                Geplante Tasks ohne Uhrzeit. Terminieren schreibt
                Task-Zeitfelder im Manual-Profil.
              </p>
            </div>
            <Pill quiet>{visibleTasks.length}</Pill>
          </div>
          <p className="mt-2 text-[10px] leading-4 text-[var(--text-faint)]">
            Open Loops und Reviews sind hier vorbereitet und nicht mit der
            lokalen Datenquelle verbunden.
          </p>
          {visibleTasks.length > 0 ? (
            <div className="mt-3 grid gap-1.5">
              {visibleTasks.map((task) => (
                <article
                  className="rounded-[10px] border border-[color-mix(in_srgb,var(--accent)_24%,transparent)] bg-[rgba(18,28,43,.44)] p-2"
                  key={task.id}
                  style={accentStyle(task.accent ?? "var(--accent-blue)")}
                >
                  <div className="grid min-h-8 grid-cols-[8px_minmax(0,1fr)] gap-2">
                    <span
                      aria-hidden="true"
                      className="mt-1.5 size-1.5 rounded-full bg-[var(--accent)]"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-medium text-[var(--text-secondary)]">
                        {task.title}
                      </p>
                      <p className="truncate text-[10px] leading-4 text-[var(--text-muted)]">
                        {task.rankingReason} · {task.priority} ·{" "}
                        {durationLabel(task.durationMinutes)}
                      </p>
                      <p className="truncate text-[10px] leading-4 text-[var(--text-muted)]">
                        {task.project?.title ?? "No project"}
                      </p>
                      {task.isRecurringOccurrence ? (
                        <Pill accent="var(--accent-cyan)">Wiederkehrend</Pill>
                      ) : null}
                    </div>
                  </div>

                  {profileId === "manual" ? (
                    <form
                      action={scheduleTaskForTodayFormAction}
                      aria-label={`${task.title} terminieren`}
                      className="mt-2 grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_76px_auto]"
                    >
                      <input name="taskId" type="hidden" value={task.id} />
                      <input name="mode" type="hidden" value="schedule" />
                      <input
                        name="plannedDate"
                        type="hidden"
                        value={task.plannedDate ?? selectedDay?.date ?? ""}
                      />
                      <label className="min-w-0">
                        <span className="sr-only">Uhrzeit</span>
                        <input
                          className={queueInputClass}
                          defaultValue="09:00"
                          name="scheduledTime"
                          type="time"
                        />
                      </label>
                      <label className="min-w-0">
                        <span className="sr-only">Dauer</span>
                        <select
                          className={queueInputClass}
                          defaultValue={String(task.durationMinutes)}
                          name="durationMinutes"
                        >
                          {scheduleDurationOptions(task.durationMinutes).map(
                            (minutes) => (
                              <option key={minutes} value={minutes}>
                                {durationLabel(minutes)}
                              </option>
                            ),
                          )}
                        </select>
                      </label>
                      <button
                        className="mt-1 min-h-8 rounded-full border border-[rgba(95,200,215,.34)] bg-[rgba(95,200,215,.14)] px-3 text-[10px] font-semibold text-[var(--text-primary)] transition hover:border-[rgba(95,200,215,.48)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                        type="submit"
                      >
                        Terminieren
                      </button>
                    </form>
                  ) : (
                    <p className="mt-2 text-[10px] leading-4 text-[var(--text-muted)]">
                      Demo-/Empty-Fixture. Persistente Terminierung ist nur im
                      Manual-Profil aktiv.
                    </p>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-3 rounded-[10px] border border-dashed border-[var(--border-subtle)] bg-[rgba(168,183,204,.035)] px-3 py-4">
              <p className="text-[12px] font-semibold leading-4 text-[var(--text-primary)]">
                Keine geplanten Tasks ohne Uhrzeit.
              </p>
              <p className="mt-1 text-[10px] leading-4 text-[var(--text-secondary)]">
                Tasks erscheinen hier erst nach Tagesplanung und vor der
                Terminierung.
              </p>
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}

function CalendarDaySurface({
  allDayBlocks,
  day,
  hours,
  onSelectBlock,
  onSelectSlot,
  selectedBlockId,
  timedBlocks,
  contentState,
  contentStateProfileId,
}: Readonly<{
  allDayBlocks: readonly CalendarAllDayBlockViewModel[];
  day: CalendarDayViewModel;
  hours: readonly string[];
  onSelectBlock: (blockId: string) => void;
  onSelectSlot: (slot: CalendarSelectedTimeSlotViewModel) => void;
  selectedBlockId?: string;
  timedBlocks: readonly CalendarTimedBlockViewModel[];
  contentState: ContentStateMeta;
  contentStateProfileId: CalendarViewModel["profileId"];
}>) {
  const dayTimedBlocks = timedBlocks.filter((block) => block.dayId === day.id);
  const dayAllDayBlocks = allDayBlocks.filter(
    (block) => block.dayId === day.id,
  );
  const hasBlocks = dayTimedBlocks.length > 0 || dayAllDayBlocks.length > 0;

  return (
    <section
      aria-labelledby="calendar-day-surface-heading"
      data-calendar-section="day-surface"
      {...contentStateAttributes(contentState, contentStateProfileId)}
      className="min-w-0 overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.74)] shadow-[0_8px_22px_rgba(0,0,0,.12)] xl:flex xl:min-h-0 xl:flex-col"
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[rgba(14,23,38,.76)] px-3 py-2">
        <div>
          <h2
            className="text-[14px] font-semibold text-[var(--text-primary)]"
            id="calendar-day-surface-heading"
          >
            Day timeline
          </h2>
          <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-muted)]">
            {day.fullLabel}
          </p>
        </div>
        <Pill accent="var(--accent-cyan)">single day</Pill>
      </div>

      <div className="grid gap-2 p-2 xl:min-h-0 xl:flex-1 xl:grid-rows-[auto_minmax(0,1fr)]">
        <div className="grid gap-1.5 sm:grid-cols-2">
          {dayAllDayBlocks.map((block) => (
            <CalendarAllDayBlock
              block={block}
              key={block.id}
              onSelect={onSelectBlock}
              selected={block.id === selectedBlockId}
            />
          ))}
        </div>
        <div className="relative min-h-[620px] overflow-hidden rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.32)]">
          {hours.map((hour) => (
            <button
              aria-label={`Select free slot on ${day.fullLabel} at ${hour}`}
              className="absolute left-0 right-0 h-8 -translate-y-1/2 border-0 bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--focus-ring)]"
              key={hour}
              onClick={() =>
                onSelectSlot({
                  dayId: day.id,
                  dayLabel: dayLabel(day.date),
                  date: day.date,
                  startTime: hour,
                  endTime: offsetTime(hour, 60),
                  label: "Selected time slot",
                })
              }
              style={{ top: `${hourToTop(hour)}%` }}
              type="button"
            >
              <span
                aria-hidden="true"
                className="absolute left-16 right-0 top-1/2 h-px bg-[rgba(148,163,184,.08)]"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] text-[var(--text-faint)]">
                {hour}
              </span>
            </button>
          ))}
          {dayTimedBlocks.map((block) => (
            <CalendarTimedBlock
              block={block}
              key={block.id}
              onSelect={onSelectBlock}
              selected={block.id === selectedBlockId}
            />
          ))}
          {!hasBlocks ? <EmptyCalendarState /> : null}
        </div>
      </div>
    </section>
  );
}

function CalendarMonthSurface({
  allDayBlocks,
  currentDate,
  onSelectBlock,
  onSelectDay,
  selectedBlockId,
  timedBlocks,
}: Readonly<{
  allDayBlocks: readonly CalendarAllDayBlockViewModel[];
  currentDate: string;
  onSelectBlock: (blockId: string) => void;
  onSelectDay: (date: string) => void;
  selectedBlockId?: string;
  timedBlocks: readonly CalendarTimedBlockViewModel[];
}>) {
  const start = parseIsoDate(startOfMonth(currentDate));
  const gridStart = new Date(start);
  gridStart.setUTCDate(1 - gridStart.getUTCDay());

  const cells: DateParts[] = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setUTCDate(gridStart.getUTCDate() + index);

    return {
      date,
      iso: formatIsoDate(date),
    };
  });
  const currentMonth = parseIsoDate(currentDate).getUTCMonth();
  const blocks = [...timedBlocks, ...allDayBlocks];
  const hasBlocks = blocks.length > 0;

  return (
    <section
      aria-labelledby="calendar-month-surface-heading"
      data-calendar-section="month-surface"
      className="overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.74)] shadow-[0_8px_22px_rgba(0,0,0,.12)]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[rgba(14,23,38,.76)] px-3 py-2">
        <div>
          <h2
            className="text-[14px] font-semibold text-[var(--text-primary)]"
            id="calendar-month-surface-heading"
          >
            Month grid
          </h2>
          <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-muted)]">
            Canonical scheduled work stays distinct from Task deadlines,
            Project due dates and Goal targets.
          </p>
        </div>
        <Pill accent="var(--accent-cyan)">{monthLabel(currentDate)}</Pill>
      </div>
      <div className="grid grid-cols-7 border-b border-[var(--border-subtle)]">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            className="border-r border-[var(--border-subtle)] px-2 py-1.5 text-center text-[10px] font-semibold text-[var(--text-muted)] last:border-r-0"
            key={day}
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((cell) => {
          const dayBlocks = blocks.filter((block) => block.date === cell.iso);
          const muted = cell.date.getUTCMonth() !== currentMonth;
          const isToday = cell.iso === MOCK_TODAY;

          return (
            <div
              className={cn(
                "min-h-[112px] border-r border-t border-[var(--border-subtle)] p-1.5 last:border-r-0 xl:min-h-[128px] 2xl:min-h-[144px]",
                muted && "bg-[rgba(11,17,28,.34)] opacity-60",
                isToday && "bg-[rgba(95,200,215,.055)]",
              )}
              data-calendar-month-day={cell.iso}
              key={cell.iso}
            >
              <button
                aria-label={`Open day ${dateLabel(cell.iso)}`}
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:bg-[rgba(168,183,204,.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                onClick={() => onSelectDay(cell.iso)}
                type="button"
              >
                {cell.date.getUTCDate()}
              </button>
              <div className="mt-1 grid gap-1">
                {dayBlocks.slice(0, 3).map((block) => (
                  <a
                    aria-label={`${block.markerLabel ?? calendarBlockTypeLabels[block.type]}: ${block.title}`}
                    className={cn(
                      "block truncate rounded-[7px] border bg-[color-mix(in_srgb,var(--accent)_10%,rgba(18,28,43,.82))] px-1.5 py-1 text-left text-[9px] font-semibold text-[var(--text-secondary)] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
                      selectedBlockId === block.id
                        ? "border-[color-mix(in_srgb,var(--accent)_54%,transparent)]"
                        : "border-[color-mix(in_srgb,var(--accent)_20%,transparent)] hover:border-[color-mix(in_srgb,var(--accent)_38%,transparent)]",
                      block.isOverdue && "border-[rgba(217,146,79,.42)] text-[var(--accent-orange)]",
                    )}
                    data-calendar-marker-kind={
                      block.markerKind ?? "scheduled_task"
                    }
                    href={block.sourceEntity.href ?? "/calendar"}
                    key={block.id}
                    onClick={() => onSelectBlock(block.id)}
                    style={accentStyle(block.accent)}
                    title={block.title}
                  >
                    <span className="sr-only">
                      {block.markerLabel ?? calendarBlockTypeLabels[block.type]}:
                    </span>
                    {block.title}
                  </a>
                ))}
                {dayBlocks.length > 3 ? (
                  <span className="text-[9px] font-semibold text-[var(--text-faint)]">
                    +{dayBlocks.length - 3} more
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {!hasBlocks ? <EmptyCalendarState /> : null}
    </section>
  );
}

function CalendarYearSurface({
  allDayBlocks,
  currentDate,
  onSelectBlock,
  onSelectMonth,
  selectedBlockId,
  timedBlocks,
}: Readonly<{
  allDayBlocks: readonly CalendarAllDayBlockViewModel[];
  currentDate: string;
  onSelectBlock: (blockId: string) => void;
  onSelectMonth: (month: number) => void;
  selectedBlockId?: string;
  timedBlocks: readonly CalendarTimedBlockViewModel[];
}>) {
  const year = parseIsoDate(currentDate).getUTCFullYear();
  const blocks = [...timedBlocks, ...allDayBlocks].filter((block) =>
    (block.date ?? "").startsWith(`${year}-`),
  );

  return (
    <section
      aria-labelledby="calendar-year-surface-heading"
      className="overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.74)] shadow-[0_8px_22px_rgba(0,0,0,.12)]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[rgba(14,23,38,.76)] px-3 py-2">
        <div>
          <h2
            className="text-[14px] font-semibold text-[var(--text-primary)]"
            id="calendar-year-surface-heading"
          >
            Year roadmap
          </h2>
          <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-muted)]">
            Vorbereitete Übersicht mit Deadlines, Reviews und Projektmarkern.
          </p>
        </div>
        <Pill accent="var(--accent-cyan)">{year}</Pill>
      </div>
      <div className="grid gap-2 p-2 sm:grid-cols-2 xl:grid-cols-3">
        {monthNames.map((month, index) => {
          const monthNumber = String(index + 1).padStart(2, "0");
          const monthBlocks = blocks.filter((block) =>
            (block.date ?? "").startsWith(`${year}-${monthNumber}`),
          );

          return (
            <section
              aria-labelledby={`calendar-year-${month.toLowerCase()}-heading`}
              className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.38)] p-3"
              key={month}
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  className="text-[13px] font-semibold text-[var(--text-primary)] transition hover:text-[var(--accent-cyan)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                  id={`calendar-year-${month.toLowerCase()}-heading`}
                  onClick={() => onSelectMonth(index)}
                  type="button"
                >
                  {month}
                </button>
                <Pill quiet>{monthBlocks.length}</Pill>
              </div>
              <div className="mt-2 grid gap-1.5">
                {monthBlocks.slice(0, 3).map((block) => (
                  <button
                    aria-pressed={selectedBlockId === block.id}
                    className={cn(
                      "grid min-h-8 grid-cols-[8px_minmax(0,1fr)] gap-2 rounded-[8px] border bg-[rgba(18,28,43,.44)] px-2 py-1.5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
                      selectedBlockId === block.id
                        ? "border-[color-mix(in_srgb,var(--accent)_54%,transparent)]"
                        : "border-[var(--border-subtle)] hover:border-[var(--border-default)]",
                    )}
                    key={block.id}
                    onClick={() => onSelectBlock(block.id)}
                    style={accentStyle(block.accent)}
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-1.5 size-1.5 rounded-full bg-[var(--accent)]"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-[10px] font-semibold text-[var(--text-secondary)]">
                        {block.title}
                      </span>
                      <span className="block truncate text-[9px] text-[var(--text-muted)]">
                        {calendarBlockTypeLabels[block.type]} ·{" "}
                        {calendarBlockStatusLabels[block.status]}
                      </span>
                    </span>
                  </button>
                ))}
                {monthBlocks.length === 0 ? (
                  <p className="text-[10px] leading-4 text-[var(--text-faint)]">
                    No markers.
                  </p>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}

export function CalendarPlanningPage({
  viewModel,
}: Readonly<{
  viewModel: CalendarViewModel;
}>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeDate = searchParams.get("date");
  const routeView = searchParams.get("view");
  const initialDate =
    (isIsoDate(routeDate) ? routeDate : null) ||
    viewModel.days.find((day) => day.isToday)?.date ||
    viewModel.days[0]?.date ||
    MOCK_TODAY;
  const initialView = isCalendarView(routeView)
    ? routeView
    : "week";
  const [activeView, setActiveView] = useState<CalendarView>(initialView);
  const [activeScope, setActiveScope] = useState<CalendarScope>("All");
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [rawTimedBlocks, setRawTimedBlocks] = useState<CalendarRawTimedBlock[]>(
    () => viewModel.timedBlocks.map(stripTimedBlock),
  );
  const [allDayBlocks, setAllDayBlocks] = useState<
    CalendarAllDayBlockViewModel[]
  >(() => viewModel.allDayBlocks);
  const [selection, setSelection] = useState<Selection>(() =>
    viewModel.selectedBlock
      ? {
          kind: "block",
          blockId: viewModel.selectedBlock.id,
        }
      : {
          kind: "day",
          dayId: viewModel.days[0]?.id ?? "calendar-day",
        },
  );
  const [activePointerDrag, setActivePointerDrag] =
    useState<PointerDragState | null>(null);
  const [pointerConflict, setPointerConflict] =
    useState<PointerConflictProposal | null>(null);
  const [pointerResult, setPointerResult] = useState<{
    message: string;
    status: "blocked" | "error" | "success";
  } | null>(null);
  const [pointerPending, startPointerTransition] = useTransition();

  const calendarDays = useMemo(
    () =>
      viewModel.profileId === "manual"
        ? calendarDaysForWeek(currentDate, MOCK_TODAY)
        : viewModel.days,
    [currentDate, viewModel.days, viewModel.profileId],
  );
  const dateByDayId = useMemo(
    () => new Map(calendarDays.map((day) => [day.id, day.date])),
    [calendarDays],
  );
  const dayIdByDate = useMemo(
    () => new Map(calendarDays.map((day) => [day.date, day.id])),
    [calendarDays],
  );

  function resolveDayId(date: string) {
    return dayIdByDate.get(date) ?? date;
  }

  const timedBlocks = useMemo(
    () =>
      buildCalendarTimedBlocks(
        rawTimedBlocks.map((block) => ({
          ...block,
          date: block.date ?? dateByDayId.get(block.dayId),
        })),
        calendarDays,
      ),
    [calendarDays, dateByDayId, rawTimedBlocks],
  );

  const filteredTimedBlocks = timedBlocks.filter((block) =>
    scopeMatches(block, activeScope),
  );
  const filteredAllDayBlocks = allDayBlocks
    .map((block) => ({
      ...block,
      date: block.date ?? dateByDayId.get(block.dayId),
    }))
    .filter((block) => scopeMatches(block, activeScope));

  const selectedBlock =
    [...filteredTimedBlocks, ...filteredAllDayBlocks].find(
      (block) => selection.kind === "block" && block.id === selection.blockId,
    ) ??
    [...timedBlocks, ...allDayBlocks].find(
      (block) => selection.kind === "block" && block.id === selection.blockId,
    );

  const selectedSlot = selection.kind === "slot" ? selection.slot : null;
  const selectedQueueTask =
    selection.kind === "queue"
      ? viewModel.schedulableTasks.find((task) => task.id === selection.taskId)
      : undefined;
  const selectedDay =
    selection.kind === "day"
      ? calendarDays.find((day) => day.id === selection.dayId)
      : selectedSlot
        ? calendarDays.find((day) => day.id === selectedSlot.dayId)
        : selectedBlock
          ? calendarDays.find((day) => day.id === selectedBlock.dayId)
          : calendarDays.find((day) => day.date === currentDate);

  const activeDay =
    calendarDays.find((day) => day.date === currentDate) ??
    selectedDay ??
    calendarDayForDate(currentDate, MOCK_TODAY);

  const dynamicHeader = {
    ...viewModel.header,
    dateRange:
      activeView === "day"
        ? dateLabel(currentDate)
        : activeView === "month"
          ? monthLabel(currentDate)
          : activeView === "year"
            ? yearLabel(currentDate)
            : currentDate === MOCK_TODAY
              ? weekLabel(calendarDays)
              : weekRangeLabel(currentDate),
    controls: {
      ...viewModel.header.controls,
      views: viewModel.header.controls.views.map((view) => ({
        ...view,
        active: view.label.toLowerCase() === activeView,
      })),
    },
  };

  const dynamicViewModel = {
    ...viewModel,
    header: dynamicHeader,
    filters: viewModel.filters.map((filter) => ({
      ...filter,
      active: filter.label === activeScope,
    })),
    days: calendarDays,
    allDayBlocks: filteredAllDayBlocks,
    timedBlocks: filteredTimedBlocks,
    selectedBlock: selectedBlock ?? viewModel.selectedBlock,
    schedulableTasks: viewModel.schedulableTasks,
  };

  function updateCalendarRoute(next: { date: string; view: CalendarView }) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", next.date);
    params.set("view", next.view);
    router.replace(`/calendar?${params.toString()}`);
  }

  function setCalendarDate(nextDate: string, nextView = activeView) {
    setCurrentDate(nextDate);
    setSelection({ kind: "day", dayId: `day-${nextDate}` });
    updateCalendarRoute({ date: nextDate, view: nextView });
  }

  function setCalendarView(nextView: CalendarView) {
    setActiveView(nextView);
    updateCalendarRoute({ date: currentDate, view: nextView });
  }

  function movePeriod(direction: -1 | 1) {
    let nextDate = addYears(currentDate, direction);

    if (activeView === "day") {
      nextDate = addDays(currentDate, direction);
    } else if (activeView === "week") {
      nextDate = addDays(currentDate, direction * 7);
    } else if (activeView === "month") {
      nextDate = addMonths(currentDate, direction);
    }

    setCalendarDate(nextDate);
  }

  function selectBlock(blockId: string) {
    setSelection({ kind: "block", blockId });
  }

  function runPointerScheduling(proposal: PointerSchedulingProposal) {
    setPointerConflict(null);
    setPointerResult(null);
    startPointerTransition(async () => {
      const formData = new FormData();
      formData.set("taskId", proposal.taskId);
      formData.set("plannedDate", proposal.plannedDate);
      formData.set("scheduledTime", proposal.scheduledTime);
      formData.set("durationMinutes", String(proposal.durationMinutes));
      if (proposal.kind === "schedule") formData.set("mode", "schedule");
      const result =
        proposal.kind === "schedule"
          ? await scheduleTaskForTodayAction(formData)
          : await rescheduleTaskAction(formData);

      setPointerResult(result);
      if (result.status === "success") router.refresh();
    });
  }

  function requestPointerScheduling(proposal: PointerSchedulingProposal) {
    const conflict = pointerConflictForProposal(proposal, timedBlocks);
    if (conflict) {
      setPointerConflict(conflict);
      setPointerResult(null);
      return;
    }

    runPointerScheduling(proposal);
  }

  function beginQueuePointer(
    task: CalendarViewModel["schedulableTasks"][number],
    pointer: { clientX: number; clientY: number; pointerId: number },
  ) {
    setPointerResult(null);
    setSelection({ kind: "queue", taskId: task.id });
    setActivePointerDrag({
      durationMinutes: task.durationMinutes,
      kind: "queue",
      pointerId: pointer.pointerId,
      startX: pointer.clientX,
      startY: pointer.clientY,
      taskId: task.id,
    });
  }

  function beginBlockPointer(
    block: CalendarTimedBlockViewModel,
    pointer: { clientX: number; clientY: number; pointerId: number },
  ) {
    if (!block.taskId) return;
    setPointerResult(null);
    setSelection({ kind: "block", blockId: block.id });
    setActivePointerDrag({
      durationMinutes: block.durationMinutes,
      kind: "block",
      pointerId: pointer.pointerId,
      startX: pointer.clientX,
      startY: pointer.clientY,
      taskId: block.taskId,
    });
  }

  function endPointerDrag() {
    setActivePointerDrag(null);
  }

  function dropPointerTask({
    drag,
    slot,
  }: {
    drag: PointerDragState;
    slot: { date: string; dayId: string; startTime: string };
  }) {
    setActivePointerDrag(null);
    requestPointerScheduling({
      durationMinutes: drag.durationMinutes,
      kind: drag.kind === "queue" ? "schedule" : "reschedule",
      plannedDate: slot.date,
      scheduledTime: slot.startTime,
      taskId: drag.taskId,
    });
  }

  function resizePointerTask(
    block: CalendarTimedBlockViewModel,
    durationMinutes: number,
  ) {
    if (!block.taskId) return;
    requestPointerScheduling({
      durationMinutes,
      kind: "reschedule",
      plannedDate: block.date ?? dateByDayId.get(block.dayId) ?? "",
      scheduledTime: block.startTime,
      taskId: block.taskId,
    });
  }

  function createBlock(block: CalendarRawTimedBlock) {
    setRawTimedBlocks((blocks) => [...blocks, block]);
    setSelection({ kind: "block", blockId: block.id });
  }

  function saveTime(
    blockId: string,
    date: string,
    startTime: string,
    endTime: string,
  ) {
    const nextDayId = resolveDayId(date);

    setRawTimedBlocks((blocks) =>
      blocks.map((block) =>
        block.id === blockId
          ? {
              ...block,
              date,
              dayId: nextDayId,
              startTime,
              endTime,
              startMinutes: timeToMinutes(startTime),
              endMinutes: timeToMinutes(endTime),
            }
          : block,
      ),
    );
    setAllDayBlocks((blocks) =>
      blocks.map((block) =>
        block.id === blockId
          ? {
              ...block,
              date,
              dayId: nextDayId,
              timeLabel: `${startTime}-${endTime}`,
            }
          : block,
      ),
    );
  }

  function moveLater(blockId: string) {
    setRawTimedBlocks((blocks) =>
      blocks.map((block) =>
        block.id === blockId
          ? {
              ...block,
              startTime: offsetTime(block.startTime, 30),
              endTime: offsetTime(block.endTime, 30),
              startMinutes: block.startMinutes + 30,
              endMinutes: block.endMinutes + 30,
              status: "moved" as CalendarBlockStatus,
            }
          : block,
      ),
    );
  }

  function duplicateBlock(blockId: string) {
    const timedBlock = rawTimedBlocks.find((block) => block.id === blockId);

    if (timedBlock) {
      const duplicate = {
        ...timedBlock,
        id: `${timedBlock.id}-copy-${Date.now()}`,
        title: `${timedBlock.title} copy`,
        startTime: offsetTime(timedBlock.startTime, 30),
        endTime: offsetTime(timedBlock.endTime, 30),
        startMinutes: timedBlock.startMinutes + 30,
        endMinutes: timedBlock.endMinutes + 30,
        status: "draft" as CalendarBlockStatus,
      };

      setRawTimedBlocks((blocks) => [...blocks, duplicate]);
      setSelection({ kind: "block", blockId: duplicate.id });
      return;
    }

    const allDayBlock = allDayBlocks.find((block) => block.id === blockId);

    if (allDayBlock) {
      const duplicate = {
        ...allDayBlock,
        id: `${allDayBlock.id}-copy-${Date.now()}`,
        title: `${allDayBlock.title} copy`,
        status: "draft" as CalendarBlockStatus,
      };

      setAllDayBlocks((blocks) => [...blocks, duplicate]);
      setSelection({ kind: "block", blockId: duplicate.id });
    }
  }

  function markDone(blockId: string) {
    setRawTimedBlocks((blocks) =>
      blocks.map((block) =>
        block.id === blockId ? { ...block, status: "done" } : block,
      ),
    );
    setAllDayBlocks((blocks) =>
      blocks.map((block) =>
        block.id === blockId ? { ...block, status: "done" } : block,
      ),
    );
  }

  const selectedBlockId =
    selection.kind === "block" ? selection.blockId : undefined;
  const calendarHasBlocks =
    filteredTimedBlocks.length > 0 || filteredAllDayBlocks.length > 0;
  const showEmptyCalendarShell =
    viewModel.profileId !== "demo" &&
    viewModel.profileId !== "manual" &&
    !calendarHasBlocks;
  const showEmptyInspector = showEmptyCalendarShell;

  return (
    <div
      className="mx-auto flex w-full max-w-[2208px] flex-col gap-2 pb-6 xl:h-[calc(100dvh-1.25rem)] xl:min-h-0 xl:pb-0"
      data-calendar-section="page"
      {...contentStateAttributes(
        viewModel.contentStates.page,
        viewModel.profileId,
      )}
    >
      {showEmptyCalendarShell ? (
        <CalendarEmptyPageHeader
          header={dynamicHeader}
          onMovePeriod={movePeriod}
          onToday={() => {
            setCalendarDate(MOCK_TODAY);
          }}
          onViewChange={setCalendarView}
        />
      ) : (
        <CalendarPageHeader
          header={dynamicHeader}
          onCreateBlock={createBlock}
          onMovePeriod={movePeriod}
          onToday={() => {
            setCalendarDate(MOCK_TODAY);
          }}
          onViewChange={setCalendarView}
          resolveDayId={resolveDayId}
          profileId={viewModel.profileId}
          schedulableTasks={viewModel.schedulableTasks}
        />
      )}
      {viewModel.profileId !== "manual" ? (
        <CalendarScopeRow
          filters={dynamicViewModel.filters}
          onScopeChange={setActiveScope}
          projects={viewModel.projectsThisWeek}
        />
      ) : null}
      <CalendarWeekOverview
        activeView={activeView}
        contentState={viewModel.contentStates.weekOverview}
        profileId={viewModel.profileId}
        viewModel={viewModel}
      />

      <div className="grid min-w-0 gap-2 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_minmax(400px,440px)] 2xl:grid-cols-[minmax(0,1fr)_minmax(440px,520px)]">
        <div className="grid min-w-0 gap-2 xl:min-h-0 xl:grid-rows-[minmax(0,1fr)_auto]">
          {activeView === "week" ? (
            <div
              className="min-w-0 xl:min-h-0"
              data-calendar-section="week-grid"
              {...contentStateAttributes(
                viewModel.contentStates.grid,
                viewModel.profileId,
              )}
            >
              <CalendarWeekSurface
                activeDrag={activePointerDrag ?? undefined}
                onBlockPointerStart={beginBlockPointer}
                onDropTask={dropPointerTask}
                onPointerDragEnd={endPointerDrag}
                onSelectBlock={selectBlock}
                onSelectSlot={(slot) => setSelection({ kind: "slot", slot })}
                onResizeTask={resizePointerTask}
                pointerEnabled={
                  viewModel.profileId === "manual" && !pointerPending
                }
                selectedBlockId={selectedBlockId}
                viewModel={{
                  ...dynamicViewModel,
                  allDayBlocks: filteredAllDayBlocks.filter(
                    (block) => block.markerKind !== "planned_task",
                  ),
                }}
              />
            </div>
          ) : null}

          {activeView === "day" ? (
            <CalendarDaySurface
              allDayBlocks={filteredAllDayBlocks}
              contentState={viewModel.contentStates.grid}
              contentStateProfileId={viewModel.profileId}
              day={activeDay}
              hours={viewModel.hours}
              onSelectBlock={selectBlock}
              onSelectSlot={(slot) => setSelection({ kind: "slot", slot })}
              selectedBlockId={selectedBlockId}
              timedBlocks={filteredTimedBlocks}
            />
          ) : null}

          {activeView === "month" ? (
            <CalendarMonthSurface
              allDayBlocks={filteredAllDayBlocks}
              currentDate={currentDate}
              onSelectBlock={selectBlock}
              onSelectDay={(date) => {
                setActiveView("day");
                setCalendarDate(date, "day");
              }}
              selectedBlockId={selectedBlockId}
              timedBlocks={filteredTimedBlocks}
            />
          ) : null}

          {activeView === "year" ? (
            <CalendarYearSurface
              allDayBlocks={filteredAllDayBlocks}
              currentDate={currentDate}
              onSelectBlock={selectBlock}
              onSelectMonth={(month) => {
                const year = parseIsoDate(currentDate).getUTCFullYear();
                const nextDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
                setCalendarDate(nextDate, "month");
                setSelection({ kind: "month", month });
              }}
              selectedBlockId={selectedBlockId}
              timedBlocks={filteredTimedBlocks}
            />
          ) : null}

          <PointerSchedulingStatus
            conflict={pointerConflict}
            onCancel={() => setPointerConflict(null)}
            onConfirm={() => {
              if (pointerConflict) runPointerScheduling(pointerConflict);
            }}
            pending={pointerPending}
            result={pointerResult}
          />

          <CalendarSourceContract
            contentState={viewModel.contentStates.page}
            profileId={viewModel.profileId}
            viewModel={viewModel}
          />
        </div>
        <div
          className="min-w-0 xl:min-h-0"
          data-calendar-section="inspector"
          {...contentStateAttributes(
            viewModel.contentStates.rightPanel,
            viewModel.profileId,
          )}
        >
          {showEmptyInspector ? (
            <CalendarEmptyRightPanel
              planningQueueContentState={viewModel.contentStates.planningQueue}
              profileId={viewModel.profileId}
              selectedDay={selectedDay}
              tasks={viewModel.schedulableTasks}
            />
          ) : (
            <CalendarRightPanel
              onDuplicateBlock={duplicateBlock}
              onMarkDone={markDone}
              onMoveLater={moveLater}
              onQueuePointerStart={beginQueuePointer}
              onSaveTime={saveTime}
              panel={viewModel.rightPanel}
              planningQueueContentState={viewModel.contentStates.planningQueue}
              pointerEnabled={
                viewModel.profileId === "manual" && !pointerPending
              }
              profileId={viewModel.profileId}
              selectedBlock={selectedBlock}
              selectedDay={selectedDay}
              selectedQueueTask={selectedQueueTask}
              selectedSlot={selectedSlot}
              onSelectQueueTask={(taskId) =>
                setSelection({ kind: "queue", taskId })
              }
              scheduledTasks={timedBlocks}
              tasks={viewModel.schedulableTasks}
            />
          )}
        </div>
      </div>
    </div>
  );
}

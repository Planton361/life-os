"use client";

import type { ContentStateMeta } from "@/features/content-state";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Pill, accentStyle } from "@/components/layout/route-page-primitives";
import {
  completeTaskFormAction,
  rescheduleTaskFormAction,
  scheduleTaskForTodayFormAction,
  unscheduleTaskFormAction,
} from "@/features/real-data/actions/task.actions";
import { cn } from "@/lib/cn";
import type { CalendarRawTimedBlock } from "../calendar-view-model";
import {
  calendarBlockSourceLabels,
  calendarBlockStatusLabels,
  calendarBlockTypeLabels,
} from "../calendar-types";
import type {
  CalendarAllDayBlockViewModel,
  CalendarDayViewModel,
  CalendarViewModel,
  CalendarRightPanelViewModel,
  CalendarSelectedTimeSlotViewModel,
  CalendarTimedBlockViewModel,
  SchedulableTaskViewModel,
} from "../calendar-types";
import { CalendarCreateMenu } from "./calendar-create-flow";

type SelectedBlock = CalendarAllDayBlockViewModel | CalendarTimedBlockViewModel;
type QueueTab = "unscheduled" | "open-loops" | "reviews";

const inputClass =
  "mt-1 min-h-8 w-full rounded-[9px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.76)] px-2.5 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--focus-ring)]";

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

function Field({
  label,
  name,
  onChange,
  required = false,
  type = "text",
  value,
}: Readonly<{
  label: string;
  name?: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: "date" | "text" | "time";
  value: string;
}>) {
  return (
    <label className="block min-w-0">
      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
        {label}
      </span>
      <input
        className={inputClass}
        name={name}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}

function durationLabel(minutes: number) {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
}

function scheduleDurationOptions(minutes: number) {
  return Array.from(new Set([minutes, 15, 30, 45, 60, 90, 120])).sort(
    (left, right) => left - right,
  );
}

function isTimedBlock(block: SelectedBlock): block is CalendarTimedBlockViewModel {
  return "startTime" in block;
}

function InspectorHeader({
  selectedLabel,
}: Readonly<{
  selectedLabel: string;
}>) {
  return (
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
            Selected: {selectedLabel}
          </h2>
        </div>
        <Pill accent="var(--accent-cyan)">local mock</Pill>
      </div>
    </div>
  );
}

function SelectedContext({
  block,
  selectedDay,
  selectedSlot,
}: Readonly<{
  block?: SelectedBlock;
  selectedDay?: CalendarDayViewModel;
  selectedSlot?: CalendarSelectedTimeSlotViewModel | null;
}>) {
  if (block) {
    const timeLabel = isTimedBlock(block)
      ? `${block.startTime}-${block.endTime}`
      : block.timeLabel ?? "All day";

    return (
      <section
        aria-labelledby="calendar-selected-context-heading"
        className="rounded-[14px] border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent)_9%,rgba(18,28,43,.70))] p-3"
        style={accentStyle(block.accent)}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
          Selected context
        </p>
        <h3
          className="mt-1 text-[15px] font-semibold leading-5 text-[var(--text-primary)]"
          id="calendar-selected-context-heading"
        >
          {block.title}
        </h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Pill accent={block.accent}>{calendarBlockTypeLabels[block.type]}</Pill>
          <Pill accent={block.accent}>
            {calendarBlockStatusLabels[block.status]}
          </Pill>
          {block.priority ? <Pill quiet>{block.priority}</Pill> : null}
        </div>
        <dl className="mt-2 grid gap-1 text-[11px] leading-4 text-[var(--text-secondary)]">
          <div>
            <dt className="inline text-[var(--text-muted)]">Date: </dt>
            <dd className="inline">{block.date ?? selectedDay?.date ?? "2026-06-12"}</dd>
          </div>
          <div>
            <dt className="inline text-[var(--text-muted)]">Time: </dt>
            <dd className="inline">{timeLabel}</dd>
          </div>
          {isTimedBlock(block) ? (
            <div>
              <dt className="inline text-[var(--text-muted)]">Duration: </dt>
              <dd className="inline">{durationLabel(block.durationMinutes)}</dd>
            </div>
          ) : null}
          <div>
            <dt className="inline text-[var(--text-muted)]">Area: </dt>
            <dd className="inline">{block.area}</dd>
          </div>
          <div>
            <dt className="inline text-[var(--text-muted)]">Outcome: </dt>
            <dd className="inline">
              {block.plannedOutcome ?? "Prepared for later scheduling."}
            </dd>
          </div>
        </dl>
      </section>
    );
  }

  if (selectedSlot) {
    return (
      <section
        aria-labelledby="calendar-slot-context-heading"
        className="rounded-[14px] border border-[rgba(95,200,215,.18)] bg-[rgba(18,28,43,.54)] p-3"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-cyan)]">
          Empty slot
        </p>
        <h3
          className="mt-1 text-[15px] font-semibold leading-5 text-[var(--text-primary)]"
          id="calendar-slot-context-heading"
        >
          {selectedSlot.dayLabel} · {selectedSlot.startTime}-{selectedSlot.endTime}
        </h3>
        <p className="mt-2 text-[11px] leading-4 text-[var(--text-muted)]">
          Free slot. Use it for an event, task block or focus block.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="calendar-day-context-heading"
      className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.46)] p-3"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
        Day context
      </p>
      <h3
        className="mt-1 text-[15px] font-semibold leading-5 text-[var(--text-primary)]"
        id="calendar-day-context-heading"
      >
        {selectedDay?.fullLabel ?? "No specific day selected"}
      </h3>
      <p className="mt-2 text-[11px] leading-4 text-[var(--text-muted)]">
        Scan the planned blocks, pick a free slot, or schedule an item from the
        queue.
      </p>
    </section>
  );
}

function TimeSettings({
  block,
  onDuplicateBlock,
  onMarkDone,
  onMoveLater,
  onSaveTime,
  profileId,
  selectedSlot,
}: Readonly<{
  block?: SelectedBlock;
  onDuplicateBlock: (blockId: string) => void;
  onMarkDone: (blockId: string) => void;
  onMoveLater: (blockId: string) => void;
  onSaveTime: (blockId: string, date: string, startTime: string, endTime: string) => void;
  profileId: CalendarViewModel["profileId"];
  selectedSlot?: CalendarSelectedTimeSlotViewModel | null;
}>) {
  const baseDate = block?.date ?? selectedSlot?.date ?? "2026-06-12";
  const baseStart = block && isTimedBlock(block) ? block.startTime : selectedSlot?.startTime ?? "09:00";
  const baseEnd = block && isTimedBlock(block) ? block.endTime : selectedSlot?.endTime ?? "10:00";
  const [date, setDate] = useState(baseDate);
  const [startTime, setStartTime] = useState(baseStart);
  const [endTime, setEndTime] = useState(baseEnd);
  const [error, setError] = useState<string | null>(null);

  const duration = Math.max(0, timeToMinutes(endTime) - timeToMinutes(startTime));
  const taskId = block?.source === "task" && block.taskId ? block.taskId : null;
  const isPersistedTaskBlock = Boolean(
    profileId === "manual" && taskId && block && isTimedBlock(block),
  );
  const safeDuration = duration > 0 ? duration : block && isTimedBlock(block) ? block.durationMinutes : 30;
  const laterStartTime = offsetTime(startTime, 30);

  function save() {
    if (!block) {
      setError("Select a calendar block before saving time changes.");
      return;
    }

    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      setError("End time must be after start time.");
      return;
    }

    onSaveTime(block.id, date, startTime, endTime);
    setError(null);
  }

  return (
    <section
      aria-labelledby="calendar-time-settings-heading"
      className="rounded-[14px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.42)] p-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            className="text-[13px] font-semibold text-[var(--text-primary)]"
            id="calendar-time-settings-heading"
          >
            Time Settings
          </h3>
          <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-muted)]">
            Local edit only. Changes update the visible calendar mock state.
          </p>
        </div>
        <Pill accent="var(--accent-cyan)">{durationLabel(duration)}</Pill>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Field
          label="Date"
          name={isPersistedTaskBlock ? "plannedDate" : undefined}
          onChange={setDate}
          required={Boolean(isPersistedTaskBlock)}
          type="date"
          value={date}
        />
        <Field label="Duration" onChange={() => undefined} value={durationLabel(duration)} />
        <Field
          label="Start time"
          name={isPersistedTaskBlock ? "scheduledTime" : undefined}
          onChange={setStartTime}
          required={Boolean(isPersistedTaskBlock)}
          type="time"
          value={startTime}
        />
        <Field label="End time" onChange={setEndTime} type="time" value={endTime} />
      </div>

      <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {isPersistedTaskBlock ? (
          <>
            <form action={rescheduleTaskFormAction}>
              <input name="taskId" type="hidden" value={taskId ?? ""} />
              <input name="plannedDate" type="hidden" value={date} />
              <input name="scheduledTime" type="hidden" value={startTime} />
              <input name="durationMinutes" type="hidden" value={safeDuration} />
              <button
                className="min-h-8 w-full rounded-full border border-[rgba(95,200,215,.34)] bg-[rgba(95,200,215,.14)] px-3 text-[10px] font-semibold text-[var(--text-primary)] transition hover:border-[rgba(95,200,215,.48)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                type="submit"
              >
                Reschedule
              </button>
            </form>
            <form action={rescheduleTaskFormAction}>
              <input name="taskId" type="hidden" value={taskId ?? ""} />
              <input name="plannedDate" type="hidden" value={date} />
              <input name="scheduledTime" type="hidden" value={laterStartTime} />
              <input name="durationMinutes" type="hidden" value={safeDuration} />
              <button
                className="min-h-8 w-full rounded-full border border-[var(--border-subtle)] bg-[rgba(18,28,43,.72)] px-3 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                type="submit"
              >
                Move later
              </button>
            </form>
            <form action={unscheduleTaskFormAction}>
              <input name="taskId" type="hidden" value={taskId ?? ""} />
              <button
                className="min-h-8 w-full rounded-full border border-[var(--border-subtle)] bg-[rgba(18,28,43,.72)] px-3 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                type="submit"
              >
                Unschedule
              </button>
            </form>
            <form action={completeTaskFormAction}>
              <input name="taskId" type="hidden" value={taskId ?? ""} />
              <button
                className="min-h-8 w-full rounded-full border border-[rgba(66,184,131,.32)] bg-[rgba(66,184,131,.12)] px-3 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[rgba(66,184,131,.48)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={block?.status === "done"}
                type="submit"
              >
                Mark done
              </button>
            </form>
          </>
        ) : (
          <>
            <button
              className="min-h-8 rounded-full border border-[rgba(95,200,215,.34)] bg-[rgba(95,200,215,.14)] px-3 text-[10px] font-semibold text-[var(--text-primary)] transition hover:border-[rgba(95,200,215,.48)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
              onClick={save}
              type="button"
            >
              Save time
            </button>
            <button
              className="min-h-8 rounded-full border border-[var(--border-subtle)] bg-[rgba(18,28,43,.72)] px-3 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
              onClick={() => {
                setDate(baseDate);
                setStartTime(baseStart);
                setEndTime(baseEnd);
                setError(null);
              }}
              type="button"
            >
              Cancel
            </button>
            <button
              className="min-h-8 rounded-full border border-[var(--border-subtle)] bg-[rgba(18,28,43,.72)] px-3 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!block}
              onClick={() => block && onMoveLater(block.id)}
              type="button"
            >
              Move later
            </button>
            <button
              className="min-h-8 rounded-full border border-[var(--border-subtle)] bg-[rgba(18,28,43,.72)] px-3 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!block}
              onClick={() => block && onDuplicateBlock(block.id)}
              type="button"
            >
              Duplicate
            </button>
            <button
              className="min-h-8 rounded-full border border-[var(--border-subtle)] bg-[rgba(18,28,43,.72)] px-3 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2"
              disabled={!block || block.status === "done"}
              onClick={() => block && onMarkDone(block.id)}
              type="button"
            >
              Mark done
            </button>
          </>
        )}
      </div>

      {error ? (
        <p
          className="mt-3 rounded-[10px] border border-[rgba(221,107,95,.24)] bg-[rgba(221,107,95,.08)] px-3 py-2 text-[11px] text-[var(--text-secondary)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}

function SourcePanel({
  block,
}: Readonly<{
  block?: SelectedBlock;
}>) {
  if (!block) {
    return null;
  }

  return (
    <section
      aria-labelledby="calendar-source-heading"
      className="rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.36)] p-3"
    >
      <h3
        className="text-[13px] font-semibold text-[var(--text-primary)]"
        id="calendar-source-heading"
      >
        Source / Linked Item
      </h3>
      <dl className="mt-2 grid gap-1 text-[11px] leading-4 text-[var(--text-secondary)]">
        <div>
          <dt className="inline text-[var(--text-muted)]">Source: </dt>
          <dd className="inline">
            {calendarBlockSourceLabels[block.source]} / {block.sourceEntity.label}
          </dd>
        </div>
        <div>
          <dt className="inline text-[var(--text-muted)]">Linked item: </dt>
          <dd className="inline">{block.linkedEntity ?? block.sourceEntity.label}</dd>
        </div>
        <div>
          <dt className="inline text-[var(--text-muted)]">Status: </dt>
          <dd className="inline">{calendarBlockStatusLabels[block.status]}</dd>
        </div>
      </dl>
      {block.sourceEntity.href ? (
        <Link
          className="mt-3 inline-flex min-h-8 items-center rounded-full border border-[var(--border-subtle)] bg-[rgba(18,28,43,.76)] px-3 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
          href={block.sourceEntity.href}
        >
          {block.sourceEntity.type === "task" ? "Open task" : "Open source"}
        </Link>
      ) : null}
    </section>
  );
}

function PlanningQueue({
  contentState,
  panel,
  profileId,
  tasks,
}: Readonly<{
  contentState: ContentStateMeta;
  panel: CalendarRightPanelViewModel;
  profileId: CalendarViewModel["profileId"];
  tasks: readonly SchedulableTaskViewModel[];
}>) {
  const [tab, setTab] = useState<QueueTab>("unscheduled");
  const queueTasks = useMemo(
    () => tasks.filter((task) => !task.alreadyScheduled),
    [tasks],
  );
  const queueItems = useMemo(() => {
    if (tab === "open-loops") {
      return panel.openLoops.map((item) => ({
        title: item.title,
        meta: item.meta,
        accent: item.accent,
      }));
    }

    if (tab === "reviews") {
      return panel.reviewsOpen.map((item) => ({
        title: item.title,
        meta: item.meta,
        accent: item.accent,
      }));
    }

    return queueTasks.map((task) => ({
      title: task.title,
      meta: `${task.priority} · ${task.estimatedMinutes} min · ${task.project}`,
      accent: task.accent,
    }));
  }, [panel.openLoops, panel.reviewsOpen, queueTasks, tab]);
  const queueCount = tab === "unscheduled" ? queueTasks.length : queueItems.length;
  const canSchedule = profileId === "manual";

  return (
    <section
      aria-labelledby="calendar-planning-queue-heading"
      className="rounded-[12px] border border-[rgba(148,163,184,.10)] bg-[rgba(11,17,28,.34)] p-3"
      data-calendar-section="planning-queue"
      {...contentStateAttributes(contentState, profileId)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            className="text-[13px] font-semibold text-[var(--text-primary)]"
            id="calendar-planning-queue-heading"
          >
            Calendar Planner Queue
          </h3>
          <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-muted)]">
            Geplante Tasks ohne Uhrzeit in Zeitblöcke überführen.
          </p>
        </div>
        <Pill quiet>{queueCount}</Pill>
      </div>
      <div className="mt-2 flex rounded-full border border-[var(--border-subtle)] bg-[rgba(18,28,43,.48)] p-1">
        {[
          ["unscheduled", "Tasks"],
          ["open-loops", "Open loops"],
          ["reviews", "Reviews"],
        ].map(([value, label], index) => (
          <button
            aria-pressed={tab === value}
            className={cn(
              "min-h-6 flex-1 rounded-full px-2 text-[9px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]",
              tab === value
                ? "border border-[rgba(95,200,215,.28)] bg-[rgba(95,200,215,.14)] text-[var(--text-primary)]"
                : "border border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
            )}
            key={`calendar-queue-tab-${index}`}
            onClick={() => setTab(value as QueueTab)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-2 grid gap-1.5">
        {tab === "unscheduled" && queueTasks.length === 0 ? (
          <p className="rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] px-3 py-2 text-[11px] text-[var(--text-muted)]">
            Keine geplanten Tasks ohne Uhrzeit.
          </p>
        ) : null}

        {tab === "unscheduled"
          ? queueTasks.slice(0, 4).map((task) => (
              <article
                className="rounded-[10px] border border-[color-mix(in_srgb,var(--accent)_24%,transparent)] bg-[rgba(18,28,43,.44)] p-2"
                key={task.id}
                style={accentStyle(task.accent)}
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
                      {task.plannedDate} · {task.priority} ·{" "}
                      {task.energy ?? "energy offen"} ·{" "}
                      {durationLabel(task.estimatedMinutes)}
                    </p>
                    <p className="truncate text-[10px] leading-4 text-[var(--text-muted)]">
                      {task.project}
                    </p>
                  </div>
                </div>

                {canSchedule ? (
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
                      value={task.plannedDate}
                    />
                    <label className="min-w-0">
                      <span className="sr-only">Uhrzeit</span>
                      <input
                        className={inputClass}
                        defaultValue="09:00"
                        name="scheduledTime"
                        type="time"
                      />
                    </label>
                    <label className="min-w-0">
                      <span className="sr-only">Dauer</span>
                      <select
                        className={inputClass}
                        defaultValue={String(task.estimatedMinutes)}
                        name="durationMinutes"
                      >
                        {scheduleDurationOptions(task.estimatedMinutes).map(
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
                    Demo-Fixture. Persistente Terminierung ist im Manual-Profil aktiv.
                  </p>
                )}
              </article>
            ))
          : queueItems.slice(0, 4).map((item) => (
              <article
                className="grid min-h-8 grid-cols-[8px_minmax(0,1fr)] gap-2"
                key={`${tab}-${item.title}`}
                style={accentStyle(item.accent)}
              >
                <span
                  aria-hidden="true"
                  className="mt-1.5 size-1.5 rounded-full bg-[var(--accent)]"
                />
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium text-[var(--text-secondary)]">
                    {item.title}
                  </p>
                  <p className="truncate text-[10px] leading-4 text-[var(--text-muted)]">
                    {item.meta}
                  </p>
                </div>
              </article>
            ))}
      </div>
    </section>
  );
}

export function CalendarRightPanel({
  onCreateBlock,
  onDuplicateBlock,
  onMarkDone,
  onMoveLater,
  onSaveTime,
  panel,
  planningQueueContentState,
  profileId,
  resolveDayId,
  selectedBlock,
  selectedDay,
  selectedSlot,
  tasks,
}: Readonly<{
  onCreateBlock: (block: CalendarRawTimedBlock) => void;
  onDuplicateBlock: (blockId: string) => void;
  onMarkDone: (blockId: string) => void;
  onMoveLater: (blockId: string) => void;
  onSaveTime: (blockId: string, date: string, startTime: string, endTime: string) => void;
  panel: CalendarRightPanelViewModel;
  planningQueueContentState: ContentStateMeta;
  profileId: CalendarViewModel["profileId"];
  resolveDayId: (date: string) => string;
  selectedBlock?: SelectedBlock;
  selectedDay?: CalendarDayViewModel;
  selectedSlot?: CalendarSelectedTimeSlotViewModel | null;
  tasks: readonly SchedulableTaskViewModel[];
}>) {
  const selectedLabel = selectedBlock
    ? calendarBlockTypeLabels[selectedBlock.type]
    : selectedSlot
      ? "Empty Slot"
      : "Day";

  return (
    <aside
      aria-labelledby="calendar-right-panel-heading"
      className="overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.86)] shadow-[0_8px_22px_rgba(0,0,0,.12)] xl:flex xl:min-h-0 xl:flex-col"
    >
      <InspectorHeader selectedLabel={selectedLabel} />

      <div className="grid gap-2 p-2.5 xl:min-h-0 xl:flex-1 xl:content-start xl:overflow-y-auto">
        <SelectedContext
          block={selectedBlock}
          selectedDay={selectedDay}
          selectedSlot={selectedSlot}
        />

        <TimeSettings
          block={selectedBlock}
          key={`${selectedBlock?.id ?? "slot"}-${selectedSlot?.date ?? selectedDay?.date ?? "day"}-${selectedSlot?.startTime ?? ""}`}
          onDuplicateBlock={onDuplicateBlock}
          onMarkDone={onMarkDone}
          onMoveLater={onMoveLater}
          onSaveTime={onSaveTime}
          profileId={profileId}
          selectedSlot={selectedSlot}
        />

        {selectedSlot ? (
          <section
            aria-labelledby="calendar-slot-actions-heading"
            className="rounded-[12px] border border-[rgba(95,200,215,.14)] bg-[rgba(11,17,28,.38)] p-3"
          >
            <h3
              className="text-[13px] font-semibold text-[var(--text-primary)]"
              id="calendar-slot-actions-heading"
            >
              Create
            </h3>
            <div className="mt-2">
              <CalendarCreateMenu
                defaults={selectedSlot}
                onCreateBlock={onCreateBlock}
                resolveDayId={resolveDayId}
                tasks={tasks}
              />
            </div>
          </section>
        ) : null}

        <SourcePanel block={selectedBlock} />
        <PlanningQueue
          contentState={planningQueueContentState}
          panel={panel}
          profileId={profileId}
          tasks={tasks}
        />
      </div>
    </aside>
  );
}

"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  type DashboardAgendaEvent,
  type DashboardArea,
  type DashboardTodayAgenda,
  type TodayAgendaEnergy,
} from "@/features/dashboard";
import { cn } from "@/lib/cn";
import { type AccentStyle, styleFor } from "./section-primitives";
import {
  DashboardDialog,
  SelectField,
  TextAreaField,
  TextField,
  dashboardActionButtonClass,
  dashboardPrimaryButtonClass,
} from "./dashboard-dialog";

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

const DASHBOARD_LINK_FOCUS_CLASSES =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-cyan)]";

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

function accentForArea(area: DashboardArea) {
  if (area === "work") {
    return "var(--accent-green)";
  }

  if (area === "coding" || area === "education") {
    return "var(--accent-blue)";
  }

  if (area === "health") {
    return "var(--accent-red)";
  }

  if (area === "nutrition") {
    return "var(--accent-yellow)";
  }

  if (area === "personal") {
    return "var(--accent-purple)";
  }

  return "var(--accent-cyan)";
}

function areaLabelFor(area: DashboardArea) {
  if (area === "review") {
    return "Review";
  }

  return `${area.charAt(0).toUpperCase()}${area.slice(1)}`;
}

function taskIdFromTitle(title: string) {
  return `task-${title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}

function statusClassName(status: DashboardAgendaEvent["status"]) {
  if (status === "active") {
    return "border-[color-mix(in_srgb,var(--accent)_34%,transparent)]";
  }

  if (status === "next") {
    return "border-[color-mix(in_srgb,var(--accent)_28%,transparent)]";
  }

  if (status === "blocked") {
    return "border-[rgba(221,107,95,.22)]";
  }

  if (status === "done") {
    return "border-[rgba(148,163,184,.08)]";
  }

  return "border-[color-mix(in_srgb,var(--accent)_20%,transparent)]";
}

function agendaEventBackground(status: DashboardAgendaEvent["status"]) {
  if (status === "active") {
    return "color-mix(in srgb, var(--accent) 24%, #0d1625)";
  }

  if (status === "next") {
    return "color-mix(in srgb, var(--accent) 20%, #0d1625)";
  }

  if (status === "done") {
    return "color-mix(in srgb, var(--accent) 5%, #0d1625)";
  }

  if (status === "blocked") {
    return "color-mix(in srgb, var(--accent) 10%, #0d1625)";
  }

  return "color-mix(in srgb, var(--accent) 16%, #0d1625)";
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
              "border border-[rgba(91,124,250,.34)] bg-[rgba(91,124,250,.13)] text-[var(--text-secondary)]",
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
    background: agendaEventBackground(event.status),
  };
  const className = cn(
    "relative overflow-hidden rounded-[13px] border bg-[#0d1625] p-2.5 pl-4",
    event.tall ? "min-h-[58px]" : "min-h-[42px]",
    statusClassName(event.status),
    event.strong && event.status !== "blocked" && "border-[rgba(221,107,95,.28)]",
    event.href && `block ${DASHBOARD_LINK_FOCUS_CLASSES}`,
  );
  const content = (
    <>
      <span
        aria-hidden="true"
        className="absolute bottom-0 left-0 top-0 w-1 bg-[color-mix(in_srgb,var(--accent)_72%,transparent)]"
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
    </>
  );

  if (event.href) {
    return (
      <Link
        aria-label={`Open agenda item: ${event.title}`}
        className={className}
        href={event.href}
        style={eventStyle}
      >
        {content}
      </Link>
    );
  }

  return (
    <article className={className} style={eventStyle}>
      {content}
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
      className="rounded-full border border-[color-mix(in_srgb,var(--accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-2.5 py-0.5 text-[9px] font-medium text-[var(--text-secondary)]"
      style={styleFor(accent)}
    >
      {children}
    </span>
  );
}

function AddTaskDialog({
  onClose,
  onSave,
}: Readonly<{
  onClose: () => void;
  onSave: (event: DashboardAgendaEvent) => void;
}>) {
  function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const area = String(formData.get("area") ?? "review") as DashboardArea;
    const timeBlock = String(formData.get("timeBlock") ?? "Task block").trim();
    const startTime = String(formData.get("startTime") ?? "16:30").trim();
    const endTime = String(formData.get("endTime") ?? "17:00").trim();
    const priority = String(formData.get("priority") ?? "P2") as DashboardAgendaEvent["priority"];
    const taskTitle = title || "New task block";
    const taskId = taskIdFromTitle(taskTitle);
    const energy: TodayAgendaEnergy = priority === "P0" ? "high" : "medium";

    onSave({
      id: taskId,
      title: taskTitle,
      time: `${startTime}-${endTime} · ${timeBlock || "Task block"}`,
      note: description || "Local task block",
      areaLabel: areaLabelFor(area),
      type: "task",
      typeLabel: "Task",
      status: "planned",
      statusLabel: "Planned",
      relevanceLabel: priority,
      nextAction: "Open task detail",
      tags: [areaLabelFor(area), energy],
      accent: accentForArea(area),
      area,
      energy,
      priority,
      href: `/tasks/${taskId}`,
    });
    onClose();
  }

  return (
    <DashboardDialog
      labelledBy="agenda-add-task-dialog-heading"
      onClose={onClose}
      open
    >
      <form onSubmit={saveTask}>
        <div className="border-b border-[var(--border-subtle)] px-5 py-4">
          <h2
            className="text-lg font-semibold text-[var(--text-primary)]"
            id="agenda-add-task-dialog-heading"
          >
            Add task
          </h2>
          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
            Local agenda prototype only. No calendar sync or AI scheduling runs.
          </p>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          <TextField label="Title" name="title" placeholder="Task title" />
          <SelectField defaultValue="review" label="Label / Area" name="area">
            <option value="review">Review</option>
            <option value="education">Education</option>
            <option value="work">Work</option>
            <option value="coding">Coding</option>
            <option value="health">Health</option>
            <option value="nutrition">Nutrition</option>
            <option value="personal">Personal</option>
          </SelectField>
          <div className="sm:col-span-2">
            <TextAreaField
              label="Description"
              name="description"
              optional
              placeholder="What should be true when this block is done?"
            />
          </div>
          <TextField
            defaultValue="30 min"
            label="Time block"
            name="timeBlock"
            placeholder="30 min"
          />
          <SelectField defaultValue="P2" label="Priority" name="priority">
            <option value="P0">P0</option>
            <option value="P1">P1</option>
            <option value="P2">P2</option>
            <option value="P3">P3</option>
          </SelectField>
          <TextField
            defaultValue="16:30"
            label="Start time"
            name="startTime"
            type="time"
          />
          <TextField
            defaultValue="17:00"
            label="End time"
            name="endTime"
            type="time"
          />
          <label className="flex items-center gap-2 rounded-[12px] border border-[var(--border-subtle)] bg-[rgba(168,183,204,.05)] px-3 py-2 text-[10px] font-semibold text-[var(--text-muted)] sm:col-span-2">
            <input disabled type="checkbox" />
            Find free block later
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] px-5 py-4">
          <button
            className={dashboardActionButtonClass}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button className={dashboardPrimaryButtonClass} type="submit">
            Save
          </button>
        </div>
      </form>
    </DashboardDialog>
  );
}

export function TodayAgenda({
  data,
}: Readonly<{
  data: DashboardTodayAgenda;
}>) {
  const [events, setEvents] = useState<DashboardAgendaEvent[]>([...data.events]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const title = data.href ? (
    <Link
      className={cn("rounded-sm", DASHBOARD_LINK_FOCUS_CLASSES)}
      href={data.href}
    >
      {data.title}
    </Link>
  ) : (
    data.title
  );

  return (
    <section
      aria-labelledby="today-agenda-title"
      className="overflow-hidden rounded-[var(--panel-radius)] border border-[rgba(91,124,250,.34)] bg-[color-mix(in_srgb,var(--accent-blue)_4%,#0e1828)] shadow-[0_16px_40px_rgba(0,0,0,.24)] 2xl:h-[820px]"
    >
      <div className="border-b border-[var(--border-subtle)] bg-[rgba(14,23,38,.82)] px-5 py-4 2xl:h-[86px] 2xl:px-[30px] 2xl:py-0">
        <div className="flex flex-wrap items-center justify-between gap-4 2xl:h-full">
          <h2
            className="text-[28px] font-semibold text-[var(--text-primary)]"
            id="today-agenda-title"
          >
            {title}
          </h2>
          <div className="flex flex-wrap items-center gap-6">
            <AgendaViewSwitch agenda={data} />
            <button
              className={cn(
                "rounded-full border border-[rgba(91,124,250,.28)] bg-[rgba(91,124,250,.12)] px-3 py-1.5 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[rgba(91,124,250,.40)] hover:text-[var(--text-primary)]",
                DASHBOARD_LINK_FOCUS_CLASSES,
              )}
              onClick={() => setAddDialogOpen(true)}
              type="button"
            >
              + Add task
            </button>
          </div>
        </div>
      </div>
      <div className="relative grid h-[clamp(560px,54vh,650px)] min-h-0 grid-cols-[56px_minmax(0,1fr)] gap-3 p-3 2xl:mt-[6px] 2xl:h-[780px] 2xl:grid-cols-[64px_minmax(0,1fr)] 2xl:gap-5 2xl:px-[22px] 2xl:py-0">
        <AgendaHourRail hours={data.hours} />
        <div className="relative min-h-0 overflow-hidden rounded-[16px] border border-[rgba(91,124,250,.16)] bg-[color-mix(in_srgb,var(--accent-blue)_4%,#0b1423)] p-2.5">
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
            {events.map((event, index) => (
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
      {addDialogOpen ? (
        <AddTaskDialog
          onClose={() => setAddDialogOpen(false)}
          onSave={(event) => setEvents((currentEvents) => [...currentEvents, event])}
        />
      ) : null}
    </section>
  );
}

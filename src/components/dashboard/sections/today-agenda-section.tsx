"use client";

import { useState } from "react";
import type { CalendarViewModel } from "@/features/calendar/calendar-types";
import { dashboardAgendaDays, dashboardAgendaBlocks, type DashboardAgendaView } from "@/features/dashboard/agenda-period";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import {
  type DashboardAgendaEvent,
  type DashboardProfileId,
  type DashboardTodayAgenda,
} from "@/features/dashboard";
import { cn } from "@/lib/cn";
import {
  type AccentStyle,
  DashboardEmptyState,
  contentStateAttrs,
  styleFor,
} from "./section-primitives";

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

function hourMinutes(value: string) {
  const [hours = "0", minutes = "0"] = value.split(":");
  const total = Number(hours) * 60 + Number(minutes);

  return Number.isFinite(total) ? total : null;
}

function eventStartMinutes(event: DashboardAgendaEvent) {
  const match = event.time.match(/^(\d{2}:\d{2})/);

  return match ? hourMinutes(match[1]) : null;
}

function agendaEventSlotStyle(
  index: number,
  event: DashboardAgendaEvent,
  hours: DashboardTodayAgenda["hours"],
): AgendaSlotStyle {
  const start = eventStartMinutes(event);
  const firstHour = hourMinutes(hours[0] ?? "06:00");
  const lastHour = hourMinutes(hours[hours.length - 1] ?? "24:00");

  if (start !== null && firstHour !== null && lastHour !== null && lastHour > firstHour) {
    return {
      "--agenda-top": `${Math.max(
        0,
        Math.min(92, ((start - firstHour) / (lastHour - firstHour)) * 100),
      )}%`,
    };
  }

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

function AgendaViewSwitch({ activeView, onChange }: { activeView: DashboardAgendaView; onChange: (view: DashboardAgendaView) => void }) {
  return (
    <div className="flex w-[286px] max-w-full rounded-full border border-[rgba(91,124,250,.24)] bg-[#0d1727] p-1 text-center text-[10px] font-medium text-[var(--text-muted)]">
      {(["Day", "Week", "Month"] as const).map((view) => (
        <button type="button"
          aria-pressed={view === activeView}
          className={cn(
            "flex-1 rounded-full px-3 py-1.5",
            view === activeView &&
              "border border-[rgba(91,124,250,.34)] bg-[rgba(91,124,250,.13)] text-[var(--text-secondary)]",
            DASHBOARD_LINK_FOCUS_CLASSES,
          )}
          onClick={() => onChange(view)}
          key={view}
        >
          {view}
        </button>
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
    <div className="flex flex-col justify-between rounded-[14px] border border-[var(--border-subtle)] bg-[#0b1423] py-2">
      {hours.map((time) => (
        <div
          className="flex items-start justify-end pr-2 text-[11px] leading-none font-medium text-[var(--text-secondary)]"
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

export function TodayAgenda({
  calendar,
  data,
  profileId,
}: Readonly<{
  calendar: CalendarViewModel;
  data: DashboardTodayAgenda;
  profileId: DashboardProfileId;
}>) {
  const [activeView, setActiveView] = useState<DashboardAgendaView>("Day");
  const today = calendar.days.find(day => day.isToday)?.date ?? calendar.days[0]?.date ?? "";
  const events = data.events;
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
      className="dashboard-agenda flex min-h-0 flex-col overflow-hidden rounded-[var(--panel-radius)] border border-[rgba(91,124,250,.34)] bg-[color-mix(in_srgb,var(--accent-blue)_4%,#0e1828)] shadow-[0_16px_40px_rgba(0,0,0,.24)]"
      {...contentStateAttrs(data.contentState, profileId)}
    >
      <div className="border-b border-[var(--border-subtle)] bg-[rgba(14,23,38,.82)] px-5 py-4 2xl:h-[86px] 2xl:px-[30px]">
        <div className="flex flex-wrap items-center justify-between gap-4 2xl:h-full">
          <h2
            className="text-[28px] font-semibold text-[var(--text-primary)]"
            id="today-agenda-title"
          >
            {title}
          </h2>
          <div className="flex flex-wrap items-center gap-6">
            <AgendaViewSwitch activeView={activeView} onChange={setActiveView} />
          </div>
        </div>
      </div>
      {activeView === "Day" ? <div className="agenda-body relative grid h-[clamp(560px,54vh,650px)] min-h-0 grid-cols-[56px_minmax(0,1fr)] gap-3 p-3 2xl:grid-cols-[64px_minmax(0,1fr)] 2xl:gap-5 2xl:px-[22px]">
        <AgendaHourRail hours={data.hours} />
        <div className="relative min-h-0 overflow-hidden rounded-[16px] border border-[rgba(91,124,250,.16)] bg-[color-mix(in_srgb,var(--accent-blue)_4%,#0b1423)] p-2.5">
          <div aria-hidden="true" data-agenda-hour-lines className="pointer-events-none absolute inset-x-0 inset-y-2 flex flex-col justify-between">
            {data.hours.map((hour) => <div key={hour} className="border-t border-[rgba(148,163,184,.10)]" />)}
          </div>
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
            {events.length > 0 ? (
              events.map((event, index) => (
                <div
                  className="2xl:absolute 2xl:left-0 2xl:right-1 2xl:top-[var(--agenda-top)]"
                  key={event.id}
                  style={agendaEventSlotStyle(index, event, data.hours)}
                >
                  <AgendaEventCard event={event} />
                </div>
              ))
            ) : (
              <div
                className="2xl:absolute 2xl:left-0 2xl:right-1 2xl:top-[var(--agenda-top)]"
                style={{ "--agenda-top": agendaEventSlots[0] } as AgendaSlotStyle}
              >
                <DashboardEmptyState
                  description="Lege 1-3 Aufgaben für heute an."
                  title="Noch keine Tagesstruktur."
                />
              </div>
            )}
          </div>
        </div>
      </div> : (
        <div className={`dashboard-agenda-period min-h-0 flex-1 overflow-auto p-3 ${activeView === "Month" ? "grid grid-cols-7 grid-rows-6 gap-1" : "grid grid-cols-1 auto-rows-fr gap-2"}`} data-agenda-view={activeView}>
          {dashboardAgendaDays(today, activeView).map(day => {
            const blocks = dashboardAgendaBlocks(calendar, day.date);
            return <section key={day.date} aria-label={day.date} className="min-w-0 overflow-auto rounded-lg border border-[var(--border-subtle)] p-2">
              <Link href={`/calendar?view=day&date=${day.date}`} className={`text-xs font-semibold ${day.date === today ? "text-[var(--accent-cyan)]" : "text-[var(--text-secondary)]"}`}>
                {new Date(`${day.date}T12:00:00Z`).toLocaleDateString("de-DE", { day: "numeric", month: activeView === "Week" ? "short" : undefined, weekday: "short", timeZone: "UTC" })}
              </Link>
              <div className="mt-2 space-y-1">
                {blocks.map(block => <Link key={block.id} href={block.sourceEntity.href ?? `/calendar?view=day&date=${day.date}`} className="block rounded border-l-2 border-[var(--accent-blue)] bg-[var(--surface-2)] p-1 text-[10px] text-[var(--text-secondary)]">
                  {"startTime" in block ? `${block.startTime} · ` : ""}{block.title}
                </Link>)}
                {!blocks.length && <p className="text-[10px] text-[var(--text-muted)]">—</p>}
              </div>
            </section>;
          })}
        </div>
      )}
    </section>
  );
}

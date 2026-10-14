"use client";

import { Fragment, useEffect, useId, useRef, useState } from "react";
import type { CalendarViewModel } from "@/features/calendar/calendar-types";
import {
  dashboardAgendaDays,
  dashboardAgendaBlocks,
  type DashboardAgendaView,
} from "@/features/dashboard/agenda-period";
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

const DASHBOARD_LINK_FOCUS_CLASSES =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-cyan)]";

function hourMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + (minute || 0);
}

// This is an hourly overview, not duration geometry. The canonical time label
// carries the exact interval; content must never change the hour spacing.
function agendaHourIndex(
  event: DashboardAgendaEvent,
  hours: readonly string[],
) {
  const match = event.time.match(/^(\d{2}:\d{2})/);
  if (!match) return 0;
  const start = hourMinutes(match[1]);
  const index = hours.findLastIndex((hour) => hourMinutes(hour) <= start);
  return Math.max(0, index);
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
  activeView,
  onChange,
}: {
  activeView: DashboardAgendaView;
  onChange: (view: DashboardAgendaView) => void;
}) {
  return (
    <div className="flex w-[286px] max-w-full rounded-full border border-[rgba(91,124,250,.24)] bg-[#0d1727] p-1 text-center text-[10px] font-medium text-[var(--text-muted)]">
      {(["Day", "Week", "Month"] as const).map((view) => (
        <button
          type="button"
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

function AgendaEventCard({
  event,
}: Readonly<{
  event: DashboardAgendaEvent;
}>) {
  const descriptionId = useId();
  const metaLabel = `${event.time} · ${event.areaLabel} · ${event.typeLabel} · ${event.statusLabel}`;
  const eventStyle: AccentStyle = {
    ...styleFor(event.accent),
    background: agendaEventBackground(event.status),
  };
  const className = cn(
    "agenda-event-card relative min-w-0 overflow-hidden rounded-[13px] border bg-[#0d1625] p-2 pl-4",
    statusClassName(event.status),
    event.strong &&
      event.status !== "blocked" &&
      "border-[rgba(221,107,95,.28)]",
    event.href && `block ${DASHBOARD_LINK_FOCUS_CLASSES}`,
  );
  const content = (
    <>
      <span
        aria-hidden="true"
        className="absolute bottom-0 left-0 top-0 w-1 bg-[color-mix(in_srgb,var(--accent)_72%,transparent)]"
      />
      <div className="flex min-w-0 items-center justify-between gap-2">
        <h3
          className={cn(
            "truncate text-xs text-[var(--text-secondary)]",
            (event.status === "active" ||
              event.status === "next" ||
              event.strong) &&
              "font-semibold text-[var(--text-primary)]",
          )}
        >
          {event.title}
        </h3>
        <span className="shrink-0 text-[9px] text-[var(--text-muted)]">
          {event.relevanceLabel}
        </span>
      </div>
      <p className="mt-1 truncate text-[10px] font-medium leading-tight text-[var(--text-secondary)]">
        {event.time} · {event.statusLabel}
      </p>
      <p className="mt-1 truncate text-[11px] leading-tight text-[var(--text-muted)]">
        {event.note}
      </p>
      <span id={descriptionId} className="sr-only">
        {metaLabel} · {event.note} · {event.nextAction} · {event.attentionLabel}
      </span>
    </>
  );

  if (event.href) {
    return (
      <Link
        aria-label={`Open agenda item: ${event.title}`}
        aria-describedby={descriptionId}
        title={`${event.title} — ${metaLabel} — ${event.note}`}
        className={className}
        href={event.href}
        onFocus={(focusEvent) =>
          focusEvent.currentTarget.scrollIntoView({
            block: "nearest",
            inline: "nearest",
          })
        }
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
  const agendaBody = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const body = agendaBody.current;
    if (!body || getComputedStyle(body).overflowY !== "auto") return;
    const current = body.querySelector<HTMLElement>("[data-agenda-current]");
    if (current) {
      body.scrollTop = Math.max(
        0,
        current.getBoundingClientRect().top -
          body.getBoundingClientRect().top +
          body.scrollTop -
          24,
      );
    } else {
      body.scrollTop = 0;
    }
  }, [activeView, data.currentTimePositionPercent]);
  const today =
    calendar.days.find((day) => day.isToday)?.date ??
    calendar.days[0]?.date ??
    "";
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
      <div className="border-b border-[var(--border-subtle)] bg-[rgba(14,23,38,.82)] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4 2xl:h-full">
          <h2
            className="text-[28px] font-semibold text-[var(--text-primary)]"
            id="today-agenda-title"
          >
            {title}
          </h2>
          <div className="flex flex-wrap items-center gap-6">
            <AgendaViewSwitch
              activeView={activeView}
              onChange={setActiveView}
            />
          </div>
        </div>
      </div>
      <div
        ref={agendaBody}
        tabIndex={0}
        role="region"
        aria-label={
          activeView === "Day" ? "Agenda time content" : "Agenda period content"
        }
        className="agenda-scroll"
      >
        {activeView === "Day" ? (
          <div className="agenda-body grid grid-cols-[48px_minmax(0,1fr)] gap-x-3 p-3">
            {data.hours.map((hour, index) => {
              const hourEvents = events.filter(
                (event) => agendaHourIndex(event, data.hours) === index,
              );
              const currentHour = Math.floor(
                (data.currentTimePositionPercent / 100) *
                  (data.hours.length - 1),
              );
              const isCurrent = index === currentHour;
              return (
                <Fragment key={hour}>
                  <div className="min-w-0 py-2 text-right text-[11px] font-medium text-[var(--text-secondary)]">
                    {hour}
                    {isCurrent && (
                      <p className="mt-1 text-[10px] text-[var(--accent-red)]">
                        {data.currentTimeLabel}
                      </p>
                    )}
                  </div>
                  <div
                    data-agenda-current={isCurrent ? "true" : undefined}
                    data-agenda-hour-lines
                    tabIndex={hourEvents.length > 1 ? 0 : undefined}
                    role={hourEvents.length > 1 ? "group" : undefined}
                    aria-label={
                      hourEvents.length > 1
                        ? `${hour}: ${hourEvents.length} events`
                        : undefined
                    }
                    className={cn(
                      "agenda-hour-events min-w-0 border-t py-2",
                      isCurrent
                        ? "border-[var(--accent-red)]"
                        : "border-[var(--border-subtle)]",
                    )}
                  >
                    {hourEvents.map((event) => (
                      <AgendaEventCard key={event.id} event={event} />
                    ))}
                    {index === 0 && events.length === 0 && (
                      <DashboardEmptyState
                        description="Lege 1-3 Aufgaben für heute an."
                        title="Noch keine Tagesstruktur."
                      />
                    )}
                  </div>
                </Fragment>
              );
            })}
          </div>
        ) : (
          <div
            className={`dashboard-agenda-period grid p-3 ${activeView === "Month" ? "grid-cols-1 gap-1" : "grid-cols-1 gap-2"}`}
            data-agenda-view={activeView}
          >
            {dashboardAgendaDays(today, activeView).map((day) => {
              const blocks = dashboardAgendaBlocks(calendar, day.date);
              return (
                <section
                  key={day.date}
                  aria-label={day.date}
                  className="min-w-0 rounded-lg border border-[var(--border-subtle)] p-2"
                >
                  <Link
                    href={`/calendar?view=day&date=${day.date}`}
                    className={`text-xs font-semibold ${day.date === today ? "text-[var(--accent-cyan)]" : "text-[var(--text-secondary)]"}`}
                  >
                    {new Date(`${day.date}T12:00:00Z`).toLocaleDateString(
                      "de-DE",
                      {
                        day: "numeric",
                        month: activeView === "Week" ? "short" : undefined,
                        weekday: "short",
                        timeZone: "UTC",
                      },
                    )}
                  </Link>
                  <div className="mt-2 space-y-1">
                    {blocks.map((block) => (
                      <Link
                        key={block.id}
                        href={
                          block.sourceEntity.href ??
                          `/calendar?view=day&date=${day.date}`
                        }
                        title={block.title}
                        className="line-clamp-2 break-words rounded border-l-2 border-[var(--accent-blue)] bg-[var(--surface-2)] p-1 text-[10px] text-[var(--text-secondary)]"
                      >
                        {"startTime" in block ? `${block.startTime} · ` : ""}
                        {block.title}
                      </Link>
                    ))}
                    {!blocks.length && (
                      <p className="text-[10px] text-[var(--text-muted)]">—</p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

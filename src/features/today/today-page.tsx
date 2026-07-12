import type { ReactNode } from "react";
import Link from "next/link";
import { Pill, accentStyle } from "@/components/layout/route-page-primitives";
import type { ContentStateMeta } from "@/features/content-state";
import {
  completeTaskFormAction,
  reopenTaskFormAction,
  scheduleTaskForTodayFormAction,
} from "@/features/real-data/actions/task.actions";
import {
  generateRecurringTaskInstancesForRangeTodayFormAction,
  generateRecurringTaskInstancesForTodayFormAction,
} from "@/features/real-data/actions/recurring-task-generation.actions";
import {
  createRecurringTaskTemplateTodayFormAction,
  deactivateRecurringTaskTemplateTodayFormAction,
  reactivateRecurringTaskTemplateTodayFormAction,
  updateRecurringTaskTemplateTodayFormAction,
} from "@/features/real-data/actions/recurring-task-template.actions";
import { cn } from "@/lib/cn";
import type {
  TodayActivityEventViewModel,
  TodayActivityStatus,
  TodayArtifactViewModel,
  TodayCarryForwardItemViewModel,
  TodayDecisionViewModel,
  TodayDeltaMetricViewModel,
  TodayReviewSignalViewModel,
  TodayLinkedEntityType,
  TodayPlannerTaskViewModel,
  TodayViewModel,
} from "./today-view-model";

export type TodayRecurringFeedback = {
  generation?: "blocked" | "error" | "generated" | "idle";
  template?:
    | "activated"
    | "blocked"
    | "created"
    | "error"
    | "paused"
    | "updated";
};

function contentStateAttributes(
  meta: ContentStateMeta,
  profileId: TodayViewModel["profileId"],
) {
  return {
    "data-capacity": meta.capacity?.toString(),
    "data-content-state": meta.state,
    "data-item-count": meta.itemCount.toString(),
    "data-profile-id": profileId,
  };
}

function titleId(title: string) {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-section`;
}

function EmptyStateBlock({
  className,
  description,
  title,
}: Readonly<{
  className?: string;
  description: string;
  title: string;
}>) {
  return (
    <div
      className={cn(
        "rounded-[10px] border border-dashed border-[var(--border-subtle)] bg-[rgba(168,183,204,.035)] px-3 py-4",
        className,
      )}
    >
      <p className="text-[12px] font-semibold leading-4 text-[var(--text-primary)]">
        {title}
      </p>
      <p className="mt-1 text-[10px] leading-4 text-[var(--text-secondary)]">
        {description}
      </p>
    </div>
  );
}

function MemoryPanel({
  title,
  subtitle,
  accent,
  contentState,
  className,
  contentClassName,
  children,
  profileId,
  todaySection,
}: Readonly<{
  title: string;
  subtitle: string;
  accent: string;
  contentState: ContentStateMeta;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
  profileId: TodayViewModel["profileId"];
  todaySection: string;
}>) {
  const id = titleId(title);

  return (
    <section
      aria-labelledby={id}
      className={cn(
        "overflow-hidden rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-1)] shadow-[0_6px_16px_rgba(0,0,0,.10)]",
        className,
      )}
      data-today-section={todaySection}
      {...contentStateAttributes(contentState, profileId)}
      style={accentStyle(accent)}
    >
      <div className="border-b border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--accent)_5%,rgba(14,23,38,.84))] px-4 py-3">
        <h2
          className="text-[15px] font-semibold leading-5 text-[var(--text-primary)]"
          id={id}
        >
          {title}
        </h2>
        <p className="mt-0.5 text-[10px] font-medium leading-4 text-[var(--text-muted)]">
          {subtitle}
        </p>
      </div>
      <div className={cn("p-3", contentClassName)}>{children}</div>
    </section>
  );
}

function TodayHeader({
  viewModel,
}: Readonly<{
  viewModel: TodayViewModel;
}>) {
  const { header } = viewModel;

  return (
    <header
      className="rounded-[16px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--accent-purple)_5%,var(--surface-1))] px-4 py-3 shadow-[0_6px_16px_rgba(0,0,0,.10)] sm:px-5"
      data-today-section="header"
      {...contentStateAttributes(
        viewModel.contentStates.header,
        viewModel.profileId,
      )}
    >
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(330px,auto)] xl:items-center">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {header.eyebrow}
          </p>
          <h1 className="mt-1 text-[28px] font-semibold leading-none text-[var(--text-primary)] sm:text-[30px]">
            {header.title}
          </h1>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-[var(--text-secondary)]">
            {header.summary}
          </p>
          <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
            Today records day evidence; Dashboard stays the cockpit.
          </p>
          {viewModel.firstRunNotice ? (
            <div className="mt-3 max-w-xl rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.42)] px-3 py-2">
              <p className="text-[11px] font-semibold text-[var(--text-primary)]">
                {viewModel.firstRunNotice.title}
              </p>
              <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-secondary)]">
                {viewModel.firstRunNotice.description}
              </p>
            </div>
          ) : null}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-medium text-[var(--text-secondary)]">
            {header.dateLabel}
          </p>
          <div
            aria-label="Today memory log status"
            className="mt-2 flex flex-wrap gap-1.5"
          >
            {header.statusPills.map((pill, index) => (
              <Pill accent={pill.accent} key={`today-status-pill-${index}`}>
                {pill.label}
              </Pill>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

function ActivityStream({
  emptyState,
  events,
  recurringFeedback,
  planner,
  plannerContentState,
  profileId,
  recurringGeneration,
}: Readonly<{
  emptyState: TodayViewModel["activityStream"]["emptyState"];
  events: TodayActivityEventViewModel[];
  recurringFeedback?: TodayRecurringFeedback;
  planner: TodayViewModel["todayPlanner"];
  plannerContentState: ContentStateMeta;
  profileId: TodayViewModel["profileId"];
  recurringGeneration: TodayViewModel["recurringGeneration"];
}>) {
  return (
    <div className="flex h-full min-h-0 flex-col 2xl:overflow-y-auto 2xl:pr-1">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.46)] px-3 py-2">
        <p className="text-[10px] font-semibold text-[var(--text-secondary)]">
          Chronological day record
        </p>
        <Pill accent="var(--accent-cyan)">{events.length} events</Pill>
      </div>

      <TodayPlannerQueue
        contentState={plannerContentState}
        planner={planner}
        profileId={profileId}
        recurringFeedback={recurringFeedback}
        recurringGeneration={recurringGeneration}
      />

      {events.length > 0 ? (
        <ol className="relative mt-3 grid gap-2.5 before:absolute before:bottom-2 before:left-[3.55rem] before:top-2 before:w-px before:bg-[var(--border-subtle)]">
          {events.map((event) => (
            <li
              className="relative grid grid-cols-[48px_minmax(0,1fr)] gap-3"
              key={event.id}
            >
              <time
                className="z-10 mt-2 text-right text-[10px] font-semibold leading-4 text-[var(--text-secondary)]"
                dateTime={event.dateTime}
              >
                {event.timeLabel}
              </time>
              <span
                aria-hidden="true"
                className={cn(
                  "absolute left-[3.35rem] top-4 z-10 size-1.5 rounded-full border border-[var(--surface-1)] bg-[var(--text-muted)]",
                  event.status === "current" &&
                    "bg-[var(--accent-purple)] shadow-[0_0_0_3px_rgba(155,124,246,.12)]",
                  (event.status === "shifted" ||
                    event.status === "needs_review") &&
                    "bg-[var(--accent-orange)]",
                  (event.status === "completed" || event.status === "logged") &&
                    "bg-[var(--text-faint)]",
                )}
              />
              <ActivityEventCard event={event} profileId={profileId} />
            </li>
          ))}
        </ol>
      ) : (
        <EmptyStateBlock
          className="mt-3"
          description={emptyState.description}
          title={emptyState.title}
        />
      )}

      <div className="mt-auto rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.62)] px-3 py-2">
        <p className="text-[10px] font-semibold text-[var(--text-secondary)]">
          End of day record
        </p>
        <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-muted)]">
          Planned, current and logged items stay in one timeline; carry-forward
          stays in the right column.
        </p>
      </div>
    </div>
  );
}

function durationLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
}

function RecurringFeedbackMessage({
  feedback,
}: Readonly<{
  feedback?: TodayRecurringFeedback;
}>) {
  const messages = [
    feedback?.template === "created"
      ? "Wiederkehrende Vorlage erstellt."
      : null,
    feedback?.template === "updated"
      ? "Wiederkehrende Vorlage aktualisiert. Bereits erzeugte Aufgaben bleiben unverändert."
      : null,
    feedback?.template === "paused" ? "Wiederkehrende Vorlage pausiert." : null,
    feedback?.template === "activated"
      ? "Wiederkehrende Vorlage reaktiviert."
      : null,
    feedback?.template === "blocked"
      ? "Melde dich an, um wiederkehrende Vorlagen zu erstellen."
      : null,
    feedback?.template === "error"
      ? "Wiederkehrende Vorlage konnte nicht erstellt werden."
      : null,
    feedback?.generation === "generated"
      ? "Wiederkehrende Aufgaben erzeugt."
      : null,
    feedback?.generation === "idle"
      ? "Keine neuen wiederkehrenden Aufgaben fällig."
      : null,
    feedback?.generation === "blocked"
      ? "Melde dich an, um wiederkehrende Aufgaben zu erzeugen."
      : null,
    feedback?.generation === "error"
      ? "Wiederkehrende Aufgaben konnten nicht erzeugt werden."
      : null,
  ].filter((message): message is string => Boolean(message));

  if (messages.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="mt-2 rounded-[9px] border border-[rgba(66,184,131,.24)] bg-[rgba(66,184,131,.08)] px-3 py-2 text-[10px] font-semibold leading-4 text-[var(--text-secondary)]"
    >
      {messages.map((message) => (
        <p key={message}>{message}</p>
      ))}
    </div>
  );
}

const weekdayOptions = [
  ["1", "Mo"],
  ["2", "Di"],
  ["3", "Mi"],
  ["4", "Do"],
  ["5", "Fr"],
  ["6", "Sa"],
  ["7", "So"],
] as const;

function RecurringGenerationControl({
  feedback,
  recurringGeneration,
}: Readonly<{
  feedback?: TodayRecurringFeedback;
  recurringGeneration: TodayViewModel["recurringGeneration"];
}>) {
  if (!recurringGeneration.enabled) return null;

  const inputClass =
    "min-h-8 rounded-[9px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.76)] px-2.5 text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--focus-ring)]";
  const labelClass =
    "grid gap-1 text-[10px] font-semibold text-[var(--text-muted)]";

  return (
    <div
      className="mt-2 rounded-[10px] border border-[rgba(95,200,215,.18)] bg-[rgba(18,28,43,.50)] p-2.5"
      data-today-section="recurring-generation"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-[var(--text-primary)]">
            Wiederkehrende Aufgaben
          </p>
          <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-muted)]">
            {recurringGeneration.today}
          </p>
        </div>
        <form action={generateRecurringTaskInstancesForTodayFormAction}>
          <input name="date" type="hidden" value={recurringGeneration.today} />
          <button
            className="min-h-8 rounded-full border border-[rgba(95,200,215,.34)] bg-[rgba(95,200,215,.14)] px-3 text-[10px] font-semibold text-[var(--text-primary)] transition hover:border-[rgba(95,200,215,.48)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
            type="submit"
          >
            Wiederkehrende Aufgaben für heute erzeugen
          </button>
        </form>
      </div>

      <RecurringFeedbackMessage feedback={feedback} />

      <form
        action={generateRecurringTaskInstancesForRangeTodayFormAction}
        className="mt-2 grid gap-2 rounded-[9px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.42)] p-2.5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        data-recurring-section="range-generation"
      >
        <label className={labelClass}>
          Von
          <input
            className={inputClass}
            defaultValue={recurringGeneration.today}
            name="startDate"
            required
            type="date"
          />
        </label>
        <label className={labelClass}>
          Bis (max. 31 Tage)
          <input
            className={inputClass}
            defaultValue={recurringGeneration.today}
            name="endDate"
            required
            type="date"
          />
        </label>
        <button
          className="min-h-8 rounded-full border border-[rgba(95,200,215,.34)] bg-[rgba(95,200,215,.10)] px-3 text-[10px] font-semibold text-[var(--text-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
          type="submit"
        >
          Zeitraum explizit erzeugen
        </button>
      </form>

      <details
        className="mt-2 rounded-[9px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.42)] px-2.5 py-2"
        data-today-section="recurring-template-setup"
      >
        <summary className="cursor-pointer text-[10px] font-semibold text-[var(--text-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]">
          Wiederkehrende Vorlage
        </summary>
        <form
          action={createRecurringTaskTemplateTodayFormAction}
          className="mt-2 grid gap-2"
        >
          <input name="timezone" type="hidden" value="Europe/Berlin" />
          <input name="isActive" type="hidden" value="true" />

          <label className="grid gap-1 text-[10px] font-semibold text-[var(--text-muted)]">
            Title
            <input className={inputClass} name="title" required type="text" />
          </label>

          <div className="grid gap-2 sm:grid-cols-3">
            <label className="grid gap-1 text-[10px] font-semibold text-[var(--text-muted)]">
              Frequency
              <select
                className={inputClass}
                defaultValue="daily"
                name="frequency"
              >
                <option value="daily">daily</option>
                <option value="weekly">weekly</option>
              </select>
            </label>
            <label className={labelClass}>
              Intervall
              <input
                className={inputClass}
                defaultValue="1"
                max="366"
                min="1"
                name="interval"
                required
                type="number"
              />
            </label>
            <label className="grid gap-1 text-[10px] font-semibold text-[var(--text-muted)]">
              Duration
              <input
                className={inputClass}
                min="5"
                name="durationMinutes"
                placeholder="15"
                type="number"
              />
            </label>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className={labelClass}>
              Startdatum
              <input
                className={inputClass}
                defaultValue={recurringGeneration.today}
                name="startsOn"
                required
                type="date"
              />
            </label>
            <label className={labelClass}>
              Optionales Enddatum
              <input className={inputClass} name="endsOn" type="date" />
            </label>
            <label className={labelClass}>
              Priorität
              <select
                className={inputClass}
                defaultValue="none"
                name="priority"
              >
                <option value="none">Keine</option>
                <option value="P0">P0</option>
                <option value="P1">P1</option>
                <option value="P2">P2</option>
                <option value="P3">P3</option>
              </select>
            </label>
            <label className={labelClass}>
              Energie
              <select className={inputClass} defaultValue="" name="energy">
                <option value="">Nicht gesetzt</option>
                <option value="low">Niedrig</option>
                <option value="medium">Mittel</option>
                <option value="high">Hoch</option>
              </select>
            </label>
          </div>
          <label className={labelClass}>
            Beschreibung
            <textarea
              className={`${inputClass} min-h-16 py-2`}
              name="description"
            />
          </label>
          <label className={labelClass}>
            Nächste Aktion
            <input className={inputClass} name="nextAction" type="text" />
          </label>

          <fieldset className="rounded-[9px] border border-[var(--border-subtle)] px-2 py-1.5">
            <legend className="px-1 text-[10px] font-semibold text-[var(--text-muted)]">
              Weekdays
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {weekdayOptions.map(([value, label]) => (
                <label
                  className="inline-flex min-h-7 items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[rgba(168,183,204,.05)] px-2 text-[10px] font-semibold text-[var(--text-secondary)]"
                  key={value}
                >
                  <input
                    className="size-3 accent-[var(--accent-cyan)]"
                    name="byWeekday"
                    type="checkbox"
                    value={value}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <button
            className="justify-self-end min-h-8 rounded-full border border-[rgba(66,184,131,.30)] bg-[rgba(66,184,131,.12)] px-3 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[rgba(66,184,131,.46)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
            type="submit"
          >
            Create template
          </button>
        </form>
      </details>

      <div className="mt-2 grid gap-2" data-recurring-section="template-list">
        {recurringGeneration.templates.length === 0 ? (
          <p className="rounded-[9px] border border-dashed border-[var(--border-subtle)] px-3 py-2 text-[10px] text-[var(--text-muted)]">
            Noch keine wiederkehrenden Vorlagen. Erstellen erzeugt noch keine
            Aufgaben.
          </p>
        ) : (
          recurringGeneration.templates.map((template) => (
            <details
              className="rounded-[9px] border border-[var(--border-subtle)] bg-[rgba(11,17,28,.42)] px-2.5 py-2"
              data-recurring-template-id={template.id}
              key={template.id}
            >
              <summary className="cursor-pointer text-[10px] font-semibold text-[var(--text-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]">
                {template.title} · {template.isActive ? "Aktiv" : "Pausiert"} ·{" "}
                {template.frequency === "daily" ? "Täglich" : "Wöchentlich"}
              </summary>
              <form
                action={updateRecurringTaskTemplateTodayFormAction}
                className="mt-2 grid gap-2"
              >
                <input name="templateId" type="hidden" value={template.id} />
                <input
                  name="timezone"
                  type="hidden"
                  value={template.timezone}
                />
                <label className={labelClass}>
                  Titel
                  <input
                    className={inputClass}
                    defaultValue={template.title}
                    name="title"
                    required
                    type="text"
                  />
                </label>
                <div className="grid gap-2 sm:grid-cols-3">
                  <label className={labelClass}>
                    Frequenz
                    <select
                      className={inputClass}
                      defaultValue={template.frequency}
                      name="frequency"
                    >
                      <option value="daily">Täglich</option>
                      <option value="weekly">Wöchentlich</option>
                    </select>
                  </label>
                  <label className={labelClass}>
                    Intervall
                    <input
                      className={inputClass}
                      defaultValue={template.interval}
                      max="366"
                      min="1"
                      name="interval"
                      required
                      type="number"
                    />
                  </label>
                  <label className={labelClass}>
                    Standarddauer
                    <input
                      className={inputClass}
                      defaultValue={template.durationMinutes ?? ""}
                      min="5"
                      name="durationMinutes"
                      type="number"
                    />
                  </label>
                </div>
                <fieldset className="rounded-[9px] border border-[var(--border-subtle)] px-2 py-1.5">
                  <legend className="px-1 text-[10px] font-semibold text-[var(--text-muted)]">
                    Wochentage
                  </legend>
                  <div className="flex flex-wrap gap-1.5">
                    {weekdayOptions.map(([value, label]) => (
                      <label
                        className="inline-flex min-h-7 items-center gap-1 rounded-full border border-[var(--border-subtle)] px-2 text-[10px]"
                        key={value}
                      >
                        <input
                          defaultChecked={template.byWeekday.includes(
                            Number(value),
                          )}
                          name="byWeekday"
                          type="checkbox"
                          value={value}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className={labelClass}>
                    Startdatum
                    <input
                      className={inputClass}
                      defaultValue={template.startsOn}
                      name="startsOn"
                      required
                      type="date"
                    />
                  </label>
                  <label className={labelClass}>
                    Optionales Enddatum
                    <input
                      className={inputClass}
                      defaultValue={template.endsOn ?? ""}
                      name="endsOn"
                      type="date"
                    />
                  </label>
                  <label className={labelClass}>
                    Priorität
                    <select
                      className={inputClass}
                      defaultValue={template.priority ?? "none"}
                      name="priority"
                    >
                      <option value="none">Keine</option>
                      <option value="P0">P0</option>
                      <option value="P1">P1</option>
                      <option value="P2">P2</option>
                      <option value="P3">P3</option>
                    </select>
                  </label>
                  <label className={labelClass}>
                    Energie
                    <select
                      className={inputClass}
                      defaultValue={template.energy ?? ""}
                      name="energy"
                    >
                      <option value="">Nicht gesetzt</option>
                      <option value="low">Niedrig</option>
                      <option value="medium">Mittel</option>
                      <option value="high">Hoch</option>
                    </select>
                  </label>
                </div>
                <label className={labelClass}>
                  Beschreibung
                  <textarea
                    className={`${inputClass} min-h-16 py-2`}
                    defaultValue={template.description ?? ""}
                    name="description"
                  />
                </label>
                <label className={labelClass}>
                  Nächste Aktion
                  <input
                    className={inputClass}
                    defaultValue={template.nextAction ?? ""}
                    name="nextAction"
                    type="text"
                  />
                </label>
                <p className="text-[10px] leading-4 text-[var(--text-muted)]">
                  Änderungen gelten nur für künftig erzeugte Instanzen.
                  Bestehende oder bearbeitete Aufgaben werden nicht
                  überschrieben.
                </p>
                <button
                  className="justify-self-end min-h-8 rounded-full border border-[rgba(95,200,215,.34)] px-3 text-[10px] font-semibold"
                  type="submit"
                >
                  Vorlage speichern
                </button>
              </form>
              <form
                action={
                  template.isActive
                    ? deactivateRecurringTaskTemplateTodayFormAction
                    : reactivateRecurringTaskTemplateTodayFormAction
                }
                className="mt-2 flex justify-end"
              >
                <input name="templateId" type="hidden" value={template.id} />
                <button
                  className="min-h-8 rounded-full border border-[var(--border-default)] px-3 text-[10px] font-semibold text-[var(--text-secondary)]"
                  type="submit"
                >
                  {template.isActive
                    ? "Vorlage pausieren"
                    : "Vorlage reaktivieren"}
                </button>
              </form>
            </details>
          ))
        )}
      </div>
    </div>
  );
}

function TodayPlannerQueue({
  contentState,
  planner,
  profileId,
  recurringFeedback,
  recurringGeneration,
}: Readonly<{
  contentState: ContentStateMeta;
  planner: TodayViewModel["todayPlanner"];
  profileId: TodayViewModel["profileId"];
  recurringFeedback?: TodayRecurringFeedback;
  recurringGeneration: TodayViewModel["recurringGeneration"];
}>) {
  return (
    <section
      aria-labelledby="today-planner-heading"
      className="mt-3 rounded-[12px] border border-[rgba(148,163,184,.10)] bg-[rgba(11,17,28,.34)] p-3"
      data-today-section="today-planner"
      {...contentStateAttributes(contentState, profileId)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            className="text-[13px] font-semibold text-[var(--text-primary)]"
            id="today-planner-heading"
          >
            {planner.title}
          </h3>
          <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-muted)]">
            {planner.subtitle}
          </p>
        </div>
        <Pill quiet>{planner.tasks.length}</Pill>
      </div>

      <RecurringGenerationControl
        feedback={recurringFeedback}
        recurringGeneration={recurringGeneration}
      />

      {planner.tasks.length > 0 ? (
        <div className="mt-2 grid gap-1.5">
          {planner.tasks.map((task) => (
            <TodayPlannerTaskCard
              canPlan={profileId === "manual"}
              key={task.id}
              task={task}
            />
          ))}
        </div>
      ) : (
        <EmptyStateBlock
          className="mt-2"
          description={planner.emptyState.description}
          title={planner.emptyState.title}
        />
      )}
    </section>
  );
}

function TodayPlannerTaskCard({
  canPlan,
  task,
}: Readonly<{
  canPlan: boolean;
  task: TodayPlannerTaskViewModel;
}>) {
  return (
    <article
      className="rounded-[10px] border border-[color-mix(in_srgb,var(--accent)_24%,transparent)] bg-[rgba(18,28,43,.44)] p-2"
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
            {task.priority} · {task.energy ?? "energy offen"} ·{" "}
            {durationLabel(task.durationMinutes)}
          </p>
          <p className="truncate text-[10px] leading-4 text-[var(--text-muted)]">
            {task.contextLabel} · {task.candidateReason}
          </p>
          {task.isGenerated ? (
            <Pill accent="var(--accent-cyan)">Wiederkehrend</Pill>
          ) : null}
        </div>
      </div>

      {canPlan ? (
        <form
          action={scheduleTaskForTodayFormAction}
          aria-label={`${task.title} heute planen`}
          className="mt-2 flex justify-end"
        >
          <input name="taskId" type="hidden" value={task.id} />
          <input name="mode" type="hidden" value="plan" />
          <button
            className="min-h-8 rounded-full border border-[rgba(95,200,215,.34)] bg-[rgba(95,200,215,.14)] px-3 text-[10px] font-semibold text-[var(--text-primary)] transition hover:border-[rgba(95,200,215,.48)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
            type="submit"
          >
            Heute planen
          </button>
        </form>
      ) : (
        <p className="mt-2 text-[10px] leading-4 text-[var(--text-muted)]">
          Demo-/Empty-Profil. Persistente Tagesplanung ist im Manual-Profil
          aktiv.
        </p>
      )}
    </article>
  );
}

const linkedEntityLabels: Record<TodayLinkedEntityType, string> = {
  task: "linked task",
  inbox_item: "linked inbox item",
  project: "linked project",
  note: "linked note",
  resource: "linked resource",
  review: "linked review",
  meal: "linked meal",
};

function linkedEntityLabel(entityType?: TodayLinkedEntityType) {
  return entityType ? linkedEntityLabels[entityType] : "source prepared";
}

function activityCardClass(status: TodayActivityStatus) {
  return cn(
    "block rounded-[10px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.70)] px-3 py-2.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
    status === "current" &&
      "border-[color-mix(in_srgb,var(--accent)_38%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent)_8%,rgba(18,28,43,.86))] shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_18%,transparent)]",
    (status === "completed" || status === "logged") &&
      "bg-[rgba(15,23,36,.50)] text-[var(--text-secondary)]",
    (status === "shifted" || status === "needs_review") &&
      "border-[color-mix(in_srgb,var(--accent-orange)_32%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--accent-orange)_6%,rgba(18,28,43,.78))]",
    status === "shifted" && "border-dashed",
  );
}

function statusAccent(status: TodayActivityStatus, fallbackAccent: string) {
  if (status === "current") {
    return "var(--accent-purple)";
  }

  if (status === "shifted" || status === "needs_review") {
    return "var(--accent-orange)";
  }

  if (status === "completed" || status === "logged") {
    return "var(--text-muted)";
  }

  return fallbackAccent;
}

function ActivitySourceActionLabel({
  event,
}: Readonly<{
  event: TodayActivityEventViewModel;
}>) {
  return (
    <span
      className="inline-flex items-center rounded-full border border-[var(--border-subtle)] bg-[rgba(168,183,204,.05)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]"
      style={accentStyle(event.accent)}
    >
      {event.sourceActionLabel}
    </span>
  );
}

function TaskActivityActions({
  event,
  profileId,
}: Readonly<{
  event: TodayActivityEventViewModel;
  profileId: TodayViewModel["profileId"];
}>) {
  if (profileId !== "manual" || !event.taskLifecycle) return null;

  const isCompleted = event.taskLifecycle.status === "completed";

  return (
    <form
      action={isCompleted ? reopenTaskFormAction : completeTaskFormAction}
      aria-label={
        isCompleted
          ? `${event.title} wieder öffnen`
          : `${event.title} abschließen`
      }
    >
      <input name="taskId" type="hidden" value={event.taskLifecycle.taskId} />
      <button
        className="inline-flex min-h-7 items-center rounded-full border border-[rgba(66,184,131,.30)] bg-[rgba(66,184,131,.12)] px-2.5 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[rgba(66,184,131,.46)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
        type="submit"
      >
        {isCompleted ? "Wieder öffnen" : "Abschließen"}
      </button>
    </form>
  );
}

function ActivityEventCardContent({
  event,
  profileId,
}: Readonly<{
  event: TodayActivityEventViewModel;
  profileId: TodayViewModel["profileId"];
}>) {
  return (
    <div className="grid grid-cols-[3px_minmax(0,1fr)] gap-3">
      <span
        aria-hidden="true"
        className={cn(
          "h-full min-h-20 rounded-full bg-[var(--accent)] opacity-70",
          event.status === "current" && "opacity-100",
          (event.status === "completed" || event.status === "logged") &&
            "opacity-35",
        )}
      />

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <Pill accent={event.accent}>{event.eventTypeLabel}</Pill>
          {event.isGenerated ? (
            <Pill accent="var(--accent-cyan)">Wiederkehrend</Pill>
          ) : null}
          <Pill accent={statusAccent(event.status, event.accent)}>
            {event.statusLabel}
          </Pill>
        </div>

        <h3
          className={cn(
            "mt-2 text-[13px] font-semibold leading-4 text-[var(--text-primary)]",
            (event.status === "completed" || event.status === "logged") &&
              "text-[var(--text-secondary)]",
          )}
        >
          {event.title}
        </h3>
        <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
          {event.description}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] leading-4 text-[var(--text-muted)]">
          <span>{event.sourceLabel}</span>
          {event.areaLabel ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{event.areaLabel}</span>
            </>
          ) : null}
          <span aria-hidden="true">·</span>
          <span>{linkedEntityLabel(event.linkedEntityType)}</span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {event.sourceHref ? (
            <Link
              className="inline-flex min-h-7 items-center rounded-full border border-[var(--border-subtle)] bg-[rgba(168,183,204,.05)] px-2.5 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-default)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
              href={event.sourceHref}
            >
              {event.sourceActionLabel}
            </Link>
          ) : (
            <ActivitySourceActionLabel event={event} />
          )}
          <TaskActivityActions event={event} profileId={profileId} />
        </div>
      </div>
    </div>
  );
}

function ActivityEventCard({
  event,
  profileId,
}: Readonly<{
  event: TodayActivityEventViewModel;
  profileId: TodayViewModel["profileId"];
}>) {
  const className = activityCardClass(event.status);
  const style = accentStyle(event.accent);

  return (
    <article className={className} style={style}>
      <ActivityEventCardContent event={event} profileId={profileId} />
    </article>
  );
}

function DeltaSummary({
  metrics,
}: Readonly<{
  metrics: TodayDeltaMetricViewModel[];
}>) {
  return (
    <div className="flex h-full flex-col gap-2">
      {metrics.map((metric, index) => (
        <article
          className="grid min-h-10 grid-cols-[48px_minmax(0,1fr)] items-center gap-x-3 rounded-[8px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.28)] px-2.5 py-1.5 sm:grid-cols-[52px_minmax(0,1fr)_minmax(112px,max-content)]"
          key={`today-delta-metric-${index}`}
          style={accentStyle(metric.accent)}
        >
          <div className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden="true"
              className="size-1.5 shrink-0 rounded-full bg-[var(--accent)]"
            />
            <p className="truncate text-[14px] font-semibold leading-4 text-[var(--text-primary)]">
              {metric.value}
            </p>
          </div>
          <h3 className="truncate text-[11px] font-semibold leading-4 text-[var(--text-secondary)]">
            {metric.label}
          </h3>
          <p className="col-start-2 truncate text-[10px] leading-4 text-[var(--text-muted)] sm:col-start-auto sm:text-right">
            {metric.detail}
          </p>
        </article>
      ))}
      <p className="mt-auto rounded-[8px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.46)] px-2.5 py-2 text-[10px] leading-4 text-[var(--text-muted)]">
        Change ledger only. Domain data stays canonical.
      </p>
    </div>
  );
}

function DecisionRows({
  decisions,
  emptyState,
}: Readonly<{
  decisions: TodayDecisionViewModel[];
  emptyState: TodayViewModel["decisionsLedger"]["emptyState"];
}>) {
  if (decisions.length === 0) {
    return (
      <EmptyStateBlock
        description={emptyState.description}
        title={emptyState.title}
      />
    );
  }

  return (
    <div className="space-y-1.5">
      {decisions.map((decision, index) => (
        <article
          className="grid min-h-[46px] grid-cols-[3px_minmax(0,1fr)] gap-2.5 rounded-[8px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.38)] px-2.5 py-2"
          key={`today-decision-${index}`}
          style={accentStyle(decision.accent)}
        >
          <span
            aria-hidden="true"
            className="h-full min-h-8 rounded-full bg-[var(--accent)]"
          />
          <div className="min-w-0">
            <div className="flex min-w-0 items-baseline gap-2">
              <p className="shrink-0 text-[10px] font-semibold text-[var(--text-primary)]">
                {decision.label}
              </p>
              <h3 className="truncate text-[11px] font-medium text-[var(--text-secondary)]">
                {decision.title}
              </h3>
            </div>
            <p className="mt-0.5 truncate text-[10px] leading-4 text-[var(--text-muted)]">
              {decision.description}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}

function HandoffRows({
  emptyState,
  items,
}: Readonly<{
  emptyState: TodayViewModel["carryForward"]["emptyState"];
  items: TodayCarryForwardItemViewModel[];
}>) {
  if (items.length === 0) {
    return (
      <EmptyStateBlock
        description={emptyState.description}
        title={emptyState.title}
      />
    );
  }

  return (
    <div className="space-y-1.5">
      {items.map((item, index) => (
        <article
          className="grid min-h-[46px] grid-cols-[8px_minmax(0,1fr)] gap-2.5 rounded-[8px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.38)] px-2.5 py-2"
          key={`today-recap-${index}`}
          style={accentStyle(item.accent)}
        >
          <span
            aria-hidden="true"
            className="mt-1.5 size-2 rounded-full bg-[var(--accent)]"
          />
          <div className="min-w-0">
            <h3 className="text-[11px] font-semibold text-[var(--text-primary)]">
              {item.label}
            </h3>
            <p className="mt-0.5 truncate text-[10px] leading-4 text-[var(--text-muted)]">
              {item.description}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}

function ReviewSignalGrid({
  items,
  className,
}: Readonly<{
  items: TodayReviewSignalViewModel[];
  className?: string;
}>) {
  return (
    <div className={cn("grid content-start gap-2 sm:grid-cols-2", className)}>
      {items.map((item, index) => (
        <article
          className="min-h-[52px] rounded-[8px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.34)] px-3 py-2"
          key={`today-review-signal-${index}`}
          style={accentStyle(item.accent)}
        >
          <div className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden="true"
              className="size-1.5 shrink-0 rounded-full bg-[var(--accent)]"
            />
            <p className="truncate text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
              {item.label}
            </p>
          </div>
          <p className="mt-1 truncate text-[12px] font-semibold leading-4 text-[var(--text-primary)]">
            {item.value}
          </p>
          <p className="truncate text-[10px] leading-4 text-[var(--text-muted)]">
            {item.detail}
          </p>
        </article>
      ))}
    </div>
  );
}

function ArtifactRows({
  artifacts,
  emptyState,
}: Readonly<{
  artifacts: TodayArtifactViewModel[];
  emptyState: TodayViewModel["evidenceArtifacts"]["emptyState"];
}>) {
  if (artifacts.length === 0) {
    return (
      <EmptyStateBlock
        description={emptyState.description}
        title={emptyState.title}
      />
    );
  }

  return (
    <div className="space-y-1.5">
      {artifacts.map((artifact) => (
        <article
          className="grid min-h-10 grid-cols-[8px_76px_minmax(0,1fr)] items-center gap-2 rounded-[8px] border border-[var(--border-subtle)] bg-[rgba(18,28,43,.38)] px-2.5 py-1.5"
          key={`${artifact.type}-${artifact.title}`}
          style={accentStyle(artifact.accent)}
        >
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-[var(--accent)]"
          />
          <p className="truncate text-[10px] font-semibold leading-4 text-[var(--text-muted)]">
            {artifact.type}
          </p>
          <div className="min-w-0">
            <h3 className="truncate text-[11px] font-semibold leading-4 text-[var(--text-primary)]">
              {artifact.title}
            </h3>
            <p className="truncate text-[10px] leading-4 text-[var(--text-muted)]">
              {artifact.detail}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}

function DecisionsArtifacts({
  decisions,
  decisionsEmptyState,
  artifacts,
  artifactsEmptyState,
}: Readonly<{
  decisions: TodayDecisionViewModel[];
  decisionsEmptyState: TodayViewModel["decisionsLedger"]["emptyState"];
  artifacts: TodayArtifactViewModel[];
  artifactsEmptyState: TodayViewModel["evidenceArtifacts"]["emptyState"];
}>) {
  return (
    <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,.92fr)_minmax(0,1.08fr)]">
      <section aria-labelledby="decisions-heading" className="min-w-0">
        <div className="flex items-center justify-between gap-3">
          <h3
            className="text-[11px] font-semibold text-[var(--text-secondary)]"
            id="decisions-heading"
          >
            Decisions
          </h3>
          <Pill quiet>{decisions.length} decisions</Pill>
        </div>
        <div className="mt-2">
          <DecisionRows
            decisions={decisions}
            emptyState={decisionsEmptyState}
          />
        </div>
      </section>

      <section aria-labelledby="artifacts-heading" className="min-w-0">
        <div className="flex items-center justify-between gap-3">
          <h3
            className="text-[11px] font-semibold text-[var(--text-secondary)]"
            id="artifacts-heading"
          >
            Artifacts
          </h3>
          <Pill quiet>{artifacts.length} artifacts</Pill>
        </div>
        <div className="mt-2">
          <ArtifactRows
            artifacts={artifacts}
            emptyState={artifactsEmptyState}
          />
        </div>
      </section>
    </div>
  );
}

function ClosingReview({
  signals,
  handoffItems,
  handoffContentState,
  handoffEmptyState,
  firstMove,
  profileId,
}: Readonly<{
  signals: TodayReviewSignalViewModel[];
  handoffItems: TodayCarryForwardItemViewModel[];
  handoffContentState: ContentStateMeta;
  handoffEmptyState: TodayViewModel["carryForward"]["emptyState"];
  firstMove: string;
  profileId: TodayViewModel["profileId"];
}>) {
  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
      <ReviewSignalGrid items={signals} className="xl:grid-cols-2" />

      <div
        className="flex min-h-0 min-w-0 flex-col"
        data-today-section="carry-forward"
        {...contentStateAttributes(handoffContentState, profileId)}
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[11px] font-semibold text-[var(--text-secondary)]">
            Carry Forward
          </h3>
          <Pill quiet>{handoffItems.length} items</Pill>
        </div>
        <div className="mt-2">
          <HandoffRows emptyState={handoffEmptyState} items={handoffItems} />
        </div>
        <div className="mt-auto rounded-[9px] border border-[var(--border-subtle)] bg-[rgba(15,23,36,.72)] px-3 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            First Move
          </p>
          <p className="mt-0.5 text-[10px] font-medium leading-4 text-[var(--text-secondary)]">
            {firstMove}
          </p>
        </div>
      </div>
    </div>
  );
}

export function TodayMemoryLogPage({
  recurringFeedback,
  viewModel,
}: Readonly<{
  recurringFeedback?: TodayRecurringFeedback;
  viewModel: TodayViewModel;
}>) {
  return (
    <div
      className="mx-auto flex w-full max-w-[2208px] flex-col gap-3 pb-0 2xl:h-[calc(100dvh-1.25rem)] 2xl:min-h-0"
      data-today-section="page-root"
      id="today-page"
      {...contentStateAttributes(
        viewModel.contentStates.page,
        viewModel.profileId,
      )}
    >
      <TodayHeader viewModel={viewModel} />

      <div className="grid gap-3 2xl:min-h-0 2xl:flex-1 2xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1.5fr)]">
        <MemoryPanel
          accent="var(--accent-cyan)"
          className="2xl:flex 2xl:min-h-0 2xl:flex-col"
          contentState={viewModel.contentStates.activityStream}
          contentClassName="2xl:flex 2xl:min-h-0 2xl:flex-1 2xl:flex-col"
          profileId={viewModel.profileId}
          subtitle={viewModel.activityStream.subtitle}
          todaySection="activity-stream"
          title={viewModel.activityStream.title}
        >
          <ActivityStream
            emptyState={viewModel.activityStream.emptyState}
            events={viewModel.activityStream.events}
            planner={viewModel.todayPlanner}
            plannerContentState={viewModel.contentStates.todayPlanner}
            profileId={viewModel.profileId}
            recurringFeedback={recurringFeedback}
            recurringGeneration={viewModel.recurringGeneration}
          />
        </MemoryPanel>

        <div className="grid gap-3 2xl:min-h-0 2xl:grid-rows-[auto_minmax(0,.56fr)_minmax(0,.44fr)]">
          <MemoryPanel
            accent="var(--accent-green)"
            contentState={viewModel.contentStates.openingReview}
            profileId={viewModel.profileId}
            subtitle={viewModel.openingReview.subtitle}
            todaySection="opening-review"
            title={viewModel.openingReview.title}
          >
            <ReviewSignalGrid
              className="2xl:grid-cols-3"
              items={viewModel.openingReview.items}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                className="rounded-full border border-[var(--border-default)] px-3 py-1.5 text-[10px] font-semibold text-[var(--text-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                href="/review/daily"
              >
                Open Daily Review
              </Link>
              <Link
                className="rounded-full border border-[var(--border-default)] px-3 py-1.5 text-[10px] font-semibold text-[var(--text-secondary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                href="/review/weekly"
              >
                Open Weekly Review
              </Link>
            </div>
          </MemoryPanel>

          <div className="grid gap-3 2xl:min-h-0 2xl:grid-cols-[minmax(0,.72fr)_minmax(0,1fr)]">
            <MemoryPanel
              accent="var(--accent-blue)"
              className="2xl:flex 2xl:min-h-0 2xl:flex-col"
              contentState={viewModel.contentStates.deltaSummary}
              contentClassName="2xl:flex 2xl:min-h-0 2xl:flex-1 2xl:flex-col"
              profileId={viewModel.profileId}
              subtitle={viewModel.deltaSummary.subtitle}
              todaySection="delta-summary"
              title={viewModel.deltaSummary.title}
            >
              <DeltaSummary metrics={viewModel.deltaSummary.metrics} />
            </MemoryPanel>

            <MemoryPanel
              accent="var(--accent-purple)"
              className="2xl:flex 2xl:min-h-0 2xl:flex-col"
              contentState={viewModel.contentStates.decisionsArtifacts}
              contentClassName="2xl:min-h-0 2xl:flex-1"
              profileId={viewModel.profileId}
              subtitle="Decisions made today and the evidence they produced."
              todaySection="decisions-artifacts"
              title="Decisions & Artifacts"
            >
              <DecisionsArtifacts
                artifacts={viewModel.evidenceArtifacts.artifacts}
                artifactsEmptyState={viewModel.evidenceArtifacts.emptyState}
                decisions={viewModel.decisionsLedger.decisions}
                decisionsEmptyState={viewModel.decisionsLedger.emptyState}
              />
            </MemoryPanel>
          </div>

          <MemoryPanel
            accent="var(--accent-orange)"
            className="2xl:flex 2xl:min-h-0 2xl:flex-col"
            contentState={viewModel.contentStates.closingReview}
            contentClassName="2xl:flex 2xl:min-h-0 2xl:flex-1 2xl:flex-col"
            profileId={viewModel.profileId}
            subtitle={viewModel.closingReview.subtitle}
            todaySection="closing-review"
            title={viewModel.closingReview.title}
          >
            <ClosingReview
              firstMove={viewModel.carryForward.firstMove}
              handoffContentState={viewModel.contentStates.carryForward}
              handoffEmptyState={viewModel.carryForward.emptyState}
              handoffItems={viewModel.carryForward.items}
              profileId={viewModel.profileId}
              signals={viewModel.closingReview.signals}
            />
          </MemoryPanel>
        </div>
      </div>
    </div>
  );
}

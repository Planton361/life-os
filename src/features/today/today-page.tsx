import Link from "next/link";
import type { ReactNode } from "react";
import {
  emptyActivitySources,
  projectTodayActivity,
} from "./activity-projection";
import type { TodayViewModel } from "./today-view-model";

// Compatibility for retained recurrence action callers; Today renders none of these controls.
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
const link =
  "text-xs text-[var(--accent-cyan)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent-cyan)]";
function Panel({
  title,
  section,
  children,
}: {
  title: string;
  section: string;
  children: ReactNode;
}) {
  return (
    <section
      data-today-section={section}
      aria-label={title}
      className="min-w-0 rounded-[var(--panel-radius)] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4"
    >
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}
export function TodayMemoryLogPage({
  viewModel,
}: {
  viewModel: TodayViewModel;
  recurringFeedback?: TodayRecurringFeedback;
}) {
  const log =
    viewModel.dayLog ??
    projectTodayActivity(emptyActivitySources(), "Europe/Berlin");
  const unavailable = viewModel.activityUnavailable;
  const events =
    viewModel.profileId === "demo"
      ? viewModel.activityStream.events.map((event) => ({
          id: event.id,
          at: event.dateTime ?? "",
          time: event.timeLabel,
          kind: event.eventTypeLabel,
          title: event.title,
          context: event.description,
          href: event.sourceHref ?? "",
          accent: "blue",
        }))
      : log.events;
  return (
    <div
      id="today-page"
      data-profile-id={viewModel.profileId}
      className="mx-auto flex w-full max-w-[3200px] flex-col gap-4 pb-4 2xl:h-[calc(100dvh-32px)] 2xl:min-h-0 2xl:pb-0"
    >
      <header className="flex flex-wrap items-end justify-between gap-3 py-2">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[var(--accent-cyan)]">
            Day Memory Log
          </p>
          <h1 className="text-2xl font-semibold">Today</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Tagesprotokoll · vorgesehen, passiert, festgehalten.
          </p>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          {log.day} · {log.timezone}
          {viewModel.profileId === "demo" ? " · Demo-Referenz" : ""}
        </p>
      </header>
      <div className="grid min-h-0 flex-1 gap-4 2xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <section
          aria-label="Activity Stream"
          data-today-section="activity-stream"
          className="flex min-h-0 flex-col rounded-[var(--panel-radius)] border border-[var(--border-subtle)] bg-[var(--surface-1)]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] p-5">
            <div>
              <h2 className="text-lg font-semibold">Activity Stream</h2>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Chronologisch · lokale Uhrzeit
              </p>
            </div>
            <span className="text-xs text-[var(--text-muted)]">
              {unavailable ? "Nicht verfügbar" : `${events.length} Einträge`}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {unavailable ? (
              <p role="status" className="text-sm text-[var(--text-muted)]">
                Tagesdaten nicht verfügbar. Prüfe die Manual-Anmeldung und die
                lokale Datenverbindung.
              </p>
            ) : events.length === 0 ? (
              <div className="p-2">
                <h3 className="text-sm font-medium">
                  Noch keine Aktivität heute.
                </h3>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  Ereignisse erscheinen hier automatisch, wenn du Life OS
                  benutzt.
                </p>
              </div>
            ) : (
              <ol className="space-y-1">
                {events.map((event) => (
                  <li
                    key={event.id}
                    data-event-kind={event.kind}
                    data-event-at={event.at}
                    className="grid grid-cols-[48px_minmax(0,1fr)] gap-3 py-3 sm:grid-cols-[64px_minmax(0,1fr)]"
                  >
                    <time
                      dateTime={event.at || undefined}
                      className="pt-1 text-xs tabular-nums text-[var(--text-secondary)]"
                    >
                      {event.time}
                    </time>
                    <article
                      className="min-w-0 border-l-2 pl-4"
                      style={{ borderColor: `var(--accent-${event.accent})` }}
                    >
                      <p
                        className="text-[10px] font-semibold tracking-wider"
                        style={{ color: `var(--accent-${event.accent})` }}
                      >
                        {event.kind}
                      </p>
                      <h3 className="mt-1 break-words text-sm font-medium">
                        {event.title}
                      </h3>
                      <p className="mt-1 break-words text-xs leading-5 text-[var(--text-muted)]">
                        {event.context}
                      </p>
                      {event.href && (
                        <Link
                          href={event.href}
                          className={`${link} mt-2 inline-block`}
                        >
                          Quelle öffnen
                        </Link>
                      )}
                    </article>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
        <aside
          aria-label="Tageskontext"
          className="flex min-h-0 flex-col gap-3 2xl:overflow-y-auto"
        >
          <Panel title="Opening Context" section="opening-review">
            <p className="text-xs leading-5 text-[var(--text-muted)]">
              {unavailable
                ? "Tageszustand nicht verfügbar."
                : `${log.planned.length} Tasks sind für diesen Tag vorgesehen. Aktueller Tagesstand.`}
            </p>
            {log.planned.length > 0 && (
              <ul className="mt-3 max-h-40 space-y-2 overflow-y-auto">
                {log.planned.map((task) => (
                  <li
                    key={task.id}
                    className="flex items-start justify-between gap-3 text-xs"
                  >
                    <Link
                      href={`/portfolio?view=tasks&selected=${task.id}`}
                      className={`${link} min-w-0 break-words`}
                    >
                      {task.title}
                    </Link>
                    <span className="shrink-0 text-[var(--text-muted)]">
                      {task.status === "done"
                        ? "Done"
                        : task.carriedForward
                          ? "Carried forward"
                          : "Offen"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex gap-4">
              <Link className={link} href="/review/daily">
                Daily Review öffnen
              </Link>
              <Link className={link} href="/review/weekly">
                Weekly Review öffnen
              </Link>
            </div>
          </Panel>
          <Panel title="Delta Summary" section="delta-summary">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              {log.metrics.map((metric) => (
                <div key={metric.label}>
                  <dt className="text-[11px] text-[var(--text-muted)]">
                    {metric.label}
                  </dt>
                  <dd className="mt-1 text-xl font-semibold tabular-nums">
                    {unavailable ? "—" : metric.value}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>
          <Panel title="Decisions & Artifacts" section="decisions-artifacts">
            {log.decisions.length ? (
              <ul className="space-y-2">
                {log.decisions.map((decision) => (
                  <li key={decision.id} className="text-xs">
                    <Link
                      href={`/portfolio?view=tasks&selected=${decision.task_id}`}
                      className={link}
                    >
                      Carry Forward · {decision.target_date}
                    </Link>
                    {decision.note && (
                      <p className="mt-1 text-[var(--text-muted)]">
                        {decision.note}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs leading-5 text-[var(--text-muted)]">
                Keine gespeicherten Carry-Forward-Entscheidungen für diesen Tag.
                Keine zeitlich belegten Artefakte verfügbar.
              </p>
            )}
          </Panel>
          <Panel title="Closing Review / Day Closeout" section="closing-review">
            <p className="text-xs text-[var(--text-secondary)]">
              {log.review
                ? `Daily Review · ${log.review.status}`
                : "Daily Review noch nicht begonnen."}
            </p>
            {log.review?.outcome && (
              <p className="mt-2 text-sm leading-6">{log.review.outcome}</p>
            )}
            {log.review && (
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                {log.review.open_loops.length} gespeicherte Open Loops ·{" "}
                {log.decisions.length} Carry Forward
              </p>
            )}
            <Link className={`${link} mt-3 inline-block`} href="/review/daily">
              Tagesabschluss öffnen
            </Link>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

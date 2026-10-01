import Link from "next/link";
import type { ReactNode } from "react";
import { taskDependencyContext } from "@/features/real-data/domain/task-dependencies";
import type { WorkbenchData } from "@/features/real-data/supabase/repositories/entity-workbench-read";
import {
  ManagementDisclosure,
  ManagementDisclosureGroup,
} from "./management-disclosure";
import { taskGuidance } from "./task-guidance";
import { TaskEditDialog } from "./task-edit-dialog";
import { taskTextFields } from "./task-text";

const taskStatusLabels: Record<string, string> = {
  inbox: "Inbox",
  planned: "Geplant",
  active: "In Arbeit",
  waiting: "Wartend",
  done: "Abgeschlossen",
  canceled: "Abgebrochen",
  someday: "Irgendwann",
  archived: "Archiviert",
};

function localDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeZone: timezone,
  }).format(new Date(value));
}

function localDay(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value + "T12:00:00Z"));
}

function taskLocalDate(value: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: timezone,
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return part("year") + "-" + part("month") + "-" + part("day");
}

function todayInTimezone(timezone: string) {
  return taskLocalDate(new Date().toISOString(), timezone);
}

function localTimeRange(value: string, duration: number | null, timezone: string) {
  const formatter = new Intl.DateTimeFormat("de-DE", {
    timeStyle: "short",
    timeZone: timezone,
  });
  const start = new Date(value);
  if (!duration || duration < 1) return formatter.format(start);
  const end = new Date(start.getTime() + duration * 60_000);
  return formatter.format(start) + "–" + formatter.format(end);
}

function durationLabel(duration: number) {
  return duration === 1 ? "1 Minute" : duration + " Minuten";
}

export function TaskReadView({
  data,
  taskId,
  dependencies,
  milestoneManagement,
  relations,
  steps,
  lifecycle,
  editInitiallyOpen = false,
}: {
  data: WorkbenchData;
  taskId: string;
  dependencies: ReactNode;
  milestoneManagement: ReactNode;
  relations: ReactNode;
  steps: ReactNode;
  lifecycle: ReactNode;
  editInitiallyOpen?: boolean;
}) {
  const task = data.tasks.find((item) => item.id === taskId)!;
  const project = data.projects.find((item) => item.id === task.project_id);
  const directGoal = data.goals.find((item) => item.id === task.goal_id);
  const inheritedGoal = data.goals.find((item) => item.id === project?.goal_id);
  const milestone = project
    ? data.milestones.find(
        (item) =>
          item.id === task.milestone_id && item.project_id === project.id,
      )
    : undefined;
  const dependency = taskDependencyContext(data.dependencyGraph, taskId);
  const text = taskTextFields(task.description);
  const scheduledDate = task.scheduled_start_at
    ? taskLocalDate(task.scheduled_start_at, data.timezone)
    : null;
  const guidance = taskGuidance({
    taskId,
    status: task.archived_at ? "archived" : task.status,
    archived: Boolean(task.archived_at),
    availability: dependency.availability,
    blockerCount: dependency.blockers.length,
    scheduledDate,
    plannedDate: task.planned_date,
    today: todayInTimezone(data.timezone),
    returnHref: project
      ? "/projects/" + project.id
      : directGoal
        ? "/goals/" + directGoal.id
        : inheritedGoal
          ? "/goals/" + inheritedGoal.id
          : "/tasks",
    returnLabel: project
      ? "Zurück zu " + project.title
      : directGoal
        ? "Zum Goal " + directGoal.title
        : inheritedGoal
          ? "Zum Goal " + inheritedGoal.title
          : "Zur Task-Liste",
  });
  const conflictingGoals =
    directGoal && inheritedGoal && directGoal.id !== inheritedGoal.id;

  return (
    <div
      data-task-detail-variant="B"
      className="grid w-full min-w-0 gap-6 px-2 pb-10 md:px-6"
    >
      <header
        aria-label="Aufgabenidentität"
        data-task-order="identity"
        className="grid min-w-0 gap-2"
      >
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap gap-3 text-sm text-[var(--text-muted)]"
        >
          <Link href="/tasks">Tasks</Link>
        </nav>
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Aufgabe
        </p>
        <h1 className="break-words text-3xl font-semibold">{task.title}</h1>
        <div
          aria-label="Task-Status"
          data-task-lifecycle={task.status}
          data-task-readiness={dependency.availability}
          className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--text-secondary)]"
        >
          <span>{taskStatusLabels[task.status] ?? task.status}</span>
          <span>
            {dependency.availability === "READY" ? "Bereit" : "Blockiert"}
          </span>
          {task.priority === "none" ? (
            <span>Ohne Priorität</span>
          ) : (
            <span>{task.priority}</span>
          )}
          <span>Erstellt am {localDate(task.created_at, data.timezone)}</span>
          {task.archived_at && <span>Archiviert</span>}
        </div>
      </header>

      <section
        aria-label="Dein nächster Schritt"
        data-task-order="guidance"
        data-task-guidance={guidance.label}
        className="grid min-w-0 gap-2 border-l-2 border-[var(--accent-cyan)] bg-[rgba(95,200,215,.055)] px-5 py-5 md:px-7"
      >
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-cyan)]">
          Dein nächster Schritt
        </h2>
        <p className="max-w-4xl text-sm text-[var(--text-secondary)]">
          {task.status === "waiting"
            ? "Der Task wartet, auch wenn seine Voraussetzungen erfüllt sein können. Ordne die Wartesituation bei Bedarf neu ein."
            : guidance.body}
        </p>
        <Link
          className="inline-flex min-h-11 w-fit max-w-full items-center justify-center break-words rounded-lg bg-[var(--accent-cyan)] px-4 py-2 text-sm font-semibold text-[var(--bg-app)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
          href={guidance.href}
        >
          {guidance.label}
        </Link>
      </section>

      {(project || milestone || directGoal || inheritedGoal) && (
        <nav
          aria-label="Zusammenhang"
          data-task-order="context"
          data-task-context
          className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-[var(--border-subtle)] pb-4 text-sm"
        >
          {project && (
            <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
              <span className="text-[var(--text-muted)]">Project</span>
              <Link
                className="break-words text-[var(--accent-cyan)] underline underline-offset-2"
                href={"/projects/" + project.id}
              >
                {project.title}
              </Link>
            </span>
          )}
          {milestone && (
            <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
              <span aria-hidden="true" className="text-[var(--text-muted)]">
                /
              </span>
              <span className="text-[var(--text-muted)]">
                {milestone.status === "active" ? "Aktuelle Etappe" : "Etappe"}
              </span>
              <Link
                className="break-words text-[var(--text-secondary)] underline underline-offset-2"
                href={"/projects/" + project!.id}
              >
                {milestone.title}
              </Link>
            </span>
          )}
          {directGoal && (
            <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
              <span aria-hidden="true" className="text-[var(--text-muted)]">
                /
              </span>
              <span className="text-[var(--text-muted)]">
                {conflictingGoals ? "Ziel für diese Aufgabe" : "Ziel"}
              </span>
              <Link
                className="break-words text-[var(--accent-purple)] underline underline-offset-2"
                href={"/goals/" + directGoal.id}
              >
                {directGoal.title}
                {directGoal.archived_at ? " · Archiviert" : ""}
              </Link>
            </span>
          )}
          {inheritedGoal && (!directGoal || conflictingGoals) && (
            <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
              <span aria-hidden="true" className="text-[var(--text-muted)]">
                /
              </span>
              <span className="text-[var(--text-muted)]">
                {conflictingGoals ? "Ziel im Project" : "Ziel"}
              </span>
              <Link
                className="break-words text-[var(--accent-purple)] underline underline-offset-2"
                href={"/goals/" + inheritedGoal.id}
              >
                {inheritedGoal.title}
                {inheritedGoal.archived_at ? " · Archiviert" : ""}
              </Link>
            </span>
          )}
          {conflictingGoals && (
            <span className="basis-full text-sm text-[var(--accent-orange)]">
              Für diese Aufgabe und das Project sind unterschiedliche Ziele
              verknüpft.
            </span>
          )}
        </nav>
      )}

      <section
        id="task-work-content"
        aria-labelledby="task-work-heading"
        data-task-order="work"
        className="grid min-w-0 gap-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-5 md:p-7"
      >
        <div className="grid min-w-0 gap-3">
          <h2 id="task-work-heading" className="text-xl font-semibold">
            Worum geht es?
          </h2>
          <div className="grid min-w-0 gap-2">
            <h3 className="text-sm font-semibold text-[var(--text-secondary)]">
              Beschreibung
            </h3>
            {text.description ? (
              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-[var(--text-secondary)]">
                {text.description}
              </p>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">
                Noch keine Beschreibung.
              </p>
            )}
          </div>
        </div>
        <div className="grid min-w-0 gap-6 border-t border-[var(--border-subtle)] pt-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-8">
          <section aria-label="Arbeitsnotiz" className="grid min-w-0 content-start gap-3">
            <h3 className="font-semibold">Arbeitsnotiz</h3>
            {text.nextAction ? (
              <p className="whitespace-pre-wrap break-words border-l border-[var(--border-default)] pl-3 text-sm leading-6 text-[var(--text-secondary)]">
                {text.nextAction}
              </p>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">
                Noch keine Arbeitsnotiz.
              </p>
            )}
          </section>
          <section
            aria-label="Vorgehen"
            className="grid min-w-0 content-start gap-3 border-t border-[var(--border-subtle)] pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"
          >
            <h3 className="font-semibold">Vorgehen</h3>
            {steps}
          </section>
        </div>
      </section>

      <div
        role="group"
        aria-label="Unterstützende Details"
        data-task-supporting-depth
        className="grid min-w-0 gap-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-5 md:p-7"
      >
        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)] xl:gap-0">
          <section
            id="task-dependencies"
            aria-labelledby="task-prerequisite-heading"
            aria-label="Voraussetzung"
            data-task-order="prerequisite"
            className="grid min-w-0 content-start gap-3 xl:pr-6"
          >
            <h2
              id="task-prerequisite-heading"
              className="text-lg font-semibold"
            >
              Voraussetzung
            </h2>
            {dependencies}
          </section>

          <section
            aria-labelledby="task-planning-heading"
            aria-label="Planung"
            data-task-order="planning"
            className="grid min-w-0 content-start gap-4 border-t border-[var(--border-subtle)] pt-5 xl:ml-6 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0"
          >
            <h2 id="task-planning-heading" className="text-lg font-semibold">
              Planung
            </h2>
            <dl className="grid min-w-0 gap-4">
              <div className="grid gap-1">
                <dt className="text-sm text-[var(--text-muted)]">Geplant</dt>
                <dd className="text-sm">
                  {task.planned_date
                    ? localDay(task.planned_date)
                    : "Kein Tag geplant"}
                </dd>
                <dd className="text-xs text-[var(--text-muted)]">
                  Tagesabsicht
                </dd>
              </div>
              <div className="grid gap-1">
                <dt className="text-sm text-[var(--text-muted)]">Termin</dt>
                <dd className="text-sm">
                  {task.scheduled_start_at
                    ? localDate(task.scheduled_start_at, data.timezone) +
                      " · " +
                      localTimeRange(
                        task.scheduled_start_at,
                        task.duration_minutes,
                        data.timezone,
                      )
                    : "Kein Termin bestätigt"}
                </dd>
                <dd className="text-xs text-[var(--text-muted)]">
                  {task.scheduled_start_at
                    ? (task.duration_minutes
                        ? durationLabel(task.duration_minutes) + " · "
                        : "") + data.timezone
                    : "Der Kalender verwaltet bestätigte Termine."}
                </dd>
                {task.scheduled_start_at && scheduledDate && (
                  <dd>
                    <Link
                      className="inline-flex min-h-10 items-center text-sm text-[var(--accent-cyan)] underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
                      href={
                        "/calendar?" +
                        new URLSearchParams({
                          task: task.id,
                          date: scheduledDate,
                          view: "week",
                        }).toString()
                      }
                    >
                      Termin im Kalender öffnen
                    </Link>
                  </dd>
                )}
              </div>
              <div className="grid gap-1">
                <dt className="text-sm text-[var(--text-muted)]">Deadline</dt>
                <dd className="text-sm">
                  {task.due_at
                    ? localDate(task.due_at, data.timezone)
                    : "Keine Deadline"}
                </dd>
              </div>
            </dl>
          </section>

          <section
            aria-labelledby="task-return-heading"
            aria-label="Zurück zum Zusammenhang"
            data-task-order="return"
            className="grid min-w-0 content-start gap-4 border-t border-[var(--border-subtle)] pt-5 xl:ml-6 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0"
          >
            <h2 id="task-return-heading" className="text-lg font-semibold">
              Zurück zum Zusammenhang
            </h2>
            {(project || directGoal || inheritedGoal) && (
              <nav
                aria-label="Project- und Ziellinks"
                className="grid gap-2 text-sm"
              >
                {project && (
                  <Link
                    className="break-words text-[var(--accent-cyan)] underline underline-offset-2"
                    href={"/projects/" + project.id}
                  >
                    Project öffnen: {project.title}
                  </Link>
                )}
                {directGoal && (
                  <Link
                    className="break-words text-[var(--accent-purple)] underline underline-offset-2"
                    href={"/goals/" + directGoal.id}
                  >
                    Ziel öffnen: {directGoal.title}
                  </Link>
                )}
                {inheritedGoal && (!directGoal || conflictingGoals) && (
                  <Link
                    className="break-words text-[var(--accent-purple)] underline underline-offset-2"
                    href={"/goals/" + inheritedGoal.id}
                  >
                    Ziel öffnen: {inheritedGoal.title}
                  </Link>
                )}
              </nav>
            )}
          </section>
        </div>
        <ManagementDisclosureGroup className="grid gap-3 border-t border-[var(--border-subtle)] pt-3">
          <TaskEditDialog
            data={data}
            taskId={taskId}
            initiallyOpen={editInitiallyOpen}
          />
          {!task.archived_at && (
            <ManagementDisclosure label="Mehr verwalten">
              <ManagementDisclosureGroup className="grid gap-3">
                {milestoneManagement}
                <ManagementDisclosure label="Weitere Beziehungen verwalten">
                  {relations}
                </ManagementDisclosure>
                <ManagementDisclosure label="Status verwalten">
                  {lifecycle}
                </ManagementDisclosure>
              </ManagementDisclosureGroup>
            </ManagementDisclosure>
          )}
        </ManagementDisclosureGroup>
      </div>
    </div>
  );
}

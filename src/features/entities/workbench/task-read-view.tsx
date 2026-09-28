import Link from "next/link";
import type { ReactNode } from "react";
import { taskDependencyContext } from "@/features/real-data/domain/task-dependencies";
import type { WorkbenchData } from "@/features/real-data/supabase/repositories/entity-workbench-read";
import {
  ManagementDisclosure,
  ManagementDisclosureGroup,
} from "./management-disclosure";
import { taskGuidance } from "./task-guidance";
import { taskTextFields } from "./task-text";

const taskStatusLabels: Record<string, string> = {
  inbox: "Inbox",
  planned: "Planned",
  active: "Active / In Progress",
  waiting: "Wartend",
  done: "Completed",
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
  }).format(new Date(`${value}T12:00:00Z`));
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
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function todayInTimezone(timezone: string) {
  return taskLocalDate(new Date().toISOString(), timezone);
}

export function TaskReadView({
  data,
  taskId,
  edit,
  dependencies,
  milestoneManagement,
  relations,
  steps,
  lifecycle,
  editInitiallyOpen = false,
}: {
  data: WorkbenchData;
  taskId: string;
  edit: ReactNode;
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
      ? `/projects/${project.id}`
      : directGoal
        ? `/goals/${directGoal.id}`
        : inheritedGoal
          ? `/goals/${inheritedGoal.id}`
          : "/tasks",
    returnLabel: project
      ? `Zurück zu ${project.title}`
      : directGoal
        ? `Zum Goal ${directGoal.title}`
        : inheritedGoal
          ? `Zum Goal ${inheritedGoal.title}`
          : "Zur Task-Liste",
  });
  const conflictingGoals =
    directGoal && inheritedGoal && directGoal.id !== inheritedGoal.id;

  return (
    <div
      data-task-detail-variant="B"
      className="mx-auto grid w-full max-w-[1280px] min-w-0 gap-6 px-2 pb-10 md:px-6"
    >
      <header
        aria-label="Task Identity"
        role="region"
        className="grid min-w-0 gap-3"
      >
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap gap-3 text-sm text-[var(--text-muted)]"
        >
          <Link href="/tasks">Tasks</Link>
          {project && (
            <>
              <span>/</span>
              <Link href={`/projects/${project.id}`}>{project.title}</Link>
            </>
          )}
        </nav>
        <h1 className="break-words text-3xl font-semibold">{task.title}</h1>
        <div
          aria-label="Lifecycle und Readiness"
          className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--text-secondary)]"
        >
          <span>Lifecycle: {taskStatusLabels[task.status] ?? task.status}</span>
          <span>Dependency Readiness: {dependency.availability}</span>
          <span>Priority: {task.priority}</span>
          {task.archived_at && <span>Archiviert</span>}
        </div>
      </header>

      <section
        aria-label="Dein nächster Schritt"
        data-task-guidance={guidance.label}
        className="grid gap-2 border-l-2 border-[var(--accent-cyan)] bg-[rgba(95,200,215,.055)] px-4 py-3"
      >
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-cyan)]">
          Dein nächster Schritt
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">{guidance.body}</p>
        <Link
          className="min-h-10 w-fit content-center break-words font-semibold text-[var(--accent-cyan)] underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
          href={guidance.href}
        >
          {guidance.label}
        </Link>
      </section>

      <section
        aria-label="Project und Goal Kontext"
        className="grid min-w-0 gap-3 rounded-xl border border-[var(--border-subtle)] p-4"
      >
        <h2 className="text-base font-semibold">Project / Goal Context</h2>
        {project ? (
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">Project</h3>
            <Link
              className="break-words text-sm text-[var(--accent-cyan)] underline underline-offset-2"
              href={`/projects/${project.id}`}
            >
              {project.title}
            </Link>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Project Milestone:{" "}
              {data.milestones.find(
                (item) =>
                  item.id === task.milestone_id &&
                  item.project_id === project.id,
              )?.title ?? "Ohne Milestone"}
            </p>
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">Kein Project.</p>
        )}
        {directGoal && (
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">
              {conflictingGoals ? "Direktes Goal" : "Goal"}
            </h3>
            <Link
              className="break-words text-sm text-[var(--accent-purple)] underline underline-offset-2"
              href={`/goals/${directGoal.id}`}
            >
              {directGoal.title}
              {directGoal.archived_at ? " · Archiviert" : ""}
            </Link>
          </div>
        )}
        {inheritedGoal && (!directGoal || conflictingGoals) && (
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">
              {conflictingGoals ? "Goal über Project" : "Goal"}
            </h3>
            <Link
              className="break-words text-sm text-[var(--accent-purple)] underline underline-offset-2"
              href={`/goals/${inheritedGoal.id}`}
            >
              {inheritedGoal.title}
              {inheritedGoal.archived_at ? " · Archiviert" : ""}
            </Link>
          </div>
        )}
        {conflictingGoals && (
          <p className="text-sm text-[var(--accent-orange)]">
            Direkte und vom Project geerbte Goal-Zuordnung unterscheiden sich.
          </p>
        )}
        {!directGoal && !inheritedGoal && (
          <p className="text-sm text-[var(--text-muted)]">Kein Goal-Kontext.</p>
        )}
      </section>

      <section
        id="task-work-content"
        aria-label="Purpose, Beschreibung und Arbeitsinhalt"
        className="grid min-w-0 gap-4 rounded-xl border border-[var(--border-subtle)] p-4"
      >
        <h2 className="text-lg font-semibold">
          Purpose / Beschreibung / Arbeitsinhalt
        </h2>
        {text.description ? (
          <p className="whitespace-pre-wrap break-words text-sm text-[var(--text-secondary)]">
            {text.description}
          </p>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">
            Noch keine Beschreibung.
          </p>
        )}
        {text.nextAction && (
          <p className="break-words border-l border-[var(--border-default)] pl-3 text-sm">
            <span className="font-semibold">
              Arbeitsnotiz / nächste Aktion:{" "}
            </span>
            {text.nextAction}
          </p>
        )}
        {steps}
      </section>

      <section
        id="task-dependencies"
        aria-label="Dependency und Planning Depth"
        className="grid min-w-0 gap-4 rounded-xl border border-[var(--border-subtle)] p-4"
      >
        <h2 className="text-lg font-semibold">Dependency + Planning Depth</h2>
        {dependencies}
        <section aria-label="Task Planning" className="grid gap-3">
          <h3 className="font-semibold">Planung</h3>
          <dl className="grid gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-[var(--text-muted)]">Tagesabsicht</dt>
              <dd className="mt-1 text-sm">
                {task.planned_date
                  ? localDay(task.planned_date)
                  : "Nicht geplant"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-[var(--text-muted)]">Time Block</dt>
              <dd className="mt-1 text-sm">
                {task.scheduled_start_at ? (
                  <>
                    {localDate(task.scheduled_start_at, data.timezone)} ·{" "}
                    {new Intl.DateTimeFormat("de-DE", {
                      timeStyle: "short",
                      timeZone: data.timezone,
                    }).format(new Date(task.scheduled_start_at))}
                    {task.duration_minutes
                      ? ` · ${task.duration_minutes} min`
                      : ""}
                  </>
                ) : (
                  "Kein Time Block"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-[var(--text-muted)]">Deadline</dt>
              <dd className="mt-1 text-sm">
                {task.due_at
                  ? localDate(task.due_at, data.timezone)
                  : "Keine Deadline"}
              </dd>
            </div>
          </dl>
          {task.scheduled_start_at && (
            <Link
              className="min-h-10 w-fit content-center text-sm text-[var(--accent-cyan)] underline underline-offset-2"
              href={`/calendar?${new URLSearchParams({ task: task.id, date: scheduledDate!, view: "day" })}`}
            >
              Time Block im Calendar öffnen
            </Link>
          )}
        </section>
      </section>

      <section
        aria-label="Task bearbeiten, verwalten und Lifecycle"
        className="grid min-w-0 gap-4 border-t border-[var(--border-subtle)] pt-4"
      >
        <h2 className="text-lg font-semibold">Bearbeiten / Verwalten</h2>
        <ManagementDisclosureGroup className="grid gap-4">
          {!task.archived_at && (
            <ManagementDisclosure
              label="Task bearbeiten"
              initiallyOpen={editInitiallyOpen}
              focusFirstOnOpen={editInitiallyOpen}
              clearSearchParamOnClose="edit"
            >
              {edit}
            </ManagementDisclosure>
          )}
          {milestoneManagement}
          <ManagementDisclosure label="Weitere Beziehungen verwalten">
            {relations}
          </ManagementDisclosure>
          <ManagementDisclosure label="Lifecycle verwalten">
            {lifecycle}
          </ManagementDisclosure>
        </ManagementDisclosureGroup>
      </section>
    </div>
  );
}

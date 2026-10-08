import Link from "next/link";
import type { ReactNode } from "react";
import {
  taskDependencyContext,
  taskHasExecutableLifecycle,
} from "@/features/real-data/domain/task-dependencies";
import type { WorkbenchData } from "@/features/real-data/runtime/entity-workbench-read";
import {
  ManagementDisclosure,
  ManagementDisclosureGroup,
} from "./management-disclosure";
import { taskGuidance } from "./task-guidance";
import { TaskEditDialog } from "./task-edit-dialog";
import { OperationForm } from "./forms";
import styles from "./task-read-view.module.css";
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

function localTimeRange(
  value: string,
  duration: number | null,
  timezone: string,
) {
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
  skillRecovery,
  sourceHref,
}: {
  data: WorkbenchData;
  taskId: string;
  dependencies: ReactNode;
  milestoneManagement: ReactNode;
  relations: ReactNode;
  steps: ReactNode;
  lifecycle: ReactNode;
  editInitiallyOpen?: boolean;
  skillRecovery?: ReactNode;
  sourceHref?: string;
}) {
  const task = data.tasks.find((item) => item.id === taskId)!;
  const project = data.projects.find((item) => item.id === task.project_id);
  const parentArchived = Boolean(project?.archived_at);
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
    archived: Boolean(task.archived_at) || parentArchived,
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

  const sourceOwned = data.scheduleSources.some(
    (source) => source.task_id === taskId,
  );
  const canComplete =
    !parentArchived &&
    !task.archived_at &&
    taskHasExecutableLifecycle(task) &&
    dependency.availability === "READY" &&
    !sourceOwned;
  const editIsPrimary =
    !parentArchived &&
    !sourceOwned &&
    !task.archived_at &&
    ["inbox", "waiting", "someday"].includes(task.status) &&
    !dependency.blockers.length;
  const calendarHref =
    "/calendar?" +
    new URLSearchParams({
      task: taskId,
      date:
        scheduledDate || task.planned_date || todayInTimezone(data.timezone),
      view: "week",
    }).toString();
  const showCalendar =
    !parentArchived &&
    (Boolean(scheduledDate) ||
      (!sourceOwned && !task.archived_at && taskHasExecutableLifecycle(task)));
  const hasContext = Boolean(
    project ||
    directGoal ||
    inheritedGoal ||
    task.planned_date ||
    task.scheduled_start_at ||
    task.due_at ||
    dependency.predecessors.length ||
    dependency.successors.length,
  );
  const nextHref = sourceOwned && sourceHref ? sourceHref : guidance.href;
  const nextLabel =
    sourceOwned && sourceHref ? "Quelle öffnen" : guidance.label;
  const nextBody = sourceOwned
    ? "Planung und Status gehören zur verknüpften Quelle."
    : guidance.body;

  return (
    <div data-task-detail-variant="B8" className={styles.canvas}>
      {skillRecovery}
      <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
        <Link href="/tasks">Tasks</Link>
      </nav>
      <header
        aria-label="Aufgabenidentität"
        data-task-order="identity"
        data-task-guidance={nextLabel}
        className={styles.header}
      >
        <div className={styles.identity}>
          <div className={styles.titles}>
            <p className={styles.entity}>Task</p>
            <h1>{task.title}</h1>
            <div
              aria-label="Task-Status"
              data-task-lifecycle={task.status}
              data-task-readiness={dependency.availability}
              className={styles.meta}
            >
              <span>{taskStatusLabels[task.status] ?? task.status}</span>
              <span>
                {dependency.availability === "READY" ? "Bereit" : "Blockiert"}
              </span>
              <span>
                {task.priority === "none" ? "Ohne Priorität" : task.priority}
              </span>
              {task.archived_at && <span>Archiviert</span>}
            </div>
          </div>
          <div aria-label="Task-Aktionen" className={styles.actions}>
            {canComplete && (
              <OperationForm
                operation="task.complete"
                label="Erledigt"
                submitClassName={styles.primary}
              >
                <input type="hidden" name="taskId" value={taskId} />
              </OperationForm>
            )}
            {!canComplete && !editIsPrimary && (
              <Link className={styles.primary} href={nextHref}>
                {nextLabel}
              </Link>
            )}
            {!parentArchived && (
              <TaskEditDialog
                data={data}
                taskId={taskId}
                initiallyOpen={editInitiallyOpen}
                triggerClassName={editIsPrimary ? styles.primary : styles.button}
              />
            )}
            {showCalendar &&
              (canComplete || editIsPrimary || nextHref !== calendarHref) && (
                <Link className={styles.button} href={calendarHref}>
                  {scheduledDate
                    ? "Termin im Kalender öffnen"
                    : dependency.availability === "BLOCKED"
                      ? "Im Calendar ansehen"
                      : "Im Calendar planen"}
                </Link>
              )}
          </div>
        </div>
        <p className={styles.guidance}>{nextBody}</p>
      </header>
      <div className={hasContext ? styles.split : styles.surface}>
        <section
          id="task-work-content"
          aria-labelledby="task-work-heading"
          data-task-order="work"
          className={styles.work}
        >
          <h2 id="task-work-heading">Worum geht es?</h2>
          <section aria-label="Beschreibung" className={styles.unit}>
            <h3>Beschreibung</h3>
            <p className={styles.prose}>
              {text.description || "Noch keine Beschreibung."}
            </p>
          </section>
          <section aria-label="Arbeitsnotiz" className={styles.unit}>
            <h3>Arbeitsnotiz</h3>
            <p className={styles.prose}>
              {text.nextAction || "Noch keine Arbeitsnotiz."}
            </p>
          </section>
          <section aria-label="Vorgehen" className={styles.unit}>
            {steps}
          </section>
          <ManagementDisclosureGroup className={styles.management}>
            <ManagementDisclosure label="Mehr verwalten">
              <ManagementDisclosureGroup className="grid gap-3">
                {!hasContext && (
                  <section id="task-dependencies" aria-label="Voraussetzung">
                    {dependencies}
                  </section>
                )}
                {milestoneManagement}
                <ManagementDisclosure label="Weitere Beziehungen verwalten">
                  {relations}
                </ManagementDisclosure>
                <ManagementDisclosure label="Status verwalten">
                  {lifecycle}
                </ManagementDisclosure>
              </ManagementDisclosureGroup>
            </ManagementDisclosure>
          </ManagementDisclosureGroup>
        </section>
        {hasContext && (
          <aside
            aria-label="Task-Kontext"
            data-task-context
            className={styles.context}
          >
            {(project || directGoal || inheritedGoal) && (
              <section
                data-task-order="context"
                aria-label="Zusammenhang"
                className={styles.group}
              >
                <h2>Zusammenhang</h2>
                <dl className={styles.facts}>
                  {project && (
                    <div>
                      <dt>Project</dt>
                      <dd>
                        <Link
                          className={styles.projectLink}
                          href={"/projects/" + project.id}
                        >
                          {project.title}
                        </Link>
                      </dd>
                    </div>
                  )}
                  {milestone && (
                    <div>
                      <dt>
                        {milestone.status === "active"
                          ? "Aktuelle Etappe"
                          : "Etappe"}
                      </dt>
                      <dd>
                        <Link href={"/projects/" + project!.id}>
                          {milestone.title}
                        </Link>
                      </dd>
                    </div>
                  )}
                  {directGoal && (
                    <div>
                      <dt>
                        {conflictingGoals
                          ? "Ziel für diese Aufgabe"
                          : "Direktes Ziel"}
                      </dt>
                      <dd>
                        <Link
                          className={styles.goalLink}
                          href={"/goals/" + directGoal.id}
                        >
                          {directGoal.title}
                          {directGoal.archived_at ? " · Archiviert" : ""}
                        </Link>
                      </dd>
                    </div>
                  )}
                  {inheritedGoal && (!directGoal || conflictingGoals) && (
                    <div>
                      <dt>Ziel im Project</dt>
                      <dd>
                        <Link
                          className={styles.goalLink}
                          href={"/goals/" + inheritedGoal.id}
                        >
                          {inheritedGoal.title}
                          {inheritedGoal.archived_at ? " · Archiviert" : ""}
                        </Link>
                      </dd>
                    </div>
                  )}
                </dl>
                {conflictingGoals && (
                  <p className={styles.warning}>
                    Für diese Aufgabe und das Project sind unterschiedliche
                    Ziele verknüpft.
                  </p>
                )}
              </section>
            )}
            {(task.planned_date || task.scheduled_start_at || task.due_at) && (
              <section
                data-task-order="planning"
                aria-label="Planung"
                className={styles.group}
              >
                <h2>Planung</h2>
                <dl className={styles.facts}>
                  <div>
                    <dt>Geplant</dt>
                    <dd>
                      {task.planned_date
                        ? localDay(task.planned_date)
                        : "Kein Tag geplant"}
                      <small>Tagesabsicht</small>
                    </dd>
                  </div>
                  <div>
                    <dt>Termin</dt>
                    <dd>
                      {task.scheduled_start_at
                        ? localDate(task.scheduled_start_at, data.timezone) +
                          " · " +
                          localTimeRange(
                            task.scheduled_start_at,
                            task.duration_minutes,
                            data.timezone,
                          )
                        : "Kein Termin bestätigt"}
                      <small>
                        {task.scheduled_start_at
                          ? (task.duration_minutes
                              ? durationLabel(task.duration_minutes) + " · "
                              : "") + data.timezone
                          : "Der Kalender verwaltet bestätigte Termine."}
                      </small>
                    </dd>
                  </div>
                  <div>
                    <dt>Deadline</dt>
                    <dd>
                      {task.due_at
                        ? localDate(task.due_at, data.timezone)
                        : "Keine Deadline"}
                    </dd>
                  </div>
                </dl>
              </section>
            )}
            {(project ||
              dependency.predecessors.length > 0 ||
              dependency.successors.length > 0) && (
              <section
                id="task-dependencies"
                data-task-order="prerequisite"
                aria-label="Voraussetzung"
                className={styles.group}
              >
                <h2>Voraussetzung</h2>
                {dependencies}
              </section>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

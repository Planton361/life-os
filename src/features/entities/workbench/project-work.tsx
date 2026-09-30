import {
  projectDependencySummary,
  taskHasExecutableLifecycle,
  taskDependencyContext,
  taskIsOpen,
} from "@/features/real-data/domain/task-dependencies";
import Link from "next/link";
import type { WorkbenchData } from "@/features/real-data/supabase/repositories/entity-workbench-read";
import {
  ManagementDialog,
  ManagementDisclosure,
} from "./management-disclosure";
import { Choice, OperationForm, fieldClass, actionClass } from "./forms";
import { projectMilestoneGroups } from "./project-milestones";
import { projectTaskGuidance } from "./project-guidance";
import { taskTextFields } from "./task-text";
import styles from "./project-read-view.module.css";
type Stage = WorkbenchData["milestones"][number];
const statuses = [
  { id: "open", title: "Offen" },
  { id: "active", title: "Aktuell" },
  { id: "done", title: "Erledigt" },
];
function StageFields({ stage }: { stage?: Stage }) {
  return (
    <>
      <label className="grid gap-1 text-sm">
        Titel
        <input
          name="title"
          required
          maxLength={500}
          defaultValue={stage?.title}
          className={fieldClass}
        />
      </label>
      <label className="grid gap-1 text-sm">
        Outcome / Beschreibung
        <textarea
          name="description"
          maxLength={10000}
          defaultValue={stage?.description ?? ""}
          placeholder="Was muss nach dieser Etappe wahr sein?"
          className={fieldClass}
        />
      </label>
      <label className="grid gap-1 text-sm">
        Target Date
        <input
          name="targetDate"
          type="date"
          defaultValue={stage?.target_date ?? ""}
          className={fieldClass}
        />
      </label>
      <Choice
        name="status"
        label="Status"
        value={stage?.status ?? "open"}
        options={statuses}
        required
      />
    </>
  );
}
function StageOperation({
  projectId,
  stageId,
  operation,
  label,
}: {
  projectId: string;
  stageId: string;
  operation: string;
  label: string;
}) {
  return (
    <OperationForm operation="project.milestone" label={label} closeOnSuccess>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="milestoneId" value={stageId} />
      <input type="hidden" name="milestoneOperation" value={operation} />
    </OperationForm>
  );
}
export function ProjectWork({
  data,
  projectId,
}: {
  data: WorkbenchData;
  projectId: string;
}) {
  const project = data.projects.find((p) => p.id === projectId)!;
  const summary = projectMilestoneGroups(
    projectId,
    data.milestones,
    data.tasks,
  );
  const graphSummary = projectDependencySummary(
    data.dependencyGraph,
    projectId,
  );
  const archived = data.milestones.filter(
    (m) => m.project_id === projectId && m.archived_at,
  );
  const tasks = data.tasks.filter(
    (t) => t.project_id === projectId && !t.archived_at,
  );
  const currentMilestone = summary.groups.find(
    ({ milestone }) => milestone.status === "active",
  )?.milestone;
  const guidance = projectTaskGuidance({
    archived: Boolean(project.archived_at),
    taskCount: summary.taskCount,
    readyTaskIds: graphSummary.ready
      .filter(taskHasExecutableLifecycle)
      .map((task) => task.id),
    blockedCount: graphSummary.blocked.filter(taskHasExecutableLifecycle)
      .length,
  });
  const createTaskLink = (
    milestoneId?: string,
    label = "+ Task",
    quiet = false,
  ) => (
    <Link
      className={
        quiet
          ? "min-h-10 text-left text-sm text-[var(--accent-cyan)]! underline! underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
          : actionClass
      }
      prefetch={false}
      href={`/tasks/new?${new URLSearchParams({ project: projectId, ...(milestoneId ? { milestone: milestoneId } : {}) })}`}
    >
      {label}
    </Link>
  );
  const renderTasks = (rows: typeof tasks) =>
    rows.length ? (
      <ul>
        {rows.map((t) => {
          const dependency = taskDependencyContext(data.dependencyGraph, t.id);
          const text = taskTextFields(t.description);
          return (
            <li key={t.id} className={styles.task}>
              <div className="min-w-0">
                <p className="text-sm text-[var(--text-secondary)]">
                  {t.status}
                  {taskIsOpen(t)
                    ? ` · Dependency-Readiness ${dependency.availability}`
                    : dependency.inconsistentCompletion
                      ? " · Dependency inkonsistent"
                      : ""}
                </p>
                <Link
                  className="mt-1 block break-words font-medium hover:underline"
                  href={`/tasks/${t.id}`}
                >
                  {t.title}
                </Link>
                {text.nextAction && (
                  <p className="mt-1 line-clamp-2 break-words text-sm text-[var(--text-secondary)]">
                    {text.nextAction}
                  </p>
                )}
                {dependency.blockers.length > 0 && (
                  <p className="mt-1 break-words text-sm text-[var(--text-secondary)]">
                    <span className="font-medium">Blockiert durch: </span>
                    {dependency.blockers.map(({ edgeId, task: blocker }, i) => (
                      <span key={edgeId}>
                        {i > 0 ? " · " : ""}
                        {blocker ? (
                          <Link
                            className="underline underline-offset-2"
                            href={`/tasks/${blocker.id}`}
                          >
                            {blocker.title}
                            {blocker.archived_at ? " (archiviert)" : ""}
                          </Link>
                        ) : (
                          "Vorgänger nicht verfügbar"
                        )}
                      </span>
                    ))}
                  </p>
                )}
                {t.due_at && (
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    Deadline{" "}
                    {t.due_at.slice(0, 10).split("-").reverse().join(".")}
                  </p>
                )}
              </div>
              <Link
                className="min-h-10 content-center text-sm text-[var(--text-muted)] underline"
                aria-label={`${t.title}: Details öffnen`}
                href={`/tasks/${t.id}`}
              >
                Details ↗
              </Link>
            </li>
          );
        })}
      </ul>
    ) : (
      <p className="py-3 text-sm text-[var(--text-muted)]">Noch keine Tasks.</p>
    );
  return (
    <section aria-label="Tasks & Progress" className={styles.work}>
      <div className="border-b border-[var(--border-subtle)] px-5 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-blue)]">
          Work
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Tasks & Milestones</h2>
          {(summary.taskCount > 0 || summary.milestoneCount > 0) && (
            <p className="text-sm text-[var(--text-secondary)]">
              {summary.taskCount > 0 && (
                <>
                  {summary.taskCount} Tasks · {summary.tasksDone} erledigt
                </>
              )}
              {summary.taskCount > 0 && summary.milestoneCount > 0 && " · "}
              {summary.milestoneCount > 0 && (
                <>
                  {summary.milestoneCount} Milestones · {summary.milestonesDone}{" "}
                  erledigt
                </>
              )}
            </p>
          )}
        </div>
        <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          {(graphSummary.ready.length > 0 ||
            graphSummary.blocked.length > 0) && (
            <p className="text-sm text-[var(--text-secondary)]">
              {graphSummary.ready.length > 0 &&
                `Dependency READY ${graphSummary.ready.length}`}
              {graphSummary.ready.length > 0 &&
                graphSummary.blocked.length > 0 &&
                " · "}
              {graphSummary.blocked.length > 0 &&
                `Dependency BLOCKED ${graphSummary.blocked.length}`}
              {summary.taskCount > 0 &&
              project.status === "active" &&
              !graphSummary.hasReadyTask
                ? " · Kein offener Task ist READY"
                : ""}
            </p>
          )}
          <section
            aria-label="Project Task guidance"
            className="min-w-0 border-l-2 border-[var(--accent-cyan)] pl-3"
            data-project-task-guidance={guidance.kind}
          >
            {guidance.kind === "archived" ? (
              <p className="text-sm text-[var(--text-secondary)]">
                Archivierter Project-Kontext · Tasks bleiben als Verlauf lesbar.
              </p>
            ) : guidance.kind === "empty" ? (
              <>
                <p className="inline text-sm text-[var(--text-secondary)]">
                  Beginne mit einer Task. Project-Kontext
                  {currentMilestone ? ` · ${currentMilestone.title}` : ""} wird
                  vorbefüllt.
                </p>
                <span className="ml-2 inline-flex">
                  {createTaskLink(currentMilestone?.id, "Erste Task anlegen")}
                </span>
              </>
            ) : guidance.kind === "single-ready" ? (
              <>
                <h3 className="inline text-sm font-semibold">
                  Nächste ausführbare Task:
                </h3>{" "}
                <Link
                  className="inline break-words font-medium text-[var(--accent-cyan)] underline underline-offset-2"
                  href={`/tasks/${guidance.taskId}`}
                >
                  {tasks.find((task) => task.id === guidance.taskId)?.title ??
                    "Task öffnen"}
                </Link>
              </>
            ) : guidance.kind === "multiple-ready" ? (
              <>
                <h3 className="inline text-sm font-semibold">
                  {guidance.count} Tasks sind READY.
                </h3>{" "}
                <p className="inline text-sm text-[var(--text-secondary)]">
                  Wähle selbst, womit du weitermachst.
                </p>{" "}
                <a
                  className="ml-1 inline-flex min-h-8 items-center text-sm text-[var(--accent-cyan)] underline underline-offset-2"
                  href="#project-task-list"
                >
                  Task-Auswahl öffnen
                </a>
              </>
            ) : guidance.kind === "all-blocked" ? (
              <>
                <h3 className="inline text-sm font-semibold">
                  Alle ausführbaren Tasks sind BLOCKED
                </h3>{" "}
                <p className="inline text-sm text-[var(--text-secondary)]">
                  Prüfe die benannten Vorgänger bei den Tasks. Der
                  Project-Status bleibt unverändert.
                </p>{" "}
                <a
                  className="ml-1 inline-flex min-h-8 items-center text-sm text-[var(--accent-cyan)] underline underline-offset-2"
                  href="#project-task-list"
                >
                  Blocker-Kontext öffnen
                </a>
              </>
            ) : (
              <>
                <h3 className="inline text-sm font-semibold">
                  Keine ausführbaren Tasks
                </h3>{" "}
                <p className="inline text-sm text-[var(--text-secondary)]">
                  Abgeschlossene und derzeit nicht ausführbare Arbeit bleibt im
                  Project-Verlauf.
                </p>{" "}
                <a
                  className="ml-1 inline-flex min-h-8 items-center text-sm text-[var(--accent-cyan)] underline underline-offset-2"
                  href="#project-task-list"
                >
                  Task-Verlauf öffnen
                </a>
              </>
            )}
          </section>
        </div>
        {!project.archived_at && (
          <div className={styles.workActions}>
            {summary.taskCount > 0 &&
              createTaskLink(currentMilestone?.id, "+ Task", true)}
            <ManagementDialog
              label="Weitere Work-Optionen"
              triggerText="Weitere Work-Optionen"
            >
              <section className="grid gap-3">
                <h3 className="font-semibold">Milestone hinzufügen</h3>
                <OperationForm
                  operation="project.milestone"
                  label="Milestone erstellen"
                  closeOnSuccess
                >
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="milestoneOperation" value="save" />
                  <StageFields />
                </OperationForm>
              </section>
              {tasks.length > 0 && (
                <section className="grid gap-3 border-t border-[var(--border-subtle)] pt-4">
                  <h3 className="font-semibold">Tasks zuordnen</h3>
                  <OperationForm
                    operation="project.milestone"
                    label="Task-Milestone speichern"
                    closeOnSuccess
                  >
                    <input type="hidden" name="projectId" value={projectId} />
                    <input
                      type="hidden"
                      name="milestoneOperation"
                      value="assign"
                    />
                    <Choice
                      name="taskId"
                      label="Task"
                      required
                      options={tasks.map((t) => ({ id: t.id, title: t.title }))}
                    />
                    <Choice
                      name="milestoneId"
                      label="Milestone (keine Auswahl = Ohne Milestone)"
                      options={summary.groups.map((g) => ({
                        id: g.milestone.id,
                        title: g.milestone.title,
                      }))}
                    />
                  </OperationForm>
                </section>
              )}
            </ManagementDialog>
          </div>
        )}
      </div>
      <div
        className={styles.taskList}
        data-project-task-list
        id="project-task-list"
        aria-label="Project Task List"
      >
        {!summary.groups.length && (
          <p className="py-3 text-sm text-[var(--text-muted)]">
            Noch keine Milestones.
          </p>
        )}
        {summary.groups.map(({ milestone: m, tasks: linked, done }) => (
          <section
            key={m.id}
            aria-label={`Milestone: ${m.title}`}
            data-milestone-id={m.id}
            id={`project-milestone-${m.id}`}
            className={styles.milestone}
          >
            <div className="min-w-0">
              <h3
                className={`font-semibold break-words ${m.status === "done" ? "text-[var(--text-muted)]" : m.status === "active" ? "text-[var(--accent-blue)]" : ""}`}
              >
                {m.title}
              </h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {statuses.find((s) => s.id === m.status)?.title}
                {m.target_date
                  ? ` · ${m.target_date.split("-").reverse().join(".")}`
                  : ""}
              </p>
            </div>
            {!project.archived_at && (
              <ManagementDialog label="Milestone verwalten">
                <OperationForm
                  operation="project.milestone"
                  label="Milestone speichern"
                  closeOnSuccess
                >
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="milestoneId" value={m.id} />
                  <input type="hidden" name="milestoneOperation" value="save" />
                  <StageFields stage={m} />
                </OperationForm>
                <div className="flex flex-wrap gap-2">
                  <StageOperation
                    projectId={projectId}
                    stageId={m.id}
                    operation="up"
                    label="Nach oben"
                  />
                  <StageOperation
                    projectId={projectId}
                    stageId={m.id}
                    operation="down"
                    label="Nach unten"
                  />
                </div>
                <p className="text-sm text-[var(--text-muted)]">
                  Archivieren erhält die Etappe als Verlauf. Ihre Tasks wechseln
                  zu Ohne Milestone.
                </p>
                <StageOperation
                  projectId={projectId}
                  stageId={m.id}
                  operation="archive"
                  label="Milestone archivieren"
                />
              </ManagementDialog>
            )}
            {m.description && (
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-[var(--text-secondary)]">
                {m.description}
              </p>
            )}
            {linked.length > 0 && (
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                {done}/{linked.length} Tasks erledigt
              </p>
            )}
            {renderTasks(linked)}
          </section>
        ))}
        <section aria-label="Ohne Milestone" className="py-4">
          {(summary.unassigned.length > 0 ||
            (!summary.groups.length && summary.taskCount > 0)) && (
            <>
              <h3 className="font-semibold">Ohne Milestone</h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Backlog · noch keiner Etappe zugeordnet
              </p>
              {renderTasks(summary.unassigned)}
            </>
          )}
        </section>
        {archived.length > 0 && (
          <ManagementDialog
            label={`Archivierte Milestones · ${archived.length}`}
          >
            {archived.map((m) => (
              <div key={m.id}>
                <p className="font-medium">{m.title} · Archiviert</p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {m.description}
                </p>
              </div>
            ))}
          </ManagementDialog>
        )}
      </div>
    </section>
  );
}

export function TaskMilestoneContext({
  data,
  taskId,
}: {
  data: WorkbenchData;
  taskId: string;
}) {
  const task = data.tasks.find((t) => t.id === taskId);
  const project = data.projects.find((p) => p.id === task?.project_id);
  if (!task || !project) return null;
  const stage = data.milestones.find(
    (m) => m.id === task.milestone_id && m.project_id === project.id,
  );
  return (
    <section aria-label="Task Milestone" className="grid min-w-0 gap-2">
      <h3 className="font-semibold">Project</h3>
      <Link
        href={`/projects/${project.id}`}
        className="break-words text-[var(--accent-cyan)] underline underline-offset-2"
      >
        {project.title}
      </Link>
      <p className="text-sm text-[var(--text-secondary)]">
        Project Milestone: {stage?.title ?? "Ohne Milestone"}
        {stage?.archived_at ? " · Archiviert" : ""}
      </p>
    </section>
  );
}

export function TaskMilestoneManagement({
  data,
  taskId,
}: {
  data: WorkbenchData;
  taskId: string;
}) {
  const task = data.tasks.find((t) => t.id === taskId);
  const project = data.projects.find((p) => p.id === task?.project_id);
  if (!task || !project || task.archived_at) return null;
  return (
    <ManagementDisclosure label="Milestone-Zuordnung ändern">
      <OperationForm
        operation="project.milestone"
        label="Task-Milestone speichern"
        closeOnSuccess
      >
        <input type="hidden" name="projectId" value={project.id} />
        <input type="hidden" name="taskId" value={task.id} />
        <input type="hidden" name="milestoneOperation" value="assign" />
        <Choice
          name="milestoneId"
          label="Milestone (keine Auswahl = Ohne Milestone)"
          value={project.archived_at ? "" : (task.milestone_id ?? "")}
          options={data.milestones
            .filter((m) => m.project_id === project.id && !m.archived_at)
            .map((m) => ({ id: m.id, title: m.title }))}
        />
      </OperationForm>
      <p className="text-sm text-[var(--text-muted)]">
        Vor einem Project-Wechsel die Milestone-Zuordnung lösen.
      </p>
    </ManagementDisclosure>
  );
}

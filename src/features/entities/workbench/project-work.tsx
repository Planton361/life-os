import {
  taskHasExecutableLifecycle,
  taskDependencyContext,
  taskIsOpen,
} from "@/features/real-data/domain/task-dependencies";
import Link from "next/link";
import type { WorkbenchData } from "@/features/real-data/runtime/entity-workbench-read";
import {
  ManagementDialog,
  ManagementDisclosure,
} from "./management-disclosure";
import { Choice, OperationForm, fieldClass } from "./forms";
import { projectMilestoneGroups } from "./project-milestones";
import { projectWorkBalance } from "./project-work-balance";
import { projectTaskGuidance } from "./project-guidance";
import { TaskEditDialog } from "./task-edit-dialog";
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
  const balance = projectWorkBalance(
    projectId,
    data.tasks,
    data.dependencyGraph,
    data.scheduleSources,
  );
  const archived = data.milestones.filter(
    (m) => m.project_id === projectId && m.archived_at,
  );
  const tasks = data.tasks.filter(
    (t) => t.project_id === projectId && !t.archived_at,
  );
  const guidance = projectTaskGuidance({
    archived: Boolean(project.archived_at),
    taskCount: balance.total,
    readyTaskIds: balance.readyTaskIds,
    blockedCount: balance.counts.blocked,
  });
  const createTaskLink = (
    milestoneId?: string,
    label = "+ Task",
    quiet = false,
  ) => (
    <Link
      className={
        quiet
          ? styles.quiet
          : label === "Erste Task anlegen"
            ? styles.primaryAction
            : styles.button
      }
      prefetch={false}
      href={`/tasks/new?${new URLSearchParams({ project: projectId, ...(milestoneId ? { milestone: milestoneId } : {}) })}`}
    >
      {label}
    </Link>
  );
  const milestoneManagement = !project.archived_at && (
    <ManagementDialog
      label="Weitere Work-Optionen"
      triggerText="+ Milestone"
      triggerClassName={styles.quiet}
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
            <input type="hidden" name="milestoneOperation" value="assign" />
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
  );
  const renderTasks = (rows: typeof tasks) =>
    rows.length ? (
      <ul>
        {rows
          .toSorted(
            (a, b) =>
              Number(balance.categories.get(b.id) === "ready") -
              Number(balance.categories.get(a.id) === "ready"),
          )
          .map((t) => {
            const dependency = taskDependencyContext(
              data.dependencyGraph,
              t.id,
            );
            const text = taskTextFields(t.description);
            return (
              <li
                key={t.id}
                data-project-task={t.id}
                data-work-category={balance.categories.get(t.id) ?? "excluded"}
                data-primary-task={
                  guidance.kind === "single-ready" && guidance.taskId === t.id
                    ? "true"
                    : undefined
                }
                className={`${styles.task} ${guidance.kind === "single-ready" && guidance.taskId === t.id ? styles.primaryTask : ""}`}
              >
                <section
                  className="min-w-0"
                  aria-label={
                    guidance.kind === "single-ready" && guidance.taskId === t.id
                      ? "Project Task guidance"
                      : undefined
                  }
                  data-project-task-guidance={
                    guidance.kind === "single-ready" && guidance.taskId === t.id
                      ? "single-ready"
                      : undefined
                  }
                >
                  {guidance.kind === "single-ready" &&
                    guidance.taskId === t.id && (
                      <p className={styles.taskLabel}>
                        Task · Nächste ausführbare Task
                      </p>
                    )}
                  {!(
                    guidance.kind === "single-ready" && guidance.taskId === t.id
                  ) && <p className={styles.taskLabel}>Task</p>}
                  <Link className={styles.taskTitle} href={`/tasks/${t.id}`}>
                    {t.title}
                  </Link>
                  <p
                    className={`${styles.taskStatus} ${balance.categories.get(t.id) === "ready" ? styles.ready : balance.categories.get(t.id) === "blocked" ? styles.blocked : ""}`}
                  >
                    {{
                      inbox: "Inbox",
                      planned: "Geplant",
                      active: "Aktiv",
                      waiting: "Wartend",
                      done: "Erledigt",
                      canceled: "Abgebrochen",
                      someday: "Irgendwann",
                      archived: "Archiviert",
                    }[t.status] ?? t.status}
                    {!balance.categories.has(t.id) &&
                      " · nicht im Arbeitsstand"}
                    {taskIsOpen(t)
                      ? ` · Dependencies ${dependency.availability}${balance.categories.get(t.id) === "ready" ? " · ausführbar" : balance.categories.get(t.id) === "other" ? " · derzeit nicht ausführbar" : ""}`
                      : dependency.inconsistentCompletion
                        ? " · Dependency inkonsistent"
                        : ""}
                  </p>
                  {data.scheduleSources.some(
                    (source) => source.task_id === t.id,
                  ) && (
                    <p className={styles.taskStatus}>
                      Quellengebunden · Abschluss über die Quelle
                    </p>
                  )}
                  {text.nextAction && (
                    <p className="mt-1 line-clamp-2 break-words text-sm text-[var(--text-secondary)]">
                      {text.nextAction}
                    </p>
                  )}
                  {dependency.blockers.length > 0 && (
                    <p className="mt-1 break-words text-sm text-[var(--text-secondary)]">
                      <span className="font-medium">Blockiert durch: </span>
                      {dependency.blockers.map(
                        ({ edgeId, task: blocker }, i) => (
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
                        ),
                      )}
                    </p>
                  )}
                  {t.due_at && (
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      Deadline{" "}
                      {t.due_at.slice(0, 10).split("-").reverse().join(".")}
                    </p>
                  )}
                </section>
                <div
                  className={styles.taskActions}
                  aria-label={`Aktionen: ${t.title}`}
                >
                  {!project.archived_at &&
                    !t.archived_at &&
                    taskHasExecutableLifecycle(t) &&
                    dependency.availability === "READY" &&
                    balance.categories.get(t.id) === "ready" && (
                      <OperationForm
                        operation="task.complete"
                        label="Erledigt"
                        submitClassName={styles.button}
                      >
                        <input type="hidden" name="taskId" value={t.id} />
                      </OperationForm>
                    )}
                  {!project.archived_at && (
                    <TaskEditDialog data={data} taskId={t.id} />
                  )}
                  <Link
                    className="min-h-10 content-center text-sm text-[var(--text-muted)] underline"
                    aria-label={`${t.title}: Details öffnen`}
                    href={`/tasks/${t.id}`}
                  >
                    Details
                  </Link>
                </div>
              </li>
            );
          })}
      </ul>
    ) : (
      <p className="py-3 text-sm text-[var(--text-muted)]">Noch keine Tasks.</p>
    );
  return (
    <section aria-label="Tasks & Progress" className={styles.work}>
      <div className={styles.workHeader}>
        <h2 className="text-xl font-semibold">Work</h2>
        <div className={styles.guidance}>
          {guidance.kind !== "single-ready" && (
            <section
              aria-label="Project Task guidance"
              className={
                guidance.kind === "empty" ? styles.empty : styles.guidanceText
              }
              data-project-task-guidance={guidance.kind}
            >
              {guidance.kind === "archived" ? (
                <p className="text-sm text-[var(--text-secondary)]">
                  Archivierter Project-Kontext · Tasks bleiben als Verlauf
                  lesbar.
                </p>
              ) : guidance.kind === "empty" ? (
                <>
                  <p className={styles.groupLabel}>Dein Einstieg</p>
                  <h3>Aus einem Vorhaben wird ausführbare Arbeit.</h3>
                  <p>
                    Erstelle eine konkrete Task. Milestones kannst du ergänzen,
                    wenn du Etappen brauchst.
                  </p>
                  <div className={styles.emptyActions}>
                    {createTaskLink(undefined, "Erste Task anlegen")}
                    {milestoneManagement}
                  </div>
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
                    Abgeschlossene und derzeit nicht ausführbare Arbeit bleibt
                    im Project-Verlauf.
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
          )}
        </div>
        {!project.archived_at && guidance.kind !== "empty" && (
          <div className={styles.workActions}>
            {balance.total > 0 && createTaskLink(undefined, "+ Task")}
            {milestoneManagement}
          </div>
        )}
      </div>
      {(balance.total > 0 || summary.milestoneCount > 0) && (
        <section aria-label="Arbeitsstand" className={styles.balance}>
          {balance.total > 0 && (
            <div>
              <h3 className={styles.groupLabel}>Arbeitsstand</h3>
              <p className={styles.balanceCount}>
                {balance.counts.done} von {balance.total}{" "}
                <span>
                  Tasks erledigt · {balance.total - balance.counts.done} offen
                </span>
              </p>
              <div
                className={styles.distribution}
                role="img"
                aria-label={`${balance.counts.done} erledigt, ${balance.counts.ready} bereit, ${balance.counts.blocked} blockiert, ${balance.counts.other} sonstige offen`}
              >
                {(["done", "ready", "blocked", "other"] as const)
                  .filter((key) => balance.counts[key] > 0)
                  .map((key) => (
                    <span
                      key={key}
                      className={styles[key]}
                      style={{ flex: balance.counts[key] }}
                    />
                  ))}
              </div>
              <div className={styles.legend}>
                <span>{balance.counts.done} erledigt</span>
                <span>{balance.counts.ready} bereit</span>
                <span>{balance.counts.blocked} blockiert</span>
                <span>{balance.counts.other} sonstige offen</span>
              </div>
            </div>
          )}
          {summary.milestoneCount > 0 && (
            <div>
              <h3 className={styles.groupLabel}>Etappen</h3>
              <p className={styles.balanceCount}>
                {summary.milestonesDone} von {summary.milestoneCount}
              </p>
              <p className={styles.taskStatus}>Milestones abgeschlossen</p>
            </div>
          )}
          <p className={styles.balanceNote}>
            Stand der erfassten Arbeit, kein Project-Abschlussgrad.
          </p>
        </section>
      )}
      <div
        className={styles.taskList}
        data-project-task-list
        id="project-task-list"
        aria-label="Project Task List"
      >
        {summary.groups.map(({ milestone: m, tasks: linked }, index) => (
          <section
            key={m.id}
            aria-label={`Milestone: ${m.title}`}
            data-milestone-id={m.id}
            id={`project-milestone-${m.id}`}
            className={styles.milestone}
          >
            <div className={styles.milestoneHeader}>
              <div className="min-w-0">
                <span className={styles.groupLabel}>
                  Milestone {String(index + 1).padStart(2, "0")} ·{" "}
                  {linked.length} Tasks
                </span>
                <h3 className="text-sm font-semibold break-words">
                  {m.title} · {statuses.find((s) => s.id === m.status)?.title}
                </h3>
                {m.target_date && (
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {m.target_date.split("-").reverse().join(".")}
                  </p>
                )}
                {!linked.length && (
                  <span className="text-sm text-[var(--text-muted)]">
                    Noch keine Tasks.
                  </span>
                )}
              </div>
              {!project.archived_at && (
                <div className={styles.workActions}>
                  {createTaskLink(m.id, "+ Task", true)}
                  <ManagementDialog
                    label="Milestone verwalten"
                    triggerText="Bearbeiten"
                    triggerClassName={styles.quiet}
                  >
                    <OperationForm
                      operation="project.milestone"
                      label="Milestone speichern"
                      closeOnSuccess
                    >
                      <input type="hidden" name="projectId" value={projectId} />
                      <input type="hidden" name="milestoneId" value={m.id} />
                      <input
                        type="hidden"
                        name="milestoneOperation"
                        value="save"
                      />
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
                      Archivieren erhält die Etappe als Verlauf. Ihre Tasks
                      wechseln zu Ohne Milestone.
                    </p>
                    <StageOperation
                      projectId={projectId}
                      stageId={m.id}
                      operation="archive"
                      label="Milestone archivieren"
                    />
                  </ManagementDialog>
                </div>
              )}
            </div>
            {m.description && (
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-[var(--text-secondary)]">
                {m.description}
              </p>
            )}
            {linked.length > 0 && renderTasks(linked)}
          </section>
        ))}
        {summary.unassigned.length > 0 &&
          (summary.groups.length ? (
            <section aria-label="Ohne Milestone" className={styles.ungrouped}>
              <h3 className={styles.groupLabel}>Ohne Milestone</h3>
              {renderTasks(summary.unassigned)}
            </section>
          ) : (
            renderTasks(summary.unassigned)
          ))}
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
  dialog = false,
}: {
  data: WorkbenchData;
  taskId: string;
  dialog?: boolean;
}) {
  const task = data.tasks.find((t) => t.id === taskId);
  const project = data.projects.find((p) => p.id === task?.project_id);
  if (!task || !project || task.archived_at) return null;
  const parentArchived = Boolean(
    project.archived_at || project.status === "archived",
  );
  // Explicit unassignment is allowed in archived context; new assignments are not.
  if (parentArchived && !task.milestone_id) return null;
  const Container = dialog ? ManagementDialog : ManagementDisclosure;
  return (
    <Container
      label={dialog ? "Zuordnung ändern" : "Milestone-Zuordnung ändern"}
    >
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
          value={parentArchived ? "" : (task.milestone_id ?? "")}
          options={data.milestones
            .filter(
              (m) => !parentArchived && m.project_id === project.id && !m.archived_at,
            )
            .map((m) => ({ id: m.id, title: m.title }))}
        />
      </OperationForm>
      <p className="text-sm text-[var(--text-muted)]">
        Vor einem Project-Wechsel die Milestone-Zuordnung lösen.
      </p>
    </Container>
  );
}

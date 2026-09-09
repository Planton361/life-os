import {
  projectDependencySummary,
  taskDependencyContext,
  taskIsOpen,
} from "@/features/real-data/domain/task-dependencies";
import Link from "next/link";
import type { WorkbenchData } from "@/features/real-data/supabase/repositories/entity-workbench-read";
import {
  ManagementDisclosure,
  ManagementDisclosureGroup,
} from "./management-disclosure";
import { Choice, OperationForm, fieldClass } from "./forms";
import { projectMilestoneGroups } from "./project-milestones";
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
    <OperationForm operation="project.milestone" label={label}>
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
                    ? ` · ${dependency.availability}${dependency.blockers.length ? ` · wartet auf ${dependency.blockers.length}` : ""}`
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
      <div className="border-b border-[var(--border-subtle)] px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-blue)]">
          Work
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">
            Tasks {summary.taskCount}{" "}
            <span className="text-base font-normal text-[var(--text-secondary)]">
              · Milestones {summary.milestoneCount}
            </span>
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            {summary.tasksDone}/{summary.taskCount} Tasks erledigt ·{" "}
            {summary.milestonesDone}/{summary.milestoneCount} Milestones
            erledigt
          </p>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          READY {graphSummary.ready.length} · BLOCKED{" "}
          {graphSummary.blocked.length}
          {project.status === "active" && !graphSummary.hasReadyTask
            ? " · Kein offener Task ist READY"
            : ""}
        </p>
        {!project.archived_at && (
          <ManagementDisclosureGroup className={styles.workActions}>
            <ManagementDisclosure
              label="Milestone hinzufügen"
              triggerText="+ Milestone"
              panelClassName={styles.workPanel}
            >
              <OperationForm
                operation="project.milestone"
                label="Milestone erstellen"
                closeOnSuccess
              >
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="milestoneOperation" value="save" />
                <StageFields />
              </OperationForm>
            </ManagementDisclosure>
            {tasks.length > 0 && (
              <ManagementDisclosure
                label="Tasks zuordnen"
                panelClassName={styles.workPanel}
              >
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
              </ManagementDisclosure>
            )}
          </ManagementDisclosureGroup>
        )}
      </div>
      <div
        className={styles.taskList}
        data-project-task-list
        tabIndex={0}
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
              <ManagementDisclosure label="Milestone verwalten" triggerText="⋯">
                <OperationForm
                  operation="project.milestone"
                  label="Milestone speichern"
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
              </ManagementDisclosure>
            )}
            {m.description && (
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-[var(--text-secondary)]">
                {m.description}
              </p>
            )}
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {done}/{linked.length} Tasks erledigt
            </p>
            {renderTasks(linked)}
          </section>
        ))}
        <section aria-label="Ohne Milestone" className="py-4">
          <h3 className="font-semibold">
            Ohne Milestone · {summary.unassigned.length}
          </h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Backlog · noch keiner Etappe zugeordnet
          </p>
          {renderTasks(summary.unassigned)}
        </section>
        {archived.length > 0 && (
          <ManagementDisclosure
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
          </ManagementDisclosure>
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
  const stage = data.milestones.find((m) => m.id === task.milestone_id);
  return (
    <section
      aria-label="Task Milestone"
      className="grid gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-5"
    >
      <h2 className="font-semibold">Milestone</h2>
      <p>{stage?.title ?? "Ohne Milestone"}</p>
      <Link href={`/projects/${project.id}`} className="text-sm underline">
        Project Workbench öffnen
      </Link>
      {!task.archived_at && (
        <ManagementDisclosure label="Milestone-Zuordnung ändern">
          <OperationForm
            operation="project.milestone"
            label="Task-Milestone speichern"
          >
            <input type="hidden" name="projectId" value={project.id} />
            <input type="hidden" name="taskId" value={task.id} />
            <input type="hidden" name="milestoneOperation" value="assign" />
            <Choice
              name="milestoneId"
              label="Milestone (keine Auswahl = Ohne Milestone)"
              value={project.archived_at ? "" : (task.milestone_id ?? "")}
              options={data.milestones
                .filter(
                  (m) =>
                    !project.archived_at &&
                    m.project_id === project.id &&
                    !m.archived_at,
                )
                .map((m) => ({ id: m.id, title: m.title }))}
            />
          </OperationForm>
          <p className="text-sm text-[var(--text-muted)]">
            Vor einem Project-Wechsel die Milestone-Zuordnung lösen.
          </p>
        </ManagementDisclosure>
      )}
    </section>
  );
}

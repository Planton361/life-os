import Link from "next/link";
import type { WorkbenchData } from "@/features/real-data/runtime/entity-workbench-read";
import {
  dependencyCandidates,
  taskSatisfiesDependency,
  taskDependencyContext,
} from "@/features/real-data/domain/task-dependencies";
import styles from "./task-read-view.module.css";
import {
  ManagementDialog,
  ManagementDisclosure,
} from "./management-disclosure";
import { Choice, OperationForm } from "./forms";

export function TaskDependencies({
  data,
  taskId,
  compact = false,
}: {
  data: WorkbenchData;
  taskId: string;
  compact?: boolean;
}) {
  const task = data.tasks.find((task) => task.id === taskId)!;
  const context = taskDependencyContext(data.dependencyGraph, taskId);
  const project = data.projects.find(
    (project) => project.id === task.project_id,
  );
  const candidates =
    project && !project.archived_at && project.status !== "archived"
      ? dependencyCandidates(data.dependencyGraph, taskId)
      : [];
  const fulfilledPredecessors = context.predecessors.filter(
    ({ task: predecessor }) =>
      predecessor && taskSatisfiesDependency(predecessor),
  ).length;
  const openPredecessors = context.predecessors.length - fulfilledPredecessors;
  const Container = compact ? ManagementDialog : ManagementDisclosure;
  return (
    <section
      aria-label="Vorgänger und Nachfolger"
      className={compact ? styles.dependencies : "grid min-w-0 gap-3 text-sm"}
    >
      {context.inconsistentCompletion && (
        <p className="text-[var(--accent-orange)]" role="status">
          Der Task bleibt abgeschlossen; mindestens ein Vorgänger ist inzwischen
          wieder offen oder archiviert.
        </p>
      )}
      {context.predecessors.length > 0 ? (
        <p className="text-[var(--text-secondary)]">
          {context.predecessors.length} Vorgänger ·{" "}
          {openPredecessors === 0 ? "erfüllt" : openPredecessors + " offen"}
        </p>
      ) : (
        <p className="text-[var(--text-secondary)]">
          {compact
            ? "Keine Vorgänger zugeordnet."
            : "Keine offenen Voraussetzungen."}
        </p>
      )}
      {context.predecessors.length ? (
        <ul className="grid gap-2">
          {context.predecessors.map(({ edgeId, task: predecessor }) => (
            <li key={edgeId}>
              {predecessor ? (
                <Link
                  className="break-words underline"
                  href={`/tasks/${predecessor.id}`}
                >
                  {predecessor.title}
                  {predecessor.archived_at || predecessor.status === "archived"
                    ? " (archiviert)"
                    : ""}
                </Link>
              ) : (
                "Vorgänger nicht verfügbar"
              )}
              <span className="ml-2 text-[var(--text-secondary)]">
                {predecessor && taskSatisfiesDependency(predecessor)
                  ? "Erfüllt"
                  : "Offen · blockiert"}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {!task.project_id && (
        <p className="text-[var(--text-muted)]">
          Ordne den Task einem Project zu, um Vorgänger zu verknüpfen.
        </p>
      )}
      {context.successors.length ? (
        <div className="grid gap-2">
          <h3 className="font-semibold">Wird Voraussetzung für</h3>
          <ul className="grid gap-2">
            {context.successors.map(({ edgeId, task: successor }) => (
              <li key={edgeId}>
                {successor ? (
                  <Link
                    className="break-words underline"
                    href={`/tasks/${successor.id}`}
                  >
                    {successor.title}
                    {successor.archived_at ? " (archiviert)" : ""}
                  </Link>
                ) : (
                  "Nachfolgender Task nicht verfügbar"
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : !compact ? (
        <p className="text-[var(--text-muted)]">Keine nachfolgenden Tasks.</p>
      ) : null}
      {(task.project_id || context.predecessors.length > 0) && (
        <Container
          label="Vorgänger verwalten"
          {...(compact ? { triggerClassName: styles.quietSmall } : {})}
        >
          {candidates.length > 0 ? (
            <ManagementDisclosure label="Vorgänger hinzufügen">
              <OperationForm
                operation="task.dependency.add"
                label="Vorgänger speichern"
                closeOnSuccess
              >
                <input type="hidden" name="taskId" value={taskId} />
                <input
                  type="hidden"
                  name="projectId"
                  value={task.project_id!}
                />
                <Choice
                  name="predecessorId"
                  label="Vorgänger"
                  required
                  options={candidates.map((task) => ({
                    id: task.id,
                    title: task.title,
                  }))}
                />
              </OperationForm>
            </ManagementDisclosure>
          ) : (
            <p>Keine weiteren zulässigen Vorgänger in diesem Project.</p>
          )}
          {context.predecessors.map(({ edgeId, task: predecessor }) => (
            <div
              key={edgeId}
              className="grid gap-2 border-t border-[var(--border-subtle)] pt-3"
            >
              {predecessor && (
                <Link
                  className="break-words underline"
                  href={`/tasks/${predecessor.id}`}
                >
                  {predecessor.title}
                </Link>
              )}
              <OperationForm
                operation="task.dependency.remove"
                label={`Vorgänger entfernen: ${predecessor?.title ?? "Vorgänger"}`}
              >
                <input type="hidden" name="taskId" value={taskId} />
                <input type="hidden" name="dependencyId" value={edgeId} />
              </OperationForm>
            </div>
          ))}
        </Container>
      )}
    </section>
  );
}

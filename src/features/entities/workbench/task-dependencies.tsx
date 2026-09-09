import Link from "next/link";
import type { WorkbenchData } from "@/features/real-data/supabase/repositories/entity-workbench-read";
import {
  dependencyCandidates,
  taskDependencyContext,
} from "@/features/real-data/domain/task-dependencies";
import { ManagementDisclosure } from "./management-disclosure";
import { Choice, OperationForm } from "./forms";

export function TaskDependencies({
  data,
  taskId,
}: {
  data: WorkbenchData;
  taskId: string;
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
  return (
    <section
      aria-label="Task Dependencies"
      className="grid gap-3 rounded-xl border border-[var(--border-subtle)] p-5 text-sm"
    >
      <h2 className="text-lg font-semibold">Dependencies</h2>
      <p>
        Availability: <strong>{context.availability}</strong>
      </p>
      {context.inconsistentCompletion && (
        <p className="text-[var(--accent-orange)]">
          Dependency inkonsistent: Dieser Task bleibt abgeschlossen; mindestens
          ein Vorgänger ist wieder offen oder archiviert.
        </p>
      )}
      {!task.project_id && (
        <p>Dependencies sind innerhalb eines Projects möglich.</p>
      )}
      <h3 className="font-semibold">Blockiert durch</h3>
      {context.blockers.length ? (
        <ul className="grid gap-2">
          {context.blockers.map(({ edgeId, task: blocker }) => (
            <li key={edgeId}>
              {blocker ? (
                <Link
                  className="break-words underline"
                  href={`/tasks/${blocker.id}`}
                >
                  {blocker.title}
                  {blocker.archived_at || blocker.status === "archived"
                    ? " (archiviert)"
                    : ""}
                </Link>
              ) : (
                "Vorgänger nicht verfügbar"
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>Keine unerfüllten Vorgänger.</p>
      )}
      <h3 className="font-semibold">Ermöglicht</h3>
      {context.successors.length ? (
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
                "Nachfolger nicht verfügbar"
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>Keine Nachfolger.</p>
      )}
      {context.predecessors.length > context.blockers.length && (
        <p>
          {context.predecessors.length - context.blockers.length} Vorgänger
          erfüllt.
        </p>
      )}
      {(task.project_id || context.predecessors.length > 0) && (
        <ManagementDisclosure label="Dependencies verwalten">
          {candidates.length > 0 ? (
            <ManagementDisclosure label="Dependency hinzufügen">
              <OperationForm
                operation="task.dependency.add"
                label="Dependency speichern"
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
            <p>Keine zulässigen neuen Vorgänger in diesem Project.</p>
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
                label={`Dependency entfernen: ${predecessor?.title ?? "Vorgänger"}`}
              >
                <input type="hidden" name="taskId" value={taskId} />
                <input type="hidden" name="dependencyId" value={edgeId} />
              </OperationForm>
            </div>
          ))}
        </ManagementDisclosure>
      )}
    </section>
  );
}

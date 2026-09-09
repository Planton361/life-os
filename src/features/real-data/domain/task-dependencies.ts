import { z } from "zod";

export const taskDependencyGraphSchema = z.object({
  tasks: z.array(
    z.object({
      id: z.uuid(),
      title: z.string(),
      project_id: z.uuid().nullable(),
      status: z.string(),
      completed_at: z.string().nullable(),
      archived_at: z.string().nullable(),
    }),
  ),
  dependencies: z.array(
    z.object({
      id: z.uuid(),
      predecessor_task_id: z.uuid(),
      successor_task_id: z.uuid(),
    }),
  ),
});
export type TaskDependencyGraph = z.infer<typeof taskDependencyGraphSchema>;
export type DependencyTask = TaskDependencyGraph["tasks"][number];
export const taskSatisfiesDependency = (task: DependencyTask) =>
  task.status === "done" &&
  task.completed_at !== null &&
  task.archived_at === null;
export const taskIsOpen = (task: DependencyTask) =>
  !task.archived_at && !["done", "canceled", "archived"].includes(task.status);

export function taskDependencyContext(
  graph: TaskDependencyGraph,
  taskId: string,
) {
  const byId = new Map(graph.tasks.map((task) => [task.id, task]));
  const task = byId.get(taskId);
  const predecessors = graph.dependencies
    .filter((edge) => edge.successor_task_id === taskId)
    .map((edge) => ({
      edgeId: edge.id,
      task: byId.get(edge.predecessor_task_id),
    }));
  const successors = graph.dependencies
    .filter((edge) => edge.predecessor_task_id === taskId)
    .map((edge) => ({
      edgeId: edge.id,
      task: byId.get(edge.successor_task_id),
    }));
  // A missing endpoint is fail-closed, never silently satisfied.
  const blockers = predecessors.filter(
    ({ task }) => !task || !taskSatisfiesDependency(task),
  );
  return {
    predecessors,
    successors,
    blockers,
    availability: blockers.length ? ("BLOCKED" as const) : ("READY" as const),
    inconsistentCompletion: Boolean(task?.status === "done" && blockers.length),
  };
}
export function projectDependencySummary(
  graph: TaskDependencyGraph,
  projectId: string,
) {
  const tasks = graph.tasks.filter(
    (task) => task.project_id === projectId && taskIsOpen(task),
  );
  const ready = tasks.filter(
    (task) => taskDependencyContext(graph, task.id).availability === "READY",
  );
  const blocked = tasks.filter(
    (task) => taskDependencyContext(graph, task.id).availability === "BLOCKED",
  );
  return { ready, blocked, hasReadyTask: ready.length > 0 };
}
// Disclosure candidates only; the database remains authoritative under races.
export function dependencyCandidates(
  graph: TaskDependencyGraph,
  taskId: string,
) {
  const task = graph.tasks.find((task) => task.id === taskId);
  if (!task?.project_id || task.archived_at || task.status === "archived")
    return [];
  const existing = new Set(
    graph.dependencies
      .filter((edge) => edge.successor_task_id === taskId)
      .map((edge) => edge.predecessor_task_id),
  );
  const descendants = new Set([taskId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of graph.dependencies)
      if (
        descendants.has(edge.predecessor_task_id) &&
        !descendants.has(edge.successor_task_id)
      ) {
        descendants.add(edge.successor_task_id);
        changed = true;
      }
  }
  return graph.tasks.filter(
    (candidate) =>
      candidate.project_id === task.project_id &&
      !candidate.archived_at &&
      candidate.status !== "archived" &&
      !descendants.has(candidate.id) &&
      !existing.has(candidate.id) &&
      (!(task.status === "done" || task.completed_at) ||
        taskSatisfiesDependency(candidate)),
  );
}

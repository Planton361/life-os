import {
  taskDependencyContext,
  taskHasExecutableLifecycle,
  type TaskDependencyGraph,
} from "@/features/real-data/domain/task-dependencies";

type Task = TaskDependencyGraph["tasks"][number];
export type ProjectWorkCategory = "done" | "ready" | "blocked" | "other";

// Presentation only. The existing completion command remains authoritative.
export function projectWorkBalance(
  projectId: string,
  tasks: readonly Task[],
  graph: TaskDependencyGraph,
  sources: readonly { task_id: string | null }[],
) {
  const sourceOwned = new Set(sources.map((source) => source.task_id));
  const recorded = tasks.filter(
    (task) =>
      task.project_id === projectId &&
      !task.archived_at &&
      !["canceled", "archived"].includes(task.status),
  );
  const counts = { done: 0, ready: 0, blocked: 0, other: 0 };
  const categories = new Map<string, ProjectWorkCategory>();
  for (const task of recorded) {
    const category: ProjectWorkCategory =
      task.status === "done"
        ? "done"
        : !taskHasExecutableLifecycle(task)
          ? "other"
          : taskDependencyContext(graph, task.id).availability === "BLOCKED"
            ? "blocked"
            : sourceOwned.has(task.id)
              ? "other"
              : "ready";
    counts[category]++;
    categories.set(task.id, category);
  }
  return {
    total: recorded.length,
    counts,
    categories,
    readyTaskIds: recorded
      .filter((task) => categories.get(task.id) === "ready")
      .map((task) => task.id),
  };
}

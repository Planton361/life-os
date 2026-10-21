import { projectWorkBalance } from "@/features/entities/workbench/project-work-balance";
import type { TaskDependencyGraph } from "@/features/real-data/domain/task-dependencies";

export type DashboardProjectWorkRead = {
  tasks: TaskDependencyGraph["tasks"] | null;
  dependencies: TaskDependencyGraph["dependencies"] | null;
  sources: { task_id: string | null }[] | null;
  milestones:
    | { project_id: string; status: string; archived_at: string | null }[]
    | null;
};

export type DashboardProjectWorkBalance = {
  state: "available" | "reduced" | "unavailable";
  total: number;
  counts: { done: number; ready: number; blocked: number; other: number };
  milestones: { total: number; done: number } | null;
};

export function dashboardProjectWorkBalance(
  projectId: string,
  read?: DashboardProjectWorkRead,
): DashboardProjectWorkBalance {
  const complete = read?.dependencies != null && read?.sources != null;
  const tasks = read?.tasks;
  const balance = projectWorkBalance(
    projectId,
    tasks ?? [],
    { tasks: tasks ?? [], dependencies: complete ? read.dependencies! : [] },
    complete ? read.sources! : [],
  );
  const milestones = read?.milestones?.filter(
    (m) => m.project_id === projectId && !m.archived_at,
  );
  return {
    state: tasks == null ? "unavailable" : complete ? "available" : "reduced",
    total: balance.total,
    // Unverified open work is never presented as executable or blocked.
    counts: complete
      ? balance.counts
      : {
          done: balance.counts.done,
          ready: 0,
          blocked: 0,
          other: balance.total - balance.counts.done,
        },
    milestones:
      milestones == null
        ? null
        : {
            total: milestones.length,
            done: milestones.filter((m) => m.status === "done").length,
          },
  };
}

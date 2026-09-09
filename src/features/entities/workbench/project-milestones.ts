type Milestone = {
  id: string;
  project_id: string;
  status: string;
  sort_order: number;
  archived_at: string | null;
};
type Task = {
  id: string;
  project_id: string | null;
  milestone_id?: string | null;
  status: string;
  archived_at: string | null;
};
export function projectMilestoneGroups<M extends Milestone, T extends Task>(
  projectId: string,
  milestones: M[],
  allTasks: T[],
) {
  const tasks = allTasks.filter(
    (t) => t.project_id === projectId && !t.archived_at,
  );
  const stages = milestones
    .filter((m) => m.project_id === projectId && !m.archived_at)
    .sort(
      (a, b) =>
        Number(a.status === "done") - Number(b.status === "done") ||
        a.sort_order - b.sort_order ||
        a.id.localeCompare(b.id),
    );
  return {
    groups: stages.map((m) => {
      const linked = tasks.filter((t) => t.milestone_id === m.id);
      return {
        milestone: m,
        tasks: linked,
        done: linked.filter((t) => t.status === "done").length,
      };
    }),
    unassigned: tasks.filter((t) => !t.milestone_id),
    taskCount: tasks.length,
    tasksDone: tasks.filter((t) => t.status === "done").length,
    milestoneCount: stages.length,
    milestonesDone: stages.filter((m) => m.status === "done").length,
  };
}

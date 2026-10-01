import type { WorkbenchData } from "@/features/real-data/supabase/repositories/entity-workbench-read";
import { EntityForm } from "./forms";
import { ManagementDialog } from "./management-disclosure";
import { taskTextFields } from "./task-text";
import type { FieldValues } from "./types";

type Task = WorkbenchData["tasks"][number];
export function taskEditValues(task: Task): FieldValues {
  const text = taskTextFields(task.description);
  return {
    ...task,
    areaId: task.area_id,
    description: text.description,
    nextAction: text.nextAction,
    projectId: task.project_id,
    goalId: task.goal_id,
    durationMinutes: task.duration_minutes,
    plannedDate: task.planned_date,
    dueAt: task.due_at?.slice(0, 10),
  };
}

export function TaskEditDialog({
  data,
  taskId,
  initiallyOpen = false,
}: {
  data: WorkbenchData;
  taskId: string;
  initiallyOpen?: boolean;
}) {
  const task = data.tasks.find((item) => item.id === taskId)!;
  if (task.archived_at) return null;
  const options = (
    rows: WorkbenchData["projects"] | WorkbenchData["goals"],
    current: string | null,
  ) =>
    rows
      .filter((row) => !row.archived_at || row.id === current)
      .map((row) => ({
        id: row.id,
        title: row.title + (row.archived_at ? " (archiviert)" : ""),
      }));
  return (
    <ManagementDialog
      label="Task bearbeiten"
      triggerText="Bearbeiten"
      initiallyOpen={initiallyOpen}
      clearSearchParamOnClose="edit"
      resetOnClose
      closeText="Abbrechen"
      panelClassName="m-auto"
    >
      <EntityForm
        taskEditDialog
        kind="task"
        id={task.id}
        values={taskEditValues(task)}
        areas={data.areas
          .filter((area) => !area.archived_at || area.id === task.area_id)
          .map((area) => ({
            id: area.id,
            title: area.name + (area.archived_at ? " (archiviert)" : ""),
          }))}
        projects={options(data.projects, task.project_id)}
        goals={options(data.goals, task.goal_id)}
        sourceOwned={data.scheduleSources.some(
          (source) => source.task_id === task.id,
        )}
      />
    </ManagementDialog>
  );
}

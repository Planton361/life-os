import { taskStepProgress } from "@/features/entities/workbench/task-step-progress";

export type DashboardTaskStepProgress =
  | ({ state: "available"; taskId: string } & ReturnType<
      typeof taskStepProgress
    >)
  | { state: "unavailable"; taskId: string };

export function currentTaskStepProgress(
  taskId: string,
  steps: { archived_at: string | null; completed_at: string | null }[] | null,
): DashboardTaskStepProgress {
  return steps === null
    ? { state: "unavailable", taskId }
    : { state: "available", taskId, ...taskStepProgress(steps) };
}

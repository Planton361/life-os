import "server-only";
import { z } from "zod";
import { currentTaskStepProgress } from "@/features/dashboard/current-task-progress";

export const dashboardTaskStepColumns = "task_id,archived_at,completed_at";
const stepsSchema = z.array(
  z.object({
    task_id: z.uuid(),
    archived_at: z.string().nullable(),
    completed_at: z.string().nullable(),
  }),
);

// Only the selected Task is read, through an authenticated owner-bound adapter.
// A failed or incomplete read must never become an apparently empty checklist.
export async function readDashboardTaskSteps(
  taskId: string,
  reader: (taskId: string) => Promise<unknown[]>,
) {
  try {
    z.uuid().parse(taskId);
    const steps = stepsSchema.parse(await reader(taskId));
    if (steps.some((step) => step.task_id !== taskId))
      throw new Error("TASK_STEP_SCOPE");
    return currentTaskStepProgress(taskId, steps);
  } catch {
    return currentTaskStepProgress(taskId, null);
  }
}

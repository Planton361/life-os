import "server-only";
import { z } from "zod";
import { taskDependencyGraphSchema } from "../domain/task-dependencies";
import type { DashboardProjectWorkRead } from "@/features/dashboard/project-work-balance";

export const projectWorkColumns = {
  tasks: "id,title,project_id,status,completed_at,archived_at",
  task_dependencies: "id,predecessor_task_id,successor_task_id",
  project_milestones: "id,project_id,status,archived_at",
  schedule_source_links: "task_id,source_id",
} as const;
export type ProjectWorkTable = keyof typeof projectWorkColumns;
export type ProjectWorkReader = (
  table: ProjectWorkTable,
  ids: readonly string[],
) => Promise<unknown[]>;

// Each dataset fails independently: unavailable is not an empty collection.
// The caller supplies an authenticated, owner-bound reader, never a client id.
export async function readDashboardProjectWork(
  reader: ProjectWorkReader,
  projectIds: readonly string[],
): Promise<DashboardProjectWorkRead> {
  async function read<T>(
    table: ProjectWorkTable,
    ids: readonly string[],
    schema: z.ZodType<T>,
  ): Promise<T | null> {
    if (!ids.length) return schema.parse([]);
    try {
      return schema.parse(await reader(table, ids));
    } catch {
      return null;
    }
  }
  const [tasks, dependencies, milestones] = await Promise.all([
    read("tasks", projectIds, taskDependencyGraphSchema.shape.tasks),
    read(
      "task_dependencies",
      projectIds,
      taskDependencyGraphSchema.shape.dependencies,
    ),
    read(
      "project_milestones",
      projectIds,
      z.array(
        z.object({
          project_id: z.uuid(),
          status: z.string(),
          archived_at: z.string().nullable(),
        }),
      ),
    ),
  ]);
  const sources =
    tasks === null
      ? null
      : await read(
          "schedule_source_links",
          tasks.map((task) => task.id),
          z.array(z.object({ task_id: z.uuid().nullable() })),
        );
  return { tasks, dependencies, milestones, sources };
}

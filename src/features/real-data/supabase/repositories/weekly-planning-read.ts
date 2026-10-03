import type { SupabaseClientLike, TableRow } from "../database.types";
import { readTaskDependencyGraph } from "./task-dependency-repository";
import {
  buildWeeklyTaskContexts,
  type WeeklyContextSources,
} from "../../../calendar/weekly-task-context";

type WeeklyTable =
  | "tasks"
  | "projects"
  | "goals"
  | "project_milestones"
  | "goal_milestones"
  | "goal_milestone_task_support"
  | "goal_milestone_project_support"
  | "skills"
  | "task_skill_links";

// Paginate canonical owner reads; PostgREST's first page is not a complete graph.
async function ownedRows<T extends WeeklyTable>(
  client: SupabaseClientLike,
  userId: string,
  table: T,
): Promise<TableRow<T>[]> {
  const rows: TableRow<T>[] = [];
  for (let start = 0; ; start += 500) {
    const result = await client
      .from(table as WeeklyTable)
      .select("*")
      .eq("user_id", userId)
      .order("id")
      .range(start, start + 499);
    if (result.error) throw new Error("Planning context unavailable");
    const page = (result.data ?? []) as unknown as TableRow<T>[];
    rows.push(...page);
    if (page.length < 500) return rows;
  }
}

/** Caller supplies the server-authenticated owner. Reads only; existing RLS/RPCs. */
export async function readWeeklyPlanningContext(
  client: SupabaseClientLike,
  userId: string,
) {
  const graph = await readTaskDependencyGraph(client).catch(() => null);
  const tasks = await ownedRows(client, userId, "tasks");
  try {
    const [
      projects,
      goals,
      projectMilestones,
      goalMilestones,
      taskSupport,
      projectSupport,
      skills,
      taskSkills,
    ] = await Promise.all([
      ownedRows(client, userId, "projects"),
      ownedRows(client, userId, "goals"),
      ownedRows(client, userId, "project_milestones"),
      ownedRows(client, userId, "goal_milestones"),
      ownedRows(client, userId, "goal_milestone_task_support"),
      ownedRows(client, userId, "goal_milestone_project_support"),
      ownedRows(client, userId, "skills"),
      ownedRows(client, userId, "task_skill_links"),
    ]);
    const linkedSkills = new Set(taskSkills.map((l) => l.skill_id));
    const targetReads = await Promise.all(
      skills
        .filter((s) => !s.archived_at && linkedSkills.has(s.id))
        .map(async (skill) => {
          try {
            const read = await client.rpc("skill_development_read", {
              p_skill_id: skill.id,
            });
            if (read.error || !read.data || read.data.skill.user_id !== userId)
              throw new Error("unavailable");
            return {
              id: skill.id,
              targets: read.data.targets,
              unavailable: false,
            };
          } catch {
            return { id: skill.id, targets: [], unavailable: true };
          }
        }),
    );
    const sources: WeeklyContextSources = {
      tasks,
      projects,
      goals,
      projectMilestones,
      goalMilestones,
      taskSupport,
      projectSupport,
      skills,
      taskSkills,
      targets: targetReads.flatMap((r) => r.targets),
      targetUnavailable: targetReads
        .filter((r) => r.unavailable)
        .map((r) => r.id),
    };
    return {
      contexts: buildWeeklyTaskContexts(userId, sources, graph),
      dependencyUnavailable: !graph,
    };
  } catch {
    const empty: WeeklyContextSources = {
      tasks,
      projects: [],
      goals: [],
      projectMilestones: [],
      goalMilestones: [],
      taskSupport: [],
      projectSupport: [],
      skills: [],
      taskSkills: [],
      targets: [],
      targetUnavailable: [],
    };
    const contexts = buildWeeklyTaskContexts(userId, empty, graph);
    Object.values(contexts).forEach((c) => {
      c.unavailable = true;
    });
    return { contexts, dependencyUnavailable: !graph };
  }
}

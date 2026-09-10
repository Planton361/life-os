import type { SupabaseClientLike, TableRow } from "../database.types";
import { z } from "zod";

export const projectExportInput = z.object({ projectId: z.uuid() }).strict();
export const projectionLimits = {
  rowsPerQuery: 2000,
  sourceBytes: 8 * 1024 * 1024,
};
export class ProjectionReadError extends Error {}
const columns = {
  projects:
    "id,title,description,status,priority,area_id,goal_id,next_step,target_date,archived_at,updated_at",
  tasks:
    "id,title,description,status,priority,area_id,project_id,goal_id,milestone_id,due_at,completed_at,archived_at,updated_at",
  project_milestones:
    "id,project_id,title,description,status,target_date,sort_order,archived_at,updated_at",
  goals:
    "id,title,description,status,horizon,why,measure,target_value,target_date,area_id,archived_at,updated_at",
  skills: "id,name,summary,status,category,area_id,archived_at,updated_at",
  resources: "id,title,summary,type,url,source,area_id,archived_at,updated_at",
  task_dependencies: "id,project_id,predecessor_task_id,successor_task_id",
  task_skill_links: "id,task_id,skill_id",
  resource_relations:
    "id,resource_id,target_type,target_id,relation_type,project_role",
  skill_evidence:
    "id,skill_id,source_type,source_id,title,note,evidence_date,updated_at",
  areas: "id,name",
} as const;
type Tables = keyof typeof columns;
type Fields<S extends string> = S extends `${infer A},${infer B}`
  ? A | Fields<B>
  : S;
type SourceRow<T extends Tables> = { id: string } & Pick<
  TableRow<T>,
  Extract<Fields<(typeof columns)[T]>, keyof TableRow<T>>
>;
// The query allowlist is also the privacy boundary: no auth/profile/provider payloads.
// Return types retain canonical field names; renderers explicitly select properties.
export async function readProjectProjection(
  client: SupabaseClientLike,
  userId: string,
  input: unknown,
) {
  const parsed = projectExportInput.safeParse(input);
  if (!parsed.success) throw new ProjectionReadError("Ungültiges Project.");
  const projectId = parsed.data.projectId;
  let bytes = 0;
  async function read<T extends Tables>(
    table: T,
    filters: Record<string, string | string[]>,
  ): Promise<SourceRow<T>[]> {
    const rows: SourceRow<T>[] = [];
    const pageSize = 250;
    for (
      let start = 0;
      start <= projectionLimits.rowsPerQuery;
      start += pageSize
    ) {
      let q = client
        .from(table as Tables)
        .select(columns[table], { count: "exact" })
        .eq("user_id", userId);
      for (const [field, value] of Object.entries(filters))
        q = Array.isArray(value) ? q.in(field, value) : q.eq(field, value);
      const result = await q.order("id").range(start, start + pageSize - 1);
      if (result.error || result.count === null)
        throw new ProjectionReadError(
          "Project-Daten konnten nicht geladen werden.",
        );
      if (result.count > projectionLimits.rowsPerQuery)
        throw new ProjectionReadError(
          "Das Project überschreitet die Exportgrenze. Bitte verkleinere den Exportumfang.",
        );
      const page = (result.data ?? []) as unknown as SourceRow<T>[];
      bytes += Buffer.byteLength(JSON.stringify(page));
      if (bytes > projectionLimits.sourceBytes)
        throw new ProjectionReadError(
          "Das Project ist für ein Exportpaket zu groß.",
        );
      rows.push(...page);
      if (rows.length >= result.count) return rows;
      if (!page.length)
        throw new ProjectionReadError(
          "Project-Daten haben sich geändert. Bitte erneut exportieren.",
        );
    }
    throw new ProjectionReadError("Exportgrenze erreicht.");
  }
  async function byIds<T extends Tables>(
    table: T,
    field: string,
    ids: string[],
    extra: Record<string, string> = {},
  ) {
    const unique = [...new Set(ids)].sort();
    const rows: SourceRow<T>[] = [];
    for (let i = 0; i < unique.length; i += 100)
      rows.push(
        ...(await read(table, { ...extra, [field]: unique.slice(i, i + 100) })),
      );
    return [...new Map(rows.map((r) => [r.id, r])).values()];
  }
  const project = (await read("projects", { id: projectId }))[0];
  if (!project)
    throw new ProjectionReadError("Project nicht verfügbar oder kein Zugriff.");
  const tasks = await read("tasks", { project_id: projectId });
  const milestones = await read("project_milestones", {
    project_id: projectId,
  });
  const dependencies = await read("task_dependencies", {
    project_id: projectId,
  });
  const taskIds = tasks.map((t) => t.id);
  const goals = await byIds(
    "goals",
    "id",
    [project.goal_id, ...tasks.map((t) => t.goal_id)].filter(
      (id): id is string => Boolean(id),
    ),
  );
  const taskSkills = await byIds("task_skill_links", "task_id", taskIds);
  const evidence = [
    ...(await read("skill_evidence", {
      source_type: "project",
      source_id: projectId,
    })),
    ...(await byIds("skill_evidence", "source_id", taskIds, {
      source_type: "task",
    })),
    ...(await byIds(
      "skill_evidence",
      "source_id",
      goals.map((g) => g.id),
      { source_type: "goal" },
    )),
  ];
  const skills = await byIds("skills", "id", [
    ...taskSkills.map((l) => l.skill_id),
    ...evidence.map((e) => e.skill_id),
  ]);
  const relations = [
    ...(await read("resource_relations", {
      target_type: "project",
      target_id: projectId,
    })),
    ...(await byIds("resource_relations", "target_id", taskIds, {
      target_type: "task",
    })),
    ...(await byIds(
      "resource_relations",
      "target_id",
      goals.map((g) => g.id),
      { target_type: "goal" },
    )),
    ...(await byIds(
      "resource_relations",
      "target_id",
      skills.map((s) => s.id),
      { target_type: "skill" },
    )),
  ];
  const resources = await byIds(
    "resources",
    "id",
    relations.map((r) => r.resource_id),
  );
  // Evidence is only included when both source and Skill resolve in this Project scope.
  const resourceEvidence = await byIds(
    "skill_evidence",
    "source_id",
    resources.map((r) => r.id),
    { source_type: "resource" },
  );
  evidence.push(
    ...resourceEvidence.filter((e) => skills.some((s) => s.id === e.skill_id)),
  );
  const entities = [project, ...tasks, ...goals, ...skills, ...resources];
  const areas = await byIds(
    "areas",
    "id",
    entities.map((e) => e.area_id).filter((id): id is string => Boolean(id)),
  );
  const taskSet = new Set(taskIds);
  if (
    dependencies.some(
      (e) =>
        !taskSet.has(e.predecessor_task_id) ||
        !taskSet.has(e.successor_task_id),
    )
  )
    throw new ProjectionReadError(
      "Dependencies haben sich geändert. Bitte erneut exportieren.",
    );
  if (
    tasks.some(
      (t) => t.milestone_id && !milestones.some((m) => m.id === t.milestone_id),
    )
  )
    throw new ProjectionReadError(
      "Milestones haben sich geändert. Bitte erneut exportieren.",
    );
  return {
    project,
    tasks,
    milestones,
    dependencies,
    goals,
    taskSkills,
    skills,
    relations,
    resources,
    evidence,
    areas,
  };
}
export type ProjectProjectionSource = Awaited<
  ReturnType<typeof readProjectProjection>
>;

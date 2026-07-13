import type { SupabaseClientLike } from "../database.types";

export type EducationWorkspace = {
  projects: Array<{
    description: string | null;
    id: string;
    literature: Array<{ body: string | null; id: string; relationId: string; relationType: string; title: string; type: string; url: string | null }>;
    status: string;
    tasks: Array<{ dueAt: string | null; id: string; plannedDate: string | null; status: string; title: string }>;
    title: string;
  }>;
  resources: Array<{ body: string | null; id: string; title: string; type: string; url: string | null }>;
};

function failure(message: string) { return { error: message, ok: false as const }; }

export function createSupabaseEducationRepository(client: SupabaseClientLike) {
  async function educationAreaId(userId: string) {
    const result = await client.from("areas").select("id").eq("user_id", userId).eq("key", "education").is("archived_at", null).maybeSingle();
    return result.error ? null : result.data?.id ?? null;
  }

  async function ensureEducationArea(userId: string) {
    const existing = await educationAreaId(userId);
    if (existing) return existing;
    const inserted = await client.from("areas").insert({ key: "education", name: "Education", sort_order: 90, user_id: userId }).select("id").maybeSingle();
    if (!inserted.error && inserted.data) return inserted.data.id;
    return educationAreaId(userId);
  }

  async function ownedProject(userId: string, projectId: string) {
    const areaId = await educationAreaId(userId);
    if (!areaId) return null;
    const result = await client.from("projects").select("id").eq("user_id", userId).eq("area_id", areaId).eq("id", projectId).is("archived_at", null).maybeSingle();
    return result.error ? null : result.data;
  }

  return {
    ensureEducationArea,
    ownedProject,
    async createProject(userId: string, input: { description?: string; status: string; title: string }) {
      const areaId = await ensureEducationArea(userId);
      if (!areaId) return failure("Education area unavailable.");
      const result = await client.from("projects").insert({ area_id: areaId, description: input.description ?? null, status: input.status as "active", title: input.title, user_id: userId }).select("id").single();
      return result.error ? failure("Project create failed.") : { data: result.data, ok: true as const };
    },
    async updateProject(userId: string, projectId: string, input: { description?: string; status: string; title: string }) {
      if (!(await ownedProject(userId, projectId))) return failure("Education project unavailable.");
      const result = await client.from("projects").update({ description: input.description ?? null, status: input.status as "active", title: input.title }).eq("user_id", userId).eq("id", projectId).select("id").single();
      return result.error ? failure("Project update failed.") : { data: result.data, ok: true as const };
    },
    async getWorkspace(userId: string): Promise<EducationWorkspace> {
      const areaId = await ensureEducationArea(userId);
      if (!areaId) return { projects: [], resources: [] };
      const [projectsResult, resourcesResult] = await Promise.all([
        client.from("projects").select("id,title,description,status").eq("user_id", userId).eq("area_id", areaId).is("archived_at", null).order("updated_at", { ascending: false }),
        client.from("resources").select("id,title,summary,url,type").eq("user_id", userId).is("archived_at", null).order("updated_at", { ascending: false }),
      ]);
      const projects = projectsResult.data ?? [];
      const resources = (resourcesResult.data ?? []).map((resource) => ({ body: resource.summary, id: resource.id, title: resource.title, type: resource.type, url: resource.url }));
      const projectIds = projects.map((project) => project.id);
      if (!projectIds.length) return { projects: [], resources };
      const [tasksResult, relationsResult] = await Promise.all([
        client.from("tasks").select("id,title,status,due_at,planned_date,project_id").eq("user_id", userId).in("project_id", projectIds).is("archived_at", null),
        client.from("resource_relations").select("id,resource_id,target_id,relation_type").eq("user_id", userId).eq("target_type", "project").in("target_id", projectIds),
      ]);
      const resourceById = new Map(resources.map((resource) => [resource.id, resource]));
      return {
        resources,
        projects: projects.map((project) => ({
          ...project,
          literature: (relationsResult.data ?? []).filter((relation) => relation.target_id === project.id).flatMap((relation) => {
            const resource = resourceById.get(relation.resource_id);
            return resource ? [{ ...resource, relationId: relation.id, relationType: relation.relation_type }] : [];
          }),
          tasks: (tasksResult.data ?? []).filter((task) => task.project_id === project.id).map((task) => ({ dueAt: task.due_at, id: task.id, plannedDate: task.planned_date, status: task.status, title: task.title })),
        })),
      };
    },
  };
}

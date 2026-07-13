import type { ProjectStatus } from "../../domain/project";
import type {
  CodingProjectInput,
  CodingSessionInput,
} from "../../schemas/coding.schemas";
import type { SupabaseClientLike } from "../database.types";

export type CodingProjectRecord = {
  description: string | null;
  id: string;
  repositoryUrl: string | null;
  status: ProjectStatus;
  title: string;
};

export type CodingSessionRecord = {
  activity: string;
  archivedAt: string | null;
  durationMinutes: number;
  id: string;
  note: string | null;
  outcome: string;
  projectId: string;
  projectTitle: string;
  sessionDate: string;
  startTime: string | null;
};

export type CodingWorkspace = {
  projects: CodingProjectRecord[];
  sessions: CodingSessionRecord[];
  tasksByProject: ReadonlyMap<string, readonly { id: string; status: string; title: string }[]>;
  resourcesByProject: ReadonlyMap<string, readonly { id: string; relationType: string; title: string }[]>;
};

function failure(message: string) {
  return { error: message, ok: false as const };
}

export function createSupabaseCodingRepository(client: SupabaseClientLike) {
  async function codingAreaId(userId: string) {
    const result = await client.from("areas").select("id").eq("user_id", userId).eq("key", "coding").is("archived_at", null).maybeSingle();
    return result.error ? null : result.data?.id ?? null;
  }

  async function ensureCodingArea(userId: string) {
    const existing = await codingAreaId(userId);
    if (existing) return existing;

    const inserted = await client
      .from("areas")
      .insert({ key: "coding", name: "Coding", sort_order: 80, user_id: userId })
      .select("id")
      .maybeSingle();

    if (!inserted.error && inserted.data) return inserted.data.id;

    return codingAreaId(userId);
  }

  async function ownedCodingProject(userId: string, projectId: string) {
    const areaId = await codingAreaId(userId);
    if (!areaId) return null;
    const result = await client.from("projects").select("id").eq("user_id", userId).eq("area_id", areaId).eq("id", projectId).is("archived_at", null).maybeSingle();
    return result.error ? null : result.data;
  }

  return {
    async archiveSession(userId: string, sessionId: string) {
      const result = await client.from("coding_sessions").update({ archived_at: new Date().toISOString() }).eq("user_id", userId).eq("id", sessionId).is("archived_at", null).select("id").maybeSingle();
      return result.error || !result.data ? failure("Session not found.") : { data: result.data, ok: true as const };
    },

    async createProject(userId: string, input: CodingProjectInput) {
      const areaId = await codingAreaId(userId);
      if (!areaId) return failure("Coding area is unavailable.");
      const result = await client.from("projects").insert({ area_id: areaId, description: input.description ?? null, repository_url: input.repositoryUrl ?? null, status: input.status, title: input.title, user_id: userId }).select("*").single();
      return result.error ? failure("Project could not be created.") : { data: result.data, ok: true as const };
    },

    async createSession(userId: string, input: CodingSessionInput) {
      if (!(await ownedCodingProject(userId, input.projectId))) return failure("Coding project not found.");
      const result = await client.from("coding_sessions").insert({ activity: input.activity, duration_minutes: input.durationMinutes, note: input.note ?? null, outcome: input.outcome, project_id: input.projectId, session_date: input.sessionDate, start_time: input.startTime ?? null, user_id: userId }).select("*").single();
      return result.error ? failure("Session could not be created.") : { data: result.data, ok: true as const };
    },

    async getWorkspace(userId: string): Promise<CodingWorkspace> {
      const areaId = await ensureCodingArea(userId);
      if (!areaId) return { projects: [], resourcesByProject: new Map(), sessions: [], tasksByProject: new Map() };
      const projectsResult = await client.from("projects").select("id,title,description,status,repository_url").eq("user_id", userId).eq("area_id", areaId).is("archived_at", null).order("updated_at", { ascending: false });
      const projects = (projectsResult.data ?? []).map((project) => ({ description: project.description, id: project.id, repositoryUrl: project.repository_url, status: project.status, title: project.title }));
      const projectIds = projects.map((project) => project.id);
      if (projectIds.length === 0) return { projects, resourcesByProject: new Map(), sessions: [], tasksByProject: new Map() };
      const [tasksResult, relationsResult, sessionsResult] = await Promise.all([
        client.from("tasks").select("id,title,status,project_id").eq("user_id", userId).in("project_id", projectIds).is("archived_at", null),
        client.from("resource_relations").select("resource_id,target_id,relation_type,resources!inner(id,title,user_id,archived_at)").eq("user_id", userId).eq("target_type", "project").in("target_id", projectIds),
        client.from("coding_sessions").select("*").eq("user_id", userId).in("project_id", projectIds).order("session_date", { ascending: false }).order("created_at", { ascending: false }),
      ]);
      const tasksByProject = new Map<string, { id: string; status: string; title: string }[]>();
      for (const task of tasksResult.data ?? []) if (task.project_id) tasksByProject.set(task.project_id, [...(tasksByProject.get(task.project_id) ?? []), task]);
      const resourcesByProject = new Map<string, { id: string; relationType: string; title: string }[]>();
      for (const relation of relationsResult.data ?? []) {
        const resource = Array.isArray(relation.resources) ? relation.resources[0] : relation.resources;
        if (!resource || resource.user_id !== userId || resource.archived_at) continue;
        resourcesByProject.set(relation.target_id, [...(resourcesByProject.get(relation.target_id) ?? []), { id: resource.id, relationType: relation.relation_type, title: resource.title }]);
      }
      const titles = new Map(projects.map((project) => [project.id, project.title]));
      const sessions = (sessionsResult.data ?? []).map((session) => ({ activity: session.activity, archivedAt: session.archived_at, durationMinutes: session.duration_minutes, id: session.id, note: session.note, outcome: session.outcome, projectId: session.project_id, projectTitle: titles.get(session.project_id) ?? "Nicht mehr verfügbar", sessionDate: session.session_date, startTime: session.start_time, }));
      return { projects, resourcesByProject, sessions, tasksByProject };
    },

    async updateProject(userId: string, projectId: string, input: CodingProjectInput) {
      if (!(await ownedCodingProject(userId, projectId))) return failure("Coding project not found.");
      const result = await client.from("projects").update({ description: input.description ?? null, repository_url: input.repositoryUrl ?? null, status: input.status, title: input.title }).eq("user_id", userId).eq("id", projectId).select("*").single();
      return result.error ? failure("Project could not be updated.") : { data: result.data, ok: true as const };
    },

    async updateSession(userId: string, sessionId: string, input: CodingSessionInput) {
      if (!(await ownedCodingProject(userId, input.projectId))) return failure("Coding project not found.");
      const result = await client.from("coding_sessions").update({ activity: input.activity, duration_minutes: input.durationMinutes, note: input.note ?? null, outcome: input.outcome, project_id: input.projectId, session_date: input.sessionDate, start_time: input.startTime ?? null }).eq("user_id", userId).eq("id", sessionId).is("archived_at", null).select("*").maybeSingle();
      return result.error || !result.data ? failure("Session could not be updated.") : { data: result.data, ok: true as const };
    },
  };
}

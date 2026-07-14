import type {
  CreateJournalEntryInput,
  CreateLifeNoteInput,
  UpdateJournalEntryInput,
  UpdateLifeNoteInput,
} from "../../schemas/life.schemas";
import type { LifeNote, LifeNoteRelation, LifeWorkspace } from "../../domain/life";
import type { SupabaseClientLike } from "../database.types";
import { mapJournalEntryRow } from "../mappers/life.mapper";

function failure(message: string) {
  return { error: message, ok: false as const };
}

function relationHref(type: LifeNoteRelation["targetType"], id: string) {
  if (type === "task") return `/portfolio?view=tasks&selected=${id}`;
  if (type === "goal") return `/portfolio?view=goals&selected=${id}`;
  return `/portfolio?view=projects&selected=${id}`;
}

export function createSupabaseLifeRepository(client: SupabaseClientLike) {
  async function findArea(userId: string) {
    const result = await client.from("areas").select("id").eq("user_id", userId).eq("key", "life").is("archived_at", null).maybeSingle();
    return result.error ? null : result.data?.id ?? null;
  }

  async function ensureArea(userId: string) {
    const existing = await findArea(userId);
    if (existing) return existing;
    const inserted = await client.from("areas").insert({ key: "life", name: "Life", sort_order: 110, user_id: userId }).select("id").maybeSingle();
    if (!inserted.error && inserted.data) return inserted.data.id;
    return findArea(userId);
  }

  async function ownedNote(userId: string, resourceId: string, includeArchived = false) {
    const areaId = await ensureArea(userId);
    if (!areaId) return null;
    let query = client.from("resources").select("id").eq("id", resourceId).eq("user_id", userId).eq("area_id", areaId).eq("type", "note");
    if (!includeArchived) query = query.is("archived_at", null);
    const result = await query.maybeSingle();
    return result.error ? null : result.data;
  }

  async function noteRelations(userId: string, resourceIds: string[]) {
    const result = resourceIds.length === 0 ? null : await client.from("resource_relations").select("id,resource_id,target_id,target_type,relation_type").eq("user_id", userId).in("resource_id", resourceIds).in("target_type", ["project", "goal", "task"]);
    const rows = result?.data ?? [];
    const idsByType = {
      goal: rows.filter((row) => row.target_type === "goal").map((row) => row.target_id),
      project: rows.filter((row) => row.target_type === "project").map((row) => row.target_id),
      task: rows.filter((row) => row.target_type === "task").map((row) => row.target_id),
    };
    const [goals, projects, tasks] = await Promise.all([
      idsByType.goal.length ? client.from("goals").select("id,title").eq("user_id", userId).in("id", idsByType.goal) : null,
      idsByType.project.length ? client.from("projects").select("id,title").eq("user_id", userId).in("id", idsByType.project) : null,
      idsByType.task.length ? client.from("tasks").select("id,title").eq("user_id", userId).in("id", idsByType.task) : null,
    ]);
    const labels = new Map<string, string>();
    for (const item of [...(goals?.data ?? []), ...(projects?.data ?? []), ...(tasks?.data ?? [])]) labels.set(item.id, item.title);
    const byResource = new Map<string, LifeNoteRelation[]>();
    for (const row of rows) {
      if (row.target_type !== "goal" && row.target_type !== "project" && row.target_type !== "task") continue;
      const label = labels.get(row.target_id);
      if (!label) continue;
      const relation: LifeNoteRelation = { href: relationHref(row.target_type, row.target_id), id: row.id, label, relationType: row.relation_type, targetType: row.target_type };
      byResource.set(row.resource_id, [...(byResource.get(row.resource_id) ?? []), relation]);
    }
    return byResource;
  }

  return {
    ensureArea,
    async getWorkspace(userId: string): Promise<LifeWorkspace> {
      const areaId = await ensureArea(userId);
      if (!areaId) return { areaAvailable: false, journalEntries: [], notes: [] };
      const [journal, resources] = await Promise.all([
        client.from("journal_entries").select("*").eq("user_id", userId).order("entry_date", { ascending: false }).order("created_at", { ascending: false }),
        client.from("resources").select("id,title,summary,archived_at,created_at,updated_at").eq("user_id", userId).eq("area_id", areaId).eq("type", "note").order("updated_at", { ascending: false }),
      ]);
      const resourceRows = resources.data ?? [];
      const relations = await noteRelations(userId, resourceRows.map((resource) => resource.id));
      const notes: LifeNote[] = resourceRows.map((resource) => ({ archivedAt: resource.archived_at, body: resource.summary ?? "", createdAt: resource.created_at, id: resource.id, relations: relations.get(resource.id) ?? [], title: resource.title, updatedAt: resource.updated_at }));
      return { areaAvailable: true, journalEntries: (journal.data ?? []).map(mapJournalEntryRow), notes };
    },
    async createJournalEntry(userId: string, input: CreateJournalEntryInput) {
      const result = await client.from("journal_entries").insert({ body: input.body, entry_date: input.entryDate, title: input.title, user_id: userId }).select("*").single();
      return result.error || !result.data ? failure("Journal entry could not be created.") : { data: mapJournalEntryRow(result.data), ok: true as const };
    },
    async updateJournalEntry(userId: string, input: UpdateJournalEntryInput) {
      const result = await client.from("journal_entries").update({ body: input.body, entry_date: input.entryDate, title: input.title }).eq("user_id", userId).eq("id", input.journalEntryId).is("archived_at", null).select("*").maybeSingle();
      return result.error || !result.data ? failure("Journal entry is unavailable.") : { data: mapJournalEntryRow(result.data), ok: true as const };
    },
    async archiveJournalEntry(userId: string, journalEntryId: string) {
      const result = await client.from("journal_entries").update({ archived_at: new Date().toISOString() }).eq("user_id", userId).eq("id", journalEntryId).is("archived_at", null).select("id").maybeSingle();
      return result.error || !result.data ? failure("Journal entry is unavailable.") : { data: result.data, ok: true as const };
    },
    async createNote(userId: string, input: CreateLifeNoteInput) {
      const areaId = await ensureArea(userId);
      if (!areaId) return failure("Life area is unavailable.");
      const result = await client.from("resources").insert({ area_id: areaId, review_needed: false, source: "life:note", summary: input.body, title: input.title, type: "note", user_id: userId }).select("id").single();
      return result.error || !result.data ? failure("Note could not be created.") : { data: result.data, ok: true as const };
    },
    async updateNote(userId: string, resourceId: string, input: UpdateLifeNoteInput) {
      if (!(await ownedNote(userId, resourceId))) return failure("Note is unavailable.");
      const result = await client.from("resources").update({ summary: input.body, title: input.title }).eq("user_id", userId).eq("id", resourceId).is("archived_at", null).select("id").maybeSingle();
      return result.error || !result.data ? failure("Note could not be updated.") : { data: result.data, ok: true as const };
    },
    async setNoteArchived(userId: string, resourceId: string, archived: boolean) {
      if (!(await ownedNote(userId, resourceId, !archived))) return failure("Note is unavailable.");
      let query = client.from("resources").update({ archived_at: archived ? new Date().toISOString() : null }).eq("user_id", userId).eq("id", resourceId);
      query = archived ? query.is("archived_at", null) : query.not("archived_at", "is", null);
      const result = await query.select("id").maybeSingle();
      return result.error || !result.data ? failure("Note lifecycle could not be updated.") : { data: result.data, ok: true as const };
    },
  };
}

import "server-only";
import type { Json } from "@/types/supabase";
import type { SupabaseClientLike, TableRow } from "../database.types";

export type ProjectReviewContext = {
  project_id: string;
  status: string;
  archived_at: string | null;
  desired_result: string | null;
  completion_revision: string;
  completion_cycle: string;
  fingerprint: string;
  current_completion_review_id: string | null;
  criteria: {
    id: string; text: string; sort_order: string;
    archived_at: string | null; archive_reason: string | null;
    archived_cycle: string | null; archived_revision: string | null;
  }[];
  work: {
    type: "task" | "milestone"; id: string; title: string; status: string;
    archived_at: string | null; updated_at: string; milestone_id?: string | null;
  }[];
  resources: {
    id: string; relation_id: string; title: string; type: string;
    url: string | null; role: string; relation_type: string; token: string;
  }[];
};

export type ProjectDepthRead = {
  context: ProjectReviewContext;
  reviews: (Omit<TableRow<"project_reviews">, "completion_cycle" | "revision_before" | "revision_after"> & { completion_cycle: string; revision_before: string; revision_after: string })[];
  criteriaSnapshots: (Omit<TableRow<"project_review_criteria">, "sort_order_snapshot" | "archived_cycle_snapshot" | "archived_revision_snapshot"> & { sort_order_snapshot: string; archived_cycle_snapshot: string | null; archived_revision_snapshot: string | null })[];
  resourceSnapshots: TableRow<"project_review_resources">[];
  availableResourceIds: string[];
  resourceStates: { id: string; title: string; archived: boolean; relationIds: string[] }[];
  lifecycle: (Omit<TableRow<"project_lifecycle_events">, "revision_after" | "cycle_before" | "cycle_after"> & { revision_after: string; cycle_before: string; cycle_after: string })[];
  amendments: (Omit<TableRow<"project_review_amendments">, "revision_after"> & { revision_after: string })[];
  historyItems: { id: string; kind: "review" | "lifecycle" | "amendment"; revision: string }[];
  nextRevision: string | null;
};

export async function readProjectDepth(
  client: SupabaseClientLike,
  userId: string,
  projectId: string,
  beforeRevision?: string,
): Promise<ProjectDepthRead> {
  const [context, history] = await Promise.all([
    client.rpc("project_review_context", { p_project_id: projectId }),
    client.rpc("project_depth_history", { p_project_id: projectId, p_before_revision: beforeRevision }),
  ]);
  if (context.error || history.error || !context.data || !history.data) throw new Error("Project-Abschlussdaten konnten nicht geladen werden.");
  const detail = history.data as unknown as {
    reviews: ProjectDepthRead["reviews"]; criteria: ProjectDepthRead["criteriaSnapshots"];
    resources: ProjectDepthRead["resourceSnapshots"]; lifecycle: ProjectDepthRead["lifecycle"];
    amendments: ProjectDepthRead["amendments"]; items: ProjectDepthRead["historyItems"]; next_revision: string | null;
  };
  const snapshotResourceIds = [...new Set(detail.resources.map((row) => row.resource_id))];
  const [available, relations] = snapshotResourceIds.length ? await Promise.all([
    client.from("resources").select("id,title,archived_at").eq("user_id", userId).in("id", snapshotResourceIds),
    client.from("resource_relations").select("id,resource_id").eq("user_id", userId).eq("target_type", "project").eq("target_id", projectId).in("resource_id", snapshotResourceIds),
  ]) : [{ data: [], error: null }, { data: [], error: null }];
  if (available.error || relations.error) throw new Error("Project-Resource-Verfügbarkeit konnte nicht geladen werden.");
  return {
    context: context.data as unknown as ProjectReviewContext,
    reviews: detail.reviews,
    criteriaSnapshots: detail.criteria,
    resourceSnapshots: detail.resources,
    availableResourceIds: (available.data ?? []).filter((row) => !row.archived_at).map((row) => row.id),
    resourceStates: (available.data ?? []).map((row) => ({ id: row.id, title: row.title, archived: !!row.archived_at, relationIds: (relations.data ?? []).filter((relation) => relation.resource_id === row.id).map((relation) => relation.id) })),
    lifecycle: detail.lifecycle,
    amendments: detail.amendments,
    historyItems: detail.items,
    nextRevision: detail.next_revision,
  };
}

export async function writeProjectDepth(
  client: SupabaseClientLike,
  input: {
    projectId: string; commandId: string; operation: string;
    expectedRevision: string | number; expectedCycle: string | number; payload: Json;
  },
): Promise<{ ok: true; data: Json } | { ok: false; message: string }> {
  let result;
  for (let attempt = 0; attempt < 3; attempt++) {
    result = await client.rpc("project_depth_command", {
    p_project_id: input.projectId,
    p_command_id: input.commandId,
    p_operation: input.operation,
    p_expected_revision: String(input.expectedRevision),
    p_expected_cycle: String(input.expectedCycle),
    p_payload: input.payload,
  });
    if (!result.error || !["40001", "40P01", "55P03"].includes(result.error.code ?? "") || attempt === 2) break;
  }
  if (!result) return { ok: false, message: "Project-Änderung konnte nicht gespeichert werden." };
  if (!result.error && result.data) return { ok: true, data: result.data };
  const code = result.error?.message ?? "";
  if (/PROJECT_STALE|PROJECT_.*CONFLICT|PROJECT_ALREADY_COMPLETED|PROJECT_RESOURCE_UNAVAILABLE/.test(code)) {
    return { ok: false, message: "Project wurde inzwischen geändert. Entwurf behalten, Seite bewusst neu laden und erneut prüfen." };
  }
  if (/PROJECT_.*LIMIT|PROJECT_PAYLOAD_LIMIT/.test(code)) {
    return { ok: false, message: "Die Grenze für diesen Project-Review wurde erreicht. Die Eingabe wurde nicht gespeichert." };
  }
  if (/PROJECT_/.test(code)) return { ok: false, message: code };
  return { ok: false, message: "Project-Änderung konnte nicht gespeichert werden." };
}

export async function setProjectNonterminalStatus(
  client: SupabaseClientLike,
  userId: string,
  projectId: string,
  status: string,
  commandId = crypto.randomUUID(),
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!["idea", "active", "paused", "blocked", "completed"].includes(status)) {
    return { ok: false, message: "Abschluss benötigt einen Project Review." };
  }
  const response = await client.rpc("project_review_context", { p_project_id: projectId });
  const current = { data: response.data as unknown as ProjectReviewContext | null };
  if (response.error || !current.data) return { ok: false, message: "Project nicht verfügbar." };
  if (current.data.status === status) return { ok: true };
  if (status === "completed" || current.data.status === "completed") {
    return { ok: false, message: "Abschluss oder Wiederöffnung benötigt einen Project Review." };
  }
  const result = await writeProjectDepth(client, {
    projectId, commandId, operation: "project.status.set",
    expectedRevision: current.data.completion_revision,
    expectedCycle: current.data.completion_cycle,
    payload: { status },
  });
  return result.ok ? { ok: true } : result;
}

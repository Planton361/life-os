import "server-only";
import type { Json } from "@/types/supabase";
import type { SupabaseClientLike, TableRow } from "../database.types";

export type ProjectReviewContext = {
  project_id: string;
  status: string;
  archived_at: string | null;
  desired_result: string | null;
  completion_revision: number;
  completion_cycle: number;
  fingerprint: string;
  criteria: {
    id: string; text: string; sort_order: number;
    archived_at: string | null; archive_reason: string | null;
    archived_cycle: number | null;
  }[];
  work: {
    type: "task" | "milestone"; id: string; title: string; status: string;
    archived_at: string | null; updated_at: string; milestone_id?: string | null;
  }[];
  resources: {
    id: string; relation_id: string; title: string; type: string;
    url: string | null; role: string; relation_type: string;
  }[];
};

export type ProjectDepthRead = {
  context: ProjectReviewContext;
  reviews: TableRow<"project_reviews">[];
  criteriaSnapshots: TableRow<"project_review_criteria">[];
  resourceSnapshots: TableRow<"project_review_resources">[];
  availableResourceIds: string[];
  workSnapshots: TableRow<"project_review_work">[];
  lifecycle: TableRow<"project_lifecycle_events">[];
  amendments: TableRow<"project_review_amendments">[];
};

export async function readProjectDepth(
  client: SupabaseClientLike,
  userId: string,
  projectId: string,
): Promise<ProjectDepthRead> {
  const [context, reviews, criteria, resources, work, lifecycle, amendments] =
    await Promise.all([
      client.rpc("project_review_context", { p_project_id: projectId }),
      client.from("project_reviews").select("*").eq("user_id", userId)
        .eq("project_id", projectId).order("reviewed_at", { ascending: false }),
      client.from("project_review_criteria").select("*").eq("user_id", userId)
        .eq("project_id", projectId),
      client.from("project_review_resources").select("*").eq("user_id", userId)
        .eq("project_id", projectId),
      client.from("project_review_work").select("*").eq("user_id", userId)
        .eq("project_id", projectId),
      client.from("project_lifecycle_events").select("*").eq("user_id", userId)
        .eq("project_id", projectId).order("occurred_at", { ascending: false }),
      client.from("project_review_amendments").select("*").eq("user_id", userId)
        .eq("project_id", projectId).order("created_at", { ascending: true }),
    ]);
  if (context.error || reviews.error || criteria.error || resources.error || work.error ||
      lifecycle.error || amendments.error || !context.data) {
    throw new Error("Project-Abschlussdaten konnten nicht geladen werden.");
  }
  const snapshotResourceIds = [...new Set((resources.data ?? []).map((row) => row.resource_id))];
  const available = snapshotResourceIds.length
    ? await client.from("resources").select("id").eq("user_id", userId)
      .in("id", snapshotResourceIds).is("archived_at", null)
    : { data: [], error: null };
  if (available.error) throw new Error("Project-Resource-Verfügbarkeit konnte nicht geladen werden.");
  return {
    context: context.data as unknown as ProjectReviewContext,
    reviews: reviews.data ?? [],
    criteriaSnapshots: criteria.data ?? [],
    resourceSnapshots: resources.data ?? [],
    availableResourceIds: (available.data ?? []).map((row) => row.id),
    workSnapshots: work.data ?? [],
    lifecycle: lifecycle.data ?? [],
    amendments: amendments.data ?? [],
  };
}

export async function writeProjectDepth(
  client: SupabaseClientLike,
  input: {
    projectId: string; commandId: string; operation: string;
    expectedRevision: number; expectedCycle: number; payload: Json;
  },
): Promise<{ ok: true; data: Json } | { ok: false; message: string }> {
  const result = await client.rpc("project_depth_command", {
    p_project_id: input.projectId,
    p_command_id: input.commandId,
    p_operation: input.operation,
    p_expected_revision: input.expectedRevision,
    p_expected_cycle: input.expectedCycle,
    p_payload: input.payload,
  });
  if (!result.error && result.data) return { ok: true, data: result.data };
  const code = result.error?.message ?? "";
  if (/PROJECT_STALE|PROJECT_.*CONFLICT|PROJECT_ALREADY_COMPLETED/.test(code)) {
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
  const current = await client.from("projects")
    .select("status,completion_revision,completion_cycle")
    .eq("id", projectId).eq("user_id", userId).is("archived_at", null).maybeSingle();
  if (current.error || !current.data) return { ok: false, message: "Project nicht verfügbar." };
  if (current.data.status === status) return { ok: true };
  if (status === "completed" || current.data.status === "completed") {
    return { ok: false, message: "Abschluss oder Wiederöffnung benötigt einen Project Review." };
  }
  const result = await writeProjectDepth(client, {
    projectId, commandId, operation: "project.status",
    expectedRevision: current.data.completion_revision,
    expectedCycle: current.data.completion_cycle,
    payload: { status },
  });
  return result.ok ? { ok: true } : result;
}

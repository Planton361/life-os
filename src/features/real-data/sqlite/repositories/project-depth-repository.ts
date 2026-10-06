import "server-only";
import type { ProjectDepthRead } from "../../supabase/repositories/project-depth-repository";
import type { Json } from "@/types/supabase";
import { uuid, int64 } from "../codecs";
import { requireOwnerContext, type OwnerContext } from "../owner-context";
import type { SqliteRuntime } from "../runtime";
import {
  executeProjectDepthInTransaction,
  parseProjectCommand,
} from "../commands/project-depth-commands";
import {
  projectReviewContext,
  projectDepthHistory,
  projectOne,
  projectRows,
} from "./project-depth-read";
export function readSqliteProjectDepth(
  store: SqliteRuntime,
  context: OwnerContext,
  projectId: string,
  beforeRevision?: string,
): ProjectDepthRead {
  requireOwnerContext(context);
  projectId = uuid(projectId);
  if (beforeRevision !== undefined) int64(beforeRevision);
  return store.read(context, (db, owner) => {
    const current = projectReviewContext(db, owner, projectId),
      history = projectDepthHistory(db, owner, projectId, beforeRevision);
    const ids = new Set(history.resources.map((r) => r.resource_id));
    const available = projectRows(
      db,
      "SELECT id,title,archived_at FROM resources WHERE user_id=?",
      owner,
    ).filter((r) => ids.has(r.id));
    const relations = projectRows(
      db,
      "SELECT id,resource_id FROM resource_relations WHERE user_id=? AND target_type='project' AND target_id=?",
      owner,
      projectId,
    );
    const completion =
      current.status === "completed" && current.current_completion_review_id
        ? projectOne(
            db,
            "SELECT revision_after FROM project_reviews WHERE user_id=? AND project_id=? AND id=? AND decision='completed' AND completion_cycle=?",
            owner,
            projectId,
            current.current_completion_review_id,
            BigInt(current.completion_cycle),
          )
        : null;
    return {
      context: current,
      reviews: history.reviews,
      criteriaSnapshots: history.criteria,
      resourceSnapshots: history.resources,
      availableResourceIds: available
        .filter((r) => r.archived_at === null)
        .map((r) => String(r.id)),
      resourceStates: available.map((r) => ({
        id: String(r.id),
        title: String(r.title),
        archived: r.archived_at !== null,
        relationIds: relations
          .filter((rr) => rr.resource_id === r.id)
          .map((rr) => String(rr.id)),
      })),
      lifecycle: history.lifecycle,
      amendments: history.amendments,
      historyItems: history.items,
      nextRevision: history.next_revision,
      completionReviewHistoryBefore: completion
        ? String((completion.revision_after as bigint) + BigInt(1))
        : null,
    } as unknown as ProjectDepthRead;
  });
}
export function projectDepthCommand(
  store: SqliteRuntime,
  context: OwnerContext,
  input: unknown,
) {
  requireOwnerContext(context);
  const command = parseProjectCommand(input);
  return store.command(context, `project.${command.operation}`, (db, owner) =>
    executeProjectDepthInTransaction(db, owner, command),
  );
}
export async function writeSqliteProjectDepth(
  store: SqliteRuntime,
  context: OwnerContext,
  input: unknown,
): Promise<{ ok: true; data: Json } | { ok: false; message: string }> {
  try {
    return {
      ok: true,
      data: projectDepthCommand(store, context, input) as Json,
    };
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (
      /PROJECT_STALE|PROJECT_.*CONFLICT|PROJECT_ALREADY_COMPLETED|PROJECT_RESOURCE_UNAVAILABLE/.test(
        code,
      )
    )
      return {
        ok: false,
        message:
          "Project wurde inzwischen geändert. Entwurf behalten, Seite bewusst neu laden und erneut prüfen.",
      };
    if (/PROJECT_.*LIMIT|PROJECT_PAYLOAD_LIMIT/.test(code))
      return {
        ok: false,
        message:
          "Die Grenze für diesen Project-Review wurde erreicht. Die Eingabe wurde nicht gespeichert.",
      };
    return {
      ok: false,
      message: /^PROJECT_/.test(code)
        ? code
        : "Project-Änderung konnte nicht gespeichert werden.",
    };
  }
}

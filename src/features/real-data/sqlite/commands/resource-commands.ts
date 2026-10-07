import "server-only";
import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import { projectArtifactInputSchema } from "../../schemas/project-artifact.schemas";
import { linkResourceInputSchema } from "../../schemas/resource.schemas";
import type { ResourceRelationRow } from "../../supabase/row-types";
import { timestamp } from "../codecs";

export const resourceTargetTables = {
  goal: "goals",
  project: "projects",
  resource: "resources",
  skill: "skills",
  task: "tasks",
} as const;

export function linkResource(
  db: Database.Database,
  owner: string,
  input: unknown,
): ResourceRelationRow {
  if (!db.inTransaction) throw new Error("ATOMIC_TRANSACTION_REQUIRED");
  const parsed = linkResourceInputSchema.safeParse(input);
  if (
    !parsed.success ||
    parsed.data.userId !== owner ||
    parsed.data.profileId !== owner
  )
    throw new Error("RESOURCE_INPUT_OR_OWNER_DENIED");
  const value = parsed.data;
  if (
    !db
      .prepare(
        "SELECT 1 FROM resources WHERE user_id=? AND id=? AND archived_at IS NULL",
      )
      .get(owner, value.resourceId)
  )
    throw new Error("RESOURCE_UNAVAILABLE");
  const table = resourceTargetTables[value.targetType];
  if (
    !db
      .prepare(
        `SELECT 1 FROM ${table} WHERE user_id=? AND id=? AND archived_at IS NULL${value.targetType === "skill" ? " AND status='active'" : ""}`,
      )
      .get(owner, value.targetId)
  )
    throw new Error("RESOURCE_TARGET_UNAVAILABLE");
  const existing = db
    .prepare(
      "SELECT * FROM resource_relations WHERE user_id=? AND resource_id=? AND target_type=? AND target_id=? AND relation_type=?",
    )
    .get(
      owner,
      value.resourceId,
      value.targetType,
      value.targetId,
      value.relationType,
    ) as ResourceRelationRow | undefined;
  if (existing) return existing;
  const id = randomUUID();
  db.prepare(
    "INSERT INTO resource_relations(id,user_id,resource_id,target_type,target_id,relation_type,created_at) VALUES(?,?,?,?,?,?,?)",
  ).run(
    id,
    owner,
    value.resourceId,
    value.targetType,
    value.targetId,
    value.relationType,
    timestamp(new Date().toISOString()),
  );
  return db
    .prepare("SELECT * FROM resource_relations WHERE user_id=? AND id=?")
    .get(owner, id) as ResourceRelationRow;
}

// The Project lock in PostgreSQL is the native BEGIN IMMEDIATE writer transaction.
// Callers must retain that transaction through demotion and promotion.
export function setProjectResourceRole(
  db: Database.Database,
  owner: string,
  input: unknown,
): string | null {
  if (!db.inTransaction) throw new Error("ATOMIC_TRANSACTION_REQUIRED");
  const parsed = projectArtifactInputSchema.safeParse(input);
  if (!parsed.success) throw new Error("ARTIFACT_INPUT_INVALID");
  const { projectId, resourceId, role } = parsed.data;
  if (
    !db
      .prepare(
        `SELECT 1 FROM projects WHERE user_id=? AND id=?${role === "remove" ? "" : " AND archived_at IS NULL"}`,
      )
      .get(owner, projectId)
  )
    throw new Error("ARTIFACT_PROJECT_UNAVAILABLE");
  if (
    !db
      .prepare(
        `SELECT 1 FROM resources WHERE user_id=? AND id=?${role === "remove" || role === "reference" ? "" : " AND archived_at IS NULL"}`,
      )
      .get(owner, resourceId)
  )
    throw new Error("ARTIFACT_RESOURCE_UNAVAILABLE");
  if (role === "remove") {
    db.prepare(
      "DELETE FROM resource_relations WHERE user_id=? AND target_type='project' AND target_id=? AND resource_id=?",
    ).run(owner, projectId, resourceId);
    return null;
  }
  const existing = db
    .prepare(
      "SELECT id FROM resource_relations WHERE user_id=? AND target_type='project' AND target_id=? AND resource_id=? ORDER BY (project_role<>'reference') DESC,created_at,id LIMIT 1",
    )
    .get(owner, projectId, resourceId) as { id: string } | undefined;
  const id = existing?.id ?? randomUUID();
  if (!existing)
    db.prepare(
      "INSERT INTO resource_relations(id,user_id,resource_id,target_type,target_id,relation_type,created_at) VALUES(?,?,?,'project',?,'context',?)",
    ).run(
      id,
      owner,
      resourceId,
      projectId,
      timestamp(new Date().toISOString()),
    );
  if (role === "primary_artifact")
    db.prepare(
      "UPDATE resource_relations SET project_role='additional_artifact' WHERE user_id=? AND target_type='project' AND target_id=? AND id<>? AND project_role='primary_artifact'",
    ).run(owner, projectId, id);
  db.prepare(
    "UPDATE resource_relations SET project_role=? WHERE user_id=? AND id=?",
  ).run(role, owner, id);
  return id;
}

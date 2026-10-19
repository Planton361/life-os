import "server-only";
import { randomUUID } from "node:crypto";
import { projectResourceUses } from "../../../entities/workbench/project-artifacts";
import type { ResourceRepository } from "../../repositories";
import type { RepositoryResult } from "../../repositories/repository-result";
import {
  createResourceInputSchema,
  updateResourceInputSchema,
  resourceLifecycleInputSchema,
} from "../../schemas/resource.schemas";
import {
  mapResourceRowToDomain,
  mapResourceRelationRowToDomain,
} from "../../supabase/mappers/resource.mapper";
import type {
  ResourceRow,
  ResourceRelationRow,
} from "../../supabase/row-types";
import { timestamp, uuid } from "../codecs";
import { requireOwnerContext, type OwnerContext } from "../owner-context";
import type { SqliteRuntime } from "../runtime";
import {
  createTaskResourceInputSchema,
  taskResourceFields,
} from "../../schemas/task-resource.schemas";
import {
  linkResource,
  setProjectResourceRole,
  resourceTargetTables,
} from "../commands/resource-commands";

type StoredResource = Omit<ResourceRow, "review_needed"> & {
  review_needed: bigint;
};
const resource = (row: StoredResource) =>
  mapResourceRowToDomain({ ...row, review_needed: Boolean(row.review_needed) });
function failure(
  message = "Resource operation failed.",
): RepositoryResult<never> {
  return { ok: false, error: { code: "adapter_unavailable", message } };
}
function forbidden(): RepositoryResult<never> {
  return {
    ok: false,
    error: {
      code: "forbidden",
      message: "Resource is outside the issued owner scope.",
    },
  };
}

export function createSqliteResourceRepository(
  store: SqliteRuntime,
  context: OwnerContext,
): ResourceRepository {
  const owner = requireOwnerContext(context);
  const scoped = (user: string, profile: string) =>
    user === owner && profile === owner;
  const relations = (
    user: string,
    profile: string,
    clause = "",
    parameters: string[] = [],
  ) => {
    if (!scoped(user, profile)) return forbidden();
    return store.read(context, (db) => ({
      ok: true as const,
      data: (
        db
          .prepare(
            `SELECT * FROM resource_relations WHERE user_id=? AND target_type IN ('goal','project','resource','skill','task') ${clause} ORDER BY created_at DESC,id`,
          )
          .all(owner, ...parameters) as ResourceRelationRow[]
      ).map(mapResourceRelationRowToDomain),
    }));
  };
  return {
    async createTaskResource(input) {
      if (!scoped(input.userId, input.profileId)) return forbidden();
      const parsed = createTaskResourceInputSchema.safeParse(input);
      if (!parsed.success) return failure("Invalid Task Resource input.");
      try {
        return store.command(context, "resource.create", (db) => {
          const { taskId, resourceId, draft } = parsed.data;
          const task = db
            .prepare(
              "SELECT project_id FROM tasks WHERE user_id=? AND id=? AND archived_at IS NULL AND status<>'archived'",
            )
            .get(owner, taskId) as { project_id: string | null } | undefined;
          if (
            !task ||
            db
              .prepare(
                "SELECT 1 FROM schedule_source_links WHERE user_id=? AND task_id=?",
              )
              .get(owner, taskId)
          )
            throw new Error("TASK_RESOURCE_READ_ONLY");
          if (
            task.project_id &&
            !db
              .prepare(
                "SELECT 1 FROM projects WHERE user_id=? AND id=? AND archived_at IS NULL AND status<>'archived'",
              )
              .get(owner, task.project_id)
          )
            throw new Error("TASK_RESOURCE_PARENT_READ_ONLY");
          const fields = taskResourceFields(draft);
          const existing = db
            .prepare("SELECT * FROM resources WHERE user_id=? AND id=?")
            .get(owner, resourceId) as StoredResource | undefined;
          if (existing) {
            if (
              existing.archived_at ||
              existing.type !== fields.type ||
              existing.title !== fields.title ||
              existing.summary !== fields.body ||
              existing.url !== fields.url
            )
              throw new Error("TASK_RESOURCE_RETRY_CONFLICT");
          } else {
            const at = timestamp(new Date().toISOString());
            db.prepare(
              "INSERT INTO resources(id,user_id,type,title,summary,url,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)",
            ).run(
              resourceId,
              owner,
              fields.type,
              fields.title,
              fields.body,
              fields.url,
              at,
              at,
            );
          }
          // Canonical relation command in the same owned transaction: any failure
          // rolls back creation, including stale endpoints and relation guards.
          linkResource(db, owner, {
            userId: owner,
            profileId: owner,
            resourceId,
            targetId: taskId,
            targetType: "task",
            relationType: "context",
          });
          return { ok: true as const, data: { resourceId, linked: true } };
        });
      } catch {
        return failure("Task Resource could not be saved and linked.");
      }
    },
    async createResource(input) {
      if (!scoped(input.userId, input.profileId)) return forbidden();
      const parsed = createResourceInputSchema.safeParse(input);
      if (!parsed.success) return failure("Invalid Resource input.");
      try {
        return store.command(context, "resource.create", (db) => {
          const value = parsed.data,
            id = randomUUID(),
            at = timestamp(new Date().toISOString());
          const area = value.areaId ? uuid(value.areaId) : null;
          if (
            area &&
            !db
              .prepare(
                "SELECT 1 FROM areas WHERE user_id=? AND id=? AND archived_at IS NULL",
              )
              .get(owner, area)
          )
            throw new Error("RESOURCE_AREA_UNAVAILABLE");
          db.prepare(
            "INSERT INTO resources(id,user_id,area_id,type,title,summary,url,source,review_needed,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
          ).run(
            id,
            owner,
            area,
            value.type,
            value.title,
            value.body ?? value.context ?? null,
            value.url ?? null,
            value.source ?? null,
            value.reviewNeeded ? 1 : 0,
            at,
            at,
          );
          return {
            ok: true as const,
            data: resource(
              db
                .prepare("SELECT * FROM resources WHERE user_id=? AND id=?")
                .get(owner, id) as StoredResource,
            ),
          };
        });
      } catch {
        return failure();
      }
    },
    async updateResource(input) {
      if (!scoped(input.userId, input.profileId)) return forbidden();
      const parsed = updateResourceInputSchema.safeParse(input);
      if (!parsed.success) return failure("Invalid Resource update.");
      try {
        return store.command(context, "resource.update", (db) => {
          const value = parsed.data;
          const row = db
            .prepare(
              "SELECT * FROM resources WHERE user_id=? AND id=? AND archived_at IS NULL",
            )
            .get(owner, value.resourceId) as StoredResource | undefined;
          if (!row) throw new Error("RESOURCE_UNAVAILABLE");
          db.prepare(
            "UPDATE resources SET title=?,type=?,summary=?,url=?,updated_at=? WHERE user_id=? AND id=?",
          ).run(
            value.title ?? row.title,
            value.type ?? row.type,
            value.body === undefined ? row.summary : value.body,
            value.url === undefined ? row.url : value.url,
            timestamp(new Date().toISOString()),
            owner,
            row.id,
          );
          return {
            ok: true as const,
            data: resource(
              db
                .prepare("SELECT * FROM resources WHERE user_id=? AND id=?")
                .get(owner, row.id) as StoredResource,
            ),
          };
        });
      } catch {
        return failure();
      }
    },
    async archiveResource(input) {
      return lifecycle(input, true);
    },
    async restoreResource(input) {
      return lifecycle(input, false);
    },
    async getResourcesByUser(user, profile, includeArchived = false) {
      if (!scoped(user, profile)) return forbidden();
      try {
        return store.read(context, (db) => ({
          ok: true as const,
          data: (
            db
              .prepare(
                `SELECT * FROM resources WHERE user_id=? ${includeArchived ? "" : "AND archived_at IS NULL"} ORDER BY updated_at DESC,id`,
              )
              .all(owner) as StoredResource[]
          ).map(resource),
        }));
      } catch {
        return failure();
      }
    },
    async linkResource(input) {
      if (!scoped(input.userId, input.profileId)) return forbidden();
      try {
        return store.command(context, "resource.link", (db) => ({
          ok: true as const,
          data: mapResourceRelationRowToDomain(linkResource(db, owner, input)),
        }));
      } catch {
        return failure();
      }
    },
    async unlinkResource(user, profile, id) {
      if (!scoped(user, profile)) return forbidden();
      try {
        return store.command(context, "resource.unlink", (db) => {
          const row = db
            .prepare(
              "DELETE FROM resource_relations WHERE user_id=? AND id=? RETURNING *",
            )
            .get(owner, uuid(id)) as ResourceRelationRow | undefined;
          if (!row) throw new Error("RESOURCE_RELATION_UNAVAILABLE");
          return {
            ok: true as const,
            data: mapResourceRelationRowToDomain(row),
          };
        });
      } catch {
        return failure();
      }
    },
    async getResourceRelationsByUser(user, profile) {
      try {
        return relations(user, profile);
      } catch {
        return failure();
      }
    },
    async getResourceRelationsForResource(user, profile, id) {
      try {
        return relations(user, profile, "AND resource_id=?", [uuid(id)]);
      } catch {
        return failure();
      }
    },
    async getResourceRelationsForTarget(user, profile, type, id) {
      try {
        if (!Object.hasOwn(resourceTargetTables, type)) return failure();
        return relations(user, profile, "AND target_type=? AND target_id=?", [
          type,
          uuid(id),
        ]);
      } catch {
        return failure();
      }
    },
  };
  function lifecycle(input: unknown, archive: boolean) {
    const parsed = resourceLifecycleInputSchema.safeParse(input);
    if (!parsed.success) return failure("Invalid Resource lifecycle input.");
    const value = parsed.data;
    if (!scoped(value.userId, value.profileId)) return forbidden();
    try {
      return store.command(
        context,
        archive ? "resource.archive" : "resource.restore",
        (db) => {
          const at = timestamp(new Date().toISOString());
          const row = db
            .prepare(
              `UPDATE resources SET archived_at=?,updated_at=? WHERE user_id=? AND id=? ${archive ? "AND archived_at IS NULL" : ""} RETURNING *`,
            )
            .get(archive ? at : null, at, owner, value.resourceId) as
            | StoredResource
            | undefined;
          if (!row) throw new Error("RESOURCE_UNAVAILABLE");
          return { ok: true as const, data: resource(row) };
        },
      );
    } catch {
      return failure();
    }
  }
}

export function createSqliteProjectArtifactRepository(
  store: SqliteRuntime,
  context: OwnerContext,
) {
  const owner = requireOwnerContext(context);
  return {
    readProjectResourceUses(projectId: string) {
      projectId = uuid(projectId);
      return store.read(context, (db) => {
        if (
          !db
            .prepare("SELECT 1 FROM projects WHERE user_id=? AND id=?")
            .get(owner, projectId)
        )
          throw new Error("ARTIFACT_PROJECT_UNAVAILABLE");
        const rows = db
          .prepare(
            "SELECT r.* FROM resources r WHERE r.user_id=? AND r.archived_at IS NULL AND EXISTS(SELECT 1 FROM resource_relations l WHERE l.user_id=r.user_id AND l.resource_id=r.id AND l.target_type='project' AND l.target_id=?) ORDER BY r.updated_at DESC,r.id",
          )
          .all(owner, projectId) as StoredResource[];
        const relations = db
          .prepare(
            "SELECT * FROM resource_relations WHERE user_id=? AND target_type='project' AND target_id=? ORDER BY created_at,id",
          )
          .all(owner, projectId) as ResourceRelationRow[];
        return projectResourceUses(
          { resources: rows.map(resource), relations },
          projectId,
        );
      });
    },
    async setProjectResourceRole(input: unknown): Promise<boolean> {
      try {
        store.command(context, "resource.artifact", (db, owner) =>
          setProjectResourceRole(db, owner, input),
        );
        return true;
      } catch {
        return false;
      }
    },
  };
}

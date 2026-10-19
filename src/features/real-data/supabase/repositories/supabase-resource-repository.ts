import type { ResourceRepository } from "../../repositories";
import type { RepositoryResult } from "../../repositories/repository-result";
import {
  mapCreateResourceInputToInsert,
  mapLinkResourceInputToInsert,
  mapResourceRelationRowToDomain,
  mapResourceRowToDomain,
  mapUpdateResourceInputToPatch,
} from "../mappers";
import {
  supportedResourceRelationTargetTypes,
  type ResourceRelation,
  type SupportedResourceRelationTargetType,
} from "../../domain";
import { realDataTableNames } from "../database.types";
import type {
  SupabaseClientLike,
  SupabaseQueryResult,
} from "../database.types";
import type { ResourceRelationRow, ResourceRow } from "../row-types";
import {
  createTaskResourceInputSchema,
  taskResourceFields,
} from "../../schemas/task-resource.schemas";

async function writableTask(
  client: SupabaseClientLike,
  userId: string,
  taskId: string,
) {
  const task = (await client
    .from("tasks")
    .select("id,project_id")
    .eq("user_id", userId)
    .eq("id", taskId)
    .is("archived_at", null)
    .neq("status", "archived")
    .maybeSingle()) as SupabaseQueryResult<{
    id: string;
    project_id: string | null;
  }>;
  if (task.error || !task.data) return false;
  const source = await client
    .from("schedule_source_links")
    .select("id")
    .eq("user_id", userId)
    .eq("task_id", taskId)
    .maybeSingle();
  if (source.error || source.data) return false;
  if (!task.data.project_id) return true;
  const project = await client
    .from("projects")
    .select("id")
    .eq("user_id", userId)
    .eq("id", task.data.project_id)
    .is("archived_at", null)
    .neq("status", "archived")
    .maybeSingle();
  return !project.error && Boolean(project.data);
}

type RepositoryFailure = RepositoryResult<never>;

function profileScopeFailure(
  userId: string,
  profileId: string,
): RepositoryFailure | null {
  if (userId === profileId) return null;

  return {
    error: {
      code: "forbidden",
      message: "The requested profile is outside the current user scope.",
    },
    ok: false,
  };
}

function adapterFailure(operation: string): RepositoryFailure {
  return {
    error: {
      code: "adapter_unavailable",
      message: `Unable to ${operation}.`,
    },
    ok: false,
  };
}

function notFoundFailure(entity: string): RepositoryFailure {
  return {
    error: {
      code: "not_found",
      message: `${entity} was not found in the current user scope.`,
    },
    ok: false,
  };
}

function validationFailure(message: string): RepositoryFailure {
  return {
    error: {
      code: "validation_error",
      message,
    },
    ok: false,
  };
}

async function verifyAreaOwnership(
  client: SupabaseClientLike,
  userId: string,
  areaId: string | null | undefined,
): Promise<boolean> {
  if (areaId === undefined || areaId === null) return true;

  const result = (await client
    .from("areas")
    .select("id")
    .eq("user_id", userId)
    .eq("id", areaId)
    .is("archived_at", null)
    .maybeSingle()) as SupabaseQueryResult<{ id: string }>;

  return Boolean(!result.error && result.data);
}

function mapResourceRelationRows(
  rows: readonly ResourceRelationRow[],
): RepositoryResult<readonly ResourceRelation[]> {
  try {
    return {
      data: rows.map(mapResourceRelationRowToDomain),
      ok: true,
    };
  } catch {
    return adapterFailure("map resource relations");
  }
}

function isSupportedTargetType(
  targetType: string,
): targetType is SupportedResourceRelationTargetType {
  return supportedResourceRelationTargetTypes.includes(
    targetType as SupportedResourceRelationTargetType,
  );
}

async function verifyResourceOwnership(
  client: SupabaseClientLike,
  userId: string,
  resourceId: string,
): Promise<boolean> {
  const result = (await client
    .from(realDataTableNames.resources)
    .select("id")
    .eq("user_id", userId)
    .eq("id", resourceId)
    .is("archived_at", null)
    .maybeSingle()) as SupabaseQueryResult<{ id: string }>;

  return Boolean(!result.error && result.data);
}

async function verifyTargetOwnership(
  client: SupabaseClientLike,
  userId: string,
  targetType: SupportedResourceRelationTargetType,
  targetId: string,
): Promise<boolean> {
  switch (targetType) {
    case "goal": {
      const result = (await client
        .from(realDataTableNames.goals)
        .select("id")
        .eq("user_id", userId)
        .eq("id", targetId)
        .is("archived_at", null)
        .maybeSingle()) as SupabaseQueryResult<{ id: string }>;

      return Boolean(!result.error && result.data);
    }
    case "project": {
      const result = (await client
        .from(realDataTableNames.projects)
        .select("id")
        .eq("user_id", userId)
        .eq("id", targetId)
        .is("archived_at", null)
        .maybeSingle()) as SupabaseQueryResult<{ id: string }>;

      return Boolean(!result.error && result.data);
    }
    case "resource":
      return verifyResourceOwnership(client, userId, targetId);
    case "skill": {
      const result = (await client
        .from(realDataTableNames.skills)
        .select("id")
        .eq("user_id", userId)
        .eq("id", targetId)
        .eq("status", "active")
        .is("archived_at", null)
        .maybeSingle()) as SupabaseQueryResult<{ id: string }>;

      return Boolean(!result.error && result.data);
    }
    case "task": {
      const result = (await client
        .from(realDataTableNames.tasks)
        .select("id")
        .eq("user_id", userId)
        .eq("id", targetId)
        .is("archived_at", null)
        .maybeSingle()) as SupabaseQueryResult<{ id: string }>;

      return Boolean(!result.error && result.data);
    }
  }
}

export function createSupabaseResourceRepository(
  client: SupabaseClientLike,
): ResourceRepository {
  const repository: ResourceRepository = {
    async createTaskResource(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;
      const parsed = createTaskResourceInputSchema.safeParse(input);
      if (!parsed.success)
        return validationFailure("Invalid Task Resource input.");
      const { userId, profileId, resourceId, taskId, draft } = parsed.data;
      const fields = taskResourceFields(draft);
      const read = async () =>
        (await client
          .from("resources")
          .select("*")
          .eq("user_id", userId)
          .eq("id", resourceId)
          .maybeSingle()) as SupabaseQueryResult<ResourceRow>;
      let stored: ResourceRow | null = null;
      try {
        const existing = await read();
        if (existing.error) return adapterFailure("confirm task resource");
        stored = existing.data;
        if (
          stored &&
          (stored.archived_at ||
            stored.type !== fields.type ||
            stored.title !== fields.title ||
            stored.summary !== fields.body ||
            stored.url !== fields.url)
        )
          return validationFailure(
            "Task Resource retry conflicts with stored content.",
          );
        if (!(await writableTask(client, userId, taskId)))
          return stored
            ? { ok: true, data: { resourceId, linked: false } }
            : notFoundFailure("Writable Task");
        if (!stored) {
          // A server-derived stable ID makes uncertain transport/duplicate retries
          // converge. Existing canonical Resource fields and RLS remain in force.
          const inserted = (await client
            .from("resources")
            .insert({
              ...mapCreateResourceInputToInsert(
                {
                  userId,
                  profileId,
                  ...fields,
                  body: fields.body ?? undefined,
                  url: fields.url ?? undefined,
                },
                userId,
              ),
              id: resourceId,
            })
            .select("*")
            .single()) as SupabaseQueryResult<ResourceRow>;
          stored = inserted.data;
          if (inserted.error || !stored) {
            const retry = await read();
            if (retry.error || !retry.data)
              return adapterFailure(
                "confirm task resource creation; retry the same draft",
              );
            stored = retry.data;
            if (
              stored.archived_at ||
              stored.type !== fields.type ||
              stored.title !== fields.title ||
              stored.summary !== fields.body ||
              stored.url !== fields.url
            )
              return validationFailure(
                "Task Resource retry conflicts with stored content.",
              );
          }
        }
        if (!(await writableTask(client, userId, taskId)))
          return { ok: true, data: { resourceId, linked: false } };
        const linked = await repository.linkResource({
          userId,
          profileId,
          resourceId,
          targetType: "task",
          targetId: taskId,
          relationType: "context",
        });
        return { ok: true, data: { resourceId, linked: linked.ok } };
      } catch {
        // Never report an unlinked Resource as saved to the Task or discard it.
        return stored
          ? { ok: true, data: { resourceId, linked: false } }
          : adapterFailure("confirm task resource; retry the same draft");
      }
    },
    async archiveResource(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;
      const result = (await client.from(realDataTableNames.resources)
        .update({ archived_at: new Date().toISOString() })
        .eq("user_id", input.userId).eq("id", input.resourceId).is("archived_at", null)
        .select("*").single()) as SupabaseQueryResult<ResourceRow>;
      if (result.error || !result.data) return notFoundFailure("Resource");
      return { data: mapResourceRowToDomain(result.data), ok: true };
    },
    async createResource(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

      const areaOwned = await verifyAreaOwnership(
        client,
        input.userId,
        input.areaId,
      );
      if (!areaOwned) return notFoundFailure("Area");

      const insert = mapCreateResourceInputToInsert(input, input.userId);
      const result = (await client
        .from(realDataTableNames.resources)
        .insert(insert)
        .select("*")
        .single()) as SupabaseQueryResult<ResourceRow>;

      if (result.error) return adapterFailure("create resource");
      if (!result.data) return notFoundFailure("Resource");

      return {
        data: mapResourceRowToDomain(result.data),
        ok: true,
      };
    },

    async getResourceRelationsByUser(userId, profileId) {
      const scopeFailure = profileScopeFailure(userId, profileId);
      if (scopeFailure) return scopeFailure;

      const result = (await client
        .from(realDataTableNames.resourceRelations)
        .select("*")
        .eq("user_id", userId)
        .in("target_type", [...supportedResourceRelationTargetTypes])
        .order("created_at", { ascending: false })) as SupabaseQueryResult<
        readonly ResourceRelationRow[]
      >;

      if (result.error) return adapterFailure("load resource relations");

      return mapResourceRelationRows(result.data ?? []);
    },

    async getResourceRelationsForResource(userId, profileId, resourceId) {
      const scopeFailure = profileScopeFailure(userId, profileId);
      if (scopeFailure) return scopeFailure;

      const result = (await client
        .from(realDataTableNames.resourceRelations)
        .select("*")
        .eq("user_id", userId)
        .eq("resource_id", resourceId)
        .in("target_type", [...supportedResourceRelationTargetTypes])
        .order("created_at", { ascending: false })) as SupabaseQueryResult<
        readonly ResourceRelationRow[]
      >;

      if (result.error) return adapterFailure("load resource relations");

      return mapResourceRelationRows(result.data ?? []);
    },

    async getResourceRelationsForTarget(userId, profileId, targetType, targetId) {
      const scopeFailure = profileScopeFailure(userId, profileId);
      if (scopeFailure) return scopeFailure;

      if (!isSupportedTargetType(targetType)) {
        return validationFailure("Unsupported resource relation target type.");
      }

      const result = (await client
        .from(realDataTableNames.resourceRelations)
        .select("*")
        .eq("user_id", userId)
        .eq("target_type", targetType)
        .eq("target_id", targetId)
        .order("created_at", { ascending: false })) as SupabaseQueryResult<
        readonly ResourceRelationRow[]
      >;

      if (result.error) return adapterFailure("load resource relations");

      return mapResourceRelationRows(result.data ?? []);
    },

    async getResourcesByUser(userId, profileId, includeArchived = false) {
      const scopeFailure = profileScopeFailure(userId, profileId);
      if (scopeFailure) return scopeFailure;

      let query = client
        .from(realDataTableNames.resources)
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });
      if (!includeArchived) query = query.is("archived_at", null);
      const result = (await query) as SupabaseQueryResult<
        readonly ResourceRow[]
      >;

      if (result.error) return adapterFailure("load resources");

      return {
        data: (result.data ?? []).map(mapResourceRowToDomain),
        ok: true,
      };
    },

    async restoreResource(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;
      const result = (await client.from(realDataTableNames.resources)
        .update({ archived_at: null })
        .eq("user_id", input.userId).eq("id", input.resourceId)
        .select("*").single()) as SupabaseQueryResult<ResourceRow>;
      if (result.error || !result.data) return notFoundFailure("Resource");
      return { data: mapResourceRowToDomain(result.data), ok: true };
    },

    async updateResource(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;
      const result = (await client.from(realDataTableNames.resources)
        .update(mapUpdateResourceInputToPatch(input))
        .eq("user_id", input.userId).eq("id", input.resourceId).is("archived_at", null)
        .select("*").single()) as SupabaseQueryResult<ResourceRow>;
      if (result.error || !result.data) return notFoundFailure("Resource");
      return { data: mapResourceRowToDomain(result.data), ok: true };
    },

    async linkResource(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

      if (!isSupportedTargetType(input.targetType)) {
        return validationFailure("Unsupported resource relation target type.");
      }

      const sourceOwned = await verifyResourceOwnership(
        client,
        input.userId,
        input.resourceId,
      );
      if (!sourceOwned) return notFoundFailure("Resource");

      const targetOwned = await verifyTargetOwnership(
        client,
        input.userId,
        input.targetType,
        input.targetId,
      );
      if (!targetOwned) return notFoundFailure("Resource relation target");

      const existing = (await client
        .from(realDataTableNames.resourceRelations)
        .select("*")
        .eq("user_id", input.userId)
        .eq("resource_id", input.resourceId)
        .eq("target_type", input.targetType)
        .eq("target_id", input.targetId)
        .eq("relation_type", input.relationType)
        .maybeSingle()) as SupabaseQueryResult<ResourceRelationRow>;

      if (existing.error) return adapterFailure("load resource relation");
      if (existing.data) {
        return {
          data: mapResourceRelationRowToDomain(existing.data),
          ok: true,
        };
      }

      const insert = mapLinkResourceInputToInsert(input, input.userId);
      const created = (await client
        .from(realDataTableNames.resourceRelations)
        .insert(insert)
        .select("*")
        .single()) as SupabaseQueryResult<ResourceRelationRow>;

      if (!created.error && created.data) {
        return {
          data: mapResourceRelationRowToDomain(created.data),
          ok: true,
        };
      }

      const duplicate = (await client
        .from(realDataTableNames.resourceRelations)
        .select("*")
        .eq("user_id", input.userId)
        .eq("resource_id", input.resourceId)
        .eq("target_type", input.targetType)
        .eq("target_id", input.targetId)
        .eq("relation_type", input.relationType)
        .maybeSingle()) as SupabaseQueryResult<ResourceRelationRow>;

      if (!duplicate.error && duplicate.data) {
        return {
          data: mapResourceRelationRowToDomain(duplicate.data),
          ok: true,
        };
      }

      return adapterFailure("link resource");
    },

    async unlinkResource(userId, profileId, relationId) {
      const scopeFailure = profileScopeFailure(userId, profileId);
      if (scopeFailure) return scopeFailure;
      const result = (await client
        .from(realDataTableNames.resourceRelations)
        .delete()
        .eq("user_id", userId)
        .eq("id", relationId)
        .select("*")
        .single()) as SupabaseQueryResult<ResourceRelationRow>;
      if (result.error || !result.data) return notFoundFailure("Resource relation");
      return { data: mapResourceRelationRowToDomain(result.data), ok: true };
    },
  };
  return repository;
}

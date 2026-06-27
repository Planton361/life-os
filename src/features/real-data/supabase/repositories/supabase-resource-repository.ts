import type { ResourceRepository } from "../../repositories";
import type { RepositoryResult } from "../../repositories/repository-result";
import {
  mapCreateResourceInputToInsert,
  mapLinkResourceInputToInsert,
  mapResourceRelationRowToDomain,
  mapResourceRowToDomain,
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
  return {
    async createResource(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

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

    async getResourcesByUser(userId, profileId) {
      const scopeFailure = profileScopeFailure(userId, profileId);
      if (scopeFailure) return scopeFailure;

      const result = (await client
        .from(realDataTableNames.resources)
        .select("*")
        .eq("user_id", userId)
        .is("archived_at", null)
        .order("updated_at", { ascending: false })) as SupabaseQueryResult<
        readonly ResourceRow[]
      >;

      if (result.error) return adapterFailure("load resources");

      return {
        data: (result.data ?? []).map(mapResourceRowToDomain),
        ok: true,
      };
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
  };
}

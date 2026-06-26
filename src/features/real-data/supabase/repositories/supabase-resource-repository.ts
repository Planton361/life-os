import type { ResourceRepository } from "../../repositories";
import type { RepositoryResult } from "../../repositories/repository-result";
import { mapCreateResourceInputToInsert, mapResourceRowToDomain } from "../mappers";
import { realDataTableNames } from "../database.types";
import type {
  SupabaseClientLike,
  SupabaseQueryResult,
} from "../database.types";
import type { ResourceRow } from "../row-types";

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

    async linkResource() {
      return adapterFailure("link resource");
    },
  };
}

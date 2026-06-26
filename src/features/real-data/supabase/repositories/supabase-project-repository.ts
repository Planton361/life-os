import type { Project } from "../../domain";
import type { ProjectRepository } from "../../repositories";
import type {
  RepositoryListResult,
  RepositoryResult,
} from "../../repositories/repository-result";
import { realDataTableNames } from "../database.types";
import type {
  SupabaseClientLike,
  SupabaseQueryResult,
} from "../database.types";
import { mapCreateProjectInputToInsert, mapProjectRowToDomain } from "../mappers";
import type { ProjectRow } from "../row-types";

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

export function createSupabaseProjectRepository(
  client: SupabaseClientLike,
): ProjectRepository {
  return {
    async createProject(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

      const result = (await client
        .from(realDataTableNames.projects)
        .insert(mapCreateProjectInputToInsert(input, input.userId))
        .select("*")
        .single()) as SupabaseQueryResult<ProjectRow>;

      if (result.error) return adapterFailure("create project");
      if (!result.data) return notFoundFailure("Project");

      return {
        data: mapProjectRowToDomain(result.data),
        ok: true,
      };
    },

    async getProjectsByUser(userId, profileId): Promise<RepositoryListResult<Project>> {
      const scopeFailure = profileScopeFailure(userId, profileId);
      if (scopeFailure) return scopeFailure;

      const result = (await client
        .from(realDataTableNames.projects)
        .select("*")
        .eq("user_id", userId)
        .is("archived_at", null)
        .order("updated_at", { ascending: false })) as SupabaseQueryResult<
        readonly ProjectRow[]
      >;

      if (result.error) return adapterFailure("load projects");

      return {
        data: (result.data ?? []).map(mapProjectRowToDomain),
        ok: true,
      };
    },

    async updateProject() {
      return adapterFailure("update project");
    },
  };
}

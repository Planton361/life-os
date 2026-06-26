import type { Goal } from "../../domain";
import type { GoalRepository } from "../../repositories";
import type {
  RepositoryListResult,
  RepositoryResult,
} from "../../repositories/repository-result";
import { realDataTableNames } from "../database.types";
import type {
  SupabaseClientLike,
  SupabaseQueryResult,
} from "../database.types";
import { mapCreateGoalInputToInsert, mapGoalRowToDomain } from "../mappers";
import type { GoalRow } from "../row-types";

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

export function createSupabaseGoalRepository(
  client: SupabaseClientLike,
): GoalRepository {
  return {
    async createGoal(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

      const result = (await client
        .from(realDataTableNames.goals)
        .insert(mapCreateGoalInputToInsert(input, input.userId))
        .select("*")
        .single()) as SupabaseQueryResult<GoalRow>;

      if (result.error) return adapterFailure("create goal");
      if (!result.data) return notFoundFailure("Goal");

      return {
        data: mapGoalRowToDomain(result.data),
        ok: true,
      };
    },

    async getGoalsByUser(userId, profileId): Promise<RepositoryListResult<Goal>> {
      const scopeFailure = profileScopeFailure(userId, profileId);
      if (scopeFailure) return scopeFailure;

      const result = (await client
        .from(realDataTableNames.goals)
        .select("*")
        .eq("user_id", userId)
        .is("archived_at", null)
        .order("updated_at", { ascending: false })) as SupabaseQueryResult<
        readonly GoalRow[]
      >;

      if (result.error) return adapterFailure("load goals");

      return {
        data: (result.data ?? []).map(mapGoalRowToDomain),
        ok: true,
      };
    },

    async updateGoal() {
      return adapterFailure("update goal");
    },
  };
}

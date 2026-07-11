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
import {
  mapCreateGoalInputToInsert,
  mapGoalRowToDomain,
  mapUpdateGoalInputToPatch,
} from "../mappers";
import type { GoalRow, GoalUpdate } from "../row-types";

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

async function updateGoalById(
  client: SupabaseClientLike,
  userId: string,
  goalId: string,
  patch: GoalUpdate,
  operation: string,
): Promise<RepositoryResult<Goal>> {
  const result = (await client
    .from(realDataTableNames.goals)
    .update(patch)
    .eq("user_id", userId)
    .eq("id", goalId)
    .is("archived_at", null)
    .select("*")
    .single()) as SupabaseQueryResult<GoalRow>;

  if (result.error) return adapterFailure(operation);
  if (!result.data) return notFoundFailure("Goal");

  return {
    data: mapGoalRowToDomain(result.data),
    ok: true,
  };
}

export function createSupabaseGoalRepository(
  client: SupabaseClientLike,
): GoalRepository {
  return {
    async createGoal(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

      const areaOwned = await verifyAreaOwnership(
        client,
        input.userId,
        input.areaId,
      );
      if (!areaOwned) return notFoundFailure("Area");

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

    async updateGoal(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

      const areaOwned = await verifyAreaOwnership(
        client,
        input.userId,
        input.areaId,
      );
      if (!areaOwned) return notFoundFailure("Area");

      return updateGoalById(
        client,
        input.userId,
        input.goalId,
        mapUpdateGoalInputToPatch(input),
        "update goal",
      );
    },
  };
}

import type { RecurringTaskTemplate } from "../../domain";
import type { RecurringTaskTemplateRepository } from "../../repositories";
import type {
  RepositoryListResult,
  RepositoryResult,
} from "../../repositories/repository-result";
import {
  mapCreateRecurringTaskTemplateInputToInsert,
  mapRecurringTaskTemplateRowToDomain,
  mapUpdateRecurringTaskTemplateInputToPatch,
} from "../mappers";
import { realDataTableNames } from "../database.types";
import type {
  SupabaseClientLike,
  SupabaseQueryResult,
} from "../database.types";
import type {
  RecurringTaskTemplateRow,
  RecurringTaskTemplateUpdate,
} from "../row-types";

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

async function verifyOwnedContextRow(
  client: SupabaseClientLike,
  tableName: "areas" | "goals" | "projects",
  userId: string,
  id: string | null | undefined,
): Promise<boolean> {
  if (id === undefined || id === null) return true;

  const result = (await client
    .from(tableName)
    .select("id")
    .eq("user_id", userId)
    .eq("id", id)
    .is("archived_at", null)
    .maybeSingle()) as SupabaseQueryResult<{ id: string }>;

  return Boolean(!result.error && result.data);
}

async function validateContextOwnership(
  client: SupabaseClientLike,
  userId: string,
  input: {
    areaId?: string | null;
    goalId?: string | null;
    projectId?: string | null;
  },
): Promise<RepositoryFailure | null> {
  const areaOwned = await verifyOwnedContextRow(
    client,
    "areas",
    userId,
    input.areaId,
  );
  if (!areaOwned) return notFoundFailure("Area");

  const projectOwned = await verifyOwnedContextRow(
    client,
    realDataTableNames.projects,
    userId,
    input.projectId,
  );
  if (!projectOwned) return notFoundFailure("Project");

  const goalOwned = await verifyOwnedContextRow(
    client,
    realDataTableNames.goals,
    userId,
    input.goalId,
  );
  if (!goalOwned) return notFoundFailure("Goal");

  return null;
}

function mapTemplateRows(
  rows: readonly RecurringTaskTemplateRow[],
): RepositoryListResult<RecurringTaskTemplate> {
  return {
    data: rows.map(mapRecurringTaskTemplateRowToDomain),
    ok: true,
  };
}

async function loadTemplateById(
  client: SupabaseClientLike,
  userId: string,
  templateId: string,
): Promise<RepositoryResult<RecurringTaskTemplate>> {
  const result = (await client
    .from(realDataTableNames.recurringTaskTemplates)
    .select("*")
    .eq("user_id", userId)
    .eq("id", templateId)
    .maybeSingle()) as SupabaseQueryResult<RecurringTaskTemplateRow>;

  if (result.error) return adapterFailure("load recurring task template");
  if (!result.data) return notFoundFailure("Recurring task template");

  return {
    data: mapRecurringTaskTemplateRowToDomain(result.data),
    ok: true,
  };
}

async function updateTemplateById(
  client: SupabaseClientLike,
  userId: string,
  templateId: string,
  patch: RecurringTaskTemplateUpdate,
  operation: string,
): Promise<RepositoryResult<RecurringTaskTemplate>> {
  if (Object.keys(patch).length === 0) {
    return loadTemplateById(client, userId, templateId);
  }

  const result = (await client
    .from(realDataTableNames.recurringTaskTemplates)
    .update(patch)
    .eq("user_id", userId)
    .eq("id", templateId)
    .select("*")
    .single()) as SupabaseQueryResult<RecurringTaskTemplateRow>;

  if (result.error) return adapterFailure(operation);
  if (!result.data) return notFoundFailure("Recurring task template");

  return {
    data: mapRecurringTaskTemplateRowToDomain(result.data),
    ok: true,
  };
}

export function createSupabaseRecurringTaskTemplateRepository(
  client: SupabaseClientLike,
): RecurringTaskTemplateRepository {
  return {
    async createRecurringTaskTemplate(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

      const contextFailure = await validateContextOwnership(
        client,
        input.userId,
        input,
      );
      if (contextFailure) return contextFailure;

      const result = (await client
        .from(realDataTableNames.recurringTaskTemplates)
        .insert(mapCreateRecurringTaskTemplateInputToInsert(input))
        .select("*")
        .single()) as SupabaseQueryResult<RecurringTaskTemplateRow>;

      if (result.error) return adapterFailure("create recurring task template");
      if (!result.data) return notFoundFailure("Recurring task template");

      return {
        data: mapRecurringTaskTemplateRowToDomain(result.data),
        ok: true,
      };
    },

    async deactivateRecurringTaskTemplate(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

      return updateTemplateById(
        client,
        input.userId,
        input.templateId,
        { is_active: false },
        "deactivate recurring task template",
      );
    },

    async getActiveRecurringTaskTemplatesByUser(userId, profileId) {
      const scopeFailure = profileScopeFailure(userId, profileId);
      if (scopeFailure) return scopeFailure;

      const result = (await client
        .from(realDataTableNames.recurringTaskTemplates)
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("starts_on", { ascending: true })
        .order("created_at", { ascending: true })) as SupabaseQueryResult<
        readonly RecurringTaskTemplateRow[]
      >;

      if (result.error) {
        return adapterFailure("load active recurring task templates");
      }

      return mapTemplateRows(result.data ?? []);
    },

    async getRecurringTaskTemplatesByUser(userId, profileId) {
      const scopeFailure = profileScopeFailure(userId, profileId);
      if (scopeFailure) return scopeFailure;

      const result = (await client
        .from(realDataTableNames.recurringTaskTemplates)
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })) as SupabaseQueryResult<
        readonly RecurringTaskTemplateRow[]
      >;

      if (result.error) return adapterFailure("load recurring task templates");

      return mapTemplateRows(result.data ?? []);
    },

    async updateRecurringTaskTemplate(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

      const contextFailure = await validateContextOwnership(
        client,
        input.userId,
        input,
      );
      if (contextFailure) return contextFailure;

      return updateTemplateById(
        client,
        input.userId,
        input.templateId,
        mapUpdateRecurringTaskTemplateInputToPatch(input),
        "update recurring task template",
      );
    },
  };
}

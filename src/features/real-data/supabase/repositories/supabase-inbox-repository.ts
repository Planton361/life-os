import type { InboxRepository } from "../../repositories";
import type { RepositoryResult } from "../../repositories/repository-result";
import {
  mapCaptureInboxItemInputToInsert,
  mapInboxItemRowToDomain,
  mapInboxItemUpdateToPatch,
} from "../mappers";
import { realDataTableNames } from "../database.types";
import type {
  SupabaseClientLike,
  SupabaseQueryResult,
} from "../database.types";
import type { InboxItemRow, TaskRow } from "../row-types";

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

export function createSupabaseInboxRepository(
  client: SupabaseClientLike,
): InboxRepository {
  return {
    async archiveInboxItem(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

      const archivedAt = new Date().toISOString();
      const patch = mapInboxItemUpdateToPatch({
        archivedAt,
        processedAt: archivedAt,
        status: "archived",
      });

      const result = (await client
        .from(realDataTableNames.inboxItems)
        .update(patch)
        .eq("user_id", input.userId)
        .eq("id", input.inboxItemId)
        .is("archived_at", null)
        .select("*")
        .single()) as SupabaseQueryResult<InboxItemRow>;

      if (result.error) return adapterFailure("archive inbox item");
      if (!result.data) return notFoundFailure("Inbox item");

      return {
        data: mapInboxItemRowToDomain(result.data),
        ok: true,
      };
    },

    async createInboxItem(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

      const insert = mapCaptureInboxItemInputToInsert(input, input.userId);
      const result = (await client
        .from(realDataTableNames.inboxItems)
        .insert(insert)
        .select("*")
        .single()) as SupabaseQueryResult<InboxItemRow>;

      if (result.error) return adapterFailure("create inbox item");
      if (!result.data) return notFoundFailure("Inbox item");

      return {
        data: mapInboxItemRowToDomain(result.data),
        ok: true,
      };
    },

    async getInboxItemsByUser(userId, profileId) {
      const scopeFailure = profileScopeFailure(userId, profileId);
      if (scopeFailure) return scopeFailure;

      const result = (await client
        .from(realDataTableNames.inboxItems)
        .select("*")
        .eq("user_id", userId)
        .is("archived_at", null)
        .order("captured_at", { ascending: false })) as SupabaseQueryResult<
        readonly InboxItemRow[]
      >;

      if (result.error) return adapterFailure("load inbox items");

      return {
        data: (result.data ?? []).map(mapInboxItemRowToDomain),
        ok: true,
      };
    },

    async markInboxItemTriaged(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

      const taskResult = (await client
        .from(realDataTableNames.tasks)
        .select("id")
        .eq("user_id", input.userId)
        .eq("id", input.taskId)
        .is("archived_at", null)
        .single()) as SupabaseQueryResult<Pick<TaskRow, "id">>;

      if (taskResult.error) return adapterFailure("verify triaged task");
      if (!taskResult.data) return notFoundFailure("Task");

      // RLS protects rows, but linked entities still need same-user checks
      // before writing cross-table references such as created_task_id.
      const patch = mapInboxItemUpdateToPatch({
        createdTaskId: input.taskId,
        processedAt: new Date().toISOString(),
        status: "triaged",
      });

      const result = (await client
        .from(realDataTableNames.inboxItems)
        .update(patch)
        .eq("user_id", input.userId)
        .eq("id", input.inboxItemId)
        .is("archived_at", null)
        .select("*")
        .single()) as SupabaseQueryResult<InboxItemRow>;

      if (result.error) return adapterFailure("mark inbox item triaged");
      if (!result.data) return notFoundFailure("Inbox item");

      return {
        data: mapInboxItemRowToDomain(result.data),
        ok: true,
      };
    },
  };
}

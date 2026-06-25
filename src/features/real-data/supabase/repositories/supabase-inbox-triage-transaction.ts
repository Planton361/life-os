import type { TriageInboxItemToTaskTransaction } from "../../repositories";
import type { RepositoryResult } from "../../repositories/repository-result";
import { realDataTableNames } from "../database.types";
import type {
  Database,
  SupabaseClientLike,
  SupabaseQueryResult,
} from "../database.types";
import { mapInboxItemRowToDomain, mapTaskRowToDomain } from "../mappers";
import type { InboxItemRow, TaskRow } from "../row-types";

type RepositoryFailure = RepositoryResult<never>;

type TriageInboxItemToTaskArgs =
  Database["public"]["Functions"]["triage_inbox_item_to_task"]["Args"];

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

export function createSupabaseInboxTriageTransaction(
  client: SupabaseClientLike,
): TriageInboxItemToTaskTransaction {
  return async (input) => {
    const scopeFailure = profileScopeFailure(input.userId, input.profileId);
    if (scopeFailure) return scopeFailure;

    const args: TriageInboxItemToTaskArgs = {
      p_inbox_item_id: input.inboxItemId,
      p_title: input.title,
    };

    if (input.areaId !== undefined) args.p_area_id = input.areaId;
    if (input.description !== undefined) {
      args.p_description = input.description;
    }
    if (input.dueAt !== undefined) args.p_due_at = input.dueAt;
    if (input.durationMinutes !== undefined) {
      args.p_duration_minutes = input.durationMinutes;
    }
    if (input.energy !== undefined) args.p_energy = input.energy;
    if (input.goalId !== undefined) args.p_goal_id = input.goalId;
    if (input.plannedDate !== undefined) {
      args.p_planned_date = input.plannedDate;
    }
    if (input.priority !== undefined) args.p_priority = input.priority;
    if (input.projectId !== undefined) args.p_project_id = input.projectId;
    if (input.scheduledStartAt !== undefined) {
      args.p_scheduled_start_at = input.scheduledStartAt;
    }

    const taskResult = (await client.rpc(
      "triage_inbox_item_to_task",
      args,
    )) as SupabaseQueryResult<TaskRow>;

    if (taskResult.error) return adapterFailure("triage inbox item to task");
    if (!taskResult.data) return notFoundFailure("Task");

    const inboxResult = (await client
      .from(realDataTableNames.inboxItems)
      .select("*")
      .eq("user_id", input.userId)
      .eq("id", input.inboxItemId)
      .is("archived_at", null)
      .single()) as SupabaseQueryResult<InboxItemRow>;

    if (inboxResult.error) return adapterFailure("reload triaged inbox item");
    if (!inboxResult.data) return notFoundFailure("Inbox item");

    return {
      data: {
        inboxItem: mapInboxItemRowToDomain(inboxResult.data),
        task: mapTaskRowToDomain(taskResult.data),
      },
      ok: true,
    };
  };
}

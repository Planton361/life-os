import type { Task } from "../../domain";
import type { CalendarTaskRangeInput, TaskRepository } from "../../repositories";
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
  mapCarryTaskForwardInputToPatch,
  mapCompleteTaskInputToPatch,
  mapCreateTaskInputToInsert,
  mapScheduleTaskInputToPatch,
  mapTaskRowToDomain,
  mapUpdateTaskInputToPatch,
} from "../mappers";
import type { TaskRow, TaskUpdate } from "../row-types";

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

async function updateTaskById(
  client: SupabaseClientLike,
  userId: string,
  taskId: string,
  patch: TaskUpdate,
  operation: string,
): Promise<RepositoryResult<Task>> {
  const result = (await client
    .from(realDataTableNames.tasks)
    .update(patch)
    .eq("user_id", userId)
    .eq("id", taskId)
    .is("archived_at", null)
    .select("*")
    .single()) as SupabaseQueryResult<TaskRow>;

  if (result.error) return adapterFailure(operation);
  if (!result.data) return notFoundFailure("Task");

  return {
    data: mapTaskRowToDomain(result.data),
    ok: true,
  };
}

async function getTasksForRange(
  client: SupabaseClientLike,
  input: CalendarTaskRangeInput,
): Promise<RepositoryListResult<Task>> {
  const result = (await client
    .from(realDataTableNames.tasks)
    .select("*")
    .eq("user_id", input.userId)
    .is("archived_at", null)
    .gte("planned_date", input.fromDate)
    .lte("planned_date", input.toDate)
    .order("planned_date", { ascending: true })
    .order("scheduled_start_at", { ascending: true })
    .order("created_at", { ascending: true })) as SupabaseQueryResult<
    readonly TaskRow[]
  >;

  if (result.error) return adapterFailure("load calendar tasks");

  return {
    data: (result.data ?? []).map(mapTaskRowToDomain),
    ok: true,
  };
}

export function createSupabaseTaskRepository(
  client: SupabaseClientLike,
): TaskRepository {
  return {
    async carryTaskForward(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

      return updateTaskById(
        client,
        input.userId,
        input.taskId,
        mapCarryTaskForwardInputToPatch(input),
        "carry task forward",
      );
    },

    async completeTask(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

      return updateTaskById(
        client,
        input.userId,
        input.taskId,
        mapCompleteTaskInputToPatch(input),
        "complete task",
      );
    },

    async createTask(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

      const result = (await client
        .from(realDataTableNames.tasks)
        .insert(mapCreateTaskInputToInsert(input, input.userId))
        .select("*")
        .single()) as SupabaseQueryResult<TaskRow>;

      if (result.error) return adapterFailure("create task");
      if (!result.data) return notFoundFailure("Task");

      return {
        data: mapTaskRowToDomain(result.data),
        ok: true,
      };
    },

    async getCalendarTasks(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

      return getTasksForRange(client, input);
    },

    async getPortfolioTasks(userId, profileId) {
      const scopeFailure = profileScopeFailure(userId, profileId);
      if (scopeFailure) return scopeFailure;

      const result = (await client
        .from(realDataTableNames.tasks)
        .select("*")
        .eq("user_id", userId)
        .is("archived_at", null)
        .order("updated_at", { ascending: false })) as SupabaseQueryResult<
        readonly TaskRow[]
      >;

      if (result.error) return adapterFailure("load portfolio tasks");

      return {
        data: (result.data ?? []).map(mapTaskRowToDomain),
        ok: true,
      };
    },

    async getTasksForToday(userId, profileId, localDate) {
      const scopeFailure = profileScopeFailure(userId, profileId);
      if (scopeFailure) return scopeFailure;

      const result = (await client
        .from(realDataTableNames.tasks)
        .select("*")
        .eq("user_id", userId)
        .is("archived_at", null)
        .eq("planned_date", localDate)
        .order("scheduled_start_at", { ascending: true })
        .order("created_at", { ascending: true })) as SupabaseQueryResult<
        readonly TaskRow[]
      >;

      if (result.error) return adapterFailure("load today tasks");

      return {
        data: (result.data ?? []).map(mapTaskRowToDomain),
        ok: true,
      };
    },

    async scheduleTask(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

      return updateTaskById(
        client,
        input.userId,
        input.taskId,
        mapScheduleTaskInputToPatch(input),
        "schedule task",
      );
    },

    async updateTask(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

      return updateTaskById(
        client,
        input.userId,
        input.taskId,
        mapUpdateTaskInputToPatch(input),
        "update task",
      );
    },
  };
}

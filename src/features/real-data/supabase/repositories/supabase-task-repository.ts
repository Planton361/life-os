import type { Task } from "../../domain";
import type {
  CalendarTaskRangeInput,
  CreateGeneratedTaskInstanceInput,
  TaskListInput,
  TaskRepository,
} from "../../repositories";
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
  mapArchiveTaskInputToPatch,
  mapCarryTaskForwardInputToPatch,
  mapCreateTaskInputToInsert,
  mapReopenTaskInputToPatch,
  mapRescheduleTaskInputToPatch,
  mapScheduleTaskInputToPatch,
  mapTaskRowToDomain,
  mapUnscheduleTaskInputToPatch,
  mapUpdateTaskInputToPatch,
} from "../mappers";
import type { TaskRow, TaskUpdate } from "../row-types";
import type { TaskInsert } from "../row-types";

type ScheduleSourceType =
  | "meal"
  | "review"
  | "running_plan_item"
  | "strength_plan";

type ScheduleSourceLinkRow = {
  source_id: string;
  source_type: ScheduleSourceType;
  task_id: string;
  user_id: string;
};

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

function conflictFailure(message: string): RepositoryFailure {
  return {
    error: { code: "conflict", message },
    ok: false,
  };
}

async function getScheduleSourceLink(
  client: SupabaseClientLike,
  userId: string,
  taskId: string,
): Promise<RepositoryResult<ScheduleSourceLinkRow | null>> {
  const result = (await client
    .from("schedule_source_links")
    .select("user_id,source_type,source_id,task_id")
    .eq("user_id", userId)
    .eq("task_id", taskId)
    .maybeSingle()) as SupabaseQueryResult<ScheduleSourceLinkRow>;

  if (result.error) return adapterFailure("load task schedule source");

  return { data: result.data ?? null, ok: true };
}

async function getActiveTask(
  client: SupabaseClientLike,
  userId: string,
  taskId: string,
): Promise<RepositoryResult<TaskRow>> {
  const result = (await client
    .from(realDataTableNames.tasks)
    .select("*")
    .eq("user_id", userId)
    .eq("id", taskId)
    .is("archived_at", null)
    .maybeSingle()) as SupabaseQueryResult<TaskRow>;

  if (result.error) return adapterFailure("load task");
  if (!result.data) return notFoundFailure("Task");

  return { data: result.data, ok: true };
}

async function scheduleMealLinkedTask(
  client: SupabaseClientLike,
  link: ScheduleSourceLinkRow,
  input: {
    durationMinutes?: number;
    plannedDate: string;
    scheduledStartAt: string;
  },
): Promise<RepositoryResult<Task>> {
  const result = (await client.rpc("schedule_linked_source", {
    p_duration_minutes: input.durationMinutes ?? 30,
    p_planned_date: input.plannedDate,
    p_scheduled_start_at: input.scheduledStartAt,
    p_source_id: link.source_id,
    p_source_type: link.source_type,
  })) as SupabaseQueryResult<TaskRow>;

  if (result.error || !result.data) {
    return conflictFailure(result.error?.message ?? "Unable to schedule linked meal.");
  }

  return { data: mapTaskRowToDomain(result.data), ok: true };
}

async function unscheduleMealLinkedTask(
  client: SupabaseClientLike,
  taskId: string,
  input?: { durationMinutes?: number; plannedDate?: string },
): Promise<RepositoryResult<Task>> {
  const result = (await client.rpc("unschedule_linked_meal_task", {
    p_duration_minutes: input?.durationMinutes,
    p_planned_date: input?.plannedDate,
    p_task_id: taskId,
  })) as SupabaseQueryResult<TaskRow>;

  if (result.error || !result.data) {
    return conflictFailure(result.error?.message ?? "Unable to unschedule linked meal.");
  }

  return { data: mapTaskRowToDomain(result.data), ok: true };
}

async function completeTaskThroughSourceBoundary(
  client: SupabaseClientLike,
  taskId: string,
  completedAt: string,
): Promise<RepositoryResult<Task>> {
  const result = (await client.rpc("complete_linked_task", {
    p_completed_at: completedAt,
    p_task_id: taskId,
  })) as SupabaseQueryResult<TaskRow>;

  if (result.error || !result.data) {
    return conflictFailure(result.error?.message ?? "Unable to complete task.");
  }

  return { data: mapTaskRowToDomain(result.data), ok: true };
}

function sourceLinkedSchedulingFailure(): RepositoryFailure {
  return conflictFailure(
    "Source-linked task scheduling must use the dedicated planning controls.",
  );
}

function sourceLinkedLifecycleFailure(action: "archive" | "reopen"): RepositoryFailure {
  return conflictFailure(
    `Source-linked tasks must be ${action === "archive" ? "archived" : "reopened"} through their domain flow.`,
  );
}

function patchChangesSourceScheduling(patch: TaskUpdate, task: TaskRow) {
  return (
    (patch.planned_date !== undefined && patch.planned_date !== task.planned_date) ||
    (patch.scheduled_start_at !== undefined &&
      patch.scheduled_start_at !== task.scheduled_start_at) ||
    (patch.duration_minutes !== undefined &&
      patch.duration_minutes !== task.duration_minutes)
  );
}

function patchChangesSourceLifecycle(patch: TaskUpdate, task: TaskRow) {
  return patch.status !== undefined && patch.status !== task.status;
}

function withoutSourceSensitivePatchFields(patch: TaskUpdate): TaskUpdate {
  const metadataPatch = { ...patch };
  delete metadataPatch.duration_minutes;
  delete metadataPatch.planned_date;
  delete metadataPatch.scheduled_start_at;
  delete metadataPatch.status;
  return metadataPatch;
}

function patchChangesTaskMetadata(patch: TaskUpdate, task: TaskRow) {
  return (
    (patch.area_id !== undefined && patch.area_id !== task.area_id) ||
    (patch.description !== undefined && patch.description !== task.description) ||
    (patch.due_at !== undefined && patch.due_at !== task.due_at) ||
    (patch.energy !== undefined && patch.energy !== task.energy) ||
    (patch.goal_id !== undefined && patch.goal_id !== task.goal_id) ||
    (patch.priority !== undefined && patch.priority !== task.priority) ||
    (patch.project_id !== undefined && patch.project_id !== task.project_id) ||
    (patch.title !== undefined && patch.title !== task.title)
  );
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

async function validateTaskContextOwnership(
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

function taskListSortColumn(sortBy: TaskListInput["sortBy"]) {
  if (sortBy === "planned") return "planned_date";
  if (sortBy === "scheduled") return "scheduled_start_at";

  return "created_at";
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

async function loadGeneratedTaskInstance(
  client: SupabaseClientLike,
  userId: string,
  templateId: string,
  instanceDate: string,
): Promise<RepositoryResult<Task | null>> {
  const result = (await client
    .from(realDataTableNames.tasks)
    .select("*")
    .eq("user_id", userId)
    .eq("generated_from_template_id", templateId)
    .eq("instance_date", instanceDate)
    .maybeSingle()) as SupabaseQueryResult<TaskRow>;

  if (result.error) return adapterFailure("load generated task instance");

  return {
    data: result.data ? mapTaskRowToDomain(result.data) : null,
    ok: true,
  };
}

function mapGeneratedTaskInstanceInputToInsert(
  input: CreateGeneratedTaskInstanceInput,
): TaskInsert {
  const insert: TaskInsert = {
    generated_from_template_id: input.templateId,
    instance_date: input.instanceDate,
    planned_date: input.instanceDate,
    title: input.title,
    user_id: input.userId,
  };

  if (input.areaId !== undefined) insert.area_id = input.areaId;
  if (input.description !== undefined) insert.description = input.description;
  if (input.durationMinutes !== undefined) {
    insert.duration_minutes = input.durationMinutes;
  }
  if (input.energy !== undefined) insert.energy = input.energy;
  if (input.goalId !== undefined) insert.goal_id = input.goalId;
  if (input.priority !== undefined && input.priority !== null) {
    insert.priority = input.priority;
  }
  if (input.projectId !== undefined) insert.project_id = input.projectId;

  return insert;
}

export function createSupabaseTaskRepository(
  client: SupabaseClientLike,
): TaskRepository {
  return {
    async archiveTask(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

      const link = await getScheduleSourceLink(client, input.userId, input.taskId);
      if (!link.ok) return link;
      if (link.data) return sourceLinkedLifecycleFailure("archive");

      return updateTaskById(
        client,
        input.userId,
        input.taskId,
        mapArchiveTaskInputToPatch(input),
        "archive task",
      );
    },

    async carryTaskForward(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

      const link = await getScheduleSourceLink(client, input.userId, input.taskId);
      if (!link.ok) return link;
      if (link.data) return sourceLinkedSchedulingFailure();

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

      return completeTaskThroughSourceBoundary(
        client,
        input.taskId,
        input.completedAt ?? new Date().toISOString(),
      );
    },

    async createGeneratedTaskInstance(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

      const contextFailure = await validateTaskContextOwnership(
        client,
        input.userId,
        input,
      );
      if (contextFailure) return contextFailure;

      const existing = await loadGeneratedTaskInstance(
        client,
        input.userId,
        input.templateId,
        input.instanceDate,
      );

      if (!existing.ok) return existing;
      if (existing.data) {
        return {
          data: {
            existing: true,
            task: existing.data,
          },
          ok: true,
        };
      }

      const created = (await client
        .from(realDataTableNames.tasks)
        .insert(mapGeneratedTaskInstanceInputToInsert(input))
        .select("*")
        .single()) as SupabaseQueryResult<TaskRow>;

      if (!created.error && created.data) {
        return {
          data: {
            existing: false,
            task: mapTaskRowToDomain(created.data),
          },
          ok: true,
        };
      }

      const duplicate = await loadGeneratedTaskInstance(
        client,
        input.userId,
        input.templateId,
        input.instanceDate,
      );

      if (!duplicate.ok) return duplicate;
      if (duplicate.data) {
        return {
          data: {
            existing: true,
            task: duplicate.data,
          },
          ok: true,
        };
      }

      return adapterFailure("create generated task instance");
    },

    async createTask(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

      const contextFailure = await validateTaskContextOwnership(
        client,
        input.userId,
        input,
      );
      if (contextFailure) return contextFailure;

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

    async getTasksByUser(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

      const sortColumn = taskListSortColumn(input.sortBy);
      const ascending = input.ascending ?? false;
      let query = client
        .from(realDataTableNames.tasks)
        .select("*")
        .eq("user_id", input.userId)
        .is("archived_at", null)
        .order(sortColumn, { ascending });

      if (sortColumn !== "created_at") {
        query = query.order("created_at", { ascending: false });
      }

      const result = (await query) as SupabaseQueryResult<readonly TaskRow[]>;

      if (result.error) return adapterFailure("load tasks");

      return {
        data: (result.data ?? []).map(mapTaskRowToDomain),
        ok: true,
      };
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

      const link = await getScheduleSourceLink(client, input.userId, input.taskId);
      if (!link.ok) return link;
      if (link.data?.source_type === "meal") {
        if (input.scheduledStartAt) {
          return scheduleMealLinkedTask(client, link.data, {
            ...input,
            scheduledStartAt: input.scheduledStartAt,
          });
        }

        return unscheduleMealLinkedTask(client, input.taskId, input);
      }

      return updateTaskById(
        client,
        input.userId,
        input.taskId,
        mapScheduleTaskInputToPatch(input),
        "schedule task",
      );
    },

    async reopenTask(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

      const link = await getScheduleSourceLink(client, input.userId, input.taskId);
      if (!link.ok) return link;
      if (link.data) return sourceLinkedLifecycleFailure("reopen");

      return updateTaskById(
        client,
        input.userId,
        input.taskId,
        mapReopenTaskInputToPatch(),
        "reopen task",
      );
    },

    async rescheduleTask(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

      const link = await getScheduleSourceLink(client, input.userId, input.taskId);
      if (!link.ok) return link;
      if (link.data?.source_type === "meal") {
        return scheduleMealLinkedTask(client, link.data, input);
      }

      return updateTaskById(
        client,
        input.userId,
        input.taskId,
        mapRescheduleTaskInputToPatch(input),
        "reschedule task",
      );
    },

    async unscheduleTask(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

      const link = await getScheduleSourceLink(client, input.userId, input.taskId);
      if (!link.ok) return link;
      if (link.data?.source_type === "meal") {
        return unscheduleMealLinkedTask(client, input.taskId);
      }

      return updateTaskById(
        client,
        input.userId,
        input.taskId,
        mapUnscheduleTaskInputToPatch(),
        "unschedule task",
      );
    },

    async updateTask(input) {
      const scopeFailure = profileScopeFailure(input.userId, input.profileId);
      if (scopeFailure) return scopeFailure;

      const contextFailure = await validateTaskContextOwnership(
        client,
        input.userId,
        input,
      );
      if (contextFailure) return contextFailure;

      const link = await getScheduleSourceLink(client, input.userId, input.taskId);
      if (!link.ok) return link;

      const patch = mapUpdateTaskInputToPatch(input);
      if (!link.data) {
        return updateTaskById(
          client,
          input.userId,
          input.taskId,
          patch,
          "update task",
        );
      }

      const currentTask = await getActiveTask(client, input.userId, input.taskId);
      if (!currentTask.ok) return currentTask;

      if (patchChangesSourceScheduling(patch, currentTask.data)) {
        return sourceLinkedSchedulingFailure();
      }

      if (patchChangesSourceLifecycle(patch, currentTask.data)) {
        if (patch.status === "done") {
          const metadataPatch = withoutSourceSensitivePatchFields(patch);
          if (patchChangesTaskMetadata(metadataPatch, currentTask.data)) {
            return conflictFailure(
              "Complete source-linked tasks separately from metadata changes.",
            );
          }

          return completeTaskThroughSourceBoundary(
            client,
            input.taskId,
            new Date().toISOString(),
          );
        }

        return sourceLinkedLifecycleFailure("reopen");
      }

      return updateTaskById(
        client,
        input.userId,
        input.taskId,
        withoutSourceSensitivePatchFields(patch),
        "update task",
      );
    },
  };
}

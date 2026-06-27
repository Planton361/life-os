import type { Task } from "../../domain";
import type {
  CarryTaskForwardInput,
  CompleteTaskInput,
  CreateTaskInput,
  ArchiveTaskInput,
  RescheduleTaskInput,
  ScheduleTaskInput,
  UpdateTaskInput,
} from "../../schemas";
import type { TaskInsert, TaskRow, TaskUpdate } from "../row-types";

export function mapTaskRowToDomain(row: TaskRow): Task {
  return {
    archivedAt: row.archived_at,
    areaId: row.area_id,
    carriedFromDailyLogId: row.carried_from_daily_log_id,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    description: row.description,
    dueAt: row.due_at,
    durationMinutes: row.duration_minutes,
    energy: row.energy,
    goalId: row.goal_id,
    id: row.id,
    plannedDate: row.planned_date,
    priority: row.priority,
    profileId: row.user_id,
    projectId: row.project_id,
    scheduledStartAt: row.scheduled_start_at,
    sourceInboxItemId: row.source_inbox_item_id,
    status: row.status,
    title: row.title,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

export function mapCreateTaskInputToInsert(
  input: CreateTaskInput,
  userId: string,
): TaskInsert {
  const insert: TaskInsert = {
    title: input.title,
    user_id: userId,
  };

  if (input.areaId !== undefined) insert.area_id = input.areaId;
  if (input.description !== undefined) insert.description = input.description;
  if (input.dueAt !== undefined) insert.due_at = input.dueAt;
  if (input.durationMinutes !== undefined) {
    insert.duration_minutes = input.durationMinutes;
  }
  if (input.energy !== undefined) insert.energy = input.energy;
  if (input.goalId !== undefined) insert.goal_id = input.goalId;
  if (input.plannedDate !== undefined) insert.planned_date = input.plannedDate;
  if (input.priority !== undefined) insert.priority = input.priority;
  if (input.projectId !== undefined) insert.project_id = input.projectId;
  if (input.scheduledStartAt !== undefined) {
    insert.scheduled_start_at = input.scheduledStartAt;
  }
  if (input.sourceInboxItemId !== undefined) {
    insert.source_inbox_item_id = input.sourceInboxItemId;
  }
  if (input.status !== undefined) insert.status = input.status;

  return insert;
}

export function mapUpdateTaskInputToPatch(input: UpdateTaskInput): TaskUpdate {
  const patch: TaskUpdate = {};

  if (input.areaId !== undefined) patch.area_id = input.areaId;
  if (input.description !== undefined) patch.description = input.description;
  if (input.dueAt !== undefined) patch.due_at = input.dueAt;
  if (input.durationMinutes !== undefined) {
    patch.duration_minutes = input.durationMinutes;
  }
  if (input.energy !== undefined) patch.energy = input.energy;
  if (input.goalId !== undefined) patch.goal_id = input.goalId;
  if (input.plannedDate !== undefined) patch.planned_date = input.plannedDate;
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.projectId !== undefined) patch.project_id = input.projectId;
  if (input.scheduledStartAt !== undefined) {
    patch.scheduled_start_at = input.scheduledStartAt;
  }
  if (input.sourceInboxItemId !== undefined) {
    patch.source_inbox_item_id = input.sourceInboxItemId;
  }
  if (input.status !== undefined) patch.status = input.status;
  if (input.title !== undefined) patch.title = input.title;

  return patch;
}

export function mapScheduleTaskInputToPatch(
  input: ScheduleTaskInput,
): TaskUpdate {
  const patch: TaskUpdate = {
    planned_date: input.plannedDate,
  };

  if (input.durationMinutes !== undefined) {
    patch.duration_minutes = input.durationMinutes;
  }

  if (input.scheduledStartAt !== undefined) {
    patch.scheduled_start_at = input.scheduledStartAt;
  }

  return patch;
}

export function mapCompleteTaskInputToPatch(
  input: CompleteTaskInput,
): TaskUpdate {
  return {
    completed_at: input.completedAt ?? new Date().toISOString(),
    status: "done",
  };
}

export function mapReopenTaskInputToPatch(): TaskUpdate {
  return {
    completed_at: null,
    status: "planned",
  };
}

export function mapArchiveTaskInputToPatch(input: ArchiveTaskInput): TaskUpdate {
  return {
    archived_at: input.archivedAt ?? new Date().toISOString(),
    status: "archived",
  };
}

export function mapUnscheduleTaskInputToPatch(): TaskUpdate {
  return {
    scheduled_start_at: null,
  };
}

export function mapRescheduleTaskInputToPatch(
  input: RescheduleTaskInput,
): TaskUpdate {
  const patch: TaskUpdate = {
    planned_date: input.plannedDate,
    scheduled_start_at: input.scheduledStartAt,
  };

  if (input.durationMinutes !== undefined) {
    patch.duration_minutes = input.durationMinutes;
  }

  return patch;
}

export function mapCarryTaskForwardInputToPatch(
  input: CarryTaskForwardInput,
): TaskUpdate {
  const patch: TaskUpdate = {
    planned_date: input.targetPlannedDate,
  };

  if (input.fromDailyLogId !== undefined) {
    patch.carried_from_daily_log_id = input.fromDailyLogId;
  }

  return patch;
}

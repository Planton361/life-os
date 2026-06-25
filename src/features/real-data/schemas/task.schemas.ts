import {
  optionalDateTime,
  optionalEnum,
  optionalLocalDate,
  optionalPositiveInteger,
  optionalString,
  requiredLocalDate,
  requiredString,
  asInputRecord,
  defineInputSchema,
  finishSchema,
  type SchemaIssue,
} from "./schema-contract";
import {
  taskEnergies,
  taskPriorities,
  taskStatuses,
  type TaskEnergy,
  type TaskPriority,
  type TaskStatus,
} from "../domain/task";
import type {
  AreaId,
  DailyLogId,
  GoalId,
  InboxItemId,
  IsoDateTimeString,
  LocalDateString,
  ProfileId,
  ProjectId,
  TaskId,
  UserId,
} from "../domain/ids";

export type CreateTaskInput = {
  userId: UserId;
  profileId: ProfileId;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  energy?: TaskEnergy;
  areaId?: AreaId;
  projectId?: ProjectId;
  goalId?: GoalId;
  sourceInboxItemId?: InboxItemId;
  plannedDate?: LocalDateString;
  scheduledStartAt?: IsoDateTimeString;
  durationMinutes?: number;
  dueAt?: IsoDateTimeString;
};

export type UpdateTaskInput = {
  userId: UserId;
  profileId: ProfileId;
  taskId: TaskId;
} & Partial<Omit<CreateTaskInput, "userId" | "profileId">>;

export type ScheduleTaskInput = {
  userId: UserId;
  profileId: ProfileId;
  taskId: TaskId;
  plannedDate: LocalDateString;
  scheduledStartAt?: IsoDateTimeString;
  durationMinutes?: number;
};

export type CompleteTaskInput = {
  userId: UserId;
  profileId: ProfileId;
  taskId: TaskId;
  completedAt?: IsoDateTimeString;
  completionNote?: string;
};

export type CarryTaskForwardInput = {
  userId: UserId;
  profileId: ProfileId;
  taskId: TaskId;
  targetPlannedDate: LocalDateString;
  fromDailyLogId?: DailyLogId;
  carryForwardNote?: string;
};

function readTaskPatch(
  record: Record<string, unknown>,
  issues: SchemaIssue[],
) {
  return {
    areaId: optionalString(record, "areaId", issues) as AreaId | undefined,
    description: optionalString(record, "description", issues),
    dueAt: optionalDateTime(record, "dueAt", issues),
    durationMinutes: optionalPositiveInteger(record, "durationMinutes", issues),
    energy: optionalEnum(record, "energy", taskEnergies, issues),
    goalId: optionalString(record, "goalId", issues) as GoalId | undefined,
    plannedDate: optionalLocalDate(record, "plannedDate", issues),
    priority: optionalEnum(record, "priority", taskPriorities, issues),
    projectId: optionalString(record, "projectId", issues) as
      | ProjectId
      | undefined,
    scheduledStartAt: optionalDateTime(record, "scheduledStartAt", issues),
    sourceInboxItemId: optionalString(record, "sourceInboxItemId", issues) as
      | InboxItemId
      | undefined,
    status: optionalEnum(record, "status", taskStatuses, issues),
  };
}

export const createTaskInputSchema = defineInputSchema<CreateTaskInput>(
  "createTaskInputSchema",
  (input) => {
    const issues: SchemaIssue[] = [];
    const record = asInputRecord(input, issues);

    return finishSchema(
      {
        ...readTaskPatch(record, issues),
        profileId: requiredString(record, "profileId", issues) as ProfileId,
        title: requiredString(record, "title", issues, 2),
        userId: requiredString(record, "userId", issues) as UserId,
      },
      issues,
    );
  },
);

export const updateTaskInputSchema = defineInputSchema<UpdateTaskInput>(
  "updateTaskInputSchema",
  (input) => {
    const issues: SchemaIssue[] = [];
    const record = asInputRecord(input, issues);

    return finishSchema(
      {
        ...readTaskPatch(record, issues),
        profileId: requiredString(record, "profileId", issues) as ProfileId,
        taskId: requiredString(record, "taskId", issues) as TaskId,
        title: optionalString(record, "title", issues),
        userId: requiredString(record, "userId", issues) as UserId,
      },
      issues,
    );
  },
);

export const scheduleTaskInputSchema = defineInputSchema<ScheduleTaskInput>(
  "scheduleTaskInputSchema",
  (input) => {
    const issues: SchemaIssue[] = [];
    const record = asInputRecord(input, issues);

    return finishSchema(
      {
        durationMinutes: optionalPositiveInteger(
          record,
          "durationMinutes",
          issues,
        ),
        plannedDate: requiredLocalDate(record, "plannedDate", issues),
        profileId: requiredString(record, "profileId", issues) as ProfileId,
        scheduledStartAt: optionalDateTime(record, "scheduledStartAt", issues),
        taskId: requiredString(record, "taskId", issues) as TaskId,
        userId: requiredString(record, "userId", issues) as UserId,
      },
      issues,
    );
  },
);

export const completeTaskInputSchema = defineInputSchema<CompleteTaskInput>(
  "completeTaskInputSchema",
  (input) => {
    const issues: SchemaIssue[] = [];
    const record = asInputRecord(input, issues);

    return finishSchema(
      {
        completedAt: optionalDateTime(record, "completedAt", issues),
        completionNote: optionalString(record, "completionNote", issues),
        profileId: requiredString(record, "profileId", issues) as ProfileId,
        taskId: requiredString(record, "taskId", issues) as TaskId,
        userId: requiredString(record, "userId", issues) as UserId,
      },
      issues,
    );
  },
);

export const carryTaskForwardInputSchema =
  defineInputSchema<CarryTaskForwardInput>(
    "carryTaskForwardInputSchema",
    (input) => {
      const issues: SchemaIssue[] = [];
      const record = asInputRecord(input, issues);

      return finishSchema(
        {
          carryForwardNote: optionalString(
            record,
            "carryForwardNote",
            issues,
          ),
          fromDailyLogId: optionalString(record, "fromDailyLogId", issues) as
            | DailyLogId
            | undefined,
          profileId: requiredString(record, "profileId", issues) as ProfileId,
          targetPlannedDate: requiredLocalDate(
            record,
            "targetPlannedDate",
            issues,
          ),
          taskId: requiredString(record, "taskId", issues) as TaskId,
          userId: requiredString(record, "userId", issues) as UserId,
        },
        issues,
      );
    },
  );

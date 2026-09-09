import { taskEnergies, taskPriorities, taskStatuses } from "../domain/task";
import {
  localDateSchema,
  dateTimeStringSchema,
  optionalDateTimeStringSchema,
  optionalEnumSchema,
  optionalLocalDateSchema,
  optionalPositiveIntegerSchema,
  optionalTrimmedStringSchema,
  requiredTrimmedStringSchema,
  z,
} from "./schema-contract";

const requiredIdSchema = requiredTrimmedStringSchema();
const titleSchema = requiredTrimmedStringSchema(2);

const nullableOptionalString = z.union([z.string().trim().min(1), z.null()]).optional();
const nullableOptionalDateTime = z.union([dateTimeStringSchema, z.null()]).optional();
const nullableOptionalLocalDate = z.union([localDateSchema, z.null()]).optional();
const nullableOptionalPositiveInteger = z.union([z.coerce.number().int().positive(), z.null()]).optional();
const nullableOptionalEnergy = z.union([z.enum(taskEnergies), z.null()]).optional();

const taskPatchSchema = z.object({
  areaId: optionalTrimmedStringSchema,
  description: optionalTrimmedStringSchema,
  dueAt: optionalDateTimeStringSchema,
  durationMinutes: optionalPositiveIntegerSchema,
  energy: optionalEnumSchema(taskEnergies),
  generatedFromTemplateId: optionalTrimmedStringSchema,
  goalId: optionalTrimmedStringSchema,
  instanceDate: optionalLocalDateSchema,
  plannedDate: optionalLocalDateSchema,
  priority: optionalEnumSchema(taskPriorities),
  projectId: optionalTrimmedStringSchema,
  scheduledStartAt: optionalDateTimeStringSchema,
  sourceInboxItemId: optionalTrimmedStringSchema,
  status: optionalEnumSchema(taskStatuses),
});

export const createTaskInputSchema = taskPatchSchema.extend({
  milestoneId: z.uuid().optional(),
  profileId: requiredIdSchema,
  title: titleSchema,
  userId: requiredIdSchema,
});

export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

export const updateTaskInputSchema = taskPatchSchema.extend({
  areaId: nullableOptionalString,
  description: nullableOptionalString,
  dueAt: nullableOptionalDateTime,
  durationMinutes: nullableOptionalPositiveInteger,
  energy: nullableOptionalEnergy,
  goalId: nullableOptionalString,
  plannedDate: nullableOptionalLocalDate,
  projectId: nullableOptionalString,
  profileId: requiredIdSchema,
  taskId: requiredIdSchema,
  title: optionalTrimmedStringSchema,
  userId: requiredIdSchema,
});

export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;

export const scheduleTaskInputSchema = z.object({
  durationMinutes: optionalPositiveIntegerSchema,
  plannedDate: localDateSchema,
  profileId: requiredIdSchema,
  scheduledStartAt: optionalDateTimeStringSchema,
  taskId: requiredIdSchema,
  userId: requiredIdSchema,
});

export type ScheduleTaskInput = z.infer<typeof scheduleTaskInputSchema>;

export const completeTaskInputSchema = z.object({
  completedAt: optionalDateTimeStringSchema,
  completionNote: optionalTrimmedStringSchema,
  profileId: requiredIdSchema,
  taskId: requiredIdSchema,
  userId: requiredIdSchema,
});

export type CompleteTaskInput = z.infer<typeof completeTaskInputSchema>;

export const reopenTaskInputSchema = z.object({
  profileId: requiredIdSchema,
  taskId: requiredIdSchema,
  userId: requiredIdSchema,
});

export type ReopenTaskInput = z.infer<typeof reopenTaskInputSchema>;

export const archiveTaskInputSchema = z.object({
  archivedAt: optionalDateTimeStringSchema,
  profileId: requiredIdSchema,
  taskId: requiredIdSchema,
  userId: requiredIdSchema,
});

export type ArchiveTaskInput = z.infer<typeof archiveTaskInputSchema>;

export const unscheduleTaskInputSchema = z.object({
  profileId: requiredIdSchema,
  taskId: requiredIdSchema,
  userId: requiredIdSchema,
});

export type UnscheduleTaskInput = z.infer<typeof unscheduleTaskInputSchema>;

export const rescheduleTaskInputSchema = z.object({
  durationMinutes: optionalPositiveIntegerSchema,
  profileId: requiredIdSchema,
  plannedDate: localDateSchema,
  scheduledStartAt: dateTimeStringSchema,
  taskId: requiredIdSchema,
  userId: requiredIdSchema,
});

export type RescheduleTaskInput = z.infer<typeof rescheduleTaskInputSchema>;

export const carryTaskForwardInputSchema = z.object({
  carryForwardNote: optionalTrimmedStringSchema,
  fromDailyLogId: optionalTrimmedStringSchema,
  profileId: requiredIdSchema,
  targetPlannedDate: localDateSchema,
  taskId: requiredIdSchema,
  userId: requiredIdSchema,
});

export type CarryTaskForwardInput = z.infer<
  typeof carryTaskForwardInputSchema
>;

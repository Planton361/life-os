import { taskEnergies, taskPriorities, taskStatuses } from "../domain/task";
import {
  localDateSchema,
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

const taskPatchSchema = z.object({
  areaId: optionalTrimmedStringSchema,
  description: optionalTrimmedStringSchema,
  dueAt: optionalDateTimeStringSchema,
  durationMinutes: optionalPositiveIntegerSchema,
  energy: optionalEnumSchema(taskEnergies),
  goalId: optionalTrimmedStringSchema,
  plannedDate: optionalLocalDateSchema,
  priority: optionalEnumSchema(taskPriorities),
  projectId: optionalTrimmedStringSchema,
  scheduledStartAt: optionalDateTimeStringSchema,
  sourceInboxItemId: optionalTrimmedStringSchema,
  status: optionalEnumSchema(taskStatuses),
});

export const createTaskInputSchema = taskPatchSchema.extend({
  profileId: requiredIdSchema,
  title: titleSchema,
  userId: requiredIdSchema,
});

export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

export const updateTaskInputSchema = taskPatchSchema.extend({
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

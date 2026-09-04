import { inboxItemTypes } from "../domain/inbox";
import { taskEnergies, taskPriorities } from "../domain/task";
import {
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

const triageTaskFieldsSchema = z.object({
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
  skillId: z.string().trim().uuid().optional(),
});

export const captureInboxItemInputSchema = z.object({
  areaId: optionalTrimmedStringSchema,
  body: optionalTrimmedStringSchema,
  profileId: requiredIdSchema,
  source: optionalTrimmedStringSchema,
  title: titleSchema,
  type: optionalEnumSchema(inboxItemTypes),
  userId: requiredIdSchema,
});

export type CaptureInboxItemInput = z.infer<
  typeof captureInboxItemInputSchema
>;

export const triageInboxItemToTaskInputSchema = triageTaskFieldsSchema.extend({
  inboxItemId: requiredIdSchema,
  profileId: requiredIdSchema,
  title: titleSchema,
  userId: requiredIdSchema,
});

export type TriageInboxItemToTaskInput = z.infer<
  typeof triageInboxItemToTaskInputSchema
>;

export const archiveInboxItemInputSchema = z.object({
  inboxItemId: requiredIdSchema,
  profileId: requiredIdSchema,
  userId: requiredIdSchema,
});

export type ArchiveInboxItemInput = z.infer<
  typeof archiveInboxItemInputSchema
>;

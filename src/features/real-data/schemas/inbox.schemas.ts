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

// A capture keeps its original text; a title is optional until triage (#192).
export const captureInboxItemInputSchema = z
  .object({
    areaId: optionalTrimmedStringSchema,
    body: optionalTrimmedStringSchema,
    profileId: requiredIdSchema,
    source: optionalTrimmedStringSchema,
    title: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim() === "" ? undefined : value,
      titleSchema.optional(),
    ),
    type: optionalEnumSchema(inboxItemTypes),
    userId: requiredIdSchema,
  })
  .refine((value) => value.title !== undefined || value.body !== undefined, {
    message: "Capture text or title is required.",
    path: ["body"],
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

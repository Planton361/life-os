import { taskEnergies, taskPriorities } from "../domain/task";
import {
  localDateSchema,
  optionalBooleanSchema,
  optionalEnumSchema,
  optionalLocalDateSchema,
  optionalPositiveIntegerSchema,
  optionalTrimmedStringSchema,
  requiredTrimmedStringSchema,
  z,
} from "./schema-contract";

const requiredIdSchema = requiredTrimmedStringSchema();
const requiredUuidSchema = z.string().trim().uuid();
const titleSchema = requiredTrimmedStringSchema(2);
const timezoneSchema = requiredTrimmedStringSchema();
const recurrenceRuleSchema = z.record(z.string(), z.unknown());
const optionalUuidSchema = z.preprocess(
  (value) => {
    if (value === null) return undefined;
    if (typeof value === "string") {
      const trimmed = value.trim();

      return trimmed.length > 0 ? trimmed : undefined;
    }

    return value;
  },
  z.string().uuid().optional(),
);

const recurringTaskTemplatePatchSchema = z
  .object({
    areaId: optionalUuidSchema,
    description: optionalTrimmedStringSchema,
    durationMinutes: optionalPositiveIntegerSchema.refine(
      (value) => value === undefined || value <= 1440,
      {
        message: "Expected a duration of at most 1440 minutes.",
      },
    ),
    endsOn: optionalLocalDateSchema,
    energy: optionalEnumSchema(taskEnergies),
    goalId: optionalUuidSchema,
    isActive: optionalBooleanSchema,
    nextAction: optionalTrimmedStringSchema,
    priority: optionalEnumSchema(taskPriorities),
    projectId: optionalUuidSchema,
    recurrenceRule: recurrenceRuleSchema,
    startsOn: localDateSchema,
    timezone: timezoneSchema,
    title: titleSchema,
  })
  .refine(
    (input) =>
      input.endsOn === undefined ||
      input.startsOn === undefined ||
      Date.parse(input.endsOn) >= Date.parse(input.startsOn),
    {
      message: "Expected endsOn to be on or after startsOn.",
      path: ["endsOn"],
    },
  );

export const recurringTaskTemplateInputSchema =
  recurringTaskTemplatePatchSchema;

export type RecurringTaskTemplateInput = z.infer<
  typeof recurringTaskTemplatePatchSchema
>;

export const createRecurringTaskTemplateInputSchema =
  recurringTaskTemplatePatchSchema.extend({
    profileId: requiredIdSchema,
    userId: requiredIdSchema,
  });

export type CreateRecurringTaskTemplateInput = z.infer<
  typeof createRecurringTaskTemplateInputSchema
>;

export const updateRecurringTaskTemplateActionInputSchema =
  recurringTaskTemplatePatchSchema.partial().extend({
    templateId: requiredUuidSchema,
  });

export type UpdateRecurringTaskTemplateActionInput = z.infer<
  typeof updateRecurringTaskTemplateActionInputSchema
>;

export const updateRecurringTaskTemplateInputSchema =
  updateRecurringTaskTemplateActionInputSchema.extend({
    profileId: requiredIdSchema,
    userId: requiredIdSchema,
  });

export type UpdateRecurringTaskTemplateInput = z.infer<
  typeof updateRecurringTaskTemplateInputSchema
>;

export const deactivateRecurringTaskTemplateActionInputSchema = z.object({
  templateId: requiredUuidSchema,
});

export type DeactivateRecurringTaskTemplateActionInput = z.infer<
  typeof deactivateRecurringTaskTemplateActionInputSchema
>;

export const deactivateRecurringTaskTemplateInputSchema =
  deactivateRecurringTaskTemplateActionInputSchema.extend({
    profileId: requiredIdSchema,
    userId: requiredIdSchema,
  });

export type DeactivateRecurringTaskTemplateInput = z.infer<
  typeof deactivateRecurringTaskTemplateInputSchema
>;

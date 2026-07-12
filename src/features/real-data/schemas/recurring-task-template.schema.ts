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
const recurrenceIntervalSchema = z.coerce.number().int().positive().max(366);
const recurrenceRuleSchema = z.discriminatedUnion("frequency", [
  z.object({
    frequency: z.literal("daily"),
    interval: recurrenceIntervalSchema.optional(),
    version: z.literal("v1"),
  }),
  z.object({
    byWeekday: z.array(z.coerce.number().int().min(1).max(7)).min(1).max(7),
    frequency: z.literal("weekly"),
    interval: recurrenceIntervalSchema.optional(),
    version: z.literal("v1"),
  }),
]);
const optionalUuidSchema = z.preprocess((value) => {
  if (value === null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : undefined;
  }

  return value;
}, z.string().uuid().nullable().optional());

const optionalNullableStringSchema = optionalTrimmedStringSchema.nullable();
const optionalNullableDateSchema = optionalLocalDateSchema.nullable();
const optionalNullablePrioritySchema =
  optionalEnumSchema(taskPriorities).nullable();
const optionalNullableEnergySchema =
  optionalEnumSchema(taskEnergies).nullable();
const optionalNullableDurationSchema = optionalPositiveIntegerSchema
  .nullable()
  .refine((value) => value === undefined || value === null || value <= 1440, {
    message: "Expected a duration of at most 1440 minutes.",
  });

const recurringTaskTemplateBaseSchema = z.object({
  areaId: optionalUuidSchema,
  description: optionalNullableStringSchema,
  durationMinutes: optionalNullableDurationSchema,
  endsOn: optionalNullableDateSchema,
  energy: optionalNullableEnergySchema,
  goalId: optionalUuidSchema,
  isActive: optionalBooleanSchema,
  nextAction: optionalNullableStringSchema,
  priority: optionalNullablePrioritySchema,
  projectId: optionalUuidSchema,
  recurrenceRule: recurrenceRuleSchema,
  startsOn: localDateSchema,
  timezone: timezoneSchema,
  title: titleSchema,
});

function endsOnIsAfterStartsOn(input: {
  endsOn?: string | null;
  startsOn?: string;
}) {
  return (
    input.endsOn == null ||
    input.startsOn === undefined ||
    Date.parse(input.endsOn) >= Date.parse(input.startsOn)
  );
}

const recurringTaskTemplatePatchSchema = recurringTaskTemplateBaseSchema.refine(
  endsOnIsAfterStartsOn,
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
  recurringTaskTemplateBaseSchema
    .partial()
    .extend({
      templateId: requiredUuidSchema,
    })
    .refine(endsOnIsAfterStartsOn, {
      message: "Expected endsOn to be on or after startsOn.",
      path: ["endsOn"],
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

export const generateRecurringTaskInstancesForDateActionInputSchema = z.object({
  date: localDateSchema,
});

export type GenerateRecurringTaskInstancesForDateActionInput = z.infer<
  typeof generateRecurringTaskInstancesForDateActionInputSchema
>;

const maxGenerationRangeDays = 31;

function rangeLengthInDays(startDate: string, endDate: string) {
  const start = Date.parse(`${startDate}T00:00:00.000Z`);
  const end = Date.parse(`${endDate}T00:00:00.000Z`);

  return Math.floor((end - start) / 86_400_000) + 1;
}

export const generateRecurringTaskInstancesForRangeActionInputSchema = z
  .object({
    endDate: localDateSchema,
    startDate: localDateSchema,
  })
  .refine((input) => Date.parse(input.endDate) >= Date.parse(input.startDate), {
    message: "Expected endDate to be on or after startDate.",
    path: ["endDate"],
  })
  .refine(
    (input) =>
      rangeLengthInDays(input.startDate, input.endDate) <=
      maxGenerationRangeDays,
    {
      message: `Expected a generation range of at most ${maxGenerationRangeDays} days.`,
      path: ["endDate"],
    },
  );

export type GenerateRecurringTaskInstancesForRangeActionInput = z.infer<
  typeof generateRecurringTaskInstancesForRangeActionInputSchema
>;

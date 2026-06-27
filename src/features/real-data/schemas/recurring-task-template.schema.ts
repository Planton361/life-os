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

export const recurringTaskTemplateInputSchema = z
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
      Date.parse(input.endsOn) >= Date.parse(input.startsOn),
    {
      message: "Expected endsOn to be on or after startsOn.",
      path: ["endsOn"],
    },
  );

export type RecurringTaskTemplateInput = z.infer<
  typeof recurringTaskTemplateInputSchema
>;

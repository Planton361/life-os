import { habitWindows } from "../domain";
import { requiredTrimmedStringSchema, z } from "./schema-contract";

const optionalQuantity = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().positive().max(1_000_000).optional(),
);
const nullableUnit = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().max(32).nullable(),
);
const slot = z.coerce.number().int().min(1).max(8);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const uuid = z.string().uuid();

export const createHabitInputSchema = z.object({
  dailyTarget: optionalQuantity,
  defaultIncrement: z.coerce.number().positive().max(1_000_000),
  name: requiredTrimmedStringSchema(2),
  sortOrder: slot,
  unit: nullableUnit,
  window: z.enum(habitWindows),
});

export const updateHabitInputSchema = createHabitInputSchema.extend({
  habitId: uuid,
});

export const habitIdInputSchema = z.object({ habitId: uuid });

export const habitWindowSettingsInputSchema = z
  .object({
    eveningStartsAt: time,
    middayStartsAt: time,
    morningStartsAt: time,
  })
  .refine(
    (input) =>
      input.morningStartsAt < input.middayStartsAt &&
      input.middayStartsAt < input.eveningStartsAt,
    {
      message: "Habit window boundaries must be ordered.",
      path: ["middayStartsAt"],
    },
  );

export type CreateHabitInput = z.infer<typeof createHabitInputSchema>;
export type UpdateHabitInput = z.infer<typeof updateHabitInputSchema>;
export type HabitWindowSettingsInput = z.infer<
  typeof habitWindowSettingsInputSchema
>;

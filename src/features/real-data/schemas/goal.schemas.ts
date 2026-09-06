import { goalHorizons, goalStatuses } from "../domain/goal";
import {
  dateTimeStringSchema,
  optionalEnumSchema,
  optionalTrimmedStringSchema,
  requiredTrimmedStringSchema,
  z,
} from "./schema-contract";

const requiredIdSchema = requiredTrimmedStringSchema();
const titleSchema = requiredTrimmedStringSchema(2);
const nullableOptionalDateTime = z
  .union([dateTimeStringSchema, z.null()])
  .optional();

const goalPatchSchema = z.object({
  areaId: optionalTrimmedStringSchema,
  description: optionalTrimmedStringSchema,
  horizon: optionalEnumSchema(goalHorizons),
  measure: optionalTrimmedStringSchema,
  status: optionalEnumSchema(goalStatuses),
  targetDate: nullableOptionalDateTime,
  targetValue: optionalTrimmedStringSchema,
  why: optionalTrimmedStringSchema,
});

export const createGoalInputSchema = goalPatchSchema.extend({
  profileId: requiredIdSchema,
  title: titleSchema,
  userId: requiredIdSchema,
});

export type CreateGoalInput = z.infer<typeof createGoalInputSchema>;

export const updateGoalInputSchema = goalPatchSchema.extend({
  areaId: z.string().trim().min(1).nullable().optional(),
  description: z.string().trim().min(1).nullable().optional(),
  why: z.string().trim().min(1).nullable().optional(),

  goalId: requiredIdSchema,
  profileId: requiredIdSchema,
  title: optionalTrimmedStringSchema,
  userId: requiredIdSchema,
});

export type UpdateGoalInput = z.infer<typeof updateGoalInputSchema>;

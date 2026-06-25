import { goalHorizons, goalStatuses } from "../domain/goal";
import {
  optionalDateTimeStringSchema,
  optionalEnumSchema,
  optionalTrimmedStringSchema,
  requiredTrimmedStringSchema,
  z,
} from "./schema-contract";

const requiredIdSchema = requiredTrimmedStringSchema();
const titleSchema = requiredTrimmedStringSchema(2);

const goalPatchSchema = z.object({
  areaId: optionalTrimmedStringSchema,
  description: optionalTrimmedStringSchema,
  horizon: optionalEnumSchema(goalHorizons),
  measure: optionalTrimmedStringSchema,
  status: optionalEnumSchema(goalStatuses),
  targetDate: optionalDateTimeStringSchema,
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
  goalId: requiredIdSchema,
  profileId: requiredIdSchema,
  title: optionalTrimmedStringSchema,
  userId: requiredIdSchema,
});

export type UpdateGoalInput = z.infer<typeof updateGoalInputSchema>;

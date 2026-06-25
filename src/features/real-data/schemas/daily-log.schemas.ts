import { dailyLogStatuses } from "../domain/daily-log";
import { taskEnergies } from "../domain/task";
import {
  localDateSchema,
  optionalDateTimeStringSchema,
  optionalEnumSchema,
  optionalTrimmedStringSchema,
  requiredTrimmedStringSchema,
  z,
} from "./schema-contract";

const requiredIdSchema = requiredTrimmedStringSchema();

export const upsertDailyLogInputSchema = z.object({
  carryForwardNote: optionalTrimmedStringSchema,
  closingNote: optionalTrimmedStringSchema,
  energy: optionalEnumSchema(taskEnergies),
  localDate: localDateSchema,
  mood: optionalTrimmedStringSchema,
  openingNote: optionalTrimmedStringSchema,
  profileId: requiredIdSchema,
  status: optionalEnumSchema(dailyLogStatuses),
  timezone: requiredTrimmedStringSchema(),
  userId: requiredIdSchema,
});

export type UpsertDailyLogInput = z.infer<typeof upsertDailyLogInputSchema>;

export const closeDailyLogInputSchema = z.object({
  carryForwardNote: optionalTrimmedStringSchema,
  closedAt: optionalDateTimeStringSchema,
  closingNote: optionalTrimmedStringSchema,
  dailyLogId: requiredIdSchema,
  profileId: requiredIdSchema,
  userId: requiredIdSchema,
});

export type CloseDailyLogInput = z.infer<typeof closeDailyLogInputSchema>;

import { moodValues } from "../domain";
import { localDateSchema, optionalTrimmedStringSchema, requiredTrimmedStringSchema, z } from "./schema-contract";

export const moodEntryInputSchema = z.object({ mood: z.enum(moodValues), localDate: localDateSchema, timezone: requiredTrimmedStringSchema() });
export const sleepEntryInputSchema = z.object({ sleepDate: localDateSchema, durationMinutes: z.coerce.number().int().min(1).max(1440), quality: z.coerce.number().int().min(1).max(5).optional(), note: optionalTrimmedStringSchema });
export const weightEntryInputSchema = z.object({ measuredOn: localDateSchema, weightKg: z.coerce.number().min(20).max(500) });
export const weightGoalInputSchema = z.object({ targetWeightKg: z.coerce.number().min(20).max(500), targetDate: localDateSchema.optional() });

export type MoodEntryInput = z.infer<typeof moodEntryInputSchema>;
export type SleepEntryInput = z.infer<typeof sleepEntryInputSchema>;
export type WeightEntryInput = z.infer<typeof weightEntryInputSchema>;
export type WeightGoalInput = z.infer<typeof weightGoalInputSchema>;

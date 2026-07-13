import { z } from "zod";
import { muscleGroups } from "../domain/training";

const uuid = z.string().uuid();
const optionalText = (max: number) => z.string().trim().max(max).transform((value) => value || null);
const optionalPositive = z.union([z.literal(""), z.coerce.number().positive()]).transform((value) => value === "" ? null : value);

export const runningPlanInputSchema = z.object({ planId: uuid.optional(), name: z.string().trim().min(1).max(120), goal: z.string().trim().min(1).max(500) });
export const runningPlanItemInputSchema = z.object({ itemId: uuid.optional(), planId: uuid, title: z.string().trim().min(1).max(120), plannedDistanceKm: optionalPositive, plannedDurationMinutes: z.union([z.literal(""), z.coerce.number().int().positive().max(1440)]).transform((value) => value === "" ? null : value), sortOrder: z.coerce.number().int().min(0).max(10000) });
export const runningSessionInputSchema = z.object({ sessionId: uuid.optional(), planItemId: z.union([uuid, z.literal("")]).transform((value) => value || null), sessionDate: z.string().date(), startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).or(z.literal("")), distanceKm: z.coerce.number().positive().max(1000), durationMinutes: z.coerce.number().int().positive().max(10080), averageHeartRate: z.union([z.literal(""), z.coerce.number().int().min(30).max(240)]).transform((value) => value === "" ? null : value), notes: optionalText(2000) });
export const exerciseInputSchema = z.object({ exerciseId: uuid.optional(), name: z.string().trim().min(1).max(120), description: optionalText(1000), equipment: optionalText(120), muscles: z.array(z.enum(muscleGroups)).min(1) });
export const strengthPlanInputSchema = z.object({ planId: uuid.optional(), name: z.string().trim().min(1).max(120), goal: z.string().trim().min(1).max(500) });
export const strengthPlanItemInputSchema = z.object({ itemId: uuid.optional(), planId: uuid, exerciseId: uuid, sortOrder: z.coerce.number().int().min(0).max(10000), targetSets: z.coerce.number().int().min(1).max(50), targetReps: z.coerce.number().int().min(1).max(1000), targetWeightKg: optionalPositive });
export const strengthSessionInputSchema = z.object({ planId: uuid, sessionDate: z.string().date(), notes: optionalText(2000) });
export const strengthSetInputSchema = z.object({ sessionId: uuid, exerciseId: uuid, setOrder: z.coerce.number().int().min(1).max(1000), repetitions: z.coerce.number().int().min(1).max(1000), weightKg: optionalPositive, notes: optionalText(1000) });
export const trainingIdInputSchema = z.object({ id: uuid });

export type RunningPlanInput = z.infer<typeof runningPlanInputSchema>;
export type RunningPlanItemInput = z.infer<typeof runningPlanItemInputSchema>;
export type RunningSessionInput = z.infer<typeof runningSessionInputSchema>;
export type ExerciseInput = z.infer<typeof exerciseInputSchema>;
export type StrengthPlanInput = z.infer<typeof strengthPlanInputSchema>;
export type StrengthPlanItemInput = z.infer<typeof strengthPlanItemInputSchema>;
export type StrengthSessionInput = z.infer<typeof strengthSessionInputSchema>;
export type StrengthSetInput = z.infer<typeof strengthSetInputSchema>;

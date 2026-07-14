import { challengePeriods } from "../domain/challenge";
import { requiredTrimmedStringSchema, z } from "./schema-contract";

const uuid = z.string().trim().uuid();
const optionalText = z.preprocess((value) => typeof value === "string" && value.trim() === "" ? null : value, z.string().trim().min(1).nullable());
export const challengeInputSchema = z.object({ description: optionalText, endDate: z.string().date(), periodType: z.enum(challengePeriods), rewardCoins: z.coerce.number().int().nonnegative(), startDate: z.string().date(), targetValue: z.coerce.number().positive(), title: requiredTrimmedStringSchema(1), unit: requiredTrimmedStringSchema(1) }).refine((input) => input.endDate >= input.startDate, { message: "End date must not precede start date.", path: ["endDate"] });
export const updateChallengeInputSchema = challengeInputSchema.and(z.object({ challengeId: uuid }));
export const challengeIdSchema = z.object({ challengeId: uuid });
export const challengeProgressInputSchema = z.object({ challengeId: uuid, increment: z.coerce.number().positive(), note: optionalText });
export const updateChallengeProgressInputSchema = challengeProgressInputSchema.extend({ progressLogId: uuid });
export const challengeProgressIdSchema = z.object({ challengeId: uuid, progressLogId: uuid });
export type ChallengeInput = z.infer<typeof challengeInputSchema>;
export type UpdateChallengeInput = z.infer<typeof updateChallengeInputSchema>;
export type ChallengeProgressInput = z.infer<typeof challengeProgressInputSchema>;
export type UpdateChallengeProgressInput = z.infer<typeof updateChallengeProgressInputSchema>;

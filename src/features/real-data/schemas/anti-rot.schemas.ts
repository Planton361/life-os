import { antiRotCategories, antiRotEnergies } from "../domain/anti-rot";
import { requiredTrimmedStringSchema, z } from "./schema-contract";
const uuid = z.string().trim().uuid();
const nullableText = z.preprocess(
  (v) => (typeof v === "string" && !v.trim() ? null : v),
  z.string().trim().min(1).nullable(),
);
const nullablePositiveInt = z.preprocess(
  (v) => (v === "" ? null : v),
  z.coerce.number().int().positive().nullable(),
);
export const antiRotActionInputSchema = z.object({
  category: z.preprocess(
    (v) => (v === "" ? null : v),
    z.enum(antiRotCategories).nullable(),
  ),
  description: nullableText,
  energy: z.preprocess(
    (v) => (v === "" ? null : v),
    z.enum(antiRotEnergies).nullable(),
  ),
  estimatedMinutes: nullablePositiveInt,
  title: requiredTrimmedStringSchema(1),
});
export const updateAntiRotActionInputSchema = antiRotActionInputSchema.and(
  z.object({ actionId: uuid }),
);
export const antiRotActionIdSchema = z.object({ actionId: uuid });
export const antiRotRecommendationSchema = z.object({
  recommendationEventId: uuid,
});
export type AntiRotActionInput = z.infer<typeof antiRotActionInputSchema>;
export type UpdateAntiRotActionInput = z.infer<
  typeof updateAntiRotActionInputSchema
>;

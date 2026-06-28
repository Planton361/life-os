import {
  localDateSchema,
  optionalEnumSchema,
  optionalTrimmedStringSchema,
  requiredEnumSchema,
  requiredTrimmedStringSchema,
  z,
} from "./schema-contract";

export const skillStatuses = ["active", "paused", "archived"] as const;

export const skillEvidenceSourceTypes = [
  "task",
  "project",
  "goal",
  "resource",
  "manual_note",
] as const;

const blankInputToUndefined = (value: unknown) => {
  if (typeof value === "string" && value.trim().length === 0) {
    return undefined;
  }

  return value;
};

const requiredUuidSchema = z.string().trim().uuid();
const optionalNullableUuidSchema = z.preprocess(
  blankInputToUndefined,
  z.string().trim().uuid().nullable().optional(),
);
const optionalEvidenceWeightSchema = z.preprocess(
  blankInputToUndefined,
  z.coerce.number().int().min(1).max(5).optional(),
);

const skillBaseSchema = z.object({
  areaId: optionalNullableUuidSchema,
  category: optionalTrimmedStringSchema,
  level: optionalTrimmedStringSchema,
  name: requiredTrimmedStringSchema(),
  status: optionalEnumSchema(skillStatuses),
  summary: optionalTrimmedStringSchema,
});

export const skillCreateInputSchema = skillBaseSchema;

export type SkillCreateInput = z.infer<typeof skillCreateInputSchema>;

export const skillUpdateInputSchema = skillBaseSchema.partial().extend({
  skillId: requiredUuidSchema,
});

export type SkillUpdateInput = z.infer<typeof skillUpdateInputSchema>;

const skillEvidenceBaseSchema = z.object({
  evidenceDate: localDateSchema,
  note: optionalTrimmedStringSchema,
  skillId: requiredUuidSchema,
  sourceId: optionalNullableUuidSchema,
  sourceType: requiredEnumSchema(skillEvidenceSourceTypes),
  title: requiredTrimmedStringSchema(),
  weight: optionalEvidenceWeightSchema,
});

export const skillEvidenceCreateInputSchema = skillEvidenceBaseSchema;

export type SkillEvidenceCreateInput = z.infer<
  typeof skillEvidenceCreateInputSchema
>;

export const skillEvidenceUpdateInputSchema = skillEvidenceBaseSchema
  .partial()
  .extend({
    evidenceId: requiredUuidSchema,
  });

export type SkillEvidenceUpdateInput = z.infer<
  typeof skillEvidenceUpdateInputSchema
>;

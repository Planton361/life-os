import {
  skillEvidenceSourceTypes,
  skillStatuses,
  type SkillEvidenceSourceType,
} from "../domain/skill";
import {
  localDateSchema,
  optionalEnumSchema,
  optionalTrimmedStringSchema,
  requiredEnumSchema,
  requiredTrimmedStringSchema,
  z,
} from "./schema-contract";

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
  summary: z.string().trim().min(1).nullable().optional(),
  category: z.string().trim().min(1).nullable().optional(),
  skillId: requiredUuidSchema,
});

export type SkillUpdateInput = z.infer<typeof skillUpdateInputSchema>;

export const skillArchiveInputSchema = z.object({
  skillId: requiredUuidSchema,
});

export type SkillArchiveInput = z.infer<typeof skillArchiveInputSchema>;

const skillEvidenceBaseSchema = z.object({
  evidenceDate: localDateSchema,
  note: optionalTrimmedStringSchema,
  skillId: requiredUuidSchema,
  sourceId: optionalNullableUuidSchema,
  sourceType: requiredEnumSchema(skillEvidenceSourceTypes),
  title: requiredTrimmedStringSchema(),
  weight: optionalEvidenceWeightSchema,
});

function hasValidSourceReference(input: {
  sourceId?: string | null;
  sourceType?: SkillEvidenceSourceType;
}) {
  if (input.sourceType === undefined) return true;

  if (input.sourceType === "manual_note") {
    return input.sourceId === undefined || input.sourceId === null;
  }

  return typeof input.sourceId === "string" && input.sourceId.length > 0;
}

const skillEvidenceSourceReferenceMessage =
  "manual_note evidence must not include sourceId; task/project/goal/resource evidence must include sourceId.";

export const skillEvidenceCreateInputSchema = skillEvidenceBaseSchema.refine(
  hasValidSourceReference,
  {
    message: skillEvidenceSourceReferenceMessage,
    path: ["sourceId"],
  },
);

export type SkillEvidenceCreateInput = z.infer<
  typeof skillEvidenceCreateInputSchema
>;

export const skillEvidenceUpdateInputSchema = skillEvidenceBaseSchema
  .partial()
  .extend({
    evidenceId: requiredUuidSchema,
  })
  .refine(hasValidSourceReference, {
    message: skillEvidenceSourceReferenceMessage,
    path: ["sourceId"],
  });

export type SkillEvidenceUpdateInput = z.infer<
  typeof skillEvidenceUpdateInputSchema
>;

export const skillEvidenceDeleteInputSchema = z.object({
  evidenceId: requiredUuidSchema,
});

export type SkillEvidenceDeleteInput = z.infer<
  typeof skillEvidenceDeleteInputSchema
>;

export const taskSkillLinkInputSchema = z.object({
  skillId: requiredUuidSchema,
  taskId: requiredUuidSchema,
});

export type TaskSkillLinkInput = z.infer<typeof taskSkillLinkInputSchema>;

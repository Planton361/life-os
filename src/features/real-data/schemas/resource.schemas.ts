import {
  privacyClasses,
  resourceRelationTypes,
  resourceStatuses,
  resourceTypes,
  supportedResourceRelationTargetTypes,
} from "../domain/resource";
import {
  optionalBooleanSchema,
  optionalEnumSchema,
  optionalTrimmedStringSchema,
  requiredEnumSchema,
  requiredTrimmedStringSchema,
  z,
} from "./schema-contract";

const requiredIdSchema = requiredTrimmedStringSchema();
const requiredUuidSchema = z.string().trim().uuid();
const titleSchema = requiredTrimmedStringSchema(2);
const optionalResourceRelationTypeSchema = z
  .preprocess(
    (value) => {
      if (value === null) return undefined;
      if (typeof value === "string" && value.trim().length === 0) {
        return undefined;
      }

      return value;
    },
    z.enum(resourceRelationTypes).optional(),
  )
  .default("related");

export const createResourceInputSchema = z.object({
  areaId: optionalTrimmedStringSchema,
  body: optionalTrimmedStringSchema,
  context: optionalTrimmedStringSchema,
  privacyClass: optionalEnumSchema(privacyClasses),
  profileId: requiredIdSchema,
  reviewNeeded: optionalBooleanSchema,
  source: optionalTrimmedStringSchema,
  status: optionalEnumSchema(resourceStatuses),
  title: titleSchema,
  type: requiredEnumSchema(resourceTypes),
  url: optionalTrimmedStringSchema,
  userId: requiredIdSchema,
});

export type CreateResourceInput = z.infer<typeof createResourceInputSchema>;

export const linkResourceToTargetInputSchema = z.object({
  profileId: requiredUuidSchema,
  relationType: optionalResourceRelationTypeSchema,
  resourceId: requiredUuidSchema,
  targetId: requiredUuidSchema,
  targetType: requiredEnumSchema(supportedResourceRelationTargetTypes),
});

export const unlinkResourceFromTargetInputSchema = z.object({
  profileId: requiredTrimmedStringSchema(),
  relationId: requiredTrimmedStringSchema(),
});

export type LinkResourceToTargetInput = z.infer<
  typeof linkResourceToTargetInputSchema
>;

export const linkResourceInputSchema = linkResourceToTargetInputSchema.extend({
  userId: requiredUuidSchema,
});

export type LinkResourceInput = z.infer<typeof linkResourceInputSchema>;

import {
  privacyClasses,
  resourceRelationTargetTypes,
  resourceRelationTypes,
  resourceStatuses,
  resourceTypes,
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
const titleSchema = requiredTrimmedStringSchema(2);

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

export const linkResourceInputSchema = z.object({
  profileId: requiredIdSchema,
  relationType: requiredEnumSchema(resourceRelationTypes),
  resourceId: requiredIdSchema,
  targetId: requiredIdSchema,
  targetType: requiredEnumSchema(resourceRelationTargetTypes),
  userId: requiredIdSchema,
});

export type LinkResourceInput = z.infer<typeof linkResourceInputSchema>;

import {
  optionalTrimmedStringSchema,
  requiredTrimmedStringSchema,
  z,
} from "./schema-contract";
import { projectStatuses } from "../domain/project";

const id = requiredTrimmedStringSchema();
const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().trim().url().max(500).optional(),
);

export const createCodingProjectInputSchema = z.object({
  description: optionalTrimmedStringSchema,
  repositoryUrl: optionalUrl,
  status: z.enum(projectStatuses).default("active"),
  title: requiredTrimmedStringSchema(2),
});

export const updateCodingProjectInputSchema = createCodingProjectInputSchema.extend({
  projectId: id,
});

const codingSessionFields = z.object({
  activity: requiredTrimmedStringSchema(2),
  durationMinutes: z.coerce.number().int().positive().max(1440),
  note: optionalTrimmedStringSchema,
  outcome: requiredTrimmedStringSchema(2),
  projectId: id,
  sessionDate: z.string().date(),
  startTime: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  ),
});

export const createCodingSessionInputSchema = codingSessionFields;
export const updateCodingSessionInputSchema = codingSessionFields.extend({ sessionId: id });
export const archiveCodingSessionInputSchema = z.object({ sessionId: id });

export type CodingProjectInput = z.infer<typeof createCodingProjectInputSchema>;
export type CodingSessionInput = z.infer<typeof createCodingSessionInputSchema>;

import { optionalTrimmedStringSchema, requiredTrimmedStringSchema, z } from "./schema-contract";

const id = requiredTrimmedStringSchema();
const optionalInteger = (minimum: number, maximum: number) => z.preprocess(
  (value) => value === "" || value === null ? undefined : value,
  z.coerce.number().int().min(minimum).max(maximum).optional(),
);
const startTime = z.preprocess(
  (value) => value === "" ? undefined : value,
  z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
);

const educationLogFields = z.object({
  durationMinutes: z.coerce.number().int().positive().max(1440),
  focus: requiredTrimmedStringSchema(2),
  logDate: z.string().date(),
  logType: z.enum(["learning", "writing"]),
  notes: optionalTrimmedStringSchema,
  outcome: requiredTrimmedStringSchema(2),
  projectId: id,
  startTime,
  unitsCompleted: optionalInteger(0, 1000000),
  wordCountDelta: optionalInteger(-1000000, 1000000),
});

export const createEducationLogInputSchema = educationLogFields;
export const updateEducationLogInputSchema = educationLogFields.extend({ logId: id });
export const archiveEducationLogInputSchema = z.object({ logId: id, projectId: id });
export type EducationLogInput = z.infer<typeof createEducationLogInputSchema>;

import { requiredTrimmedStringSchema, z } from "./schema-contract";
import { entertainmentMediaTypes, entertainmentProgressUnits, entertainmentStatuses } from "../domain/life";

const uuid = z.string().trim().uuid();
const entryDate = z.string().date();
const optionalTitle = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? null : value,
  z.string().trim().min(1).max(200).nullable(),
);

export const createJournalEntryInputSchema = z.object({
  body: requiredTrimmedStringSchema(1),
  entryDate,
  title: optionalTitle,
});

export const updateJournalEntryInputSchema = createJournalEntryInputSchema.extend({
  journalEntryId: uuid,
});

export const archiveJournalEntryInputSchema = z.object({ journalEntryId: uuid });

export const createLifeNoteInputSchema = z.object({
  body: requiredTrimmedStringSchema(1),
  title: requiredTrimmedStringSchema(2),
});

export const updateLifeNoteInputSchema = createLifeNoteInputSchema.extend({
  resourceId: uuid,
});

export const lifeNoteLifecycleInputSchema = z.object({ resourceId: uuid });

export type CreateJournalEntryInput = z.infer<typeof createJournalEntryInputSchema>;
export type UpdateJournalEntryInput = z.infer<typeof updateJournalEntryInputSchema>;
export type CreateLifeNoteInput = z.infer<typeof createLifeNoteInputSchema>;
export type UpdateLifeNoteInput = z.infer<typeof updateLifeNoteInputSchema>;

const optionalText = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? null : value,
  z.string().trim().min(1).nullable(),
);
const optionalDate = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? null : value,
  z.string().date().nullable(),
);
const optionalNumber = (schema: z.ZodNumber) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? null : value,
  z.coerce.number().pipe(schema).nullable(),
);

export const entertainmentItemInputSchema = z.object({
  completedOn: optionalDate,
  creatorOrStudio: optionalText,
  mediaType: z.enum(entertainmentMediaTypes),
  notes: optionalText,
  progressCurrent: optionalNumber(z.number().nonnegative()),
  progressTotal: optionalNumber(z.number().positive()),
  progressUnit: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? null : value,
    z.enum(entertainmentProgressUnits).nullable(),
  ),
  rating: optionalNumber(z.number().int().min(1).max(10)),
  releaseYear: optionalNumber(z.number().int().min(1000).max(3000)),
  startedOn: optionalDate,
  status: z.enum(entertainmentStatuses),
  title: requiredTrimmedStringSchema(1),
}).superRefine((input, context) => {
  if (input.progressCurrent !== null && input.progressTotal !== null && input.progressCurrent > input.progressTotal) {
    context.addIssue({ code: "custom", message: "Current progress cannot exceed total progress.", path: ["progressCurrent"] });
  }
  const hasProgress = input.progressCurrent !== null || input.progressTotal !== null;
  if (hasProgress !== (input.progressUnit !== null)) {
    context.addIssue({ code: "custom", message: "Progress values and unit must be provided together.", path: ["progressUnit"] });
  }
});

export const updateEntertainmentItemInputSchema = entertainmentItemInputSchema.and(z.object({ entertainmentItemId: uuid }));
export const entertainmentItemLifecycleInputSchema = z.object({ entertainmentItemId: uuid });

export type EntertainmentItemInput = z.infer<typeof entertainmentItemInputSchema>;
export type UpdateEntertainmentItemInput = z.infer<typeof updateEntertainmentItemInputSchema>;

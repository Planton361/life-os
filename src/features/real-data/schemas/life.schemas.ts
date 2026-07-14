import { requiredTrimmedStringSchema, z } from "./schema-contract";

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

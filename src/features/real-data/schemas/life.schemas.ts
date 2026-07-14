import { requiredTrimmedStringSchema, z } from "./schema-contract";
import { entertainmentMediaTypes, entertainmentProgressUnits, entertainmentStatuses, inventoryConditions, purchaseDecisionStatuses, wishlistPriorities, wishlistStatuses } from "../domain/life";

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

const optionalCurrency = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? null : typeof value === "string" ? value.trim().toUpperCase() : value,
  z.string().regex(/^[A-Z]{3}$/).nullable(),
);
const moneyFields = {
  currency: optionalCurrency,
  amount: optionalNumber(z.number().nonnegative()),
};
function validateMoneyPair(input: { amount: number | null; currency: string | null }, context: z.RefinementCtx) {
  if ((input.amount === null) !== (input.currency === null)) context.addIssue({ code: "custom", message: "Amount and currency must be provided together.", path: [input.amount === null ? "amount" : "currency"] });
}

export const inventoryItemInputSchema = z.object({
  acquiredOn: optionalDate,
  amount: moneyFields.amount,
  category: requiredTrimmedStringSchema(1),
  condition: z.preprocess((value) => value === "" ? null : value, z.enum(inventoryConditions).nullable()),
  currency: moneyFields.currency,
  description: optionalText,
  location: optionalText,
  name: requiredTrimmedStringSchema(1),
  quantity: optionalNumber(z.number().positive()),
  unit: optionalText,
}).superRefine((input, context) => {
  validateMoneyPair(input, context);
  if ((input.quantity === null) !== (input.unit === null)) context.addIssue({ code: "custom", message: "Quantity and unit must be provided together.", path: [input.quantity === null ? "quantity" : "unit"] });
});
export const updateInventoryItemInputSchema = inventoryItemInputSchema.and(z.object({ inventoryItemId: uuid }));
export const inventoryItemLifecycleInputSchema = z.object({ inventoryItemId: uuid });

export const wishlistItemInputSchema = z.object({
  amount: moneyFields.amount,
  category: requiredTrimmedStringSchema(1),
  currency: moneyFields.currency,
  description: optionalText,
  priority: z.enum(wishlistPriorities),
  status: z.enum(wishlistStatuses),
  targetDate: optionalDate,
  title: requiredTrimmedStringSchema(1),
}).superRefine(validateMoneyPair);
export const updateWishlistItemInputSchema = wishlistItemInputSchema.and(z.object({ wishlistItemId: uuid }));
export const wishlistItemLifecycleInputSchema = z.object({ wishlistItemId: uuid });

export const purchaseDecisionInputSchema = z.object({
  context: requiredTrimmedStringSchema(1),
  criteria: optionalText,
  decision: requiredTrimmedStringSchema(1),
  decisionDate: entryDate,
  rationale: requiredTrimmedStringSchema(1),
  status: z.enum(purchaseDecisionStatuses),
  wishlistItemId: uuid,
});
export const updatePurchaseDecisionInputSchema = purchaseDecisionInputSchema.and(z.object({ purchaseDecisionId: uuid }));
export const purchaseDecisionLifecycleInputSchema = z.object({ purchaseDecisionId: uuid });
export const convertWishlistItemInputSchema = z.object({ wishlistItemId: uuid });

export type InventoryItemInput = z.infer<typeof inventoryItemInputSchema>;
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemInputSchema>;
export type WishlistItemInput = z.infer<typeof wishlistItemInputSchema>;
export type UpdateWishlistItemInput = z.infer<typeof updateWishlistItemInputSchema>;
export type PurchaseDecisionInput = z.infer<typeof purchaseDecisionInputSchema>;
export type UpdatePurchaseDecisionInput = z.infer<typeof updatePurchaseDecisionInputSchema>;

import { requiredTrimmedStringSchema, z } from "./schema-contract";
const uuid = z.string().trim().uuid();
const optionalText = z.preprocess(
  (value) => (typeof value === "string" && !value.trim() ? null : value),
  z.string().trim().min(1).nullable(),
);
export const shopItemInputSchema = z.object({
  category: optionalText,
  costCoins: z.coerce.number().int().positive(),
  description: optionalText,
  title: requiredTrimmedStringSchema(1),
});
export const updateShopItemInputSchema = shopItemInputSchema.and(
  z.object({ shopItemId: uuid }),
);
export const shopItemIdSchema = z.object({ shopItemId: uuid });
export const redeemShopItemSchema = z.object({
  requestKey: uuid,
  shopItemId: uuid,
});
export type ShopItemInput = z.infer<typeof shopItemInputSchema>;
export type UpdateShopItemInput = z.infer<typeof updateShopItemInputSchema>;

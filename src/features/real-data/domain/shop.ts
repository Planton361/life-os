export type ShopItem = {
  archivedAt: string | null;
  category: string | null;
  costCoins: number;
  createdAt: string;
  description: string | null;
  id: string;
  isPaused: boolean;
  title: string;
  updatedAt: string;
};
export type ShopRedemption = {
  costCoins: number;
  id: string;
  redeemedAt: string;
  requestKey: string;
  shopItemId: string;
  titleSnapshot: string;
};
export type ShopLedgerEntry = {
  amount: number;
  createdAt: string;
  description: string;
  entryType: "challenge_reward" | "shop_redemption";
  id: string;
  sourceId: string;
  sourceType: "challenge" | "shop_redemption";
};
export type ShopWorkspace = {
  balance: number;
  items: ShopItem[];
  ledger: ShopLedgerEntry[];
  redemptions: ShopRedemption[];
};
export function shopBalance(
  entries: readonly Pick<ShopLedgerEntry, "amount">[],
) {
  return entries.reduce((sum, entry) => sum + entry.amount, 0);
}
export function canRedeem(
  item: Pick<ShopItem, "archivedAt" | "costCoins" | "isPaused">,
  balance: number,
) {
  return !item.archivedAt && !item.isPaused && balance >= item.costCoins;
}
export function activeShopItems<
  T extends Pick<ShopItem, "archivedAt" | "isPaused">,
>(items: readonly T[]) {
  return items.filter((item) => !item.archivedAt && !item.isPaused);
}
export function sortShopHistory<T extends { id: string; redeemedAt: string }>(
  items: readonly T[],
) {
  return [...items].sort(
    (a, b) =>
      b.redeemedAt.localeCompare(a.redeemedAt) || b.id.localeCompare(a.id),
  );
}
export function redemptionResult<
  T extends Pick<ShopRedemption, "id" | "requestKey">,
>(redemptions: readonly T[], requestKey: string, create: () => T) {
  return redemptions.find((item) => item.requestKey === requestKey) ?? create();
}
export function redemptionSnapshot(
  item: Pick<ShopItem, "costCoins" | "title">,
) {
  return { costCoins: item.costCoins, titleSnapshot: item.title };
}

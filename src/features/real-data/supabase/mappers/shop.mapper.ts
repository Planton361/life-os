import type {
  ShopItem,
  ShopLedgerEntry,
  ShopRedemption,
} from "../../domain/shop";
import type { TableRow } from "../database.types";
export function mapShopItem(row: TableRow<"shop_items">): ShopItem {
  return {
    archivedAt: row.archived_at,
    category: row.category,
    costCoins: row.cost_coins,
    createdAt: row.created_at,
    description: row.description,
    id: row.id,
    isPaused: row.is_paused,
    title: row.title,
    updatedAt: row.updated_at,
  };
}
export function mapShopRedemption(
  row: TableRow<"shop_redemptions">,
): ShopRedemption {
  return {
    costCoins: row.cost_coins,
    id: row.id,
    redeemedAt: row.redeemed_at,
    requestKey: row.request_key,
    shopItemId: row.shop_item_id,
    titleSnapshot: row.title_snapshot,
  };
}
export function mapShopLedger(
  row: TableRow<"reward_ledger_entries">,
): ShopLedgerEntry {
  return {
    amount: row.amount,
    createdAt: row.created_at,
    description: row.description,
    entryType: row.entry_type as ShopLedgerEntry["entryType"],
    id: row.id,
    sourceId: row.source_id,
    sourceType: row.source_type as ShopLedgerEntry["sourceType"],
  };
}

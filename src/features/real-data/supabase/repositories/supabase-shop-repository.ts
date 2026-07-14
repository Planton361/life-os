import {
  shopBalance,
  sortShopHistory,
  type ShopWorkspace,
} from "../../domain/shop";
import type {
  ShopItemInput,
  UpdateShopItemInput,
} from "../../schemas/shop.schemas";
import type { SupabaseClientLike } from "../database.types";
import {
  mapShopItem,
  mapShopLedger,
  mapShopRedemption,
} from "../mappers/shop.mapper";
function fail(message: string) {
  return { error: message, ok: false as const };
}
export function createSupabaseShopRepository(client: SupabaseClientLike) {
  return {
    async getWorkspace(userId: string): Promise<ShopWorkspace> {
      const [items, redemptions, ledger] = await Promise.all([
        client
          .from("shop_items")
          .select("*")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false })
          .order("id"),
        client
          .from("shop_redemptions")
          .select("*")
          .eq("user_id", userId)
          .order("redeemed_at", { ascending: false })
          .order("id", { ascending: false }),
        client
          .from("reward_ledger_entries")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false }),
      ]);
      const entries = (ledger.data ?? []).map(mapShopLedger);
      return {
        balance: shopBalance(entries),
        items: (items.data ?? []).map(mapShopItem),
        ledger: entries,
        redemptions: sortShopHistory(
          (redemptions.data ?? []).map(mapShopRedemption),
        ),
      };
    },
    async create(userId: string, input: ShopItemInput) {
      const result = await client
        .from("shop_items")
        .insert({
          category: input.category,
          cost_coins: input.costCoins,
          description: input.description,
          title: input.title,
          user_id: userId,
        })
        .select("*")
        .single();
      return result.error || !result.data
        ? fail("Shop item could not be created.")
        : { data: mapShopItem(result.data), ok: true as const };
    },
    async update(userId: string, input: UpdateShopItemInput) {
      const result = await client
        .from("shop_items")
        .update({
          category: input.category,
          cost_coins: input.costCoins,
          description: input.description,
          title: input.title,
        })
        .eq("user_id", userId)
        .eq("id", input.shopItemId)
        .is("archived_at", null)
        .select("*")
        .maybeSingle();
      return result.error || !result.data
        ? fail("Shop item could not be updated.")
        : { data: mapShopItem(result.data), ok: true as const };
    },
    async setPaused(userId: string, shopItemId: string, isPaused: boolean) {
      const result = await client
        .from("shop_items")
        .update({ is_paused: isPaused })
        .eq("user_id", userId)
        .eq("id", shopItemId)
        .is("archived_at", null);
      return !result.error;
    },
    async archive(userId: string, shopItemId: string) {
      const result = await client
        .from("shop_items")
        .update({ archived_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("id", shopItemId)
        .is("archived_at", null);
      return !result.error;
    },
    async restore(userId: string, shopItemId: string) {
      const result = await client
        .from("shop_items")
        .update({ archived_at: null })
        .eq("user_id", userId)
        .eq("id", shopItemId)
        .not("archived_at", "is", null);
      return !result.error;
    },
    async redeem(shopItemId: string, requestKey: string) {
      const result = await client.rpc("redeem_shop_item", {
        p_request_key: requestKey,
        p_shop_item_id: shopItemId,
      });
      return result.error || !result.data
        ? fail("Item is unavailable or the balance is insufficient.")
        : { data: { id: result.data }, ok: true as const };
    },
  };
}

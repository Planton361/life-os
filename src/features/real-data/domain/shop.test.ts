import { describe, expect, it, vi } from "vitest";
import {
  activeShopItems,
  canRedeem,
  redemptionResult,
  redemptionSnapshot,
  shopBalance,
  sortShopHistory,
  type ShopItem,
} from "./shop";
const item = (overrides: Partial<ShopItem> = {}): ShopItem => ({
  archivedAt: null,
  category: null,
  costCoins: 5,
  createdAt: "2026-07-14T00:00:00Z",
  description: null,
  id: "item",
  isPaused: false,
  title: "Reward",
  updatedAt: "2026-07-14T00:00:00Z",
  ...overrides,
});
describe("Shop and ledger pure logic", () => {
  it("sums positive rewards and negative redemptions", () => {
    expect(shopBalance([{ amount: 10 }, { amount: -4 }, { amount: 2 }])).toBe(
      8,
    );
  });
  it("requires sufficient balance", () => {
    expect(canRedeem(item(), 5)).toBe(true);
    expect(canRedeem(item(), 4)).toBe(false);
  });
  it("excludes paused and archived items from active redemption", () => {
    expect(
      activeShopItems([
        item(),
        item({ id: "paused", isPaused: true }),
        item({ archivedAt: "2026-07-14", id: "archived" }),
      ]).map((entry) => entry.id),
    ).toEqual(["item"]);
  });
  it("keeps historical title and cost snapshots", () => {
    const source = item({ costCoins: 7, title: "Filmabend" });
    const snapshot = redemptionSnapshot(source);
    source.costCoins = 9;
    source.title = "Changed";
    expect(snapshot).toEqual({ costCoins: 7, titleSnapshot: "Filmabend" });
  });
  it("sorts redemption history deterministically", () => {
    expect(
      sortShopHistory([
        { id: "a", redeemedAt: "2026-01-01" },
        { id: "b", redeemedAt: "2026-01-02" },
      ]).map((entry) => entry.id),
    ).toEqual(["b", "a"]);
  });
  it("returns an existing idempotency result without creating another", () => {
    const create = vi.fn(() => ({ id: "new", requestKey: "key" }));
    expect(
      redemptionResult([{ id: "existing", requestKey: "key" }], "key", create)
        .id,
    ).toBe("existing");
    expect(create).not.toHaveBeenCalled();
  });
});

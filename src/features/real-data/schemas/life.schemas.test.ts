import { describe, expect, it } from "vitest";
import { splitLifecycle } from "../domain/life";
import { entertainmentItemInputSchema, inventoryItemInputSchema, purchaseDecisionInputSchema, wishlistItemInputSchema } from "./life.schemas";

const item = {
  completedOn: "",
  creatorOrStudio: "",
  mediaType: "book",
  notes: "",
  progressCurrent: "",
  progressTotal: "",
  progressUnit: "",
  rating: "",
  releaseYear: "",
  startedOn: "",
  status: "completed",
  title: "A finished book",
};

describe("entertainment item validation", () => {
  it("allows completed items without invented progress", () => {
    expect(entertainmentItemInputSchema.safeParse(item).success).toBe(true);
  });

  it("rejects ratings outside 1-10 and current progress above total", () => {
    expect(entertainmentItemInputSchema.safeParse({ ...item, rating: "11" }).success).toBe(false);
    expect(entertainmentItemInputSchema.safeParse({ ...item, progressCurrent: "11", progressTotal: "10", progressUnit: "pages" }).success).toBe(false);
  });

  it("requires a controlled unit whenever progress exists", () => {
    expect(entertainmentItemInputSchema.safeParse({ ...item, progressCurrent: "3" }).success).toBe(false);
    expect(entertainmentItemInputSchema.safeParse({ ...item, progressCurrent: "3", progressUnit: "episodes" }).success).toBe(true);
  });
});

describe("inventory, wishlist and purchase decision validation", () => {
  it("accepts controlled lifecycle states and rejects unknown states", () => {
    const wishlist = { amount: "49.90", category: "tech", currency: "eur", description: "", priority: "high", status: "approved", targetDate: "", title: "USB hub" };
    expect(wishlistItemInputSchema.safeParse(wishlist).success).toBe(true);
    expect(wishlistItemInputSchema.safeParse({ ...wishlist, status: "ordered" }).success).toBe(false);
    const decision = { context: "Need more ports", criteria: "USB-C", decision: "Buy", decisionDate: "2026-07-14", rationale: "Meets the requirement", status: "decided_buy", wishlistItemId: "11111111-1111-4111-8111-111111111111" };
    expect(purchaseDecisionInputSchema.safeParse(decision).success).toBe(true);
  });

  it("requires positive quantities and paired nonnegative money fields", () => {
    const inventory = { acquiredOn: "", amount: "0", category: "desk", condition: "good", currency: "EUR", description: "", location: "Office", name: "Lamp", quantity: "1", unit: "piece" };
    expect(inventoryItemInputSchema.safeParse(inventory).success).toBe(true);
    expect(inventoryItemInputSchema.safeParse({ ...inventory, quantity: "0" }).success).toBe(false);
    expect(inventoryItemInputSchema.safeParse({ ...inventory, amount: "-1" }).success).toBe(false);
    expect(inventoryItemInputSchema.safeParse({ ...inventory, currency: "" }).success).toBe(false);
  });

  it("separates active and archived records without changing stable order", () => {
    const records = [{ archivedAt: null, id: "new" }, { archivedAt: "2026-07-14T00:00:00Z", id: "old" }, { archivedAt: null, id: "older-active" }];
    expect(splitLifecycle(records)).toEqual({ active: [records[0], records[2]], archived: [records[1]] });
  });
});

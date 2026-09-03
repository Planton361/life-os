import { describe, expect, it } from "vitest";
import { mealCreateInputSchema, mealUpdateInputSchema } from "./nutrition.schema";

const mealId = "11111111-1111-4111-8111-111111111111";

describe("meal serving validation", () => {
  it("accepts a bounded fractional serving and rejects an unknown/zero serving", () => {
    expect(mealCreateInputSchema.safeParse({
      date: "2026-09-03",
      mealType: "lunch",
      requestId: "00000000-0000-4000-8000-000000000001",
      servings: "0.5",
      title: "Serving proof",
    }).success).toBe(true);
    expect(mealUpdateInputSchema.safeParse({ mealId, servings: "0" }).success).toBe(false);
    expect(mealUpdateInputSchema.safeParse({ mealId, servings: "" }).success).toBe(true);
  });
});

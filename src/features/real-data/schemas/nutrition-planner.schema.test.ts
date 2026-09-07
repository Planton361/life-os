import { describe, expect, it } from "vitest";
import { nutritionPlanInputSchema } from "./nutrition.schema";
const id = "11111111-1111-4111-8111-111111111111";
const valid = {
  kind: "move",
  id,
  expectedUpdatedAt: "2026-09-07T10:00:00+00:00",
  date: "2026-09-08",
  mealType: "lunch",
};
describe("canonical planner operation boundary", () => {
  it("requires an identity and concurrency token for moves", () => {
    expect(nutritionPlanInputSchema.safeParse([valid]).success).toBe(true);
    for (const patch of [
      { id: "" },
      { expectedUpdatedAt: undefined },
      { date: "2026-02-31" },
      { date: "2026-2-3" },
      { date: "not-a-date" },
      { mealType: "invalid" },
      { kind: "swap" },
    ])
      expect(
        nutritionPlanInputSchema.safeParse([{ ...valid, ...patch }]).success,
      ).toBe(false);
  });
  it("bounds week drafts and rejects arbitrary entity operations", () => {
    expect(nutritionPlanInputSchema.safeParse([]).success).toBe(false);
    expect(
      nutritionPlanInputSchema.safeParse(Array(22).fill(valid)).success,
    ).toBe(false);
    expect(
      nutritionPlanInputSchema.safeParse([
        {
          kind: "assign",
          id,
          date: "2026-09-07",
          mealType: "breakfast",
          recipeId: id,
        },
      ]).success,
    ).toBe(true);
    expect(
      nutritionPlanInputSchema.safeParse([
        { kind: "remove", id, expectedUpdatedAt: valid.expectedUpdatedAt },
      ]).success,
    ).toBe(true);
  });
});

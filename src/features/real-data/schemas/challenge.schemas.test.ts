import { describe, expect, it } from "vitest";
import { challengeInputSchema, challengeProgressInputSchema } from "./challenge.schemas";
const base = { description: "", endDate: "2026-07-31", periodType: "monthly", rewardCoins: "5", startDate: "2026-07-01", targetValue: "10", title: "Read", unit: "pages" };
describe("challenge validation", () => {
  it("validates periods and date order", () => { expect(challengeInputSchema.safeParse(base).success).toBe(true); expect(challengeInputSchema.safeParse({ ...base, endDate: "2026-06-30" }).success).toBe(false); expect(challengeInputSchema.safeParse({ ...base, periodType: "yearly" }).success).toBe(false); });
  it("requires positive progress and nonnegative integer rewards", () => { expect(challengeProgressInputSchema.safeParse({ challengeId: "11111111-1111-4111-8111-111111111111", increment: "0", note: "" }).success).toBe(false); expect(challengeInputSchema.safeParse({ ...base, rewardCoins: "-1" }).success).toBe(false); });
});

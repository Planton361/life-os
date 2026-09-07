import { describe, it, expect } from "vitest";
import { strengthSessionInputSchema } from "./training.schema";
describe("manual strength session boundary", () => {
  it("accepts explicit free sessions but rejects malformed linked IDs", () => {
    expect(
      strengthSessionInputSchema.parse({
        planId: "",
        sessionDate: "2026-09-07",
        notes: "",
      }).planId,
    ).toBeNull();
    expect(
      strengthSessionInputSchema.safeParse({
        planId: "someone-elses-plan",
        sessionDate: "2026-09-07",
        notes: "",
      }).success,
    ).toBe(false);
  });
});

import { expect, it } from "vitest";
import { dashboardMoodOptions } from "./mood-options";
it("offers exactly the six accepted mood choices", () => {
  expect(dashboardMoodOptions).toEqual([
    "Calm",
    "Focused",
    "Tired",
    "Anxious",
    "Stressed",
    "Happy",
  ]);
  expect(new Set(dashboardMoodOptions).size).toBe(6);
});

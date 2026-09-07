import { describe, it, expect } from "vitest";
import { runningStartInstant } from "./running-time";
describe("running local start time", () => {
  it("preserves summer and winter wall time", () => {
    expect(runningStartInstant("2026-07-01", "10:15")).toBe(
      "2026-07-01T08:15:00.000Z",
    );
    expect(runningStartInstant("2026-12-01", "10:15")).toBe(
      "2026-12-01T09:15:00.000Z",
    );
  });
  it("rejects a missing spring time and deterministically selects the first autumn occurrence", () => {
    expect(runningStartInstant("2026-03-29", "02:30")).toBeNull();
    expect(runningStartInstant("2026-10-25", "02:30")).toBe(
      "2026-10-25T00:30:00.000Z",
    );
  });
});

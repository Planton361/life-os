import { describe, expect, it } from "vitest";
import { aggregateChallengeProgress, challengeProgress, latestActiveProgressLog, rewardBalance, sortChallenges } from "./challenge";

describe("challenge and reward logic", () => {
  it("aggregates active logs and reports overachievement eligibility", () => {
    const current = aggregateChallengeProgress([{ archivedAt: null, increment: 6 }, { archivedAt: "x", increment: 50 }, { archivedAt: null, increment: 5 }]);
    expect(current).toBe(11); const progress = challengeProgress(current, 10); expect(progress.eligible).toBe(true); expect(progress.overachieved).toBe(true); expect(progress.percentage).toBeCloseTo(110);
  });
  it("sums the append-only reward ledger", () => { expect(rewardBalance([{ amount: 4 }, { amount: 7 }])).toBe(11); });
  it("selects the latest active log and sorts deterministically", () => {
    const logs = [{ archivedAt: null, id: "a", recordedAt: "2026-01-01" }, { archivedAt: "x", id: "z", recordedAt: "2027-01-01" }, { archivedAt: null, id: "b", recordedAt: "2026-01-01" }];
    expect(latestActiveProgressLog(logs)?.id).toBe("b");
    expect(sortChallenges([{ id: "b", updatedAt: "2026-01-01" }, { id: "a", updatedAt: "2026-01-01" }]).map((item) => item.id)).toEqual(["a", "b"]);
  });
});

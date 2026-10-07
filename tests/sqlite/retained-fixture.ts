import { sourceReviewFixture, owner } from "./source-review-fixture";
import { createSqliteRetainedRepository } from "../../src/features/real-data/sqlite/repositories/retained-repository";
import { ownedArea } from "../../src/features/real-data/sqlite/commands/retained-commands";
export const wishlistInput = {
  title: "Book",
  description: "Full text 🧭",
  category: "Books",
  priority: "high",
  amount: "9007199254740993.1234567890123456789",
  currency: "EUR",
  targetDate: null,
  status: "approved",
};
export const challengeInput = {
  title: "Practice",
  description: null,
  periodType: "custom",
  startDate: "2026-10-01",
  endDate: "2026-10-31",
  targetValue: "1.1234567890123456789",
  unit: "sessions",
  rewardCoins: 10,
};
export function retainedFixture() {
  const f = sourceReviewFixture();
  f.store.command(f.context, "retained.area", (db) => {
    for (const key of ["life", "coding", "education", "work"])
      ownedArea(db, owner, key, true);
  });
  return { ...f, retained: createSqliteRetainedRepository(f.store, f.context) };
}

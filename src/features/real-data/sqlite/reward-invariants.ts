import { addDecimals, compareDecimals } from "./codecs";
import type Database from "better-sqlite3";

// SQLite cannot defer a trigger until COMMIT. Validate the coupled ledger
// aggregates at the trusted transaction boundary, as for Goal/Project/Skill.
export function validateRewardCommit(db: Database.Database, owner: string) {
  if (
    db
      .prepare(
        `SELECT 1 FROM challenges c WHERE c.user_id=? AND c.status='completed' AND c.reward_coins>0 AND NOT EXISTS(SELECT 1 FROM reward_ledger_entries l WHERE l.user_id=c.user_id AND l.source_id=c.id AND l.entry_type='challenge_reward' AND l.amount=c.reward_coins) LIMIT 1`,
      )
      .get(owner)
  )
    throw new Error("CHALLENGE_REWARD_MISSING");
  if (
    db
      .prepare(
        `SELECT 1 FROM shop_redemptions r WHERE r.user_id=? AND NOT EXISTS(SELECT 1 FROM reward_ledger_entries l WHERE l.user_id=r.user_id AND l.source_id=r.id AND l.entry_type='shop_redemption' AND l.amount=-r.cost_coins) LIMIT 1`,
      )
      .get(owner)
  )
    throw new Error("SHOP_DEBIT_MISSING");
  const completed = db
    .prepare(
      "SELECT id,target_value FROM challenges WHERE user_id=? AND status='completed'",
    )
    .all(owner) as { id: string; target_value: string }[];
  for (const challenge of completed) {
    const increments = db
      .prepare(
        "SELECT increment FROM challenge_progress_logs WHERE user_id=? AND challenge_id=? AND archived_at IS NULL",
      )
      .all(owner, challenge.id) as { increment: string }[];
    if (
      compareDecimals(
        increments.reduce((n, r) => addDecimals(n, r.increment), "0"),
        challenge.target_value,
      ) < 0
    )
      throw new Error("COMPLETED_CHALLENGE_TARGET_UNREACHED");
  }
  const balance = db
    .prepare(
      "SELECT COALESCE(SUM(amount),0) balance FROM reward_ledger_entries WHERE user_id=?",
    )
    .get(owner) as { balance: bigint };
  if (balance.balance < BigInt(0)) throw new Error("NEGATIVE_REWARD_BALANCE");
}

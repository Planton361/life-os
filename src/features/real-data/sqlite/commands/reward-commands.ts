import "server-only";
import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  challengeProgressInputSchema,
  challengeIdSchema,
  challengeProgressIdSchema,
} from "../../schemas/challenge.schemas";
import {
  antiRotRecommendationSchema,
  antiRotActionIdSchema,
} from "../../schemas/anti-rot.schemas";
import {
  redeemShopItemSchema,
  shopItemIdSchema,
} from "../../schemas/shop.schemas";
import { addDecimals, compareDecimals, uuid } from "../codecs";
import {
  row,
  insert,
  patch,
  now,
  validate,
  type StoredRow,
} from "./nutrition-commands";
import { parseExact } from "./retained-commands";

function atomic(db: Database.Database) {
  if (!db.inTransaction) throw new Error("ATOMIC_TRANSACTION_REQUIRED");
}
function activeChallenge(db: Database.Database, owner: string, id: string) {
  const challenge = row(db, "challenges", owner, id);
  if (challenge.status !== "active" || challenge.archived_at !== null)
    throw new Error("ACTIVE_CHALLENGE_REQUIRED");
  return challenge;
}
export function challengeProgress(
  db: Database.Database,
  owner: string,
  operation: "append" | "update" | "archive",
  input: Record<string, unknown>,
) {
  atomic(db);
  const p =
    operation === "archive"
      ? validate(challengeProgressIdSchema, input)
      : parseExact(challengeProgressInputSchema, input, ["increment"]).parsed;
  const challenge = activeChallenge(db, owner, String(p.challengeId));
  if (operation !== "append") {
    const id = z.string().uuid().parse(input.progressLogId);
    const log = row(db, "challenge_progress_logs", owner, id);
    const latest = db
      .prepare(
        "SELECT id FROM challenge_progress_logs WHERE user_id=? AND challenge_id=? AND archived_at IS NULL ORDER BY recorded_at DESC,id DESC LIMIT 1",
      )
      .get(owner, challenge.id) as { id: string } | undefined;
    if (latest?.id !== log.id || log.challenge_id !== challenge.id)
      throw new Error("LATEST_PROGRESS_REQUIRED");
    return patch(
      db,
      "challenge_progress_logs",
      owner,
      id,
      operation === "archive"
        ? { archived_at: now(), updated_at: now() }
        : {
            increment: parseExact(challengeProgressInputSchema, input, [
              "increment",
            ]).numeric.increment,
            note: ("note" in p ? p.note : null) as string | null,
            updated_at: now(),
          },
    );
  }
  return insert(db, "challenge_progress_logs", owner, {
    id: randomUUID(),
    user_id: owner,
    challenge_id: challenge.id,
    increment: parseExact(challengeProgressInputSchema, input, ["increment"])
      .numeric.increment,
    note: ("note" in p ? p.note : null) as string | null,
  });
}
export function completeChallenge(
  db: Database.Database,
  owner: string,
  input: unknown,
): string {
  atomic(db);
  const { challengeId } = validate(challengeIdSchema, input);
  const challenge = row(db, "challenges", owner, challengeId);
  if (challenge.archived_at !== null) throw new Error("CHALLENGE_UNAVAILABLE");
  const existing = db
    .prepare(
      "SELECT id FROM reward_ledger_entries WHERE user_id=? AND entry_type='challenge_reward' AND source_type='challenge' AND source_id=?",
    )
    .get(owner, challenge.id) as { id: string } | undefined;
  if (challenge.status === "completed") {
    if (challenge.reward_coins === BigInt(0)) return String(challenge.id);
    if (!existing) throw new Error("COMPLETED_CHALLENGE_REWARD_MISSING");
    return existing.id;
  }
  activeChallenge(db, owner, challengeId);
  const logs = db
    .prepare(
      "SELECT increment FROM challenge_progress_logs WHERE user_id=? AND challenge_id=? AND archived_at IS NULL",
    )
    .all(owner, challenge.id) as { increment: string }[];
  const progress = logs.reduce(
    (total, log) => addDecimals(total, log.increment),
    "0",
  );
  if (compareDecimals(progress, String(challenge.target_value)) < 0)
    throw new Error("TARGET_NOT_REACHED");
  patch(db, "challenges", owner, challengeId, {
    status: "completed",
    completed_at: now(),
    updated_at: now(),
  });
  if (challenge.reward_coins === BigInt(0)) return challengeId;
  return String(
    insert(db, "reward_ledger_entries", owner, {
      id: randomUUID(),
      user_id: owner,
      amount: challenge.reward_coins,
      entry_type: "challenge_reward",
      source_type: "challenge",
      source_id: challenge.id,
      description: `Challenge reward: ${challenge.title}`,
    }).id,
  );
}
export function abandonChallenge(
  db: Database.Database,
  owner: string,
  input: unknown,
) {
  atomic(db);
  const { challengeId } = validate(challengeIdSchema, input);
  activeChallenge(db, owner, challengeId);
  return patch(db, "challenges", owner, challengeId, {
    status: "abandoned",
    updated_at: now(),
  });
}
export function rewardBalance(db: Database.Database, owner: string): bigint {
  return (
    db
      .prepare(
        "SELECT COALESCE(SUM(amount),0) balance FROM reward_ledger_entries WHERE user_id=?",
      )
      .get(owner) as { balance: bigint }
  ).balance;
}
export function redeemShop(
  db: Database.Database,
  owner: string,
  input: unknown,
): string {
  atomic(db);
  const p = validate(redeemShopItemSchema, input);
  p.requestKey = uuid(p.requestKey);
  p.shopItemId = uuid(p.shopItemId);
  const existing = db
    .prepare("SELECT * FROM shop_redemptions WHERE user_id=? AND request_key=?")
    .get(owner, p.requestKey) as StoredRow | undefined;
  if (existing) {
    if (existing.shop_item_id !== uuid(p.shopItemId))
      throw new Error("REQUEST_ITEM_CONFLICT");
    return String(existing.id);
  }
  const item = row(db, "shop_items", owner, p.shopItemId);
  if (item.archived_at !== null || item.is_paused !== BigInt(0))
    throw new Error("SHOP_ITEM_UNAVAILABLE");
  if (rewardBalance(db, owner) < (item.cost_coins as bigint))
    throw new Error("INSUFFICIENT_BALANCE");
  const redemption = insert(db, "shop_redemptions", owner, {
    id: randomUUID(),
    user_id: owner,
    shop_item_id: item.id,
    title_snapshot: item.title,
    cost_coins: item.cost_coins,
    request_key: uuid(p.requestKey),
  });
  insert(db, "reward_ledger_entries", owner, {
    id: randomUUID(),
    user_id: owner,
    amount: -(item.cost_coins as bigint),
    entry_type: "shop_redemption",
    source_type: "shop_redemption",
    source_id: redemption.id,
    description: `Shop redemption: ${item.title}`,
  });
  return String(redemption.id);
}
function openRecommendation(db: Database.Database, owner: string) {
  return db
    .prepare(
      "SELECT r.* FROM anti_rot_events r WHERE r.user_id=? AND r.event_type='recommended' AND NOT EXISTS(SELECT 1 FROM anti_rot_events x WHERE x.recommendation_event_id=r.id) ORDER BY r.created_at DESC,r.id DESC LIMIT 1",
    )
    .get(owner) as StoredRow | undefined;
}
export function rotateAntiRot(db: Database.Database, owner: string): string {
  atomic(db);
  const open = openRecommendation(db, owner);
  if (open)
    insert(db, "anti_rot_events", owner, {
      id: randomUUID(),
      user_id: owner,
      action_id: open.action_id,
      event_type: "skipped",
      recommendation_event_id: open.id,
    });
  const action = db
    .prepare(
      `SELECT a.id FROM anti_rot_actions a WHERE a.user_id=? AND a.status='active' AND a.archived_at IS NULL ORDER BY CASE WHEN a.id=? AND EXISTS(SELECT 1 FROM anti_rot_actions alt WHERE alt.user_id=a.user_id AND alt.status='active' AND alt.archived_at IS NULL AND alt.id<>a.id) THEN 1 ELSE 0 END, (SELECT MAX(e.created_at) FROM anti_rot_events e WHERE e.user_id=a.user_id AND e.action_id=a.id AND e.event_type IN ('recommended','completed')) ASC NULLS FIRST, a.created_at,a.id LIMIT 1`,
    )
    .get(owner, open?.action_id ?? null) as { id: string } | undefined;
  if (!action) throw new Error("NO_ACTIVE_ANTI_ROT_ACTION");
  return String(
    insert(db, "anti_rot_events", owner, {
      id: randomUUID(),
      user_id: owner,
      action_id: action.id,
      event_type: "recommended",
      recommendation_event_id: null,
    }).id,
  );
}
export function resolveAntiRot(
  db: Database.Database,
  owner: string,
  input: unknown,
): string {
  atomic(db);
  const p = validate(
    antiRotRecommendationSchema.extend({
      eventType: z.enum(["completed", "skipped"]),
    }),
    input,
  );
  const recommendation = row(
    db,
    "anti_rot_events",
    owner,
    p.recommendationEventId,
  );
  if (recommendation.event_type !== "recommended")
    throw new Error("RECOMMENDATION_REQUIRED");
  const existing = db
    .prepare(
      "SELECT id FROM anti_rot_events WHERE user_id=? AND recommendation_event_id=?",
    )
    .get(owner, recommendation.id) as { id: string } | undefined;
  return (
    existing?.id ??
    String(
      insert(db, "anti_rot_events", owner, {
        id: randomUUID(),
        user_id: owner,
        action_id: recommendation.action_id,
        event_type: p.eventType,
        recommendation_event_id: recommendation.id,
      }).id,
    )
  );
}
export function setAntiRotStatus(
  db: Database.Database,
  owner: string,
  input: unknown,
) {
  atomic(db);
  const p = validate(
    antiRotActionIdSchema.extend({ status: z.enum(["active", "paused"]) }),
    input,
  );
  const action = row(db, "anti_rot_actions", owner, p.actionId);
  if (
    action.archived_at !== null ||
    db
      .prepare(
        "SELECT 1 FROM anti_rot_events r WHERE r.user_id=? AND r.action_id=? AND r.event_type='recommended' AND NOT EXISTS(SELECT 1 FROM anti_rot_events x WHERE x.recommendation_event_id=r.id)",
      )
      .get(owner, action.id)
  )
    throw new Error("ACTION_UNAVAILABLE_OR_UNRESOLVED");
  return patch(db, "anti_rot_actions", owner, p.actionId, {
    status: p.status,
    updated_at: now(),
  });
}
export function setShopPaused(
  db: Database.Database,
  owner: string,
  input: unknown,
) {
  atomic(db);
  const p = validate(shopItemIdSchema.extend({ isPaused: z.boolean() }), input);
  const item = row(db, "shop_items", owner, p.shopItemId);
  if (item.archived_at !== null) throw new Error("SHOP_ITEM_UNAVAILABLE");
  return patch(db, "shop_items", owner, p.shopItemId, {
    is_paused: p.isPaused ? 1 : 0,
    updated_at: now(),
  });
}

import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import { z } from "zod";
import { decimal, decimalFromNumber, timestamp, uuid } from "../codecs";
import type { GoalRow } from "../goal-invariants";
import { goalOwnedTables } from "../goal-schema";

export const goalCommandKinds = [
  "milestone.achieve",
  "milestone.reopen",
  "milestone.amend",
  "criterion.evaluate",
  "criterion.correct",
  "criterion.retract",
  "criterion.evidence",
  "milestone.evidence",
  "goal.achieve",
  "goal.reopen",
  "goal.amend",
  "goal.evidence",
  "project.context.create",
  "task.context.create",
] as const;
export type GoalCommandKind = (typeof goalCommandKinds)[number];
export type GoalCommandRequest = {
  kind: GoalCommandKind;
  commandId: string;
  requestFingerprint: string;
  payload: Record<string, unknown>;
  review?: boolean;
  currentTask?: boolean;
};
export type GoalCommandResult = Record<string, string | number | null>;
const optionalId = z.uuid().transform(uuid).nullish();
const text = z.string().nullish();
const payloadSchema = z.object({
  goal_id: z.uuid().transform(uuid),
  milestone_id: optionalId,
  criterion_id: optionalId,
  event_id: optionalId,
  evaluation_id: optionalId,
  achievement_event_id: optionalId,
  expected_latest_evaluation_id: optionalId,
  project_id: optionalId,
  area_id: optionalId,
  expected_updated_at: text,
  occurred_at: text,
  note: text,
  achievement_note: text,
  correction_reason: text,
  deferred: z.boolean().optional(),
  retrospective: z.boolean().optional(),
  boolean_value: z.boolean().nullish(),
  numeric_value: z.union([z.number().finite(), z.string()]).nullish(),
  unit: text,
  action: z
    .enum(["attached", "replaced", "withdrawn", "supplemented"])
    .optional(),
  references: z
    .array(
      z.object({
        source_type: text,
        source_id: optionalId,
        supersedes_reference_id: optionalId,
        reason: text,
      }),
    )
    .max(20)
    .optional(),
  title: text,
  description: text,
  status: text,
  priority: text,
  next_step: text,
  target_date: text,
  energy: text,
  planned_date: text,
  due_at: text,
  duration_minutes: z.number().int().nullish(),
});
type Payload = z.infer<typeof payloadSchema>;
export const goalRows = (
  db: Database.Database,
  sql: string,
  ...args: unknown[]
) => db.prepare(sql).all(...args) as GoalRow[];
export const goalRow = (
  db: Database.Database,
  sql: string,
  ...args: unknown[]
) => db.prepare(sql).get(...args) as GoalRow | undefined;
export function requireGoalRow(
  row: GoalRow | undefined,
  error: string,
): GoalRow {
  if (!row) throw new Error(error);
  return row;
}
export function exactGoalNumber(value: string | number): string {
  let result: string;
  if (typeof value === "number") result = decimalFromNumber(value);
  else {
    // PostgreSQL numeric accepts finite decimal/scientific literals. Expand
    // their exponent as decimal text; never round through Number(value).
    const match =
      /^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?$/.exec(
        value.trim(),
      );
    if (!match) throw new Error("GOAL_NUMERIC_FINITE_REQUIRED");
    const whole = match[2] ?? "0",
      fraction = match[3] ?? match[4] ?? "",
      digits = whole + fraction;
    const exponent = Number(match[5] ?? "0");
    if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 147455)
      throw new Error("GOAL_NUMERIC_OVERFLOW");
    const point = whole.length + exponent;
    const expanded =
      point <= 0
        ? `0.${"0".repeat(-point)}${digits}`
        : point >= digits.length
          ? digits + "0".repeat(point - digits.length)
          : `${digits.slice(0, point)}.${digits.slice(point)}`;
    result = decimal(match[1] + expanded);
  }
  if (/^(?:NaN|-?Infinity)$/.test(result))
    throw new Error("GOAL_NUMERIC_FINITE_REQUIRED");
  return result;
}
export function goalCommandFingerprint(
  kind: string,
  payload: Record<string, unknown>,
) {
  // Preserve the current PP1 wire fingerprint verbatim (including field order).
  // Legacy opaque fingerprints are accepted by the native command unchanged.
  return createHash("sha256")
    .update(JSON.stringify({ commandKind: kind, payload }))
    .digest("hex");
}
export function insertGoalRow(
  db: Database.Database,
  table: (typeof goalOwnedTables)[number] | "tasks" | "projects",
  data: Record<string, unknown>,
) {
  if (![...goalOwnedTables, "tasks", "projects"].includes(table))
    throw new Error("GOAL_TABLE_INVALID");
  const columns = Object.keys(data);
  if (!columns.every((column) => /^[a-z_]+$/.test(column)))
    throw new Error("GOAL_COLUMN_INVALID");
  db.prepare(
    `INSERT INTO ${table}(${columns.join(",")}) VALUES(${columns.map(() => "?").join(",")})`,
  ).run(...columns.map((key) => data[key]));
}
export function activeGoal(
  db: Database.Database,
  owner: string,
  id: string,
  writable = false,
) {
  const row = requireGoalRow(
    goalRow(
      db,
      "SELECT * FROM goals WHERE user_id=? AND id=? AND archived_at IS NULL",
      owner,
      id,
    ),
    "GOAL_NOT_FOUND",
  );
  if (writable && row.status === "achieved") throw new Error("GOAL_READ_ONLY");
  return row;
}
export function activeGoalMilestone(
  db: Database.Database,
  owner: string,
  goal: string,
  id: string,
) {
  return requireGoalRow(
    goalRow(
      db,
      "SELECT * FROM goal_milestones WHERE user_id=? AND goal_id=? AND id=? AND archived_at IS NULL",
      owner,
      goal,
      id,
    ),
    "GOAL_MILESTONE_NOT_FOUND",
  );
}
function expectUpdated(row: GoalRow, expected?: string | null) {
  if (expected && row.updated_at !== timestamp(expected))
    throw new Error("GOAL_STALE_STATE");
}
export function priorGoalReceipt(
  db: Database.Database,
  owner: string,
  commandId: string,
  fingerprint: string,
): GoalCommandResult | null {
  const receipt = goalRow(
    db,
    "SELECT request_fingerprint,result_payload FROM goal_command_receipts WHERE user_id=? AND command_id=?",
    owner,
    commandId,
  );
  if (!receipt) return null;
  if (receipt.request_fingerprint !== fingerprint)
    throw new Error("GOAL_COMMAND_FINGERPRINT_MISMATCH");
  return JSON.parse(String(receipt.result_payload)) as GoalCommandResult;
}
function openEpisode(
  db: Database.Database,
  owner: string,
  goal: string,
  milestone?: string | null,
) {
  const table = milestone
    ? "goal_milestone_achievement_events"
    : "goal_achievement_events";
  return goalRow(
    db,
    `SELECT e.* FROM ${table} e WHERE e.user_id=? AND e.goal_id=? ${milestone ? "AND e.goal_milestone_id=?" : ""} AND e.event_type='achieved'
    AND NOT EXISTS(SELECT 1 FROM ${table} r WHERE r.user_id=e.user_id AND r.goal_id=e.goal_id AND r.episode_id=e.episode_id AND r.event_type='reopened')
    ORDER BY e.occurred_at DESC NULLS LAST,e.recorded_at DESC,e.id DESC LIMIT 1`,
    owner,
    goal,
    ...(milestone ? [milestone] : []),
  );
}
function sourceSnapshot(
  db: Database.Database,
  owner: string,
  type: string,
  id: string,
) {
  let row: GoalRow | undefined;
  let context: Record<string, unknown>;
  switch (type) {
    case "task":
      row = goalRow(
        db,
        "SELECT title,project_id,goal_id FROM tasks WHERE user_id=? AND id=? AND archived_at IS NULL",
        owner,
        id,
      );
      context = {
        project_id: row?.project_id ?? null,
        goal_id: row?.goal_id ?? null,
      };
      break;
    case "project":
      row = goalRow(
        db,
        "SELECT title,goal_id FROM projects WHERE user_id=? AND id=? AND archived_at IS NULL",
        owner,
        id,
      );
      context = { goal_id: row?.goal_id ?? null };
      break;
    case "project_milestone":
      row = goalRow(
        db,
        "SELECT title,project_id,status FROM project_milestones WHERE user_id=? AND id=? AND archived_at IS NULL",
        owner,
        id,
      );
      context = {
        project_id: row?.project_id ?? null,
        status: row?.status ?? null,
      };
      break;
    case "resource":
      row = goalRow(
        db,
        "SELECT title,type,source FROM resources WHERE user_id=? AND id=? AND archived_at IS NULL",
        owner,
        id,
      );
      context = { type: row?.type ?? null, source: row?.source ?? null };
      break;
    case "review_record":
      row = goalRow(
        db,
        "SELECT kind,period_start,period_end FROM review_records WHERE user_id=? AND id=? AND archived_at IS NULL",
        owner,
        id,
      );
      context = {
        kind: row?.kind ?? null,
        period_start: row?.period_start ?? null,
        period_end: row?.period_end ?? null,
      };
      if (row)
        row.title = `${String(row.kind).slice(0, 1).toUpperCase()}${String(row.kind).slice(1)} Review · ${row.period_start}`;
      break;
    case "goal_criterion_evaluation":
      row = goalRow(
        db,
        "SELECT coalesce(e.criterion_title_snapshot,c.title) AS title,e.criterion_id,e.evaluated_at FROM goal_criterion_evaluations e JOIN goal_outcome_criteria c ON c.user_id=e.user_id AND c.id=e.criterion_id WHERE e.user_id=? AND e.id=? AND e.is_retracted=0",
        owner,
        id,
      );
      context = {
        criterion_id: row?.criterion_id ?? null,
        evaluated_at: row?.evaluated_at ?? null,
      };
      break;
    default:
      throw new Error("GOAL_EVIDENCE_SOURCE_TYPE_INVALID");
  }
  if (!row?.title) throw new Error("GOAL_EVIDENCE_SOURCE_INVALID");
  return { title: row.title, context: JSON.stringify(context) };
}
function appendEvidence(
  db: Database.Database,
  owner: string,
  p: Payload,
  target: GoalRow,
  family: "criterion" | "milestone" | "goal",
  now: string,
  occurred: string,
) {
  const table =
    family === "criterion"
      ? "goal_criterion_evaluation_evidence"
      : family === "milestone"
        ? "goal_milestone_achievement_evidence"
        : "goal_achievement_evidence";
  const action = p.action ?? "attached",
    retrospective = p.retrospective ?? false;
  if ((action === "supplemented") !== retrospective)
    throw new Error("GOAL_RETROSPECTIVE_SUPPLEMENT_REQUIRED");
  let count = 0;
  for (const ref of p.references ?? []) {
    let sourceType = ref.source_type,
      sourceId = ref.source_id,
      group: string = randomUUID(),
      prior: GoalRow | undefined;
    let snapshot: {
      title: string | bigint | null;
      context: string | bigint | null;
    };
    if (action === "replaced" || action === "withdrawn") {
      if (!ref.supersedes_reference_id)
        throw new Error("GOAL_EVIDENCE_REFERENCE_REQUIRED");
      prior = goalRow(
        db,
        `SELECT * FROM ${table} WHERE user_id=? AND id=?`,
        owner,
        ref.supersedes_reference_id,
      );
      if (prior && family === "criterion" && prior.evaluation_id !== target.id)
        prior = undefined;
      if (
        prior &&
        family === "milestone" &&
        prior.episode_id !== target.episode_id
      )
        prior = undefined;
      if (
        prior &&
        family === "goal" &&
        !goalRow(
          db,
          "SELECT id FROM goal_achievement_events WHERE user_id=? AND id=? AND goal_id=? AND episode_id=?",
          owner,
          prior.achievement_event_id,
          p.goal_id,
          target.episode_id,
        )
      )
        prior = undefined;
      if (!prior) throw new Error("GOAL_EVIDENCE_REFERENCE_NOT_FOUND");
      if (
        goalRow(
          db,
          `SELECT id FROM ${table} WHERE user_id=? AND supersedes_reference_id=?`,
          owner,
          prior.id,
        )
      )
        throw new Error("GOAL_EVIDENCE_REFERENCE_ALREADY_SUPERSEDED");
      if (!ref.reason?.trim()) throw new Error("GOAL_EVIDENCE_REASON_REQUIRED");
      group = String(prior.reference_group_id);
    } else if (action === "supplemented" && !ref.reason?.trim())
      throw new Error("GOAL_EVIDENCE_REASON_REQUIRED");
    if (action === "withdrawn") {
      sourceType = String(prior!.source_type);
      sourceId = String(prior!.source_id);
      snapshot = {
        title: prior!.source_title_snapshot,
        context: prior!.source_context_snapshot,
      };
    } else {
      if (!sourceType || !sourceId)
        throw new Error("GOAL_EVIDENCE_SOURCE_REQUIRED");
      if (family !== "milestone" && sourceType === "goal_criterion_evaluation")
        throw new Error("GOAL_EVIDENCE_SOURCE_TYPE_INVALID");
      if (
        prior &&
        sourceType === prior.source_type &&
        sourceId === prior.source_id
      )
        throw new Error("GOAL_EVIDENCE_REPLACEMENT_SAME_SOURCE");
      snapshot = sourceSnapshot(db, owner, sourceType, sourceId);
    }
    insertGoalRow(db, table, {
      id: randomUUID(),
      user_id: owner,
      ...(family === "criterion"
        ? { evaluation_id: target.id }
        : { achievement_event_id: target.id }),
      ...(family === "milestone" ? { episode_id: target.episode_id } : {}),
      reference_group_id: group,
      reference_action: action,
      source_type: sourceType,
      source_id: sourceId,
      source_title_snapshot: snapshot.title,
      source_context_snapshot: snapshot.context,
      supersedes_reference_id: prior?.id ?? null,
      reason: ref.reason || null,
      retrospective: retrospective ? 1 : 0,
      occurred_at: occurred,
      recorded_at: now,
      created_at: now,
    });
    count++;
  }
  return count;
}

// Internal command capability. Public repositories always derive owner from
// issued OwnerContext, and SqliteRuntime wraps this in BEGIN IMMEDIATE plus the
// pre-COMMIT aggregate guard. Independent-process proofs call this same command.
export function executeGoalCommandInTransaction(
  db: Database.Database,
  owner: string,
  request: GoalCommandRequest,
): GoalCommandResult {
  if (
    !db.inTransaction ||
    goalRow(db, "SELECT life_owner() AS owner")?.owner !== owner
  )
    throw new Error("OWNER_DENIED");
  request = { ...request, commandId: uuid(z.uuid().parse(request.commandId)) };
  if (!request.requestFingerprint?.trim())
    throw new Error("GOAL_COMMAND_ID_REQUIRED");
  const prior = priorGoalReceipt(
    db,
    owner,
    request.commandId,
    request.requestFingerprint,
  );
  if (prior) return prior;
  if (!(goalCommandKinds as readonly string[]).includes(request.kind))
    throw new Error("GOAL_COMMAND_KIND_INVALID");
  const p = payloadSchema.parse(request.payload),
    kind = request.kind;
  const now = String(
    goalRow(
      db,
      `SELECT next_timestamp(coalesce(max(at),'1970-01-01T00:00:00.000000Z'),life_now()) AS now FROM (
    SELECT recorded_at AS at FROM goal_criterion_evaluations WHERE user_id=? UNION ALL
    SELECT recorded_at FROM goal_achievement_events WHERE user_id=? UNION ALL
    SELECT recorded_at FROM goal_milestone_achievement_events WHERE user_id=?
  )`,
      owner,
      owner,
      owner,
    )!.now,
  );
  const occurred = p.occurred_at ? timestamp(p.occurred_at) : now;
  let result: GoalCommandResult;
  const event = (
    family: "milestone" | "goal",
    data: Record<string, unknown>,
  ) => {
    const id = randomUUID();
    insertGoalRow(
      db,
      family === "milestone"
        ? "goal_milestone_achievement_events"
        : "goal_achievement_events",
      {
        id,
        user_id: owner,
        goal_id: p.goal_id,
        recorded_at: now,
        created_at: now,
        command_id: request.commandId,
        ...data,
      },
    );
    return id;
  };
  if (kind === "milestone.achieve" || kind === "milestone.reopen") {
    const goal = activeGoal(db, owner, p.goal_id, request.review);
    const milestone = activeGoalMilestone(
      db,
      owner,
      p.goal_id,
      p.milestone_id!,
    );
    expectUpdated(milestone, p.expected_updated_at);
    let episode: string;
    if (kind === "milestone.achieve") {
      if (milestone.status !== "active")
        throw new Error("GOAL_MILESTONE_ACHIEVE_REQUIRES_ACTIVE");
      episode = randomUUID();
    } else
      episode = String(
        requireGoalRow(
          openEpisode(db, owner, p.goal_id, p.milestone_id),
          "GOAL_MILESTONE_OPEN_EPISODE_NOT_FOUND",
        ).episode_id,
      );
    const id = event("milestone", {
      goal_milestone_id: p.milestone_id,
      episode_id: episode,
      event_type: kind === "milestone.achieve" ? "achieved" : "reopened",
      occurred_at: occurred,
      goal_title_snapshot: kind === "milestone.achieve" ? goal.title : null,
      goal_milestone_title_snapshot:
        kind === "milestone.achieve" ? milestone.title : null,
      goal_milestone_description_snapshot:
        kind === "milestone.achieve" ? milestone.description : null,
      prior_status: milestone.status,
      resulting_status: kind === "milestone.achieve" ? "achieved" : "active",
      note: p.note || null,
    });
    db.prepare(
      "UPDATE goal_milestones SET status=? WHERE user_id=? AND goal_id=? AND id=?",
    ).run(
      kind === "milestone.achieve" ? "achieved" : "active",
      owner,
      p.goal_id,
      p.milestone_id,
    );
    result = {
      event_id: id,
      episode_id: episode,
      milestone_id: p.milestone_id!,
    };
    if (request.review)
      result.next_milestone_id =
        (goalRow(
          db,
          "SELECT id FROM goal_milestones WHERE user_id=? AND goal_id=? AND id<>? AND status='active' AND archived_at IS NULL",
          owner,
          p.goal_id,
          p.milestone_id,
        )?.id as string) ?? null;
  } else if (kind === "milestone.amend" || kind === "goal.amend") {
    const family = kind === "milestone.amend" ? "milestone" : "goal";
    const table =
      family === "milestone"
        ? "goal_milestone_achievement_events"
        : "goal_achievement_events";
    const previous = requireGoalRow(
      goalRow(
        db,
        `SELECT * FROM ${table} WHERE user_id=? AND goal_id=? AND id=? ${family === "milestone" ? "AND goal_milestone_id=?" : ""}`,
        owner,
        p.goal_id,
        p.event_id,
        ...(family === "milestone" ? [p.milestone_id] : []),
      ),
      "GOAL_EVENT_NOT_FOUND",
    );
    if (!p.correction_reason?.trim())
      throw new Error("GOAL_EVENT_CORRECTION_REASON_REQUIRED");
    const id = event(family, {
      episode_id: previous.episode_id,
      event_type: "amended",
      occurred_at: p.occurred_at
        ? timestamp(p.occurred_at)
        : previous.occurred_at,
      goal_title_snapshot: previous.goal_title_snapshot,
      prior_status: previous.prior_status,
      resulting_status: previous.resulting_status,
      ...(family === "milestone"
        ? {
            goal_milestone_id: previous.goal_milestone_id,
            goal_milestone_title_snapshot:
              previous.goal_milestone_title_snapshot,
            goal_milestone_description_snapshot:
              previous.goal_milestone_description_snapshot,
            note: p.note || previous.note,
          }
        : {
            achievement_note: p.achievement_note || previous.achievement_note,
          }),
      legacy_state: previous.legacy_state,
      corrects_event_id: previous.id,
      correction_reason: p.correction_reason,
      retrospective: p.retrospective ? 1 : 0,
    });
    result = {
      event_id: id,
      episode_id: String(previous.episode_id),
      ...(family === "milestone"
        ? { milestone_id: p.milestone_id! }
        : { goal_id: p.goal_id }),
    };
  } else if (
    kind === "criterion.evaluate" ||
    kind === "criterion.correct" ||
    kind === "criterion.retract"
  ) {
    const goal = activeGoal(db, owner, p.goal_id);
    const c = requireGoalRow(
      goalRow(
        db,
        "SELECT * FROM goal_outcome_criteria WHERE user_id=? AND goal_id=? AND id=? AND archived_at IS NULL",
        owner,
        p.goal_id,
        p.criterion_id,
      ),
      "GOAL_CRITERION_NOT_FOUND",
    );
    if (goal.status === "achieved")
      throw new Error("GOAL_CRITERION_ACHIEVED_REQUIRES_REOPEN");
    const latest =
      goalRow(
        db,
        "SELECT id FROM goal_criterion_evaluations WHERE user_id=? AND criterion_id=? ORDER BY evaluated_at DESC,recorded_at DESC,created_at DESC,id DESC LIMIT 1",
        owner,
        c.id,
      )?.id ?? null;
    if ((p.expected_latest_evaluation_id ?? null) !== latest)
      throw new Error("GOAL_STALE_STATE");
    const retract = kind === "criterion.retract",
      deferred = !retract && !!p.deferred;
    const id = randomUUID();
    insertGoalRow(db, "goal_criterion_evaluations", {
      id,
      user_id: owner,
      criterion_id: c.id,
      is_deferred: deferred ? 1 : 0,
      is_retracted: retract ? 1 : 0,
      boolean_value:
        retract || deferred || c.criterion_type !== "boolean"
          ? null
          : p.boolean_value == null
            ? null
            : p.boolean_value
              ? 1
              : 0,
      numeric_value:
        retract || deferred || c.criterion_type !== "numeric"
          ? null
          : p.numeric_value == null
            ? null
            : exactGoalNumber(p.numeric_value),
      unit:
        retract || deferred || c.criterion_type !== "numeric"
          ? null
          : (p.unit ?? null),
      evaluated_at: occurred,
      recorded_at: now,
      created_at: now,
      note: p.note || null,
      goal_id_snapshot: c.goal_id,
      goal_milestone_id_snapshot: c.goal_milestone_id,
      criterion_title_snapshot: c.title,
      criterion_type_snapshot: c.criterion_type,
      unit_snapshot: c.unit,
      target_snapshot: c.target,
      direction_snapshot: c.direction,
      revision_kind: retract
        ? "retraction"
        : kind === "criterion.correct"
          ? "correction"
          : "evaluation",
      supersedes_evaluation_id: latest,
      correction_reason: p.correction_reason || null,
      retrospective: p.retrospective ? 1 : 0,
    });
    result = { evaluation_id: id, criterion_id: String(c.id) };
  } else if (
    kind === "criterion.evidence" ||
    kind === "milestone.evidence" ||
    kind === "goal.evidence"
  ) {
    const family =
      kind === "criterion.evidence"
        ? "criterion"
        : kind === "milestone.evidence"
          ? "milestone"
          : "goal";
    let target: GoalRow;
    if (family === "criterion")
      target = requireGoalRow(
        goalRow(
          db,
          "SELECT e.* FROM goal_criterion_evaluations e JOIN goal_outcome_criteria c ON c.id=e.criterion_id AND c.user_id=e.user_id WHERE e.user_id=? AND e.id=? AND c.goal_id=?",
          owner,
          p.evaluation_id,
          p.goal_id,
        ),
        "GOAL_EVALUATION_NOT_FOUND",
      );
    else if (family === "milestone" && !p.achievement_event_id)
      target = requireGoalRow(
        openEpisode(db, owner, p.goal_id, p.milestone_id),
        "GOAL_MILESTONE_OPEN_EPISODE_NOT_FOUND",
      );
    else
      target = requireGoalRow(
        goalRow(
          db,
          `SELECT * FROM ${family === "milestone" ? "goal_milestone_achievement_events" : "goal_achievement_events"} WHERE user_id=? AND goal_id=? AND id=? AND event_type IN ('achieved','amended') AND resulting_status='achieved' ${family === "milestone" ? "AND goal_milestone_id=?" : ""}`,
          owner,
          p.goal_id,
          p.achievement_event_id,
          ...(family === "milestone" ? [p.milestone_id] : []),
        ),
        "GOAL_EVENT_NOT_FOUND",
      );
    const count = appendEvidence(db, owner, p, target, family, now, occurred);
    result = {
      ...(family === "criterion"
        ? { evaluation_id: String(target.id) }
        : { event_id: String(target.id) }),
      ...(family === "milestone"
        ? { episode_id: String(target.episode_id) }
        : {}),
      references_changed: count,
    };
  } else if (kind === "goal.achieve" || kind === "goal.reopen") {
    const goal = activeGoal(db, owner, p.goal_id);
    expectUpdated(goal, p.expected_updated_at);
    if (kind === "goal.reopen") {
      if (goal.status !== "achieved")
        throw new Error("GOAL_REOPEN_REQUIRES_ACHIEVED");
      const episode = requireGoalRow(
        openEpisode(db, owner, p.goal_id),
        "GOAL_OPEN_EPISODE_NOT_FOUND",
      );
      const id = event("goal", {
        episode_id: episode.episode_id,
        event_type: "reopened",
        occurred_at: occurred,
        goal_title_snapshot: null,
        prior_status: goal.status,
        resulting_status: "active",
        achievement_note: goal.achievement_note,
      });
      db.prepare(
        "UPDATE goals SET status='active',achieved_at=NULL,achievement_note=NULL WHERE user_id=? AND id=?",
      ).run(owner, p.goal_id);
      result = {
        event_id: id,
        episode_id: String(episode.episode_id),
        goal_id: p.goal_id,
      };
    } else {
      if (goal.status !== "active")
        throw new Error("GOAL_ACHIEVEMENT_REQUIRES_ACTIVE");
      const criteria = goalRows(
        db,
        "SELECT c.*,s.state,s.evaluation_id FROM goal_outcome_criteria c JOIN goal_criterion_states s ON s.user_id=c.user_id AND s.criterion_id=c.id WHERE c.user_id=? AND c.goal_id=? AND c.archived_at IS NULL ORDER BY c.created_at,c.id",
        owner,
        p.goal_id,
      );
      if (!criteria.length)
        throw new Error("GOAL_ACHIEVEMENT_NO_ACTIVE_CRITERIA");
      if (criteria.some((c) => c.state !== "met"))
        throw new Error("GOAL_ACHIEVEMENT_CRITERIA_NOT_MET");
      const milestones = goalRows(
        db,
        "SELECT * FROM goal_milestones WHERE user_id=? AND goal_id=? AND archived_at IS NULL ORDER BY sort_order,id",
        owner,
        p.goal_id,
      );
      if (milestones.some((m) => m.status !== "achieved"))
        throw new Error("GOAL_ACHIEVEMENT_MILESTONES_NOT_ACHIEVED");
      const episode = randomUUID(),
        id = event("goal", {
          episode_id: episode,
          event_type: "achieved",
          occurred_at: occurred,
          goal_title_snapshot: goal.title,
          prior_status: goal.status,
          resulting_status: "achieved",
          achievement_note: p.note || null,
        });
      for (const c of criteria)
        insertGoalRow(db, "goal_achievement_criterion_basis", {
          id: randomUUID(),
          user_id: owner,
          achievement_event_id: id,
          criterion_id: c.id,
          evaluation_id: c.evaluation_id,
          criterion_title_snapshot: c.title,
          criterion_type_snapshot: c.criterion_type,
          goal_milestone_id_snapshot: c.goal_milestone_id,
          unit_snapshot: c.unit,
          target_snapshot: c.target,
          direction_snapshot: c.direction,
          evaluation_state_snapshot: "met",
          evaluation_occurred_at: goalRow(
            db,
            "SELECT evaluated_at FROM goal_criterion_evaluations WHERE user_id=? AND id=?",
            owner,
            c.evaluation_id,
          )!.evaluated_at,
          created_at: now,
        });
      for (const m of milestones) {
        const milestoneEpisode = openEpisode(
          db,
          owner,
          p.goal_id,
          String(m.id),
        );
        insertGoalRow(db, "goal_achievement_milestone_basis", {
          id: randomUUID(),
          user_id: owner,
          achievement_event_id: id,
          milestone_id: m.id,
          achievement_episode_id: milestoneEpisode?.episode_id ?? null,
          milestone_title_snapshot: m.title,
          resulting_status_snapshot: m.status,
          legacy_state: milestoneEpisode
            ? null
            : JSON.stringify({
                legacy_state: true,
                reason:
                  "Milestone is currently achieved but its transition predates Slice-1 history.",
              }),
          created_at: now,
        });
      }
      appendEvidence(
        db,
        owner,
        { ...p, action: "attached", retrospective: false },
        { id },
        "goal",
        now,
        occurred,
      );
      db.prepare(
        "UPDATE goals SET status='achieved',achieved_at=?,achievement_note=? WHERE user_id=? AND id=?",
      ).run(occurred, p.note || null, owner, p.goal_id);
      result = { event_id: id, episode_id: episode, goal_id: p.goal_id };
    }
  } else {
    activeGoal(db, owner, p.goal_id, request.currentTask);
    const milestone = activeGoalMilestone(
      db,
      owner,
      p.goal_id,
      p.milestone_id!,
    );
    if (request.currentTask && milestone.status !== "active")
      throw new Error("GOAL_TASK_REQUIRES_CURRENT_MILESTONE");
    if (
      p.area_id &&
      !goalRow(
        db,
        "SELECT id FROM areas WHERE user_id=? AND id=? AND archived_at IS NULL",
        owner,
        p.area_id,
      )
    )
      throw new Error("GOAL_CONTEXT_AREA_INVALID");
    if (
      kind === "task.context.create" &&
      p.project_id &&
      !goalRow(
        db,
        "SELECT id FROM projects WHERE user_id=? AND id=? AND goal_id=? AND archived_at IS NULL",
        owner,
        p.project_id,
        p.goal_id,
      )
    )
      throw new Error("GOAL_TASK_PROJECT_CONTEXT_INVALID");
    if (!p.title?.trim()) throw new Error("GOAL_CONTEXT_TITLE_REQUIRED");
    const id = randomUUID(),
      support = randomUUID();
    if (kind === "project.context.create") {
      insertGoalRow(db, "projects", {
        id,
        user_id: owner,
        goal_id: p.goal_id,
        area_id: p.area_id ?? null,
        title: p.title.trim(),
        description: p.description || null,
        status: p.status || "idea",
        priority: p.priority || "P2",
        next_step: p.next_step || null,
        target_date: p.target_date || null,
        created_at: now,
        updated_at: now,
      });
      insertGoalRow(db, "goal_milestone_project_support", {
        id: support,
        user_id: owner,
        goal_id: p.goal_id,
        goal_milestone_id: p.milestone_id,
        project_id: id,
        created_at: now,
      });
      result = {
        project_id: id,
        support_id: support,
        goal_id: p.goal_id,
        milestone_id: p.milestone_id!,
      };
    } else {
      insertGoalRow(db, "tasks", {
        id,
        user_id: owner,
        goal_id: p.goal_id,
        project_id: request.currentTask ? (p.project_id ?? null) : null,
        area_id: p.area_id ?? null,
        title: p.title.trim(),
        description: p.description || null,
        status: "planned",
        priority: p.priority || "P2",
        energy: p.energy || null,
        planned_date: p.planned_date || null,
        due_at: p.due_at ? timestamp(p.due_at) : null,
        duration_minutes: p.duration_minutes ?? null,
        created_at: now,
        updated_at: now,
      });
      insertGoalRow(db, "goal_milestone_task_support", {
        id: support,
        user_id: owner,
        goal_id: p.goal_id,
        goal_milestone_id: p.milestone_id,
        task_id: id,
        created_at: now,
      });
      result = {
        task_id: id,
        support_id: support,
        goal_id: p.goal_id,
        milestone_id: p.milestone_id!,
        ...(request.currentTask && p.project_id
          ? { project_id: p.project_id }
          : {}),
      };
    }
  }
  // The review/context wrappers finalize their result before insertion. Unlike
  // PG's transient in-transaction receipt UPDATE, stored receipts never mutate.
  insertGoalRow(db, "goal_command_receipts", {
    id: randomUUID(),
    user_id: owner,
    command_id: request.commandId,
    command_kind: kind,
    request_fingerprint: request.requestFingerprint,
    result_payload: JSON.stringify(result),
    created_at: now,
  });
  return result;
}

export function setGoalCurrentMilestoneInTransaction(
  db: Database.Database,
  owner: string,
  goalId: string,
  milestoneId: string,
  expectedUpdatedAt?: string | null,
  commandId?: string,
  fingerprint?: string,
) {
  if (
    !db.inTransaction ||
    goalRow(db, "SELECT life_owner() AS owner")?.owner !== owner
  )
    throw new Error("OWNER_DENIED");
  if (commandId && fingerprint) {
    const prior = priorGoalReceipt(db, owner, commandId, fingerprint);
    if (prior) return prior;
  }
  activeGoal(db, owner, goalId, true);
  const current = activeGoalMilestone(db, owner, goalId, milestoneId);
  expectUpdated(current, expectedUpdatedAt);
  if (current.status === "achieved")
    return executeGoalCommandInTransaction(db, owner, {
      kind: "milestone.reopen",
      commandId: commandId ?? randomUUID(),
      requestFingerprint:
        fingerprint ??
        goalCommandFingerprint("milestone.reopen", {
          goal_id: goalId,
          milestone_id: milestoneId,
          expected_updated_at: expectedUpdatedAt ?? null,
        }),
      payload: {
        goal_id: goalId,
        milestone_id: milestoneId,
        expected_updated_at: expectedUpdatedAt ?? null,
      },
    });
  if (current.status !== "planned" && current.status !== "active")
    throw new Error("GOAL_MILESTONE_STATUS_TRANSITION_INVALID");
  if (current.status === "active") return { milestone_id: milestoneId };
  db.prepare(
    "UPDATE goal_milestones SET status='active' WHERE user_id=? AND goal_id=? AND id=?",
  ).run(owner, goalId, milestoneId);
  return { milestone_id: milestoneId };
}

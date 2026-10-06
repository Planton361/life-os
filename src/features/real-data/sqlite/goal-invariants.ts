import type Database from "better-sqlite3";
export type GoalRow = Record<string, string | bigint | null>;
const one = (db: Database.Database, sql: string, ...args: unknown[]) =>
  db.prepare(sql).get(...args) as GoalRow | undefined;
const rows = (db: Database.Database, sql: string, ...args: unknown[]) =>
  db.prepare(sql).all(...args) as GoalRow[];
export function goalCommitSnapshot(db: Database.Database, owner: string) {
  const floor = (table: string) =>
    (one(db, `SELECT coalesce(max(rowid),0) AS n FROM ${table}`)?.n ??
      BigInt(0)) as bigint;
  return {
    evaluations: floor("goal_criterion_evaluations"),
    events: floor("goal_achievement_events"),
    milestones: floor("goal_milestone_achievement_events"),
    criterionBasis: floor("goal_achievement_criterion_basis"),
    milestoneBasis: floor("goal_achievement_milestone_basis"),
    evidence: new Map(
      [
        "goal_criterion_evaluation_evidence",
        "goal_milestone_achievement_evidence",
        "goal_achievement_evidence",
      ].map((table) => [table, floor(table)]),
    ),
    receipts: floor("goal_command_receipts"),
    goals: new Map(
      rows(db, "SELECT id,status FROM goals WHERE user_id=?", owner).map(
        (row) => [row.id, row.status],
      ),
    ),
    milestoneStates: new Map(
      rows(
        db,
        "SELECT id,status FROM goal_milestones WHERE user_id=?",
        owner,
      ).map((row) => [row.id, row.status]),
    ),
  };
}

// SQLite has no deferred constraint trigger. Check aggregates inside the same
// BEGIN IMMEDIATE transaction immediately before COMMIT, including raw native
// callbacks. Historical basis is checked only when appended, never against later
// mutable criterion identity. Any failure rolls back command AND receipt.
export function validateGoalCommit(
  db: Database.Database,
  owner: string,
  before: ReturnType<typeof goalCommitSnapshot>,
) {
  const command = one(db, "SELECT life_command() AS kind")?.kind;
  if (
    command === "synthetic.initialize" &&
    one(db, "SELECT dataset_kind FROM runtime_metadata")?.dataset_kind ===
      "synthetic"
  )
    return;
  const receipts = rows(
    db,
    "SELECT * FROM goal_command_receipts WHERE user_id=? AND rowid>?",
    owner,
    before.receipts,
  );
  for (const receipt of receipts)
    if (command !== `goal.${receipt.command_kind}`)
      throw new Error("GOAL_COMMAND_REQUIRED");
  for (const [table, floor] of before.evidence) {
    const evidence = rows(
      db,
      `SELECT * FROM ${table} WHERE user_id=? AND rowid>?`,
      owner,
      floor,
    );
    for (const reference of evidence) {
      const key =
        table === "goal_criterion_evaluation_evidence"
          ? "evaluation_id"
          : "event_id";
      const parent =
        table === "goal_criterion_evaluation_evidence"
          ? reference.evaluation_id
          : reference.achievement_event_id;
      const receipt = receipts.find(
        (r) =>
          (JSON.parse(String(r.result_payload)) as Record<string, unknown>)[
            key
          ] === parent,
      );
      if (!receipt) throw new Error("GOAL_RECEIPT_REQUIRED");
      if (
        receipt.command_kind !== "goal.achieve" &&
        (JSON.parse(String(receipt.result_payload)) as Record<string, unknown>)
          .references_changed !== evidence.length
      )
        throw new Error("GOAL_EVIDENCE_RECEIPT_INVALID");
    }
  }
  const eventRows = rows(
    db,
    "SELECT rowid,* FROM goal_achievement_events WHERE user_id=? AND rowid>?",
    owner,
    before.events,
  );
  const milestoneRows = rows(
    db,
    "SELECT rowid,* FROM goal_milestone_achievement_events WHERE user_id=? AND rowid>?",
    owner,
    before.milestones,
  );
  const evaluations = rows(
    db,
    "SELECT * FROM goal_criterion_evaluations WHERE user_id=? AND rowid>?",
    owner,
    before.evaluations,
  );
  for (const event of [...eventRows, ...milestoneRows]) {
    const family = "goal_milestone_id" in event ? "milestone" : "goal";
    const eventKind =
      event.event_type === "achieved"
        ? "achieve"
        : event.event_type === "reopened"
          ? "reopen"
          : "amend";
    if (command !== `goal.${family}.${eventKind}`)
      throw new Error("GOAL_COMMAND_REQUIRED");
    if (event.event_type !== "amended") {
      const entity =
        family === "milestone"
          ? one(
              db,
              "SELECT * FROM goal_milestones WHERE user_id=? AND id=?",
              owner,
              event.goal_milestone_id,
            )
          : one(
              db,
              "SELECT * FROM goals WHERE user_id=? AND id=?",
              owner,
              event.goal_id,
            );
      const prior =
        family === "milestone"
          ? before.milestoneStates.get(event.goal_milestone_id)
          : before.goals.get(event.goal_id);
      if (
        !entity ||
        event.prior_status !== prior ||
        entity.status !== event.resulting_status ||
        (event.event_type === "achieved" &&
          (prior !== "active" || entity.status !== "achieved"))
      )
        throw new Error("GOAL_EVENT_STATE_INVALID");
      if (event.event_type === "reopened") {
        if (
          event.goal_title_snapshot !== null ||
          (family === "milestone" &&
            (event.goal_milestone_title_snapshot !== null ||
              event.goal_milestone_description_snapshot !== null))
        )
          throw new Error("GOAL_EVENT_SNAPSHOT_INVALID");
        const table =
          family === "milestone"
            ? "goal_milestone_achievement_events"
            : "goal_achievement_events";
        const floor =
          family === "milestone" ? before.milestones : before.events;
        if (
          !one(
            db,
            `SELECT e.id FROM ${table} e WHERE e.user_id=? AND e.goal_id=? AND e.episode_id=? AND e.event_type='achieved' AND e.rowid<=? ${family === "milestone" ? "AND e.goal_milestone_id=?" : ""} AND NOT EXISTS(SELECT 1 FROM ${table} r WHERE r.user_id=e.user_id AND r.episode_id=e.episode_id AND r.event_type='reopened' AND r.rowid<=?)`,
            owner,
            event.goal_id,
            event.episode_id,
            floor,
            ...(family === "milestone" ? [event.goal_milestone_id] : []),
            floor,
          )
        )
          throw new Error("GOAL_OPEN_EPISODE_NOT_FOUND");
      }
      if (event.event_type === "achieved") {
        const goal = one(
          db,
          "SELECT title FROM goals WHERE user_id=? AND id=?",
          owner,
          event.goal_id,
        );
        if (
          event.goal_title_snapshot !== goal?.title ||
          (family === "milestone" &&
            (event.goal_milestone_title_snapshot !== entity.title ||
              event.goal_milestone_description_snapshot !== entity.description))
        )
          throw new Error("GOAL_EVENT_SNAPSHOT_INVALID");
      }
    }
    if (
      !event.command_id ||
      !one(
        db,
        "SELECT id FROM goal_command_receipts WHERE user_id=? AND command_id=? AND json_extract(result_payload,'$.event_id')=?",
        owner,
        event.command_id,
        event.id,
      )
    )
      throw new Error("GOAL_RECEIPT_REQUIRED");
  }
  for (const evaluation of evaluations) {
    const criterion = one(
      db,
      "SELECT * FROM goal_outcome_criteria WHERE user_id=? AND id=?",
      owner,
      evaluation.criterion_id,
    );
    if (
      !criterion ||
      evaluation.goal_id_snapshot !== criterion.goal_id ||
      evaluation.goal_milestone_id_snapshot !== criterion.goal_milestone_id ||
      evaluation.criterion_title_snapshot !== criterion.title ||
      evaluation.criterion_type_snapshot !== criterion.criterion_type ||
      evaluation.unit_snapshot !== criterion.unit ||
      evaluation.target_snapshot !== criterion.target ||
      evaluation.direction_snapshot !== criterion.direction
    )
      throw new Error("GOAL_EVALUATION_SNAPSHOT_INVALID");
    const latest =
      one(
        db,
        "SELECT id FROM goal_criterion_evaluations WHERE user_id=? AND criterion_id=? AND rowid<=? ORDER BY evaluated_at DESC,recorded_at DESC,created_at DESC,id DESC LIMIT 1",
        owner,
        evaluation.criterion_id,
        before.evaluations,
      )?.id ?? null;
    if (evaluation.supersedes_evaluation_id !== latest)
      throw new Error("GOAL_STALE_STATE");
    if (
      !one(
        db,
        "SELECT id FROM goal_command_receipts WHERE user_id=? AND json_extract(result_payload,'$.evaluation_id')=?",
        owner,
        evaluation.id,
      )
    )
      throw new Error("GOAL_RECEIPT_REQUIRED");
  }
  for (const [table, floor] of [
    ["goal_achievement_criterion_basis", before.criterionBasis],
    ["goal_achievement_milestone_basis", before.milestoneBasis],
  ] as const)
    if (
      one(
        db,
        `SELECT b.id FROM ${table} b JOIN goal_achievement_events e ON e.id=b.achievement_event_id AND e.user_id=b.user_id WHERE b.user_id=? AND b.rowid>? AND (e.rowid<=? OR e.event_type<>'achieved') LIMIT 1`,
        owner,
        floor,
        before.events,
      )
    )
      throw new Error("GOAL_BASIS_IMMUTABLE");
  for (const event of eventRows.filter(
    (row) => row.event_type === "achieved",
  )) {
    const criteria = rows(
      db,
      "SELECT c.*,s.evaluation_id,e.evaluated_at FROM goal_outcome_criteria c JOIN goal_criterion_states s ON s.user_id=c.user_id AND s.criterion_id=c.id JOIN goal_criterion_evaluations e ON e.user_id=c.user_id AND e.id=s.evaluation_id WHERE c.user_id=? AND c.goal_id=? AND c.archived_at IS NULL",
      owner,
      event.goal_id,
    );
    const basis = rows(
      db,
      "SELECT * FROM goal_achievement_criterion_basis WHERE user_id=? AND achievement_event_id=?",
      owner,
      event.id,
    );
    if (
      !criteria.length ||
      criteria.length !== basis.length ||
      criteria.some(
        (c) =>
          !basis.some(
            (b) =>
              b.criterion_id === c.id &&
              b.evaluation_id === c.evaluation_id &&
              b.criterion_title_snapshot === c.title &&
              b.criterion_type_snapshot === c.criterion_type &&
              b.goal_milestone_id_snapshot === c.goal_milestone_id &&
              b.unit_snapshot === c.unit &&
              b.target_snapshot === c.target &&
              b.direction_snapshot === c.direction &&
              b.evaluation_state_snapshot === "met" &&
              b.evaluation_occurred_at === c.evaluated_at,
          ),
      )
    )
      throw new Error("GOAL_CRITERION_BASIS_INVALID");
    const milestones = rows(
      db,
      "SELECT * FROM goal_milestones WHERE user_id=? AND goal_id=? AND archived_at IS NULL",
      owner,
      event.goal_id,
    );
    const milestoneEpisodes = new Map(
      milestones.map((m) => [
        m.id,
        one(
          db,
          "SELECT e.episode_id FROM goal_milestone_achievement_events e WHERE e.user_id=? AND e.goal_milestone_id=? AND e.event_type='achieved' AND NOT EXISTS(SELECT 1 FROM goal_milestone_achievement_events r WHERE r.user_id=e.user_id AND r.goal_milestone_id=e.goal_milestone_id AND r.episode_id=e.episode_id AND r.event_type='reopened') ORDER BY e.occurred_at DESC NULLS LAST,e.recorded_at DESC,e.id DESC LIMIT 1",
          owner,
          m.id,
        )?.episode_id ?? null,
      ]),
    );
    const milestoneBasis = rows(
      db,
      "SELECT * FROM goal_achievement_milestone_basis WHERE user_id=? AND achievement_event_id=?",
      owner,
      event.id,
    );
    if (
      milestones.length !== milestoneBasis.length ||
      milestones.some(
        (m) =>
          !milestoneBasis.some(
            (b) =>
              b.milestone_id === m.id &&
              b.milestone_title_snapshot === m.title &&
              b.resulting_status_snapshot === m.status &&
              b.achievement_episode_id === milestoneEpisodes.get(m.id),
          ),
      )
    )
      throw new Error("GOAL_MILESTONE_BASIS_INVALID");
  }
  for (const goal of rows(
    db,
    "SELECT id,status FROM goals WHERE user_id=?",
    owner,
  )) {
    const old = before.goals.get(goal.id);
    if (
      goal.status === "achieved" &&
      old !== "achieved" &&
      !eventRows.some(
        (e) => e.goal_id === goal.id && e.event_type === "achieved",
      )
    )
      throw new Error("GOAL_HISTORY_REQUIRED");
    if (
      old === "achieved" &&
      goal.status === "active" &&
      !eventRows.some(
        (e) => e.goal_id === goal.id && e.event_type === "reopened",
      )
    )
      throw new Error("GOAL_HISTORY_REQUIRED");
  }
  for (const milestone of rows(
    db,
    "SELECT id,status FROM goal_milestones WHERE user_id=?",
    owner,
  )) {
    const old = before.milestoneStates.get(milestone.id);
    if (
      milestone.status === "achieved" &&
      old !== "achieved" &&
      !milestoneRows.some(
        (e) =>
          e.goal_milestone_id === milestone.id && e.event_type === "achieved",
      )
    )
      throw new Error("GOAL_HISTORY_REQUIRED");
    if (
      old === "achieved" &&
      milestone.status === "active" &&
      !milestoneRows.some(
        (e) =>
          e.goal_milestone_id === milestone.id && e.event_type === "reopened",
      )
    )
      throw new Error("GOAL_HISTORY_REQUIRED");
  }
}

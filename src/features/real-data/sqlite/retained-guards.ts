import { retainedOwnedTables } from "./retained-schema";

// SQL capabilities are server-owned command scopes. Parent tuple checks remain
// enforced even when a repository's validation is deliberately bypassed.
export function retainedGuards() {
  let sql = "";
  const parent = (
    table: string,
    field: string,
    target: string,
    predicate = "",
  ) => {
    for (const operation of ["INSERT", "UPDATE"])
      sql += `CREATE TRIGGER ${table}_${field}_${operation.toLowerCase()} BEFORE ${operation} ON ${table}
        WHEN NEW.${field} IS NOT NULL AND NOT EXISTS(SELECT 1 FROM ${target} p WHERE p.id=NEW.${field} AND p.user_id=NEW.user_id ${predicate})
        BEGIN SELECT RAISE(ABORT,'RETAINED_PARENT_DENIED'); END;`;
  };
  for (const table of retainedOwnedTables) {
    for (const operation of ["INSERT", "UPDATE"])
      sql += `CREATE TRIGGER ${table}_identity_${operation.toLowerCase()} BEFORE ${operation} ON ${table}
        WHEN codec_uuid_valid(NEW.id)<>1 OR codec_uuid_valid(NEW.user_id)<>1
        BEGIN SELECT RAISE(ABORT,'RETAINED_ID_INVALID'); END;`;
  }
  for (const table of [
    "coding_sessions",
    "education_logs",
    "work_logs",
    "work_decisions",
    "work_meetings",
  ])
    parent(
      table,
      "project_id",
      "projects",
      table.startsWith("work_")
        ? "AND p.archived_at IS NULL AND EXISTS(SELECT 1 FROM areas a WHERE a.id=p.area_id AND a.user_id=p.user_id AND a.key='work' AND a.archived_at IS NULL)"
        : "",
    );
  parent("work_meeting_followups", "meeting_id", "work_meetings");
  parent(
    "work_meeting_followups",
    "task_id",
    "tasks",
    "AND p.archived_at IS NULL",
  );
  parent("inventory_items", "source_wishlist_item_id", "wishlist_items");
  parent("purchase_decisions", "wishlist_item_id", "wishlist_items");
  parent("purchase_decisions", "inventory_item_id", "inventory_items");
  parent(
    "challenge_progress_logs",
    "challenge_id",
    "challenges",
    "AND p.status='active' AND p.archived_at IS NULL",
  );
  parent("anti_rot_events", "action_id", "anti_rot_actions");
  parent(
    "anti_rot_events",
    "recommendation_event_id",
    "anti_rot_events",
    "AND p.event_type='recommended' AND p.action_id=NEW.action_id",
  );
  parent("shop_redemptions", "shop_item_id", "shop_items");
  for (const [table, command] of [
    ["anti_rot_events", "reward.antirot"],
    ["reward_ledger_entries", "reward.complete','reward.redeem"],
    ["shop_redemptions", "reward.redeem"],
  ]) {
    sql += `CREATE TRIGGER ${table}_command_insert BEFORE INSERT ON ${table} WHEN life_command() IS NULL OR life_command() NOT IN ('${command}') BEGIN SELECT RAISE(ABORT,'RETAINED_COMMAND_REQUIRED'); END;`;
    for (const operation of ["UPDATE", "DELETE"])
      sql += `CREATE TRIGGER ${table}_immutable_${operation.toLowerCase()} BEFORE ${operation} ON ${table} BEGIN SELECT RAISE(ABORT,'RETAINED_HISTORY_IMMUTABLE'); END;`;
  }
  sql += `
CREATE TRIGGER challenges_completion_insert BEFORE INSERT ON challenges WHEN NEW.status='completed' BEGIN SELECT RAISE(ABORT,'CHALLENGE_COMMAND_REQUIRED'); END;
CREATE TRIGGER challenges_completion_update BEFORE UPDATE ON challenges WHEN (NEW.status='completed' AND OLD.status<>'completed' AND life_command() IS NOT 'reward.complete') OR (OLD.status='completed' AND (NEW.status<>OLD.status OR NEW.completed_at IS NOT OLD.completed_at OR NEW.reward_coins<>OLD.reward_coins)) BEGIN SELECT RAISE(ABORT,'CHALLENGE_COMPLETION_IMMUTABLE'); END;
CREATE TRIGGER reward_ledger_source BEFORE INSERT ON reward_ledger_entries WHEN
 (NEW.entry_type='challenge_reward' AND NOT EXISTS(SELECT 1 FROM challenges c WHERE c.id=NEW.source_id AND c.user_id=NEW.user_id AND c.status='completed' AND c.reward_coins=NEW.amount)) OR
 (NEW.entry_type='shop_redemption' AND NOT EXISTS(SELECT 1 FROM shop_redemptions r WHERE r.id=NEW.source_id AND r.user_id=NEW.user_id AND r.cost_coins=-NEW.amount))
 BEGIN SELECT RAISE(ABORT,'REWARD_SOURCE_DENIED'); END;
CREATE TRIGGER shop_redemption_snapshot BEFORE INSERT ON shop_redemptions WHEN NOT EXISTS(SELECT 1 FROM shop_items i WHERE i.id=NEW.shop_item_id AND i.user_id=NEW.user_id AND i.archived_at IS NULL AND i.is_paused=0 AND i.title=NEW.title_snapshot AND i.cost_coins=NEW.cost_coins) OR COALESCE((SELECT SUM(amount) FROM reward_ledger_entries WHERE user_id=NEW.user_id),0)<NEW.cost_coins BEGIN SELECT RAISE(ABORT,'SHOP_REDEMPTION_DENIED'); END;
CREATE TRIGGER challenge_progress_latest BEFORE UPDATE ON challenge_progress_logs WHEN NEW.challenge_id IS NOT OLD.challenge_id OR OLD.archived_at IS NOT NULL OR OLD.id IS NOT (SELECT id FROM challenge_progress_logs WHERE user_id=OLD.user_id AND challenge_id=OLD.challenge_id AND archived_at IS NULL ORDER BY recorded_at DESC,id DESC LIMIT 1) BEGIN SELECT RAISE(ABORT,'LATEST_PROGRESS_REQUIRED'); END;
CREATE TRIGGER challenge_progress_no_delete BEFORE DELETE ON challenge_progress_logs BEGIN SELECT RAISE(ABORT,'PROGRESS_HISTORY_RETAINED'); END;
CREATE TRIGGER anti_rot_open_action BEFORE UPDATE ON anti_rot_actions WHEN (NEW.status='paused' OR NEW.archived_at IS NOT NULL) AND EXISTS(SELECT 1 FROM anti_rot_events r WHERE r.action_id=OLD.id AND r.user_id=OLD.user_id AND r.event_type='recommended' AND NOT EXISTS(SELECT 1 FROM anti_rot_events x WHERE x.recommendation_event_id=r.id)) BEGIN SELECT RAISE(ABORT,'UNRESOLVED_RECOMMENDATION'); END;
`;
  for (const table of retainedOwnedTables.filter(
    (t) =>
      ![
        "work_meeting_followups",
        "anti_rot_events",
        "reward_ledger_entries",
        "shop_redemptions",
        "challenge_progress_logs",
      ].includes(t),
  ))
    sql += `CREATE TRIGGER ${table}_no_delete BEFORE DELETE ON ${table} BEGIN SELECT RAISE(ABORT,'RETAINED_ARCHIVE_REQUIRED'); END;`;
  sql += `CREATE TRIGGER anti_rot_recommendation_active BEFORE INSERT ON anti_rot_events WHEN NEW.event_type='recommended' AND (NOT EXISTS(SELECT 1 FROM anti_rot_actions a WHERE a.id=NEW.action_id AND a.user_id=NEW.user_id AND a.status='active' AND a.archived_at IS NULL) OR EXISTS(SELECT 1 FROM anti_rot_events r WHERE r.user_id=NEW.user_id AND r.event_type='recommended' AND NOT EXISTS(SELECT 1 FROM anti_rot_events x WHERE x.recommendation_event_id=r.id))) BEGIN SELECT RAISE(ABORT,'ANTI_ROT_ROTATION_REQUIRED'); END;`;
  sql += `
CREATE TRIGGER project_milestone_context_insert BEFORE INSERT ON project_milestones WHEN NOT EXISTS(SELECT 1 FROM projects WHERE id=NEW.project_id AND user_id=NEW.user_id AND archived_at IS NULL) BEGIN SELECT RAISE(ABORT,'PROJECT_MILESTONE_DENIED'); END;
CREATE TRIGGER project_milestone_context_update BEFORE UPDATE ON project_milestones WHEN NEW.project_id IS NOT OLD.project_id OR OLD.archived_at IS NOT NULL OR NOT EXISTS(SELECT 1 FROM projects WHERE id=NEW.project_id AND user_id=NEW.user_id AND archived_at IS NULL) BEGIN SELECT RAISE(ABORT,'PROJECT_MILESTONE_DENIED'); END;
CREATE TRIGGER project_milestone_clear AFTER UPDATE OF archived_at ON project_milestones WHEN NEW.archived_at IS NOT NULL BEGIN UPDATE tasks SET milestone_id=NULL WHERE user_id=NEW.user_id AND milestone_id=NEW.id; END;
CREATE TRIGGER project_milestone_task_insert BEFORE INSERT ON tasks WHEN NEW.milestone_id IS NOT NULL AND (NEW.archived_at IS NOT NULL OR NOT EXISTS(SELECT 1 FROM project_milestones m JOIN projects p ON p.id=m.project_id AND p.user_id=m.user_id WHERE m.id=NEW.milestone_id AND m.user_id=NEW.user_id AND m.project_id=NEW.project_id AND m.archived_at IS NULL AND p.archived_at IS NULL)) BEGIN SELECT RAISE(ABORT,'TASK_MILESTONE_DENIED'); END;
CREATE TRIGGER project_milestone_task_update BEFORE UPDATE OF milestone_id,project_id,user_id ON tasks WHEN NEW.milestone_id IS NOT NULL AND (NEW.archived_at IS NOT NULL OR NOT EXISTS(SELECT 1 FROM project_milestones m JOIN projects p ON p.id=m.project_id AND p.user_id=m.user_id WHERE m.id=NEW.milestone_id AND m.user_id=NEW.user_id AND m.project_id=NEW.project_id AND m.archived_at IS NULL AND p.archived_at IS NULL)) BEGIN SELECT RAISE(ABORT,'TASK_MILESTONE_DENIED'); END;
`;
  const dates: Record<string, string[]> = {
    journal_entries: ["entry_date"],
    coding_sessions: ["session_date"],
    education_logs: ["log_date"],
    work_logs: ["log_date"],
    work_decisions: ["decision_date"],
    work_meetings: ["meeting_date"],
    entertainment_items: ["started_on", "completed_on"],
    wishlist_items: ["target_date"],
    inventory_items: ["acquired_on"],
    purchase_decisions: ["decision_date"],
    challenges: ["start_date", "end_date"],
  };
  for (const table of retainedOwnedTables) {
    const times =
      table === "shop_redemptions"
        ? ["redeemed_at"]
        : [
            "created_at",
            ...([
              "anti_rot_events",
              "reward_ledger_entries",
              "work_meeting_followups",
            ].includes(table)
              ? []
              : ["updated_at"]),
            ...(table === "challenges" ? ["completed_at"] : []),
            ...(table === "challenge_progress_logs" ? ["recorded_at"] : []),
            ...([
              "anti_rot_events",
              "reward_ledger_entries",
              "work_meeting_followups",
              "shop_redemptions",
            ].includes(table)
              ? []
              : ["archived_at"]),
          ];
    const bad = [
      ...(dates[table] ?? []).map(
        (c) => `(NEW.${c} IS NOT NULL AND codec_date_valid(NEW.${c})<>1)`,
      ),
      ...times.map(
        (c) => `(NEW.${c} IS NOT NULL AND codec_timestamp_valid(NEW.${c})<>1)`,
      ),
      ...(table === "shop_redemptions"
        ? ["codec_uuid_valid(NEW.request_key)<>1"]
        : []),
    ];
    for (const operation of ["INSERT", "UPDATE"])
      sql += `CREATE TRIGGER ${table}_temporal_${operation.toLowerCase()} BEFORE ${operation} ON ${table} WHEN ${bad.join(" OR ")} BEGIN SELECT RAISE(ABORT,'RETAINED_TEMPORAL_INVALID'); END;`;
  }
  for (const [table, fields] of Object.entries({
    coding_sessions: ["duration_minutes"],
    education_logs: ["duration_minutes", "word_count_delta", "units_completed"],
    work_logs: ["duration_minutes"],
    work_meetings: ["duration_minutes"],
    entertainment_items: ["release_year"],
    anti_rot_actions: ["estimated_minutes"],
    challenges: ["reward_coins"],
    shop_items: ["cost_coins"],
    shop_redemptions: ["cost_coins"],
    reward_ledger_entries: ["amount"],
  }))
    for (const operation of ["INSERT", "UPDATE"])
      sql += `CREATE TRIGGER ${table}_int32_${operation.toLowerCase()} BEFORE ${operation} ON ${table} WHEN ${fields.map((c) => `NEW.${c} IS NOT NULL AND (NEW.${c}<-2147483648 OR NEW.${c}>2147483647)`).join(" OR ")} BEGIN SELECT RAISE(ABORT,'POSTGRES_INT32_OVERFLOW'); END;`;
  return sql;
}

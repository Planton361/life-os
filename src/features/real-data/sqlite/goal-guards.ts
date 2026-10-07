import { goalOwnedTables } from "./goal-schema";

const historyKinds: Record<string, readonly string[]> = {
  goal_criterion_evaluations: [
    "criterion.evaluate",
    "criterion.correct",
    "criterion.retract",
  ],
  goal_milestone_achievement_events: [
    "milestone.achieve",
    "milestone.reopen",
    "milestone.amend",
    "milestone.current",
  ],
  goal_achievement_events: ["goal.achieve", "goal.reopen", "goal.amend"],
  goal_achievement_criterion_basis: ["goal.achieve"],
  goal_achievement_milestone_basis: ["goal.achieve"],
  goal_criterion_evaluation_evidence: ["criterion.evidence"],
  goal_milestone_achievement_evidence: ["milestone.evidence"],
  goal_achievement_evidence: ["goal.evidence", "goal.achieve"],
  goal_command_receipts: [
    "milestone.achieve",
    "milestone.reopen",
    "milestone.amend",
    "milestone.current",
    "criterion.evaluate",
    "criterion.correct",
    "criterion.retract",
    "criterion.evidence",
    "milestone.evidence",
    "goal.achieve",
    "goal.reopen",
    "goal.amend",
    "goal.evidence",
    "task.context.create",
    "project.context.create",
  ],
};
const legacy =
  "life_command()='synthetic.initialize' AND EXISTS(SELECT 1 FROM runtime_metadata WHERE dataset_kind='synthetic')";
const appendGuards = Object.entries(historyKinds)
  .map(
    ([table, kinds]) => `
CREATE TRIGGER ${table}_command_insert BEFORE INSERT ON ${table}
 WHEN NOT (${legacy}) AND (life_command() IS NULL OR life_command() NOT IN (${kinds.map((kind) => `'goal.${kind}'`).join(",")}))
 BEGIN SELECT RAISE(ABORT,'GOAL_COMMAND_REQUIRED'); END;
CREATE TRIGGER ${table}_immutable_update BEFORE UPDATE ON ${table} BEGIN SELECT RAISE(ABORT,'GOAL_HISTORY_IMMUTABLE'); END;
CREATE TRIGGER ${table}_immutable_delete BEFORE DELETE ON ${table} BEGIN SELECT RAISE(ABORT,'GOAL_HISTORY_IMMUTABLE'); END;
`,
  )
  .join("\n");

export const goalGuards =
  appendGuards +
  `
CREATE TRIGGER goal_receipt_kind BEFORE INSERT ON goal_command_receipts WHEN NOT (${legacy}) AND (life_command() IS NOT ('goal.' || NEW.command_kind) OR length(trim(NEW.request_fingerprint))=0) BEGIN SELECT RAISE(ABORT,'GOAL_COMMAND_REQUIRED'); END;
CREATE UNIQUE INDEX project_goal_identity ON projects(user_id,id,goal_id);
CREATE VIEW goal_criterion_states AS
 SELECT c.user_id,c.goal_id,c.id AS criterion_id,e.id AS evaluation_id,
 CASE WHEN e.id IS NULL OR e.is_retracted=1 THEN 'unverified'
 WHEN e.is_deferred=1 THEN 'deferred'
 WHEN c.criterion_type='boolean' THEN CASE WHEN e.boolean_value=1 THEN 'met' ELSE 'not_met' END
 WHEN (c.direction='at_least' AND decimal_compare(e.numeric_value,c.target)>=0)
   OR (c.direction='at_most' AND decimal_compare(e.numeric_value,c.target)<=0)
   OR (c.direction='exact' AND decimal_compare(e.numeric_value,c.target)=0) THEN 'met'
 ELSE 'not_met' END AS state
 FROM goal_outcome_criteria c LEFT JOIN goal_criterion_evaluations e
 ON e.user_id=c.user_id AND e.id=(SELECT latest.id FROM goal_criterion_evaluations latest
 WHERE latest.user_id=c.user_id AND latest.criterion_id=c.id
 ORDER BY evaluated_at DESC,recorded_at DESC,created_at DESC,id DESC LIMIT 1)
 WHERE c.archived_at IS NULL;
CREATE TRIGGER goal_milestone_current_insert BEFORE INSERT ON goal_milestones
 WHEN NEW.status='active' AND NEW.archived_at IS NULL BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM goals WHERE user_id=NEW.user_id AND id=NEW.goal_id AND archived_at IS NULL) THEN RAISE(ABORT,'GOAL_MILESTONE_GOAL_NOT_FOUND') END;
 UPDATE goal_milestones SET status='planned' WHERE user_id=NEW.user_id AND goal_id=NEW.goal_id AND id<>NEW.id AND status='active' AND archived_at IS NULL;
END;
CREATE TRIGGER goal_milestone_current_update BEFORE UPDATE OF status,user_id,goal_id,archived_at ON goal_milestones
 WHEN NEW.status='active' AND NEW.archived_at IS NULL BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM goals WHERE user_id=NEW.user_id AND id=NEW.goal_id AND archived_at IS NULL) THEN RAISE(ABORT,'GOAL_MILESTONE_GOAL_NOT_FOUND') END;
 UPDATE goal_milestones SET status='planned' WHERE user_id=NEW.user_id AND goal_id=NEW.goal_id AND id<>NEW.id AND status='active' AND archived_at IS NULL;
END;
CREATE TRIGGER goal_milestone_transition BEFORE UPDATE OF status ON goal_milestones WHEN NEW.status<>OLD.status AND NEW.status<>'archived' BEGIN
 SELECT CASE WHEN (OLD.status='planned' AND NEW.status<>'active') OR (OLD.status='active' AND NEW.status NOT IN ('planned','achieved')) OR (OLD.status='achieved' AND NEW.status<>'active') OR OLD.status='archived' THEN RAISE(ABORT,'GOAL_MILESTONE_STATUS_TRANSITION_INVALID') END;
 SELECT CASE WHEN (OLD.status='active' AND NEW.status='achieved' AND life_command() IS NOT 'goal.milestone.achieve') OR (OLD.status='achieved' AND NEW.status='active' AND (life_command() IS NULL OR life_command() NOT IN ('goal.milestone.reopen','goal.milestone.current'))) THEN RAISE(ABORT,'GOAL_MILESTONE_REVIEW_REQUIRED') END;
END;
CREATE TRIGGER goal_milestone_advance AFTER UPDATE OF status ON goal_milestones
 WHEN OLD.status='active' AND NEW.status='achieved' AND OLD.archived_at IS NULL AND NEW.archived_at IS NULL BEGIN
 UPDATE goal_milestones SET status='active' WHERE user_id=NEW.user_id AND id=(SELECT id FROM goal_milestones WHERE user_id=NEW.user_id AND goal_id=NEW.goal_id AND archived_at IS NULL AND status='planned' ORDER BY sort_order,created_at,id LIMIT 1);
END;
CREATE TRIGGER goal_milestone_timestamp AFTER UPDATE ON goal_milestones WHEN NEW.updated_at IS OLD.updated_at BEGIN
 UPDATE goal_milestones SET updated_at=next_timestamp(OLD.updated_at,life_now()) WHERE user_id=NEW.user_id AND id=NEW.id;
END;
CREATE TRIGGER goal_criterion_timestamp AFTER UPDATE ON goal_outcome_criteria WHEN NEW.updated_at IS OLD.updated_at BEGIN
 UPDATE goal_outcome_criteria SET updated_at=next_timestamp(OLD.updated_at,life_now()) WHERE user_id=NEW.user_id AND id=NEW.id;
END;
CREATE TRIGGER goal_timestamp AFTER UPDATE ON goals WHEN NEW.updated_at IS OLD.updated_at BEGIN
 UPDATE goals SET updated_at=next_timestamp(OLD.updated_at,life_now()) WHERE user_id=NEW.user_id AND id=NEW.id;
END;
CREATE TRIGGER goal_evaluation_validate BEFORE INSERT ON goal_criterion_evaluations BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM goal_outcome_criteria WHERE user_id=NEW.user_id AND id=NEW.criterion_id) THEN RAISE(ABORT,'GOAL_CRITERION_NOT_FOUND') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM goal_outcome_criteria WHERE user_id=NEW.user_id AND id=NEW.criterion_id AND archived_at IS NOT NULL) THEN RAISE(ABORT,'GOAL_CRITERION_ARCHIVED') END;
 SELECT CASE WHEN NOT (${legacy}) AND EXISTS(SELECT 1 FROM goal_outcome_criteria c JOIN goals g ON g.user_id=c.user_id AND g.id=c.goal_id WHERE c.user_id=NEW.user_id AND c.id=NEW.criterion_id AND (g.status='achieved' OR g.archived_at IS NOT NULL)) THEN RAISE(ABORT,'GOAL_CRITERION_ACHIEVED_REQUIRES_REOPEN') END;
 SELECT CASE WHEN NEW.is_retracted=0 AND NEW.is_deferred=0 AND EXISTS(SELECT 1 FROM goal_outcome_criteria c WHERE c.user_id=NEW.user_id AND c.id=NEW.criterion_id AND c.criterion_type='boolean') AND (NEW.boolean_value IS NULL OR NEW.numeric_value IS NOT NULL OR NEW.unit IS NOT NULL) THEN RAISE(ABORT,'GOAL_BOOLEAN_EVALUATION_SHAPE') END;
 SELECT CASE WHEN NEW.is_retracted=0 AND NEW.is_deferred=0 AND EXISTS(SELECT 1 FROM goal_outcome_criteria c WHERE c.user_id=NEW.user_id AND c.id=NEW.criterion_id AND c.criterion_type='numeric' AND (NEW.boolean_value IS NOT NULL OR NEW.numeric_value IS NULL OR NEW.unit IS NULL OR trim(NEW.unit)<>c.unit)) THEN RAISE(ABORT,'GOAL_NUMERIC_EVALUATION_UNIT') END;
 SELECT CASE WHEN NEW.supersedes_evaluation_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM goal_criterion_evaluations e WHERE e.user_id=NEW.user_id AND e.id=NEW.supersedes_evaluation_id AND e.criterion_id=NEW.criterion_id) THEN RAISE(ABORT,'GOAL_EVALUATION_SCOPE_INVALID') END;
END;
CREATE TRIGGER goal_achieved_insert BEFORE INSERT ON goals WHEN NEW.status='achieved' AND NOT (${legacy}) BEGIN SELECT RAISE(ABORT,'GOAL_ACHIEVEMENT_REQUIRES_ACTIVE'); END;
CREATE TRIGGER goal_achieved_update BEFORE UPDATE OF status ON goals WHEN NEW.status='achieved' AND OLD.status<>'achieved' AND NOT (${legacy}) BEGIN
 SELECT CASE WHEN OLD.status<>'active' THEN RAISE(ABORT,'GOAL_ACHIEVEMENT_REQUIRES_ACTIVE') END;
 SELECT CASE WHEN NEW.archived_at IS NOT NULL THEN RAISE(ABORT,'GOAL_ARCHIVED') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM goal_outcome_criteria WHERE user_id=NEW.user_id AND goal_id=NEW.id AND archived_at IS NULL) THEN RAISE(ABORT,'GOAL_ACHIEVEMENT_NO_ACTIVE_CRITERIA') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM goal_criterion_states WHERE user_id=NEW.user_id AND goal_id=NEW.id AND state<>'met') THEN RAISE(ABORT,'GOAL_ACHIEVEMENT_CRITERIA_NOT_MET') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM goal_milestones WHERE user_id=NEW.user_id AND goal_id=NEW.id AND archived_at IS NULL AND status<>'achieved') THEN RAISE(ABORT,'GOAL_ACHIEVEMENT_MILESTONES_NOT_ACHIEVED') END;
 SELECT CASE WHEN life_command() IS NOT 'goal.goal.achieve' THEN RAISE(ABORT,'GOAL_COMMAND_REQUIRED') END;
END;
CREATE TRIGGER goal_reopened_update BEFORE UPDATE OF status ON goals WHEN OLD.status='achieved' AND NEW.status='active' AND life_command() IS NOT 'goal.goal.reopen' BEGIN SELECT RAISE(ABORT,'GOAL_COMMAND_REQUIRED'); END;
` +
  ["project", "task"]
    .map((kind) =>
      ["INSERT", "UPDATE"]
        .map(
          (operation) => `
CREATE TRIGGER goal_support_${kind}_${operation.toLowerCase()} BEFORE ${operation} ON goal_milestone_${kind}_support BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM goal_milestones WHERE user_id=NEW.user_id AND id=NEW.goal_milestone_id AND (archived_at IS NOT NULL OR status='archived')) THEN RAISE(ABORT,'GOAL_MILESTONE_ARCHIVED') END;
 ${
   kind === "project"
     ? `SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM projects WHERE user_id=NEW.user_id AND id=NEW.project_id AND goal_id=NEW.goal_id AND archived_at IS NULL) THEN RAISE(ABORT,'GOAL_PROJECT_SUPPORT_TARGET_INVALID') END;`
     : `
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM tasks WHERE user_id=NEW.user_id AND id=NEW.task_id AND archived_at IS NULL) OR EXISTS(SELECT 1 FROM tasks t WHERE t.user_id=NEW.user_id AND t.id=NEW.task_id AND t.project_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM projects p WHERE p.user_id=t.user_id AND p.id=t.project_id AND p.archived_at IS NULL)) THEN RAISE(ABORT,'GOAL_TASK_SUPPORT_TARGET_INVALID') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM tasks t JOIN projects p ON p.user_id=t.user_id AND p.id=t.project_id WHERE t.user_id=NEW.user_id AND t.id=NEW.task_id AND t.goal_id IS NOT NULL AND p.goal_id IS NOT NULL AND t.goal_id<>p.goal_id) THEN RAISE(ABORT,'GOAL_TASK_SUPPORT_GOAL_CONFLICT') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM tasks t LEFT JOIN projects p ON p.user_id=t.user_id AND p.id=t.project_id WHERE t.user_id=NEW.user_id AND t.id=NEW.task_id AND coalesce(t.goal_id,p.goal_id)=NEW.goal_id) THEN RAISE(ABORT,'GOAL_TASK_SUPPORT_GOAL_MISMATCH') END;`
 }
END;
`,
        )
        .join("\n"),
    )
    .join("\n") +
  goalOwnedTables
    .filter((table) => !historyKinds[table])
    .map(
      (table) => `
CREATE TRIGGER ${table}_identity_update BEFORE UPDATE ON ${table} WHEN NEW.id IS NOT OLD.id OR NEW.user_id IS NOT OLD.user_id BEGIN SELECT RAISE(ABORT,'GOAL_IDENTITY_IMMUTABLE'); END;
`,
    )
    .join("\n");

export const goalHistoryScopeGuards =
  ["criterion", "milestone", "goal"]
    .map((family) => {
      const table =
        family === "criterion"
          ? "goal_criterion_evaluation_evidence"
          : family === "milestone"
            ? "goal_milestone_achievement_evidence"
            : "goal_achievement_evidence";
      const parent =
        family === "criterion"
          ? "goal_criterion_evaluations"
          : family === "milestone"
            ? "goal_milestone_achievement_events"
            : "goal_achievement_events";
      const parentKey =
        family === "criterion" ? "evaluation_id" : "achievement_event_id";
      const scope =
        family === "criterion"
          ? "p.evaluation_id=NEW.evaluation_id"
          : `EXISTS(SELECT 1 FROM ${parent} a JOIN ${parent} b ON b.user_id=a.user_id AND b.goal_id=a.goal_id AND b.episode_id=a.episode_id ${family === "milestone" ? "AND b.goal_milestone_id=a.goal_milestone_id" : ""} WHERE a.user_id=NEW.user_id AND a.id=p.achievement_event_id AND b.id=NEW.achievement_event_id)`;
      return `CREATE TRIGGER ${table}_source_scope BEFORE INSERT ON ${table} BEGIN
    SELECT CASE WHEN NEW.reference_action<>'withdrawn' AND NOT (
      (NEW.source_type='task' AND EXISTS(SELECT 1 FROM tasks WHERE user_id=NEW.user_id AND id=NEW.source_id AND archived_at IS NULL)) OR
      (NEW.source_type='project' AND EXISTS(SELECT 1 FROM projects WHERE user_id=NEW.user_id AND id=NEW.source_id AND archived_at IS NULL)) OR
      (NEW.source_type='project_milestone' AND EXISTS(SELECT 1 FROM project_milestones WHERE user_id=NEW.user_id AND id=NEW.source_id AND archived_at IS NULL)) OR
      (NEW.source_type='resource' AND EXISTS(SELECT 1 FROM resources WHERE user_id=NEW.user_id AND id=NEW.source_id AND archived_at IS NULL)) OR
      (NEW.source_type='review_record' AND EXISTS(SELECT 1 FROM review_records WHERE user_id=NEW.user_id AND id=NEW.source_id AND archived_at IS NULL))
      ${family === "milestone" ? "OR (NEW.source_type='goal_criterion_evaluation' AND EXISTS(SELECT 1 FROM goal_criterion_evaluations WHERE user_id=NEW.user_id AND id=NEW.source_id AND is_retracted=0))" : ""}
    ) THEN RAISE(ABORT,'GOAL_EVIDENCE_SOURCE_INVALID') END;
    SELECT CASE WHEN NEW.reference_action IN ('replaced','withdrawn') AND NOT EXISTS(SELECT 1 FROM ${table} p WHERE p.user_id=NEW.user_id AND p.id=NEW.supersedes_reference_id AND p.reference_group_id=NEW.reference_group_id AND ${scope}) THEN RAISE(ABORT,'GOAL_EVIDENCE_REFERENCE_SCOPE_INVALID') END;
    SELECT CASE WHEN NEW.reference_action='withdrawn' AND NOT EXISTS(SELECT 1 FROM ${table} p WHERE p.user_id=NEW.user_id AND p.id=NEW.supersedes_reference_id AND p.source_type=NEW.source_type AND p.source_id=NEW.source_id AND p.source_title_snapshot IS NEW.source_title_snapshot AND p.source_context_snapshot IS NEW.source_context_snapshot) THEN RAISE(ABORT,'GOAL_EVIDENCE_WITHDRAWAL_SNAPSHOT_INVALID') END;
    SELECT CASE WHEN NEW.reference_action='supplemented' AND length(trim(coalesce(NEW.reason,'')))=0 THEN RAISE(ABORT,'GOAL_EVIDENCE_REASON_REQUIRED') END;
    ${family === "milestone" ? `SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM ${parent} WHERE user_id=NEW.user_id AND id=NEW.${parentKey} AND episode_id=NEW.episode_id) THEN RAISE(ABORT,'GOAL_EVIDENCE_EPISODE_INVALID') END;` : ""}
  END;`;
    })
    .join("\n") +
  ["goal_achievement_events", "goal_milestone_achievement_events"]
    .map(
      (table) => `
CREATE TRIGGER ${table}_correction_scope BEFORE INSERT ON ${table} WHEN NEW.event_type='amended' BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM ${table} p WHERE p.user_id=NEW.user_id AND p.id=NEW.corrects_event_id AND p.goal_id=NEW.goal_id AND p.episode_id=NEW.episode_id ${table.includes("milestone") ? "AND p.goal_milestone_id=NEW.goal_milestone_id" : ""} AND p.goal_title_snapshot IS NEW.goal_title_snapshot AND p.legacy_state IS NEW.legacy_state ${table.includes("milestone") ? "AND p.goal_milestone_title_snapshot IS NEW.goal_milestone_title_snapshot AND p.goal_milestone_description_snapshot IS NEW.goal_milestone_description_snapshot" : ""} AND p.prior_status IS NEW.prior_status AND p.resulting_status IS NEW.resulting_status) THEN RAISE(ABORT,'GOAL_EVENT_CORRECTION_SCOPE_INVALID') END;
END;
`,
    )
    .join("\n");

import "server-only";
import type Database from "better-sqlite3";
import { canonicalTableNames } from "./canonical-catalog";

// Child-first, fixed v10 catalog; no client/table parameters. Deferred FKs cover
// reciprocal task/inbox and skill terminal-review links. SET NULL parents are
// removed only after children, so UPDATE/history rules remain fully active.
export const previewResetTables = Object.freeze([
  "resource_relations",
  "schedule_source_links",
  "daily_log_tasks",
  "task_dependencies",
  "task_skill_links",
  "task_steps",
  "work_meeting_followups",
  "review_task_decisions",
  "goal_achievement_evidence",
  "goal_milestone_achievement_evidence",
  "goal_criterion_evaluation_evidence",
  "goal_achievement_criterion_basis",
  "goal_achievement_milestone_basis",
  "goal_achievement_events",
  "goal_milestone_achievement_events",
  "goal_criterion_evaluations",
  "goal_milestone_project_support",
  "goal_milestone_task_support",
  "goal_outcome_criteria",
  "goal_milestones",
  "goal_command_receipts",
  "project_review_amendments",
  "project_review_resources",
  "project_review_criteria",
  "project_lifecycle_events",
  "project_reviews",
  "project_completion_criteria",
  "project_command_receipts",
  "skill_development_review_amendments",
  "skill_development_review_evidence",
  "skill_development_reviews",
  "skill_evidence_revisions",
  "skill_evidence",
  "skill_milestones",
  "skill_development_targets",
  "skill_command_receipts",
  "recipe_ingredients",
  "meals",
  "recipes",
  "running_sessions",
  "running_plan_items",
  "running_plans",
  "strength_set_logs",
  "strength_sessions",
  "strength_plan_items",
  "strength_plans",
  "exercise_muscles",
  "exercises",
  "coding_sessions",
  "education_logs",
  "work_logs",
  "work_decisions",
  "work_meetings",
  "journal_entries",
  "entertainment_items",
  "purchase_decisions",
  "inventory_items",
  "wishlist_items",
  "anti_rot_events",
  "anti_rot_actions",
  "challenge_progress_logs",
  "challenges",
  "reward_ledger_entries",
  "shop_redemptions",
  "shop_items",
  "habit_logs",
  "habits",
  "sleep_entries",
  "weight_entries",
  "weight_goals",
  "mood_entries",
  "tasks",
  "inbox_items",
  "project_milestones",
  "recurring_task_templates",
  "daily_logs",
  "review_records",
  "resources",
  "skills",
  "projects",
  "goals",
  "areas",
] as const);
export function deletePreviewDataset(db: Database.Database, owner: string) {
  if (
    previewResetTables.length !== 82 ||
    new Set(previewResetTables).size !== 82 ||
    canonicalTableNames.some(
      (t) => t !== "profiles" && !previewResetTables.some((x) => x === t),
    )
  )
    throw new Error("RESET_CATALOG_INVALID");
  for (const table of previewResetTables) {
    // Self-reference RESTRICT needs leaf deletion before its ancestor. This
    // relation is fixed, not inferred from user SQL; bounded by row count.
    const selfReference: string | undefined = (
      {
        anti_rot_events: "recommendation_event_id",
        goal_achievement_events: "corrects_event_id",
        goal_milestone_achievement_events: "corrects_event_id",
        goal_achievement_evidence: "supersedes_reference_id",
        goal_milestone_achievement_evidence: "supersedes_reference_id",
        goal_criterion_evaluation_evidence: "supersedes_reference_id",
        goal_criterion_evaluations: "supersedes_evaluation_id",
      } as Record<string, string>
    )[table];
    if (selfReference) {
      while (
        db.prepare(`SELECT 1 FROM ${table} WHERE user_id=? LIMIT 1`).get(owner)
      ) {
        const deleted = db
          .prepare(
            `DELETE FROM ${table} WHERE user_id=? AND NOT EXISTS(SELECT 1 FROM ${table} c WHERE c.user_id=${table}.user_id AND c.${selfReference}=${table}.id)`,
          )
          .run(owner);
        if (!deleted.changes) throw new Error("RESET_SELF_RELATION_INVALID");
      }
    } else db.prepare(`DELETE FROM ${table} WHERE user_id=?`).run(owner);
  }
  if (
    previewResetTables.some((table) =>
      db.prepare(`SELECT 1 FROM ${table} LIMIT 1`).get(),
    )
  )
    throw new Error("RESET_OWNER_OR_COUNT_INVALID");
}

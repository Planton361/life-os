// Composite foreign keys enforce every owner tuple. These additional guards
// enforce active parents and command-only source reconciliation inside SQLite.
export function nutritionTrainingGuards(): string {
  const activeParents = [
    ["recipe_ingredients", "recipe_id", "recipes", "is_archived=0"],
    ["running_plan_items", "plan_id", "running_plans", "archived_at IS NULL"],
    ["strength_plan_items", "plan_id", "strength_plans", "archived_at IS NULL"],
    ["strength_plan_items", "exercise_id", "exercises", "archived_at IS NULL"],
  ];
  return (
    activeParents
      .map(([table, field, parent, active]) =>
        ["INSERT", "UPDATE"]
          .map(
            (op) => `
CREATE TRIGGER ${table}_${field}_active_${op.toLowerCase()} BEFORE ${op} ON ${table} BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM ${parent} WHERE user_id=NEW.user_id AND id=NEW.${field} AND ${active}) THEN RAISE(ABORT,'ACTIVE_PARENT_REQUIRED') END;
END;`,
          )
          .join("\n"),
      )
      .join("\n") +
    `
-- PostgreSQL's updated_at trigger supplies a fresh microsecond token. Preserve
-- that stale-write boundary even when Node's clock repeats a millisecond.
CREATE TRIGGER meal_version AFTER UPDATE ON meals
 WHEN NEW.updated_at<=OLD.updated_at AND (NEW.date IS NOT OLD.date OR NEW.meal_type IS NOT OLD.meal_type OR NEW.title IS NOT OLD.title OR NEW.recipe_id IS NOT OLD.recipe_id OR NEW.servings IS NOT OLD.servings OR NEW.notes IS NOT OLD.notes OR NEW.planned_at IS NOT OLD.planned_at OR NEW.completed_at IS NOT OLD.completed_at)
 BEGIN UPDATE meals SET updated_at=next_timestamp(OLD.updated_at,life_now()) WHERE user_id=NEW.user_id AND id=NEW.id; END;
CREATE TRIGGER meal_linked_write BEFORE UPDATE ON meals
 WHEN EXISTS(SELECT 1 FROM schedule_source_links WHERE user_id=OLD.user_id AND source_type='meal' AND source_id=OLD.id)
 AND (NEW.date IS NOT OLD.date OR NEW.planned_at IS NOT OLD.planned_at OR NEW.completed_at IS NOT OLD.completed_at)
 AND (life_command() IS NULL OR life_command() NOT IN ('source.schedule','source.unschedule','source.complete','nutrition.plan'))
 BEGIN SELECT RAISE(ABORT,'SOURCE_COMMAND_REQUIRED'); END;
CREATE TRIGGER meal_linked_delete BEFORE DELETE ON meals
 WHEN EXISTS(SELECT 1 FROM schedule_source_links WHERE user_id=OLD.user_id AND source_type='meal' AND source_id=OLD.id)
 BEGIN SELECT RAISE(ABORT,'SOURCE_COMMAND_REQUIRED'); END;
` +
    (
      [
        ["running_sessions", "running_plan_item", "plan_item_id"],
        ["strength_sessions", "strength_plan", "plan_id"],
      ] as const
    )
      .map(([table, type, field]) =>
        ["INSERT", "UPDATE"]
          .map(
            (op) => `
CREATE TRIGGER ${table}_linked_completion_${op.toLowerCase()} BEFORE ${op} ON ${table}
 WHEN ${op === "INSERT" ? "NEW.status='completed'" : `(NEW.status IS NOT OLD.status OR NEW.completed_at IS NOT OLD.completed_at OR NEW.${field} IS NOT OLD.${field})`} AND EXISTS(SELECT 1 FROM schedule_source_links WHERE user_id=NEW.user_id AND source_type='${type}' AND (source_id=NEW.${field}${op === "UPDATE" ? ` OR source_id=OLD.${field}` : ""}))
 AND (life_command() IS NULL OR (life_command()<>'source.complete' AND NOT (life_command() IN ('synthetic.recorded_facts','synthetic.measured_facts') AND (SELECT dataset_kind FROM runtime_metadata WHERE singleton=1)='synthetic')))
 BEGIN SELECT RAISE(ABORT,'SOURCE_COMMAND_REQUIRED'); END;
`,
          )
          .join("\n"),
      )
      .join("\n")
  );
}

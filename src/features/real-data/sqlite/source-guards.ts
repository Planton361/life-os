export const sourceGuards = `
CREATE TRIGGER linked_source_owner BEFORE INSERT ON schedule_source_links BEGIN
 SELECT CASE WHEN
  (NEW.source_type='meal' AND NOT EXISTS(SELECT 1 FROM meals WHERE user_id=NEW.user_id AND id=NEW.source_id)) OR
  (NEW.source_type='review' AND NOT EXISTS(SELECT 1 FROM review_records WHERE user_id=NEW.user_id AND id=NEW.source_id AND archived_at IS NULL AND status<>'archived')) OR
  (NEW.source_type='running_plan_item' AND NOT EXISTS(SELECT 1 FROM running_plan_items i JOIN running_plans p ON p.user_id=i.user_id AND p.id=i.plan_id WHERE i.user_id=NEW.user_id AND i.id=NEW.source_id AND i.archived_at IS NULL AND p.archived_at IS NULL)) OR
  (NEW.source_type='strength_plan' AND NOT EXISTS(SELECT 1 FROM strength_plans WHERE user_id=NEW.user_id AND id=NEW.source_id AND archived_at IS NULL))
 THEN RAISE(ABORT,'SOURCE_OWNER_OR_ACTIVE_DENIED') END;
END;
CREATE TRIGGER source_task_completion BEFORE UPDATE OF status ON tasks WHEN NEW.status='done' AND OLD.status<>'done' BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM schedule_source_links l WHERE l.user_id=NEW.user_id AND l.task_id=NEW.id AND (
  (l.source_type='meal' AND NOT EXISTS(SELECT 1 FROM meals WHERE user_id=NEW.user_id AND id=l.source_id AND completed_at IS NOT NULL)) OR
  (l.source_type='review' AND NOT EXISTS(SELECT 1 FROM review_records WHERE user_id=NEW.user_id AND id=l.source_id AND archived_at IS NULL AND status='completed')) OR
  (l.source_type='running_plan_item' AND NOT EXISTS(SELECT 1 FROM running_sessions WHERE user_id=NEW.user_id AND plan_item_id=l.source_id AND status='completed' AND completed_at IS NOT NULL AND archived_at IS NULL)) OR
  (l.source_type='strength_plan' AND NOT EXISTS(SELECT 1 FROM strength_sessions s WHERE s.user_id=NEW.user_id AND s.plan_id=l.source_id AND s.status='completed' AND s.completed_at IS NOT NULL AND s.archived_at IS NULL AND EXISTS(SELECT 1 FROM strength_set_logs WHERE user_id=NEW.user_id AND session_id=s.id)))
 )) THEN RAISE(ABORT,'SOURCE_DOMAIN_COMPLETION_REQUIRED') END;
END;
`;

export function sourceDependencyGuards(): string {
  const sources = [
    ["meals", "meal", "id"], ["review_records", "review", "id"],
    ["running_sessions", "running_plan_item", "plan_item_id"], ["strength_sessions", "strength_plan", "plan_id"],
  ] as const;
  return sources.map(([table, type, column]) => ["INSERT", "UPDATE"].map((operation) => `
CREATE TRIGGER ${table}_dependency_${operation.toLowerCase()} BEFORE ${operation} ON ${table}
 WHEN (NEW.completed_at IS NOT NULL${operation === "UPDATE" ? " AND NEW.completed_at IS NOT OLD.completed_at" : ""})${table === "meals" ? "" : ` OR (NEW.status='completed'${operation === "UPDATE" ? " AND NEW.status IS NOT OLD.status" : ""})`}
 BEGIN
 SELECT CASE WHEN EXISTS(
 SELECT 1 FROM schedule_source_links l JOIN task_dependencies d ON d.user_id=l.user_id AND d.successor_task_id=l.task_id JOIN tasks p ON p.user_id=d.user_id AND p.id=d.predecessor_task_id
 WHERE l.user_id=NEW.user_id AND l.source_type='${type}' AND l.source_id=NEW.${column} AND (p.status<>'done' OR p.completed_at IS NULL OR p.archived_at IS NOT NULL)
 ) THEN RAISE(ABORT,'DEPENDENCY_BLOCKED') END;
END;
`).join("\n")).join("\n");
}

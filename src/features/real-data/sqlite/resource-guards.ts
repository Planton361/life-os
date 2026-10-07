import { resourceTargetTables } from "./commands/resource-commands";

// All polymorphic endpoints are checked inside SQLite, including native SQL.
// Lifecycle checks apply to new endpoints; historical links remain readable.
export function resourceGuards(): string {
  const targets = {
    ...resourceTargetTables,
    inbox_item: "inbox_items",
    daily_log: "daily_logs",
    area: "areas",
  };
  return ["INSERT", "UPDATE"]
    .map(
      (operation) => `
CREATE TRIGGER resource_target_owner_${operation.toLowerCase()} BEFORE ${operation} ON resource_relations BEGIN
 SELECT CASE WHEN ${Object.entries(targets)
   .filter(([type]) => type !== "project")
   .map(
     ([type, table]) =>
       `(NEW.target_type='${type}' AND NOT EXISTS(SELECT 1 FROM ${table} WHERE user_id=NEW.user_id AND id=NEW.target_id))`,
   )
   .join(" OR ")}
 THEN RAISE(ABORT,'RESOURCE_TARGET_OWNER_DENIED') END;
 SELECT CASE WHEN NEW.target_type='skill' AND NEW.relation_type<>'context' THEN RAISE(ABORT,'RESOURCE_SKILL_CONTEXT_REQUIRED') END;
END;
CREATE TRIGGER resource_new_endpoint_active_${operation.toLowerCase()} BEFORE ${operation} ON resource_relations
 ${operation === "UPDATE" ? "WHEN NEW.user_id IS NOT OLD.user_id OR NEW.resource_id IS NOT OLD.resource_id OR NEW.target_type IS NOT OLD.target_type OR NEW.target_id IS NOT OLD.target_id" : ""} BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM resources WHERE user_id=NEW.user_id AND id=NEW.resource_id) AND NOT EXISTS(SELECT 1 FROM resources WHERE user_id=NEW.user_id AND id=NEW.resource_id AND archived_at IS NULL)
 AND NOT(NEW.target_type='project' AND NEW.project_role='reference' AND life_command() IS 'resource.artifact') THEN RAISE(ABORT,'RESOURCE_SOURCE_UNAVAILABLE') END;
 SELECT CASE WHEN ${Object.entries(resourceTargetTables)
   .map(
     ([type, table]) =>
       `(NEW.target_type='${type}' AND EXISTS(SELECT 1 FROM ${table} WHERE user_id=NEW.user_id AND id=NEW.target_id) AND NOT EXISTS(SELECT 1 FROM ${table} WHERE user_id=NEW.user_id AND id=NEW.target_id AND archived_at IS NULL${type === "skill" ? " AND status='active'" : ""}))`,
   )
   .join(" OR ")}
 THEN RAISE(ABORT,'RESOURCE_TARGET_UNAVAILABLE') END;
END;
CREATE TRIGGER resource_artifact_active_${operation.toLowerCase()} BEFORE ${operation} ON resource_relations
 WHEN NEW.project_role<>'reference' BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM projects WHERE user_id=NEW.user_id AND id=NEW.target_id AND archived_at IS NULL) THEN RAISE(ABORT,'ARTIFACT_PROJECT_UNAVAILABLE') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM resources WHERE user_id=NEW.user_id AND id=NEW.resource_id AND archived_at IS NULL)
 ${operation === "UPDATE" ? "AND NOT(OLD.project_role='primary_artifact' AND NEW.project_role='additional_artifact' AND NEW.user_id=OLD.user_id AND NEW.resource_id=OLD.resource_id AND NEW.target_type=OLD.target_type AND NEW.target_id=OLD.target_id)" : ""}
 THEN RAISE(ABORT,'ARTIFACT_RESOURCE_UNAVAILABLE') END;
END;
`,
    )
    .join("\n");
}

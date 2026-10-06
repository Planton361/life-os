import { projectOwnedTables } from "./project-schema";
const kinds = [
  "result.set",
  "criterion.create",
  "criterion.edit",
  "criterion.reorder",
  "criterion.archive",
  "review.submit",
  "review.amend",
  "project.reopen",
  "project.archive",
  "project.status.set",
]
  .map((k) => `'project.${k}'`)
  .join(",");
const legacy =
  "life_command()='synthetic.initialize' AND EXISTS(SELECT 1 FROM runtime_metadata WHERE dataset_kind='synthetic')";
const allowed: Record<string, readonly string[]> = {
  project_completion_criteria: ["criterion.create"],
  project_reviews: ["review.submit"],
  project_review_criteria: ["review.submit"],
  project_review_resources: ["review.submit"],
  project_lifecycle_events: [
    "project.reopen",
    "project.archive",
    "review.amend",
  ],
  project_review_amendments: ["review.amend", "project.reopen"],
};
const permitted = `((${legacy}) OR life_command() IN (${kinds}))`;
export const projectGuards =
  projectOwnedTables
    .map(
      (table) => `
CREATE TRIGGER ${table}_command_insert BEFORE INSERT ON ${table} WHEN NOT coalesce(((${legacy}) OR life_command() IN (${allowed[table]?.map((k) => `'project.${k}'`).join(",") ?? kinds})),0) BEGIN SELECT RAISE(ABORT,'PROJECT_COMMAND_REQUIRED'); END;
CREATE TRIGGER ${table}_immutable_delete BEFORE DELETE ON ${table} BEGIN SELECT RAISE(ABORT,'PROJECT_HISTORY_IMMUTABLE'); END;
${table === "project_completion_criteria" ? "" : `CREATE TRIGGER ${table}_immutable_update BEFORE UPDATE ON ${table} BEGIN SELECT RAISE(ABORT,'PROJECT_HISTORY_IMMUTABLE'); END;`}
`,
    )
    .join("\n") +
  `
CREATE TRIGGER project_criterion_insert_freeze BEFORE INSERT ON project_completion_criteria WHEN NOT coalesce((${legacy}),0) AND EXISTS(SELECT 1 FROM projects WHERE user_id=NEW.user_id AND id=NEW.project_id AND (status='completed' OR archived_at IS NOT NULL)) BEGIN SELECT RAISE(ABORT,'PROJECT_COMPLETED_FROZEN'); END;
CREATE TRIGGER project_receipt_kind BEFORE INSERT ON project_command_receipts WHEN NOT coalesce((${legacy}),0) AND life_command() IS NOT ('project.' || NEW.command_kind) BEGIN SELECT RAISE(ABORT,'PROJECT_COMMAND_REQUIRED'); END;
CREATE TRIGGER project_criterion_update BEFORE UPDATE ON project_completion_criteria BEGIN
 SELECT CASE WHEN NOT coalesce(${permitted},0) THEN RAISE(ABORT,'PROJECT_COMMAND_REQUIRED') END;
 SELECT CASE WHEN (NEW.id IS NOT OLD.id OR NEW.user_id IS NOT OLD.user_id OR NEW.project_id IS NOT OLD.project_id OR NEW.created_at IS NOT OLD.created_at OR OLD.archived_at IS NOT NULL) THEN RAISE(ABORT,'PROJECT_CRITERION_IMMUTABLE') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM projects WHERE id=OLD.project_id AND user_id=OLD.user_id AND (status='completed' OR archived_at IS NOT NULL)) THEN RAISE(ABORT,'PROJECT_COMPLETED_FROZEN') END;
END;
CREATE TRIGGER project_initial BEFORE INSERT ON projects WHEN NOT coalesce((${legacy}),0) AND (NEW.status IN ('completed','archived') OR NEW.completion_revision<>0 OR NEW.completion_cycle<>0) BEGIN SELECT RAISE(ABORT,'PROJECT_COMMAND_REQUIRED'); END;
CREATE TRIGGER project_fields BEFORE UPDATE ON projects BEGIN
 SELECT CASE WHEN NEW.id IS NOT OLD.id OR NEW.user_id IS NOT OLD.user_id THEN RAISE(ABORT,'PROJECT_IDENTITY_IMMUTABLE') END;
 SELECT CASE WHEN (NEW.status IS NOT OLD.status OR NEW.archived_at IS NOT OLD.archived_at OR NEW.desired_result IS NOT OLD.desired_result OR NEW.completion_cycle IS NOT OLD.completion_cycle)
 AND NOT coalesce(${permitted},0) THEN RAISE(ABORT,'PROJECT_COMMAND_REQUIRED') END;
 SELECT CASE WHEN NEW.completion_revision<>OLD.completion_revision AND NOT coalesce((${legacy}) OR ((life_command() IN (${kinds}) OR life_command()='project.metadata') AND NEW.completion_revision=OLD.completion_revision+1),0) THEN RAISE(ABORT,'PROJECT_REVISION_SERVER_OWNED') END;
 SELECT CASE WHEN OLD.status='completed' AND NEW.desired_result IS NOT OLD.desired_result THEN RAISE(ABORT,'PROJECT_COMPLETED_FROZEN') END;
 SELECT CASE WHEN OLD.archived_at IS NOT NULL AND (NEW.title IS NOT OLD.title OR NEW.description IS NOT OLD.description OR NEW.priority IS NOT OLD.priority OR NEW.area_id IS NOT OLD.area_id OR NEW.goal_id IS NOT OLD.goal_id OR NEW.status IS NOT OLD.status OR NEW.archived_at IS NOT OLD.archived_at OR NEW.desired_result IS NOT OLD.desired_result OR NEW.completion_cycle IS NOT OLD.completion_cycle) THEN RAISE(ABORT,'PROJECT_ARCHIVED') END;
END;
CREATE TRIGGER project_result_insert BEFORE INSERT ON projects WHEN NEW.desired_result IS NOT NULL AND project_text_valid(NEW.desired_result,4000)<>1 BEGIN SELECT RAISE(ABORT,'PROJECT_RESULT_INVALID'); END;
CREATE TRIGGER project_result_update BEFORE UPDATE ON projects WHEN NEW.desired_result IS NOT NULL AND project_text_valid(NEW.desired_result,4000)<>1 BEGIN SELECT RAISE(ABORT,'PROJECT_RESULT_INVALID'); END;
CREATE TRIGGER project_criterion_capture BEFORE INSERT ON project_review_criteria BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM project_reviews r JOIN project_completion_criteria c ON c.user_id=r.user_id AND c.project_id=r.project_id WHERE r.user_id=NEW.user_id AND r.project_id=NEW.project_id AND r.id=NEW.review_id AND c.id=NEW.criterion_id
 AND (c.archived_at IS NULL OR c.archived_cycle=r.completion_cycle) AND NEW.text_snapshot=c.text AND NEW.sort_order_snapshot=c.sort_order AND NEW.was_archived=(c.archived_at IS NOT NULL) AND NEW.archive_reason_snapshot IS c.archive_reason AND NEW.archived_cycle_snapshot IS c.archived_cycle AND NEW.archived_revision_snapshot IS c.archived_revision
 AND (r.decision<>'completed' OR NEW.was_archived=1 OR NEW.decision='satisfied')) THEN RAISE(ABORT,'PROJECT_CRITERION_SNAPSHOT_INVALID') END;
END;
CREATE TRIGGER project_resource_capture BEFORE INSERT ON project_review_resources BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM project_reviews v JOIN resource_relations rr ON rr.user_id=v.user_id AND rr.target_type='project' AND rr.target_id=v.project_id JOIN resources r ON r.user_id=rr.user_id AND r.id=rr.resource_id WHERE v.user_id=NEW.user_id AND v.project_id=NEW.project_id AND v.id=NEW.review_id AND rr.id=NEW.relation_id_snapshot AND r.archived_at IS NULL
 AND NEW.resource_id=r.id AND NEW.title_snapshot=r.title AND NEW.resource_type_snapshot=r.type AND NEW.safe_url_snapshot IS project_safe_url(r.url) AND NEW.project_role_snapshot=rr.project_role AND NEW.relation_type_snapshot=rr.relation_type) THEN RAISE(ABORT,'PROJECT_RESOURCE_SNAPSHOT_INVALID') END;
END;
CREATE TRIGGER project_resource_target_insert BEFORE INSERT ON resource_relations WHEN NEW.target_type='project' AND NOT EXISTS(SELECT 1 FROM projects WHERE user_id=NEW.user_id AND id=NEW.target_id) BEGIN SELECT RAISE(ABORT,'PROJECT_NOT_FOUND'); END;
CREATE TRIGGER project_resource_target_update BEFORE UPDATE ON resource_relations WHEN NEW.target_type='project' AND NOT EXISTS(SELECT 1 FROM projects WHERE user_id=NEW.user_id AND id=NEW.target_id) BEGIN SELECT RAISE(ABORT,'PROJECT_NOT_FOUND'); END;
`;

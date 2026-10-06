import { skillOwnedTables } from "./skill-schema";
export const skillOperations = [
  "skill.create",
  "skill.edit",
  "skill.archive",
  "skill.restore",
  "target.create",
  "target.edit",
  "target.current",
  "target.archive",
  "target.restore",
  "target.reopen",
  "milestone.create",
  "milestone.edit",
  "milestone.current",
  "milestone.reorder",
  "milestone.archive",
  "milestone.restore",
  "milestone.reopen",
  "review.submit",
  "review.amend",
  "evidence.create",
  "evidence.correct",
  "evidence.withdraw",
  "evidence.restore",
] as const;
const allowed = skillOperations.map((x) => `'skill.${x}'`).join(",");
const history = new Set([
  "skill_development_reviews",
  "skill_evidence_revisions",
  "skill_development_review_evidence",
  "skill_development_review_amendments",
  "skill_command_receipts",
]);
export const skillGuards = skillOwnedTables
  .map((table) => {
    if (table === "task_skill_links")
      return `
 CREATE TRIGGER skill_link_active BEFORE INSERT ON task_skill_links WHEN (life_command() IS NULL OR life_command() NOT IN ('skill.link','inbox.complete','inbox.route')) OR NOT EXISTS(SELECT 1 FROM tasks WHERE user_id=NEW.user_id AND id=NEW.task_id AND archived_at IS NULL AND status<>'archived') OR NOT EXISTS(SELECT 1 FROM skills WHERE user_id=NEW.user_id AND id=NEW.skill_id AND archived_at IS NULL AND status<>'archived') BEGIN SELECT RAISE(ABORT,'SKILL_LINK_UNAVAILABLE');END;
 CREATE TRIGGER skill_link_immutable BEFORE UPDATE ON task_skill_links BEGIN SELECT RAISE(ABORT,'SKILL_IDENTITY_IMMUTABLE');END;
 CREATE TRIGGER skill_link_unlink BEFORE DELETE ON task_skill_links WHEN life_command() IS NOT 'skill.unlink' BEGIN SELECT RAISE(ABORT,'SKILL_COMMAND_REQUIRED');END;`;
    return (
      ["INSERT", "UPDATE", "DELETE"]
        .map(
          (op) =>
            `CREATE TRIGGER ${table}_${op.toLowerCase()}_command BEFORE ${op} ON ${table} WHEN ${op === "DELETE" || (history.has(table) && op === "UPDATE") ? "1" : `life_command() IS NULL OR life_command() NOT IN (${allowed})`} BEGIN SELECT RAISE(ABORT,'${history.has(table) && op !== "INSERT" ? "SKILL_HISTORY_IMMUTABLE" : "SKILL_COMMAND_REQUIRED"}');END;`,
        )
        .join("\n") +
      (history.has(table)
        ? ""
        : `\nCREATE TRIGGER ${table}_identity BEFORE UPDATE ON ${table} WHEN NEW.id IS NOT OLD.id OR NEW.user_id IS NOT OLD.user_id ${table !== "skills" ? "OR NEW.skill_id IS NOT OLD.skill_id" : ""} ${table === "skill_milestones" ? "OR NEW.target_id IS NOT OLD.target_id" : ""} BEGIN SELECT RAISE(ABORT,'SKILL_IDENTITY_IMMUTABLE');END;`)
    );
  })
  .join("\n");

import "server-only";
import type { SqliteRuntime } from "../runtime";
import { requireOwnerContext, type OwnerContext } from "../owner-context";
import { uuid, safeNumber } from "../codecs";
import {
  executeSkillInTransaction,
  parseNativeSkillCommand,
  skillOne,
  skillRows,
  type SkillRow,
} from "../commands/skill-commands";
export function skillDevelopmentCommand(
  store: SqliteRuntime,
  context: OwnerContext,
  input: unknown,
) {
  requireOwnerContext(context);
  const c = parseNativeSkillCommand(input);
  return store.command(context, `skill.${c.operation}`, (db, owner) =>
    executeSkillInTransaction(db, owner, c),
  );
}
function readRow(row: SkillRow) {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [
      k,
      ["source_snapshot", "subject_snapshot", "milestones_snapshot"].includes(
        k,
      ) && typeof v === "string"
        ? JSON.parse(v)
        : typeof v === "bigint"
          ? ["development_revision", "aggregate_revision"].includes(k)
            ? String(v)
            : safeNumber(v)
          : v,
    ]),
  );
}
export function readSqliteSkillDevelopment(
  store: SqliteRuntime,
  context: OwnerContext,
  skillId: string,
) {
  requireOwnerContext(context);
  skillId = uuid(skillId);
  return store.read(context, (db, owner) => {
    const skill = skillOne(
      db,
      "SELECT * FROM skills WHERE user_id=? AND id=?",
      owner,
      skillId,
    );
    if (!skill) return null;
    const read = (table: string, order: string) =>
      skillRows(
        db,
        `SELECT * FROM ${table} WHERE user_id=? AND skill_id=? ${order}`,
        owner,
        skillId,
      ).map(readRow);
    return {
      skill: readRow(skill),
      as_of: skillOne(db, "SELECT life_now() AS now")!.now,
      timezone: skillOne(db, "SELECT timezone FROM profiles WHERE id=?", owner)!
        .timezone,
      targets: read("skill_development_targets", "ORDER BY created_at,id"),
      milestones: read("skill_milestones", "ORDER BY sort_order,id"),
      evidence: read("skill_evidence", "ORDER BY evidence_date DESC,id"),
      revisions: read(
        "skill_evidence_revisions",
        "ORDER BY recorded_at DESC,evidence_id,revision DESC",
      ),
      reviews: read(
        "skill_development_reviews",
        "ORDER BY reviewed_at DESC,id",
      ),
      review_evidence: read(
        "skill_development_review_evidence",
        "ORDER BY review_id,evidence_id",
      ),
      amendments: read(
        "skill_development_review_amendments",
        "ORDER BY created_at,id",
      ),
      practice: skillRows(
        db,
        "SELECT t.*,l.created_at AS linked_at FROM task_skill_links l JOIN tasks t ON (t.user_id,t.id)=(l.user_id,l.task_id) WHERE l.user_id=? AND l.skill_id=? ORDER BY t.id",
        owner,
        skillId,
      ).map(readRow),
    };
  });
}
export function taskSkillLink(
  store: SqliteRuntime,
  context: OwnerContext,
  input: { taskId: string; skillId: string },
  unlink = false,
) {
  requireOwnerContext(context);
  const task = uuid(input.taskId),
    skill = uuid(input.skillId);
  return store.command(
    context,
    unlink ? "skill.unlink" : "skill.link",
    (db, owner) => {
      if (
        !skillOne(
          db,
          "SELECT id FROM tasks WHERE user_id=? AND id=? AND archived_at IS NULL AND status<>'archived'",
          owner,
          task,
        ) ||
        !skillOne(
          db,
          "SELECT id FROM skills WHERE user_id=? AND id=? AND archived_at IS NULL AND status<>'archived'",
          owner,
          skill,
        )
      )
        throw new Error("SKILL_LINK_UNAVAILABLE");
      if (unlink) {
        const row = skillOne(
          db,
          "SELECT * FROM task_skill_links WHERE user_id=? AND task_id=? AND skill_id=?",
          owner,
          task,
          skill,
        );
        if (!row) throw new Error("SKILL_LINK_NOT_FOUND");
        db.prepare(
          "DELETE FROM task_skill_links WHERE user_id=? AND task_id=? AND skill_id=?",
        ).run(owner, task, skill);
        return readRow(row);
      }
      db.prepare(
        "INSERT INTO task_skill_links(user_id,task_id,skill_id) VALUES(?,?,?) ON CONFLICT(user_id,task_id,skill_id) DO NOTHING",
      ).run(owner, task, skill);
      return readRow(
        skillOne(
          db,
          "SELECT * FROM task_skill_links WHERE user_id=? AND task_id=? AND skill_id=?",
          owner,
          task,
          skill,
        )!,
      );
    },
  );
}

export async function writeSqliteSkillDevelopment(
  store: SqliteRuntime,
  context: OwnerContext,
  input: unknown,
) {
  try {
    const result = skillDevelopmentCommand(store, context, input);
    return {
      status: "success" as const,
      message: "Skill gespeichert.",
      result,
    };
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    return {
      status: "error" as const,
      message: /SKILL_STALE|SKILL_EVIDENCE_STALE/.test(code)
        ? "Die Skill wurde inzwischen geändert. Lade die aktuelle Ansicht und prüfe deine Eingaben erneut."
        : /SKILL_COMMAND_KEY_CONFLICT/.test(code)
          ? "Diese Anfrage wurde bereits mit anderen Eingaben gespeichert."
          : /ACK_REQUIRED/.test(code)
            ? "Bestätige die noch offenen Lernschritte."
            : /FUTURE/.test(code)
              ? "Evidence benötigt ein heutiges oder vergangenes Datum."
              : "Die Änderung konnte nicht gespeichert werden. Prüfe Lifecycle, Quelle und Eingaben.",
    };
  }
}

import { parseProjectJson } from "./project-canonical";
import type Database from "better-sqlite3";
export function validateSkillCommit(db: Database.Database, owner: string) {
  const invalid = (sql: string, code: string) => {
    if (db.prepare(sql).get(owner)) throw new Error(code);
  };
  invalid(
    `SELECT t.id FROM skill_development_targets t JOIN skills s ON (s.user_id,s.id)=(t.user_id,t.skill_id) WHERE t.user_id=? AND t.status='current' AND (s.archived_at IS NOT NULL OR s.status='archived') LIMIT 1`,
    "SKILL_CURRENT_PARENT_INVALID",
  );
  invalid(
    `SELECT m.id FROM skill_milestones m JOIN skill_development_targets t ON (t.user_id,t.skill_id,t.id)=(m.user_id,m.skill_id,m.target_id) WHERE m.user_id=? AND m.status='current' AND (t.status<>'current' OR t.archived_at IS NOT NULL) LIMIT 1`,
    "SKILL_CURRENT_PARENT_INVALID",
  );
  for (const [table, milestone] of [
    ["skill_development_targets", false],
    ["skill_milestones", true],
  ] as const) {
    invalid(
      `SELECT x.id FROM ${table} x LEFT JOIN skill_development_reviews r ON r.user_id=x.user_id AND r.skill_id=x.skill_id AND r.target_id=${milestone ? "x.target_id" : "x.id"} AND r.id=x.terminal_review_id WHERE x.user_id=? AND x.terminal_review_id IS NOT NULL AND (r.id IS NULL OR r.cycle<>x.cycle OR r.decision<>${milestone ? "'completed'" : "x.status"} OR ${milestone ? "r.milestone_id IS NOT x.id" : "r.milestone_id IS NOT NULL"} OR EXISTS(SELECT 1 FROM skill_development_review_amendments a WHERE a.user_id=x.user_id AND a.review_id=r.id AND a.kind IN ('withdrawal','mistaken'))) LIMIT 1`,
      "SKILL_TERMINAL_REVIEW_INVALID",
    );
  }
  const fields = [
    "source_type",
    "source_id",
    "title",
    "note",
    "evidence_date",
    "weight",
    "withdrawn_at",
    "source_snapshot",
    "provenance_state",
  ];
  invalid(
    `SELECT e.id FROM skill_evidence e LEFT JOIN skill_evidence_revisions v ON (v.user_id,v.skill_id,v.evidence_id,v.revision)=(e.user_id,e.skill_id,e.id,e.revision) WHERE e.user_id=? AND (v.evidence_id IS NULL OR ${fields.map((f) => `e.${f} IS NOT v.${f}`).join(" OR ")}) LIMIT 1`,
    "SKILL_EVIDENCE_HEAD_INVALID",
  );
}

export function skillCommitSnapshot(db: Database.Database, owner: string) {
  const rows = db
    .prepare("SELECT * FROM skills WHERE user_id=?")
    .all(owner) as Record<string, string | bigint | null>[];
  const counts = new Map<string, string>();
  for (const s of rows)
    counts.set(String(s.id), skillState(db, owner, String(s.id)));
  return {
    skills: new Map(rows.map((s) => [String(s.id), s])),
    counts,
    receipts: new Set(
      (
        db
          .prepare(
            "SELECT command_id FROM skill_command_receipts WHERE user_id=?",
          )
          .all(owner) as { command_id: string }[]
      ).map((r) => r.command_id),
    ),
  };
}
function skillState(db: Database.Database, owner: string, id: string) {
  return [
    "skills",
    "skill_development_targets",
    "skill_milestones",
    "skill_evidence",
    "skill_evidence_revisions",
    "skill_development_reviews",
    "skill_development_review_evidence",
    "skill_development_review_amendments",
  ]
    .map((table) => {
      const rows = db
        .prepare(
          `SELECT * FROM ${table} WHERE user_id=? AND ${table === "skills" ? "id" : "skill_id"}=?`,
        )
        .all(owner, id);
      return JSON.stringify(rows, (_key, value) =>
        typeof value === "bigint" ? `${value}n` : value,
      );
    })
    .join("|");
}
export function validateSkillBoundary(
  db: Database.Database,
  owner: string,
  before: ReturnType<typeof skillCommitSnapshot>,
) {
  const after = skillCommitSnapshot(db, owner);
  const newReceipts = db
    .prepare(
      "SELECT command_id,skill_id FROM skill_command_receipts WHERE user_id=?",
    )
    .all(owner) as { command_id: string; skill_id: string }[];
  for (const receipt of newReceipts)
    if (
      !before.receipts.has(receipt.command_id) &&
      before.counts.get(receipt.skill_id) === after.counts.get(receipt.skill_id)
    )
      throw new Error("SKILL_RECEIPT_INVALID");
  for (const [id, row] of after.skills) {
    if (before.counts.get(id) === after.counts.get(id)) continue;
    const receipts = (
      db
        .prepare(
          "SELECT command_id,operation,request,result FROM skill_command_receipts WHERE user_id=? AND skill_id=?",
        )
        .all(owner, id) as {
        command_id: string;
        operation: string;
        request: string;
        result: string;
      }[]
    ).filter((r) => !before.receipts.has(r.command_id));
    if (receipts.length !== 1) throw new Error("SKILL_REVISION_SERVER_OWNED");
    const old = before.skills.get(id),
      r = receipts[0];
    const request = parseProjectJson(r.request) as {
      expected_revision: bigint | null;
      operation: string;
      skill_id: string | null;
    };
    const expected =
      request.expected_revision === null
        ? "null"
        : String(request.expected_revision);
    if (
      old
        ? row.development_revision !==
            (old.development_revision as bigint) + BigInt(1) ||
          expected !== String(old.development_revision) ||
          r.operation === "skill.create" ||
          request.skill_id !== id
        : row.development_revision !== BigInt(0) ||
          expected !== "null" ||
          r.operation !== "skill.create" ||
          request.skill_id !== null
    )
      throw new Error("SKILL_REVISION_SERVER_OWNED");
    const result = parseProjectJson(r.result) as {
      skill_id: string;
      development_revision: bigint;
      operation: string;
      command_id: string;
    };
    if (
      result.skill_id !== id ||
      String(result.development_revision) !==
        String(row.development_revision) ||
      result.operation !== r.operation ||
      result.command_id !== r.command_id ||
      request.operation !== r.operation
    )
      throw new Error("SKILL_RECEIPT_INVALID");
  }
}

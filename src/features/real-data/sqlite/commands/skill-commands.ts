import "server-only";
import type Database from "better-sqlite3";
import {
  parseSkillCommand as parseZodSkillCommand,
  type SkillCommandOperation,
} from "../../schemas/skill-development.schema";
import { int64, uuid } from "../codecs";
import { pgJson, parseProjectJson, type Canonical } from "../project-canonical";
import { validateSkillCommit } from "../skill-invariants";
export type SkillCommand = {
  operation: SkillCommandOperation;
  commandId: string;
  skillId: string | null;
  expectedRevision: string | null;
  payload: Record<string, Canonical>;
};
export type SkillRow = Record<string, string | bigint | null>;
export function skillRows(
  db: Database.Database,
  sql: string,
  ...params: (string | bigint | null)[]
) {
  return db.prepare(sql).all(...params) as SkillRow[];
}
export function skillOne(
  db: Database.Database,
  sql: string,
  ...params: (string | bigint | null)[]
) {
  return db.prepare(sql).get(...params) as SkillRow | undefined;
}
const fail = (code: string): never => {
  throw new Error(code);
};
export function parseNativeSkillCommand(input: unknown): SkillCommand {
  if (!input || typeof input !== "object") return fail("SKILL_COMMAND_INVALID");
  const raw = input as Record<string, unknown>,
    revision =
      raw.expectedRevision === null
        ? null
        : int64(
            typeof raw.expectedRevision === "number"
              ? Number.isSafeInteger(raw.expectedRevision)
                ? String(raw.expectedRevision)
                : fail("SKILL_COMMAND_INVALID")
              : (raw.expectedRevision as string | bigint),
          );
  if (revision !== null && revision < BigInt(0))
    return fail("SKILL_COMMAND_INVALID");
  // Reuse payload Zod contracts without routing the canonical aggregate token through Number.
  // The SQL command accepts partial edit payloads (including status-only Area
  // resume). Validate supplied fields with the existing form schema, then omit
  // its required display title when the caller did not supply one.
  const optionalTitle =
    raw.operation === "skill.edit"
      ? "name"
      : ["target.edit", "milestone.edit"].includes(String(raw.operation))
        ? "title"
        : null;
  const payload =
    raw.payload &&
    typeof raw.payload === "object" &&
    !Array.isArray(raw.payload)
      ? (raw.payload as Record<string, unknown>)
      : null;
  const omittedTitle =
    optionalTitle && payload && !(optionalTitle in payload)
      ? optionalTitle
      : null;
  const parsed = parseZodSkillCommand({
    ...raw,
    payload: omittedTitle
      ? { ...payload, [omittedTitle]: "Validation only" }
      : raw.payload,
    expectedRevision: revision === null ? null : 0,
  });
  if (!parsed.success) return fail("SKILL_COMMAND_INVALID");
  if (omittedTitle)
    delete (parsed.data.payload as Record<string, unknown>)[omittedTitle];
  if (
    raw.operation === "review.submit" &&
    (
      parsed.data.payload as unknown as { evidence: { revision: number }[] }
    ).evidence.some(
      (v) => !Number.isSafeInteger(v.revision) || v.revision > 2147483647,
    )
  )
    return fail("SKILL_COMMAND_INVALID");
  return {
    ...parsed.data,
    commandId: uuid(parsed.data.commandId),
    skillId: parsed.data.skillId === null ? null : uuid(parsed.data.skillId),
    expectedRevision: revision === null ? null : String(revision),
    payload: parsed.data.payload as Record<string, Canonical>,
  };
}
function canonicalPayload(payload: Record<string, Canonical>) {
  return Object.fromEntries(
    Object.entries(payload)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [
        k,
        typeof v === "string" ? v.replace(/^ +| +$/g, "") : v,
      ]),
  ) as Record<string, Canonical>;
}
function rowSnapshot(row: SkillRow): Canonical {
  return { ...row };
}
function sourceSnapshot(
  db: Database.Database,
  owner: string,
  type: string,
  id: string | null,
  now: string,
): Canonical {
  if (type === "manual_note") {
    if (id !== null) fail("SKILL_SOURCE_INVALID");
    return { version: 1, source_type: type, source_id: null, captured_at: now };
  }
  const table = (
    {
      task: "tasks",
      project: "projects",
      goal: "goals",
      resource: "resources",
    } as Record<string, string>
  )[type];
  if (!table || !id) return fail("SKILL_SOURCE_INVALID");
  const row = skillOne(
    db,
    `SELECT * FROM ${table} WHERE user_id=? AND id=? AND archived_at IS NULL`,
    owner,
    id,
  );
  if (!row || row.status === "archived")
    return fail("SKILL_SOURCE_UNAVAILABLE");
  return Object.fromEntries(
    Object.entries({
      version: 1,
      source_type: type,
      source_id: id,
      title: row.title,
      status: row.status,
      updated_at: row.updated_at,
      task_completed_at: type === "task" ? row.completed_at : null,
      captured_at: now,
    }).filter(([, v]) => v !== null && v !== undefined),
  ) as Canonical;
}
export function executeSkillInTransaction(
  db: Database.Database,
  owner: string,
  c: SkillCommand,
) {
  if (!db.inTransaction) return fail("SKILL_TRANSACTION_REQUIRED");
  const q = canonicalPayload(c.payload),
    request = pgJson({
      version: 1,
      operation: c.operation,
      skill_id: c.skillId,
      expected_revision:
        c.expectedRevision === null ? null : BigInt(c.expectedRevision),
      payload: q,
    });
  if (Buffer.byteLength(pgJson(q)) > 1048576)
    return fail("SKILL_COMMAND_INVALID");
  const receipt = skillOne(
    db,
    "SELECT request,result FROM skill_command_receipts WHERE user_id=? AND command_id=?",
    owner,
    c.commandId,
  );
  if (receipt) {
    if (receipt.request !== request) return fail("SKILL_COMMAND_KEY_CONFLICT");
    return skillCommandResult(String(receipt.result));
  }
  const op = c.operation,
    str = (k: string) =>
      q[k] === null || q[k] === undefined
        ? null
        : k.endsWith("_id")
          ? uuid(String(q[k]))
          : String(q[k]),
    now = String(skillOne(db, "SELECT life_now() AS now")!.now);
  const areaAvailable = (area: string | null) => {
    if (
      area &&
      !skillOne(
        db,
        "SELECT id FROM areas WHERE user_id=? AND id=? AND archived_at IS NULL",
        owner,
        area,
      )
    )
      fail("SKILL_AREA_UNAVAILABLE");
  };
  let s: SkillRow;
  if (op === "skill.create") {
    areaAvailable(str("area_id"));
    s = db
      .prepare(
        `INSERT INTO skills(user_id,name,summary,category,level,area_id,status,archived_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?) RETURNING *`,
      )
      .get(
        owner,
        str("name"),
        str("summary") || null,
        str("category") || null,
        str("level") || null,
        str("area_id"),
        str("status") || "active",
        str("status") === "archived" ? now : null,
        now,
        now,
      ) as SkillRow;
  } else {
    s =
      skillOne(
        db,
        "SELECT * FROM skills WHERE user_id=? AND id=?",
        owner,
        c.skillId,
      ) ?? fail("SKILL_NOT_FOUND");
    if (String(s.development_revision) !== c.expectedRevision)
      return fail("SKILL_STALE");
    if (
      (s.archived_at !== null || s.status === "archived") &&
      !["skill.restore", "review.amend"].includes(op)
    )
      return fail("SKILL_ARCHIVED");
  }
  const sid = String(s.id),
    update = (
      table: string,
      id: string,
      values: Record<string, string | bigint | null>,
    ) => {
      if (table === "skills" || table === "skill_evidence")
        values.updated_at = now;
      db.prepare(
        `UPDATE ${table} SET ${Object.keys(values)
          .map((k) => `${k}=?`)
          .join(",")} WHERE user_id=? AND id=?`,
      ).run(...Object.values(values), owner, id);
    },
    demote = (table: string, column: string, id: string) =>
      db
        .prepare(
          `UPDATE ${table} SET status='planned',updated_at=? WHERE user_id=? AND ${column}=? AND status='current'`,
        )
        .run(now, owner, id);
  const result: Record<string, Canonical> = {
    skill_id: sid,
    operation: op,
    command_id: c.commandId,
  };
  if (op === "skill.edit") {
    const area = "area_id" in q ? str("area_id") : (s.area_id as string | null);
    areaAvailable(area);
    const values: Record<string, string | null> = {
      name: str("name") || String(s.name),
      area_id: area,
      status: str("status") || String(s.status),
    };
    for (const k of ["summary", "category", "level"])
      if (k in q) values[k] = str(k) || null;
    update("skills", sid, values);
  }
  if (op === "skill.archive" || op === "skill.restore") {
    if (
      op === "skill.restore" &&
      s.archived_at === null &&
      s.status !== "archived"
    )
      return fail("SKILL_RESTORE_INVALID");
    demote("skill_milestones", "skill_id", sid);
    demote("skill_development_targets", "skill_id", sid);
    update("skills", sid, {
      status: op === "skill.archive" ? "archived" : "paused",
      archived_at: op === "skill.archive" ? now : null,
    });
  }
  let tid = str("target_id"),
    mid = str("milestone_id"),
    t: SkillRow | undefined,
    m: SkillRow | undefined;
  if (op === "target.create") {
    t = db
      .prepare(
        "INSERT INTO skill_development_targets(user_id,skill_id,title,description,created_at,updated_at) VALUES(?,?,?,?,?,?) RETURNING *",
      )
      .get(
        owner,
        sid,
        str("title"),
        str("description") || null,
        now,
        now,
      ) as SkillRow;
    tid = String(t.id);
    result.target_id = tid;
  } else if (
    op.startsWith("target.") ||
    op.startsWith("milestone.") ||
    op === "review.submit"
  ) {
    t =
      skillOne(
        db,
        "SELECT * FROM skill_development_targets WHERE user_id=? AND skill_id=? AND id=?",
        owner,
        sid,
        tid,
      ) ?? fail("SKILL_TARGET_NOT_FOUND");
    if (t.archived_at !== null && op !== "target.restore")
      return fail("SKILL_TARGET_ARCHIVED");
    if (
      ["completed", "retired"].includes(String(t.status)) &&
      !["target.archive", "target.restore", "target.reopen"].includes(op)
    )
      return fail("SKILL_TARGET_FROZEN");
  }
  if (op === "target.edit")
    update("skill_development_targets", tid!, {
      title: str("title") ?? String(t!.title),
      ...("description" in q
        ? { description: str("description") || null }
        : {}),
      updated_at: now,
    });
  if (op === "target.current") {
    demote("skill_milestones", "skill_id", sid);
    demote("skill_development_targets", "skill_id", sid);
    update("skill_development_targets", tid!, {
      status: "current",
      updated_at: now,
    });
  }
  if (["target.archive", "target.restore", "target.reopen"].includes(op)) {
    if (op === "target.restore" && t!.archived_at === null)
      return fail("SKILL_RESTORE_INVALID");
    if (
      op === "target.reopen" &&
      !["completed", "retired"].includes(String(t!.status))
    )
      return fail("SKILL_REOPEN_INVALID");
    demote("skill_milestones", "target_id", tid!);
    update("skill_development_targets", tid!, {
      status:
        op === "target.reopen" || t!.status === "current"
          ? "planned"
          : String(t!.status),
      archived_at:
        op === "target.archive"
          ? now
          : op === "target.restore"
            ? null
            : t!.archived_at,
      cycle:
        (t!.cycle as bigint) + (op === "target.reopen" ? BigInt(1) : BigInt(0)),
      terminal_review_id: op === "target.reopen" ? null : t!.terminal_review_id,
      updated_at: now,
    });
  }
  const nextOrder = () =>
    skillOne(
      db,
      "SELECT coalesce(max(sort_order)+1,0) AS n FROM skill_milestones WHERE user_id=? AND target_id=? AND archived_at IS NULL",
      owner,
      tid,
    )!.n as bigint;
  if (op === "milestone.create") {
    m = db
      .prepare(
        "INSERT INTO skill_milestones(user_id,skill_id,target_id,title,description,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?) RETURNING *",
      )
      .get(
        owner,
        sid,
        tid,
        str("title"),
        str("description") || null,
        nextOrder(),
        now,
        now,
      ) as SkillRow;
    mid = String(m.id);
    result.milestone_id = mid;
  } else if (
    (op.startsWith("milestone.") && op !== "milestone.reorder") ||
    (op === "review.submit" && mid)
  ) {
    m =
      skillOne(
        db,
        "SELECT * FROM skill_milestones WHERE user_id=? AND skill_id=? AND target_id=? AND id=?",
        owner,
        sid,
        tid,
        mid,
      ) ?? fail("SKILL_MILESTONE_NOT_FOUND");
    if (m.archived_at !== null && op !== "milestone.restore")
      return fail("SKILL_MILESTONE_ARCHIVED");
    if (
      m.status === "completed" &&
      !["milestone.reopen", "milestone.archive", "milestone.restore"].includes(
        op,
      )
    )
      return fail("SKILL_MILESTONE_FROZEN");
  }
  if (op === "milestone.edit")
    update("skill_milestones", mid!, {
      title: str("title") ?? String(m!.title),
      ...("description" in q
        ? { description: str("description") || null }
        : {}),
      updated_at: now,
    });
  if (op === "milestone.current") {
    if (t!.status !== "current") return fail("SKILL_CURRENT_PARENT_INVALID");
    demote("skill_milestones", "target_id", tid!);
    update("skill_milestones", mid!, { status: "current", updated_at: now });
  }
  if (op === "milestone.reorder") {
    const ids = (q.ids as string[]).map(uuid),
      active = skillRows(
        db,
        "SELECT id,sort_order FROM skill_milestones WHERE user_id=? AND target_id=? AND archived_at IS NULL",
        owner,
        tid,
      );
    if (
      ids.length !== active.length ||
      new Set(ids).size !== ids.length ||
      ids.some((id) => !active.some((m) => m.id === id))
    )
      return fail("SKILL_ORDER_INVALID");
    // Pick unused positions outside the final [0,N) set. This stays bounded
    // even when an existing position is already at PostgreSQL's int32 ceiling.
    const occupied = new Set(active.map((row) => String(row.sort_order)));
    let temporary = BigInt(ids.length);
    for (const id of ids) {
      while (occupied.has(String(temporary))) temporary += BigInt(1);
      update("skill_milestones", id, {
        sort_order: temporary,
        updated_at: now,
      });
      temporary += BigInt(1);
    }
    ids.forEach((id, i) =>
      update("skill_milestones", id, {
        sort_order: BigInt(i),
        updated_at: now,
      }),
    );
  }
  if (
    ["milestone.archive", "milestone.restore", "milestone.reopen"].includes(op)
  ) {
    if (op === "milestone.restore" && m!.archived_at === null)
      return fail("SKILL_RESTORE_INVALID");
    if (op === "milestone.reopen" && m!.status !== "completed")
      return fail("SKILL_REOPEN_INVALID");
    update("skill_milestones", mid!, {
      status:
        op === "milestone.reopen" || m!.status === "current"
          ? "planned"
          : String(m!.status),
      archived_at:
        op === "milestone.archive"
          ? now
          : op === "milestone.restore"
            ? null
            : m!.archived_at,
      sort_order: op === "milestone.restore" ? nextOrder() : m!.sort_order,
      cycle:
        (m!.cycle as bigint) +
        (op === "milestone.reopen" ? BigInt(1) : BigInt(0)),
      terminal_review_id:
        op === "milestone.reopen" ? null : m!.terminal_review_id,
      updated_at: now,
    });
  }
  if (op === "review.submit") {
    const decision = str("decision")!,
      active = skillRows(
        db,
        "SELECT * FROM skill_milestones WHERE user_id=? AND target_id=? AND archived_at IS NULL ORDER BY sort_order,id",
        owner,
        tid,
      );
    if (
      ["completed", "retired"].includes(decision) &&
      !mid &&
      active.some((m) => m.status !== "completed") &&
      q.open_milestones_acknowledged !== true
    )
      return fail("SKILL_OPEN_MILESTONES_ACK_REQUIRED");
    const r = db
      .prepare(
        `INSERT INTO skill_development_reviews(user_id,skill_id,target_id,milestone_id,cycle,decision,note,aggregate_revision,subject_snapshot,milestones_snapshot,reviewed_at) VALUES(?,?,?,?,?,?,?,?,?,?,?) RETURNING id`,
      )
      .get(
        owner,
        sid,
        tid,
        mid,
        mid ? m!.cycle : t!.cycle,
        decision,
        str("note"),
        s.development_revision,
        pgJson(rowSnapshot(mid ? m! : t!)),
        pgJson(active.map(rowSnapshot)),
        now,
      ) as SkillRow;
    const rid = String(r.id);
    for (const item of (q.evidence || []) as {
      id: string;
      revision: number;
    }[]) {
      const e = skillOne(
        db,
        "SELECT * FROM skill_evidence WHERE user_id=? AND skill_id=? AND id=? AND withdrawn_at IS NULL AND revision=?",
        owner,
        sid,
        uuid(item.id),
        BigInt(item.revision),
      );
      if (!e) return fail("SKILL_EVIDENCE_STALE");
      db.prepare(
        "INSERT INTO skill_development_review_evidence VALUES(?,?,?,?,?,?)",
      ).run(owner, sid, tid, rid, e.id, e.revision);
    }
    if (["completed", "retired"].includes(decision)) {
      if (!mid) demote("skill_milestones", "target_id", tid!);
      update(
        mid ? "skill_milestones" : "skill_development_targets",
        mid || tid!,
        { status: decision, terminal_review_id: rid, updated_at: now },
      );
    }
    result.review_id = rid;
  }
  if (op === "review.amend") {
    const r =
      skillOne(
        db,
        "SELECT * FROM skill_development_reviews WHERE user_id=? AND skill_id=? AND id=?",
        owner,
        sid,
        str("review_id"),
      ) ?? fail("SKILL_REVIEW_NOT_FOUND");
    db.prepare(
      "INSERT INTO skill_development_review_amendments(user_id,skill_id,target_id,review_id,kind,note,created_at) VALUES(?,?,?,?,?,?,?)",
    ).run(owner, sid, r.target_id, r.id, str("kind"), str("note"), now);
    if (["withdrawal", "mistaken"].includes(str("kind")!)) {
      const table = r.milestone_id
          ? "skill_milestones"
          : "skill_development_targets",
        id = String(r.milestone_id || r.target_id),
        subject = skillOne(
          db,
          `SELECT * FROM ${table} WHERE user_id=? AND skill_id=? AND id=? AND terminal_review_id=?`,
          owner,
          sid,
          id,
          r.id,
        );
      if (subject) {
        if (!r.milestone_id)
          demote("skill_milestones", "target_id", String(r.target_id));
        update(table, id, {
          status: "planned",
          terminal_review_id: null,
          cycle: (subject.cycle as bigint) + BigInt(1),
          updated_at: now,
        });
      }
    }
  }
  if (op.startsWith("evidence.")) {
    let e =
      op === "evidence.create"
        ? undefined
        : (skillOne(
            db,
            "SELECT * FROM skill_evidence WHERE user_id=? AND skill_id=? AND id=?",
            owner,
            sid,
            str("evidence_id"),
          ) ?? fail("SKILL_EVIDENCE_NOT_FOUND"));
    if (op === "evidence.create" || op === "evidence.correct") {
      const timezone = String(
          skillOne(db, "SELECT timezone FROM profiles WHERE id=?", owner)!
            .timezone,
        ),
        today = new Intl.DateTimeFormat("en-CA", {
          timeZone: timezone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date(now));
      if (str("evidence_date")! > today) return fail("SKILL_EVIDENCE_FUTURE");
      const values = {
        title: str("title")!,
        note: str("note") || null,
        evidence_date: str("evidence_date")!,
        source_type: str("source_type")!,
        source_id: str("source_id"),
        weight: str("weight") === null ? null : BigInt(str("weight")!),
        source_snapshot: pgJson(
          sourceSnapshot(db, owner, str("source_type")!, str("source_id"), now),
        ),
        provenance_state: "captured",
      };
      if (!e)
        e = db
          .prepare(
            `INSERT INTO skill_evidence(user_id,skill_id,${Object.keys(values).join(",")},created_at,updated_at) VALUES(${Object.keys(
              values,
            )
              .map(() => "?")
              .join(",")},?,?,?,?) RETURNING *`,
          )
          .get(owner, sid, ...Object.values(values), now, now) as SkillRow;
      else
        update("skill_evidence", String(e.id), {
          ...values,
          revision: (e.revision as bigint) + BigInt(1),
        });
    } else {
      if ((op === "evidence.withdraw") === (e!.withdrawn_at !== null))
        return fail("SKILL_EVIDENCE_STATE_INVALID");
      update("skill_evidence", String(e!.id), {
        withdrawn_at: op === "evidence.withdraw" ? now : null,
        revision: (e!.revision as bigint) + BigInt(1),
      });
    }
    e = skillOne(
      db,
      "SELECT * FROM skill_evidence WHERE user_id=? AND id=?",
      owner,
      e!.id,
    )!;
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
    db.prepare(
      `INSERT INTO skill_evidence_revisions(user_id,skill_id,evidence_id,revision,${fields.join(",")},operation,reason,recorded_at) VALUES(${Array(16).fill("?").join(",")})`,
    ).run(
      owner,
      sid,
      e.id,
      e.revision,
      ...fields.map((k) => e![k]),
      op.split(".")[1],
      str("reason"),
      now,
    );
    result.evidence_id = String(e.id);
  }
  if (op !== "skill.create")
    update("skills", sid, {
      development_revision: int64(
        (s.development_revision as bigint) + BigInt(1),
      ),
    });
  result.development_revision =
    op === "skill.create"
      ? BigInt(0)
      : (s.development_revision as bigint) + BigInt(1);
  const stored = pgJson(result);
  db.prepare(
    "INSERT INTO skill_command_receipts(user_id,command_id,skill_id,operation,request,result,created_at) VALUES(?,?,?,?,?,?,?)",
  ).run(owner, c.commandId, sid, op, request, stored, now);
  validateSkillCommit(db, owner);
  return skillCommandResult(stored);
}

export type NativeSkillCommandResult = {
  skill_id: string;
  operation: SkillCommandOperation;
  command_id: string;
  development_revision: string;
  target_id?: string;
  milestone_id?: string;
  evidence_id?: string;
  review_id?: string;
};
function skillCommandResult(stored: string): NativeSkillCommandResult {
  const result = parseProjectJson(stored) as Record<string, Canonical>;
  return {
    ...result,
    development_revision: String(result.development_revision),
  } as NativeSkillCommandResult;
}

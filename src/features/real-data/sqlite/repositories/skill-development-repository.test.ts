import { randomUUID } from "node:crypto";
import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { initializeSyntheticDatabase } from "../synthetic-database";
import { SqliteRuntime, configureConnection } from "../runtime";
import { issueOwnerContext, type OwnerContext } from "../owner-context";
import {
  skillDevelopmentCommand,
  readSqliteSkillDevelopment,
  taskSkillLink,
  writeSqliteSkillDevelopment,
} from "./skill-development-repository";
import { canonicalTableNames } from "../canonical-catalog";
import {
  skillPracticeReads,
  type PracticeTask,
  type DevelopmentEvidence,
} from "../../domain/skill-development";
import { skillOwnedTables } from "../skill-schema";
import { skillOperations } from "../skill-guards";
import { inspectSyntheticDatabase, restoreSyntheticBackup } from "../recovery";
const owner = "11600000-0000-4000-8000-000000000001",
  now = "2026-10-06T10:00:00.123456Z";
export function fixture() {
  const directory = mkdtempSync(
      join(realpathSync(tmpdir()), "life-os-116-skill-"),
    ),
    path = join(directory, "synthetic.db");
  initializeSyntheticDatabase(path, owner);
  const store = new SqliteRuntime(path, { syntheticProof: true }),
    context = issueOwnerContext(owner);
  const create = skillDevelopmentCommand(store, context, {
    operation: "skill.create",
    commandId: randomUUID(),
    skillId: null,
    expectedRevision: null,
    payload: { name: "Skill" },
  }) as Record<string, string>;
  const sid = create.skill_id,
    read = () => readSqliteSkillDevelopment(store, context, sid)!;
  const input = (operation: string, payload: unknown, key = randomUUID()) => ({
    operation,
    commandId: key,
    skillId: sid,
    expectedRevision: read().skill.development_revision,
    payload,
  });
  const command = (operation: string, payload: unknown) =>
    skillDevelopmentCommand(
      store,
      context,
      input(operation, payload),
    ) as Record<string, string>;
  const target = () => command("target.create", { title: "Target" }).target_id;
  const milestone = (tid: string) =>
    command("milestone.create", { target_id: tid, title: "Step" }).milestone_id;
  const evidence = () =>
    command("evidence.create", {
      title: "Evidence",
      evidence_date: "2026-09-01",
      source_type: "manual_note",
      source_id: null,
    }).evidence_id;
  const review = (
    tid: string,
    mid: string | null = null,
    decision = "completed",
    selected: unknown[] = [],
  ) =>
    command("review.submit", {
      target_id: tid,
      milestone_id: mid,
      decision,
      note: "Reviewed",
      open_milestones_acknowledged: true,
      evidence: selected,
    }).review_id;
  return {
    directory,
    path,
    store,
    context,
    sid,
    read,
    input,
    command,
    target,
    milestone,
    evidence,
    review,
  };
}
it("delivers all canonical tables, initial revision and receipt replay before later state", () => {
  const f = fixture();
  try {
    expect(f.read().skill.development_revision).toBe("0");
    const tables = f.store.read(f.context, (db) =>
      db.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all(),
    ) as { name: string }[];
    expect(
      canonicalTableNames.filter((name) => tables.some((t) => t.name === name)),
    ).toHaveLength(83);
    for (const table of skillOwnedTables)
      expect(tables.some((t) => t.name === table)).toBe(true);
    const request = f.input("skill.edit", { name: "  Renamed  ", summary: "" }),
      result = skillDevelopmentCommand(f.store, f.context, request);
    f.target();
    expect(
      skillDevelopmentCommand(f.store, f.context, {
        ...request,
        payload: { name: "Renamed", summary: "" },
      }),
    ).toEqual(result);
    expect(() =>
      skillDevelopmentCommand(f.store, f.context, {
        ...request,
        payload: { name: "Different" },
      }),
    ).toThrow("SKILL_COMMAND_KEY_CONFLICT");
    expect(() =>
      skillDevelopmentCommand(f.store, f.context, {
        ...request,
        commandId: randomUUID(),
      }),
    ).toThrow("SKILL_STALE");
    expect(() =>
      skillDevelopmentCommand(f.store, f.context, {
        ...request,
        expectedRevision: 9007199254740992,
        commandId: randomUUID(),
      }),
    ).toThrow();
  } finally {
    f.store.close();
  }
});
it("implements all 23 operations with current/terminal/archive/reopen semantics", () => {
  const f = fixture(),
    seen = new Set<string>(["skill.create"]);
  const cmd = (op: string, p: unknown) => {
    seen.add(op);
    return f.command(op, p);
  };
  try {
    cmd("skill.edit", { name: "Changed", status: "paused" });
    const t = cmd("target.create", { title: "Target" }).target_id;
    cmd("target.edit", { target_id: t, title: "Edited" });
    cmd("target.current", { target_id: t });
    const m = cmd("milestone.create", {
      target_id: t,
      title: "Step",
    }).milestone_id;
    cmd("milestone.edit", {
      target_id: t,
      milestone_id: m,
      title: "Edited Step",
    });
    cmd("milestone.current", { target_id: t, milestone_id: m });
    cmd("milestone.reorder", { target_id: t, ids: [m] });
    cmd("milestone.archive", { target_id: t, milestone_id: m });
    cmd("milestone.restore", { target_id: t, milestone_id: m });
    const e = cmd("evidence.create", {
      title: "First",
      evidence_date: "2026-09-01",
      source_type: "manual_note",
      source_id: null,
    }).evidence_id;
    const r = cmd("review.submit", {
      target_id: t,
      milestone_id: m,
      decision: "completed",
      note: "done",
      open_milestones_acknowledged: false,
      evidence: [{ id: e, revision: 1 }],
    }).review_id;
    expect(f.read().milestones[0].terminal_review_id).toBe(r);
    cmd("milestone.reopen", { target_id: t, milestone_id: m });
    expect(f.read().milestones[0].cycle).toBe(2);
    cmd("evidence.correct", {
      evidence_id: e,
      title: "Corrected",
      evidence_date: "2026-08-01",
      source_type: "manual_note",
      source_id: null,
      reason: "Correction",
    });
    cmd("evidence.withdraw", { evidence_id: e, reason: "Withdraw" });
    cmd("evidence.restore", { evidence_id: e, reason: "Restore" });
    expect(f.read().revisions.find((v) => v.revision === 1)!.title).toBe(
      "First",
    );
    expect(f.read().review_evidence[0].evidence_revision).toBe(1);
    cmd("review.amend", { review_id: r, kind: "clarification", note: "Note" });
    const terminal = f.review(t, null, "retired");
    expect(f.read().targets[0].status).toBe("retired");
    cmd("target.archive", { target_id: t });
    cmd("target.restore", { target_id: t });
    cmd("target.reopen", { target_id: t });
    expect(f.read().targets[0].cycle).toBe(2);
    expect(f.read().reviews.find((v) => v.id === terminal)!.decision).toBe(
      "retired",
    );
    cmd("skill.archive", {});
    cmd("skill.restore", {});
    expect(f.read().skill.status).toBe("paused");
    expect([...seen].sort()).toEqual([...skillOperations].sort());
  } finally {
    f.store.close();
  }
});
it("full-set reorder is atomic and rejects duplicates, partial, archived and foreign IDs", () => {
  const f = fixture();
  try {
    const t = f.target(),
      a = f.milestone(t),
      b = f.milestone(t),
      other = f.milestone(f.target());
    f.command("milestone.reorder", { target_id: t, ids: [b, a] });
    expect(
      f
        .read()
        .milestones.filter((m) => m.target_id === t)
        .map((m) => m.id),
    ).toEqual([b, a]);
    for (const ids of [[a], [a, a], [a, other], [a, randomUUID()]]) {
      const before = f.read();
      expect(() =>
        f.command("milestone.reorder", { target_id: t, ids }),
      ).toThrow("SKILL_ORDER_INVALID");
      const after = f.read();
      expect({ ...after, as_of: before.as_of }).toEqual(before);
    }
    f.command("milestone.archive", { target_id: t, milestone_id: a });
    expect(() =>
      f.command("milestone.reorder", { target_id: t, ids: [a, b] }),
    ).toThrow("SKILL_ORDER_INVALID");
    f.command("milestone.restore", { target_id: t, milestone_id: a });
    expect(f.read().milestones.find((m) => m.id === a)!.sort_order).toBe(1);
  } finally {
    f.store.close();
  }
});
it("reviews require acknowledgement, reject stale evidence, preserve snapshots and amendment cycles", () => {
  const f = fixture();
  try {
    const t = f.target(),
      m = f.milestone(t),
      e = f.evidence();
    f.command("target.current", { target_id: t });
    f.command("milestone.current", { target_id: t, milestone_id: m });
    const bad = {
        target_id: t,
        decision: "completed",
        note: "Review",
        open_milestones_acknowledged: false,
        evidence: [],
      },
      before = f.read();
    expect(() => f.command("review.submit", bad)).toThrow(
      "SKILL_OPEN_MILESTONES_ACK_REQUIRED",
    );
    expect(() =>
      f.command("review.submit", {
        ...bad,
        decision: "continue",
        evidence: [{ id: e, revision: 2 }],
      }),
    ).toThrow("SKILL_EVIDENCE_STALE");
    expect(f.read().reviews).toEqual(before.reviews);
    const continuing = f.review(t, null, "continue");
    expect(f.read().targets[0].status).toBe("current");
    const r = f.review(t);
    expect(f.read().milestones[0].status).toBe("planned");
    f.command("review.amend", {
      review_id: r,
      kind: "mistaken",
      note: "Mistaken",
    });
    expect(f.read().targets[0]).toMatchObject({
      cycle: 2,
      status: "planned",
      terminal_review_id: null,
    });
    f.command("target.edit", { target_id: t, title: "New truth" });
    expect(
      (
        f.read().reviews.find((v) => v.id === r)!.subject_snapshot as Record<
          string,
          unknown
        >
      ).title,
    ).toBe("Target");
    f.command("skill.archive", {});
    f.command("review.amend", {
      review_id: continuing,
      kind: "withdrawal",
      note: "Withdraw history",
    });
    expect(f.read().skill.status).toBe("archived");
  } finally {
    f.store.close();
  }
});
it("captures bounded owned sources and validates active Area without partial effects", () => {
  const f = fixture();
  try {
    const area = randomUUID(),
      task = randomUUID(),
      project = randomUUID(),
      goal = randomUUID(),
      resource = randomUUID();
    f.store.command(f.context, "synthetic.initialize", (db) => {
      db.prepare(
        "INSERT INTO areas(id,user_id,key,name,created_at,updated_at) VALUES(?,?,'coding','Area',?,?)",
      ).run(area, owner, now, now);
      for (const [table, id] of [
        ["tasks", task],
        ["projects", project],
        ["goals", goal],
        ["resources", resource],
      ])
        db.prepare(
          `INSERT INTO ${table}(id,user_id,title,created_at,updated_at) VALUES(?,?,'Source',?,?)`,
        ).run(id, owner, now, now);
    });
    f.command("skill.edit", { name: "Area Skill", area_id: area });
    for (const [type, id] of [
      ["task", task],
      ["project", project],
      ["goal", goal],
      ["resource", resource],
    ])
      f.command("evidence.create", {
        title: type,
        evidence_date: "2026-09-01",
        source_type: type,
        source_id: id,
      });
    for (const e of f.read().evidence)
      expect(e.source_snapshot).toMatchObject({
        title: "Source",
        source_id: e.source_id,
        source_type: e.source_type,
        version: 1,
      });
    f.store.command(f.context, "area.archive", (db) =>
      db
        .prepare("UPDATE areas SET archived_at=? WHERE user_id=? AND id=?")
        .run(now, owner, area),
    );
    const revision = f.read().skill.development_revision;
    expect(() =>
      f.command("skill.edit", { name: "Denied", status: "active" }),
    ).toThrow("SKILL_AREA_UNAVAILABLE");
    expect(f.read().skill.development_revision).toBe(revision);
    for (const source of [randomUUID(), task]) {
      if (source === task)
        f.store.command(f.context, "task.archive", (db) =>
          db
            .prepare("UPDATE tasks SET archived_at=? WHERE user_id=? AND id=?")
            .run(now, owner, task),
        );
      expect(() =>
        f.command("evidence.create", {
          title: "Denied",
          evidence_date: "2026-09-01",
          source_type: "task",
          source_id: source,
        }),
      ).toThrow("SKILL_SOURCE_UNAVAILABLE");
    }
    expect(() =>
      f.command("evidence.create", {
        title: "Future",
        evidence_date: "2999-01-01",
        source_type: "manual_note",
        source_id: null,
      }),
    ).toThrow("SKILL_EVIDENCE_FUTURE");
  } finally {
    f.store.close();
  }
});
it("denies forged/foreign contexts, raw history mutations, identity edits and invalid aggregate commits", () => {
  const f = fixture();
  try {
    const t = f.target(),
      e = f.evidence(),
      r = f.review(t, null, "continue", [{ id: e, revision: 1 }]);
    f.command("review.amend", {
      review_id: r,
      kind: "clarification",
      note: "Clarified",
    });
    for (const context of [
      {} as OwnerContext,
      issueOwnerContext(randomUUID()),
    ]) {
      expect(() =>
        readSqliteSkillDevelopment(f.store, context, f.sid),
      ).toThrow();
      expect(() =>
        skillDevelopmentCommand(f.store, context, f.input("skill.archive", {})),
      ).toThrow();
    }
    for (const table of [
      "skill_evidence_revisions",
      "skill_development_reviews",
      "skill_development_review_evidence",
      "skill_development_review_amendments",
      "skill_command_receipts",
    ])
      for (const op of ["UPDATE", "DELETE"])
        expect(() =>
          f.store.command(f.context, "skill.review.amend", (db) =>
            db.exec(
              op === "DELETE"
                ? `DELETE FROM ${table}`
                : `UPDATE ${table} SET user_id=user_id`,
            ),
          ),
        ).toThrow("SKILL_HISTORY_IMMUTABLE");
    expect(() =>
      f.store.command(f.context, "arbitrary.write", (db) =>
        db
          .prepare("UPDATE skills SET development_revision=99 WHERE id=?")
          .run(f.sid),
      ),
    ).toThrow("SKILL_COMMAND_REQUIRED");
    expect(() =>
      f.store.command(f.context, "skill.skill.edit", (db) =>
        db
          .prepare("UPDATE skills SET id=? WHERE id=?")
          .run(randomUUID(), f.sid),
      ),
    ).toThrow("SKILL_IDENTITY_IMMUTABLE");
    expect(() =>
      f.store.command(f.context, "skill.evidence.correct", (db) =>
        db
          .prepare("UPDATE skill_evidence SET title='fabricated' WHERE id=?")
          .run(e),
      ),
    ).toThrow("SKILL_EVIDENCE_HEAD_INVALID");
    expect(() =>
      f.store.command(f.context, "skill.review.submit", (db) =>
        db
          .prepare(
            "UPDATE skill_development_targets SET status='completed',terminal_review_id=? WHERE id=?",
          )
          .run(r, t),
      ),
    ).toThrow("SKILL_TERMINAL_REVIEW_INVALID");
    const raw = new Database(f.path);
    configureConnection(raw);
    try {
      raw.function("life_owner", () => null);
      raw.function("life_command", () => null);
      expect(() =>
        raw.exec("UPDATE skills SET development_revision=42"),
      ).toThrow();
    } finally {
      raw.close();
    }
  } finally {
    f.store.close();
  }
});
it("task links are active, idempotent owner context and never create evidence", () => {
  const f = fixture();
  try {
    const task = randomUUID();
    f.store.command(f.context, "synthetic.initialize", (db) =>
      db
        .prepare(
          "INSERT INTO tasks(id,user_id,title,created_at,updated_at) VALUES(?,?,'Practice',?,?)",
        )
        .run(task, owner, now, now),
    );
    const a = taskSkillLink(f.store, f.context, {
      taskId: task,
      skillId: f.sid,
    });
    expect(
      taskSkillLink(f.store, f.context, { taskId: task, skillId: f.sid }),
    ).toEqual(a);
    expect(f.read().practice).toHaveLength(1);
    expect(f.read().evidence).toHaveLength(0);
    taskSkillLink(f.store, f.context, { taskId: task, skillId: f.sid }, true);
    expect(f.read().practice).toHaveLength(0);
  } finally {
    f.store.close();
  }
});
it("populated reviews, versioned evidence, receipts and projection survive restart/backup/restore", async () => {
  const f = fixture();
  let store = f.store;
  try {
    const t = f.target(),
      m = f.milestone(t),
      e = f.evidence();
    f.review(t, m, "completed", [{ id: e, revision: 1 }]);
    const r = f.review(t);
    f.command("review.amend", {
      review_id: r,
      kind: "clarification",
      note: "Historical note",
    });
    f.command("evidence.withdraw", { evidence_id: e, reason: "Withdraw" });
    f.command("evidence.restore", { evidence_id: e, reason: "Restore" });
    const current = f.target();
    f.command("target.current", { target_id: current });
    const cm = f.milestone(current);
    f.command("milestone.current", { target_id: current, milestone_id: cm });
    const before = f.read(),
      hashes = inspectSyntheticDatabase(f.path);
    store.close();
    store = new SqliteRuntime(f.path, { syntheticProof: true });
    const backup = join(f.directory, "backup.db"),
      restored = join(f.directory, "restored.db");
    await store.backup(backup);
    expect(inspectSyntheticDatabase(backup)).toEqual(hashes);
    expect(await restoreSyntheticBackup(backup, restored)).toEqual(hashes);
    store.close();
    store = new SqliteRuntime(restored, { syntheticProof: true });
    const after = readSqliteSkillDevelopment(store, f.context, f.sid)!;
    expect({ ...after, as_of: before.as_of }).toEqual(before);
  } finally {
    store.close();
  }
});
it("raw command markers cannot rewrite aggregate revision or insert history without a canonical receipt", () => {
  const f = fixture();
  try {
    const t = f.target(),
      before = f.read();
    expect(() =>
      f.store.command(f.context, "skill.skill.edit", (db) =>
        db
          .prepare(
            "UPDATE skills SET development_revision=development_revision+1 WHERE id=?",
          )
          .run(f.sid),
      ),
    ).toThrow("SKILL_REVISION_SERVER_OWNED");
    expect(() =>
      f.store.command(f.context, "skill.review.submit", (db) =>
        db
          .prepare(
            "INSERT INTO skill_development_reviews(user_id,skill_id,target_id,cycle,decision,note,aggregate_revision,subject_snapshot,milestones_snapshot) VALUES(?,?,?,1,'continue','Fabricated',0,'{}','[]')",
          )
          .run(owner, f.sid, t),
      ),
    ).toThrow("SKILL_REVISION_SERVER_OWNED");
    const after = f.read();
    expect({ ...after, as_of: before.as_of }).toEqual(before);
  } finally {
    f.store.close();
  }
});
it("cross-Skill child/review/evidence tuples are denied and leave no partial effects", () => {
  const f = fixture();
  try {
    const other = skillDevelopmentCommand(f.store, f.context, {
      operation: "skill.create",
      skillId: null,
      expectedRevision: null,
      commandId: randomUUID(),
      payload: { name: "Other" },
    }) as Record<string, string>;
    const otherCmd = (op: string, payload: unknown) =>
      skillDevelopmentCommand(f.store, f.context, {
        operation: op,
        skillId: other.skill_id,
        expectedRevision: readSqliteSkillDevelopment(
          f.store,
          f.context,
          other.skill_id,
        )!.skill.development_revision,
        commandId: randomUUID(),
        payload,
      }) as Record<string, string>;
    const foreignTarget = otherCmd("target.create", {
        title: "Other",
      }).target_id,
      foreignEvidence = otherCmd("evidence.create", {
        title: "Other",
        evidence_date: "2026-09-01",
        source_type: "manual_note",
        source_id: null,
      }).evidence_id;
    const t = f.target(),
      m = f.milestone(t),
      e = f.evidence();
    expect(() =>
      f.command("target.edit", { target_id: foreignTarget, title: "Denied" }),
    ).toThrow("SKILL_TARGET_NOT_FOUND");
    expect(() =>
      otherCmd("milestone.edit", {
        target_id: foreignTarget,
        milestone_id: m,
        title: "Denied",
      }),
    ).toThrow("SKILL_MILESTONE_NOT_FOUND");
    expect(() =>
      f.review(t, null, "completed", [{ id: foreignEvidence, revision: 1 }]),
    ).toThrow("SKILL_EVIDENCE_STALE");
    expect(() =>
      otherCmd("evidence.withdraw", { evidence_id: e, reason: "Denied" }),
    ).toThrow("SKILL_EVIDENCE_NOT_FOUND");
    expect(f.read().reviews).toHaveLength(0);
  } finally {
    f.store.close();
  }
});
it("synthetic cutover preserves a legacy baseline and exact large revision through corrections and recovery", async () => {
  const directory = mkdtempSync(
      join(realpathSync(tmpdir()), "life-os-116-skill-legacy-"),
    ),
    path = join(directory, "synthetic.db"),
    sid = randomUUID(),
    eid = randomUUID(),
    missing = randomUUID(),
    revision = BigInt("9007199254740993");
  initializeSyntheticDatabase(path, owner);
  // Model the pre-command migration cutover in this newly created synthetic DB.
  // Temporarily omit command triggers while importing unchanged legacy rows;
  // reinstall the same versioned guards before opening the native runtime.
  const db = new Database(path);
  configureConnection(db);
  db.function("life_owner", () => owner);
  db.function("life_command", () => null);
  const { skillGuards } = await import("../skill-guards");
  try {
    db.transaction(() => {
      for (const row of db
        .prepare(
          "SELECT name FROM sqlite_schema WHERE type='trigger' AND tbl_name LIKE 'skill%' AND (name LIKE '%_command' OR name LIKE '%_identity')",
        )
        .all() as { name: string }[])
        db.exec(`DROP TRIGGER ${row.name}`);
      db.prepare(
        "INSERT INTO skills(id,user_id,name,development_revision) VALUES(?,?,'Legacy Skill',?)",
      ).run(sid, owner, revision);
      db.prepare(
        "INSERT INTO skill_evidence(id,user_id,skill_id,title,source_type,source_id,evidence_date,weight,created_at,updated_at) VALUES(?,?,?,'Original evidence','task',?,'2025-01-15',3,'2025-01-16T00:00:00.000000Z','2025-02-01T00:00:00.000000Z')",
      ).run(eid, owner, sid, missing);
      db.prepare(
        "INSERT INTO skill_evidence_revisions(user_id,skill_id,evidence_id,revision,title,source_type,source_id,evidence_date,weight,provenance_state,operation) VALUES(?,?,?,1,'Original evidence','task',?,'2025-01-15',3,'legacy_unverified','baseline')",
      ).run(owner, sid, eid, missing);
      // Only these tables were imported; reinstall their original command/identity guards.
      for (const statement of skillGuards.split(/(?=CREATE TRIGGER)/))
        if (
          /CREATE TRIGGER (skills|skill_evidence|skill_evidence_revisions)_(?:insert_command|update_command|delete_command|identity)\b/.test(
            statement,
          )
        )
          db.exec(statement);
    }).immediate();
  } finally {
    db.close();
  }
  let store = new SqliteRuntime(path, { syntheticProof: true });
  const context = issueOwnerContext(owner);
  try {
    const read = () => readSqliteSkillDevelopment(store, context, sid)!;
    const baseline = read().revisions[0];
    expect(baseline).toMatchObject({
      revision: 1,
      operation: "baseline",
      provenance_state: "legacy_unverified",
      source_snapshot: null,
      source_id: missing,
    });
    const cmd = (operation: string, payload: unknown) =>
      skillDevelopmentCommand(store, context, {
        operation,
        skillId: sid,
        commandId: randomUUID(),
        expectedRevision: read().skill.development_revision,
        payload,
      });
    cmd("evidence.withdraw", { evidence_id: eid, reason: "Withdraw legacy" });
    cmd("evidence.restore", { evidence_id: eid, reason: "Restore legacy" });
    expect(read().evidence[0].provenance_state).toBe("legacy_unverified");
    cmd("evidence.correct", {
      evidence_id: eid,
      title: "Explicit observation",
      evidence_date: "2026-09-01",
      source_type: "manual_note",
      source_id: null,
      reason: "Explicit new source",
    });
    expect(read().revisions.find((v) => v.revision === 1)).toEqual(baseline);
    expect(read().skill.development_revision).toBe(
      String(revision + BigInt(3)),
    );
    const before = read(),
      hashes = inspectSyntheticDatabase(path),
      backup = join(directory, "backup.db"),
      restore = join(directory, "restore.db");
    store.close();
    store = new SqliteRuntime(path, { syntheticProof: true });
    await store.backup(backup);
    expect(await restoreSyntheticBackup(backup, restore)).toEqual(hashes);
    store.close();
    store = new SqliteRuntime(restore, { syntheticProof: true });
    expect({ ...read(), as_of: before.as_of }).toEqual(before);
  } finally {
    store.close();
  }
});
it("Current planning demotes atomically and terminal Milestone withdrawal advances only its cycle", () => {
  const f = fixture();
  try {
    const a = f.target(),
      b = f.target(),
      m = f.milestone(a);
    expect(() =>
      f.command("milestone.current", { target_id: a, milestone_id: m }),
    ).toThrow("SKILL_CURRENT_PARENT_INVALID");
    f.command("target.current", { target_id: a });
    f.command("milestone.current", { target_id: a, milestone_id: m });
    f.command("target.current", { target_id: b });
    expect(f.read().milestones[0].status).toBe("planned");
    expect(
      f
        .read()
        .targets.filter((t) => t.status === "current")
        .map((t) => t.id),
    ).toEqual([b]);
    f.command("target.current", { target_id: a });
    f.command("milestone.current", { target_id: a, milestone_id: m });
    f.command("skill.archive", {});
    expect(f.read().targets.some((t) => t.status === "current")).toBe(false);
    expect(f.read().milestones.some((t) => t.status === "current")).toBe(false);
    f.command("skill.restore", {});
    const r = f.review(a, m);
    f.command("review.amend", {
      review_id: r,
      kind: "withdrawal",
      note: "Wrong completion",
    });
    expect(f.read().milestones[0]).toMatchObject({
      status: "planned",
      cycle: 2,
      terminal_review_id: null,
    });
    expect(f.read().targets.find((t) => t.id === a)!.cycle).toBe(1);
    f.command("review.amend", {
      review_id: r,
      kind: "mistaken",
      note: "Historical annotation",
    });
    expect(f.read().milestones[0].cycle).toBe(2);
  } finally {
    f.store.close();
  }
});
it("source edits preserve captured history and canonical receipt payload preserves null and array identity", () => {
  const f = fixture();
  try {
    const task = randomUUID();
    f.store.command(f.context, "synthetic.initialize", (db) =>
      db
        .prepare(
          "INSERT INTO tasks(id,user_id,title,created_at,updated_at) VALUES(?,?,'Original source',?,?)",
        )
        .run(task, owner, now, now),
    );
    const e = f.command("evidence.create", {
      title: "Observed",
      note: "  bounded note  ",
      evidence_date: "2026-09-01",
      source_type: "task",
      source_id: task,
    }).evidence_id;
    const baseline = f.read().revisions[0];
    f.store.command(f.context, "task.edit", (db) =>
      db
        .prepare("UPDATE tasks SET title='New source' WHERE user_id=? AND id=?")
        .run(owner, task),
    );
    expect(f.read().revisions[0]).toEqual(baseline);
    const t = f.target(),
      a = f.milestone(t),
      b = f.milestone(t),
      request = f.input("milestone.reorder", { target_id: t, ids: [b, a] });
    skillDevelopmentCommand(f.store, f.context, request);
    expect(() =>
      skillDevelopmentCommand(f.store, f.context, {
        ...request,
        payload: { target_id: t, ids: [a, b] },
      }),
    ).toThrow("SKILL_COMMAND_KEY_CONFLICT");
    const edit = f.input("skill.edit", { name: "Same", summary: "" });
    skillDevelopmentCommand(f.store, f.context, edit);
    expect(() =>
      skillDevelopmentCommand(f.store, f.context, {
        ...edit,
        payload: { name: "Same", summary: null },
      }),
    ).toThrow("SKILL_COMMAND_KEY_CONFLICT");
    expect(f.read().evidence.find((v) => v.id === e)!.note).toBe(
      "bounded note",
    );
    const receipt = f.store.read(f.context, (db) =>
      db
        .prepare(
          "SELECT request,result FROM skill_command_receipts WHERE user_id=? AND command_id=?",
        )
        .get(owner, edit.commandId),
    ) as { request: string; result: string };
    expect(receipt.request).toContain('"version": 1');
    expect(receipt.request).toContain('"summary": ""');
    expect(receipt.result).toMatch(/"development_revision": [0-9]+/);
  } finally {
    f.store.close();
  }
});
it("reuses current Practice/Recency projections and public stale result without refreshing revision", async () => {
  const f = fixture();
  try {
    const task = randomUUID();
    f.store.command(f.context, "synthetic.initialize", (db) =>
      db
        .prepare(
          "INSERT INTO tasks(id,user_id,title,status,completed_at,created_at,updated_at) VALUES(?,?,'Practice','done',?,?,?)",
        )
        .run(task, owner, now, now, now),
    );
    taskSkillLink(f.store, f.context, { taskId: task, skillId: f.sid });
    f.evidence();
    const read = f.read(),
      projection = skillPracticeReads(
        read.practice as PracticeTask[],
        read.evidence as DevelopmentEvidence[],
        String(read.as_of),
        String(read.timezone),
      );
    expect(projection.completed).toHaveLength(1);
    expect(projection.latestLinkedTaskCompletionAt).toBe(now);
    expect(projection.latestEvidenceDate).toBe("2026-09-01");
    const stale = f.input("skill.edit", { name: "Stale" });
    f.target();
    expect(
      await writeSqliteSkillDevelopment(f.store, f.context, stale),
    ).toMatchObject({
      status: "error",
      message: expect.stringContaining("inzwischen geändert"),
    });
    expect(f.read().skill.name).toBe("Skill");
    expect(
      await writeSqliteSkillDevelopment(
        f.store,
        f.context,
        f.input("skill.edit", { name: "Accepted" }),
      ),
    ).toMatchObject({ status: "success", message: "Skill gespeichert." });
  } finally {
    f.store.close();
  }
});
it("foreign-owner Area/source/Target/Milestone/Review/Evidence rows cannot be linked by Owner A", async () => {
  const f = fixture(),
    foreignOwner = randomUUID(),
    foreignContext = issueOwnerContext(foreignOwner),
    area = randomUUID(),
    task = randomUUID();
  f.store.close();
  const { requireOwnerContext } = await import("../owner-context");
  const { executeSkillInTransaction, parseNativeSkillCommand } =
    await import("../commands/skill-commands");
  const db = new Database(f.path);
  configureConnection(db);
  let marker: string | null = null;
  db.function("life_owner", () => requireOwnerContext(foreignContext));
  db.function("life_command", () => marker);
  let foreignSkill = "",
    revision = 0,
    target = "",
    milestone = "",
    evidence = "",
    review = "";
  try {
    db.transaction(() => {
      db.prepare(
        "INSERT INTO profiles(id,display_name,created_at,updated_at) VALUES(?,'Synthetic Owner B',?,?)",
      ).run(foreignOwner, now, now);
      db.prepare(
        "INSERT INTO areas(id,user_id,key,name,created_at,updated_at) VALUES(?,?,'coding','Foreign Area',?,?)",
      ).run(area, foreignOwner, now, now);
      db.prepare(
        "INSERT INTO tasks(id,user_id,title,created_at,updated_at) VALUES(?,?,'Foreign Source',?,?)",
      ).run(task, foreignOwner, now, now);
      const cmd = (operation: string, payload: unknown) => {
        marker = `skill.${operation}`;
        const c = parseNativeSkillCommand({
          operation,
          payload,
          commandId: randomUUID(),
          skillId: foreignSkill || null,
          expectedRevision: foreignSkill ? String(revision) : null,
        });
        const result = executeSkillInTransaction(db, foreignOwner, c) as Record<
          string,
          string
        >;
        if (foreignSkill) revision++;
        return result;
      };
      foreignSkill = cmd("skill.create", {
        name: "Foreign Skill",
        area_id: area,
      }).skill_id;
      target = cmd("target.create", { title: "Foreign Target" }).target_id;
      milestone = cmd("milestone.create", {
        target_id: target,
        title: "Foreign Step",
      }).milestone_id;
      evidence = cmd("evidence.create", {
        title: "Foreign Evidence",
        evidence_date: "2026-09-01",
        source_type: "task",
        source_id: task,
      }).evidence_id;
      review = cmd("review.submit", {
        target_id: target,
        decision: "continue",
        note: "Foreign Review",
        open_milestones_acknowledged: false,
        evidence: [{ id: evidence, revision: 1 }],
      }).review_id;
    }).immediate();
  } finally {
    db.close();
  }
  const store = new SqliteRuntime(f.path, { syntheticProof: true });
  try {
    const cmd = (operation: string, payload: unknown) =>
      skillDevelopmentCommand(store, f.context, {
        operation,
        payload,
        skillId: f.sid,
        commandId: randomUUID(),
        expectedRevision: readSqliteSkillDevelopment(store, f.context, f.sid)!
          .skill.development_revision,
      });
    const ownTarget = String(
        cmd("target.create", { title: "Owned Target" }).target_id,
      ),
      before = readSqliteSkillDevelopment(store, f.context, f.sid)!;
    expect(() => cmd("skill.edit", { name: "Denied", area_id: area })).toThrow(
      "SKILL_AREA_UNAVAILABLE",
    );
    expect(() =>
      cmd("evidence.create", {
        title: "Denied",
        evidence_date: "2026-09-01",
        source_type: "task",
        source_id: task,
      }),
    ).toThrow("SKILL_SOURCE_UNAVAILABLE");
    expect(() => cmd("target.current", { target_id: target })).toThrow(
      "SKILL_TARGET_NOT_FOUND",
    );
    expect(() =>
      cmd("milestone.edit", {
        target_id: ownTarget,
        milestone_id: milestone,
        title: "Denied",
      }),
    ).toThrow("SKILL_MILESTONE_NOT_FOUND");
    expect(() =>
      cmd("review.amend", {
        review_id: review,
        kind: "clarification",
        note: "Denied",
      }),
    ).toThrow("SKILL_REVIEW_NOT_FOUND");
    expect(() =>
      cmd("evidence.withdraw", { evidence_id: evidence, reason: "Denied" }),
    ).toThrow("SKILL_EVIDENCE_NOT_FOUND");
    expect(() =>
      cmd("review.submit", {
        target_id: ownTarget,
        decision: "completed",
        note: "Denied",
        open_milestones_acknowledged: true,
        evidence: [{ id: evidence, revision: 1 }],
      }),
    ).toThrow("SKILL_EVIDENCE_STALE");
    expect(
      readSqliteSkillDevelopment(store, f.context, foreignSkill),
    ).toBeNull();
    const after = readSqliteSkillDevelopment(store, f.context, f.sid)!;
    expect({ ...after, as_of: before.as_of }).toEqual(before);
  } finally {
    store.close();
  }
});
it("ports SQL partial edits and status-only Area resume without changing omitted definitions", () => {
  const f = fixture();
  try {
    const area = randomUUID();
    f.store.command(f.context, "area.create", (db) =>
      db
        .prepare(
          "INSERT INTO areas(id,user_id,key,name,created_at,updated_at) VALUES(?,?,'coding','Area',?,?)",
        )
        .run(area, owner, now, now),
    );
    f.command("skill.edit", { area_id: area, status: "paused" });
    f.command("skill.edit", { status: "active" });
    f.command("skill.edit", { summary: "Existing active Area retained" });
    expect(f.read().skill).toMatchObject({
      name: "Skill",
      area_id: area,
      status: "active",
      summary: "Existing active Area retained",
    });
    const t = f.target(),
      m = f.milestone(t);
    f.command("target.edit", { target_id: t, description: "Target context" });
    f.command("milestone.edit", {
      target_id: t,
      milestone_id: m,
      description: "Step context",
    });
    expect(f.read().targets[0]).toMatchObject({
      title: "Target",
      description: "Target context",
    });
    expect(f.read().milestones[0]).toMatchObject({
      title: "Step",
      description: "Step context",
    });
    f.store.command(f.context, "area.archive", (db) =>
      db
        .prepare("UPDATE areas SET archived_at=? WHERE user_id=? AND id=?")
        .run(now, owner, area),
    );
    const before = f.read();
    expect(() => f.command("skill.edit", { status: "active" })).toThrow(
      "SKILL_AREA_UNAVAILABLE",
    );
    const after = f.read();
    expect({ ...after, as_of: before.as_of }).toEqual(before);
  } finally {
    f.store.close();
  }
});
it("retains PostgreSQL UUID lookup semantics while receipt payload identity remains text-sensitive", () => {
  const f = fixture();
  try {
    const t = f.target(),
      m = f.milestone(t),
      e = f.evidence();
    f.command("target.current", { target_id: t.toUpperCase() });
    f.command("milestone.current", {
      target_id: t.toUpperCase(),
      milestone_id: m.toUpperCase(),
    });
    f.command("milestone.reorder", {
      target_id: t.toUpperCase(),
      ids: [m.toUpperCase()],
    });
    const r = f.review(t.toUpperCase(), m.toUpperCase(), "completed", [
      { id: e.toUpperCase(), revision: 1 },
    ]);
    expect(f.read().milestones[0].terminal_review_id).toBe(r);
  } finally {
    f.store.close();
  }
});

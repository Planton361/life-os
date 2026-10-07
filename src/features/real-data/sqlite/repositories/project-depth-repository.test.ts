import { randomUUID, createHash } from "node:crypto";
import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { initializeSyntheticDatabase } from "../synthetic-database";
import { configureConnection, SqliteRuntime } from "../runtime";
import { issueOwnerContext, type OwnerContext } from "../owner-context";
import { projectOwnedTables } from "../project-schema";
import { pgJson, projectHash, safeProjectUrl } from "../project-canonical";
import {
  projectDepthCommand,
  readSqliteProjectDepth,
  writeSqliteProjectDepth,
} from "./project-depth-repository";
import { inspectSyntheticDatabase, restoreSyntheticBackup } from "../recovery";
const owner = "11600000-0000-4000-8000-000000000001",
  now = "2026-10-06T10:00:00.123456Z";
function fixture(status = "active", revision = BigInt(0), cycle = BigInt(0)) {
  const path = join(
    mkdtempSync(join(realpathSync(tmpdir()), "life-os-116-project-")),
    "synthetic.db",
  );
  initializeSyntheticDatabase(path, owner);
  const store = new SqliteRuntime(path, { syntheticProof: true }),
    context = issueOwnerContext(owner),
    id = randomUUID(),
    goal = randomUUID();
  store.command(context, "synthetic.initialize", (db) => {
    db.prepare(
      "INSERT INTO goals(id,user_id,title,status,created_at,updated_at) VALUES(?,?,'Goal context','active',?,?)",
    ).run(goal, owner, now, now);
    db.prepare(
      "INSERT INTO projects(id,user_id,title,status,goal_id,completion_revision,completion_cycle,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)",
    ).run(
      id,
      owner,
      "Project contract",
      status,
      goal,
      revision,
      cycle,
      now,
      now,
    );
  });
  const read = (before?: string) =>
    readSqliteProjectDepth(store, context, id, before);
  const input = (
    operation: string,
    payload: unknown,
    key: string = randomUUID(),
  ) => ({
    projectId: id,
    commandId: key,
    operation,
    expectedRevision: read().context.completion_revision,
    expectedCycle: read().context.completion_cycle,
    payload,
  });
  const command = (op: string, payload: unknown, key?: string) =>
    projectDepthCommand(store, context, input(op, payload, key));
  const prepare = () => {
    command("result.set", { desired_result: "  End result  " });
    return String(
      command("criterion.create", {
        text: "Accepted",
        sort_order: "9007199254740993",
      }).criterion_id,
    );
  };
  const review = (decision = "completed") => {
    const c = read().context;
    return {
      fingerprint: c.fingerprint,
      decision,
      result_accepted: decision === "completed",
      rationale: "Accepted after inspection",
      criteria: c.criteria
        .filter((c) => !c.archived_at)
        .map((c) => ({
          id: c.id,
          assessment: decision === "completed" ? "satisfied" : "not_assessed",
          note: null,
        })),
      archived_ids: c.criteria.filter((c) => c.archived_at).map((c) => c.id),
      archived_criteria_acknowledged: c.criteria.some((c) => c.archived_at),
      evidence: [],
      open_work_acknowledged: false,
    };
  };
  const resource = (url = "https://example.test/proof") => {
    const rid = randomUUID(),
      relation = randomUUID();
    store.command(context, "resource.create", (db) => {
      db.prepare(
        "INSERT INTO resources(id,user_id,title,type,url,created_at,updated_at) VALUES(?,?,'Evidence','link',?,?,?)",
      ).run(rid, owner, url, now, now);
      db.prepare(
        "INSERT INTO resource_relations(id,user_id,resource_id,target_type,target_id,relation_type,created_at) VALUES(?,?,?,'project',?,'evidence',?)",
      ).run(relation, owner, rid, id, now);
    });
    return { rid, relation };
  };
  const sql = (query: string, ...args: unknown[]) =>
    store.read(context, (db) => db.prepare(query).all(...args)) as Record<
      string,
      string | bigint | null
    >[];
  return {
    path,
    store,
    context,
    id,
    goal,
    read,
    input,
    command,
    prepare,
    review,
    resource,
    sql,
  };
}
it("installs precisely the seven v4 tables, retains owner/history guards and fail-closed activation", () => {
  const f = fixture();
  try {
    const names = f
      .sql("SELECT name FROM sqlite_schema WHERE type='table'")
      .map((x) => x.name);
    for (const t of projectOwnedTables) expect(names).toContain(t);
    expect(names).not.toContain("project_review_work");
    expect(
      f.sql("SELECT compatibility_ready FROM runtime_metadata")[0]
        .compatibility_ready,
    ).toBe(BigInt(0));
    const c = f.prepare();
    const { relation } = f.resource();
    const r = f.command("review.submit", {
      ...f.review(),
      evidence: [
        {
          relation_id: relation,
          criterion_id: null,
          token: f.read().context.resources[0].token,
        },
      ],
    });
    expect(() =>
      f.command("criterion.edit", { criterion_id: c, text: "Forbidden" }),
    ).toThrow(/FROZEN/);
    f.command("review.amend", {
      review_id: r.review_id,
      kind: "clarification",
      review_resource_id: null,
      reason: "Clarify",
    });
    f.command("project.reopen", {});
    f.command("project.archive", {});
    for (const t of projectOwnedTables.filter(
      (t) => t !== "project_completion_criteria",
    ))
      for (const action of ["UPDATE", "DELETE"])
        expect(() =>
          f.store.command(f.context, "project.review.submit", (db) =>
            db.exec(
              action === "UPDATE"
                ? `UPDATE ${t} SET user_id=user_id`
                : `DELETE FROM ${t}`,
            ),
          ),
        ).toThrow(/IMMUTABLE/);
    expect(() =>
      f.store.command(f.context, "project.review.submit", (db) =>
        db
          .prepare(
            "UPDATE projects SET completion_revision=completion_revision+1 WHERE id=?",
          )
          .run(f.id),
      ),
    ).toThrow(/RECEIPT/);
    expect(() =>
      f.store.command(f.context, "project.project.reopen", (db) =>
        db
          .prepare(
            "UPDATE projects SET status='active',completion_cycle=completion_cycle+1,completion_revision=completion_revision+1 WHERE id=?",
          )
          .run(f.id),
      ),
    ).toThrow(/REOPEN|LIFECYCLE|ARCHIVED/);
    expect(r.status).toBe("completed");
    const raw = new Database(f.path);
    configureConnection(raw);
    raw.function("life_owner", () => null);
    raw.function("life_command", () => null);
    try {
      expect(() =>
        raw
          .prepare(
            "INSERT INTO project_completion_criteria(user_id,project_id,text) VALUES(?,?,'Injected')",
          )
          .run(owner, f.id),
      ).toThrow(/OWNER|COMMAND/);
      expect(() => raw.exec("DELETE FROM project_reviews")).toThrow(
        /OWNER|IMMUTABLE/,
      );
    } finally {
      raw.close();
    }
  } finally {
    f.store.close();
  }
});
it("ports PostgreSQL jsonb byte ordering, spacing, Unicode trim, exact integers and SHA-256 request identity", () => {
  expect(
    pgJson({
      long: 1,
      b: "é",
      aa: BigInt("9007199254740993"),
      é: true,
      a: null,
    }),
  ).toBe('{"a": null, "b": "é", "aa": 9007199254740993, "é": true, "long": 1}');
  expect(projectHash({ b: 2, a: 1 })).toBe(
    createHash("sha256").update('{"a": 1, "b": 2}').digest("hex"),
  );
  const f = fixture(
    "active",
    BigInt("9007199254740993"),
    BigInt("9007199254740994"),
  );
  try {
    const k = randomUUID(),
      req = f.input(
        "result.set",
        { desired_result: "\u00a0\u2003End result\ufeff" },
        k,
      ),
      r = projectDepthCommand(f.store, f.context, req);
    expect(r.completion_revision).toBe("9007199254740994");
    expect(r.completion_cycle).toBe("9007199254740994");
    expect(f.read().context.desired_result).toBe("End result");
    expect(
      projectDepthCommand(f.store, f.context, {
        ...req,
        payload: { desired_result: "End result" },
      }),
    ).toEqual(r);
    expect(
      JSON.stringify(
        projectDepthCommand(f.store, f.context, {
          ...req,
          payload: { desired_result: "End result" },
        }),
      ),
    ).toBe(JSON.stringify(r));
    for (const changed of [
      { projectId: randomUUID() },
      { operation: "project.archive", payload: {} },
      { expectedRevision: "9007199254740994" },
      { expectedCycle: "1" },
      { payload: { desired_result: "Other" } },
    ])
      expect(() =>
        projectDepthCommand(f.store, f.context, { ...req, ...changed }),
      ).toThrow("PROJECT_COMMAND_KEY_CONFLICT");
    const receipt = f.sql("SELECT * FROM project_command_receipts")[0];
    expect(receipt.request_fingerprint).toBe(
      createHash("sha256")
        .update(String(receipt.request_payload))
        .digest("hex"),
    );
    expect(() =>
      f.command("criterion.create", {
        text: "Exact",
        sort_order: 9007199254740992,
      }),
    ).toThrow();
  } finally {
    f.store.close();
  }
});
it("implements result and all Criterion commands, no-ops, exact order, stale protection, bounds and archive metadata", () => {
  const f = fixture();
  try {
    const id = f.prepare();
    expect(f.read().context.criteria[0].sort_order).toBe("9007199254740993");
    const rev = f.read().context.completion_revision;
    expect(
      f.command("criterion.edit", { criterion_id: id, text: " Accepted " })
        .no_op,
    ).toBe(true);
    expect(f.read().context.completion_revision).toBe(rev);
    f.command("criterion.edit", { criterion_id: id, text: "Revised" });
    f.command("criterion.reorder", {
      criterion_id: id,
      sort_order: "9223372036854775807",
    });
    const stale = {
      ...f.input("criterion.archive", {
        criterion_id: id,
        reason: "Explicit removal",
      }),
      expectedRevision: rev,
    };
    expect(() => projectDepthCommand(f.store, f.context, stale)).toThrow(
      "PROJECT_STALE",
    );
    const r = f.command("criterion.archive", {
      criterion_id: id,
      reason: " Explicit removal ",
    });
    expect(f.read().context.criteria[0]).toMatchObject({
      archive_reason: "Explicit removal",
      archived_cycle: "0",
      archived_revision: r.completion_revision,
    });
    expect(() =>
      f.command("criterion.edit", { criterion_id: id, text: "Again" }),
    ).toThrow("PROJECT_CRITERION_NOT_FOUND");
    expect(() =>
      f.command("result.set", { desired_result: "x".repeat(4001) }),
    ).toThrow();
    expect(() =>
      f.command("criterion.create", { text: " ", sort_order: "0" }),
    ).toThrow();
    f.command("result.set", { desired_result: "\u00a0" });
    expect(f.read().context.desired_result).toBeNull();
    for (const status of ["idea", "active", "paused", "blocked"])
      expect(f.command("project.status.set", { status }).status).toBe(status);
    expect(() =>
      f.command("project.status.set", { status: "completed" }),
    ).toThrow();
  } finally {
    f.store.close();
  }
});
it("keeps continue distinct, acknowledges current-cycle archived scope, captures immutable review basis and normalizes semantic sets on replay", () => {
  const f = fixture();
  try {
    f.prepare();
    const c2 = String(
        f.command("criterion.create", { text: "Second", sort_order: "1" })
          .criterion_id,
      ),
      arch = String(
        f.command("criterion.create", { text: "Removed", sort_order: "2" })
          .criterion_id,
      );
    f.command("criterion.archive", {
      criterion_id: arch,
      reason: "Explicit exclusion",
    });
    const { relation } = f.resource("https://example.test/proof?secret=value"),
      ctx = f.read().context,
      token = ctx.resources[0].token;
    const payload = {
      ...f.review("continue"),
      criteria: ctx.criteria
        .filter((c) => !c.archived_at)
        .map((c) => ({
          id: c.id,
          assessment: c.id === c2 ? "not_satisfied" : "satisfied",
          note: c.id === c2 ? " Remaining " : "",
        })),
      archived_notes: [{ id: arch, note: " Explained " }],
      evidence: [
        { relation_id: relation, criterion_id: null, token, note: "" },
        {
          relation_id: relation,
          criterion_id: c2,
          token,
          note: " Version one ",
        },
      ],
    };
    const req = f.input("review.submit", payload),
      r = projectDepthCommand(f.store, f.context, req);
    expect(r.status).toBe("active");
    expect(r.completion_cycle).toBe("0");
    expect(f.read().context.fingerprint).not.toBe(ctx.fingerprint);
    expect(
      projectDepthCommand(f.store, f.context, {
        ...req,
        payload: {
          ...payload,
          rationale: " Accepted after inspection ",
          criteria: [...payload.criteria].reverse(),
          evidence: [...payload.evidence].reverse(),
        },
      }),
    ).toEqual(r);
    const depth = f.read();
    expect(depth.reviews[0]).toMatchObject({
      result_accepted: false,
      goal_id_snapshot: f.goal,
      goal_title_snapshot: "Goal context",
      revision_before: ctx.completion_revision,
      completion_cycle: "0",
    });
    expect(
      depth.criteriaSnapshots.find((c) => c.criterion_id === arch),
    ).toMatchObject({
      was_archived: true,
      decision: "excluded",
      rationale: "Explained",
      archive_reason_snapshot: "Explicit exclusion",
      archived_cycle_snapshot: "0",
    });
    expect(depth.resourceSnapshots).toHaveLength(2);
    expect(
      depth.resourceSnapshots.every((r) => r.safe_url_snapshot === null),
    ).toBe(true);
    for (const change of [
      { result_accepted: true },
      { open_work_acknowledged: true },
      { open_work_disposition: "Forbidden" },
      { criteria: [{ id: c2, assessment: "not_satisfied" }] },
    ])
      expect(() =>
        f.command("review.submit", { ...f.review("continue"), ...change }),
      ).toThrow();
    f.command("criterion.edit", { criterion_id: c2, text: "Later criterion" });
    f.store.command(f.context, "resource.update", (db) => {
      db.prepare(
        "UPDATE resources SET title='Renamed',url='https://example.test/changed' WHERE id=?",
      ).run(ctx.resources[0].id);
      db.prepare("UPDATE goals SET title='Renamed Goal' WHERE id=?").run(
        f.goal,
      );
    });
    expect(f.read().reviews[0].goal_title_snapshot).toBe("Goal context");
    expect(f.read().resourceSnapshots[0].title_snapshot).toBe("Evidence");
    expect(
      f.read().criteriaSnapshots.find((c) => c.criterion_id === c2)
        ?.text_snapshot,
    ).toBe("Second");
  } finally {
    f.store.close();
  }
});
it("requires complete exact Criterion assessments, desired result and explicit open-work disposition; counts and complete work context stale independently of revision", () => {
  const f = fixture();
  try {
    const c = f.prepare();
    f.store.command(f.context, "task.create", (db) => {
      for (const status of ["planned", "done", "canceled", "archived"])
        db.prepare(
          "INSERT INTO tasks(id,user_id,project_id,title,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)",
        ).run(randomUUID(), owner, f.id, status, status, now, now);
      for (const [i, status] of ["open", "done"].entries())
        db.prepare(
          "INSERT INTO project_milestones(id,user_id,project_id,title,status,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)",
        ).run(randomUUID(), owner, f.id, status, status, i, now, now);
    });
    const ctx = f.read().context,
      req = f.input("review.submit", f.review());
    expect(() => projectDepthCommand(f.store, f.context, req)).toThrow(
      "PROJECT_OPEN_WORK_ACK_REQUIRED",
    );
    for (const criteria of [
      [],
      [{ id: randomUUID(), assessment: "satisfied" }],
      [
        { id: c, assessment: "satisfied" },
        { id: c, assessment: "satisfied" },
      ],
    ])
      expect(() =>
        f.command("review.submit", {
          ...f.review(),
          criteria,
          open_work_acknowledged: true,
          open_work_disposition: "Optional work",
        }),
      ).toThrow();
    f.store.command(f.context, "task.edit", (db) =>
      db
        .prepare(
          "UPDATE tasks SET title='Renamed same counts' WHERE project_id=? AND status='planned'",
        )
        .run(f.id),
    );
    expect(f.read().context.completion_revision).toBe(ctx.completion_revision);
    expect(f.read().context.fingerprint).not.toBe(ctx.fingerprint);
    expect(() =>
      f.command("review.submit", {
        ...(req.payload as object),
        open_work_acknowledged: true,
        open_work_disposition: "Optional",
      }),
    ).toThrow("PROJECT_STALE_CONTEXT");
    f.command("review.submit", {
      ...f.review(),
      open_work_acknowledged: true,
      open_work_disposition: "Retain optional work",
    });
    expect(f.read().reviews[0]).toMatchObject({
      open_task_count: 1,
      done_task_count: 1,
      canceled_task_count: 1,
      open_milestone_count: 1,
      done_milestone_count: 1,
      result_accepted: true,
    });
    expect(
      f.sql(
        "SELECT status FROM tasks WHERE project_id=? AND status='planned'",
        f.id,
      ),
    ).toHaveLength(1);
  } finally {
    f.store.close();
  }
});
it("preserves resource token/private locator behavior and rolls back after snapshot failure", () => {
  const f = fixture();
  try {
    f.prepare();
    const { rid, relation } = f.resource();
    for (const url of [
      "https://user:credential@example.test/a",
      "https://example.test/a?token=secret",
      "https://example.test/a#secret",
      "ftp://example.test/a",
      "javascript:alert(1)",
      "https://example.test/a",
    ]) {
      expect(safeProjectUrl(url)).toBe(
        url === "https://example.test/a" ? url : null,
      );
      f.store.command(f.context, "resource.edit", (db) =>
        db.prepare("UPDATE resources SET url=? WHERE id=?").run(url, rid),
      );
      const c = f.read().context;
      const review = f.command("review.submit", {
        ...f.review("continue"),
        evidence: [
          {
            relation_id: relation,
            criterion_id: null,
            token: c.resources[0].token,
          },
        ],
      });
      expect(
        f
          .read()
          .resourceSnapshots.find((s) => s.review_id === review.review_id)!
          .safe_url_snapshot,
      ).toBe(url === "https://example.test/a" ? url : null);
    }
    const ctx = f.read().context,
      payload = {
        ...f.review("continue"),
        evidence: [
          {
            relation_id: relation,
            criterion_id: null,
            token: ctx.resources[0].token,
          },
        ],
      };
    f.store.command(f.context, "resource.edit", (db) =>
      db.prepare("UPDATE resources SET title='Changed' WHERE id=?").run(rid),
    );
    expect(f.read().context.fingerprint).toBe(ctx.fingerprint);
    expect(() => f.command("review.submit", payload)).toThrow(
      "PROJECT_STALE_RESOURCE",
    );
    const raw = new Database(f.path);
    configureConnection(raw);
    raw.exec(
      "CREATE TRIGGER synthetic_snapshot_failure AFTER INSERT ON project_review_criteria BEGIN SELECT RAISE(ABORT,'SYNTHETIC_SNAPSHOT_FAILURE'); END;",
    );
    raw.close();
    const before = inspectSyntheticDatabase(f.path);
    expect(() => f.command("review.submit", f.review())).toThrow(
      "SYNTHETIC_SNAPSHOT_FAILURE",
    );
    expect(inspectSyntheticDatabase(f.path)).toEqual(before);
  } finally {
    f.store.close();
  }
});
it("couples mistaken current Review to reopen, retains prior-cycle snapshots, supports withdrawals/clarifications and archive-safe amendments", () => {
  const f = fixture();
  try {
    f.prepare();
    const archived = String(
      f.command("criterion.create", { text: "Removed", sort_order: "1" })
        .criterion_id,
    );
    f.command("criterion.archive", {
      criterion_id: archived,
      reason: "Excluded",
    });
    const { relation } = f.resource(),
      token = f.read().context.resources[0].token;
    const r = f.command("review.submit", {
      ...f.review(),
      evidence: [{ relation_id: relation, criterion_id: null, token }],
    });
    expect(f.read().context.current_completion_review_id).toBe(r.review_id);
    expect(f.read().completionReviewHistoryBefore).toBe(
      String(BigInt(String(r.completion_revision)) + BigInt(1)),
    );
    const snapshot = f.read().resourceSnapshots[0].id;
    f.command("review.amend", {
      review_id: r.review_id,
      kind: "evidence_withdrawn",
      review_resource_id: snapshot,
      reason: "Wrong evidence",
    });
    expect(() =>
      f.command("review.amend", {
        review_id: r.review_id,
        kind: "evidence_withdrawn",
        review_resource_id: snapshot,
        reason: "Again",
      }),
    ).toThrow();
    const corrected = f.command("review.amend", {
      review_id: r.review_id,
      kind: "marked_mistaken",
      review_resource_id: null,
      reason: "Mistaken acceptance",
    });
    expect(corrected.status).toBe("active");
    expect(corrected.completion_cycle).toBe("1");
    expect(f.read().context.criteria).toHaveLength(1);
    expect(f.read().lifecycle[0]).toMatchObject({
      prior_review_id: r.review_id,
      prior_completion_kind: "review",
      mistaken_completion: true,
      cycle_before: "0",
      cycle_after: "1",
    });
    f.command("review.submit", f.review());
    f.command("project.archive", { reason: "Retained history" });
    f.command("review.amend", {
      review_id: r.review_id,
      kind: "clarification",
      review_resource_id: null,
      reason: "Historical correction after archive",
    });
    expect(f.read().context.status).toBe("archived");
    expect(f.read().reviews).toHaveLength(2);
    expect(
      f.read().criteriaSnapshots.some((c) => c.criterion_id === archived),
    ).toBe(true);
  } finally {
    f.store.close();
  }
  const legacy = fixture("completed");
  try {
    expect(legacy.read().context.current_completion_review_id).toBeNull();
    expect(legacy.read().completionReviewHistoryBefore).toBeNull();
    expect(legacy.read().reviews).toHaveLength(0);
    legacy.command("project.reopen", {
      mistaken_completion: true,
      reason: "Legacy mistake",
    });
    expect(legacy.read().lifecycle[0]).toMatchObject({
      prior_completion_kind: "legacy_without_review",
      prior_review_id: null,
      mistaken_completion: true,
    });
    expect(legacy.read().amendments).toHaveLength(0);
  } finally {
    legacy.store.close();
  }
});
it("reproduces >50-item pagination without splitting coupled revisions and restores oldest complete Review detail/amendments", () => {
  const f = fixture();
  try {
    f.prepare();
    const r = f.command("review.submit", f.review());
    f.command("review.amend", {
      review_id: r.review_id,
      kind: "marked_mistaken",
      review_resource_id: null,
      reason: "Correction",
    });
    for (let n = 4; n <= 52; n++)
      f.command("review.amend", {
        review_id: r.review_id,
        kind: "clarification",
        review_resource_id: null,
        reason: `Chronological note ${n}`,
      });
    const first = f.read();
    expect(first.historyItems).toHaveLength(51);
    expect(first.lifecycle).toHaveLength(1);
    expect(first.nextRevision).toBe("4");
    expect(first.reviews).toHaveLength(0);
    const older = f.read("4");
    expect(older.historyItems).toHaveLength(1);
    expect(older.criteriaSnapshots).toHaveLength(1);
    expect(older.reviews).toHaveLength(1);
    expect(older.amendments).toHaveLength(50);
    expect(older.nextRevision).toBeNull();
  } finally {
    f.store.close();
  }
});
it("denies unauthenticated/forged/other-owner contexts and cross-Project Criterion/Review/Resource links", async () => {
  const f = fixture();
  try {
    f.prepare();
    const req = f.input("project.archive", {});
    for (const ctx of [
      null,
      {} as OwnerContext,
      { ownerId: owner } as OwnerContext,
      issueOwnerContext(randomUUID()),
    ]) {
      expect(() =>
        readSqliteProjectDepth(f.store, ctx as OwnerContext, f.id),
      ).toThrow(/OWNER/);
      expect(() =>
        projectDepthCommand(f.store, ctx as OwnerContext, req),
      ).toThrow(/OWNER/);
    }
    for (const [op, payload] of [
      ["criterion.edit", { criterion_id: randomUUID(), text: "Foreign" }],
      ["criterion.archive", { criterion_id: randomUUID(), reason: "Foreign" }],
      [
        "review.amend",
        {
          review_id: randomUUID(),
          kind: "clarification",
          review_resource_id: null,
          reason: "Foreign",
        },
      ],
      [
        "review.submit",
        {
          ...f.review(),
          evidence: [
            {
              relation_id: randomUUID(),
              criterion_id: null,
              token: "a".repeat(64),
            },
          ],
        },
      ],
    ] as const)
      expect(() => f.command(op, payload)).toThrow(/NOT_FOUND|UNAVAILABLE/);
    const stale = await writeSqliteProjectDepth(f.store, f.context, {
      ...req,
      expectedRevision: "0",
    });
    expect(stale).toEqual({
      ok: false,
      message:
        "Project wurde inzwischen geändert. Entwurf behalten, Seite bewusst neu laden und erneut prüfen.",
    });
  } finally {
    f.store.close();
  }
});
it("fails closed at Criteria/Work/Resource and serialized context bounds", () => {
  for (const kind of ["criteria", "work", "resources", "bytes"]) {
    const f = fixture();
    try {
      f.store.command(f.context, "synthetic.initialize", (db) => {
        const n = kind === "work" ? 5001 : kind === "bytes" ? 3 : 1001;
        for (let i = 0; i < n; i++) {
          if (kind === "criteria")
            db.prepare(
              "INSERT INTO project_completion_criteria(user_id,project_id,text) VALUES(?,?,'Criterion')",
            ).run(owner, f.id);
          else if (kind === "work" || kind === "bytes")
            db.prepare(
              "INSERT INTO tasks(id,user_id,project_id,title,created_at,updated_at) VALUES(?,?,?,?,?,?)",
            ).run(
              randomUUID(),
              owner,
              f.id,
              kind === "bytes" ? "x".repeat(800000) : "Work",
              now,
              now,
            );
          else {
            const id = randomUUID();
            db.prepare(
              "INSERT INTO resources(id,user_id,title,created_at,updated_at) VALUES(?,?,'Resource',?,?)",
            ).run(id, owner, now, now);
            db.prepare(
              "INSERT INTO resource_relations(id,user_id,resource_id,target_type,target_id,created_at) VALUES(?,?,?,'project',?,?)",
            ).run(randomUUID(), owner, id, f.id, now);
          }
        }
      });
      expect(() => f.read()).toThrow("PROJECT_CONTEXT_LIMIT");
    } finally {
      f.store.close();
    }
  }
});
it("preserves populated Project Depth IDs/hashes/projection across restart, online backup and fresh restore", async () => {
  const f = fixture(
    "active",
    BigInt("9007199254740993"),
    BigInt("9007199254740993"),
  );
  f.prepare();
  const arch = String(
    f.command("criterion.create", { text: "Archived", sort_order: "1" })
      .criterion_id,
  );
  f.command("criterion.archive", { criterion_id: arch, reason: "Excluded" });
  const { relation } = f.resource();
  const token = f.read().context.resources[0].token,
    r = f.command("review.submit", {
      ...f.review(),
      evidence: [{ relation_id: relation, criterion_id: null, token }],
    });
  f.command("review.amend", {
    review_id: r.review_id,
    kind: "clarification",
    review_resource_id: null,
    reason: "History note",
  });
  f.command("project.reopen", {
    mistaken_completion: true,
    reason: "Correct acceptance",
  });
  f.command("project.archive", { reason: "Keep immutable history" });
  const projection = f.read(),
    original = inspectSyntheticDatabase(f.path);
  f.store.close();
  const restarted = new SqliteRuntime(f.path, { syntheticProof: true });
  try {
    expect(readSqliteProjectDepth(restarted, f.context, f.id)).toEqual({
      ...projection,
      context: { ...projection.context, work_observed_at: expect.any(String) },
    });
    const backup = join(
        mkdtempSync(
          join(realpathSync(tmpdir()), "life-os-116-project-backup-"),
        ),
        "backup.db",
      ),
      restored = join(
        mkdtempSync(
          join(realpathSync(tmpdir()), "life-os-116-project-restored-"),
        ),
        "restored.db",
      );
    await restarted.backup(backup);
    expect(inspectSyntheticDatabase(backup)).toEqual(original);
    expect(await restoreSyntheticBackup(backup, restored)).toEqual(original);
    const restoreStore = new SqliteRuntime(restored, { syntheticProof: true });
    try {
      const recovered = readSqliteProjectDepth(restoreStore, f.context, f.id);
      expect({
        ...recovered,
        context: {
          ...recovered.context,
          work_observed_at: (
            projection.context as unknown as { work_observed_at: string }
          ).work_observed_at,
        },
      }).toEqual(projection);
    } finally {
      restoreStore.close();
    }
  } finally {
    restarted.close();
  }
});
it("keeps metadata revision server-owned and ignores serialization-only timestamps; fails raw Criteria/snapshot/receipt bypasses atomically", () => {
  const f = fixture();
  try {
    f.prepare();
    const old = f.read().context;
    f.store.command(f.context, "project.update", (db) =>
      db
        .prepare("UPDATE projects SET title='Metadata changed' WHERE id=?")
        .run(f.id),
    );
    expect(f.read().context.completion_revision).toBe(
      String(BigInt(old.completion_revision) + BigInt(1)),
    );
    const ctx = f.read().context;
    f.store.command(f.context, "project.serialize", (db) =>
      db
        .prepare("UPDATE projects SET updated_at=life_now() WHERE id=?")
        .run(f.id),
    );
    expect(f.read().context.completion_revision).toBe(ctx.completion_revision);
    expect(f.read().context.fingerprint).toBe(ctx.fingerprint);
    for (const kind of ["project.update", "project.metadata"])
      expect(() =>
        f.store.command(f.context, kind, (db) =>
          db
            .prepare(
              "UPDATE projects SET completion_revision=completion_revision+1 WHERE id=?",
            )
            .run(f.id),
        ),
      ).toThrow(/REVISION|RECEIPT/);
    expect(() =>
      f.store.command(f.context, "criterion.create", (db) =>
        db
          .prepare(
            "INSERT INTO project_completion_criteria(user_id,project_id,text) VALUES(?,?,'Injected')",
          )
          .run(owner, f.id),
      ),
    ).toThrow("PROJECT_COMMAND_REQUIRED");
    expect(() =>
      f.store.command(f.context, "project.criterion.create", (db) =>
        db
          .prepare(
            "INSERT INTO project_completion_criteria(user_id,project_id,text) VALUES(?,?,'No receipt')",
          )
          .run(owner, f.id),
      ),
    ).toThrow(/RECEIPT/);
    const completion = f.command("review.submit", f.review()),
      criterion = f.read().context.criteria[0],
      before = inspectSyntheticDatabase(f.path);
    expect(() =>
      f.store.command(f.context, "project.review.submit", (db) =>
        db
          .prepare(
            "INSERT INTO project_review_criteria(user_id,project_id,review_id,criterion_id,text_snapshot,sort_order_snapshot,decision,was_archived) VALUES(?,?,?,?,?,?,?,?)",
          )
          .run(
            owner,
            f.id,
            completion.review_id,
            criterion.id,
            "Forged",
            BigInt(criterion.sort_order),
            "satisfied",
            0,
          ),
      ),
    ).toThrow(/SNAPSHOT/);
    expect(inspectSyntheticDatabase(f.path)).toEqual(before);
  } finally {
    f.store.close();
  }
});
it("denies actual cross-owner and cross-Project links, preserves independent owner success and completion legacy identity", () => {
  const f = fixture(),
    other = fixture();
  try {
    other.prepare();
    expect(other.command("review.submit", other.review()).status).toBe(
      "completed",
    );
    const second = randomUUID();
    f.store.command(f.context, "project.create", (db) =>
      db
        .prepare(
          "INSERT INTO projects(id,user_id,title,created_at,updated_at) VALUES(?,?,'Other Project',?,?)",
        )
        .run(second, owner, now, now),
    );
    const c = projectDepthCommand(f.store, f.context, {
      projectId: second,
      commandId: randomUUID(),
      operation: "criterion.create",
      expectedRevision: "0",
      expectedCycle: "0",
      payload: { text: "Other criterion", sort_order: "0" },
    });
    const depth = readSqliteProjectDepth(f.store, f.context, second),
      r = projectDepthCommand(f.store, f.context, {
        projectId: second,
        commandId: randomUUID(),
        operation: "review.submit",
        expectedRevision: "1",
        expectedCycle: "0",
        payload: {
          ...f.review("continue"),
          fingerprint: depth.context.fingerprint,
          criteria: [{ id: c.criterion_id, assessment: "not_assessed" }],
        },
      });
    expect(() =>
      f.command("criterion.edit", {
        criterion_id: c.criterion_id,
        text: "Wrong project",
      }),
    ).toThrow("PROJECT_CRITERION_NOT_FOUND");
    expect(() =>
      f.command("review.amend", {
        review_id: r.review_id,
        kind: "clarification",
        review_resource_id: null,
        reason: "Wrong project",
      }),
    ).toThrow("PROJECT_REVIEW_NOT_FOUND");
    const ownerB = randomUUID(),
      projectB = randomUUID(),
      resourceB = randomUUID(),
      raw = new Database(f.path);
    configureConnection(raw);
    let scopedOwner = ownerB;
    raw.function("life_owner", () => scopedOwner);
    raw.function("life_command", () => "project.create");
    try {
      raw
        .prepare("INSERT INTO profiles(id,created_at,updated_at) VALUES(?,?,?)")
        .run(ownerB, now, now);
      raw
        .prepare(
          "INSERT INTO projects(id,user_id,title,created_at,updated_at) VALUES(?,?,'Owner B project',?,?)",
        )
        .run(projectB, ownerB, now, now);
      raw
        .prepare(
          "INSERT INTO resources(id,user_id,title,created_at,updated_at) VALUES(?,?,'Owner B resource',?,?)",
        )
        .run(resourceB, ownerB, now, now);
      scopedOwner = owner;
      expect(() =>
        raw
          .prepare(
            "INSERT INTO resource_relations(id,user_id,resource_id,target_type,target_id,created_at) VALUES(?,?,?,'project',?,?)",
          )
          .run(randomUUID(), owner, resourceB, f.id, now),
      ).toThrow(/FOREIGN KEY/);
      expect(() =>
        raw
          .prepare(
            "INSERT INTO resource_relations(id,user_id,resource_id,target_type,target_id,created_at) VALUES(?,?,?,'project',?,?)",
          )
          .run(randomUUID(), owner, resourceB, projectB, now),
      ).toThrow(/PROJECT_NOT_FOUND|FOREIGN KEY/);
    } finally {
      raw.close();
    }
    expect(() => readSqliteProjectDepth(f.store, f.context, projectB)).toThrow(
      "PROJECT_NOT_FOUND",
    );
    expect(() =>
      projectDepthCommand(f.store, f.context, {
        projectId: projectB,
        commandId: randomUUID(),
        operation: "project.archive",
        expectedRevision: "0",
        expectedCycle: "0",
        payload: {},
      }),
    ).toThrow("PROJECT_NOT_FOUND");
  } finally {
    f.store.close();
    other.store.close();
  }
});
it("resolves current completion Review and its exact UI history cursor beyond fifty later amendments", () => {
  const f = fixture();
  try {
    f.prepare();
    const r = f.command("review.submit", f.review());
    for (let n = 0; n < 55; n++)
      f.command("review.amend", {
        review_id: r.review_id,
        kind: "clarification",
        review_resource_id: null,
        reason: `Current completion explanation ${n}`,
      });
    const current = f.read();
    expect(current.context.status).toBe("completed");
    expect(current.context.current_completion_review_id).toBe(r.review_id);
    expect(current.completionReviewHistoryBefore).toBe("4");
    expect(current.reviews).toHaveLength(0);
    const detail = f.read(current.completionReviewHistoryBefore!);
    expect(detail.reviews[0].id).toBe(r.review_id);
    expect(detail.criteriaSnapshots).toHaveLength(1);
    expect(detail.amendments).toHaveLength(55);
    expect(detail.nextRevision).toBeNull();
  } finally {
    f.store.close();
  }
});
it("preserves v4 canonical defaults on direct native requests and rejects oversized or non-PostgreSQL text before effects", () => {
  const f = fixture();
  try {
    const c = f.read().context,
      key = randomUUID(),
      input = f.input(
        "review.submit",
        {
          fingerprint: c.fingerprint,
          decision: "continue",
          rationale: "  Continue without Criteria  ",
          criteria: [],
          archived_ids: [],
          evidence: [],
        },
        key,
      );
    const result = projectDepthCommand(f.store, f.context, input);
    expect(result.status).toBe("active");
    expect(f.read().criteriaSnapshots).toHaveLength(0);
    expect(
      projectDepthCommand(f.store, f.context, {
        ...input,
        payload: {
          ...(input.payload as object),
          result_accepted: false,
          archived_criteria_acknowledged: false,
          open_work_acknowledged: false,
          archived_notes: [],
          open_work_disposition: null,
        },
      }),
    ).toEqual(result);
    f.command("review.amend", {
      review_id: result.review_id,
      kind: "clarification",
      reason: "Native default",
    });
    expect(f.read().amendments).toHaveLength(1);
    expect(() =>
      f.command("result.set", { desired_result: "x".repeat(1048577) }),
    ).toThrow("PROJECT_PAYLOAD_LIMIT");
    expect(() =>
      f.command("result.set", { desired_result: "bad\u0000text" }),
    ).toThrow("PROJECT_TEXT_INVALID");
    const criterion = f.command("criterion.create", {
      text: "Needs result",
      sort_order: "0",
    });
    expect(criterion.criterion_id).toBeTruthy();
    expect(() => f.command("review.submit", f.review())).toThrow(
      "PROJECT_COMPLETION_PRECONDITION",
    );
  } finally {
    f.store.close();
  }
});

import type Database from "better-sqlite3";
import {
  projectCommandKinds,
  parseProjectJson,
  pgJson,
  type Canonical,
} from "./project-canonical";
import { createHash } from "node:crypto";
import {
  projectOne as one,
  projectRows as rows,
  projectReviewContext,
  type ProjectRow,
} from "./repositories/project-depth-read";
export function projectCommitSnapshot(db: Database.Database, owner: string) {
  const tables = [
    "project_completion_criteria",
    "project_reviews",
    "project_review_criteria",
    "project_review_resources",
    "project_lifecycle_events",
    "project_review_amendments",
    "project_command_receipts",
  ];
  return {
    projects: new Map(
      rows(
        db,
        "SELECT p.*,g.title AS goal_title FROM projects p LEFT JOIN goals g ON g.user_id=p.user_id AND g.id=p.goal_id WHERE p.user_id=?",
        owner,
      ).map((p) => [String(p.id), p]),
    ),
    floors: new Map(
      tables.map((t) => [
        t,
        one(db, `SELECT coalesce(max(rowid),0) AS n FROM ${t}`)!.n as bigint,
      ]),
    ),
    criteria: new Map(
      rows(
        db,
        "SELECT * FROM project_completion_criteria WHERE user_id=?",
        owner,
      ).map((c) => [String(c.id), c]),
    ),
  };
}
const metadata = [
  "title",
  "description",
  "priority",
  "area_id",
  "goal_id",
  "status",
  "archived_at",
  "desired_result",
  "completion_cycle",
];
export function advanceProjectMetadata(
  db: Database.Database,
  owner: string,
  before: ReturnType<typeof projectCommitSnapshot>,
  admit: () => void,
) {
  const kind = one(db, "SELECT life_command() AS kind")!.kind as string;
  if (kind === "synthetic.initialize" || projectCommandKinds.has(kind)) return;
  for (const p of rows(db, "SELECT * FROM projects WHERE user_id=?", owner)) {
    const old = before.projects.get(String(p.id));
    if (old && metadata.some((k) => old[k] !== p[k])) {
      admit();
      db.prepare(
        "UPDATE projects SET completion_revision=completion_revision+1 WHERE user_id=? AND id=?",
      ).run(owner, p.id);
    }
  }
}
export function validateProjectCommit(
  db: Database.Database,
  owner: string,
  before: ReturnType<typeof projectCommitSnapshot>,
) {
  if (
    one(db, "SELECT life_command() AS kind")!.kind === "synthetic.initialize" &&
    one(db, "SELECT dataset_kind FROM runtime_metadata")!.dataset_kind ===
      "synthetic"
  )
    return;
  const added = (table: string) =>
    rows(
      db,
      `SELECT * FROM ${table} WHERE user_id=? AND rowid>?`,
      owner,
      before.floors.get(table),
    );
  const receipts = added("project_command_receipts"),
    reviews = added("project_reviews"),
    lifecycle = added("project_lifecycle_events"),
    amendments = added("project_review_amendments");
  const fail = (code: string) => {
    throw new Error(code);
  };
  const parsed = receipts.map((r) => {
    const request = parseProjectJson(String(r.request_payload)) as {
      version: bigint;
      command_kind: string;
      project_id: string;
      expected_revision: string;
      expected_cycle: string;
      payload: Record<string, unknown>;
    };
    const result = JSON.parse(String(r.result_payload)) as Record<
      string,
      unknown
    >;
    if (
      pgJson(parseProjectJson(String(r.request_payload))) !==
        r.request_payload ||
      r.request_fingerprint !==
        createHash("sha256").update(String(r.request_payload)).digest("hex") ||
      request.version !== BigInt(1) ||
      request.command_kind !== r.command_kind ||
      request.project_id !== r.project_id ||
      one(db, "SELECT life_command() AS k")!.k !==
        `project.${r.command_kind}` ||
      result.project_id !== r.project_id ||
      result.command_id !== r.command_id ||
      result.operation !== r.command_kind
    )
      fail("PROJECT_RECEIPT_INVALID");
    const old = before.projects.get(String(r.project_id)),
      p = one(
        db,
        "SELECT * FROM projects WHERE user_id=? AND id=?",
        owner,
        r.project_id,
      )!;
    if (
      !old ||
      request.expected_revision !== String(old.completion_revision) ||
      request.expected_cycle !== String(old.completion_cycle) ||
      result.completion_revision !== String(p.completion_revision) ||
      result.completion_cycle !== String(p.completion_cycle) ||
      result.status !== p.status ||
      typeof result.no_op !== "boolean" ||
      p.completion_revision !==
        (old.completion_revision as bigint) +
          (result.no_op ? BigInt(0) : BigInt(1))
    )
      fail("PROJECT_RECEIPT_STATE_INVALID");
    return { r, request, result };
  });
  const parent = (row: ProjectRow) =>
    parsed.find(
      (x) =>
        x.r.project_id === row.project_id && x.r.command_id === row.command_id,
    ) ?? fail("PROJECT_RECEIPT_REQUIRED");
  for (const r of reviews) {
    const captured = projectReviewContext(db, owner, String(r.project_id), {
      project: before.projects.get(String(r.project_id))!,
      reviewFloor: before.floors.get("project_reviews")!,
    });
    if (
      captured.fingerprint !== r.context_fingerprint ||
      captured.criteria.length !==
        Number(
          one(
            db,
            "SELECT count(*) AS n FROM project_review_criteria WHERE review_id=? AND user_id=?",
            r.id,
            owner,
          )!.n,
        )
    )
      fail("PROJECT_STALE_CONTEXT");
    const entry = parent(r),
      q = entry.request.payload;
    if (
      entry.r.command_kind !== "review.submit" ||
      entry.result.review_id !== r.id ||
      q.fingerprint !== r.context_fingerprint ||
      String(r.revision_after) !== entry.result.completion_revision ||
      q.decision !== r.decision ||
      q.rationale !== r.rationale
    )
      fail("PROJECT_REVIEW_RECEIPT_INVALID");
    const snaps = rows(
        db,
        "SELECT * FROM project_review_criteria WHERE user_id=? AND project_id=? AND review_id=?",
        owner,
        r.project_id,
        r.id,
      ),
      active = snaps.filter((c) => c.was_archived === BigInt(0)),
      archived = snaps.filter((c) => c.was_archived === BigInt(1));
    if (
      Boolean(r.result_accepted) !== q.result_accepted ||
      Boolean(r.open_work_acknowledged) !== q.open_work_acknowledged ||
      r.open_work_disposition !== q.open_work_disposition ||
      Boolean(r.archived_criteria_acknowledged) !==
        q.archived_criteria_acknowledged ||
      r.project_title_snapshot !== captured.project_title ||
      r.goal_id_snapshot !== captured.goal_id ||
      r.goal_title_snapshot !== captured.goal_title ||
      r.desired_result_snapshot !== captured.desired_result ||
      [
        "open_task_count",
        "done_task_count",
        "canceled_task_count",
        "open_milestone_count",
        "done_milestone_count",
      ].some(
        (k) =>
          r[k] !== BigInt((captured as unknown as Record<string, number>)[k]),
      )
    )
      fail("PROJECT_REVIEW_CONTEXT_INVALID");
    const assessments = q.criteria as {
        id: string;
        assessment: string;
        note: string | null;
      }[],
      archIds = q.archived_ids as string[];
    if (
      active.length !== assessments.length ||
      active.some(
        (c) =>
          !assessments.some(
            (a) =>
              a.id === c.criterion_id &&
              a.assessment === c.decision &&
              a.note === c.rationale,
          ),
      ) ||
      archived.length !== archIds.length ||
      archived.some(
        (c) =>
          !archIds.includes(String(c.criterion_id)) ||
          c.archived_cycle_snapshot !== r.completion_cycle,
      ) ||
      Boolean(r.archived_criteria_acknowledged) !== archived.length > 0 ||
      (r.decision === "completed" &&
        (!active.length || active.some((c) => c.decision !== "satisfied")))
    )
      fail("PROJECT_COMPLETION_CRITERIA_REQUIRED");
    const resources = rows(
        db,
        "SELECT * FROM project_review_resources WHERE user_id=? AND project_id=? AND review_id=?",
        owner,
        r.project_id,
        r.id,
      ),
      ev = q.evidence as {
        relation_id: string;
        criterion_id: string | null;
        note: string | null;
      }[];
    if (
      (q.evidence as { relation_id: string; token: string }[]).some(
        (e) =>
          !captured.resources.some(
            (c) => c.relation_id === e.relation_id && c.token === e.token,
          ),
      )
    )
      fail("PROJECT_STALE_RESOURCE");
    if (
      resources.length !== ev.length ||
      resources.some(
        (s) =>
          !ev.some(
            (e) =>
              e.relation_id === s.relation_id_snapshot &&
              e.criterion_id === s.criterion_id &&
              e.note === s.note,
          ),
      )
    )
      fail("PROJECT_RESOURCE_RECEIPT_INVALID");
  }
  for (const l of lifecycle) {
    const entry = parent(l),
      old = before.projects.get(String(l.project_id))!;
    if (
      l.prior_status !== old.status ||
      l.cycle_before !== old.completion_cycle ||
      String(l.revision_after) !== entry.result.completion_revision ||
      String(l.cycle_after) !== entry.result.completion_cycle ||
      l.resulting_status !== entry.result.status ||
      l.project_title_snapshot !== old.title ||
      l.reason !== (entry.request.payload.reason ?? null) ||
      Boolean(l.mistaken_completion) !==
        (entry.request.payload.mistaken_completion === true ||
          entry.request.payload.kind === "marked_mistaken")
    )
      fail("PROJECT_LIFECYCLE_RECEIPT_INVALID");
    if (
      l.prior_review_id !== null &&
      !one(
        db,
        "SELECT id FROM project_reviews WHERE user_id=? AND project_id=? AND id=? AND decision='completed' AND completion_cycle=?",
        owner,
        l.project_id,
        l.prior_review_id,
        l.cycle_before,
      )
    )
      fail("PROJECT_PRIOR_COMPLETION_INVALID");
    if (
      l.mistaken_completion === BigInt(1) &&
      l.prior_review_id !== null &&
      !amendments.some(
        (a) =>
          a.review_id === l.prior_review_id &&
          a.command_id === l.command_id &&
          a.kind === "marked_mistaken" &&
          a.revision_after === l.revision_after,
      )
    )
      fail("PROJECT_MISTAKEN_REOPEN_REQUIRED");
  }
  for (const a of amendments) {
    const entry = parent(a);
    const old = before.projects.get(String(a.project_id))!,
      review = one(
        db,
        "SELECT * FROM project_reviews WHERE user_id=? AND project_id=? AND id=?",
        owner,
        a.project_id,
        a.review_id,
      )!;
    if (
      a.kind === "marked_mistaken" &&
      old.status === "completed" &&
      review.decision === "completed" &&
      review.completion_cycle === old.completion_cycle &&
      !lifecycle.some(
        (l) =>
          l.prior_review_id === a.review_id &&
          l.command_id === a.command_id &&
          l.mistaken_completion === BigInt(1),
      )
    )
      fail("PROJECT_MISTAKEN_REOPEN_REQUIRED");
    if (
      String(a.revision_after) !== entry.result.completion_revision ||
      (entry.r.command_kind === "review.amend" &&
        (entry.request.payload.kind !== a.kind ||
          entry.request.payload.review_id !== a.review_id ||
          entry.request.payload.review_resource_id !== a.review_resource_id))
    )
      fail("PROJECT_AMENDMENT_RECEIPT_INVALID");
    if (
      entry.result.amendment_id !== a.id ||
      entry.request.payload.reason !== a.reason
    )
      fail("PROJECT_AMENDMENT_RECEIPT_INVALID");
  }
  for (const entry of parsed) {
    const { r, request, result } = entry,
      q = request.payload,
      p = one(
        db,
        "SELECT * FROM projects WHERE user_id=? AND id=?",
        owner,
        r.project_id,
      )!,
      old = before.projects.get(String(r.project_id))!;
    if (
      [
        "criterion.create",
        "criterion.archive",
        "review.submit",
        "review.amend",
        "project.reopen",
        "project.archive",
      ].includes(String(r.command_kind)) &&
      result.no_op
    )
      fail("PROJECT_RECEIPT_EFFECT_REQUIRED");
    if (
      r.command_kind === "result.set" &&
      (p.desired_result !== q.desired_result ||
        result.no_op !== (old.desired_result === q.desired_result))
    )
      fail("PROJECT_RESULT_RECEIPT_INVALID");
    if (
      r.command_kind === "project.status.set" &&
      (p.status !== q.status ||
        result.no_op !== (old.status === q.status) ||
        old.status === "completed")
    )
      fail("PROJECT_STATUS_CONFLICT");
    if (
      r.command_kind === "review.submit" &&
      !reviews.some((v) => v.command_id === r.command_id)
    )
      fail("PROJECT_REVIEW_RECEIPT_INVALID");
    if (
      r.command_kind === "review.amend" &&
      !amendments.some((a) => a.command_id === r.command_id)
    )
      fail("PROJECT_AMENDMENT_RECEIPT_INVALID");
    if (
      ["project.reopen", "project.archive"].includes(String(r.command_kind)) &&
      !lifecycle.some((l) => l.command_id === r.command_id)
    )
      fail("PROJECT_LIFECYCLE_REQUIRED");
    if (String(r.command_kind).startsWith("criterion.")) {
      const live = rows(
          db,
          "SELECT * FROM project_completion_criteria WHERE user_id=? AND project_id=?",
          owner,
          r.project_id,
        ),
        changes = live.filter((c) => {
          const prior = before.criteria.get(String(c.id));
          return (
            !prior ||
            ["text", "sort_order", "archived_at"].some((k) => prior[k] !== c[k])
          );
        });
      if (changes.length !== (result.no_op ? 0 : 1))
        fail("PROJECT_CRITERION_RECEIPT_INVALID");
      const c = live.find(
        (c) =>
          c.id ===
          (r.command_kind === "criterion.create"
            ? result.criterion_id
            : q.criterion_id),
      );
      if (!c) fail("PROJECT_CRITERION_NOT_FOUND");
      const exact = (
        parseProjectJson(String(r.request_payload)) as {
          payload: Record<string, Canonical>;
        }
      ).payload;
      if (
        (["criterion.create", "criterion.edit"].includes(
          String(r.command_kind),
        ) &&
          c!.text !== q.text) ||
        (["criterion.create", "criterion.reorder"].includes(
          String(r.command_kind),
        ) &&
          c!.sort_order !== exact.sort_order) ||
        (r.command_kind === "criterion.archive" &&
          (c!.archive_reason !== q.reason ||
            c!.archived_cycle !== old.completion_cycle ||
            String(c!.archived_revision) !== result.completion_revision))
      )
        fail("PROJECT_CRITERION_RECEIPT_INVALID");
    }
  }
  for (const c of added("project_review_criteria"))
    if (!reviews.some((r) => r.id === c.review_id))
      fail("PROJECT_SNAPSHOT_PARENT_REQUIRED");
  for (const c of added("project_review_resources"))
    if (!reviews.some((r) => r.id === c.review_id))
      fail("PROJECT_SNAPSHOT_PARENT_REQUIRED");
  for (const p of rows(db, "SELECT * FROM projects WHERE user_id=?", owner)) {
    const old = before.projects.get(String(p.id));
    if (!old) continue;
    if (
      old.completion_cycle !== p.completion_cycle &&
      !lifecycle.some(
        (l) =>
          l.project_id === p.id &&
          l.event_kind === "reopened" &&
          l.cycle_before === old.completion_cycle &&
          l.cycle_after === p.completion_cycle &&
          l.revision_after === p.completion_revision,
      )
    )
      fail("PROJECT_CYCLE_REOPEN_REQUIRED");
    if (old.status !== p.status || old.archived_at !== p.archived_at) {
      if (
        p.status === "completed" &&
        !reviews.some(
          (r) =>
            r.project_id === p.id &&
            r.decision === "completed" &&
            r.revision_before === old.completion_revision &&
            r.revision_after === p.completion_revision &&
            r.completion_cycle === p.completion_cycle &&
            r.prior_status === old.status,
        )
      )
        fail("PROJECT_COMPLETION_REVIEW_REQUIRED");
      if (
        (old.status === "completed" || p.status === "archived") &&
        !lifecycle.some(
          (l) =>
            l.project_id === p.id &&
            l.prior_status === old.status &&
            l.resulting_status === p.status &&
            l.revision_after === p.completion_revision,
        )
      )
        fail("PROJECT_LIFECYCLE_REQUIRED");
    }
    if (
      projectCommandKinds.has(
        String(one(db, "SELECT life_command() AS k")!.k),
      ) &&
      ["title", "description", "priority", "area_id", "goal_id"].some(
        (k) => p[k] !== old[k],
      )
    )
      fail("PROJECT_METADATA_COMMAND_INVALID");
    if (
      p.completion_revision !== old.completion_revision &&
      projectCommandKinds.has(
        String(one(db, "SELECT life_command() AS k")!.k),
      ) &&
      !receipts.some((r) => r.project_id === p.id)
    )
      fail("PROJECT_RECEIPT_REQUIRED");
  }
  const criteria = rows(
    db,
    "SELECT * FROM project_completion_criteria WHERE user_id=?",
    owner,
  );
  for (const c of criteria) {
    const old = before.criteria.get(String(c.id));
    if (
      !old ||
      [
        "text",
        "sort_order",
        "archived_at",
        "archive_reason",
        "archived_cycle",
        "archived_revision",
      ].some((k) => old[k] !== c[k])
    )
      if (
        !receipts.some(
          (r) =>
            r.project_id === c.project_id &&
            String(r.command_kind).startsWith("criterion."),
        )
      )
        fail("PROJECT_CRITERION_RECEIPT_REQUIRED");
  }
}

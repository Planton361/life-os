import type Database from "better-sqlite3";
import {
  projectDepthCommandSchema,
  type ProjectDepthCommand,
} from "../../schemas/project-depth.schemas";
import { projectOwnedTables } from "../project-schema";
import {
  pgJson,
  projectHash,
  trimProjectText,
  safeProjectUrl,
  type Canonical,
} from "../project-canonical";
import {
  projectOne as one,
  projectReviewContext,
  requireProject,
} from "../repositories/project-depth-read";
const clean = (v: string | null | undefined) =>
  v == null ? null : trimProjectText(v) || null;
export function canonicalProjectPayload(
  command: ProjectDepthCommand,
): Canonical {
  switch (command.operation) {
    case "result.set":
      return { desired_result: clean(command.payload.desired_result) };
    case "criterion.create":
      return {
        criterion_id: null,
        text: trimProjectText(command.payload.text),
        sort_order: BigInt(command.payload.sort_order),
      };
    case "criterion.edit":
      return {
        criterion_id: command.payload.criterion_id.toLowerCase(),
        text: trimProjectText(command.payload.text),
      };
    case "criterion.reorder":
      return {
        criterion_id: command.payload.criterion_id.toLowerCase(),
        sort_order: BigInt(command.payload.sort_order),
      };
    case "criterion.archive":
      return {
        criterion_id: command.payload.criterion_id.toLowerCase(),
        reason: trimProjectText(command.payload.reason),
      };
    case "review.submit": {
      const p = command.payload;
      return {
        ...p,
        criteria: p.criteria
          .map((c) => ({
            id: c.id.toLowerCase(),
            assessment: c.assessment,
            note: clean(c.note),
          }))
          .sort((a, b) => a.id.localeCompare(b.id)),
        archived_ids: p.archived_ids.map((x) => x.toLowerCase()).sort(),
        archived_notes: (p.archived_notes ?? [])
          .map((c) => ({ id: c.id.toLowerCase(), note: clean(c.note) }))
          .sort((a, b) => a.id.localeCompare(b.id)),
        evidence: p.evidence
          .map((e) => ({
            ...e,
            relation_id: e.relation_id.toLowerCase(),
            criterion_id: e.criterion_id?.toLowerCase() ?? null,
            note: clean(e.note),
          }))
          .sort(
            (a, b) =>
              a.relation_id.localeCompare(b.relation_id) ||
              (a.criterion_id ?? "").localeCompare(b.criterion_id ?? ""),
          ),
        rationale: trimProjectText(p.rationale),
        open_work_disposition: clean(p.open_work_disposition),
      };
    }
    case "review.amend":
      return {
        review_id: command.payload.review_id.toLowerCase(),
        kind: command.payload.kind,
        review_resource_id:
          command.payload.review_resource_id?.toLowerCase() ?? null,
        reason: trimProjectText(command.payload.reason),
      };
    case "project.reopen":
      return {
        reason: clean(command.payload.reason),
        mistaken_completion: command.payload.mistaken_completion ?? false,
      };
    case "project.archive":
      return { reason: clean(command.payload.reason) };
    case "project.status.set":
      return { status: command.payload.status };
  }
}
export function parseProjectCommand(input: unknown) {
  // SQL v4 defaults are part of canonical identity; normalize them before the
  // existing action schema so direct native callers and UI callers replay alike.
  if (
    input &&
    typeof input === "object" &&
    "payload" in input &&
    input.payload &&
    typeof input.payload === "object" &&
    !Array.isArray(input.payload)
  ) {
    const candidate = input as {
      operation: string;
      payload: Record<string, Canonical>;
    };
    if (Buffer.byteLength(pgJson(candidate.payload)) > 1048576)
      throw new Error("PROJECT_PAYLOAD_LIMIT");
    const p = candidate.payload;
    if (candidate.operation === "review.submit")
      input = {
        ...candidate,
        payload: {
          result_accepted: false,
          archived_criteria_acknowledged: false,
          open_work_acknowledged: false,
          ...p,
          evidence: Array.isArray(p.evidence)
            ? p.evidence.map((e) =>
                e && typeof e === "object" && !Array.isArray(e)
                  ? { criterion_id: null, ...e }
                  : e,
              )
            : p.evidence,
        },
      };
    if (candidate.operation === "review.amend")
      input = { ...candidate, payload: { review_resource_id: null, ...p } };
  }
  const parsed = projectDepthCommandSchema.safeParse(input);
  if (!parsed.success) throw new Error("PROJECT_COMMAND_INVALID");
  return {
    ...parsed.data,
    projectId: parsed.data.projectId.toLowerCase(),
    commandId: parsed.data.commandId.toLowerCase(),
  };
}
export function projectRequest(command: ProjectDepthCommand) {
  return {
    version: 1,
    command_kind: command.operation,
    project_id: command.projectId,
    expected_revision: command.expectedRevision,
    expected_cycle: command.expectedCycle,
    payload: canonicalProjectPayload(command),
  };
}
export function insertProjectRow(
  db: Database.Database,
  table: string,
  row: Record<string, Canonical>,
) {
  if (
    !(projectOwnedTables as readonly string[]).includes(table) ||
    Object.keys(row).some((k) => !/^[a-z_]+$/.test(k))
  )
    throw new Error("PROJECT_IDENTIFIER_INVALID");
  const keys = Object.keys(row);
  db.prepare(
    `INSERT INTO ${table}(${keys.join(",")}) VALUES(${keys.map(() => "?").join(",")})`,
  ).run(
    ...keys.map((k) => (typeof row[k] === "boolean" ? Number(row[k]) : row[k])),
  );
}
export function executeProjectDepthInTransaction(
  db: Database.Database,
  owner: string,
  input: unknown,
): Record<string, Canonical> {
  const command = parseProjectCommand(input),
    request = projectRequest(command),
    serialized = pgJson(request),
    hash = projectHash(request);
  if (Buffer.byteLength(pgJson(command.payload as Canonical)) > 1048576)
    throw new Error("PROJECT_PAYLOAD_LIMIT");
  const receipt = one(
    db,
    "SELECT request_payload,request_fingerprint,result_payload FROM project_command_receipts WHERE user_id=? AND command_id=?",
    owner,
    command.commandId,
  );
  if (receipt) {
    if (
      receipt.request_payload !== serialized ||
      receipt.request_fingerprint !== hash
    )
      throw new Error("PROJECT_COMMAND_KEY_CONFLICT");
    return JSON.parse(String(receipt.result_payload)) as Record<
      string,
      Canonical
    >;
  }
  const p = requireProject(db, owner, command.projectId),
    revision = BigInt(command.expectedRevision),
    cycle = BigInt(command.expectedCycle),
    after = revision + BigInt(1);
  if (p.completion_revision !== revision || p.completion_cycle !== cycle)
    throw new Error("PROJECT_STALE");
  if (
    (p.archived_at !== null || p.status === "archived") &&
    command.operation !== "review.amend"
  )
    throw new Error("PROJECT_ARCHIVED");
  if (
    p.status === "completed" &&
    [
      "result.set",
      "criterion.create",
      "criterion.edit",
      "criterion.reorder",
      "criterion.archive",
    ].includes(command.operation)
  )
    throw new Error("PROJECT_COMPLETED_FROZEN");
  const q = canonicalProjectPayload(command) as Record<string, Canonical>;
  const base = { user_id: owner, project_id: command.projectId },
    withCommand = { ...base, command_id: command.commandId };
  let changed = false,
    reopen = false,
    mistaken = false,
    rid: string | null = null,
    priorReview: string | null = null;
  const result: Record<string, Canonical> = {
    project_id: command.projectId,
    operation: command.operation,
    command_id: command.commandId,
  };
  const update = (sql: string, ...args: unknown[]) =>
    db
      .prepare(
        `UPDATE projects SET ${sql},updated_at=life_now() WHERE user_id=? AND id=?`,
      )
      .run(...args, owner, command.projectId);
  switch (command.operation) {
    case "result.set":
      changed = p.desired_result !== q.desired_result;
      if (changed) update("desired_result=?", q.desired_result);
      break;
    case "criterion.create": {
      const count = one(
        db,
        "SELECT count(*) AS n FROM project_completion_criteria WHERE user_id=? AND project_id=? AND (archived_at IS NULL OR archived_cycle=?)",
        owner,
        command.projectId,
        cycle,
      )!.n as bigint;
      if (count >= BigInt(1000)) throw new Error("PROJECT_CRITERION_LIMIT");
      const id = String(one(db, "SELECT life_uuid() AS id")!.id);
      insertProjectRow(db, "project_completion_criteria", {
        ...base,
        id,
        text: q.text,
        sort_order: q.sort_order,
      });
      changed = true;
      result.criterion_id = id;
      break;
    }
    case "criterion.edit":
    case "criterion.reorder":
    case "criterion.archive": {
      const c = one(
        db,
        "SELECT * FROM project_completion_criteria WHERE user_id=? AND project_id=? AND id=? AND archived_at IS NULL",
        owner,
        command.projectId,
        q.criterion_id,
      );
      if (!c) throw new Error("PROJECT_CRITERION_NOT_FOUND");
      if (command.operation === "criterion.archive") {
        db.prepare(
          "UPDATE project_completion_criteria SET archived_at=life_now(),archive_reason=?,archived_cycle=?,archived_revision=?,updated_at=life_now() WHERE user_id=? AND project_id=? AND id=?",
        ).run(q.reason, cycle, after, owner, command.projectId, c.id);
        changed = true;
      } else {
        const field =
          command.operation === "criterion.edit" ? "text" : "sort_order";
        changed = c[field] !== q[field];
        if (changed)
          db.prepare(
            `UPDATE project_completion_criteria SET ${field}=?,updated_at=life_now() WHERE user_id=? AND project_id=? AND id=?`,
          ).run(q[field], owner, command.projectId, c.id);
      }
      break;
    }
    case "project.status.set":
      if (p.status === "completed") throw new Error("PROJECT_STATUS_CONFLICT");
      changed = p.status !== q.status;
      if (changed) update("status=?", q.status);
      break;
    case "project.reopen":
    case "project.archive":
      reopen = command.operation === "project.reopen";
      mistaken = q.mistaken_completion === true;
      if (reopen && p.status !== "completed")
        throw new Error("PROJECT_REOPEN_CONFLICT");
      changed = true;
      break;
    case "review.amend": {
      const r = one(
        db,
        "SELECT * FROM project_reviews WHERE user_id=? AND project_id=? AND id=?",
        owner,
        command.projectId,
        q.review_id,
      );
      if (!r) throw new Error("PROJECT_REVIEW_NOT_FOUND");
      rid = String(r.id);
      if (
        q.kind === "evidence_withdrawn" &&
        !one(
          db,
          "SELECT id FROM project_review_resources WHERE user_id=? AND project_id=? AND review_id=? AND id=?",
          owner,
          command.projectId,
          rid,
          q.review_resource_id,
        )
      )
        throw new Error("PROJECT_RESOURCE_UNAVAILABLE");
      mistaken = q.kind === "marked_mistaken";
      reopen =
        mistaken &&
        p.status === "completed" &&
        r.decision === "completed" &&
        r.completion_cycle === cycle;
      changed = true;
      break;
    }
    case "review.submit": {
      if (p.status === "completed")
        throw new Error("PROJECT_ALREADY_COMPLETED");
      const ctx = projectReviewContext(db, owner, command.projectId),
        payload = command.payload;
      if (q.fingerprint !== ctx.fingerprint)
        throw new Error("PROJECT_STALE_CONTEXT");
      const active = ctx.criteria.filter((c) => c.archived_at === null),
        archived = ctx.criteria.filter((c) => c.archived_at !== null);
      if (
        payload.decision === "completed" &&
        (!p.desired_result || !active.length || !payload.result_accepted)
      )
        throw new Error("PROJECT_COMPLETION_PRECONDITION");
      if (
        payload.archived_criteria_acknowledged !== archived.length > 0 ||
        payload.archived_ids.length !== archived.length ||
        new Set(payload.archived_ids).size !== archived.length ||
        archived.some(
          (c) =>
            !payload.archived_ids.map((x) => x.toLowerCase()).includes(c.id),
        )
      )
        throw new Error("PROJECT_ARCHIVED_SCOPE_STALE");
      const archivedNotes = q.archived_notes as {
        id: string;
        note: string | null;
      }[];
      if (
        new Set(archivedNotes.map((c) => c.id)).size !== archivedNotes.length ||
        archivedNotes.some((c) => !archived.some((a) => a.id === c.id))
      )
        throw new Error("PROJECT_ARCHIVED_SCOPE_INVALID");
      const assessments = q.criteria as {
        id: string;
        assessment: string;
        note: string | null;
      }[];
      if (
        assessments.length !== active.length ||
        new Set(assessments.map((a) => a.id)).size !== active.length ||
        active.some((c) => !assessments.some((a) => a.id === c.id))
      )
        throw new Error("PROJECT_CRITERION_SET_STALE");
      const open = ctx.open_task_count + ctx.open_milestone_count;
      if (
        payload.decision === "completed" &&
        (open > 0
          ? !payload.open_work_acknowledged || !q.open_work_disposition
          : payload.open_work_acknowledged || q.open_work_disposition !== null)
      )
        throw new Error("PROJECT_OPEN_WORK_ACK_REQUIRED");
      rid = String(one(db, "SELECT life_uuid() AS id")!.id);
      insertProjectRow(db, "project_reviews", {
        ...withCommand,
        id: rid,
        completion_cycle: cycle,
        revision_before: revision,
        revision_after: after,
        project_title_snapshot: p.title,
        desired_result_snapshot: p.desired_result,
        goal_id_snapshot: p.goal_id,
        goal_title_snapshot: p.goal_title,
        decision: payload.decision,
        prior_status: p.status,
        resulting_status:
          payload.decision === "completed" ? "completed" : p.status,
        result_accepted: payload.result_accepted,
        rationale: q.rationale,
        work_observed_at: ctx.work_observed_at,
        context_fingerprint: ctx.fingerprint,
        open_task_count: ctx.open_task_count,
        done_task_count: ctx.done_task_count,
        canceled_task_count: ctx.canceled_task_count,
        open_milestone_count: ctx.open_milestone_count,
        done_milestone_count: ctx.done_milestone_count,
        open_work_acknowledged: payload.open_work_acknowledged,
        open_work_disposition: q.open_work_disposition,
        archived_criteria_acknowledged: payload.archived_criteria_acknowledged,
      });
      for (const c of ctx.criteria) {
        const a = assessments.find((a) => a.id === c.id),
          arch = c.archived_at !== null;
        insertProjectRow(db, "project_review_criteria", {
          ...base,
          review_id: rid,
          criterion_id: c.id,
          text_snapshot: c.text,
          sort_order_snapshot: BigInt(c.sort_order),
          was_archived: arch,
          archive_reason_snapshot: c.archive_reason,
          archived_cycle_snapshot:
            c.archived_cycle === null ? null : BigInt(c.archived_cycle),
          archived_revision_snapshot:
            c.archived_revision === null ? null : BigInt(c.archived_revision),
          decision: arch ? "excluded" : a!.assessment,
          rationale: arch
            ? (archivedNotes.find((a) => a.id === c.id)?.note ?? null)
            : a!.note,
        });
      }
      for (const e of q.evidence as {
        relation_id: string;
        criterion_id: string | null;
        token: string;
        note: string | null;
      }[]) {
        const r = ctx.resources.find((r) => r.relation_id === e.relation_id);
        if (!r) throw new Error("PROJECT_RESOURCE_UNAVAILABLE");
        if (r.token !== e.token) throw new Error("PROJECT_STALE_RESOURCE");
        insertProjectRow(db, "project_review_resources", {
          ...base,
          review_id: rid,
          criterion_id: e.criterion_id,
          resource_id: r.id,
          relation_id_snapshot: r.relation_id,
          title_snapshot: r.title,
          resource_type_snapshot: r.type,
          safe_url_snapshot: safeProjectUrl(r.url as string | null),
          project_role_snapshot: r.role,
          relation_type_snapshot: r.relation_type,
          note: e.note,
        });
      }
      update(
        "status=?,completion_revision=?",
        payload.decision === "completed" ? "completed" : p.status,
        after,
      );
      changed = true;
      result.review_id = rid;
      result.decision = payload.decision;
      break;
    }
  }
  if (command.operation === "project.archive" || reopen) {
    if (p.status === "completed")
      priorReview =
        (one(
          db,
          "SELECT id FROM project_reviews WHERE user_id=? AND project_id=? AND completion_cycle=? AND decision='completed'",
          owner,
          command.projectId,
          cycle,
        )?.id as string) ?? null;
    update(
      "status=?,archived_at=?,completion_cycle=?,completion_revision=?",
      reopen ? "active" : "archived",
      reopen ? null : one(db, "SELECT life_now() AS t")!.t,
      cycle + (reopen ? BigInt(1) : BigInt(0)),
      after,
    );
    insertProjectRow(db, "project_lifecycle_events", {
      ...withCommand,
      event_kind: reopen ? "reopened" : "archived",
      revision_after: after,
      cycle_before: cycle,
      cycle_after: cycle + (reopen ? BigInt(1) : BigInt(0)),
      project_title_snapshot: p.title,
      prior_status: p.status,
      resulting_status: reopen ? "active" : "archived",
      prior_completion_kind:
        p.status === "completed"
          ? priorReview
            ? "review"
            : "legacy_without_review"
          : null,
      prior_review_id: priorReview,
      reason: q.reason ?? null,
      mistaken_completion: mistaken,
    });
  }
  if (
    command.operation === "review.amend" ||
    (command.operation === "project.reopen" && mistaken && priorReview)
  ) {
    const id = String(one(db, "SELECT life_uuid() AS id")!.id);
    insertProjectRow(db, "project_review_amendments", {
      ...withCommand,
      id,
      review_id: command.operation === "review.amend" ? rid : priorReview,
      revision_after: after,
      kind: command.operation === "review.amend" ? q.kind : "marked_mistaken",
      review_resource_id: q.review_resource_id ?? null,
      reason: q.reason,
    });
    result.amendment_id = id;
  }
  if (changed)
    db.prepare(
      "UPDATE projects SET completion_revision=?,updated_at=life_now() WHERE user_id=? AND id=? AND completion_revision=?",
    ).run(after, owner, command.projectId, revision);
  const current = requireProject(db, owner, command.projectId);
  Object.assign(result, {
    completion_revision: String(current.completion_revision),
    completion_cycle: String(current.completion_cycle),
    status: current.status,
    no_op: !changed,
  });
  insertProjectRow(db, "project_command_receipts", {
    ...withCommand,
    command_kind: command.operation,
    request_payload: serialized,
    request_fingerprint: hash,
    result_payload: pgJson(result),
  });
  // Return the same canonical result representation on first effect and replay.
  return JSON.parse(pgJson(result)) as Record<string, Canonical>;
}

import "server-only";
import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import { saveReviewInputSchema } from "../../schemas/review.schema";
import type {
  ReviewRecordRow,
  ReviewTaskDecisionRow,
} from "../../supabase/row-types";
import { localDate, timestamp, timezone, uuid } from "../codecs";
import { completeLinkedTask } from "./source-commands";
export type StoredReview = Omit<
  ReviewRecordRow,
  "wins" | "blockers" | "open_loops"
> & { wins: string; blockers: string; open_loops: string };
type Decision = Omit<ReviewTaskDecisionRow, "planning_snapshot_captured"> & {
  planning_snapshot_captured: bigint;
};
type Planning = {
  id: string;
  planned_date: string | null;
  scheduled_start_at: string | null;
  status: string;
  archived_at: string | null;
};
export function saveReview(
  db: Database.Database,
  owner: string,
  input: unknown,
): StoredReview {
  if (!db.inTransaction) throw new Error("ATOMIC_TRANSACTION_REQUIRED");
  const parsed = saveReviewInputSchema.safeParse(input);
  if (!parsed.success) throw new Error("REVIEW_INPUT_INVALID");
  const value = parsed.data,
    at = timestamp(new Date().toISOString());
  const start = localDate(value.periodStart),
    end = localDate(value.periodEnd),
    zone = timezone(value.timezone);
  const carries = [...new Set(value.carryTaskIds.map(uuid))].sort();
  const planning = (id: string) =>
    db
      .prepare(
        "SELECT id,planned_date,scheduled_start_at,status,archived_at FROM tasks WHERE user_id=? AND id=?",
      )
      .get(owner, id) as Planning | undefined;
  const active = (row: Planning | undefined) =>
    row &&
    row.archived_at === null &&
    !["done", "canceled", "archived"].includes(row.status);
  if (carries.some((id) => !active(planning(id))))
    throw new Error("REVIEW_CARRY_UNAVAILABLE");
  const existing = db
    .prepare(
      "SELECT * FROM review_records WHERE user_id=? AND kind=? AND period_start=? AND archived_at IS NULL",
    )
    .get(owner, value.kind, start) as StoredReview | undefined;
  const id = existing?.id ?? randomUUID(),
    status = value.status ?? "draft";
  const completed =
    status === "completed" ? (existing?.completed_at ?? at) : null;
  const optional = (text: string | undefined) => text?.trim() || null;
  if (existing)
    db.prepare(
      "UPDATE review_records SET period_end=?,timezone=?,status=?,outcome=?,wins=?,blockers=?,open_loops=?,next_period_focus=?,planning_note=?,completed_at=?,updated_at=? WHERE user_id=? AND id=?",
    ).run(
      end,
      zone,
      status,
      optional(value.outcome),
      JSON.stringify(value.wins),
      JSON.stringify(value.blockers),
      JSON.stringify(value.openLoops),
      optional(value.nextPeriodFocus),
      optional(value.planningNote),
      completed,
      at,
      owner,
      id,
    );
  else
    db.prepare(
      "INSERT INTO review_records(id,user_id,kind,period_start,period_end,timezone,status,outcome,wins,blockers,open_loops,next_period_focus,planning_note,completed_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    ).run(
      id,
      owner,
      value.kind,
      start,
      end,
      zone,
      status,
      optional(value.outcome),
      JSON.stringify(value.wins),
      JSON.stringify(value.blockers),
      JSON.stringify(value.openLoops),
      optional(value.nextPeriodFocus),
      optional(value.planningNote),
      completed,
      at,
      at,
    );
  if (completed) {
    const link = db
      .prepare(
        "SELECT task_id FROM schedule_source_links WHERE user_id=? AND source_type='review' AND source_id=?",
      )
      .get(owner, id) as { task_id: string } | undefined;
    if (link) completeLinkedTask(db, owner, link.task_id, completed);
  }
  if (value.kind === "daily") {
    const next = new Date(`${start}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    const target = localDate(next.toISOString().slice(0, 10));
    const decisions = db
      .prepare(
        "SELECT * FROM review_task_decisions WHERE user_id=? AND review_id=? AND decision='carry_forward'",
      )
      .all(owner, id) as Decision[];
    for (const decision of decisions)
      if (!carries.includes(decision.task_id)) {
        const task = planning(decision.task_id);
        if (
          active(task) &&
          decision.planning_snapshot_captured &&
          task!.planned_date === decision.target_date &&
          task!.scheduled_start_at === null
        )
          db.prepare(
            "UPDATE tasks SET planned_date=?,scheduled_start_at=?,updated_at=? WHERE user_id=? AND id=?",
          ).run(
            decision.original_planned_date,
            decision.original_scheduled_start_at,
            at,
            owner,
            decision.task_id,
          );
        db.prepare(
          "DELETE FROM review_task_decisions WHERE user_id=? AND id=?",
        ).run(owner, decision.id);
      }
    for (const taskId of carries)
      if (!decisions.some((decision) => decision.task_id === taskId)) {
        const task = planning(taskId)!;
        if (!active(task)) continue;
        db.prepare(
          "UPDATE tasks SET planned_date=?,scheduled_start_at=NULL,updated_at=? WHERE user_id=? AND id=?",
        ).run(target, at, owner, taskId);
        db.prepare(
          "INSERT INTO review_task_decisions(id,user_id,review_id,task_id,decision,target_date,original_planned_date,original_scheduled_start_at,planning_snapshot_captured,created_at) VALUES(?,?,?,?,'carry_forward',?,?,?,1,?)",
        ).run(
          randomUUID(),
          owner,
          id,
          taskId,
          target,
          task.planned_date,
          task.scheduled_start_at,
          at,
        );
      }
  }
  return db
    .prepare("SELECT * FROM review_records WHERE user_id=? AND id=?")
    .get(owner, id) as StoredReview;
}

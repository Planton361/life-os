import "server-only";
import { randomUUID } from "node:crypto";
import type { ReviewRepository } from "../../repositories";
import type { RepositoryResult } from "../../repositories/repository-result";
import { saveReviewInputSchema } from "../../schemas/review.schema";
import type { ReviewRecordRow, ReviewTaskDecisionRow } from "../../supabase/row-types";
import { mapReviewRecordRowToDomain, mapReviewTaskDecisionRowToDomain } from "../../supabase/mappers";
import { localDate, timestamp, timezone, uuid } from "../codecs";
import { requireOwnerContext, type OwnerContext } from "../owner-context";
import type { SqliteRuntime } from "../runtime";
import { completeLinkedTask } from "../commands/source-commands";

type StoredReview = Omit<ReviewRecordRow, "wins" | "blockers" | "open_loops"> & { wins: string; blockers: string; open_loops: string };
type Decision = Omit<ReviewTaskDecisionRow, "planning_snapshot_captured"> & { planning_snapshot_captured: bigint };
type Planning = { id: string; planned_date: string | null; scheduled_start_at: string | null; status: string; archived_at: string | null };
function record(row: StoredReview) {
  const items = (text: string): string[] => {
    const value: unknown = JSON.parse(text);
    if (!Array.isArray(value) || value.some(item => typeof item !== "string")) throw new Error("REVIEW_ARRAY_INVALID");
    return value;
  };
  return mapReviewRecordRowToDomain({ ...row, wins: items(row.wins), blockers: items(row.blockers), open_loops: items(row.open_loops) });
}
function failure(message = "Review could not be saved atomically."): RepositoryResult<never> { return { ok: false, error: { code: "adapter_unavailable", message } }; }
function forbidden(): RepositoryResult<never> { return { ok: false, error: { code: "forbidden", message: "The requested review is outside the current user scope." } }; }

export function createSqliteReviewRepository(store: SqliteRuntime, context: OwnerContext): ReviewRepository {
  const owner = requireOwnerContext(context);
  const scoped = (user: string, profile = user) => user === owner && profile === owner;
  return {
    async saveReview(input) {
      if (!scoped(input.userId, input.profileId)) return forbidden();
      const parsed = saveReviewInputSchema.safeParse(input);
      if (!parsed.success) return failure("Review input is invalid.");
      try { return store.command(context, "review.save", db => {
        const value = parsed.data, at = timestamp(new Date().toISOString());
        const start = localDate(value.periodStart), end = localDate(value.periodEnd), zone = timezone(value.timezone);
        const carries = [...new Set(value.carryTaskIds.map(uuid))].sort();
        const planning = (id: string) => db.prepare("SELECT id,planned_date,scheduled_start_at,status,archived_at FROM tasks WHERE user_id=? AND id=?").get(owner, id) as Planning | undefined;
        const active = (row: Planning | undefined) => row && row.archived_at === null && !["done", "canceled", "archived"].includes(row.status);
        if (carries.some(id => !active(planning(id)))) throw new Error("REVIEW_CARRY_UNAVAILABLE");
        const existing = db.prepare("SELECT * FROM review_records WHERE user_id=? AND kind=? AND period_start=? AND archived_at IS NULL").get(owner, value.kind, start) as StoredReview | undefined;
        const id = existing?.id ?? randomUUID(), status = value.status ?? "draft";
        const completed = status === "completed" ? existing?.completed_at ?? at : null;
        const optional = (text: string | undefined) => text?.trim() || null;
        if (existing) db.prepare("UPDATE review_records SET period_end=?,timezone=?,status=?,outcome=?,wins=?,blockers=?,open_loops=?,next_period_focus=?,planning_note=?,completed_at=?,updated_at=? WHERE user_id=? AND id=?")
          .run(end, zone, status, optional(value.outcome), JSON.stringify(value.wins), JSON.stringify(value.blockers), JSON.stringify(value.openLoops), optional(value.nextPeriodFocus), optional(value.planningNote), completed, at, owner, id);
        else db.prepare("INSERT INTO review_records(id,user_id,kind,period_start,period_end,timezone,status,outcome,wins,blockers,open_loops,next_period_focus,planning_note,completed_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
          .run(id, owner, value.kind, start, end, zone, status, optional(value.outcome), JSON.stringify(value.wins), JSON.stringify(value.blockers), JSON.stringify(value.openLoops), optional(value.nextPeriodFocus), optional(value.planningNote), completed, at, at);
        if (completed) {
          const link = db.prepare("SELECT task_id FROM schedule_source_links WHERE user_id=? AND source_type='review' AND source_id=?").get(owner, id) as { task_id: string } | undefined;
          if (link) completeLinkedTask(db, owner, link.task_id, completed);
        }
        if (value.kind === "daily") {
          const next = new Date(`${start}T00:00:00Z`); next.setUTCDate(next.getUTCDate() + 1);
          const target = localDate(next.toISOString().slice(0, 10));
          const decisions = db.prepare("SELECT * FROM review_task_decisions WHERE user_id=? AND review_id=? AND decision='carry_forward'").all(owner, id) as Decision[];
          for (const decision of decisions) if (!carries.includes(decision.task_id)) {
            const task = planning(decision.task_id);
            if (active(task) && decision.planning_snapshot_captured && task!.planned_date === decision.target_date && task!.scheduled_start_at === null)
              db.prepare("UPDATE tasks SET planned_date=?,scheduled_start_at=?,updated_at=? WHERE user_id=? AND id=?").run(decision.original_planned_date, decision.original_scheduled_start_at, at, owner, decision.task_id);
            db.prepare("DELETE FROM review_task_decisions WHERE user_id=? AND id=?").run(owner, decision.id);
          }
          for (const taskId of carries) if (!decisions.some(decision => decision.task_id === taskId)) {
            const task = planning(taskId)!;
            if (!active(task)) continue;
            db.prepare("UPDATE tasks SET planned_date=?,scheduled_start_at=NULL,updated_at=? WHERE user_id=? AND id=?").run(target, at, owner, taskId);
            db.prepare("INSERT INTO review_task_decisions(id,user_id,review_id,task_id,decision,target_date,original_planned_date,original_scheduled_start_at,planning_snapshot_captured,created_at) VALUES(?,?,?,?,'carry_forward',?,?,?,1,?)")
              .run(randomUUID(), owner, id, taskId, target, task.planned_date, task.scheduled_start_at, at);
          }
        }
        const saved = db.prepare("SELECT * FROM review_records WHERE user_id=? AND id=?").get(owner, id) as StoredReview;
        return { ok: true as const, data: record(saved) };
      }); } catch { return failure(); }
    },
    async getReviewByPeriod(userId, profileId, kind, periodStart) {
      if (!scoped(userId, profileId)) return forbidden();
      try { return store.read(context, db => {
        const row = db.prepare("SELECT * FROM review_records WHERE user_id=? AND kind=? AND period_start=? AND archived_at IS NULL").get(owner, kind, localDate(periodStart)) as StoredReview | undefined;
        return { ok: true as const, data: row ? record(row) : null };
      }); } catch { return failure("Review could not be loaded."); }
    },
    async getReviewsInRange(userId, profileId, fromDate, toDate) {
      if (!scoped(userId, profileId)) return forbidden();
      try { return store.read(context, db => ({ ok: true as const, data: (db.prepare("SELECT * FROM review_records WHERE user_id=? AND period_start>=? AND period_start<=? AND archived_at IS NULL ORDER BY period_start DESC,id").all(owner, localDate(fromDate), localDate(toDate)) as StoredReview[]).map(record) })); }
      catch { return failure("Reviews could not be loaded."); }
    },
    async getTaskDecisions(userId, reviewId) {
      if (!scoped(userId)) return forbidden();
      try { return store.read(context, db => ({ ok: true as const, data: (db.prepare("SELECT * FROM review_task_decisions WHERE user_id=? AND review_id=? ORDER BY created_at DESC,id").all(owner, uuid(reviewId)) as ReviewTaskDecisionRow[]).map(mapReviewTaskDecisionRowToDomain) })); }
      catch { return failure("Review task decisions could not be loaded."); }
    },
  };
}

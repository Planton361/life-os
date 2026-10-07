import "server-only";
import type { ReviewRepository } from "../../repositories";
import type { RepositoryResult } from "../../repositories/repository-result";
import { saveReviewInputSchema } from "../../schemas/review.schema";
import type { ReviewTaskDecisionRow } from "../../supabase/row-types";
import { mapReviewRecordRowToDomain, mapReviewTaskDecisionRowToDomain } from "../../supabase/mappers";
import { localDate, uuid } from "../codecs";
import { requireOwnerContext, type OwnerContext } from "../owner-context";
import type { SqliteRuntime } from "../runtime";
import { saveReview, type StoredReview } from "../commands/review-commands";

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
        const saved = saveReview(db, owner, parsed.data);
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

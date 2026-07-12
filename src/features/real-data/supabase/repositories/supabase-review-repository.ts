import type { ReviewRepository } from "../../repositories";
import type { RepositoryResult } from "../../repositories/repository-result";
import type { SaveReviewRepositoryInput } from "../../schemas";
import { realDataTableNames } from "../database.types";
import type {
  SupabaseClientLike,
  SupabaseQueryResult,
} from "../database.types";
import {
  mapReviewRecordRowToDomain,
  mapReviewTaskDecisionRowToDomain,
} from "../mappers";
import type { ReviewRecordRow, ReviewTaskDecisionRow } from "../row-types";

function failure(message: string): RepositoryResult<never> {
  return { error: { code: "adapter_unavailable", message }, ok: false };
}

function forbidden(): RepositoryResult<never> {
  return {
    error: {
      code: "forbidden",
      message: "The requested review is outside the current user scope.",
    },
    ok: false,
  };
}

function inScope(userId: string, profileId: string) {
  return userId === profileId;
}

function rpcArgs(input: SaveReviewRepositoryInput) {
  return {
    p_blockers: input.blockers,
    p_next_period_focus: input.nextPeriodFocus ?? "",
    p_open_loops: input.openLoops,
    p_outcome: input.outcome ?? "",
    p_period_start: input.periodStart,
    p_planning_note: input.planningNote ?? "",
    p_status: input.status ?? "draft",
    p_timezone: input.timezone,
    p_wins: input.wins,
  };
}

export function createSupabaseReviewRepository(
  client: SupabaseClientLike,
): ReviewRepository {
  return {
    async saveReview(input) {
      if (!inScope(input.userId, input.profileId)) return forbidden();

      const result =
        input.kind === "daily"
          ? ((await client.rpc("save_daily_review_with_carry_over", {
              ...rpcArgs(input),
              p_carry_task_ids: input.carryTaskIds,
            })) as SupabaseQueryResult<ReviewRecordRow>)
          : ((await client.rpc("save_review_record", {
              ...rpcArgs(input),
              p_kind: input.kind,
              p_period_end: input.periodEnd,
            })) as SupabaseQueryResult<ReviewRecordRow>);

      if (result.error || !result.data) {
        return failure("Review could not be saved atomically.");
      }

      return { data: mapReviewRecordRowToDomain(result.data), ok: true };
    },

    async getReviewByPeriod(userId, profileId, kind, periodStart) {
      if (!inScope(userId, profileId)) return forbidden();

      const result = (await client
        .from(realDataTableNames.reviewRecords)
        .select("*")
        .eq("user_id", userId)
        .eq("kind", kind)
        .eq("period_start", periodStart)
        .is("archived_at", null)
        .maybeSingle()) as SupabaseQueryResult<ReviewRecordRow>;

      if (result.error) return failure("Review could not be loaded.");
      return {
        data: result.data ? mapReviewRecordRowToDomain(result.data) : null,
        ok: true,
      };
    },

    async getReviewsInRange(userId, profileId, fromDate, toDate) {
      if (!inScope(userId, profileId)) return forbidden();

      const result = (await client
        .from(realDataTableNames.reviewRecords)
        .select("*")
        .eq("user_id", userId)
        .gte("period_start", fromDate)
        .lte("period_start", toDate)
        .is("archived_at", null)
        .order("period_start", { ascending: false })) as SupabaseQueryResult<
        readonly ReviewRecordRow[]
      >;

      if (result.error) return failure("Reviews could not be loaded.");
      return {
        data: (result.data ?? []).map(mapReviewRecordRowToDomain),
        ok: true,
      };
    },

    async getTaskDecisions(userId, reviewId) {
      const result = (await client
        .from(realDataTableNames.reviewTaskDecisions)
        .select("*")
        .eq("user_id", userId)
        .eq("review_id", reviewId)
        .order("created_at", { ascending: false })) as SupabaseQueryResult<
        readonly ReviewTaskDecisionRow[]
      >;

      if (result.error)
        return failure("Review task decisions could not be loaded.");
      return {
        data: (result.data ?? []).map(mapReviewTaskDecisionRowToDomain),
        ok: true,
      };
    },
  };
}

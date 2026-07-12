import type { ReviewRecord, ReviewTaskDecision } from "../../domain";
import type { ReviewRecordRow, ReviewTaskDecisionRow } from "../row-types";

export function mapReviewRecordRowToDomain(row: ReviewRecordRow): ReviewRecord {
  return {
    archivedAt: row.archived_at,
    blockers: row.blockers,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    id: row.id,
    kind: row.kind,
    nextPeriodFocus: row.next_period_focus,
    openLoops: row.open_loops,
    outcome: row.outcome,
    periodEnd: row.period_end,
    periodStart: row.period_start,
    planningNote: row.planning_note,
    profileId: row.user_id,
    status: row.status,
    timezone: row.timezone,
    updatedAt: row.updated_at,
    userId: row.user_id,
    wins: row.wins,
  };
}

export function mapReviewTaskDecisionRowToDomain(
  row: ReviewTaskDecisionRow,
): ReviewTaskDecision {
  return {
    createdAt: row.created_at,
    decision: row.decision,
    id: row.id,
    note: row.note,
    reviewId: row.review_id,
    targetDate: row.target_date,
    taskId: row.task_id,
    userId: row.user_id,
  };
}

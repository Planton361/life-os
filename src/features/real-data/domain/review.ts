import type {
  LocalDateString,
  ProfileId,
  ReviewRecordId,
  TimezoneId,
  UserScopedEntity,
} from "./ids";

export const reviewKinds = ["daily", "weekly"] as const;
export const reviewRecordStatuses = ["draft", "completed", "archived"] as const;

export type ReviewKind = (typeof reviewKinds)[number];
export type ReviewRecordStatus = (typeof reviewRecordStatuses)[number];

export type ReviewRecord = UserScopedEntity & {
  id: ReviewRecordId;
  profileId: ProfileId;
  kind: ReviewKind;
  periodStart: LocalDateString;
  periodEnd: LocalDateString;
  timezone: TimezoneId;
  status: ReviewRecordStatus;
  outcome: string | null;
  wins: readonly string[];
  blockers: readonly string[];
  openLoops: readonly string[];
  nextPeriodFocus: string | null;
  planningNote: string | null;
  completedAt: string | null;
};

export type ReviewTaskDecision = {
  id: string;
  userId: string;
  reviewId: ReviewRecordId;
  taskId: string;
  decision: "carry_forward";
  targetDate: LocalDateString;
  note: string | null;
  createdAt: string;
};

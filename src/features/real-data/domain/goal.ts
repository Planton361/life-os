import type {
  AreaId,
  GoalId,
  IsoDateTimeString,
  ProfileId,
  UserScopedEntity,
} from "./ids";

export const goalStatuses = [
  "draft",
  "active",
  "paused",
  "achieved",
  "archived",
] as const;

export const goalHorizons = [
  "week",
  "month",
  "quarter",
  "year",
  "someday",
] as const;

export type GoalStatus = (typeof goalStatuses)[number];
export type GoalHorizon = (typeof goalHorizons)[number];

export type Goal = UserScopedEntity & {
  id: GoalId;
  profileId: ProfileId;
  areaId: AreaId | null;
  title: string;
  description: string | null;
  status: GoalStatus;
  horizon: GoalHorizon;
  why: string | null;
  measure: string | null;
  targetValue: string | null;
  targetDate: IsoDateTimeString | null;
};

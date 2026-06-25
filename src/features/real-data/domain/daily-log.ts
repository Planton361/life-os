import type {
  DailyLogId,
  DailyLogTaskId,
  IsoDateTimeString,
  LocalDateString,
  ProfileId,
  TaskId,
  TimezoneId,
  UserScopedEntity,
} from "./ids";
import type { TaskEnergy } from "./task";

export const dailyLogStatuses = ["open", "closed", "archived"] as const;

export const dailyLogTaskRoles = [
  "planned",
  "completed",
  "carried_forward",
  "skipped",
  "note",
] as const;

export type DailyLogStatus = (typeof dailyLogStatuses)[number];
export type DailyLogTaskRole = (typeof dailyLogTaskRoles)[number];

export type DailyLog = UserScopedEntity & {
  id: DailyLogId;
  profileId: ProfileId;
  localDate: LocalDateString;
  timezone: TimezoneId;
  openingNote: string | null;
  closingNote: string | null;
  carryForwardNote: string | null;
  energy: TaskEnergy | null;
  mood: string | null;
  status: DailyLogStatus;
};

export type DailyLogTask = UserScopedEntity & {
  id: DailyLogTaskId;
  profileId: ProfileId;
  dailyLogId: DailyLogId;
  taskId: TaskId;
  role: DailyLogTaskRole;
  sortOrder: number;
  plannedState: string | null;
  note: string | null;
  carriedFromDailyLogId?: DailyLogId | null;
  createdAt: IsoDateTimeString;
};

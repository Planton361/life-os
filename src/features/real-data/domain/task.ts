import type {
  AreaId,
  DailyLogId,
  GoalId,
  InboxItemId,
  IsoDateTimeString,
  LocalDateString,
  ProfileId,
  ProjectId,
  RecurringTaskTemplateId,
  TaskId,
  UserScopedEntity,
} from "./ids";

export const taskStatuses = [
  "inbox",
  "planned",
  "active",
  "waiting",
  "done",
  "canceled",
  "someday",
  "archived",
] as const;

export const taskPriorities = ["P0", "P1", "P2", "P3", "none"] as const;

export const taskEnergies = ["low", "medium", "high"] as const;

export type TaskStatus = (typeof taskStatuses)[number];
export type TaskPriority = (typeof taskPriorities)[number];
export type TaskEnergy = (typeof taskEnergies)[number];

export type Task = UserScopedEntity & {
  id: TaskId;
  profileId: ProfileId;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  energy: TaskEnergy | null;
  areaId: AreaId | null;
  projectId: ProjectId | null;
  goalId: GoalId | null;
  sourceInboxItemId: InboxItemId | null;
  plannedDate: LocalDateString | null;
  scheduledStartAt: IsoDateTimeString | null;
  durationMinutes: number | null;
  dueAt: IsoDateTimeString | null;
  completedAt: IsoDateTimeString | null;
  carriedFromDailyLogId?: DailyLogId | null;
  generatedFromTemplateId?: RecurringTaskTemplateId | null;
  instanceDate?: LocalDateString | null;
};

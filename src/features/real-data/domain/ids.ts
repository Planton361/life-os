export type UserId = string;
export type ProfileId = string;
export type AreaId = string;
export type InboxItemId = string;
export type TaskId = string;
export type ProjectId = string;
export type GoalId = string;
export type DailyLogId = string;
export type DailyLogTaskId = string;
export type ResourceId = string;
export type ResourceRelationId = string;
export type RecurringTaskTemplateId = string;
export type EntityId = string;

export type LocalDateString = string;
export type IsoDateTimeString = string;
export type TimezoneId = string;

export type UserScopedEntity = {
  id: string;
  userId: UserId;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
  archivedAt?: IsoDateTimeString | null;
};

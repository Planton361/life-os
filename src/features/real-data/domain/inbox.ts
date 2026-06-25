import type {
  AreaId,
  InboxItemId,
  IsoDateTimeString,
  ProfileId,
  TaskId,
  UserScopedEntity,
} from "./ids";
import type { TaskPriority } from "./task";

export const inboxItemStatuses = [
  "raw",
  "clarified",
  "triaged",
  "processed",
  "archived",
] as const;

export const inboxItemTypes = [
  "task",
  "note",
  "question",
  "idea",
  "resource",
  "agent",
  "decision",
] as const;

export type InboxItemStatus = (typeof inboxItemStatuses)[number];
export type InboxItemType = (typeof inboxItemTypes)[number];

export type InboxItem = UserScopedEntity & {
  id: InboxItemId;
  profileId: ProfileId;
  areaId: AreaId | null;
  title: string;
  body: string | null;
  type: InboxItemType;
  status: InboxItemStatus;
  priority: TaskPriority;
  source: string | null;
  capturedAt: IsoDateTimeString;
  triagedAt: IsoDateTimeString | null;
  triagedTaskId: TaskId | null;
};

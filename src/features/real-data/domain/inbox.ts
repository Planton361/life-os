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
  // NULL for an unprocessed capture; its original text lives in body (#192).
  title: string | null;
  body: string | null;
  type: InboxItemType;
  status: InboxItemStatus;
  priority: TaskPriority;
  source: string | null;
  clarification?: {
    originalTitle: string | null; originalBody: string | null; nextAction: string | null;
    missingInfo: string | null; energy: "low" | "medium" | "high" | null;
    durationMinutes: number | null; reviewNeeded: boolean; todayCandidate: boolean;
    deadlineHint: string | null; updatedAt: string;
  };
  capturedAt: IsoDateTimeString;
  triagedAt: IsoDateTimeString | null;
  triagedTaskId: TaskId | null;
};

const inboxPreviewLength = 80;

// Display-only label (#192): the user's Clean Title, else a preview derived
// from the immutable original capture. The editable body is only a fallback
// for rows without an original snapshot. The preview is never stored.
export function inboxItemDisplayTitle(item: {
  title: string | null;
  body: string | null;
  originalBody?: string | null;
}): string {
  if (item.title) return item.title;
  const text = (item.originalBody?.trim() ? item.originalBody : (item.body ?? ""))
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "Ohne Titel";
  return text.length > inboxPreviewLength
    ? `${text.slice(0, inboxPreviewLength - 1).trimEnd()}…`
    : text;
}

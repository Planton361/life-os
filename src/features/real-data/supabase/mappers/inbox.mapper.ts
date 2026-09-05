import type { InboxItem } from "../../domain";
import type { CaptureInboxItemInput } from "../../schemas";
import type {
  InboxItemInsert,
  InboxItemRow,
  InboxItemUpdate,
} from "../row-types";

export type InboxItemUpdatePatchInput = {
  archivedAt?: string;
  createdTaskId?: string;
  processedAt?: string;
  status?: InboxItemUpdate["status"];
};

export function mapInboxItemRowToDomain(row: InboxItemRow): InboxItem {
  return {
    clarification: {
      originalTitle: row.original_title ?? row.title, originalBody: row.original_body,
      nextAction: row.next_action, missingInfo: row.missing_info, energy: row.energy,
      durationMinutes: row.duration_minutes, reviewNeeded: row.review_needed,
      todayCandidate: row.today_candidate, deadlineHint: row.deadline_hint, updatedAt: row.updated_at,
    },
    archivedAt: row.archived_at,
    areaId: row.area_id,
    body: row.body,
    capturedAt: row.captured_at,
    createdAt: row.created_at,
    id: row.id,
    priority: row.priority,
    profileId: row.user_id,
    source: row.source,
    status: row.status,
    title: row.title,
    triagedAt: row.processed_at,
    triagedTaskId: row.created_task_id,
    type: row.type,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

export function mapCaptureInboxItemInputToInsert(
  input: CaptureInboxItemInput,
  userId: string,
): InboxItemInsert {
  return {
    area_id: input.areaId ?? null,
    body: input.body ?? null,
    source: input.source ?? null,
    title: input.title,
    type: input.type ?? "note",
    user_id: userId,
  };
}

export function mapInboxItemUpdateToPatch(
  input: InboxItemUpdatePatchInput,
): InboxItemUpdate {
  const patch: InboxItemUpdate = {};

  if (input.archivedAt !== undefined) {
    patch.archived_at = input.archivedAt;
  }

  if (input.createdTaskId !== undefined) {
    patch.created_task_id = input.createdTaskId;
  }

  if (input.processedAt !== undefined) {
    patch.processed_at = input.processedAt;
  }

  if (input.status !== undefined) {
    patch.status = input.status;
  }

  return patch;
}

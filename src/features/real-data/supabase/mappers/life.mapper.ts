import type { JournalEntry } from "../../domain/life";
import type { EntertainmentItem } from "../../domain/life";
import type { TableRow } from "../database.types";

export function mapJournalEntryRow(row: TableRow<"journal_entries">): JournalEntry {
  return {
    archivedAt: row.archived_at,
    body: row.body,
    createdAt: row.created_at,
    entryDate: row.entry_date,
    id: row.id,
    title: row.title,
    updatedAt: row.updated_at,
  };
}

export function mapEntertainmentItemRow(row: TableRow<"entertainment_items">): EntertainmentItem {
  return {
    archivedAt: row.archived_at,
    completedOn: row.completed_on,
    createdAt: row.created_at,
    creatorOrStudio: row.creator_or_studio,
    id: row.id,
    mediaType: row.media_type as EntertainmentItem["mediaType"],
    notes: row.notes,
    progressCurrent: row.progress_current,
    progressTotal: row.progress_total,
    progressUnit: row.progress_unit as EntertainmentItem["progressUnit"],
    rating: row.rating,
    releaseYear: row.release_year,
    startedOn: row.started_on,
    status: row.status as EntertainmentItem["status"],
    title: row.title,
    updatedAt: row.updated_at,
  };
}

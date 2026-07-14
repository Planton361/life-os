import type { JournalEntry } from "../../domain/life";
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

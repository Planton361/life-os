import type { EntertainmentItem, InventoryItem, JournalEntry, PurchaseDecision, WishlistItem } from "../../domain/life";
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

export function mapInventoryItemRow(row: TableRow<"inventory_items">, sourceWishlistTitle: string | null = null): InventoryItem {
  return { acquiredOn: row.acquired_on, acquisitionValue: row.acquisition_value === null ? null : Number(row.acquisition_value), archivedAt: row.archived_at, category: row.category, condition: row.condition as InventoryItem["condition"], createdAt: row.created_at, currency: row.currency, description: row.description, id: row.id, location: row.location, name: row.name, quantity: row.quantity === null ? null : Number(row.quantity), sourceWishlistItemId: row.source_wishlist_item_id, sourceWishlistTitle, unit: row.unit, updatedAt: row.updated_at };
}

export function mapWishlistItemRow(row: TableRow<"wishlist_items">): WishlistItem {
  return { archivedAt: row.archived_at, category: row.category, createdAt: row.created_at, currency: row.currency, description: row.description, expectedPrice: row.expected_price === null ? null : Number(row.expected_price), id: row.id, priority: row.priority as WishlistItem["priority"], status: row.status as WishlistItem["status"], targetDate: row.target_date, title: row.title, updatedAt: row.updated_at };
}

export function mapPurchaseDecisionRow(row: TableRow<"purchase_decisions">): PurchaseDecision {
  return { archivedAt: row.archived_at, context: row.context, createdAt: row.created_at, criteria: row.criteria, decision: row.decision, decisionDate: row.decision_date, id: row.id, inventoryItemId: row.inventory_item_id, rationale: row.rationale, status: row.status as PurchaseDecision["status"], updatedAt: row.updated_at, wishlistItemId: row.wishlist_item_id };
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

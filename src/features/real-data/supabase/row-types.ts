import type { TableInsert, TableRow, TableUpdate } from "./database.types";

export type InboxItemRow = TableRow<"inbox_items">;
export type InboxItemInsert = TableInsert<"inbox_items">;
export type InboxItemUpdate = TableUpdate<"inbox_items">;

export type TaskRow = TableRow<"tasks">;
export type TaskInsert = TableInsert<"tasks">;
export type TaskUpdate = TableUpdate<"tasks">;

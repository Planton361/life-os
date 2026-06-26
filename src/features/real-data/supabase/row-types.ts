import type { TableInsert, TableRow, TableUpdate } from "./database.types";

export type InboxItemRow = TableRow<"inbox_items">;
export type InboxItemInsert = TableInsert<"inbox_items">;
export type InboxItemUpdate = TableUpdate<"inbox_items">;

export type GoalRow = TableRow<"goals">;
export type GoalInsert = TableInsert<"goals">;
export type GoalUpdate = TableUpdate<"goals">;

export type ProjectRow = TableRow<"projects">;
export type ProjectInsert = TableInsert<"projects">;
export type ProjectUpdate = TableUpdate<"projects">;

export type TaskRow = TableRow<"tasks">;
export type TaskInsert = TableInsert<"tasks">;
export type TaskUpdate = TableUpdate<"tasks">;

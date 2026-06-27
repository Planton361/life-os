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

export type ResourceRow = TableRow<"resources">;
export type ResourceInsert = TableInsert<"resources">;
export type ResourceUpdate = TableUpdate<"resources">;

export type ResourceRelationRow = TableRow<"resource_relations">;
export type ResourceRelationInsert = TableInsert<"resource_relations">;
export type ResourceRelationUpdate = TableUpdate<"resource_relations">;

export type RecurringTaskTemplateRow = TableRow<"recurring_task_templates">;
export type RecurringTaskTemplateInsert =
  TableInsert<"recurring_task_templates">;
export type RecurringTaskTemplateUpdate =
  TableUpdate<"recurring_task_templates">;

export type TaskRow = TableRow<"tasks">;
export type TaskInsert = TableInsert<"tasks">;
export type TaskUpdate = TableUpdate<"tasks">;

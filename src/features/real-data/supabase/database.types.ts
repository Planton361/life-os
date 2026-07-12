import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export type { Database };

export type PublicTables = Database["public"]["Tables"];
export type PublicTableName = keyof PublicTables;

export type TableRow<TTable extends PublicTableName> =
  PublicTables[TTable]["Row"];

export type TableInsert<TTable extends PublicTableName> =
  PublicTables[TTable]["Insert"];

export type TableUpdate<TTable extends PublicTableName> =
  PublicTables[TTable]["Update"];

export const realDataTableNames = {
  goals: "goals",
  habits: "habits",
  habitLogs: "habit_logs",
  inboxItems: "inbox_items",
  meals: "meals",
  recipeIngredients: "recipe_ingredients",
  projects: "projects",
  recipes: "recipes",
  reviewRecords: "review_records",
  reviewTaskDecisions: "review_task_decisions",
  recurringTaskTemplates: "recurring_task_templates",
  resourceRelations: "resource_relations",
  resources: "resources",
  skillEvidence: "skill_evidence",
  skills: "skills",
  tasks: "tasks",
} as const satisfies Record<string, PublicTableName>;

export type SupabaseRepositoryError = {
  code?: string;
  details?: string;
  hint?: string;
  message: string;
};

export type SupabaseQueryResult<TData> = {
  data: TData | null;
  error: SupabaseRepositoryError | null;
};

export type SupabaseClientLike = SupabaseClient<Database>;

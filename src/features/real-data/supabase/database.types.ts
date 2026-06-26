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
  inboxItems: "inbox_items",
  projects: "projects",
  resources: "resources",
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

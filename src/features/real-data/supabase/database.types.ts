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
  inboxItems: "inbox_items",
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

type OrderOptions = {
  ascending?: boolean;
  foreignTable?: string;
  nullsFirst?: boolean;
  referencedTable?: string;
};

export type SupabaseQueryBuilder<TData = unknown> =
  PromiseLike<SupabaseQueryResult<TData>> & {
    eq(column: string, value: unknown): SupabaseQueryBuilder<TData>;
    gte(column: string, value: unknown): SupabaseQueryBuilder<TData>;
    insert(values: unknown): SupabaseQueryBuilder<TData>;
    is(column: string, value: unknown): SupabaseQueryBuilder<TData>;
    lte(column: string, value: unknown): SupabaseQueryBuilder<TData>;
    order(column: string, options?: OrderOptions): SupabaseQueryBuilder<TData>;
    select(columns?: string): SupabaseQueryBuilder<TData>;
    single(): SupabaseQueryBuilder<TData>;
    update(values: unknown): SupabaseQueryBuilder<TData>;
  };

export type SupabaseClientLike = {
  from<TTable extends PublicTableName>(
    table: TTable,
  ): SupabaseQueryBuilder<unknown>;
};

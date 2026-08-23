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
  antiRotActions: "anti_rot_actions",
  antiRotEvents: "anti_rot_events",
  challengeProgressLogs: "challenge_progress_logs",
  challenges: "challenges",
  entertainmentItems: "entertainment_items",
  inventoryItems: "inventory_items",
  journalEntries: "journal_entries",
  purchaseDecisions: "purchase_decisions",
  goals: "goals",
  habits: "habits",
  habitLogs: "habit_logs",
  inboxItems: "inbox_items",
  meals: "meals",
  recipeIngredients: "recipe_ingredients",
  projects: "projects",
  recipes: "recipes",
  rewardLedgerEntries: "reward_ledger_entries",
  shopItems: "shop_items",
  shopRedemptions: "shop_redemptions",
  reviewRecords: "review_records",
  reviewTaskDecisions: "review_task_decisions",
  recurringTaskTemplates: "recurring_task_templates",
  resourceRelations: "resource_relations",
  resources: "resources",
  skillEvidence: "skill_evidence",
  skills: "skills",
  taskSkillLinks: "task_skill_links",
  tasks: "tasks",
  runningPlans: "running_plans",
  runningPlanItems: "running_plan_items",
  runningSessions: "running_sessions",
  exercises: "exercises",
  exerciseMuscles: "exercise_muscles",
  strengthPlans: "strength_plans",
  strengthPlanItems: "strength_plan_items",
  strengthSessions: "strength_sessions",
  strengthSetLogs: "strength_set_logs",
  wishlistItems: "wishlist_items",
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

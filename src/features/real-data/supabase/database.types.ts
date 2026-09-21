import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json } from "@/types/supabase";
import type { Database as GeneratedDatabase } from "@/types/supabase";

type GoalPathTable<TRow, TInsert = TRow, TUpdate = Partial<TInsert>> = {
  Row: TRow;
  Insert: TInsert;
  Update: TUpdate;
  Relationships: [];
};

type GoalPathCriterionEvaluationRow = {
  id: string;
  user_id: string;
  criterion_id: string;
  is_deferred: boolean;
  boolean_value: boolean | null;
  numeric_value: number | null;
  unit: string | null;
  evaluated_at: string;
  recorded_at: string;
  note: string | null;
  created_at: string;
  goal_id_snapshot: string | null;
  goal_milestone_id_snapshot: string | null;
  criterion_title_snapshot: string | null;
  criterion_type_snapshot:
    | GeneratedDatabase["public"]["Enums"]["goal_criterion_type"]
    | null;
  unit_snapshot: string | null;
  target_snapshot: number | null;
  direction_snapshot:
    | GeneratedDatabase["public"]["Enums"]["goal_criterion_direction"]
    | null;
  revision_kind: string;
  supersedes_evaluation_id: string | null;
  correction_reason: string | null;
  is_retracted: boolean;
  legacy_state: Json | null;
  retrospective: boolean;
};

type GoalPathCriterionEvaluationInsert =
  Partial<GoalPathCriterionEvaluationRow> & {
    user_id: string;
    criterion_id: string;
  };

type GoalPathTables = Omit<
  GeneratedDatabase["public"]["Tables"],
  | "goal_criterion_evaluations"
  | "goal_command_receipts"
  | "goal_milestone_achievement_events"
  | "goal_achievement_events"
  | "goal_achievement_criterion_basis"
  | "goal_achievement_milestone_basis"
  | "goal_criterion_evaluation_evidence"
  | "goal_milestone_achievement_evidence"
  | "goal_achievement_evidence"
> & {
  goal_criterion_evaluations: GoalPathTable<
    GoalPathCriterionEvaluationRow,
    GoalPathCriterionEvaluationInsert,
    Partial<GoalPathCriterionEvaluationInsert>
  >;
  goal_command_receipts: GoalPathTable<{
    id: string;
    user_id: string;
    command_id: string;
    command_kind: string;
    request_fingerprint: string;
    result_payload: Json;
    created_at: string;
  }>;
  goal_milestone_achievement_events: GoalPathTable<{
    id: string;
    user_id: string;
    goal_id: string;
    goal_milestone_id: string;
    episode_id: string;
    event_type: string;
    occurred_at: string | null;
    recorded_at: string;
    goal_title_snapshot: string | null;
    goal_milestone_title_snapshot: string | null;
    goal_milestone_description_snapshot: string | null;
    prior_status:
      | GeneratedDatabase["public"]["Enums"]["goal_milestone_status"]
      | null;
    resulting_status:
      | GeneratedDatabase["public"]["Enums"]["goal_milestone_status"]
      | null;
    note: string | null;
    legacy_state: Json | null;
    corrects_event_id: string | null;
    correction_reason: string | null;
    retrospective: boolean;
    command_id: string | null;
    created_at: string;
  }>;
  goal_achievement_events: GoalPathTable<{
    id: string;
    user_id: string;
    goal_id: string;
    episode_id: string;
    event_type: string;
    occurred_at: string | null;
    recorded_at: string;
    goal_title_snapshot: string | null;
    prior_status: GeneratedDatabase["public"]["Enums"]["goal_status"] | null;
    resulting_status:
      | GeneratedDatabase["public"]["Enums"]["goal_status"]
      | null;
    achievement_note: string | null;
    legacy_state: Json | null;
    corrects_event_id: string | null;
    correction_reason: string | null;
    retrospective: boolean;
    command_id: string | null;
    created_at: string;
  }>;
  goal_achievement_criterion_basis: GoalPathTable<{
    id: string;
    user_id: string;
    achievement_event_id: string;
    criterion_id: string;
    evaluation_id: string | null;
    criterion_title_snapshot: string | null;
    criterion_type_snapshot:
      | GeneratedDatabase["public"]["Enums"]["goal_criterion_type"]
      | null;
    goal_milestone_id_snapshot: string | null;
    unit_snapshot: string | null;
    target_snapshot: number | null;
    direction_snapshot:
      | GeneratedDatabase["public"]["Enums"]["goal_criterion_direction"]
      | null;
    evaluation_state_snapshot: string | null;
    evaluation_occurred_at: string | null;
    legacy_state: Json | null;
    created_at: string;
  }>;
  goal_achievement_milestone_basis: GoalPathTable<{
    id: string;
    user_id: string;
    achievement_event_id: string;
    milestone_id: string;
    achievement_episode_id: string | null;
    milestone_title_snapshot: string | null;
    resulting_status_snapshot:
      | GeneratedDatabase["public"]["Enums"]["goal_milestone_status"]
      | null;
    legacy_state: Json | null;
    created_at: string;
  }>;
  goal_criterion_evaluation_evidence: GoalPathTable<{
    id: string;
    user_id: string;
    evaluation_id: string;
    reference_group_id: string;
    reference_action: string;
    source_type: string;
    source_id: string;
    source_title_snapshot: string | null;
    source_context_snapshot: Json | null;
    supersedes_reference_id: string | null;
    reason: string | null;
    retrospective: boolean;
    occurred_at: string | null;
    recorded_at: string;
    created_at: string;
  }>;
  goal_milestone_achievement_evidence: GoalPathTable<{
    id: string;
    user_id: string;
    achievement_event_id: string;
    episode_id: string;
    reference_group_id: string;
    reference_action: string;
    source_type: string;
    source_id: string;
    source_title_snapshot: string | null;
    source_context_snapshot: Json | null;
    supersedes_reference_id: string | null;
    reason: string | null;
    retrospective: boolean;
    occurred_at: string | null;
    recorded_at: string;
    created_at: string;
  }>;
  goal_achievement_evidence: GoalPathTable<{
    id: string;
    user_id: string;
    achievement_event_id: string;
    reference_group_id: string;
    reference_action: string;
    source_type: string;
    source_id: string;
    source_title_snapshot: string | null;
    source_context_snapshot: Json | null;
    supersedes_reference_id: string | null;
    reason: string | null;
    retrospective: boolean;
    occurred_at: string | null;
    recorded_at: string;
    created_at: string;
  }>;
};

type GoalPathFunctions = {
  execute_goal_command: {
    Args: {
      p_command_kind: string;
      p_command_id: string;
      p_request_fingerprint: string;
      p_payload?: Json;
    };
    Returns: Json;
  };
  goal_source_snapshot: {
    Args: { p_user_id: string; p_source_type: string; p_source_id: string };
    Returns: { title: string; context: Json }[];
  };
};

export type Database = Omit<GeneratedDatabase, "public"> & {
  public: Omit<GeneratedDatabase["public"], "Tables" | "Functions"> & {
    Tables: GoalPathTables;
    Functions: GeneratedDatabase["public"]["Functions"] & GoalPathFunctions;
  };
};

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
  goalMilestones: "goal_milestones",
  goalOutcomeCriteria: "goal_outcome_criteria",
  goalCriterionEvaluations: "goal_criterion_evaluations",
  goalCommandReceipts: "goal_command_receipts",
  goalMilestoneAchievementEvents: "goal_milestone_achievement_events",
  goalAchievementEvents: "goal_achievement_events",
  goalAchievementCriterionBasis: "goal_achievement_criterion_basis",
  goalAchievementMilestoneBasis: "goal_achievement_milestone_basis",
  goalCriterionEvaluationEvidence: "goal_criterion_evaluation_evidence",
  goalMilestoneAchievementEvidence: "goal_milestone_achievement_evidence",
  goalAchievementEvidence: "goal_achievement_evidence",
  goalMilestoneProjectSupport: "goal_milestone_project_support",
  goalMilestoneTaskSupport: "goal_milestone_task_support",
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

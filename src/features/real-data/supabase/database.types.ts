import type { SkillDevelopmentRead } from "../domain/skill-development";
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

type ProjectDepthProject = GeneratedDatabase["public"]["Tables"]["projects"];
type ProjectDepthTable<TRow> = {
  Row: TRow;
  Insert: Partial<TRow>;
  Update: Partial<TRow>;
  Relationships: [];
};
type ProjectDepthTables = {
  projects: {
    Row: ProjectDepthProject["Row"] & {
      desired_result: string | null;
      completion_revision: number;
      completion_cycle: number;
    };
    Insert: ProjectDepthProject["Insert"] & {
      desired_result?: string | null;
      completion_revision?: number;
      completion_cycle?: number;
    };
    Update: ProjectDepthProject["Update"] & {
      desired_result?: string | null;
      completion_revision?: number;
      completion_cycle?: number;
    };
    Relationships: ProjectDepthProject["Relationships"];
  };
  project_completion_criteria: ProjectDepthTable<{
    id: string; user_id: string; project_id: string; text: string;
    sort_order: number; created_at: string; updated_at: string;
    archived_at: string | null; archive_reason: string | null;
    archived_cycle: number | null; archived_revision: number | null;
  }>;
  project_reviews: ProjectDepthTable<{
    id: string; user_id: string; project_id: string; completion_cycle: number;
    revision_before: number; revision_after: number; snapshot_version: number;
    project_title_snapshot: string; desired_result_snapshot: string | null;
    goal_id_snapshot: string | null; goal_title_snapshot: string | null;
    decision: "completed" | "continue"; prior_status: string; resulting_status: string;
    result_accepted: boolean; rationale: string; work_observed_at: string;
    open_task_count: number; done_task_count: number; canceled_task_count: number;
    open_milestone_count: number; done_milestone_count: number;
    open_work_acknowledged: boolean; open_work_disposition: string | null;
    archived_criteria_acknowledged: boolean; context_fingerprint: string;
    reviewed_at: string; command_id: string;
  }>;
  project_review_criteria: ProjectDepthTable<{
    user_id: string; project_id: string; review_id: string; criterion_id: string;
    text_snapshot: string; sort_order_snapshot: number; was_archived: boolean;
    decision: "satisfied" | "not_satisfied" | "not_assessed" | "excluded";
    rationale: string | null; archive_reason_snapshot: string | null;
    archived_cycle_snapshot: number | null; archived_revision_snapshot: number | null;
  }>;
  project_review_resources: ProjectDepthTable<{
    id: string; user_id: string; project_id: string; review_id: string;
    criterion_id: string | null; resource_id: string; relation_id_snapshot: string;
    title_snapshot: string; resource_type_snapshot: string; safe_url_snapshot: string | null;
    relation_type_snapshot: string; project_role_snapshot: string; note: string | null;
  }>;
  project_lifecycle_events: ProjectDepthTable<{
    id: string; user_id: string; project_id: string; command_id: string;
    event_kind: "reopened" | "archived"; recorded_at: string; revision_after: number;
    cycle_before: number; cycle_after: number; project_title_snapshot: string;
    prior_status: string; resulting_status: string; prior_completion_kind: "review" | "legacy_without_review" | null;
    prior_review_id: string | null; reason: string | null; mistaken_completion: boolean;
  }>;
  project_review_amendments: ProjectDepthTable<{
    id: string; user_id: string; project_id: string; review_id: string; command_id: string;
    revision_after: number; kind: "clarification" | "evidence_withdrawn" | "marked_mistaken";
    review_resource_id: string | null; reason: string; recorded_at: string;
  }>;
  project_command_receipts: ProjectDepthTable<{
    user_id: string; project_id: string; command_id: string; command_kind: string;
    request_payload: Json; request_fingerprint: string; result_payload: Json; created_at: string;
  }>;
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
  | "projects"
  | "skills"
  | "skill_evidence"
> & {
  skills: {
    Row: GeneratedDatabase["public"]["Tables"]["skills"]["Row"] & {
      development_revision: number;
    };
    Insert: GeneratedDatabase["public"]["Tables"]["skills"]["Insert"];
    Update: GeneratedDatabase["public"]["Tables"]["skills"]["Update"];
    Relationships: [];
  };
  skill_evidence: {
    Row: GeneratedDatabase["public"]["Tables"]["skill_evidence"]["Row"] & {
      revision: number;
      withdrawn_at: string | null;
      source_snapshot: Json | null;
      provenance_state: string;
    };
    Insert: GeneratedDatabase["public"]["Tables"]["skill_evidence"]["Insert"];
    Update: GeneratedDatabase["public"]["Tables"]["skill_evidence"]["Update"];
    Relationships: [];
  };
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
} & ProjectDepthTables;

type GoalPathFunctions = {
  project_depth_history: { Args: { p_project_id: string; p_before_revision?: string }; Returns: Json };
  project_review_context: {
    Args: { p_project_id: string };
    Returns: Json;
  };
  project_depth_command: {
    Args: {
      p_project_id: string;
      p_command_id: string;
      p_operation: string;
      p_expected_revision: string | number;
      p_expected_cycle: string | number;
      p_payload: Json;
    };
    Returns: Json;
  };
  execute_goal_command: {
    Args: {
      p_command_kind: string;
      p_command_id: string;
      p_request_fingerprint: string;
      p_payload?: Json;
    };
    Returns: Json;
  };
  set_goal_current_milestone: {
    Args: {
      p_goal_id: string;
      p_milestone_id: string;
      p_expected_updated_at?: string | null;
      p_command_id?: string | null;
      p_request_fingerprint?: string | null;
    };
    Returns: Json;
  };
  review_goal_milestone: {
    Args: {
      p_goal_id: string;
      p_milestone_id: string;
      p_command_id: string;
      p_request_fingerprint: string;
      p_expected_updated_at?: string | null;
      p_note?: string | null;
    };
    Returns: Json;
  };
  create_goal_milestone_task: {
    Args: {
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
    Functions: GeneratedDatabase["public"]["Functions"] &
      GoalPathFunctions & {
        skill_development_command: {
          Args: {
            p_skill_id: string | null;
            p_command_id: string;
            p_operation: string;
            p_expected_revision: number | null;
            p_payload: Json;
          };
          Returns: Json;
        };
        skill_development_read: {
          Args: { p_skill_id: string };
          Returns: SkillDevelopmentRead;
        };
      };
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

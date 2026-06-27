export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      areas: {
        Row: {
          archived_at: string | null
          color: string | null
          created_at: string
          id: string
          key: Database["public"]["Enums"]["area_key"]
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          color?: string | null
          created_at?: string
          id?: string
          key: Database["public"]["Enums"]["area_key"]
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          color?: string | null
          created_at?: string
          id?: string
          key?: Database["public"]["Enums"]["area_key"]
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_log_tasks: {
        Row: {
          created_at: string
          daily_log_id: string
          id: string
          note: string | null
          relation_type: Database["public"]["Enums"]["daily_log_task_relation_type"]
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_log_id: string
          id?: string
          note?: string | null
          relation_type?: Database["public"]["Enums"]["daily_log_task_relation_type"]
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_log_id?: string
          id?: string
          note?: string | null
          relation_type?: Database["public"]["Enums"]["daily_log_task_relation_type"]
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_log_tasks_daily_log_id_fkey"
            columns: ["daily_log_id"]
            isOneToOne: false
            referencedRelation: "daily_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_log_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_logs: {
        Row: {
          archived_at: string | null
          carry_forward_note: string | null
          closing_note: string | null
          created_at: string
          energy: Database["public"]["Enums"]["task_energy"] | null
          id: string
          local_date: string
          mood: string | null
          opening_note: string | null
          status: Database["public"]["Enums"]["daily_log_status"]
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          carry_forward_note?: string | null
          closing_note?: string | null
          created_at?: string
          energy?: Database["public"]["Enums"]["task_energy"] | null
          id?: string
          local_date: string
          mood?: string | null
          opening_note?: string | null
          status?: Database["public"]["Enums"]["daily_log_status"]
          timezone: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          carry_forward_note?: string | null
          closing_note?: string | null
          created_at?: string
          energy?: Database["public"]["Enums"]["task_energy"] | null
          id?: string
          local_date?: string
          mood?: string | null
          opening_note?: string | null
          status?: Database["public"]["Enums"]["daily_log_status"]
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          archived_at: string | null
          area_id: string | null
          created_at: string
          description: string | null
          horizon: string | null
          id: string
          measure: string | null
          progress: number
          status: Database["public"]["Enums"]["goal_status"]
          target_date: string | null
          target_value: string | null
          title: string
          updated_at: string
          user_id: string
          why: string | null
        }
        Insert: {
          archived_at?: string | null
          area_id?: string | null
          created_at?: string
          description?: string | null
          horizon?: string | null
          id?: string
          measure?: string | null
          progress?: number
          status?: Database["public"]["Enums"]["goal_status"]
          target_date?: string | null
          target_value?: string | null
          title: string
          updated_at?: string
          user_id: string
          why?: string | null
        }
        Update: {
          archived_at?: string | null
          area_id?: string | null
          created_at?: string
          description?: string | null
          horizon?: string | null
          id?: string
          measure?: string | null
          progress?: number
          status?: Database["public"]["Enums"]["goal_status"]
          target_date?: string | null
          target_value?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          why?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goals_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_items: {
        Row: {
          archived_at: string | null
          area_id: string | null
          body: string | null
          captured_at: string
          created_at: string
          created_task_id: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          processed_at: string | null
          source: string | null
          status: Database["public"]["Enums"]["inbox_item_status"]
          title: string
          type: Database["public"]["Enums"]["inbox_item_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          area_id?: string | null
          body?: string | null
          captured_at?: string
          created_at?: string
          created_task_id?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          processed_at?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["inbox_item_status"]
          title: string
          type?: Database["public"]["Enums"]["inbox_item_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          area_id?: string | null
          body?: string | null
          captured_at?: string
          created_at?: string
          created_task_id?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          processed_at?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["inbox_item_status"]
          title?: string
          type?: Database["public"]["Enums"]["inbox_item_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_items_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbox_items_created_task_id_fkey"
            columns: ["created_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      meals: {
        Row: {
          completed_at: string | null
          created_at: string
          date: string
          id: string
          meal_type: string
          notes: string | null
          planned_at: string | null
          recipe_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          date: string
          id?: string
          meal_type: string
          notes?: string | null
          planned_at?: string | null
          recipe_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          date?: string
          id?: string
          meal_type?: string
          notes?: string | null
          planned_at?: string | null
          recipe_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meals_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          archived_at: string | null
          area_id: string | null
          created_at: string
          description: string | null
          goal_id: string | null
          id: string
          next_step: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          progress: number
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          target_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          area_id?: string | null
          created_at?: string
          description?: string | null
          goal_id?: string | null
          id?: string
          next_step?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          progress?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          target_date?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          area_id?: string | null
          created_at?: string
          description?: string | null
          goal_id?: string | null
          id?: string
          next_step?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          progress?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          target_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          area_id: string | null
          created_at: string
          id: string
          instructions: string | null
          is_archived: boolean
          nutrition_estimate: Json | null
          prep_minutes: number | null
          servings: number | null
          source: string | null
          summary: string | null
          tags: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area_id?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          is_archived?: boolean
          nutrition_estimate?: Json | null
          prep_minutes?: number | null
          servings?: number | null
          source?: string | null
          summary?: string | null
          tags?: Json
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area_id?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          is_archived?: boolean
          nutrition_estimate?: Json | null
          prep_minutes?: number | null
          servings?: number | null
          source?: string | null
          summary?: string | null
          tags?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_task_templates: {
        Row: {
          area_id: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          ends_on: string | null
          energy: Database["public"]["Enums"]["task_energy"] | null
          goal_id: string | null
          id: string
          is_active: boolean
          next_action: string | null
          priority: Database["public"]["Enums"]["task_priority"] | null
          project_id: string | null
          recurrence_rule: Json
          starts_on: string
          timezone: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          ends_on?: string | null
          energy?: Database["public"]["Enums"]["task_energy"] | null
          goal_id?: string | null
          id?: string
          is_active?: boolean
          next_action?: string | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          project_id?: string | null
          recurrence_rule: Json
          starts_on: string
          timezone?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          ends_on?: string | null
          energy?: Database["public"]["Enums"]["task_energy"] | null
          goal_id?: string | null
          id?: string
          is_active?: boolean
          next_action?: string | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          project_id?: string | null
          recurrence_rule?: Json
          starts_on?: string
          timezone?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_task_templates_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_task_templates_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_task_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_relations: {
        Row: {
          created_at: string
          id: string
          relation_type: Database["public"]["Enums"]["resource_relation_type"]
          resource_id: string
          target_id: string
          target_type: Database["public"]["Enums"]["resource_relation_target_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          relation_type?: Database["public"]["Enums"]["resource_relation_type"]
          resource_id: string
          target_id: string
          target_type: Database["public"]["Enums"]["resource_relation_target_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          relation_type?: Database["public"]["Enums"]["resource_relation_type"]
          resource_id?: string
          target_id?: string
          target_type?: Database["public"]["Enums"]["resource_relation_target_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_relations_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          archived_at: string | null
          area_id: string | null
          created_at: string
          id: string
          review_needed: boolean
          source: string | null
          summary: string | null
          title: string
          type: Database["public"]["Enums"]["resource_type"]
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          area_id?: string | null
          created_at?: string
          id?: string
          review_needed?: boolean
          source?: string | null
          summary?: string | null
          title: string
          type?: Database["public"]["Enums"]["resource_type"]
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          area_id?: string | null
          created_at?: string
          id?: string
          review_needed?: boolean
          source?: string | null
          summary?: string | null
          title?: string
          type?: Database["public"]["Enums"]["resource_type"]
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          archived_at: string | null
          area_id: string | null
          carried_from_daily_log_id: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_at: string | null
          duration_minutes: number | null
          energy: Database["public"]["Enums"]["task_energy"] | null
          generated_from_template_id: string | null
          goal_id: string | null
          id: string
          instance_date: string | null
          planned_date: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string | null
          scheduled_start_at: string | null
          source_inbox_item_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          area_id?: string | null
          carried_from_daily_log_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          duration_minutes?: number | null
          energy?: Database["public"]["Enums"]["task_energy"] | null
          generated_from_template_id?: string | null
          goal_id?: string | null
          id?: string
          instance_date?: string | null
          planned_date?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          scheduled_start_at?: string | null
          source_inbox_item_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          area_id?: string | null
          carried_from_daily_log_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          duration_minutes?: number | null
          energy?: Database["public"]["Enums"]["task_energy"] | null
          generated_from_template_id?: string | null
          goal_id?: string | null
          id?: string
          instance_date?: string | null
          planned_date?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          scheduled_start_at?: string | null
          source_inbox_item_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_carried_from_daily_log_id_fkey"
            columns: ["carried_from_daily_log_id"]
            isOneToOne: false
            referencedRelation: "daily_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_generated_from_template_id_fkey"
            columns: ["generated_from_template_id"]
            isOneToOne: false
            referencedRelation: "recurring_task_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_source_inbox_item_id_fkey"
            columns: ["source_inbox_item_id"]
            isOneToOne: false
            referencedRelation: "inbox_items"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_resource_from_inbox: {
        Args: {
          p_area_id?: string
          p_inbox_item_id: string
          p_review_needed?: boolean
          p_summary?: string
          p_title: string
          p_type: Database["public"]["Enums"]["resource_type"]
          p_url?: string
        }
        Returns: {
          archived_at: string | null
          area_id: string | null
          created_at: string
          id: string
          review_needed: boolean
          source: string | null
          summary: string | null
          title: string
          type: Database["public"]["Enums"]["resource_type"]
          updated_at: string
          url: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "resources"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      triage_inbox_item_to_task: {
        Args: {
          p_area_id?: string
          p_description?: string
          p_due_at?: string
          p_duration_minutes?: number
          p_energy?: Database["public"]["Enums"]["task_energy"]
          p_goal_id?: string
          p_inbox_item_id: string
          p_planned_date?: string
          p_priority?: Database["public"]["Enums"]["task_priority"]
          p_project_id?: string
          p_scheduled_start_at?: string
          p_title: string
        }
        Returns: {
          archived_at: string | null
          area_id: string | null
          carried_from_daily_log_id: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_at: string | null
          duration_minutes: number | null
          energy: Database["public"]["Enums"]["task_energy"] | null
          generated_from_template_id: string | null
          goal_id: string | null
          id: string
          instance_date: string | null
          planned_date: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string | null
          scheduled_start_at: string | null
          source_inbox_item_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      area_key:
        | "dashboard"
        | "inbox"
        | "today"
        | "calendar"
        | "portfolio"
        | "resources"
        | "health"
        | "nutrition"
        | "coding"
        | "life"
        | "education"
        | "work"
        | "shop"
        | "challenges"
        | "settings"
        | "review"
        | "system"
        | "personal"
      daily_log_status: "open" | "closed" | "archived"
      daily_log_task_relation_type:
        | "planned"
        | "completed"
        | "carried_forward"
        | "skipped"
        | "note"
      goal_status: "draft" | "active" | "paused" | "achieved" | "archived"
      inbox_item_status:
        | "raw"
        | "clarified"
        | "triaged"
        | "processed"
        | "archived"
      inbox_item_type:
        | "task"
        | "note"
        | "question"
        | "idea"
        | "resource"
        | "agent"
        | "decision"
      project_status:
        | "idea"
        | "active"
        | "paused"
        | "blocked"
        | "completed"
        | "archived"
      resource_relation_target_type:
        | "inbox_item"
        | "task"
        | "project"
        | "goal"
        | "daily_log"
        | "resource"
        | "area"
      resource_relation_type:
        | "source"
        | "context"
        | "supports"
        | "evidence"
        | "decision"
        | "related"
      resource_type:
        | "note"
        | "learning"
        | "prompt"
        | "research"
        | "link"
        | "source"
        | "snippet"
        | "decision"
      task_energy: "low" | "medium" | "high"
      task_priority: "P0" | "P1" | "P2" | "P3" | "none"
      task_status:
        | "inbox"
        | "planned"
        | "active"
        | "waiting"
        | "done"
        | "canceled"
        | "someday"
        | "archived"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      area_key: [
        "dashboard",
        "inbox",
        "today",
        "calendar",
        "portfolio",
        "resources",
        "health",
        "nutrition",
        "coding",
        "life",
        "education",
        "work",
        "shop",
        "challenges",
        "settings",
        "review",
        "system",
        "personal",
      ],
      daily_log_status: ["open", "closed", "archived"],
      daily_log_task_relation_type: [
        "planned",
        "completed",
        "carried_forward",
        "skipped",
        "note",
      ],
      goal_status: ["draft", "active", "paused", "achieved", "archived"],
      inbox_item_status: [
        "raw",
        "clarified",
        "triaged",
        "processed",
        "archived",
      ],
      inbox_item_type: [
        "task",
        "note",
        "question",
        "idea",
        "resource",
        "agent",
        "decision",
      ],
      project_status: [
        "idea",
        "active",
        "paused",
        "blocked",
        "completed",
        "archived",
      ],
      resource_relation_target_type: [
        "inbox_item",
        "task",
        "project",
        "goal",
        "daily_log",
        "resource",
        "area",
      ],
      resource_relation_type: [
        "source",
        "context",
        "supports",
        "evidence",
        "decision",
        "related",
      ],
      resource_type: [
        "note",
        "learning",
        "prompt",
        "research",
        "link",
        "source",
        "snippet",
        "decision",
      ],
      task_energy: ["low", "medium", "high"],
      task_priority: ["P0", "P1", "P2", "P3", "none"],
      task_status: [
        "inbox",
        "planned",
        "active",
        "waiting",
        "done",
        "canceled",
        "someday",
        "archived",
      ],
    },
  },
} as const

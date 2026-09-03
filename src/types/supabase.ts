export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      anti_rot_actions: {
        Row: {
          archived_at: string | null
          category: string | null
          created_at: string
          description: string | null
          energy: string | null
          estimated_minutes: number | null
          id: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          energy?: string | null
          estimated_minutes?: number | null
          id?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          energy?: string | null
          estimated_minutes?: number | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      anti_rot_events: {
        Row: {
          action_id: string
          created_at: string
          event_type: string
          id: string
          recommendation_event_id: string | null
          user_id: string
        }
        Insert: {
          action_id: string
          created_at?: string
          event_type: string
          id?: string
          recommendation_event_id?: string | null
          user_id: string
        }
        Update: {
          action_id?: string
          created_at?: string
          event_type?: string
          id?: string
          recommendation_event_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "anti_rot_events_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "anti_rot_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anti_rot_events_recommendation_event_id_fkey"
            columns: ["recommendation_event_id"]
            isOneToOne: false
            referencedRelation: "anti_rot_events"
            referencedColumns: ["id"]
          },
        ]
      }
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
      challenge_progress_logs: {
        Row: {
          archived_at: string | null
          challenge_id: string
          created_at: string
          id: string
          increment: number
          note: string | null
          recorded_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          challenge_id: string
          created_at?: string
          id?: string
          increment: number
          note?: string | null
          recorded_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          challenge_id?: string
          created_at?: string
          id?: string
          increment?: number
          note?: string | null
          recorded_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_progress_logs_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          archived_at: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          end_date: string
          id: string
          period_type: string
          reward_coins: number
          start_date: string
          status: string
          target_value: number
          title: string
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          end_date: string
          id?: string
          period_type: string
          reward_coins?: number
          start_date: string
          status?: string
          target_value: number
          title: string
          unit: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          end_date?: string
          id?: string
          period_type?: string
          reward_coins?: number
          start_date?: string
          status?: string
          target_value?: number
          title?: string
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coding_sessions: {
        Row: {
          activity: string
          archived_at: string | null
          created_at: string
          duration_minutes: number
          id: string
          note: string | null
          outcome: string
          project_id: string
          session_date: string
          start_time: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity: string
          archived_at?: string | null
          created_at?: string
          duration_minutes: number
          id?: string
          note?: string | null
          outcome: string
          project_id: string
          session_date: string
          start_time?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity?: string
          archived_at?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          note?: string | null
          outcome?: string
          project_id?: string
          session_date?: string
          start_time?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coding_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
      education_logs: {
        Row: {
          archived_at: string | null
          created_at: string
          duration_minutes: number
          focus: string
          id: string
          log_date: string
          log_type: Database["public"]["Enums"]["education_log_type"]
          notes: string | null
          outcome: string
          project_id: string
          start_time: string | null
          units_completed: number | null
          updated_at: string
          user_id: string
          word_count_delta: number | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          duration_minutes: number
          focus: string
          id?: string
          log_date: string
          log_type: Database["public"]["Enums"]["education_log_type"]
          notes?: string | null
          outcome: string
          project_id: string
          start_time?: string | null
          units_completed?: number | null
          updated_at?: string
          user_id: string
          word_count_delta?: number | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          duration_minutes?: number
          focus?: string
          id?: string
          log_date?: string
          log_type?: Database["public"]["Enums"]["education_log_type"]
          notes?: string | null
          outcome?: string
          project_id?: string
          start_time?: string | null
          units_completed?: number | null
          updated_at?: string
          user_id?: string
          word_count_delta?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "education_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      entertainment_items: {
        Row: {
          archived_at: string | null
          completed_on: string | null
          created_at: string
          creator_or_studio: string | null
          id: string
          media_type: string
          notes: string | null
          progress_current: number | null
          progress_total: number | null
          progress_unit: string | null
          rating: number | null
          release_year: number | null
          started_on: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          completed_on?: string | null
          created_at?: string
          creator_or_studio?: string | null
          id?: string
          media_type: string
          notes?: string | null
          progress_current?: number | null
          progress_total?: number | null
          progress_unit?: string | null
          rating?: number | null
          release_year?: number | null
          started_on?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          completed_on?: string | null
          created_at?: string
          creator_or_studio?: string | null
          id?: string
          media_type?: string
          notes?: string | null
          progress_current?: number | null
          progress_total?: number | null
          progress_unit?: string | null
          rating?: number | null
          release_year?: number | null
          started_on?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exercise_muscles: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          muscle_group: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          muscle_group: string
          user_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          muscle_group?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_muscles_exercise_owner_fkey"
            columns: ["exercise_id", "user_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      exercises: {
        Row: {
          archived_at: string | null
          created_at: string
          description: string | null
          equipment: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          description?: string | null
          equipment?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          description?: string | null
          equipment?: string | null
          id?: string
          name?: string
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
      habit_logs: {
        Row: {
          archived_at: string | null
          created_at: string
          habit_id: string
          id: string
          local_date: string
          profile_id: string
          recorded_at: string
          timezone: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          habit_id: string
          id?: string
          local_date: string
          profile_id: string
          recorded_at?: string
          timezone: string
          updated_at?: string
          user_id: string
          value: number
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          habit_id?: string
          id?: string
          local_date?: string
          profile_id?: string
          recorded_at?: string
          timezone?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          archived_at: string | null
          created_at: string
          daily_target: number | null
          default_increment: number
          id: string
          name: string
          profile_id: string
          sort_order: number
          time_window: string
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          daily_target?: number | null
          default_increment?: number
          id?: string
          name: string
          profile_id: string
          sort_order: number
          time_window: string
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          daily_target?: number | null
          default_increment?: number
          id?: string
          name?: string
          profile_id?: string
          sort_order?: number
          time_window?: string
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habits_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      inventory_items: {
        Row: {
          acquired_on: string | null
          acquisition_value: number | null
          archived_at: string | null
          category: string
          condition: string | null
          created_at: string
          currency: string | null
          description: string | null
          id: string
          location: string | null
          name: string
          quantity: number | null
          source_wishlist_item_id: string | null
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          acquired_on?: string | null
          acquisition_value?: number | null
          archived_at?: string | null
          category: string
          condition?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          location?: string | null
          name: string
          quantity?: number | null
          source_wishlist_item_id?: string | null
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          acquired_on?: string | null
          acquisition_value?: number | null
          archived_at?: string | null
          category?: string
          condition?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          location?: string | null
          name?: string
          quantity?: number | null
          source_wishlist_item_id?: string | null
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_source_wishlist_item_id_fkey"
            columns: ["source_wishlist_item_id"]
            isOneToOne: true
            referencedRelation: "wishlist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          archived_at: string | null
          body: string
          created_at: string
          entry_date: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          body: string
          created_at?: string
          entry_date: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          body?: string
          created_at?: string
          entry_date?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          servings: number
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
          servings?: number
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
          servings?: number
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
      mood_entries: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          local_date: string
          mood: string
          profile_id: string
          recorded_at: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          local_date: string
          mood: string
          profile_id: string
          recorded_at?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          local_date?: string
          mood?: string
          profile_id?: string
          recorded_at?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mood_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          habit_evening_starts_at: string
          habit_midday_starts_at: string
          habit_morning_starts_at: string
          id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          habit_evening_starts_at?: string
          habit_midday_starts_at?: string
          habit_morning_starts_at?: string
          id: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          habit_evening_starts_at?: string
          habit_midday_starts_at?: string
          habit_morning_starts_at?: string
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
          repository_url: string | null
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
          repository_url?: string | null
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
          repository_url?: string | null
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
      purchase_decisions: {
        Row: {
          archived_at: string | null
          context: string
          created_at: string
          criteria: string | null
          decision: string
          decision_date: string
          id: string
          inventory_item_id: string | null
          rationale: string
          status: string
          updated_at: string
          user_id: string
          wishlist_item_id: string
        }
        Insert: {
          archived_at?: string | null
          context: string
          created_at?: string
          criteria?: string | null
          decision: string
          decision_date: string
          id?: string
          inventory_item_id?: string | null
          rationale: string
          status?: string
          updated_at?: string
          user_id: string
          wishlist_item_id: string
        }
        Update: {
          archived_at?: string | null
          context?: string
          created_at?: string
          criteria?: string | null
          decision?: string
          decision_date?: string
          id?: string
          inventory_item_id?: string | null
          rationale?: string
          status?: string
          updated_at?: string
          user_id?: string
          wishlist_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_decisions_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_decisions_wishlist_item_id_fkey"
            columns: ["wishlist_item_id"]
            isOneToOne: false
            referencedRelation: "wishlist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          created_at: string
          id: string
          name: string
          note: string | null
          position: number
          quantity: number | null
          recipe_id: string
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          note?: string | null
          position?: number
          quantity?: number | null
          recipe_id: string
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          note?: string | null
          position?: number
          quantity?: number | null
          recipe_id?: string
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
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
      review_records: {
        Row: {
          archived_at: string | null
          blockers: string[]
          completed_at: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["review_kind"]
          next_period_focus: string | null
          open_loops: string[]
          outcome: string | null
          period_end: string
          period_start: string
          planning_note: string | null
          status: Database["public"]["Enums"]["review_record_status"]
          timezone: string
          updated_at: string
          user_id: string
          wins: string[]
        }
        Insert: {
          archived_at?: string | null
          blockers?: string[]
          completed_at?: string | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["review_kind"]
          next_period_focus?: string | null
          open_loops?: string[]
          outcome?: string | null
          period_end: string
          period_start: string
          planning_note?: string | null
          status?: Database["public"]["Enums"]["review_record_status"]
          timezone: string
          updated_at?: string
          user_id: string
          wins?: string[]
        }
        Update: {
          archived_at?: string | null
          blockers?: string[]
          completed_at?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["review_kind"]
          next_period_focus?: string | null
          open_loops?: string[]
          outcome?: string | null
          period_end?: string
          period_start?: string
          planning_note?: string | null
          status?: Database["public"]["Enums"]["review_record_status"]
          timezone?: string
          updated_at?: string
          user_id?: string
          wins?: string[]
        }
        Relationships: []
      }
      review_task_decisions: {
        Row: {
          created_at: string
          decision: Database["public"]["Enums"]["review_task_decision"]
          id: string
          note: string | null
          original_planned_date: string | null
          original_scheduled_start_at: string | null
          planning_snapshot_captured: boolean
          review_id: string
          target_date: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decision: Database["public"]["Enums"]["review_task_decision"]
          id?: string
          note?: string | null
          original_planned_date?: string | null
          original_scheduled_start_at?: string | null
          planning_snapshot_captured?: boolean
          review_id: string
          target_date: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          decision?: Database["public"]["Enums"]["review_task_decision"]
          id?: string
          note?: string | null
          original_planned_date?: string | null
          original_scheduled_start_at?: string | null
          planning_snapshot_captured?: boolean
          review_id?: string
          target_date?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_task_decisions_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "review_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_task_decisions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_ledger_entries: {
        Row: {
          amount: number
          created_at: string
          description: string
          entry_type: string
          id: string
          source_id: string
          source_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          entry_type: string
          id?: string
          source_id: string
          source_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          entry_type?: string
          id?: string
          source_id?: string
          source_type?: string
          user_id?: string
        }
        Relationships: []
      }
      running_plan_items: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          plan_id: string
          planned_distance_km: number | null
          planned_duration_minutes: number | null
          sort_order: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          plan_id: string
          planned_distance_km?: number | null
          planned_duration_minutes?: number | null
          sort_order: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          plan_id?: string
          planned_distance_km?: number | null
          planned_duration_minutes?: number | null
          sort_order?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "running_plan_items_plan_owner_fkey"
            columns: ["plan_id", "user_id"]
            isOneToOne: false
            referencedRelation: "running_plans"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      running_plans: {
        Row: {
          archived_at: string | null
          created_at: string
          goal: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          goal: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          goal?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      running_sessions: {
        Row: {
          archived_at: string | null
          average_heart_rate: number | null
          completed_at: string | null
          created_at: string
          distance_km: number
          duration_minutes: number
          id: string
          notes: string | null
          plan_item_id: string | null
          session_date: string
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          average_heart_rate?: number | null
          completed_at?: string | null
          created_at?: string
          distance_km: number
          duration_minutes: number
          id?: string
          notes?: string | null
          plan_item_id?: string | null
          session_date: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          average_heart_rate?: number | null
          completed_at?: string | null
          created_at?: string
          distance_km?: number
          duration_minutes?: number
          id?: string
          notes?: string | null
          plan_item_id?: string | null
          session_date?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "running_sessions_plan_item_owner_fkey"
            columns: ["plan_item_id", "user_id"]
            isOneToOne: false
            referencedRelation: "running_plan_items"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      schedule_source_links: {
        Row: {
          created_at: string
          id: string
          source_id: string
          source_type: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          source_id: string
          source_type: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          source_id?: string
          source_type?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_source_links_task_owner_fkey"
            columns: ["user_id", "task_id"]
            isOneToOne: true
            referencedRelation: "tasks"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      shop_items: {
        Row: {
          archived_at: string | null
          category: string | null
          cost_coins: number
          created_at: string
          description: string | null
          id: string
          is_paused: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          category?: string | null
          cost_coins: number
          created_at?: string
          description?: string | null
          id?: string
          is_paused?: boolean
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          category?: string | null
          cost_coins?: number
          created_at?: string
          description?: string | null
          id?: string
          is_paused?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shop_redemptions: {
        Row: {
          cost_coins: number
          id: string
          redeemed_at: string
          request_key: string
          shop_item_id: string
          title_snapshot: string
          user_id: string
        }
        Insert: {
          cost_coins: number
          id?: string
          redeemed_at?: string
          request_key: string
          shop_item_id: string
          title_snapshot: string
          user_id: string
        }
        Update: {
          cost_coins?: number
          id?: string
          redeemed_at?: string
          request_key?: string
          shop_item_id?: string
          title_snapshot?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_redemptions_shop_item_id_fkey"
            columns: ["shop_item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_evidence: {
        Row: {
          created_at: string
          evidence_date: string
          id: string
          note: string | null
          skill_id: string
          source_id: string | null
          source_type: string
          title: string
          updated_at: string
          user_id: string
          weight: number | null
        }
        Insert: {
          created_at?: string
          evidence_date: string
          id?: string
          note?: string | null
          skill_id: string
          source_id?: string | null
          source_type: string
          title: string
          updated_at?: string
          user_id: string
          weight?: number | null
        }
        Update: {
          created_at?: string
          evidence_date?: string
          id?: string
          note?: string | null
          skill_id?: string
          source_id?: string | null
          source_type?: string
          title?: string
          updated_at?: string
          user_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "skill_evidence_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          archived_at: string | null
          area_id: string | null
          category: string | null
          created_at: string
          id: string
          level: string | null
          name: string
          status: string
          summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          area_id?: string | null
          category?: string | null
          created_at?: string
          id?: string
          level?: string | null
          name: string
          status?: string
          summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          area_id?: string | null
          category?: string | null
          created_at?: string
          id?: string
          level?: string | null
          name?: string
          status?: string
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skills_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      sleep_entries: {
        Row: {
          created_at: string
          duration_minutes: number
          id: string
          note: string | null
          profile_id: string
          quality: number | null
          sleep_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes: number
          id?: string
          note?: string | null
          profile_id: string
          quality?: number | null
          sleep_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          id?: string
          note?: string | null
          profile_id?: string
          quality?: number | null
          sleep_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sleep_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      strength_plan_items: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          plan_id: string
          sort_order: number
          target_reps: number
          target_sets: number
          target_weight_kg: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          plan_id: string
          sort_order: number
          target_reps: number
          target_sets: number
          target_weight_kg?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          plan_id?: string
          sort_order?: number
          target_reps?: number
          target_sets?: number
          target_weight_kg?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "strength_plan_items_exercise_owner_fkey"
            columns: ["exercise_id", "user_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "strength_plan_items_plan_owner_fkey"
            columns: ["plan_id", "user_id"]
            isOneToOne: false
            referencedRelation: "strength_plans"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      strength_plans: {
        Row: {
          archived_at: string | null
          created_at: string
          goal: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          goal: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          goal?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      strength_sessions: {
        Row: {
          archived_at: string | null
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          plan_id: string | null
          session_date: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          plan_id?: string | null
          session_date: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          plan_id?: string | null
          session_date?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "strength_sessions_plan_owner_fkey"
            columns: ["plan_id", "user_id"]
            isOneToOne: false
            referencedRelation: "strength_plans"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      strength_set_logs: {
        Row: {
          exercise_id: string
          id: string
          notes: string | null
          recorded_at: string
          repetitions: number
          session_id: string
          set_order: number
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          exercise_id: string
          id?: string
          notes?: string | null
          recorded_at?: string
          repetitions: number
          session_id: string
          set_order: number
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          exercise_id?: string
          id?: string
          notes?: string | null
          recorded_at?: string
          repetitions?: number
          session_id?: string
          set_order?: number
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "strength_set_logs_exercise_owner_fkey"
            columns: ["exercise_id", "user_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "strength_set_logs_session_owner_fkey"
            columns: ["session_id", "user_id"]
            isOneToOne: false
            referencedRelation: "strength_sessions"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      task_skill_links: {
        Row: {
          created_at: string
          id: string
          skill_id: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          skill_id: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          skill_id?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_skill_links_skill_owner_fkey"
            columns: ["user_id", "skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "task_skill_links_task_owner_fkey"
            columns: ["user_id", "task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["user_id", "id"]
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
      weight_entries: {
        Row: {
          created_at: string
          id: string
          measured_on: string
          profile_id: string
          updated_at: string
          user_id: string
          weight_kg: number
        }
        Insert: {
          created_at?: string
          id?: string
          measured_on: string
          profile_id: string
          updated_at?: string
          user_id: string
          weight_kg: number
        }
        Update: {
          created_at?: string
          id?: string
          measured_on?: string
          profile_id?: string
          updated_at?: string
          user_id?: string
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "weight_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weight_goals: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          target_date: string | null
          target_weight_kg: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          target_date?: string | null
          target_weight_kg: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          target_date?: string | null
          target_weight_kg?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weight_goals_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_items: {
        Row: {
          archived_at: string | null
          category: string
          created_at: string
          currency: string | null
          description: string | null
          expected_price: number | null
          id: string
          priority: string
          status: string
          target_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          category: string
          created_at?: string
          currency?: string | null
          description?: string | null
          expected_price?: number | null
          id?: string
          priority?: string
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          category?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          expected_price?: number | null
          id?: string
          priority?: string
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      work_decisions: {
        Row: {
          archived_at: string | null
          created_at: string
          decision: string
          decision_date: string
          id: string
          project_id: string
          rationale: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          decision: string
          decision_date: string
          id?: string
          project_id: string
          rationale?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          decision?: string
          decision_date?: string
          id?: string
          project_id?: string
          rationale?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_decisions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      work_logs: {
        Row: {
          archived_at: string | null
          created_at: string
          duration_minutes: number
          focus: string
          id: string
          log_date: string
          notes: string | null
          outcome: string
          project_id: string
          started_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          duration_minutes: number
          focus: string
          id?: string
          log_date: string
          notes?: string | null
          outcome: string
          project_id: string
          started_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          duration_minutes?: number
          focus?: string
          id?: string
          log_date?: string
          notes?: string | null
          outcome?: string
          project_id?: string
          started_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      work_meeting_followups: {
        Row: {
          created_at: string
          id: string
          meeting_id: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meeting_id: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meeting_id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_meeting_followups_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "work_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_meeting_followups_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      work_meetings: {
        Row: {
          agenda: string | null
          archived_at: string | null
          created_at: string
          duration_minutes: number
          id: string
          meeting_date: string
          notes: string | null
          outcome: string
          participants: string | null
          project_id: string
          started_at: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agenda?: string | null
          archived_at?: string | null
          created_at?: string
          duration_minutes: number
          id?: string
          meeting_date: string
          notes?: string | null
          outcome: string
          participants?: string | null
          project_id: string
          started_at?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agenda?: string | null
          archived_at?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          meeting_date?: string
          notes?: string | null
          outcome?: string
          participants?: string | null
          project_id?: string
          started_at?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_meetings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_challenge_with_reward: {
        Args: { p_challenge_id: string }
        Returns: string
      }
      complete_linked_meal: {
        Args: { p_completed_at: string; p_meal_id: string }
        Returns: {
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
        SetofOptions: {
          from: "*"
          to: "meals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_linked_task: {
        Args: { p_completed_at: string; p_task_id: string }
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
      complete_running_session: {
        Args: { p_completed_at: string; p_session_id: string }
        Returns: {
          archived_at: string | null
          average_heart_rate: number | null
          completed_at: string | null
          created_at: string
          distance_km: number
          duration_minutes: number
          id: string
          notes: string | null
          plan_item_id: string | null
          session_date: string
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "running_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_strength_session: {
        Args: { p_completed_at: string; p_session_id: string }
        Returns: {
          archived_at: string | null
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          plan_id: string | null
          session_date: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "strength_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      convert_wishlist_item_to_inventory: {
        Args: { p_wishlist_item_id: string }
        Returns: string
      }
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
      create_work_meeting_followup: {
        Args: { p_description?: string; p_meeting_id: string; p_title: string }
        Returns: string
      }
      redeem_shop_item: {
        Args: { p_request_key: string; p_shop_item_id: string }
        Returns: string
      }
      resolve_anti_rot_recommendation: {
        Args: { p_event_type: string; p_recommendation_event_id: string }
        Returns: string
      }
      rotate_anti_rot_action: { Args: never; Returns: string }
      save_completed_running_session: {
        Args: {
          p_average_heart_rate: number
          p_completed_at: string
          p_distance_km: number
          p_duration_minutes: number
          p_notes: string
          p_plan_item_id: string
          p_session_date: string
          p_session_id: string
          p_started_at: string
        }
        Returns: {
          archived_at: string | null
          average_heart_rate: number | null
          completed_at: string | null
          created_at: string
          distance_km: number
          duration_minutes: number
          id: string
          notes: string | null
          plan_item_id: string | null
          session_date: string
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "running_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_daily_review_with_carry_over: {
        Args: {
          p_blockers: string[]
          p_carry_task_ids: string[]
          p_next_period_focus: string
          p_open_loops: string[]
          p_outcome: string
          p_period_start: string
          p_planning_note: string
          p_status: Database["public"]["Enums"]["review_record_status"]
          p_timezone: string
          p_wins: string[]
        }
        Returns: {
          archived_at: string | null
          blockers: string[]
          completed_at: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["review_kind"]
          next_period_focus: string | null
          open_loops: string[]
          outcome: string | null
          period_end: string
          period_start: string
          planning_note: string | null
          status: Database["public"]["Enums"]["review_record_status"]
          timezone: string
          updated_at: string
          user_id: string
          wins: string[]
        }
        SetofOptions: {
          from: "*"
          to: "review_records"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_exercise_with_muscles: {
        Args: {
          p_description: string
          p_equipment: string
          p_exercise_id: string
          p_muscles: string[]
          p_name: string
        }
        Returns: {
          archived_at: string | null
          created_at: string
          description: string | null
          equipment: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "exercises"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_review_record: {
        Args: {
          p_blockers: string[]
          p_kind: Database["public"]["Enums"]["review_kind"]
          p_next_period_focus: string
          p_open_loops: string[]
          p_outcome: string
          p_period_end: string
          p_period_start: string
          p_planning_note: string
          p_status: Database["public"]["Enums"]["review_record_status"]
          p_timezone: string
          p_wins: string[]
        }
        Returns: {
          archived_at: string | null
          blockers: string[]
          completed_at: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["review_kind"]
          next_period_focus: string | null
          open_loops: string[]
          outcome: string | null
          period_end: string
          period_start: string
          planning_note: string | null
          status: Database["public"]["Enums"]["review_record_status"]
          timezone: string
          updated_at: string
          user_id: string
          wins: string[]
        }
        SetofOptions: {
          from: "*"
          to: "review_records"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      schedule_linked_source: {
        Args: {
          p_duration_minutes: number
          p_planned_date: string
          p_scheduled_start_at: string
          p_source_id: string
          p_source_type: string
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
      unschedule_linked_meal_task: {
        Args: {
          p_duration_minutes?: number
          p_planned_date?: string
          p_task_id: string
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
      education_log_type: "learning" | "writing"
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
        | "skill"
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
      review_kind: "daily" | "weekly"
      review_record_status: "draft" | "completed" | "archived"
      review_task_decision: "carry_forward"
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
      education_log_type: ["learning", "writing"],
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
        "skill",
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
      review_kind: ["daily", "weekly"],
      review_record_status: ["draft", "completed", "archived"],
      review_task_decision: ["carry_forward"],
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

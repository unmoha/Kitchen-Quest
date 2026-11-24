export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
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
      achievements: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          requirement: Json
          slug: string
          status: Database["public"]["Enums"]["content_status"]
        }
        Insert: {
          created_at?: string
          description: string
          icon: string
          id?: string
          name: string
          requirement: Json
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          requirement?: Json
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
        }
        Relationships: []
      }
      admin_audit_logs: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      content_translations: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          field_name: string
          locale: string
          translated_text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          field_name: string
          locale: string
          translated_text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          field_name?: string
          locale?: string
          translated_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_challenges: {
        Row: {
          challenge_date: string
          challenge_type: Database["public"]["Enums"]["daily_challenge_type"]
          created_at: string
          description: string
          id: string
          ingredient_id: string | null
          learning_module_id: string | null
          recipe_id: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          title: string
        }
        Insert: {
          challenge_date: string
          challenge_type: Database["public"]["Enums"]["daily_challenge_type"]
          created_at?: string
          description: string
          id?: string
          ingredient_id?: string | null
          learning_module_id?: string | null
          recipe_id?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          title: string
        }
        Update: {
          challenge_date?: string
          challenge_type?: Database["public"]["Enums"]["daily_challenge_type"]
          created_at?: string
          description?: string
          id?: string
          ingredient_id?: string | null
          learning_module_id?: string | null
          recipe_id?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_challenges_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_challenges_learning_module_id_fkey"
            columns: ["learning_module_id"]
            isOneToOne: false
            referencedRelation: "learning_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_challenges_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      game_attempts: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          question_id: string | null
          recipe_id: string | null
          response_time_ms: number | null
          selected_ingredient_ids: string[] | null
          selected_option_id: string | null
          selected_recipe_step_ids: string[] | null
          server_verified: boolean
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct: boolean
          question_id?: string | null
          recipe_id?: string | null
          response_time_ms?: number | null
          selected_ingredient_ids?: string[] | null
          selected_option_id?: string | null
          selected_recipe_step_ids?: string[] | null
          server_verified?: boolean
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string | null
          recipe_id?: string | null
          response_time_ms?: number | null
          selected_ingredient_ids?: string[] | null
          selected_option_id?: string | null
          selected_recipe_step_ids?: string[] | null
          server_verified?: boolean
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_attempts_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_attempts_selected_option_id_fkey"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "question_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_attempts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      game_sessions: {
        Row: {
          challenge_ingredient_option_ids: Json
          challenge_recipe_ids: string[]
          completed_at: string | null
          completion_verified_at: string | null
          created_at: string
          game_mode: Database["public"]["Enums"]["game_mode"]
          id: string
          score: number
          started_at: string
          status: Database["public"]["Enums"]["game_session_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          challenge_ingredient_option_ids?: Json
          challenge_recipe_ids?: string[]
          completed_at?: string | null
          completion_verified_at?: string | null
          created_at?: string
          game_mode: Database["public"]["Enums"]["game_mode"]
          id?: string
          score?: number
          started_at?: string
          status?: Database["public"]["Enums"]["game_session_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          challenge_ingredient_option_ids?: Json
          challenge_recipe_ids?: string[]
          completed_at?: string | null
          completion_verified_at?: string | null
          created_at?: string
          game_mode?: Database["public"]["Enums"]["game_mode"]
          id?: string
          score?: number
          started_at?: string
          status?: Database["public"]["Enums"]["game_session_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          image_url: string | null
          name: string
          safety_information: string
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          storage_information: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          id?: string
          image_url?: string | null
          name: string
          safety_information: string
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          storage_information: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          name?: string
          safety_information?: string
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          storage_information?: string
          updated_at?: string
        }
        Relationships: []
      }
      learning_modules: {
        Row: {
          category: string
          content: Json
          created_at: string
          description: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          id: string
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          content: Json
          created_at?: string
          description: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          id?: string
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: Json
          created_at?: string
          description?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          id?: string
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      question_options: {
        Row: {
          id: string
          is_correct: boolean
          option_order: number
          option_text: string
          question_id: string
        }
        Insert: {
          id?: string
          is_correct?: boolean
          option_order: number
          option_text: string
          question_id: string
        }
        Update: {
          id?: string
          is_correct?: boolean
          option_order?: number
          option_text?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          created_at: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          explanation: string
          id: string
          learning_module_id: string | null
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          explanation: string
          id?: string
          learning_module_id?: string | null
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          explanation?: string
          id?: string
          learning_module_id?: string | null
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_learning_module_id_fkey"
            columns: ["learning_module_id"]
            isOneToOne: false
            referencedRelation: "learning_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          ingredient_id: string
          is_optional: boolean
          preparation_note: string | null
          quantity: number
          recipe_id: string
          unit: string
        }
        Insert: {
          ingredient_id: string
          is_optional?: boolean
          preparation_note?: string | null
          quantity: number
          recipe_id: string
          unit: string
        }
        Update: {
          ingredient_id?: string
          is_optional?: boolean
          preparation_note?: string | null
          quantity?: number
          recipe_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_steps: {
        Row: {
          educational_note: string | null
          id: string
          instruction: string
          recipe_id: string
          step_number: number
          time_minutes: number | null
        }
        Insert: {
          educational_note?: string | null
          id?: string
          instruction: string
          recipe_id: string
          step_number: number
          time_minutes?: number | null
        }
        Update: {
          educational_note?: string | null
          id?: string
          instruction?: string
          recipe_id?: string
          step_number?: number
          time_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_steps_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          category: string
          cook_time_minutes: number
          created_at: string
          cuisine: string
          description: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          educational_info: string
          id: string
          image_url: string | null
          nutrition_info: Json | null
          prep_time_minutes: number
          safety_notes: string
          servings: number
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          tags: string[]
          tips: Json
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          cook_time_minutes: number
          created_at?: string
          cuisine: string
          description: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          educational_info: string
          id?: string
          image_url?: string | null
          nutrition_info?: Json | null
          prep_time_minutes: number
          safety_notes: string
          servings: number
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          tags?: string[]
          tips?: Json
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          cook_time_minutes?: number
          created_at?: string
          cuisine?: string
          description?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          educational_info?: string
          id?: string
          image_url?: string | null
          nutrition_info?: Json | null
          prep_time_minutes?: number
          safety_notes?: string
          servings?: number
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          tags?: string[]
          tips?: Json
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      skill_node_prerequisites: {
        Row: {
          node_id: string
          prerequisite_node_id: string
        }
        Insert: {
          node_id: string
          prerequisite_node_id: string
        }
        Update: {
          node_id?: string
          prerequisite_node_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_node_prerequisites_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "skill_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_node_prerequisites_prerequisite_node_id_fkey"
            columns: ["prerequisite_node_id"]
            isOneToOne: false
            referencedRelation: "skill_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_nodes: {
        Row: {
          created_at: string
          description: string
          game_mode: Database["public"]["Enums"]["game_mode"] | null
          id: string
          learning_module_id: string | null
          path_id: string
          position: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          game_mode?: Database["public"]["Enums"]["game_mode"] | null
          id?: string
          learning_module_id?: string | null
          path_id: string
          position: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          game_mode?: Database["public"]["Enums"]["game_mode"] | null
          id?: string
          learning_module_id?: string | null
          path_id?: string
          position?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_nodes_learning_module_id_fkey"
            columns: ["learning_module_id"]
            isOneToOne: false
            referencedRelation: "learning_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_nodes_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "skill_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_paths: {
        Row: {
          created_at: string
          description: string
          id: string
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          created_at: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          created_at?: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          created_at?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_daily_challenges: {
        Row: {
          completed_at: string
          created_at: string
          daily_challenge_id: string
          id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          daily_challenge_id: string
          id?: string
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          daily_challenge_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_daily_challenges_daily_challenge_id_fkey"
            columns: ["daily_challenge_id"]
            isOneToOne: false
            referencedRelation: "daily_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_daily_challenges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_learning_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          last_attempted_at: string | null
          learning_module_id: string | null
          mastery_score: number
          recipe_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          last_attempted_at?: string | null
          learning_module_id?: string | null
          mastery_score: number
          recipe_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          last_attempted_at?: string | null
          learning_module_id?: string | null
          mastery_score?: number
          recipe_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_learning_progress_learning_module_id_fkey"
            columns: ["learning_module_id"]
            isOneToOne: false
            referencedRelation: "learning_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_learning_progress_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_skill_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          node_id: string
          status: Database["public"]["Enums"]["skill_progress_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          node_id: string
          status?: Database["public"]["Enums"]["skill_progress_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          node_id?: string
          status?: Database["public"]["Enums"]["skill_progress_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_skill_progress_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "skill_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_activity_date: string | null
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_streaks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_xp_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          source_id: string
          source_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          source_id: string
          source_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          source_id?: string
          source_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_xp_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_user_xp: {
        Args: {
          p_amount: number
          p_description?: string
          p_source_id: string
          p_source_type: string
          p_user_id: string
        }
        Returns: string
      }
      complete_skill_node: { Args: { p_node_id: string }; Returns: string }
      complete_user_daily_challenge: {
        Args: {
          p_daily_challenge_id: string
          p_session_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      content_translation_question_is_published: {
        Args: { p_entity_id: string; p_entity_type: string }
        Returns: boolean
      }
      get_leaderboard: {
        Args: { p_page?: number; p_page_size?: number }
        Returns: {
          avatar_url: string
          display_name: string
          rank: number
          total_count: number
          total_xp: number
          user_id: string
        }[]
      }
      get_published_game_questions: {
        Args: { p_game_mode: Database["public"]["Enums"]["game_mode"] }
        Returns: Json
      }
      get_question_module_map: {
        Args: { p_question_ids: string[] }
        Returns: {
          learning_module_id: string
          module_title: string
          question_id: string
        }[]
      }
      get_user_leaderboard_rank: {
        Args: { p_user_id: string }
        Returns: {
          rank: number
          total_players: number
          total_xp: number
        }[]
      }
      is_admin: { Args: { p_user_id?: string }; Returns: boolean }
      record_user_streak: {
        Args: { p_session_id: string; p_user_id: string }
        Returns: Json
      }
      skill_fnv1a_32: { Args: { p_value: string }; Returns: number }
      start_skill_node: { Args: { p_node_id: string }; Returns: string }
      transition_game_session: {
        Args: { p_action: string; p_session_id: string }
        Returns: {
          challenge_ingredient_option_ids: Json
          challenge_recipe_ids: string[]
          completed_at: string | null
          completion_verified_at: string | null
          created_at: string
          game_mode: Database["public"]["Enums"]["game_mode"]
          id: string
          score: number
          started_at: string
          status: Database["public"]["Enums"]["game_session_status"]
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "game_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      unlock_user_achievement: {
        Args: { p_achievement_id: string; p_user_id: string }
        Returns: string
      }
    }
    Enums: {
      content_status: "draft" | "review" | "published" | "archived"
      daily_challenge_type:
        | "recipe"
        | "learning_module"
        | "ingredient"
        | "technique"
      difficulty_level: "beginner" | "intermediate" | "advanced"
      game_mode:
        | "ingredient_quiz"
        | "recipe_builder"
        | "cooking_order"
        | "kitchen_challenge"
        | "food_detective"
      game_session_status: "active" | "completed" | "abandoned"
      question_type: "multiple_choice" | "true_false" | "ordering"
      skill_progress_status: "in_progress" | "completed"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      content_status: ["draft", "review", "published", "archived"],
      daily_challenge_type: [
        "recipe",
        "learning_module",
        "ingredient",
        "technique",
      ],
      difficulty_level: ["beginner", "intermediate", "advanced"],
      game_mode: [
        "ingredient_quiz",
        "recipe_builder",
        "cooking_order",
        "kitchen_challenge",
        "food_detective",
      ],
      game_session_status: ["active", "completed", "abandoned"],
      question_type: ["multiple_choice", "true_false", "ordering"],
      skill_progress_status: ["in_progress", "completed"],
    },
  },
} as const

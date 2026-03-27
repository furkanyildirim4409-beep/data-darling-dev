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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ai_weekly_analyses: {
        Row: {
          actions: Json | null
          analysis: string
          athlete_id: string
          athlete_name: string | null
          coach_id: string
          created_at: string
          id: string
          resolved: boolean | null
          severity: string
          title: string
        }
        Insert: {
          actions?: Json | null
          analysis: string
          athlete_id: string
          athlete_name?: string | null
          coach_id: string
          created_at?: string
          id?: string
          resolved?: boolean | null
          severity?: string
          title: string
        }
        Update: {
          actions?: Json | null
          analysis?: string
          athlete_id?: string
          athlete_name?: string | null
          coach_id?: string
          created_at?: string
          id?: string
          resolved?: boolean | null
          severity?: string
          title?: string
        }
        Relationships: []
      }
      assigned_supplements: {
        Row: {
          athlete_id: string
          coach_id: string
          created_at: string
          id: string
          is_active: boolean
          name_and_dosage: string
          source_insight_id: string | null
        }
        Insert: {
          athlete_id: string
          coach_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_and_dosage: string
          source_insight_id?: string | null
        }
        Update: {
          athlete_id?: string
          coach_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_and_dosage?: string
          source_insight_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assigned_supplements_source_insight_id_fkey"
            columns: ["source_insight_id"]
            isOneToOne: false
            referencedRelation: "ai_weekly_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      assigned_workouts: {
        Row: {
          assignment_batch_id: string | null
          athlete_id: string | null
          coach_id: string | null
          created_at: string | null
          day_notes: string | null
          day_of_week: string | null
          exercises: Json
          id: string
          program_id: string | null
          scheduled_date: string | null
          status: string | null
          workout_name: string
        }
        Insert: {
          assignment_batch_id?: string | null
          athlete_id?: string | null
          coach_id?: string | null
          created_at?: string | null
          day_notes?: string | null
          day_of_week?: string | null
          exercises?: Json
          id?: string
          program_id?: string | null
          scheduled_date?: string | null
          status?: string | null
          workout_name?: string
        }
        Update: {
          assignment_batch_id?: string | null
          athlete_id?: string | null
          coach_id?: string | null
          created_at?: string | null
          day_notes?: string | null
          day_of_week?: string | null
          exercises?: Json
          id?: string
          program_id?: string | null
          scheduled_date?: string | null
          status?: string | null
          workout_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "assigned_workouts_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assigned_workouts_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assigned_workouts_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_badges: {
        Row: {
          athlete_id: string
          badge_id: string
          earned_at: string | null
          id: string
        }
        Insert: {
          athlete_id: string
          badge_id: string
          earned_at?: string | null
          id?: string
        }
        Update: {
          athlete_id?: string
          badge_id?: string
          earned_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_badges_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_diet_assignments: {
        Row: {
          assigned_at: string
          athlete_id: string
          coach_id: string
          id: string
          template_id: string
        }
        Insert: {
          assigned_at?: string
          athlete_id: string
          coach_id: string
          id?: string
          template_id: string
        }
        Update: {
          assigned_at?: string
          athlete_id?: string
          coach_id?: string
          id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_diet_assignments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "diet_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_notifications: {
        Row: {
          athlete_id: string
          coach_id: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          source_insight_id: string | null
          title: string
          type: string
        }
        Insert: {
          athlete_id: string
          coach_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          source_insight_id?: string | null
          title: string
          type?: string
        }
        Update: {
          athlete_id?: string
          coach_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          source_insight_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_notifications_source_insight_id_fkey"
            columns: ["source_insight_id"]
            isOneToOne: false
            referencedRelation: "ai_weekly_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          category: string | null
          condition_type: string | null
          condition_value: number | null
          created_at: string | null
          description: string | null
          icon_name: string | null
          id: string
          name: string
          tier: string | null
          xp_reward: number | null
        }
        Insert: {
          category?: string | null
          condition_type?: string | null
          condition_value?: number | null
          created_at?: string | null
          description?: string | null
          icon_name?: string | null
          id?: string
          name: string
          tier?: string | null
          xp_reward?: number | null
        }
        Update: {
          category?: string | null
          condition_type?: string | null
          condition_value?: number | null
          created_at?: string | null
          description?: string | null
          icon_name?: string | null
          id?: string
          name?: string
          tier?: string | null
          xp_reward?: number | null
        }
        Relationships: []
      }
      bio_coin_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      blood_tests: {
        Row: {
          coach_notes: string | null
          created_at: string
          date: string
          document_url: string
          extracted_data: Json | null
          file_name: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          coach_notes?: string | null
          created_at?: string
          date?: string
          document_url: string
          extracted_data?: Json | null
          file_name: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          coach_notes?: string | null
          created_at?: string
          date?: string
          document_url?: string
          extracted_data?: Json | null
          file_name?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      body_measurements: {
        Row: {
          arm: number | null
          body_fat_pct: number | null
          chest: number | null
          hips: number | null
          id: string
          logged_at: string | null
          muscle_mass_kg: number | null
          neck: number | null
          shoulder: number | null
          thigh: number | null
          user_id: string | null
          waist: number | null
        }
        Insert: {
          arm?: number | null
          body_fat_pct?: number | null
          chest?: number | null
          hips?: number | null
          id?: string
          logged_at?: string | null
          muscle_mass_kg?: number | null
          neck?: number | null
          shoulder?: number | null
          thigh?: number | null
          user_id?: string | null
          waist?: number | null
        }
        Update: {
          arm?: number | null
          body_fat_pct?: number | null
          chest?: number | null
          hips?: number | null
          id?: string
          logged_at?: string | null
          muscle_mass_kg?: number | null
          neck?: number | null
          shoulder?: number | null
          thigh?: number | null
          user_id?: string | null
          waist?: number | null
        }
        Relationships: []
      }
      challenge_messages: {
        Row: {
          challenge_id: string
          created_at: string | null
          id: string
          media_type: string | null
          media_url: string | null
          message: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          message: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_messages_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          challenge_type: string
          challenger_id: string
          challenger_value: number | null
          created_at: string | null
          end_date: string | null
          exercise_name: string | null
          id: string
          opponent_id: string
          opponent_proof_url: string | null
          opponent_value: number | null
          proof_url: string | null
          start_date: string | null
          status: string | null
          wager_coins: number | null
          winner_id: string | null
        }
        Insert: {
          challenge_type: string
          challenger_id: string
          challenger_value?: number | null
          created_at?: string | null
          end_date?: string | null
          exercise_name?: string | null
          id?: string
          opponent_id: string
          opponent_proof_url?: string | null
          opponent_value?: number | null
          proof_url?: string | null
          start_date?: string | null
          status?: string | null
          wager_coins?: number | null
          winner_id?: string | null
        }
        Update: {
          challenge_type?: string
          challenger_id?: string
          challenger_value?: number | null
          created_at?: string | null
          end_date?: string | null
          exercise_name?: string | null
          id?: string
          opponent_id?: string
          opponent_proof_url?: string | null
          opponent_value?: number | null
          proof_url?: string | null
          start_date?: string | null
          status?: string | null
          wager_coins?: number | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenges_challenger_id_fkey"
            columns: ["challenger_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_opponent_id_fkey"
            columns: ["opponent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      checkin_edit_logs: {
        Row: {
          checkin_id: string
          edited_at: string
          id: string
          new_values: Json
          previous_values: Json
          user_id: string
        }
        Insert: {
          checkin_id: string
          edited_at?: string
          id?: string
          new_values: Json
          previous_values: Json
          user_id: string
        }
        Update: {
          checkin_id?: string
          edited_at?: string
          id?: string
          new_values?: Json
          previous_values?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkin_edit_logs_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: false
            referencedRelation: "daily_checkins"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_invites: {
        Row: {
          coach_id: string
          created_at: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          coach_id: string
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          coach_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      consumed_foods: {
        Row: {
          api_food_id: string | null
          athlete_id: string
          calories: number | null
          carbs: number | null
          fat: number | null
          food_name: string
          id: string
          log_id: string | null
          logged_at: string | null
          meal_type: string
          planned_food_id: string | null
          protein: number | null
          serving_size: string | null
        }
        Insert: {
          api_food_id?: string | null
          athlete_id: string
          calories?: number | null
          carbs?: number | null
          fat?: number | null
          food_name: string
          id?: string
          log_id?: string | null
          logged_at?: string | null
          meal_type?: string
          planned_food_id?: string | null
          protein?: number | null
          serving_size?: string | null
        }
        Update: {
          api_food_id?: string | null
          athlete_id?: string
          calories?: number | null
          carbs?: number | null
          fat?: number | null
          food_name?: string
          id?: string
          log_id?: string | null
          logged_at?: string | null
          meal_type?: string
          planned_food_id?: string | null
          protein?: number | null
          serving_size?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consumed_foods_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "nutrition_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_checkins: {
        Row: {
          created_at: string | null
          digestion: number | null
          id: string
          mood: number | null
          notes: string | null
          sleep: number | null
          sleep_hours: number | null
          soreness: number | null
          stress: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          digestion?: number | null
          id?: string
          mood?: number | null
          notes?: string | null
          sleep?: number | null
          sleep_hours?: number | null
          soreness?: number | null
          stress?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          digestion?: number | null
          id?: string
          mood?: number | null
          notes?: string | null
          sleep?: number | null
          sleep_hours?: number | null
          soreness?: number | null
          stress?: number | null
          user_id?: string
        }
        Relationships: []
      }
      diet_template_foods: {
        Row: {
          calories: number | null
          carbs: number | null
          day_number: number | null
          fat: number | null
          food_name: string
          id: string
          meal_type: string
          protein: number | null
          serving_size: string | null
          template_id: string
        }
        Insert: {
          calories?: number | null
          carbs?: number | null
          day_number?: number | null
          fat?: number | null
          food_name: string
          id?: string
          meal_type?: string
          protein?: number | null
          serving_size?: string | null
          template_id: string
        }
        Update: {
          calories?: number | null
          carbs?: number | null
          day_number?: number | null
          fat?: number | null
          food_name?: string
          id?: string
          meal_type?: string
          protein?: number | null
          serving_size?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diet_template_foods_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "diet_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      diet_templates: {
        Row: {
          athlete_id: string | null
          coach_id: string
          created_at: string | null
          description: string | null
          id: string
          is_template: boolean
          parent_template_id: string | null
          target_calories: number | null
          title: string
        }
        Insert: {
          athlete_id?: string | null
          coach_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_template?: boolean
          parent_template_id?: string | null
          target_calories?: number | null
          title: string
        }
        Update: {
          athlete_id?: string | null
          coach_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_template?: boolean
          parent_template_id?: string | null
          target_calories?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "diet_templates_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diet_templates_parent_template_id_fkey"
            columns: ["parent_template_id"]
            isOneToOne: false
            referencedRelation: "diet_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_library: {
        Row: {
          category: string | null
          id: string
          name: string
          target_muscle: string | null
          video_url: string | null
        }
        Insert: {
          category?: string | null
          id?: string
          name: string
          target_muscle?: string | null
          video_url?: string | null
        }
        Update: {
          category?: string | null
          id?: string
          name?: string
          target_muscle?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      exercises: {
        Row: {
          created_at: string | null
          failure_set: boolean | null
          id: string
          name: string
          notes: string | null
          order_index: number | null
          program_id: string | null
          reps: string | null
          rest_time: string | null
          rir: number | null
          rir_per_set: Json | null
          rpe: number | null
          sets: number | null
          video_url: string | null
        }
        Insert: {
          created_at?: string | null
          failure_set?: boolean | null
          id?: string
          name: string
          notes?: string | null
          order_index?: number | null
          program_id?: string | null
          reps?: string | null
          rest_time?: string | null
          rir?: number | null
          rir_per_set?: Json | null
          rpe?: number | null
          sets?: number | null
          video_url?: string | null
        }
        Update: {
          created_at?: string | null
          failure_set?: boolean | null
          id?: string
          name?: string
          notes?: string | null
          order_index?: number | null
          program_id?: string | null
          reps?: string | null
          rest_time?: string | null
          rir?: number | null
          rir_per_set?: Json | null
          rpe?: number | null
          sets?: number | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      food_items: {
        Row: {
          api_food_id: string | null
          calories: number | null
          carbs: number | null
          category: string | null
          coach_id: string | null
          created_at: string | null
          fat: number | null
          id: string
          name: string
          protein: number | null
          serving_size: string | null
        }
        Insert: {
          api_food_id?: string | null
          calories?: number | null
          carbs?: number | null
          category?: string | null
          coach_id?: string | null
          created_at?: string | null
          fat?: number | null
          id?: string
          name: string
          protein?: number | null
          serving_size?: string | null
        }
        Update: {
          api_food_id?: string | null
          calories?: number | null
          carbs?: number | null
          category?: string | null
          coach_id?: string | null
          created_at?: string | null
          fat?: number | null
          id?: string
          name?: string
          protein?: number | null
          serving_size?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          media_type: string | null
          media_url: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          media_type?: string | null
          media_url?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          media_type?: string | null
          media_url?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      mutation_logs: {
        Row: {
          athlete_id: string
          change_percentage: number
          coach_id: string
          created_at: string
          id: string
          is_acknowledged: boolean
          message: string
          metadata: Json | null
          module_type: string
        }
        Insert: {
          athlete_id: string
          change_percentage: number
          coach_id: string
          created_at?: string
          id?: string
          is_acknowledged?: boolean
          message: string
          metadata?: Json | null
          module_type: string
        }
        Update: {
          athlete_id?: string
          change_percentage?: number
          coach_id?: string
          created_at?: string
          id?: string
          is_acknowledged?: boolean
          message?: string
          metadata?: Json | null
          module_type?: string
        }
        Relationships: []
      }
      nutrition_logs: {
        Row: {
          foods: Json
          id: string
          logged_at: string | null
          meal_name: string
          total_calories: number | null
          total_carbs: number | null
          total_fat: number | null
          total_protein: number | null
          user_id: string
        }
        Insert: {
          foods?: Json
          id?: string
          logged_at?: string | null
          meal_name: string
          total_calories?: number | null
          total_carbs?: number | null
          total_fat?: number | null
          total_protein?: number | null
          user_id: string
        }
        Update: {
          foods?: Json
          id?: string
          logged_at?: string | null
          meal_name?: string
          total_calories?: number | null
          total_carbs?: number | null
          total_fat?: number | null
          total_protein?: number | null
          user_id?: string
        }
        Relationships: []
      }
      nutrition_targets: {
        Row: {
          active_diet_template_id: string | null
          athlete_id: string
          carbs_g: number
          coach_id: string
          created_at: string | null
          daily_calories: number
          diet_duration_weeks: number | null
          diet_start_date: string | null
          fat_g: number
          id: string
          protein_g: number
          updated_at: string | null
        }
        Insert: {
          active_diet_template_id?: string | null
          athlete_id: string
          carbs_g?: number
          coach_id: string
          created_at?: string | null
          daily_calories?: number
          diet_duration_weeks?: number | null
          diet_start_date?: string | null
          fat_g?: number
          id?: string
          protein_g?: number
          updated_at?: string | null
        }
        Update: {
          active_diet_template_id?: string | null
          athlete_id?: string
          carbs_g?: number
          coach_id?: string
          created_at?: string | null
          daily_calories?: number
          diet_duration_weeks?: number | null
          diet_start_date?: string | null
          fat_g?: number
          id?: string
          protein_g?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_targets_active_diet_template_id_fkey"
            columns: ["active_diet_template_id"]
            isOneToOne: false
            referencedRelation: "diet_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          id: string
          items: Json
          status: string | null
          total_coins_used: number | null
          total_price: number
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          items: Json
          status?: string | null
          total_coins_used?: number | null
          total_price: number
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          items?: Json
          status?: string | null
          total_coins_used?: number | null
          total_price?: number
          user_id?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          athlete_id: string
          coach_id: string
          created_at: string
          currency: string
          description: string | null
          id: string
          payment_date: string
          status: string
        }
        Insert: {
          amount?: number
          athlete_id: string
          coach_id: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          payment_date?: string
          status?: string
        }
        Update: {
          amount?: number
          athlete_id?: string
          coach_id?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          payment_date?: string
          status?: string
        }
        Relationships: []
      }
      permission_templates: {
        Row: {
          created_at: string
          head_coach_id: string
          id: string
          name: string
          permissions: Json
        }
        Insert: {
          created_at?: string
          head_coach_id: string
          id?: string
          name: string
          permissions?: Json
        }
        Update: {
          created_at?: string
          head_coach_id?: string
          id?: string
          name?: string
          permissions?: Json
        }
        Relationships: [
          {
            foreignKeyName: "permission_templates_head_coach_id_fkey"
            columns: ["head_coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_program_id: string | null
          activity_level: string | null
          avatar_url: string | null
          bio: string | null
          bio_coins: number | null
          birth_date: string | null
          coach_id: string | null
          created_at: string | null
          current_weight: number | null
          daily_calorie_target: number | null
          daily_carb_target: number | null
          daily_fat_target: number | null
          daily_protein_target: number | null
          email: string | null
          fitness_goal: string | null
          full_name: string | null
          gender: string | null
          gym_name: string | null
          height_cm: number | null
          id: string
          last_activity_date: string | null
          level: number | null
          longest_streak: number | null
          notification_preferences: Json | null
          notification_settings: Json | null
          readiness_score: number | null
          role: string | null
          specialty: string | null
          streak: number | null
          subscription_status: string | null
          subscription_tier: string | null
          total_volume_kg: number | null
          updated_at: string | null
          xp: number | null
        }
        Insert: {
          active_program_id?: string | null
          activity_level?: string | null
          avatar_url?: string | null
          bio?: string | null
          bio_coins?: number | null
          birth_date?: string | null
          coach_id?: string | null
          created_at?: string | null
          current_weight?: number | null
          daily_calorie_target?: number | null
          daily_carb_target?: number | null
          daily_fat_target?: number | null
          daily_protein_target?: number | null
          email?: string | null
          fitness_goal?: string | null
          full_name?: string | null
          gender?: string | null
          gym_name?: string | null
          height_cm?: number | null
          id: string
          last_activity_date?: string | null
          level?: number | null
          longest_streak?: number | null
          notification_preferences?: Json | null
          notification_settings?: Json | null
          readiness_score?: number | null
          role?: string | null
          specialty?: string | null
          streak?: number | null
          subscription_status?: string | null
          subscription_tier?: string | null
          total_volume_kg?: number | null
          updated_at?: string | null
          xp?: number | null
        }
        Update: {
          active_program_id?: string | null
          activity_level?: string | null
          avatar_url?: string | null
          bio?: string | null
          bio_coins?: number | null
          birth_date?: string | null
          coach_id?: string | null
          created_at?: string | null
          current_weight?: number | null
          daily_calorie_target?: number | null
          daily_carb_target?: number | null
          daily_fat_target?: number | null
          daily_protein_target?: number | null
          email?: string | null
          fitness_goal?: string | null
          full_name?: string | null
          gender?: string | null
          gym_name?: string | null
          height_cm?: number | null
          id?: string
          last_activity_date?: string | null
          level?: number | null
          longest_streak?: number | null
          notification_preferences?: Json | null
          notification_settings?: Json | null
          readiness_score?: number | null
          role?: string | null
          specialty?: string | null
          streak?: number | null
          subscription_status?: string | null
          subscription_tier?: string | null
          total_volume_kg?: number | null
          updated_at?: string | null
          xp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_program_id_fkey"
            columns: ["active_program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_assignment_logs: {
        Row: {
          action: string
          assignment_batch_id: string | null
          athlete_id: string
          coach_id: string
          created_at: string
          id: string
          program_id: string
          program_title: string
        }
        Insert: {
          action?: string
          assignment_batch_id?: string | null
          athlete_id: string
          coach_id: string
          created_at?: string
          id?: string
          program_id: string
          program_title: string
        }
        Update: {
          action?: string
          assignment_batch_id?: string | null
          athlete_id?: string
          coach_id?: string
          created_at?: string
          id?: string
          program_id?: string
          program_title?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          athlete_id: string | null
          automation_rules: Json | null
          coach_id: string | null
          created_at: string | null
          description: string | null
          difficulty: string | null
          id: string
          is_template: boolean
          parent_program_id: string | null
          target_goal: string | null
          title: string
          week_config: Json | null
        }
        Insert: {
          athlete_id?: string | null
          automation_rules?: Json | null
          coach_id?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          is_template?: boolean
          parent_program_id?: string | null
          target_goal?: string | null
          title: string
          week_config?: Json | null
        }
        Update: {
          athlete_id?: string | null
          automation_rules?: Json | null
          coach_id?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          is_template?: boolean
          parent_program_id?: string | null
          target_goal?: string | null
          title?: string
          week_config?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "programs_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_parent_program_id_fkey"
            columns: ["parent_program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_photos: {
        Row: {
          body_fat_pct: number | null
          created_at: string
          date: string
          id: string
          note: string | null
          photo_url: string
          user_id: string
          view: string | null
          weight: number | null
        }
        Insert: {
          body_fat_pct?: number | null
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          photo_url: string
          user_id: string
          view?: string | null
          weight?: number | null
        }
        Update: {
          body_fat_pct?: number | null
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          photo_url?: string
          user_id?: string
          view?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string | null
          id: string
          platform: string | null
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          platform?: string | null
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          platform?: string | null
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      team_member_athletes: {
        Row: {
          athlete_id: string
          created_at: string
          head_coach_id: string
          id: string
          team_member_id: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          head_coach_id: string
          id?: string
          team_member_id: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          head_coach_id?: string
          id?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_member_athletes_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_member_athletes_head_coach_id_fkey"
            columns: ["head_coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_member_athletes_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          athletes_count: number
          avatar_url: string | null
          created_at: string
          custom_permissions: Json | null
          email: string
          full_name: string
          head_coach_id: string
          id: string
          permissions: string
          phone: string | null
          role: string
          start_date: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          athletes_count?: number
          avatar_url?: string | null
          created_at?: string
          custom_permissions?: Json | null
          email: string
          full_name: string
          head_coach_id: string
          id?: string
          permissions?: string
          phone?: string | null
          role?: string
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          athletes_count?: number
          avatar_url?: string | null
          created_at?: string
          custom_permissions?: Json | null
          email?: string
          full_name?: string
          head_coach_id?: string
          id?: string
          permissions?: string
          phone?: string | null
          role?: string
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_head_coach_id_fkey"
            columns: ["head_coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      water_logs: {
        Row: {
          amount_ml: number
          id: string
          logged_at: string | null
          user_id: string
        }
        Insert: {
          amount_ml: number
          id?: string
          logged_at?: string | null
          user_id: string
        }
        Update: {
          amount_ml?: number
          id?: string
          logged_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      weight_logs: {
        Row: {
          id: string
          logged_at: string | null
          user_id: string
          weight_kg: number
        }
        Insert: {
          id?: string
          logged_at?: string | null
          user_id: string
          weight_kg: number
        }
        Update: {
          id?: string
          logged_at?: string | null
          user_id?: string
          weight_kg?: number
        }
        Relationships: []
      }
      workout_logs: {
        Row: {
          assigned_workout_id: string | null
          bio_coins_earned: number | null
          completed: boolean | null
          details: Json | null
          duration_minutes: number | null
          exercises_count: number | null
          id: string
          logged_at: string | null
          tonnage: number | null
          user_id: string
          workout_name: string
        }
        Insert: {
          assigned_workout_id?: string | null
          bio_coins_earned?: number | null
          completed?: boolean | null
          details?: Json | null
          duration_minutes?: number | null
          exercises_count?: number | null
          id?: string
          logged_at?: string | null
          tonnage?: number | null
          user_id: string
          workout_name: string
        }
        Update: {
          assigned_workout_id?: string | null
          bio_coins_earned?: number | null
          completed?: boolean | null
          details?: Json | null
          duration_minutes?: number | null
          exercises_count?: number | null
          id?: string
          logged_at?: string | null
          tonnage?: number | null
          user_id?: string
          workout_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_assigned_workout_id_fkey"
            columns: ["assigned_workout_id"]
            isOneToOne: false
            referencedRelation: "assigned_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_templates: {
        Row: {
          coach_id: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          routine_days: Json
        }
        Insert: {
          coach_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          routine_days?: Json
        }
        Update: {
          coach_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          routine_days?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_invite: {
        Args: { _athlete_id: string; _token: string }
        Returns: Json
      }
      get_coach_info: { Args: { _coach_id: string }; Returns: Json }
      get_my_head_coach_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_team_member_of: {
        Args: { _head_coach_id: string }
        Returns: boolean
      }
      is_coach_of: { Args: { _athlete_id: string }; Returns: boolean }
      link_athlete_to_coach: {
        Args: { _athlete_email: string; _coach_id: string }
        Returns: Json
      }
      resolve_dispute: {
        Args: {
          p_challenge_id: string
          p_is_draw?: boolean
          p_winner_id?: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "coach" | "athlete"
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
      app_role: ["admin", "coach", "athlete"],
    },
  },
} as const

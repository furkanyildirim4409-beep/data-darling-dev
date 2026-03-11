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
      assigned_workouts: {
        Row: {
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
      daily_checkins: {
        Row: {
          created_at: string | null
          id: string
          mood: number | null
          notes: string | null
          sleep: number | null
          soreness: number | null
          stress: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          mood?: number | null
          notes?: string | null
          sleep?: number | null
          soreness?: number | null
          stress?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          mood?: number | null
          notes?: string | null
          sleep?: number | null
          soreness?: number | null
          stress?: number | null
          user_id?: string
        }
        Relationships: []
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
          level: number | null
          notification_preferences: Json | null
          notification_settings: Json | null
          readiness_score: number | null
          role: string | null
          specialty: string | null
          streak: number | null
          subscription_status: string | null
          subscription_tier: string | null
          updated_at: string | null
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
          level?: number | null
          notification_preferences?: Json | null
          notification_settings?: Json | null
          readiness_score?: number | null
          role?: string | null
          specialty?: string | null
          streak?: number | null
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
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
          level?: number | null
          notification_preferences?: Json | null
          notification_settings?: Json | null
          readiness_score?: number | null
          role?: string | null
          specialty?: string | null
          streak?: number | null
          subscription_status?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
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
      programs: {
        Row: {
          automation_rules: Json | null
          coach_id: string | null
          created_at: string | null
          description: string | null
          difficulty: string | null
          id: string
          target_goal: string | null
          title: string
          week_config: Json | null
        }
        Insert: {
          automation_rules?: Json | null
          coach_id?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          target_goal?: string | null
          title: string
          week_config?: Json | null
        }
        Update: {
          automation_rules?: Json | null
          coach_id?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          target_goal?: string | null
          title?: string
          week_config?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "programs_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_coach_of: { Args: { _athlete_id: string }; Returns: boolean }
      link_athlete_to_coach: {
        Args: { _athlete_email: string; _coach_id: string }
        Returns: Json
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

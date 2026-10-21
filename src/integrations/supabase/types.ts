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
  public: {
    Tables: {
      app_user_connections: {
        Row: {
          connection_key_ciphertext: string
          connector_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_key_ciphertext: string
          connector_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connection_key_ciphertext?: string
          connector_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bill_payments: {
        Row: {
          bill_id: string
          due_on: string
          id: string
          paid_at: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          bill_id: string
          due_on: string
          id?: string
          paid_at?: string
          transaction_id?: string | null
          user_id?: string
        }
        Update: {
          bill_id?: string
          due_on?: string
          id?: string
          paid_at?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_payments_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "recurring_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          category: string
          id: string
          monthly_limit: number
          user_id: string
        }
        Insert: {
          category: string
          id?: string
          monthly_limit: number
          user_id?: string
        }
        Update: {
          category?: string
          id?: string
          monthly_limit?: number
          user_id?: string
        }
        Relationships: []
      }
      calendar_oauth_attempts: {
        Row: {
          expires_at: string
          id: string
          nonce_hash: string
          user_id: string
        }
        Insert: {
          expires_at?: string
          id?: string
          nonce_hash: string
          user_id: string
        }
        Update: {
          expires_at?: string
          id?: string
          nonce_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      custom_exercises: {
        Row: {
          created_at: string
          id: string
          kcal_per_hour: number
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kcal_per_hour: number
          name: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          kcal_per_hour?: number
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      custom_foods: {
        Row: {
          carbs_100g: number
          created_at: string
          fat_100g: number
          id: string
          kcal_100g: number
          name: string
          protein_100g: number
          unit_grams: number | null
          user_id: string
        }
        Insert: {
          carbs_100g?: number
          created_at?: string
          fat_100g?: number
          id?: string
          kcal_100g: number
          name: string
          protein_100g?: number
          unit_grams?: number | null
          user_id?: string
        }
        Update: {
          carbs_100g?: number
          created_at?: string
          fat_100g?: number
          id?: string
          kcal_100g?: number
          name?: string
          protein_100g?: number
          unit_grams?: number | null
          user_id?: string
        }
        Relationships: []
      }
      energy_activities: {
        Row: {
          activity: string
          calories: number
          calories_high: number | null
          calories_low: number | null
          created_at: string
          estimate_note: string | null
          id: string
          minutes: number
          occurred_on: string
          personalized: boolean
          user_id: string
        }
        Insert: {
          activity: string
          calories: number
          calories_high?: number | null
          calories_low?: number | null
          created_at?: string
          estimate_note?: string | null
          id?: string
          minutes: number
          occurred_on?: string
          personalized?: boolean
          user_id?: string
        }
        Update: {
          activity?: string
          calories?: number
          calories_high?: number | null
          calories_low?: number | null
          created_at?: string
          estimate_note?: string | null
          id?: string
          minutes?: number
          occurred_on?: string
          personalized?: boolean
          user_id?: string
        }
        Relationships: []
      }
      energy_profiles: {
        Row: {
          age: number
          created_at: string
          height_cm: number
          id: string
          sex: string
          user_id: string
          weight_kg: number
        }
        Insert: {
          age: number
          created_at?: string
          height_cm: number
          id?: string
          sex: string
          user_id?: string
          weight_kg: number
        }
        Update: {
          age?: number
          created_at?: string
          height_cm?: number
          id?: string
          sex?: string
          user_id?: string
          weight_kg?: number
        }
        Relationships: []
      }
      financial_goals: {
        Row: {
          created_at: string
          id: string
          saved_amount: number
          target_amount: number
          target_date: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          saved_amount?: number
          target_amount: number
          target_date: string
          title: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          saved_amount?: number
          target_amount?: number
          target_date?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      habit_checks: {
        Row: {
          checked_on: string
          created_at: string
          habit_id: string
          id: string
          user_id: string
        }
        Insert: {
          checked_on?: string
          created_at?: string
          habit_id: string
          id?: string
          user_id?: string
        }
        Update: {
          checked_on?: string
          created_at?: string
          habit_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_checks_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          created_at: string
          id: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      mcp_tool_blocks: {
        Row: {
          client_id: string
          created_at: string
          tool_name: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          tool_name: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          tool_name?: string
          user_id?: string
        }
        Relationships: []
      }
      meals: {
        Row: {
          calories: number
          carbs: number
          created_at: string
          eaten_on: string
          fat: number
          id: string
          meal_type: string
          name: string
          protein: number
          user_id: string
        }
        Insert: {
          calories?: number
          carbs?: number
          created_at?: string
          eaten_on?: string
          fat?: number
          id?: string
          meal_type?: string
          name: string
          protein?: number
          user_id?: string
        }
        Update: {
          calories?: number
          carbs?: number
          created_at?: string
          eaten_on?: string
          fat?: number
          id?: string
          meal_type?: string
          name?: string
          protein?: number
          user_id?: string
        }
        Relationships: []
      }
      memories: {
        Row: {
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          created_at: string
          id: string
          parts: Json
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parts: Json
          role: string
          thread_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          parts?: Json
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          read_at: string | null
          reminder_key: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          reminder_key?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          reminder_key?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      plan_grants: {
        Row: {
          created_at: string
          expires_at: string | null
          granted_by: string | null
          id: string
          is_trial: boolean
          note: string | null
          plan: string
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          is_trial?: boolean
          note?: string | null
          plan: string
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          is_trial?: boolean
          note?: string | null
          plan?: string
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          active: boolean
          body: string | null
          created_at: string
          created_by: string | null
          cta_label: string | null
          cta_url: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          starts_at: string | null
          title: string
        }
        Insert: {
          active?: boolean
          body?: string | null
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          starts_at?: string | null
          title: string
        }
        Update: {
          active?: boolean
          body?: string | null
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          starts_at?: string | null
          title?: string
        }
        Relationships: []
      }
      push_configuration: {
        Row: {
          id: string
          private_key_ciphertext: string
          public_key: string
        }
        Insert: {
          id: string
          private_key_ciphertext: string
          public_key: string
        }
        Update: {
          id?: string
          private_key_ciphertext?: string
          public_key?: string
        }
        Relationships: []
      }
      push_deliveries: {
        Row: {
          attempts: number
          delivered_at: string | null
          device_id: string
          id: string
          next_attempt_at: string
          notification_id: string
        }
        Insert: {
          attempts?: number
          delivered_at?: string | null
          device_id: string
          id?: string
          next_attempt_at?: string
          notification_id: string
        }
        Update: {
          attempts?: number
          delivered_at?: string | null
          device_id?: string
          id?: string
          next_attempt_at?: string
          notification_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_deliveries_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "push_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_deliveries_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      push_devices: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          subscription_ciphertext: string
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          subscription_ciphertext: string
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          subscription_ciphertext?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring_bills: {
        Row: {
          active: boolean
          amount: number
          category: string
          created_at: string
          due_day: number
          id: string
          reminder_days: number
          starts_on: string
          title: string
          user_id: string
        }
        Insert: {
          active?: boolean
          amount: number
          category?: string
          created_at?: string
          due_day: number
          id?: string
          reminder_days?: number
          starts_on?: string
          title: string
          user_id?: string
        }
        Update: {
          active?: boolean
          amount?: number
          category?: string
          created_at?: string
          due_day?: number
          id?: string
          reminder_days?: number
          starts_on?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          last_event_at: string | null
          paddle_customer_id: string
          paddle_subscription_id: string
          past_due_since: string | null
          price_id: string
          product_id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          last_event_at?: string | null
          paddle_customer_id: string
          paddle_subscription_id: string
          past_due_since?: string | null
          price_id: string
          product_id: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          last_event_at?: string | null
          paddle_customer_id?: string
          paddle_subscription_id?: string
          past_due_since?: string | null
          price_id?: string
          product_id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string
          done: boolean
          due_at: string | null
          id: string
          minutes: number | null
          priority: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          due_at?: string | null
          id?: string
          minutes?: number | null
          priority?: string
          title: string
          user_id?: string
        }
        Update: {
          created_at?: string
          done?: boolean
          due_at?: string | null
          id?: string
          minutes?: number | null
          priority?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      threads: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      time_sessions: {
        Row: {
          category: string
          created_at: string
          ended_at: string | null
          id: string
          started_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          user_id?: string
        }
        Update: {
          category?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          id: string
          kind: string
          occurred_on: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          occurred_on?: string
          user_id?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          occurred_on?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          activity_level: string | null
          age: number | null
          created_at: string
          currency: string
          diet_goal: string | null
          dietary_restrictions: string[]
          display_name: string | null
          free_days: number[]
          goals: string[]
          health_consent_at: string | null
          height_cm: number | null
          id: string
          language: string
          monthly_budget: number | null
          monthly_income: number | null
          onboarding_completed_at: string | null
          priorities: string[]
          privacy_version: string
          sex: string | null
          sleep_time: string | null
          timezone: string
          user_id: string
          wake_time: string | null
          weight_kg: number | null
          work_end: string | null
          work_start: string | null
        }
        Insert: {
          activity_level?: string | null
          age?: number | null
          created_at?: string
          currency?: string
          diet_goal?: string | null
          dietary_restrictions?: string[]
          display_name?: string | null
          free_days?: number[]
          goals?: string[]
          health_consent_at?: string | null
          height_cm?: number | null
          id?: string
          language?: string
          monthly_budget?: number | null
          monthly_income?: number | null
          onboarding_completed_at?: string | null
          priorities?: string[]
          privacy_version?: string
          sex?: string | null
          sleep_time?: string | null
          timezone?: string
          user_id?: string
          wake_time?: string | null
          weight_kg?: number | null
          work_end?: string | null
          work_start?: string | null
        }
        Update: {
          activity_level?: string | null
          age?: number | null
          created_at?: string
          currency?: string
          diet_goal?: string | null
          dietary_restrictions?: string[]
          display_name?: string | null
          free_days?: number[]
          goals?: string[]
          health_consent_at?: string | null
          height_cm?: number | null
          id?: string
          language?: string
          monthly_budget?: number | null
          monthly_income?: number | null
          onboarding_completed_at?: string | null
          priorities?: string[]
          privacy_version?: string
          sex?: string | null
          sleep_time?: string | null
          timezone?: string
          user_id?: string
          wake_time?: string | null
          weight_kg?: number | null
          work_end?: string | null
          work_start?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workout_exercises: {
        Row: {
          created_at: string
          exercise_id: string | null
          gif_url: string | null
          id: string
          name: string
          position: number
          reps: string
          rest_seconds: number
          sets: number
          target: string | null
          user_id: string
          weight: string | null
          workout_id: string
        }
        Insert: {
          created_at?: string
          exercise_id?: string | null
          gif_url?: string | null
          id?: string
          name: string
          position?: number
          reps?: string
          rest_seconds?: number
          sets?: number
          target?: string | null
          user_id?: string
          weight?: string | null
          workout_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string | null
          gif_url?: string | null
          id?: string
          name?: string
          position?: number
          reps?: string
          rest_seconds?: number
          sets?: number
          target?: string | null
          user_id?: string
          weight?: string | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bill_due_date: {
        Args: { d: number; m: number; y: number }
        Returns: string
      }
      generate_bill_reminders: { Args: never; Returns: number }
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      pay_monthly_bill: {
        Args: { _bill_id: string; _due_on: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const

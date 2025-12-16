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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      blink_patterns: {
        Row: {
          blink_duration_ms: number | null
          created_at: string | null
          ear_value: number | null
          id: string
          screen_session_id: string
          timestamp: string
          user_id: string
        }
        Insert: {
          blink_duration_ms?: number | null
          created_at?: string | null
          ear_value?: number | null
          id?: string
          screen_session_id: string
          timestamp: string
          user_id: string
        }
        Update: {
          blink_duration_ms?: number | null
          created_at?: string | null
          ear_value?: number | null
          id?: string
          screen_session_id?: string
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blink_patterns_screen_session_id_fkey"
            columns: ["screen_session_id"]
            isOneToOne: false
            referencedRelation: "screen_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blink_patterns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      calibrations: {
        Row: {
          baseline_ear_closed: number | null
          baseline_ear_open: number | null
          created_at: string | null
          device_type: string | null
          ear_threshold: number
          id: string
          is_active: boolean | null
          is_default: boolean | null
          metadata: Json | null
          name: string
          platform: string | null
          raw_data: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          baseline_ear_closed?: number | null
          baseline_ear_open?: number | null
          created_at?: string | null
          device_type?: string | null
          ear_threshold?: number
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          metadata?: Json | null
          name?: string
          platform?: string | null
          raw_data?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          baseline_ear_closed?: number | null
          baseline_ear_open?: number | null
          created_at?: string | null
          device_type?: string | null
          ear_threshold?: number
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          metadata?: Json | null
          name?: string
          platform?: string | null
          raw_data?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calibrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      screen_sessions: {
        Row: {
          average_blink_rate: number | null
          calibration_id: string | null
          created_at: string | null
          device_type: string | null
          end_timestamp: string | null
          face_lost_periods: Json | null
          id: string
          platform: string | null
          quality_assessment: string | null
          session_type: string | null
          start_timestamp: string
          timezone: string | null
          total_blinks: number | null
          user_id: string
        }
        Insert: {
          average_blink_rate?: number | null
          calibration_id?: string | null
          created_at?: string | null
          device_type?: string | null
          end_timestamp?: string | null
          face_lost_periods?: Json | null
          id?: string
          platform?: string | null
          quality_assessment?: string | null
          session_type?: string | null
          start_timestamp: string
          timezone?: string | null
          total_blinks?: number | null
          user_id: string
        }
        Update: {
          average_blink_rate?: number | null
          calibration_id?: string | null
          created_at?: string | null
          device_type?: string | null
          end_timestamp?: string | null
          face_lost_periods?: Json | null
          id?: string
          platform?: string | null
          quality_assessment?: string | null
          session_type?: string | null
          start_timestamp?: string
          timezone?: string | null
          total_blinks?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "screen_sessions_calibration_id_fkey"
            columns: ["calibration_id"]
            isOneToOne: false
            referencedRelation: "calibrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          break_suggestion_enabled: boolean | null
          break_suggestion_enabled_set_at: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          last_seen_at: string | null
          preferred_blink_threshold: number | null
          preferred_blink_threshold_set_at: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_end_date: string | null
          subscription_tier: string | null
        }
        Insert: {
          break_suggestion_enabled?: boolean | null
          break_suggestion_enabled_set_at?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          last_seen_at?: string | null
          preferred_blink_threshold?: number | null
          preferred_blink_threshold_set_at?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_tier?: string | null
        }
        Update: {
          break_suggestion_enabled?: boolean | null
          break_suggestion_enabled_set_at?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          last_seen_at?: string | null
          preferred_blink_threshold?: number | null
          preferred_blink_threshold_set_at?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          subscription_tier?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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

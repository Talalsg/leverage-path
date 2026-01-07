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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_evaluations: {
        Row: {
          created_at: string
          deal_id: string | null
          evaluation_type: string
          id: string
          input_data: Json | null
          model_used: string | null
          output_data: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          deal_id?: string | null
          evaluation_type: string
          id?: string
          input_data?: Json | null
          model_used?: string | null
          output_data?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          deal_id?: string | null
          evaluation_type?: string
          id?: string
          input_data?: Json | null
          model_used?: string | null
          output_data?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_evaluations_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_key_ten: boolean | null
          last_touchpoint: string | null
          linkedin: string | null
          name: string
          notes: string | null
          organization: string | null
          phone: string | null
          role: string | null
          tier: string
          trust_level: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_key_ten?: boolean | null
          last_touchpoint?: string | null
          linkedin?: string | null
          name: string
          notes?: string | null
          organization?: string | null
          phone?: string | null
          role?: string | null
          tier?: string
          trust_level?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_key_ten?: boolean | null
          last_touchpoint?: string | null
          linkedin?: string | null
          name?: string
          notes?: string | null
          organization?: string | null
          phone?: string | null
          role?: string | null
          tier?: string
          trust_level?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deal_patterns: {
        Row: {
          created_at: string
          id: string
          negative_signals: string[] | null
          pattern_name: string
          positive_signals: string[] | null
          updated_at: string
          user_id: string
          weight: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          negative_signals?: string[] | null
          pattern_name: string
          positive_signals?: string[] | null
          updated_at?: string
          user_id: string
          weight?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          negative_signals?: string[] | null
          pattern_name?: string
          positive_signals?: string[] | null
          updated_at?: string
          user_id?: string
          weight?: number | null
        }
        Relationships: []
      }
      deals: {
        Row: {
          ai_analysis: string | null
          ai_memo: string | null
          ai_score: number | null
          backtest_result: Json | null
          company_name: string
          created_at: string
          crunchbase_data: Json | null
          decision_reason: string | null
          deck_url: string | null
          equity_offered: number | null
          exit_potential: string | null
          failure_modes: string | null
          founder_execution_score: number | null
          founder_linkedin: string | null
          founder_linkedin_data: Json | null
          founder_name: string | null
          founder_sales_ability: number | null
          id: string
          iteration_speed: number | null
          notes: string | null
          outcome: string | null
          outcome_notes: string | null
          overall_score: number | null
          sector: string | null
          stage: string | null
          updated_at: string
          user_id: string
          valuation_usd: number | null
          vision_2030_alignment: number | null
        }
        Insert: {
          ai_analysis?: string | null
          ai_memo?: string | null
          ai_score?: number | null
          backtest_result?: Json | null
          company_name: string
          created_at?: string
          crunchbase_data?: Json | null
          decision_reason?: string | null
          deck_url?: string | null
          equity_offered?: number | null
          exit_potential?: string | null
          failure_modes?: string | null
          founder_execution_score?: number | null
          founder_linkedin?: string | null
          founder_linkedin_data?: Json | null
          founder_name?: string | null
          founder_sales_ability?: number | null
          id?: string
          iteration_speed?: number | null
          notes?: string | null
          outcome?: string | null
          outcome_notes?: string | null
          overall_score?: number | null
          sector?: string | null
          stage?: string | null
          updated_at?: string
          user_id: string
          valuation_usd?: number | null
          vision_2030_alignment?: number | null
        }
        Update: {
          ai_analysis?: string | null
          ai_memo?: string | null
          ai_score?: number | null
          backtest_result?: Json | null
          company_name?: string
          created_at?: string
          crunchbase_data?: Json | null
          decision_reason?: string | null
          deck_url?: string | null
          equity_offered?: number | null
          exit_potential?: string | null
          failure_modes?: string | null
          founder_execution_score?: number | null
          founder_linkedin?: string | null
          founder_linkedin_data?: Json | null
          founder_name?: string | null
          founder_sales_ability?: number | null
          id?: string
          iteration_speed?: number | null
          notes?: string | null
          outcome?: string | null
          outcome_notes?: string | null
          overall_score?: number | null
          sector?: string | null
          stage?: string | null
          updated_at?: string
          user_id?: string
          valuation_usd?: number | null
          vision_2030_alignment?: number | null
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string
          current_value: number | null
          description: string | null
          id: string
          is_completed: boolean | null
          quarter: number | null
          target_value: number | null
          title: string
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          current_value?: number | null
          description?: string | null
          id?: string
          is_completed?: boolean | null
          quarter?: number | null
          target_value?: number | null
          title: string
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          current_value?: number | null
          description?: string | null
          id?: string
          is_completed?: boolean | null
          quarter?: number | null
          target_value?: number | null
          title?: string
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      insights: {
        Row: {
          content: string | null
          created_at: string
          engagement_comments: number | null
          engagement_likes: number | null
          engagement_shares: number | null
          id: string
          inbound_inquiries: number | null
          platform: string | null
          publish_date: string | null
          scheduled_date: string | null
          status: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          engagement_comments?: number | null
          engagement_likes?: number | null
          engagement_shares?: number | null
          id?: string
          inbound_inquiries?: number | null
          platform?: string | null
          publish_date?: string | null
          scheduled_date?: string | null
          status?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          engagement_comments?: number | null
          engagement_likes?: number | null
          engagement_shares?: number | null
          id?: string
          inbound_inquiries?: number | null
          platform?: string | null
          publish_date?: string | null
          scheduled_date?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      portfolio: {
        Row: {
          company_name: string
          created_at: string
          current_valuation_usd: number | null
          deal_id: string | null
          entry_date: string | null
          entry_valuation_usd: number | null
          equity_percent: number | null
          exit_date: string | null
          exit_valuation_usd: number | null
          id: string
          is_top_position: boolean | null
          notes: string | null
          return_multiple: number | null
          sector: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name: string
          created_at?: string
          current_valuation_usd?: number | null
          deal_id?: string | null
          entry_date?: string | null
          entry_valuation_usd?: number | null
          equity_percent?: number | null
          exit_date?: string | null
          exit_valuation_usd?: number | null
          id?: string
          is_top_position?: boolean | null
          notes?: string | null
          return_multiple?: number | null
          sector?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string
          created_at?: string
          current_valuation_usd?: number | null
          deal_id?: string | null
          entry_date?: string | null
          entry_valuation_usd?: number | null
          equity_percent?: number | null
          exit_date?: string | null
          exit_valuation_usd?: number | null
          id?: string
          is_top_position?: boolean | null
          notes?: string | null
          return_multiple?: number | null
          sector?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      touchpoints: {
        Row: {
          contact_id: string
          created_at: string
          date: string
          id: string
          outcome: string | null
          summary: string | null
          type: string
          user_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          date?: string
          id?: string
          outcome?: string | null
          summary?: string | null
          type: string
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          date?: string
          id?: string
          outcome?: string | null
          summary?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "touchpoints_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
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

export const Constants = {
  public: {
    Enums: {},
  },
} as const

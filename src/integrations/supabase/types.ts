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
      generated_pages: {
        Row: {
          created_at: string
          html_content: string
          id: string
          metadata: Json | null
          outline: string
          persona_id: string | null
          persona_rationale: string | null
          rationale: string
        }
        Insert: {
          created_at?: string
          html_content: string
          id?: string
          metadata?: Json | null
          outline: string
          persona_id?: string | null
          persona_rationale?: string | null
          rationale: string
        }
        Update: {
          created_at?: string
          html_content?: string
          id?: string
          metadata?: Json | null
          outline?: string
          persona_id?: string | null
          persona_rationale?: string | null
          rationale?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_pages_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      geo_playbook: {
        Row: {
          chunk: string
          embedding: string | null
          id: string
          section: string
        }
        Insert: {
          chunk: string
          embedding?: string | null
          id?: string
          section: string
        }
        Update: {
          chunk?: string
          embedding?: string | null
          id?: string
          section?: string
        }
        Relationships: []
      }
      indexability_results: {
        Row: {
          content_scannability_score: number
          created_at: string | null
          entity_clarity_score: number
          html_indexability_score: number
          id: string
          issues: Json | null
          page_id: string
          result_id: string | null
          structure_clarity_score: number
          suggestions: Json | null
        }
        Insert: {
          content_scannability_score: number
          created_at?: string | null
          entity_clarity_score: number
          html_indexability_score: number
          id?: string
          issues?: Json | null
          page_id: string
          result_id?: string | null
          structure_clarity_score: number
          suggestions?: Json | null
        }
        Update: {
          content_scannability_score?: number
          created_at?: string | null
          entity_clarity_score?: number
          html_indexability_score?: number
          id?: string
          issues?: Json | null
          page_id?: string
          result_id?: string | null
          structure_clarity_score?: number
          suggestions?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "indexability_results_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indexability_results_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: false
            referencedRelation: "results"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          crawl_status: string | null
          depth: number | null
          fetch_timestamp: string
          html_content: string | null
          id: string
          parent_url: string | null
          title: string | null
          url: string
        }
        Insert: {
          crawl_status?: string | null
          depth?: number | null
          fetch_timestamp?: string
          html_content?: string | null
          id?: string
          parent_url?: string | null
          title?: string | null
          url: string
        }
        Update: {
          crawl_status?: string | null
          depth?: number | null
          fetch_timestamp?: string
          html_content?: string | null
          id?: string
          parent_url?: string | null
          title?: string | null
          url?: string
        }
        Relationships: []
      }
      persona_results: {
        Row: {
          comprehension_score: number
          global_geo_score: number
          id: string
          llm_response: string
          page_id: string
          persona_id: string
          prompt: string
          recommendation_score: number
          recommendations: Json
          relevance_score: number
          timestamp: string
          visibility_score: number
        }
        Insert: {
          comprehension_score: number
          global_geo_score: number
          id?: string
          llm_response: string
          page_id: string
          persona_id: string
          prompt: string
          recommendation_score: number
          recommendations?: Json
          relevance_score: number
          timestamp?: string
          visibility_score: number
        }
        Update: {
          comprehension_score?: number
          global_geo_score?: number
          id?: string
          llm_response?: string
          page_id?: string
          persona_id?: string
          prompt?: string
          recommendation_score?: number
          recommendations?: Json
          relevance_score?: number
          timestamp?: string
          visibility_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "persona_results_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persona_results_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      personas: {
        Row: {
          created_at: string
          description: string
          goal: string
          id: string
          name: string
          needs: string
          risk_profile: string
          typical_questions: string[] | null
        }
        Insert: {
          created_at?: string
          description: string
          goal: string
          id?: string
          name: string
          needs: string
          risk_profile: string
          typical_questions?: string[] | null
        }
        Update: {
          created_at?: string
          description?: string
          goal?: string
          id?: string
          name?: string
          needs?: string
          risk_profile?: string
          typical_questions?: string[] | null
        }
        Relationships: []
      }
      results: {
        Row: {
          comprehension_score: number
          global_geo_score: number
          id: string
          llm_response: string
          page_id: string
          prompt_text: string
          prompt_type: string
          recommendation_score: number
          recommendations: Json
          relevance_score: number
          timestamp: string
          visibility_score: number
        }
        Insert: {
          comprehension_score: number
          global_geo_score: number
          id?: string
          llm_response: string
          page_id: string
          prompt_text: string
          prompt_type: string
          recommendation_score: number
          recommendations?: Json
          relevance_score: number
          timestamp?: string
          visibility_score: number
        }
        Update: {
          comprehension_score?: number
          global_geo_score?: number
          id?: string
          llm_response?: string
          page_id?: string
          prompt_text?: string
          prompt_type?: string
          recommendation_score?: number
          recommendations?: Json
          relevance_score?: number
          timestamp?: string
          visibility_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "results_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      rewrites: {
        Row: {
          geo_rationale: string
          id: string
          original_html: string
          page_id: string
          rewritten_html: string
          summary: string
          timestamp: string | null
        }
        Insert: {
          geo_rationale: string
          id?: string
          original_html: string
          page_id: string
          rewritten_html: string
          summary: string
          timestamp?: string | null
        }
        Update: {
          geo_rationale?: string
          id?: string
          original_html?: string
          page_id?: string
          rewritten_html?: string
          summary?: string
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rewrites_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_playbook_chunks: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          chunk: string
          id: string
          section: string
          similarity: number
        }[]
      }
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

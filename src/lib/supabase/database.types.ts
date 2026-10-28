// Database types for the schema in supabase/migrations.
// Mirrors the output of `supabase gen types typescript`; regenerate with
//   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts
// and keep it in sync whenever a migration changes.

export type Json =
  string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          plan: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          plan?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          plan?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      agents: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string
          avatar: string
          purpose: string
          personality: string
          instructions: string
          language: string
          template_key: string | null
          model: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          name: string
          description?: string
          avatar?: string
          purpose?: string
          personality?: string
          instructions?: string
          language?: string
          template_key?: string | null
          model?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string
          avatar?: string
          purpose?: string
          personality?: string
          instructions?: string
          language?: string
          template_key?: string | null
          model?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      agent_memories: {
        Row: {
          id: string
          user_id: string
          agent_id: string
          title: string
          content: string
          pinned: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          agent_id: string
          title?: string
          content: string
          pinned?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          agent_id?: string
          title?: string
          content?: string
          pinned?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_memories_agent_id_user_id_fkey"
            columns: ["agent_id", "user_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      conversations: {
        Row: {
          id: string
          user_id: string
          agent_id: string
          title: string
          last_message_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          agent_id: string
          title?: string
          last_message_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          agent_id?: string
          title?: string
          last_message_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_agent_id_user_id_fkey"
            columns: ["agent_id", "user_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      messages: {
        Row: {
          id: string
          user_id: string
          conversation_id: string
          role: string
          content: string
          status: string
          model: string | null
          input_tokens: number | null
          output_tokens: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          conversation_id: string
          role: string
          content: string
          status?: string
          model?: string | null
          input_tokens?: number | null
          output_tokens?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          conversation_id?: string
          role?: string
          content?: string
          status?: string
          model?: string | null
          input_tokens?: number | null
          output_tokens?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_user_id_fkey"
            columns: ["conversation_id", "user_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      usage_events: {
        Row: {
          id: number
          user_id: string
          event_type: string
          provider: string
          model: string
          agent_id: string | null
          conversation_id: string | null
          input_tokens: number
          output_tokens: number
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          event_type: string
          provider: string
          model: string
          agent_id?: string | null
          conversation_id?: string | null
          input_tokens?: number
          output_tokens?: number
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          event_type?: string
          provider?: string
          model?: string
          agent_id?: string | null
          conversation_id?: string | null
          input_tokens?: number
          output_tokens?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_events_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_events_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_my_account: {
        Args: never
        Returns: undefined
      }
      record_usage_event: {
        Args: {
          p_event_type: string
          p_provider: string
          p_model: string
          p_input_tokens: number
          p_output_tokens: number
          p_agent_id?: string
          p_conversation_id?: string
        }
        Returns: number
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

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"]

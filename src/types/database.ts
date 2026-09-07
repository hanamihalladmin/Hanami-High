export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.5' }
  public: {
    Tables: {
      accounts: {
        Row: {
          account_state: string
          active_character_id: string | null
          created_at: string
          discord_avatar_url: string | null
          discord_user_id: string | null
          discord_username: string | null
          first_enrollment_reward_claimed_at: string | null
          id: string
          updated_at: string
        }
        Insert: {
          account_state?: string
          active_character_id?: string | null
          created_at?: string
          discord_avatar_url?: string | null
          discord_user_id?: string | null
          discord_username?: string | null
          first_enrollment_reward_claimed_at?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          account_state?: string
          active_character_id?: string | null
          created_at?: string
          discord_avatar_url?: string | null
          discord_user_id?: string | null
          discord_username?: string | null
          first_enrollment_reward_claimed_at?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      characters: {
        Row: {
          account_id: string
          character_kind: string
          character_state: string
          created_at: string
          display_name: string | null
          first_name: string | null
          handle: string | null
          id: string
          last_name: string | null
          orientation_completed_at: string | null
          promoted_to_student_at: string | null
          school_role: string | null
          slot_no: number
          updated_at: string
        }
        Insert: {
          account_id: string
          character_kind?: string
          character_state?: string
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          handle?: string | null
          id?: string
          last_name?: string | null
          orientation_completed_at?: string | null
          promoted_to_student_at?: string | null
          school_role?: string | null
          slot_no: number
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['characters']['Insert']>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      create_student_character_slot: {
        Args: { p_slot_no: number }
        Returns: Database['public']['Tables']['characters']['Row']
      }
      current_capabilities: {
        Args: Record<PropertyKey, never>
        Returns: { code: string }[]
      }
      current_platform_roles: {
        Args: Record<PropertyKey, never>
        Returns: { code: string }[]
      }
      set_active_character: {
        Args: { p_character_id: string }
        Returns: string
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export type HanamiAccount = Database['public']['Tables']['accounts']['Row']
export type HanamiCharacter = Database['public']['Tables']['characters']['Row']

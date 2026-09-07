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
        Update: {
          account_id?: string
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
          slot_no?: number
          updated_at?: string
        }
        Relationships: []
      }
      student_applications: {
        Row: {
          acceptance_letter_opened_at: string | null
          accepted_at: string | null
          additional_notes: string | null
          age: number | null
          appearance_description: string | null
          applicant_account_id: string
          attendance_reason: string | null
          background: string | null
          birth_date: string | null
          character_id: string
          character_limit_ack: boolean
          club_interests: string[]
          created_at: string
          deletion_ack: boolean
          dislikes: string | null
          distinguishing_features: string | null
          elective_preference: string | null
          family_information: string | null
          height_cm: number | null
          hobbies: string | null
          likes: string | null
          nickname: string | null
          personality: string | null
          pronouns: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          rules_read: boolean
          school_year: number | null
          serious_rp_ack: boolean
          status: string
          strengths: string | null
          submitted_at: string | null
          updated_at: string
          weaknesses: string | null
        }
        Insert: {
          character_id: string
          applicant_account_id: string
          acceptance_letter_opened_at?: string | null
          accepted_at?: string | null
          additional_notes?: string | null
          age?: number | null
          appearance_description?: string | null
          attendance_reason?: string | null
          background?: string | null
          birth_date?: string | null
          character_limit_ack?: boolean
          club_interests?: string[]
          created_at?: string
          deletion_ack?: boolean
          dislikes?: string | null
          distinguishing_features?: string | null
          elective_preference?: string | null
          family_information?: string | null
          height_cm?: number | null
          hobbies?: string | null
          likes?: string | null
          nickname?: string | null
          personality?: string | null
          pronouns?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rules_read?: boolean
          school_year?: number | null
          serious_rp_ack?: boolean
          status?: string
          strengths?: string | null
          submitted_at?: string | null
          updated_at?: string
          weaknesses?: string | null
        }
        Update: {
          acceptance_letter_opened_at?: string | null
          accepted_at?: string | null
          additional_notes?: string | null
          age?: number | null
          appearance_description?: string | null
          applicant_account_id?: string
          attendance_reason?: string | null
          background?: string | null
          birth_date?: string | null
          character_id?: string
          character_limit_ack?: boolean
          club_interests?: string[]
          created_at?: string
          deletion_ack?: boolean
          dislikes?: string | null
          distinguishing_features?: string | null
          elective_preference?: string | null
          family_information?: string | null
          height_cm?: number | null
          hobbies?: string | null
          likes?: string | null
          nickname?: string | null
          personality?: string | null
          pronouns?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rules_read?: boolean
          school_year?: number | null
          serious_rp_ack?: boolean
          status?: string
          strengths?: string | null
          submitted_at?: string | null
          updated_at?: string
          weaknesses?: string | null
        }
        Relationships: []
      }
      application_reviews: {
        Row: {
          character_id: string
          created_at: string
          decision: string
          id: string
          message: string
          reviewer_account_id: string
        }
        Insert: {
          character_id: string
          decision: string
          message: string
          reviewer_account_id: string
          id?: string
          created_at?: string
        }
        Update: {
          character_id?: string
          decision?: string
          message?: string
          reviewer_account_id?: string
          id?: string
          created_at?: string
        }
        Relationships: []
      }
      character_orientations: {
        Row: {
          account_id: string
          character_id: string
          completed_at: string | null
          created_at: string
          started_at: string
          track: string
          updated_at: string
          version: number
        }
        Insert: {
          account_id: string
          character_id: string
          completed_at?: string | null
          created_at?: string
          started_at?: string
          track: string
          updated_at?: string
          version?: number
        }
        Update: {
          account_id?: string
          character_id?: string
          completed_at?: string | null
          created_at?: string
          started_at?: string
          track?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      character_orientation_tasks: {
        Row: {
          character_id: string
          completed_at: string | null
          required: boolean
          task_code: string
        }
        Insert: {
          character_id: string
          completed_at?: string | null
          required?: boolean
          task_code: string
        }
        Update: {
          character_id?: string
          completed_at?: string | null
          required?: boolean
          task_code?: string
        }
        Relationships: []
      }
      student_status_actions: {
        Row: {
          action: string
          actor_account_id: string
          character_id: string
          created_at: string
          id: string
          note: string | null
        }
        Insert: {
          actor_account_id: string
          character_id: string
          action?: string
          created_at?: string
          id?: string
          note?: string | null
        }
        Update: {
          actor_account_id?: string
          character_id?: string
          action?: string
          created_at?: string
          id?: string
          note?: string | null
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      complete_orientation_task: {
        Args: { p_character_id: string; p_task_code: string }
        Returns: string
      }
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
      has_capability: {
        Args: { p_capability: string }
        Returns: boolean
      }
      mark_acceptance_letter_opened: {
        Args: { p_character_id: string }
        Returns: string
      }
      set_active_character: {
        Args: { p_character_id: string }
        Returns: string
      }
      submit_student_application: {
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
export type StudentApplication = Database['public']['Tables']['student_applications']['Row']
export type StudentApplicationUpdate = Database['public']['Tables']['student_applications']['Update']
export type ApplicationReview = Database['public']['Tables']['application_reviews']['Row']
export type CharacterOrientation = Database['public']['Tables']['character_orientations']['Row']
export type CharacterOrientationTask = Database['public']['Tables']['character_orientation_tasks']['Row']
export type StudentStatusAction = Database['public']['Tables']['student_status_actions']['Row']

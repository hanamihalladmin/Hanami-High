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
        Update: Partial<Database['public']['Tables']['accounts']['Insert']>
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
      character_profiles: {
        Row: {
          avatar_path: string | null
          banner_path: string | null
          bio: string | null
          character_id: string
          created_at: string
          custom_status: string | null
          guestbook_visibility: string
          profile_visibility: string
          pronouns: string | null
          published_at: string | null
          theme_draft: Json
          theme_published: Json
          updated_at: string
        }
        Insert: {
          character_id: string
          avatar_path?: string | null
          banner_path?: string | null
          bio?: string | null
          created_at?: string
          custom_status?: string | null
          guestbook_visibility?: string
          profile_visibility?: string
          pronouns?: string | null
          published_at?: string | null
          theme_draft?: Json
          theme_published?: Json
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['character_profiles']['Insert']>
        Relationships: []
      }
      profile_widgets: {
        Row: {
          id: string
          character_id: string
          widget_type: string
          title: string | null
          config: Json
          x: number
          y: number
          width: number
          height: number
          z_index: number
          is_visible: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          character_id: string
          widget_type: string
          title?: string | null
          config?: Json
          x?: number
          y?: number
          width?: number
          height?: number
          z_index?: number
          is_visible?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profile_widgets']['Insert']>
        Relationships: []
      }
      profile_theme_presets: {
        Row: {
          id: string
          account_id: string
          source_character_id: string | null
          name: string
          theme: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          source_character_id?: string | null
          name: string
          theme?: Json
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profile_theme_presets']['Insert']>
        Relationships: []
      }
      published_character_profiles: {
        Row: {
          character_id: string
          avatar_path: string | null
          banner_path: string | null
          bio: string | null
          custom_status: string | null
          display_name: string | null
          handle: string | null
          school_role: string | null
          pronouns: string | null
          profile_visibility: string
          guestbook_visibility: string
          theme: Json
          published_at: string
        }
        Insert: {
          character_id: string
          avatar_path?: string | null
          banner_path?: string | null
          bio?: string | null
          custom_status?: string | null
          display_name?: string | null
          handle?: string | null
          school_role?: string | null
          pronouns?: string | null
          profile_visibility: string
          guestbook_visibility: string
          theme?: Json
          published_at?: string
        }
        Update: Partial<Database['public']['Tables']['published_character_profiles']['Insert']>
        Relationships: []
      }
      published_profile_widgets: {
        Row: {
          id: string
          character_id: string
          widget_type: string
          title: string | null
          config: Json
          x: number
          y: number
          width: number
          height: number
          z_index: number
          published_at: string
        }
        Insert: {
          id: string
          character_id: string
          widget_type: string
          title?: string | null
          config?: Json
          x: number
          y: number
          width: number
          height: number
          z_index?: number
          published_at?: string
        }
        Update: Partial<Database['public']['Tables']['published_profile_widgets']['Insert']>
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
        Update: Partial<Database['public']['Tables']['student_applications']['Insert']>
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
        Update: Partial<Database['public']['Tables']['application_reviews']['Insert']>
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
        Update: Partial<Database['public']['Tables']['character_orientations']['Insert']>
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
        Update: Partial<Database['public']['Tables']['character_orientation_tasks']['Insert']>
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
        Update: Partial<Database['public']['Tables']['student_status_actions']['Insert']>
        Relationships: []
      }
      notifications: {
        Row: {
          account_id: string
          actor_character_id: string | null
          body: string
          character_id: string | null
          created_at: string
          id: string
          kind: string
          metadata: Json
          read_at: string | null
          section: string | null
          subsection: string | null
          title: string
        }
        Insert: {
          account_id: string
          title: string
          actor_character_id?: string | null
          body?: string
          character_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json
          read_at?: string | null
          section?: string | null
          subsection?: string | null
        }
        Update: { read_at?: string | null }
        Relationships: []
      }
      search_documents: {
        Row: {
          body: string
          created_at: string
          document_type: string
          entity_id: string | null
          id: string
          owner_account_id: string | null
          owner_character_id: string | null
          search_vector: unknown
          section: string
          source_key: string
          subsection: string | null
          subtitle: string | null
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          document_type: string
          section: string
          source_key: string
          title: string
          body?: string
          created_at?: string
          entity_id?: string | null
          id?: string
          owner_account_id?: string | null
          owner_character_id?: string | null
          subsection?: string | null
          subtitle?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: Partial<Database['public']['Tables']['search_documents']['Insert']>
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
      publish_character_profile: {
        Args: { p_character_id: string }
        Returns: string
      }
      search_hanami: {
        Args: { p_query: string; p_limit?: number }
        Returns: {
          id: string
          document_type: string
          entity_id: string | null
          title: string
          subtitle: string | null
          section: string
          subsection: string | null
          rank: number
        }[]
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
export type CharacterProfile = Database['public']['Tables']['character_profiles']['Row']
export type ProfileWidget = Database['public']['Tables']['profile_widgets']['Row']
export type ProfileThemePreset = Database['public']['Tables']['profile_theme_presets']['Row']
export type PublishedCharacterProfile = Database['public']['Tables']['published_character_profiles']['Row']
export type PublishedProfileWidget = Database['public']['Tables']['published_profile_widgets']['Row']
export type StudentApplication = Database['public']['Tables']['student_applications']['Row']
export type StudentApplicationUpdate = Database['public']['Tables']['student_applications']['Update']
export type ApplicationReview = Database['public']['Tables']['application_reviews']['Row']
export type CharacterOrientation = Database['public']['Tables']['character_orientations']['Row']
export type CharacterOrientationTask = Database['public']['Tables']['character_orientation_tasks']['Row']
export type StudentStatusAction = Database['public']['Tables']['student_status_actions']['Row']
export type HanamiNotification = Database['public']['Tables']['notifications']['Row']
export type SearchDocument = Database['public']['Tables']['search_documents']['Row']
export type HanamiSearchResult = Database['public']['Functions']['search_hanami']['Returns'][number]

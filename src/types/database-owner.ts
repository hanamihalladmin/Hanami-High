import type { HanamiCompleteDatabase } from './database-settings'

export type OwnerAccountRow = {
  account_id: string
  discord_username: string | null
  account_state: string
  active_character_id: string | null
  character_count: number
  platform_roles: string[]
  created_at: string
}

export type OwnerCharacterRow = {
  character_id: string
  account_id: string
  discord_username: string | null
  slot_no: number
  display_name: string | null
  first_name: string | null
  last_name: string | null
  handle: string | null
  character_kind: string
  character_state: string
  school_role: string | null
  orientation_completed_at: string | null
  promoted_to_student_at: string | null
  created_at: string
}

export type OwnerAuditRow = {
  id: number
  actor_account_id: string | null
  actor_character_id: string | null
  action: string
  target_type: string
  target_id: string
  metadata: Record<string, unknown>
  created_at: string
}

export type OwnerPortalSnapshot = {
  character: { id: string; name: string; kind: string; role: string | null; state: string; slot: number }
  account: { id: string; discord_username: string | null; state: string }
  academics: { sections: Array<{ id: string; section_code: string; course: string; course_code: string; room: string | null }>; graded_assignments: number; attendance_records: number }
  social: { friends: number; posts: number }
  campus: { groups: Array<{ name: string; type: string; role: string }> }
  economy: { petals: number }
}

type OwnerFunctions = {
  owner_console_accounts: { Args: Record<PropertyKey, never>; Returns: OwnerAccountRow[] }
  owner_console_characters: { Args: Record<PropertyKey, never>; Returns: OwnerCharacterRow[] }
  owner_console_audit: { Args: { p_limit?: number }; Returns: OwnerAuditRow[] }
  owner_set_account_state: { Args: { p_account_id: string; p_state: string }; Returns: boolean }
  owner_set_character_state: { Args: { p_character_id: string; p_state: string }; Returns: boolean }
  owner_set_platform_role: { Args: { p_account_id: string; p_role_code: string; p_enabled: boolean }; Returns: boolean }
  owner_portal_snapshot: { Args: { p_character_id: string }; Returns: OwnerPortalSnapshot }
}

export type HanamiOwnerDatabase = Omit<HanamiCompleteDatabase, 'public'> & {
  public: Omit<HanamiCompleteDatabase['public'], 'Functions'> & {
    Tables: HanamiCompleteDatabase['public']['Tables']
    Functions: HanamiCompleteDatabase['public']['Functions'] & OwnerFunctions
  }
}

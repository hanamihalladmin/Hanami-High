import type { HanamiOwnerDatabase } from './database-owner'

type RowTable<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type SiteConfigurationRow = {
  key: string
  value: Record<string, unknown>
  description: string | null
  updated_by_account_id: string | null
  updated_at: string
}

export type ModerationReportRow = {
  id: string
  reporter_character_id: string
  target_character_id: string | null
  target_type: string
  target_id: string | null
  reason: string
  details: string | null
  status: string
  resolution_note: string | null
  reviewed_by_account_id: string | null
  created_at: string
  updated_at: string
}

export type OwnerEconomyRow = {
  account_id: string
  discord_username: string | null
  balance: number
  lifetime_earned: number
  lifetime_spent: number
  hanami_plus_ends_at: string | null
}

type PlatformTables = {
  site_configuration: RowTable<
    SiteConfigurationRow,
    Pick<SiteConfigurationRow, 'key' | 'value'> & Partial<Omit<SiteConfigurationRow, 'key' | 'value'>>,
    Partial<SiteConfigurationRow>
  >
  moderation_reports: RowTable<
    ModerationReportRow,
    Pick<ModerationReportRow, 'reporter_character_id' | 'target_type' | 'reason'> & Partial<Omit<ModerationReportRow, 'reporter_character_id' | 'target_type' | 'reason'>>,
    Partial<ModerationReportRow>
  >
}

type PlatformFunctions = {
  owner_console_economy: { Args: Record<PropertyKey, never>; Returns: OwnerEconomyRow[] }
  owner_adjust_petals: { Args: { p_account_id: string; p_amount: number; p_note: string; p_request_id: string }; Returns: boolean }
  owner_grant_hanami_plus: { Args: { p_account_id: string; p_days: number; p_note: string }; Returns: string }
  owner_set_teacher_status: { Args: { p_character_id: string; p_enabled: boolean }; Returns: boolean }
}

export type HanamiPlatformDatabase = Omit<HanamiOwnerDatabase, 'public'> & {
  public: Omit<HanamiOwnerDatabase['public'], 'Tables' | 'Functions'> & {
    Tables: HanamiOwnerDatabase['public']['Tables'] & PlatformTables
    Functions: HanamiOwnerDatabase['public']['Functions'] & PlatformFunctions
  }
}

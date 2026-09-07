import type { HanamiRewardsDatabase } from './database-rewards'

type RowTable<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type AccountPreferences = {
  account_id: string
  notify_messages: boolean
  notify_social: boolean
  notify_school: boolean
  reduced_motion: boolean
  compact_mode: boolean
  high_contrast: boolean
  font_scale: number
  dm_policy: string
  friend_request_policy: string
  show_online_status: boolean
  site_theme: string
  created_at: string
  updated_at: string
}

export type CharacterPreferences = {
  character_id: string
  account_id: string
  default_post_visibility: string
  allow_profile_comments: boolean
  allow_guestbook: boolean
  show_school_role: boolean
  show_activity_status: boolean
  created_at: string
  updated_at: string
}

type SettingsTables = {
  account_preferences: RowTable<AccountPreferences, Pick<AccountPreferences, 'account_id'> & Partial<Omit<AccountPreferences, 'account_id'>>, Partial<AccountPreferences>>
  character_preferences: RowTable<CharacterPreferences, Pick<CharacterPreferences, 'character_id' | 'account_id'> & Partial<Omit<CharacterPreferences, 'character_id' | 'account_id'>>, Partial<CharacterPreferences>>
}

export type HanamiCompleteDatabase = Omit<HanamiRewardsDatabase, 'public'> & {
  public: Omit<HanamiRewardsDatabase['public'], 'Tables'> & {
    Tables: HanamiRewardsDatabase['public']['Tables'] & SettingsTables
    Functions: HanamiRewardsDatabase['public']['Functions']
  }
}

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
  custom_theme_enabled: boolean
  custom_theme_ink: string | null
  custom_theme_soft: string | null
  custom_theme_paper: string | null
  custom_theme_surface: string | null
  custom_theme_border: string | null
  custom_theme_accent: string | null
  custom_theme_text: string | null
  custom_theme_text_secondary: string | null
  custom_theme_link: string | null
  created_at: string
  updated_at: string
}

export type AccountSiteThemePreset = {
  id: string
  account_id: string
  name: string
  ink: string
  soft: string
  paper: string
  surface: string
  border: string
  accent: string
  text_primary: string
  text_secondary: string
  link: string
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
  account_site_theme_presets: RowTable<AccountSiteThemePreset, Pick<AccountSiteThemePreset, 'account_id' | 'name' | 'ink' | 'soft' | 'paper' | 'surface' | 'border' | 'accent' | 'text_primary' | 'text_secondary' | 'link'> & Partial<Pick<AccountSiteThemePreset, 'id' | 'created_at' | 'updated_at'>>, Partial<AccountSiteThemePreset>>
  character_preferences: RowTable<CharacterPreferences, Pick<CharacterPreferences, 'character_id' | 'account_id'> & Partial<Omit<CharacterPreferences, 'character_id' | 'account_id'>>, Partial<CharacterPreferences>>
}

type SettingsFunctions = {
  set_my_custom_site_theme: { Args: { p_enabled: boolean; p_ink?: string | null; p_soft?: string | null; p_paper?: string | null; p_accent?: string | null }; Returns: boolean }
  set_my_custom_site_theme_v2: { Args: { p_enabled: boolean; p_ink?: string | null; p_soft?: string | null; p_paper?: string | null; p_surface?: string | null; p_border?: string | null; p_accent?: string | null; p_text?: string | null; p_text_secondary?: string | null; p_link?: string | null }; Returns: boolean }
}

export type HanamiCompleteDatabase = Omit<HanamiRewardsDatabase, 'public'> & {
  public: Omit<HanamiRewardsDatabase['public'], 'Tables' | 'Functions'> & {
    Tables: HanamiRewardsDatabase['public']['Tables'] & SettingsTables
    Functions: HanamiRewardsDatabase['public']['Functions'] & SettingsFunctions
  }
}

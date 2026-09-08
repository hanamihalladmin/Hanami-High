import type { Json } from './database'
import type { HanamiCreatorMarketplaceDatabase } from './database-creator-marketplace'

type RowTable<Row, Insert = Partial<Row>, Update = Partial<Row>> = { Row: Row; Insert: Insert; Update: Update; Relationships: [] }

export type CharacterDashboardCustomization = {
  character_id: string
  layout_style: 'classic' | 'balanced' | 'focus' | 'social' | 'compact'
  theme_key: 'hanami-classic' | 'sage-study' | 'navy-night' | 'rose-notebook' | 'ivory-campus' | 'pixel-2006'
  wallpaper_url: string | null
  widget_visibility: Json
  quick_links: Json
  updated_at: string
  created_at: string
}

export type CharacterMessageCustomization = {
  character_id: string
  bubble_style: 'classic' | 'soft' | 'compact' | 'notebook' | 'pixel' | 'rounded-card'
  message_font: 'system' | 'serif' | 'mono' | 'rounded' | 'handwritten'
  accent_key: 'rose' | 'sage' | 'navy' | 'ivory' | 'lavender' | 'bluebell'
  dm_background_url: string | null
  timestamp_style: 'compact' | 'full' | 'minimal' | 'hidden'
  message_effect: 'none' | 'soft-fade' | 'sparkle-arrival' | 'slide-in'
  updated_at: string
  created_at: string
}

export type ConversationMemberOrganization = {
  conversation_id: string
  character_id: string
  folder_name: string | null
  pinned: boolean
  muted: boolean
  archived: boolean
  updated_at: string
  created_at: string
}

export type AccountNotificationProfile = {
  id: string
  account_id: string
  profile_name: string
  notify_messages: boolean
  notify_social: boolean
  notify_school: boolean
  profile_kind: 'custom' | 'focus' | 'social' | 'school' | 'quiet'
  created_at: string
  updated_at: string
}

type Tables = {
  character_dashboard_customization: RowTable<CharacterDashboardCustomization, Pick<CharacterDashboardCustomization,'character_id'> & Partial<Omit<CharacterDashboardCustomization,'character_id'|'created_at'|'updated_at'>>, Partial<CharacterDashboardCustomization>>
  character_message_customization: RowTable<CharacterMessageCustomization, Pick<CharacterMessageCustomization,'character_id'> & Partial<Omit<CharacterMessageCustomization,'character_id'|'created_at'|'updated_at'>>, Partial<CharacterMessageCustomization>>
  conversation_member_organization: RowTable<ConversationMemberOrganization, Pick<ConversationMemberOrganization,'conversation_id'|'character_id'> & Partial<Omit<ConversationMemberOrganization,'conversation_id'|'character_id'|'created_at'|'updated_at'>>, Partial<ConversationMemberOrganization>>
  account_notification_profiles: RowTable<AccountNotificationProfile, Pick<AccountNotificationProfile,'account_id'|'profile_name'> & Partial<Omit<AccountNotificationProfile,'id'|'account_id'|'profile_name'|'created_at'|'updated_at'>>, Partial<AccountNotificationProfile>>
}

type Functions = {
  ensure_my_plus_interface_customization: { Args: { p_character_id: string }; Returns: boolean }
  apply_notification_profile: { Args: { p_profile_id: string }; Returns: boolean }
}

export type HanamiDashboardMessagingDatabase = Omit<HanamiCreatorMarketplaceDatabase,'public'> & {
  public: Omit<HanamiCreatorMarketplaceDatabase['public'],'Tables'|'Functions'> & {
    Tables: HanamiCreatorMarketplaceDatabase['public']['Tables'] & Tables
    Functions: HanamiCreatorMarketplaceDatabase['public']['Functions'] & Functions
  }
}

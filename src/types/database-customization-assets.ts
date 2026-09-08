import type { HanamiLockscreenDatabase } from './database-lockscreen'

type RowTable<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type CustomizationAssetType = 'font' | 'tag_style' | 'sticker' | 'emoji' | 'divider' | 'icon' | 'font_effect' | 'decorative_accent'
export type CustomizationAssetAccessKind = 'standard' | 'hanami_plus' | 'boutique' | 'event' | 'loyalty' | 'creator'

export type CustomizationAsset = {
  id: string
  slug: string
  name: string
  description: string
  asset_type: CustomizationAssetType
  collection_name: string
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'special' | 'seasonal' | 'hanami_plus' | 'limited'
  access_kind: CustomizationAssetAccessKind
  boutique_item_id: string | null
  animated: boolean
  asset_payload: Record<string, unknown>
  state: 'draft' | 'published' | 'hidden' | 'retired'
  sort_order: number
  created_at: string
  updated_at: string
}

export type AccountCustomizationAssetGrant = {
  account_id: string
  asset_id: string
  source_kind: 'event' | 'achievement' | 'owner' | 'promo' | 'creator' | 'loyalty' | 'migration'
  source_reference: string | null
  granted_at: string
  expires_at: string | null
  metadata: Record<string, unknown>
}

export type AccountCustomizationAssetFavorite = {
  account_id: string
  asset_id: string
  created_at: string
}

export type CharacterCustomTag = {
  id: string
  character_id: string
  account_id: string
  label: string
  style_asset_id: string | null
  font_asset_id: string | null
  left_accent_asset_id: string | null
  right_accent_asset_id: string | null
  shape: 'pill' | 'ribbon' | 'plaque' | 'bubble' | 'lace' | 'heart' | 'label'
  fill_mode: 'solid' | 'gradient' | 'transparent'
  background_color: string
  background_color_2: string
  text_color: string
  border_color: string
  glow_color: string | null
  text_shadow: boolean
  glow_enabled: boolean
  outline_enabled: boolean
  motion_style: 'none' | 'shimmer' | 'sparkle' | 'pulse' | 'float'
  visible: boolean
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type CharacterFontPreferences = {
  character_id: string
  account_id: string
  display_name_font_asset_id: string | null
  tag_font_asset_id: string | null
  profile_heading_font_asset_id: string | null
  profile_body_font_asset_id: string | null
  blog_font_asset_id: string | null
  updated_at: string
  created_at: string
}

export type AccountFontPreferences = {
  account_id: string
  sitewide_enabled: boolean
  ui_body_font_asset_id: string | null
  ui_heading_font_asset_id: string | null
  ui_display_font_asset_id: string | null
  updated_at: string
  created_at: string
}

export type CustomizationAssetAccessRow = {
  asset_id: string
  slug: string
  name: string
  description: string
  asset_type: CustomizationAssetType
  collection_name: string
  rarity: string
  access_kind: CustomizationAssetAccessKind
  animated: boolean
  asset_payload: Record<string, unknown>
  can_use: boolean
  is_favorite: boolean
}

type CustomizationTables = {
  customization_assets: RowTable<CustomizationAsset>
  account_customization_asset_grants: RowTable<AccountCustomizationAssetGrant>
  account_customization_asset_favorites: RowTable<AccountCustomizationAssetFavorite>
  character_custom_tags: RowTable<CharacterCustomTag>
  character_font_preferences: RowTable<CharacterFontPreferences>
  account_font_preferences: RowTable<AccountFontPreferences>
}

type CustomizationFunctions = {
  my_customization_asset_access: { Args: { p_asset_type?: string | null }; Returns: CustomizationAssetAccessRow[] }
  ensure_my_customization_foundation: { Args: { p_character_id: string }; Returns: boolean }
  set_my_character_custom_tag_active: { Args: { p_tag_id: string }; Returns: boolean }
  add_my_customization_asset_to_profile: { Args: { p_asset_id: string }; Returns: string }
  add_my_customization_asset_to_space: { Args: { p_asset_id: string; p_space_kind: string }; Returns: string }
}

export type HanamiCustomizationAssetsDatabase = Omit<HanamiLockscreenDatabase, 'public'> & {
  public: Omit<HanamiLockscreenDatabase['public'], 'Tables' | 'Functions'> & {
    Tables: HanamiLockscreenDatabase['public']['Tables'] & CustomizationTables
    Functions: HanamiLockscreenDatabase['public']['Functions'] & CustomizationFunctions
  }
}

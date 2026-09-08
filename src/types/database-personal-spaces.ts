import type { Json } from './database'
import type { HanamiPlusDatabase } from './database-hanami-plus'

type RowTable<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type PersonalSpaceKind = 'locker' | 'desk' | 'phone' | 'desktop'

export type CharacterPersonalSpace = {
  character_id: string
  space_kind: PersonalSpaceKind
  visibility: 'private' | 'friends' | 'public'
  title: string | null
  theme_key: string | null
  wallpaper_url: string | null
  settings: Json
  updated_at: string
  created_at: string
}

export type CharacterSpaceItem = {
  id: string
  character_id: string
  space_kind: PersonalSpaceKind
  item_kind: string
  label: string | null
  body: string | null
  asset_url: string | null
  linked_character_id: string | null
  target_route: string | null
  position_x: number
  position_y: number
  width_pct: number
  height_pct: number
  rotation_deg: number
  z_index: number
  metadata: Json
  created_at: string
  updated_at: string
}

type PersonalSpaceTables = {
  character_personal_spaces: RowTable<
    CharacterPersonalSpace,
    Pick<CharacterPersonalSpace, 'character_id' | 'space_kind'> & Partial<Omit<CharacterPersonalSpace, 'character_id' | 'space_kind' | 'created_at' | 'updated_at'>>,
    Partial<Omit<CharacterPersonalSpace, 'character_id' | 'space_kind' | 'created_at'>>
  >
  character_space_items: RowTable<
    CharacterSpaceItem,
    Pick<CharacterSpaceItem, 'character_id' | 'space_kind' | 'item_kind'> & Partial<Omit<CharacterSpaceItem, 'id' | 'character_id' | 'space_kind' | 'item_kind' | 'created_at' | 'updated_at'>>,
    Partial<Omit<CharacterSpaceItem, 'id' | 'character_id' | 'created_at'>>
  >
}

type PersonalSpaceFunctions = {
  ensure_my_character_personal_spaces: { Args: { p_character_id: string }; Returns: number }
}

export type HanamiPersonalSpacesDatabase = Omit<HanamiPlusDatabase, 'public'> & {
  public: Omit<HanamiPlusDatabase['public'], 'Tables' | 'Functions'> & {
    Tables: HanamiPlusDatabase['public']['Tables'] & PersonalSpaceTables
    Functions: HanamiPlusDatabase['public']['Functions'] & PersonalSpaceFunctions
  }
}

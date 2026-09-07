import type { Json } from './database'
import type { HanamiPlatformDatabase } from './database-platform'

type RowTable<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type BoutiqueWishlistRow = {
  account_id: string
  item_id: string
  created_at: string
}

export type CharacterCosmeticLoadout = {
  character_id: string
  account_id: string
  avatar_decoration_item_id: string | null
  frame_item_id: string | null
  effect_item_id: string | null
  nameplate_item_id: string | null
  profile_card_item_id: string | null
  background_pack_item_id: string | null
  updated_at: string
}

type BasePublished = HanamiPlatformDatabase['public']['Tables']['published_character_profiles']['Row']
type BasePublishedInsert = HanamiPlatformDatabase['public']['Tables']['published_character_profiles']['Insert']
type BasePublishedUpdate = HanamiPlatformDatabase['public']['Tables']['published_character_profiles']['Update']

export type PublishedCharacterProfileWithCosmetics = BasePublished & { cosmetics: Json }

type CustomizationTables = {
  boutique_wishlist: RowTable<
    BoutiqueWishlistRow,
    Pick<BoutiqueWishlistRow, 'account_id' | 'item_id'> & Partial<Pick<BoutiqueWishlistRow, 'created_at'>>,
    Partial<BoutiqueWishlistRow>
  >
  character_cosmetic_loadouts: RowTable<
    CharacterCosmeticLoadout,
    Pick<CharacterCosmeticLoadout, 'character_id' | 'account_id'> & Partial<Omit<CharacterCosmeticLoadout, 'character_id' | 'account_id'>>,
    Partial<CharacterCosmeticLoadout>
  >
  published_character_profiles: {
    Row: PublishedCharacterProfileWithCosmetics
    Insert: BasePublishedInsert & { cosmetics?: Json }
    Update: BasePublishedUpdate & { cosmetics?: Json }
    Relationships: []
  }
}

export type HanamiCustomizationDatabase = Omit<HanamiPlatformDatabase, 'public'> & {
  public: Omit<HanamiPlatformDatabase['public'], 'Tables'> & {
    Tables: Omit<HanamiPlatformDatabase['public']['Tables'], 'published_character_profiles'> & CustomizationTables
    Functions: HanamiPlatformDatabase['public']['Functions']
  }
}

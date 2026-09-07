import type { HanamiAppDatabase } from './database-home'

type RowTable<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type PetalWallet = {
  account_id: string
  balance: number
  lifetime_earned: number
  lifetime_spent: number
  created_at: string
  updated_at: string
}

export type PetalLedgerEntry = {
  id: string
  account_id: string
  character_id: string | null
  amount: number
  source_kind: string
  description: string
  reference_key: string
  created_by_character_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export type BoutiqueItem = {
  id: string
  slug: string
  name: string
  description: string
  item_type: string
  collection_name: string | null
  season: string
  rarity: string
  price_petals: number
  state: string
  featured: boolean
  is_new: boolean
  pass_days: number | null
  preview_token: string | null
  created_at: string
  updated_at: string
}

export type InventoryItem = {
  account_id: string
  item_id: string
  quantity: number
  acquired_at: string
  updated_at: string
}

export type HanamiPlusEntitlement = {
  account_id: string
  starts_at: string
  ends_at: string
  source_item_id: string | null
  updated_at: string
}

export type RoleplaySession = {
  id: string
  title: string
  description: string | null
  school_date: string
  status: string
  petal_reward: number
  created_by_character_id: string | null
  created_at: string
  closed_at: string | null
  updated_at: string
}

export type RoleplaySessionParticipant = {
  session_id: string
  character_id: string
  joined_at: string
}

export type AchievementDefinition = {
  id: string
  code: string
  name: string
  description: string
  category: string
  collection_name: string
  criteria_type: string
  threshold: number
  petal_reward: number
  hidden: boolean
  active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type CharacterAchievement = {
  character_id: string
  achievement_id: string
  unlocked_at: string
  progress_value: number
}

type RewardTables = {
  petal_wallets: RowTable<PetalWallet, Pick<PetalWallet, 'account_id'> & Partial<Omit<PetalWallet, 'account_id'>>, Partial<PetalWallet>>
  petal_ledger: RowTable<PetalLedgerEntry, Pick<PetalLedgerEntry, 'account_id' | 'amount' | 'source_kind' | 'description' | 'reference_key'> & Partial<Omit<PetalLedgerEntry, 'account_id' | 'amount' | 'source_kind' | 'description' | 'reference_key'>>, Partial<PetalLedgerEntry>>
  boutique_items: RowTable<BoutiqueItem, Pick<BoutiqueItem, 'slug' | 'name' | 'description' | 'item_type' | 'price_petals'> & Partial<Omit<BoutiqueItem, 'slug' | 'name' | 'description' | 'item_type' | 'price_petals'>>, Partial<BoutiqueItem>>
  inventory_items: RowTable<InventoryItem, Pick<InventoryItem, 'account_id' | 'item_id'> & Partial<Omit<InventoryItem, 'account_id' | 'item_id'>>, Partial<InventoryItem>>
  hanami_plus_entitlements: RowTable<HanamiPlusEntitlement, Pick<HanamiPlusEntitlement, 'account_id' | 'starts_at' | 'ends_at'> & Partial<Omit<HanamiPlusEntitlement, 'account_id' | 'starts_at' | 'ends_at'>>, Partial<HanamiPlusEntitlement>>
  roleplay_sessions: RowTable<RoleplaySession, Pick<RoleplaySession, 'title' | 'school_date' | 'created_by_character_id'> & Partial<Omit<RoleplaySession, 'title' | 'school_date' | 'created_by_character_id'>>, Partial<RoleplaySession>>
  roleplay_session_participants: RowTable<RoleplaySessionParticipant, Pick<RoleplaySessionParticipant, 'session_id' | 'character_id'> & Partial<Omit<RoleplaySessionParticipant, 'session_id' | 'character_id'>>, Partial<RoleplaySessionParticipant>>
  achievement_definitions: RowTable<AchievementDefinition, Pick<AchievementDefinition, 'code' | 'name' | 'description' | 'category' | 'criteria_type' | 'threshold'> & Partial<Omit<AchievementDefinition, 'code' | 'name' | 'description' | 'category' | 'criteria_type' | 'threshold'>>, Partial<AchievementDefinition>>
  character_achievements: RowTable<CharacterAchievement, Pick<CharacterAchievement, 'character_id' | 'achievement_id'> & Partial<Omit<CharacterAchievement, 'character_id' | 'achievement_id'>>, Partial<CharacterAchievement>>
}

type RewardFunctions = {
  claim_daily_petals: { Args: Record<PropertyKey, never>; Returns: { balance: number; awarded: number }[] }
  play_petal_garden: { Args: Record<PropertyKey, never>; Returns: { balance: number; awarded: number }[] }
  grant_petals_to_character: { Args: { p_character_id: string; p_amount: number; p_note: string; p_request_id: string }; Returns: boolean }
  purchase_boutique_item: { Args: { p_item_id: string; p_request_id: string }; Returns: { balance: number; item_id: string; quantity: number }[] }
  close_roleplay_session: { Args: { p_session_id: string }; Returns: number }
  sync_my_achievements: { Args: Record<PropertyKey, never>; Returns: number }
}

export type HanamiRewardsDatabase = Omit<HanamiAppDatabase, 'public'> & {
  public: Omit<HanamiAppDatabase['public'], 'Tables' | 'Functions'> & {
    Tables: HanamiAppDatabase['public']['Tables'] & RewardTables
    Functions: HanamiAppDatabase['public']['Functions'] & RewardFunctions
  }
}

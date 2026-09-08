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

export type HanamiPlusAccountProgress = {
  account_id: string
  lifetime_plus_days: number
  creative_xp: number
  profile_level: number
  last_plus_started_at: string | null
  last_plus_ended_at: string | null
  updated_at: string
}

export type HanamiPlusRewardHistoryRow = {
  id: string
  account_id: string
  reward_kind: string
  title: string
  description: string | null
  plus_days: number | null
  boutique_item_id: string | null
  metadata: Record<string, unknown>
  occurred_at: string
}

export type HanamiPlusGiftRow = {
  id: string
  sender_account_id: string | null
  recipient_account_id: string
  plus_days: number | null
  boutique_item_id: string | null
  gift_message: string | null
  anonymous_to_recipient: boolean
  status: string
  scheduled_for: string | null
  delivered_at: string | null
  opened_at: string | null
  created_at: string
}

export type HanamiPlusCalendarEvent = {
  id: string
  event_key: string
  title: string
  description: string | null
  event_kind: string
  starts_at: string
  ends_at: string | null
  plus_only: boolean
  published: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type HanamiPlusMonthlyClaim = {
  account_id: string
  claim_month: string
  boutique_item_id: string | null
  claimed_at: string
}

export type HanamiPlusDropOffer = {
  id: string
  offer_key: string
  title: string
  description: string | null
  starts_at: string
  ends_at: string
  published: boolean
  created_at: string
  updated_at: string
}

export type HanamiPlusDropOfferItem = {
  offer_id: string
  boutique_item_id: string
  sort_order: number
}

export type HanamiPlusDropChoice = {
  offer_id: string
  account_id: string
  boutique_item_id: string
  chosen_at: string
}

export type HanamiPlusLoyaltyCatalogRow = {
  boutique_item_id: string
  minimum_lifetime_days: number
  price_petals: number
  state: string
  sort_order: number
  created_at: string
  updated_at: string
}

export type HanamiPlusBetaFeature = {
  feature_key: string
  label: string
  description: string
  state: string
  starts_at: string | null
  ends_at: string | null
  created_at: string
  updated_at: string
}

export type HanamiPlusBetaPreference = {
  account_id: string
  feature_key: string
  opted_in: boolean
  updated_at: string
}

export type HanamiPlusHubSnapshot = {
  active: boolean
  starts_at: string | null
  ends_at: string | null
  days_remaining: number
  lifetime_plus_days: number
  creative_xp: number
  profile_level: number
  petal_balance: number
  monthly_claimed: boolean
  beta_opt_in_count: number
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
  hanami_plus_account_progress: RowTable<HanamiPlusAccountProgress, Pick<HanamiPlusAccountProgress, 'account_id'> & Partial<Omit<HanamiPlusAccountProgress, 'account_id' | 'profile_level'>>, Partial<Omit<HanamiPlusAccountProgress, 'profile_level'>>>
  hanami_plus_reward_history: RowTable<HanamiPlusRewardHistoryRow, Pick<HanamiPlusRewardHistoryRow, 'account_id' | 'reward_kind' | 'title'> & Partial<Omit<HanamiPlusRewardHistoryRow, 'id' | 'account_id' | 'reward_kind' | 'title'>>, Partial<HanamiPlusRewardHistoryRow>>
  hanami_plus_gifts: RowTable<HanamiPlusGiftRow, Pick<HanamiPlusGiftRow, 'recipient_account_id'> & Partial<Omit<HanamiPlusGiftRow, 'id' | 'recipient_account_id'>>, Partial<HanamiPlusGiftRow>>
  hanami_plus_calendar_events: RowTable<HanamiPlusCalendarEvent, Pick<HanamiPlusCalendarEvent, 'event_key' | 'title' | 'event_kind' | 'starts_at'> & Partial<Omit<HanamiPlusCalendarEvent, 'id' | 'event_key' | 'title' | 'event_kind' | 'starts_at'>>, Partial<HanamiPlusCalendarEvent>>
  hanami_plus_monthly_claims: RowTable<HanamiPlusMonthlyClaim, Pick<HanamiPlusMonthlyClaim, 'account_id' | 'claim_month'> & Partial<Omit<HanamiPlusMonthlyClaim, 'account_id' | 'claim_month'>>, Partial<HanamiPlusMonthlyClaim>>
  hanami_plus_drop_offers: RowTable<HanamiPlusDropOffer, Pick<HanamiPlusDropOffer, 'offer_key' | 'title' | 'starts_at' | 'ends_at'> & Partial<Omit<HanamiPlusDropOffer, 'id' | 'offer_key' | 'title' | 'starts_at' | 'ends_at'>>, Partial<HanamiPlusDropOffer>>
  hanami_plus_drop_offer_items: RowTable<HanamiPlusDropOfferItem, Pick<HanamiPlusDropOfferItem, 'offer_id' | 'boutique_item_id'> & Partial<Pick<HanamiPlusDropOfferItem, 'sort_order'>>, Partial<HanamiPlusDropOfferItem>>
  hanami_plus_drop_choices: RowTable<HanamiPlusDropChoice, Pick<HanamiPlusDropChoice, 'offer_id' | 'account_id' | 'boutique_item_id'> & Partial<Pick<HanamiPlusDropChoice, 'chosen_at'>>, Partial<HanamiPlusDropChoice>>
  hanami_plus_loyalty_catalog: RowTable<HanamiPlusLoyaltyCatalogRow, Pick<HanamiPlusLoyaltyCatalogRow, 'boutique_item_id' | 'price_petals'> & Partial<Omit<HanamiPlusLoyaltyCatalogRow, 'boutique_item_id' | 'price_petals'>>, Partial<HanamiPlusLoyaltyCatalogRow>>
  hanami_plus_beta_features: RowTable<HanamiPlusBetaFeature, Pick<HanamiPlusBetaFeature, 'feature_key' | 'label' | 'description'> & Partial<Omit<HanamiPlusBetaFeature, 'feature_key' | 'label' | 'description'>>, Partial<HanamiPlusBetaFeature>>
  hanami_plus_beta_preferences: RowTable<HanamiPlusBetaPreference, Pick<HanamiPlusBetaPreference, 'account_id' | 'feature_key'> & Partial<Omit<HanamiPlusBetaPreference, 'account_id' | 'feature_key'>>, Partial<HanamiPlusBetaPreference>>
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
  current_hanami_plus_hub: { Args: Record<PropertyKey, never>; Returns: HanamiPlusHubSnapshot[] }
  set_hanami_plus_beta_preference: { Args: { p_feature_key: string; p_opted_in: boolean }; Returns: boolean }
}

export type HanamiRewardsDatabase = Omit<HanamiAppDatabase, 'public'> & {
  public: Omit<HanamiAppDatabase['public'], 'Tables' | 'Functions'> & {
    Tables: HanamiAppDatabase['public']['Tables'] & RewardTables
    Functions: HanamiAppDatabase['public']['Functions'] & RewardFunctions
  }
}

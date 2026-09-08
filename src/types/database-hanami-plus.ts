import type { HanamiAcademicRoomDatabase } from './database-academic-rooms'

type RowTable<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type HanamiPlusMonthlyReward = {
  claim_month: string
  boutique_item_id: string
  published: boolean
  created_at: string
  updated_at: string
}

type HanamiPlusTables = {
  hanami_plus_monthly_rewards: RowTable<
    HanamiPlusMonthlyReward,
    Pick<HanamiPlusMonthlyReward, 'claim_month' | 'boutique_item_id'> & Partial<Omit<HanamiPlusMonthlyReward, 'claim_month' | 'boutique_item_id'>>,
    Partial<HanamiPlusMonthlyReward>
  >
}

type HanamiPlusFunctions = {
  claim_hanami_plus_monthly_reward: {
    Args: Record<PropertyKey, never>
    Returns: { item_id: string; item_name: string; claimed_at: string }[]
  }
  choose_hanami_plus_drop: {
    Args: { p_offer_id: string; p_item_id: string }
    Returns: { item_id: string; item_name: string; chosen_at: string }[]
  }
  purchase_hanami_plus_loyalty_item: {
    Args: { p_item_id: string; p_request_id: string }
    Returns: { balance: number; item_id: string; item_name: string }[]
  }
}

export type HanamiPlusDatabase = Omit<HanamiAcademicRoomDatabase, 'public'> & {
  public: Omit<HanamiAcademicRoomDatabase['public'], 'Tables' | 'Functions'> & {
    Tables: HanamiAcademicRoomDatabase['public']['Tables'] & HanamiPlusTables
    Functions: HanamiAcademicRoomDatabase['public']['Functions'] & HanamiPlusFunctions
  }
}

import type { Json } from './database'
import type { HanamiPersonalSpacesDatabase } from './database-personal-spaces'

type RowTable<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type CharacterProfileInteractivity = {
  character_id: string
  favicon_url: string | null
  profile_tab_title: string | null
  divider_style: string
  divider_animation: string
  scrollbar_skin: string
  tooltip_skin: string
  selection_color: string
  link_hover_effect: string
  button_effect: string
  button_sound_key: string | null
  mini_games: Json
  show_interaction_counters: boolean
  updated_at: string
  created_at: string
}

export type CharacterProfileInteractionCounter = {
  character_id: string
  interaction_kind: string
  total_count: number
  updated_at: string
}

type InteractiveProfileTables = {
  character_profile_interactivity: RowTable<
    CharacterProfileInteractivity,
    Pick<CharacterProfileInteractivity, 'character_id'> & Partial<Omit<CharacterProfileInteractivity, 'character_id' | 'created_at' | 'updated_at'>>,
    Partial<CharacterProfileInteractivity>
  >
  character_profile_interaction_counters: RowTable<
    CharacterProfileInteractionCounter,
    Pick<CharacterProfileInteractionCounter, 'character_id' | 'interaction_kind'> & Partial<Omit<CharacterProfileInteractionCounter, 'character_id' | 'interaction_kind'>>,
    Partial<CharacterProfileInteractionCounter>
  >
}

type InteractiveProfileFunctions = {
  ensure_my_profile_interactivity: { Args: { p_character_id: string }; Returns: boolean }
  record_profile_interaction: { Args: { p_target_character_id: string; p_interaction_kind: string }; Returns: number }
}

export type HanamiInteractiveProfileDatabase = Omit<HanamiPersonalSpacesDatabase, 'public'> & {
  public: Omit<HanamiPersonalSpacesDatabase['public'], 'Tables' | 'Functions'> & {
    Tables: HanamiPersonalSpacesDatabase['public']['Tables'] & InteractiveProfileTables
    Functions: HanamiPersonalSpacesDatabase['public']['Functions'] & InteractiveProfileFunctions
  }
}

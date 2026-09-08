import type { Json } from './database'
import type { HanamiProfileScenesDatabase } from './database-profile-scenes'

type RowTable<Row, Insert = Partial<Row>, Update = Partial<Row>> = { Row: Row; Insert: Insert; Update: Update; Relationships: [] }

export type CharacterAnimationSettings = {
  character_id:string
  active_preset_key:string
  page_entrance:'none'|'soft-fade'|'rise'|'slide'|'paper-open'|'pixel-load'|'petal-reveal'
  widget_reveal:'none'|'stagger-fade'|'rise'|'pop'|'slide'|'card-deal'|'pixel-load'
  scene_item_motion:'none'|'gentle-float'|'soft-bob'|'drift'|'sparkle-pulse'|'paper-wiggle'|'pixel-blink'
  ambient_effect:'none'|'petals'|'sparkles'|'stars'|'dust'|'bubbles'|'pixel-stars'
  route_transition:'none'|'crossfade'|'soft-slide'|'paper-turn'|'iris'|'pixel-wipe'
  hover_motion:'none'|'soft-lift'|'tilt'|'pop'|'glow-pulse'|'wiggle'
  click_motion:'none'|'press'|'bounce'|'spark'|'ripple'|'stamp'
  intensity:number
  duration_ms:number
  stagger_ms:number
  ambient_density:number
  profile_enabled:boolean
  scenes_enabled:boolean
  respect_reduced_motion:boolean
  updated_at:string
  created_at:string
}

export type CharacterAnimationPreset = {
  id:string
  character_id:string
  preset_name:string
  preset_key:string
  settings:Json
  sort_order:number
  created_at:string
  updated_at:string
}

type Tables={
  character_animation_settings:RowTable<CharacterAnimationSettings,Pick<CharacterAnimationSettings,'character_id'>&Partial<Omit<CharacterAnimationSettings,'character_id'|'created_at'|'updated_at'>>,Partial<Omit<CharacterAnimationSettings,'character_id'|'created_at'>>>
  character_animation_presets:RowTable<CharacterAnimationPreset,Pick<CharacterAnimationPreset,'character_id'|'preset_name'|'preset_key'>&Partial<Omit<CharacterAnimationPreset,'id'|'character_id'|'preset_name'|'preset_key'|'created_at'|'updated_at'>>,Partial<Omit<CharacterAnimationPreset,'id'|'character_id'|'created_at'>>>
}

type Functions={ensure_my_animation_settings:{Args:{p_character_id:string};Returns:boolean}}

export type HanamiAnimationPresetsDatabase=Omit<HanamiProfileScenesDatabase,'public'>&{
  public:Omit<HanamiProfileScenesDatabase['public'],'Tables'|'Functions'>&{
    Tables:HanamiProfileScenesDatabase['public']['Tables']&Tables
    Functions:HanamiProfileScenesDatabase['public']['Functions']&Functions
  }
}

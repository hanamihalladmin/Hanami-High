import type { Json } from './database'
import type { HanamiSocialIdentityDatabase } from './database-social-identity'

type RowTable<Row, Insert = Partial<Row>, Update = Partial<Row>> = { Row: Row; Insert: Insert; Update: Update; Relationships: [] }

export type ProfileSceneKind = 'music-room'|'photo-wall'|'journal'|'gaming-room'|'portfolio'|'friends-page'|'seasonal-room'
export type ProfileSceneVisibility = 'inherit'|'friends'|'private'
export type ProfileSceneLayout = 'room'|'gallery'|'notebook'|'desktop'|'showcase'|'scrapbook'|'seasonal'

export type CharacterProfileScene = {
  id:string
  character_id:string
  scene_kind:ProfileSceneKind
  title:string
  description:string|null
  visibility:ProfileSceneVisibility
  layout_style:ProfileSceneLayout
  background_url:string|null
  accent_color:string
  settings:Json
  is_published:boolean
  sort_order:number
  published_at:string|null
  created_at:string
  updated_at:string
}

export type CharacterProfileSceneItem = {
  id:string
  scene_id:string
  character_id:string
  item_kind:'note'|'image'|'sticker'|'link'|'playlist'|'track'|'photo'|'journal-card'|'game-card'|'project-card'|'friend-card'|'seasonal-decoration'|'counter'|'button'
  title:string|null
  body:string|null
  asset_url:string|null
  target_url:string|null
  position_x:number
  position_y:number
  width_pct:number
  height_pct:number
  rotation_deg:number
  z_index:number
  settings:Json
  created_at:string
  updated_at:string
}

type Tables = {
  character_profile_scenes: RowTable<
    CharacterProfileScene,
    Pick<CharacterProfileScene,'character_id'|'scene_kind'|'title'> & Partial<Omit<CharacterProfileScene,'id'|'character_id'|'scene_kind'|'title'|'created_at'|'updated_at'>>,
    Partial<Omit<CharacterProfileScene,'id'|'character_id'|'created_at'>>
  >
  character_profile_scene_items: RowTable<
    CharacterProfileSceneItem,
    Pick<CharacterProfileSceneItem,'scene_id'|'character_id'|'item_kind'> & Partial<Omit<CharacterProfileSceneItem,'id'|'scene_id'|'character_id'|'item_kind'|'created_at'|'updated_at'>>,
    Partial<Omit<CharacterProfileSceneItem,'id'|'scene_id'|'character_id'|'created_at'>>
  >
}

type Functions = {
  ensure_my_profile_scenes:{Args:{p_character_id:string};Returns:boolean}
}

export type HanamiProfileScenesDatabase = Omit<HanamiSocialIdentityDatabase,'public'> & {
  public: Omit<HanamiSocialIdentityDatabase['public'],'Tables'|'Functions'> & {
    Tables:HanamiSocialIdentityDatabase['public']['Tables']&Tables
    Functions:HanamiSocialIdentityDatabase['public']['Functions']&Functions
  }
}

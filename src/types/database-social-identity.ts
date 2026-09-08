import type { HanamiDashboardMessagingDatabase } from './database-dashboard-messaging'

type RowTable<Row, Insert = Partial<Row>, Update = Partial<Row>> = { Row: Row; Insert: Insert; Update: Update; Relationships: [] }

export type CharacterSocialIdentityCustomization = {
  character_id: string
  display_name_font: 'default'|'serif'|'mono'|'rounded'|'handwritten'|'pixel'
  display_name_color: string
  display_name_effect: 'none'|'glow'|'shadow'|'sparkle'|'underline'|'gradient-shift'
  status_icon: string|null
  status_style: 'classic'|'note'|'pill'|'pixel'|'sticker'|'soft-card'
  badge_layout: 'row'|'stack'|'compact'|'sticker-board'
  post_card_style: 'classic'|'notebook'|'scrapbook'|'pixel'|'soft-card'|'letter'
  guestbook_style: 'classic'|'notebook'|'polaroid'|'guestbook'|'pixel'|'sticker-book'
  reaction_pack: 'classic'|'flowers'|'stars'|'school'|'soft'|'pixel'
  sticker_pack: 'hanami'|'school'|'flowers'|'doodles'|'pixel'|'notebook'
  updated_at: string
  created_at: string
}
export type CharacterProfileBadge = { id:string; character_id:string; badge_kind:'personal'|'club'|'achievement'|'creator'|'event'; label:string; icon:string|null; description:string|null; sort_order:number; visible:boolean; created_at:string; updated_at:string }
export type CharacterFriendGroup = { id:string; character_id:string; group_name:string; icon:string|null; sort_order:number; created_at:string; updated_at:string }
export type CharacterFriendGroupMember = { group_id:string; friend_character_id:string; added_at:string }
export type SocialPostStyle = { post_id:string; author_character_id:string; card_style:'classic'|'notebook'|'scrapbook'|'pixel'|'soft-card'|'letter'; accent_key:'rose'|'sage'|'navy'|'lavender'|'bluebell'|'ivory'; title_style:'default'|'serif'|'mono'|'handwritten'|'pixel'|'underline'; sticker_key:string|null; created_at:string; updated_at:string }

type Tables = {
  character_social_identity_customization: RowTable<CharacterSocialIdentityCustomization,Pick<CharacterSocialIdentityCustomization,'character_id'>&Partial<Omit<CharacterSocialIdentityCustomization,'character_id'|'created_at'|'updated_at'>>,Partial<CharacterSocialIdentityCustomization>>
  character_profile_badges: RowTable<CharacterProfileBadge,Pick<CharacterProfileBadge,'character_id'|'label'>&Partial<Omit<CharacterProfileBadge,'id'|'character_id'|'label'|'created_at'|'updated_at'>>,Partial<CharacterProfileBadge>>
  character_friend_groups: RowTable<CharacterFriendGroup,Pick<CharacterFriendGroup,'character_id'|'group_name'>&Partial<Omit<CharacterFriendGroup,'id'|'character_id'|'group_name'|'created_at'|'updated_at'>>,Partial<CharacterFriendGroup>>
  character_friend_group_members: RowTable<CharacterFriendGroupMember,Pick<CharacterFriendGroupMember,'group_id'|'friend_character_id'>,Partial<CharacterFriendGroupMember>>
  social_post_styles: RowTable<SocialPostStyle,Pick<SocialPostStyle,'post_id'|'author_character_id'>&Partial<Omit<SocialPostStyle,'post_id'|'author_character_id'|'created_at'|'updated_at'>>,Partial<SocialPostStyle>>
}
type Functions = { ensure_my_social_identity_customization:{Args:{p_character_id:string};Returns:boolean} }
export type HanamiSocialIdentityDatabase = Omit<HanamiDashboardMessagingDatabase,'public'> & { public: Omit<HanamiDashboardMessagingDatabase['public'],'Tables'|'Functions'> & { Tables:HanamiDashboardMessagingDatabase['public']['Tables']&Tables; Functions:HanamiDashboardMessagingDatabase['public']['Functions']&Functions } }

import type { Json } from './database'
import type { HanamiInteractiveProfileDatabase } from './database-profile-interactivity'

type RowTable<Row, Insert = Partial<Row>, Update = Partial<Row>> = { Row: Row; Insert: Insert; Update: Update; Relationships: [] }

export type CreatorProfile = {
  account_id: string; primary_character_id: string | null; creator_slug: string; display_name: string; bio: string | null;
  banner_url: string | null; avatar_url: string | null; portfolio_visibility: 'public' | 'unlisted' | 'private'; created_at: string; updated_at: string
}
export type CreatorThemeListing = {
  id: string; author_account_id: string; author_character_id: string | null; slug: string; title: string; description: string | null;
  preview_image_url: string | null; tags: string[]; state: 'draft' | 'published' | 'hidden' | 'retired'; visibility: 'public' | 'unlisted' | 'private';
  current_version: number; download_count: number; favorite_count: number; published_at: string | null; created_at: string; updated_at: string
}
export type CreatorThemeVersion = { id: string; listing_id: string; version_no: number; theme_payload: Json; changelog: string | null; created_at: string }
export type CreatorThemeFavorite = { account_id: string; listing_id: string; created_at: string }
export type CreatorThemeRating = { account_id: string; listing_id: string; rating: number; updated_at: string; created_at: string }
export type CreatorThemeComment = { id: string; listing_id: string; author_account_id: string; author_character_id: string | null; body: string; state: string; created_at: string; updated_at: string }
export type CreatorFollow = { follower_account_id: string; creator_account_id: string; created_at: string }
export type CreatorCollection = { id: string; owner_account_id: string; title: string; description: string | null; visibility: 'public' | 'unlisted' | 'private'; created_at: string; updated_at: string }
export type CreatorCollectionItem = { collection_id: string; listing_id: string; sort_order: number; added_at: string }
export type CreatorThemeGift = { id: string; listing_id: string; version_id: string | null; sender_account_id: string; recipient_account_id: string; gift_message: string | null; status: string; created_at: string; opened_at: string | null }
export type CreatorContest = { id: string; contest_key: string; title: string; description: string | null; starts_at: string; ends_at: string; voting_ends_at: string | null; state: string; rules: Json; reward_metadata: Json; created_at: string; updated_at: string }
export type CreatorContestEntry = { id: string; contest_id: string; listing_id: string; entrant_account_id: string; submitted_version_id: string | null; caption: string | null; state: string; submitted_at: string }

type Tables = {
  creator_profiles: RowTable<CreatorProfile, Pick<CreatorProfile,'account_id'|'creator_slug'|'display_name'> & Partial<Omit<CreatorProfile,'account_id'|'creator_slug'|'display_name'|'created_at'|'updated_at'>>, Partial<CreatorProfile>>
  creator_theme_listings: RowTable<CreatorThemeListing, Pick<CreatorThemeListing,'author_account_id'|'slug'|'title'> & Partial<Omit<CreatorThemeListing,'id'|'author_account_id'|'slug'|'title'|'created_at'|'updated_at'>>, Partial<CreatorThemeListing>>
  creator_theme_versions: RowTable<CreatorThemeVersion, Pick<CreatorThemeVersion,'listing_id'|'version_no'|'theme_payload'> & Partial<Omit<CreatorThemeVersion,'id'|'listing_id'|'version_no'|'theme_payload'|'created_at'>>, Partial<CreatorThemeVersion>>
  creator_theme_favorites: RowTable<CreatorThemeFavorite, Pick<CreatorThemeFavorite,'account_id'|'listing_id'>, Partial<CreatorThemeFavorite>>
  creator_theme_ratings: RowTable<CreatorThemeRating, Pick<CreatorThemeRating,'account_id'|'listing_id'|'rating'>, Partial<CreatorThemeRating>>
  creator_theme_comments: RowTable<CreatorThemeComment, Pick<CreatorThemeComment,'listing_id'|'author_account_id'|'body'> & Partial<Pick<CreatorThemeComment,'author_character_id'|'state'>>, Partial<CreatorThemeComment>>
  creator_follows: RowTable<CreatorFollow, Pick<CreatorFollow,'follower_account_id'|'creator_account_id'>, Partial<CreatorFollow>>
  creator_collections: RowTable<CreatorCollection, Pick<CreatorCollection,'owner_account_id'|'title'> & Partial<Pick<CreatorCollection,'description'|'visibility'>>, Partial<CreatorCollection>>
  creator_collection_items: RowTable<CreatorCollectionItem, Pick<CreatorCollectionItem,'collection_id'|'listing_id'> & Partial<Pick<CreatorCollectionItem,'sort_order'>>, Partial<CreatorCollectionItem>>
  creator_theme_gifts: RowTable<CreatorThemeGift, Pick<CreatorThemeGift,'listing_id'|'sender_account_id'|'recipient_account_id'> & Partial<Pick<CreatorThemeGift,'version_id'|'gift_message'|'status'>>, Partial<CreatorThemeGift>>
  creator_contests: RowTable<CreatorContest, Partial<CreatorContest>, Partial<CreatorContest>>
  creator_contest_entries: RowTable<CreatorContestEntry, Pick<CreatorContestEntry,'contest_id'|'listing_id'|'entrant_account_id'> & Partial<Pick<CreatorContestEntry,'submitted_version_id'|'caption'|'state'>>, Partial<CreatorContestEntry>>
}

type Functions = {
  publish_creator_theme_version: { Args: { p_listing_id: string; p_theme_payload: Json; p_changelog?: string | null }; Returns: { version_id: string; version_no: number; published_at: string }[] }
  toggle_creator_theme_favorite: { Args: { p_listing_id: string }; Returns: boolean }
  record_creator_theme_use: { Args: { p_listing_id: string }; Returns: number }
}

export type HanamiCreatorMarketplaceDatabase = Omit<HanamiInteractiveProfileDatabase,'public'> & {
  public: Omit<HanamiInteractiveProfileDatabase['public'],'Tables'|'Functions'> & {
    Tables: HanamiInteractiveProfileDatabase['public']['Tables'] & Tables
    Functions: HanamiInteractiveProfileDatabase['public']['Functions'] & Functions
  }
}

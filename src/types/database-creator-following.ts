import type { HanamiCreatorPortfoliosDatabase } from './database-creator-portfolios'

type RowTable<Row,Insert=Partial<Row>,Update=Partial<Row>>={Row:Row;Insert:Insert;Update:Update;Relationships:[]}

export type CreatorReleaseType='theme'|'theme_version'|'widget_kit'|'widget_kit_version'|'collection'

export type CreatorReleaseEvent={
  id:string
  creator_account_id:string
  release_type:CreatorReleaseType
  source_id:string
  source_title:string
  version_no:number|null
  summary:string|null
  created_at:string
}

export type CreatorFollowingFeedRow={
  release_id:string
  creator_account_id:string
  creator_name:string
  creator_slug:string
  creator_avatar_url:string|null
  release_type:CreatorReleaseType
  source_id:string
  source_title:string
  version_no:number|null
  summary:string|null
  released_at:string
}

type Tables={creator_release_events:RowTable<CreatorReleaseEvent,never,never>}
type Functions={creator_following_feed:{Args:{p_limit?:number};Returns:CreatorFollowingFeedRow[]}}

export type HanamiCreatorFollowingDatabase=Omit<HanamiCreatorPortfoliosDatabase,'public'>&{
  public:Omit<HanamiCreatorPortfoliosDatabase['public'],'Tables'|'Functions'>&{
    Tables:HanamiCreatorPortfoliosDatabase['public']['Tables']&Tables
    Functions:HanamiCreatorPortfoliosDatabase['public']['Functions']&Functions
  }
}

import type { HanamiDesignCreditsDatabase } from './database-design-credits'

export type CreatorPortfolioSummary={
  account_id:string
  creator_slug:string
  display_name:string
  bio:string|null
  banner_url:string|null
  avatar_url:string|null
  primary_character_id:string|null
  follower_count:number
  published_theme_count:number
  published_kit_count:number
  public_collection_count:number
  remix_count:number
  joined_at:string
}

export type CreatorPortfolioDirectoryRow={
  account_id:string
  creator_slug:string
  display_name:string
  bio:string|null
  banner_url:string|null
  avatar_url:string|null
  follower_count:number
  published_theme_count:number
  published_kit_count:number
  remix_count:number
}

type Functions={
  creator_portfolio_summary:{Args:{p_creator_account_id:string};Returns:CreatorPortfolioSummary[]}
  list_public_creator_portfolios:{Args:Record<string,never>;Returns:CreatorPortfolioDirectoryRow[]}
}

export type HanamiCreatorPortfoliosDatabase=Omit<HanamiDesignCreditsDatabase,'public'>&{
  public:Omit<HanamiDesignCreditsDatabase['public'],'Functions'>&{
    Functions:HanamiDesignCreditsDatabase['public']['Functions']&Functions
    Tables:HanamiDesignCreditsDatabase['public']['Tables']
  }
}

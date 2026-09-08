import type { HanamiWidgetKitsDatabase } from './database-widget-kits'

type RowTable<Row,Insert=Partial<Row>,Update=Partial<Row>>={Row:Row;Insert:Insert;Update:Update;Relationships:[]}

export type CharacterProfileThemeSource={
  character_id:string
  source_listing_id:string
  source_version_id:string
  source_author_account_id:string
  attribution_text:string
  applied_at:string
  updated_at:string
}

export type ProfileDesignCredit={
  credit_type:'theme'|'component'
  source_id:string
  source_title:string
  source_creator:string
  source_creator_account_id:string
  version_label:string
  attribution_text:string
  item_count:number
  applied_at:string
}

type Tables={
  character_profile_theme_source:RowTable<CharacterProfileThemeSource,never,never>
}
type Functions={
  profile_design_credits:{Args:{p_character_id:string};Returns:ProfileDesignCredit[]}
}

export type HanamiDesignCreditsDatabase=Omit<HanamiWidgetKitsDatabase,'public'>&{
  public:Omit<HanamiWidgetKitsDatabase['public'],'Tables'|'Functions'>&{
    Tables:HanamiWidgetKitsDatabase['public']['Tables']&Tables
    Functions:HanamiWidgetKitsDatabase['public']['Functions']&Functions
  }
}
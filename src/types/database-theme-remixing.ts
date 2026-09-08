import type { HanamiAnimationPresetsDatabase } from './database-animation-presets'

type RowTable<Row,Insert=Partial<Row>,Update=Partial<Row>>={Row:Row;Insert:Insert;Update:Update;Relationships:[]}

export type CreatorThemeRemixSession={
  character_id:string;account_id:string;source_listing_id:string;source_version_id:string;source_author_account_id:string;source_title:string;
  backup_theme:unknown;backup_widgets:unknown;session_state:'active'|'converted'|'restored';started_at:string;updated_at:string
}
export type CreatorThemeLineage={listing_id:string;source_listing_id:string;source_version_id:string;source_author_account_id:string;remix_depth:number;attribution_text:string;created_at:string}

type Tables={
  creator_theme_remix_sessions:RowTable<CreatorThemeRemixSession,never,never>
  creator_theme_lineage:RowTable<CreatorThemeLineage,never,never>
}
type Functions={
  begin_creator_theme_remix:{Args:{p_listing_id:string};Returns:{character_id:string;source_listing_id:string;source_version_id:string;source_title:string}[]}
  restore_creator_theme_remix_backup:{Args:Record<string,never>;Returns:boolean}
  create_creator_remix_listing:{Args:{p_title:string;p_slug:string;p_description?:string|null;p_tags?:string[]};Returns:string}
}
export type HanamiThemeRemixingDatabase=Omit<HanamiAnimationPresetsDatabase,'public'>&{
  public:Omit<HanamiAnimationPresetsDatabase['public'],'Tables'|'Functions'>&{
    Tables:HanamiAnimationPresetsDatabase['public']['Tables']&Tables
    Functions:HanamiAnimationPresetsDatabase['public']['Functions']&Functions
  }
}

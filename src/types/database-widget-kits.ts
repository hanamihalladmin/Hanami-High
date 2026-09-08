import type { Json } from './database'
import type { HanamiThemeRemixingDatabase } from './database-theme-remixing'

type RowTable<Row,Insert=Partial<Row>,Update=Partial<Row>>={Row:Row;Insert:Insert;Update:Update;Relationships:[]}

export type CreatorWidgetKit={
  id:string;author_account_id:string;author_character_id:string|null;slug:string;title:string;description:string|null;tags:string[];
  kit_kind:'mixed'|'header'|'links'|'music'|'photos'|'journal'|'social'|'club'|'decorative'|'utility';
  state:'draft'|'published'|'hidden'|'retired';visibility:'public'|'unlisted'|'private';current_version:number;install_count:number;favorite_count:number;
  published_at:string|null;created_at:string;updated_at:string
}
export type CreatorWidgetKitVersion={id:string;kit_id:string;version_no:number;widget_payload:Json;widget_count:number;changelog:string|null;created_at:string}
export type CreatorWidgetKitFavorite={account_id:string;kit_id:string;created_at:string}
export type ProfileWidgetAttribution={widget_id:string;kit_id:string;version_id:string;source_author_account_id:string;attribution_text:string;installed_at:string}

type Tables={
  creator_widget_kits:RowTable<CreatorWidgetKit,Pick<CreatorWidgetKit,'author_account_id'|'slug'|'title'>&Partial<Omit<CreatorWidgetKit,'id'|'author_account_id'|'slug'|'title'|'created_at'|'updated_at'>>,Partial<CreatorWidgetKit>>
  creator_widget_kit_versions:RowTable<CreatorWidgetKitVersion,never,never>
  creator_widget_kit_favorites:RowTable<CreatorWidgetKitFavorite,never,never>
  profile_widget_attribution:RowTable<ProfileWidgetAttribution,never,never>
}
type Functions={
  publish_creator_widget_kit:{Args:{p_kit_id:string;p_widget_ids:string[];p_changelog?:string|null};Returns:{version_id:string;version_no:number;widget_count:number}[]}
  install_creator_widget_kit:{Args:{p_kit_id:string};Returns:{inserted_count:number;version_id:string}[]}
  toggle_creator_widget_kit_favorite:{Args:{p_kit_id:string};Returns:boolean}
}

export type HanamiWidgetKitsDatabase=Omit<HanamiThemeRemixingDatabase,'public'>&{
  public:Omit<HanamiThemeRemixingDatabase['public'],'Tables'|'Functions'>&{
    Tables:HanamiThemeRemixingDatabase['public']['Tables']&Tables
    Functions:HanamiThemeRemixingDatabase['public']['Functions']&Functions
  }
}

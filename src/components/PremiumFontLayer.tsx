import { useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { AccountFontPreferences, CharacterFontPreferences, CustomizationAsset } from '../types/database-customization-assets'

export const HANAMI_FONT_EVENT='hanami-font-preferences-changed'

function family(asset:CustomizationAsset|undefined|null,fallback:string){
  const value=asset?.asset_payload?.fontFamily
  return typeof value==='string'&&value.trim()?value:fallback
}

export function PremiumFontLayer(){
  const {account,activeCharacter}=useIdentity()

  const apply=useCallback(async()=>{
    const client=supabase
    const root=document.documentElement
    if(!client||!account){
      delete root.dataset.hanamiFontMode
      return
    }
    const [assetResult,accountResult,characterResult]=await Promise.all([
      client.from('customization_assets').select('*').eq('asset_type','font').eq('state','published'),
      client.from('account_font_preferences').select('*').eq('account_id',account.id).maybeSingle(),
      activeCharacter?client.from('character_font_preferences').select('*').eq('character_id',activeCharacter.id).maybeSingle():Promise.resolve({data:null,error:null}),
    ])
    if(assetResult.error||accountResult.error||characterResult.error)return
    const assets=Object.fromEntries((assetResult.data??[]).map(item=>[item.id,item as CustomizationAsset]))
    const accountPrefs=accountResult.data as AccountFontPreferences|null
    const characterPrefs=characterResult.data as CharacterFontPreferences|null
    const sans='Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    const serif='Georgia, "Times New Roman", serif'
    root.style.setProperty('--hanami-font-body',family(accountPrefs?.ui_body_font_asset_id?assets[accountPrefs.ui_body_font_asset_id]:null,sans))
    root.style.setProperty('--hanami-font-heading',family(accountPrefs?.ui_heading_font_asset_id?assets[accountPrefs.ui_heading_font_asset_id]:null,serif))
    root.style.setProperty('--hanami-font-display',family(accountPrefs?.ui_display_font_asset_id?assets[accountPrefs.ui_display_font_asset_id]:null,serif))
    root.style.setProperty('--hanami-character-display-font',family(characterPrefs?.display_name_font_asset_id?assets[characterPrefs.display_name_font_asset_id]:null,'inherit'))
    root.style.setProperty('--hanami-character-tag-font',family(characterPrefs?.tag_font_asset_id?assets[characterPrefs.tag_font_asset_id]:null,'inherit'))
    root.style.setProperty('--hanami-character-heading-font',family(characterPrefs?.profile_heading_font_asset_id?assets[characterPrefs.profile_heading_font_asset_id]:null,'inherit'))
    root.style.setProperty('--hanami-character-body-font',family(characterPrefs?.profile_body_font_asset_id?assets[characterPrefs.profile_body_font_asset_id]:null,'inherit'))
    root.style.setProperty('--hanami-character-blog-font',family(characterPrefs?.blog_font_asset_id?assets[characterPrefs.blog_font_asset_id]:null,'inherit'))
    if(accountPrefs?.sitewide_enabled)root.dataset.hanamiFontMode='custom'
    else delete root.dataset.hanamiFontMode
  },[account,activeCharacter])

  useEffect(()=>{void apply()},[apply])
  useEffect(()=>{
    const handler=()=>void apply()
    window.addEventListener(HANAMI_FONT_EVENT,handler)
    return()=>window.removeEventListener(HANAMI_FONT_EVENT,handler)
  },[apply])
  return null
}

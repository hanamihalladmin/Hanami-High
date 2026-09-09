import { useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { customFontFamily, loadCustomFontFaces, removeCustomFontFaces } from '../lib/customFonts'
import { useIdentity } from '../state/IdentityContext'
import type { AccountCustomFont, AccountFontPreferences, CharacterFontPreferences, CustomizationAsset } from '../types/database-customization-assets'

export const HANAMI_FONT_EVENT='hanami-font-preferences-changed'

const defaultSans='Verdana, Geneva, Tahoma, sans-serif'
const defaultSerif='Georgia, "Times New Roman", serif'

function assetFamily(asset:CustomizationAsset|undefined|null,fallback:string){
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
      root.style.removeProperty('--font-ui')
      root.style.removeProperty('--font-display')
      removeCustomFontFaces()
      return
    }
    const [assetResult,customResult,accountResult,characterResult]=await Promise.all([
      client.from('customization_assets').select('*').eq('asset_type','font').eq('state','published'),
      client.from('account_custom_fonts').select('*').eq('account_id',account.id).order('created_at'),
      client.from('account_font_preferences').select('*').eq('account_id',account.id).maybeSingle(),
      activeCharacter?client.from('character_font_preferences').select('*').eq('character_id',activeCharacter.id).maybeSingle():Promise.resolve({data:null,error:null}),
    ])
    if(assetResult.error||customResult.error||accountResult.error||characterResult.error)return

    const assets=Object.fromEntries((assetResult.data??[]).map(item=>[item.id,item as CustomizationAsset]))
    const customFonts=(customResult.data??[]) as AccountCustomFont[]
    const customById=Object.fromEntries(customFonts.map(font=>[font.id,font]))
    await loadCustomFontFaces(customFonts)

    const accountPrefs=accountResult.data as AccountFontPreferences|null
    const characterPrefs=characterResult.data as CharacterFontPreferences|null
    const resolve=(assetId:string|null|undefined,customId:string|null|undefined,fallback:string)=>customId&&customById[customId]
      ?customFontFamily(customById[customId],fallback)
      :assetFamily(assetId?assets[assetId]:null,fallback)

    const body=resolve(accountPrefs?.ui_body_font_asset_id,accountPrefs?.ui_body_custom_font_id,defaultSans)
    const heading=resolve(accountPrefs?.ui_heading_font_asset_id,accountPrefs?.ui_heading_custom_font_id,defaultSerif)
    const display=resolve(accountPrefs?.ui_display_font_asset_id,accountPrefs?.ui_display_custom_font_id,heading)

    root.style.setProperty('--hanami-font-body',body)
    root.style.setProperty('--hanami-font-heading',heading)
    root.style.setProperty('--hanami-font-display',display)
    root.style.setProperty('--hanami-character-display-font',resolve(characterPrefs?.display_name_font_asset_id,characterPrefs?.display_name_custom_font_id,'inherit'))
    root.style.setProperty('--hanami-character-tag-font',resolve(characterPrefs?.tag_font_asset_id,characterPrefs?.tag_custom_font_id,'inherit'))
    root.style.setProperty('--hanami-character-heading-font',resolve(characterPrefs?.profile_heading_font_asset_id,characterPrefs?.profile_heading_custom_font_id,'inherit'))
    root.style.setProperty('--hanami-character-body-font',resolve(characterPrefs?.profile_body_font_asset_id,characterPrefs?.profile_body_custom_font_id,'inherit'))
    root.style.setProperty('--hanami-character-blog-font',resolve(characterPrefs?.blog_font_asset_id,characterPrefs?.blog_custom_font_id,'inherit'))

    if(accountPrefs?.sitewide_enabled){
      root.dataset.hanamiFontMode='custom'
      // Most of V2 uses these original design tokens. Updating them at runtime is
      // what makes the member's font choice actually propagate across all pages.
      root.style.setProperty('--font-ui',body)
      root.style.setProperty('--font-display',heading)
    }else{
      delete root.dataset.hanamiFontMode
      root.style.removeProperty('--font-ui')
      root.style.removeProperty('--font-display')
    }
  },[account,activeCharacter])

  useEffect(()=>{void apply()},[apply])
  useEffect(()=>{
    const handler=()=>void apply()
    window.addEventListener(HANAMI_FONT_EVENT,handler)
    return()=>window.removeEventListener(HANAMI_FONT_EVENT,handler)
  },[apply])
  return null
}
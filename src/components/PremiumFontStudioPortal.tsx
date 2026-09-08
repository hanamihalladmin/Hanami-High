import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { HanamiPlusHubSnapshot } from '../types/database-rewards'
import type { AccountFontPreferences, CharacterFontPreferences, CustomizationAssetAccessRow } from '../types/database-customization-assets'
import { HANAMI_FONT_EVENT } from './PremiumFontLayer'

const FONT_HASH='#/hanami-plus/font-studio'

type CharacterDraft=Pick<CharacterFontPreferences,'display_name_font_asset_id'|'tag_font_asset_id'|'profile_heading_font_asset_id'|'profile_body_font_asset_id'|'blog_font_asset_id'>
type AccountDraft=Pick<AccountFontPreferences,'sitewide_enabled'|'ui_body_font_asset_id'|'ui_heading_font_asset_id'|'ui_display_font_asset_id'>

const emptyCharacter:CharacterDraft={display_name_font_asset_id:null,tag_font_asset_id:null,profile_heading_font_asset_id:null,profile_body_font_asset_id:null,blog_font_asset_id:null}
const emptyAccount:AccountDraft={sitewide_enabled:false,ui_body_font_asset_id:null,ui_heading_font_asset_id:null,ui_display_font_asset_id:null}

function payloadString(asset:CustomizationAssetAccessRow|undefined,key:string,fallback=''){
  const value=asset?.asset_payload?.[key]
  return typeof value==='string'?value:fallback
}
function fontStyle(asset:CustomizationAssetAccessRow|undefined):CSSProperties{return {fontFamily:payloadString(asset,'fontFamily','inherit')}}

export function PremiumFontStudioPortal(){
  const {account,activeCharacter}=useIdentity()
  const [open,setOpen]=useState(()=>window.location.hash===FONT_HASH)
  const [inPlus,setInPlus]=useState(()=>window.location.hash.startsWith('#/hanami-plus/'))
  const [snapshot,setSnapshot]=useState<HanamiPlusHubSnapshot|null>(null)
  const [fonts,setFonts]=useState<CustomizationAssetAccessRow[]>([])
  const [character,setCharacter]=useState<CharacterDraft>(emptyCharacter)
  const [accountDraft,setAccountDraft]=useState<AccountDraft>(emptyAccount)
  const [category,setCategory]=useState('all')
  const [working,setWorking]=useState<string|null>(null)
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState<string|null>(null)
  const [notice,setNotice]=useState<string|null>(null)

  useEffect(()=>{
    const sync=()=>{setOpen(window.location.hash===FONT_HASH);setInPlus(window.location.hash.startsWith('#/hanami-plus/'))}
    window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync)
  },[])

  const load=useCallback(async()=>{
    const client=supabase
    if(!client||!account||!activeCharacter||!open)return
    setLoading(true);setError(null)
    const hub=await client.rpc('current_hanami_plus_hub')
    if(hub.error){setLoading(false);setError(hub.error.message);return}
    const next=hub.data?.[0]??null;setSnapshot(next)
    if(next?.active){const ensure=await client.rpc('ensure_my_customization_foundation',{p_character_id:activeCharacter.id});if(ensure.error){setLoading(false);setError(ensure.error.message);return}}
    const [fontResult,characterResult,accountResult]=await Promise.all([
      client.rpc('my_customization_asset_access',{p_asset_type:'font'}),
      client.from('character_font_preferences').select('*').eq('character_id',activeCharacter.id).maybeSingle(),
      client.from('account_font_preferences').select('*').eq('account_id',account.id).maybeSingle(),
    ])
    setLoading(false)
    if(fontResult.error||characterResult.error||accountResult.error){setError(fontResult.error?.message||characterResult.error?.message||accountResult.error?.message||'Font Studio could not be loaded.');return}
    setFonts(fontResult.data??[])
    const cp=characterResult.data
    setCharacter(cp?{display_name_font_asset_id:cp.display_name_font_asset_id,tag_font_asset_id:cp.tag_font_asset_id,profile_heading_font_asset_id:cp.profile_heading_font_asset_id,profile_body_font_asset_id:cp.profile_body_font_asset_id,blog_font_asset_id:cp.blog_font_asset_id}:emptyCharacter)
    const ap=accountResult.data
    setAccountDraft(ap?{sitewide_enabled:ap.sitewide_enabled,ui_body_font_asset_id:ap.ui_body_font_asset_id,ui_heading_font_asset_id:ap.ui_heading_font_asset_id,ui_display_font_asset_id:ap.ui_display_font_asset_id}:emptyAccount)
  },[account,activeCharacter,open])
  useEffect(()=>{void load()},[load])

  const plus=Boolean(snapshot?.active)
  const byId=useMemo(()=>Object.fromEntries(fonts.map(font=>[font.asset_id,font])),[fonts])
  const categories=useMemo(()=>Array.from(new Set(fonts.map(font=>payloadString(font,'category','other')))).sort(),[fonts])
  const visibleFonts=category==='all'?fonts:fonts.filter(font=>payloadString(font,'category','other')===category)

  async function saveCharacter(){
    const client=supabase;if(!client||!activeCharacter||!plus)return
    setWorking('character');setError(null);setNotice(null)
    const result=await client.from('character_font_preferences').upsert({character_id:activeCharacter.id,account_id:activeCharacter.account_id,...character},{onConflict:'character_id'})
    setWorking(null);if(result.error){setError(result.error.message);return}
    window.dispatchEvent(new Event(HANAMI_FONT_EVENT));setNotice('Character typography saved.')
  }
  async function saveAccount(){
    const client=supabase;if(!client||!account||!plus)return
    setWorking('account');setError(null);setNotice(null)
    const result=await client.from('account_font_preferences').upsert({account_id:account.id,...accountDraft},{onConflict:'account_id'})
    setWorking(null);if(result.error){setError(result.error.message);return}
    window.dispatchEvent(new Event(HANAMI_FONT_EVENT));setNotice(accountDraft.sitewide_enabled?'Site-wide Hanami fonts applied.':'Site-wide custom fonts turned off.')
  }
  async function toggleFavorite(font:CustomizationAssetAccessRow){
    const client=supabase;if(!client||!account)return
    setWorking(`fav:${font.asset_id}`)
    const result=font.is_favorite
      ?await client.from('account_customization_asset_favorites').delete().eq('account_id',account.id).eq('asset_id',font.asset_id)
      :await client.from('account_customization_asset_favorites').insert({account_id:account.id,asset_id:font.asset_id})
    setWorking(null);if(result.error){setError(result.error.message);return}
    setFonts(current=>current.map(item=>item.asset_id===font.asset_id?{...item,is_favorite:!item.is_favorite}:item))
  }
  function chooseFont(id:string,target:keyof CharacterDraft|keyof AccountDraft){
    if(target in character)setCharacter(current=>({...current,[target]:id||null}))
    else setAccountDraft(current=>({...current,[target]:id||null}))
  }
  function close(){window.location.hash='#/hanami-plus/social-identity-studio'}

  if(!open)return inPlus?<button className="premium-font-launcher" type="button" onClick={()=>{window.location.hash=FONT_HASH}}>Aa <span>Font Studio</span></button>:null
  if(!activeCharacter||!account)return null

  const selectOptions=(value:string|null,onChange:(id:string)=>void)=><select disabled={!plus} value={value??''} onChange={e=>onChange(e.target.value)}><option value="">Hanami default</option>{fonts.map(font=><option key={font.asset_id} disabled={!font.can_use} value={font.asset_id}>{font.can_use?'':'🔒 '}{font.name}</option>)}</select>

  return <div className="font-studio-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)close()}}>
    <section className="font-studio-window" role="dialog" aria-modal="true" aria-label="Hanami+ Premium Font Studio">
      <header className="font-studio-titlebar"><div><span>HANAMI+ · TYPOGRAPHY</span><strong>Premium Font Studio</strong></div><button type="button" onClick={close} aria-label="Close Font Studio">×</button></header>
      <div className="font-studio-body">
        <section className="font-studio-hero"><div><span className="eyebrow">YOUR HANAMI, YOUR TYPE</span><h1>Make Hanami read like your page.</h1><p>Choose fonts for this character and, with Hanami+, carry your own typography across the website. Official moderation, PIN, and security surfaces stay on Hanami’s protected system type.</p></div><div className={plus?'font-plus-card active':'font-plus-card'}><span>{plus?'FONT EDITING UNLOCKED':'PREVIEW MODE'}</span><strong>{fonts.length} fonts</strong><small>{plus?'Your font assignments can be saved now.':'Saved choices remain stored; editing resumes with Hanami+.'}</small></div></section>
        {error&&<div className="identity-notice error">{error}</div>}{notice&&<div className="identity-notice success">{notice}</div>}
        {loading?<div className="font-studio-loading">Opening your font library…</div>:<>
          <section className="font-assignment-grid">
            <article className="font-assignment-panel"><span className="eyebrow">THIS CHARACTER</span><h2>Profile typography</h2><label>Display name{selectOptions(character.display_name_font_asset_id,id=>chooseFont(id,'display_name_font_asset_id'))}</label><label>User tags{selectOptions(character.tag_font_asset_id,id=>chooseFont(id,'tag_font_asset_id'))}</label><label>Profile headings{selectOptions(character.profile_heading_font_asset_id,id=>chooseFont(id,'profile_heading_font_asset_id'))}</label><label>Profile body{selectOptions(character.profile_body_font_asset_id,id=>chooseFont(id,'profile_body_font_asset_id'))}</label><label>Blogs & diary{selectOptions(character.blog_font_asset_id,id=>chooseFont(id,'blog_font_asset_id'))}</label><button className="font-save" type="button" disabled={!plus||working==='character'} onClick={()=>void saveCharacter()}>{working==='character'?'Saving…':'Save character fonts'}</button></article>
            <article className="font-assignment-panel sitewide"><span className="eyebrow">MY HANAMI WEBSITE</span><h2>Site-wide typography</h2><label className="font-toggle"><input type="checkbox" disabled={!plus} checked={accountDraft.sitewide_enabled} onChange={e=>setAccountDraft(current=>({...current,sitewide_enabled:e.target.checked}))}/><span><strong>Use my fonts across Hanami</strong><small>Applies to normal website pages, cards, menus, and headings.</small></span></label><label>Website body{selectOptions(accountDraft.ui_body_font_asset_id,id=>chooseFont(id,'ui_body_font_asset_id'))}</label><label>Website headings{selectOptions(accountDraft.ui_heading_font_asset_id,id=>chooseFont(id,'ui_heading_font_asset_id'))}</label><label>Display / hero text{selectOptions(accountDraft.ui_display_font_asset_id,id=>chooseFont(id,'ui_display_font_asset_id'))}</label><div className="font-site-preview" style={{fontFamily:accountDraft.ui_body_font_asset_id?payloadString(byId[accountDraft.ui_body_font_asset_id],'fontFamily','inherit'):undefined}}><small>HANAMI HIGH · 2006</small><h3 style={{fontFamily:accountDraft.ui_heading_font_asset_id?payloadString(byId[accountDraft.ui_heading_font_asset_id],'fontFamily','inherit'):undefined}}>After School Notes</h3><p>Your dashboard, social pages, Boutique, and personal Hanami spaces can follow your typography.</p><strong style={{fontFamily:accountDraft.ui_display_font_asset_id?payloadString(byId[accountDraft.ui_display_font_asset_id],'fontFamily','inherit'):undefined}}>花 Hanami</strong></div><button className="font-save" type="button" disabled={!plus||working==='account'} onClick={()=>void saveAccount()}>{working==='account'?'Applying…':'Apply website fonts'}</button></article>
          </section>
          <section className="font-library-section"><header><div><span className="eyebrow">FONT LIBRARY</span><h2>Collect your lettering.</h2></div><div className="font-category-tabs"><button type="button" className={category==='all'?'active':''} onClick={()=>setCategory('all')}>All</button>{categories.map(item=><button type="button" key={item} className={category===item?'active':''} onClick={()=>setCategory(item)}>{item}</button>)}</div></header><div className="font-library-grid">{visibleFonts.map(font=><article className={`font-card rarity-${font.rarity} ${font.can_use?'':'locked'}`} key={font.asset_id}><div className="font-card-top"><span>{payloadString(font,'category','font')}</span><button type="button" disabled={working===`fav:${font.asset_id}`} onClick={()=>void toggleFavorite(font)} aria-label={font.is_favorite?'Remove from favorite fonts':'Favorite font'}>{font.is_favorite?'♥':'♡'}</button></div><div className="font-sample" style={fontStyle(font)}>{payloadString(font,'sample','Hanami High')}</div><div className="font-card-copy"><strong>{font.name}</strong><p>{font.description}</p><small>{font.can_use?'AVAILABLE':font.access_kind==='hanami_plus'?'HANAMI+':'LOCKED'} · {font.rarity.replaceAll('_',' ')}</small></div></article>)}</div></section>
        </>}
      </div>
    </section>
  </div>
}

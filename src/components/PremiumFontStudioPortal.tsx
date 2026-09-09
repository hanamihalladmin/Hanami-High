import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { supabase } from '../lib/supabase'
import { customFontFamily, loadCustomFontFaces } from '../lib/customFonts'
import { useIdentity } from '../state/IdentityContext'
import type { HanamiPlusHubSnapshot } from '../types/database-rewards'
import type { AccountCustomFont, AccountFontPreferences, CharacterFontPreferences, CustomizationAssetAccessRow } from '../types/database-customization-assets'
import { HANAMI_FONT_EVENT } from './PremiumFontLayer'

const FONT_HASH='#/hanami-plus/font-studio'
const MAX_FONT_BYTES=4*1024*1024
const allowedFormats=['woff2','woff','ttf','otf'] as const
type FontFormat=(typeof allowedFormats)[number]

type CharacterDraft=Pick<CharacterFontPreferences,
  'display_name_font_asset_id'|'tag_font_asset_id'|'profile_heading_font_asset_id'|'profile_body_font_asset_id'|'blog_font_asset_id'|
  'display_name_custom_font_id'|'tag_custom_font_id'|'profile_heading_custom_font_id'|'profile_body_custom_font_id'|'blog_custom_font_id'>
type AccountDraft=Pick<AccountFontPreferences,
  'sitewide_enabled'|'ui_body_font_asset_id'|'ui_heading_font_asset_id'|'ui_display_font_asset_id'|
  'ui_body_custom_font_id'|'ui_heading_custom_font_id'|'ui_display_custom_font_id'>

type CharacterAssetKey='display_name_font_asset_id'|'tag_font_asset_id'|'profile_heading_font_asset_id'|'profile_body_font_asset_id'|'blog_font_asset_id'
type CharacterCustomKey='display_name_custom_font_id'|'tag_custom_font_id'|'profile_heading_custom_font_id'|'profile_body_custom_font_id'|'blog_custom_font_id'
type AccountAssetKey='ui_body_font_asset_id'|'ui_heading_font_asset_id'|'ui_display_font_asset_id'
type AccountCustomKey='ui_body_custom_font_id'|'ui_heading_custom_font_id'|'ui_display_custom_font_id'

const emptyCharacter:CharacterDraft={display_name_font_asset_id:null,tag_font_asset_id:null,profile_heading_font_asset_id:null,profile_body_font_asset_id:null,blog_font_asset_id:null,display_name_custom_font_id:null,tag_custom_font_id:null,profile_heading_custom_font_id:null,profile_body_custom_font_id:null,blog_custom_font_id:null}
const emptyAccount:AccountDraft={sitewide_enabled:false,ui_body_font_asset_id:null,ui_heading_font_asset_id:null,ui_display_font_asset_id:null,ui_body_custom_font_id:null,ui_heading_custom_font_id:null,ui_display_custom_font_id:null}

function payloadString(asset:CustomizationAssetAccessRow|undefined,key:string,fallback=''){
  const value=asset?.asset_payload?.[key]
  return typeof value==='string'?value:fallback
}
function fontStyle(asset:CustomizationAssetAccessRow|undefined):CSSProperties{return {fontFamily:payloadString(asset,'fontFamily','inherit')}}
function formatFromFile(file:File):FontFormat|null{const ext=file.name.split('.').pop()?.toLowerCase();return allowedFormats.includes(ext as FontFormat)?ext as FontFormat:null}
function contentType(format:FontFormat){return format==='woff2'?'font/woff2':format==='woff'?'font/woff':format==='ttf'?'font/ttf':'font/otf'}
function selection(assetId:string|null,customId:string|null){return customId?`custom:${customId}`:assetId?`asset:${assetId}`:''}

export function PremiumFontStudioPortal(){
  const {account,activeCharacter}=useIdentity()
  const [open,setOpen]=useState(()=>window.location.hash===FONT_HASH)
  const [inPlus,setInPlus]=useState(()=>window.location.hash.startsWith('#/hanami-plus/'))
  const [snapshot,setSnapshot]=useState<HanamiPlusHubSnapshot|null>(null)
  const [fonts,setFonts]=useState<CustomizationAssetAccessRow[]>([])
  const [customFonts,setCustomFonts]=useState<AccountCustomFont[]>([])
  const [character,setCharacter]=useState<CharacterDraft>(emptyCharacter)
  const [accountDraft,setAccountDraft]=useState<AccountDraft>(emptyAccount)
  const [category,setCategory]=useState('all')
  const [working,setWorking]=useState<string|null>(null)
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState<string|null>(null)
  const [notice,setNotice]=useState<string|null>(null)
  const [uploadFile,setUploadFile]=useState<File|null>(null)
  const [uploadName,setUploadName]=useState('')
  const [sourceUrl,setSourceUrl]=useState('')
  const [rightsConfirmed,setRightsConfirmed]=useState(false)

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
    const [fontResult,customResult,characterResult,accountResult]=await Promise.all([
      client.rpc('my_customization_asset_access',{p_asset_type:'font'}),
      client.from('account_custom_fonts').select('*').eq('account_id',account.id).order('created_at',{ascending:false}),
      client.from('character_font_preferences').select('*').eq('character_id',activeCharacter.id).maybeSingle(),
      client.from('account_font_preferences').select('*').eq('account_id',account.id).maybeSingle(),
    ])
    setLoading(false)
    if(fontResult.error||customResult.error||characterResult.error||accountResult.error){setError(fontResult.error?.message||customResult.error?.message||characterResult.error?.message||accountResult.error?.message||'Font Studio could not be loaded.');return}
    setFonts(fontResult.data??[])
    const nextCustom=(customResult.data??[]) as AccountCustomFont[]
    setCustomFonts(nextCustom)
    await loadCustomFontFaces(nextCustom)
    const cp=characterResult.data
    setCharacter(cp?{
      display_name_font_asset_id:cp.display_name_font_asset_id,tag_font_asset_id:cp.tag_font_asset_id,profile_heading_font_asset_id:cp.profile_heading_font_asset_id,profile_body_font_asset_id:cp.profile_body_font_asset_id,blog_font_asset_id:cp.blog_font_asset_id,
      display_name_custom_font_id:cp.display_name_custom_font_id,tag_custom_font_id:cp.tag_custom_font_id,profile_heading_custom_font_id:cp.profile_heading_custom_font_id,profile_body_custom_font_id:cp.profile_body_custom_font_id,blog_custom_font_id:cp.blog_custom_font_id,
    }:emptyCharacter)
    const ap=accountResult.data
    setAccountDraft(ap?{
      sitewide_enabled:ap.sitewide_enabled,ui_body_font_asset_id:ap.ui_body_font_asset_id,ui_heading_font_asset_id:ap.ui_heading_font_asset_id,ui_display_font_asset_id:ap.ui_display_font_asset_id,
      ui_body_custom_font_id:ap.ui_body_custom_font_id,ui_heading_custom_font_id:ap.ui_heading_custom_font_id,ui_display_custom_font_id:ap.ui_display_custom_font_id,
    }:emptyAccount)
  },[account,activeCharacter,open])
  useEffect(()=>{void load()},[load])

  const plus=Boolean(snapshot?.active)
  const byId=useMemo(()=>Object.fromEntries(fonts.map(font=>[font.asset_id,font])),[fonts])
  const customById=useMemo(()=>Object.fromEntries(customFonts.map(font=>[font.id,font])),[customFonts])
  const categories=useMemo(()=>Array.from(new Set(fonts.map(font=>payloadString(font,'category','other')))).sort(),[fonts])
  const visibleFonts=category==='all'?fonts:fonts.filter(font=>payloadString(font,'category','other')===category)

  async function saveCharacter(){
    const client=supabase;if(!client||!activeCharacter||!plus)return
    setWorking('character');setError(null);setNotice(null)
    const result=await client.from('character_font_preferences').upsert({character_id:activeCharacter.id,account_id:activeCharacter.account_id,...character},{onConflict:'character_id'})
    setWorking(null);if(result.error){setError(result.error.message);return}
    window.dispatchEvent(new Event(HANAMI_FONT_EVENT));setNotice('Character typography saved and refreshed.')
  }
  async function saveAccount(){
    const client=supabase;if(!client||!account||!plus)return
    setWorking('account');setError(null);setNotice(null)
    const result=await client.from('account_font_preferences').upsert({account_id:account.id,...accountDraft},{onConflict:'account_id'})
    setWorking(null);if(result.error){setError(result.error.message);return}
    window.dispatchEvent(new Event(HANAMI_FONT_EVENT));setNotice(accountDraft.sitewide_enabled?'Site-wide Hanami fonts applied across the website.':'Site-wide custom fonts turned off.')
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
  function chooseCharacterFont(assetKey:CharacterAssetKey,customKey:CharacterCustomKey,value:string){
    setCharacter(current=>({...current,[assetKey]:value.startsWith('asset:')?value.slice(6)||null:null,[customKey]:value.startsWith('custom:')?value.slice(7)||null:null}))
  }
  function chooseAccountFont(assetKey:AccountAssetKey,customKey:AccountCustomKey,value:string){
    setAccountDraft(current=>({...current,[assetKey]:value.startsWith('asset:')?value.slice(6)||null:null,[customKey]:value.startsWith('custom:')?value.slice(7)||null:null}))
  }
  function currentFamily(assetId:string|null,customId:string|null,fallback='inherit'){
    if(customId&&customById[customId])return customFontFamily(customById[customId],fallback)
    return assetId?payloadString(byId[assetId],'fontFamily',fallback):fallback
  }
  async function uploadCustomFont(){
    const client=supabase;if(!client||!account||!plus||!uploadFile)return
    const format=formatFromFile(uploadFile)
    if(!format){setError('Choose a .woff2, .woff, .ttf, or .otf font file. ZIP files must be extracted first.');return}
    if(uploadFile.size>MAX_FONT_BYTES){setError('Custom font files must be 4 MB or smaller.');return}
    if(!rightsConfirmed){setError('Confirm that you have permission to use and upload this font before adding it to Hanami.');return}
    const name=uploadName.trim()||uploadFile.name.replace(/\.[^.]+$/,'')
    if(!name){setError('Give this font a display name.');return}
    setWorking('upload');setError(null);setNotice(null)
    const path=`${account.id}/${crypto.randomUUID()}.${format}`
    const upload=await client.storage.from('custom-fonts').upload(path,uploadFile,{contentType:contentType(format),upsert:false,cacheControl:'3600'})
    if(upload.error){setWorking(null);setError(upload.error.message);return}
    const source=sourceUrl.trim()
    const insert=await client.from('account_custom_fonts').insert({account_id:account.id,name,storage_path:path,original_filename:uploadFile.name,font_format:format,file_size:uploadFile.size,source_label:source.toLowerCase().includes('dafont.com')?'Dafont member upload':'Member upload',source_url:source||null,rights_confirmed_at:new Date().toISOString()})
    if(insert.error){await client.storage.from('custom-fonts').remove([path]);setWorking(null);setError(insert.error.message);return}
    setUploadFile(null);setUploadName('');setSourceUrl('');setRightsConfirmed(false);setWorking(null);setNotice(`${name} was added to your private Hanami font library.`);await load();window.dispatchEvent(new Event(HANAMI_FONT_EVENT))
  }
  async function deleteCustomFont(font:AccountCustomFont){
    const client=supabase;if(!client||!account)return
    if(!window.confirm(`Delete ${font.name} from your Hanami font library? Any font slots using it will return to their other/default font.`))return
    setWorking(`delete:${font.id}`);setError(null);setNotice(null)
    const removeRow=await client.from('account_custom_fonts').delete().eq('id',font.id).eq('account_id',account.id)
    if(removeRow.error){setWorking(null);setError(removeRow.error.message);return}
    const removeFile=await client.storage.from('custom-fonts').remove([font.storage_path])
    setWorking(null)
    if(removeFile.error)setNotice(`${font.name} was removed from your font library. Its stored file is queued for cleanup.`)
    else setNotice(`${font.name} was deleted.`)
    await load();window.dispatchEvent(new Event(HANAMI_FONT_EVENT))
  }
  function close(){window.location.hash='#/hanami-plus/social-identity-studio'}

  if(!open)return inPlus?<button className="premium-font-launcher" type="button" onClick={()=>{window.location.hash=FONT_HASH}}>Aa <span>Font Studio</span></button>:null
  if(!activeCharacter||!account)return null

  const fontSelect=(assetId:string|null,customId:string|null,onChange:(value:string)=>void)=><select disabled={!plus} value={selection(assetId,customId)} onChange={e=>onChange(e.target.value)}><option value="">Hanami default</option>{customFonts.length>0&&<optgroup label="My uploaded fonts">{customFonts.map(font=><option key={font.id} value={`custom:${font.id}`}>{font.name}</option>)}</optgroup>}<optgroup label="Hanami font library">{fonts.map(font=><option key={font.asset_id} disabled={!font.can_use} value={`asset:${font.asset_id}`}>{font.can_use?'':'🔒 '}{font.name}</option>)}</optgroup></select>

  return <div className="font-studio-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)close()}}>
    <section className="font-studio-window" role="dialog" aria-modal="true" aria-label="Hanami+ Premium Font Studio">
      <header className="font-studio-titlebar"><div><span>HANAMI+ · TYPOGRAPHY</span><strong>Premium Font Studio</strong></div><button type="button" onClick={close} aria-label="Close Font Studio">×</button></header>
      <div className="font-studio-body">
        <section className="font-studio-hero"><div><span className="eyebrow">YOUR HANAMI, YOUR TYPE</span><h1>Make Hanami read like your page.</h1><p>Choose fonts for this character and, with Hanami+, carry your own typography across the website. You can also upload font files you have permission to use, including fonts you downloaded from dafont after extracting the font file. Official moderation, PIN, and security surfaces stay on Hanami’s protected system type.</p></div><div className={plus?'font-plus-card active':'font-plus-card'}><span>{plus?'FONT EDITING UNLOCKED':'PREVIEW MODE'}</span><strong>{fonts.length+customFonts.length} fonts</strong><small>{plus?'Built-in and personal font assignments can be saved now.':'Saved choices remain stored; editing resumes with Hanami+.'}</small></div></section>
        {error&&<div className="identity-notice error">{error}</div>}{notice&&<div className="identity-notice success">{notice}</div>}
        {loading?<div className="font-studio-loading">Opening your font library…</div>:<>
          <section className="font-assignment-grid">
            <article className="font-assignment-panel"><span className="eyebrow">THIS CHARACTER</span><h2>Profile typography</h2><label>Display name{fontSelect(character.display_name_font_asset_id,character.display_name_custom_font_id,value=>chooseCharacterFont('display_name_font_asset_id','display_name_custom_font_id',value))}</label><label>User tags{fontSelect(character.tag_font_asset_id,character.tag_custom_font_id,value=>chooseCharacterFont('tag_font_asset_id','tag_custom_font_id',value))}</label><label>Profile headings{fontSelect(character.profile_heading_font_asset_id,character.profile_heading_custom_font_id,value=>chooseCharacterFont('profile_heading_font_asset_id','profile_heading_custom_font_id',value))}</label><label>Profile body{fontSelect(character.profile_body_font_asset_id,character.profile_body_custom_font_id,value=>chooseCharacterFont('profile_body_font_asset_id','profile_body_custom_font_id',value))}</label><label>Blogs & diary{fontSelect(character.blog_font_asset_id,character.blog_custom_font_id,value=>chooseCharacterFont('blog_font_asset_id','blog_custom_font_id',value))}</label><button className="font-save" type="button" disabled={!plus||working==='character'} onClick={()=>void saveCharacter()}>{working==='character'?'Saving…':'Save character fonts'}</button></article>
            <article className="font-assignment-panel sitewide"><span className="eyebrow">MY HANAMI WEBSITE</span><h2>Site-wide typography</h2><label className="font-toggle"><input type="checkbox" disabled={!plus} checked={accountDraft.sitewide_enabled} onChange={e=>setAccountDraft(current=>({...current,sitewide_enabled:e.target.checked}))}/><span><strong>Use my fonts across Hanami</strong><small>Applies to navigation, normal pages, cards, menus, forms, headings, Messages, Boutique, and Hanami+ spaces.</small></span></label><label>Website body{fontSelect(accountDraft.ui_body_font_asset_id,accountDraft.ui_body_custom_font_id,value=>chooseAccountFont('ui_body_font_asset_id','ui_body_custom_font_id',value))}</label><label>Website headings{fontSelect(accountDraft.ui_heading_font_asset_id,accountDraft.ui_heading_custom_font_id,value=>chooseAccountFont('ui_heading_font_asset_id','ui_heading_custom_font_id',value))}</label><label>Display / hero text{fontSelect(accountDraft.ui_display_font_asset_id,accountDraft.ui_display_custom_font_id,value=>chooseAccountFont('ui_display_font_asset_id','ui_display_custom_font_id',value))}</label><div className="font-site-preview" style={{fontFamily:currentFamily(accountDraft.ui_body_font_asset_id,accountDraft.ui_body_custom_font_id)}}><small>HANAMI HIGH · 2006</small><h3 style={{fontFamily:currentFamily(accountDraft.ui_heading_font_asset_id,accountDraft.ui_heading_custom_font_id)}}>After School Notes</h3><p>Your dashboard, social pages, Boutique, messages, and personal Hanami spaces follow your typography.</p><strong style={{fontFamily:currentFamily(accountDraft.ui_display_font_asset_id,accountDraft.ui_display_custom_font_id)}}>花 Hanami</strong></div><button className="font-save" type="button" disabled={!plus||working==='account'} onClick={()=>void saveAccount()}>{working==='account'?'Applying…':'Apply website fonts'}</button></article>
          </section>

          <section className="custom-font-upload-section"><header><div><span className="eyebrow">MY UPLOADED FONTS</span><h2>Bring your own lettering.</h2><p>Upload an extracted .woff2, .woff, .ttf, or .otf file up to 4 MB. If you found a font on dafont, download it there, extract the ZIP on your device, then choose the actual font file here.</p></div><strong>{customFonts.length}</strong></header><div className="custom-font-upload-form"><label>Font name<input disabled={!plus} value={uploadName} onChange={event=>setUploadName(event.target.value)} placeholder="My dreamy font"/></label><label>Font file<input disabled={!plus} type="file" accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf" onChange={event=>{const file=event.target.files?.[0]??null;setUploadFile(file);if(file&&!uploadName)setUploadName(file.name.replace(/\.[^.]+$/,''))}}/></label><label>Source page <small>optional</small><input disabled={!plus} value={sourceUrl} onChange={event=>setSourceUrl(event.target.value)} placeholder="https://www.dafont.com/..."/></label><label className="custom-font-rights"><input disabled={!plus} type="checkbox" checked={rightsConfirmed} onChange={event=>setRightsConfirmed(event.target.checked)}/><span><strong>I have permission to use and upload this font.</strong><small>Each dafont font has its own license. Hanami keeps member uploads account-scoped and does not republish them as a public font catalog.</small></span></label><button className="font-save" type="button" disabled={!plus||!uploadFile||!rightsConfirmed||working==='upload'} onClick={()=>void uploadCustomFont()}>{working==='upload'?'Uploading…':'Upload to my Hanami fonts'}</button></div>{customFonts.length>0&&<div className="custom-font-grid">{customFonts.map(font=><article key={font.id}><div className="custom-font-sample" style={{fontFamily:customFontFamily(font)}}>Hanami High 花</div><div><strong>{font.name}</strong><span>{font.font_format.toUpperCase()} · {Math.max(1,Math.round(font.file_size/1024))} KB</span><small>{font.source_label}{font.source_url?' · source saved':''}</small></div><button type="button" disabled={working===`delete:${font.id}`} onClick={()=>void deleteCustomFont(font)}>Delete</button></article>)}</div>}</section>

          <section className="font-library-section"><header><div><span className="eyebrow">HANAMI FONT LIBRARY</span><h2>Collect your lettering.</h2></div><div className="font-category-tabs"><button type="button" className={category==='all'?'active':''} onClick={()=>setCategory('all')}>All</button>{categories.map(item=><button type="button" key={item} className={category===item?'active':''} onClick={()=>setCategory(item)}>{item}</button>)}</div></header><div className="font-library-grid">{visibleFonts.map(font=><article className={`font-card rarity-${font.rarity} ${font.can_use?'':'locked'}`} key={font.asset_id}><div className="font-card-top"><span>{payloadString(font,'category','font')}</span><button type="button" disabled={working===`fav:${font.asset_id}`} onClick={()=>void toggleFavorite(font)} aria-label={font.is_favorite?'Remove from favorite fonts':'Favorite font'}>{font.is_favorite?'♥':'♡'}</button></div><div className="font-sample" style={fontStyle(font)}>{payloadString(font,'sample','Hanami High')}</div><div className="font-card-copy"><strong>{font.name}</strong><p>{font.description}</p><small>{font.can_use?'AVAILABLE':font.access_kind==='hanami_plus'?'HANAMI+':'LOCKED'} · {font.rarity.replaceAll('_',' ')}</small></div></article>)}</div></section>
        </>}
      </div>
    </section>
  </div>
}
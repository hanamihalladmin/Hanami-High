import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { HanamiPlusHubSnapshot } from '../types/database-rewards'
import type { CharacterCustomTag, CustomizationAssetAccessRow } from '../types/database-customization-assets'

const TAG_HASH = '#/hanami-plus/social-identity-studio/tags'

type Draft = Pick<CharacterCustomTag,
  'label'|'style_asset_id'|'font_asset_id'|'left_accent_asset_id'|'right_accent_asset_id'|'shape'|'fill_mode'|
  'background_color'|'background_color_2'|'text_color'|'border_color'|'glow_color'|'text_shadow'|'glow_enabled'|
  'outline_enabled'|'motion_style'|'visible'
>

const freshDraft = (): Draft => ({
  label:'my tag',
  style_asset_id:null,
  font_asset_id:null,
  left_accent_asset_id:null,
  right_accent_asset_id:null,
  shape:'pill',
  fill_mode:'solid',
  background_color:'#f8e4eb',
  background_color_2:'#fff9f2',
  text_color:'#49333f',
  border_color:'#d39aae',
  glow_color:'#f2a9c2',
  text_shadow:false,
  glow_enabled:false,
  outline_enabled:true,
  motion_style:'none',
  visible:true,
})

function assetGlyph(asset:CustomizationAssetAccessRow|undefined){
  const glyph=asset?.asset_payload?.glyph
  return typeof glyph==='string'?glyph:''
}

function fontFamily(asset:CustomizationAssetAccessRow|undefined){
  const value=asset?.asset_payload?.fontFamily
  return typeof value==='string'?value:undefined
}

function tagPreviewStyle(draft:Draft,font?:CustomizationAssetAccessRow):CSSProperties{
  const background=draft.fill_mode==='transparent'?'transparent':draft.fill_mode==='gradient'
    ?`linear-gradient(135deg,${draft.background_color},${draft.background_color_2})`
    :draft.background_color
  return {
    background,
    color:draft.text_color,
    borderColor:draft.outline_enabled?draft.border_color:'transparent',
    boxShadow:draft.glow_enabled?`0 0 18px ${draft.glow_color||draft.border_color}`:'none',
    textShadow:draft.text_shadow?'0 1px 1px rgba(0,0,0,.28)':'none',
    fontFamily:fontFamily(font),
  }
}

export function UserTagDesignerPortal(){
  const {activeCharacter}=useIdentity()
  const [open,setOpen]=useState(()=>window.location.hash===TAG_HASH)
  const [snapshot,setSnapshot]=useState<HanamiPlusHubSnapshot|null>(null)
  const [assets,setAssets]=useState<CustomizationAssetAccessRow[]>([])
  const [tags,setTags]=useState<CharacterCustomTag[]>([])
  const [selectedId,setSelectedId]=useState<string|null>(null)
  const [draft,setDraft]=useState<Draft>(freshDraft)
  const [loading,setLoading]=useState(false)
  const [working,setWorking]=useState<string|null>(null)
  const [error,setError]=useState<string|null>(null)
  const [notice,setNotice]=useState<string|null>(null)

  useEffect(()=>{
    const sync=()=>setOpen(window.location.hash===TAG_HASH)
    window.addEventListener('hashchange',sync)
    return()=>window.removeEventListener('hashchange',sync)
  },[])

  const load=useCallback(async()=>{
    const client=supabase
    if(!client||!activeCharacter||!open)return
    setLoading(true);setError(null)
    const hub=await client.rpc('current_hanami_plus_hub')
    if(hub.error){setLoading(false);setError(hub.error.message);return}
    const next=hub.data?.[0]??null
    setSnapshot(next)
    if(next?.active){
      const ensure=await client.rpc('ensure_my_customization_foundation',{p_character_id:activeCharacter.id})
      if(ensure.error){setLoading(false);setError(ensure.error.message);return}
    }
    const [assetResult,tagResult]=await Promise.all([
      client.rpc('my_customization_asset_access',{p_asset_type:null}),
      client.from('character_custom_tags').select('*').eq('character_id',activeCharacter.id).order('sort_order').order('created_at'),
    ])
    setLoading(false)
    if(assetResult.error||tagResult.error){setError(assetResult.error?.message||tagResult.error?.message||'Tag Designer could not be loaded.');return}
    const nextAssets=assetResult.data??[]
    const nextTags=tagResult.data??[]
    setAssets(nextAssets)
    setTags(nextTags)
    const preferred=nextTags.find(tag=>tag.is_active)??nextTags.find(tag=>tag.id===selectedId)??nextTags[0]??null
    if(preferred){setSelectedId(preferred.id);setDraft({
      label:preferred.label,style_asset_id:preferred.style_asset_id,font_asset_id:preferred.font_asset_id,
      left_accent_asset_id:preferred.left_accent_asset_id,right_accent_asset_id:preferred.right_accent_asset_id,
      shape:preferred.shape,fill_mode:preferred.fill_mode,background_color:preferred.background_color,
      background_color_2:preferred.background_color_2,text_color:preferred.text_color,border_color:preferred.border_color,
      glow_color:preferred.glow_color,text_shadow:preferred.text_shadow,glow_enabled:preferred.glow_enabled,
      outline_enabled:preferred.outline_enabled,motion_style:preferred.motion_style,visible:preferred.visible,
    })}else{setSelectedId(null);setDraft(freshDraft())}
  },[activeCharacter,open,selectedId])

  useEffect(()=>{void load()},[load])

  const plus=Boolean(snapshot?.active)
  const selected=tags.find(tag=>tag.id===selectedId)??null
  const tagStyles=assets.filter(asset=>asset.asset_type==='tag_style')
  const fonts=assets.filter(asset=>asset.asset_type==='font')
  const accents=assets.filter(asset=>['decorative_accent','icon','sticker','emoji'].includes(asset.asset_type))
  const assetById=useMemo(()=>Object.fromEntries(assets.map(asset=>[asset.asset_id,asset])),[assets])
  const leftAccent=assetGlyph(draft.left_accent_asset_id?assetById[draft.left_accent_asset_id]:undefined)
  const rightAccent=assetGlyph(draft.right_accent_asset_id?assetById[draft.right_accent_asset_id]:undefined)
  const tagFont=draft.font_asset_id?assetById[draft.font_asset_id]:undefined

  function pickTag(tag:CharacterCustomTag){
    setSelectedId(tag.id);setNotice(null);setError(null);setDraft({
      label:tag.label,style_asset_id:tag.style_asset_id,font_asset_id:tag.font_asset_id,left_accent_asset_id:tag.left_accent_asset_id,
      right_accent_asset_id:tag.right_accent_asset_id,shape:tag.shape,fill_mode:tag.fill_mode,background_color:tag.background_color,
      background_color_2:tag.background_color_2,text_color:tag.text_color,border_color:tag.border_color,glow_color:tag.glow_color,
      text_shadow:tag.text_shadow,glow_enabled:tag.glow_enabled,outline_enabled:tag.outline_enabled,motion_style:tag.motion_style,visible:tag.visible,
    })
  }

  function newTag(){setSelectedId(null);setDraft(freshDraft());setNotice(null);setError(null)}

  async function save(){
    const client=supabase
    if(!client||!activeCharacter||!plus||!draft.label.trim())return
    setWorking('save');setError(null);setNotice(null)
    const payload={...draft,label:draft.label.trim(),glow_color:draft.glow_enabled?draft.glow_color:null}
    const result=selectedId
      ?await client.from('character_custom_tags').update(payload).eq('id',selectedId).eq('character_id',activeCharacter.id)
      :await client.from('character_custom_tags').insert({...payload,character_id:activeCharacter.id,account_id:activeCharacter.account_id,sort_order:tags.length})
    setWorking(null)
    if(result.error){setError(result.error.message);return}
    setNotice(selectedId?'Tag saved.':'Tag created.')
    await load()
  }

  async function activate(tagId:string){
    const client=supabase;if(!client||!plus)return
    setWorking(`activate:${tagId}`);setError(null)
    const result=await client.rpc('set_my_character_custom_tag_active',{p_tag_id:tagId})
    setWorking(null)
    if(result.error){setError(result.error.message);return}
    setNotice('Active mini-profile tag updated.');await load()
  }

  async function remove(tagId:string){
    const client=supabase;if(!client)return
    setWorking(`delete:${tagId}`);setError(null)
    const result=await client.from('character_custom_tags').delete().eq('id',tagId).eq('character_id',activeCharacter?.id??'')
    setWorking(null)
    if(result.error){setError(result.error.message);return}
    setNotice('Tag removed.');setSelectedId(null);await load()
  }

  function close(){window.location.hash='#/hanami-plus/social-identity-studio'}
  if(!open||!activeCharacter)return null

  return <div className="tag-designer-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)close()}}>
    <section className="tag-designer-window" role="dialog" aria-modal="true" aria-label="Hanami+ User Tag Designer">
      <header className="tag-designer-titlebar"><div><span>HANAMI+ · SOCIAL IDENTITY</span><strong>User Tag Designer</strong></div><button type="button" onClick={close} aria-label="Close Tag Designer">×</button></header>
      <div className="tag-designer-layout">
        <aside className="tag-designer-library">
          <div><span className="eyebrow">SAVED TAGS</span><strong>{tags.length}/10</strong></div>
          <button className="tag-new-button" type="button" disabled={!plus||tags.length>=10} onClick={newTag}>＋ New Tag</button>
          {loading?<p>Loading tags…</p>:tags.length===0?<p>No saved tags yet.</p>:tags.map(tag=><button type="button" key={tag.id} className={`tag-library-row ${tag.id===selectedId?'selected':''}`} onClick={()=>pickTag(tag)}>
            <span className={`tag-mini-swatch shape-${tag.shape}`} style={{background:tag.background_color,borderColor:tag.border_color,color:tag.text_color}}>{tag.label.slice(0,2)}</span>
            <span><strong>{tag.label}</strong><small>{tag.is_active?'Active on mini profile':tag.visible?'Saved · visible':'Saved · hidden'}</small></span>
          </button>)}
          <small className="tag-designer-entitlement">{plus?'Hanami+ editing is active.':'Saved tags remain visible, but editing is locked until Hanami+ is active again.'}</small>
        </aside>

        <div className="tag-designer-main">
          <section className="tag-preview-stage">
            <div><span className="eyebrow">LIVE PREVIEW</span><p>Decorative tags sit beside your official school role. They never replace staff or student permissions.</p></div>
            <div className={`user-tag-preview shape-${draft.shape} motion-${draft.motion_style}`} style={tagPreviewStyle(draft,tagFont)}>
              {leftAccent&&<span aria-hidden="true">{leftAccent}</span>}<strong>{draft.label||'your tag'}</strong>{rightAccent&&<span aria-hidden="true">{rightAccent}</span>}
            </div>
            <div className="tag-reference-line"><strong>{activeCharacter.display_name||activeCharacter.first_name||'Hanami Student'}</strong><span className="official-role-chip">{activeCharacter.school_role?.replaceAll('_',' ')||'student'}</span><span className="decorative-tag-chip">decorative tag</span></div>
          </section>

          {error&&<div className="identity-notice error">{error}</div>}{notice&&<div className="identity-notice success">{notice}</div>}
          <section className="tag-designer-controls">
            <article><span className="eyebrow">TEXT & SHAPE</span><label>Tag text<input maxLength={24} disabled={!plus} value={draft.label} onChange={e=>setDraft({...draft,label:e.target.value})}/></label><label>Shape<select disabled={!plus} value={draft.shape} onChange={e=>setDraft({...draft,shape:e.target.value as Draft['shape']})}><option value="pill">Pill</option><option value="ribbon">Ribbon</option><option value="plaque">Plaque</option><option value="bubble">Bubble</option><option value="lace">Lace</option><option value="heart">Heart</option><option value="label">Label</option></select></label><label>Style asset<select disabled={!plus} value={draft.style_asset_id??''} onChange={e=>setDraft({...draft,style_asset_id:e.target.value||null})}><option value="">Custom colors only</option>{tagStyles.map(asset=><option key={asset.asset_id} disabled={!asset.can_use} value={asset.asset_id}>{asset.can_use?'':'🔒 '}{asset.name}</option>)}</select></label><label>Font<select disabled={!plus} value={draft.font_asset_id??''} onChange={e=>setDraft({...draft,font_asset_id:e.target.value||null})}><option value="">Hanami default</option>{fonts.map(asset=><option key={asset.asset_id} disabled={!asset.can_use} value={asset.asset_id}>{asset.can_use?'':'🔒 '}{asset.name}</option>)}</select></label></article>
            <article><span className="eyebrow">COLOR</span><label>Fill<select disabled={!plus} value={draft.fill_mode} onChange={e=>setDraft({...draft,fill_mode:e.target.value as Draft['fill_mode']})}><option value="solid">Solid</option><option value="gradient">Gradient</option><option value="transparent">Transparent</option></select></label><div className="tag-color-grid"><label>Background<input type="color" disabled={!plus} value={draft.background_color} onChange={e=>setDraft({...draft,background_color:e.target.value})}/></label><label>Second color<input type="color" disabled={!plus} value={draft.background_color_2} onChange={e=>setDraft({...draft,background_color_2:e.target.value})}/></label><label>Text<input type="color" disabled={!plus} value={draft.text_color} onChange={e=>setDraft({...draft,text_color:e.target.value})}/></label><label>Border<input type="color" disabled={!plus} value={draft.border_color} onChange={e=>setDraft({...draft,border_color:e.target.value})}/></label></div><label className="tag-check"><input type="checkbox" disabled={!plus} checked={draft.outline_enabled} onChange={e=>setDraft({...draft,outline_enabled:e.target.checked})}/> Border outline</label><label className="tag-check"><input type="checkbox" disabled={!plus} checked={draft.text_shadow} onChange={e=>setDraft({...draft,text_shadow:e.target.checked})}/> Text shadow</label></article>
            <article><span className="eyebrow">ACCENTS & MOTION</span><label>Left accent<select disabled={!plus} value={draft.left_accent_asset_id??''} onChange={e=>setDraft({...draft,left_accent_asset_id:e.target.value||null})}><option value="">None</option>{accents.map(asset=><option key={asset.asset_id} disabled={!asset.can_use} value={asset.asset_id}>{asset.can_use?'':'🔒 '}{assetGlyph(asset)} {asset.name}</option>)}</select></label><label>Right accent<select disabled={!plus} value={draft.right_accent_asset_id??''} onChange={e=>setDraft({...draft,right_accent_asset_id:e.target.value||null})}><option value="">None</option>{accents.map(asset=><option key={asset.asset_id} disabled={!asset.can_use} value={asset.asset_id}>{asset.can_use?'':'🔒 '}{assetGlyph(asset)} {asset.name}</option>)}</select></label><label>Motion<select disabled={!plus} value={draft.motion_style} onChange={e=>setDraft({...draft,motion_style:e.target.value as Draft['motion_style']})}><option value="none">None</option><option value="shimmer">Shimmer</option><option value="sparkle">Sparkle</option><option value="pulse">Pulse</option><option value="float">Float</option></select></label><label className="tag-check"><input type="checkbox" disabled={!plus} checked={draft.glow_enabled} onChange={e=>setDraft({...draft,glow_enabled:e.target.checked})}/> Glow</label>{draft.glow_enabled&&<label>Glow color<input type="color" disabled={!plus} value={draft.glow_color??'#f2a9c2'} onChange={e=>setDraft({...draft,glow_color:e.target.value})}/></label>}<label className="tag-check"><input type="checkbox" disabled={!plus} checked={draft.visible} onChange={e=>setDraft({...draft,visible:e.target.checked})}/> Show on profile surfaces</label></article>
          </section>

          <footer className="tag-designer-actions"><div>{selected?.is_active?<strong>Currently active on mini profiles and supported chat surfaces.</strong>:<span>Select one saved tag as your active decorative tag.</span>}</div><div>{selectedId&&<button className="danger" type="button" disabled={working===`delete:${selectedId}`} onClick={()=>void remove(selectedId)}>Delete</button>}{selectedId&&!selected?.is_active&&<button type="button" disabled={!plus||working===`activate:${selectedId}`} onClick={()=>void activate(selectedId)}>Set Active</button>}<button className="primary" type="button" disabled={!plus||working==='save'||!draft.label.trim()} onClick={()=>void save()}>{working==='save'?'Saving…':selectedId?'Save Changes':'Create Tag'}</button></div></footer>
        </div>
      </div>
    </section>
  </div>
}

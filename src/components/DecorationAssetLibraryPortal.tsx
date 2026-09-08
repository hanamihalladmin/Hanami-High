import { useCallback,useEffect,useMemo,useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { CustomizationAssetAccessRow,CustomizationAssetType } from '../types/database-customization-assets'
import { DecorationAssetArt } from './DecorationAssetArt'

const ASSET_HASH='#/hanami-plus/asset-library'
const types:CustomizationAssetType[]=['sticker','emoji','divider','icon','decorative_accent']
type TypeFilter='all'|CustomizationAssetType
type Space='locker'|'desk'|'phone'|'desktop'

function payloadText(asset:CustomizationAssetAccessRow,key:string,fallback=''){const value=asset.asset_payload?.[key];return typeof value==='string'?value:fallback}
function labelType(type:string){return type==='decorative_accent'?'charms':type.replaceAll('_',' ')}

export function DecorationAssetLibraryPortal(){
  const {account,activeCharacter}=useIdentity()
  const [open,setOpen]=useState(()=>window.location.hash===ASSET_HASH)
  const [inPlus,setInPlus]=useState(()=>window.location.hash.startsWith('#/hanami-plus/'))
  const [assets,setAssets]=useState<CustomizationAssetAccessRow[]>([])
  const [query,setQuery]=useState('')
  const [type,setType]=useState<TypeFilter>('all')
  const [collection,setCollection]=useState('all')
  const [space,setSpace]=useState<Space>('locker')
  const [favoritesOnly,setFavoritesOnly]=useState(false)
  const [loading,setLoading]=useState(false)
  const [working,setWorking]=useState<string|null>(null)
  const [error,setError]=useState<string|null>(null)
  const [notice,setNotice]=useState<string|null>(null)

  useEffect(()=>{const sync=()=>{setOpen(window.location.hash===ASSET_HASH);setInPlus(window.location.hash.startsWith('#/hanami-plus/'))};window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync)},[])

  const load=useCallback(async()=>{
    const client=supabase;if(!client||!account||!activeCharacter||!open)return
    setLoading(true);setError(null)
    const result=await client.rpc('my_customization_asset_access',{p_asset_type:null})
    setLoading(false)
    if(result.error){setError(result.error.message);return}
    setAssets((result.data??[]).filter(asset=>types.includes(asset.asset_type)))
  },[account,activeCharacter,open])
  useEffect(()=>{void load()},[load])

  const collections=useMemo(()=>Array.from(new Set(assets.map(asset=>asset.collection_name))).sort(),[assets])
  const visible=useMemo(()=>{
    const needle=query.trim().toLowerCase()
    return assets.filter(asset=>(type==='all'||asset.asset_type===type)&&(collection==='all'||asset.collection_name===collection)&&(!favoritesOnly||asset.is_favorite)&&(!needle||`${asset.name} ${asset.description} ${asset.collection_name} ${asset.asset_type}`.toLowerCase().includes(needle)))
  },[assets,type,collection,favoritesOnly,query])
  const counts=useMemo(()=>Object.fromEntries(types.map(item=>[item,assets.filter(asset=>asset.asset_type===item).length])),[assets])

  async function toggleFavorite(asset:CustomizationAssetAccessRow){
    const client=supabase;if(!client||!account)return
    setWorking(`fav:${asset.asset_id}`);setError(null)
    const result=asset.is_favorite?await client.from('account_customization_asset_favorites').delete().eq('account_id',account.id).eq('asset_id',asset.asset_id):await client.from('account_customization_asset_favorites').insert({account_id:account.id,asset_id:asset.asset_id})
    setWorking(null);if(result.error){setError(result.error.message);return}
    setAssets(current=>current.map(item=>item.asset_id===asset.asset_id?{...item,is_favorite:!item.is_favorite}:item))
  }
  async function copyGlyph(asset:CustomizationAssetAccessRow){
    const glyph=payloadText(asset,'glyph','✦')
    try{await navigator.clipboard.writeText(glyph);setNotice(`${asset.name} copied. Paste it into a blog, guestbook, message, status, or tag.`);setError(null)}catch{setError('Your browser blocked clipboard access. Select the preview glyph and copy it manually.')}
  }
  async function addProfile(asset:CustomizationAssetAccessRow){
    const client=supabase;if(!client||!asset.can_use)return
    setWorking(`profile:${asset.asset_id}`);setError(null);setNotice(null)
    const result=await client.rpc('add_my_customization_asset_to_profile',{p_asset_id:asset.asset_id})
    setWorking(null);if(result.error){setError(result.error.message);return}
    setNotice(`${asset.name} was added to this character’s Profile Studio.`)
  }
  async function addSpace(asset:CustomizationAssetAccessRow){
    const client=supabase;if(!client||!asset.can_use||asset.asset_type==='divider')return
    setWorking(`space:${asset.asset_id}`);setError(null);setNotice(null)
    const result=await client.rpc('add_my_customization_asset_to_space',{p_asset_id:asset.asset_id,p_space_kind:space})
    setWorking(null);if(result.error){setError(result.error.message);return}
    setNotice(`${asset.name} was placed in the ${space}.`)
  }
  function close(){window.location.hash='#/hanami-plus/overview'}

  if(!open)return inPlus?<button className="decoration-library-launcher" type="button" onClick={()=>{window.location.hash=ASSET_HASH}}><span>✦</span><b>Decorations</b></button>:null
  if(!account||!activeCharacter)return null

  return <div className="decoration-library-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)close()}}>
    <section className="decoration-library-window" role="dialog" aria-modal="true" aria-label="Hanami+ Decorative Asset Library">
      <header className="decoration-library-titlebar"><div><span>HANAMI+ · COLLECTIBLES</span><strong>Decoration Library</strong></div><button type="button" onClick={close} aria-label="Close Decoration Library">×</button></header>
      <div className="decoration-library-body">
        <section className="decoration-library-hero"><div><span className="eyebrow">STICKERS · EMOJIS · DIVIDERS · ICONS · CHARMS</span><h1>Your little box of shiny things.</h1><p>Collect original Hanami decorations and reuse them across profiles, writing, guestbooks, tags, and Personal Spaces. Standard pieces stay usable without Hanami+; premium pieces unlock while your membership is active.</p></div><div className="decoration-library-summary"><strong>{assets.length}</strong><span>decorations</span><small>{assets.filter(asset=>asset.can_use).length} available now · {assets.filter(asset=>asset.is_favorite).length} favorites</small></div></section>
        {error&&<div className="identity-notice error">{error}</div>}{notice&&<div className="identity-notice success">{notice}</div>}
        <section className="decoration-library-toolbar"><label className="decoration-search">Search<input value={query} onChange={event=>setQuery(event.target.value)} placeholder="moon, ribbon, school, kawaii…"/></label><label>Collection<select value={collection} onChange={event=>setCollection(event.target.value)}><option value="all">All collections</option>{collections.map(item=><option key={item} value={item}>{item}</option>)}</select></label><label>Personal Space<select value={space} onChange={event=>setSpace(event.target.value as Space)}><option value="locker">Locker</option><option value="desk">Desk</option><option value="phone">Phone</option><option value="desktop">Desktop</option></select></label><button type="button" className={favoritesOnly?'active':''} onClick={()=>setFavoritesOnly(value=>!value)}>♡ Favorites</button></section>
        <nav className="decoration-type-tabs"><button type="button" className={type==='all'?'active':''} onClick={()=>setType('all')}>All <span>{assets.length}</span></button>{types.map(item=><button type="button" key={item} className={type===item?'active':''} onClick={()=>setType(item)}>{labelType(item)} <span>{counts[item]||0}</span></button>)}</nav>
        {loading?<div className="decoration-library-loading">Opening your decoration box…</div>:visible.length===0?<div className="decoration-library-empty">No decorations match these filters.</div>:<div className="decoration-library-grid">{visible.map(asset=>{
          const canProfile=['sticker','divider','icon','decorative_accent'].includes(asset.asset_type)
          const canSpace=['sticker','emoji','icon','decorative_accent'].includes(asset.asset_type)
          return <article className={`decoration-card rarity-${asset.rarity} ${asset.can_use?'available':'locked'}`} key={asset.asset_id}>
            <div className="decoration-card-art"><DecorationAssetArt payload={asset.asset_payload} animated={asset.animated} wide={asset.asset_type==='divider'} label={asset.name}/>{asset.animated&&<span className="animated-chip">ANIMATED</span>}{!asset.can_use&&<span className="locked-chip">LOCKED</span>}</div>
            <div className="decoration-card-copy"><span>{asset.collection_name}</span><h3>{asset.name}</h3><p>{asset.description}</p><div className="decoration-meta"><b>{labelType(asset.asset_type)}</b><b>{asset.rarity.replaceAll('_',' ')}</b><b>{asset.access_kind==='hanami_plus'?'Hanami+':asset.access_kind}</b></div></div>
            <div className="decoration-card-actions"><button type="button" disabled={working===`fav:${asset.asset_id}`} onClick={()=>void toggleFavorite(asset)}>{asset.is_favorite?'♥':'♡'}</button><button type="button" onClick={()=>void copyGlyph(asset)}>Copy</button>{canProfile&&<button type="button" disabled={!asset.can_use||working===`profile:${asset.asset_id}`} onClick={()=>void addProfile(asset)}>{working===`profile:${asset.asset_id}`?'Adding…':'＋ Profile'}</button>}{canSpace&&<button type="button" disabled={!asset.can_use||working===`space:${asset.asset_id}`} onClick={()=>void addSpace(asset)}>{working===`space:${asset.asset_id}`?'Placing…':`＋ ${space}`}</button>}</div>
          </article>})}</div>}
        <footer className="decoration-library-footer"><div><strong>Use your collection anywhere.</strong><span>Copy glyphs for text surfaces, or place supported collectibles directly into Profile Studio and Personal Spaces.</span></div><div><a href="#/profile/profile-studio">Open Profile Studio →</a><a href={`#/profile/personal-spaces/${space}`}>Open {space} →</a></div></footer>
      </div>
    </section>
  </div>
}

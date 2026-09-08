import { useCallback,useEffect,useMemo,useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { HanamiPlusHubSnapshot } from '../types/database-rewards'
import type { CreatorProfile,CreatorThemeListing } from '../types/database-creator-marketplace'
import type { CreatorThemeLineage,CreatorThemeRemixSession } from '../types/database-theme-remixing'
import { ShellTopbar } from './ShellTopbar'

type Props={onSearch:()=>void;onNotifications:()=>void;unreadCount:number}

function slugify(value:string){return `${value.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,34)||'remix'}-${Math.random().toString(36).slice(2,6)}`}

export function ThemeRemixLab({onSearch,onNotifications,unreadCount}:Props){
 const {account,activeCharacter}=useIdentity()
 const [snapshot,setSnapshot]=useState<HanamiPlusHubSnapshot|null>(null)
 const [listings,setListings]=useState<CreatorThemeListing[]>([])
 const [creators,setCreators]=useState<CreatorProfile[]>([])
 const [lineage,setLineage]=useState<CreatorThemeLineage[]>([])
 const [session,setSession]=useState<CreatorThemeRemixSession|null>(null)
 const [loading,setLoading]=useState(true)
 const [working,setWorking]=useState<string|null>(null)
 const [error,setError]=useState<string|null>(null)
 const [notice,setNotice]=useState<string|null>(null)
 const [query,setQuery]=useState('')
 const [draft,setDraft]=useState({title:'',description:'',tags:''})

 const load=useCallback(async()=>{
  const client=supabase;if(!client||!account||!activeCharacter)return
  setLoading(true);setError(null)
  const [hub,listingResult,creatorResult,lineageResult,sessionResult]=await Promise.all([
   client.rpc('current_hanami_plus_hub'),
   client.from('creator_theme_listings').select('*').eq('state','published').in('visibility',['public','unlisted']).order('published_at',{ascending:false}),
   client.from('creator_profiles').select('*').order('display_name'),
   client.from('creator_theme_lineage').select('*').order('created_at',{ascending:false}),
   client.from('creator_theme_remix_sessions').select('*').eq('character_id',activeCharacter.id).maybeSingle(),
  ])
  const first=hub.error||listingResult.error||creatorResult.error||lineageResult.error||sessionResult.error
  if(first){setLoading(false);setError(first.message);return}
  setSnapshot(hub.data?.[0]??null);setListings(listingResult.data??[]);setCreators(creatorResult.data??[]);setLineage(lineageResult.data??[]);setSession(sessionResult.data);setLoading(false)
 },[account,activeCharacter])
 useEffect(()=>{void load()},[load])

 const active=Boolean(snapshot?.active)
 const filtered=useMemo(()=>{const needle=query.trim().toLowerCase();if(!needle)return listings;return listings.filter(row=>row.title.toLowerCase().includes(needle)||(row.description??'').toLowerCase().includes(needle)||row.tags.some(tag=>tag.includes(needle)))},[query,listings])
 const ownRemixes=useMemo(()=>lineage.filter(row=>listings.some(listing=>listing.id===row.listing_id&&listing.author_account_id===account?.id)),[lineage,listings,account?.id])
 const sourceCreator=(listing:CreatorThemeListing)=>creators.find(row=>row.account_id===listing.author_account_id)?.display_name||'Hanami Creator'

 async function begin(listing:CreatorThemeListing){
  const client=supabase;if(!client||!active)return
  setWorking(`begin:${listing.id}`);setError(null);setNotice(null)
  const result=await client.rpc('begin_creator_theme_remix',{p_listing_id:listing.id})
  setWorking(null);if(result.error)return setError(result.error.message)
  setDraft({title:`${listing.title} Remix`,description:`A remix of ${listing.title} by ${sourceCreator(listing)}.`,tags:[...listing.tags,'remix'].slice(0,12).join(', ')})
  setNotice(`${listing.title} imported into Profile Studio. Your previous design was backed up first.`);await load()
 }

 async function restore(){const client=supabase;if(!client||!session)return;setWorking('restore');setError(null);const result=await client.rpc('restore_creator_theme_remix_backup',{});setWorking(null);if(result.error)return setError(result.error.message);setNotice('Your pre-remix Profile Studio design has been restored.');await load()}

 async function createListing(){
  const client=supabase;if(!client||!active||!session||session.session_state!=='active'||!draft.title.trim())return
  const tags=draft.tags.split(',').map(tag=>tag.trim().toLowerCase()).filter(Boolean).slice(0,12)
  setWorking('create');setError(null);setNotice(null)
  const result=await client.rpc('create_creator_remix_listing',{p_title:draft.title.trim(),p_slug:slugify(draft.title),p_description:draft.description.trim()||null,p_tags:tags})
  setWorking(null);if(result.error)return setError(result.error.message)
  setNotice('Attributed remix listing created. Finish editing in Profile Studio, then publish it from Creator Studio.');await load()
 }

 if(!account||!activeCharacter)return null
 return <main className="theme-remix-lab-page">
  <ShellTopbar eyebrow="HANAMI+ · CREATOR MARKETPLACE" title="Remix Lab" onSearch={onSearch} onNotifications={onNotifications} unreadCount={unreadCount}/>
  <section className="remix-lab-hero"><div><span className="eyebrow">REMIX WITH CREDIT</span><h1>Build on community themes without erasing where they came from.</h1><p>Starting a remix backs up your current Profile Studio design, imports the selected published version, and permanently carries the source creator/listing/version into the derivative listing.</p></div><div className={active?'remix-plus active':'remix-plus'}><span>{active?'REMIX TOOLS UNLOCKED':'BROWSE ONLY'}</span><strong>{active?'Hanami+':'Hanami'}</strong><small>Browsing attribution is standard. Importing and creating a remix requires Hanami+.</small></div></section>
  <nav className="remix-lab-tabs"><a href="#/hanami-plus/marketplace">Theme Marketplace</a><a href="#/hanami-plus/creator-studio">Creator Studio</a><a className="active" href="#/hanami-plus/remix-lab">Remix Lab</a></nav>
  {error&&<div className="identity-notice error">{error}</div>}{notice&&<div className="identity-notice success">{notice}</div>}
  {loading?<section className="remix-loading">Opening remix library…</section>:<div className="remix-lab-layout">
   <section className="remix-source-column"><header><div><span className="eyebrow">SOURCE THEMES</span><h2>Choose a starting point</h2></div><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search themes or tags…"/></header><div className="remix-source-grid">{filtered.map(listing=>{const sourceLineage=lineage.find(row=>row.listing_id===listing.id);return <article key={listing.id}><div className="remix-source-preview" style={listing.preview_image_url?{backgroundImage:`url(${listing.preview_image_url})`}:undefined}><span>v{listing.current_version}</span></div><div><span className="eyebrow">{listing.tags.slice(0,3).join(' · ')||'PROFILE THEME'}</span><h3>{listing.title}</h3><p>{listing.description||'A published Hanami community theme.'}</p><strong>by {sourceCreator(listing)}</strong>{sourceLineage&&<small className="remix-source-credit">↳ {sourceLineage.attribution_text}</small>}<button type="button" disabled={!active||working===`begin:${listing.id}`} onClick={()=>void begin(listing)}>{working===`begin:${listing.id}`?'Importing…':'Remix in Profile Studio'}</button></div></article>})}</div></section>
   <aside className="remix-session-column">
    <section><span className="eyebrow">ACTIVE REMIX</span>{!session||session.session_state==='restored'?<div className="remix-empty"><strong>No active remix session.</strong><p>Choose a source theme. Hanami will save a backup before importing anything.</p></div>:<><h2>{session.source_title}</h2><dl><div><dt>state</dt><dd>{session.session_state}</dd></div><div><dt>source version</dt><dd>{session.source_version_id.slice(0,8)}</dd></div><div><dt>started</dt><dd>{new Date(session.started_at).toLocaleDateString()}</dd></div></dl><div className="remix-session-actions"><a href="#/profile/profile-studio">Open Profile Studio →</a><button type="button" disabled={working==='restore'} onClick={()=>void restore()}>{working==='restore'?'Restoring…':'Restore Previous Design'}</button></div></>}</section>
    {session?.session_state==='active'&&<section><span className="eyebrow">CREATE DERIVATIVE LISTING</span><p>Create the attributed draft after you have begun the remix. You can keep editing before publishing.</p><label>Title<input maxLength={120} value={draft.title} onChange={e=>setDraft(current=>({...current,title:e.target.value}))}/></label><label>Description<textarea rows={3} value={draft.description} onChange={e=>setDraft(current=>({...current,description:e.target.value}))}/></label><label>Tags<input value={draft.tags} onChange={e=>setDraft(current=>({...current,tags:e.target.value}))} placeholder="pink, school, scrapbook"/></label><button className="primary" type="button" disabled={!active||working==='create'||!draft.title.trim()} onClick={()=>void createListing()}>{working==='create'?'Creating…':'Create Remix Listing'}</button></section>}
    <section><span className="eyebrow">MY ATTRIBUTED REMIXES</span>{ownRemixes.length===0?<p>No published remix lineage to show yet.</p>:<div className="remix-lineage-list">{ownRemixes.map(row=>{const listing=listings.find(item=>item.id===row.listing_id);return <article key={row.listing_id}><strong>{listing?.title||'Remix listing'}</strong><small>{row.attribution_text}</small><span>generation {row.remix_depth}</span></article>})}</div>}</section>
   </aside>
  </div>}
 </main>
}

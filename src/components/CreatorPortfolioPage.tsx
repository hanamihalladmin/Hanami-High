import { useCallback,useEffect,useMemo,useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { CreatorCollection,CreatorThemeListing } from '../types/database-creator-marketplace'
import type { CreatorThemeLineage } from '../types/database-theme-remixing'
import type { CreatorWidgetKit } from '../types/database-widget-kits'
import type { CreatorPortfolioDirectoryRow,CreatorPortfolioSummary } from '../types/database-creator-portfolios'
import { ShellTopbar } from './ShellTopbar'

type Props={targetId?:string;onSearch:()=>void;onNotifications:()=>void;unreadCount:number}

function formatDate(value:string){return new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',month:'short',year:'numeric'}).format(new Date(value))}
function creatorHash(accountId:string){return `#/hanami-plus/creators/${encodeURIComponent(accountId)}`}

export function CreatorPortfolioPage({targetId,onSearch,onNotifications,unreadCount}:Props){
 const {account}=useIdentity()
 const [directory,setDirectory]=useState<CreatorPortfolioDirectoryRow[]>([])
 const [summary,setSummary]=useState<CreatorPortfolioSummary|null>(null)
 const [themes,setThemes]=useState<CreatorThemeListing[]>([])
 const [kits,setKits]=useState<CreatorWidgetKit[]>([])
 const [collections,setCollections]=useState<CreatorCollection[]>([])
 const [lineage,setLineage]=useState<CreatorThemeLineage[]>([])
 const [following,setFollowing]=useState(false)
 const [query,setQuery]=useState('')
 const [loading,setLoading]=useState(true)
 const [working,setWorking]=useState(false)
 const [error,setError]=useState<string|null>(null)

 const loadDirectory=useCallback(async()=>{
  const client=supabase;if(!client)return
  setLoading(true);setError(null)
  const result=await client.rpc('list_public_creator_portfolios',{})
  setLoading(false);if(result.error){setError(result.error.message);return}setDirectory(result.data??[])
 },[])
 const loadPortfolio=useCallback(async()=>{
  const client=supabase;if(!client||!targetId||!account)return
  setLoading(true);setError(null)
  const summaryResult=await client.rpc('creator_portfolio_summary',{p_creator_account_id:targetId})
  if(summaryResult.error||!summaryResult.data?.[0]){setLoading(false);setError(summaryResult.error?.message||'Creator portfolio unavailable.');return}
  const nextSummary=summaryResult.data[0]
  const [themeResult,kitResult,collectionResult,followResult]=await Promise.all([
   client.from('creator_theme_listings').select('*').eq('author_account_id',targetId).eq('state','published').in('visibility',['public','unlisted']).order('published_at',{ascending:false}),
   client.from('creator_widget_kits').select('*').eq('author_account_id',targetId).eq('state','published').in('visibility',['public','unlisted']).order('published_at',{ascending:false}),
   client.from('creator_collections').select('*').eq('owner_account_id',targetId).in('visibility',['public','unlisted']).order('updated_at',{ascending:false}),
   client.from('creator_follows').select('creator_account_id').eq('follower_account_id',account.id).eq('creator_account_id',targetId).maybeSingle(),
  ])
  const first=themeResult.error||kitResult.error||collectionResult.error||followResult.error
  if(first){setLoading(false);setError(first.message);return}
  const nextThemes=themeResult.data??[]
  let nextLineage:CreatorThemeLineage[]=[]
  if(nextThemes.length){const lineageResult=await client.from('creator_theme_lineage').select('*').in('listing_id',nextThemes.map(row=>row.id));if(!lineageResult.error)nextLineage=lineageResult.data??[]}
  setSummary(nextSummary);setThemes(nextThemes);setKits(kitResult.data??[]);setCollections(collectionResult.data??[]);setLineage(nextLineage);setFollowing(Boolean(followResult.data));setLoading(false)
 },[targetId,account])
 useEffect(()=>{if(targetId)void loadPortfolio();else void loadDirectory()},[targetId,loadPortfolio,loadDirectory])

 const filtered=useMemo(()=>{const needle=query.trim().toLowerCase();return directory.filter(row=>!needle||row.display_name.toLowerCase().includes(needle)||row.creator_slug.toLowerCase().includes(needle)||(row.bio??'').toLowerCase().includes(needle))},[directory,query])
 async function toggleFollow(){const client=supabase;if(!client||!account||!summary||summary.account_id===account.id)return;setWorking(true);const result=following?await client.from('creator_follows').delete().eq('follower_account_id',account.id).eq('creator_account_id',summary.account_id):await client.from('creator_follows').insert({follower_account_id:account.id,creator_account_id:summary.account_id});setWorking(false);if(result.error){setError(result.error.message);return}await loadPortfolio()}

 return <main className="creator-portfolio-page">
  <ShellTopbar eyebrow="HANAMI CREATOR COMMUNITY" title={targetId?(summary?.display_name||'Creator Portfolio'):'Creators'} onSearch={onSearch} onNotifications={onNotifications} unreadCount={unreadCount}/>
  {error&&<div className="identity-notice error">{error}</div>}
  {loading?<section className="creator-portfolio-loading">Opening creator portfolio…</section>:!targetId?<>
   <section className="creator-directory-hero"><div><span className="eyebrow">PUBLIC CREATOR DIRECTORY</span><h1>Meet the students shaping Hanami’s visual culture.</h1><p>Browse creators who publish profile themes, remixes, and reusable components. Creator portfolios are public only when the creator chooses public portfolio visibility.</p></div><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search creators…"/></section>
   <section className="creator-directory-grid">{filtered.length===0?<div className="creator-directory-empty">No public creator portfolios match this search.</div>:filtered.map(row=><a href={creatorHash(row.account_id)} key={row.account_id}><div className="creator-directory-banner" style={row.banner_url?{backgroundImage:`url(${row.banner_url})`}:undefined}/><div className="creator-directory-identity">{row.avatar_url?<img src={row.avatar_url} alt=""/>:<span>✦</span>}<div><h2>{row.display_name}</h2><small>@{row.creator_slug}</small></div></div><p>{row.bio||'Hanami creator portfolio.'}</p><footer><span>♡ {row.follower_count}</span><span>{row.published_theme_count} themes</span><span>{row.published_kit_count} kits</span>{row.remix_count>0&&<span>{row.remix_count} remixes</span>}</footer></a>)}</section>
  </>:summary?<>
   <section className="creator-portfolio-hero" style={summary.banner_url?{backgroundImage:`linear-gradient(rgba(255,250,245,.78),rgba(255,250,245,.92)),url(${summary.banner_url})`}:undefined}><div className="creator-portfolio-avatar">{summary.avatar_url?<img src={summary.avatar_url} alt=""/>:<span>✦</span>}</div><div className="creator-portfolio-heading"><span className="eyebrow">@{summary.creator_slug}</span><h1>{summary.display_name}</h1><p>{summary.bio||'Hanami creator portfolio.'}</p><small>Creating since {formatDate(summary.joined_at)}</small></div><div className="creator-portfolio-actions">{summary.primary_character_id&&<a href={`#/profile/view-profile/${encodeURIComponent(summary.primary_character_id)}`}>View character page</a>}{summary.account_id!==account?.id&&<button type="button" disabled={working} onClick={()=>void toggleFollow()}>{working?'Working…':following?'Following':'Follow creator'}</button>}</div></section>
   <section className="creator-portfolio-stats"><div><strong>{summary.follower_count}</strong><span>followers</span></div><div><strong>{summary.published_theme_count}</strong><span>themes</span></div><div><strong>{summary.published_kit_count}</strong><span>components</span></div><div><strong>{summary.remix_count}</strong><span>remixes</span></div><div><strong>{summary.public_collection_count}</strong><span>collections</span></div></section>
   <div className="creator-portfolio-content">
    <section><header><span className="eyebrow">PUBLISHED THEMES & REMIXES</span><h2>Profile designs</h2></header><div className="creator-portfolio-card-grid">{themes.length===0?<p className="creator-portfolio-empty">No published themes yet.</p>:themes.map(theme=>{const source=lineage.find(row=>row.listing_id===theme.id);return <article key={theme.id}><div className="creator-work-preview" style={theme.preview_image_url?{backgroundImage:`url(${theme.preview_image_url})`}:undefined}><span>v{theme.current_version}</span></div><h3>{theme.title}</h3><p>{theme.description||'A Hanami profile theme.'}</p>{source&&<small className="creator-remix-credit">↳ {source.attribution_text}</small>}<footer><span>♡ {theme.favorite_count}</span><span>↧ {theme.download_count}</span><a href="#/hanami-plus/remix-lab">Open Remix Lab</a></footer></article>})}</div></section>
    <section><header><span className="eyebrow">COMPONENT LIBRARY</span><h2>Widget kits</h2></header><div className="creator-portfolio-kit-list">{kits.length===0?<p className="creator-portfolio-empty">No published component kits yet.</p>:kits.map(kit=><article key={kit.id}><span>{kit.kit_kind==='music'?'♫':kit.kit_kind==='photos'?'▧':kit.kit_kind==='journal'?'✎':'✦'}</span><div><h3>{kit.title}</h3><p>{kit.description||'Reusable Profile Studio component.'}</p><small>v{kit.current_version} · ↧ {kit.install_count} · ♡ {kit.favorite_count}</small></div><a href="#/hanami-plus/component-library">Library →</a></article>)}</div></section>
    {collections.length>0&&<section><header><span className="eyebrow">CURATED COLLECTIONS</span><h2>Theme shelves</h2></header><div className="creator-portfolio-collections">{collections.map(collection=><article key={collection.id}><strong>{collection.title}</strong><p>{collection.description||'A creator-curated collection.'}</p><small>{collection.visibility}</small></article>)}</div></section>}
   </div>
  </>:<section className="creator-portfolio-loading">Creator portfolio unavailable.</section>}
 </main>
}

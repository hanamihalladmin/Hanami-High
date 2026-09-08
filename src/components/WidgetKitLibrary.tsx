import { useCallback,useEffect,useMemo,useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { HanamiPlusHubSnapshot } from '../types/database-rewards'
import type { CreatorProfile } from '../types/database-creator-marketplace'
import type { CreatorWidgetKit,CreatorWidgetKitFavorite,InstalledWidgetKitGroup } from '../types/database-widget-kits'
import { ShellTopbar } from './ShellTopbar'

type Props={onSearch:()=>void;onNotifications:()=>void;unreadCount:number}
type ProfileWidgetRow={id:string;widget_type:string;title:string|null;x:number;y:number;width:number;height:number;is_visible:boolean}
type KitKind=CreatorWidgetKit['kit_kind']

const kitKinds:KitKind[]=['mixed','header','links','music','photos','journal','social','club','decorative','utility']
const kindIcon:Record<KitKind,string>={mixed:'✦',header:'▤',links:'↗',music:'♫',photos:'▧',journal:'✎',social:'♡',club:'⚑',decorative:'✿',utility:'◇'}

function slugify(value:string){const base=value.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,38);return `${base||'kit'}-${Math.random().toString(36).slice(2,7)}`}
function displayKind(value:string){return value.replaceAll('-',' ').replace(/\b\w/g,letter=>letter.toUpperCase())}

export function WidgetKitLibrary({onSearch,onNotifications,unreadCount}:Props){
 const {account,activeCharacter}=useIdentity()
 const [snapshot,setSnapshot]=useState<HanamiPlusHubSnapshot|null>(null)
 const [creators,setCreators]=useState<CreatorProfile[]>([])
 const [kits,setKits]=useState<CreatorWidgetKit[]>([])
 const [favorites,setFavorites]=useState<CreatorWidgetKitFavorite[]>([])
 const [widgets,setWidgets]=useState<ProfileWidgetRow[]>([])
 const [installed,setInstalled]=useState<InstalledWidgetKitGroup[]>([])
 const [selected,setSelected]=useState<string[]>([])
 const [query,setQuery]=useState('')
 const [kindFilter,setKindFilter]=useState<'all'|KitKind>('all')
 const [draft,setDraft]=useState<{title:string;description:string;tags:string;kind:KitKind}>({title:'',description:'',tags:'',kind:'mixed'})
 const [working,setWorking]=useState<string|null>(null)
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState<string|null>(null)
 const [notice,setNotice]=useState<string|null>(null)

 const load=useCallback(async()=>{
  const client=supabase;if(!client||!account||!activeCharacter)return
  setLoading(true);setError(null)
  const [hub,creatorResult,kitResult,favoriteResult,widgetResult,installedResult]=await Promise.all([
   client.rpc('current_hanami_plus_hub'),
   client.from('creator_profiles').select('*').order('display_name'),
   client.from('creator_widget_kits').select('*').order('published_at',{ascending:false}).order('updated_at',{ascending:false}),
   client.from('creator_widget_kit_favorites').select('*').eq('account_id',account.id),
   client.from('profile_widgets').select('id,widget_type,title,x,y,width,height,is_visible').eq('character_id',activeCharacter.id).order('y').order('x'),
   client.rpc('my_installed_widget_kit_groups',{}),
  ])
  const first=hub.error||creatorResult.error||kitResult.error||favoriteResult.error||widgetResult.error||installedResult.error
  if(first){setLoading(false);setError(first.message);return}
  setSnapshot(hub.data?.[0]??null);setCreators(creatorResult.data??[]);setKits(kitResult.data??[]);setFavorites(favoriteResult.data??[]);setWidgets(widgetResult.data??[]);setInstalled(installedResult.data??[]);setSelected(current=>current.filter(id=>(widgetResult.data??[]).some(widget=>widget.id===id)));setLoading(false)
 },[account,activeCharacter])
 useEffect(()=>{void load()},[load])

 const plus=Boolean(snapshot?.active)
 const creatorProfile=creators.find(row=>row.account_id===account?.id)??null
 const published=useMemo(()=>kits.filter(kit=>kit.state==='published'&&kit.visibility!=='private'),[kits])
 const ownKits=useMemo(()=>kits.filter(kit=>kit.author_account_id===account?.id),[kits,account?.id])
 const filtered=useMemo(()=>{const needle=query.trim().toLowerCase();return published.filter(kit=>(kindFilter==='all'||kit.kit_kind===kindFilter)&&(!needle||kit.title.toLowerCase().includes(needle)||(kit.description??'').toLowerCase().includes(needle)||kit.tags.some(tag=>tag.includes(needle))))},[published,query,kindFilter])
 const creatorName=(accountId:string)=>creators.find(row=>row.account_id===accountId)?.display_name||'Hanami Creator'

 function toggleWidget(id:string){setSelected(current=>current.includes(id)?current.filter(item=>item!==id):current.length<12?[...current,id]:current)}
 function findSource(group:InstalledWidgetKitGroup){setQuery(group.kit_title);setKindFilter('all');requestAnimationFrame(()=>document.querySelector('.widget-kit-browse')?.scrollIntoView({behavior:'smooth',block:'start'}))}

 async function createKit(){
  const client=supabase;if(!client||!account||!activeCharacter||!plus||!creatorProfile||!draft.title.trim())return
  setWorking('create');setError(null);setNotice(null)
  const result=await client.from('creator_widget_kits').insert({author_account_id:account.id,author_character_id:activeCharacter.id,slug:slugify(draft.title),title:draft.title.trim(),description:draft.description.trim()||null,tags:draft.tags.split(',').map(tag=>tag.trim().toLowerCase()).filter(Boolean).slice(0,12),kit_kind:draft.kind})
  setWorking(null);if(result.error)return setError(result.error.message)
  setDraft({title:'',description:'',tags:'',kind:'mixed'});setNotice('Widget kit draft created. Select widgets below, then publish a version.');await load()
 }

 async function publishKit(kit:CreatorWidgetKit){
  const client=supabase;if(!client||!plus||selected.length<1)return
  setWorking(`publish:${kit.id}`);setError(null);setNotice(null)
  const result=await client.rpc('publish_creator_widget_kit',{p_kit_id:kit.id,p_widget_ids:selected,p_changelog:kit.current_version?'Updated from the current Profile Studio selection.':'Initial widget kit release.'})
  setWorking(null);if(result.error)return setError(result.error.message)
  const row=result.data?.[0];setNotice(`${kit.title} published as version ${row?.version_no??kit.current_version+1} with ${row?.widget_count??selected.length} widgets.`);await load()
 }

 async function installKit(kit:CreatorWidgetKit){
  const client=supabase;if(!client||!plus)return
  setWorking(`install:${kit.id}`);setError(null);setNotice(null)
  const result=await client.rpc('install_creator_widget_kit',{p_kit_id:kit.id})
  setWorking(null);if(result.error)return setError(result.error.message)
  const row=result.data?.[0];const count=row?.inserted_count??0;setNotice(`${count} widgets from ${kit.title} were added below your current Profile Studio layout as one managed component group.`);await load()
 }

 async function removeInstalled(group:InstalledWidgetKitGroup){
  const client=supabase;if(!client)return
  setWorking(`remove:${group.install_group_id}`);setError(null);setNotice(null)
  const result=await client.rpc('remove_installed_widget_kit_group',{p_install_group_id:group.install_group_id})
  setWorking(null);if(result.error)return setError(result.error.message)
  setNotice(`${result.data??group.widget_count} widgets from ${group.kit_title} were removed. Your other Profile Studio widgets were left alone.`);await load()
 }

 async function toggleFavorite(kitId:string){const client=supabase;if(!client)return;setWorking(`favorite:${kitId}`);const result=await client.rpc('toggle_creator_widget_kit_favorite',{p_kit_id:kitId});setWorking(null);if(result.error)return setError(result.error.message);await load()}

 if(!account||!activeCharacter)return null
 return <main className="widget-kit-library-page">
  <ShellTopbar eyebrow="HANAMI+ · CREATOR COMPONENTS" title="Component Library" onSearch={onSearch} onNotifications={onNotifications} unreadCount={unreadCount}/>
  <section className="widget-kit-hero"><div><span className="eyebrow">MODULAR PROFILE CREATION</span><h1>Share a piece of a page, not only the whole page.</h1><p>Widget kits bundle up to 12 Profile Studio widgets into reusable components. Installing a kit adds it beneath the existing layout, keeps the creator/version credit attached to every inserted widget, and never replaces the current page.</p></div><div className={plus?'widget-kit-plus active':'widget-kit-plus'}><span>{plus?'COMPONENT TOOLS UNLOCKED':'BROWSE MODE'}</span><strong>{plus?'Hanami+':'Hanami'}</strong><small>Browsing and installed-component management stay available to members. Publishing and inserting creator kits use Hanami+ creative tools.</small></div></section>
  <nav className="widget-kit-tabs"><a href="#/hanami-plus/marketplace">Full Themes</a><a href="#/hanami-plus/remix-lab">Remix Lab</a><a className="active" href="#/hanami-plus/component-library">Component Library</a><a href="#/profile/profile-studio">Profile Studio</a></nav>
  {error&&<div className="identity-notice error">{error}</div>}{notice&&<div className="identity-notice success">{notice}</div>}
  {loading?<section className="widget-kit-loading">Opening the component library…</section>:<div className="widget-kit-layout">
   <section className="widget-kit-browse"><header><div><span className="eyebrow">COMMUNITY KITS</span><h2>Browse components</h2></div><div className="widget-kit-filters"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search kits or tags…"/><select value={kindFilter} onChange={e=>setKindFilter(e.target.value as 'all'|KitKind)}><option value="all">All types</option>{kitKinds.map(kind=><option key={kind} value={kind}>{displayKind(kind)}</option>)}</select></div></header><div className="widget-kit-grid">{filtered.length===0?<div className="widget-kit-empty"><strong>No matching kits yet.</strong><span>Creator-published components will appear here.</span></div>:filtered.map(kit=>{const favorite=favorites.some(row=>row.kit_id===kit.id);return <article key={kit.id}><div className={`widget-kit-icon kind-${kit.kit_kind}`}>{kindIcon[kit.kit_kind]}</div><div className="widget-kit-card-body"><span className="eyebrow">{displayKind(kit.kit_kind)} · v{kit.current_version}</span><h3>{kit.title}</h3><p>{kit.description||'A reusable Hanami Profile Studio component.'}</p><strong>by {creatorName(kit.author_account_id)}</strong><small>{kit.tags.slice(0,4).join(' · ')||'widget kit'}</small><footer><span>↧ {kit.install_count} · ♡ {kit.favorite_count}</span><div><button type="button" disabled={working===`favorite:${kit.id}`} onClick={()=>void toggleFavorite(kit.id)}>{favorite?'♥':'♡'}</button><button className="install" type="button" disabled={!plus||working===`install:${kit.id}`} onClick={()=>void installKit(kit)}>{working===`install:${kit.id}`?'Adding…':'Add to my page'}</button></div></footer></div></article>})}</div></section>
   <aside className="widget-kit-creator">
    <section className="installed-component-manager"><div className="widget-kit-selection-head"><div><span className="eyebrow">INSTALLED ON THIS CHARACTER</span><h2>Managed components</h2></div><strong>{installed.length}</strong></div><p>Imported kit groups keep their creator and version credit. Removing a group only deletes widgets from that specific install.</p><div className="installed-component-list">{installed.length===0?<span>No creator components installed on this character yet.</span>:installed.map(group=><article key={group.install_group_id}><div><strong>{group.kit_title}</strong><small>{group.creator_name} · {group.widget_count} widget{group.widget_count===1?'':'s'} · version {group.version_id.slice(0,8)}</small><em>{group.attribution_text}</em></div><div><button type="button" onClick={()=>findSource(group)}>Find source</button><button className="remove" type="button" disabled={working===`remove:${group.install_group_id}`} onClick={()=>void removeInstalled(group)}>{working===`remove:${group.install_group_id}`?'Removing…':'Remove group'}</button></div></article>)}</div></section>
    <section><span className="eyebrow">CREATOR WORKBENCH</span><h2>Build a widget kit</h2>{!creatorProfile?<div className="widget-kit-creator-lock"><p>Create your Creator Studio portfolio first so component credits have a stable creator identity.</p><a href="#/hanami-plus/creator-studio">Open Creator Studio →</a></div>:<><label>Kit title<input maxLength={80} disabled={!plus} value={draft.title} onChange={e=>setDraft(current=>({...current,title:e.target.value}))}/></label><label>Type<select disabled={!plus} value={draft.kind} onChange={e=>setDraft(current=>({...current,kind:e.target.value as KitKind}))}>{kitKinds.map(kind=><option key={kind} value={kind}>{displayKind(kind)}</option>)}</select></label><label>Description<textarea rows={3} maxLength={400} disabled={!plus} value={draft.description} onChange={e=>setDraft(current=>({...current,description:e.target.value}))}/></label><label>Tags<input disabled={!plus} value={draft.tags} onChange={e=>setDraft(current=>({...current,tags:e.target.value}))} placeholder="music, pink, sidebar"/></label><button className="primary" type="button" disabled={!plus||working==='create'||!draft.title.trim()} onClick={()=>void createKit()}>{working==='create'?'Creating…':'Create kit draft'}</button></>}</section>
    <section><div className="widget-kit-selection-head"><div><span className="eyebrow">PROFILE STUDIO SOURCE</span><h2>Select widgets</h2></div><strong>{selected.length}/12</strong></div><p>Selections are snapshotted when you publish a kit version. The original widgets remain on your page.</p><div className="widget-kit-widget-list">{widgets.length===0?<span>No Profile Studio widgets yet.</span>:widgets.map(widget=><button key={widget.id} type="button" className={selected.includes(widget.id)?'selected':''} onClick={()=>toggleWidget(widget.id)}><span>{selected.includes(widget.id)?'✓':'□'}</span><div><strong>{widget.title||displayKind(widget.widget_type)}</strong><small>{displayKind(widget.widget_type)} · {widget.width}×{widget.height} · row {widget.y}{!widget.is_visible?' · hidden':''}</small></div></button>)}</div><a className="open-studio" href="#/profile/profile-studio">Open Profile Studio →</a></section>
    <section><span className="eyebrow">MY KIT DRAFTS & RELEASES</span><div className="widget-kit-own-list">{ownKits.length===0?<p>No widget kits yet.</p>:ownKits.map(kit=><article key={kit.id}><div><strong>{kit.title}</strong><small>{kit.state} · version {kit.current_version} · {displayKind(kit.kit_kind)}</small></div><button type="button" disabled={!plus||selected.length<1||working===`publish:${kit.id}`} onClick={()=>void publishKit(kit)}>{working===`publish:${kit.id}`?'Publishing…':kit.current_version?'Publish new version':'Publish selected widgets'}</button></article>)}</div></section>
   </aside>
  </div>}
 </main>
}
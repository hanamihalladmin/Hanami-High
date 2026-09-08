import { useCallback,useEffect,useMemo,useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { CreatorFollowingFeedRow,CreatorReleaseType } from '../types/database-creator-following'
import type { CreatorPortfolioDirectoryRow } from '../types/database-creator-portfolios'
import { ShellTopbar } from './ShellTopbar'

type Props={onSearch:()=>void;onNotifications:()=>void;unreadCount:number}
type FollowRow={creator_account_id:string}

const releaseCopy:Record<CreatorReleaseType,{icon:string;eyebrow:string;verb:string}>={
  theme:{icon:'▧',eyebrow:'NEW THEME',verb:'published a new profile theme'},
  theme_version:{icon:'↻',eyebrow:'THEME UPDATE',verb:'released a new theme version'},
  widget_kit:{icon:'◇',eyebrow:'NEW COMPONENT KIT',verb:'published a new component kit'},
  widget_kit_version:{icon:'✦',eyebrow:'COMPONENT UPDATE',verb:'updated a component kit'},
  collection:{icon:'▤',eyebrow:'NEW COLLECTION',verb:'shared a creator collection'},
}

function creatorHref(id:string){return `#/hanami-plus/creators/${encodeURIComponent(id)}`}
function relativeDate(value:string){
  const delta=Date.now()-new Date(value).getTime();const minutes=Math.max(0,Math.floor(delta/60000));
  if(minutes<1)return 'just now';if(minutes<60)return `${minutes}m ago`;const hours=Math.floor(minutes/60);if(hours<24)return `${hours}h ago`;const days=Math.floor(hours/24);if(days<7)return `${days}d ago`;
  return new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',month:'short',day:'numeric'}).format(new Date(value))
}

export function CreatorFollowingPage({onSearch,onNotifications,unreadCount}:Props){
  const {account}=useIdentity()
  const [feed,setFeed]=useState<CreatorFollowingFeedRow[]>([])
  const [directory,setDirectory]=useState<CreatorPortfolioDirectoryRow[]>([])
  const [follows,setFollows]=useState<FollowRow[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState<string|null>(null)

  const load=useCallback(async()=>{
    const client=supabase;if(!client||!account)return
    setLoading(true);setError(null)
    const [feedResult,directoryResult,followResult]=await Promise.all([
      client.rpc('creator_following_feed',{p_limit:75}),
      client.rpc('list_public_creator_portfolios',{}),
      client.from('creator_follows').select('creator_account_id').eq('follower_account_id',account.id),
    ])
    const first=feedResult.error||directoryResult.error||followResult.error
    if(first){setError(first.message);setLoading(false);return}
    setFeed(feedResult.data??[]);setDirectory(directoryResult.data??[]);setFollows(followResult.data??[]);setLoading(false)
  },[account])
  useEffect(()=>{void load()},[load])

  const followedCreators=useMemo(()=>{
    const ids=new Set(follows.map(row=>row.creator_account_id));return directory.filter(row=>ids.has(row.account_id))
  },[directory,follows])

  if(!account)return null
  return <main className="creator-following-page">
    <ShellTopbar eyebrow="HANAMI+ · CREATOR NETWORK" title="Following" onSearch={onSearch} onNotifications={onNotifications} unreadCount={unreadCount}/>
    <section className="creator-following-hero"><div><span className="eyebrow">YOUR CREATIVE CIRCLE</span><h1>New work from creators you chose to follow.</h1><p>This feed only broadcasts public creator releases. Private drafts and unlisted work never appear here, and social notifications follow your existing Hanami notification preference.</p></div><div className="creator-following-count"><strong>{followedCreators.length}</strong><span>creators followed</span><a href="#/hanami-plus/creators">Find more creators →</a></div></section>
    {error&&<div className="identity-notice error">{error}</div>}
    {loading?<section className="creator-following-loading">Loading creator releases…</section>:<div className="creator-following-layout">
      <section className="creator-release-feed"><header><div><span className="eyebrow">RELEASE FEED</span><h2>Latest from Following</h2></div><span>{feed.length} release{feed.length===1?'':'s'}</span></header>
        {feed.length===0?<div className="creator-following-empty"><strong>Your release feed is quiet.</strong><p>Follow public creators to see new themes, component kits, updates, and collections here.</p><a href="#/hanami-plus/creators">Browse Creator Directory →</a></div>:<div className="creator-release-list">{feed.map(row=>{const copy=releaseCopy[row.release_type];return <article key={row.release_id}><div className="creator-release-icon">{copy.icon}</div><div className="creator-release-body"><div className="creator-release-meta"><span>{copy.eyebrow}</span><small>{relativeDate(row.released_at)}</small></div><h3>{row.source_title}</h3><p><a href={creatorHref(row.creator_account_id)}>{row.creator_name}</a> {copy.verb}{row.version_no?` · version ${row.version_no}`:''}.</p>{row.summary&&<blockquote>{row.summary}</blockquote>}<footer><a href={creatorHref(row.creator_account_id)}>Creator Portfolio →</a>{row.release_type.startsWith('widget_kit')?<a href="#/hanami-plus/component-library">Component Library →</a>:row.release_type==='collection'?<a href="#/hanami-plus/collections">Theme Collections →</a>:<a href="#/hanami-plus/marketplace">Theme Marketplace →</a>}</footer></div></article>})}</div>}
      </section>
      <aside className="creator-following-sidebar"><section><span className="eyebrow">FOLLOWING</span><h2>Your creators</h2>{followedCreators.length===0?<p>No creators followed yet.</p>:<div className="creator-following-people">{followedCreators.map(creator=><a key={creator.account_id} href={creatorHref(creator.account_id)}>{creator.avatar_url?<img src={creator.avatar_url} alt=""/>:<span>✦</span>}<div><strong>{creator.display_name}</strong><small>@{creator.creator_slug} · {creator.published_theme_count+creator.published_kit_count} releases</small></div></a>)}</div>}<a className="creator-following-directory-link" href="#/hanami-plus/creators">Open Creator Directory →</a></section>
        <section><span className="eyebrow">NOTIFICATION RULE</span><h2>Focused, not noisy</h2><p>Creator-release alerts use your existing <strong>Social notifications</strong> setting. Turn social notifications off in Settings if you prefer to browse this feed without release alerts.</p><a className="creator-following-directory-link" href="#/settings/notifications">Notification Settings →</a></section>
      </aside>
    </div>}
  </main>
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { Json } from '../types/database'
import type { HanamiPlusHubSnapshot } from '../types/database-rewards'
import type {
  CreatorCollection,
  CreatorCollectionItem,
  CreatorContest,
  CreatorContestEntry,
  CreatorFollow,
  CreatorProfile,
  CreatorThemeFavorite,
  CreatorThemeListing,
  CreatorThemeRating,
} from '../types/database-creator-marketplace'
import { ShellTopbar } from './ShellTopbar'

type Mode = 'browse' | 'studio' | 'contests' | 'collections'
type Props = { mode: Mode; onSearch: () => void; onNotifications: () => void; unreadCount: number }

function slugify(value: string) {
  const base = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 38)
  return `${base || 'theme'}-${Math.random().toString(36).slice(2, 7)}`
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tokyo', month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

export function CreatorMarketplacePage({ mode, onSearch, onNotifications, unreadCount }: Props) {
  const { account, activeCharacter } = useIdentity()
  const [snapshot, setSnapshot] = useState<HanamiPlusHubSnapshot | null>(null)
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null)
  const [creators, setCreators] = useState<CreatorProfile[]>([])
  const [listings, setListings] = useState<CreatorThemeListing[]>([])
  const [favorites, setFavorites] = useState<CreatorThemeFavorite[]>([])
  const [ratings, setRatings] = useState<CreatorThemeRating[]>([])
  const [follows, setFollows] = useState<CreatorFollow[]>([])
  const [collections, setCollections] = useState<CreatorCollection[]>([])
  const [collectionItems, setCollectionItems] = useState<CreatorCollectionItem[]>([])
  const [contests, setContests] = useState<CreatorContest[]>([])
  const [contestEntries, setContestEntries] = useState<CreatorContestEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [creatorDraft, setCreatorDraft] = useState({ displayName: '', slug: '', bio: '' })
  const [listingDraft, setListingDraft] = useState({ title: '', description: '', tags: '' })
  const [collectionDraft, setCollectionDraft] = useState({ title: '', description: '' })
  const [contestListing, setContestListing] = useState<Record<string,string>>({})

  const load = useCallback(async () => {
    const client = supabase
    if (!client || !account) return
    setLoading(true)
    setError(null)
    const [hub, creatorsResult, listingsResult, favoritesResult, ratingsResult, followsResult, collectionsResult, collectionItemsResult, contestsResult, entriesResult] = await Promise.all([
      client.rpc('current_hanami_plus_hub'),
      client.from('creator_profiles').select('*').order('display_name'),
      client.from('creator_theme_listings').select('*').order('published_at', { ascending: false }).order('updated_at', { ascending: false }),
      client.from('creator_theme_favorites').select('*').eq('account_id', account.id),
      client.from('creator_theme_ratings').select('*'),
      client.from('creator_follows').select('*'),
      client.from('creator_collections').select('*').order('updated_at', { ascending: false }),
      client.from('creator_collection_items').select('*').order('sort_order'),
      client.from('creator_contests').select('*').order('starts_at', { ascending: false }),
      client.from('creator_contest_entries').select('*').order('submitted_at', { ascending: false }),
    ])
    const first = [hub.error, creatorsResult.error, listingsResult.error, favoritesResult.error, ratingsResult.error, followsResult.error, collectionsResult.error, collectionItemsResult.error, contestsResult.error, entriesResult.error].find(Boolean)
    if (first) {
      setError(first.message)
      setLoading(false)
      return
    }
    setSnapshot(hub.data?.[0] ?? null)
    setCreators(creatorsResult.data ?? [])
    setCreatorProfile((creatorsResult.data ?? []).find((row) => row.account_id === account.id) ?? null)
    setListings(listingsResult.data ?? [])
    setFavorites(favoritesResult.data ?? [])
    setRatings(ratingsResult.data ?? [])
    setFollows(followsResult.data ?? [])
    setCollections(collectionsResult.data ?? [])
    setCollectionItems(collectionItemsResult.data ?? [])
    setContests(contestsResult.data ?? [])
    setContestEntries(entriesResult.data ?? [])
    setLoading(false)
  }, [account])

  useEffect(() => { void load() }, [load])

  const publicListings = useMemo(() => listings.filter((listing) => listing.state === 'published' && listing.visibility !== 'private'), [listings])
  const ownListings = useMemo(() => listings.filter((listing) => listing.author_account_id === account?.id), [listings, account?.id])
  const ownCollections = useMemo(() => collections.filter((collection) => collection.owner_account_id === account?.id), [collections, account?.id])
  const ratingAverage = useCallback((listingId: string) => {
    const rows = ratings.filter((rating) => rating.listing_id === listingId)
    return rows.length ? rows.reduce((sum, row) => sum + row.rating, 0) / rows.length : 0
  }, [ratings])

  async function createCreatorProfile() {
    const client = supabase
    if (!client || !account || !activeCharacter || !snapshot?.active) return
    const displayName = creatorDraft.displayName.trim() || activeCharacter.display_name || activeCharacter.first_name || 'Hanami Creator'
    const creatorSlug = (creatorDraft.slug.trim() || slugify(displayName)).replace(/-([a-z0-9]{5})$/, '$1').slice(0,32)
    setWorking('creator'); setError(null); setNotice(null)
    const { error: createError } = await client.from('creator_profiles').insert({
      account_id: account.id,
      primary_character_id: activeCharacter.id,
      creator_slug: creatorSlug,
      display_name: displayName,
      bio: creatorDraft.bio.trim() || null,
    })
    setWorking(null)
    if (createError) return setError(createError.message)
    setNotice('Creator portfolio created.')
    await load()
  }

  async function createListing() {
    const client = supabase
    if (!client || !account || !activeCharacter || !snapshot?.active || !listingDraft.title.trim()) return
    setWorking('listing'); setError(null); setNotice(null)
    const { error: createError } = await client.from('creator_theme_listings').insert({
      author_account_id: account.id,
      author_character_id: activeCharacter.id,
      slug: slugify(listingDraft.title),
      title: listingDraft.title.trim(),
      description: listingDraft.description.trim() || null,
      tags: listingDraft.tags.split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean).slice(0,12),
    })
    setWorking(null)
    if (createError) return setError(createError.message)
    setListingDraft({ title: '', description: '', tags: '' })
    setNotice('Theme draft created. Publish it when your current Profile Studio design is ready.')
    await load()
  }

  async function publishListing(listing: CreatorThemeListing) {
    const client = supabase
    if (!client || !activeCharacter || !snapshot?.active) return
    setWorking(`publish:${listing.id}`); setError(null); setNotice(null)
    const [profileResult, widgetResult] = await Promise.all([
      client.from('character_profiles').select('theme_draft').eq('character_id', activeCharacter.id).single(),
      client.from('profile_widgets').select('widget_type,title,config,x,y,width,height,visible').eq('character_id', activeCharacter.id).order('y').order('x'),
    ])
    const first = profileResult.error || widgetResult.error
    if (first) { setWorking(null); return setError(first.message) }
    const payload: Json = {
      format: 'hanami-profile-theme-v1',
      source_character_id: activeCharacter.id,
      theme: profileResult.data.theme_draft,
      widgets: widgetResult.data as unknown as Json,
    }
    const result = await client.rpc('publish_creator_theme_version', {
      p_listing_id: listing.id,
      p_theme_payload: payload,
      p_changelog: listing.current_version ? 'Updated from Profile Studio.' : 'Initial marketplace release.',
    })
    setWorking(null)
    if (result.error) return setError(result.error.message)
    setNotice(`${listing.title} published as version ${result.data?.[0]?.version_no ?? listing.current_version + 1}.`)
    await load()
  }

  async function toggleFavorite(listingId: string) {
    const client = supabase
    if (!client) return
    setWorking(`favorite:${listingId}`)
    const result = await client.rpc('toggle_creator_theme_favorite', { p_listing_id: listingId })
    setWorking(null)
    if (result.error) return setError(result.error.message)
    await load()
  }

  async function rate(listingId: string, rating: number) {
    const client = supabase
    if (!client || !account) return
    setWorking(`rate:${listingId}`)
    const result = await client.from('creator_theme_ratings').upsert({ account_id: account.id, listing_id: listingId, rating }, { onConflict: 'account_id,listing_id' })
    setWorking(null)
    if (result.error) return setError(result.error.message)
    await load()
  }

  async function toggleFollow(creatorAccountId: string) {
    const client = supabase
    if (!client || !account || creatorAccountId === account.id) return
    const existing = follows.find((row) => row.follower_account_id === account.id && row.creator_account_id === creatorAccountId)
    setWorking(`follow:${creatorAccountId}`)
    const result = existing
      ? await client.from('creator_follows').delete().eq('follower_account_id', account.id).eq('creator_account_id', creatorAccountId)
      : await client.from('creator_follows').insert({ follower_account_id: account.id, creator_account_id: creatorAccountId })
    setWorking(null)
    if (result.error) return setError(result.error.message)
    await load()
  }

  async function createCollection() {
    const client = supabase
    if (!client || !account || !collectionDraft.title.trim()) return
    setWorking('collection')
    const result = await client.from('creator_collections').insert({ owner_account_id: account.id, title: collectionDraft.title.trim(), description: collectionDraft.description.trim() || null })
    setWorking(null)
    if (result.error) return setError(result.error.message)
    setCollectionDraft({ title: '', description: '' })
    setNotice('Collection created.')
    await load()
  }

  async function addToFirstCollection(listingId: string) {
    const client = supabase
    const collection = ownCollections[0]
    if (!client || !collection) { setNotice('Create a collection first, then add themes to it.'); return }
    setWorking(`collect:${listingId}`)
    const result = await client.from('creator_collection_items').upsert({ collection_id: collection.id, listing_id: listingId, sort_order: collectionItems.filter((row) => row.collection_id === collection.id).length }, { onConflict: 'collection_id,listing_id' })
    setWorking(null)
    if (result.error) return setError(result.error.message)
    setNotice(`Added to ${collection.title}.`)
    await load()
  }

  async function submitContest(contest: CreatorContest) {
    const client = supabase
    if (!client || !account || !snapshot?.active) return
    const listingId = contestListing[contest.id]
    const listing = ownListings.find((row) => row.id === listingId && row.state === 'published')
    if (!listing) return setError('Choose one of your published themes first.')
    setWorking(`contest:${contest.id}`)
    const result = await client.from('creator_contest_entries').insert({ contest_id: contest.id, listing_id: listing.id, entrant_account_id: account.id })
    setWorking(null)
    if (result.error) return setError(result.error.message)
    setNotice(`Submitted ${listing.title} to ${contest.title}.`)
    await load()
  }

  const pageTitle = mode === 'browse' ? 'Theme Marketplace' : mode === 'studio' ? 'Creator Studio' : mode === 'contests' ? 'Creative Contests' : 'Theme Collections'

  return <main className="creator-marketplace-page">
    <ShellTopbar eyebrow="HANAMI+ · CREATOR MARKETPLACE" title={pageTitle} onSearch={onSearch} onNotifications={onNotifications} unreadCount={unreadCount} />
    <section className="creator-marketplace-hero"><div><span className="eyebrow">COMMUNITY DESIGN LIBRARY</span><h1>{pageTitle}</h1><p>Share complete Hanami profile looks, follow creators, save favorites, organize collections, and enter school creative events.</p></div><div className={snapshot?.active ? 'creator-plus active' : 'creator-plus'}><span>{snapshot?.active ? 'CREATOR TOOLS UNLOCKED' : 'BROWSE MODE'}</span><strong>{snapshot?.active ? 'Hanami+' : 'Hanami'}</strong><small>Published themes stay available after a creator’s Plus period ends.</small></div></section>
    <nav className="creator-marketplace-tabs"><a className={mode==='browse'?'active':''} href="#/hanami-plus/marketplace">Browse Themes</a><a className={mode==='studio'?'active':''} href="#/hanami-plus/creator-studio">Creator Studio</a><a className={mode==='contests'?'active':''} href="#/hanami-plus/creator-contests">Contests</a><a className={mode==='collections'?'active':''} href="#/hanami-plus/collections">Collections</a></nav>
    {error && <div className="identity-notice error">{error}</div>}{notice && <div className="identity-notice success">{notice}</div>}
    {loading ? <section className="creator-loading">Loading the creator marketplace…</section> : <>
      {mode === 'browse' && <section className="creator-theme-grid">{publicListings.length ? publicListings.map((listing) => { const creator = creators.find((row) => row.account_id === listing.author_account_id); const favorite = favorites.some((row) => row.listing_id === listing.id); const following = follows.some((row) => row.follower_account_id === account?.id && row.creator_account_id === listing.author_account_id); const myRating = ratings.find((row) => row.account_id === account?.id && row.listing_id === listing.id)?.rating ?? 0; return <article key={listing.id}><div className="creator-theme-preview" style={listing.preview_image_url ? { backgroundImage:`url(${listing.preview_image_url})` } : undefined}><span>v{listing.current_version}</span></div><div className="creator-theme-body"><span className="eyebrow">{listing.tags.slice(0,3).join(' · ') || 'PROFILE THEME'}</span><h2>{listing.title}</h2><p>{listing.description || 'A shared Hanami profile design.'}</p><div className="creator-byline"><strong>{creator?.display_name || 'Hanami Creator'}</strong><small>★ {ratingAverage(listing.id).toFixed(1)} · ♡ {listing.favorite_count} · ↧ {listing.download_count}</small></div><div className="creator-theme-actions"><button type="button" disabled={working===`favorite:${listing.id}`} onClick={() => void toggleFavorite(listing.id)}>{favorite?'♥ Saved':'♡ Save'}</button><button type="button" disabled={working===`collect:${listing.id}`} onClick={() => void addToFirstCollection(listing.id)}>+ Collection</button>{listing.author_account_id!==account?.id && <button type="button" disabled={working===`follow:${listing.author_account_id}`} onClick={() => void toggleFollow(listing.author_account_id)}>{following?'Following':'Follow creator'}</button>}</div><div className="creator-rating">{[1,2,3,4,5].map((value) => <button key={value} type="button" className={value<=myRating?'active':''} disabled={working===`rate:${listing.id}`} onClick={() => void rate(listing.id,value)}>★</button>)}</div></div></article> }) : <p className="creator-empty">No community themes have been published yet.</p>}</section>}

      {mode === 'studio' && <section className="creator-studio-grid"><aside><section className="creator-panel"><span className="eyebrow">CREATOR PORTFOLIO</span>{creatorProfile ? <><h2>{creatorProfile.display_name}</h2><p>{creatorProfile.bio || 'Your creator portfolio is ready.'}</p><small>/{creatorProfile.creator_slug}</small></> : snapshot?.active ? <div className="creator-form"><label>Creator name<input value={creatorDraft.displayName} onChange={(event)=>setCreatorDraft({...creatorDraft,displayName:event.target.value})} /></label><label>Creator slug<input value={creatorDraft.slug} onChange={(event)=>setCreatorDraft({...creatorDraft,slug:event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g,'')})} /></label><label>Bio<textarea rows={4} value={creatorDraft.bio} onChange={(event)=>setCreatorDraft({...creatorDraft,bio:event.target.value})} /></label><button type="button" disabled={working==='creator'} onClick={()=>void createCreatorProfile()}>Create creator portfolio</button></div> : <p>Activate Hanami+ to create a creator portfolio and publish themes.</p>}</section><section className="creator-panel"><span className="eyebrow">NEW THEME LISTING</span><div className="creator-form"><label>Title<input disabled={!snapshot?.active} value={listingDraft.title} onChange={(event)=>setListingDraft({...listingDraft,title:event.target.value})} /></label><label>Description<textarea disabled={!snapshot?.active} rows={4} value={listingDraft.description} onChange={(event)=>setListingDraft({...listingDraft,description:event.target.value})} /></label><label>Tags<input disabled={!snapshot?.active} placeholder="pastel, notebook, 2000s" value={listingDraft.tags} onChange={(event)=>setListingDraft({...listingDraft,tags:event.target.value})} /></label><button type="button" disabled={!snapshot?.active||working==='listing'||!listingDraft.title.trim()} onClick={()=>void createListing()}>Create theme draft</button></div></section></aside><section className="creator-panel creator-listings"><header><div><span className="eyebrow">MY THEMES</span><h2>Versioned releases</h2></div><strong>{ownListings.length}</strong></header>{ownListings.length ? ownListings.map((listing)=><article key={listing.id}><div><span>{listing.state.toUpperCase()} · v{listing.current_version}</span><strong>{listing.title}</strong><p>{listing.description || 'No description yet.'}</p><small>Updated {formatDate(listing.updated_at)}</small></div><button type="button" disabled={!snapshot?.active||working===`publish:${listing.id}`} onClick={()=>void publishListing(listing)}>{working===`publish:${listing.id}`?'Publishing…':listing.current_version?'Publish new version':'Publish current Profile Studio design'}</button></article>) : <p className="creator-empty">Create your first theme listing to begin.</p>}</section></section>}

      {mode === 'collections' && <section className="creator-collections-layout"><section className="creator-panel"><span className="eyebrow">NEW COLLECTION</span><div className="creator-form"><label>Title<input value={collectionDraft.title} onChange={(event)=>setCollectionDraft({...collectionDraft,title:event.target.value})} /></label><label>Description<textarea rows={3} value={collectionDraft.description} onChange={(event)=>setCollectionDraft({...collectionDraft,description:event.target.value})} /></label><button type="button" disabled={working==='collection'||!collectionDraft.title.trim()} onClick={()=>void createCollection()}>Create collection</button></div></section><section className="creator-collection-grid">{ownCollections.length ? ownCollections.map((collection)=><article key={collection.id}><span>{collection.visibility.toUpperCase()}</span><h2>{collection.title}</h2><p>{collection.description || 'Saved marketplace themes.'}</p><strong>{collectionItems.filter((row)=>row.collection_id===collection.id).length} themes</strong></article>) : <p className="creator-empty">No collections yet. Create one, then add themes from Browse.</p>}</section></section>}

      {mode === 'contests' && <section className="creator-contest-list">{contests.length ? contests.map((contest)=>{ const submitted=contestEntries.some((entry)=>entry.contest_id===contest.id&&entry.entrant_account_id===account?.id); const available=ownListings.filter((listing)=>listing.state==='published'); return <article key={contest.id}><div><span>{contest.state.toUpperCase()}</span><h2>{contest.title}</h2><p>{contest.description || 'A Hanami community creative challenge.'}</p><small>{formatDate(contest.starts_at)} — {formatDate(contest.ends_at)}</small></div><div>{submitted ? <strong>✓ Submitted</strong> : contest.state==='open' ? <><select value={contestListing[contest.id]||''} onChange={(event)=>setContestListing({...contestListing,[contest.id]:event.target.value})}><option value="">Choose one of your themes</option>{available.map((listing)=><option key={listing.id} value={listing.id}>{listing.title}</option>)}</select><button type="button" disabled={!snapshot?.active||working===`contest:${contest.id}`} onClick={()=>void submitContest(contest)}>Submit theme</button></> : <strong>Entries closed</strong>}</div></article>}) : <p className="creator-empty">No creative contests are open or archived yet.</p>}</section>}
    </>}
  </main>
}

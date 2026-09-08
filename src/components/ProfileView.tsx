import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { getSignedProfileMediaUrl } from '../lib/profileMedia'
import { profilePageLayoutFrom } from '../lib/profilePageLayout'
import { profilePageBackgroundFrom, profilePageBackgroundStyle } from '../lib/profilePageTheme'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { Friendship, Json, PublishedProfileWidget, SocialPost } from '../types/database'
import type { PublishedCharacterProfileWithCosmetics } from '../types/database-customization'
import { GuestbookPanel } from './GuestbookPanel'
import { ShellTopbar } from './ShellTopbar'

type Props = { targetCharacterId?: string; onSearch: () => void; onNotifications: () => void; unreadCount: number }
type Tab = 'board' | 'activity' | 'blog' | 'guestbook'
type Theme = { background: string; panel: string; accent: string; ink: string; grid: boolean; displayFont: string; displayEffect: string; displayColor: string; displayColor2: string }
type Cosmetics = { avatarDecoration?: string; frame?: string; effect?: string; nameplate?: string; profileCard?: string; backgroundPack?: string }
type Presence = { status: string; last_seen_at: string } | null

const fallback: Theme = { background: '#f4f0e8', panel: '#fffdf8', accent: '#d86f8b', ink: '#17223b', grid: false, displayFont: 'classic', displayEffect: 'solid', displayColor: '#d86f8b', displayColor2: '#f6b7cb' }
function obj(value: Json) { return value && !Array.isArray(value) && typeof value === 'object' ? value as Record<string, Json | undefined> : {} }
function themeFrom(value: Json): Theme { const s = obj(value); return { background: typeof s.background === 'string' ? s.background : fallback.background, panel: typeof s.panel === 'string' ? s.panel : fallback.panel, accent: typeof s.accent === 'string' ? s.accent : fallback.accent, ink: typeof s.ink === 'string' ? s.ink : fallback.ink, grid: typeof s.grid === 'boolean' ? s.grid : false, displayFont: typeof s.displayFont === 'string' ? s.displayFont : 'classic', displayEffect: typeof s.displayEffect === 'string' ? s.displayEffect : 'solid', displayColor: typeof s.displayColor === 'string' ? s.displayColor : '#d86f8b', displayColor2: typeof s.displayColor2 === 'string' ? s.displayColor2 : '#f6b7cb' } }
function cosmeticsFrom(value: Json): Cosmetics { const s = obj(value); return { avatarDecoration: typeof s.avatarDecoration === 'string' ? s.avatarDecoration : undefined, frame: typeof s.frame === 'string' ? s.frame : undefined, effect: typeof s.effect === 'string' ? s.effect : undefined, nameplate: typeof s.nameplate === 'string' ? s.nameplate : undefined, profileCard: typeof s.profileCard === 'string' ? s.profileCard : undefined, backgroundPack: typeof s.backgroundPack === 'string' ? s.backgroundPack : undefined } }
function widgetContent(value: Json) { const valueContent = obj(value).content; return typeof valueContent === 'string' ? valueContent : '' }
function widgetPath(value: Json) { const path = obj(value).storagePath; return typeof path === 'string' ? path : null }
function roleLabel(role: string | null) { if (role === 'new_faculty') return 'New Teacher'; if (role === 'faculty') return 'Teacher'; if (role === 'administration') return 'Staff'; if (role === 'new_student') return 'New Student'; if (role === 'student') return 'Student'; return role ? role.split('_').map((part) => part[0]?.toUpperCase() + part.slice(1)).join(' ') : 'Hanami Member' }
function safeClass(value?: string) { return (value || 'none').replace(/[^a-z0-9-]/gi, '-').toLowerCase() }
function noteKey(id: string) { return `hanami-profile-note:${id}` }
function lines(value: string) { return value.split(/\r?\n|\s*\|\s*/).map((item) => item.trim()).filter(Boolean) }
function presenceLabel(presence: Presence) {
  if (!presence) return 'Offline'
  const age = Date.now() - new Date(presence.last_seen_at).getTime()
  if (!Number.isFinite(age) || age > 120_000 || presence.status === 'invisible') return 'Offline'
  if (presence.status === 'idle' || presence.status === 'away') return 'Idle'
  if (presence.status === 'dnd') return 'Do Not Disturb'
  return 'Online'
}

function renderWidgetBody(widget: PublishedProfileWidget, media: Record<string, string>): ReactNode {
  const content = widgetContent(widget.config)
  const path = widgetPath(widget.config)
  const items = lines(content)
  if (widget.widget_type === 'image') return <>{path && media[path] ? <img className="published-widget-image" src={media[path]} alt={widget.title || 'Profile image'}/> : <div className="profile-widget-missing-image">Image unavailable</div>}{content && <p className="profile-widget-caption">{content}</p>}</>
  if (widget.widget_type === 'blinkies') return <div className="profile-widget-blinkies">{items.map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}</div>
  if (widget.widget_type === 'marquee') return <div className="profile-widget-marquee"><span>{content || '✦ welcome to my page ✦'}</span></div>
  if (widget.widget_type === 'mood') return <div className="profile-widget-mood"><span aria-hidden="true">☺</span><div>{items.map((item, index) => <p key={`${item}-${index}`}>{item}</p>)}</div></div>
  if (widget.widget_type === 'music') return <div className="profile-widget-music"><span className="profile-widget-disc" aria-hidden="true">♫</span><div>{items.map((item, index) => index === 0 ? <strong key={`${item}-${index}`}>{item}</strong> : <span key={`${item}-${index}`}>{item}</span>)}<small>decorative player · no autoplay</small></div></div>
  if (widget.widget_type === 'favorites') return <ul className="profile-widget-favorites">{items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>
  if (widget.widget_type === 'contact') return <div className="profile-widget-contact">{items.map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}</div>
  if (widget.widget_type === 'quote') return <blockquote className="profile-widget-quote">{content || 'Add a favorite quote.'}</blockquote>
  if (widget.widget_type === 'divider') return <div className="profile-widget-divider"><span>{content || '✿ ✦ ✿ ✦ ✿'}</span></div>
  if (widget.widget_type === 'journal') return <div className="profile-widget-journal">{items.map((item, index) => index === 0 ? <time key={`${item}-${index}`}>{item}</time> : <p key={`${item}-${index}`}>{item}</p>)}</div>
  if (widget.widget_type === 'links') return <div className="profile-widget-links">{items.map((item, index) => <span key={`${item}-${index}`}>↗ {item}</span>)}</div>
  if (widget.widget_type === 'sticker') return <div className="profile-widget-sticker">{content || '✿'}</div>
  return <p className="profile-widget-text">{content || 'Profile widget'}</p>
}

export function ProfileView({ targetCharacterId, onSearch, onNotifications, unreadCount }: Props) {
  const { activeCharacter } = useIdentity()
  const characterId = targetCharacterId || activeCharacter?.id
  const own = Boolean(activeCharacter && characterId === activeCharacter.id)
  const [profile, setProfile] = useState<PublishedCharacterProfileWithCosmetics | null>(null)
  const [widgets, setWidgets] = useState<PublishedProfileWidget[]>([])
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [presence, setPresence] = useState<Presence>(null)
  const [friendship, setFriendship] = useState<Friendship | null>(null)
  const [friendWorking, setFriendWorking] = useState(false)
  const [friendNotice, setFriendNotice] = useState<string | null>(null)
  const [media, setMedia] = useState<Record<string, string>>({})
  const [memberSince, setMemberSince] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [tab, setTab] = useState<Tab>('board')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const hydrate = useCallback(async (nextProfile: PublishedCharacterProfileWithCosmetics | null, nextWidgets: PublishedProfileWidget[]) => {
    if (!nextProfile) return
    const pageBackground = profilePageBackgroundFrom(nextProfile.theme)
    const paths = Array.from(new Set([nextProfile.avatar_path, nextProfile.banner_path, pageBackground.imagePath, ...nextWidgets.map((widget) => widgetPath(widget.config))].filter((value): value is string => Boolean(value))))
    const pairs = await Promise.all(paths.map(async (path) => { try { const url = await getSignedProfileMediaUrl(path); return url ? [path, url] as const : null } catch { return null } }))
    setMedia(Object.fromEntries(pairs.filter((value): value is readonly [string, string] => Boolean(value))))
  }, [])

  const load = useCallback(async () => {
    const client = supabase
    const id = characterId
    const selfId = activeCharacter?.id
    if (!client || !id || !selfId) return
    setLoading(true)
    setError(null)
    const friendshipQuery = id === selfId
      ? Promise.resolve({ data: [] as Friendship[], error: null })
      : client.from('friendships').select('*').or(`requester_character_id.eq.${selfId},addressee_character_id.eq.${selfId}`)
    const [profileResult, characterResult, widgetResult, activityResult, presenceResult, friendshipResult] = await Promise.all([
      client.from('published_character_profiles').select('*').eq('character_id', id).maybeSingle(),
      client.from('characters').select('created_at').eq('id', id).maybeSingle(),
      client.from('published_profile_widgets').select('*').eq('character_id', id).order('y').order('x'),
      client.from('social_posts').select('*').eq('author_character_id', id).eq('state', 'published').order('published_at', { ascending: false }).limit(30),
      client.from('character_presence').select('status,last_seen_at').eq('character_id', id).maybeSingle(),
      friendshipQuery,
    ])
    setLoading(false)
    const first = profileResult.error || characterResult.error || widgetResult.error || activityResult.error || presenceResult.error || friendshipResult.error
    if (first) { setError(first.message); return }
    setProfile(profileResult.data)
    setWidgets(widgetResult.data ?? [])
    setPosts(activityResult.data ?? [])
    setPresence(presenceResult.data)
    setMemberSince(characterResult.data?.created_at ?? null)
    setFriendship((friendshipResult.data ?? []).find((row) => (
      (row.requester_character_id === selfId && row.addressee_character_id === id)
      || (row.requester_character_id === id && row.addressee_character_id === selfId)
    )) ?? null)
    void hydrate(profileResult.data, widgetResult.data ?? [])
  }, [activeCharacter?.id, characterId, hydrate])

  useEffect(() => { void load() }, [load])
  useEffect(() => { if (characterId) setNote(localStorage.getItem(noteKey(characterId)) || '') }, [characterId])

  async function friendAction() {
    const client = supabase
    if (!client || !activeCharacter || !characterId || own) return
    setFriendWorking(true)
    setFriendNotice(null)
    setError(null)
    let actionError: { message: string } | null = null
    let notice = ''
    if (!friendship || friendship.status === 'declined') {
      const result = await client.rpc('request_friendship', { p_target_character_id: characterId })
      actionError = result.error
      notice = 'Friend request sent.'
    } else if (friendship.status === 'pending' && friendship.addressee_character_id === activeCharacter.id) {
      const result = await client.rpc('respond_friendship', { p_friendship_id: friendship.id, p_accept: true })
      actionError = result.error
      notice = 'Friend request accepted.'
    } else if (friendship.status === 'pending' && friendship.requester_character_id === activeCharacter.id) {
      const result = await client.rpc('remove_friendship', { p_friendship_id: friendship.id })
      actionError = result.error
      notice = 'Friend request cancelled.'
    }
    setFriendWorking(false)
    if (actionError) { setError(actionError.message); return }
    if (notice) setFriendNotice(notice)
    await load()
  }

  const theme = useMemo(() => themeFrom(profile?.theme ?? {}), [profile?.theme])
  const pageBackground = useMemo(() => profilePageBackgroundFrom(profile?.theme ?? {}), [profile?.theme])
  const layout = useMemo(() => profilePageLayoutFrom(profile?.theme ?? {}), [profile?.theme])
  const cosmetics = useMemo(() => cosmeticsFrom(profile?.cosmetics ?? {}), [profile?.cosmetics])
  const blogPosts = useMemo(() => posts.filter((post) => post.post_type === 'blog'), [posts])
  if (!activeCharacter || !characterId) return null

  const ownName = activeCharacter.display_name || [activeCharacter.first_name, activeCharacter.last_name].filter(Boolean).join(' ') || 'Your Character'
  const name = profile?.display_name || (own ? ownName : 'Hanami Profile')
  const handle = profile?.handle ? `@${profile.handle}` : '@hanami-member'
  const backgroundUrl = pageBackground.imagePath ? media[pageBackground.imagePath] ?? null : null
  const incomingRequest = friendship?.status === 'pending' && friendship.addressee_character_id === activeCharacter.id
  const outgoingRequest = friendship?.status === 'pending' && friendship.requester_character_id === activeCharacter.id
  const acceptedFriend = friendship?.status === 'accepted'
  const friendLabel = friendWorking ? 'Working…' : incomingRequest ? 'Accept Friend' : outgoingRequest ? 'Cancel Request' : acceptedFriend ? '✓ Friends' : 'Add to Friends'
  const style = {
    ...profilePageBackgroundStyle(pageBackground, backgroundUrl, theme.accent),
    '--profile-bg': theme.background,
    '--profile-panel': theme.panel,
    '--profile-accent': theme.accent,
    '--profile-ink': theme.ink,
    '--display-color': theme.displayColor,
    '--display-color-2': theme.displayColor2,
    '--spacehey-panel-opacity': String(pageBackground.panelOpacity),
    '--spacehey-border-style': pageBackground.borderStyle,
    '--profile-page-width': `${layout.pageWidth}px`,
    '--profile-content-gap': `${layout.contentGap}px`,
    '--profile-panel-border-width': `${layout.borderWidth}px`,
  } as CSSProperties

  const contactBox = !own && <section className="spacehey-contact-box">
    <span className="eyebrow">CONTACTING {name.toUpperCase()}</span>
    <div className="spacehey-contact-actions">
      <a href="#/messages/friends">✉ Send Message</a>
      <button type="button" disabled={friendWorking || acceptedFriend} onClick={() => void friendAction()}>{friendLabel}</button>
      <button type="button" onClick={() => setTab('guestbook')}>✎ Sign Guestbook</button>
      <button type="button" onClick={() => setTab('blog')}>☞ View Blog</button>
    </div>
  </section>

  const sidebar = <aside className="hanami-profile-about">
    {contactBox}
    {layout.showAboutCard && profile?.bio && <section><span className="eyebrow">ABOUT ME</span><p>{profile.bio}</p></section>}
    {layout.showSchoolIdentity && <section><span className="eyebrow">HANAMI DETAILS</span><dl><div><dt>Role</dt><dd>{roleLabel(profile?.school_role ?? null)}</dd></div><div><dt>Status</dt><dd>{presenceLabel(presence)}</dd></div><div><dt>Member Since</dt><dd>{memberSince ? new Date(memberSince).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : profile ? new Date(profile.published_at).toLocaleDateString() : '—'}</dd></div><div><dt>Network</dt><dd>Hanami High</dd></div></dl></section>}
    {!own && <section><span className="eyebrow">PRIVATE NOTE</span><textarea value={note} placeholder="Add a note only you can see…" onChange={(event) => setNote(event.target.value)} onBlur={() => localStorage.setItem(noteKey(characterId), note)}/></section>}
  </aside>

  return <main className="content-area published-profile-page spacehey-full-profile-page">
    <ShellTopbar eyebrow={own ? 'MY PROFILE' : 'HANAMI PROFILE'} title={name} onSearch={onSearch} onNotifications={onNotifications} unreadCount={unreadCount}/>
    {error && <div className="identity-notice error">{error}</div>}
    {friendNotice && <div className="identity-notice success" aria-live="polite">{friendNotice}</div>}
    {loading ? <div className="studio-loading">Loading profile…</div> : !profile ? <section className="shell-module-card"><h2>{own ? 'Publish your profile first.' : 'Profile unavailable.'}</h2><p>{own ? 'Build your page in Profile Studio, then publish it.' : 'This member has not published a visible profile.'}</p></section> : <div className={`hanami-profile-shell spacehey-profile-page layout-${layout.preset} sidebar-${layout.sidebarSide} hero-${layout.heroStyle} density-${layout.panelDensity} titles-${layout.widgetTitleStyle} avatar-${layout.avatarShape} tabs-${layout.tabStyle} ${theme.grid ? 'show-grid' : ''} cosmetic-frame-${safeClass(cosmetics.frame)} cosmetic-avatar-${safeClass(cosmetics.avatarDecoration)} cosmetic-effect-${safeClass(cosmetics.effect)} cosmetic-card-${safeClass(cosmetics.profileCard)} cosmetic-bg-${safeClass(cosmetics.backgroundPack)}`} style={style}>
      <section className="hanami-profile-hero">
        <div className="hanami-profile-banner" style={{ background: theme.accent }}>{profile.banner_path && media[profile.banner_path] && <img src={media[profile.banner_path]} alt={`${name} banner`}/>}</div>
        <div className="hanami-profile-avatar-wrap"><div className="hanami-profile-avatar">{profile.avatar_path && media[profile.avatar_path] ? <img src={media[profile.avatar_path]} alt={`${name} avatar`}/> : name.slice(0, 2).toUpperCase()}</div><span className="hanami-avatar-decoration" aria-hidden="true"/></div>
        <div className="hanami-profile-heading"><div><span className="eyebrow">WELCOME TO MY PAGE</span><h1 className={`profile-display-name profile-font-${theme.displayFont} profile-effect-${theme.displayEffect}`}>{name}</h1><p>{handle}{profile.pronouns ? ` · ${profile.pronouns}` : ''}</p>{profile.custom_status && <blockquote>mood: {profile.custom_status}</blockquote>}</div><div className="hanami-profile-actions">{own ? <><a className="primary-action" href="#/profile/profile-studio">Edit My Page</a><button className="secondary-action" type="button" onClick={() => setTab('blog')}>My Blog</button><a className="secondary-action" href="#/profile/display-name-style">Name Style</a></> : <><a className="primary-action" href="#/messages/friends">Message</a><button className="secondary-action" type="button" onClick={() => setTab('guestbook')}>Guestbook</button></>}</div></div>
      </section>

      <div className="hanami-profile-layout">
        {layout.sidebarSide === 'left' && sidebar}
        <section className="hanami-profile-main">
          <nav className="hanami-profile-tabs"><button className={tab === 'board' ? 'active' : ''} onClick={() => setTab('board')}>Profile</button><button className={tab === 'activity' ? 'active' : ''} onClick={() => setTab('activity')}>Bulletins</button><button className={tab === 'blog' ? 'active' : ''} onClick={() => setTab('blog')}>Blog</button><button className={tab === 'guestbook' ? 'active' : ''} onClick={() => setTab('guestbook')}>Comments</button></nav>
          {tab === 'board' && <div className="hanami-profile-board">{widgets.length === 0 ? <div className="hanami-profile-empty">{own ? 'Your page is empty. Add widgets in Profile Studio.' : 'This member has not added profile widgets yet.'}</div> : <div className="published-widget-canvas">{widgets.map((widget) => <article className={`published-widget widget-${safeClass(widget.widget_type)}`} key={widget.id} style={{ gridColumn: `span ${Math.min(Math.max(widget.width, 1), 12)}`, minHeight: `${Math.max(widget.height, 1) * 48}px` }}><header><strong>{widget.title || widget.widget_type.replaceAll('_', ' ')}</strong></header><div className="published-widget-body">{renderWidgetBody(widget, media)}</div></article>)}</div>}</div>}
          {tab === 'activity' && <div className="hanami-profile-activity">{posts.length === 0 ? <div className="hanami-profile-empty">No public bulletins yet.</div> : posts.map((post) => <article key={post.id}><span>{post.post_type}</span><div><strong>{post.title || name}</strong><p>{post.body}</p><small>{new Date(post.published_at || post.created_at).toLocaleString()}</small></div></article>)}</div>}
          {tab === 'blog' && <div className="hanami-profile-blog">{blogPosts.length === 0 ? <div className="hanami-profile-empty">{own ? 'You have not published a blog entry yet.' : 'No public blog entries yet.'}</div> : blogPosts.map((post) => <article key={post.id}><header><div><span className="eyebrow">BLOG ENTRY</span><h2>{post.title || 'Untitled entry'}</h2></div><time>{new Date(post.published_at || post.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</time></header><p>{post.body}</p><footer><span>{post.comments_enabled ? 'Comments open' : 'Comments closed'}</span><a href={`#/social/blogs/${encodeURIComponent(post.id)}`}>Open post & comments →</a></footer></article>)}</div>}
          {tab === 'guestbook' && <div id="profile-guestbook" className="hanami-profile-guestbook"><GuestbookPanel targetCharacterId={characterId} guestbookVisibility={profile.guestbook_visibility} management={own}/></div>}
        </section>
        {layout.sidebarSide === 'right' && sidebar}
      </div>
    </div>}
  </main>
}

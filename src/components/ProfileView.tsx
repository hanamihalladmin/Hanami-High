import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { getSignedProfileMediaUrl } from '../lib/profileMedia'
import { profilePageBackgroundFrom, profilePageBackgroundStyle } from '../lib/profilePageTheme'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { Json, PublishedProfileWidget, SocialPost } from '../types/database'
import type { PublishedCharacterProfileWithCosmetics } from '../types/database-customization'
import { GuestbookPanel } from './GuestbookPanel'
import { ShellTopbar } from './ShellTopbar'

type Props = { targetCharacterId?: string; onSearch: () => void; onNotifications: () => void; unreadCount: number }
type Tab = 'about' | 'board' | 'activity' | 'blog' | 'guestbook'
type Theme = { background: string; panel: string; accent: string; ink: string; grid: boolean; displayFont: string; displayEffect: string; displayColor: string; displayColor2: string }
type Cosmetics = { avatarDecoration?: string; frame?: string; effect?: string; nameplate?: string; profileCard?: string; backgroundPack?: string }
type Presence = { status: string; last_seen_at: string } | null

const fallback: Theme = { background: '#313338', panel: '#1e1f22', accent: '#d86f8b', ink: '#f2f3f5', grid: false, displayFont: 'classic', displayEffect: 'solid', displayColor: '#d86f8b', displayColor2: '#f6b7cb' }
function obj(value: Json) { return value && !Array.isArray(value) && typeof value === 'object' ? value as Record<string, Json | undefined> : {} }
function themeFrom(value: Json): Theme { const s = obj(value); return { background: typeof s.background === 'string' ? s.background : fallback.background, panel: typeof s.panel === 'string' ? s.panel : fallback.panel, accent: typeof s.accent === 'string' ? s.accent : fallback.accent, ink: typeof s.ink === 'string' ? s.ink : fallback.ink, grid: typeof s.grid === 'boolean' ? s.grid : false, displayFont: typeof s.displayFont === 'string' ? s.displayFont : 'classic', displayEffect: typeof s.displayEffect === 'string' ? s.displayEffect : 'solid', displayColor: typeof s.displayColor === 'string' ? s.displayColor : '#d86f8b', displayColor2: typeof s.displayColor2 === 'string' ? s.displayColor2 : '#f6b7cb' } }
function cosmeticsFrom(value: Json): Cosmetics { const s = obj(value); return { avatarDecoration: typeof s.avatarDecoration === 'string' ? s.avatarDecoration : undefined, frame: typeof s.frame === 'string' ? s.frame : undefined, effect: typeof s.effect === 'string' ? s.effect : undefined, nameplate: typeof s.nameplate === 'string' ? s.nameplate : undefined, profileCard: typeof s.profileCard === 'string' ? s.profileCard : undefined, backgroundPack: typeof s.backgroundPack === 'string' ? s.backgroundPack : undefined } }
function widgetContent(value: Json) { const valueContent = obj(value).content; return typeof valueContent === 'string' ? valueContent : '' }
function widgetPath(value: Json) { const path = obj(value).storagePath; return typeof path === 'string' ? path : null }
function roleLabel(role: string | null) { if (role === 'new_faculty') return 'New Teacher'; if (role === 'faculty') return 'Teacher'; if (role === 'administration') return 'Staff'; if (role === 'new_student') return 'New Student'; if (role === 'student') return 'Student'; return role ? role.split('_').map((part) => part[0]?.toUpperCase() + part.slice(1)).join(' ') : 'Hanami Member' }
function safeClass(value?: string) { return (value || 'none').replace(/[^a-z0-9-]/gi, '-').toLowerCase() }
function noteKey(id: string) { return `hanami-profile-note:${id}` }
function lines(value: string) { return value.split(/\r?\n|\s*\|\s*/).map((item) => item.trim()).filter(Boolean) }
function presenceState(presence: Presence) {
  if (!presence) return 'offline'
  const age = Date.now() - new Date(presence.last_seen_at).getTime()
  if (!Number.isFinite(age) || age > 120_000 || presence.status === 'invisible') return 'offline'
  if (presence.status === 'idle' || presence.status === 'away') return 'idle'
  if (presence.status === 'dnd') return 'dnd'
  return 'online'
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
  const [media, setMedia] = useState<Record<string, string>>({})
  const [memberSince, setMemberSince] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [tab, setTab] = useState<Tab>('about')
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
    if (!client || !id) return
    setLoading(true)
    setError(null)
    const [profileResult, characterResult, widgetResult, activityResult, presenceResult] = await Promise.all([
      client.from('published_character_profiles').select('*').eq('character_id', id).maybeSingle(),
      client.from('characters').select('created_at').eq('id', id).maybeSingle(),
      client.from('published_profile_widgets').select('*').eq('character_id', id).order('y').order('x'),
      client.from('social_posts').select('*').eq('author_character_id', id).eq('state', 'published').order('published_at', { ascending: false }).limit(30),
      client.from('character_presence').select('status,last_seen_at').eq('character_id', id).maybeSingle(),
    ])
    setLoading(false)
    const first = profileResult.error || characterResult.error || widgetResult.error || activityResult.error || presenceResult.error
    if (first) { setError(first.message); return }
    setProfile(profileResult.data)
    setWidgets(widgetResult.data ?? [])
    setPosts(activityResult.data ?? [])
    setPresence(presenceResult.data)
    setMemberSince(characterResult.data?.created_at ?? null)
    void hydrate(profileResult.data, widgetResult.data ?? [])
  }, [characterId, hydrate])

  useEffect(() => { void load() }, [load])
  useEffect(() => { if (characterId) setNote(localStorage.getItem(noteKey(characterId)) || '') }, [characterId])

  const theme = useMemo(() => themeFrom(profile?.theme ?? {}), [profile?.theme])
  const pageBackground = useMemo(() => profilePageBackgroundFrom(profile?.theme ?? {}), [profile?.theme])
  const cosmetics = useMemo(() => cosmeticsFrom(profile?.cosmetics ?? {}), [profile?.cosmetics])
  const blogPosts = useMemo(() => posts.filter((post) => post.post_type === 'blog'), [posts])
  const presenceClass = presenceState(presence)
  if (!activeCharacter || !characterId) return null

  const ownName = activeCharacter.display_name || [activeCharacter.first_name, activeCharacter.last_name].filter(Boolean).join(' ') || 'Your Character'
  const name = profile?.display_name || (own ? ownName : 'Hanami Profile')
  const handle = profile?.handle ? `@${profile.handle}` : '@hanami-member'
  const backgroundUrl = pageBackground.imagePath ? media[pageBackground.imagePath] ?? null : null
  const memberDate = memberSince ? new Date(memberSince).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : profile ? new Date(profile.published_at).toLocaleDateString() : '—'
  const style = {
    ...profilePageBackgroundStyle(pageBackground, backgroundUrl, theme.accent),
    '--profile-bg': theme.background,
    '--profile-panel': theme.panel,
    '--profile-accent': theme.accent,
    '--profile-ink': theme.ink,
    '--display-color': theme.displayColor,
    '--display-color-2': theme.displayColor2,
  } as CSSProperties

  return <main className="content-area published-profile-page discord-profile-experience-page">
    <ShellTopbar eyebrow={own ? 'MY PROFILE' : 'HANAMI PROFILE'} title={name} onSearch={onSearch} onNotifications={onNotifications} unreadCount={unreadCount}/>
    {error && <div className="identity-notice error">{error}</div>}
    {loading ? <div className="studio-loading">Loading profile…</div> : !profile ? <section className="shell-module-card"><h2>{own ? 'Publish your profile first.' : 'Profile unavailable.'}</h2><p>{own ? 'Build your page in Profile Studio, then publish it.' : 'This member has not published a visible profile.'}</p></section> : <div className={`discord-profile-experience-shell ${theme.grid ? 'show-grid' : ''} cosmetic-frame-${safeClass(cosmetics.frame)} cosmetic-avatar-${safeClass(cosmetics.avatarDecoration)} cosmetic-effect-${safeClass(cosmetics.effect)} cosmetic-card-${safeClass(cosmetics.profileCard)} cosmetic-bg-${safeClass(cosmetics.backgroundPack)}`} style={style}>
      <div className="discord-profile-experience-grid">
        <section className="discord-profile-card">
          <div className="discord-profile-card-banner" style={{ background: theme.accent }}>
            {profile.banner_path && media[profile.banner_path] && <img src={media[profile.banner_path]} alt={`${name} banner`}/>} 
          </div>

          <div className="discord-profile-card-avatar-wrap">
            <div className="discord-profile-card-avatar">
              {profile.avatar_path && media[profile.avatar_path] ? <img src={media[profile.avatar_path]} alt={`${name} avatar`}/> : name.slice(0, 2).toUpperCase()}
            </div>
            <span className={`discord-profile-card-status status-${presenceClass}`} title={presenceClass === 'dnd' ? 'Do Not Disturb' : presenceClass.charAt(0).toUpperCase() + presenceClass.slice(1)}/>
            <span className="hanami-avatar-decoration" aria-hidden="true"/>
          </div>

          <div className="discord-profile-card-actions">
            {own ? <>
              <a className="discord-profile-button primary" href="#/profile/profile-studio">Edit Profile</a>
              <a className="discord-profile-icon-button" href="#/profile/display-name-style" aria-label="Edit display name style">Aa</a>
            </> : <>
              <a className="discord-profile-button primary" href="#/messages/friends">Message</a>
              <button className="discord-profile-icon-button" type="button" onClick={() => setTab('guestbook')} aria-label="Open guestbook">✎</button>
            </>}
          </div>

          <div className="discord-profile-card-body">
            <div className="discord-profile-card-nameblock">
              <h1 className={`profile-display-name profile-font-${theme.displayFont} profile-effect-${theme.displayEffect}`}>{name}</h1>
              <p>{handle}{profile.pronouns ? ` · ${profile.pronouns}` : ''}</p>
              <div className="discord-profile-badges">
                <span className="discord-profile-role-badge"><i style={{ background: theme.accent }}/>{roleLabel(profile.school_role)}</span>
                <span className="discord-profile-network-badge" title="Hanami High member">花</span>
              </div>
              {profile.custom_status && <div className="discord-profile-status-copy">{profile.custom_status}</div>}
            </div>

            <nav className="discord-profile-tabs" aria-label="Profile sections">
              <button className={tab === 'about' ? 'active' : ''} type="button" onClick={() => setTab('about')}>User Info</button>
              <button className={tab === 'board' ? 'active' : ''} type="button" onClick={() => setTab('board')}>Board</button>
              <button className={tab === 'activity' ? 'active' : ''} type="button" onClick={() => setTab('activity')}>Activity</button>
              <button className={tab === 'blog' ? 'active' : ''} type="button" onClick={() => setTab('blog')}>Blog</button>
              <button className={tab === 'guestbook' ? 'active' : ''} type="button" onClick={() => setTab('guestbook')}>Guestbook</button>
            </nav>

            <div className="discord-profile-tab-content">
              {tab === 'about' && <div className="discord-profile-user-info">
                {profile.bio && <section><strong>ABOUT ME</strong><p>{profile.bio}</p></section>}
                <section><strong>ROLES</strong><div className="discord-profile-role-row"><span className="discord-role-chip"><i style={{ background: theme.accent }}/>{roleLabel(profile.school_role)}</span></div></section>
                <section><strong>MEMBER SINCE</strong><p>{memberDate}</p></section>
                <section><strong>CONNECTIONS</strong><div className="discord-profile-connection"><span>花</span><div><b>Hanami High</b><small>Campus Network · 2006</small></div></div></section>
                {!own && <section><strong>NOTE</strong><textarea value={note} placeholder="Click to add a note" onChange={(event) => setNote(event.target.value)} onBlur={() => localStorage.setItem(noteKey(characterId), note)}/></section>}
              </div>}

              {tab === 'board' && <div className="discord-profile-board">{widgets.length === 0 ? <div className="hanami-profile-empty">{own ? 'Your board is empty. Add widgets in Profile Studio.' : 'This member has not added profile widgets yet.'}</div> : <div className="published-widget-canvas">{widgets.map((widget) => <article className={`published-widget widget-${safeClass(widget.widget_type)}`} key={widget.id} style={{ gridColumn: `span ${Math.min(Math.max(widget.width, 1), 12)}`, minHeight: `${Math.max(widget.height, 1) * 48}px` }}><header><strong>{widget.title || widget.widget_type.replaceAll('_', ' ')}</strong></header><div className="published-widget-body">{renderWidgetBody(widget, media)}</div></article>)}</div>}</div>}

              {tab === 'activity' && <div className="discord-profile-activity-list">{posts.length === 0 ? <div className="hanami-profile-empty">No public activity yet.</div> : posts.map((post) => <article key={post.id}><span className="discord-profile-activity-icon">✦</span><div><strong>{post.title || name}</strong><p>{post.body}</p><small>{post.post_type} · {new Date(post.published_at || post.created_at).toLocaleString()}</small></div></article>)}</div>}

              {tab === 'blog' && <div className="discord-profile-blog-list">{blogPosts.length === 0 ? <div className="hanami-profile-empty">{own ? 'You have not published a blog entry yet.' : 'No public blog entries yet.'}</div> : blogPosts.map((post) => <article key={post.id}><header><h2>{post.title || 'Untitled entry'}</h2><time>{new Date(post.published_at || post.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</time></header><p>{post.body}</p><a href={`#/social/blogs/${encodeURIComponent(post.id)}`}>Open post & comments →</a></article>)}</div>}

              {tab === 'guestbook' && <div id="profile-guestbook" className="discord-profile-guestbook"><GuestbookPanel targetCharacterId={characterId} guestbookVisibility={profile.guestbook_visibility} management={own}/></div>}
            </div>
          </div>
        </section>

        <aside className="discord-profile-side-panel">
          <div className="discord-profile-side-art" style={{ background: `linear-gradient(145deg, ${theme.accent}, #1e1f22)` }}><span>花</span></div>
          <div className="discord-profile-side-copy">
            <span>ACTIVITY</span>
            <h2>{posts[0]?.title || 'Hanami High'}</h2>
            <p>{posts[0]?.body || profile.custom_status || `${roleLabel(profile.school_role)} on the Hanami campus network.`}</p>
            <div className="discord-profile-side-progress"><span style={{ width: posts.length ? '72%' : '24%', background: theme.accent }}/></div>
            <small>{posts.length ? `${posts.length} public update${posts.length === 1 ? '' : 's'}` : 'No recent public activity'}</small>
          </div>
        </aside>
      </div>
    </div>}
  </main>
}

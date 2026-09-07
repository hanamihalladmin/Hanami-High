import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { supabase } from '../lib/supabase'
import { getSignedProfileMediaUrl } from '../lib/profileMedia'
import { useIdentity } from '../state/IdentityContext'
import type { Json, PublishedCharacterProfile, PublishedProfileWidget } from '../types/database'
import { GuestbookPanel } from './GuestbookPanel'
import { ShellTopbar } from './ShellTopbar'

type Props = {
  targetCharacterId?: string
  onSearch: () => void
  onNotifications: () => void
  unreadCount: number
}

type PublishedTheme = {
  background: string
  panel: string
  accent: string
  ink: string
  grid: boolean
}

const fallbackTheme: PublishedTheme = {
  background: '#f4f0e8',
  panel: '#fffdf8',
  accent: '#d86f8b',
  ink: '#17223b',
  grid: false,
}

function configObject(value: Json) {
  return value && !Array.isArray(value) && typeof value === 'object'
    ? value as Record<string, Json | undefined>
    : {}
}

function themeFromJson(value: Json): PublishedTheme {
  const source = configObject(value)
  return {
    background: typeof source.background === 'string' ? source.background : fallbackTheme.background,
    panel: typeof source.panel === 'string' ? source.panel : fallbackTheme.panel,
    accent: typeof source.accent === 'string' ? source.accent : fallbackTheme.accent,
    ink: typeof source.ink === 'string' ? source.ink : fallbackTheme.ink,
    grid: typeof source.grid === 'boolean' ? source.grid : fallbackTheme.grid,
  }
}

function widgetContent(value: Json) {
  const content = configObject(value).content
  return typeof content === 'string' ? content : ''
}

function widgetStoragePath(value: Json) {
  const path = configObject(value).storagePath
  return typeof path === 'string' ? path : null
}

function roleLabel(role: string | null) {
  if (role === 'new_faculty') return 'New Teacher'
  if (role === 'faculty') return 'Teacher'
  if (role === 'administration') return 'Staff'
  if (role === 'new_student') return 'New Student'
  if (role === 'student') return 'Student'
  if (!role) return 'Hanami Member'
  return role.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

function noteKey(characterId: string) {
  return `hanami-profile-note:${characterId}`
}

export function ProfileView({ targetCharacterId, onSearch, onNotifications, unreadCount }: Props) {
  const { activeCharacter } = useIdentity()
  const characterId = targetCharacterId || activeCharacter?.id
  const isOwnProfile = Boolean(activeCharacter && characterId === activeCharacter.id)
  const [profile, setProfile] = useState<PublishedCharacterProfile | null>(null)
  const [widgets, setWidgets] = useState<PublishedProfileWidget[]>([])
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({})
  const [memberSince, setMemberSince] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadMedia = useCallback(async (nextProfile: PublishedCharacterProfile | null, nextWidgets: PublishedProfileWidget[]) => {
    if (!nextProfile) {
      setMediaUrls({})
      return
    }
    const paths = Array.from(new Set([
      nextProfile.avatar_path,
      nextProfile.banner_path,
      ...nextWidgets.map((widget) => widgetStoragePath(widget.config)),
    ].filter((path): path is string => Boolean(path))))

    const entries = await Promise.all(paths.map(async (path) => {
      try {
        const url = await getSignedProfileMediaUrl(path)
        return url ? [path, url] as const : null
      } catch {
        return null
      }
    }))
    setMediaUrls(Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => Boolean(entry))))
  }, [])

  const load = useCallback(async () => {
    const client = supabase
    if (!client || !characterId) return
    setLoading(true)
    setError(null)
    setProfile(null)
    setWidgets([])
    setMediaUrls({})
    setMemberSince(null)

    const [profileResult, characterResult] = await Promise.all([
      client.from('published_character_profiles').select('*').eq('character_id', characterId).maybeSingle(),
      client.from('characters').select('created_at').eq('id', characterId).maybeSingle(),
    ])

    if (profileResult.error) {
      setLoading(false)
      setError(profileResult.error.message)
      return
    }

    if (characterResult.data?.created_at) setMemberSince(characterResult.data.created_at)

    if (!profileResult.data) {
      setLoading(false)
      return
    }

    const widgetResult = await client
      .from('published_profile_widgets')
      .select('*')
      .eq('character_id', characterId)
      .order('y')
      .order('x')

    setLoading(false)
    if (widgetResult.error) {
      setError(widgetResult.error.message)
      return
    }

    const nextWidgets = widgetResult.data ?? []
    setProfile(profileResult.data)
    setWidgets(nextWidgets)
    void loadMedia(profileResult.data, nextWidgets)
  }, [characterId, loadMedia])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!characterId || typeof window === 'undefined') return
    setNote(localStorage.getItem(noteKey(characterId)) || '')
  }, [characterId])

  const theme = useMemo(() => themeFromJson(profile?.theme ?? {}), [profile?.theme])
  const ownCharacterName = activeCharacter?.display_name
    || [activeCharacter?.first_name, activeCharacter?.last_name].filter(Boolean).join(' ')
    || 'Your Character'
  const characterName = profile?.display_name || (isOwnProfile ? ownCharacterName : 'Hanami Profile')
  const handle = profile?.handle ? `@${profile.handle}` : '@hanami-member'
  const memberDate = memberSince ? new Date(memberSince) : null

  if (!activeCharacter || !characterId) return null

  return <main className="content-area published-profile-page">
    <ShellTopbar eyebrow={isOwnProfile ? 'MY PROFILE' : 'HANAMI PROFILE'} title={characterName} onSearch={onSearch} onNotifications={onNotifications} unreadCount={unreadCount}/>
    {error && <div className="identity-notice error">{error}</div>}

    {loading ? <div className="studio-loading">Loading published profile…</div> : !profile ? <section className="shell-module-card unpublished-profile-card"><span className="eyebrow">{isOwnProfile ? 'NOT PUBLISHED' : 'PROFILE UNAVAILABLE'}</span><h2>{isOwnProfile ? 'Your public profile does not have a published snapshot yet.' : 'This profile is not available to your account.'}</h2><p>{isOwnProfile ? 'Build your profile in Profile Studio and publish it when you are ready.' : 'The character may not have published a profile, or their visibility settings may not include you.'}</p></section> : <div
      className={`published-profile-shell discord-profile-shell ${theme.grid ? 'show-grid' : ''}`}
      style={{
        background: theme.background,
        color: theme.ink,
        '--profile-panel': theme.panel,
        '--profile-accent': theme.accent,
      } as CSSProperties}
    >
      <div className="discord-profile-grid">
        <section className="discord-identity-card">
          <div className="discord-profile-banner" style={{ backgroundColor: theme.accent }}>
            {profile.banner_path && mediaUrls[profile.banner_path] && <img src={mediaUrls[profile.banner_path]} alt={`${characterName} profile banner`}/>} 
          </div>

          <div className="discord-avatar-wrap">
            <div className="discord-profile-avatar">
              {profile.avatar_path && mediaUrls[profile.avatar_path]
                ? <img src={mediaUrls[profile.avatar_path]} alt={`${characterName} avatar`}/>
                : characterName.slice(0, 2).toUpperCase()}
            </div>
            <span className="discord-status-dot" title="Hanami member"/>
          </div>

          <div className="discord-profile-actions">
            {isOwnProfile
              ? <a className="discord-profile-action primary" href="#/profile/profile-studio">Edit Profile</a>
              : <a className="discord-profile-action primary" href="#profile-guestbook">Guestbook</a>}
            <a className="discord-profile-action" href="#/social/friends">Friends</a>
          </div>

          <div className="discord-profile-body">
            <header className="discord-profile-nameblock">
              <h1>{characterName}</h1>
              <div><strong>{handle}</strong>{profile.pronouns && <span>{profile.pronouns}</span>}</div>
              {profile.custom_status && <p className="discord-custom-status">{profile.custom_status}</p>}
            </header>

            <div className="discord-profile-info-card">
              {profile.bio && <section><strong>ABOUT ME</strong><p>{profile.bio}</p></section>}
              <section><strong>ROLES</strong><div className="discord-role-list"><span className="discord-role-dot"/><span>{roleLabel(profile.school_role)}</span><span className="discord-role-chip">Hanami High</span></div></section>
              <section className="discord-member-since"><strong>MEMBER SINCE</strong><div><span>✿ Hanami High</span><span>{memberDate ? memberDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : new Date(profile.published_at).toLocaleDateString()}</span></div></section>
              <section><strong>CONNECTIONS</strong><div className="discord-connection-row"><span className="discord-connection-icon">H</span><div><b>Hanami High Network</b><small>{roleLabel(profile.school_role)}</small></div></div></section>
              <section><strong>NOTE</strong><textarea value={note} placeholder="Click to add a private note" onChange={(event) => setNote(event.target.value)} onBlur={() => localStorage.setItem(noteKey(characterId), note)}/></section>
            </div>
          </div>
        </section>

        <aside className="discord-activity-panel">
          <div className="discord-activity-art" style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.panel})` }}><span>✿</span></div>
          <div className="discord-activity-copy"><span className="eyebrow">CURRENT ACTIVITY</span><h2>Hanami High</h2><p>{profile.custom_status || `Viewing ${roleLabel(profile.school_role).toLowerCase()} profile`}</p><div className="discord-activity-progress"><span style={{ width: '72%' }}/></div><div className="discord-activity-times"><small>Campus network</small><small>2006</small></div></div>
        </aside>
      </div>

      {widgets.length > 0 && <section className="discord-customization-section"><header><div><span className="eyebrow">PROFILE CUSTOMIZATION</span><h2>{characterName}'s Space</h2></div><span>{widgets.length} widget{widgets.length === 1 ? '' : 's'}</span></header><div className="published-widget-canvas">{widgets.map((widget) => {
        const imagePath = widgetStoragePath(widget.config)
        return <article className={`published-widget widget-${widget.widget_type}`} key={widget.id} style={{ gridColumn: `span ${Math.min(Math.max(widget.width, 1), 12)}`, minHeight: `${Math.max(widget.height, 1) * 48}px` }}><header><strong>{widget.title || widget.widget_type.replaceAll('_', ' ')}</strong></header><div className="published-widget-body">{widget.widget_type === 'image' && imagePath && mediaUrls[imagePath] ? <img className="published-widget-image" src={mediaUrls[imagePath]} alt={widget.title || 'Profile image'}/> : widget.widget_type === 'divider' ? <div className="published-divider"/> : <p>{widgetContent(widget.config) || 'This widget has no published content.'}</p>}</div></article>
      })}</div></section>}

      <div id="profile-guestbook"><GuestbookPanel targetCharacterId={characterId} guestbookVisibility={profile.guestbook_visibility} management={isOwnProfile}/></div>
    </div>}
  </main>
}

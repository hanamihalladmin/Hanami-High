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
  if (!role) return 'Hanami Student'
  return role.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

export function ProfileView({ targetCharacterId, onSearch, onNotifications, unreadCount }: Props) {
  const { activeCharacter } = useIdentity()
  const characterId = targetCharacterId || activeCharacter?.id
  const isOwnProfile = Boolean(activeCharacter && characterId === activeCharacter.id)
  const [profile, setProfile] = useState<PublishedCharacterProfile | null>(null)
  const [widgets, setWidgets] = useState<PublishedProfileWidget[]>([])
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({})
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

    const profileResult = await client
      .from('published_character_profiles')
      .select('*')
      .eq('character_id', characterId)
      .maybeSingle()

    if (profileResult.error) {
      setLoading(false)
      setError(profileResult.error.message)
      return
    }

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

  useEffect(() => {
    void load()
  }, [load])

  const theme = useMemo(() => themeFromJson(profile?.theme ?? {}), [profile?.theme])
  const ownCharacterName = activeCharacter?.display_name
    || [activeCharacter?.first_name, activeCharacter?.last_name].filter(Boolean).join(' ')
    || 'Your Character'
  const characterName = profile?.display_name || (isOwnProfile ? ownCharacterName : 'Hanami Profile')

  if (!activeCharacter || !characterId) return null

  return (
    <main className="content-area published-profile-page">
      <ShellTopbar
        eyebrow={isOwnProfile ? 'MY PROFILE' : 'HANAMI PROFILE'}
        title={characterName}
        onSearch={onSearch}
        onNotifications={onNotifications}
        unreadCount={unreadCount}
      />

      {error && <div className="identity-notice error">{error}</div>}

      {loading ? (
        <div className="studio-loading">Loading published profile…</div>
      ) : !profile ? (
        <section className="shell-module-card unpublished-profile-card">
          <span className="eyebrow">{isOwnProfile ? 'NOT PUBLISHED' : 'PROFILE UNAVAILABLE'}</span>
          <h2>{isOwnProfile ? 'Your public profile does not have a published snapshot yet.' : 'This profile is not available to your account.'}</h2>
          <p>
            {isOwnProfile
              ? 'Build your layout in Profile Studio and publish it when you are ready. Autosaved draft changes and private media stay hidden until then.'
              : 'The character may not have published a profile, or their profile visibility may not include you. Hanami does not expose private draft or character data as a fallback.'}
          </p>
        </section>
      ) : (
        <div
          className={`published-profile-shell ${theme.grid ? 'show-grid' : ''}`}
          style={{
            background: theme.background,
            color: theme.ink,
            '--profile-panel': theme.panel,
            '--profile-accent': theme.accent,
          } as CSSProperties}
        >
          {profile.banner_path && mediaUrls[profile.banner_path] && (
            <div className="published-profile-banner">
              <img src={mediaUrls[profile.banner_path]} alt={`${characterName} profile banner`} />
            </div>
          )}

          <header className="published-profile-header">
            <div className="published-profile-avatar">
              {profile.avatar_path && mediaUrls[profile.avatar_path]
                ? <img src={mediaUrls[profile.avatar_path]} alt={`${characterName} avatar`} />
                : characterName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <span>{profile.custom_status || roleLabel(profile.school_role)}</span>
              <h1>{characterName}</h1>
              <p>
                {profile.handle ? `@${profile.handle}` : roleLabel(profile.school_role)}
                {profile.pronouns ? ` · ${profile.pronouns}` : ''}
              </p>
            </div>
            <div className="published-profile-meta">
              <strong>{profile.profile_visibility === 'hanami' ? 'Hanami Network' : profile.profile_visibility}</strong>
              <small>Published {new Date(profile.published_at).toLocaleDateString()}</small>
            </div>
          </header>

          {profile.bio && <section className="published-profile-bio"><strong>About</strong><p>{profile.bio}</p></section>}

          <div className="published-widget-canvas">
            {widgets.length === 0 && <div className="canvas-empty"><strong>No published widgets.</strong><span>This profile is using only its header and bio.</span></div>}
            {widgets.map((widget) => {
              const imagePath = widgetStoragePath(widget.config)
              return (
                <article
                  className={`published-widget widget-${widget.widget_type}`}
                  key={widget.id}
                  style={{ gridColumn: `${widget.x} / span ${widget.width}`, gridRow: `${widget.y} / span ${widget.height}`, zIndex: widget.z_index }}
                >
                  {widget.title && <header>{widget.title}</header>}
                  <div>
                    {widget.widget_type === 'image' && imagePath && mediaUrls[imagePath] && (
                      <img className="published-widget-image" src={mediaUrls[imagePath]} alt={widget.title || 'Profile image'} />
                    )}
                    {widgetContent(widget.config).split('\n').map((line, index) => <p key={`${widget.id}-${index}`}>{line || ' '}</p>)}
                  </div>
                </article>
              )
            })}
          </div>

          <GuestbookPanel
            targetCharacterId={characterId}
            guestbookVisibility={profile.guestbook_visibility}
          />
        </div>
      )}
    </main>
  )
}

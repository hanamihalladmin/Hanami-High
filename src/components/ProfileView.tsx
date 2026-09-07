import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { supabase } from '../lib/supabase'
import { getSignedProfileMediaUrl } from '../lib/profileMedia'
import { useIdentity } from '../state/IdentityContext'
import type { Json, PublishedCharacterProfile, PublishedProfileWidget } from '../types/database'
import { ShellTopbar } from './ShellTopbar'

type Props = {
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

export function ProfileView({ onSearch, onNotifications, unreadCount }: Props) {
  const { activeCharacter } = useIdentity()
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
    if (!client || !activeCharacter) return
    setLoading(true)
    setError(null)
    const [profileResult, widgetResult] = await Promise.all([
      client.from('published_character_profiles').select('*').eq('character_id', activeCharacter.id).maybeSingle(),
      client.from('published_profile_widgets').select('*').eq('character_id', activeCharacter.id).order('y').order('x'),
    ])
    setLoading(false)
    if (profileResult.error || widgetResult.error) {
      setError(profileResult.error?.message || widgetResult.error?.message || 'Published profile could not be loaded.')
      return
    }
    const nextWidgets = widgetResult.data ?? []
    setProfile(profileResult.data)
    setWidgets(nextWidgets)
    void loadMedia(profileResult.data, nextWidgets)
  }, [activeCharacter, loadMedia])

  useEffect(() => {
    void load()
  }, [load])

  const theme = useMemo(() => themeFromJson(profile?.theme ?? {}), [profile?.theme])
  const characterName = activeCharacter?.display_name
    || [activeCharacter?.first_name, activeCharacter?.last_name].filter(Boolean).join(' ')
    || 'Your Character'

  if (!activeCharacter) return null

  return (
    <main className="content-area published-profile-page">
      <ShellTopbar
        eyebrow="MY PROFILE"
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
          <span className="eyebrow">NOT PUBLISHED</span>
          <h2>Your public profile does not have a published snapshot yet.</h2>
          <p>Build your layout in Profile Studio and publish it when you are ready. Autosaved draft changes and private media stay hidden until then.</p>
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
              <span>{profile.custom_status || 'Hanami High student'}</span>
              <h1>{characterName}</h1>
              <p>{profile.pronouns || 'Pronouns not listed'}</p>
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
        </div>
      )}
    </main>
  )
}

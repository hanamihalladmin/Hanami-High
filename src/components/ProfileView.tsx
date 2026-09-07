import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { supabase } from '../lib/supabase'
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

function themeFromJson(value: Json): PublishedTheme {
  if (!value || Array.isArray(value) || typeof value !== 'object') return fallbackTheme
  const source = value as Record<string, Json | undefined>
  return {
    background: typeof source.background === 'string' ? source.background : fallbackTheme.background,
    panel: typeof source.panel === 'string' ? source.panel : fallbackTheme.panel,
    accent: typeof source.accent === 'string' ? source.accent : fallbackTheme.accent,
    ink: typeof source.ink === 'string' ? source.ink : fallbackTheme.ink,
    grid: typeof source.grid === 'boolean' ? source.grid : fallbackTheme.grid,
  }
}

function widgetContent(value: Json) {
  if (!value || Array.isArray(value) || typeof value !== 'object') return ''
  const content = (value as Record<string, Json | undefined>).content
  return typeof content === 'string' ? content : ''
}

export function ProfileView({ onSearch, onNotifications, unreadCount }: Props) {
  const { activeCharacter } = useIdentity()
  const [profile, setProfile] = useState<PublishedCharacterProfile | null>(null)
  const [widgets, setWidgets] = useState<PublishedProfileWidget[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    setProfile(profileResult.data)
    setWidgets(widgetResult.data ?? [])
  }, [activeCharacter])

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
          <p>Build your layout in Profile Studio and publish it when you are ready. Autosaved draft changes stay private until then.</p>
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
          <header className="published-profile-header">
            <div className="published-profile-avatar">{characterName.slice(0, 2).toUpperCase()}</div>
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
            {widgets.map((widget) => (
              <article
                className={`published-widget widget-${widget.widget_type}`}
                key={widget.id}
                style={{ gridColumn: `${widget.x} / span ${widget.width}`, gridRow: `${widget.y} / span ${widget.height}`, zIndex: widget.z_index }}
              >
                {widget.title && <header>{widget.title}</header>}
                <div>{widgetContent(widget.config).split('\n').map((line, index) => <p key={`${widget.id}-${index}`}>{line || ' '}</p>)}</div>
              </article>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}

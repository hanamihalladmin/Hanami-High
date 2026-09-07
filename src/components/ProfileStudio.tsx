import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { CharacterProfile, Json, ProfileWidget } from '../types/database'
import { ShellTopbar } from './ShellTopbar'

type ThemeDraft = {
  background: string
  panel: string
  accent: string
  ink: string
  grid: boolean
}

type Props = {
  onSearch: () => void
  onNotifications: () => void
  unreadCount: number
}

const defaultTheme: ThemeDraft = {
  background: '#f4f0e8',
  panel: '#fffdf8',
  accent: '#d86f8b',
  ink: '#17223b',
  grid: true,
}

const widgetPalette = [
  { type: 'about', label: 'About Me', width: 6, height: 4, content: 'Write something about your character…' },
  { type: 'text', label: 'Text', width: 4, height: 3, content: 'Add your own text…' },
  { type: 'links', label: 'Links', width: 4, height: 3, content: 'Favorite places\nClub page\nBlog' },
  { type: 'status', label: 'Status', width: 4, height: 2, content: 'What are you up to?' },
  { type: 'image', label: 'Image', width: 4, height: 4, content: 'Image uploads will connect through Storage.' },
  { type: 'sticker', label: 'Sticker', width: 2, height: 2, content: '✿' },
] as const

function normalizeTheme(value: Json): ThemeDraft {
  if (!value || Array.isArray(value) || typeof value !== 'object') return defaultTheme
  const source = value as Record<string, Json | undefined>
  return {
    background: typeof source.background === 'string' ? source.background : defaultTheme.background,
    panel: typeof source.panel === 'string' ? source.panel : defaultTheme.panel,
    accent: typeof source.accent === 'string' ? source.accent : defaultTheme.accent,
    ink: typeof source.ink === 'string' ? source.ink : defaultTheme.ink,
    grid: typeof source.grid === 'boolean' ? source.grid : defaultTheme.grid,
  }
}

function configContent(value: Json) {
  if (!value || Array.isArray(value) || typeof value !== 'object') return ''
  const content = (value as Record<string, Json | undefined>).content
  return typeof content === 'string' ? content : ''
}

function withContent(value: Json, content: string): Json {
  const base = value && !Array.isArray(value) && typeof value === 'object'
    ? value as Record<string, Json | undefined>
    : {}
  return { ...base, content }
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value))
}

export function ProfileStudio({ onSearch, onNotifications, unreadCount }: Props) {
  const { activeCharacter, refreshIdentity } = useIdentity()
  const [profile, setProfile] = useState<CharacterProfile | null>(null)
  const [widgets, setWidgets] = useState<ProfileWidget[]>([])
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveLabel, setSaveLabel] = useState('Loading draft…')
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastPublished, setLastPublished] = useState<string | null>(null)

  const load = useCallback(async () => {
    const client = supabase
    if (!client || !activeCharacter) return
    setLoading(true)
    setError(null)
    const [profileResult, widgetResult] = await Promise.all([
      client.from('character_profiles').select('*').eq('character_id', activeCharacter.id).single(),
      client.from('profile_widgets').select('*').eq('character_id', activeCharacter.id).order('y').order('x'),
    ])
    setLoading(false)
    if (profileResult.error || widgetResult.error) {
      setError(profileResult.error?.message || widgetResult.error?.message || 'Profile Studio could not be loaded.')
      return
    }
    setProfile(profileResult.data)
    setWidgets(widgetResult.data ?? [])
    setLastPublished(profileResult.data.published_at)
    setSaveLabel('Draft loaded')
  }, [activeCharacter])

  useEffect(() => {
    void load()
  }, [load])

  async function saveAll(quiet = false) {
    const client = supabase
    if (!client || !activeCharacter || !profile) return false
    setSaving(true)
    if (!quiet) setSaveLabel('Saving…')
    setError(null)

    const profileResult = await client
      .from('character_profiles')
      .update({
        bio: profile.bio,
        custom_status: profile.custom_status,
        pronouns: profile.pronouns,
        profile_visibility: profile.profile_visibility,
        guestbook_visibility: profile.guestbook_visibility,
        theme_draft: profile.theme_draft,
        updated_at: new Date().toISOString(),
      })
      .eq('character_id', activeCharacter.id)

    let widgetError: { message: string } | null = null
    if (widgets.length > 0) {
      const widgetResult = await client.from('profile_widgets').upsert(
        widgets.map((widget) => ({
          id: widget.id,
          character_id: widget.character_id,
          widget_type: widget.widget_type,
          title: widget.title,
          config: widget.config,
          x: widget.x,
          y: widget.y,
          width: widget.width,
          height: widget.height,
          z_index: widget.z_index,
          is_visible: widget.is_visible,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: 'id' },
      )
      widgetError = widgetResult.error
    }

    setSaving(false)
    const saveError = profileResult.error ?? widgetError
    if (saveError) {
      setError(saveError.message)
      setSaveLabel('Save failed')
      return false
    }
    setSaveLabel(quiet ? 'Autosaved' : 'Saved')
    return true
  }

  useEffect(() => {
    if (revision === 0 || !profile || loading) return
    const timer = window.setTimeout(() => {
      void saveAll(true)
    }, 850)
    return () => window.clearTimeout(timer)
  }, [revision])

  function touch() {
    setRevision((current) => current + 1)
  }

  function patchProfile<K extends keyof CharacterProfile>(key: K, value: CharacterProfile[K]) {
    setProfile((current) => current ? { ...current, [key]: value } : current)
    touch()
  }

  function patchTheme<K extends keyof ThemeDraft>(key: K, value: ThemeDraft[K]) {
    if (!profile) return
    const theme = normalizeTheme(profile.theme_draft)
    patchProfile('theme_draft', { ...theme, [key]: value })
  }

  function patchWidget(id: string, patch: Partial<ProfileWidget>) {
    setWidgets((current) => current.map((widget) => widget.id === id ? { ...widget, ...patch } : widget))
    touch()
  }

  async function addWidget(type: (typeof widgetPalette)[number]) {
    const client = supabase
    if (!client || !activeCharacter) return
    setError(null)
    const nextY = widgets.reduce((maximum, widget) => Math.max(maximum, widget.y + widget.height), 0) + 1
    const { data, error: insertError } = await client
      .from('profile_widgets')
      .insert({
        character_id: activeCharacter.id,
        widget_type: type.type,
        title: type.label,
        config: { content: type.content },
        x: 1,
        y: clamp(nextY, 1, 200),
        width: type.width,
        height: type.height,
        z_index: widgets.length,
        is_visible: true,
      })
      .select('*')
      .single()
    if (insertError) {
      setError(insertError.message)
      return
    }
    setWidgets((current) => [...current, data])
    setSaveLabel('Widget added')
  }

  async function removeWidget(id: string) {
    const client = supabase
    if (!client) return
    const { error: deleteError } = await client.from('profile_widgets').delete().eq('id', id)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    setWidgets((current) => current.filter((widget) => widget.id !== id))
    setSaveLabel('Widget removed')
  }

  async function publish() {
    const client = supabase
    if (!client || !activeCharacter) return
    setPublishing(true)
    setError(null)
    const saved = await saveAll()
    if (!saved) {
      setPublishing(false)
      return
    }

    const { data, error: publishError } = await client.rpc('publish_character_profile', {
      p_character_id: activeCharacter.id,
    })
    if (publishError) {
      setPublishing(false)
      setError(publishError.message)
      return
    }

    if (activeCharacter.school_role === 'new_student') {
      const { error: orientationError } = await client.rpc('complete_orientation_task', {
        p_character_id: activeCharacter.id,
        p_task_code: 'profile_customization',
      })
      if (orientationError) {
        setPublishing(false)
        setError(`Profile published, but orientation could not update: ${orientationError.message}`)
        return
      }
    }

    setPublishing(false)
    setLastPublished(data)
    setSaveLabel('Published')
    await refreshIdentity()
  }

  const theme = useMemo(() => normalizeTheme(profile?.theme_draft ?? {}), [profile?.theme_draft])
  const characterName = activeCharacter?.display_name
    || [activeCharacter?.first_name, activeCharacter?.last_name].filter(Boolean).join(' ')
    || 'Your Character'

  if (!activeCharacter) return null

  return (
    <main className="content-area profile-studio-page">
      <ShellTopbar
        eyebrow="PROFILE STUDIO"
        title={`Customize ${characterName}`}
        onSearch={onSearch}
        onNotifications={onNotifications}
        unreadCount={unreadCount}
      />

      {error && <div className="identity-notice error">{error}</div>}

      <div className="studio-toolbar">
        <div>
          <span className="eyebrow">DRAFT WORKSPACE</span>
          <strong>{saving ? 'Saving…' : saveLabel}</strong>
          <small>{lastPublished ? `Last published ${new Date(lastPublished).toLocaleString()}` : 'Not published yet'}</small>
        </div>
        <div className="studio-toolbar-actions">
          <button className="secondary-action" type="button" disabled={saving} onClick={() => void saveAll()}>{saving ? 'Saving…' : 'Save Draft'}</button>
          <button className="primary-action" type="button" disabled={publishing || loading} onClick={() => void publish()}>{publishing ? 'Publishing…' : 'Publish Profile'}</button>
        </div>
      </div>

      {loading || !profile ? (
        <div className="studio-loading">Loading your private profile draft…</div>
      ) : (
        <div className="studio-layout">
          <aside className="studio-panel">
            <section>
              <span className="eyebrow">PROFILE</span>
              <label>Status<input value={profile.custom_status ?? ''} onChange={(event) => patchProfile('custom_status', event.target.value || null)} /></label>
              <label>Pronouns<input value={profile.pronouns ?? ''} onChange={(event) => patchProfile('pronouns', event.target.value || null)} /></label>
              <label>Bio<textarea rows={5} value={profile.bio ?? ''} onChange={(event) => patchProfile('bio', event.target.value || null)} /></label>
              <label>Profile visibility
                <select value={profile.profile_visibility} onChange={(event) => patchProfile('profile_visibility', event.target.value)}>
                  <option value="hanami">Hanami Network</option>
                  <option value="friends">Friends only</option>
                  <option value="private">Private</option>
                </select>
              </label>
              <label>Guestbook
                <select value={profile.guestbook_visibility} onChange={(event) => patchProfile('guestbook_visibility', event.target.value)}>
                  <option value="hanami">Hanami Network</option>
                  <option value="friends">Friends only</option>
                  <option value="disabled">Disabled</option>
                </select>
              </label>
            </section>

            <section>
              <span className="eyebrow">THEME</span>
              <div className="theme-control-grid">
                <label>Background<input type="color" value={theme.background} onChange={(event) => patchTheme('background', event.target.value)} /></label>
                <label>Panels<input type="color" value={theme.panel} onChange={(event) => patchTheme('panel', event.target.value)} /></label>
                <label>Accent<input type="color" value={theme.accent} onChange={(event) => patchTheme('accent', event.target.value)} /></label>
                <label>Text<input type="color" value={theme.ink} onChange={(event) => patchTheme('ink', event.target.value)} /></label>
              </div>
              <label className="studio-checkbox"><input type="checkbox" checked={theme.grid} onChange={(event) => patchTheme('grid', event.target.checked)} /> Show canvas grid</label>
            </section>

            <section>
              <span className="eyebrow">ADD WIDGET</span>
              <div className="widget-palette">
                {widgetPalette.map((item) => (
                  <button type="button" key={item.type} disabled={widgets.length >= 40} onClick={() => void addWidget(item)}>
                    <strong>{item.label}</strong><small>{item.width}×{item.height}</small>
                  </button>
                ))}
              </div>
              <small>{widgets.length} / 40 widgets</small>
            </section>
          </aside>

          <section className="studio-workspace">
            <header>
              <div><span className="eyebrow">CANVAS</span><strong>12-column profile layout</strong></div>
              <span>Move and resize with precision controls</span>
            </header>
            <div
              className={`profile-canvas ${theme.grid ? 'show-grid' : ''}`}
              style={{ background: theme.background, color: theme.ink, '--profile-panel': theme.panel, '--profile-accent': theme.accent } as React.CSSProperties}
            >
              {widgets.length === 0 && (
                <div className="canvas-empty"><strong>Your canvas is empty.</strong><span>Add a widget from the left to start designing.</span></div>
              )}
              {widgets.map((widget) => (
                <article
                  className={`studio-widget ${widget.is_visible ? '' : 'hidden-widget'}`}
                  key={widget.id}
                  style={{ gridColumn: `${widget.x} / span ${widget.width}`, gridRow: `${widget.y} / span ${widget.height}`, zIndex: widget.z_index }}
                >
                  <header><input value={widget.title ?? ''} onChange={(event) => patchWidget(widget.id, { title: event.target.value || null })} /><span>{widget.widget_type}</span></header>
                  <textarea
                    value={configContent(widget.config)}
                    onChange={(event) => patchWidget(widget.id, { config: withContent(widget.config, event.target.value) })}
                    aria-label={`${widget.title || widget.widget_type} content`}
                  />
                  <footer>
                    <div className="widget-nudge-controls">
                      <button type="button" title="Move left" onClick={() => patchWidget(widget.id, { x: clamp(widget.x - 1, 1, 13 - widget.width) })}>←</button>
                      <button type="button" title="Move right" onClick={() => patchWidget(widget.id, { x: clamp(widget.x + 1, 1, 13 - widget.width) })}>→</button>
                      <button type="button" title="Move up" onClick={() => patchWidget(widget.id, { y: clamp(widget.y - 1, 1, 200) })}>↑</button>
                      <button type="button" title="Move down" onClick={() => patchWidget(widget.id, { y: clamp(widget.y + 1, 1, 200) })}>↓</button>
                    </div>
                    <div className="widget-size-controls">
                      <button type="button" onClick={() => patchWidget(widget.id, { width: clamp(widget.width - 1, 1, 12), x: clamp(widget.x, 1, 13 - clamp(widget.width - 1, 1, 12)) })}>−W</button>
                      <button type="button" onClick={() => patchWidget(widget.id, { width: clamp(widget.width + 1, 1, 12), x: clamp(widget.x, 1, 13 - clamp(widget.width + 1, 1, 12)) })}>+W</button>
                      <button type="button" onClick={() => patchWidget(widget.id, { height: clamp(widget.height - 1, 1, 20) })}>−H</button>
                      <button type="button" onClick={() => patchWidget(widget.id, { height: clamp(widget.height + 1, 1, 20) })}>+H</button>
                    </div>
                    <label title="Include this widget when published"><input type="checkbox" checked={widget.is_visible} onChange={(event) => patchWidget(widget.id, { is_visible: event.target.checked })} /> Visible</label>
                    <button className="widget-delete" type="button" onClick={() => void removeWidget(widget.id)}>Delete</button>
                  </footer>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

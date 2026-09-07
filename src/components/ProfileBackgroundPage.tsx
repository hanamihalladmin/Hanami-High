import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { getSignedProfileMediaUrl, uploadProfileImage } from '../lib/profileMedia'
import { profilePageBackgroundFrom, profilePageBackgroundPatch, profilePageBackgroundStyle, type ProfilePageBackground } from '../lib/profilePageTheme'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { Json } from '../types/database'

function objectFrom(value: Json): Record<string, Json | undefined> {
  return value && !Array.isArray(value) && typeof value === 'object'
    ? value as Record<string, Json | undefined>
    : {}
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'message' in error) return String((error as { message: unknown }).message)
  return 'Profile background could not be updated.'
}

export function ProfileBackgroundPage() {
  const { account, activeCharacter } = useIdentity()
  const [theme, setTheme] = useState<Record<string, Json | undefined>>({})
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const background = useMemo(() => profilePageBackgroundFrom(theme), [theme])
  const accent = typeof theme.accent === 'string' ? theme.accent : '#d86f8b'
  const panel = typeof theme.panel === 'string' ? theme.panel : '#fffdf8'
  const ink = typeof theme.ink === 'string' ? theme.ink : '#17223b'

  const load = useCallback(async () => {
    const client = supabase
    if (!client || !activeCharacter) return
    setLoading(true)
    setError(null)
    const { data, error: loadError } = await client.from('character_profiles').select('theme_draft').eq('character_id', activeCharacter.id).single()
    setLoading(false)
    if (loadError) {
      setError(loadError.message)
      return
    }
    const nextTheme = objectFrom(data.theme_draft)
    setTheme(nextTheme)
    const nextBackground = profilePageBackgroundFrom(nextTheme)
    if (nextBackground.imagePath) {
      try { setBackgroundUrl(await getSignedProfileMediaUrl(nextBackground.imagePath)) } catch { setBackgroundUrl(null) }
    } else setBackgroundUrl(null)
  }, [activeCharacter])

  useEffect(() => { void load() }, [load])

  async function saveBackground(next: ProfilePageBackground, message = 'Background settings saved.') {
    const client = supabase
    if (!client || !activeCharacter) return
    const nextTheme = { ...theme, ...profilePageBackgroundPatch(next) } as Record<string, Json | undefined>
    setTheme(nextTheme)
    setWorking(true)
    setError(null)
    setNotice(null)
    const { error: saveError } = await client.from('character_profiles').update({ theme_draft: nextTheme, updated_at: new Date().toISOString() }).eq('character_id', activeCharacter.id)
    setWorking(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    setNotice(message)
    window.dispatchEvent(new CustomEvent('hanami:profile-theme-changed', { detail: { characterId: activeCharacter.id } }))
  }

  function patch<K extends keyof ProfilePageBackground>(key: K, value: ProfilePageBackground[K]) {
    void saveBackground({ ...background, [key]: value })
  }

  async function uploadBackground(file: File) {
    const client = supabase
    if (!client || !account || !activeCharacter) return
    setUploading(true)
    setError(null)
    setNotice(null)
    try {
      const uploaded = await uploadProfileImage(account.id, activeCharacter.id, 'page-background', file)
      setBackgroundUrl(uploaded.url)
      await saveBackground({ ...background, mode: 'image', imagePath: uploaded.path }, 'Background image uploaded. Publish your profile when you are ready.')
    } catch (nextError) {
      setError(errorMessage(nextError))
    } finally {
      setUploading(false)
    }
  }

  async function removeBackgroundImage() {
    setBackgroundUrl(null)
    await saveBackground({ ...background, imagePath: null, mode: 'color' }, 'Uploaded background removed from this profile draft.')
  }

  if (!activeCharacter || !account) return null

  const previewStyle = {
    ...profilePageBackgroundStyle(background, backgroundUrl, accent),
    '--spacehey-panel-opacity': String(background.panelOpacity),
    '--spacehey-border-style': background.borderStyle,
    '--spacehey-panel': panel,
    '--spacehey-ink': ink,
    '--spacehey-accent': accent,
  } as CSSProperties

  return <section className="profile-background-editor">
    <header className="profile-background-intro">
      <div><span className="eyebrow">SPACEHEY PAGE</span><h2>Page Background</h2><p>Your full profile can look completely different from everyone else's. Background settings affect the full published page, not the standardized mini profile shown inside Discord-style rooms.</p></div>
      <strong>Safe customization</strong>
    </header>

    {error && <div className="identity-notice error">{error}</div>}
    {notice && <div className="identity-notice success">{notice}</div>}

    {loading ? <div className="studio-loading">Loading your background…</div> : <div className="profile-background-layout">
      <div className="profile-background-controls">
        <section>
          <span className="eyebrow">BACKGROUND TYPE</span>
          <div className="profile-background-mode-grid">
            {(['color', 'gradient', 'pattern', 'image'] as const).map((mode) => <button type="button" key={mode} className={background.mode === mode ? 'selected' : ''} disabled={working} onClick={() => patch('mode', mode)}>{mode === 'color' ? 'Solid Color' : mode.charAt(0).toUpperCase() + mode.slice(1)}</button>)}
          </div>
        </section>

        <section>
          <span className="eyebrow">COLORS</span>
          <div className="profile-background-color-grid">
            <label>Primary<input type="color" value={background.color} disabled={working} onChange={(event) => patch('color', event.target.value)} /></label>
            <label>Secondary<input type="color" value={background.color2} disabled={working} onChange={(event) => patch('color2', event.target.value)} /></label>
          </div>
          {background.mode === 'gradient' && <label>Gradient angle <span>{background.gradientAngle}°</span><input type="range" min="0" max="360" step="15" value={background.gradientAngle} disabled={working} onChange={(event) => setTheme((current) => ({ ...current, backgroundGradientAngle: Number(event.target.value) }))} onMouseUp={(event) => patch('gradientAngle', Number((event.target as HTMLInputElement).value))} onTouchEnd={(event) => patch('gradientAngle', Number((event.target as HTMLInputElement).value))} /></label>}
        </section>

        {background.mode === 'pattern' && <section>
          <span className="eyebrow">PATTERN</span>
          <div className="profile-background-pattern-grid">{(['petals', 'dots', 'grid', 'stripes', 'gingham'] as const).map((pattern) => <button type="button" key={pattern} className={background.pattern === pattern ? 'selected' : ''} onClick={() => patch('pattern', pattern)} disabled={working}>{pattern}</button>)}</div>
        </section>}

        <section>
          <span className="eyebrow">UPLOADED BACKGROUND</span>
          <label className="profile-background-upload"><strong>{background.imagePath ? 'Replace background image' : 'Upload background image'}</strong><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploading || working} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadBackground(file); event.currentTarget.value = '' }} /><small>{uploading ? 'Uploading…' : 'JPEG, PNG, WebP or GIF · 5 MB max · stored privately until publish'}</small></label>
          {background.imagePath && <button type="button" className="secondary-action" disabled={working || uploading} onClick={() => void removeBackgroundImage()}>Remove uploaded background</button>}
        </section>

        {background.mode === 'image' && <section className="profile-background-image-settings">
          <span className="eyebrow">IMAGE LAYOUT</span>
          <label>Repeat<select value={background.repeat} disabled={working} onChange={(event) => patch('repeat', event.target.value as ProfilePageBackground['repeat'])}><option value="repeat">Tile</option><option value="repeat-x">Repeat horizontally</option><option value="repeat-y">Repeat vertically</option><option value="no-repeat">No repeat</option></select></label>
          <label>Size<select value={background.size} disabled={working} onChange={(event) => patch('size', event.target.value as ProfilePageBackground['size'])}><option value="auto">Original size</option><option value="cover">Cover page</option><option value="contain">Contain</option></select></label>
          <label>Position<select value={background.position} disabled={working} onChange={(event) => patch('position', event.target.value as ProfilePageBackground['position'])}>{['center','top','bottom','left','right','top left','top right','bottom left','bottom right'].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label>Scroll behavior<select value={background.attachment} disabled={working} onChange={(event) => patch('attachment', event.target.value as ProfilePageBackground['attachment'])}><option value="scroll">Scroll with page</option><option value="fixed">Stay fixed</option></select></label>
        </section>}

        <section>
          <span className="eyebrow">PAGE PANELS</span>
          <label>Panel opacity <span>{Math.round(background.panelOpacity * 100)}%</span><input type="range" min="45" max="100" step="5" value={Math.round(background.panelOpacity * 100)} disabled={working} onChange={(event) => setTheme((current) => ({ ...current, panelOpacity: Number(event.target.value) / 100 }))} onMouseUp={(event) => patch('panelOpacity', Number((event.target as HTMLInputElement).value) / 100)} onTouchEnd={(event) => patch('panelOpacity', Number((event.target as HTMLInputElement).value) / 100)} /></label>
          <label>Border style<select value={background.borderStyle} disabled={working} onChange={(event) => patch('borderStyle', event.target.value as ProfilePageBackground['borderStyle'])}><option value="double">Double</option><option value="solid">Solid</option><option value="dotted">Dotted</option><option value="dashed">Dashed</option></select></label>
        </section>
      </div>

      <div className="profile-background-preview" style={previewStyle}>
        <div className="profile-background-preview-page">
          <header><span>♡ {activeCharacter.display_name || activeCharacter.first_name || 'My'}'s Hanami page ♡</span><small>preview</small></header>
          <div className="profile-background-preview-columns"><aside><div className="profile-background-preview-avatar">✿</div><strong>{activeCharacter.display_name || activeCharacter.first_name || 'Hanami Member'}</strong><p>mood: blooming</p></aside><main><section><h3>About Me</h3><p>This is how your page background and panels work together.</p></section><section><h3>Interests</h3><p>music · friends · flowers · school life</p></section></main></div>
        </div>
      </div>
    </div>}
  </section>
}

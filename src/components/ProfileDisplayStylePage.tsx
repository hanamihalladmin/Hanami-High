import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { supabase } from '../lib/supabase'
import { getSignedProfileMediaUrl } from '../lib/profileMedia'
import { useIdentity } from '../state/IdentityContext'
import type { CharacterProfile, Json } from '../types/database'
import { ShellTopbar } from './ShellTopbar'

type Props = { onSearch: () => void; onNotifications: () => void; unreadCount: number }
type DisplayTheme = { displayFont: string; displayEffect: string; displayColor: string; displayColor2: string; accent: string }

const fonts = [
  ['classic', 'Classic'], ['serif', 'Editorial'], ['rounded', 'Rounded'], ['script', 'Script'],
  ['pixel', 'Pixel'], ['slab', 'Slab'], ['italic', 'Italic'], ['mono', 'Mono'],
  ['gothic', 'Gothic'], ['brush', 'Brush'], ['bubble', 'Bubble'], ['narrow', 'Narrow'],
  ['soft', 'Soft'], ['retro', 'Retro'], ['fancy', 'Fancy'], ['caps', 'Caps'],
] as const
const effects = [
  ['solid', 'Solid'], ['gradient', 'Gradient'], ['neon', 'Neon'], ['toon', 'Toon'],
  ['pop', 'Pop'], ['gummy', 'Gummy'], ['prism', 'Prism'], ['glow', 'Glow'],
] as const
const colorPairs = [
  ['#e0b641', '#fff0a8'], ['#d86f8b', '#f6b7cb'], ['#8b5cf6', '#60a5fa'], ['#22c55e', '#38bdf8'],
  ['#ef4444', '#f59e0b'], ['#06b6d4', '#a78bfa'], ['#f472b6', '#fde68a'], ['#e5e7eb', '#94a3b8'],
]

function objectOf(value: Json) {
  return value && !Array.isArray(value) && typeof value === 'object' ? value as Record<string, Json | undefined> : {}
}
function themeOf(value: Json): DisplayTheme {
  const source = objectOf(value)
  return {
    displayFont: typeof source.displayFont === 'string' ? source.displayFont : 'classic',
    displayEffect: typeof source.displayEffect === 'string' ? source.displayEffect : 'solid',
    displayColor: typeof source.displayColor === 'string' ? source.displayColor : '#d86f8b',
    displayColor2: typeof source.displayColor2 === 'string' ? source.displayColor2 : '#f6b7cb',
    accent: typeof source.accent === 'string' ? source.accent : '#d86f8b',
  }
}

export function ProfileDisplayStylePage({ onSearch, onNotifications, unreadCount }: Props) {
  const { activeCharacter } = useIdentity()
  const [profile, setProfile] = useState<CharacterProfile | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const client = supabase
    if (!client || !activeCharacter) return
    setLoading(true)
    const result = await client.from('character_profiles').select('*').eq('character_id', activeCharacter.id).maybeSingle()
    setLoading(false)
    if (result.error || !result.data) {
      setError(result.error?.message || 'Profile style settings are unavailable.')
      return
    }
    setProfile(result.data)
    if (result.data.avatar_path) {
      try { setAvatarUrl(await getSignedProfileMediaUrl(result.data.avatar_path)) } catch { setAvatarUrl(null) }
    }
  }, [activeCharacter])
  useEffect(() => { void load() }, [load])

  const theme = useMemo(() => themeOf(profile?.theme_draft ?? {}), [profile?.theme_draft])
  const name = activeCharacter?.display_name || [activeCharacter?.first_name, activeCharacter?.last_name].filter(Boolean).join(' ') || 'Your Character'
  const handle = activeCharacter?.handle ? `@${activeCharacter.handle}` : '@hanami'
  const style = { '--display-color': theme.displayColor, '--display-color-2': theme.displayColor2 } as CSSProperties

  function patch(next: Partial<DisplayTheme>) {
    setProfile((current) => current ? { ...current, theme_draft: { ...objectOf(current.theme_draft), ...next } } : current)
    setNotice(null)
  }

  async function save() {
    const client = supabase
    if (!client || !activeCharacter || !profile) return
    setSaving(true)
    setError(null)
    const result = await client.from('character_profiles').update({ theme_draft: profile.theme_draft, updated_at: new Date().toISOString() }).eq('character_id', activeCharacter.id)
    setSaving(false)
    if (result.error) {
      setError(result.error.message)
      return
    }
    setNotice('Display name style saved to your profile draft. Publish your profile to make it public.')
    window.dispatchEvent(new CustomEvent('hanami:profile-theme-changed', { detail: { characterId: activeCharacter.id } }))
  }

  function surprise() {
    const font = fonts[Math.floor(Math.random() * fonts.length)][0]
    const effect = effects[Math.floor(Math.random() * effects.length)][0]
    const pair = colorPairs[Math.floor(Math.random() * colorPairs.length)]
    patch({ displayFont: font, displayEffect: effect, displayColor: pair[0], displayColor2: pair[1] })
  }

  if (!activeCharacter) return null

  return <main className="content-area profile-display-style-page">
    <ShellTopbar eyebrow="PROFILE STUDIO" title="Display Name Style" onSearch={onSearch} onNotifications={onNotifications} unreadCount={unreadCount}/>
    {error && <div className="identity-notice error">{error}</div>}
    {notice && <div className="identity-notice success">{notice}</div>}
    {loading || !profile ? <div className="studio-loading">Loading display styles…</div> : <div className="display-style-layout" style={style}>
      <section className="display-style-controls">
        <header><span className="eyebrow">PROFILE TYPOGRAPHY</span><h1>Change Display Name Style</h1><p>Choose how your character name appears on the published profile. These are Hanami profile styles, not a site-wide font change.</p></header>
        <div className="display-style-section"><h2>Choose Font</h2><div className="display-font-grid">{fonts.map(([id, label]) => <button type="button" key={id} className={`${theme.displayFont === id ? 'selected' : ''} profile-font-${id}`} onClick={() => patch({ displayFont: id })}><strong>Aa</strong><small>{label}</small></button>)}</div></div>
        <div className="display-style-section"><h2>Choose Effect</h2><div className="display-effect-grid">{effects.map(([id, label]) => <button type="button" key={id} className={`${theme.displayEffect === id ? 'selected' : ''} profile-effect-${id}`} onClick={() => patch({ displayEffect: id })}>{label}</button>)}</div></div>
        <div className="display-style-section"><h2>Choose Color</h2><div className="display-color-presets">{colorPairs.map(([first, second]) => <button type="button" key={`${first}-${second}`} className={theme.displayColor === first && theme.displayColor2 === second ? 'selected' : ''} style={{ background: `linear-gradient(135deg,${first},${second})` }} onClick={() => patch({ displayColor: first, displayColor2: second })}/>)}</div><div className="display-custom-colors"><label>Primary<input type="color" value={theme.displayColor} onChange={(event) => patch({ displayColor: event.target.value })}/></label><label>Secondary<input type="color" value={theme.displayColor2} onChange={(event) => patch({ displayColor2: event.target.value })}/></label></div></div>
        <footer><button type="button" className="secondary-action" onClick={surprise}>🎲 Surprise Me</button><button type="button" className="primary-action" disabled={saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Apply to Draft'}</button></footer>
      </section>

      <aside className="display-style-preview">
        <span className="eyebrow">LIVE PREVIEW</span>
        <article className="display-preview-profile">
          <div className="display-preview-banner" style={{ background: theme.accent }}/>
          <div className="display-preview-avatar">{avatarUrl ? <img src={avatarUrl} alt="Profile avatar"/> : name.slice(0, 2).toUpperCase()}</div>
          <div className="display-preview-profile-copy"><h2 className={`profile-display-name profile-font-${theme.displayFont} profile-effect-${theme.displayEffect}`}>{name}</h2><p>{handle}{profile.pronouns ? ` · ${profile.pronouns}` : ''}</p><span>{profile.custom_status || 'Hanami High student'}</span></div>
        </article>
        <article className="display-preview-message"><div className="display-preview-mini-avatar">{avatarUrl ? <img src={avatarUrl} alt=""/> : name.slice(0, 2).toUpperCase()}</div><div><header><strong className={`profile-display-name profile-font-${theme.displayFont} profile-effect-${theme.displayEffect}`}>{name}</strong><time>12:00</time></header><p>Does anyone read this?</p></div></article>
        <small>Font appearance can vary slightly by device. Hanami uses safe font stacks and does not load arbitrary user font files.</small>
      </aside>
    </div>}
  </main>
}

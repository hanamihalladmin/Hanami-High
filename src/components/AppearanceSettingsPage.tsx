import { useCallback, useEffect, useMemo, useState } from 'react'
import { notifyInterfacePreferencesChanged } from '../hooks/useInterfacePreferences'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { AccountPreferences } from '../types/database-settings'
import { ShellTopbar } from './ShellTopbar'
import '../styles/appearance-control-center.css'

type Props = { onSearch: () => void; onNotifications: () => void; unreadCount: number }

const themes = [
  { id: 'hanami', name: 'Hanami', mood: 'School default', note: 'Glossy white surfaces, sage-green text, sakura pink accents, and floral details.', swatches: ['#4f6f5b', '#8eaa94', '#fffefd', '#e27f9f'] },
  { id: 'sakura', name: 'Sakura', mood: 'Pink & nostalgic', note: 'A warmer pink-forward school network theme.', swatches: ['#452238', '#ae9088', '#fffafb', '#df7298'] },
  { id: 'sage', name: 'Sage', mood: 'Garden notebook', note: 'A quiet green theme inspired by notebooks and gardens.', swatches: ['#233a33', '#78947d', '#fbfcf7', '#bd7e8f'] },
  { id: 'navy', name: 'Navy', mood: 'Classic school', note: 'A cooler, more traditional school-network palette.', swatches: ['#13203d', '#8398a8', '#fbfcff', '#aa78a0'] },
  { id: 'lavender', name: 'Lavender', mood: 'Soft & dreamy', note: 'Soft purple panels with muted pink accents.', swatches: ['#34294f', '#978daa', '#fdfbff', '#bd77ae'] },
  { id: 'sunset', name: 'Sunset', mood: 'After school', note: 'Warm after-school oranges, rose, and cream.', swatches: ['#4b2a28', '#a28b68', '#fffaf4', '#dc7479'] },
  { id: 'mono', name: 'Monochrome', mood: 'Minimal retro', note: 'Black, white, and gray with maximum restraint.', swatches: ['#1d1d1d', '#8c8c8c', '#ffffff', '#777777'] },
] as const

export function AppearanceSettingsPage({ onSearch, onNotifications, unreadCount }: Props) {
  const { account, activeCharacter } = useIdentity()
  const [prefs, setPrefs] = useState<AccountPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    const client = supabase
    if (!client || !account) return
    setLoading(true)
    const { data, error: loadError } = await client.from('account_preferences').select('*').eq('account_id', account.id).maybeSingle()
    setLoading(false)
    if (loadError) return setError(loadError.message)
    setPrefs(data)
  }, [account])

  useEffect(() => { void load() }, [load])

  async function save(patch: Partial<AccountPreferences>) {
    const client = supabase
    if (!client || !account) return
    setWorking(true); setError(null); setNotice(null)
    const { error: updateError } = await client.from('account_preferences').update(patch).eq('account_id', account.id)
    setWorking(false)
    if (updateError) return setError(updateError.message)
    setPrefs((current) => current ? { ...current, ...patch } : current)
    notifyInterfacePreferencesChanged()
    setNotice('Appearance preferences saved.')
  }

  const selectedTheme = useMemo(() => themes.find((theme) => theme.id === prefs?.site_theme) ?? themes[0], [prefs?.site_theme])
  const characterName = activeCharacter?.display_name || activeCharacter?.first_name || 'Current character'

  return <main className="content-area settings-page appearance-settings-page">
    <ShellTopbar eyebrow="SETTINGS" title="Appearance & Accessibility" onSearch={onSearch} onNotifications={onNotifications} unreadCount={unreadCount}/>
    <div className="settings-intro"><div><span className="eyebrow">PERSONAL INTERFACE</span><p>Customize how the Hanami website looks and feels to you. These choices are account-wide and never change another member’s interface.</p></div><div className="settings-intro-identity"><span className="settings-scope-tag">ACCOUNT APPEARANCE</span><strong>{selectedTheme.name}</strong><small>{selectedTheme.mood}</small></div></div>
    {error && <div className="identity-notice error">{error}</div>}{notice && <div className="identity-notice success">{notice}</div>}
    {loading || !prefs ? <div className="settings-empty">Loading appearance settings…</div> : <div className="settings-stack">
      <section className="appearance-preview-board">
        <div className="appearance-preview-copy"><span className="eyebrow">LIVE STYLE PREVIEW</span><h2>Your Hanami, your desk.</h2><p>The school layout stays familiar while colors, density, contrast, motion, and text size follow your account preferences.</p><div className="appearance-behavior-tags"><span>{prefs.compact_mode ? 'Compact spacing' : 'Standard spacing'}</span><span>{prefs.reduced_motion ? 'Reduced motion' : 'Motion on'}</span><span>{prefs.high_contrast ? 'High contrast' : 'Standard contrast'}</span><span>{prefs.font_scale}% text</span></div></div>
        <div className="appearance-mini-site" style={{ '--preview-ink': selectedTheme.swatches[0], '--preview-soft': selectedTheme.swatches[1], '--preview-paper': selectedTheme.swatches[2], '--preview-accent': selectedTheme.swatches[3] } as React.CSSProperties}><div className="appearance-mini-title">HANAMI HIGH · 2006 <b>✿</b></div><div className="appearance-mini-body"><aside><strong>home</strong><span>profile</span><span>social</span><span>classes</span><span>settings</span></aside><section><div className="appearance-mini-banner">welcome back, {characterName} ♡</div><div className="appearance-mini-panels"><article><b>today</b><span>school network</span></article><article><b>petals</b><span>account wallet</span></article></div><div className="appearance-mini-note">✿ personal interface preview ✿</div></section></div></div>
      </section>

      <section className="settings-panel theme-settings-panel"><header><div><span className="eyebrow">COLOR THEME</span><h2>Choose your Hanami</h2></div><span className="settings-scope-tag">{selectedTheme.name.toUpperCase()}</span></header><div className="site-theme-grid">{themes.map((theme) => <button type="button" key={theme.id} className={`site-theme-card ${prefs.site_theme === theme.id ? 'selected' : ''}`} disabled={working} onClick={() => void save({ site_theme: theme.id })}><div className="site-theme-swatches">{theme.swatches.map((color) => <span key={color} style={{ background: color }}/>)}</div><div className="site-theme-card-title"><strong>{theme.name}</strong><em>{theme.mood}</em></div><small>{theme.note}</small>{prefs.site_theme === theme.id && <b>SELECTED</b>}</button>)}</div></section>

      <section className="settings-panel"><header><div><span className="eyebrow">ACCESSIBILITY & DENSITY</span><h2>How Hanami behaves</h2></div><span>Applies immediately</span></header><div className="settings-form-list"><label><div><strong>Reduced motion</strong><span>Disable nonessential transitions, effects, and interface animation.</span></div><input type="checkbox" disabled={working} checked={prefs.reduced_motion} onChange={(event) => void save({ reduced_motion: event.target.checked })}/></label><label><div><strong>Compact mode</strong><span>Tighten spacing so more school and social information fits on screen.</span></div><input type="checkbox" disabled={working} checked={prefs.compact_mode} onChange={(event) => void save({ compact_mode: event.target.checked })}/></label><label><div><strong>High contrast</strong><span>Strengthen borders and text contrast throughout the Hanami shell.</span></div><input type="checkbox" disabled={working} checked={prefs.high_contrast} onChange={(event) => void save({ high_contrast: event.target.checked })}/></label><label><div><strong>Interface text size</strong><span>{prefs.font_scale}% · account-wide</span></div><input aria-label="Interface text size" type="range" min="90" max="130" step="5" disabled={working} value={prefs.font_scale} onChange={(event) => setPrefs({ ...prefs, font_scale: Number(event.target.value) })} onMouseUp={(event) => void save({ font_scale: Number((event.target as HTMLInputElement).value) })} onTouchEnd={(event) => void save({ font_scale: Number((event.target as HTMLInputElement).value) })}/></label></div></section>

      <section className="appearance-scope-note"><div><span>⚙</span><strong>Website appearance</strong><p>Theme, text size, spacing, contrast, and motion belong to your Hanami account.</p></div><div><span>✿</span><strong>Profile appearance</strong><p>Banners, profile colors, widgets, backgrounds, fonts, cosmetics, and character presentation belong in Profile Studio.</p></div></section>
    </div>}
  </main>
}

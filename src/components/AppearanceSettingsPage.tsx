import { useCallback, useEffect, useState } from 'react'
import { notifyInterfacePreferencesChanged } from '../hooks/useInterfacePreferences'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { AccountPreferences } from '../types/database-settings'
import { ShellTopbar } from './ShellTopbar'

type Props = { onSearch: () => void; onNotifications: () => void; unreadCount: number }

const themes = [
  { id: 'hanami', name: 'Hanami', note: 'Navy, sage, warm white, and cherry blossom pink.', swatches: ['#17223b', '#93a58e', '#fffdf8', '#d56f91'] },
  { id: 'sakura', name: 'Sakura', note: 'A warmer pink-forward school network theme.', swatches: ['#452238', '#ae9088', '#fffafb', '#df7298'] },
  { id: 'sage', name: 'Sage', note: 'A quiet green theme inspired by notebooks and gardens.', swatches: ['#233a33', '#78947d', '#fbfcf7', '#bd7e8f'] },
  { id: 'navy', name: 'Navy', note: 'A cooler, more traditional school-network palette.', swatches: ['#13203d', '#8398a8', '#fbfcff', '#aa78a0'] },
  { id: 'lavender', name: 'Lavender', note: 'Soft purple panels with muted pink accents.', swatches: ['#34294f', '#978daa', '#fdfbff', '#bd77ae'] },
  { id: 'sunset', name: 'Sunset', note: 'Warm after-school oranges, rose, and cream.', swatches: ['#4b2a28', '#a28b68', '#fffaf4', '#dc7479'] },
  { id: 'mono', name: 'Monochrome', note: 'Black, white, and gray with maximum restraint.', swatches: ['#1d1d1d', '#8c8c8c', '#ffffff', '#777777'] },
] as const

export function AppearanceSettingsPage({ onSearch, onNotifications, unreadCount }: Props) {
  const { account } = useIdentity()
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

  return <main className="content-area settings-page appearance-settings-page">
    <ShellTopbar eyebrow="SETTINGS" title="Appearance & Accessibility" onSearch={onSearch} onNotifications={onNotifications} unreadCount={unreadCount}/>
    <div className="settings-intro"><div><span className="eyebrow">PERSONAL INTERFACE</span><p>Your color theme only changes Hanami for your account. It never changes the school theme for other students.</p></div><strong>Personal preference</strong></div>
    {error && <div className="identity-notice error">{error}</div>}{notice && <div className="identity-notice success">{notice}</div>}
    {loading || !prefs ? <div className="settings-empty">Loading appearance settings…</div> : <div className="settings-stack">
      <section className="settings-panel theme-settings-panel"><header><div><span className="eyebrow">COLOR THEME</span><h2>Choose your Hanami</h2></div><strong>{themes.find((theme) => theme.id === prefs.site_theme)?.name || 'Hanami'}</strong></header><div className="site-theme-grid">{themes.map((theme) => <button type="button" key={theme.id} className={`site-theme-card ${prefs.site_theme === theme.id ? 'selected' : ''}`} disabled={working} onClick={() => void save({ site_theme: theme.id })}><div className="site-theme-swatches">{theme.swatches.map((color) => <span key={color} style={{ background: color }}/>)}</div><strong>{theme.name}</strong><small>{theme.note}</small>{prefs.site_theme === theme.id && <b>SELECTED</b>}</button>)}</div></section>
      <section className="settings-panel"><header><div><span className="eyebrow">ACCESSIBILITY</span><h2>Display & motion</h2></div><span>Applies immediately</span></header><div className="settings-form-list"><label><div><strong>Reduced motion</strong><span>Disable nonessential transitions and animation.</span></div><input type="checkbox" disabled={working} checked={prefs.reduced_motion} onChange={(event) => void save({ reduced_motion: event.target.checked })}/></label><label><div><strong>Compact mode</strong><span>Reduce spacing to fit more information on screen.</span></div><input type="checkbox" disabled={working} checked={prefs.compact_mode} onChange={(event) => void save({ compact_mode: event.target.checked })}/></label><label><div><strong>High contrast</strong><span>Strengthen borders and text contrast throughout the shell.</span></div><input type="checkbox" disabled={working} checked={prefs.high_contrast} onChange={(event) => void save({ high_contrast: event.target.checked })}/></label><label><div><strong>Interface text size</strong><span>{prefs.font_scale}%</span></div><input aria-label="Interface text size" type="range" min="90" max="130" step="5" disabled={working} value={prefs.font_scale} onChange={(event) => setPrefs({ ...prefs, font_scale: Number(event.target.value) })} onMouseUp={(event) => void save({ font_scale: Number((event.target as HTMLInputElement).value) })} onTouchEnd={(event) => void save({ font_scale: Number((event.target as HTMLInputElement).value) })}/></label></div></section>
    </div>}
  </main>
}

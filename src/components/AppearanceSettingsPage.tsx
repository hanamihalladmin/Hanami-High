import { useCallback, useEffect, useMemo, useState } from 'react'
import { notifyInterfacePreferencesChanged } from '../hooks/useInterfacePreferences'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { AccountPreferences } from '../types/database-settings'
import { ShellTopbar } from './ShellTopbar'
import '../styles/appearance-control-center.css'

type Props = { onSearch: () => void; onNotifications: () => void; unreadCount: number }

type CustomPalette = { ink: string; soft: string; paper: string; accent: string }

const themes = [
  { id: 'hanami', name: 'Hanami', mood: 'School default', swatches: ['#4f6f5b', '#8eaa94', '#fffefd', '#e27f9f'] },
  { id: 'sakura', name: 'Sakura', mood: 'Pink & nostalgic', swatches: ['#452238', '#ae9088', '#fffafb', '#df7298'] },
  { id: 'sage', name: 'Sage', mood: 'Garden notebook', swatches: ['#233a33', '#78947d', '#fbfcf7', '#bd7e8f'] },
  { id: 'navy', name: 'Navy', mood: 'Classic school', swatches: ['#13203d', '#8398a8', '#fbfcff', '#aa78a0'] },
] as const

const defaultCustom: CustomPalette = { ink: '#243249', soft: '#8fa394', paper: '#fff9f2', accent: '#d39aae' }

export function AppearanceSettingsPage({ onSearch, onNotifications, unreadCount }: Props) {
  const { account, activeCharacter } = useIdentity()
  const [prefs, setPrefs] = useState<AccountPreferences | null>(null)
  const [plusActive, setPlusActive] = useState(false)
  const [custom, setCustom] = useState<CustomPalette>(defaultCustom)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    const client = supabase
    if (!client || !account) return
    setLoading(true)
    const [preferenceResult, plusResult] = await Promise.all([
      client.from('account_preferences').select('*').eq('account_id', account.id).maybeSingle(),
      client.from('hanami_plus_entitlements').select('ends_at').eq('account_id', account.id).maybeSingle(),
    ])
    setLoading(false)
    if (preferenceResult.error) return setError(preferenceResult.error.message)
    const data = preferenceResult.data
    setPrefs(data)
    setPlusActive(Boolean(plusResult.data && new Date(plusResult.data.ends_at).getTime() > Date.now()))
    if (data) setCustom({
      ink: data.custom_theme_ink || defaultCustom.ink,
      soft: data.custom_theme_soft || defaultCustom.soft,
      paper: data.custom_theme_paper || defaultCustom.paper,
      accent: data.custom_theme_accent || defaultCustom.accent,
    })
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
    notifyInterfacePreferencesChanged(); setNotice('Appearance preferences saved.')
  }

  async function saveCustom(enabled: boolean) {
    const client = supabase
    if (!client) return
    setWorking(true); setError(null); setNotice(null)
    const { error: rpcError } = await client.rpc('set_my_custom_site_theme', {
      p_enabled: enabled,
      p_ink: custom.ink,
      p_soft: custom.soft,
      p_paper: custom.paper,
      p_accent: custom.accent,
    })
    setWorking(false)
    if (rpcError) return setError(rpcError.message)
    setPrefs((current) => current ? { ...current, custom_theme_enabled: enabled, custom_theme_ink: custom.ink, custom_theme_soft: custom.soft, custom_theme_paper: custom.paper, custom_theme_accent: custom.accent } : current)
    notifyInterfacePreferencesChanged()
    setNotice(enabled ? 'Custom Hanami+ website colors applied.' : 'Returned to your preset Hanami theme.')
  }

  const selectedTheme = useMemo(() => themes.find((theme) => theme.id === prefs?.site_theme) ?? themes[0], [prefs?.site_theme])
  const preview = prefs?.custom_theme_enabled ? [custom.ink, custom.soft, custom.paper, custom.accent] : selectedTheme.swatches
  const characterName = activeCharacter?.display_name || activeCharacter?.first_name || 'Current character'

  return <main className="content-area settings-page appearance-settings-page">
    <ShellTopbar eyebrow="SETTINGS" title="Appearance & Accessibility" onSearch={onSearch} onNotifications={onNotifications} unreadCount={unreadCount}/>
    <div className="settings-intro"><div><span className="eyebrow">PERSONAL INTERFACE</span><p>Customize how Hanami looks to you. Standard members can use school presets; Hanami+ members can build a completely custom website palette.</p></div><div className="settings-intro-identity"><span className="settings-scope-tag">ACCOUNT APPEARANCE</span><strong>{prefs?.custom_theme_enabled ? 'Custom Hanami+' : selectedTheme.name}</strong><small>{characterName}</small></div></div>
    {error && <div className="identity-notice error">{error}</div>}{notice && <div className="identity-notice success">{notice}</div>}
    {loading || !prefs ? <div className="settings-empty">Loading appearance settings…</div> : <div className="settings-stack">
      <section className="appearance-preview-board">
        <div className="appearance-preview-copy"><span className="eyebrow">LIVE STYLE PREVIEW</span><h2>Your Hanami, your colors.</h2><p>Navigation, panels, buttons, links, headers, and decorative accents all inherit your account palette.</p></div>
        <div className="appearance-mini-site" style={{ '--preview-ink': preview[0], '--preview-soft': preview[1], '--preview-paper': preview[2], '--preview-accent': preview[3] } as React.CSSProperties}><div className="appearance-mini-title">HANAMI HIGH · 2006 <b>✿</b></div><div className="appearance-mini-body"><aside><strong>home</strong><span>profile</span><span>social</span><span>shop</span><span>settings</span></aside><section><div className="appearance-mini-banner">welcome back, {characterName} ♡</div><div className="appearance-mini-panels"><article><b>today</b><span>school network</span></article><article><b>petals</b><span>account wallet</span></article></div></section></div></div>
      </section>

      <section className="settings-panel custom-theme-panel"><header><div><span className="eyebrow">HANAMI+ CUSTOM COLORS</span><h2>Build your own website theme</h2></div><span className="settings-scope-tag">{plusActive ? 'HANAMI+ ACTIVE' : 'HANAMI+ REQUIRED'}</span></header>
        <p className="custom-theme-explainer">Pick the four colors Hanami uses as its interface foundation. Your custom palette is account-wide and only changes what you see.</p>
        <div className="custom-color-grid">{([
          ['ink','Primary / text'],['soft','Secondary / surfaces'],['paper','Background / paper'],['accent','Accent / highlights'],
        ] as const).map(([key,label]) => <label key={key}><span>{label}</span><div><input type="color" value={custom[key]} disabled={!plusActive || working} onChange={(e)=>setCustom({...custom,[key]:e.target.value})}/><input type="text" value={custom[key]} disabled={!plusActive || working} maxLength={7} onChange={(e)=>setCustom({...custom,[key]:e.target.value})}/></div></label>)}</div>
        <div className="custom-theme-actions"><button className="primary-action" type="button" disabled={!plusActive || working} onClick={()=>void saveCustom(true)}>{working ? 'Saving…' : 'Apply custom colors'}</button>{prefs.custom_theme_enabled && <button className="secondary-action" type="button" disabled={working} onClick={()=>void saveCustom(false)}>Use preset instead</button>}</div>
      </section>

      <section className="settings-panel theme-settings-panel"><header><div><span className="eyebrow">PRESET THEMES</span><h2>Quick palettes</h2></div><span>{prefs.custom_theme_enabled ? 'Custom palette currently active' : selectedTheme.name}</span></header><div className="site-theme-grid">{themes.map((theme) => <button type="button" key={theme.id} className={`site-theme-card ${!prefs.custom_theme_enabled && prefs.site_theme === theme.id ? 'selected' : ''}`} disabled={working} onClick={() => void save({ site_theme: theme.id, custom_theme_enabled: false })}><div className="site-theme-swatches">{theme.swatches.map((color) => <span key={color} style={{ background: color }}/>)}</div><div className="site-theme-card-title"><strong>{theme.name}</strong><em>{theme.mood}</em></div>{!prefs.custom_theme_enabled && prefs.site_theme === theme.id && <b>SELECTED</b>}</button>)}</div></section>

      <section className="settings-panel"><header><div><span className="eyebrow">ACCESSIBILITY & DENSITY</span><h2>How Hanami behaves</h2></div><span>Applies immediately</span></header><div className="settings-form-list"><label><div><strong>Reduced motion</strong><span>Disable nonessential transitions and animated cosmetics.</span></div><input type="checkbox" disabled={working} checked={prefs.reduced_motion} onChange={(event) => void save({ reduced_motion: event.target.checked })}/></label><label><div><strong>Compact mode</strong><span>Tighten spacing when you want more information on screen.</span></div><input type="checkbox" disabled={working} checked={prefs.compact_mode} onChange={(event) => void save({ compact_mode: event.target.checked })}/></label><label><div><strong>High contrast</strong><span>Strengthen borders and text contrast.</span></div><input type="checkbox" disabled={working} checked={prefs.high_contrast} onChange={(event) => void save({ high_contrast: event.target.checked })}/></label><label><div><strong>Interface text size</strong><span>{prefs.font_scale}% · account-wide</span></div><input aria-label="Interface text size" type="range" min="90" max="130" step="5" disabled={working} value={prefs.font_scale} onChange={(event) => setPrefs({ ...prefs, font_scale: Number(event.target.value) })} onMouseUp={(event) => void save({ font_scale: Number((event.target as HTMLInputElement).value) })}/></label></div></section>
    </div>}
  </main>
}

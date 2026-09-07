import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  profileLayoutPresets,
  profilePageLayoutFrom,
  profilePageLayoutPatch,
  type ProfilePageLayout,
  type ProfileLayoutPreset,
} from '../lib/profilePageLayout'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { Json } from '../types/database'

function themeObject(value: Json): Record<string, Json | undefined> {
  return value && !Array.isArray(value) && typeof value === 'object'
    ? value as Record<string, Json | undefined>
    : {}
}

const presetMeta: Array<{ id: ProfileLayoutPreset; title: string; description: string }> = [
  { id: 'classic', title: 'Classic Profile', description: 'Left info column, banner hero, familiar SpaceHey-style page rhythm.' },
  { id: 'diary', title: 'Personal Diary', description: 'Right sidebar, postcard header, compact panels, scrapbook-like page flow.' },
  { id: 'wide', title: 'Wide Homepage', description: 'More canvas width for art-heavy layouts, larger widgets, and long-form boards.' },
  { id: 'webring', title: 'Webring 2006', description: 'Chunkier borders, square avatar, tiny tabs, and denser early-web styling.' },
]

export function ProfileLayoutPage() {
  const { activeCharacter } = useIdentity()
  const [theme, setTheme] = useState<Json>({})
  const [layout, setLayout] = useState<ProfilePageLayout>(() => profilePageLayoutFrom({}))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const client = supabase
    if (!client || !activeCharacter) return
    setLoading(true)
    setError(null)
    const result = await client
      .from('character_profiles')
      .select('theme_draft')
      .eq('character_id', activeCharacter.id)
      .single()
    setLoading(false)
    if (result.error) {
      setError(result.error.message)
      return
    }
    setTheme(result.data.theme_draft)
    setLayout(profilePageLayoutFrom(result.data.theme_draft))
  }, [activeCharacter])

  useEffect(() => { void load() }, [load])

  const previewStyle = useMemo(() => ({
    '--layout-preview-gap': `${layout.contentGap}px`,
    '--layout-preview-border': `${layout.borderWidth}px`,
  }) as CSSProperties, [layout])

  function patch<K extends keyof ProfilePageLayout>(key: K, value: ProfilePageLayout[K]) {
    setLayout((current) => ({ ...current, [key]: value }))
    setNotice(null)
  }

  function applyPreset(preset: ProfileLayoutPreset) {
    setLayout({ ...profileLayoutPresets[preset] })
    setNotice(`${presetMeta.find((item) => item.id === preset)?.title ?? 'Preset'} loaded. Save when you are ready.`)
  }

  async function save() {
    const client = supabase
    if (!client || !activeCharacter) return
    setSaving(true)
    setError(null)
    setNotice(null)
    const nextTheme = {
      ...themeObject(theme),
      ...profilePageLayoutPatch(layout),
    } as Json
    const result = await client
      .from('character_profiles')
      .update({ theme_draft: nextTheme, updated_at: new Date().toISOString() })
      .eq('character_id', activeCharacter.id)
    setSaving(false)
    if (result.error) {
      setError(result.error.message)
      return
    }
    setTheme(nextTheme)
    setNotice('Page layout saved to your private draft. Publish your profile when you want the public page to change.')
    window.dispatchEvent(new CustomEvent('hanami:profile-theme-changed', { detail: { characterId: activeCharacter.id } }))
  }

  if (!activeCharacter) return null

  return <section className="profile-layout-editor">
    <header className="profile-layout-intro">
      <div>
        <span className="eyebrow">PAGE COMPOSITION</span>
        <h2>Build the shape of your personal page</h2>
        <p>Choose a starting layout, then tune the page width, sidebar, header, panels, avatar shape, and widget chrome. These settings affect the full profile page only—not Discord-style mini profiles.</p>
      </div>
      <button className="primary-action" type="button" disabled={saving || loading} onClick={() => void save()}>{saving ? 'Saving…' : 'Save Layout'}</button>
    </header>

    {error && <div className="identity-notice error">{error}</div>}
    {notice && <div className="identity-notice success">{notice}</div>}

    {loading ? <div className="studio-loading">Loading page layout…</div> : <>
      <section className="profile-layout-presets">
        <header><span className="eyebrow">STARTING POINTS</span><strong>Layout presets</strong></header>
        <div>
          {presetMeta.map((preset) => <button key={preset.id} type="button" className={layout.preset === preset.id ? 'active' : ''} onClick={() => applyPreset(preset.id)}>
            <span className={`profile-layout-preset-mini preset-${preset.id}`} aria-hidden="true"><i/><i/><i/></span>
            <strong>{preset.title}</strong>
            <small>{preset.description}</small>
          </button>)}
        </div>
      </section>

      <div className="profile-layout-editor-grid">
        <section className="profile-layout-controls">
          <header><span className="eyebrow">COMPOSITION</span><strong>Page structure</strong></header>
          <label>Sidebar position
            <select value={layout.sidebarSide} onChange={(event) => patch('sidebarSide', event.target.value as ProfilePageLayout['sidebarSide'])}>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </label>
          <label>Header style
            <select value={layout.heroStyle} onChange={(event) => patch('heroStyle', event.target.value as ProfilePageLayout['heroStyle'])}>
              <option value="banner">Big banner</option>
              <option value="compact">Compact identity strip</option>
              <option value="postcard">Postcard / diary header</option>
            </select>
          </label>
          <label>Panel density
            <select value={layout.panelDensity} onChange={(event) => patch('panelDensity', event.target.value as ProfilePageLayout['panelDensity'])}>
              <option value="compact">Compact</option>
              <option value="cozy">Cozy</option>
              <option value="roomy">Roomy</option>
            </select>
          </label>
          <label>Avatar shape
            <select value={layout.avatarShape} onChange={(event) => patch('avatarShape', event.target.value as ProfilePageLayout['avatarShape'])}>
              <option value="circle">Circle</option>
              <option value="square">Square</option>
              <option value="soft-square">Soft square</option>
            </select>
          </label>
          <label>Profile tabs
            <select value={layout.tabStyle} onChange={(event) => patch('tabStyle', event.target.value as ProfilePageLayout['tabStyle'])}>
              <option value="bar">Classic tab bar</option>
              <option value="buttons">Button row</option>
            </select>
          </label>
          <label>Widget title style
            <select value={layout.widgetTitleStyle} onChange={(event) => patch('widgetTitleStyle', event.target.value as ProfilePageLayout['widgetTitleStyle'])}>
              <option value="solid">Solid header</option>
              <option value="underline">Underline</option>
              <option value="tab">Mini tab</option>
              <option value="pixel">Pixel / webring</option>
            </select>
          </label>
          <label className="profile-layout-range">Page width <strong>{layout.pageWidth}px</strong>
            <input type="range" min="860" max="1440" step="20" value={layout.pageWidth} onChange={(event) => patch('pageWidth', Number(event.target.value))}/>
          </label>
          <label className="profile-layout-range">Panel gap <strong>{layout.contentGap}px</strong>
            <input type="range" min="0" max="28" step="2" value={layout.contentGap} onChange={(event) => patch('contentGap', Number(event.target.value))}/>
          </label>
          <label className="profile-layout-range">Panel border <strong>{layout.borderWidth}px</strong>
            <input type="range" min="1" max="4" step="1" value={layout.borderWidth} onChange={(event) => patch('borderWidth', Number(event.target.value))}/>
          </label>
          <label className="studio-checkbox"><input type="checkbox" checked={layout.showAboutCard} onChange={(event) => patch('showAboutCard', event.target.checked)}/> Show About Me card</label>
          <label className="studio-checkbox"><input type="checkbox" checked={layout.showSchoolIdentity} onChange={(event) => patch('showSchoolIdentity', event.target.checked)}/> Show school identity card</label>
        </section>

        <section className="profile-layout-preview" style={previewStyle}>
          <header><span className="eyebrow">LIVE STRUCTURE PREVIEW</span><strong>{presetMeta.find((item) => item.id === layout.preset)?.title}</strong></header>
          <div className={`profile-layout-preview-page sidebar-${layout.sidebarSide} hero-${layout.heroStyle} density-${layout.panelDensity} avatar-${layout.avatarShape} titles-${layout.widgetTitleStyle}`}>
            <div className="profile-layout-preview-hero"><span className="profile-layout-preview-avatar"/><div><b>Your Name</b><small>@hanami-member · status here</small></div></div>
            <div className="profile-layout-preview-columns">
              <aside><i/><i/><i/></aside>
              <main><i/><i className="wide"/><i/></main>
            </div>
          </div>
          <p>This preview shows composition only. Your actual colors, background image/pattern, widgets, cosmetics, and display-name styling are layered on top.</p>
        </section>
      </div>
    </>}
  </section>
}

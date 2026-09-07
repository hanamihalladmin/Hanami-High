import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { profilePageLayoutFrom } from '../lib/profilePageLayout'
import { profilePageBackgroundFrom } from '../lib/profilePageTheme'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { CharacterProfile, Json, ProfileThemePreset } from '../types/database'
import { ShellTopbar } from './ShellTopbar'

type Props = {
  onSearch: () => void
  onNotifications: () => void
  unreadCount: number
}

type ThemePreview = {
  background: string
  panel: string
  accent: string
  ink: string
  grid: boolean
  displayFont: string
  displayEffect: string
}

const fallbackTheme: ThemePreview = {
  background: '#f4f0e8',
  panel: '#fffdf8',
  accent: '#d86f8b',
  ink: '#17223b',
  grid: true,
  displayFont: 'classic',
  displayEffect: 'solid',
}

function themeRecord(value: Json): Record<string, Json | undefined> {
  return value && !Array.isArray(value) && typeof value === 'object'
    ? value as Record<string, Json | undefined>
    : {}
}

function themeObject(value: Json): ThemePreview {
  const source = themeRecord(value)
  return {
    background: typeof source.background === 'string' ? source.background : fallbackTheme.background,
    panel: typeof source.panel === 'string' ? source.panel : fallbackTheme.panel,
    accent: typeof source.accent === 'string' ? source.accent : fallbackTheme.accent,
    ink: typeof source.ink === 'string' ? source.ink : fallbackTheme.ink,
    grid: typeof source.grid === 'boolean' ? source.grid : fallbackTheme.grid,
    displayFont: typeof source.displayFont === 'string' ? source.displayFont : fallbackTheme.displayFont,
    displayEffect: typeof source.displayEffect === 'string' ? source.displayEffect : fallbackTheme.displayEffect,
  }
}

function characterName(character: NonNullable<ReturnType<typeof useIdentity>['activeCharacter']>) {
  return character.display_name
    || [character.first_name, character.last_name].filter(Boolean).join(' ')
    || `Character ${character.slot_no}`
}

function pagePresetSummary(value: Json) {
  const layout = profilePageLayoutFrom(value)
  const background = profilePageBackgroundFrom(value)
  return {
    layout,
    background,
    label: `${layout.preset === 'webring' ? 'Webring 2006' : layout.preset.charAt(0).toUpperCase() + layout.preset.slice(1)} · ${background.mode} background`,
  }
}

export function SavedThemes({ onSearch, onNotifications, unreadCount }: Props) {
  const { account, activeCharacter, characters } = useIdentity()
  const [profile, setProfile] = useState<CharacterProfile | null>(null)
  const [presets, setPresets] = useState<ProfileThemePreset[]>([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [applying, setApplying] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const client = supabase
    if (!client || !account || !activeCharacter) return
    setLoading(true)
    setError(null)

    const [profileResult, presetResult] = await Promise.all([
      client.from('character_profiles').select('*').eq('character_id', activeCharacter.id).single(),
      client.from('profile_theme_presets').select('*').eq('account_id', account.id).order('updated_at', { ascending: false }),
    ])

    setLoading(false)
    if (profileResult.error || presetResult.error) {
      setError(profileResult.error?.message || presetResult.error?.message || 'Saved Themes could not be loaded.')
      return
    }

    setProfile(profileResult.data)
    setPresets(presetResult.data ?? [])
  }, [account, activeCharacter])

  useEffect(() => {
    void load()
  }, [load])

  const currentTheme = useMemo(() => themeObject(profile?.theme_draft ?? {}), [profile?.theme_draft])
  const currentPage = useMemo(() => pagePresetSummary(profile?.theme_draft ?? {}), [profile?.theme_draft])

  async function saveCurrentTheme() {
    const client = supabase
    const trimmedName = name.trim()
    if (!client || !account || !activeCharacter || !profile || !trimmedName) return

    setSaving(true)
    setError(null)
    setMessage(null)

    const latestResult = await client
      .from('character_profiles')
      .select('theme_draft')
      .eq('character_id', activeCharacter.id)
      .single()

    if (latestResult.error) {
      setSaving(false)
      setError(latestResult.error.message)
      return
    }

    const { data, error: insertError } = await client
      .from('profile_theme_presets')
      .insert({
        account_id: account.id,
        source_character_id: activeCharacter.id,
        name: trimmedName,
        theme: latestResult.data.theme_draft,
      })
      .select('*')
      .single()
    setSaving(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    setProfile((current) => current ? { ...current, theme_draft: latestResult.data.theme_draft } : current)
    setPresets((current) => [data, ...current])
    setName('')
    setMessage(`Saved “${data.name}” as a full-page preset: colors, background, layout, panel settings, and display-name styling.`)
  }

  async function applyTheme(preset: ProfileThemePreset) {
    const client = supabase
    if (!client || !activeCharacter) return
    setApplying(preset.id)
    setError(null)
    setMessage(null)

    const updatedAt = new Date().toISOString()
    const { error: updateError } = await client
      .from('character_profiles')
      .update({ theme_draft: preset.theme, updated_at: updatedAt })
      .eq('character_id', activeCharacter.id)

    setApplying(null)
    if (updateError) {
      setError(updateError.message)
      return
    }

    setProfile((current) => current ? { ...current, theme_draft: preset.theme, updated_at: updatedAt } : current)
    setMessage(`Applied “${preset.name}” to ${characterName(activeCharacter)}. The whole page preset is now in the private draft; publish when you want visitors to see it.`)
    window.dispatchEvent(new CustomEvent('hanami:profile-theme-changed', { detail: { characterId: activeCharacter.id } }))
  }

  async function deleteTheme(preset: ProfileThemePreset) {
    const client = supabase
    if (!client) return
    setDeleting(preset.id)
    setError(null)
    setMessage(null)
    const { error: deleteError } = await client.from('profile_theme_presets').delete().eq('id', preset.id)
    setDeleting(null)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    setPresets((current) => current.filter((item) => item.id !== preset.id))
    setMessage(`Deleted “${preset.name}”.`)
  }

  function sourceLabel(preset: ProfileThemePreset) {
    if (!preset.source_character_id) return 'Account preset'
    const source = characters.find((character) => character.id === preset.source_character_id)
    return source ? `Saved from ${characterName(source)}` : 'Saved from a previous character'
  }

  if (!account || !activeCharacter) return null

  return (
    <main className="content-area saved-themes-page">
      <ShellTopbar
        eyebrow="PROFILE"
        title="Saved Themes"
        onSearch={onSearch}
        onNotifications={onNotifications}
        unreadCount={unreadCount}
      />

      {error && <div className="identity-notice error">{error}</div>}
      {message && <div className="identity-notice success">{message}</div>}

      <section className="theme-library-hero">
        <div>
          <span className="eyebrow">ACCOUNT PAGE LIBRARY</span>
          <h2>Save entire profile looks—not just colors.</h2>
          <p>Each preset keeps the full safe SpaceHey page configuration: colors, background image/pattern settings, page layout, panel styling, avatar/header composition, and display-name styling. Presets belong to your account, so either character can reuse them.</p>
        </div>
        <button className="secondary-action" type="button" onClick={() => { window.location.hash = '#/profile/profile-studio' }}>Open Profile Studio →</button>
      </section>

      <div className="saved-themes-layout">
        <section className="save-theme-card">
          <span className="eyebrow">CURRENT DRAFT</span>
          <h3>{characterName(activeCharacter)}</h3>
          <div
            className={`theme-mini-preview theme-layout-${currentPage.layout.preset} theme-sidebar-${currentPage.layout.sidebarSide}`}
            style={{
              background: currentTheme.background,
              color: currentTheme.ink,
              '--theme-panel': currentTheme.panel,
              '--theme-accent': currentTheme.accent,
              '--theme-gap': `${Math.min(currentPage.layout.contentGap, 14)}px`,
              '--theme-border-width': `${currentPage.layout.borderWidth}px`,
            } as CSSProperties}
          >
            <div className="theme-mini-banner" />
            <div className="theme-mini-page-columns"><i/><div className="theme-mini-panel"><strong className={`profile-font-${currentTheme.displayFont} profile-effect-${currentTheme.displayEffect}`}>Hanami Profile</strong><span>{currentPage.label}</span></div></div>
          </div>
          <div className="theme-preset-features">
            <span>▦ {currentPage.layout.preset}</span>
            <span>▧ {currentPage.background.mode}</span>
            <span>Aa {currentTheme.displayFont}</span>
          </div>
          <div className="theme-swatches" aria-label="Current theme colors">
            <span style={{ background: currentTheme.background }} title="Background" />
            <span style={{ background: currentTheme.panel }} title="Panel" />
            <span style={{ background: currentTheme.accent }} title="Accent" />
            <span style={{ background: currentTheme.ink }} title="Text" />
          </div>
          <label>
            Preset name
            <input maxLength={60} value={name} placeholder="e.g. Spring Study Room" onChange={(event) => setName(event.target.value)} />
          </label>
          <button className="primary-action" type="button" disabled={saving || !name.trim() || presets.length >= 20} onClick={() => void saveCurrentTheme()}>
            {saving ? 'Saving…' : 'Save Full Page Preset'}
          </button>
          <small>{presets.length} / 20 account presets</small>
        </section>

        <section className="theme-library-list">
          <header><div><span className="eyebrow">SAVED PAGE PRESETS</span><h2>Your themes</h2></div><span>{presets.length}</span></header>
          {loading ? (
            <div className="studio-loading">Loading saved themes…</div>
          ) : presets.length === 0 ? (
            <div className="theme-library-empty"><strong>No saved themes yet.</strong><span>Save the current draft to create your first reusable whole-page preset.</span></div>
          ) : (
            <div className="theme-preset-grid">
              {presets.map((preset) => {
                const theme = themeObject(preset.theme)
                const page = pagePresetSummary(preset.theme)
                return (
                  <article className="theme-preset-card" key={preset.id}>
                    <div
                      className={`theme-preset-preview theme-layout-${page.layout.preset} theme-sidebar-${page.layout.sidebarSide}`}
                      style={{
                        background: theme.background,
                        color: theme.ink,
                        '--theme-panel': theme.panel,
                        '--theme-accent': theme.accent,
                        '--theme-gap': `${Math.min(page.layout.contentGap, 12)}px`,
                        '--theme-border-width': `${page.layout.borderWidth}px`,
                      } as CSSProperties}
                    >
                      <div className="theme-preset-hero"/><i/><i className="theme-preset-main"/>
                    </div>
                    <div className="theme-preset-copy">
                      <strong>{preset.name}</strong>
                      <span>{sourceLabel(preset)}</span>
                      <small>{page.label} · {theme.displayFont} name</small>
                      <small>Updated {new Date(preset.updated_at).toLocaleDateString()}</small>
                    </div>
                    <div className="theme-preset-features compact" aria-label="Preset features">
                      <span>▦ {page.layout.preset}</span><span>▧ {page.background.mode}</span><span>Aa {theme.displayEffect}</span>
                    </div>
                    <div className="theme-swatches compact" aria-hidden="true">
                      <span style={{ background: theme.background }} />
                      <span style={{ background: theme.panel }} />
                      <span style={{ background: theme.accent }} />
                      <span style={{ background: theme.ink }} />
                    </div>
                    <div className="theme-preset-actions">
                      <button type="button" disabled={applying === preset.id} onClick={() => void applyTheme(preset)}>{applying === preset.id ? 'Applying…' : 'Use Full Preset'}</button>
                      <button className="danger" type="button" disabled={deleting === preset.id} onClick={() => void deleteTheme(preset)}>{deleting === preset.id ? 'Deleting…' : 'Delete'}</button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

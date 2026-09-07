import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
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
}

const fallbackTheme: ThemePreview = {
  background: '#f4f0e8',
  panel: '#fffdf8',
  accent: '#d86f8b',
  ink: '#17223b',
  grid: true,
}

function themeObject(value: Json): ThemePreview {
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

function characterName(character: NonNullable<ReturnType<typeof useIdentity>['activeCharacter']>) {
  return character.display_name
    || [character.first_name, character.last_name].filter(Boolean).join(' ')
    || `Character ${character.slot_no}`
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

  async function saveCurrentTheme() {
    const client = supabase
    const trimmedName = name.trim()
    if (!client || !account || !activeCharacter || !profile || !trimmedName) return

    setSaving(true)
    setError(null)
    setMessage(null)
    const { data, error: insertError } = await client
      .from('profile_theme_presets')
      .insert({
        account_id: account.id,
        source_character_id: activeCharacter.id,
        name: trimmedName,
        theme: profile.theme_draft,
      })
      .select('*')
      .single()
    setSaving(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    setPresets((current) => [data, ...current])
    setName('')
    setMessage(`Saved “${data.name}” to your account theme library.`)
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
    setMessage(`Applied “${preset.name}” to ${characterName(activeCharacter)}. It remains a private draft until you publish.`)
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
          <span className="eyebrow">ACCOUNT THEME LIBRARY</span>
          <h2>Reuse a look across your Hanami characters.</h2>
          <p>Saved themes belong to your account, so either character can apply them. Applying a preset changes only the current private draft; nothing public changes until Profile Studio publishes it.</p>
        </div>
        <button className="secondary-action" type="button" onClick={() => { window.location.hash = '#/profile/profile-studio' }}>Open Profile Studio →</button>
      </section>

      <div className="saved-themes-layout">
        <section className="save-theme-card">
          <span className="eyebrow">CURRENT DRAFT</span>
          <h3>{characterName(activeCharacter)}</h3>
          <div
            className="theme-mini-preview"
            style={{
              background: currentTheme.background,
              color: currentTheme.ink,
              '--theme-panel': currentTheme.panel,
              '--theme-accent': currentTheme.accent,
            } as CSSProperties}
          >
            <div className="theme-mini-banner" />
            <div className="theme-mini-panel"><strong>Hanami Profile</strong><span>Current draft theme</span></div>
          </div>
          <div className="theme-swatches" aria-label="Current theme colors">
            <span style={{ background: currentTheme.background }} title="Background" />
            <span style={{ background: currentTheme.panel }} title="Panel" />
            <span style={{ background: currentTheme.accent }} title="Accent" />
            <span style={{ background: currentTheme.ink }} title="Text" />
          </div>
          <label>
            Theme name
            <input maxLength={60} value={name} placeholder="e.g. Spring Study Room" onChange={(event) => setName(event.target.value)} />
          </label>
          <button className="primary-action" type="button" disabled={saving || !name.trim() || presets.length >= 20} onClick={() => void saveCurrentTheme()}>
            {saving ? 'Saving…' : 'Save Current Theme'}
          </button>
          <small>{presets.length} / 20 account presets</small>
        </section>

        <section className="theme-library-list">
          <header><div><span className="eyebrow">SAVED PRESETS</span><h2>Your themes</h2></div><span>{presets.length}</span></header>
          {loading ? (
            <div className="studio-loading">Loading saved themes…</div>
          ) : presets.length === 0 ? (
            <div className="theme-library-empty"><strong>No saved themes yet.</strong><span>Save the current draft to create your first reusable preset.</span></div>
          ) : (
            <div className="theme-preset-grid">
              {presets.map((preset) => {
                const theme = themeObject(preset.theme)
                return (
                  <article className="theme-preset-card" key={preset.id}>
                    <div
                      className="theme-preset-preview"
                      style={{
                        background: theme.background,
                        color: theme.ink,
                        '--theme-panel': theme.panel,
                        '--theme-accent': theme.accent,
                      } as CSSProperties}
                    >
                      <div /><div /><div />
                    </div>
                    <div className="theme-preset-copy">
                      <strong>{preset.name}</strong>
                      <span>{sourceLabel(preset)}</span>
                      <small>Updated {new Date(preset.updated_at).toLocaleDateString()}</small>
                    </div>
                    <div className="theme-swatches compact" aria-hidden="true">
                      <span style={{ background: theme.background }} />
                      <span style={{ background: theme.panel }} />
                      <span style={{ background: theme.accent }} />
                      <span style={{ background: theme.ink }} />
                    </div>
                    <div className="theme-preset-actions">
                      <button type="button" disabled={applying === preset.id} onClick={() => void applyTheme(preset)}>{applying === preset.id ? 'Applying…' : 'Use Theme'}</button>
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

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { getSignedProfileMediaUrl } from '../lib/profileMedia'
import { profilePageLayoutFrom } from '../lib/profilePageLayout'
import { profilePageBackgroundFrom, profilePageBackgroundStyle } from '../lib/profilePageTheme'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { CharacterProfile, Json, ProfileWidget } from '../types/database'
import type { BoutiqueItem } from '../types/database-rewards'
import type { CharacterCosmeticLoadout } from '../types/database-customization'

type Props = { onClose: () => void }
type Theme = { background: string; panel: string; accent: string; ink: string; grid: boolean; displayFont: string; displayEffect: string; displayColor: string; displayColor2: string }
type Cosmetics = { avatarDecoration?: string; frame?: string; effect?: string; nameplate?: string; profileCard?: string; backgroundPack?: string }

const fallback: Theme = { background: '#f4f0e8', panel: '#fffdf8', accent: '#d86f8b', ink: '#17223b', grid: false, displayFont: 'classic', displayEffect: 'solid', displayColor: '#d86f8b', displayColor2: '#f6b7cb' }
function obj(value: Json) { return value && !Array.isArray(value) && typeof value === 'object' ? value as Record<string, Json | undefined> : {} }
function themeFrom(value: Json): Theme { const s = obj(value); return { background: typeof s.background === 'string' ? s.background : fallback.background, panel: typeof s.panel === 'string' ? s.panel : fallback.panel, accent: typeof s.accent === 'string' ? s.accent : fallback.accent, ink: typeof s.ink === 'string' ? s.ink : fallback.ink, grid: typeof s.grid === 'boolean' ? s.grid : false, displayFont: typeof s.displayFont === 'string' ? s.displayFont : 'classic', displayEffect: typeof s.displayEffect === 'string' ? s.displayEffect : 'solid', displayColor: typeof s.displayColor === 'string' ? s.displayColor : '#d86f8b', displayColor2: typeof s.displayColor2 === 'string' ? s.displayColor2 : '#f6b7cb' } }
function widgetContent(value: Json) { const content = obj(value).content; return typeof content === 'string' ? content : '' }
function widgetPath(value: Json) { const path = obj(value).storagePath; return typeof path === 'string' ? path : null }
function safeClass(value?: string) { return (value || 'none').replace(/[^a-z0-9-]/gi, '-').toLowerCase() }
function lines(value: string) { return value.split(/\r?\n|\s*\|\s*/).map((item) => item.trim()).filter(Boolean) }
function roleLabel(role: string | null) { if (role === 'new_faculty') return 'New Teacher'; if (role === 'faculty') return 'Teacher'; if (role === 'administration') return 'Staff'; if (role === 'new_student') return 'New Student'; if (role === 'student') return 'Student'; return role ? role.split('_').map((part) => part[0]?.toUpperCase() + part.slice(1)).join(' ') : 'Hanami Member' }

function renderWidgetBody(widget: ProfileWidget, media: Record<string, string>): ReactNode {
  const content = widgetContent(widget.config)
  const path = widgetPath(widget.config)
  const items = lines(content)
  if (widget.widget_type === 'image') return <>{path && media[path] ? <img className="published-widget-image" src={media[path]} alt={widget.title || 'Profile image'}/> : <div className="profile-widget-missing-image">Image unavailable</div>}{content && <p className="profile-widget-caption">{content}</p>}</>
  if (widget.widget_type === 'blinkies') return <div className="profile-widget-blinkies">{items.map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}</div>
  if (widget.widget_type === 'marquee') return <div className="profile-widget-marquee"><span>{content || '✦ welcome to my page ✦'}</span></div>
  if (widget.widget_type === 'mood') return <div className="profile-widget-mood"><span aria-hidden="true">☺</span><div>{items.map((item, index) => <p key={`${item}-${index}`}>{item}</p>)}</div></div>
  if (widget.widget_type === 'music') return <div className="profile-widget-music"><span className="profile-widget-disc" aria-hidden="true">♫</span><div>{items.map((item, index) => index === 0 ? <strong key={`${item}-${index}`}>{item}</strong> : <span key={`${item}-${index}`}>{item}</span>)}<small>decorative player · no autoplay</small></div></div>
  if (widget.widget_type === 'favorites') return <ul className="profile-widget-favorites">{items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>
  if (widget.widget_type === 'contact') return <div className="profile-widget-contact">{items.map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}</div>
  if (widget.widget_type === 'quote') return <blockquote className="profile-widget-quote">{content || 'Add a favorite quote.'}</blockquote>
  if (widget.widget_type === 'divider') return <div className="profile-widget-divider"><span>{content || '✿ ✦ ✿ ✦ ✿'}</span></div>
  if (widget.widget_type === 'journal') return <div className="profile-widget-journal">{items.map((item, index) => index === 0 ? <time key={`${item}-${index}`}>{item}</time> : <p key={`${item}-${index}`}>{item}</p>)}</div>
  if (widget.widget_type === 'links') return <div className="profile-widget-links">{items.map((item, index) => <span key={`${item}-${index}`}>↗ {item}</span>)}</div>
  if (widget.widget_type === 'sticker') return <div className="profile-widget-sticker">{content || '✿'}</div>
  return <p className="profile-widget-text">{content || 'Profile widget'}</p>
}

function cosmeticsFrom(loadout: CharacterCosmeticLoadout | null, items: BoutiqueItem[]): Cosmetics {
  if (!loadout) return {}
  const byId = new Map(items.map((item) => [item.id, item.slug]))
  return {
    avatarDecoration: loadout.avatar_decoration_item_id ? byId.get(loadout.avatar_decoration_item_id) : undefined,
    frame: loadout.frame_item_id ? byId.get(loadout.frame_item_id) : undefined,
    effect: loadout.effect_item_id ? byId.get(loadout.effect_item_id) : undefined,
    nameplate: loadout.nameplate_item_id ? byId.get(loadout.nameplate_item_id) : undefined,
    profileCard: loadout.profile_card_item_id ? byId.get(loadout.profile_card_item_id) : undefined,
    backgroundPack: loadout.background_pack_item_id ? byId.get(loadout.background_pack_item_id) : undefined,
  }
}

export function ProfileDraftPreview({ onClose }: Props) {
  const { activeCharacter } = useIdentity()
  const [profile, setProfile] = useState<CharacterProfile | null>(null)
  const [widgets, setWidgets] = useState<ProfileWidget[]>([])
  const [loadout, setLoadout] = useState<CharacterCosmeticLoadout | null>(null)
  const [items, setItems] = useState<BoutiqueItem[]>([])
  const [media, setMedia] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const client = supabase
    const character = activeCharacter
    if (!client || !character) return
    setLoading(true)
    setError(null)
    const [profileResult, widgetResult, loadoutResult, itemResult] = await Promise.all([
      client.from('character_profiles').select('*').eq('character_id', character.id).single(),
      client.from('profile_widgets').select('*').eq('character_id', character.id).eq('is_visible', true).order('y').order('x'),
      client.from('character_cosmetic_loadouts').select('*').eq('character_id', character.id).maybeSingle(),
      client.from('boutique_items').select('*').eq('state', 'published'),
    ])
    const first = profileResult.error || widgetResult.error || loadoutResult.error || itemResult.error
    if (first) { setLoading(false); setError(first.message); return }
    const nextProfile = profileResult.data
    const nextWidgets = widgetResult.data ?? []
    setProfile(nextProfile)
    setWidgets(nextWidgets)
    setLoadout(loadoutResult.data)
    setItems(itemResult.data ?? [])
    const pageBackground = profilePageBackgroundFrom(nextProfile.theme_draft)
    const paths = Array.from(new Set([nextProfile.avatar_path, nextProfile.banner_path, pageBackground.imagePath, ...nextWidgets.map((widget) => widgetPath(widget.config))].filter((value): value is string => Boolean(value))))
    const pairs = await Promise.all(paths.map(async (path) => { try { const url = await getSignedProfileMediaUrl(path); return url ? [path, url] as const : null } catch { return null } }))
    setMedia(Object.fromEntries(pairs.filter((value): value is readonly [string, string] => Boolean(value))))
    setLoading(false)
  }, [activeCharacter])

  useEffect(() => { void load() }, [load])
  useEffect(() => { const handler = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler) }, [onClose])

  const theme = useMemo(() => themeFrom(profile?.theme_draft ?? {}), [profile?.theme_draft])
  const layout = useMemo(() => profilePageLayoutFrom(profile?.theme_draft ?? {}), [profile?.theme_draft])
  const pageBackground = useMemo(() => profilePageBackgroundFrom(profile?.theme_draft ?? {}), [profile?.theme_draft])
  const cosmetics = useMemo(() => cosmeticsFrom(loadout, items), [items, loadout])
  if (!activeCharacter) return null

  const name = activeCharacter.display_name || [activeCharacter.first_name, activeCharacter.last_name].filter(Boolean).join(' ') || 'Your Character'
  const handle = activeCharacter.handle ? `@${activeCharacter.handle}` : '@hanami-member'
  const backgroundUrl = pageBackground.imagePath ? media[pageBackground.imagePath] ?? null : null
  const style = {
    ...profilePageBackgroundStyle(pageBackground, backgroundUrl, theme.accent),
    '--profile-bg': theme.background,
    '--profile-panel': theme.panel,
    '--profile-accent': theme.accent,
    '--profile-ink': theme.ink,
    '--display-color': theme.displayColor,
    '--display-color-2': theme.displayColor2,
    '--spacehey-panel-opacity': String(pageBackground.panelOpacity),
    '--spacehey-border-style': pageBackground.borderStyle,
    '--profile-page-width': `${layout.pageWidth}px`,
    '--profile-content-gap': `${layout.contentGap}px`,
    '--profile-panel-border-width': `${layout.borderWidth}px`,
  } as CSSProperties

  const sidebar = <aside className="hanami-profile-about">
    <section className="spacehey-contact-box preview-contact"><span className="eyebrow">CONTACTING {name.toUpperCase()}</span><div className="spacehey-contact-actions"><button type="button" disabled>✉ Send Message</button><button type="button" disabled>Add to Friends</button><button type="button" disabled>✎ Sign Guestbook</button><button type="button" disabled>☞ View Blog</button></div></section>
    {layout.showAboutCard && profile?.bio && <section><span className="eyebrow">ABOUT ME</span><p>{profile.bio}</p></section>}
    {layout.showSchoolIdentity && <section><span className="eyebrow">HANAMI DETAILS</span><dl><div><dt>Role</dt><dd>{roleLabel(activeCharacter.school_role)}</dd></div><div><dt>Network</dt><dd>Hanami High</dd></div></dl></section>}
    <section><span className="eyebrow">PREVIEW NOTE</span><p>This is your private draft. Visitor-only interactions are shown as placeholders.</p></section>
  </aside>

  return <div className="profile-draft-preview-backdrop" role="dialog" aria-modal="true" aria-label="Private profile draft preview">
    <div className="profile-draft-preview-window spacehey-draft-preview-window">
      <header className="profile-draft-preview-toolbar">
        <div><span className="eyebrow">PRIVATE DRAFT PREVIEW</span><strong>{name}</strong><small>This is how your full personal page will look after publishing.</small></div>
        <div><button type="button" onClick={() => void load()}>Refresh Draft</button><button className="primary-action" type="button" onClick={onClose}>Back to Studio</button></div>
      </header>
      {error && <div className="identity-notice error">{error}</div>}
      {loading || !profile ? <div className="studio-loading">Rendering your private profile draft…</div> : <div className="profile-draft-preview-scroll">
        <div className={`hanami-profile-shell spacehey-profile-page layout-${layout.preset} sidebar-${layout.sidebarSide} hero-${layout.heroStyle} density-${layout.panelDensity} titles-${layout.widgetTitleStyle} avatar-${layout.avatarShape} tabs-${layout.tabStyle} ${theme.grid ? 'show-grid' : ''} cosmetic-frame-${safeClass(cosmetics.frame)} cosmetic-avatar-${safeClass(cosmetics.avatarDecoration)} cosmetic-effect-${safeClass(cosmetics.effect)} cosmetic-card-${safeClass(cosmetics.profileCard)} cosmetic-bg-${safeClass(cosmetics.backgroundPack)}`} style={style}>
          <section className="hanami-profile-hero">
            <div className="hanami-profile-banner" style={{ background: theme.accent }}>{profile.banner_path && media[profile.banner_path] && <img src={media[profile.banner_path]} alt={`${name} banner`}/>}</div>
            <div className="hanami-profile-avatar-wrap"><div className="hanami-profile-avatar">{profile.avatar_path && media[profile.avatar_path] ? <img src={media[profile.avatar_path]} alt={`${name} avatar`}/> : name.slice(0, 2).toUpperCase()}</div><span className="hanami-avatar-decoration" aria-hidden="true"/></div>
            <div className="hanami-profile-heading"><div><span className="eyebrow">WELCOME TO MY PAGE</span><h1 className={`profile-display-name profile-font-${theme.displayFont} profile-effect-${theme.displayEffect}`}>{name}</h1><p>{handle}{profile.pronouns ? ` · ${profile.pronouns}` : ''}</p>{profile.custom_status && <blockquote>mood: {profile.custom_status}</blockquote>}</div><div className="hanami-profile-actions"><button className="primary-action" type="button" disabled>Edit My Page</button><button className="secondary-action" type="button" disabled>Name Style</button></div></div>
          </section>
          <div className="hanami-profile-layout">
            {layout.sidebarSide === 'left' && sidebar}
            <section className="hanami-profile-main">
              <nav className="hanami-profile-tabs"><button className="active" type="button">Profile</button><button type="button" disabled>Bulletins</button><button type="button" disabled>Blog</button><button type="button" disabled>Comments</button></nav>
              <div className="hanami-profile-board">{widgets.length === 0 ? <div className="hanami-profile-empty">Your draft page is empty.</div> : <div className="published-widget-canvas">{widgets.map((widget) => <article className={`published-widget widget-${safeClass(widget.widget_type)}`} key={widget.id} style={{ gridColumn: `span ${Math.min(Math.max(widget.width, 1), 12)}`, minHeight: `${Math.max(widget.height, 1) * 48}px` }}><header><strong>{widget.title || widget.widget_type.replaceAll('_', ' ')}</strong></header><div className="published-widget-body">{renderWidgetBody(widget, media)}</div></article>)}</div>}</div>
            </section>
            {layout.sidebarSide === 'right' && sidebar}
          </div>
        </div>
      </div>}
    </div>
  </div>
}

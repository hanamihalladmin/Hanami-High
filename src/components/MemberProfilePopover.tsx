import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { getSignedProfileMediaUrl } from '../lib/profileMedia'
import { supabase } from '../lib/supabase'
import type { Json } from '../types/database'

type Props = {
  characterId: string | null
  onClose: () => void
}

type MiniProfile = {
  display_name: string | null
  handle: string | null
  pronouns: string | null
  custom_status: string | null
  bio: string | null
  avatar_path: string | null
  banner_path: string | null
  school_role: string | null
  published_at: string | null
  theme: Json
}

type SearchIdentity = {
  title: string
  subtitle: string | null
}

type Presence = {
  status: string
  last_seen_at: string
}

function roleLabel(role: string | null | undefined) {
  if (role === 'new_student') return 'New Student'
  if (role === 'student') return 'Student'
  if (role === 'new_faculty') return 'New Teacher'
  if (role === 'faculty') return 'Teacher'
  if (role === 'administration') return 'Staff'
  return role ? role.replaceAll('_', ' ') : 'Hanami Member'
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'H'
}

function presenceLabel(presence: Presence | null) {
  if (!presence) return 'Offline'
  const ageMs = Date.now() - new Date(presence.last_seen_at).getTime()
  if (!Number.isFinite(ageMs) || ageMs > 120_000 || presence.status === 'invisible') return 'Offline'
  if (presence.status === 'away' || presence.status === 'idle') return 'Idle'
  if (presence.status === 'dnd') return 'Do Not Disturb'
  return 'Online'
}

function themeValue(theme: Json, key: string, fallback: string) {
  if (!theme || Array.isArray(theme) || typeof theme !== 'object') return fallback
  const value = (theme as Record<string, Json | undefined>)[key]
  return typeof value === 'string' ? value : fallback
}

function safeClass(value: string) {
  return value.replace(/[^a-z0-9-]/gi, '-').toLowerCase()
}

export function MemberProfilePopover({ characterId, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const [profile, setProfile] = useState<MiniProfile | null>(null)
  const [identity, setIdentity] = useState<SearchIdentity | null>(null)
  const [presence, setPresence] = useState<Presence | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [bannerUrl, setBannerUrl] = useState<string | null>(null)
  const [memberSince, setMemberSince] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!characterId) return
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKeyDown)
    window.setTimeout(() => closeRef.current?.focus(), 0)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [characterId, onClose])

  useEffect(() => {
    const client = supabase
    const id = characterId
    if (!client || !id) {
      setProfile(null); setIdentity(null); setPresence(null); setAvatarUrl(null); setBannerUrl(null); setMemberSince(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setAvatarUrl(null)
    setBannerUrl(null)

    void Promise.all([
      client.from('published_character_profiles').select('display_name,handle,pronouns,custom_status,bio,avatar_path,banner_path,school_role,published_at,theme').eq('character_id', id).maybeSingle(),
      client.from('search_documents').select('title,subtitle').eq('document_type', 'character').eq('entity_id', id).maybeSingle(),
      client.from('character_presence').select('status,last_seen_at').eq('character_id', id).maybeSingle(),
      client.from('characters').select('created_at').eq('id', id).maybeSingle(),
    ]).then(async ([profileResult, identityResult, presenceResult, characterResult]) => {
      if (cancelled) return
      const nextProfile = profileResult.data as MiniProfile | null
      setProfile(nextProfile)
      setIdentity((identityResult.data as SearchIdentity | null) ?? null)
      setPresence((presenceResult.data as Presence | null) ?? null)
      setMemberSince(characterResult.data?.created_at ?? null)

      const paths = [nextProfile?.avatar_path, nextProfile?.banner_path].filter((value): value is string => Boolean(value))
      const urls = await Promise.all(paths.map(async (path) => {
        try { return [path, await getSignedProfileMediaUrl(path)] as const } catch { return [path, null] as const }
      }))
      if (!cancelled) {
        const media = Object.fromEntries(urls)
        if (nextProfile?.avatar_path) setAvatarUrl(media[nextProfile.avatar_path] ?? null)
        if (nextProfile?.banner_path) setBannerUrl(media[nextProfile.banner_path] ?? null)
        setLoading(false)
      }
    }).catch(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [characterId])

  const accent = useMemo(() => themeValue(profile?.theme ?? {}, 'accent', '#d86f8b'), [profile?.theme])
  const displayFont = useMemo(() => safeClass(themeValue(profile?.theme ?? {}, 'displayFont', 'classic')), [profile?.theme])
  const displayEffect = useMemo(() => safeClass(themeValue(profile?.theme ?? {}, 'displayEffect', 'solid')), [profile?.theme])
  const displayColor = useMemo(() => themeValue(profile?.theme ?? {}, 'displayColor', accent), [profile?.theme, accent])
  const displayColor2 = useMemo(() => themeValue(profile?.theme ?? {}, 'displayColor2', '#f6b7cb'), [profile?.theme])

  if (!characterId) return null

  const name = profile?.display_name || identity?.title || 'Hanami Member'
  const handle = profile?.handle ? `@${profile.handle}` : null
  const role = roleLabel(profile?.school_role || identity?.subtitle)
  const status = presenceLabel(presence)
  const statusClass = status === 'Do Not Disturb' ? 'dnd' : status.toLowerCase()
  const style = { '--member-accent': accent, '--display-color': displayColor, '--display-color-2': displayColor2 } as CSSProperties

  return (
    <div className="member-popover-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="member-profile-popover discord-member-popover" role="dialog" aria-modal="true" aria-label={`${name} mini profile`} style={style}>
        <header className="member-popover-cover" style={{ background: accent }}>
          {bannerUrl && <img src={bannerUrl} alt="" aria-hidden="true"/>}
          <button ref={closeRef} className="member-popover-close" type="button" onClick={onClose} aria-label="Close member profile">×</button>
        </header>

        <div className="member-popover-avatar-wrap">
          <div className="member-popover-avatar">{avatarUrl ? <img src={avatarUrl} alt={`${name} avatar`} /> : initials(name)}</div>
          <span className={`member-popover-status-dot presence-${statusClass}`} title={status} />
        </div>

        <div className="member-popover-quick-actions">
          <a href="#/messages/friends" onClick={onClose}>Message</a>
          <a data-member-full-profile="true" href={`#/profile/view-profile/${encodeURIComponent(characterId)}`} onClick={onClose}>View Profile</a>
        </div>

        <div className="member-popover-body">
          {loading ? <div className="member-popover-loading">Loading member…</div> : <>
            <div className="member-popover-identity">
              <h2 className={`profile-display-name profile-font-${displayFont} profile-effect-${displayEffect}`}>{name}</h2>
              <p>{handle || role}{profile?.pronouns ? ` · ${profile.pronouns}` : ''}</p>
              <div className="member-popover-badges"><span><i style={{ background: accent }}/>{role}</span><b title="Hanami High member">花</b></div>
            </div>

            {profile?.custom_status && <div className="member-popover-custom-status">{profile.custom_status}</div>}

            <div className="member-popover-info-card">
              {profile?.bio && <section><strong>ABOUT ME</strong><p>{profile.bio}</p></section>}
              <section><strong>MEMBER SINCE</strong><p>{memberSince ? new Date(memberSince).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</p></section>
              <section><strong>STATUS</strong><p>{status}</p></section>
              <section><strong>CONNECTIONS</strong><div className="member-popover-connection"><span>花</span><div><b>Hanami High</b><small>Campus Network</small></div></div></section>
            </div>
          </>}
        </div>
      </section>
    </div>
  )
}

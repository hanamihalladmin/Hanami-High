import { useEffect, useRef, useState } from 'react'
import { getSignedProfileMediaUrl } from '../lib/profileMedia'
import { supabase } from '../lib/supabase'

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
  school_role: string | null
  published_at: string | null
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
  if (role === 'administration') return 'School Administration'
  return role ? role.replaceAll('_', ' ') : 'Hanami Member'
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'H'
}

function presenceLabel(presence: Presence | null) {
  if (!presence) return 'Offline'
  const ageMs = Date.now() - new Date(presence.last_seen_at).getTime()
  if (!Number.isFinite(ageMs) || ageMs > 120_000) return 'Offline'
  if (presence.status === 'away') return 'Away'
  if (presence.status === 'idle') return 'Idle'
  return 'Online'
}

export function MemberProfilePopover({ characterId, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const [profile, setProfile] = useState<MiniProfile | null>(null)
  const [identity, setIdentity] = useState<SearchIdentity | null>(null)
  const [presence, setPresence] = useState<Presence | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [memberSince, setMemberSince] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!characterId) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    window.setTimeout(() => closeRef.current?.focus(), 0)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [characterId, onClose])

  useEffect(() => {
    const client = supabase
    if (!client || !characterId) {
      setProfile(null)
      setIdentity(null)
      setPresence(null)
      setAvatarUrl(null)
      setMemberSince(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setAvatarUrl(null)

    void Promise.all([
      client.from('published_character_profiles').select('display_name,handle,pronouns,custom_status,bio,avatar_path,school_role,published_at').eq('character_id', characterId).maybeSingle(),
      client.from('search_documents').select('title,subtitle').eq('document_type', 'character').eq('entity_id', characterId).maybeSingle(),
      client.from('character_presence').select('status,last_seen_at').eq('character_id', characterId).maybeSingle(),
      client.from('characters').select('created_at').eq('id', characterId).maybeSingle(),
    ]).then(async ([profileResult, identityResult, presenceResult, characterResult]) => {
      if (cancelled) return
      const nextProfile = profileResult.data as MiniProfile | null
      setProfile(nextProfile)
      setIdentity((identityResult.data as SearchIdentity | null) ?? null)
      setPresence((presenceResult.data as Presence | null) ?? null)
      setMemberSince(characterResult.data?.created_at ?? null)

      if (nextProfile?.avatar_path) {
        try {
          const url = await getSignedProfileMediaUrl(nextProfile.avatar_path)
          if (!cancelled) setAvatarUrl(url)
        } catch {
          if (!cancelled) setAvatarUrl(null)
        }
      }
      if (!cancelled) setLoading(false)
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [characterId])

  if (!characterId) return null

  const name = profile?.display_name || identity?.title || 'Hanami Member'
  const handle = profile?.handle ? `@${profile.handle}` : null
  const role = roleLabel(profile?.school_role || identity?.subtitle)
  const status = presenceLabel(presence)

  return (
    <div className="member-popover-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="member-profile-popover" role="dialog" aria-modal="true" aria-label={`${name} mini profile`}>
        <header className="member-popover-cover">
          <span className={`member-popover-presence presence-${status.toLowerCase()}`} aria-label={status} />
          <button ref={closeRef} className="member-popover-close" type="button" onClick={onClose} aria-label="Close member profile">×</button>
        </header>

        <div className="member-popover-avatar-wrap">
          <div className="member-popover-avatar">
            {avatarUrl ? <img src={avatarUrl} alt={`${name} avatar`} /> : initials(name)}
          </div>
          <span className={`member-popover-status-dot presence-${status.toLowerCase()}`} title={status} />
        </div>

        <div className="member-popover-body">
          {loading ? <div className="member-popover-loading">Loading member…</div> : <>
            <div className="member-popover-identity">
              <h2>{name}</h2>
              <p>{handle || role}{profile?.pronouns ? ` · ${profile.pronouns}` : ''}</p>
            </div>

            {profile?.custom_status && <div className="member-popover-custom-status">{profile.custom_status}</div>}

            <dl className="member-popover-facts">
              <div><dt>ROLE</dt><dd>{role}</dd></div>
              <div><dt>STATUS</dt><dd>{status}</dd></div>
              {memberSince && <div><dt>MEMBER SINCE</dt><dd>{new Date(memberSince).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</dd></div>}
            </dl>

            {profile?.bio && <div className="member-popover-about"><strong>ABOUT ME</strong><p>{profile.bio}</p></div>}

            <div className="member-popover-actions">
              <a data-member-full-profile="true" className="member-popover-primary" href={`#/profile/view-profile/${encodeURIComponent(characterId)}`} onClick={onClose}>View Full Profile</a>
              <button type="button" onClick={onClose}>Close</button>
            </div>
          </>}
        </div>
      </section>
    </div>
  )
}

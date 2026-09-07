import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { Friendship, GuestbookEntry, SearchDocument } from '../types/database'
import { ShellTopbar } from './ShellTopbar'

type IdentitySummary = Pick<SearchDocument, 'entity_id' | 'title' | 'subtitle'>

type Props = {
  onSearch: () => void
  onNotifications: () => void
  unreadCount: number
}

function profileHash(characterId: string) {
  return `#/profile/view-profile/${encodeURIComponent(characterId)}`
}

function relativeTime(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 60) return 'now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(value).toLocaleDateString()
}

function otherCharacter(friendship: Friendship, activeCharacterId: string) {
  return friendship.requester_character_id === activeCharacterId
    ? friendship.addressee_character_id
    : friendship.requester_character_id
}

export function GuestbookActivityPage({ onSearch, onNotifications, unreadCount }: Props) {
  const { activeCharacter } = useIdentity()
  const [entries, setEntries] = useState<GuestbookEntry[]>([])
  const [identities, setIdentities] = useState<Record<string, IdentitySummary>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const client = supabase
    if (!client || !activeCharacter) return
    setLoading(true)
    setError(null)

    const { data: friendshipData, error: friendshipError } = await client
      .from('friendships')
      .select('*')
      .eq('status', 'accepted')
      .or(`requester_character_id.eq.${activeCharacter.id},addressee_character_id.eq.${activeCharacter.id}`)

    if (friendshipError) {
      setLoading(false)
      setError(friendshipError.message)
      return
    }

    const networkIds = [
      activeCharacter.id,
      ...(friendshipData ?? []).map((friendship) => otherCharacter(friendship, activeCharacter.id)),
    ]

    const [profileEntriesResult, authorEntriesResult] = await Promise.all([
      client.from('guestbook_entries').select('*').in('profile_character_id', networkIds).order('created_at', { ascending: false }).limit(80),
      client.from('guestbook_entries').select('*').in('author_character_id', networkIds).order('created_at', { ascending: false }).limit(80),
    ])

    if (profileEntriesResult.error || authorEntriesResult.error) {
      setLoading(false)
      setError(profileEntriesResult.error?.message || authorEntriesResult.error?.message || 'Guestbook activity could not be loaded.')
      return
    }

    const byId = new Map<string, GuestbookEntry>()
    for (const entry of [...(profileEntriesResult.data ?? []), ...(authorEntriesResult.data ?? [])]) byId.set(entry.id, entry)
    const nextEntries = Array.from(byId.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 80)
    setEntries(nextEntries)

    const identityIds = Array.from(new Set(nextEntries.flatMap((entry) => [entry.author_character_id, entry.profile_character_id])))
    if (identityIds.length === 0) {
      setIdentities({})
      setLoading(false)
      return
    }

    const { data: identityData, error: identityError } = await client
      .from('search_documents')
      .select('entity_id,title,subtitle')
      .eq('document_type', 'character')
      .in('entity_id', identityIds)

    setLoading(false)
    if (identityError) {
      setError(identityError.message)
      return
    }

    setIdentities(Object.fromEntries(
      (identityData ?? [])
        .filter((item) => item.entity_id)
        .map((item) => [item.entity_id as string, item]),
    ))
  }, [activeCharacter])

  useEffect(() => {
    void load()
  }, [load])

  if (!activeCharacter) return null

  function identityFor(characterId: string) {
    if (characterId === activeCharacter.id) {
      const name = activeCharacter.display_name
        || [activeCharacter.first_name, activeCharacter.last_name].filter(Boolean).join(' ')
        || 'Your Character'
      return identities[characterId] ?? { entity_id: characterId, title: name, subtitle: activeCharacter.school_role || 'Hanami character' }
    }
    return identities[characterId] ?? { entity_id: characterId, title: 'Hanami Character', subtitle: 'Campus identity' }
  }

  return (
    <main className="content-area guestbook-activity-page">
      <ShellTopbar
        eyebrow="SOCIAL"
        title="Guestbook Activity"
        onSearch={onSearch}
        onNotifications={onNotifications}
        unreadCount={unreadCount}
      />

      {error && <div className="identity-notice error">{error}</div>}

      <section className="guestbook-activity-card">
        <header>
          <div>
            <span className="eyebrow">YOUR CIRCLE</span>
            <h2>Recent guestbook signatures</h2>
            <p>Activity involving your active character and accepted friends. Profile and guestbook privacy still determine what appears here.</p>
          </div>
          <strong>{entries.length}</strong>
        </header>

        {loading ? (
          <div className="friends-empty">Loading guestbook activity…</div>
        ) : entries.length === 0 ? (
          <div className="friends-empty">No guestbook activity in your circle yet.</div>
        ) : (
          <div className="guestbook-activity-list">
            {entries.map((entry) => {
              const author = identityFor(entry.author_character_id)
              const target = identityFor(entry.profile_character_id)
              return (
                <article className={`guestbook-activity-row ${entry.status === 'hidden' ? 'hidden-entry' : ''}`} key={entry.id}>
                  <button className="friend-avatar" type="button" onClick={() => { window.location.hash = profileHash(entry.author_character_id) }}>
                    {author.title.slice(0, 2).toUpperCase()}
                  </button>
                  <div>
                    <p>
                      <button type="button" onClick={() => { window.location.hash = profileHash(entry.author_character_id) }}>{author.title}</button>
                      {' signed '}
                      <button type="button" onClick={() => { window.location.hash = profileHash(entry.profile_character_id) }}>{target.title}</button>
                      {'’s guestbook.'}
                    </p>
                    <blockquote>{entry.body}</blockquote>
                    <span>{relativeTime(entry.created_at)}{entry.status === 'hidden' ? ' · hidden' : ''}</span>
                  </div>
                  <button className="secondary-action" type="button" onClick={() => { window.location.hash = profileHash(entry.profile_character_id) }}>View profile →</button>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}

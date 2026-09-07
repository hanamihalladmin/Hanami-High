import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { GuestbookEntry, SearchDocument } from '../types/database'

type IdentitySummary = Pick<SearchDocument, 'entity_id' | 'title' | 'subtitle'>

type Props = {
  targetCharacterId: string
  guestbookVisibility?: string | null
  targetEntryId?: string
  management?: boolean
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

function profileHash(characterId: string) {
  return `#/profile/view-profile/${encodeURIComponent(characterId)}`
}

export function GuestbookPanel({ targetCharacterId, guestbookVisibility, targetEntryId, management = false }: Props) {
  const { activeCharacter } = useIdentity()
  const [entries, setEntries] = useState<GuestbookEntry[]>([])
  const [identities, setIdentities] = useState<Record<string, IdentitySummary>>({})
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [workingId, setWorkingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const isOwner = activeCharacter?.id === targetCharacterId
  const canCompose = Boolean(activeCharacter && !isOwner && guestbookVisibility !== 'disabled')

  const load = useCallback(async () => {
    const client = supabase
    if (!client || !activeCharacter) return
    setLoading(true)
    setError(null)

    const { data, error: entryError } = await client
      .from('guestbook_entries')
      .select('*')
      .eq('profile_character_id', targetCharacterId)
      .order('created_at', { ascending: false })
      .limit(80)

    if (entryError) {
      setLoading(false)
      setError(entryError.message)
      return
    }

    const nextEntries = data ?? []
    setEntries(nextEntries)

    const authorIds = Array.from(new Set(nextEntries.map((entry) => entry.author_character_id)))
    if (authorIds.length === 0) {
      setIdentities({})
      setLoading(false)
      return
    }

    const { data: identityData, error: identityError } = await client
      .from('search_documents')
      .select('entity_id,title,subtitle')
      .eq('document_type', 'character')
      .in('entity_id', authorIds)

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
  }, [activeCharacter, targetCharacterId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!targetEntryId || loading) return
    const timer = window.setTimeout(() => {
      document.getElementById(`guestbook-entry-${targetEntryId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 60)
    return () => window.clearTimeout(timer)
  }, [targetEntryId, loading])

  const visibleCount = useMemo(() => entries.filter((entry) => entry.status === 'visible').length, [entries])
  const hiddenCount = entries.length - visibleCount

  function identityFor(characterId: string) {
    if (characterId === activeCharacter?.id) {
      const name = activeCharacter.display_name
        || [activeCharacter.first_name, activeCharacter.last_name].filter(Boolean).join(' ')
        || 'Your Character'
      return identities[characterId] ?? { entity_id: characterId, title: name, subtitle: activeCharacter.school_role || 'Hanami character' }
    }
    return identities[characterId] ?? { entity_id: characterId, title: 'Hanami Character', subtitle: 'Campus identity' }
  }

  async function signGuestbook() {
    const client = supabase
    if (!client || !activeCharacter || !canCompose) return
    const trimmed = body.trim()
    if (!trimmed) return

    setPosting(true)
    setError(null)
    setMessage(null)
    const { error: insertError } = await client.from('guestbook_entries').insert({
      profile_character_id: targetCharacterId,
      author_character_id: activeCharacter.id,
      body: trimmed,
    })
    setPosting(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    setBody('')
    setMessage('Guestbook signed.')
    await load()
  }

  async function setEntryStatus(entry: GuestbookEntry, status: 'visible' | 'hidden') {
    const client = supabase
    if (!client || !isOwner) return
    setWorkingId(entry.id)
    setError(null)
    setMessage(null)
    const { error: updateError } = await client
      .from('guestbook_entries')
      .update({ status })
      .eq('id', entry.id)
    setWorkingId(null)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setMessage(status === 'hidden' ? 'Entry hidden from visitors.' : 'Entry restored to the guestbook.')
    await load()
  }

  async function deleteEntry(entry: GuestbookEntry) {
    const client = supabase
    if (!client || !activeCharacter) return
    setWorkingId(entry.id)
    setError(null)
    setMessage(null)
    const { error: deleteError } = await client
      .from('guestbook_entries')
      .delete()
      .eq('id', entry.id)
    setWorkingId(null)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    setMessage('Guestbook entry deleted.')
    await load()
  }

  if (!activeCharacter) return null

  return (
    <section className={`guestbook-panel ${management ? 'management' : 'profile-embedded'}`}>
      <header className="guestbook-heading">
        <div>
          <span className="eyebrow">GUESTBOOK</span>
          <h2>{management ? 'Manage your guestbook' : 'Sign the guestbook'}</h2>
          <p>
            {guestbookVisibility === 'disabled'
              ? 'Guestbook signing is currently disabled.'
              : guestbookVisibility === 'friends'
                ? 'Only accepted friends can sign this guestbook.'
                : 'Hanami members who can view this profile may leave a message.'}
          </p>
        </div>
        <div className="guestbook-counts">
          <strong>{visibleCount}</strong><span>visible</span>
          {management && hiddenCount > 0 && <><strong>{hiddenCount}</strong><span>hidden</span></>}
        </div>
      </header>

      {error && <div className="identity-notice error">{error}</div>}
      {message && <div className="identity-notice success">{message}</div>}

      {canCompose && (
        <div className="guestbook-composer">
          <textarea
            rows={4}
            maxLength={1500}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Leave a message…"
            aria-label="Guestbook message"
          />
          <div>
            <span>{body.length} / 1500</span>
            <button className="primary-action" type="button" disabled={posting || !body.trim()} onClick={() => void signGuestbook()}>
              {posting ? 'Signing…' : 'Sign Guestbook'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="friends-empty">Loading guestbook…</div>
      ) : entries.length === 0 ? (
        <div className="friends-empty">No guestbook messages yet.</div>
      ) : (
        <div className="guestbook-entry-list">
          {entries.map((entry) => {
            const identity = identityFor(entry.author_character_id)
            const canDelete = isOwner || entry.author_character_id === activeCharacter.id
            const targeted = entry.id === targetEntryId
            return (
              <article
                id={`guestbook-entry-${entry.id}`}
                className={`guestbook-entry ${entry.status === 'hidden' ? 'hidden-entry' : ''} ${targeted ? 'targeted' : ''}`}
                key={entry.id}
              >
                <button className="friend-avatar" type="button" onClick={() => { window.location.hash = profileHash(entry.author_character_id) }}>
                  {identity.title.slice(0, 2).toUpperCase()}
                </button>
                <div className="guestbook-copy">
                  <header>
                    <button type="button" onClick={() => { window.location.hash = profileHash(entry.author_character_id) }}>{identity.title}</button>
                    <span>{identity.subtitle || 'Hanami character'} · {relativeTime(entry.created_at)}</span>
                  </header>
                  <p>{entry.body}</p>
                  <footer>
                    {entry.status === 'hidden' && <strong>Hidden from visitors</strong>}
                    <div>
                      {isOwner && (
                        <button type="button" disabled={workingId === entry.id} onClick={() => void setEntryStatus(entry, entry.status === 'hidden' ? 'visible' : 'hidden')}>
                          {entry.status === 'hidden' ? 'Restore' : 'Hide'}
                        </button>
                      )}
                      {canDelete && (
                        <button className="danger" type="button" disabled={workingId === entry.id} onClick={() => void deleteEntry(entry)}>
                          Delete
                        </button>
                      )}
                    </div>
                  </footer>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

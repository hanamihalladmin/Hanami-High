import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { Friendship, SearchDocument, TopFriend } from '../types/database'
import { ShellTopbar } from './ShellTopbar'

type Props = {
  onSearch: () => void
  onNotifications: () => void
  unreadCount: number
}

type IdentitySummary = Pick<SearchDocument, 'entity_id' | 'title' | 'subtitle'>

function otherId(friendship: Friendship, activeCharacterId: string) {
  return friendship.requester_character_id === activeCharacterId
    ? friendship.addressee_character_id
    : friendship.requester_character_id
}

function profileHash(characterId: string) {
  return `#/profile/view-profile/${encodeURIComponent(characterId)}`
}

export function TopFriendsPage({ onSearch, onNotifications, unreadCount }: Props) {
  const { activeCharacter } = useIdentity()
  const [accepted, setAccepted] = useState<Friendship[]>([])
  const [topFriends, setTopFriends] = useState<TopFriend[]>([])
  const [identities, setIdentities] = useState<Record<string, IdentitySummary>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    const client = supabase
    if (!client || !activeCharacter) return
    setLoading(true)
    setError(null)

    const [friendshipResult, topResult] = await Promise.all([
      client
        .from('friendships')
        .select('*')
        .eq('status', 'accepted')
        .or(`requester_character_id.eq.${activeCharacter.id},addressee_character_id.eq.${activeCharacter.id}`)
        .order('updated_at', { ascending: false }),
      client
        .from('top_friends')
        .select('*')
        .eq('character_id', activeCharacter.id)
        .order('position'),
    ])

    if (friendshipResult.error || topResult.error) {
      setLoading(false)
      setError(friendshipResult.error?.message || topResult.error?.message || 'Top Friends could not be loaded.')
      return
    }

    const nextAccepted = friendshipResult.data ?? []
    const nextTop = topResult.data ?? []
    setAccepted(nextAccepted)
    setTopFriends(nextTop)

    const ids = Array.from(new Set([
      ...nextAccepted.map((friendship) => otherId(friendship, activeCharacter.id)),
      ...nextTop.map((item) => item.friend_character_id),
    ]))

    if (ids.length === 0) {
      setIdentities({})
      setLoading(false)
      return
    }

    const { data: identityData, error: identityError } = await client
      .from('search_documents')
      .select('entity_id,title,subtitle')
      .eq('document_type', 'character')
      .in('entity_id', ids)

    setLoading(false)
    if (identityError) {
      setError(identityError.message)
      return
    }

    setIdentities(Object.fromEntries((identityData ?? []).filter((item) => item.entity_id).map((item) => [item.entity_id as string, item])))
  }, [activeCharacter])

  useEffect(() => {
    void load()
  }, [load])

  const selectedIds = useMemo(
    () => topFriends.slice().sort((a, b) => a.position - b.position).map((item) => item.friend_character_id),
    [topFriends],
  )

  const availableIds = useMemo(() => {
    if (!activeCharacter) return []
    const selected = new Set(selectedIds)
    return accepted
      .map((friendship) => otherId(friendship, activeCharacter.id))
      .filter((characterId) => !selected.has(characterId))
  }, [accepted, activeCharacter, selectedIds])

  function identityFor(characterId: string) {
    return identities[characterId] ?? { entity_id: characterId, title: 'Hanami Friend', subtitle: 'Accepted friend' }
  }

  async function saveOrder(nextIds: string[], successMessage: string) {
    const client = supabase
    if (!client) return
    setSaving(true)
    setError(null)
    setMessage(null)
    const { error: saveError } = await client.rpc('set_top_friends', { p_friend_character_ids: nextIds })
    setSaving(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    setMessage(successMessage)
    await load()
  }

  function add(characterId: string) {
    if (selectedIds.length >= 8) return
    const identity = identityFor(characterId)
    void saveOrder([...selectedIds, characterId], `${identity.title} was added to Top Friends.`)
  }

  function remove(characterId: string) {
    const identity = identityFor(characterId)
    void saveOrder(selectedIds.filter((id) => id !== characterId), `${identity.title} was removed from Top Friends.`)
  }

  function move(characterId: string, direction: -1 | 1) {
    const index = selectedIds.indexOf(characterId)
    const targetIndex = index + direction
    if (index < 0 || targetIndex < 0 || targetIndex >= selectedIds.length) return
    const next = [...selectedIds]
    const [moved] = next.splice(index, 1)
    next.splice(targetIndex, 0, moved)
    void saveOrder(next, 'Top Friends order updated.')
  }

  if (!activeCharacter) return null

  return (
    <main className="content-area top-friends-page">
      <ShellTopbar
        eyebrow="SOCIAL"
        title="Top Friends"
        onSearch={onSearch}
        onNotifications={onNotifications}
        unreadCount={unreadCount}
      />

      {error && <div className="identity-notice error">{error}</div>}
      {message && <div className="identity-notice success">{message}</div>}

      <section className="top-friends-hero">
        <div>
          <span className="eyebrow">FEATURED CONNECTIONS</span>
          <h2>Choose the friends shown first in your social space.</h2>
          <p>Top Friends is character-specific and limited to eight accepted friends. Removing a friendship automatically removes that character from this list.</p>
        </div>
        <div className="top-friends-count"><strong>{selectedIds.length}</strong><span>/ 8 selected</span></div>
      </section>

      <div className="top-friends-layout">
        <section className="top-friends-panel featured-panel">
          <header><div><span className="eyebrow">YOUR ORDER</span><h2>Featured friends</h2></div><span>{saving ? 'Saving…' : 'Drag-free precision order'}</span></header>
          {loading ? (
            <div className="friends-empty">Loading Top Friends…</div>
          ) : selectedIds.length === 0 ? (
            <div className="friends-empty">No Top Friends selected yet. Add someone from your accepted friends.</div>
          ) : (
            <div className="top-friend-slot-list">
              {selectedIds.map((characterId, index) => {
                const identity = identityFor(characterId)
                return (
                  <article className="top-friend-slot" key={characterId}>
                    <span className="top-friend-position">{index + 1}</span>
                    <button className="friend-avatar" type="button" onClick={() => { window.location.hash = profileHash(characterId) }}>{identity.title.slice(0, 2).toUpperCase()}</button>
                    <div className="top-friend-copy"><strong>{identity.title}</strong><span>{identity.subtitle || 'Hanami friend'}</span></div>
                    <div className="top-friend-actions">
                      <button type="button" disabled={saving || index === 0} onClick={() => move(characterId, -1)} title="Move up">↑</button>
                      <button type="button" disabled={saving || index === selectedIds.length - 1} onClick={() => move(characterId, 1)} title="Move down">↓</button>
                      <button type="button" onClick={() => { window.location.hash = profileHash(characterId) }}>Profile</button>
                      <button className="danger" type="button" disabled={saving} onClick={() => remove(characterId)}>Remove</button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className="top-friends-panel available-panel">
          <header><div><span className="eyebrow">ACCEPTED FRIENDS</span><h2>Available</h2></div><span>{availableIds.length}</span></header>
          {loading ? (
            <div className="friends-empty compact">Loading friends…</div>
          ) : accepted.length === 0 ? (
            <div className="friends-empty">You need at least one accepted friend before you can build a Top Friends list.</div>
          ) : availableIds.length === 0 ? (
            <div className="friends-empty">Every accepted friend is already featured, or you have reached the current set.</div>
          ) : (
            <div className="friend-row-list">
              {availableIds.map((characterId) => {
                const identity = identityFor(characterId)
                return (
                  <article className="friend-row" key={characterId}>
                    <button className="friend-avatar" type="button" onClick={() => { window.location.hash = profileHash(characterId) }}>{identity.title.slice(0, 2).toUpperCase()}</button>
                    <div><strong>{identity.title}</strong><span>{identity.subtitle || 'Accepted friend'}</span></div>
                    <div className="friend-row-actions">
                      <button type="button" onClick={() => { window.location.hash = profileHash(characterId) }}>Profile</button>
                      <button className="primary" type="button" disabled={saving || selectedIds.length >= 8} onClick={() => add(characterId)}>{selectedIds.length >= 8 ? 'Full' : 'Add'}</button>
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

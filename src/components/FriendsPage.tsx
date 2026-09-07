import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { Friendship, HanamiSearchResult, SearchDocument } from '../types/database'
import { ShellTopbar } from './ShellTopbar'

type Props = {
  onSearch: () => void
  onNotifications: () => void
  unreadCount: number
}

type IdentitySummary = Pick<SearchDocument, 'entity_id' | 'title' | 'subtitle'>

function relationshipOtherId(relationship: Friendship, activeCharacterId: string) {
  return relationship.requester_character_id === activeCharacterId
    ? relationship.addressee_character_id
    : relationship.requester_character_id
}

function profileHash(characterId: string) {
  return `#/profile/view-profile/${encodeURIComponent(characterId)}`
}

export function FriendsPage({ onSearch, onNotifications, unreadCount }: Props) {
  const { activeCharacter } = useIdentity()
  const [relationships, setRelationships] = useState<Friendship[]>([])
  const [identities, setIdentities] = useState<Record<string, IdentitySummary>>({})
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<HanamiSearchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [working, setWorking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const loadRelationships = useCallback(async () => {
    const client = supabase
    if (!client || !activeCharacter) return
    setLoading(true)
    setError(null)

    const { data, error: relationshipError } = await client
      .from('friendships')
      .select('*')
      .or(`requester_character_id.eq.${activeCharacter.id},addressee_character_id.eq.${activeCharacter.id}`)
      .order('updated_at', { ascending: false })

    if (relationshipError) {
      setLoading(false)
      setError(relationshipError.message)
      return
    }

    const nextRelationships = data ?? []
    setRelationships(nextRelationships)
    const otherIds = Array.from(new Set(nextRelationships.map((item) => relationshipOtherId(item, activeCharacter.id))))

    if (otherIds.length === 0) {
      setIdentities({})
      setLoading(false)
      return
    }

    const { data: identityData, error: identityError } = await client
      .from('search_documents')
      .select('entity_id,title,subtitle')
      .eq('document_type', 'character')
      .in('entity_id', otherIds)

    setLoading(false)
    if (identityError) {
      setError(identityError.message)
      return
    }

    setIdentities(Object.fromEntries((identityData ?? []).filter((item) => item.entity_id).map((item) => [item.entity_id as string, item])))
  }, [activeCharacter])

  useEffect(() => {
    void loadRelationships()
  }, [loadRelationships])

  useEffect(() => {
    const client = supabase
    const trimmed = query.trim()
    if (!client || !activeCharacter || !trimmed) {
      setResults([])
      setSearching(false)
      return
    }

    let cancelled = false
    const timer = window.setTimeout(async () => {
      setSearching(true)
      const { data, error: searchError } = await client.rpc('search_hanami', {
        p_query: trimmed,
        p_limit: 20,
      })
      if (cancelled) return
      setSearching(false)
      if (searchError) {
        setError(searchError.message)
        return
      }
      setResults((data ?? []).filter((item) => item.document_type === 'character' && item.entity_id && item.entity_id !== activeCharacter.id))
    }, 180)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [activeCharacter, query])

  const relationshipByCharacter = useMemo(() => {
    if (!activeCharacter) return new Map<string, Friendship>()
    return new Map(relationships.map((relationship) => [relationshipOtherId(relationship, activeCharacter.id), relationship]))
  }, [activeCharacter, relationships])

  const friends = useMemo(() => relationships.filter((item) => item.status === 'accepted'), [relationships])
  const incoming = useMemo(() => relationships.filter((item) => item.status === 'pending' && item.addressee_character_id === activeCharacter?.id), [relationships, activeCharacter])
  const outgoing = useMemo(() => relationships.filter((item) => item.status === 'pending' && item.requester_character_id === activeCharacter?.id), [relationships, activeCharacter])

  function identityFor(characterId: string) {
    return identities[characterId] ?? { entity_id: characterId, title: 'Hanami Character', subtitle: 'Campus identity' }
  }

  async function sendRequest(targetCharacterId: string, targetName: string) {
    const client = supabase
    if (!client) return
    setWorking(targetCharacterId)
    setError(null)
    setMessage(null)
    const { error: requestError } = await client.rpc('request_friendship', { p_target_character_id: targetCharacterId })
    setWorking(null)
    if (requestError) {
      setError(requestError.message)
      return
    }
    setMessage(`Friend request sent to ${targetName}.`)
    await loadRelationships()
  }

  async function respond(relationship: Friendship, accept: boolean) {
    const client = supabase
    if (!client) return
    setWorking(relationship.id)
    setError(null)
    setMessage(null)
    const { error: responseError } = await client.rpc('respond_friendship', {
      p_friendship_id: relationship.id,
      p_accept: accept,
    })
    setWorking(null)
    if (responseError) {
      setError(responseError.message)
      return
    }
    const otherId = activeCharacter ? relationshipOtherId(relationship, activeCharacter.id) : ''
    setMessage(accept ? `${identityFor(otherId).title} is now your friend.` : 'Friend request declined.')
    await loadRelationships()
  }

  async function remove(relationship: Friendship) {
    const client = supabase
    if (!client) return
    setWorking(relationship.id)
    setError(null)
    setMessage(null)
    const { error: removeError } = await client.rpc('remove_friendship', { p_friendship_id: relationship.id })
    setWorking(null)
    if (removeError) {
      setError(removeError.message)
      return
    }
    setMessage(relationship.status === 'accepted' ? 'Friend removed.' : 'Friend request cancelled.')
    await loadRelationships()
  }

  if (!activeCharacter) return null

  return (
    <main className="content-area friends-page">
      <ShellTopbar
        eyebrow="SOCIAL"
        title="Friends"
        onSearch={onSearch}
        onNotifications={onNotifications}
        unreadCount={unreadCount}
      />

      {error && <div className="identity-notice error">{error}</div>}
      {message && <div className="identity-notice success">{message}</div>}

      <section className="friends-search-card">
        <div>
          <span className="eyebrow">FIND PEOPLE</span>
          <h2>Build {activeCharacter.display_name || activeCharacter.first_name || 'your character'}’s circle.</h2>
          <p>Friendships belong to the active character. Accepted friends can see profiles published with Friends-only visibility.</p>
        </div>
        <label>
          <span>Search campus identities</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a student or character name…" />
        </label>
      </section>

      {query.trim() && (
        <section className="friends-search-results">
          <header><strong>Search results</strong><span>{searching ? 'Searching…' : `${results.length} found`}</span></header>
          {!searching && results.length === 0 ? (
            <div className="friends-empty">No matching campus identities.</div>
          ) : (
            <div className="friend-row-list">
              {results.map((result) => {
                const characterId = result.entity_id as string
                const relationship = relationshipByCharacter.get(characterId)
                const incomingRequest = relationship?.status === 'pending' && relationship.addressee_character_id === activeCharacter.id
                return (
                  <article className="friend-row" key={result.id}>
                    <button className="friend-avatar" type="button" onClick={() => { window.location.hash = profileHash(characterId) }}>{result.title.slice(0, 2).toUpperCase()}</button>
                    <div><strong>{result.title}</strong><span>{result.subtitle || 'Hanami campus identity'}</span></div>
                    <div className="friend-row-actions">
                      <button type="button" onClick={() => { window.location.hash = profileHash(characterId) }}>Profile</button>
                      {!relationship || relationship.status === 'declined' ? (
                        <button className="primary" type="button" disabled={working === characterId} onClick={() => void sendRequest(characterId, result.title)}>{working === characterId ? 'Sending…' : 'Add Friend'}</button>
                      ) : relationship.status === 'accepted' ? (
                        <span className="friend-state accepted">Friends</span>
                      ) : incomingRequest ? (
                        <button className="primary" type="button" disabled={working === relationship.id} onClick={() => void respond(relationship, true)}>Accept</button>
                      ) : (
                        <span className="friend-state">Request sent</span>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      )}

      <div className="friends-dashboard-grid">
        <section className="friends-panel">
          <header><div><span className="eyebrow">YOUR CIRCLE</span><h2>Friends</h2></div><strong>{friends.length}</strong></header>
          {loading ? <div className="friends-empty">Loading friends…</div> : friends.length === 0 ? (
            <div className="friends-empty">No friends yet. Search the Hanami network above to connect with someone.</div>
          ) : (
            <div className="friend-row-list">
              {friends.map((relationship) => {
                const otherId = relationshipOtherId(relationship, activeCharacter.id)
                const identity = identityFor(otherId)
                return (
                  <article className="friend-row" key={relationship.id}>
                    <button className="friend-avatar" type="button" onClick={() => { window.location.hash = profileHash(otherId) }}>{identity.title.slice(0, 2).toUpperCase()}</button>
                    <div><strong>{identity.title}</strong><span>{identity.subtitle || 'Hanami friend'}</span></div>
                    <div className="friend-row-actions">
                      <button type="button" onClick={() => { window.location.hash = profileHash(otherId) }}>Profile</button>
                      <button className="danger" type="button" disabled={working === relationship.id} onClick={() => void remove(relationship)}>{working === relationship.id ? 'Removing…' : 'Remove'}</button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className="friends-panel request-panel">
          <header><div><span className="eyebrow">REQUESTS</span><h2>Incoming</h2></div><strong>{incoming.length}</strong></header>
          {incoming.length === 0 ? <div className="friends-empty compact">No incoming requests.</div> : (
            <div className="friend-row-list">
              {incoming.map((relationship) => {
                const otherId = relationship.requester_character_id
                const identity = identityFor(otherId)
                return (
                  <article className="friend-row request-row" key={relationship.id}>
                    <button className="friend-avatar" type="button" onClick={() => { window.location.hash = profileHash(otherId) }}>{identity.title.slice(0, 2).toUpperCase()}</button>
                    <div><strong>{identity.title}</strong><span>{identity.subtitle || 'Friend request'}</span></div>
                    <div className="friend-row-actions">
                      <button className="primary" type="button" disabled={working === relationship.id} onClick={() => void respond(relationship, true)}>Accept</button>
                      <button type="button" disabled={working === relationship.id} onClick={() => void respond(relationship, false)}>Decline</button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          <header className="secondary-header"><div><span className="eyebrow">PENDING</span><h2>Sent</h2></div><strong>{outgoing.length}</strong></header>
          {outgoing.length === 0 ? <div className="friends-empty compact">No outgoing requests.</div> : (
            <div className="friend-row-list">
              {outgoing.map((relationship) => {
                const otherId = relationship.addressee_character_id
                const identity = identityFor(otherId)
                return (
                  <article className="friend-row request-row" key={relationship.id}>
                    <button className="friend-avatar" type="button" onClick={() => { window.location.hash = profileHash(otherId) }}>{identity.title.slice(0, 2).toUpperCase()}</button>
                    <div><strong>{identity.title}</strong><span>Awaiting response</span></div>
                    <div className="friend-row-actions">
                      <button type="button" disabled={working === relationship.id} onClick={() => void remove(relationship)}>{working === relationship.id ? 'Cancelling…' : 'Cancel'}</button>
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

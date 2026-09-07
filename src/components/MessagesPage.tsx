import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type {
  ConversationMember,
  ConversationMessage,
  ConversationThread,
  Friendship,
  HanamiSearchResult,
  SearchDocument,
} from '../types/database'
import { ShellTopbar } from './ShellTopbar'

type Mode = 'friends' | 'message-requests' | 'direct-messages' | 'groups'

type Props = {
  mode: Mode
  targetConversationId?: string
  onSearch: () => void
  onNotifications: () => void
  unreadCount: number
}

type IdentitySummary = Pick<SearchDocument, 'entity_id' | 'title' | 'subtitle'>

const modeMeta: Record<Mode, { eyebrow: string; title: string; description: string }> = {
  friends: {
    eyebrow: 'MESSAGES',
    title: 'Friends',
    description: 'Start a direct conversation with an accepted friend.',
  },
  'message-requests': {
    eyebrow: 'MESSAGES',
    title: 'Message Requests',
    description: 'Review messages from characters outside your friend circle or start a new request.',
  },
  'direct-messages': {
    eyebrow: 'MESSAGES',
    title: 'Direct Messages',
    description: 'Private one-to-one conversations accepted by both characters.',
  },
  groups: {
    eyebrow: 'MESSAGES',
    title: 'Groups',
    description: 'Group conversations made from your accepted Hanami friends.',
  },
}

function otherFriendId(friendship: Friendship, activeCharacterId: string) {
  return friendship.requester_character_id === activeCharacterId
    ? friendship.addressee_character_id
    : friendship.requester_character_id
}

function directOtherId(thread: ConversationThread, activeCharacterId: string) {
  if (thread.direct_character_a_id === activeCharacterId) return thread.direct_character_b_id
  if (thread.direct_character_b_id === activeCharacterId) return thread.direct_character_a_id
  return null
}

function profileHash(characterId: string) {
  return `#/profile/view-profile/${encodeURIComponent(characterId)}`
}

function conversationHash(subsection: 'message-requests' | 'direct-messages' | 'groups', conversationId: string) {
  return `#/messages/${subsection}/${encodeURIComponent(conversationId)}`
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

function messageTime(value: string) {
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function MessagesPage({ mode, targetConversationId, onSearch, onNotifications, unreadCount }: Props) {
  const { activeCharacter } = useIdentity()
  const meta = modeMeta[mode]
  const [threads, setThreads] = useState<ConversationThread[]>([])
  const [members, setMembers] = useState<ConversationMember[]>([])
  const [relationships, setRelationships] = useState<Friendship[]>([])
  const [identities, setIdentities] = useState<Record<string, IdentitySummary>>({})
  const [selectedId, setSelectedId] = useState<string | null>(targetConversationId ?? null)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [messageBody, setMessageBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [threadLoading, setThreadLoading] = useState(false)
  const [working, setWorking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [friendDraftTarget, setFriendDraftTarget] = useState<string | null>(null)
  const [friendDraftBody, setFriendDraftBody] = useState('')

  const [requestQuery, setRequestQuery] = useState('')
  const [requestResults, setRequestResults] = useState<HanamiSearchResult[]>([])
  const [requestTarget, setRequestTarget] = useState<HanamiSearchResult | null>(null)
  const [requestBody, setRequestBody] = useState('')
  const [searching, setSearching] = useState(false)

  const [groupTitle, setGroupTitle] = useState('')
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([])

  const loadInbox = useCallback(async () => {
    const client = supabase
    if (!client || !activeCharacter) return
    setLoading(true)
    setError(null)

    const [selfMembersResult, friendshipsResult] = await Promise.all([
      client
        .from('conversation_members')
        .select('*')
        .eq('character_id', activeCharacter.id),
      client
        .from('friendships')
        .select('*')
        .eq('status', 'accepted')
        .or(`requester_character_id.eq.${activeCharacter.id},addressee_character_id.eq.${activeCharacter.id}`),
    ])

    if (selfMembersResult.error || friendshipsResult.error) {
      setLoading(false)
      setError(selfMembersResult.error?.message || friendshipsResult.error?.message || 'Messages could not be loaded.')
      return
    }

    const selfMemberships = selfMembersResult.data ?? []
    const conversationIds = selfMemberships.map((item) => item.conversation_id)
    const nextRelationships = friendshipsResult.data ?? []
    setRelationships(nextRelationships)

    let nextThreads: ConversationThread[] = []
    let allMembers: ConversationMember[] = []

    if (conversationIds.length > 0) {
      const [threadResult, memberResult] = await Promise.all([
        client
          .from('conversation_threads')
          .select('*')
          .in('id', conversationIds)
          .order('last_message_at', { ascending: false }),
        client
          .from('conversation_members')
          .select('*')
          .in('conversation_id', conversationIds),
      ])

      if (threadResult.error || memberResult.error) {
        setLoading(false)
        setError(threadResult.error?.message || memberResult.error?.message || 'Conversation list could not be loaded.')
        return
      }
      nextThreads = threadResult.data ?? []
      allMembers = memberResult.data ?? []
    }

    setThreads(nextThreads)
    setMembers(allMembers)

    const identityIds = Array.from(new Set([
      ...allMembers.map((item) => item.character_id),
      ...nextRelationships.map((item) => otherFriendId(item, activeCharacter.id)),
    ]))

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
    void loadInbox()
  }, [loadInbox])

  useEffect(() => {
    if (targetConversationId) setSelectedId(targetConversationId)
  }, [targetConversationId])

  useEffect(() => {
    const client = supabase
    if (!client || !activeCharacter || !selectedId) {
      setMessages([])
      return
    }

    let cancelled = false
    const loadThread = async () => {
      setThreadLoading(true)
      const { data, error: messageError } = await client
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', selectedId)
        .order('created_at', { ascending: true })
        .limit(200)

      if (cancelled) return
      setThreadLoading(false)
      if (messageError) {
        setError(messageError.message)
        return
      }
      setMessages(data ?? [])

      await client
        .from('conversation_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', selectedId)
        .eq('character_id', activeCharacter.id)

      setMembers((current) => current.map((member) => (
        member.conversation_id === selectedId && member.character_id === activeCharacter.id
          ? { ...member, last_read_at: new Date().toISOString() }
          : member
      )))
    }
    void loadThread()
    return () => { cancelled = true }
  }, [activeCharacter, selectedId])

  useEffect(() => {
    const client = supabase
    const trimmed = requestQuery.trim()
    if (!client || !activeCharacter || !trimmed || mode !== 'message-requests') {
      setRequestResults([])
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
      setRequestResults((data ?? []).filter((result) => (
        result.document_type === 'character'
        && result.entity_id
        && result.entity_id !== activeCharacter.id
      )))
    }, 180)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [activeCharacter, mode, requestQuery])

  const ownMembershipByThread = useMemo(() => {
    if (!activeCharacter) return new Map<string, ConversationMember>()
    return new Map(
      members
        .filter((member) => member.character_id === activeCharacter.id)
        .map((member) => [member.conversation_id, member]),
    )
  }, [activeCharacter, members])

  const friends = useMemo(() => {
    if (!activeCharacter) return []
    return relationships.map((relationship) => otherFriendId(relationship, activeCharacter.id))
  }, [activeCharacter, relationships])

  const modeThreads = useMemo(() => {
    if (!activeCharacter) return []
    if (mode === 'message-requests') {
      return threads.filter((thread) => thread.conversation_type === 'direct' && thread.request_state === 'pending')
    }
    if (mode === 'direct-messages') {
      return threads.filter((thread) => thread.conversation_type === 'direct' && thread.request_state === 'accepted')
    }
    if (mode === 'groups') {
      return threads.filter((thread) => thread.conversation_type === 'group')
    }
    return []
  }, [activeCharacter, mode, threads])

  useEffect(() => {
    if (mode === 'friends') return
    if (targetConversationId && modeThreads.some((thread) => thread.id === targetConversationId)) return
    if (selectedId && modeThreads.some((thread) => thread.id === selectedId)) return
    setSelectedId(modeThreads[0]?.id ?? null)
  }, [mode, modeThreads, selectedId, targetConversationId])

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedId) ?? null,
    [selectedId, threads],
  )

  function identityFor(characterId: string) {
    if (characterId === activeCharacter?.id) {
      const name = activeCharacter.display_name
        || [activeCharacter.first_name, activeCharacter.last_name].filter(Boolean).join(' ')
        || 'Your Character'
      return identities[characterId] ?? {
        entity_id: characterId,
        title: name,
        subtitle: activeCharacter.school_role || 'Hanami character',
      }
    }
    return identities[characterId] ?? {
      entity_id: characterId,
      title: 'Hanami Character',
      subtitle: 'Campus identity',
    }
  }

  function threadMembers(threadId: string) {
    return members.filter((member) => member.conversation_id === threadId)
  }

  function threadLabel(thread: ConversationThread) {
    if (!activeCharacter) return 'Conversation'
    if (thread.conversation_type === 'group') return thread.title || 'Group'
    const otherId = directOtherId(thread, activeCharacter.id)
    return otherId ? identityFor(otherId).title : 'Direct Message'
  }

  function threadSubtitle(thread: ConversationThread) {
    if (!activeCharacter) return ''
    if (thread.conversation_type === 'group') {
      const count = threadMembers(thread.id).length
      return `${count} members`
    }
    const otherId = directOtherId(thread, activeCharacter.id)
    return otherId ? (identityFor(otherId).subtitle || 'Hanami character') : 'Direct conversation'
  }

  function unread(thread: ConversationThread) {
    const membership = ownMembershipByThread.get(thread.id)
    if (!membership?.last_read_at) return true
    return new Date(thread.last_message_at).getTime() > new Date(membership.last_read_at).getTime()
  }

  function openThread(thread: ConversationThread) {
    const subsection = thread.conversation_type === 'group'
      ? 'groups'
      : thread.request_state === 'pending'
        ? 'message-requests'
        : 'direct-messages'
    window.location.hash = conversationHash(subsection, thread.id)
    setSelectedId(thread.id)
  }

  async function startDirect(targetCharacterId: string, body: string) {
    const client = supabase
    if (!client) return
    const trimmed = body.trim()
    if (!trimmed) return
    setWorking(targetCharacterId)
    setError(null)
    setNotice(null)
    const { data, error: rpcError } = await client.rpc('start_direct_message', {
      p_target_character_id: targetCharacterId,
      p_body: trimmed,
    })
    setWorking(null)
    if (rpcError) {
      setError(rpcError.message)
      return
    }

    setFriendDraftTarget(null)
    setFriendDraftBody('')
    setRequestTarget(null)
    setRequestBody('')
    setRequestQuery('')
    await loadInbox()

    if (data) {
      const { data: threadData } = await client
        .from('conversation_threads')
        .select('*')
        .eq('id', data)
        .maybeSingle()
      const subsection = threadData?.request_state === 'pending' ? 'message-requests' : 'direct-messages'
      window.location.hash = conversationHash(subsection, data)
      setSelectedId(data)
    }
  }

  async function respondRequest(thread: ConversationThread, accept: boolean) {
    const client = supabase
    if (!client) return
    setWorking(thread.id)
    setError(null)
    setNotice(null)
    const { error: responseError } = await client.rpc('respond_message_request', {
      p_conversation_id: thread.id,
      p_accept: accept,
    })
    setWorking(null)
    if (responseError) {
      setError(responseError.message)
      return
    }
    setNotice(accept ? 'Message request accepted.' : 'Message request declined.')
    setSelectedId(null)
    await loadInbox()
    if (accept) window.location.hash = conversationHash('direct-messages', thread.id)
  }

  async function sendMessage() {
    const client = supabase
    if (!client || !selectedThread) return
    const trimmed = messageBody.trim()
    if (!trimmed) return
    setWorking(selectedThread.id)
    setError(null)
    setNotice(null)
    const { error: sendError } = await client.rpc('send_conversation_message', {
      p_conversation_id: selectedThread.id,
      p_body: trimmed,
    })
    setWorking(null)
    if (sendError) {
      setError(sendError.message)
      return
    }
    setMessageBody('')
    const { data } = await client
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', selectedThread.id)
      .order('created_at', { ascending: true })
      .limit(200)
    setMessages(data ?? [])
    await loadInbox()
  }

  async function createGroup() {
    const client = supabase
    if (!client) return
    const title = groupTitle.trim()
    if (!title || groupMemberIds.length < 2) return
    setWorking('create-group')
    setError(null)
    setNotice(null)
    const { data, error: groupError } = await client.rpc('create_group_conversation', {
      p_member_character_ids: groupMemberIds,
      p_title: title,
    })
    setWorking(null)
    if (groupError) {
      setError(groupError.message)
      return
    }
    setGroupTitle('')
    setGroupMemberIds([])
    await loadInbox()
    if (data) {
      window.location.hash = conversationHash('groups', data)
      setSelectedId(data)
    }
  }

  if (!activeCharacter) return null

  const incomingRequests = modeThreads.filter((thread) => thread.request_recipient_character_id === activeCharacter.id)
  const outgoingRequests = modeThreads.filter((thread) => thread.created_by_character_id === activeCharacter.id)

  return (
    <main className="content-area messages-page">
      <ShellTopbar
        eyebrow={meta.eyebrow}
        title={meta.title}
        onSearch={onSearch}
        onNotifications={onNotifications}
        unreadCount={unreadCount}
      />

      {error && <div className="identity-notice error">{error}</div>}
      {notice && <div className="identity-notice success">{notice}</div>}

      <section className="messages-intro">
        <div><span className="eyebrow">{meta.title.toUpperCase()}</span><h2>{meta.description}</h2></div>
        <span>Messages belong to <strong>{identityFor(activeCharacter.id).title}</strong>, not the account globally.</span>
      </section>

      {mode === 'friends' && (
        <section className="message-friends-panel">
          <header><div><span className="eyebrow">FRIENDS</span><h2>Start a direct message</h2></div><strong>{friends.length}</strong></header>
          {loading ? <div className="friends-empty">Loading friends…</div> : friends.length === 0 ? (
            <div className="friends-empty">Add friends in Social before starting a friend DM.</div>
          ) : (
            <div className="message-friend-grid">
              {friends.map((friendId) => {
                const identity = identityFor(friendId)
                const existingThread = threads.find((thread) => (
                  thread.conversation_type === 'direct'
                  && thread.request_state === 'accepted'
                  && directOtherId(thread, activeCharacter.id) === friendId
                ))
                const composing = friendDraftTarget === friendId
                return (
                  <article className="message-friend-card" key={friendId}>
                    <button className="friend-avatar" type="button" onClick={() => { window.location.hash = profileHash(friendId) }}>{identity.title.slice(0, 2).toUpperCase()}</button>
                    <div><strong>{identity.title}</strong><span>{identity.subtitle || 'Hanami friend'}</span></div>
                    {existingThread ? (
                      <button className="primary-action" type="button" onClick={() => openThread(existingThread)}>Open DM →</button>
                    ) : !composing ? (
                      <button className="primary-action" type="button" onClick={() => { setFriendDraftTarget(friendId); setFriendDraftBody('') }}>Message</button>
                    ) : (
                      <div className="message-start-draft">
                        <textarea rows={3} maxLength={4000} value={friendDraftBody} onChange={(event) => setFriendDraftBody(event.target.value)} placeholder={`Message ${identity.title}…`} />
                        <div>
                          <button type="button" onClick={() => setFriendDraftTarget(null)}>Cancel</button>
                          <button className="primary" type="button" disabled={working === friendId || !friendDraftBody.trim()} onClick={() => void startDirect(friendId, friendDraftBody)}>{working === friendId ? 'Sending…' : 'Send'}</button>
                        </div>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>
      )}

      {mode === 'message-requests' && (
        <section className="message-request-starter">
          <div>
            <span className="eyebrow">NEW REQUEST</span>
            <h2>Message someone outside your friends.</h2>
            <p>Your first message becomes a request. They cannot reply until they accept it.</p>
          </div>
          <label><span>Find a campus identity</span><input value={requestQuery} onChange={(event) => { setRequestQuery(event.target.value); setRequestTarget(null) }} placeholder="Search a character…" /></label>
          {requestQuery.trim() && !requestTarget && (
            <div className="message-request-search-results">
              {searching ? <span>Searching…</span> : requestResults.length === 0 ? <span>No matches.</span> : requestResults.map((result) => (
                <button type="button" key={result.id} onClick={() => { setRequestTarget(result); setRequestQuery(result.title) }}>
                  <strong>{result.title}</strong><span>{result.subtitle || 'Hanami character'}</span>
                </button>
              ))}
            </div>
          )}
          {requestTarget?.entity_id && (
            <div className="message-request-compose">
              <strong>To {requestTarget.title}</strong>
              <textarea rows={4} maxLength={4000} value={requestBody} onChange={(event) => setRequestBody(event.target.value)} placeholder="Write your first message…" />
              <button className="primary-action" type="button" disabled={working === requestTarget.entity_id || !requestBody.trim()} onClick={() => void startDirect(requestTarget.entity_id as string, requestBody)}>
                {working === requestTarget.entity_id ? 'Sending…' : 'Send Message'}
              </button>
            </div>
          )}
        </section>
      )}

      {mode === 'groups' && (
        <section className="message-group-builder">
          <div><span className="eyebrow">NEW GROUP</span><h2>Create a friend group</h2><p>Select 2–9 accepted friends. Groups can have up to 10 characters including you.</p></div>
          <input maxLength={120} value={groupTitle} onChange={(event) => setGroupTitle(event.target.value)} placeholder="Group name" aria-label="Group name" />
          <div className="group-friend-selector">
            {friends.map((friendId) => {
              const identity = identityFor(friendId)
              const selected = groupMemberIds.includes(friendId)
              return (
                <label key={friendId}>
                  <input type="checkbox" checked={selected} disabled={!selected && groupMemberIds.length >= 9} onChange={(event) => {
                    setGroupMemberIds((current) => event.target.checked ? [...current, friendId] : current.filter((id) => id !== friendId))
                  }} />
                  <span>{identity.title}</span>
                </label>
              )
            })}
          </div>
          <button className="primary-action" type="button" disabled={working === 'create-group' || !groupTitle.trim() || groupMemberIds.length < 2} onClick={() => void createGroup()}>
            {working === 'create-group' ? 'Creating…' : `Create Group · ${groupMemberIds.length + 1} members`}
          </button>
        </section>
      )}

      {mode === 'message-requests' && incomingRequests.length > 0 && (
        <section className="incoming-request-strip">
          <header><strong>Incoming requests</strong><span>{incomingRequests.length}</span></header>
          <div>
            {incomingRequests.map((thread) => {
              const otherId = directOtherId(thread, activeCharacter.id)
              const identity = otherId ? identityFor(otherId) : null
              return (
                <article key={thread.id}>
                  <button type="button" onClick={() => { setSelectedId(thread.id) }}><strong>{identity?.title || 'Message request'}</strong><span>{relativeTime(thread.last_message_at)}</span></button>
                  <div>
                    <button type="button" disabled={working === thread.id} onClick={() => void respondRequest(thread, false)}>Decline</button>
                    <button className="primary" type="button" disabled={working === thread.id} onClick={() => void respondRequest(thread, true)}>Accept</button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}

      {mode !== 'friends' && (
        <div className="messages-workspace">
          <aside className="conversation-list-panel">
            <header>
              <div><span className="eyebrow">CONVERSATIONS</span><h2>{mode === 'message-requests' ? 'Requests' : mode === 'groups' ? 'Groups' : 'Direct Messages'}</h2></div>
              <strong>{modeThreads.length}</strong>
            </header>
            {loading ? <div className="friends-empty">Loading conversations…</div> : modeThreads.length === 0 ? (
              <div className="friends-empty">No conversations here yet.</div>
            ) : (
              <div className="conversation-list">
                {modeThreads.map((thread) => (
                  <button className={`conversation-row ${selectedId === thread.id ? 'selected' : ''} ${unread(thread) ? 'unread' : ''}`} type="button" key={thread.id} onClick={() => setSelectedId(thread.id)}>
                    <span className="conversation-avatar">{threadLabel(thread).slice(0, 2).toUpperCase()}</span>
                    <span><strong>{threadLabel(thread)}</strong><small>{threadSubtitle(thread)}</small></span>
                    <em>{relativeTime(thread.last_message_at)}</em>
                  </button>
                ))}
              </div>
            )}
            {mode === 'message-requests' && outgoingRequests.length > 0 && <small className="outgoing-request-note">{outgoingRequests.length} outgoing request{outgoingRequests.length === 1 ? '' : 's'} awaiting a response.</small>}
          </aside>

          <section className="message-thread-panel">
            {!selectedThread ? (
              <div className="message-thread-empty"><strong>Select a conversation</strong><span>Messages will open here.</span></div>
            ) : (
              <>
                <header className="message-thread-header">
                  <div>
                    <span className="eyebrow">{selectedThread.conversation_type === 'group' ? 'GROUP' : selectedThread.request_state === 'pending' ? 'MESSAGE REQUEST' : 'DIRECT MESSAGE'}</span>
                    <h2>{threadLabel(selectedThread)}</h2>
                    <p>{threadSubtitle(selectedThread)}</p>
                  </div>
                  {selectedThread.conversation_type === 'direct' && directOtherId(selectedThread, activeCharacter.id) && (
                    <button type="button" onClick={() => { window.location.hash = profileHash(directOtherId(selectedThread, activeCharacter.id) as string) }}>View Profile →</button>
                  )}
                </header>

                <div className="message-thread-scroll">
                  {threadLoading ? <div className="friends-empty">Loading messages…</div> : messages.length === 0 ? (
                    <div className="friends-empty">No messages in this conversation yet.</div>
                  ) : messages.map((message) => {
                    const own = message.sender_character_id === activeCharacter.id
                    const sender = identityFor(message.sender_character_id)
                    return (
                      <article className={`message-bubble-row ${own ? 'own' : ''}`} key={message.id}>
                        {!own && <button className="friend-avatar" type="button" onClick={() => { window.location.hash = profileHash(message.sender_character_id) }}>{sender.title.slice(0, 2).toUpperCase()}</button>}
                        <div className="message-bubble">
                          <header><strong>{own ? 'You' : sender.title}</strong><time>{messageTime(message.created_at)}</time></header>
                          <p>{message.body}</p>
                        </div>
                      </article>
                    )
                  })}
                </div>

                {selectedThread.request_state === 'pending' && selectedThread.request_recipient_character_id === activeCharacter.id ? (
                  <div className="message-request-gate">
                    <strong>Accept this request to reply.</strong>
                    <div><button type="button" disabled={working === selectedThread.id} onClick={() => void respondRequest(selectedThread, false)}>Decline</button><button className="primary-action" type="button" disabled={working === selectedThread.id} onClick={() => void respondRequest(selectedThread, true)}>Accept Request</button></div>
                  </div>
                ) : selectedThread.request_state === 'declined' ? (
                  <div className="message-request-gate"><strong>This conversation is closed.</strong></div>
                ) : (
                  <div className="message-reply-box">
                    {selectedThread.request_state === 'pending' && <small>This request is still waiting for acceptance. You can add another message, but the recipient cannot reply yet.</small>}
                    <textarea rows={3} maxLength={4000} value={messageBody} onChange={(event) => setMessageBody(event.target.value)} placeholder="Write a message…" onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault()
                        if (messageBody.trim()) void sendMessage()
                      }
                    }} />
                    <div><span>{messageBody.length} / 4000 · Shift+Enter for a new line</span><button className="primary-action" type="button" disabled={working === selectedThread.id || !messageBody.trim()} onClick={() => void sendMessage()}>{working === selectedThread.id ? 'Sending…' : 'Send'}</button></div>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </main>
  )
}

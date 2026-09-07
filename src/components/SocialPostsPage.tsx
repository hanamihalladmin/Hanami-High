import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { SearchDocument, SocialPost } from '../types/database'
import { ShellTopbar } from './ShellTopbar'

type Mode = 'feed' | 'bulletins' | 'blogs'

type Props = {
  mode: Mode
  targetPostId?: string
  onSearch: () => void
  onNotifications: () => void
  unreadCount: number
}

type IdentitySummary = Pick<SearchDocument, 'entity_id' | 'title' | 'subtitle'>

const modeMeta: Record<Mode, {
  eyebrow: string
  title: string
  composerTitle: string
  postType: 'status' | 'bulletin' | 'blog'
  placeholder: string
  bodyLimit: number
}> = {
  feed: {
    eyebrow: 'SOCIAL',
    title: 'Feed',
    composerTitle: 'Post a status',
    postType: 'status',
    placeholder: 'What is your character up to?',
    bodyLimit: 500,
  },
  bulletins: {
    eyebrow: 'SOCIAL',
    title: 'Bulletins',
    composerTitle: 'Post a bulletin',
    postType: 'bulletin',
    placeholder: 'Share a short campus update…',
    bodyLimit: 4000,
  },
  blogs: {
    eyebrow: 'SOCIAL',
    title: 'Blogs',
    composerTitle: 'Write a blog post',
    postType: 'blog',
    placeholder: 'Write your post…',
    bodyLimit: 20000,
  },
}

function profileHash(characterId: string) {
  return `#/profile/view-profile/${encodeURIComponent(characterId)}`
}

function relativeTime(value: string | null) {
  if (!value) return 'Draft'
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

function visibilityLabel(value: string) {
  if (value === 'hanami') return 'Hanami Network'
  if (value === 'friends') return 'Friends'
  return 'Private'
}

function typeLabel(value: string) {
  if (value === 'bulletin') return 'Bulletin'
  if (value === 'blog') return 'Blog'
  return 'Status'
}

export function SocialPostsPage({ mode, targetPostId, onSearch, onNotifications, unreadCount }: Props) {
  const { activeCharacter } = useIdentity()
  const meta = modeMeta[mode]
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [identities, setIdentities] = useState<Record<string, IdentitySummary>>({})
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [visibility, setVisibility] = useState('hanami')
  const [commentsEnabled, setCommentsEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState<'draft' | 'published' | null>(null)
  const [workingId, setWorkingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    const client = supabase
    if (!client || !activeCharacter) return
    setLoading(true)
    setError(null)

    let query = client
      .from('social_posts')
      .select('*')
      .order(mode === 'blogs' ? 'created_at' : 'published_at', { ascending: false })
      .limit(80)

    if (mode === 'feed') {
      query = query.eq('state', 'published')
    } else {
      query = query.eq('post_type', meta.postType)
      if (mode === 'bulletins') query = query.eq('state', 'published')
    }

    const { data, error: postError } = await query
    if (postError) {
      setLoading(false)
      setError(postError.message)
      return
    }

    const visiblePosts = (data ?? []).filter((post) => (
      post.state === 'published'
      || (mode === 'blogs' && post.state === 'draft' && post.author_character_id === activeCharacter.id)
    ))
    setPosts(visiblePosts)

    const authorIds = Array.from(new Set(visiblePosts.map((post) => post.author_character_id)))
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

    setIdentities(Object.fromEntries((identityData ?? []).filter((item) => item.entity_id).map((item) => [item.entity_id as string, item])))
  }, [activeCharacter, meta.postType, mode])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!targetPostId || loading) return
    const timer = window.setTimeout(() => {
      document.getElementById(`social-post-${targetPostId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
    return () => window.clearTimeout(timer)
  }, [targetPostId, loading])

  const ownDraftCount = useMemo(
    () => posts.filter((post) => post.author_character_id === activeCharacter?.id && post.state === 'draft').length,
    [posts, activeCharacter],
  )

  function identityFor(characterId: string) {
    if (characterId === activeCharacter?.id) {
      const name = activeCharacter.display_name
        || [activeCharacter.first_name, activeCharacter.last_name].filter(Boolean).join(' ')
        || 'Your Character'
      return identities[characterId] ?? { entity_id: characterId, title: name, subtitle: activeCharacter.school_role || 'Hanami character' }
    }
    return identities[characterId] ?? { entity_id: characterId, title: 'Hanami Character', subtitle: 'Campus identity' }
  }

  function clearComposer() {
    setTitle('')
    setBody('')
    setCommentsEnabled(true)
  }

  async function createPost(state: 'draft' | 'published') {
    const client = supabase
    if (!client || !activeCharacter) return
    const trimmedBody = body.trim()
    const trimmedTitle = title.trim()
    if (!trimmedBody) return
    if (meta.postType === 'blog' && !trimmedTitle) {
      setError('Blog posts need a title before they can be saved.')
      return
    }

    setSubmitting(state)
    setError(null)
    setMessage(null)
    const { error: insertError } = await client.from('social_posts').insert({
      author_character_id: activeCharacter.id,
      post_type: meta.postType,
      state,
      visibility,
      title: meta.postType === 'status' ? null : (trimmedTitle || null),
      body: trimmedBody,
      comments_enabled: commentsEnabled,
    })
    setSubmitting(null)

    if (insertError) {
      setError(insertError.message)
      return
    }

    clearComposer()
    setMessage(state === 'draft' ? 'Blog draft saved privately.' : `${typeLabel(meta.postType)} published.`)
    await load()
  }

  async function publishDraft(post: SocialPost) {
    const client = supabase
    if (!client) return
    setWorkingId(post.id)
    setError(null)
    setMessage(null)
    const { error: updateError } = await client
      .from('social_posts')
      .update({ state: 'published', published_at: null })
      .eq('id', post.id)
    setWorkingId(null)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setMessage('Blog published.')
    await load()
  }

  async function deletePost(post: SocialPost) {
    const client = supabase
    if (!client) return
    setWorkingId(post.id)
    setError(null)
    setMessage(null)
    const { error: deleteError } = await client.from('social_posts').delete().eq('id', post.id)
    setWorkingId(null)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    setMessage(post.state === 'draft' ? 'Draft deleted.' : 'Post deleted.')
    await load()
  }

  if (!activeCharacter) return null

  const composerName = activeCharacter.display_name || activeCharacter.first_name || 'Your character'

  return (
    <main className="content-area social-posts-page">
      <ShellTopbar
        eyebrow={meta.eyebrow}
        title={meta.title}
        onSearch={onSearch}
        onNotifications={onNotifications}
        unreadCount={unreadCount}
      />

      {error && <div className="identity-notice error">{error}</div>}
      {message && <div className="identity-notice success">{message}</div>}

      <section className={`social-composer composer-${meta.postType}`}>
        <header>
          <div><span className="eyebrow">{composerName.toUpperCase()}</span><h2>{meta.composerTitle}</h2></div>
          {mode === 'blogs' && <span>{ownDraftCount} draft{ownDraftCount === 1 ? '' : 's'}</span>}
        </header>
        <div className="social-composer-body">
          {meta.postType !== 'status' && (
            <input
              maxLength={160}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={meta.postType === 'blog' ? 'Blog title' : 'Optional bulletin heading'}
              aria-label={`${typeLabel(meta.postType)} title`}
            />
          )}
          <textarea
            maxLength={meta.bodyLimit}
            rows={meta.postType === 'blog' ? 9 : meta.postType === 'bulletin' ? 5 : 3}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={meta.placeholder}
            aria-label={`${typeLabel(meta.postType)} body`}
          />
          <div className="composer-controls">
            <label>Audience
              <select value={visibility} onChange={(event) => setVisibility(event.target.value)}>
                <option value="hanami">Hanami Network</option>
                <option value="friends">Friends only</option>
                <option value="private">Private</option>
              </select>
            </label>
            <label className="composer-checkbox"><input type="checkbox" checked={commentsEnabled} onChange={(event) => setCommentsEnabled(event.target.checked)} /> Comments enabled</label>
            <span className="composer-limit">{body.length} / {meta.bodyLimit}</span>
            <div className="composer-actions">
              {mode === 'blogs' && (
                <button className="secondary-action" type="button" disabled={submitting !== null || !body.trim()} onClick={() => void createPost('draft')}>
                  {submitting === 'draft' ? 'Saving…' : 'Save Draft'}
                </button>
              )}
              <button className="primary-action" type="button" disabled={submitting !== null || !body.trim()} onClick={() => void createPost('published')}>
                {submitting === 'published' ? 'Publishing…' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="social-stream">
        <header>
          <div><span className="eyebrow">{mode === 'feed' ? 'LATEST ACTIVITY' : meta.title.toUpperCase()}</span><h2>{mode === 'feed' ? 'Around your network' : `Recent ${meta.title.toLowerCase()}`}</h2></div>
          <span>{posts.length}</span>
        </header>

        {loading ? (
          <div className="friends-empty">Loading social activity…</div>
        ) : posts.length === 0 ? (
          <div className="friends-empty">Nothing here yet. Be the first to post.</div>
        ) : (
          <div className="social-post-list">
            {posts.map((post) => {
              const identity = identityFor(post.author_character_id)
              const own = post.author_character_id === activeCharacter.id
              const targeted = post.id === targetPostId
              return (
                <article id={`social-post-${post.id}`} className={`social-post-card type-${post.post_type} state-${post.state} ${targeted ? 'targeted' : ''}`} key={post.id}>
                  <header>
                    <button className="friend-avatar" type="button" onClick={() => { window.location.hash = profileHash(post.author_character_id) }}>{identity.title.slice(0, 2).toUpperCase()}</button>
                    <div className="social-post-author">
                      <button type="button" onClick={() => { window.location.hash = profileHash(post.author_character_id) }}>{identity.title}</button>
                      <span>{identity.subtitle || 'Hanami character'} · {typeLabel(post.post_type)}</span>
                    </div>
                    <div className="social-post-meta">
                      <span className={`visibility-chip visibility-${post.visibility}`}>{visibilityLabel(post.visibility)}</span>
                      <time>{relativeTime(post.state === 'published' ? post.published_at : post.updated_at)}</time>
                    </div>
                  </header>
                  <div className="social-post-content">
                    {post.title && <h3>{post.title}</h3>}
                    <p>{post.body}</p>
                  </div>
                  <footer>
                    <span>{post.comments_enabled ? 'Comments open' : 'Comments off'}</span>
                    {post.state === 'draft' && <strong>Private draft</strong>}
                    {own && (
                      <div className="social-post-actions">
                        {post.state === 'draft' && <button type="button" disabled={workingId === post.id} onClick={() => void publishDraft(post)}>{workingId === post.id ? 'Publishing…' : 'Publish draft'}</button>}
                        <button className="danger" type="button" disabled={workingId === post.id} onClick={() => void deletePost(post)}>{workingId === post.id ? 'Working…' : 'Delete'}</button>
                      </div>
                    )}
                  </footer>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}

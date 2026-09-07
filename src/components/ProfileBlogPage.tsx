import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { SocialPost } from '../types/database'
import { ShellTopbar } from './ShellTopbar'

type Props = {
  targetPostId?: string
  onSearch: () => void
  onNotifications: () => void
  unreadCount: number
}

export function ProfileBlogPage({ targetPostId, onSearch, onNotifications, unreadCount }: Props) {
  const { activeCharacter } = useIdentity()
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [visibility, setVisibility] = useState('hanami')
  const [commentsEnabled, setCommentsEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    const client = supabase
    if (!client || !activeCharacter) return
    setLoading(true)
    setError(null)
    const { data, error: loadError } = await client
      .from('social_posts')
      .select('*')
      .eq('author_character_id', activeCharacter.id)
      .eq('post_type', 'blog')
      .order('created_at', { ascending: false })
    setLoading(false)
    if (loadError) return setError(loadError.message)
    setPosts(data ?? [])
  }, [activeCharacter])

  useEffect(() => { void load() }, [load])

  async function create(state: 'draft' | 'published') {
    const client = supabase
    if (!client || !activeCharacter || !title.trim() || !body.trim()) return
    setWorking(`create:${state}`)
    setError(null)
    setNotice(null)
    const { error: createError } = await client.from('social_posts').insert({
      author_character_id: activeCharacter.id,
      post_type: 'blog',
      state,
      visibility,
      title: title.trim(),
      body: body.trim(),
      comments_enabled: commentsEnabled,
    })
    setWorking(null)
    if (createError) return setError(createError.message)
    setTitle('')
    setBody('')
    setNotice(state === 'draft' ? 'Blog draft saved.' : 'Blog post published.')
    await load()
  }

  async function publish(post: SocialPost) {
    const client = supabase
    if (!client) return
    setWorking(post.id)
    const { error: updateError } = await client.from('social_posts').update({ state: 'published', published_at: null }).eq('id', post.id)
    setWorking(null)
    if (updateError) return setError(updateError.message)
    setNotice('Blog post published.')
    await load()
  }

  async function remove(post: SocialPost) {
    const client = supabase
    if (!client) return
    setWorking(post.id)
    const { error: deleteError } = await client.from('social_posts').delete().eq('id', post.id)
    setWorking(null)
    if (deleteError) return setError(deleteError.message)
    setNotice('Blog post deleted.')
    await load()
  }

  if (!activeCharacter) return null

  return <main className="content-area profile-blog-page">
    <ShellTopbar eyebrow="PROFILE" title="Blog" onSearch={onSearch} onNotifications={onNotifications} unreadCount={unreadCount}/>
    {error && <div className="identity-notice error">{error}</div>}
    {notice && <div className="identity-notice success">{notice}</div>}
    <section className="profile-blog-composer"><header><div><span className="eyebrow">MY PROFILE</span><h2>Write a blog post</h2></div><span>{posts.filter((item) => item.state === 'draft').length} drafts</span></header><div><input maxLength={160} required placeholder="Blog title" value={title} onChange={(event) => setTitle(event.target.value)}/><textarea maxLength={20000} rows={10} required placeholder="Write your post…" value={body} onChange={(event) => setBody(event.target.value)}/><div className="profile-blog-controls"><label>Audience<select value={visibility} onChange={(event) => setVisibility(event.target.value)}><option value="hanami">Hanami Network</option><option value="friends">Friends</option><option value="private">Private</option></select></label><label className="profile-blog-check"><input type="checkbox" checked={commentsEnabled} onChange={(event) => setCommentsEnabled(event.target.checked)}/> Allow comments</label><button disabled={Boolean(working) || !title.trim() || !body.trim()} onClick={() => void create('draft')}>Save draft</button><button className="primary-action" disabled={Boolean(working) || !title.trim() || !body.trim()} onClick={() => void create('published')}>Publish</button></div></div></section>
    <section className="profile-blog-list"><header><div><span className="eyebrow">MY POSTS</span><h2>Blog archive</h2></div><strong>{posts.length}</strong></header>{loading ? <div className="profile-blog-empty">Loading blog posts…</div> : posts.length === 0 ? <div className="profile-blog-empty">You have not written any blog posts yet.</div> : posts.map((post) => <article className={`profile-blog-card ${targetPostId === post.id ? 'targeted' : ''}`} id={`profile-blog-${post.id}`} key={post.id}><header><div><span className="eyebrow">{post.state} · {post.visibility}</span><h3>{post.title || 'Untitled blog'}</h3></div><span>{new Date(post.created_at).toLocaleDateString()}</span></header><p>{post.body}</p><footer>{post.state === 'published' && <a href={`#/social/blogs/${encodeURIComponent(post.id)}`}>Open public post</a>}{post.state === 'draft' && <button disabled={working === post.id} onClick={() => void publish(post)}>Publish draft</button>}<button disabled={working === post.id} onClick={() => void remove(post)}>Delete</button></footer></article>)}</section>
  </main>
}

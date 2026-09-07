import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { SearchDocument } from '../types/database'
import { ShellTopbar } from './ShellTopbar'

type Mode = 'students' | 'faculty' | 'clubs' | 'posts' | 'events'

type Props = {
  mode: Mode
  targetId?: string
  onSearch: () => void
  onNotifications: () => void
  unreadCount: number
}

const modeMeta: Record<Mode, { title: string; description: string; type: string }> = {
  students: { title: 'Students', description: 'Find active student characters across Hanami High.', type: 'character' },
  faculty: { title: 'Teachers', description: 'Find Hanami High teachers and classroom instructors.', type: 'character' },
  clubs: { title: 'Clubs', description: 'Discover clubs, organizations, and Student Council groups.', type: 'campus_group' },
  posts: { title: 'Posts', description: 'Search visible statuses, bulletins, and blog posts.', type: 'social_post' },
  events: { title: 'Events', description: 'Find published school and campus events.', type: 'campus_event' },
}

function destination(item: SearchDocument) {
  if (item.document_type === 'character' && item.entity_id) return `#/profile/view-profile/${encodeURIComponent(item.entity_id)}`
  if (item.document_type === 'campus_group' && item.entity_id) return `#/campus/clubs/${encodeURIComponent(item.entity_id)}`
  if (item.document_type === 'campus_event' && item.entity_id) return `#/campus/events/${encodeURIComponent(item.entity_id)}`
  if (item.document_type === 'social_post' && item.entity_id) return `#/${item.section}/${item.subsection || 'feed'}/${encodeURIComponent(item.entity_id)}`
  return `#/${item.section}/${item.subsection || ''}`
}

function icon(type: string) {
  if (type === 'character') return '☺'
  if (type === 'campus_group') return '✿'
  if (type === 'campus_event') return '◇'
  return '✎'
}

export function DiscoverPage({ mode, targetId, onSearch, onNotifications, unreadCount }: Props) {
  const [documents, setDocuments] = useState<SearchDocument[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const meta = modeMeta[mode]

  const load = useCallback(async () => {
    const client = supabase
    if (!client) return
    setLoading(true)
    setError(null)
    let request = client.from('search_documents').select('*').eq('document_type', meta.type).order('title').limit(250)
    if (meta.type === 'character') request = request.eq('subsection', mode)
    const { data, error: loadError } = await request
    setLoading(false)
    if (loadError) return setError(loadError.message)
    setDocuments(data ?? [])
  }, [meta.type, mode])

  useEffect(() => { void load() }, [load])

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return documents
    return documents.filter((item) => `${item.title} ${item.subtitle || ''} ${item.body}`.toLowerCase().includes(normalized))
  }, [documents, query])

  return <main className="content-area discover-page">
    <ShellTopbar eyebrow="DISCOVER" title={meta.title} onSearch={onSearch} onNotifications={onNotifications} unreadCount={unreadCount}/>
    <div className="discover-intro"><div><span className="eyebrow">HANAMI DIRECTORY</span><p>{meta.description}</p></div><strong>{documents.length} indexed</strong></div>
    <section className="discover-search-panel"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${meta.title.toLowerCase()}…`} aria-label={`Search ${meta.title}`}/><b>{visible.length}</b></section>
    {error && <div className="identity-notice error">{error}</div>}
    {loading ? <div className="discover-empty">Loading directory…</div> : visible.length === 0 ? <div className="discover-empty">No matching {meta.title.toLowerCase()} were found.</div> : <div className="discover-grid">{visible.map((item) => <a className={`discover-card ${targetId === item.entity_id ? 'targeted' : ''}`} href={destination(item)} key={item.id}><span className="discover-icon">{icon(item.document_type)}</span><div><strong>{item.title}</strong><span>{item.subtitle || item.document_type.replaceAll('_',' ')}</span><p>{item.body || 'Open this Hanami result.'}</p></div><b>›</b></a>)}</div>}
  </main>
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatHanamiSchoolDate, formatSchoolTime, hanamiRoleplayDate, HANAMI_SCHOOL_YEAR } from '../lib/roleplayDate'
import { useIdentity } from '../state/IdentityContext'
import type { AcademicAssignment } from '../types/database-academics'
import type { CampusEvent } from '../types/database-campus'
import type { CharacterPresence, SchoolAnnouncement } from '../types/database-home'
import type { SearchDocument } from '../types/database'
import { ShellTopbar } from './ShellTopbar'

type Mode = 'announcements' | 'school-calendar' | 'whos-online'

type Props = {
  mode: Mode
  targetId?: string
  onSearch: () => void
  onNotifications: () => void
  unreadCount: number
}

type CalendarItem = {
  id: string
  kind: 'event' | 'assignment' | 'announcement'
  date: string
  title: string
  subtitle: string
  time?: string | null
}

const modeMeta: Record<Mode, { title: string; description: string }> = {
  announcements: { title: 'Announcements', description: 'Official notices published to the Hanami network.' },
  'school-calendar': { title: 'School Calendar', description: 'Assignments, campus events, and dated school notices in one 2006 calendar.' },
  'whos-online': { title: "Who's Online", description: 'Characters active around the Hanami network right now.' },
}

function relativeSeen(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 45) return 'Active now'
  if (seconds < 120) return 'Active 1m ago'
  return `Active ${Math.floor(seconds / 60)}m ago`
}

export function HomeUtilitiesPage({ mode, targetId, onSearch, onNotifications, unreadCount }: Props) {
  const { activeCharacter, capabilities } = useIdentity()
  const [announcements, setAnnouncements] = useState<SchoolAnnouncement[]>([])
  const [events, setEvents] = useState<CampusEvent[]>([])
  const [assignments, setAssignments] = useState<AcademicAssignment[]>([])
  const [presence, setPresence] = useState<CharacterPresence[]>([])
  const [identities, setIdentities] = useState<Record<string, SearchDocument>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [working, setWorking] = useState<string | null>(null)
  const [draft, setDraft] = useState({ title: '', body: '', category: 'general', state: 'published', pinned: false, schoolDate: '', expiresDate: '' })

  const isSchoolAdmin = capabilities.includes('school.configure')
  const today = hanamiRoleplayDate()

  const load = useCallback(async () => {
    const client = supabase
    if (!client || !activeCharacter) return
    setLoading(true)
    setError(null)

    const [announcementResult, eventResult, assignmentResult, presenceResult] = await Promise.all([
      client.from('school_announcements').select('*').order('pinned', { ascending: false }).order('school_date', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }),
      client.from('campus_events').select('*').in('status', ['published', 'completed']).order('school_date'),
      client.from('academic_assignments').select('*').in('state', ['published', 'closed']).order('due_school_date', { ascending: true, nullsFirst: false }),
      client.from('character_presence').select('*').gte('last_seen_at', new Date(Date.now() - 5 * 60_000).toISOString()).order('last_seen_at', { ascending: false }),
    ])

    const firstError = [announcementResult.error, eventResult.error, assignmentResult.error, presenceResult.error].find(Boolean)
    if (firstError) {
      setLoading(false)
      setError(firstError.message)
      return
    }

    const nextPresence = presenceResult.data ?? []
    setAnnouncements(announcementResult.data ?? [])
    setEvents(eventResult.data ?? [])
    setAssignments(assignmentResult.data ?? [])
    setPresence(nextPresence)

    if (nextPresence.length) {
      const ids = nextPresence.map((item) => item.character_id)
      const identityResult = await client.from('search_documents').select('*').eq('document_type', 'character').in('entity_id', ids)
      if (!identityResult.error) {
        setIdentities(Object.fromEntries((identityResult.data ?? []).filter((item) => item.entity_id).map((item) => [item.entity_id as string, item])))
      }
    } else setIdentities({})

    setLoading(false)
  }, [activeCharacter])

  useEffect(() => {
    void load()
    if (mode !== 'whos-online') return
    const timer = window.setInterval(() => void load(), 30_000)
    return () => window.clearInterval(timer)
  }, [load, mode])

  const visibleAnnouncements = useMemo(() => announcements.filter((item) => {
    if (isSchoolAdmin) return true
    if (item.state !== 'published') return false
    return !item.expires_school_date || item.expires_school_date >= today
  }), [announcements, isSchoolAdmin, today])

  const calendar = useMemo<CalendarItem[]>(() => {
    const eventItems = events.map((item) => ({
      id: `event:${item.id}`,
      kind: 'event' as const,
      date: item.school_date,
      title: item.title,
      subtitle: `${item.event_type.replaceAll('_', ' ')} · ${item.location || 'Location TBA'}`,
      time: item.starts_at,
    }))
    const assignmentItems = assignments.filter((item) => item.due_school_date).map((item) => ({
      id: `assignment:${item.id}`,
      kind: 'assignment' as const,
      date: item.due_school_date as string,
      title: item.title,
      subtitle: `${item.assignment_type} · ${item.points_possible} pts`,
      time: item.due_time,
    }))
    const noticeItems = announcements.filter((item) => item.state === 'published' && item.school_date).map((item) => ({
      id: `announcement:${item.id}`,
      kind: 'announcement' as const,
      date: item.school_date as string,
      title: item.title,
      subtitle: `${item.category} notice`,
      time: null,
    }))
    return [...eventItems, ...assignmentItems, ...noticeItems].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))
  }, [announcements, assignments, events])

  async function createAnnouncement() {
    const client = supabase
    if (!client || !activeCharacter) return
    setWorking('create')
    setError(null)
    setNotice(null)
    const { error: createError } = await client.from('school_announcements').insert({
      title: draft.title.trim(),
      body: draft.body.trim(),
      category: draft.category,
      state: draft.state,
      pinned: draft.pinned,
      school_date: draft.schoolDate || null,
      expires_school_date: draft.expiresDate || null,
      created_by_character_id: activeCharacter.id,
    })
    setWorking(null)
    if (createError) return setError(createError.message)
    setDraft({ title: '', body: '', category: 'general', state: 'published', pinned: false, schoolDate: '', expiresDate: '' })
    setNotice('Announcement saved.')
    await load()
  }

  async function updateAnnouncement(item: SchoolAnnouncement, patch: Partial<Pick<SchoolAnnouncement, 'state' | 'pinned'>>) {
    const client = supabase
    if (!client) return
    setWorking(item.id)
    const { error: updateError } = await client.from('school_announcements').update(patch).eq('id', item.id)
    setWorking(null)
    if (updateError) return setError(updateError.message)
    setNotice('Announcement updated.')
    await load()
  }

  function renderAnnouncements() {
    return <>
      {isSchoolAdmin && <section className="home-util-panel"><header><div><span className="eyebrow">ADMINISTRATION</span><h2>Publish announcement</h2></div><span>Hanami network</span></header><form className="home-util-form" onSubmit={(event) => { event.preventDefault(); void createAnnouncement() }}><input required placeholder="Announcement title" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })}/><textarea required placeholder="Write the school notice…" value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })}/><div className="home-util-inline"><select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}><option value="general">General</option><option value="academic">Academic</option><option value="campus">Campus</option><option value="urgent">Urgent</option><option value="event">Event</option></select><select value={draft.state} onChange={(event) => setDraft({ ...draft, state: event.target.value })}><option value="published">Publish now</option><option value="draft">Save draft</option></select><input type="date" min="2006-01-01" max="2006-12-31" value={draft.schoolDate} onChange={(event) => setDraft({ ...draft, schoolDate: event.target.value })}/><input type="date" min="2006-01-01" max="2006-12-31" value={draft.expiresDate} onChange={(event) => setDraft({ ...draft, expiresDate: event.target.value })}/></div><label className="home-util-check"><input type="checkbox" checked={draft.pinned} onChange={(event) => setDraft({ ...draft, pinned: event.target.checked })}/> Pin this notice</label><button className="primary-action" disabled={working === 'create'}>{working === 'create' ? 'Saving…' : 'Save announcement'}</button></form></section>}
      <section className="home-util-panel"><header><div><span className="eyebrow">SCHOOL NOTICEBOARD</span><h2>Announcements</h2></div><strong>{visibleAnnouncements.length}</strong></header>{visibleAnnouncements.length === 0 ? <div className="home-util-empty">No announcements are published yet.</div> : <div className="announcement-list">{visibleAnnouncements.map((item) => <article className={`announcement-card ${item.pinned ? 'pinned' : ''} ${targetId === item.id ? 'targeted' : ''}`} key={item.id}><header><div><span className="eyebrow">{item.category} · {item.state}</span><h3>{item.title}</h3></div><div>{item.pinned && <b>PINNED</b>}<span>{item.school_date ? formatHanamiSchoolDate(item.school_date) : new Date(item.created_at).toLocaleDateString()}</span></div></header><p>{item.body}</p>{isSchoolAdmin && <footer><button disabled={working === item.id} onClick={() => void updateAnnouncement(item, { pinned: !item.pinned })}>{item.pinned ? 'Unpin' : 'Pin'}</button><button disabled={working === item.id} onClick={() => void updateAnnouncement(item, { state: item.state === 'published' ? 'archived' : 'published' })}>{item.state === 'published' ? 'Archive' : 'Publish'}</button></footer>}</article>)}</div>}</section>
    </>
  }

  function renderCalendar() {
    const upcoming = calendar.filter((item) => item.date >= today)
    const past = calendar.filter((item) => item.date < today).slice(-12).reverse()
    return <><section className="home-util-panel"><header><div><span className="eyebrow">UPCOMING · {HANAMI_SCHOOL_YEAR}</span><h2>School calendar</h2></div><strong>{formatHanamiSchoolDate(today)}</strong></header>{upcoming.length === 0 ? <div className="home-util-empty">No upcoming dated school items are visible.</div> : upcoming.map((item) => <article className="calendar-row" key={item.id}><div className={`calendar-kind ${item.kind}`}>{item.kind === 'event' ? 'EVENT' : item.kind === 'assignment' ? 'DUE' : 'NOTICE'}</div><div><strong>{item.title}</strong><span>{item.subtitle}</span></div><div><b>{formatHanamiSchoolDate(item.date)}</b><small>{item.time ? formatSchoolTime(item.time) : ''}</small></div></article>)}</section>{past.length > 0 && <section className="home-util-panel"><header><div><span className="eyebrow">RECENT</span><h2>Earlier this year</h2></div></header>{past.map((item) => <article className="calendar-row muted" key={item.id}><div className={`calendar-kind ${item.kind}`}>{item.kind.toUpperCase()}</div><div><strong>{item.title}</strong><span>{item.subtitle}</span></div><div><b>{formatHanamiSchoolDate(item.date)}</b></div></article>)}</section>}</>
  }

  function renderPresence() {
    const current = presence.filter((item) => Date.now() - new Date(item.last_seen_at).getTime() <= 3 * 60_000)
    return <section className="home-util-panel"><header><div><span className="eyebrow">HANAMI NETWORK</span><h2>Online now</h2></div><strong>{current.length}</strong></header>{current.length === 0 ? <div className="home-util-empty">No recent character activity is visible yet.</div> : <div className="presence-grid">{current.map((item) => { const identity = identities[item.character_id]; return <a className="presence-card" href={`#/profile/view-profile/${encodeURIComponent(item.character_id)}`} key={item.character_id}><span className={`presence-dot ${item.status}`}/><div><strong>{identity?.title || 'Hanami Character'}</strong><span>{identity?.subtitle || 'Campus member'}</span><small>{relativeSeen(item.last_seen_at)} · {item.current_section ? `${item.current_section}${item.current_subsection ? ` / ${item.current_subsection}` : ''}` : 'Hanami network'}</small></div></a>})}</div>}</section>
  }

  return <main className="content-area home-utilities-page"><ShellTopbar eyebrow="HANAMI HIGH" title={modeMeta[mode].title} onSearch={onSearch} onNotifications={onNotifications} unreadCount={unreadCount}/><div className="home-util-intro"><div><span className="eyebrow">HOME NETWORK · {HANAMI_SCHOOL_YEAR}</span><p>{modeMeta[mode].description}</p></div><strong>{formatHanamiSchoolDate(today)}</strong></div>{error && <div className="identity-notice error">{error}</div>}{notice && <div className="identity-notice success">{notice}</div>}{loading ? <div className="home-util-empty loading">Loading Hanami Home…</div> : mode === 'announcements' ? renderAnnouncements() : mode === 'school-calendar' ? renderCalendar() : renderPresence()}</main>
}

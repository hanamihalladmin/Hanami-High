import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { SearchDocument } from '../types/database'
import type { AcademicEnrollment, AcademicSection, AcademicSectionStaff, AcademicCourse } from '../types/database-academics'
import type { AcademicRoomChannel, AcademicRoomMessage, AcademicRoomType, HomeroomMembership, SchoolHomeroom } from '../types/database-academic-rooms'
import { MemberProfilePopover } from './MemberProfilePopover'

type Props = {
  roomType: AcademicRoomType
  roomId: string
}

type IdentitySummary = Pick<SearchDocument, 'entity_id' | 'title' | 'subtitle'>

type ChannelDefinition = {
  id: AcademicRoomChannel
  label: string
  description: string
}

const classChannels: ChannelDefinition[] = [
  { id: 'general', label: 'general', description: 'Class conversation and day-to-day discussion.' },
  { id: 'announcements', label: 'announcements', description: 'Official teacher announcements for this class.' },
  { id: 'questions', label: 'questions', description: 'Ask for help with lessons, assignments, or class material.' },
]

const homeroomChannels: ChannelDefinition[] = [
  { id: 'general', label: 'general', description: 'Your homeroom group chat.' },
  { id: 'announcements', label: 'announcements', description: 'Official homeroom notices from teachers.' },
  { id: 'lounge', label: 'lounge', description: 'Casual homeroom conversation between classmates.' },
]

function messageTime(value: string) {
  return new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'H'
}

export function AcademicRoomPage({ roomType, roomId }: Props) {
  const { activeCharacter } = useIdentity()
  const [sections, setSections] = useState<AcademicSection[]>([])
  const [course, setCourse] = useState<AcademicCourse | null>(null)
  const [homeroom, setHomeroom] = useState<SchoolHomeroom | null>(null)
  const [enrollments, setEnrollments] = useState<AcademicEnrollment[]>([])
  const [homeroomMemberships, setHomeroomMemberships] = useState<HomeroomMembership[]>([])
  const [staff, setStaff] = useState<AcademicSectionStaff[]>([])
  const [messages, setMessages] = useState<AcademicRoomMessage[]>([])
  const [identities, setIdentities] = useState<Record<string, IdentitySummary>>({})
  const [channel, setChannel] = useState<AcademicRoomChannel>('general')
  const [canManage, setCanManage] = useState(false)
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [memberPopoverId, setMemberPopoverId] = useState<string | null>(null)

  const channels = roomType === 'class' ? classChannels : homeroomChannels

  const loadMessages = useCallback(async () => {
    const client = supabase
    if (!client) return
    let query = client.from('academic_room_messages').select('*').eq('room_type', roomType).is('deleted_at', null)
    query = roomType === 'class' ? query.eq('section_id', roomId) : query.eq('homeroom_code', roomId)
    const result = await query.order('created_at', { ascending: true }).limit(500)
    if (result.error) {
      setError(result.error.message)
      return
    }
    setMessages(result.data ?? [])
  }, [roomId, roomType])

  const load = useCallback(async () => {
    const client = supabase
    if (!client || !activeCharacter) return
    setLoading(true)
    setError(null)

    let nextSections: AcademicSection[] = []
    let nextCourse: AcademicCourse | null = null
    let nextHomeroom: SchoolHomeroom | null = null
    let nextEnrollments: AcademicEnrollment[] = []
    let nextMemberships: HomeroomMembership[] = []
    let nextStaff: AcademicSectionStaff[] = []
    let nextCanManage = false

    if (roomType === 'class') {
      const sectionResult = await client.from('academic_sections').select('*').eq('id', roomId).maybeSingle()
      if (sectionResult.error || !sectionResult.data) {
        setLoading(false)
        setError(sectionResult.error?.message || 'This class room is unavailable to your character.')
        return
      }

      nextSections = [sectionResult.data]
      const [courseResult, enrollmentResult, staffResult, manageResult] = await Promise.all([
        client.from('academic_courses').select('*').eq('id', sectionResult.data.course_id).maybeSingle(),
        client.from('academic_enrollments').select('*').eq('section_id', roomId).eq('status', 'active'),
        client.from('academic_section_staff').select('*').eq('section_id', roomId),
        client.rpc('academic_can_manage_section', { p_section_id: roomId }),
      ])

      const firstError = courseResult.error || enrollmentResult.error || staffResult.error || manageResult.error
      if (firstError) {
        setLoading(false)
        setError(firstError.message)
        return
      }

      nextCourse = courseResult.data
      nextEnrollments = enrollmentResult.data ?? []
      nextStaff = staffResult.data ?? []
      nextCanManage = Boolean(manageResult.data)
    } else {
      const homeroomResult = await client
        .from('school_homerooms')
        .select('*')
        .eq('code', roomId)
        .eq('is_active', true)
        .maybeSingle()

      if (homeroomResult.error || !homeroomResult.data) {
        setLoading(false)
        setError(homeroomResult.error?.message || 'This homeroom is unavailable to your character.')
        return
      }

      nextHomeroom = homeroomResult.data
      const [membershipResult, manageResult] = await Promise.all([
        client.from('homeroom_memberships').select('*').eq('homeroom_id', homeroomResult.data.id).order('joined_at'),
        client.rpc('academic_can_manage_homeroom', { p_homeroom_code: roomId }),
      ])

      const firstError = membershipResult.error || manageResult.error
      if (firstError) {
        setLoading(false)
        setError(firstError.message)
        return
      }

      nextMemberships = membershipResult.data ?? []
      nextCanManage = Boolean(manageResult.data)
    }

    setSections(nextSections)
    setCourse(nextCourse)
    setHomeroom(nextHomeroom)
    setEnrollments(nextEnrollments)
    setHomeroomMemberships(nextMemberships)
    setStaff(nextStaff)
    setCanManage(nextCanManage)

    let messageQuery = client.from('academic_room_messages').select('*').eq('room_type', roomType).is('deleted_at', null)
    messageQuery = roomType === 'class' ? messageQuery.eq('section_id', roomId) : messageQuery.eq('homeroom_code', roomId)
    const messageResult = await messageQuery.order('created_at', { ascending: true }).limit(500)
    if (messageResult.error) {
      setLoading(false)
      setError(messageResult.error.message)
      return
    }

    const nextMessages = messageResult.data ?? []
    setMessages(nextMessages)

    const rosterStudentIds = roomType === 'class'
      ? nextEnrollments.map((item) => item.student_character_id)
      : nextMemberships.map((item) => item.student_character_id)
    const rosterTeacherIds = roomType === 'class'
      ? nextStaff.map((item) => item.character_id)
      : nextHomeroom?.advisor_character_id ? [nextHomeroom.advisor_character_id] : []

    const identityIds = Array.from(new Set([
      ...rosterStudentIds,
      ...rosterTeacherIds,
      ...nextMessages.map((item) => item.author_character_id),
      activeCharacter.id,
    ]))

    if (identityIds.length > 0) {
      const identityResult = await client.from('search_documents').select('entity_id,title,subtitle').eq('document_type', 'character').in('entity_id', identityIds)
      if (!identityResult.error) {
        setIdentities(Object.fromEntries((identityResult.data ?? []).filter((item) => item.entity_id).map((item) => [item.entity_id as string, item])))
      }
    } else {
      setIdentities({})
    }

    setLoading(false)
  }, [activeCharacter, roomId, roomType])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    const timer = window.setInterval(() => void loadMessages(), 12000)
    return () => window.clearInterval(timer)
  }, [loadMessages])

  const visibleMessages = useMemo(() => messages.filter((message) => message.channel === channel), [channel, messages])
  const studentIds = useMemo(() => Array.from(new Set(
    roomType === 'class'
      ? enrollments.map((item) => item.student_character_id)
      : homeroomMemberships.map((item) => item.student_character_id),
  )), [enrollments, homeroomMemberships, roomType])
  const teacherIds = useMemo(() => Array.from(new Set(
    roomType === 'class'
      ? staff.map((item) => item.character_id)
      : homeroom?.advisor_character_id ? [homeroom.advisor_character_id] : [],
  )), [homeroom, roomType, staff])
  const activeChannel = channels.find((item) => item.id === channel) ?? channels[0]
  const roomTitle = roomType === 'class'
    ? `${course?.code || sections[0]?.section_code || 'Class'} · ${course?.name || 'Class Room'}`
    : `Homeroom ${homeroom?.code || roomId}`
  const roomSubtitle = roomType === 'class'
    ? `${sections[0]?.room || 'Room TBA'} · ${studentIds.length} students`
    : `${homeroom?.room_label || 'Room TBA'} · ${studentIds.length} classmates · Hanami High 2006`
  const announcementLocked = channel === 'announcements' && !canManage

  function identityName(characterId: string) {
    if (characterId === activeCharacter?.id) return activeCharacter.display_name || [activeCharacter.first_name, activeCharacter.last_name].filter(Boolean).join(' ') || 'You'
    return identities[characterId]?.title || 'Hanami Member'
  }

  async function send() {
    const client = supabase
    if (!client || !activeCharacter || !body.trim() || announcementLocked) return
    setSending(true)
    setError(null)
    const payload = {
      room_type: roomType,
      section_id: roomType === 'class' ? roomId : null,
      homeroom_code: roomType === 'homeroom' ? roomId : null,
      channel,
      author_character_id: activeCharacter.id,
      body: body.trim(),
    }
    const result = await client.from('academic_room_messages').insert(payload)
    setSending(false)
    if (result.error) {
      setError(result.error.message)
      return
    }
    setBody('')
    await loadMessages()
  }

  if (!activeCharacter) return null

  return <main className="content-area academic-room-page">
    {error && <div className="identity-notice error">{error}</div>}
    {loading ? <div className="studio-loading">Opening {roomType === 'class' ? 'class' : 'homeroom'} room…</div> : <div className="academic-room-shell">
      <aside className="academic-room-channels">
        <header>
          <span className="academic-room-icon">{roomType === 'class' ? '▤' : '⌂'}</span>
          <div><strong>{roomTitle}</strong><small>{roomSubtitle}</small></div>
        </header>
        <div className="academic-room-category">TEXT CHANNELS</div>
        <nav>
          {channels.map((item) => <button key={item.id} type="button" className={channel === item.id ? 'active' : ''} onClick={() => setChannel(item.id)}>
            <span>#</span><strong>{item.label}</strong>{item.id === 'announcements' && <em>official</em>}
          </button>)}
        </nav>
        <div className="academic-room-category">SCHOOL TOOLS</div>
        <div className="academic-room-school-links">
          {roomType === 'class' ? <>
            <a href="#/academics/assignments">▣ Assignments</a>
            <a href="#/academics/grades">★ Grades</a>
            <a href="#/academics/attendance">✓ Attendance</a>
          </> : <>
            <a href="#/academics/my-schedule">▥ Schedule</a>
            <a href="#/academics/classes">▤ Classes</a>
            <a href="#/home/announcements">◈ School Announcements</a>
          </>}
        </div>
        <footer><span className="status-dot online"/><div><strong>{identityName(activeCharacter.id)}</strong><small>{canManage ? (roomType === 'class' ? 'Teacher / manager' : 'Adviser / manager') : roomType === 'class' ? 'Class member' : 'Homeroom member'}</small></div></footer>
      </aside>

      <section className="academic-room-chat">
        <header>
          <div><strong># {activeChannel.label}</strong><span>{activeChannel.description}</span></div>
          <div className="academic-room-header-actions"><button type="button" title="Pinned messages">⌖</button><button type="button" title="Members">♟</button></div>
        </header>
        <div className="academic-room-message-list">
          <div className="academic-room-channel-intro"><span>#</span><h1>Welcome to #{activeChannel.label}</h1><p>{activeChannel.description}</p></div>
          {visibleMessages.length === 0 ? <div className="academic-room-empty">No messages here yet.</div> : visibleMessages.map((message) => {
            const name = identityName(message.author_character_id)
            const isTeacher = teacherIds.includes(message.author_character_id)
            const profileHref = `#/profile/view-profile/${encodeURIComponent(message.author_character_id)}`
            return <article className="academic-room-message" key={message.id}>
              <a className="academic-room-avatar" href={profileHref} onClick={(event) => { event.preventDefault(); setMemberPopoverId(message.author_character_id) }}>{initials(name)}</a>
              <div><header><a href={profileHref} onClick={(event) => { event.preventDefault(); setMemberPopoverId(message.author_character_id) }}>{name}</a>{isTeacher && <span className="academic-room-role">{roomType === 'homeroom' ? 'Adviser' : 'Teacher'}</span>}<time>{messageTime(message.created_at)}</time></header><p>{message.body}</p></div>
            </article>
          })}
        </div>
        <div className="academic-room-composer">
          {announcementLocked ? <div className="academic-room-readonly"><strong>Only teachers can post in #announcements.</strong><span>Students can read official notices here.</span></div> : <>
            <button type="button" className="academic-room-add" title="Add attachment">＋</button>
            <textarea value={body} maxLength={4000} rows={2} placeholder={`Message #${activeChannel.label}`} onChange={(event) => setBody(event.target.value)} onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                if (body.trim()) void send()
              }
            }}/>
            <button type="button" className="academic-room-send" disabled={sending || !body.trim()} onClick={() => void send()}>{sending ? '…' : 'Send'}</button>
          </>}
        </div>
      </section>

      <aside className="academic-room-members">
        <section><h3>{roomType === 'homeroom' ? 'ADVISER' : 'TEACHERS'} — {teacherIds.length}</h3>{teacherIds.length === 0 ? <small>{roomType === 'homeroom' ? 'Adviser TBA' : 'Teacher TBA'}</small> : teacherIds.map((id) => <a key={id} href={`#/profile/view-profile/${encodeURIComponent(id)}`} onClick={(event) => { event.preventDefault(); setMemberPopoverId(id) }}><span className="academic-room-member-avatar">{initials(identityName(id))}<i/></span><div><strong>{identityName(id)}</strong><small>{roomType === 'homeroom' ? 'Adviser' : 'Teacher'}</small></div></a>)}</section>
        <section><h3>STUDENTS — {studentIds.length}</h3>{studentIds.map((id) => <a key={id} href={`#/profile/view-profile/${encodeURIComponent(id)}`} onClick={(event) => { event.preventDefault(); setMemberPopoverId(id) }}><span className="academic-room-member-avatar">{initials(identityName(id))}<i/></span><div><strong>{identityName(id)}</strong><small>{id === activeCharacter.id ? 'You' : roomType === 'homeroom' ? 'Homeroom classmate' : 'Classmate'}</small></div></a>)}</section>
      </aside>
    </div>}
    <MemberProfilePopover characterId={memberPopoverId} onClose={() => setMemberPopoverId(null)} />
  </main>
}

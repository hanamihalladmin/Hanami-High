import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useIdentity } from '../state/IdentityContext'
import type { AcademicCourse, AcademicEnrollment, AcademicSection, AcademicSectionStaff } from '../types/database-academics'
import { ShellTopbar } from './ShellTopbar'

type Props = {
  focus: 'classes' | 'homeroom'
  onSearch: () => void
  onNotifications: () => void
  unreadCount: number
}

export function AcademicDirectoryPage({ focus, onSearch, onNotifications, unreadCount }: Props) {
  const { activeCharacter } = useIdentity()
  const [sections, setSections] = useState<AcademicSection[]>([])
  const [courses, setCourses] = useState<AcademicCourse[]>([])
  const [enrollments, setEnrollments] = useState<AcademicEnrollment[]>([])
  const [staff, setStaff] = useState<AcademicSectionStaff[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const client = supabase
    if (!client || !activeCharacter) return
    setLoading(true)
    setError(null)
    const [sectionResult, courseResult, enrollmentResult, staffResult] = await Promise.all([
      client.from('academic_sections').select('*').eq('is_active', true).order('section_code'),
      client.from('academic_courses').select('*').order('code'),
      client.from('academic_enrollments').select('*').eq('student_character_id', activeCharacter.id).eq('status', 'active'),
      client.from('academic_section_staff').select('*').eq('character_id', activeCharacter.id),
    ])
    setLoading(false)
    const first = sectionResult.error || courseResult.error || enrollmentResult.error || staffResult.error
    if (first) {
      setError(first.message)
      return
    }
    setSections(sectionResult.data ?? [])
    setCourses(courseResult.data ?? [])
    setEnrollments(enrollmentResult.data ?? [])
    setStaff(staffResult.data ?? [])
  }, [activeCharacter])

  useEffect(() => { void load() }, [load])

  const sectionIds = useMemo(() => new Set([
    ...enrollments.map((item) => item.section_id),
    ...staff.map((item) => item.section_id),
  ]), [enrollments, staff])
  const visibleSections = useMemo(() => sections.filter((item) => sectionIds.has(item.id)), [sectionIds, sections])
  const courseById = useMemo(() => new Map(courses.map((item) => [item.id, item])), [courses])
  const homerooms = useMemo(() => Array.from(new Set(visibleSections.map((item) => item.homeroom_code).filter((value): value is string => Boolean(value)))), [visibleSections])

  return <main className="content-area academic-directory-page">
    <ShellTopbar eyebrow="ACADEMICS" title={focus === 'classes' ? 'My Classes' : 'My Homeroom'} onSearch={onSearch} onNotifications={onNotifications} unreadCount={unreadCount}/>
    {error && <div className="identity-notice error">{error}</div>}
    <section className="academic-panel academic-directory-intro">
      <div><span className="eyebrow">COMMUNICATION ROOMS</span><h2>{focus === 'classes' ? 'Open a class room' : 'Open your homeroom'}</h2><p>{focus === 'classes' ? 'Each enrolled class opens into its own Discord-style class conversation space. The rest of Hanami High keeps the regular school network layout.' : 'Your homeroom opens as a private group-chat style space for classmates and teachers.'}</p></div>
    </section>
    {loading ? <div className="studio-loading">Loading academic rooms…</div> : focus === 'homeroom' ? <div className="academic-card-grid academic-room-directory-grid">
      {homerooms.length === 0 ? <div className="academic-empty">No homeroom has been assigned to this character yet.</div> : homerooms.map((code) => <a className="academic-class-card academic-room-launch-card" key={code} href={`#/academics/homeroom/${encodeURIComponent(code)}`}>
        <span className="eyebrow">HOMEROOM · PRIVATE ROOM</span><h2>{code}</h2><p>Announcements, general chat, and a casual homeroom lounge with your classmates.</p><footer><span>Open homeroom →</span></footer>
      </a>)}
    </div> : <div className="academic-card-grid academic-room-directory-grid">
      {visibleSections.length === 0 ? <div className="academic-empty">No active classes are assigned to this character yet.</div> : visibleSections.map((section) => {
        const course = courseById.get(section.course_id)
        return <a className="academic-class-card academic-room-launch-card" key={section.id} href={`#/academics/classes/${encodeURIComponent(section.id)}`}>
          <span className="eyebrow">{course?.subject || 'COURSE'} · {section.section_code}</span><h2>{course?.name || 'Hanami Class'}</h2><p>{course?.description || 'Open the class space for conversation, announcements, questions, and schoolwork links.'}</p><dl><div><dt>Room</dt><dd>{section.room || 'TBA'}</dd></div><div><dt>Homeroom</dt><dd>{section.homeroom_code || '—'}</dd></div></dl><footer><span>Open class room →</span></footer>
        </a>
      })}
    </div>}
  </main>
}

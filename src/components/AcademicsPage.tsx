import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  formatHanamiSchoolDate,
  formatSchoolTime,
  HANAMI_SCHOOL_YEAR,
  hanamiRoleplayDate,
  hanamiRoleplayWeekday,
} from '../lib/roleplayDate'
import { useIdentity } from '../state/IdentityContext'
import type {
  AcademicAssignment,
  AcademicAttendance,
  AcademicCourse,
  AcademicEnrollment,
  AcademicGrade,
  AcademicMeeting,
  AcademicSection,
  AcademicSectionStaff,
  AcademicSubmission,
} from '../types/database-academics'
import type { SearchDocument } from '../types/database'
import { ShellTopbar } from './ShellTopbar'

type Mode = 'overview' | 'my-schedule' | 'classes' | 'assignments' | 'grades' | 'attendance'

type Props = {
  mode: Mode
  targetId?: string
  onSearch: () => void
  onNotifications: () => void
  unreadCount: number
}

type IdentitySummary = Pick<SearchDocument, 'entity_id' | 'title' | 'subtitle'>

type AssignmentDraft = {
  sectionId: string
  title: string
  description: string
  type: string
  state: string
  dueDate: string
  dueTime: string
  points: string
  latePolicy: string
}

const modeMeta: Record<Mode, { title: string; description: string }> = {
  overview: { title: 'Overview', description: 'Your academic snapshot, upcoming work, grades, and attendance.' },
  'my-schedule': { title: 'My Schedule', description: 'Your Hanami High weekly timetable for the 2006 school year.' },
  classes: { title: 'Classes', description: 'Course spaces, rooms, teachers, rosters, and school configuration.' },
  assignments: { title: 'Assignments', description: 'Assigned work, submissions, and faculty assignment management.' },
  grades: { title: 'Grades', description: 'Scores, feedback, and faculty grading tools.' },
  attendance: { title: 'Attendance', description: 'Attendance history and faculty roll-taking tools.' },
}

const weekdayLabels = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const attendanceStates = ['present', 'absent', 'tardy', 'excused'] as const

function rowKey(assignmentId: string, characterId: string) {
  return `${assignmentId}:${characterId}`
}

function displayPercent(points: number | null, possible: number) {
  if (points === null || !possible) return '—'
  return `${Math.round((points / possible) * 1000) / 10}%`
}

export function AcademicsPage({ mode, targetId, onSearch, onNotifications, unreadCount }: Props) {
  const { activeCharacter, capabilities } = useIdentity()
  const [courses, setCourses] = useState<AcademicCourse[]>([])
  const [sections, setSections] = useState<AcademicSection[]>([])
  const [staff, setStaff] = useState<AcademicSectionStaff[]>([])
  const [enrollments, setEnrollments] = useState<AcademicEnrollment[]>([])
  const [meetings, setMeetings] = useState<AcademicMeeting[]>([])
  const [assignments, setAssignments] = useState<AcademicAssignment[]>([])
  const [submissions, setSubmissions] = useState<AcademicSubmission[]>([])
  const [grades, setGrades] = useState<AcademicGrade[]>([])
  const [attendance, setAttendance] = useState<AcademicAttendance[]>([])
  const [identities, setIdentities] = useState<Record<string, IdentitySummary>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [working, setWorking] = useState<string | null>(null)
  const [submissionBodies, setSubmissionBodies] = useState<Record<string, string>>({})
  const [gradePoints, setGradePoints] = useState<Record<string, string>>({})
  const [gradeFeedback, setGradeFeedback] = useState<Record<string, string>>({})
  const [attendanceDrafts, setAttendanceDrafts] = useState<Record<string, string>>({})
  const [attendanceSectionId, setAttendanceSectionId] = useState('')
  const [attendanceDate, setAttendanceDate] = useState(() => hanamiRoleplayDate())
  const [assignmentDraft, setAssignmentDraft] = useState<AssignmentDraft>({
    sectionId: '', title: '', description: '', type: 'assignment', state: 'published', dueDate: '', dueTime: '', points: '100', latePolicy: '',
  })
  const [courseDraft, setCourseDraft] = useState({ code: '', name: '', subject: '', description: '' })
  const [sectionDraft, setSectionDraft] = useState({ courseId: '', sectionCode: '', room: '', homeroom: '', capacity: '30' })

  const isSchoolAdmin = capabilities.includes('school.configure')
  const isFacultyCharacter = Boolean(activeCharacter && (activeCharacter.character_kind === 'faculty' || activeCharacter.school_role === 'faculty' || activeCharacter.school_role === 'administration'))

  const load = useCallback(async () => {
    const client = supabase
    if (!client || !activeCharacter) return
    setLoading(true)
    setError(null)

    const [courseResult, sectionResult, staffResult, enrollmentResult, meetingResult, assignmentResult, submissionResult, gradeResult, attendanceResult] = await Promise.all([
      client.from('academic_courses').select('*').order('code'),
      client.from('academic_sections').select('*').order('section_code'),
      client.from('academic_section_staff').select('*').order('assigned_at'),
      client.from('academic_enrollments').select('*').order('enrolled_at'),
      client.from('academic_meetings').select('*').order('weekday').order('period_no'),
      client.from('academic_assignments').select('*').order('due_school_date', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false }),
      client.from('academic_submissions').select('*').order('updated_at', { ascending: false }),
      client.from('academic_grades').select('*').order('updated_at', { ascending: false }),
      client.from('academic_attendance').select('*').order('school_date', { ascending: false }),
    ])

    const firstError = [courseResult.error, sectionResult.error, staffResult.error, enrollmentResult.error, meetingResult.error, assignmentResult.error, submissionResult.error, gradeResult.error, attendanceResult.error].find(Boolean)
    if (firstError) {
      setLoading(false)
      setError(firstError.message)
      return
    }

    const nextCourses = courseResult.data ?? []
    const nextSections = sectionResult.data ?? []
    const nextStaff = staffResult.data ?? []
    const nextEnrollments = enrollmentResult.data ?? []
    const nextAssignments = assignmentResult.data ?? []
    const nextSubmissions = submissionResult.data ?? []
    const nextGrades = gradeResult.data ?? []
    const nextAttendance = attendanceResult.data ?? []

    setCourses(nextCourses)
    setSections(nextSections)
    setStaff(nextStaff)
    setEnrollments(nextEnrollments)
    setMeetings(meetingResult.data ?? [])
    setAssignments(nextAssignments)
    setSubmissions(nextSubmissions)
    setGrades(nextGrades)
    setAttendance(nextAttendance)
    setSubmissionBodies(Object.fromEntries(nextSubmissions.map((item) => [item.assignment_id, item.body])))
    setGradePoints(Object.fromEntries(nextGrades.map((item) => [rowKey(item.assignment_id, item.student_character_id), item.points_earned === null ? '' : String(item.points_earned)])))
    setGradeFeedback(Object.fromEntries(nextGrades.map((item) => [rowKey(item.assignment_id, item.student_character_id), item.feedback ?? ''])))

    const characterIds = Array.from(new Set([
      ...nextStaff.map((item) => item.character_id),
      ...nextEnrollments.map((item) => item.student_character_id),
      ...nextGrades.map((item) => item.graded_by_character_id).filter((value): value is string => Boolean(value)),
    ]))
    if (characterIds.length) {
      const identityResult = await client.from('search_documents').select('entity_id,title,subtitle').eq('document_type', 'character').in('entity_id', characterIds)
      if (!identityResult.error) {
        setIdentities(Object.fromEntries((identityResult.data ?? []).filter((item) => item.entity_id).map((item) => [item.entity_id as string, item])))
      }
    } else {
      setIdentities({})
    }
    setLoading(false)
  }, [activeCharacter])

  useEffect(() => { void load() }, [load])

  const courseById = useMemo(() => new Map(courses.map((item) => [item.id, item])), [courses])
  const sectionById = useMemo(() => new Map(sections.map((item) => [item.id, item])), [sections])
  const assignmentById = useMemo(() => new Map(assignments.map((item) => [item.id, item])), [assignments])
  const ownEnrollmentSectionIds = useMemo(() => new Set(enrollments.filter((item) => item.student_character_id === activeCharacter?.id && item.status === 'active').map((item) => item.section_id)), [activeCharacter, enrollments])
  const managedSectionIds = useMemo(() => new Set(isSchoolAdmin ? sections.map((item) => item.id) : staff.filter((item) => item.character_id === activeCharacter?.id).map((item) => item.section_id)), [activeCharacter, isSchoolAdmin, sections, staff])
  const ownSections = useMemo(() => sections.filter((section) => ownEnrollmentSectionIds.has(section.id) || managedSectionIds.has(section.id)), [managedSectionIds, ownEnrollmentSectionIds, sections])
  const ownAssignments = useMemo(() => assignments.filter((assignment) => ownEnrollmentSectionIds.has(assignment.section_id) || managedSectionIds.has(assignment.section_id)), [assignments, managedSectionIds, ownEnrollmentSectionIds])
  const ownGrades = useMemo(() => grades.filter((grade) => grade.student_character_id === activeCharacter?.id), [activeCharacter, grades])
  const ownAttendance = useMemo(() => attendance.filter((item) => item.student_character_id === activeCharacter?.id), [activeCharacter, attendance])
  const today = hanamiRoleplayDate()
  const todayWeekday = hanamiRoleplayWeekday()

  useEffect(() => {
    if (!assignmentDraft.sectionId && managedSectionIds.size) setAssignmentDraft((current) => ({ ...current, sectionId: Array.from(managedSectionIds)[0] }))
    if (!attendanceSectionId && managedSectionIds.size) setAttendanceSectionId(Array.from(managedSectionIds)[0])
    if (!sectionDraft.courseId && courses.length) setSectionDraft((current) => ({ ...current, courseId: courses[0].id }))
  }, [assignmentDraft.sectionId, attendanceSectionId, courses, managedSectionIds, sectionDraft.courseId])

  function identityName(characterId: string) {
    if (characterId === activeCharacter?.id) return activeCharacter.display_name || activeCharacter.first_name || 'Your Character'
    return identities[characterId]?.title || 'Hanami Character'
  }

  function sectionName(sectionId: string) {
    const section = sectionById.get(sectionId)
    const course = section ? courseById.get(section.course_id) : null
    return course ? `${course.code} · ${course.name}` : section?.section_code || 'Hanami Class'
  }

  function sectionRoster(sectionId: string) {
    return enrollments.filter((item) => item.section_id === sectionId && item.status === 'active')
  }

  function sectionStaff(sectionId: string) {
    return staff.filter((item) => item.section_id === sectionId)
  }

  function submissionFor(assignmentId: string, characterId = activeCharacter?.id) {
    return submissions.find((item) => item.assignment_id === assignmentId && item.student_character_id === characterId)
  }

  async function saveSubmission(assignment: AcademicAssignment, submit: boolean) {
    const client = supabase
    if (!client || !activeCharacter) return
    const existing = submissionFor(assignment.id)
    const body = submissionBodies[assignment.id] ?? ''
    const status = submit ? (assignment.due_school_date && assignment.due_school_date < today ? 'late' : 'submitted') : 'draft'
    setWorking(`submission:${assignment.id}`)
    setError(null)
    setNotice(null)
    const result = existing
      ? await client.from('academic_submissions').update({ body, status, submitted_at: submit ? new Date().toISOString() : existing.submitted_at }).eq('id', existing.id)
      : await client.from('academic_submissions').insert({ assignment_id: assignment.id, student_character_id: activeCharacter.id, body, status, submitted_at: submit ? new Date().toISOString() : null })
    setWorking(null)
    if (result.error) return setError(result.error.message)
    setNotice(submit ? 'Assignment submitted.' : 'Draft saved.')
    await load()
  }

  async function createAssignment() {
    const client = supabase
    if (!client || !activeCharacter || !assignmentDraft.sectionId) return
    setWorking('new-assignment')
    setError(null)
    setNotice(null)
    const { error: createError } = await client.from('academic_assignments').insert({
      section_id: assignmentDraft.sectionId,
      title: assignmentDraft.title.trim(),
      description: assignmentDraft.description.trim() || null,
      assignment_type: assignmentDraft.type,
      state: assignmentDraft.state,
      assigned_school_date: today,
      due_school_date: assignmentDraft.dueDate || null,
      due_time: assignmentDraft.dueTime || null,
      points_possible: Number(assignmentDraft.points) || 100,
      late_policy: assignmentDraft.latePolicy.trim() || null,
      created_by_character_id: activeCharacter.id,
    })
    setWorking(null)
    if (createError) return setError(createError.message)
    setAssignmentDraft((current) => ({ ...current, title: '', description: '', dueDate: '', dueTime: '', latePolicy: '' }))
    setNotice('Assignment created.')
    await load()
  }

  async function saveGrade(assignment: AcademicAssignment, studentId: string) {
    const client = supabase
    if (!client || !activeCharacter) return
    const key = rowKey(assignment.id, studentId)
    const existing = grades.find((item) => item.assignment_id === assignment.id && item.student_character_id === studentId)
    const pointsText = gradePoints[key] ?? ''
    const payload = {
      assignment_id: assignment.id,
      student_character_id: studentId,
      points_earned: pointsText === '' ? null : Number(pointsText),
      feedback: gradeFeedback[key]?.trim() || null,
      graded_by_character_id: activeCharacter.id,
      graded_at: new Date().toISOString(),
    }
    setWorking(`grade:${key}`)
    const result = existing
      ? await client.from('academic_grades').update(payload).eq('assignment_id', assignment.id).eq('student_character_id', studentId)
      : await client.from('academic_grades').insert(payload)
    setWorking(null)
    if (result.error) return setError(result.error.message)
    setNotice('Grade saved.')
    await load()
  }

  async function saveAttendance(studentId: string) {
    const client = supabase
    if (!client || !activeCharacter || !attendanceSectionId) return
    const key = `${attendanceSectionId}:${studentId}:${attendanceDate}`
    const status = attendanceDrafts[key] || attendance.find((item) => item.section_id === attendanceSectionId && item.student_character_id === studentId && item.school_date === attendanceDate)?.status || 'present'
    const existing = attendance.find((item) => item.section_id === attendanceSectionId && item.student_character_id === studentId && item.school_date === attendanceDate)
    const payload = { section_id: attendanceSectionId, student_character_id: studentId, school_date: attendanceDate, status, recorded_by_character_id: activeCharacter.id }
    setWorking(`attendance:${studentId}`)
    const result = existing
      ? await client.from('academic_attendance').update(payload).eq('id', existing.id)
      : await client.from('academic_attendance').insert(payload)
    setWorking(null)
    if (result.error) return setError(result.error.message)
    setNotice('Attendance saved.')
    await load()
  }

  async function createCourse() {
    const client = supabase
    if (!client) return
    setWorking('new-course')
    const { error: createError } = await client.from('academic_courses').insert({ code: courseDraft.code.trim(), name: courseDraft.name.trim(), subject: courseDraft.subject.trim(), description: courseDraft.description.trim() || null })
    setWorking(null)
    if (createError) return setError(createError.message)
    setCourseDraft({ code: '', name: '', subject: '', description: '' })
    setNotice('Course created.')
    await load()
  }

  async function createSection() {
    const client = supabase
    if (!client || !sectionDraft.courseId) return
    setWorking('new-section')
    const { error: createError } = await client.from('academic_sections').insert({
      course_id: sectionDraft.courseId,
      section_code: sectionDraft.sectionCode.trim(),
      room: sectionDraft.room.trim() || null,
      homeroom_code: sectionDraft.homeroom.trim() || null,
      capacity: Number(sectionDraft.capacity) || 30,
      school_year: 2006,
      term: 'full_year',
    })
    setWorking(null)
    if (createError) return setError(createError.message)
    setSectionDraft((current) => ({ ...current, sectionCode: '', room: '', homeroom: '' }))
    setNotice('Class section created.')
    await load()
  }

  if (!activeCharacter) return null

  const earned = ownGrades.filter((item) => item.points_earned !== null).reduce((sum, item) => sum + (item.points_earned ?? 0), 0)
  const possible = ownGrades.filter((item) => item.points_earned !== null).reduce((sum, item) => sum + (assignmentById.get(item.assignment_id)?.points_possible ?? 0), 0)
  const upcoming = ownAssignments.filter((item) => item.state === 'published' && item.due_school_date && item.due_school_date >= today).slice(0, 5)
  const presentCount = ownAttendance.filter((item) => item.status === 'present').length
  const attendanceRate = ownAttendance.length ? Math.round((presentCount / ownAttendance.length) * 100) : null

  function renderOverview() {
    return <>
      <div className="academic-stat-grid">
        <article><span>CLASSES</span><strong>{ownSections.length}</strong><small>{isFacultyCharacter ? 'assigned / visible sections' : 'active enrollments'}</small></article>
        <article><span>UPCOMING</span><strong>{upcoming.length}</strong><small>published assignments</small></article>
        <article><span>GRADE</span><strong>{possible ? displayPercent(earned, possible) : '—'}</strong><small>graded points</small></article>
        <article><span>ATTENDANCE</span><strong>{attendanceRate === null ? '—' : `${attendanceRate}%`}</strong><small>{ownAttendance.length} recorded meetings</small></article>
      </div>
      <section className="academic-panel">
        <header><div><span className="eyebrow">COMING UP</span><h2>Assignments</h2></div><span>{HANAMI_SCHOOL_YEAR}</span></header>
        {upcoming.length === 0 ? <div className="academic-empty">No upcoming assignments are visible to this character.</div> : upcoming.map((assignment) => <article className="academic-list-row" key={assignment.id}><div><strong>{assignment.title}</strong><span>{sectionName(assignment.section_id)}</span></div><div><b>{formatHanamiSchoolDate(assignment.due_school_date)}</b><small>{assignment.due_time ? formatSchoolTime(assignment.due_time) : 'No time set'}</small></div></article>)}
      </section>
    </>
  }

  function renderSchedule() {
    const visibleMeetings = meetings.filter((item) => ownSections.some((section) => section.id === item.section_id))
    return <section className="academic-panel schedule-panel">
      <header><div><span className="eyebrow">WEEKLY TIMETABLE</span><h2>{HANAMI_SCHOOL_YEAR}</h2></div><span>Today · {formatHanamiSchoolDate(today)}</span></header>
      <div className="schedule-grid">
        {[1, 2, 3, 4, 5].map((day) => <div className={`schedule-day ${day === todayWeekday ? 'today' : ''}`} key={day}><header>{weekdayLabels[day]}</header>{[1, 2, 3, 4, 5, 6].map((period) => { const meeting = visibleMeetings.find((item) => item.weekday === day && item.period_no === period); return <article key={period} className={meeting ? 'filled' : ''}><span>P{period}</span>{meeting ? <><strong>{sectionName(meeting.section_id)}</strong><small>{formatSchoolTime(meeting.starts_at)}–{formatSchoolTime(meeting.ends_at)} · {meeting.room || sectionById.get(meeting.section_id)?.room || 'Room TBA'}</small></> : <small>—</small>}</article> })}</div>)}
      </div>
    </section>
  }

  function renderClasses() {
    return <>
      <div className="academic-card-grid">
        {ownSections.length === 0 ? <div className="academic-empty">No class sections are visible to this character yet.</div> : ownSections.map((section) => {
          const course = courseById.get(section.course_id)
          const teacherRows = sectionStaff(section.id)
          return <article className={`academic-class-card ${targetId === section.id ? 'targeted' : ''}`} id={`academic-${section.id}`} key={section.id}>
            <span className="eyebrow">{course?.subject || 'COURSE'} · {section.section_code}</span>
            <h2>{course?.name || 'Hanami Class'}</h2>
            <p>{course?.description || 'No course description has been published yet.'}</p>
            <dl><div><dt>Room</dt><dd>{section.room || 'TBA'}</dd></div><div><dt>Homeroom</dt><dd>{section.homeroom_code || '—'}</dd></div><div><dt>Roster</dt><dd>{sectionRoster(section.id).length}{section.capacity ? ` / ${section.capacity}` : ''}</dd></div></dl>
            <footer>{teacherRows.length ? teacherRows.map((item) => <span key={item.character_id}>{identityName(item.character_id)} · {item.staff_role}</span>) : <span>Faculty TBA</span>}</footer>
          </article>
        })}
      </div>
      {isSchoolAdmin && <section className="academic-panel admin-config-panel">
        <header><div><span className="eyebrow">SCHOOL CONFIGURATION</span><h2>Courses & sections</h2></div><span>school.configure</span></header>
        <div className="academic-form-grid">
          <form onSubmit={(event) => { event.preventDefault(); void createCourse() }}><h3>New course</h3><input required placeholder="Code · MATH-01" value={courseDraft.code} onChange={(event) => setCourseDraft({ ...courseDraft, code: event.target.value })}/><input required placeholder="Course name" value={courseDraft.name} onChange={(event) => setCourseDraft({ ...courseDraft, name: event.target.value })}/><input required placeholder="Subject" value={courseDraft.subject} onChange={(event) => setCourseDraft({ ...courseDraft, subject: event.target.value })}/><textarea placeholder="Description" value={courseDraft.description} onChange={(event) => setCourseDraft({ ...courseDraft, description: event.target.value })}/><button className="primary-action" disabled={working === 'new-course'}>{working === 'new-course' ? 'Creating…' : 'Create course'}</button></form>
          <form onSubmit={(event) => { event.preventDefault(); void createSection() }}><h3>New section</h3><select required value={sectionDraft.courseId} onChange={(event) => setSectionDraft({ ...sectionDraft, courseId: event.target.value })}><option value="">Choose course</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.code} · {course.name}</option>)}</select><input required placeholder="Section code · 1-A-MATH" value={sectionDraft.sectionCode} onChange={(event) => setSectionDraft({ ...sectionDraft, sectionCode: event.target.value })}/><input placeholder="Room" value={sectionDraft.room} onChange={(event) => setSectionDraft({ ...sectionDraft, room: event.target.value })}/><input placeholder="Homeroom" value={sectionDraft.homeroom} onChange={(event) => setSectionDraft({ ...sectionDraft, homeroom: event.target.value })}/><input type="number" min="1" max="60" value={sectionDraft.capacity} onChange={(event) => setSectionDraft({ ...sectionDraft, capacity: event.target.value })}/><button className="primary-action" disabled={working === 'new-section'}>{working === 'new-section' ? 'Creating…' : 'Create section'}</button></form>
        </div>
      </section>}
    </>
  }

  function renderAssignments() {
    const studentAssignments = ownAssignments.filter((item) => item.state !== 'draft' || managedSectionIds.has(item.section_id))
    return <>
      {isFacultyCharacter && managedSectionIds.size > 0 && <section className="academic-panel assignment-create-panel"><header><div><span className="eyebrow">FACULTY TOOLS</span><h2>Create assignment</h2></div><span>{formatHanamiSchoolDate(today)}</span></header><form className="academic-assignment-form" onSubmit={(event) => { event.preventDefault(); void createAssignment() }}><select value={assignmentDraft.sectionId} onChange={(event) => setAssignmentDraft({ ...assignmentDraft, sectionId: event.target.value })}>{Array.from(managedSectionIds).map((id) => <option value={id} key={id}>{sectionName(id)}</option>)}</select><input required placeholder="Assignment title" value={assignmentDraft.title} onChange={(event) => setAssignmentDraft({ ...assignmentDraft, title: event.target.value })}/><textarea placeholder="Instructions" value={assignmentDraft.description} onChange={(event) => setAssignmentDraft({ ...assignmentDraft, description: event.target.value })}/><div className="academic-inline-fields"><select value={assignmentDraft.type} onChange={(event) => setAssignmentDraft({ ...assignmentDraft, type: event.target.value })}><option value="assignment">Assignment</option><option value="quiz">Quiz</option><option value="test">Test</option><option value="project">Project</option><option value="participation">Participation</option></select><select value={assignmentDraft.state} onChange={(event) => setAssignmentDraft({ ...assignmentDraft, state: event.target.value })}><option value="published">Publish now</option><option value="draft">Save faculty draft</option></select><input type="number" min="1" step="0.5" value={assignmentDraft.points} onChange={(event) => setAssignmentDraft({ ...assignmentDraft, points: event.target.value })}/><input type="date" min="2006-01-01" max="2006-12-31" value={assignmentDraft.dueDate} onChange={(event) => setAssignmentDraft({ ...assignmentDraft, dueDate: event.target.value })}/><input type="time" value={assignmentDraft.dueTime} onChange={(event) => setAssignmentDraft({ ...assignmentDraft, dueTime: event.target.value })}/></div><input placeholder="Late policy (optional)" value={assignmentDraft.latePolicy} onChange={(event) => setAssignmentDraft({ ...assignmentDraft, latePolicy: event.target.value })}/><button className="primary-action" disabled={working === 'new-assignment'}>{working === 'new-assignment' ? 'Creating…' : 'Create assignment'}</button></form></section>}
      <section className="academic-panel"><header><div><span className="eyebrow">COURSEWORK</span><h2>Assignments</h2></div><strong>{studentAssignments.length}</strong></header>{studentAssignments.length === 0 ? <div className="academic-empty">No assignments are visible yet.</div> : <div className="assignment-list">{studentAssignments.map((assignment) => { const ownSubmission = submissionFor(assignment.id); const studentCanSubmit = ownEnrollmentSectionIds.has(assignment.section_id) && assignment.state === 'published'; return <article className={`assignment-card ${targetId === assignment.id ? 'targeted' : ''}`} key={assignment.id}><header><div><span className="eyebrow">{assignment.assignment_type} · {assignment.state}</span><h3>{assignment.title}</h3><small>{sectionName(assignment.section_id)}</small></div><div><strong>{assignment.points_possible} pts</strong><span>{assignment.due_school_date ? formatHanamiSchoolDate(assignment.due_school_date) : 'No due date'}</span></div></header>{assignment.description && <p>{assignment.description}</p>}{assignment.late_policy && <div className="academic-policy"><strong>Late policy</strong><span>{assignment.late_policy}</span></div>}{studentCanSubmit && <div className="submission-editor"><textarea placeholder="Write your submission…" value={submissionBodies[assignment.id] ?? ''} onChange={(event) => setSubmissionBodies({ ...submissionBodies, [assignment.id]: event.target.value })}/><div><span>{ownSubmission ? `Status: ${ownSubmission.status}` : 'Not started'}</span><button type="button" disabled={working === `submission:${assignment.id}`} onClick={() => void saveSubmission(assignment, false)}>Save draft</button><button type="button" className="primary-action" disabled={working === `submission:${assignment.id}`} onClick={() => void saveSubmission(assignment, true)}>Submit</button></div></div>}</article> })}</div>}</section>
    </>
  }

  function renderGrades() {
    if (!isFacultyCharacter || managedSectionIds.size === 0) return <section className="academic-panel"><header><div><span className="eyebrow">REPORT CARD</span><h2>Your grades</h2></div><strong>{possible ? displayPercent(earned, possible) : '—'}</strong></header>{ownGrades.length === 0 ? <div className="academic-empty">No grades have been posted yet.</div> : ownGrades.map((grade) => { const assignment = assignmentById.get(grade.assignment_id); if (!assignment) return null; return <article className="academic-list-row" key={grade.assignment_id}><div><strong>{assignment.title}</strong><span>{sectionName(assignment.section_id)}{grade.feedback ? ` · ${grade.feedback}` : ''}</span></div><div><b>{grade.points_earned ?? '—'} / {assignment.points_possible}</b><small>{displayPercent(grade.points_earned, assignment.points_possible)}</small></div></article> })}</section>

    const facultyAssignments = assignments.filter((item) => managedSectionIds.has(item.section_id))
    return <section className="academic-panel"><header><div><span className="eyebrow">FACULTY GRADEBOOK</span><h2>Grades & feedback</h2></div><strong>{facultyAssignments.length} assignments</strong></header>{facultyAssignments.length === 0 ? <div className="academic-empty">Create an assignment before entering grades.</div> : facultyAssignments.map((assignment) => <article className="gradebook-assignment" key={assignment.id}><header><strong>{assignment.title}</strong><span>{sectionName(assignment.section_id)} · {assignment.points_possible} pts</span></header>{sectionRoster(assignment.section_id).length === 0 ? <div className="academic-empty compact">No students are enrolled in this section.</div> : sectionRoster(assignment.section_id).map((enrollment) => { const key = rowKey(assignment.id, enrollment.student_character_id); return <div className="gradebook-row" key={key}><div><strong>{identityName(enrollment.student_character_id)}</strong><small>{submissionFor(assignment.id, enrollment.student_character_id)?.status || 'No submission'}</small></div><input aria-label="Points earned" type="number" min="0" step="0.5" max={assignment.points_possible} placeholder="Points" value={gradePoints[key] ?? ''} onChange={(event) => setGradePoints({ ...gradePoints, [key]: event.target.value })}/><input aria-label="Feedback" placeholder="Teacher feedback" value={gradeFeedback[key] ?? ''} onChange={(event) => setGradeFeedback({ ...gradeFeedback, [key]: event.target.value })}/><button type="button" disabled={working === `grade:${key}`} onClick={() => void saveGrade(assignment, enrollment.student_character_id)}>Save</button></div>})}</article>)}</section>
  }

  function renderAttendance() {
    if (!isFacultyCharacter || managedSectionIds.size === 0) {
      const counts = Object.fromEntries(attendanceStates.map((state) => [state, ownAttendance.filter((item) => item.status === state).length]))
      return <section className="academic-panel"><header><div><span className="eyebrow">ATTENDANCE HISTORY</span><h2>Your attendance</h2></div><strong>{attendanceRate === null ? '—' : `${attendanceRate}% present`}</strong></header><div className="attendance-summary">{attendanceStates.map((state) => <article key={state}><span>{state}</span><strong>{counts[state]}</strong></article>)}</div>{ownAttendance.length === 0 ? <div className="academic-empty">No attendance records yet.</div> : ownAttendance.map((item) => <article className="academic-list-row" key={item.id}><div><strong>{sectionName(item.section_id)}</strong><span>{item.note || 'No note'}</span></div><div><b className={`attendance-state ${item.status}`}>{item.status}</b><small>{formatHanamiSchoolDate(item.school_date)}</small></div></article>)}</section>
    }

    const roster = sectionRoster(attendanceSectionId)
    return <section className="academic-panel"><header><div><span className="eyebrow">FACULTY ROLL</span><h2>Record attendance</h2></div><span>Roleplay dates only · 2006</span></header><div className="attendance-controls"><select value={attendanceSectionId} onChange={(event) => setAttendanceSectionId(event.target.value)}>{Array.from(managedSectionIds).map((id) => <option key={id} value={id}>{sectionName(id)}</option>)}</select><input type="date" min="2006-01-01" max="2006-12-31" value={attendanceDate} onChange={(event) => setAttendanceDate(event.target.value)}/></div>{roster.length === 0 ? <div className="academic-empty">No active students are enrolled in this section.</div> : roster.map((enrollment) => { const existing = attendance.find((item) => item.section_id === attendanceSectionId && item.student_character_id === enrollment.student_character_id && item.school_date === attendanceDate); const key = `${attendanceSectionId}:${enrollment.student_character_id}:${attendanceDate}`; return <div className="attendance-roster-row" key={enrollment.student_character_id}><strong>{identityName(enrollment.student_character_id)}</strong><select value={attendanceDrafts[key] || existing?.status || 'present'} onChange={(event) => setAttendanceDrafts({ ...attendanceDrafts, [key]: event.target.value })}>{attendanceStates.map((state) => <option value={state} key={state}>{state}</option>)}</select><button type="button" disabled={working === `attendance:${enrollment.student_character_id}`} onClick={() => void saveAttendance(enrollment.student_character_id)}>Save</button></div>})}</section>
  }

  return <main className="content-area academics-page">
    <ShellTopbar eyebrow="ACADEMICS" title={modeMeta[mode].title} onSearch={onSearch} onNotifications={onNotifications} unreadCount={unreadCount}/>
    <div className="academic-intro"><div><span className="eyebrow">HANAMI HIGH · {HANAMI_SCHOOL_YEAR}</span><p>{modeMeta[mode].description}</p></div><div><span>ROLEPLAY DATE</span><strong>{formatHanamiSchoolDate(today)}</strong></div></div>
    {error && <div className="identity-notice error">{error}</div>}
    {notice && <div className="identity-notice success">{notice}</div>}
    {loading ? <div className="academic-empty loading">Loading school records…</div> : mode === 'overview' ? renderOverview() : mode === 'my-schedule' ? renderSchedule() : mode === 'classes' ? renderClasses() : mode === 'assignments' ? renderAssignments() : mode === 'grades' ? renderGrades() : renderAttendance()}
  </main>
}

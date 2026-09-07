import { useEffect, useMemo, useState } from 'react'
import { OrientationPanel } from './OrientationPanel'
import { ShellTopbar } from './ShellTopbar'
import { useIdentity } from '../state/IdentityContext'
import { supabase } from '../lib/supabase'
import {
  formatHanamiSchoolDate,
  formatSchoolTime,
  HANAMI_TIME_ZONE,
  hanamiRoleplayDate,
  hanamiRoleplayWeekday,
} from '../lib/roleplayDate'
import type { HanamiCharacter } from '../types/database'
import type { AcademicCourse, AcademicMeeting, AcademicSection } from '../types/database-academics'
import type { SchoolAnnouncement } from '../types/database-home'
import type { HanamiPlusEntitlement, PetalWallet } from '../types/database-rewards'

type Props = {
  onSearch: () => void
  onNotifications: () => void
  unreadCount: number
}

type HomeScheduleRow = {
  meeting: AcademicMeeting
  section: AcademicSection
  course: AcademicCourse | null
}

function roleLabel(character: HanamiCharacter) {
  if (character.character_kind === 'faculty' && character.school_role === 'new_faculty') return 'New Teacher'
  if (character.character_kind === 'faculty' && (character.school_role === 'faculty' || character.school_role === null)) return 'Teacher'
  if (character.school_role === 'administration') return 'Staff'
  if (character.school_role === 'new_student') return 'New Student'
  if (character.school_role === 'student') return 'Student'
  if (!character.school_role) return 'Applicant'
  return character.school_role.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

function tokyoMinutes(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: HANAMI_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value])) as Record<string, string>
  return Number(values.hour || 0) * 60 + Number(values.minute || 0)
}

function clockMinutes(value: string) {
  const [hour = '0', minute = '0'] = value.split(':')
  return Number(hour) * 60 + Number(minute)
}

function schoolStatus(weekday: number | null, minutes: number) {
  if (!weekday) return 'Weekend'
  if (minutes < 8 * 60 + 15) return 'Before school'
  if (minutes <= 15 * 60 + 45) return 'In session'
  return 'After school'
}

export function HomePreview({ onSearch, onNotifications, unreadCount }: Props) {
  const { account, activeCharacter } = useIdentity()
  const [schedule, setSchedule] = useState<HomeScheduleRow[]>([])
  const [announcement, setAnnouncement] = useState<SchoolAnnouncement | null>(null)
  const [wallet, setWallet] = useState<PetalWallet | null>(null)
  const [plus, setPlus] = useState<HanamiPlusEntitlement | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)

  const today = hanamiRoleplayDate()
  const weekday = hanamiRoleplayWeekday()
  const nowMinutes = tokyoMinutes()

  useEffect(() => {
    const client = supabase
    const currentAccount = account
    const currentCharacter = activeCharacter
    if (!client || !currentAccount || !currentCharacter) return
    let cancelled = false

    async function loadHome() {
      setLoadingData(true)
      setDataError(null)

      const [enrollmentResult, staffResult, announcementResult, walletResult, plusResult] = await Promise.all([
        client.from('academic_enrollments').select('section_id').eq('student_character_id', currentCharacter.id).eq('status', 'active'),
        client.from('academic_section_staff').select('section_id').eq('character_id', currentCharacter.id),
        client.from('school_announcements').select('*').eq('state', 'published').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(12),
        client.from('petal_wallets').select('*').eq('account_id', currentAccount.id).maybeSingle(),
        client.from('hanami_plus_entitlements').select('*').eq('account_id', currentAccount.id).maybeSingle(),
      ])

      const firstError = enrollmentResult.error || staffResult.error || announcementResult.error || walletResult.error || plusResult.error
      if (firstError) {
        if (!cancelled) {
          setDataError(firstError.message)
          setLoadingData(false)
        }
        return
      }

      const visibleAnnouncement = (announcementResult.data ?? []).find((item) => !item.expires_school_date || item.expires_school_date >= today) ?? null
      const sectionIds = Array.from(new Set([
        ...(enrollmentResult.data ?? []).map((item) => item.section_id),
        ...(staffResult.data ?? []).map((item) => item.section_id),
      ]))

      let nextSchedule: HomeScheduleRow[] = []
      if (weekday && sectionIds.length > 0) {
        const [sectionResult, meetingResult] = await Promise.all([
          client.from('academic_sections').select('*').in('id', sectionIds),
          client.from('academic_meetings').select('*').in('section_id', sectionIds).eq('weekday', weekday).order('period_no'),
        ])
        const scheduleError = sectionResult.error || meetingResult.error
        if (scheduleError) {
          if (!cancelled) {
            setDataError(scheduleError.message)
            setLoadingData(false)
          }
          return
        }

        const sections = sectionResult.data ?? []
        const courseIds = Array.from(new Set(sections.map((section) => section.course_id)))
        const courseResult = courseIds.length
          ? await client.from('academic_courses').select('*').in('id', courseIds)
          : { data: [] as AcademicCourse[], error: null }
        if (courseResult.error) {
          if (!cancelled) {
            setDataError(courseResult.error.message)
            setLoadingData(false)
          }
          return
        }

        const sectionById = new Map(sections.map((section) => [section.id, section]))
        const courseById = new Map((courseResult.data ?? []).map((course) => [course.id, course]))
        nextSchedule = (meetingResult.data ?? []).flatMap((meeting) => {
          const section = sectionById.get(meeting.section_id)
          if (!section) return []
          return [{ meeting, section, course: courseById.get(section.course_id) ?? null }]
        })
      }

      if (!cancelled) {
        setSchedule(nextSchedule)
        setAnnouncement(visibleAnnouncement)
        setWallet(walletResult.data)
        setPlus(plusResult.data)
        setLoadingData(false)
      }
    }

    void loadHome()
    return () => { cancelled = true }
  }, [account, activeCharacter, today, weekday])

  if (!activeCharacter) return null

  const firstName = activeCharacter.first_name
    || activeCharacter.display_name?.split(/\s+/)[0]
    || (activeCharacter.character_kind === 'faculty' ? 'Teacher' : 'Student')
  const fullName = activeCharacter.display_name
    || [activeCharacter.first_name, activeCharacter.last_name].filter(Boolean).join(' ')
    || firstName
  const plusActive = Boolean(plus && new Date(plus.ends_at).getTime() > Date.now())

  const scheduleStates = useMemo(() => {
    const nextIndex = schedule.findIndex(({ meeting }) => clockMinutes(meeting.starts_at) > nowMinutes)
    return schedule.map(({ meeting }, index) => {
      const start = clockMinutes(meeting.starts_at)
      const end = clockMinutes(meeting.ends_at)
      if (nowMinutes >= start && nowMinutes < end) return 'Now'
      if (nowMinutes >= end) return 'Complete'
      return index === nextIndex ? 'Next' : 'Later'
    })
  }, [nowMinutes, schedule])

  return (
    <main className="content-area hanami-home-page discord-home-channel">
      <ShellTopbar
        eyebrow="HANAMI HOME"
        title="home"
        onSearch={onSearch}
        onNotifications={onNotifications}
        unreadCount={unreadCount}
      />

      <section className="home-channel-welcome">
        <div className="home-channel-icon">花</div>
        <h1>Welcome to #home!</h1>
        <p>This is your personal Hanami High campus channel. School notices, today’s classes, orientation, and account shortcuts collect here.</p>
        <div className="home-channel-meta">
          <span>{formatHanamiSchoolDate(today)}</span>
          <span>Asia/Tokyo</span>
          <span className="home-school-state"><i />{schoolStatus(weekday, nowMinutes)}</span>
        </div>
      </section>

      {dataError && <div className="identity-notice error">{dataError}</div>}
      <OrientationPanel />

      <section className="home-message-feed" aria-label="Hanami Home activity">
        <article className="home-channel-message system-message">
          <div className="home-message-avatar hanami-avatar">花</div>
          <div className="home-message-content">
            <header><strong>Hanami High</strong><span className="home-system-badge">SYSTEM</span><time>{formatHanamiSchoolDate(today)}</time></header>
            <p>Welcome back, {firstName}. Your current identity is <strong>{fullName}</strong> · {roleLabel(activeCharacter)}.</p>
            <div className="home-message-embed identity-embed">
              <div><span>Current role</span><strong>{roleLabel(activeCharacter)}</strong></div>
              <div><span>Character slot</span><strong>{activeCharacter.slot_no} / 2</strong></div>
              <div><span>Campus status</span><strong>{schoolStatus(weekday, nowMinutes)}</strong></div>
              <a href="#/profile/view-profile">Open your profile →</a>
            </div>
          </div>
        </article>

        <article className="home-channel-message">
          <div className="home-message-avatar schedule-avatar">▤</div>
          <div className="home-message-content">
            <header><strong>Schedule</strong><span className="home-system-badge utility">SCHOOL</span><time>Today</time></header>
            <p>{weekday ? 'Here is what is on your Hanami timetable today.' : 'There are no weekday classes scheduled today.'}</p>
            <div className="home-message-embed schedule-embed">
              {loadingData ? <div className="home-live-empty">Loading today’s schedule…</div> : schedule.length === 0 ? <div className="home-live-empty">No classes are assigned for today. Check your full schedule for the rest of the week.</div> : schedule.map(({ meeting, section, course }, index) => (
                <div className={`home-live-schedule-row ${scheduleStates[index] === 'Now' ? 'current' : ''}`} key={meeting.id}>
                  <time>{formatSchoolTime(meeting.starts_at)}</time>
                  <div><strong>{course?.name || section.section_code}</strong><span>{meeting.room || section.room || 'Room TBA'} · Period {meeting.period_no}</span></div>
                  <em>{scheduleStates[index]}</em>
                </div>
              ))}
              <a href="#/academics/my-schedule">Open full schedule →</a>
            </div>
          </div>
        </article>

        <article className="home-channel-message">
          <div className="home-message-avatar announcement-avatar">✦</div>
          <div className="home-message-content">
            <header><strong>School Announcements</strong><span className="home-system-badge announcement">NOTICE</span><time>{announcement?.school_date ? formatHanamiSchoolDate(announcement.school_date) : 'Latest'}</time></header>
            {loadingData ? <p>Loading the latest school notice…</p> : announcement ? <>
              <p>{announcement.title}</p>
              <div className="home-message-embed announcement-embed"><strong>{announcement.title}</strong><p>{announcement.body}</p><a href={`#/home/announcements/${encodeURIComponent(announcement.id)}`}>Open announcement →</a></div>
            </> : <p>No school announcements are published right now.</p>}
          </div>
        </article>

        <article className="home-channel-message">
          <div className="home-message-avatar wallet-avatar">❀</div>
          <div className="home-message-content">
            <header><strong>Hanami Account</strong><span className="home-system-badge utility">ACCOUNT</span><time>Account-wide</time></header>
            <p>Your Petals, Boutique collection, and Hanami+ entitlement belong to your real account and are shared by both character slots.</p>
            <div className="home-message-embed wallet-embed">
              <div><span>Petals</span><strong>❀ {wallet?.balance ?? 0}</strong></div>
              <div><span>Hanami+</span><strong>{plusActive ? 'Active' : 'Inactive'}</strong></div>
              {plusActive && plus && <div><span>Access ends</span><strong>{new Date(plus.ends_at).toLocaleDateString()}</strong></div>}
              <div className="home-wallet-links"><a href="#/boutique/featured">Boutique</a><a href="#/petals/rewards">Rewards</a></div>
            </div>
          </div>
        </article>
      </section>

      <nav className="home-channel-actions" aria-label="Hanami Home shortcuts">
        <a href="#/academics/classes"><span>#</span>my-classes</a>
        <a href="#/academics/homeroom"><span>#</span>homeroom</a>
        <a href="#/social/friends"><span>#</span>friends</a>
        <a href="#/campus/clubs"><span>#</span>clubs</a>
        <a href="#/profile/profile-studio"><span>#</span>profile-studio</a>
      </nav>
    </main>
  )
}

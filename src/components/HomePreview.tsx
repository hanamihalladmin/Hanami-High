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
    if (!client || !account || !activeCharacter) return
    const db = client
    const accountId = account.id
    const characterId = activeCharacter.id
    let cancelled = false

    async function loadHome() {
      setLoadingData(true)
      setDataError(null)
      const [enrollmentResult, staffResult, announcementResult, walletResult, plusResult] = await Promise.all([
        db.from('academic_enrollments').select('section_id').eq('student_character_id', characterId).eq('status', 'active'),
        db.from('academic_section_staff').select('section_id').eq('character_id', characterId),
        db.from('school_announcements').select('*').eq('state', 'published').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(12),
        db.from('petal_wallets').select('*').eq('account_id', accountId).maybeSingle(),
        db.from('hanami_plus_entitlements').select('*').eq('account_id', accountId).maybeSingle(),
      ])

      const firstError = enrollmentResult.error || staffResult.error || announcementResult.error || walletResult.error || plusResult.error
      if (firstError) {
        if (!cancelled) { setDataError(firstError.message); setLoadingData(false) }
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
          db.from('academic_sections').select('*').in('id', sectionIds),
          db.from('academic_meetings').select('*').in('section_id', sectionIds).eq('weekday', weekday).order('period_no'),
        ])
        const scheduleError = sectionResult.error || meetingResult.error
        if (scheduleError) {
          if (!cancelled) { setDataError(scheduleError.message); setLoadingData(false) }
          return
        }
        const sections = sectionResult.data ?? []
        const courseIds = Array.from(new Set(sections.map((section) => section.course_id)))
        const courseResult = courseIds.length
          ? await db.from('academic_courses').select('*').in('id', courseIds)
          : { data: [] as AcademicCourse[], error: null }
        if (courseResult.error) {
          if (!cancelled) { setDataError(courseResult.error.message); setLoadingData(false) }
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

  const firstName = activeCharacter.first_name || activeCharacter.display_name?.split(/\s+/)[0] || (activeCharacter.character_kind === 'faculty' ? 'Teacher' : 'Student')
  const fullName = activeCharacter.display_name || [activeCharacter.first_name, activeCharacter.last_name].filter(Boolean).join(' ') || firstName
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

  const calendar = useMemo(() => {
    const [year, month, day] = today.split('-').map(Number)
    const firstDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
    return {
      day,
      label: new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1))),
      cells: [...Array.from({ length: firstDay }, () => null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)],
    }
  }, [today])

  return (
    <main className="content-area hanami-home-page earlyweb-home-page">
      <ShellTopbar eyebrow="HANAMI HIGH SCHOOL NETWORK" title="Home" onSearch={onSearch} onNotifications={onNotifications} unreadCount={unreadCount}/>

      <section className="home-floral-banner">
        <div className="home-floral-banner-copy">
          <span className="eyebrow">❀ HANAMI HIGH · EST. 2006 ❀</span>
          <h2>Welcome back, {firstName}!</h2>
          <p>A little corner of the Hanami school network for classes, friends, campus news, flowers, and whatever is happening today.</p>
        </div>
        <div className="home-floral-stamp"><span>✿</span><strong>HANAMI</strong><small>{formatHanamiSchoolDate(today)}</small></div>
      </section>

      {dataError && <div className="identity-notice error">{dataError}</div>}

      <div className="home-web-grid">
        <aside className="home-web-left">
          <section className="home-web-card home-id-card">
            <div className="home-card-title">my school id</div>
            <div className="home-id-avatar">{fullName.slice(0, 2).toUpperCase()}</div>
            <strong>{fullName}</strong>
            <span>{activeCharacter.handle ? `@${activeCharacter.handle}` : roleLabel(activeCharacter)}</span>
            <div className="home-id-badges"><b>{roleLabel(activeCharacter)}</b><b>{schoolStatus(weekday, nowMinutes)}</b></div>
            <a href="#/profile/view-profile">view my page →</a>
          </section>

          <section className="home-web-card home-counter-card">
            <div className="home-card-title">today @ hanami</div>
            <dl>
              <div><dt>date</dt><dd>{formatHanamiSchoolDate(today)}</dd></div>
              <div><dt>zone</dt><dd>Tokyo</dd></div>
              <div><dt>classes</dt><dd>{schedule.length}</dd></div>
              <div><dt>petals</dt><dd>❀ {wallet?.balance ?? 0}</dd></div>
              <div><dt>plus</dt><dd>{plusActive ? 'active ✦' : 'standard'}</dd></div>
            </dl>
          </section>

          <section className="home-web-card home-mini-note">
            <div className="home-card-title">little note</div>
            <p>“Through hardship, we find beauty.”</p>
            <span>— Hanami High ✿</span>
          </section>
        </aside>

        <section className="home-web-center">
          <nav className="home-pixel-tabs" aria-label="Home shortcuts">
            <a href="#/academics/classes">classes</a><a href="#/academics/homeroom">homeroom</a><a href="#/social/friends">friends</a><a href="#/campus/clubs">clubs</a><a href="#/profile/profile-studio">my page</a>
          </nav>

          <section className="home-welcome-box">
            <div className="home-card-title">welcome.txt</div>
            <div className="home-welcome-inner"><p>Hi {firstName}! You’re logged into the Hanami High School Network as <strong>{fullName}</strong>. Check what’s happening today, visit your classes, or wander around campus.</p><p className="home-handwritten">have a lovely school day ❀</p></div>
          </section>

          <div className="home-sticker-strip">
            <a href="#/home/announcements">✿ news</a><a href="#/home/school-calendar">❀ calendar</a><a href="#/campus/events">✦ events</a><a href="#/boutique/featured">♡ boutique</a><a href="#/social/feed">☻ social</a>
          </div>

          <OrientationPanel />

          <div className="home-dashboard-grid">
            <section className="home-live-panel home-schedule-panel">
              <header><div><span className="eyebrow">TODAY’S TIMETABLE</span><h2>{weekday ? 'School schedule' : 'Weekend'}</h2></div><a href="#/academics/my-schedule">full week →</a></header>
              {loadingData ? <div className="home-live-empty">Loading today’s schedule…</div> : schedule.length === 0 ? <div className="home-live-empty">No classes are assigned for today.</div> : <div className="home-schedule-list">{schedule.map(({ meeting, section, course }, index) => <article className={`home-live-schedule-row ${scheduleStates[index] === 'Now' ? 'current' : ''}`} key={meeting.id}><time>{formatSchoolTime(meeting.starts_at)}</time><div><strong>{course?.name || section.section_code}</strong><span>{meeting.room || section.room || 'Room TBA'} · Period {meeting.period_no}</span></div><em>{scheduleStates[index]}</em></article>)}</div>}
            </section>

            <div className="home-dashboard-stack">
              <section className="home-live-panel announcement-panel">
                <header><span className="eyebrow">SCHOOL NOTICE</span><h2>{announcement?.title || 'Announcements'}</h2></header>
                {loadingData ? <p>Loading the latest notice…</p> : announcement ? <><p>{announcement.body}</p><a className="home-inline-link" href={`#/home/announcements/${encodeURIComponent(announcement.id)}`}>read more →</a></> : <p>No school announcements are published right now.</p>}
              </section>

              <section className="home-live-panel home-wallet-panel">
                <header><span className="eyebrow">MY HANAMI ACCOUNT</span><h2>Petals & Hanami+</h2></header>
                <div className="home-wallet-stats"><div><span>petals</span><strong>❀ {wallet?.balance ?? 0}</strong></div><div><span>hanami+</span><strong>{plusActive ? 'active ✦' : 'inactive'}</strong></div>{plusActive && plus && <div><span>until</span><strong>{new Date(plus.ends_at).toLocaleDateString()}</strong></div>}</div>
                <div className="wallet-actions"><a href="#/boutique/featured">visit boutique</a><a href="#/petals/rewards">rewards</a></div>
              </section>
            </div>
          </div>
        </section>

        <aside className="home-web-right">
          <section className="home-web-card home-navigation-card">
            <div className="home-card-title">navigation</div>
            <a href="#/academics/classes">my classes <span>❀</span></a><a href="#/academics/homeroom">homeroom <span>✿</span></a><a href="#/social/feed">social feed <span>♡</span></a><a href="#/campus/campus-overview">campus <span>✦</span></a><a href="#/discover/students">directory <span>☻</span></a><a href="#/settings/account">settings <span>⚙</span></a>
          </section>

          <section className="home-web-card home-calendar-card">
            <div className="home-card-title">{calendar.label.toLowerCase()}</div>
            <div className="home-calendar-week"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div>
            <div className="home-calendar-days">{calendar.cells.map((value, index) => <span className={value === calendar.day ? 'today' : ''} key={`${value ?? 'blank'}-${index}`}>{value ?? ''}</span>)}</div>
          </section>

          <section className="home-web-card home-link-card">
            <div className="home-card-title">link hanami</div>
            <div className="home-mini-button">✿ HANAMI HIGH ✿<br/>school network · 2006</div>
            <code>hanami-high / campus network</code>
          </section>
        </aside>
      </div>
    </main>
  )
}

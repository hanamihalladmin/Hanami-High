export const HANAMI_ROLEPLAY_YEAR = 2006
export const HANAMI_SCHOOL_YEAR = '2006–07'
export const HANAMI_FIRST_DAY_ISO = '2006-04-07'
export const HANAMI_TIME_ZONE = 'Asia/Tokyo'

function tokyoParts(now: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: HANAMI_TIME_ZONE,
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(now)

  return Object.fromEntries(parts.map((part) => [part.type, part.value])) as Record<string, string>
}

export function hanamiRoleplayDate(now = new Date()) {
  const parts = tokyoParts(now)
  return `${HANAMI_ROLEPLAY_YEAR}-${parts.month}-${parts.day}`
}

export function hanamiRoleplayWeekday(now = new Date()) {
  const value = new Intl.DateTimeFormat('en-US', {
    timeZone: HANAMI_TIME_ZONE,
    weekday: 'short',
  }).format(now)
  return ({ Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5 } as Record<string, number>)[value] ?? null
}

export function formatHanamiSchoolDate(value: string | null | undefined) {
  if (!value) return 'No date'
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day, 12))
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

export function formatSchoolTime(value: string | null | undefined) {
  if (!value) return ''
  const [hour = '0', minute = '00'] = value.split(':')
  const date = new Date(Date.UTC(2006, 0, 1, Number(hour), Number(minute)))
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(date)
}

export function compareSchoolDates(left: string | null | undefined, right: string | null | undefined) {
  if (!left || !right) return 0
  return left.localeCompare(right)
}

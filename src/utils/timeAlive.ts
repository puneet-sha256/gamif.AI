// Utilities for computing "time alive" from a date of birth.
// DOB is stored as 'YYYY-MM-DD' (midnight) or 'YYYY-MM-DDTHH:MM:SS' if the
// user supplied a birth time. All values are interpreted as local time.

export interface TimeAliveBreakdown {
  years: number
  days: number
  hours: number
  minutes: number
  seconds: number
  totalSeconds: number
}

const MIN_AGE = 13
const MAX_AGE = 120

export function parseDob(dob: string): Date | null {
  if (!dob || typeof dob !== 'string') return null
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(dob.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hours = match[4] ? Number(match[4]) : 0
  const minutes = match[5] ? Number(match[5]) : 0
  const seconds = match[6] ? Number(match[6]) : 0
  // Local time; new Date(y, m, d, h, mi, s) treats month as 0-indexed.
  const d = new Date(year, month - 1, day, hours, minutes, seconds)
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day ||
    d.getHours() !== hours ||
    d.getMinutes() !== minutes ||
    d.getSeconds() !== seconds
  ) {
    return null
  }
  return d
}

// Combine date + optional time fields into the canonical stored DOB string.
// If time is empty/invalid, defaults to midnight (date-only form).
export function composeDob(date: string, time: string): string {
  if (!date) return ''
  const trimmedTime = (time || '').trim()
  if (!/^\d{2}:\d{2}(?::\d{2})?$/.test(trimmedTime)) return date
  const [hh, mm, ss = '00'] = trimmedTime.split(':')
  return `${date}T${hh}:${mm}:${ss}`
}

export function computeAgeYears(dob: string, now: Date = new Date()): number {
  const birth = parseDob(dob)
  if (!birth) return 0
  let years = now.getFullYear() - birth.getFullYear()
  const hasHadBirthdayThisYear =
    now.getMonth() > birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate())
  if (!hasHadBirthdayThisYear) years--
  return years
}

export function computeTimeAlive(
  dob: string,
  now: Date = new Date()
): TimeAliveBreakdown | null {
  const birth = parseDob(dob)
  if (!birth) return null

  const totalMs = now.getTime() - birth.getTime()
  if (totalMs < 0) return null

  const years = computeAgeYears(dob, now)

  // Anchor the year boundary at the most recent birthday so the remaining
  // days/hours/minutes/seconds reflect time since that birthday.
  const lastBirthday = new Date(
    birth.getFullYear() + years,
    birth.getMonth(),
    birth.getDate(),
    birth.getHours(),
    birth.getMinutes(),
    birth.getSeconds()
  )
  let remainder = now.getTime() - lastBirthday.getTime()
  if (remainder < 0) remainder = 0

  const SECOND = 1000
  const MINUTE = 60 * SECOND
  const HOUR = 60 * MINUTE
  const DAY = 24 * HOUR

  const days = Math.floor(remainder / DAY)
  remainder -= days * DAY
  const hours = Math.floor(remainder / HOUR)
  remainder -= hours * HOUR
  const minutes = Math.floor(remainder / MINUTE)
  remainder -= minutes * MINUTE
  const seconds = Math.floor(remainder / SECOND)

  return {
    years,
    days,
    hours,
    minutes,
    seconds,
    totalSeconds: Math.floor(totalMs / SECOND),
  }
}

export interface DobValidation {
  ok: boolean
  error?: string
}

export function validateDob(dob: string, now: Date = new Date()): DobValidation {
  const birth = parseDob(dob)
  if (!birth) {
    return { ok: false, error: 'Please enter a valid date.' }
  }
  if (birth.getTime() > now.getTime()) {
    return { ok: false, error: 'Date of birth cannot be in the future.' }
  }
  const age = computeAgeYears(dob, now)
  if (age < MIN_AGE) {
    return { ok: false, error: `You must be at least ${MIN_AGE} years old.` }
  }
  if (age > MAX_AGE) {
    return { ok: false, error: 'Please enter a realistic date of birth.' }
  }
  return { ok: true }
}

export function formatTimeAlive(t: TimeAliveBreakdown): string {
  return `${t.years}y ${t.days}d ${String(t.hours).padStart(2, '0')}h ${String(t.minutes).padStart(2, '0')}m ${String(t.seconds).padStart(2, '0')}s`
}

export function maxDobInputValue(now: Date = new Date()): string {
  // Today as YYYY-MM-DD for an <input type="date"> max attribute.
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

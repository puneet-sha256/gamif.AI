import { useEffect, useMemo, useState } from 'react'
import './DateOfBirthPicker.css'

interface DateOfBirthPickerProps {
  value: string
  onChange: (date: string) => void
  idPrefix?: string
  required?: boolean
}

const MIN_AGE = 13
const MAX_AGE = 120

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

function daysInMonth(year: number, month: number): number {
  if (!year || !month) return 31
  return new Date(year, month, 0).getDate()
}

function splitDate(value: string): { year: string; month: string; day: string } {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return { year: '', month: '', day: '' }
  return { year: match[1], month: match[2], day: match[3] }
}

function pad(n: string): string {
  return n.padStart(2, '0')
}

function compose(year: string, month: string, day: string): string {
  if (!year || !month || !day) return ''
  return `${year}-${pad(month)}-${pad(day)}`
}

const DateOfBirthPicker: React.FC<DateOfBirthPickerProps> = ({
  value,
  onChange,
  idPrefix = 'dob',
  required = false,
}) => {
  const initial = splitDate(value)
  const [year, setYear] = useState(initial.year)
  const [month, setMonth] = useState(initial.month)
  const [day, setDay] = useState(initial.day)

  // Sync from prop only when the external value is a complete date that
  // differs from our internal composition (e.g., a form reset).
  useEffect(() => {
    if (compose(year, month, day) === value) return
    const parts = splitDate(value)
    if (parts.year && parts.month && parts.day) {
      setYear(parts.year)
      setMonth(parts.month)
      setDay(parts.day)
    } else if (!value) {
      setYear('')
      setMonth('')
      setDay('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const oldest = currentYear - MAX_AGE
    const youngest = currentYear - MIN_AGE
    const list: number[] = []
    for (let y = youngest; y >= oldest; y--) list.push(y)
    return list
  }, [])

  const maxDay = useMemo(
    () => daysInMonth(Number(year), Number(month)),
    [year, month]
  )

  const update = (nextYear: string, nextMonth: string, nextDay: string) => {
    // Clamp day to the month's actual length when year/month changes.
    const cap = daysInMonth(Number(nextYear), Number(nextMonth))
    const clampedDay = nextDay && Number(nextDay) > cap ? String(cap) : nextDay
    setYear(nextYear)
    setMonth(nextMonth)
    setDay(clampedDay)
    onChange(compose(nextYear, nextMonth, clampedDay))
  }

  return (
    <div className="dob-picker">
      <select
        id={`${idPrefix}-year`}
        className="dob-picker-select dob-picker-year"
        value={year}
        onChange={(e) => update(e.target.value, month, day)}
        required={required}
        aria-label="Year of birth"
      >
        <option value="" disabled>Year</option>
        {years.map(y => (
          <option key={y} value={String(y)}>{y}</option>
        ))}
      </select>

      <select
        id={`${idPrefix}-month`}
        className="dob-picker-select dob-picker-month"
        value={month}
        onChange={(e) => update(year, e.target.value, day)}
        required={required}
        aria-label="Month of birth"
      >
        <option value="" disabled>Month</option>
        {MONTHS.map((name, i) => (
          <option key={name} value={pad(String(i + 1))}>{name}</option>
        ))}
      </select>

      <select
        id={`${idPrefix}-day`}
        className="dob-picker-select dob-picker-day"
        value={day}
        onChange={(e) => update(year, month, e.target.value)}
        required={required}
        aria-label="Day of birth"
      >
        <option value="" disabled>Day</option>
        {Array.from({ length: maxDay }, (_, i) => i + 1).map(d => (
          <option key={d} value={pad(String(d))}>{d}</option>
        ))}
      </select>
    </div>
  )
}

export default DateOfBirthPicker

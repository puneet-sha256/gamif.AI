import { useMemo } from 'react'
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

const DateOfBirthPicker: React.FC<DateOfBirthPickerProps> = ({
  value,
  onChange,
  idPrefix = 'dob',
  required = false,
}) => {
  const { year, month, day } = splitDate(value)

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

  const emit = (nextYear: string, nextMonth: string, nextDay: string) => {
    if (!nextYear || !nextMonth || !nextDay) {
      onChange('')
      return
    }
    const clampedDay = Math.min(Number(nextDay), daysInMonth(Number(nextYear), Number(nextMonth)))
    onChange(`${nextYear}-${pad(nextMonth)}-${pad(String(clampedDay))}`)
  }

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    emit(e.target.value, month, day)
  }
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    emit(year, e.target.value, day)
  }
  const handleDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    emit(year, month, e.target.value)
  }

  return (
    <div className="dob-picker">
      <select
        id={`${idPrefix}-year`}
        className="dob-picker-select dob-picker-year"
        value={year}
        onChange={handleYearChange}
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
        onChange={handleMonthChange}
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
        onChange={handleDayChange}
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

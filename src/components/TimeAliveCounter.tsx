import { useEffect, useState } from 'react'
import { computeTimeAlive } from '../utils/timeAlive'
import './TimeAliveCounter.css'

interface TimeAliveCounterProps {
  dateOfBirth: string
}

const TimeAliveCounter: React.FC<TimeAliveCounterProps> = ({ dateOfBirth }) => {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const t = computeTimeAlive(dateOfBirth, now)
  if (!t) {
    return <span className="time-alive-counter time-alive-counter--invalid">—</span>
  }

  return (
    <span
      className="time-alive-counter"
      aria-label={`Time alive: ${t.years} years, ${t.days} days, ${t.hours} hours, ${t.minutes} minutes, ${t.seconds} seconds`}
    >
      <span className="time-alive-unit">
        <span className="time-alive-value">{t.years}</span>
        <span className="time-alive-label">y</span>
      </span>
      <span className="time-alive-unit">
        <span className="time-alive-value">{t.days}</span>
        <span className="time-alive-label">d</span>
      </span>
      <span className="time-alive-unit">
        <span className="time-alive-value">{String(t.hours).padStart(2, '0')}</span>
        <span className="time-alive-label">h</span>
      </span>
      <span className="time-alive-unit">
        <span className="time-alive-value">{String(t.minutes).padStart(2, '0')}</span>
        <span className="time-alive-label">m</span>
      </span>
      <span className="time-alive-unit time-alive-unit--seconds">
        <span className="time-alive-value">{String(t.seconds).padStart(2, '0')}</span>
        <span className="time-alive-label">s</span>
      </span>
    </span>
  )
}

export default TimeAliveCounter

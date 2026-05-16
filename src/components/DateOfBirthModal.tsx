import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { validateDob, maxDobInputValue, composeDob } from '../utils/timeAlive'
import './DateOfBirthModal.css'

interface DateOfBirthModalProps {
  isOpen: boolean
  existingName: string
}

const DateOfBirthModal: React.FC<DateOfBirthModalProps> = ({ isOpen, existingName }) => {
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { saveProfileData } = useAuth()

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const composed = composeDob(birthDate, birthTime)
    const validation = validateDob(composed)
    if (!validation.ok) {
      setError(validation.error || 'Invalid date of birth.')
      return
    }

    setIsSubmitting(true)
    setError('')
    try {
      const success = await saveProfileData({ name: existingName, dateOfBirth: composed })
      if (!success) {
        setError('Failed to save. Please try again.')
      }
    } catch (err) {
      console.error('DateOfBirthModal save error:', err)
      setError('Failed to save. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="dob-modal-overlay visible" role="dialog" aria-modal="true" aria-labelledby="dob-modal-title">
      <div className="dob-modal-container visible">
        <div className="dob-modal-icon" aria-hidden="true">⏳</div>
        <h2 id="dob-modal-title" className="dob-modal-title">One More Thing</h2>
        <p className="dob-modal-message">
          Tell us when you were born so we can show you the time you've been alive.
        </p>
        <form onSubmit={handleSubmit} className="dob-modal-form">
          {error && <div className="dob-modal-error">{error}</div>}

          <div className="dob-modal-field">
            <label htmlFor="dob-modal-date" className="dob-modal-label">
              Date of Birth
            </label>
            <input
              id="dob-modal-date"
              type="date"
              value={birthDate}
              max={maxDobInputValue()}
              onChange={(e) => { setBirthDate(e.target.value); if (error) setError('') }}
              required
              autoFocus
            />
          </div>

          <div className="dob-modal-field">
            <label htmlFor="dob-modal-time" className="dob-modal-label">
              Time of Birth <span className="dob-modal-optional">(optional — defaults to midnight)</span>
            </label>
            <input
              id="dob-modal-time"
              type="time"
              value={birthTime}
              onChange={(e) => { setBirthTime(e.target.value); if (error) setError('') }}
            />
          </div>

          <button
            type="submit"
            className={`dob-modal-button ${isSubmitting ? 'loading' : ''}`}
            disabled={isSubmitting || !birthDate}
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default DateOfBirthModal

import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import type { ProfileData } from '../types'
import FierceLogo from './FierceLogo'
import FierceThemeToggle from './FierceThemeToggle'
import { IconArrowRight, IconSparkle } from './FierceIcons'

interface Props {
  onComplete: (data: ProfileData) => void
}

export default function FierceProfileSetup({ onComplete }: Props) {
  const { saveProfileData } = useAuth()
  const [data, setData] = useState<ProfileData>({ name: '', age: 18 })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!data.name.trim()) return setError('Name is required.')
    if (data.age < 13 || data.age > 100) return setError('Age must be between 13 and 100.')
    setSubmitting(true); setError('')
    try {
      const ok = await saveProfileData(data)
      if (ok) onComplete(data)
      else setError('Could not save. Try again.')
    } catch {
      setError('Could not save. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fierce-app">
      <div className="fierce-page fierce-page--centered">
        <span className="fierce-orb fierce-orb--rose" style={{ width: 360, height: 360, top: -120, right: -120 }} />
        <span className="fierce-orb fierce-orb--amber" style={{ width: 240, height: 240, bottom: -100, left: -80 }} />
        <div className="fierce-dot-grid" />

        <div style={{ position: 'absolute', top: 24, left: 24, zIndex: 2 }}>
          <FierceLogo />
        </div>

        <div className="fierce-auth" style={{ maxWidth: 460 }}>
          <div className="fierce-steps">
            <span className="fierce-steps__dot fierce-steps__dot--active" />
            <span className="fierce-steps__dot" />
            <span className="fierce-steps__label">Step 1 of 2 · About you</span>
          </div>

          <div className="fierce-auth__head">
            <span className="fierce-eyebrow fierce-eyebrow--accent">PROFILE</span>
            <h1>Tell us about yourself <IconSparkle className="fierce-sparkle fierce-sparkle--amber" style={{ verticalAlign: -3, marginLeft: 4 }} /></h1>
            <p>This tunes the difficulty and tone of your missions.</p>
          </div>

          <form className="fierce-auth__form" onSubmit={handleSubmit}>
            {error && <div className="fierce-error">{error}</div>}
            <div className="fierce-field">
              <label className="fierce-field__label" htmlFor="fp-name">Name</label>
              <input id="fp-name" className="fierce-input" type="text" value={data.name}
                onChange={(e) => setData({ ...data, name: e.target.value })} placeholder="What should we call you?" minLength={2} maxLength={50} required />
            </div>
            <div className="fierce-field">
              <label className="fierce-field__label" htmlFor="fp-age">Age</label>
              <input id="fp-age" className="fierce-input" type="number" min={13} max={100} value={data.age}
                onChange={(e) => setData({ ...data, age: Number(e.target.value) })} required />
              <span className="fierce-field__hint">Used only to keep recommendations age-appropriate.</span>
            </div>
            <button type="submit" className="fierce-btn fierce-btn--fierce fierce-btn--lg fierce-btn--block fierce-mt-2" disabled={submitting}>
              {submitting ? 'Saving…' : <>Continue <IconArrowRight /></>}
            </button>
          </form>
        </div>

        <FierceThemeToggle />
      </div>
    </div>
  )
}

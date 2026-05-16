import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import type { GoalsData } from '../types'
import FierceLogo from './FierceLogo'
import FierceThemeToggle from './FierceThemeToggle'
import { IconBack, IconBolt, IconSparkle } from './FierceIcons'

interface Props {
  onComplete: (data: GoalsData) => void
  onBack: () => void
}

export default function FierceGoalsSetup({ onComplete, onBack }: Props) {
  const { saveGoalsData } = useAuth()
  const [data, setData] = useState<GoalsData>({ longTermGoals: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!data.longTermGoals.trim()) return setError('Tell us what you want to become.')
    if (data.longTermGoals.trim().length < 50) return setError('Be more specific — at least 50 characters.')
    setSubmitting(true); setError(''); setStatus('Saving goals…')
    try {
      const ok = await saveGoalsData(data)
      if (ok) {
        setStatus('Goals saved. Generating your missions…')
        setTimeout(() => onComplete(data), 700)
      } else {
        setError('Could not save. Try again.'); setStatus('')
      }
    } catch {
      setError('Could not save. Try again.'); setStatus('')
    } finally {
      setSubmitting(false)
    }
  }

  const length = data.longTermGoals.length
  const valid = data.longTermGoals.trim().length >= 50

  return (
    <div className="fierce-app">
      <div className="fierce-page fierce-page--centered">
        <span className="fierce-orb fierce-orb--rose" style={{ width: 380, height: 380, top: -120, left: -120 }} />
        <span className="fierce-orb fierce-orb--amber" style={{ width: 320, height: 320, bottom: -120, right: -60 }} />
        <div className="fierce-dot-grid" />

        <div style={{ position: 'absolute', top: 24, left: 24, zIndex: 2 }}>
          <FierceLogo />
        </div>

        <div className="fierce-auth" style={{ maxWidth: 640 }}>
          <div className="fierce-steps">
            <span className="fierce-steps__dot fierce-steps__dot--done" />
            <span className="fierce-steps__dot fierce-steps__dot--active" />
            <span className="fierce-steps__label">Step 2 of 2 · What you're aiming for</span>
          </div>

          <div className="fierce-auth__head">
            <span className="fierce-eyebrow fierce-eyebrow--accent">GOALS</span>
            <h1>What do you want to become? <IconSparkle className="fierce-sparkle" style={{ verticalAlign: -3, marginLeft: 4 }} /></h1>
            <p>Be specific. The clearer the goal, the harder the AI can push you.</p>
          </div>

          <form className="fierce-auth__form" onSubmit={handleSubmit}>
            {error && <div className="fierce-error">{error}</div>}
            {status && <div className="fierce-success">{status}</div>}

            <div className="fierce-field">
              <label className="fierce-field__label" htmlFor="fg-goals">Describe your long-term goals</label>
              <textarea
                id="fg-goals"
                className="fierce-textarea"
                rows={10}
                value={data.longTermGoals}
                onChange={(e) => setData({ longTermGoals: e.target.value })}
                placeholder={'Examples:\n• Run a half-marathon in under 2 hours by November\n• Get fluent enough in Spanish for a 30-min conversation\n• Ship the v1 of my side project — landing page, payments, first 10 paid users\n• Read one non-fiction book per month'}
                minLength={50}
                maxLength={2000}
                required
              />
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                <strong style={{ color: valid ? 'var(--success)' : 'var(--text-secondary)' }}>{length}</strong> / 2000 · minimum 50 characters
              </div>
            </div>

            <div className="fierce-row fierce-row--between fierce-mt-2">
              <button type="button" className="fierce-btn fierce-btn--ghost" onClick={onBack} disabled={submitting}>
                <IconBack /> Back
              </button>
              <button type="submit" className="fierce-btn fierce-btn--fierce" disabled={submitting || !valid}>
                {submitting ? 'Generating…' : <><IconBolt /> Generate my plan</>}
              </button>
            </div>
          </form>
        </div>

        <FierceThemeToggle />
      </div>
    </div>
  )
}

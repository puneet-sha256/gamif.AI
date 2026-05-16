import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useAlert } from '../contexts/AlertContext'
import { userDatabase } from '../client/services/fileUserDatabase'
import { aiService } from '../client/services/aiService'
import { IconClose, IconAI, IconBolt } from './FierceIcons'

interface Props {
  onClose: () => void
}

export default function FierceActivityModal({ onClose }: Props) {
  const { user, refreshUserTasks } = useAuth()
  const { showSuccess, showError, showInfo } = useAlert()
  const [activityText, setActivityText] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [analyzing, setAnalyzing] = useState(false)

  // Soft-cancel: if the user closes during analyze, we ignore the response.
  const cancelledRef = useRef(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { cancelledRef.current = true; onClose() } }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const softClose = () => { cancelledRef.current = true; onClose() }

  const handleAnalyze = async () => {
    if (!activityText.trim()) {
      showError('Tell us what you did first.')
      return
    }
    // Guard: don't accept future dates even if the input is manipulated
    const todayIso = new Date().toISOString().split('T')[0]
    if (date > todayIso) {
      showError('Activity date cannot be in the future.')
      return
    }
    setAnalyzing(true)
    try {
      const sessionId = userDatabase.getSessionId()
      if (!sessionId) {
        showError('Session expired. Please log in again.')
        return
      }
      const currentTasks = user?.generatedTasks
        ? {
            Strength: user.generatedTasks.Strength?.map((t) => ({
              id: t.id,
              title: t.title || '',
              description: t.description,
              category: 'Strength' as const,
              expected_duration_minutes: t.expected_duration_minutes,
              xp: t.xp,
              shards: t.shards,
            })),
            Intelligence: user.generatedTasks.Intelligence?.map((t) => ({
              id: t.id,
              title: t.title || '',
              description: t.description,
              category: 'Intelligence' as const,
              expected_duration_minutes: t.expected_duration_minutes,
              xp: t.xp,
              shards: t.shards,
            })),
            Charisma: user.generatedTasks.Charisma?.map((t) => ({
              id: t.id,
              title: t.title || '',
              description: t.description,
              category: 'Charisma' as const,
              expected_duration_minutes: t.expected_duration_minutes,
              xp: t.xp,
              shards: t.shards,
            })),
          }
        : undefined

      const result = await aiService.analyzeDailyActivity({
        sessionId,
        dailyActivity: activityText,
        currentTasks,
        activityDate: date,
      })

      // If the user cancelled while we were waiting, ignore the result.
      if (cancelledRef.current) return

      if (result.success && result.data) {
        if (result.data.rewards?.activityRewards && result.data.rewards.activityRewards.length > 0) {
          await refreshUserTasks()
          showSuccess(`🔥 Earned rewards from ${result.data.rewards.activityRewards.length} activities. Open the rewards panel to claim.`)
        } else {
          showInfo('Nothing matched your missions in that update. Try logging something more specific.')
        }
        onClose()
      } else {
        showError(`Analysis failed: ${result.message}`)
      }
    } catch (e) {
      if (!cancelledRef.current) showError('Could not analyze activity. Try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="fierce-modal-back" onClick={(e) => { if (e.target === e.currentTarget) softClose() }}>
      <div className="fierce-modal" role="dialog" aria-modal="true" aria-labelledby="fierce-activity-modal-title" style={{ maxWidth: 540 }}>
        <div className="fierce-modal__head">
          <div>
            <span className="fierce-eyebrow fierce-eyebrow--accent">DEBRIEF</span>
            <div id="fierce-activity-modal-title" className="fierce-modal__title" style={{ marginTop: 4 }}>What did you do today?</div>
            <p className="fierce-muted" style={{ fontSize: 12.5, marginTop: 4 }}>Plain English. AI scores it against your missions.</p>
          </div>
          <button className="fierce-icon-btn" onClick={softClose} aria-label="Close"><IconClose /></button>
        </div>
        <div className="fierce-modal__body">
          <div className="fierce-field">
            <label className="fierce-field__label" htmlFor="fa-date">Activity date</label>
            <input id="fa-date" className="fierce-input" type="date" value={date} max={new Date().toISOString().split('T')[0]} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="fierce-field">
            <label className="fierce-field__label" htmlFor="fa-text">What did you do?</label>
            <textarea
              id="fa-text"
              className="fierce-textarea"
              rows={6}
              value={activityText}
              onChange={(e) => setActivityText(e.target.value)}
              placeholder={'Examples:\n• Ran 3 km, then did push-ups to failure\n• Read 30 minutes of "Atomic Habits"\n• Called mom for 20 minutes\n• Shipped the auth refactor PR'}
            />
            <span className="fierce-field__hint">{activityText.length} characters</span>
          </div>
        </div>
        <div className="fierce-modal__foot">
          <button className="fierce-btn fierce-btn--ghost" onClick={softClose}>
            Cancel
          </button>
          <button className="fierce-btn fierce-btn--fierce" onClick={handleAnalyze} disabled={analyzing}>
            {analyzing ? <><IconAI /> Analyzing…</> : <><IconBolt /> Analyze & reward</>}
          </button>
        </div>
      </div>
    </div>
  )
}

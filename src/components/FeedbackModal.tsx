import { useEffect, useRef, useState } from 'react'
import type { BugSeverity, FeedbackSubmission, FeedbackType } from '../shared/types'
import { feedbackService } from '../client/services/feedbackService'
import './FeedbackModal.css'

interface FeedbackModalProps {
  isOpen: boolean
  sessionId: string | null
  onClose: () => void
  onSubmitted: (message: string) => void
}

const BUG_CATEGORIES = ['Authentication', 'Tasks & AI', 'Rewards & XP', 'Shop & Inventory', 'Journey', 'Guild', 'Performance', 'Accessibility', 'Other']
const FEATURE_CATEGORIES = ['Tasks & AI', 'Rewards & XP', 'Shop & Inventory', 'Journey', 'Guild', 'Analytics', 'Accessibility', 'Other']

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, sessionId, onClose, onSubmitted }) => {
  const [type, setType] = useState<FeedbackType>('bug')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(BUG_CATEGORIES[0])
  const [severity, setSeverity] = useState<BugSeverity>('medium')
  const [description, setDescription] = useState('')
  const [stepsToReproduce, setStepsToReproduce] = useState('')
  const [expectedBehavior, setExpectedBehavior] = useState('')
  const [actualBehavior, setActualBehavior] = useState('')
  const [proposedSolution, setProposedSolution] = useState('')
  const [userBenefit, setUserBenefit] = useState('')
  const [contactAllowed, setContactAllowed] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const dialogRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const isSubmittingRef = useRef(false)
  isSubmittingRef.current = isSubmitting

  useEffect(() => {
    if (!isOpen) return
    setType('bug')
    setTitle('')
    setCategory(BUG_CATEGORIES[0])
    setSeverity('medium')
    setDescription('')
    setStepsToReproduce('')
    setExpectedBehavior('')
    setActualBehavior('')
    setProposedSolution('')
    setUserBenefit('')
    setContactAllowed(true)
    setError('')
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const opener = document.activeElement as HTMLElement | null
    const background = document.querySelectorAll<HTMLElement>(
      '.dashboard-header, .dashboard-navigation, .dashboard-content'
    )
    background.forEach(element => {
      element.setAttribute('inert', '')
      element.setAttribute('aria-hidden', 'true')
    })
    closeButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmittingRef.current) {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
      ))
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      background.forEach(element => {
        element.removeAttribute('inert')
        element.removeAttribute('aria-hidden')
      })
      opener?.focus()
    }
  }, [isOpen, onClose])

  const changeType = (nextType: FeedbackType) => {
    setType(nextType)
    setCategory(nextType === 'bug' ? BUG_CATEGORIES[0] : FEATURE_CATEGORIES[0])
    setError('')
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (!sessionId) {
      setError('Your session has expired. Sign in again before submitting feedback.')
      return
    }

    const diagnostics = {
      pageUrl: window.location.href,
      userAgent: window.navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      language: window.navigator.language || 'unknown',
      platform: window.navigator.platform || 'unknown',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
    }
    const payload: FeedbackSubmission = {
      sessionId,
      type,
      title: title.trim(),
      description: description.trim(),
      category,
      contactAllowed,
      diagnostics,
      ...(type === 'bug'
        ? {
            severity,
            stepsToReproduce: stepsToReproduce.trim(),
            expectedBehavior: expectedBehavior.trim(),
            actualBehavior: actualBehavior.trim(),
          }
        : {
            proposedSolution: proposedSolution.trim() || undefined,
            userBenefit: userBenefit.trim(),
          }),
    }

    setIsSubmitting(true)
    try {
      const receipt = await feedbackService.submitReport(payload)
      onSubmitted(`Feedback sent successfully. Reference: ${receipt.reportId}`)
      onClose()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not send feedback.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null
  const categories = type === 'bug' ? BUG_CATEGORIES : FEATURE_CATEGORIES

  return (
    <div className="feedback-overlay" onMouseDown={event => {
      if (event.target === event.currentTarget && !isSubmitting) onClose()
    }}>
      <section ref={dialogRef} className="feedback-modal" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
        <header className="feedback-header">
          <div>
            <p>HELP IMPROVE GAMIF.AI</p>
            <h2 id="feedback-title">Report a bug or request a feature</h2>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} disabled={isSubmitting} aria-label="Close feedback form">×</button>
        </header>

        <form onSubmit={submit}>
          {error && <div className="feedback-error" role="alert">{error}</div>}

          <fieldset className="feedback-type-switch">
            <legend>Feedback type</legend>
            <button type="button" className={type === 'bug' ? 'active' : ''} onClick={() => changeType('bug')}>🐞 Bug report</button>
            <button type="button" className={type === 'feature' ? 'active' : ''} onClick={() => changeType('feature')}>✨ Feature request</button>
          </fieldset>

          <div className="feedback-grid">
            <label>
              Title *
              <input value={title} minLength={5} maxLength={120} required placeholder={type === 'bug' ? 'Briefly describe what went wrong' : 'Name your improvement idea'} onChange={event => setTitle(event.target.value)} />
            </label>
            <label>
              Category *
              <select value={category} onChange={event => setCategory(event.target.value)}>
                {categories.map(option => <option key={option}>{option}</option>)}
              </select>
            </label>
            {type === 'bug' && (
              <label>
                Severity *
                <select value={severity} onChange={event => setSeverity(event.target.value as BugSeverity)}>
                  <option value="low">Low — cosmetic or minor</option>
                  <option value="medium">Medium — feature is difficult to use</option>
                  <option value="high">High — important feature is blocked</option>
                  <option value="critical">Critical — data loss or app unusable</option>
                </select>
              </label>
            )}
          </div>

          <label>
            {type === 'bug' ? 'What happened?' : 'What problem should this feature solve?'} *
            <textarea value={description} minLength={20} maxLength={5000} rows={4} required placeholder="Include enough context to understand the situation and why it matters." onChange={event => setDescription(event.target.value)} />
          </label>

          {type === 'bug' ? (
            <>
              <label>
                Steps to reproduce *
                <textarea value={stepsToReproduce} minLength={10} maxLength={5000} rows={4} required placeholder={'1. Open...\n2. Select...\n3. Observe...'} onChange={event => setStepsToReproduce(event.target.value)} />
              </label>
              <div className="feedback-grid">
                <label>
                  Expected behavior *
                  <textarea value={expectedBehavior} minLength={10} maxLength={3000} rows={3} required onChange={event => setExpectedBehavior(event.target.value)} />
                </label>
                <label>
                  Actual behavior *
                  <textarea value={actualBehavior} minLength={10} maxLength={3000} rows={3} required onChange={event => setActualBehavior(event.target.value)} />
                </label>
              </div>
            </>
          ) : (
            <>
              <label>
                Who benefits and how? *
                <textarea value={userBenefit} minLength={10} maxLength={3000} rows={3} required onChange={event => setUserBenefit(event.target.value)} />
              </label>
              <label>
                Suggested solution (optional)
                <textarea value={proposedSolution} maxLength={5000} rows={3} onChange={event => setProposedSolution(event.target.value)} />
              </label>
            </>
          )}

          <label className="feedback-consent">
            <input type="checkbox" checked={contactAllowed} onChange={event => setContactAllowed(event.target.checked)} />
            You may contact me at my account email for clarification.
          </label>

          <div className="diagnostics-note">
            Browser, device, viewport, language, timezone, current page, account username,
            and report time are attached automatically. Passwords and activity details are never included.
          </div>

          <footer className="feedback-actions">
            <button type="button" className="feedback-cancel" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button type="submit" className="feedback-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Sending…' : `Send ${type === 'bug' ? 'bug report' : 'feature request'}`}
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}

export default FeedbackModal

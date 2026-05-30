import React, { useEffect, useState } from 'react'
import { intakeService } from '../client/services/intakeService'
import { userDatabase } from '../client/services/fileUserDatabase'
import { useAlert } from '../contexts/AlertContext'
import type {
  IntakeCard,
  IntakeAnswer,
  IntakeSummaryItem,
  IntakeCorrection,
} from '../shared/types'
import './IntakeCalibration.css'

type Phase = 'intro' | 'loading_questions' | 'cards' | 'submitting' | 'summary' | 'confirming'

interface IntakeCalibrationProps {
  /** Called once the catalog is committed and the modal should disappear. */
  onComplete: () => void
}

const DIFFICULTY_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: 'Very easy for me' },
  { value: 2, label: 'Manageable' },
  { value: 3, label: 'Moderate' },
  { value: 4, label: 'Challenging' },
  { value: 5, label: 'Very challenging' },
]

const IntakeCalibration: React.FC<IntakeCalibrationProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<Phase>('intro')
  const [cards, setCards] = useState<IntakeCard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, IntakeAnswer>>({})
  const [summary, setSummary] = useState<IntakeSummaryItem[]>([])
  const [corrections, setCorrections] = useState<Record<string, number>>({})
  const [visible, setVisible] = useState(false)
  const { showError } = useAlert()

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  // ─── Phase transitions ──────────────────────────────────────────────

  const handleBegin = async () => {
    const sessionId = userDatabase.getSessionId()
    if (!sessionId) {
      showError('Session expired. Please log in again.')
      return
    }

    setPhase('loading_questions')
    try {
      const fetched = await intakeService.generateQuestions(sessionId)
      setCards(fetched)
      setCurrentIndex(0)
      setPhase('cards')
    } catch (err) {
      console.error('Failed to load intake questions:', err)
      showError('Couldn\'t load the calibration questions. Please try again.')
      setPhase('intro')
    }
  }

  const handleSubmit = async () => {
    const sessionId = userDatabase.getSessionId()
    if (!sessionId) {
      showError('Session expired. Please log in again.')
      return
    }

    setPhase('submitting')
    try {
      // Preserve card order in the answers payload
      const orderedAnswers = cards
        .map(c => answers[c.id])
        .filter((a): a is IntakeAnswer => Boolean(a))

      const result = await intakeService.submitAnswers(sessionId, orderedAnswers)
      setSummary(result.summary)
      setCorrections({})
      setPhase('summary')
    } catch (err) {
      console.error('Failed to submit intake:', err)
      showError('Couldn\'t process your answers. Please try again.')
      setPhase('cards')
    }
  }

  const handleConfirm = async () => {
    const sessionId = userDatabase.getSessionId()
    if (!sessionId) {
      showError('Session expired. Please log in again.')
      return
    }

    setPhase('confirming')
    try {
      const correctionList: IntakeCorrection[] = Object.entries(corrections).map(
        ([signature, new_difficulty]) => ({ signature, new_difficulty })
      )
      await intakeService.confirmIntake(sessionId, correctionList)
      setVisible(false)
      // Allow exit animation to play before unmounting
      setTimeout(onComplete, 250)
    } catch (err) {
      console.error('Failed to confirm intake:', err)
      showError('Couldn\'t save your calibration. Please try again.')
      setPhase('summary')
    }
  }

  // ─── Per-card answer updates ────────────────────────────────────────

  const setSelectedOption = (cardId: string, value: string) => {
    const card = cards.find(c => c.id === cardId)
    if (!card) return
    setAnswers(prev => ({
      ...prev,
      [cardId]: {
        ...(prev[cardId] ?? { card_id: cardId, question: card.question, goal_id: card.goal_id }),
        selected_option: value,
      },
    }))
  }

  const setFreeText = (cardId: string, text: string) => {
    const card = cards.find(c => c.id === cardId)
    if (!card) return
    setAnswers(prev => ({
      ...prev,
      [cardId]: {
        ...(prev[cardId] ?? { card_id: cardId, question: card.question, goal_id: card.goal_id }),
        free_text: text,
      },
    }))
  }

  const setCorrection = (signature: string, newDifficulty: number) => {
    setCorrections(prev => ({ ...prev, [signature]: newDifficulty }))
  }

  const goNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(i => i + 1)
    } else {
      handleSubmit()
    }
  }

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex(i => i - 1)
  }

  // ─── Render helpers ─────────────────────────────────────────────────

  const renderIntro = () => (
    <div className="intake-card intake-intro">
      <h2 className="intake-title">Personalise your rewards</h2>
      <p className="intake-subtitle">
        We&apos;ll ask 12 quick questions about your goals to tune the XP and shards you earn for each activity.
        Takes about 5 minutes. You can skip the options and type your own answer at any time.
      </p>
      <button className="intake-btn intake-btn-primary" onClick={handleBegin}>
        Begin →
      </button>
    </div>
  )

  const renderLoading = (label: string) => (
    <div className="intake-card intake-loading">
      <div className="intake-spinner" />
      <p className="intake-loading-label">{label}</p>
    </div>
  )

  const renderCard = () => {
    if (cards.length === 0) return null
    const card = cards[currentIndex]
    const answer = answers[card.id]
    const hasOption = !!answer?.selected_option
    const hasText = !!answer?.free_text && answer.free_text.trim().length > 0
    const canContinue = hasOption || hasText
    const isLast = currentIndex === cards.length - 1

    return (
      <div className="intake-card intake-question-card">
        <div className="intake-progress">
          <div className="intake-progress-track">
            <div
              className="intake-progress-fill"
              style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
            />
          </div>
          <span className="intake-progress-text">
            {currentIndex + 1} of {cards.length}
          </span>
        </div>

        <h3 className="intake-question">{card.question}</h3>

        <div className="intake-options" role="radiogroup">
          {card.options.map(opt => (
            <label
              key={opt.value}
              className={`intake-option ${answer?.selected_option === opt.value ? 'selected' : ''}`}
            >
              <input
                type="radio"
                name={card.id}
                value={opt.value}
                checked={answer?.selected_option === opt.value}
                onChange={() => setSelectedOption(card.id, opt.value)}
              />
              <span className="intake-option-label">{opt.label}</span>
            </label>
          ))}
        </div>

        <textarea
          className="intake-freetext"
          placeholder={card.free_text_placeholder || 'None of these quite fit? Or want to add detail? Type here…'}
          value={answer?.free_text ?? ''}
          onChange={e => setFreeText(card.id, e.target.value.slice(0, 300))}
          rows={3}
        />
        <div className="intake-char-count">
          {(answer?.free_text?.length ?? 0)} / 300
        </div>

        <div className="intake-actions">
          <button
            className="intake-btn intake-btn-secondary"
            onClick={goPrev}
            disabled={currentIndex === 0}
          >
            ← Previous
          </button>
          <button
            className="intake-btn intake-btn-primary"
            onClick={goNext}
            disabled={!canContinue}
          >
            {isLast ? 'Submit →' : 'Next →'}
          </button>
        </div>
      </div>
    )
  }

  const renderSummary = () => (
    <div className="intake-card intake-summary-card">
      <h3 className="intake-title">Here&apos;s what we understood</h3>
      <p className="intake-subtitle">
        Tap any row to correct it. Otherwise, hit Confirm and we&apos;ll set up your personal rewards.
      </p>

      <div className="intake-summary-list">
        {summary.length === 0 && (
          <p className="intake-summary-empty">No specific signals extracted — using category defaults for everything.</p>
        )}
        {summary.map(item => {
          const corrected = corrections[item.signature] ?? item.difficulty
          return (
            <div key={item.signature} className="intake-summary-item">
              <div className="intake-summary-label">{item.display_label}</div>
              <select
                className="intake-summary-select"
                value={corrected}
                onChange={e => setCorrection(item.signature, Number(e.target.value))}
              >
                {DIFFICULTY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )
        })}
      </div>

      <div className="intake-actions">
        <button className="intake-btn intake-btn-primary" onClick={handleConfirm}>
          Confirm →
        </button>
      </div>
    </div>
  )

  // ─── Main render ────────────────────────────────────────────────────

  return (
    <div className={`intake-overlay ${visible ? 'visible' : ''}`}>
      <div className={`intake-container ${visible ? 'visible' : ''}`}>
        {phase === 'intro' && renderIntro()}
        {phase === 'loading_questions' && renderLoading('Generating your questions…')}
        {phase === 'cards' && renderCard()}
        {phase === 'submitting' && renderLoading('Building your personal catalog…')}
        {phase === 'summary' && renderSummary()}
        {phase === 'confirming' && renderLoading('Saving your calibration…')}
      </div>
    </div>
  )
}

export default IntakeCalibration

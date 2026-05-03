import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import './OnboardingTour.css'

export type TourTabKey = 'profile' | 'tasks' | 'inventory' | 'shop'

export interface TourStep {
  // The data-tour attribute value to anchor on. Empty string = centered modal (no anchor).
  key: string
  // Tab the anchor lives on. Tour will switch to this tab before showing the step.
  tab?: TourTabKey
  title: string
  body: ReactNode
}

interface OnboardingTourProps {
  isOpen: boolean
  steps: TourStep[]
  activeTab: TourTabKey
  onTabChange: (tab: TourTabKey) => void
  onComplete: () => void
  onSkip: () => void
}

interface CardPosition {
  top: number
  left: number
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center'
}

const DESKTOP_BREAKPOINT = 768
const SPOTLIGHT_PAD = 8
const CARD_MARGIN = 12

function computeDesktopPosition(
  anchorRect: DOMRect,
  cardWidth: number,
  cardHeight: number,
  vw: number,
  vh: number
): CardPosition {
  const spaceTop = anchorRect.top
  const spaceBottom = vh - anchorRect.bottom
  const spaceRight = vw - anchorRect.right
  const spaceLeft = anchorRect.left

  let placement: CardPosition['placement'] = 'bottom'
  if (spaceBottom >= cardHeight + CARD_MARGIN) placement = 'bottom'
  else if (spaceTop >= cardHeight + CARD_MARGIN) placement = 'top'
  else if (spaceRight >= cardWidth + CARD_MARGIN) placement = 'right'
  else if (spaceLeft >= cardWidth + CARD_MARGIN) placement = 'left'
  else placement = 'bottom'

  let top = 0
  let left = 0

  switch (placement) {
    case 'bottom':
      top = anchorRect.bottom + CARD_MARGIN
      left = anchorRect.left + anchorRect.width / 2 - cardWidth / 2
      break
    case 'top':
      top = anchorRect.top - cardHeight - CARD_MARGIN
      left = anchorRect.left + anchorRect.width / 2 - cardWidth / 2
      break
    case 'right':
      top = anchorRect.top + anchorRect.height / 2 - cardHeight / 2
      left = anchorRect.right + CARD_MARGIN
      break
    case 'left':
      top = anchorRect.top + anchorRect.height / 2 - cardHeight / 2
      left = anchorRect.left - cardWidth - CARD_MARGIN
      break
    default:
      break
  }

  // Clamp inside viewport
  left = Math.max(CARD_MARGIN, Math.min(left, vw - cardWidth - CARD_MARGIN))
  top = Math.max(CARD_MARGIN, Math.min(top, vh - cardHeight - CARD_MARGIN))

  return { top, left, placement }
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({
  isOpen,
  steps,
  activeTab,
  onTabChange,
  onComplete,
  onSkip,
}) => {
  const [stepIdx, setStepIdx] = useState(0)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
  const [cardPos, setCardPos] = useState<CardPosition>({ top: 0, left: 0, placement: 'center' })
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  )
  const cardRef = useRef<HTMLDivElement>(null)

  const step = steps[stepIdx]
  const isLastStep = stepIdx === steps.length - 1
  const isMobile = viewportWidth < DESKTOP_BREAKPOINT

  // Reset to step 0 whenever the tour opens fresh
  useEffect(() => {
    if (isOpen) setStepIdx(0)
  }, [isOpen])

  // Switch tab when the current step asks for it
  useEffect(() => {
    if (!isOpen || !step) return
    if (step.tab && step.tab !== activeTab) {
      onTabChange(step.tab)
    }
  }, [isOpen, stepIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  const measureAnchor = useCallback(() => {
    if (!step || !step.key) {
      setAnchorRect(null)
      return
    }
    const el = document.querySelector(`[data-tour="${step.key}"]`) as HTMLElement | null
    if (!el) {
      setAnchorRect(null)
      return
    }
    const rect = el.getBoundingClientRect()
    setAnchorRect(rect)

    // Scroll into view if anchor is partially or fully off-screen
    const buffer = 80
    if (rect.top < buffer || rect.bottom > window.innerHeight - buffer) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [step])

  // Re-measure on step change. Two RAFs let the tab content render first.
  useEffect(() => {
    if (!isOpen) return
    let frame1 = 0
    let frame2 = 0
    frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(measureAnchor)
    })
    return () => {
      cancelAnimationFrame(frame1)
      cancelAnimationFrame(frame2)
    }
  }, [isOpen, stepIdx, measureAnchor])

  // Re-measure on resize / scroll
  useEffect(() => {
    if (!isOpen) return
    const onResize = () => {
      setViewportWidth(window.innerWidth)
      measureAnchor()
    }
    const onScroll = () => measureAnchor()
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [isOpen, measureAnchor])

  // Compute card position after layout (so we know card's actual height)
  useLayoutEffect(() => {
    if (!isOpen) return
    const card = cardRef.current
    if (!card) return

    const vw = window.innerWidth
    const vh = window.innerHeight

    if (isMobile) {
      // Mobile: card is pinned to bottom via CSS — no JS positioning needed.
      setCardPos({ top: 0, left: 0, placement: 'center' })
      return
    }

    if (!anchorRect) {
      // No anchor → centered modal
      const cardRect = card.getBoundingClientRect()
      setCardPos({
        top: Math.max(CARD_MARGIN, vh / 2 - cardRect.height / 2),
        left: Math.max(CARD_MARGIN, vw / 2 - cardRect.width / 2),
        placement: 'center',
      })
      return
    }

    const cardRect = card.getBoundingClientRect()
    setCardPos(computeDesktopPosition(anchorRect, cardRect.width, cardRect.height, vw, vh))
  }, [isOpen, stepIdx, anchorRect, isMobile])

  const handleNext = useCallback(() => {
    if (isLastStep) onComplete()
    else setStepIdx((i) => i + 1)
  }, [isLastStep, onComplete])

  const handleBack = useCallback(() => {
    setStepIdx((i) => Math.max(0, i - 1))
  }, [])

  const handleSkip = useCallback(() => {
    onSkip()
  }, [onSkip])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleSkip()
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault()
        handleNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handleBack()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, handleNext, handleBack, handleSkip])

  // Focus the card on each step for screen readers
  useEffect(() => {
    if (!isOpen) return
    cardRef.current?.focus()
  }, [isOpen, stepIdx])

  if (!isOpen || !step) return null

  const cardStyle = isMobile
    ? undefined
    : { top: `${cardPos.top}px`, left: `${cardPos.left}px` }

  return (
    <div className="onboarding-tour" role="presentation">
      {/* Backdrop with optional spotlight cutout */}
      <svg
        className="onboarding-tour__spotlight"
        aria-hidden="true"
        width="100%"
        height="100%"
      >
        <defs>
          <mask id="onboarding-tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {anchorRect && (
              <rect
                x={Math.max(0, anchorRect.left - SPOTLIGHT_PAD)}
                y={Math.max(0, anchorRect.top - SPOTLIGHT_PAD)}
                width={anchorRect.width + SPOTLIGHT_PAD * 2}
                height={anchorRect.height + SPOTLIGHT_PAD * 2}
                rx={10}
                ry={10}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.55)"
          mask="url(#onboarding-tour-mask)"
        />
      </svg>

      {/* Highlight ring around anchor */}
      {anchorRect && (
        <div
          className="onboarding-tour__ring"
          style={{
            top: `${Math.max(0, anchorRect.top - SPOTLIGHT_PAD)}px`,
            left: `${Math.max(0, anchorRect.left - SPOTLIGHT_PAD)}px`,
            width: `${anchorRect.width + SPOTLIGHT_PAD * 2}px`,
            height: `${anchorRect.height + SPOTLIGHT_PAD * 2}px`,
          }}
          aria-hidden="true"
        />
      )}

      {/* Tooltip card */}
      <div
        ref={cardRef}
        className={`onboarding-tour__card onboarding-tour__card--${
          isMobile ? 'mobile' : cardPos.placement
        }`}
        style={cardStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-tour-title"
        aria-describedby="onboarding-tour-body"
        tabIndex={-1}
      >
        <div className="onboarding-tour__header">
          <span className="onboarding-tour__step-count">
            Step {stepIdx + 1} of {steps.length}
          </span>
          <button
            type="button"
            className="onboarding-tour__close"
            onClick={handleSkip}
            aria-label="Close tour"
          >
            ×
          </button>
        </div>

        <h3 id="onboarding-tour-title" className="onboarding-tour__title">
          {step.title}
        </h3>
        <div id="onboarding-tour-body" className="onboarding-tour__body">
          {step.body}
        </div>

        <div className="onboarding-tour__footer">
          <button
            type="button"
            className="onboarding-tour__skip"
            onClick={handleSkip}
          >
            Skip tour
          </button>

          <div className="onboarding-tour__dots" aria-hidden="true">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`onboarding-tour__dot ${
                  i === stepIdx ? 'onboarding-tour__dot--active' : ''
                } ${i < stepIdx ? 'onboarding-tour__dot--past' : ''}`}
              />
            ))}
          </div>

          <div className="onboarding-tour__nav">
            {stepIdx > 0 && (
              <button
                type="button"
                className="onboarding-tour__back"
                onClick={handleBack}
              >
                Back
              </button>
            )}
            <button
              type="button"
              className="onboarding-tour__next"
              onClick={handleNext}
            >
              {isLastStep ? 'Start playing' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OnboardingTour

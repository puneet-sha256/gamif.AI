import React, { useState } from 'react'
import './RewardClaimModal.css'
import type { UnclaimedRewards, CatalogVote } from '../shared/types/user.types'
import { soundEffects } from '../utils/soundEffects'
import { feedbackService } from '../client/services/feedbackService'
import { userDatabase } from '../client/services/fileUserDatabase'
import { useAlert } from '../contexts/AlertContext'

interface RewardClaimModalProps {
  isOpen: boolean
  onClose: () => void
  unclaimedRewards: UnclaimedRewards | null
  onClaimRewards: () => void
  onClaimIndividualReward: (index: number) => void
  isClaiming: boolean
}

const RewardClaimModal: React.FC<RewardClaimModalProps> = ({
  isOpen,
  onClose,
  unclaimedRewards,
  onClaimRewards,
  onClaimIndividualReward,
  isClaiming
}) => {
  const [claimingIndex, setClaimingIndex] = useState<number | null>(null)
  // Per-row feedback state: maps signature → selected vote (or 'sending').
  const [feedbackState, setFeedbackState] = useState<Record<string, CatalogVote | 'sending'>>({})
  const { showError, showSuccess } = useAlert()

  if (!isOpen) return null

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isClaiming && claimingIndex === null) {
      onClose()
    }
  }

  const handleIndividualClaim = async (index: number) => {
    setClaimingIndex(index)
    soundEffects.playIndividualClaimSound()
    await onClaimIndividualReward(index)
    setClaimingIndex(null)
  }

  const handleClaimAll = async () => {
    soundEffects.playClaimAllSound()
    await onClaimRewards()
  }

  const getCategoryIcon = (category: string): string => {
    const icons: { [key: string]: string } = {
      'Strength': '💪',
      'Intelligence': '🧠',
      'Charisma': '✨'
    }
    return icons[category] || '📌'
  }

  const getCategoryColor = (category: string): string => {
    const colors: { [key: string]: string } = {
      'Strength': 'strength',
      'Intelligence': 'intelligence',
      'Charisma': 'charisma'
    }
    return colors[category] || 'default'
  }

  const getMatchTypeLabel = (matchType: string): string => {
    const labels: { [key: string]: string } = {
      'exact': 'Exact Match',
      'similar': 'Similar Match',
      'goal-aligned': 'Goal Aligned',
      // v2 tiers
      'goal-exact': 'Goal — exact',
      'goal-similar': 'Goal — similar',
      'category-aligned': 'Category-aligned',
      'unrelated': 'Unrelated',
    }
    return labels[matchType] || matchType
  }

  const getMatchTypeIcon = (matchType: string): string => {
    const icons: { [key: string]: string } = {
      'exact': '✅',
      'similar': '🔄',
      'goal-aligned': '🎯',
      // v2 tiers
      'goal-exact': '✅',
      'goal-similar': '🔄',
      'category-aligned': '◐',
    }
    return icons[matchType] || '•'
  }

  const handleFeedback = async (signature: string | undefined, vote: CatalogVote) => {
    if (!signature) return
    const sessionId = userDatabase.getSessionId()
    if (!sessionId) {
      showError('Session expired. Please log in again.')
      return
    }
    setFeedbackState(prev => ({ ...prev, [signature]: 'sending' }))
    try {
      await feedbackService.submitFeedback(sessionId, signature, vote)
      setFeedbackState(prev => ({ ...prev, [signature]: vote }))
      showSuccess(
        vote === 'up'
          ? 'Thanks — we\'ll keep this rate stable.'
          : vote === 'over'
            ? 'Thanks — we\'ll reduce the reward for future activities like this.'
            : 'Thanks — we\'ll increase the reward for future activities like this.'
      )
    } catch (err) {
      console.error('Feedback submit failed:', err)
      showError('Couldn\'t save your feedback. Please try again.')
      setFeedbackState(prev => {
        const next = { ...prev }
        delete next[signature]
        return next
      })
    }
  }

  const hasActivities = unclaimedRewards?.activities && unclaimedRewards.activities.length > 0

  return (
    <div className="reward-modal-overlay" onClick={handleOverlayClick}>
      <div className="reward-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="reward-modal-header">
          <h3>🎉 Unclaimed Rewards</h3>
          <button 
            className="reward-modal-close"
            onClick={onClose}
            disabled={isClaiming || claimingIndex !== null}
          >
            ✕
          </button>
        </div>
        
        <div className="reward-modal-body">
          {!hasActivities ? (
            <div className="no-rewards-message">
              <p>🌟 No unclaimed rewards yet!</p>
              <p className="subtitle">Complete your daily activities to earn XP and shards.</p>
            </div>
          ) : (
            <>
              <p className="reward-description">
                Great job! Here are the rewards you've earned from your completed activities:
              </p>
              
              <div className="activities-list">
                {unclaimedRewards.activities.map((activity, index) => (
                  <div key={index} className="activity-reward-card">
                    <div className="activity-header">
                      <div className="activity-name-section">
                        <span className="match-type-icon">
                          {getMatchTypeIcon(activity.matchType)}
                        </span>
                        <span className="activity-name">{activity.activityName}</span>
                        <span className={`category-badge ${getCategoryColor(activity.category)}`}>
                          {getCategoryIcon(activity.category)} {activity.category}
                        </span>
                      </div>
                    </div>
                    
                    <div className="activity-details">
                      <div className="match-info">
                        <span className="match-type-label">{getMatchTypeLabel(activity.matchType)}</span>
                        {activity.matchedTask && (
                          <span className="matched-task">→ {activity.matchedTask}</span>
                        )}
                        {activity.goalLink && !activity.matchedTask && (
                          <span className="goal-link">→ {activity.goalLink}</span>
                        )}
                      </div>
                      
                      <div className="reward-amounts">
                        <div className="reward-item xp">
                          <span className="reward-icon">⭐</span>
                          <span className="reward-value">+{activity.xpEarned} XP</span>
                        </div>
                        <div className="reward-item shards">
                          <span className="reward-icon">💎</span>
                          <span className="reward-value">+{activity.shardsEarned.toFixed(2)}</span>
                        </div>
                      </div>

                      {activity.rateBreakdown && activity.tier && activity.tierMultiplier !== undefined && (
                        <div className="reward-breakdown">
                          <span className="reward-breakdown-label">
                            {activity.rateBreakdown.unit === 'event'
                              ? `flat ${activity.rateBreakdown.rate}`
                              : `${activity.rateBreakdown.rate} × ${activity.rateBreakdown.value} ${activity.rateBreakdown.unit === 'time' ? 'min' : 'units'}`}
                            {' '}× {activity.tierMultiplier} ({activity.tier})
                          </span>
                        </div>
                      )}

                      {activity.signature && (
                        <div className="reward-feedback">
                          <span className="reward-feedback-label">How does this reward feel?</span>
                          <div className="reward-feedback-chips">
                            {(['up', 'over', 'under'] as CatalogVote[]).map(vote => {
                              const current = feedbackState[activity.signature!]
                              const selected = current === vote
                              const sending = current === 'sending'
                              const disabled = isClaiming || claimingIndex !== null || sending || current !== undefined
                              const label = vote === 'up' ? '👍 Feels right' : vote === 'over' ? '🔽 Too much' : '🔼 Too little'
                              return (
                                <button
                                  key={vote}
                                  className={`reward-feedback-chip ${selected ? 'selected' : ''} ${sending ? 'sending' : ''}`}
                                  onClick={() => handleFeedback(activity.signature, vote)}
                                  disabled={disabled}
                                >
                                  {sending && current === vote ? '…' : label}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="activity-claim-action">
                      <button
                        className="activity-claim-btn"
                        onClick={() => handleIndividualClaim(index)}
                        disabled={isClaiming || claimingIndex !== null}
                      >
                        {claimingIndex === index ? (
                          <>
                            <span className="loading-spinner"></span>
                            Claiming...
                          </>
                        ) : (
                          <>
                            <span className="claim-icon">✓</span>
                            Claim
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rewards-summary">
                <div className="summary-header">
                  <h4>📊 Summary</h4>
                </div>
                
                <div className="summary-content">
                  <div className="total-rewards">
                    <div className="total-item">
                      <span className="total-label">Total XP:</span>
                      <span className="total-value xp">+{unclaimedRewards.totalXP}</span>
                    </div>
                    <div className="total-item">
                      <span className="total-label">Total Shards:</span>
                      <span className="total-value shards">+{unclaimedRewards.totalShards.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="category-breakdown">
                    <div className="breakdown-title">By Category:</div>
                    <div className="breakdown-items">
                      {unclaimedRewards.categoryBreakdown.Strength.xp > 0 && (
                        <div className="breakdown-item strength">
                          <span>💪 Strength:</span>
                          <span>+{unclaimedRewards.categoryBreakdown.Strength.xp} XP</span>
                        </div>
                      )}
                      {unclaimedRewards.categoryBreakdown.Intelligence.xp > 0 && (
                        <div className="breakdown-item intelligence">
                          <span>🧠 Intelligence:</span>
                          <span>+{unclaimedRewards.categoryBreakdown.Intelligence.xp} XP</span>
                        </div>
                      )}
                      {unclaimedRewards.categoryBreakdown.Charisma.xp > 0 && (
                        <div className="breakdown-item charisma">
                          <span>✨ Charisma:</span>
                          <span>+{unclaimedRewards.categoryBreakdown.Charisma.xp} XP</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        
        {hasActivities && (
          <div className="reward-modal-footer">
            <button 
              className="reward-modal-btn-secondary"
              onClick={onClose}
              disabled={isClaiming || claimingIndex !== null}
            >
              Close
            </button>
            <button 
              className="reward-modal-btn-primary" 
              onClick={handleClaimAll}
              disabled={isClaiming || claimingIndex !== null}
            >
              {isClaiming ? (
                <>
                  <span className="loading-spinner"></span>
                  Claiming...
                </>
              ) : (
                <>
                  <span>🎁</span>
                  Claim All Rewards
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default RewardClaimModal

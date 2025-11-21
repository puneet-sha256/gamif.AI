import React from 'react'
import type { DailyTaskHistory } from '../shared/types/user.types'
import './TaskHistoryModal.css'

interface TaskHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: string | null
  taskHistory: DailyTaskHistory | null
}

const TaskHistoryModal: React.FC<TaskHistoryModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  taskHistory
}) => {
  if (!isOpen) return null

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const formatDate = (dateStr: string): string => {
    // Parse date string ensuring local timezone interpretation
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  const getCategoryIcon = (category: string): string => {
    switch (category) {
      case 'Strength':
        return '💪'
      case 'Intelligence':
        return '🧠'
      case 'Charisma':
        return '✨'
      default:
        return '📌'
    }
  }

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'Strength':
        return '#ef4444'
      case 'Intelligence':
        return '#3b82f6'
      case 'Charisma':
        return '#8b5cf6'
      default:
        return '#10b981'
    }
  }

  return (
    <div className="task-history-modal-overlay" onClick={handleOverlayClick}>
      <div className="task-history-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="task-history-modal-header">
          <div>
            <h3>📅 Activity History</h3>
            {selectedDate && <p className="selected-date">{formatDate(selectedDate)}</p>}
          </div>
          <button 
            className="task-history-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        
        <div className="task-history-modal-body">
          {!taskHistory || taskHistory.activities.length === 0 ? (
            <div className="no-activities">
              <p className="empty-state-icon">📭</p>
              <p className="empty-state-text">No activities recorded for this date.</p>
              <p className="empty-state-hint">Complete and claim your daily activities to see them here!</p>
            </div>
          ) : (
            <>
              {/* Summary Section */}
              <div className="history-summary">
                <div className="summary-stat">
                  <span className="summary-label">Total XP</span>
                  <span className="summary-value xp">+{taskHistory.totalXP}</span>
                </div>
                <div className="summary-stat">
                  <span className="summary-label">Total Shards</span>
                  <span className="summary-value shards">+{taskHistory.totalShards}</span>
                </div>
                <div className="summary-stat">
                  <span className="summary-label">Activities</span>
                  <span className="summary-value activities">{taskHistory.activities.length}</span>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="category-breakdown">
                <h4>Category Breakdown</h4>
                <div className="category-stats">
                  {taskHistory.categoryBreakdown.Strength.xp > 0 && (
                    <div className="category-stat" style={{ borderColor: getCategoryColor('Strength') }}>
                      <span className="category-icon">💪</span>
                      <div className="category-info">
                        <span className="category-name">Strength</span>
                        <span className="category-rewards">
                          {taskHistory.categoryBreakdown.Strength.xp} XP • {taskHistory.categoryBreakdown.Strength.shards} 💎
                        </span>
                      </div>
                    </div>
                  )}
                  {taskHistory.categoryBreakdown.Intelligence.xp > 0 && (
                    <div className="category-stat" style={{ borderColor: getCategoryColor('Intelligence') }}>
                      <span className="category-icon">🧠</span>
                      <div className="category-info">
                        <span className="category-name">Intelligence</span>
                        <span className="category-rewards">
                          {taskHistory.categoryBreakdown.Intelligence.xp} XP • {taskHistory.categoryBreakdown.Intelligence.shards} 💎
                        </span>
                      </div>
                    </div>
                  )}
                  {taskHistory.categoryBreakdown.Charisma.xp > 0 && (
                    <div className="category-stat" style={{ borderColor: getCategoryColor('Charisma') }}>
                      <span className="category-icon">✨</span>
                      <div className="category-info">
                        <span className="category-name">Charisma</span>
                        <span className="category-rewards">
                          {taskHistory.categoryBreakdown.Charisma.xp} XP • {taskHistory.categoryBreakdown.Charisma.shards} 💎
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Activities List */}
              <div className="activities-list">
                <h4>Completed Activities</h4>
                {taskHistory.activities.map((activity, index) => (
                  <div 
                    key={index} 
                    className="activity-item"
                    style={{ borderLeftColor: getCategoryColor(activity.category) }}
                  >
                    <div className="activity-header">
                      <span className="activity-icon">{getCategoryIcon(activity.category)}</span>
                      <span className="activity-name">{activity.activityName}</span>
                      <span className="activity-rewards">
                        <span className="reward-xp">+{activity.xpEarned} XP</span>
                        <span className="reward-shards">+{activity.shardsEarned} 💎</span>
                      </span>
                    </div>
                    
                    <div className="activity-details">
                      <div className="activity-meta">
                        <span className="match-type">{activity.matchType}</span>
                        {activity.matchedTask && (
                          <span className="matched-task">→ {activity.matchedTask}</span>
                        )}
                        {activity.goalLink && (
                          <span className="goal-link">🎯 {activity.goalLink}</span>
                        )}
                      </div>
                      
                      {activity.calculationNotes && (
                        <p className="activity-notes">{activity.calculationNotes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        
        <div className="task-history-modal-footer">
          <button 
            className="modal-btn-primary" 
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default TaskHistoryModal

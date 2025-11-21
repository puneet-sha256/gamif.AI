import React from 'react'
import './TaskHistoryModal.css'
import type { DailyTaskHistory } from '../shared/types/user.types'

interface TaskHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  date: string | null
  taskHistory: DailyTaskHistory | null
}

const TaskHistoryModal: React.FC<TaskHistoryModalProps> = ({
  isOpen,
  onClose,
  date,
  taskHistory
}) => {
  if (!isOpen) return null

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
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
      'unrelated': 'Unrelated'
    }
    return labels[matchType] || matchType
  }

  const getMatchTypeIcon = (matchType: string): string => {
    const icons: { [key: string]: string } = {
      'exact': '✅',
      'similar': '🔄',
      'goal-aligned': '🎯',
      'unrelated': '📌'
    }
    return icons[matchType] || '•'
  }

  const hasTasks = taskHistory?.tasks && taskHistory.tasks.length > 0

  // Calculate totals
  const totals = taskHistory?.tasks.reduce(
    (acc, task) => ({
      xp: acc.xp + task.xpEarned,
      shards: acc.shards + task.shardsEarned
    }),
    { xp: 0, shards: 0 }
  ) || { xp: 0, shards: 0 }

  return (
    <div className="task-history-modal-overlay" onClick={handleOverlayClick}>
      <div className="task-history-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="task-history-modal-header">
          <div className="task-history-modal-title">
            <h3>📅 Activity History</h3>
            {date && <p className="task-history-date">{formatDate(date)}</p>}
          </div>
          <button 
            className="task-history-modal-close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        
        <div className="task-history-modal-body">
          {!hasTasks ? (
            <div className="no-tasks-message">
              <p>🌟 No activities logged<br />for this date</p>
              <p className="no-tasks-hint">Start logging your daily activities to see them here!</p>
            </div>
          ) : (
            <>
              <div className="task-history-summary">
                <div className="summary-stat">
                  <span className="summary-label">Total XP Earned</span>
                  <span className="summary-value xp-value">{totals.xp}</span>
                </div>
                <div className="summary-stat">
                  <span className="summary-label">Total Shards Earned</span>
                  <span className="summary-value shards-value">{totals.shards} 💎</span>
                </div>
                <div className="summary-stat">
                  <span className="summary-label">Activities Completed</span>
                  <span className="summary-value">{taskHistory.tasks.length}</span>
                </div>
              </div>

              <div className="task-history-list">
                <h4 className="task-history-list-title">Activities</h4>
                {taskHistory.tasks.map((task, index) => (
                  <div key={index} className={`task-history-item ${getCategoryColor(task.category)}`}>
                    <div className="task-history-item-header">
                      <div className="task-category-badge">
                        {getCategoryIcon(task.category)} {task.category}
                      </div>
                      <div className="task-match-badge">
                        {getMatchTypeIcon(task.matchType)} {getMatchTypeLabel(task.matchType)}
                      </div>
                    </div>
                    
                    <div className="task-history-item-body">
                      <h5 className="task-activity-name">{task.activityName}</h5>
                      
                      {task.matchedTask && (
                        <p className="task-matched-info">
                          <span className="info-label">Matched Task:</span> {task.matchedTask}
                        </p>
                      )}
                      
                      {task.goalLink && (
                        <p className="task-goal-info">
                          <span className="info-label">Goal Link:</span> {task.goalLink}
                        </p>
                      )}
                      
                      {task.calculationNotes && (
                        <p className="task-notes">{task.calculationNotes}</p>
                      )}
                      
                      <div className="task-rewards">
                        <div className="reward-item">
                          <span className="reward-label">XP:</span>
                          <span className="reward-value xp">+{task.xpEarned}</span>
                        </div>
                        <div className="reward-item">
                          <span className="reward-label">Shards:</span>
                          <span className="reward-value shards">+{task.shardsEarned} 💎</span>
                        </div>
                        {task.effortRatio !== undefined && (
                          <div className="reward-item">
                            <span className="reward-label">Effort:</span>
                            {/* effortRatio is a decimal value between 0 and 1 representing percentage */}
                            <span className="reward-value">{(task.effortRatio * 100).toFixed(0)}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        
        <div className="task-history-modal-footer">
          <button 
            className="task-history-close-btn"
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

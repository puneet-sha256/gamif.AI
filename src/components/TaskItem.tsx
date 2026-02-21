import React from 'react'
import { useConfirm } from '../contexts/ConfirmContext'

interface TaskItemProps {
  icon: string
  description: string
  category: string
  xpReward: number
  shardReward: number
  durationMinutes?: number
  isChallenge?: boolean
  progress?: string
  className?: string
  taskId?: string // Task ID for editing/deleting
  taskCategory?: 'Strength' | 'Intelligence' | 'Charisma' // Category for task operations
  onEdit?: (taskId: string, category: 'Strength' | 'Intelligence' | 'Charisma') => void
  onDelete?: (taskId: string, category: 'Strength' | 'Intelligence' | 'Charisma') => void
  onComplete?: () => void
}

const TaskItem: React.FC<TaskItemProps> = ({
  icon,
  description,
  category,
  xpReward,
  shardReward,
  durationMinutes,
  isChallenge = false,
  progress,
  className = '',
  taskId,
  taskCategory,
  onEdit,
  onDelete,
  onComplete
}) => {
  const { showConfirm } = useConfirm()
  
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (taskId && taskCategory && onEdit) {
      onEdit(taskId, taskCategory)
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (taskId && taskCategory && onDelete) {
      const confirmed = await showConfirm(
        `Are you sure you want to delete this task?\n\n"${description}"`,
        'Delete',
        'Cancel'
      )
      if (confirmed) {
        onDelete(taskId, taskCategory)
      }
    }
  }

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onComplete) {
      onComplete()
    }
  }

  return (
    <div className={`${isChallenge ? 'challenge-item' : 'task-item'} enhanced ${className}`}>
      <div className={`${isChallenge ? 'challenge-icon' : 'task-icon'}`}>
        {icon}
      </div>
      <div className="task-content">
        <div className={`${isChallenge ? 'challenge-info' : 'task-info'}`}>
          <p className="task-description">{description}</p>
          <span className="task-category">{category}</span>
        </div>
        <div className={`${isChallenge ? 'challenge-rewards' : 'task-rewards'}`}>
          {durationMinutes && <span className="duration-badge" title={`Spend ~${durationMinutes} min for full XP & shards. More effort = bonus rewards (up to 5x).`}>{durationMinutes} min</span>}
          <span className="xp-reward">+{xpReward} XP</span>
          <span className="shard-reward">+{shardReward} 💎</span>
        </div>
      </div>
      {isChallenge && progress && (
        <div className="challenge-progress">{progress}</div>
      )}
      {!isChallenge && taskId && taskCategory && (
        <div className="task-actions">
          {onComplete && (
            <button 
              className="task-action-btn complete-btn" 
              onClick={handleComplete}
              title="Complete task"
            >
              ✓
            </button>
          )}
          {onEdit && (
            <button 
              className="task-action-btn edit-btn" 
              onClick={handleEdit}
              title="Edit task"
            >
              ✏️
            </button>
          )}
          {onDelete && (
            <button 
              className="task-action-btn delete-btn" 
              onClick={handleDelete}
              title="Delete task"
            >
              🗑️
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default TaskItem
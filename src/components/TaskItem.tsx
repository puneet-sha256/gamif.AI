import React from 'react'

interface TaskItemProps {
  icon: string
  description: string
  category: string
  xpReward: number
  shardReward: number
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
  isChallenge = false,
  progress,
  className = '',
  taskId,
  taskCategory,
  onEdit,
  onDelete,
  onComplete
}) => {
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (taskId && taskCategory && onEdit) {
      onEdit(taskId, taskCategory)
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (taskId && taskCategory && onDelete) {
      if (confirm(`Are you sure you want to delete this task?\n\n"${description}"`)) {
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
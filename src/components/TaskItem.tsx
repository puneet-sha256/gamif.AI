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
}

const TaskItem: React.FC<TaskItemProps> = ({
  icon,
  description,
  category,
  xpReward,
  shardReward,
  isChallenge = false,
  progress,
  className = ''
}) => {
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
    </div>
  )
}

export default TaskItem
import React from 'react'

interface ProgressBarProps {
  current: number
  max: number
  percentage: number
  label?: string
  className?: string
  showText?: boolean
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  max,
  percentage,
  label,
  className = '',
  showText = true
}) => {
  return (
    <div className={`level-progress ${className}`}>
      <div className="exp-bar">
        <div 
          className="exp-fill" 
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
      {showText && (
        <div className="exp-text">
          {label || `${current} / ${max} XP`}
        </div>
      )}
    </div>
  )
}

export default ProgressBar
import React, { useEffect, useState } from 'react'
import './LevelUpAlert.css'

export interface LevelUpAlertProps {
  newLevel: number
  onClose: () => void
}

const LevelUpAlert: React.FC<LevelUpAlertProps> = ({ newLevel, onClose }) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger animation on mount
    const showTimer = setTimeout(() => setIsVisible(true), 10)
    
    // Auto-close after 5 seconds
    const closeTimer = setTimeout(() => {
      handleClose()
    }, 5000)

    return () => {
      clearTimeout(showTimer)
      clearTimeout(closeTimer)
    }
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300) // Wait for animation to complete
  }

  return (
    <div className={`levelup-overlay ${isVisible ? 'visible' : ''}`} onClick={handleClose}>
      <div className={`levelup-container ${isVisible ? 'visible' : ''}`} onClick={(e) => e.stopPropagation()}>
        {/* Celebration particles */}
        <div className="celebration-particles">
          {[...Array(20)].map((_, i) => (
            <div key={i} className={`particle particle-${i % 5}`}></div>
          ))}
        </div>
        
        <div className="levelup-content">
          <div className="levelup-icon">🎉</div>
          <h2 className="levelup-title">LEVEL UP!</h2>
          <div className="levelup-level">
            <span className="level-number">{newLevel}</span>
          </div>
          <p className="levelup-message">Congratulations! You've reached a new level!</p>
          <p className="levelup-submessage">Keep up the great work!</p>
        </div>
        
        <button className="levelup-close" onClick={handleClose} aria-label="Close">
          ✕
        </button>
      </div>
    </div>
  )
}

export default LevelUpAlert

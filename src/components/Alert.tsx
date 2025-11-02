import React, { useEffect, useState } from 'react'
import './Alert.css'

export type AlertType = 'success' | 'error' | 'warning' | 'info'

export interface AlertProps {
  message: string
  type?: AlertType
  onClose: () => void
  duration?: number
}

const Alert: React.FC<AlertProps> = ({ message, type = 'info', onClose, duration = 0 }) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger animation on mount
    const showTimer = setTimeout(() => setIsVisible(true), 10)
    
    // Auto-close if duration is set
    let closeTimer: NodeJS.Timeout | null = null
    if (duration > 0) {
      closeTimer = setTimeout(() => {
        handleClose()
      }, duration)
    }

    return () => {
      clearTimeout(showTimer)
      if (closeTimer) clearTimeout(closeTimer)
    }
  }, [duration])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300) // Wait for animation to complete
  }

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓'
      case 'error':
        return '✕'
      case 'warning':
        return '⚠'
      case 'info':
      default:
        return 'ℹ'
    }
  }

  return (
    <div className={`alert-overlay ${isVisible ? 'visible' : ''}`} onClick={handleClose}>
      <div className={`alert-container ${type} ${isVisible ? 'visible' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="alert-icon">
          {getIcon()}
        </div>
        <div className="alert-content">
          <p className="alert-message">{message}</p>
        </div>
        <button className="alert-close" onClick={handleClose} aria-label="Close">
          ✕
        </button>
      </div>
    </div>
  )
}

export default Alert

import React, { useEffect, useState } from 'react'
import './ConfirmDialog.css'

export interface ConfirmDialogProps {
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmText?: string
  cancelText?: string
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ 
  message, 
  onConfirm, 
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel'
}) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger animation on mount
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  const handleConfirm = () => {
    setIsVisible(false)
    setTimeout(onConfirm, 300)
  }

  const handleCancel = () => {
    setIsVisible(false)
    setTimeout(onCancel, 300)
  }

  return (
    <div className={`confirm-overlay ${isVisible ? 'visible' : ''}`} onClick={handleCancel}>
      <div className={`confirm-container ${isVisible ? 'visible' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="confirm-icon">
          ⚠️
        </div>
        <div className="confirm-content">
          <p className="confirm-message">{message}</p>
        </div>
        <div className="confirm-actions">
          <button className="confirm-btn cancel-btn" onClick={handleCancel}>
            {cancelText}
          </button>
          <button className="confirm-btn confirm-btn-primary" onClick={handleConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog

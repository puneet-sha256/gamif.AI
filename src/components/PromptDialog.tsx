import React, { useEffect, useState, useRef } from 'react'
import './PromptDialog.css'

export interface PromptDialogProps {
  message: string
  defaultValue?: string
  placeholder?: string
  onConfirm: (value: string) => void
  onCancel: () => void
  confirmText?: string
  cancelText?: string
  inputType?: 'text' | 'number'
  min?: number
  max?: number
}

const PromptDialog: React.FC<PromptDialogProps> = ({ 
  message, 
  defaultValue = '',
  placeholder = '',
  onConfirm, 
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  inputType = 'text',
  min,
  max
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [inputValue, setInputValue] = useState(defaultValue)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Trigger animation on mount
    const timer = setTimeout(() => {
      setIsVisible(true)
      // Focus input after animation
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 100)
    }, 10)
    return () => clearTimeout(timer)
  }, [])

  const handleConfirm = () => {
    setIsVisible(false)
    setTimeout(() => onConfirm(inputValue), 300)
  }

  const handleCancel = () => {
    setIsVisible(false)
    setTimeout(onCancel, 300)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleConfirm()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  return (
    <div className={`prompt-overlay ${isVisible ? 'visible' : ''}`} onClick={handleCancel}>
      <div className={`prompt-container ${isVisible ? 'visible' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="prompt-icon">
          💎
        </div>
        <div className="prompt-content">
          <p className="prompt-message">{message}</p>
          <input
            ref={inputRef}
            type={inputType}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="prompt-input"
            placeholder={placeholder}
            min={min}
            max={max}
          />
        </div>
        <div className="prompt-actions">
          <button className="prompt-btn cancel-btn" onClick={handleCancel}>
            {cancelText}
          </button>
          <button className="prompt-btn confirm-btn-primary" onClick={handleConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PromptDialog

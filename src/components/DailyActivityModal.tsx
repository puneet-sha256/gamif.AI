import React from 'react'

interface DailyActivityModalProps {
  isOpen: boolean
  onClose: () => void
  dailyActivity: string
  setDailyActivity: (value: string) => void
  isAnalyzing: boolean
  onAnalyze: () => void
}

const DailyActivityModal: React.FC<DailyActivityModalProps> = ({
  isOpen,
  onClose,
  dailyActivity,
  setDailyActivity,
  isAnalyzing,
  onAnalyze
}) => {
  if (!isOpen) return null

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleCancel = () => {
    onClose()
    setDailyActivity('')
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🤖 Daily Activity Analysis</h3>
          <button 
            className="modal-close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        
        <div className="modal-body">
          <p className="modal-description">
            Tell me what you accomplished today and I'll calculate your XP rewards based on your activities!
          </p>
          
          <div className="activity-examples">
            <h4>Examples of activities I can recognize:</h4>
            <div className="example-tags">
              <span className="example-tag">💪 Exercise, workout, gym</span>
              <span className="example-tag">🧠 Reading, studying, coding</span>
              <span className="example-tag">🗣️ Meetings, presentations</span>
              <span className="example-tag">🤝 Helping others, teaching</span>
            </div>
          </div>
          
          <textarea
            className="activity-input-modal"
            value={dailyActivity}
            onChange={(e) => setDailyActivity(e.target.value)}
            placeholder="Today I went for a 30-minute run, spent 2 hours coding a new feature, had a productive team meeting, and helped a colleague debug their code..."
            rows={5}
          />
        </div>
        
        <div className="modal-footer">
          <button 
            className="modal-btn-secondary"
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button 
            className="modal-btn-primary" 
            onClick={onAnalyze}
            disabled={isAnalyzing || !dailyActivity.trim()}
          >
            {isAnalyzing ? (
              <>
                <span className="loading-spinner"></span>
                Analyzing...
              </>
            ) : (
              <>
                <span>✨</span>
                Analyze & Earn XP
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DailyActivityModal
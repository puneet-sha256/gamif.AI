import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import type { GoalsData } from '../types'
import './GoalsSetup.css'

interface GoalsSetupProps {
  onComplete: (goalsData: GoalsData) => void
  onBack: () => void
}

const GoalsSetup: React.FC<GoalsSetupProps> = ({ onComplete, onBack }) => {
  const [formData, setFormData] = useState<GoalsData>({
    longTermGoals: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [taskGenerationStatus, setTaskGenerationStatus] = useState('')

  const { saveGoalsData } = useAuth()

  const handleTextChange = (value: string) => {
    setFormData({ longTermGoals: value })
    if (error) {
      setError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.longTermGoals.trim()) {
      setError('Please describe your long-term goals to continue')
      return
    }
    
    if (formData.longTermGoals.trim().length < 50) {
      setError('Please provide a more detailed description of your goals (at least 50 characters)')
      return
    }
    
    setIsSubmitting(true)
    setError('')
    
    try {
      setTaskGenerationStatus('Saving your goals...')
      
      const success = await saveGoalsData(formData)
      
      if (success) {
        setTaskGenerationStatus('Goals saved and AI tasks generated! Redirecting...')
        // Small delay to show the success message
        setTimeout(() => {
          onComplete(formData)
        }, 1000)
      } else {
        setError('Failed to save goals. Please try again.')
        setTaskGenerationStatus('')
      }
    } catch (error: any) {
      console.error('❌ GoalsSetup: Error saving goals:', error)
      setError('Failed to save goals and generate tasks. Please try again.')
      setTaskGenerationStatus('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBackClick = () => {
    onBack()
  }

  const isFormValid = () => {
    return formData.longTermGoals.trim().length >= 50
  }

  return (
    <div className="goals-setup-container">
      <div className="goals-setup-background">
        <div className="shadows"></div>
      </div>
      
      <div className="goals-setup-content">
        <div className="goals-setup-card">
          <div className="setup-header">
            <div className="setup-logo">
              <h1>ATTRIBUTE GOALS</h1>
              <div className="subtitle">Define Your Development Objectives</div>
            </div>
            <div className="progress-indicator">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: '100%' }}></div>
              </div>
              <span className="progress-text">Step 2 of 2</span>
            </div>
          </div>

          <div className="goals-description">
            <p>Describe your specific goals for each attribute. Our AI system will create personalized tasks to help you achieve these objectives.</p>
          </div>

          <form onSubmit={handleSubmit} className="goals-form">
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
            
            {taskGenerationStatus && (
              <div className="status-message">
                <div className="status-icon">🤖</div>
                <div className="status-text">{taskGenerationStatus}</div>
              </div>
            )}

            <div className="goals-section">
              <div className="goals-group">
                <div className="goals-header">
                  <div className="goals-icon">🎯</div>
                  <div className="goals-info">
                    <h3>Long-Term Goals</h3>
                    <p>Describe your comprehensive development objectives across all areas of life</p>
                  </div>
                </div>
                <div className="goal-input-container">
                  <textarea
                    placeholder="Describe your long-term goals in detail. Feel free to use bullet points to organize your thoughts. Consider areas like:
• Physical fitness and health
• Learning and skill development
• Career and professional growth
• Social and interpersonal skills
• Personal projects and hobbies
• Financial objectives
• Mental and emotional well-being

Example: 
• Build muscle mass and improve cardiovascular health through consistent gym routine
• Learn JavaScript and Python to advance my programming career
• Develop better communication skills for leadership roles
• Start a side business in digital marketing"
                    value={formData.longTermGoals}
                    onChange={(e) => handleTextChange(e.target.value)}
                    className="goal-textarea"
                    rows={12}
                    required
                    minLength={50}
                    maxLength={2000}
                  />
                  <div className="character-count">
                    {formData.longTermGoals.length}/2000
                  </div>
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                className="back-button"
                onClick={handleBackClick}
                disabled={isSubmitting}
              >
                Back
              </button>
              
              <button 
                type="submit" 
                className={`complete-button ${isSubmitting ? 'loading' : ''}`}
                disabled={isSubmitting || !isFormValid()}
              >
                {isSubmitting ? (
                  <div className="loading-content">
                    <span className="loading-spinner"></span>
                    <span>Generating AI Tasks...</span>
                  </div>
                ) : (
                  'Complete Setup & Generate Tasks'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default GoalsSetup

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

  const { saveGoalsData } = useAuth()

  const handleTextChange = (value: string) => {
    console.log('🔄 GoalsSetup: Goals updated, length:', value.length)
    setFormData({ longTermGoals: value })
    if (error) {
      console.log('✅ GoalsSetup: Clearing error state')
      setError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('🔄 GoalsSetup: Form submitted with goals length:', formData.longTermGoals.length)
    
    // Validation
    if (!formData.longTermGoals.trim()) {
      console.log('❌ GoalsSetup: Validation failed - goals are required')
      setError('Please describe your long-term goals to continue')
      return
    }
    
    if (formData.longTermGoals.trim().length < 50) {
      console.log('❌ GoalsSetup: Validation failed - goals too short')
      setError('Please provide a more detailed description of your goals (at least 50 characters)')
      return
    }
    
    console.log('✅ GoalsSetup: Form validation passed')
    setIsSubmitting(true)
    setError('')
    
    try {
      console.log('🔄 GoalsSetup: Saving goals data...')
      const success = await saveGoalsData(formData)
      
      if (success) {
        console.log('✅ GoalsSetup: Goals saved successfully, proceeding to dashboard')
        onComplete(formData)
      } else {
        console.log('❌ GoalsSetup: Failed to save goals data')
        setError('Failed to save goals. Please try again.')
      }
    } catch (error: any) {
      console.error('❌ GoalsSetup: Error saving goals:', error)
      setError('Failed to save goals. Please try again.')
    } finally {
      setIsSubmitting(false)
      console.log('✅ GoalsSetup: Form submission complete')
    }
  }

  const handleBackClick = () => {
    console.log('🔄 GoalsSetup: Back button clicked, returning to profile setup')
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
                  <span className="loading-spinner"></span>
                ) : (
                  'Complete Setup'
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

import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './GoalsSetup.css'

interface GoalsSetupProps {
  onComplete: (goalsData: GoalsData) => void
  onBack: () => void
}

export interface GoalsData {
  strengthGoal: string
  intelligenceGoal: string
  charismaGoal: string
}

const GoalsSetup: React.FC<GoalsSetupProps> = ({ onComplete, onBack }) => {
  const [formData, setFormData] = useState<GoalsData>({
    strengthGoal: '',
    intelligenceGoal: '',
    charismaGoal: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const { saveGoalsData } = useAuth()

  const handleTextChange = (attribute: keyof GoalsData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [attribute]: value
    }))
    if (error) setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    
    try {
      await saveGoalsData(formData)
      onComplete(formData)
    } catch (error: any) {
      console.error('Error saving goals:', error)
      setError('Failed to save goals. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid = () => {
    return formData.strengthGoal.trim().length > 0 &&
           formData.intelligenceGoal.trim().length > 0 &&
           formData.charismaGoal.trim().length > 0
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

            <div className="attributes-section">
              <div className="attribute-group">
                <div className="attribute-header">
                  <div className="attribute-icon">💪</div>
                  <div className="attribute-info">
                    <h3>Strength Goals</h3>
                    <p>Physical power, fitness, and endurance objectives</p>
                  </div>
                </div>
                <div className="goal-input-container">
                  <textarea
                    placeholder="Describe your strength and fitness goals... (e.g., 'I want to build muscle mass, improve my deadlift to 200lbs, run a 5K in under 25 minutes, and develop better overall physical endurance for daily activities.')"
                    value={formData.strengthGoal}
                    onChange={(e) => handleTextChange('strengthGoal', e.target.value)}
                    className="goal-textarea"
                    rows={4}
                    required
                    minLength={10}
                    maxLength={500}
                  />
                  <div className="character-count">
                    {formData.strengthGoal.length}/500
                  </div>
                </div>
              </div>

              <div className="attribute-group">
                <div className="attribute-header">
                  <div className="attribute-icon">🧠</div>
                  <div className="attribute-info">
                    <h3>Intelligence Goals</h3>
                    <p>Learning, skill development, and mental growth objectives</p>
                  </div>
                </div>
                <div className="goal-input-container">
                  <textarea
                    placeholder="Describe your intelligence and learning goals... (e.g., 'I want to learn a new programming language, read 12 books this year, improve my problem-solving skills, and develop expertise in data analysis.')"
                    value={formData.intelligenceGoal}
                    onChange={(e) => handleTextChange('intelligenceGoal', e.target.value)}
                    className="goal-textarea"
                    rows={4}
                    required
                    minLength={10}
                    maxLength={500}
                  />
                  <div className="character-count">
                    {formData.intelligenceGoal.length}/500
                  </div>
                </div>
              </div>

              <div className="attribute-group">
                <div className="attribute-header">
                  <div className="attribute-icon">✨</div>
                  <div className="attribute-info">
                    <h3>Charisma Goals</h3>
                    <p>Social skills, leadership, and interpersonal objectives</p>
                  </div>
                </div>
                <div className="goal-input-container">
                  <textarea
                    placeholder="Describe your charisma and social goals... (e.g., 'I want to improve my public speaking skills, build stronger relationships, develop leadership abilities, and become more confident in social situations.')"
                    value={formData.charismaGoal}
                    onChange={(e) => handleTextChange('charismaGoal', e.target.value)}
                    className="goal-textarea"
                    rows={4}
                    required
                    minLength={10}
                    maxLength={500}
                  />
                  <div className="character-count">
                    {formData.charismaGoal.length}/500
                  </div>
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                className="back-button"
                onClick={onBack}
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

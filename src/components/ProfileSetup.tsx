import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import type { ProfileData } from '../types'
import './ProfileSetup.css'

interface ProfileSetupProps {
  onComplete: (profileData: ProfileData) => void
}

const ProfileSetup: React.FC<ProfileSetupProps> = ({ onComplete }) => {
  const [formData, setFormData] = useState<ProfileData>({
    name: '',
    age: 18
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const { saveProfileData } = useAuth()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'age' ? Number(value) : value
    }))
    if (error) {
      setError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.name.trim()) {
      setError('Player name is required')
      return
    }
    
    if (formData.age < 13 || formData.age > 100) {
      setError('Age must be between 13 and 100')
      return
    }
    
    setIsSubmitting(true)
    setError('')
    
    try {
      const success = await saveProfileData(formData)
      
      if (success) {
        onComplete(formData)
      } else {
        setError('Failed to save profile. Please try again.')
      }
    } catch (error: any) {
      console.error('❌ ProfileSetup: Error saving profile:', error)
      setError('Failed to save profile. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="profile-setup-container">
      <div className="profile-setup-background">
        <div className="shadows"></div>
      </div>
      
      <div className="profile-setup-content">
        <div className="profile-setup-card">
          <div className="setup-header">
            <div className="setup-logo">
              <h1>PLAYER REGISTRATION</h1>
              <div className="subtitle">Complete Your Profile</div>
            </div>
            <div className="progress-indicator">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: '50%' }}></div>
              </div>
              <span className="progress-text">Step 1 of 2</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="setup-form">
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <div className="form-section">
              <h3>Personal Information</h3>
              
              <div className="input-group">
                <label htmlFor="name">Player Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your player name"
                  required
                  minLength={2}
                  maxLength={50}
                />
              </div>

              <div className="input-group">
                <label htmlFor="age">Age</label>
                <input
                  type="number"
                  id="age"
                  name="age"
                  value={formData.age}
                  onChange={handleInputChange}
                  min="13"
                  max="100"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className={`setup-button ${isSubmitting ? 'loading' : ''}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="loading-spinner"></span>
              ) : (
                'Continue to Goals Setup'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ProfileSetup

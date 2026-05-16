import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { validateDob, maxDobInputValue, composeDob } from '../utils/timeAlive'
import type { ProfileData } from '../types'
import './ProfileSetup.css'

interface ProfileSetupProps {
  onComplete: (profileData: ProfileData) => void
}

const ProfileSetup: React.FC<ProfileSetupProps> = ({ onComplete }) => {
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const { saveProfileData } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError('Player name is required')
      return
    }

    const composed = composeDob(birthDate, birthTime)
    const dobValidation = validateDob(composed)
    if (!dobValidation.ok) {
      setError(dobValidation.error || 'Invalid date of birth')
      return
    }

    const profileData: ProfileData = { name: name.trim(), dateOfBirth: composed }

    setIsSubmitting(true)
    setError('')

    try {
      const success = await saveProfileData(profileData)

      if (success) {
        onComplete(profileData)
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
                  value={name}
                  onChange={(e) => { setName(e.target.value); if (error) setError('') }}
                  placeholder="Enter your player name"
                  required
                  minLength={2}
                  maxLength={50}
                />
              </div>

              <div className="input-row">
                <div className="input-group">
                  <label htmlFor="dateOfBirth">Date of Birth</label>
                  <input
                    type="date"
                    id="dateOfBirth"
                    name="dateOfBirth"
                    value={birthDate}
                    onChange={(e) => { setBirthDate(e.target.value); if (error) setError('') }}
                    max={maxDobInputValue()}
                    required
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="timeOfBirth">Time of Birth <span className="optional-hint">(optional — defaults to midnight)</span></label>
                  <input
                    type="time"
                    id="timeOfBirth"
                    name="timeOfBirth"
                    value={birthTime}
                    onChange={(e) => { setBirthTime(e.target.value); if (error) setError('') }}
                  />
                </div>
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

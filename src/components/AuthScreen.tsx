import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './AuthScreen.css'

interface AuthScreenProps {
  onLogin: () => void
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const { login, register, isLoading } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [showOTPVerification, setShowOTPVerification] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    otp: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [otpResending, setOtpResending] = useState(false)

  // Clear error and success messages when switching between login and register
  useEffect(() => {
    setError('')
    setSuccess('')
  }, [isLogin])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validation
    if (!isLogin && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    if (!isLogin && !formData.username.trim()) {
      setError('Player name is required')
      return
    }


    try {
      if (isLogin) {
        const result = await login({
          email: formData.email,
          password: formData.password
        })

        if (result.success) {
          setSuccess(result.message)
          setTimeout(() => {
            onLogin()
          }, 1000)
        } else {
          setError(result.message)
        }
      } else {
        const result = await register({
          username: formData.username,
          email: formData.email,
          password: formData.password
        })

        if (result.success) {
          setSuccess(result.message)
          setRegisteredEmail(formData.email)
          // Show OTP verification screen
          setShowOTPVerification(true)
        } else {
          setError(result.message)
        }
      }
    } catch (error) {
      console.error('❌ AuthScreen: Unexpected error during authentication:', error)
      setError('An unexpected error occurred. Please try again.')
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.otp.trim() || formData.otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP')
      return
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: registeredEmail,
          otp: formData.otp
        })
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(result.message)
        // Store session
        if (result.sessionId) {
          localStorage.setItem('sessionId', result.sessionId)
        }
        setTimeout(() => {
          onLogin()
        }, 1500)
      } else {
        setError(result.message)
      }
    } catch (error) {
      console.error('❌ AuthScreen: Error verifying OTP:', error)
      setError('Failed to verify OTP. Please try again.')
    }
  }

  const handleResendOTP = async () => {
    setOtpResending(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registeredEmail })
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(result.message)
      } else {
        setError(result.message)
      }
    } catch (error) {
      console.error('❌ AuthScreen: Error resending OTP:', error)
      setError('Failed to resend OTP. Please try again.')
    } finally {
      setOtpResending(false)
    }
  }

  const toggleMode = () => {
    setIsLogin(!isLogin)
    setShowOTPVerification(false)
    setFormData({
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      otp: ''
    })
    setError('')
    setSuccess('')
  }

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="shadows"></div>
      </div>
      
      <div className="auth-content">
        <div className="auth-card">
          <div className="auth-header">
            <div className="solo-leveling-logo">
              <h1>SOLO LEVELING</h1>
              <div className="subtitle">Player System</div>
            </div>
          </div>

          {!showOTPVerification ? (
            <>
              <div className="auth-tabs">
                <button 
                  className={`tab ${isLogin ? 'active' : ''}`}
                  onClick={() => setIsLogin(true)}
                >
                  Login
                </button>
                <button 
                  className={`tab ${!isLogin ? 'active' : ''}`}
                  onClick={() => setIsLogin(false)}
                >
                  Register
                </button>
              </div>

              <form onSubmit={handleSubmit} className="auth-form">
                {error && (
                  <div className="message error-message">
                    {error}
                  </div>
                )}
                
                {success && (
                  <div className="message success-message">
                    {success}
                  </div>
                )}

                {!isLogin && (
                  <div className="input-group">
                    <label htmlFor="username">Player Name</label>
                    <input
                      type="text"
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      placeholder="Enter your player name"
                      required
                    />
                  </div>
                )}

                <div className="input-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="password">Password</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter your password"
                    required
                  />
                </div>

                {!isLogin && (
                  <div className="input-group">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Confirm your password"
                      required
                    />
                  </div>
                )}

                <button 
                  type="submit" 
                  className={`auth-button ${isLoading ? 'loading' : ''}`}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="loading-spinner"></span>
                  ) : (
                    isLogin ? 'Enter System' : 'Register Player'
                  )}
                </button>
              </form>

              <div className="auth-footer">
                <p>
                  {isLogin ? "New player? " : "Already registered? "}
                  <button 
                    type="button" 
                    className="link-button"
                    onClick={toggleMode}
                  >
                    {isLogin ? "Register here" : "Login here"}
                  </button>
                </p>
              </div>
            </>
          ) : (
            // OTP Verification Screen
            <>
              <div className="otp-verification-header">
                <h2>Verify Your Email</h2>
                <p>We've sent a 6-digit verification code to</p>
                <p className="email-display">{registeredEmail}</p>
              </div>

              <form onSubmit={handleVerifyOTP} className="auth-form">
                {error && (
                  <div className="message error-message">
                    {error}
                  </div>
                )}
                
                {success && (
                  <div className="message success-message">
                    {success}
                  </div>
                )}

                <div className="input-group">
                  <label htmlFor="otp">Verification Code</label>
                  <input
                    type="text"
                    id="otp"
                    name="otp"
                    value={formData.otp}
                    onChange={handleInputChange}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    pattern="\d{6}"
                    required
                    autoFocus
                  />
                </div>

                <button 
                  type="submit" 
                  className="auth-button"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="loading-spinner"></span>
                  ) : (
                    'Verify & Continue'
                  )}
                </button>
              </form>

              <div className="auth-footer">
                <p>
                  Didn't receive the code?{' '}
                  <button 
                    type="button" 
                    className="link-button"
                    onClick={handleResendOTP}
                    disabled={otpResending}
                  >
                    {otpResending ? 'Sending...' : 'Resend OTP'}
                  </button>
                </p>
                <p>
                  <button 
                    type="button" 
                    className="link-button"
                    onClick={() => setShowOTPVerification(false)}
                  >
                    Back to registration
                  </button>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuthScreen

import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './AuthScreen.css'

interface AuthScreenProps {
  onLogin: () => void
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const { login, register, isLoading } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('🔄 AuthScreen: Form submitted, mode:', isLogin ? 'login' : 'register')
    setError('')
    setSuccess('')

    // Validation
    console.log('🔄 AuthScreen: Starting form validation...')
    if (!isLogin && formData.password !== formData.confirmPassword) {
      console.log('❌ AuthScreen: Password confirmation mismatch')
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      console.log('❌ AuthScreen: Password too short')
      setError('Password must be at least 6 characters long')
      return
    }

    if (!isLogin && !formData.username.trim()) {
      console.log('❌ AuthScreen: Username missing for registration')
      setError('Player name is required')
      return
    }

    console.log('✅ AuthScreen: Form validation passed')

    try {
      if (isLogin) {
        console.log('🔄 AuthScreen: Starting login process for:', formData.email)
        const result = await login({
          email: formData.email,
          password: formData.password
        })

        console.log('📡 AuthScreen: Login result:', { success: result.success, message: result.message })
        if (result.success) {
          console.log('✅ AuthScreen: Login successful, navigating to next step')
          setSuccess(result.message)
          setTimeout(() => {
            onLogin()
          }, 1000)
        } else {
          console.log('❌ AuthScreen: Login failed:', result.message)
          setError(result.message)
        }
      } else {
        console.log('🔄 AuthScreen: Starting registration process for:', formData.email, 'username:', formData.username)
        const result = await register({
          username: formData.username,
          email: formData.email,
          password: formData.password
        })

        console.log('📡 AuthScreen: Registration result:', { success: result.success, message: result.message })
        if (result.success) {
          console.log('✅ AuthScreen: Registration successful, navigating to next step')
          setSuccess(result.message)
          setTimeout(() => {
            onLogin()
          }, 1000)
        } else {
          console.log('❌ AuthScreen: Registration failed:', result.message)
          setError(result.message)
        }
      }
    } catch (error) {
      console.error('❌ AuthScreen: Unexpected error during authentication:', error)
      setError('An unexpected error occurred. Please try again.')
    }
  }

  const toggleMode = () => {
    console.log('🔄 AuthScreen: Toggling mode from', isLogin ? 'login' : 'register', 'to', !isLogin ? 'login' : 'register')
    setIsLogin(!isLogin)
    setFormData({
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    })
    setError('')
    setSuccess('')
    console.log('✅ AuthScreen: Mode toggle complete, form cleared')
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
        </div>
      </div>
    </div>
  )
}

export default AuthScreen

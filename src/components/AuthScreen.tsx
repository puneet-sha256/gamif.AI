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
        if (!formData.username.trim()) {
          setError('Hunter name is required')
          return
        }

        const result = await register({
          username: formData.username,
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
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.')
    }
  }

  const toggleMode = () => {
    setIsLogin(!isLogin)
    setFormData({
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
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
              <div className="subtitle">Hunter System</div>
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
                <label htmlFor="username">Hunter Name</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="Enter your hunter name"
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
                isLogin ? 'Enter System' : 'Register Hunter'
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              {isLogin ? "New hunter? " : "Already registered? "}
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

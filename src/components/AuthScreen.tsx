import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import ThemeToggle from './ThemeToggle'
import './AuthScreen.css'

interface AuthScreenProps {
  onLogin: () => void
}

const OTP_LENGTH = 6
const OTP_EXPIRY_SECONDS = 5 * 60 // 5 minutes
const RESEND_COOLDOWN_SECONDS = 30 // 30 seconds before allowing resend

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const { login, sendOtp, verifyOtp, sendPasswordResetOtp, verifyPasswordResetOtp, resetPassword, isLoading } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [registrationStep, setRegistrationStep] = useState<'form' | 'otp'>('form')
  const [forgotPasswordStep, setForgotPasswordStep] = useState<'email' | 'otp' | 'newPassword' | null>(null)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [forgotEmail, setForgotEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [countdown, setCountdown] = useState(OTP_EXPIRY_SECONDS)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([])
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const resendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Clear error and success messages when switching between login and register
  useEffect(() => {
    setError('')
    setSuccess('')
    setRegistrationStep('form')
    setForgotPasswordStep(null)
    setOtpDigits(Array(OTP_LENGTH).fill(''))
    setForgotEmail('')
    setNewPassword('')
    setConfirmNewPassword('')
    stopCountdown()
    stopResendTimer()
  }, [isLogin])

  const stopCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
  }, [])

  const stopResendTimer = useCallback(() => {
    if (resendTimerRef.current) {
      clearInterval(resendTimerRef.current)
      resendTimerRef.current = null
    }
  }, [])

  const startResendCooldown = useCallback(() => {
    stopResendTimer()
    setResendCooldown(RESEND_COOLDOWN_SECONDS)

    resendTimerRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          stopResendTimer()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [stopResendTimer])

  const startCountdown = useCallback(() => {
    stopCountdown()
    setCountdown(OTP_EXPIRY_SECONDS)
    startResendCooldown()

    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          stopCountdown()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [stopCountdown, startResendCooldown])

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      stopCountdown()
      stopResendTimer()
    }
  }, [stopCountdown, stopResendTimer])

  const formatCountdown = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return

    const newDigits = [...otpDigits]
    newDigits[index] = value
    setOtpDigits(newDigits)

    // Auto-focus next input
    if (value && index < OTP_LENGTH - 1) {
      otpInputRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      otpInputRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (pasted.length === 0) return

    const newDigits = [...otpDigits]
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i]
    }
    setOtpDigits(newDigits)

    // Focus last filled input or the next empty one
    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1)
    otpInputRefs.current[focusIndex]?.focus()
  }

  const handleSendOtp = async () => {
    setError('')
    setSuccess('')

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    if (!formData.username.trim()) {
      setError('Player name is required')
      return
    }

    try {
      const result = await sendOtp({
        username: formData.username,
        email: formData.email,
        password: formData.password
      })

      if (result.success) {
        setSuccess(result.message)
        setRegistrationStep('otp')
        setOtpDigits(Array(OTP_LENGTH).fill(''))
        startCountdown()
        // Focus first OTP input after state update
        setTimeout(() => otpInputRefs.current[0]?.focus(), 100)
      } else {
        setError(result.message)
      }
    } catch (err) {
      console.error('AuthScreen: Unexpected error sending OTP:', err)
      setError('An unexpected error occurred. Please try again.')
    }
  }

  const handleVerifyOtp = async () => {
    setError('')
    setSuccess('')

    const otp = otpDigits.join('')
    if (otp.length !== OTP_LENGTH) {
      setError('Please enter the complete 6-digit code')
      return
    }

    try {
      const result = await verifyOtp(formData.email, otp)

      if (result.success) {
        setSuccess(result.message)
        stopCountdown()
        setTimeout(() => {
          onLogin()
        }, 1000)
      } else {
        setError(result.message)
        setOtpDigits(Array(OTP_LENGTH).fill(''))
        otpInputRefs.current[0]?.focus()
      }
    } catch (err) {
      console.error('AuthScreen: Unexpected error verifying OTP:', err)
      setError('An unexpected error occurred. Please try again.')
    }
  }

  const handleResendOtp = async () => {
    setError('')
    setSuccess('')
    setOtpDigits(Array(OTP_LENGTH).fill(''))

    try {
      const result = await sendOtp({
        username: formData.username,
        email: formData.email,
        password: formData.password
      })

      if (result.success) {
        setSuccess('New verification code sent!')
        startCountdown() // resets both expiry and resend cooldown
        otpInputRefs.current[0]?.focus()
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError('Failed to resend code. Please try again.')
    }
  }

  // --- Forgot Password Handlers ---

  const handleForgotPasswordClick = () => {
    setError('')
    setSuccess('')
    setForgotPasswordStep('email')
    setForgotEmail(formData.email) // Pre-fill if user already typed an email
  }

  const handleForgotSendOtp = async () => {
    setError('')
    setSuccess('')

    if (!forgotEmail.trim()) {
      setError('Email address is required')
      return
    }

    try {
      const result = await sendPasswordResetOtp(forgotEmail)

      if (result.success) {
        setSuccess(result.message)
        setForgotPasswordStep('otp')
        setOtpDigits(Array(OTP_LENGTH).fill(''))
        startCountdown()
        setTimeout(() => otpInputRefs.current[0]?.focus(), 100)
      } else {
        setError(result.message)
      }
    } catch (err) {
      console.error('AuthScreen: Unexpected error sending reset OTP:', err)
      setError('An unexpected error occurred. Please try again.')
    }
  }

  const handleForgotVerifyOtp = async () => {
    setError('')
    setSuccess('')

    const otp = otpDigits.join('')
    if (otp.length !== OTP_LENGTH) {
      setError('Please enter the complete 6-digit code')
      return
    }

    try {
      const result = await verifyPasswordResetOtp(forgotEmail, otp)

      if (result.success) {
        setForgotPasswordStep('newPassword')
        setSuccess('Code verified! Enter your new password.')
        stopCountdown()
      } else {
        setError(result.message)
        setOtpDigits(Array(OTP_LENGTH).fill(''))
        otpInputRefs.current[0]?.focus()
      }
    } catch (err) {
      console.error('AuthScreen: Unexpected error verifying reset OTP:', err)
      setError('An unexpected error occurred. Please try again.')
    }
  }

  const handleResetPassword = async () => {
    setError('')
    setSuccess('')

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match')
      return
    }

    const otp = otpDigits.join('')

    try {
      const result = await resetPassword(forgotEmail, otp, newPassword)

      if (result.success) {
        setSuccess('Password reset! You can now log in.')
        setForgotPasswordStep(null)
        setForgotEmail('')
        setNewPassword('')
        setConfirmNewPassword('')
        setOtpDigits(Array(OTP_LENGTH).fill(''))
        stopCountdown()
      } else {
        setError(result.message)
      }
    } catch (err) {
      console.error('AuthScreen: Unexpected error resetting password:', err)
      setError('An unexpected error occurred. Please try again.')
    }
  }

  const handleForgotResendOtp = async () => {
    setError('')
    setSuccess('')
    setOtpDigits(Array(OTP_LENGTH).fill(''))

    try {
      const result = await sendPasswordResetOtp(forgotEmail)

      if (result.success) {
        setSuccess('New reset code sent!')
        startCountdown()
        otpInputRefs.current[0]?.focus()
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError('Failed to resend code. Please try again.')
    }
  }

  const handleForgotBack = () => {
    if (forgotPasswordStep === 'newPassword') {
      setForgotPasswordStep('otp')
      setError('')
      setSuccess('')
    } else if (forgotPasswordStep === 'otp') {
      setForgotPasswordStep('email')
      setOtpDigits(Array(OTP_LENGTH).fill(''))
      setError('')
      setSuccess('')
      stopCountdown()
    } else {
      setForgotPasswordStep(null)
      setForgotEmail('')
      setError('')
      setSuccess('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (isLogin) {
      // Login flow — unchanged
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters long')
        return
      }

      try {
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
      } catch (err) {
        console.error('AuthScreen: Unexpected error during login:', err)
        setError('An unexpected error occurred. Please try again.')
      }
    } else {
      // Registration flow — send OTP
      await handleSendOtp()
    }
  }

  const handleBackToForm = () => {
    setRegistrationStep('form')
    setOtpDigits(Array(OTP_LENGTH).fill(''))
    setError('')
    setSuccess('')
    stopCountdown()
  }

  const toggleMode = () => {
    setIsLogin(!isLogin)
    setFormData({
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    })
    setForgotPasswordStep(null)
    setForgotEmail('')
    setNewPassword('')
    setConfirmNewPassword('')
    setError('')
    setSuccess('')
  }

  // Mask email for display: sh****@gmail.com
  const getMaskedEmail = (email: string): string => {
    const [local, domain] = email.split('@')
    if (!domain) return email
    const visible = local.slice(0, 2)
    return `${visible}${'*'.repeat(Math.max(local.length - 2, 2))}@${domain}`
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
              <h1>GAMIF.AI</h1>
              <div className="subtitle">Life Operating System</div>
            </div>
            <ThemeToggle />
          </div>

          {/* Show tabs only when not in OTP step or forgot password flow */}
          {registrationStep === 'form' && !forgotPasswordStep && (
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
          )}

          {/* Forgot Password Flow */}
          {forgotPasswordStep ? (
            <div className="otp-section">
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

              {/* Step 1: Email */}
              {forgotPasswordStep === 'email' && (
                <>
                  <div className="otp-info">
                    <p className="otp-info-text">
                      Enter your email to receive a password reset code
                    </p>
                  </div>

                  <div className="input-group">
                    <label htmlFor="forgot-email">Email</label>
                    <input
                      type="email"
                      id="forgot-email"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      placeholder="Enter your registered email"
                      autoFocus
                    />
                  </div>

                  <button
                    type="button"
                    className={`auth-button ${isLoading ? 'loading' : ''}`}
                    disabled={isLoading || !forgotEmail.trim()}
                    onClick={handleForgotSendOtp}
                  >
                    {isLoading ? (
                      <span className="loading-spinner"></span>
                    ) : (
                      'Send Reset Code'
                    )}
                  </button>

                  <div className="otp-actions">
                    <button
                      type="button"
                      className="link-button"
                      onClick={handleForgotBack}
                    >
                      Back to Login
                    </button>
                  </div>
                </>
              )}

              {/* Step 2: OTP */}
              {forgotPasswordStep === 'otp' && (
                <>
                  <div className="otp-info">
                    <p className="otp-info-text">
                      Enter the 6-digit code sent to
                    </p>
                    <p className="otp-email">{getMaskedEmail(forgotEmail)}</p>
                  </div>

                  <div className="otp-inputs">
                    {otpDigits.map((digit, index) => (
                      <input
                        key={index}
                        ref={el => { otpInputRefs.current[index] = el }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        className="otp-input"
                        value={digit}
                        onChange={e => handleOtpChange(index, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(index, e)}
                        onPaste={index === 0 ? handleOtpPaste : undefined}
                        autoFocus={index === 0}
                      />
                    ))}
                  </div>

                  <div className="otp-timer">
                    {countdown > 0 ? (
                      <span className="timer-text">Code expires in {formatCountdown(countdown)}</span>
                    ) : (
                      <span className="timer-expired">Code expired</span>
                    )}
                  </div>

                  <button
                    type="button"
                    className={`auth-button ${isLoading ? 'loading' : ''}`}
                    disabled={isLoading || otpDigits.join('').length !== OTP_LENGTH}
                    onClick={handleForgotVerifyOtp}
                  >
                    {isLoading ? (
                      <span className="loading-spinner"></span>
                    ) : (
                      'Verify Code'
                    )}
                  </button>

                  <div className="otp-actions">
                    <button
                      type="button"
                      className={`resend-button ${resendCooldown === 0 ? 'resend-ready' : ''}`}
                      onClick={handleForgotResendOtp}
                      disabled={resendCooldown > 0 || isLoading}
                    >
                      {resendCooldown > 0
                        ? `Resend in 0:${resendCooldown.toString().padStart(2, '0')}`
                        : 'Resend Code'
                      }
                    </button>
                    <button
                      type="button"
                      className="link-button"
                      onClick={handleForgotBack}
                    >
                      Back
                    </button>
                  </div>
                </>
              )}

              {/* Step 3: New Password */}
              {forgotPasswordStep === 'newPassword' && (
                <>
                  <div className="otp-info">
                    <p className="otp-info-text">
                      Enter your new password
                    </p>
                  </div>

                  <div className="input-group">
                    <label htmlFor="new-password">New Password</label>
                    <input
                      type="password"
                      id="new-password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 6 chars)"
                      autoFocus
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="confirm-new-password">Confirm New Password</label>
                    <input
                      type="password"
                      id="confirm-new-password"
                      value={confirmNewPassword}
                      onChange={e => setConfirmNewPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>

                  <button
                    type="button"
                    className={`auth-button ${isLoading ? 'loading' : ''}`}
                    disabled={isLoading || !newPassword || !confirmNewPassword}
                    onClick={handleResetPassword}
                  >
                    {isLoading ? (
                      <span className="loading-spinner"></span>
                    ) : (
                      'Reset Password'
                    )}
                  </button>

                  <div className="otp-actions">
                    <button
                      type="button"
                      className="link-button"
                      onClick={handleForgotBack}
                    >
                      Back
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : registrationStep === 'otp' && !isLogin ? (
            /* OTP Verification Step (Registration) */
            <div className="otp-section">
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

              <div className="otp-info">
                <p className="otp-info-text">
                  Enter the 6-digit code sent to
                </p>
                <p className="otp-email">{getMaskedEmail(formData.email)}</p>
              </div>

              <div className="otp-inputs">
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => { otpInputRefs.current[index] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    className="otp-input"
                    value={digit}
                    onChange={e => handleOtpChange(index, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(index, e)}
                    onPaste={index === 0 ? handleOtpPaste : undefined}
                    autoFocus={index === 0}
                  />
                ))}
              </div>

              <div className="otp-timer">
                {countdown > 0 ? (
                  <span className="timer-text">Code expires in {formatCountdown(countdown)}</span>
                ) : (
                  <span className="timer-expired">Code expired</span>
                )}
              </div>

              <button
                type="button"
                className={`auth-button ${isLoading ? 'loading' : ''}`}
                disabled={isLoading || otpDigits.join('').length !== OTP_LENGTH}
                onClick={handleVerifyOtp}
              >
                {isLoading ? (
                  <span className="loading-spinner"></span>
                ) : (
                  'Verify & Register'
                )}
              </button>

              <div className="otp-actions">
                <button
                  type="button"
                  className={`resend-button ${resendCooldown === 0 ? 'resend-ready' : ''}`}
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || isLoading}
                >
                  {resendCooldown > 0
                    ? `Resend in 0:${resendCooldown.toString().padStart(2, '0')}`
                    : 'Resend Code'
                  }
                </button>
                <button
                  type="button"
                  className="link-button"
                  onClick={handleBackToForm}
                >
                  Back
                </button>
              </div>
            </div>
          ) : (
            /* Login / Registration Form */
            <>
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

                {isLogin && (
                  <div className="forgot-password-link">
                    <button
                      type="button"
                      className="link-button"
                      onClick={handleForgotPasswordClick}
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}
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
          )}
        </div>
      </div>
    </div>
  )
}

export default AuthScreen

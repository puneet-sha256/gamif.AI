import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import FierceLogo from './FierceLogo'
import FierceThemeToggle from './FierceThemeToggle'
import { IconArrowRight, IconBack, IconSparkle } from './FierceIcons'

interface Props {
  onLogin: () => void
}

const OTP_LENGTH = 6
const OTP_EXPIRY_SECONDS = 5 * 60
const RESEND_COOLDOWN_SECONDS = 30

type View = 'form' | 'otp-register' | 'forgot-email' | 'forgot-otp' | 'forgot-new'

export default function FierceAuthScreen({ onLogin }: Props) {
  const {
    login,
    sendOtp,
    verifyOtp,
    sendPasswordResetOtp,
    verifyPasswordResetOtp,
    resetPassword,
    isLoading,
  } = useAuth()
  const [isLoginTab, setIsLoginTab] = useState(true)
  const [view, setView] = useState<View>('form')
  const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' })
  const [forgotEmail, setForgotEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [countdown, setCountdown] = useState(OTP_EXPIRY_SECONDS)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const otpRefs = useRef<(HTMLInputElement | null)[]>([])
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const resendRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopCountdown = useCallback(() => { if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null } }, [])
  const stopResend = useCallback(() => { if (resendRef.current) { clearInterval(resendRef.current); resendRef.current = null } }, [])

  const startResend = useCallback(() => {
    stopResend()
    setResendCooldown(RESEND_COOLDOWN_SECONDS)
    resendRef.current = setInterval(() => {
      setResendCooldown((c) => { if (c <= 1) { stopResend(); return 0 } return c - 1 })
    }, 1000)
  }, [stopResend])

  const startCountdown = useCallback(() => {
    stopCountdown()
    setCountdown(OTP_EXPIRY_SECONDS)
    startResend()
    countdownRef.current = setInterval(() => {
      setCountdown((c) => { if (c <= 1) { stopCountdown(); return 0 } return c - 1 })
    }, 1000)
  }, [stopCountdown, startResend])

  useEffect(() => () => { stopCountdown(); stopResend() }, [stopCountdown, stopResend])

  useEffect(() => {
    setError(''); setSuccess(''); setView('form')
    setOtp(Array(OTP_LENGTH).fill(''))
    setForgotEmail(''); setNewPassword(''); setConfirmNewPassword('')
    stopCountdown(); stopResend()
  }, [isLoginTab, stopCountdown, stopResend])

  const formatCountdown = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  const handleOtpChange = (i: number, value: string) => {
    if (value && !/^\d$/.test(value)) return
    const next = [...otp]
    next[i] = value
    setOtp(next)
    if (value && i < OTP_LENGTH - 1) otpRefs.current[i + 1]?.focus()
  }

  const handleOtpKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus()
  }

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return
    const next = [...otp]
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setOtp(next)
    otpRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus()
  }

  const maskEmail = (email: string) => {
    const [local, domain] = email.split('@')
    if (!domain) return email
    return `${local.slice(0, 2)}${'*'.repeat(Math.max(local.length - 2, 2))}@${domain}`
  }

  // ----- Login submit -----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSuccess('')
    if (isLoginTab) {
      if (formData.password.length < 6) return setError('Password must be at least 6 characters.')
      const r = await login({ email: formData.email, password: formData.password })
      if (r.success) {
        setSuccess(r.message)
        setTimeout(onLogin, 600)
      } else setError(r.message)
    } else {
      if (formData.password !== formData.confirmPassword) return setError('Passwords do not match.')
      if (formData.password.length < 6) return setError('Password must be at least 6 characters.')
      if (!formData.username.trim()) return setError('Name is required.')
      const r = await sendOtp({ username: formData.username, email: formData.email, password: formData.password })
      if (r.success) {
        setSuccess(r.message); setView('otp-register')
        setOtp(Array(OTP_LENGTH).fill('')); startCountdown()
        setTimeout(() => otpRefs.current[0]?.focus(), 100)
      } else setError(r.message)
    }
  }

  const handleVerifyOtp = async () => {
    setError(''); setSuccess('')
    const code = otp.join('')
    if (code.length !== OTP_LENGTH) return setError('Enter the full 6-digit code.')
    const r = await verifyOtp(formData.email, code)
    if (r.success) {
      setSuccess(r.message); stopCountdown()
      setTimeout(onLogin, 600)
    } else { setError(r.message); setOtp(Array(OTP_LENGTH).fill('')); otpRefs.current[0]?.focus() }
  }

  const handleResendOtp = async () => {
    setError(''); setSuccess(''); setOtp(Array(OTP_LENGTH).fill(''))
    const r = await sendOtp({ username: formData.username, email: formData.email, password: formData.password })
    if (r.success) { setSuccess('New code sent.'); startCountdown(); otpRefs.current[0]?.focus() } else setError(r.message)
  }

  // ----- Forgot password flow -----
  const handleForgotSendOtp = async () => {
    setError(''); setSuccess('')
    if (!forgotEmail.trim()) return setError('Email is required.')
    const r = await sendPasswordResetOtp(forgotEmail)
    if (r.success) {
      setSuccess(r.message); setView('forgot-otp')
      setOtp(Array(OTP_LENGTH).fill('')); startCountdown()
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    } else setError(r.message)
  }

  const handleForgotVerifyOtp = async () => {
    setError(''); setSuccess('')
    const code = otp.join('')
    if (code.length !== OTP_LENGTH) return setError('Enter the full 6-digit code.')
    const r = await verifyPasswordResetOtp(forgotEmail, code)
    if (r.success) { setView('forgot-new'); setSuccess('Code verified.'); stopCountdown() }
    else { setError(r.message); setOtp(Array(OTP_LENGTH).fill('')); otpRefs.current[0]?.focus() }
  }

  const handleResetPassword = async () => {
    setError(''); setSuccess('')
    if (newPassword.length < 6) return setError('Password must be at least 6 characters.')
    if (newPassword !== confirmNewPassword) return setError('Passwords do not match.')
    const r = await resetPassword(forgotEmail, otp.join(''), newPassword)
    if (r.success) {
      setSuccess('Password reset. Sign in with the new one.')
      setView('form'); setForgotEmail(''); setNewPassword(''); setConfirmNewPassword('')
      setOtp(Array(OTP_LENGTH).fill('')); stopCountdown()
    } else setError(r.message)
  }

  // ----- View renderers -----
  const renderForm = () => (
    <>
      <div style={{ display: 'flex', background: 'var(--bg-muted)', padding: 3, borderRadius: 'var(--r-md)', marginBottom: 20 }}>
        {(['login', 'register'] as const).map((t) => {
          const active = (t === 'login') === isLoginTab
          return (
            <button
              key={t}
              type="button"
              onClick={() => setIsLoginTab(t === 'login')}
              style={{
                flex: 1, height: 34, borderRadius: 7, fontSize: 13, fontWeight: 600,
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: active ? 'var(--bg-surface)' : 'transparent',
                boxShadow: active ? 'var(--shadow-xs)' : 'none', cursor: 'pointer',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                transition: 'color 120ms ease, background 120ms ease',
              }}
            >
              {t === 'login' ? 'Sign in' : 'Register'}
            </button>
          )
        })}
      </div>

      <form className="fierce-auth__form" onSubmit={handleSubmit}>
        {error && <div className="fierce-error">{error}</div>}
        {success && <div className="fierce-success">{success}</div>}

        {!isLoginTab && (
          <div className="fierce-field">
            <label className="fierce-field__label" htmlFor="fa-name">Name</label>
            <input id="fa-name" className="fierce-input" type="text" value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })} placeholder="What should we call you?" required />
          </div>
        )}

        <div className="fierce-field">
          <label className="fierce-field__label" htmlFor="fa-email">Email</label>
          <input id="fa-email" className="fierce-input" type="email" value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="you@example.com" autoComplete="email" required />
        </div>

        <div className="fierce-field">
          <div className="fierce-row fierce-row--between">
            <label className="fierce-field__label" htmlFor="fa-pw">Password</label>
            {isLoginTab && (
              <button type="button" className="fierce-link" onClick={() => { setError(''); setSuccess(''); setView('forgot-email'); setForgotEmail(formData.email) }}>
                Forgot?
              </button>
            )}
          </div>
          <input id="fa-pw" className="fierce-input" type="password" value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="At least 6 characters" required />
        </div>

        {!isLoginTab && (
          <div className="fierce-field">
            <label className="fierce-field__label" htmlFor="fa-cpw">Confirm password</label>
            <input id="fa-cpw" className="fierce-input" type="password" value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} required />
          </div>
        )}

        <button type="submit" className="fierce-btn fierce-btn--fierce fierce-btn--lg fierce-btn--block" disabled={isLoading}>
          {isLoading ? 'Working…' : isLoginTab ? <>Enter <IconArrowRight /></> : <>Register <IconArrowRight /></>}
        </button>
      </form>

      <div className="fierce-auth__foot">
        {isLoginTab ? 'New here? ' : 'Already a member? '}
        <button className="fierce-link" onClick={() => setIsLoginTab(!isLoginTab)}>
          {isLoginTab ? 'Create an account' : 'Sign in'}
        </button>
      </div>
    </>
  )

  const renderOtpView = (verifyHandler: () => void, resendHandler: () => void, onBack: () => void, emailToShow: string, ctaLabel: string) => (
    <>
      <button type="button" className="fierce-link" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 14, fontSize: 13 }}>
        <IconBack style={{ width: 14, height: 14 }} /> Back
      </button>
      <div className="fierce-auth__head">
        <span className="fierce-eyebrow fierce-eyebrow--accent">VERIFY</span>
        <h1>Check your email <IconSparkle className="fierce-sparkle" style={{ verticalAlign: -2, marginLeft: 4 }} /></h1>
        <p>We sent a 6-digit code to <strong style={{ color: 'var(--text-primary)' }}>{maskEmail(emailToShow)}</strong></p>
      </div>
      {error && <div className="fierce-error fierce-mb-4">{error}</div>}
      {success && <div className="fierce-success fierce-mb-4">{success}</div>}
      <div className="fierce-otp">
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { otpRefs.current[i] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleOtpChange(i, e.target.value)}
            onKeyDown={(e) => handleOtpKeyDown(i, e)}
            onPaste={i === 0 ? handleOtpPaste : undefined}
            autoFocus={i === 0}
          />
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 14 }}>
        {countdown > 0 ? <>Code expires in <strong style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatCountdown(countdown)}</strong></> : <span style={{ color: 'var(--danger)' }}>Code expired</span>}
      </div>
      <button type="button" className="fierce-btn fierce-btn--fierce fierce-btn--lg fierce-btn--block fierce-mt-4" disabled={isLoading || otp.join('').length !== OTP_LENGTH} onClick={verifyHandler}>
        {isLoading ? 'Verifying…' : ctaLabel}
      </button>
      <div style={{ textAlign: 'center', marginTop: 14, fontSize: 13, color: 'var(--text-muted)' }}>
        Didn't get it?{' '}
        <button className="fierce-link" disabled={resendCooldown > 0 || isLoading} onClick={resendHandler}>
          {resendCooldown > 0 ? `Resend in 0:${resendCooldown.toString().padStart(2, '0')}` : 'Resend code'}
        </button>
      </div>
    </>
  )

  return (
    <div className="fierce-app">
      <div className="fierce-page fierce-page--centered">
        {/* Decorative backdrop */}
        <span className="fierce-orb fierce-orb--rose" style={{ width: 360, height: 360, top: -100, right: -100 }} />
        <span className="fierce-orb fierce-orb--amber" style={{ width: 280, height: 280, bottom: -100, left: -80 }} />
        <div className="fierce-dot-grid" />

        <div style={{ position: 'absolute', top: 24, left: 24, zIndex: 2 }}>
          <FierceLogo />
        </div>

        <div className="fierce-auth">
          {view === 'form' && (
            <>
              <div className="fierce-auth__head">
                <span className="fierce-eyebrow fierce-eyebrow--accent">{isLoginTab ? 'WELCOME BACK' : 'JOIN THE GRIND'}</span>
                <h1>{isLoginTab ? <>Back to the grind.</> : <>Become who you said you'd <span className="fierce-ember-text">be</span>.</>}</h1>
                <p>{isLoginTab ? 'Pick up where you left off.' : 'Sign up. We\'ll turn your goals into daily missions.'}</p>
              </div>
              {renderForm()}
            </>
          )}
          {view === 'otp-register' && renderOtpView(handleVerifyOtp, handleResendOtp, () => { setView('form'); setOtp(Array(OTP_LENGTH).fill('')); stopCountdown() }, formData.email, 'Verify and enter')}
          {view === 'forgot-email' && (
            <>
              <button className="fierce-link" onClick={() => setView('form')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 14, fontSize: 13 }}>
                <IconBack style={{ width: 14, height: 14 }} /> Back
              </button>
              <div className="fierce-auth__head">
                <span className="fierce-eyebrow fierce-eyebrow--accent">RESET</span>
                <h1>Reset password</h1>
                <p>Enter your email — we'll send a code.</p>
              </div>
              {error && <div className="fierce-error fierce-mb-4">{error}</div>}
              {success && <div className="fierce-success fierce-mb-4">{success}</div>}
              <div className="fierce-field">
                <label className="fierce-field__label" htmlFor="ff-email">Email</label>
                <input id="ff-email" className="fierce-input" type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="you@example.com" autoFocus />
              </div>
              <button className="fierce-btn fierce-btn--fierce fierce-btn--lg fierce-btn--block fierce-mt-4" disabled={isLoading || !forgotEmail.trim()} onClick={handleForgotSendOtp}>
                {isLoading ? 'Sending…' : <>Send reset code <IconArrowRight /></>}
              </button>
            </>
          )}
          {view === 'forgot-otp' && renderOtpView(handleForgotVerifyOtp, handleForgotSendOtp, () => { setView('forgot-email'); setOtp(Array(OTP_LENGTH).fill('')); stopCountdown() }, forgotEmail, 'Verify code')}
          {view === 'forgot-new' && (
            <>
              <div className="fierce-auth__head">
                <span className="fierce-eyebrow fierce-eyebrow--accent">NEW PASSWORD</span>
                <h1>Set a new password</h1>
                <p>Make it count.</p>
              </div>
              {error && <div className="fierce-error fierce-mb-4">{error}</div>}
              <div className="fierce-field">
                <label className="fierce-field__label" htmlFor="ff-np">New password</label>
                <input id="ff-np" className="fierce-input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 6 characters" autoFocus />
              </div>
              <div className="fierce-field">
                <label className="fierce-field__label" htmlFor="ff-cnp">Confirm password</label>
                <input id="ff-cnp" className="fierce-input" type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} />
              </div>
              <button className="fierce-btn fierce-btn--fierce fierce-btn--lg fierce-btn--block fierce-mt-4" disabled={isLoading || !newPassword || !confirmNewPassword} onClick={handleResetPassword}>
                Reset password
              </button>
            </>
          )}
        </div>

        <FierceThemeToggle />
      </div>
    </div>
  )
}

import { logger } from '../../utils/logger'

interface OtpEntry {
  otp: string
  username: string
  email: string
  passwordHash: string
  expiresAt: number
}

const OTP_EXPIRY_MS = 5 * 60 * 1000 // 5 minutes
const CLEANUP_INTERVAL_MS = 60 * 1000 // Clean up every 1 minute

// E2E test mode: when process.env.E2E_TEST_MODE === 'true', accept this code as
// a "skeleton key" alongside the real OTP. The OTP entry must still exist
// (i.e. sendOtp must have been called for the email), so this only bypasses
// the inbox round-trip — not the registration request flow itself.
const E2E_BYPASS_OTP = '000000'

// In-memory OTP store keyed by lowercase email
const otpStore = new Map<string, OtpEntry>()

// Generate a random 6-digit OTP
export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Store OTP with registration data
export function storeOtp(
  email: string,
  otp: string,
  username: string,
  passwordHash: string
): void {
  const key = email.toLowerCase()

  // Overwrite any existing OTP for this email
  otpStore.set(key, {
    otp,
    username,
    email,
    passwordHash,
    expiresAt: Date.now() + OTP_EXPIRY_MS
  })

  logger.custom('🔑', `OTP stored for ${key} (expires in 5 minutes)`)
}

// Verify OTP and return registration data if valid
export function verifyOtp(
  email: string,
  otp: string
): { valid: true; username: string; email: string; passwordHash: string } | { valid: false; reason: 'invalid' | 'expired' } {
  const key = email.toLowerCase()
  const entry = otpStore.get(key)

  if (!entry) {
    logger.custom('❌', `OTP verification failed: no entry for ${key}`)
    return { valid: false, reason: 'invalid' }
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(key)
    logger.custom('⏰', `OTP expired for ${key}`)
    return { valid: false, reason: 'expired' }
  }

  const isE2EBypass = process.env.E2E_TEST_MODE === 'true' && otp === E2E_BYPASS_OTP
  if (entry.otp !== otp && !isE2EBypass) {
    logger.custom('❌', `OTP mismatch for ${key}`)
    return { valid: false, reason: 'invalid' }
  }
  if (isE2EBypass) {
    logger.custom('🧪', `[E2E] OTP bypass accepted for ${key}`)
  }

  // Valid OTP — remove from store and return registration data
  otpStore.delete(key)
  logger.custom('✅', `OTP verified for ${key}`)
  return {
    valid: true,
    username: entry.username,
    email: entry.email,
    passwordHash: entry.passwordHash
  }
}

// Get remaining time in seconds for an OTP (for frontend countdown)
export function getOtpRemainingSeconds(email: string): number {
  const key = email.toLowerCase()
  const entry = otpStore.get(key)

  if (!entry) return 0

  const remaining = Math.max(0, Math.ceil((entry.expiresAt - Date.now()) / 1000))
  return remaining
}

// Clean up expired entries
function cleanupExpired(): void {
  const now = Date.now()
  let cleaned = 0

  for (const [key, entry] of otpStore.entries()) {
    if (now > entry.expiresAt) {
      otpStore.delete(key)
      cleaned++
    }
  }

  if (cleaned > 0) {
    logger.custom('🧹', `Cleaned up ${cleaned} expired OTP entries`)
  }
}

// Start periodic cleanup
setInterval(cleanupExpired, CLEANUP_INTERVAL_MS)

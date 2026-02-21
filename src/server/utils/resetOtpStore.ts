import { logger } from '../../utils/logger'

interface ResetOtpEntry {
  otp: string
  email: string
  expiresAt: number
}

const OTP_EXPIRY_MS = 5 * 60 * 1000 // 5 minutes
const CLEANUP_INTERVAL_MS = 60 * 1000 // Clean up every 1 minute

// In-memory OTP store for password resets, keyed by lowercase email
const resetOtpStore = new Map<string, ResetOtpEntry>()

// Store OTP for password reset
export function storeResetOtp(email: string, otp: string): void {
  const key = email.toLowerCase()

  resetOtpStore.set(key, {
    otp,
    email,
    expiresAt: Date.now() + OTP_EXPIRY_MS
  })

  logger.custom('🔑', `Password reset OTP stored for ${key} (expires in 5 minutes)`)
}

// Verify OTP and return email if valid
// When consume=false, the OTP remains in the store for a subsequent verify+consume call
export function verifyResetOtp(
  email: string,
  otp: string,
  consume: boolean = true
): { valid: true; email: string } | { valid: false; reason: 'invalid' | 'expired' } {
  const key = email.toLowerCase()
  const entry = resetOtpStore.get(key)

  if (!entry) {
    logger.custom('❌', `Password reset OTP verification failed: no entry for ${key}`)
    return { valid: false, reason: 'invalid' }
  }

  if (Date.now() > entry.expiresAt) {
    resetOtpStore.delete(key)
    logger.custom('⏰', `Password reset OTP expired for ${key}`)
    return { valid: false, reason: 'expired' }
  }

  if (entry.otp !== otp) {
    logger.custom('❌', `Password reset OTP mismatch for ${key}`)
    return { valid: false, reason: 'invalid' }
  }

  // Valid OTP — optionally consume
  if (consume) {
    resetOtpStore.delete(key)
  }
  logger.custom('✅', `Password reset OTP verified for ${key}${consume ? '' : ' (kept for reset)'}`)
  return { valid: true, email: entry.email }
}

// Clean up expired entries
function cleanupExpired(): void {
  const now = Date.now()
  let cleaned = 0

  for (const [key, entry] of resetOtpStore.entries()) {
    if (now > entry.expiresAt) {
      resetOtpStore.delete(key)
      cleaned++
    }
  }

  if (cleaned > 0) {
    logger.custom('🧹', `Cleaned up ${cleaned} expired password reset OTP entries`)
  }
}

// Start periodic cleanup
setInterval(cleanupExpired, CLEANUP_INTERVAL_MS)

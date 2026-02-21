import type { 
  ApiSuccessResponse, 
  ApiErrorResponse,
  User
} from '../../shared/types'

// Helper function to create success responses
export function createSuccessResponse(
  message: string, 
  data?: any, 
  user?: Omit<User, 'passwordHash'>,
  sessionId?: string,
  changes?: any,
  metadata?: any
): ApiSuccessResponse {
  const response: ApiSuccessResponse = {
    success: true,
    message
  }
  
  if (data !== undefined) response.data = data
  if (user !== undefined) response.user = user
  if (sessionId !== undefined) response.sessionId = sessionId
  if (changes !== undefined) response.changes = changes
  if (metadata !== undefined) response.metadata = metadata
  
  return response
}

// Helper function to create error responses
export function createErrorResponse(message: string, code?: string): ApiErrorResponse {
  const response: ApiErrorResponse = {
    success: false,
    message
  }
  
  if (code) response.code = code
  
  return response
}

// Helper function to remove password from user object
export function sanitizeUser(user: User): Omit<User, 'passwordHash'> {
  const { passwordHash, ...userWithoutPassword } = user
  return userWithoutPassword
}

// Common error messages
export const ErrorMessages = {
  INVALID_REQUEST: 'Invalid request format',
  USER_EXISTS: 'Player with this email already exists',
  USERNAME_TAKEN: 'Player name already taken',
  USER_NOT_FOUND: 'Player not found in the system',
  INVALID_CREDENTIALS: 'Invalid email or password',
  INVALID_SESSION: 'Invalid session',
  INTERNAL_ERROR: 'Internal server error',
  OTP_INVALID: 'Invalid verification code. Please check and try again',
  OTP_EXPIRED: 'Verification code has expired. Please request a new one',
  OTP_SEND_FAILED: 'Failed to send verification email. Please try again',
  PASSWORD_RESET_EMAIL_NOT_FOUND: 'No account found with this email address',
  PASSWORD_RESET_OTP_SEND_FAILED: 'Failed to send password reset email. Please try again',
  INSUFFICIENT_SHARDS: 'Insufficient shards',
  VALIDATION_ERROR: (field: string) => `Invalid ${field} provided`
} as const

// Common success messages
export const SuccessMessages = {
  OTP_SENT: 'Verification code sent to your email',
  OTP_VERIFIED: 'Email verified! Player registered successfully!',
  PASSWORD_RESET_OTP_SENT: 'Password reset code sent to your email',
  PASSWORD_RESET_SUCCESS: 'Password reset successfully! You can now log in with your new password',
  REGISTRATION_SUCCESS: 'Player registered successfully!',
  LOGIN_SUCCESS: 'Welcome back, Player!',
  LOGOUT_SUCCESS: 'Logged out successfully',
  UPDATE_SUCCESS: 'Updated successfully',
  EXPERIENCE_UPDATED: 'Experience updated successfully',
  SHARDS_UPDATED: 'Shards updated successfully'
} as const
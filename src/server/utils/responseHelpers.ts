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
  changes?: any
): ApiSuccessResponse {
  const response: ApiSuccessResponse = {
    success: true,
    message
  }
  
  if (data !== undefined) response.data = data
  if (user !== undefined) response.user = user
  if (sessionId !== undefined) response.sessionId = sessionId
  if (changes !== undefined) response.changes = changes
  
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
  INVALID_CREDENTIALS: 'Invalid credentials',
  INVALID_SESSION: 'Invalid session',
  INTERNAL_ERROR: 'Internal server error',
  INSUFFICIENT_SHARDS: 'Insufficient shards',
  VALIDATION_ERROR: (field: string) => `Invalid ${field} provided`
} as const

// Common success messages
export const SuccessMessages = {
  REGISTRATION_SUCCESS: 'Player registered successfully!',
  LOGIN_SUCCESS: 'Welcome back, Player!',
  LOGOUT_SUCCESS: 'Logged out successfully',
  UPDATE_SUCCESS: 'Updated successfully',
  EXPERIENCE_UPDATED: 'Experience updated successfully',
  SHARDS_UPDATED: 'Shards updated successfully'
} as const
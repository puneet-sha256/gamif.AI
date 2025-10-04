// Export all shared types from a single entry point
export * from './user.types'
export * from './auth.types'
export * from './api.types'
export * from './context.types'

// Re-export commonly used types for convenience
export type { User, ProfileData, GoalsData, UserStats } from './user.types'
export type { Session, AuthState } from './auth.types'
export type { ApiResponse, AuthResponse } from './api.types'
export type { AuthContextType } from './context.types'
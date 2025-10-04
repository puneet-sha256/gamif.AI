import type { User } from './user.types'

// API response interfaces
export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
  user?: User
  sessionId?: string
}

// Authentication response specifically
export interface AuthResponse {
  success: boolean
  message: string
  user?: Omit<User, 'passwordHash'>
  sessionId?: string
}

// Generic success/error response
export interface BaseResponse {
  success: boolean
  message: string
}
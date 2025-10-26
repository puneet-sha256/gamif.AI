import type { User } from './user.types'

// Authentication and session related interfaces
export interface Session {
  userId: string
  sessionId: string
  createdAt: string
  lastAccess: string
}

export interface AuthState {
  user: User | null
  isLoading: boolean
}
// Type definitions for the gamif.AI application

export interface ProfileData {
  name: string
  age: number
  monthlyLimit: number
  currency: string
}

export interface GoalsData {
  longTermGoals: string
}

export interface UserStats {
  level: number
  experience: number
  shards: number
}

export interface User {
  id: string
  username: string
  email: string
  passwordHash: string
  createdAt: string
  lastLogin?: string
  profileData?: ProfileData
  goalsData?: GoalsData
  stats?: UserStats
}

export interface UserRegistration {
  username: string
  email: string
  password: string
}

export interface UserLogin {
  email: string
  password: string
}

export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
  user?: User
}

export interface AuthState {
  user: User | null
  isLoading: boolean
}

export interface SessionData {
  userId: string
  sessionId: string
  createdAt: string
  expiresAt: string
}

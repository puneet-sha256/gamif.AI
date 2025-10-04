// Core user-related interfaces
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
  strength: number
  intelligence: number
  charisma: number
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
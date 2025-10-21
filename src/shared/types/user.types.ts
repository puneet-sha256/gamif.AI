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
  experience: number
  shards: number
  strength: number
  intelligence: number
  charisma: number
}

// Task structure from Azure AI
export interface GeneratedTask {
  id: string // Unique identifier for the task
  title: string
  description: string
  xp: number
  shards: number
}

export interface GeneratedTasks {
  Strength?: GeneratedTask[]
  Intelligence?: GeneratedTask[]
  Charisma?: GeneratedTask[]
  lastUpdated?: string
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
  generatedTasks?: GeneratedTasks
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
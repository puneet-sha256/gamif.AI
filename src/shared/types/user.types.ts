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

// Task structure from Azure AI and user-created tasks
export interface GeneratedTask {
  id: string // Unique identifier for the task
  title?: string // Optional: present for user-created tasks, absent for AI tasks
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

// Shop item structure for user-created shop items
export interface ShopItem {
  id: string // Unique identifier for the shop item
  title: string // Name of the item
  description?: string // Optional description
  price: number // Price in shards
  image?: string // Optional emoji or image
  createdAt: string // When the item was added
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
  shopItems?: ShopItem[] // User's custom shop items
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
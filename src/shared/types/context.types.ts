import type { User, UserLogin, UserRegistration, ProfileData, GoalsData, GeneratedTasks } from './user.types'

// Frontend-specific context types
export interface AuthContextType {
  user: User | null
  login: (credentials: UserLogin) => Promise<{ success: boolean; message: string }>
  register: (userData: UserRegistration) => Promise<{ success: boolean; message: string }>
  logout: () => Promise<void>
  updateUser: (updates: Partial<User>) => Promise<boolean>
  saveProfileData: (profileData: ProfileData) => Promise<boolean>
  saveGoalsData: (goalsData: GoalsData) => Promise<boolean>
  getUserTasks: () => Promise<GeneratedTasks | null>
  refreshUserTasks: () => Promise<void>
  editGeneratedTask: (taskId: string, category: 'Strength' | 'Intelligence' | 'Charisma', updates: { description?: string; xp?: number; shards?: number }) => Promise<boolean>
  deleteGeneratedTask: (taskId: string, category: 'Strength' | 'Intelligence' | 'Charisma') => Promise<boolean>
  isLoading: boolean
}
import React, { createContext, useContext, useState, useEffect } from 'react'
import { userDatabase } from '../services/fileUserDatabase'
import type { User, UserRegistration, UserLogin } from '../services/fileUserDatabase'

interface AuthContextType {
  user: User | null
  login: (credentials: UserLogin) => Promise<{ success: boolean; message: string }>
  register: (userData: UserRegistration) => Promise<{ success: boolean; message: string }>
  logout: () => Promise<void>
  updateUser: (updates: Partial<User>) => Promise<boolean>
  saveProfileData: (profileData: any) => Promise<boolean>
  saveGoalsData: (goalsData: any) => Promise<boolean>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for existing user session on app start
    const loadCurrentUser = async () => {
      const currentUser = await userDatabase.getCurrentUser()
      setUser(currentUser)
      setIsLoading(false)
    }
    
    loadCurrentUser()
  }, [])

  const login = async (credentials: UserLogin): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true)
    try {
      const result = await userDatabase.login(credentials)
      if (result.success && result.user) {
        setUser(result.user)
      }
      return { success: result.success, message: result.message }
    } catch (error) {
      return { success: false, message: 'An error occurred during login' }
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (userData: UserRegistration): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true)
    try {
      const result = await userDatabase.register(userData)
      if (result.success && result.user) {
        // Automatically log in the user after registration
        const loginResult = await userDatabase.login({
          email: userData.email,
          password: userData.password
        })
        if (loginResult.success && loginResult.user) {
          setUser(loginResult.user)
        }
      }
      return { success: result.success, message: result.message }
    } catch (error) {
      return { success: false, message: 'An error occurred during registration' }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    await userDatabase.logout()
    setUser(null)
  }

  const updateUser = async (updates: Partial<User>): Promise<boolean> => {
    if (!user) return false

    const success = await userDatabase.updateUser(user.id, updates)
    if (success) {
      setUser(prev => prev ? { ...prev, ...updates } : null)
    }
    return success
  }

  const saveProfileData = async (profileData: any): Promise<boolean> => {
    if (!user) return false

    const success = await userDatabase.updateUser(user.id, { profileData })
    if (success) {
      setUser(prev => prev ? { ...prev, profileData } : null)
    }
    return success
  }

  const saveGoalsData = async (goalsData: any): Promise<boolean> => {
    if (!user) return false

    const success = await userDatabase.updateUser(user.id, { goalsData })
    if (success) {
      setUser(prev => prev ? { ...prev, goalsData } : null)
    }
    return success
  }

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    updateUser,
    saveProfileData,
    saveGoalsData,
    isLoading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

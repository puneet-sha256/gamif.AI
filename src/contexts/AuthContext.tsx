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
      console.log('🔄 AuthContext: Loading current user session...')
      try {
        const currentUser = await userDatabase.getCurrentUser()
        if (currentUser) {
          console.log('✅ AuthContext: User session found:', { 
            id: currentUser.id, 
            username: currentUser.username, 
            email: currentUser.email 
          })
          setUser(currentUser)
        } else {
          console.log('ℹ️ AuthContext: No existing user session found')
        }
      } catch (error) {
        console.error('❌ AuthContext: Error loading user session:', error)
      } finally {
        setIsLoading(false)
        console.log('✅ AuthContext: Initial loading complete')
      }
    }
    
    loadCurrentUser()
  }, [])

  const login = async (credentials: UserLogin): Promise<{ success: boolean; message: string }> => {
    console.log('🔄 AuthContext: Starting login process for:', credentials.email)
    setIsLoading(true)
    try {
      const result = await userDatabase.login(credentials)
      console.log('📡 AuthContext: Login API response:', { 
        success: result.success, 
        message: result.message,
        hasUser: !!result.user 
      })
      
      if (result.success && result.user) {
        console.log('✅ AuthContext: Login successful, setting user:', {
          id: result.user.id,
          username: result.user.username,
          email: result.user.email
        })
        setUser(result.user)
      } else {
        console.log('❌ AuthContext: Login failed:', result.message)
      }
      return { success: result.success, message: result.message }
    } catch (error) {
      console.error('❌ AuthContext: Login error:', error)
      return { success: false, message: 'An error occurred during login' }
    } finally {
      setIsLoading(false)
      console.log('✅ AuthContext: Login process complete')
    }
  }

  const register = async (userData: UserRegistration): Promise<{ success: boolean; message: string }> => {
    console.log('🔄 AuthContext: Starting registration process for:', userData.email, 'username:', userData.username)
    setIsLoading(true)
    try {
      const result = await userDatabase.register(userData)
      console.log('📡 AuthContext: Registration API response:', { 
        success: result.success, 
        message: result.message,
        hasUser: !!result.user 
      })
      
      if (result.success && result.user) {
        console.log('✅ AuthContext: Registration successful, auto-logging in...')
        // Automatically log in the user after registration
        const loginResult = await userDatabase.login({
          email: userData.email,
          password: userData.password
        })
        console.log('📡 AuthContext: Auto-login response:', { 
          success: loginResult.success, 
          hasUser: !!loginResult.user 
        })
        
        if (loginResult.success && loginResult.user) {
          console.log('✅ AuthContext: Auto-login successful, setting user:', {
            id: loginResult.user.id,
            username: loginResult.user.username,
            email: loginResult.user.email
          })
          setUser(loginResult.user)
        } else {
          console.log('❌ AuthContext: Auto-login failed after registration')
        }
      } else {
        console.log('❌ AuthContext: Registration failed:', result.message)
      }
      return { success: result.success, message: result.message }
    } catch (error) {
      console.error('❌ AuthContext: Registration error:', error)
      return { success: false, message: 'An error occurred during registration' }
    } finally {
      setIsLoading(false)
      console.log('✅ AuthContext: Registration process complete')
    }
  }

  const logout = async () => {
    console.log('🔄 AuthContext: Starting logout process for user:', user?.username)
    try {
      await userDatabase.logout()
      console.log('✅ AuthContext: Logout API call successful')
      setUser(null)
      console.log('✅ AuthContext: User state cleared, logout complete')
    } catch (error) {
      console.error('❌ AuthContext: Logout error:', error)
      // Still clear user state even if logout call fails
      setUser(null)
    }
  }

  const updateUser = async (updates: Partial<User>): Promise<boolean> => {
    console.log('🔄 AuthContext: Updating user data:', Object.keys(updates))
    if (!user) {
      console.log('❌ AuthContext: Cannot update user - no user logged in')
      return false
    }

    try {
      const success = await userDatabase.updateUser(user.id, updates)
      console.log('📡 AuthContext: Update user API response:', { success, userId: user.id })
      
      if (success) {
        console.log('✅ AuthContext: User update successful, updating local state')
        setUser(prev => prev ? { ...prev, ...updates } : null)
      } else {
        console.log('❌ AuthContext: User update failed')
      }
      return success
    } catch (error) {
      console.error('❌ AuthContext: Update user error:', error)
      return false
    }
  }

  const saveProfileData = async (profileData: any): Promise<boolean> => {
    console.log('🔄 AuthContext: Saving profile data:', { 
      name: profileData.name, 
      age: profileData.age, 
      currency: profileData.currency 
    })
    
    if (!user) {
      console.log('❌ AuthContext: Cannot save profile - no user logged in')
      return false
    }

    try {
      const success = await userDatabase.updateUser(user.id, { profileData })
      console.log('📡 AuthContext: Save profile API response:', { success, userId: user.id })
      
      if (success) {
        console.log('✅ AuthContext: Profile data saved successfully')
        setUser(prev => prev ? { ...prev, profileData } : null)
      } else {
        console.log('❌ AuthContext: Failed to save profile data')
      }
      return success
    } catch (error) {
      console.error('❌ AuthContext: Save profile error:', error)
      return false
    }
  }

  const saveGoalsData = async (goalsData: any): Promise<boolean> => {
    console.log('🔄 AuthContext: Saving goals data:', {
      strengthGoal: goalsData.strengthGoal ? 'set' : 'empty',
      intelligenceGoal: goalsData.intelligenceGoal ? 'set' : 'empty',
      charismaGoal: goalsData.charismaGoal ? 'set' : 'empty'
    })
    
    if (!user) {
      console.log('❌ AuthContext: Cannot save goals - no user logged in')
      return false
    }

    try {
      const success = await userDatabase.updateUser(user.id, { goalsData })
      console.log('📡 AuthContext: Save goals API response:', { success, userId: user.id })
      
      if (success) {
        console.log('✅ AuthContext: Goals data saved successfully')
        setUser(prev => prev ? { ...prev, goalsData } : null)
      } else {
        console.log('❌ AuthContext: Failed to save goals data')
      }
      return success
    } catch (error) {
      console.error('❌ AuthContext: Save goals error:', error)
      return false
    }
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

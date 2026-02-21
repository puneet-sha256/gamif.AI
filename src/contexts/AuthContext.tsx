import React, { createContext, useContext, useState, useEffect } from 'react'
import { userDatabase } from '../client/services/fileUserDatabase'
import { aiService } from '../client/services/aiService'
import { taskService } from '../client/services/taskService'
import { shopService } from '../client/services/shopService'
import type { AuthContextType, User, UserLogin, UserRegistration, ProfileData, GoalsData, GeneratedTasks, ShopItem } from '../shared/types'

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
      try {
        const currentUser = await userDatabase.getCurrentUser()
        if (currentUser) {
          setUser(currentUser)
        }
      } catch (error) {
        console.error('❌ AuthContext: Error loading user session:', error)
      } finally {
        setIsLoading(false)
      }
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
      console.error('❌ AuthContext: Login error:', error)
      return { success: false, message: 'An error occurred during login' }
    } finally {
      setIsLoading(false)
    }
  }

  const sendOtp = async (userData: UserRegistration): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true)
    try {
      const result = await userDatabase.sendOtp(userData)
      return { success: result.success, message: result.message }
    } catch (error) {
      console.error('AuthContext: Send OTP error:', error)
      return { success: false, message: 'An error occurred while sending verification code' }
    } finally {
      setIsLoading(false)
    }
  }

  const verifyOtp = async (email: string, otp: string): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true)
    try {
      const result = await userDatabase.verifyOtpAndRegister(email, otp)

      if (result.success && result.user) {
        setUser(result.user)
      }
      return { success: result.success, message: result.message }
    } catch (error) {
      console.error('AuthContext: Verify OTP error:', error)
      return { success: false, message: 'An error occurred during verification' }
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
        } else {
        }
      } else {
      }
      return { success: result.success, message: result.message }
    } catch (error) {
      console.error('❌ AuthContext: Registration error:', error)
      return { success: false, message: 'An error occurred during registration' }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      await userDatabase.logout()
      setUser(null)
    } catch (error) {
      console.error('❌ AuthContext: Logout error:', error)
      // Still clear user state even if logout call fails
      setUser(null)
    }
  }

  const updateUser = async (updates: Partial<User>): Promise<boolean> => {
    if (!user) {
      return false
    }

    try {
      const success = await userDatabase.updateUser(user.id, updates)
      
      if (success) {
        setUser(prev => prev ? { ...prev, ...updates } : null)
      } else {
      }
      return success
    } catch (error) {
      console.error('❌ AuthContext: Update user error:', error)
      return false
    }
  }

  const saveProfileData = async (profileData: ProfileData): Promise<boolean> => {
    
    
    if (!user) {
      return false
    }

    try {
      const success = await userDatabase.updateUser(user.id, { profileData })
      
      if (success) {
        setUser(prev => prev ? { ...prev, profileData } : null)
      } else {
      }
      return success
    } catch (error) {
      console.error('❌ AuthContext: Save profile error:', error)
      return false
    }
  }

  const saveGoalsData = async (goalsData: GoalsData): Promise<boolean> => {
    
    
    if (!user) {
      return false
    }

    try {
      // First save the goals data to user profile
      const success = await userDatabase.updateUser(user.id, { goalsData })
      
      if (success) {
        setUser(prev => prev ? { ...prev, goalsData } : null)
        
        // Now call Azure AI agent to analyze the goals
        try {
          
          // Get current session ID from userDatabase
          const sessionId = userDatabase.getSessionId()
          if (!sessionId) {
            return true // Goals saved successfully, task generation skipped
          }
          
          // Call Azure AI agent for task generation using aiService
          const aiResult = await aiService.generateTasks(
            sessionId,
            goalsData,
            user.profileData
          )
          
          if (aiResult.success) {
            
            
            // If tasks were generated and stored, refresh user data to get updated tasks
            if (aiResult.data?.generatedTasks) {
              const freshUser = await userDatabase.getCurrentUser()
              if (freshUser) {
                setUser(freshUser)
              }
            }
            
          } else {
            // Don't fail the entire operation if AI analysis fails
          }
        } catch (aiError) {
          console.error('⚠️ AuthContext: Azure AI analysis error (non-critical):', aiError)
          // Don't fail the entire operation if AI analysis fails
        }
      } else {
      }
      return success
    } catch (error) {
      console.error('❌ AuthContext: Save goals error:', error)
      return false
    }
  }

  // Get user's generated tasks
  const getUserTasks = async (): Promise<GeneratedTasks | null> => {
    try {
      const tasks = await userDatabase.getUserTasks()
      
      return tasks
    } catch (error) {
      console.error('❌ AuthContext: Error fetching generated tasks:', error)
      return null
    }
  }

  // Refresh user's generated tasks and update user state
  const refreshUserTasks = async (): Promise<void> => {
    if (!user) return
    
    try {
      // Fetch fresh user data to get updated tasks
      const freshUser = await userDatabase.getCurrentUser()
      if (freshUser) {
        setUser(freshUser)
      }
    } catch (error) {
      console.error('❌ AuthContext: Error refreshing user tasks:', error)
    }
  }

  // Edit a generated task
  const editGeneratedTask = async (
    taskId: string,
    category: 'Strength' | 'Intelligence' | 'Charisma',
    updates: { description?: string; expected_duration_minutes?: number; xp?: number; shards?: number }
  ): Promise<boolean> => {
    
    if (!user) {
      return false
    }

    try {
      const sessionId = userDatabase.getSessionId()
      if (!sessionId) {
        return false
      }

      await taskService.updateTask(sessionId, taskId, category, updates)
      
      // Refresh user data to get updated tasks
      await refreshUserTasks()
      return true
    } catch (error) {
      console.error('❌ AuthContext: Error editing task:', error)
      return false
    }
  }

  // Delete a generated task
  const deleteGeneratedTask = async (
    taskId: string,
    category: 'Strength' | 'Intelligence' | 'Charisma'
  ): Promise<boolean> => {
    
    if (!user) {
      return false
    }

    try {
      const sessionId = userDatabase.getSessionId()
      if (!sessionId) {
        return false
      }

      await taskService.deleteTask(sessionId, taskId, category)
      
      // Refresh user data to get updated tasks
      await refreshUserTasks()
      return true
    } catch (error) {
      console.error('❌ AuthContext: Error deleting task:', error)
      return false
    }
  }

  // Add a user-created task
  const addUserTask = async (task: {
    title: string
    description: string
    category: 'Strength' | 'Intelligence' | 'Charisma'
    expected_duration_minutes?: number
    xp: number
    shards: number
  }): Promise<boolean> => {
    
    if (!user) {
      return false
    }

    try {
      const sessionId = userDatabase.getSessionId()
      if (!sessionId) {
        return false
      }

      await taskService.addTask(sessionId, task)
      
      // Refresh user data
      await refreshUserTasks()
      return true
    } catch (error) {
      console.error('❌ AuthContext: Error adding task:', error)
      return false
    }
  }

  // Add a shop item
  const addShopItem = async (item: {
    title: string
    description?: string
    price: number
    image?: string
  }): Promise<boolean> => {
    
    if (!user) {
      return false
    }

    try {
      const sessionId = userDatabase.getSessionId()
      if (!sessionId) {
        return false
      }

      const result = await shopService.addShopItem(sessionId, item)
      
      if (result.success) {
        
        // Refresh user data to get updated shop items
        const freshUser = await userDatabase.getCurrentUser()
        if (freshUser) {
          setUser(freshUser)
        }
        return true
      }
      
      return false
    } catch (error) {
      console.error('❌ AuthContext: Error adding shop item:', error)
      return false
    }
  }

  // Delete a shop item
  const deleteShopItem = async (itemId: string): Promise<boolean> => {
    
    if (!user) {
      return false
    }

    try {
      const sessionId = userDatabase.getSessionId()
      if (!sessionId) {
        return false
      }

      const result = await shopService.deleteShopItem(sessionId, itemId)
      
      if (result.success) {
        
        // Refresh user data to get updated shop items
        const freshUser = await userDatabase.getCurrentUser()
        if (freshUser) {
          setUser(freshUser)
        }
        return true
      }
      
      return false
    } catch (error) {
      console.error('❌ AuthContext: Error deleting shop item:', error)
      return false
    }
  }

  // Get shop items
  const getShopItems = (): ShopItem[] => {
    return user?.shopItems || []
  }

  // Buy a shop item
  const buyShopItem = async (
    itemId: string, 
    itemPrice: number,
    itemDetails?: {
      title: string
      description?: string
      image?: string
      isConsumable?: boolean
      isKeyItem?: boolean
      allowMultiplePurchases?: boolean
    }
  ): Promise<boolean> => {
    console.log('🔄 AuthContext: Buying shop item:', itemId, 'for', itemPrice, 'shards')
    
    if (!user) {
      console.log('❌ AuthContext: Cannot buy shop item - no user logged in')
      return false
    }

    try {
      const sessionId = userDatabase.getSessionId()
      if (!sessionId) {
        console.log('❌ AuthContext: No session ID available')
        return false
      }

      const result = await shopService.buyShopItem(sessionId, itemId, itemPrice, itemDetails)
      
      if (result.success) {
        console.log('✅ AuthContext: Shop item purchased successfully')
        
        // Refresh user data to get updated shards
        const freshUser = await userDatabase.getCurrentUser()
        if (freshUser) {
          setUser(freshUser)
        }
        return true
      }
      
      return false
    } catch (error) {
      console.error('❌ AuthContext: Error buying shop item:', error)
      return false
    }
  }

  const useInventoryItem = async (itemId: string): Promise<boolean> => {
    console.log('🔄 AuthContext: Using inventory item:', itemId)
    
    if (!user) {
      console.log('❌ AuthContext: Cannot use item - no user logged in')
      return false
    }

    try {
      const sessionId = userDatabase.getSessionId()
      if (!sessionId) {
        console.log('❌ AuthContext: No session ID available')
        return false
      }

      const result = await shopService.useInventoryItem(sessionId, itemId)
      
      if (result.success) {
        console.log('✅ AuthContext: Item used successfully')
        
        // Refresh user data to get updated inventory
        const freshUser = await userDatabase.getCurrentUser()
        if (freshUser) {
          setUser(freshUser)
        }
        return true
      }
      
      return false
    } catch (error) {
      console.error('❌ AuthContext: Error using inventory item:', error)
      return false
    }
  }

  const value: AuthContextType = {
    user,
    login,
    register,
    sendOtp,
    verifyOtp,
    logout,
    updateUser,
    saveProfileData,
    saveGoalsData,
    getUserTasks,
    refreshUserTasks,
    editGeneratedTask,
    deleteGeneratedTask,
    addUserTask,
    addShopItem,
    deleteShopItem,
    getShopItems,
    buyShopItem,
    useInventoryItem,
    isLoading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

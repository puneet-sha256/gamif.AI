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

  const saveProfileData = async (profileData: ProfileData): Promise<boolean> => {
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

  const saveGoalsData = async (goalsData: GoalsData): Promise<boolean> => {
    console.log('🔄 AuthContext: Saving goals data:', {
      longTermGoals: goalsData.longTermGoals ? `${goalsData.longTermGoals.length} characters` : 'empty'
    })
    
    if (!user) {
      console.log('❌ AuthContext: Cannot save goals - no user logged in')
      return false
    }

    try {
      // First save the goals data to user profile
      const success = await userDatabase.updateUser(user.id, { goalsData })
      console.log('📡 AuthContext: Save goals API response:', { success, userId: user.id })
      
      if (success) {
        console.log('✅ AuthContext: Goals data saved successfully')
        setUser(prev => prev ? { ...prev, goalsData } : null)
        
        // Now call Azure AI agent to analyze the goals
        try {
          console.log('🤖 AuthContext: Starting Azure AI task generation...')
          
          // Get current session ID from userDatabase
          const sessionId = userDatabase.getSessionId()
          if (!sessionId) {
            console.log('⚠️ AuthContext: No session ID available for task generation')
            return true // Goals saved successfully, task generation skipped
          }
          
          // Call Azure AI agent for task generation using aiService
          const aiResult = await aiService.generateTasks(
            sessionId,
            goalsData,
            user.profileData
          )
          
          if (aiResult.success) {
            console.log('🤖 AuthContext: Azure AI task generation completed successfully:', {
              processingTime: aiResult.metadata?.processingTime,
              hasGeneratedTasks: !!aiResult.data?.generatedTasks,
              rawResponse: !!aiResult.data?.rawResponse
            })
            
            // If tasks were generated and stored, refresh user data to get updated tasks
            if (aiResult.data?.generatedTasks) {
              console.log('🔄 AuthContext: Refreshing user data to get generated tasks...')
              const freshUser = await userDatabase.getCurrentUser()
              if (freshUser) {
                setUser(freshUser)
                console.log('✅ AuthContext: User data refreshed with generated tasks')
              }
            }
            
            // Log the generated tasks
            if (aiResult.data?.generatedTasks) {
              const tasks = aiResult.data.generatedTasks
              console.log('🎯 AuthContext: Generated Tasks:', {
                strengthTasks: tasks.Strength?.length || 0,
                intelligenceTasks: tasks.Intelligence?.length || 0,
                charismaTasks: tasks.Charisma?.length || 0,
                lastUpdated: tasks.lastUpdated
              })
            }
            
          } else {
            console.log('⚠️ AuthContext: Azure AI analysis failed:', aiResult.message)
            // Don't fail the entire operation if AI analysis fails
          }
        } catch (aiError) {
          console.error('⚠️ AuthContext: Azure AI analysis error (non-critical):', aiError)
          // Don't fail the entire operation if AI analysis fails
        }
      } else {
        console.log('❌ AuthContext: Failed to save goals data')
      }
      return success
    } catch (error) {
      console.error('❌ AuthContext: Save goals error:', error)
      return false
    }
  }

  // Get user's generated tasks
  const getUserTasks = async (): Promise<GeneratedTasks | null> => {
    console.log('🔄 AuthContext: Fetching user generated tasks...')
    try {
      const tasks = await userDatabase.getUserTasks()
      console.log('✅ AuthContext: Generated tasks fetched:', {
        hasStrength: !!tasks?.Strength?.length,
        hasIntelligence: !!tasks?.Intelligence?.length,
        hasCharisma: !!tasks?.Charisma?.length,
        lastUpdated: tasks?.lastUpdated
      })
      return tasks
    } catch (error) {
      console.error('❌ AuthContext: Error fetching generated tasks:', error)
      return null
    }
  }

  // Refresh user's generated tasks and update user state
  const refreshUserTasks = async (): Promise<void> => {
    if (!user) return
    
    console.log('🔄 AuthContext: Refreshing user tasks and user data...')
    try {
      // Fetch fresh user data to get updated tasks
      const freshUser = await userDatabase.getCurrentUser()
      if (freshUser) {
        console.log('✅ AuthContext: User data refreshed with updated tasks')
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
    updates: { description?: string; xp?: number; shards?: number }
  ): Promise<boolean> => {
    console.log('🔄 AuthContext: Editing task:', taskId, 'in category:', category)
    
    if (!user) {
      console.log('❌ AuthContext: Cannot edit task - no user logged in')
      return false
    }

    try {
      const sessionId = userDatabase.getSessionId()
      if (!sessionId) {
        console.log('❌ AuthContext: No session ID available')
        return false
      }

      await taskService.updateTask(sessionId, taskId, category, updates)
      console.log('✅ AuthContext: Task edited successfully')
      
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
    console.log('🔄 AuthContext: Deleting task:', taskId, 'from category:', category)
    
    if (!user) {
      console.log('❌ AuthContext: Cannot delete task - no user logged in')
      return false
    }

    try {
      const sessionId = userDatabase.getSessionId()
      if (!sessionId) {
        console.log('❌ AuthContext: No session ID available')
        return false
      }

      await taskService.deleteTask(sessionId, taskId, category)
      console.log('✅ AuthContext: Task deleted successfully')
      
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
    xp: number
    shards: number
  }): Promise<boolean> => {
    console.log('🔄 AuthContext: Adding user task:', task.title)
    
    if (!user) {
      console.log('❌ AuthContext: Cannot add task - no user logged in')
      return false
    }

    try {
      const sessionId = userDatabase.getSessionId()
      if (!sessionId) {
        console.log('❌ AuthContext: No session ID available')
        return false
      }

      await taskService.addTask(sessionId, task)
      console.log('✅ AuthContext: Task added successfully')
      
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
    console.log('🔄 AuthContext: Adding shop item:', item.title)
    
    if (!user) {
      console.log('❌ AuthContext: Cannot add shop item - no user logged in')
      return false
    }

    try {
      const sessionId = userDatabase.getSessionId()
      if (!sessionId) {
        console.log('❌ AuthContext: No session ID available')
        return false
      }

      const result = await shopService.addShopItem(sessionId, item)
      
      if (result.success) {
        console.log('✅ AuthContext: Shop item added successfully')
        
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
    console.log('🔄 AuthContext: Deleting shop item:', itemId)
    
    if (!user) {
      console.log('❌ AuthContext: Cannot delete shop item - no user logged in')
      return false
    }

    try {
      const sessionId = userDatabase.getSessionId()
      if (!sessionId) {
        console.log('❌ AuthContext: No session ID available')
        return false
      }

      const result = await shopService.deleteShopItem(sessionId, itemId)
      
      if (result.success) {
        console.log('✅ AuthContext: Shop item deleted successfully')
        
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

  const value: AuthContextType = {
    user,
    login,
    register,
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
    isLoading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

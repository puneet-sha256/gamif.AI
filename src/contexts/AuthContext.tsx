import React, { createContext, useContext, useState, useEffect } from 'react'
import { userDatabase } from '../client/services/fileUserDatabase'
import type { AuthContextType, User, UserLogin, UserRegistration, ProfileData, GoalsData } from '../shared/types'

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
          console.log('🤖 AuthContext: Starting Azure AI goals analysis...')
          
          // Get current session ID from userDatabase
          const sessionId = userDatabase.getSessionId()
          if (!sessionId) {
            console.log('⚠️ AuthContext: No session ID available for AI analysis')
            return true // Goals saved successfully, AI analysis skipped
          }
          
          // Call Azure AI agent
          const aiResponse = await fetch('/api/ai/analyze-goals', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId,
              goals: goalsData,
              userProfile: user.profileData
            })
          })
          
          if (aiResponse.ok) {
            const aiResult = await aiResponse.json()
            console.log('🤖 AuthContext: Azure AI analysis completed successfully:', {
              processingTime: aiResult.metadata?.processingTime,
              tasksGenerated: aiResult.data?.tasks?.length || 0,
              insights: aiResult.data?.insights?.length || 0,
              recommendations: aiResult.data?.recommendations?.length || 0
            })
            
            // TODO: Store AI analysis results in user profile or display them
            // This could include:
            // - Personalized task recommendations from Azure AI
            // - Goal categorization and insights
            // - AI-generated daily tasks
            // - Progress tracking suggestions
            
            // For now, just log the results
            if (aiResult.data?.tasks) {
              console.log('🎯 AuthContext: AI Generated Tasks:', aiResult.data.tasks.map((task: any) => task.title))
            }
            if (aiResult.data?.insights) {
              console.log('💡 AuthContext: AI Insights:', aiResult.data.insights)
            }
            if (aiResult.data?.recommendations) {
              console.log('📋 AuthContext: AI Recommendations:', aiResult.data.recommendations)
            }
            
          } else {
            const errorData = await aiResponse.json()
            console.log('⚠️ AuthContext: Azure AI analysis failed:', errorData.message)
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

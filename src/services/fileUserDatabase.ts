import type { User, UserRegistration, UserLogin, ProfileData, GoalsData } from '../types'

// Re-export types for backward compatibility
export type { User, UserRegistration, UserLogin, ProfileData, GoalsData }

const API_BASE_URL = 'http://localhost:3001/api'
const SESSION_KEY = 'solo_leveling_session_id'

class FileUserDatabase {
  private sessionId: string | null = null

  constructor() {
    this.loadSession()
  }

  private loadSession(): void {
    console.log('🔄 Database: Loading session from localStorage...')
    try {
      this.sessionId = localStorage.getItem(SESSION_KEY)
      if (this.sessionId) {
        console.log('✅ Database: Session loaded:', this.sessionId.substring(0, 8) + '...')
      } else {
        console.log('ℹ️ Database: No session found in localStorage')
      }
    } catch (error) {
      console.error('❌ Database: Error loading session from localStorage:', error)
      this.sessionId = null
    }
  }

  private saveSession(sessionId: string): void {
    console.log('🔄 Database: Saving session to localStorage:', sessionId.substring(0, 8) + '...')
    try {
      this.sessionId = sessionId
      localStorage.setItem(SESSION_KEY, sessionId)
      console.log('✅ Database: Session saved successfully')
    } catch (error) {
      console.error('❌ Database: Error saving session to localStorage:', error)
    }
  }

  private clearSession(): void {
    console.log('🔄 Database: Clearing session from localStorage...')
    try {
      this.sessionId = null
      localStorage.removeItem(SESSION_KEY)
      console.log('✅ Database: Session cleared successfully')
    } catch (error) {
      console.error('❌ Database: Error clearing session from localStorage:', error)
    }
  }

  async register(userData: UserRegistration): Promise<{ success: boolean; message: string; user?: User }> {
    console.log('🔄 Database: Starting user registration for:', userData.email)
    try {
      console.log('📡 Database: Sending registration request to API...')
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })

      console.log('📡 Database: Registration API response status:', response.status)
      const result = await response.json()
      console.log('📡 Database: Registration API result:', { 
        success: result.success, 
        message: result.message,
        hasUser: !!result.user 
      })

      if (result.success && result.user) {
        console.log('✅ Database: Registration successful for user:', result.user.username)
        console.log('🔄 Database: Starting auto-login after registration...')
        // Auto-login after successful registration
        const loginResult = await this.login({
          email: userData.email,
          password: userData.password
        })
        
        if (loginResult.success) {
          console.log('✅ Database: Auto-login after registration successful')
          return {
            success: true,
            message: result.message,
            user: loginResult.user
          }
        } else {
          console.log('❌ Database: Auto-login after registration failed')
        }
      } else {
        console.log('❌ Database: Registration failed:', result.message)
      }

      return result
    } catch (error) {
      console.error('❌ Database: Registration error:', error)
      return {
        success: false,
        message: 'Network error. Please check if the server is running.'
      }
    }
  }

  async login(credentials: UserLogin): Promise<{ success: boolean; message: string; user?: User }> {
    console.log('🔄 Database: Starting login for:', credentials.email)
    try {
      console.log('📡 Database: Sending login request to API...')
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      })

      console.log('📡 Database: Login API response status:', response.status)
      const result = await response.json()
      console.log('📡 Database: Login API result:', { 
        success: result.success, 
        message: result.message,
        hasUser: !!result.user,
        hasSessionId: !!result.sessionId 
      })

      if (result.success && result.sessionId) {
        console.log('✅ Database: Login successful, saving session...')
        this.saveSession(result.sessionId)
      } else {
        console.log('❌ Database: Login failed:', result.message)
      }

      return result
    } catch (error) {
      console.error('❌ Database: Login error:', error)
      return {
        success: false,
        message: 'Network error. Please check if the server is running.'
      }
    }
  }

  async getCurrentUser(): Promise<User | null> {
    console.log('🔄 Database: Getting current user...')
    if (!this.sessionId) {
      console.log('ℹ️ Database: No session ID, cannot get current user')
      return null
    }

    console.log('📡 Database: Requesting current user from API with session:', this.sessionId.substring(0, 8) + '...')
    try {
      const response = await fetch(`${API_BASE_URL}/user/session/${this.sessionId}`)
      console.log('📡 Database: Current user API response status:', response.status)
      const result = await response.json()
      console.log('📡 Database: Current user API result:', { 
        success: result.success, 
        hasUser: !!result.user 
      })

      if (result.success && result.user) {
        console.log('✅ Database: Current user retrieved:', { 
          id: result.user.id, 
          username: result.user.username, 
          email: result.user.email 
        })
        return result.user
      } else {
        console.log('❌ Database: Invalid session, clearing it')
        // Invalid session, clear it
        this.clearSession()
        return null
      }
    } catch (error) {
      console.error('❌ Database: Get current user error:', error)
      // If server is not running, try to keep the session for later
      return null
    }
  }

  async logout(): Promise<void> {
    console.log('🔄 Database: Starting logout...')
    if (this.sessionId) {
      console.log('📡 Database: Sending logout request to API with session:', this.sessionId.substring(0, 8) + '...')
      try {
        const response = await fetch(`${API_BASE_URL}/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId: this.sessionId }),
        })
        console.log('📡 Database: Logout API response status:', response.status)
        if (response.ok) {
          console.log('✅ Database: Server logout successful')
        } else {
          console.log('❌ Database: Server logout failed, but continuing with local logout')
        }
      } catch (error) {
        console.error('❌ Database: Logout error:', error)
        console.log('⚠️ Database: Continuing with local logout even if server request fails')
        // Continue with local logout even if server request fails
      }
    } else {
      console.log('ℹ️ Database: No session to logout from')
    }

    console.log('🔄 Database: Clearing local session...')
    this.clearSession()
    console.log('✅ Database: Logout complete')
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<boolean> {
    console.log('🔄 Database: Updating user:', userId, 'with updates:', Object.keys(updates))
    try {
      console.log('📡 Database: Sending update user request to API...')
      const response = await fetch(`${API_BASE_URL}/user/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      console.log('📡 Database: Update user API response status:', response.status)
      const result = await response.json()
      console.log('📡 Database: Update user API result:', { success: result.success })
      
      if (result.success) {
        console.log('✅ Database: User update successful')
      } else {
        console.log('❌ Database: User update failed')
      }
      
      return result.success
    } catch (error) {
      console.error('❌ Database: Update user error:', error)
      return false
    }
  }

  // Health check method to verify server connectivity
  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`)
      const result = await response.json()
      return result.success
    } catch (error) {
      console.error('Server connection check failed:', error)
      return false
    }
  }

  // Get the data directory path (for display purposes)
  getDataPath(): string {
    return 'c:\\Users\\sharmapuneet\\Documents\\Solo Leveling\\data\\'
  }

  // Backup methods (these would call backend endpoints if implemented)
  async createBackup(): Promise<{ success: boolean; message: string }> {
    try {
      // This could be implemented as a backend endpoint
      return {
        success: true,
        message: 'Backup is automatically created when data is saved'
      }
    } catch (error) {
      return {
        success: false,
        message: 'Backup creation failed'
      }
    }
  }

  // Legacy methods for compatibility (these now warn about localStorage usage)
  getAllUsers(): User[] {
    console.warn('getAllUsers() is not available with file-based storage for security reasons')
    return []
  }

  deleteUser(_userId: string): boolean {
    console.warn('deleteUser() should be implemented as an API endpoint for security')
    return false
  }
}

// Export singleton instance
export const userDatabase = new FileUserDatabase()

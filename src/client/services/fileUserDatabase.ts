import type { User, UserRegistration, UserLogin, ProfileData, GoalsData, GeneratedTasks } from '../../types'

// Re-export types for backward compatibility
export type { User, UserRegistration, UserLogin, ProfileData, GoalsData }

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'
const SESSION_KEY = 'solo_leveling_session_id'

class FileUserDatabase {
  private sessionId: string | null = null

  constructor() {
    this.loadSession()
  }

  private loadSession(): void {
    try {
      this.sessionId = localStorage.getItem(SESSION_KEY)
      if (this.sessionId) {
      } else {
      }
    } catch (error) {
      console.error('❌ Database: Error loading session from localStorage:', error)
      this.sessionId = null
    }
  }

  private saveSession(sessionId: string): void {
    try {
      this.sessionId = sessionId
      localStorage.setItem(SESSION_KEY, sessionId)
    } catch (error) {
      console.error('❌ Database: Error saving session to localStorage:', error)
    }
  }

  private clearSession(): void {
    try {
      this.sessionId = null
      localStorage.removeItem(SESSION_KEY)
    } catch (error) {
      console.error('❌ Database: Error clearing session from localStorage:', error)
    }
  }

  async sendOtp(userData: UserRegistration): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })

      const result = await response.json()
      return { success: result.success, message: result.message }
    } catch (error) {
      console.error('Database: Send OTP error:', error)
      return {
        success: false,
        message: 'Network error. Please check if the server is running.'
      }
    }
  }

  async verifyOtpAndRegister(email: string, otp: string): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp }),
      })

      const result = await response.json()

      if (result.success && result.sessionId) {
        this.saveSession(result.sessionId)
      }

      return result
    } catch (error) {
      console.error('Database: Verify OTP error:', error)
      return {
        success: false,
        message: 'Network error. Please check if the server is running.'
      }
    }
  }

  async sendPasswordResetOtp(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const result = await response.json()
      return { success: result.success, message: result.message }
    } catch (error) {
      console.error('Database: Send password reset OTP error:', error)
      return {
        success: false,
        message: 'Network error. Please check if the server is running.'
      }
    }
  }

  async verifyPasswordResetOtp(email: string, otp: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp }),
      })

      const result = await response.json()
      return { success: result.success, message: result.message }
    } catch (error) {
      console.error('Database: Verify password reset OTP error:', error)
      return {
        success: false,
        message: 'Network error. Please check if the server is running.'
      }
    }
  }

  async resetPassword(email: string, otp: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp, newPassword }),
      })

      const result = await response.json()
      return { success: result.success, message: result.message }
    } catch (error) {
      console.error('Database: Reset password error:', error)
      return {
        success: false,
        message: 'Network error. Please check if the server is running.'
      }
    }
  }

  async register(userData: UserRegistration): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })

      const result = await response.json()
      

      if (result.success && result.user) {
        // Auto-login after successful registration
        const loginResult = await this.login({
          email: userData.email,
          password: userData.password
        })
        
        if (loginResult.success) {
          return {
            success: true,
            message: result.message,
            user: loginResult.user
          }
        } else {
        }
      } else {
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
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      })

      const result = await response.json()

      if (result.success && result.sessionId) {
        this.saveSession(result.sessionId)
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
    if (!this.sessionId) {
      return null
    }

    try {
      const response = await fetch(`${API_BASE_URL}/user/session/${this.sessionId}`)
      const result = await response.json()
      

      if (result.success && result.user) {
        
        return result.user
      } else {
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
    if (this.sessionId) {
      try {
        const response = await fetch(`${API_BASE_URL}/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId: this.sessionId }),
        })
        if (response.ok) {
        } else {
        }
      } catch (error) {
        console.error('❌ Database: Logout error:', error)
        // Continue with local logout even if server request fails
      }
    } else {
    }

    this.clearSession()
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/user/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      const result = await response.json()
      
      if (result.success) {
      } else {
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

  // Get user's generated tasks
  async getUserTasks(): Promise<GeneratedTasks | null> {
    if (!this.sessionId) {
      return null
    }

    try {
      const response = await fetch(`${API_BASE_URL}/user/tasks/${this.sessionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()
      

      if (response.ok && result.success) {
        return result.data.generatedTasks || null
      } else {
        return null
      }
    } catch (error) {
      console.error('❌ Database: Error fetching generated tasks:', error)
      return null
    }
  }

  // Get current session ID
  getSessionId(): string | null {
    return this.sessionId
  }

  // Legacy methods for compatibility (these now warn about localStorage usage)
  getAllUsers(): User[] {
    return []
  }

  deleteUser(_userId: string): boolean {
    return false
  }
}

// Export singleton instance
export const userDatabase = new FileUserDatabase()

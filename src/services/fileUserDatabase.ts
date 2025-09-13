export interface User {
  id: string
  username: string
  email: string
  createdAt: string
  lastLogin?: string
  profileData?: any
  goalsData?: any
  stats?: {
    level: number
    experience: number
    strength: number
    agility: number
    intelligence: number
    endurance: number
  }
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

const API_BASE_URL = 'http://localhost:3001/api'
const SESSION_KEY = 'solo_leveling_session_id'

class FileUserDatabase {
  private sessionId: string | null = null

  constructor() {
    this.loadSession()
  }

  private loadSession(): void {
    try {
      this.sessionId = localStorage.getItem(SESSION_KEY)
    } catch (error) {
      console.error('Error loading session from localStorage:', error)
      this.sessionId = null
    }
  }

  private saveSession(sessionId: string): void {
    try {
      this.sessionId = sessionId
      localStorage.setItem(SESSION_KEY, sessionId)
    } catch (error) {
      console.error('Error saving session to localStorage:', error)
    }
  }

  private clearSession(): void {
    try {
      this.sessionId = null
      localStorage.removeItem(SESSION_KEY)
    } catch (error) {
      console.error('Error clearing session from localStorage:', error)
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
        }
      }

      return result
    } catch (error) {
      console.error('Registration error:', error)
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
      console.error('Login error:', error)
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
      console.error('Get current user error:', error)
      // If server is not running, try to keep the session for later
      return null
    }
  }

  async logout(): Promise<void> {
    if (this.sessionId) {
      try {
        await fetch(`${API_BASE_URL}/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId: this.sessionId }),
        })
      } catch (error) {
        console.error('Logout error:', error)
        // Continue with local logout even if server request fails
      }
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
      return result.success
    } catch (error) {
      console.error('Update user error:', error)
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

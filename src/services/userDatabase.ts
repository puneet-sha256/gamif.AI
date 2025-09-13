export interface User {
  id: string
  username: string
  email: string
  passwordHash: string
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

class UserDatabase {
  private users: User[] = []
  private readonly STORAGE_KEY = 'solo_leveling_users'
  private readonly CURRENT_USER_KEY = 'solo_leveling_current_user'

  constructor() {
    this.loadUsers()
  }

  private loadUsers(): void {
    try {
      const storedUsers = localStorage.getItem(this.STORAGE_KEY)
      if (storedUsers) {
        this.users = JSON.parse(storedUsers)
      }
    } catch (error) {
      console.error('Error loading users from localStorage:', error)
      this.users = []
    }
  }

  private saveUsers(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.users))
    } catch (error) {
      console.error('Error saving users to localStorage:', error)
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  private hashPassword(password: string): string {
    // Simple hash function for demo purposes
    // In a real app, use a proper library like bcrypt
    let hash = 0
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString()
  }

  async register(userData: UserRegistration): Promise<{ success: boolean; message: string; user?: User }> {
    // Check if user already exists
    const existingUser = this.users.find(user => 
      user.email.toLowerCase() === userData.email.toLowerCase() || 
      user.username.toLowerCase() === userData.username.toLowerCase()
    )

    if (existingUser) {
      return {
        success: false,
        message: existingUser.email.toLowerCase() === userData.email.toLowerCase() 
          ? 'Hunter with this email already exists' 
          : 'Hunter name already taken'
      }
    }

    // Create new user
    const newUser: User = {
      id: this.generateId(),
      username: userData.username,
      email: userData.email,
      passwordHash: this.hashPassword(userData.password),
      createdAt: new Date().toISOString(),
      stats: {
        level: 1,
        experience: 0,
        strength: 10,
        agility: 10,
        intelligence: 10,
        endurance: 10
      }
    }

    this.users.push(newUser)
    this.saveUsers()

    return {
      success: true,
      message: 'Hunter registered successfully!',
      user: { ...newUser, passwordHash: undefined } as any
    }
  }

  async login(credentials: UserLogin): Promise<{ success: boolean; message: string; user?: User }> {
    const user = this.users.find(u => u.email.toLowerCase() === credentials.email.toLowerCase())

    if (!user) {
      return {
        success: false,
        message: 'Hunter not found in the system'
      }
    }

    const hashedPassword = this.hashPassword(credentials.password)
    if (user.passwordHash !== hashedPassword) {
      return {
        success: false,
        message: 'Invalid credentials'
      }
    }

    // Update last login
    user.lastLogin = new Date().toISOString()
    this.saveUsers()

    // Store current user
    const userWithoutPassword = { ...user, passwordHash: undefined }
    localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(userWithoutPassword))

    return {
      success: true,
      message: 'Welcome back, Hunter!',
      user: userWithoutPassword as any
    }
  }

  getCurrentUser(): User | null {
    try {
      const currentUserData = localStorage.getItem(this.CURRENT_USER_KEY)
      return currentUserData ? JSON.parse(currentUserData) : null
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
  }

  logout(): void {
    localStorage.removeItem(this.CURRENT_USER_KEY)
  }

  updateUser(userId: string, updates: Partial<User>): boolean {
    const userIndex = this.users.findIndex(user => user.id === userId)
    if (userIndex === -1) return false

    this.users[userIndex] = { ...this.users[userIndex], ...updates }
    this.saveUsers()

    // Update current user if it's the same user
    const currentUser = this.getCurrentUser()
    if (currentUser && currentUser.id === userId) {
      const updatedUser = { ...currentUser, ...updates, passwordHash: undefined }
      localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(updatedUser))
    }

    return true
  }

  getAllUsers(): User[] {
    return this.users.map(user => ({ ...user, passwordHash: undefined } as any))
  }

  deleteUser(userId: string): boolean {
    const userIndex = this.users.findIndex(user => user.id === userId)
    if (userIndex === -1) return false

    this.users.splice(userIndex, 1)
    this.saveUsers()

    // Clear current user if it's the deleted user
    const currentUser = this.getCurrentUser()
    if (currentUser && currentUser.id === userId) {
      this.logout()
    }

    return true
  }
}

// Export singleton instance
export const userDatabase = new UserDatabase()

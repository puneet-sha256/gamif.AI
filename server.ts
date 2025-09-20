import express from 'express'
import cors from 'cors'
import fs from 'fs-extra'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const PORT = 3001

// Middleware
app.use(cors())
app.use(express.json())

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString()
  console.log(`🌐 Server: ${timestamp} - ${req.method} ${req.path}`)
  if (req.body && Object.keys(req.body).length > 0) {
    // Log body but hide sensitive data
    const safeBody = { ...req.body }
    if (safeBody.password) safeBody.password = '[HIDDEN]'
    console.log(`📥 Server: Request body:`, safeBody)
  }
  
  // Log response
  const originalSend = res.send
  res.send = function(data) {
    console.log(`📤 Server: ${req.method} ${req.path} - Status: ${res.statusCode}`)
    return originalSend.call(this, data)
  }
  
  next()
})

// Data file paths
const DATA_DIR = path.join(process.cwd(), 'data')
const USERS_FILE = path.join(DATA_DIR, 'users.json')
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json')
const BACKUP_DIR = path.join(DATA_DIR, 'backup')

// User interface
interface User {
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

interface Session {
  userId: string
  sessionId: string
  createdAt: string
  lastAccess: string
}

// Initialize data directory and files
async function initializeData() {
  try {
    // Create directories
    await fs.ensureDir(DATA_DIR)
    await fs.ensureDir(BACKUP_DIR)

    // Initialize users.json if it doesn't exist
    if (!(await fs.pathExists(USERS_FILE))) {
      console.log('📄 Server: Creating users.json file...')
      await fs.writeJson(USERS_FILE, [], { spaces: 2 })
      console.log('✅ Server: Created users.json')
    } else {
      console.log('✅ Server: users.json already exists')
    }

    // Initialize sessions.json if it doesn't exist
    if (!(await fs.pathExists(SESSIONS_FILE))) {
      console.log('📄 Server: Creating sessions.json file...')
      await fs.writeJson(SESSIONS_FILE, [], { spaces: 2 })
      console.log('✅ Server: Created sessions.json')
    } else {
      console.log('✅ Server: sessions.json already exists')
    }

    console.log('✅ Server: Data directory initialized')
    console.log(`📁 Server: Data directory: ${DATA_DIR}`)
    console.log(`👥 Server: Users file: ${USERS_FILE}`)
    console.log(`🔐 Server: Sessions file: ${SESSIONS_FILE}`)
  } catch (error) {
    console.error('❌ Server: Error initializing data directory:', error)
    throw error
  }
}

// Helper functions
async function loadUsers(): Promise<User[]> {
  console.log('🔄 Server: Loading users from file...')
  try {
    const users = await fs.readJson(USERS_FILE)
    console.log(`✅ Server: Loaded ${users.length} users`)
    return users
  } catch (error) {
    console.error('❌ Server: Error loading users:', error)
    return []
  }
}

async function saveUsers(users: User[]): Promise<void> {
  try {
    // Create backup
    const timestamp = new Date().toISOString().split('T')[0]
    const backupFile = path.join(BACKUP_DIR, `users_backup_${timestamp}.json`)
    if (await fs.pathExists(USERS_FILE)) {
      await fs.copy(USERS_FILE, backupFile)
    }

    // Save users
    await fs.writeJson(USERS_FILE, users, { spaces: 2 })
  } catch (error) {
    console.error('Error saving users:', error)
    throw error
  }
}

async function loadSessions(): Promise<Session[]> {
  try {
    return await fs.readJson(SESSIONS_FILE)
  } catch (error) {
    console.error('Error loading sessions:', error)
    return []
  }
}

async function saveSessions(sessions: Session[]): Promise<void> {
  try {
    await fs.writeJson(SESSIONS_FILE, sessions, { spaces: 2 })
  } catch (error) {
    console.error('Error saving sessions:', error)
    throw error
  }
}

function hashPassword(password: string): string {
  // Simple hash function for demo purposes
  // In production, use bcrypt or similar
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return hash.toString()
}

// API Routes

// Register new user
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' })
    }

    const users = await loadUsers()

    // Check if user already exists
    const existingUser = users.find(user => 
      user.email.toLowerCase() === email.toLowerCase() || 
      user.username.toLowerCase() === username.toLowerCase()
    )

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email.toLowerCase() === email.toLowerCase() 
          ? 'Hunter with this email already exists' 
          : 'Hunter name already taken'
      })
    }

    // Create new user
    const newUser: User = {
      id: uuidv4(),
      username,
      email,
      passwordHash: hashPassword(password),
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

    users.push(newUser)
    await saveUsers(users)

    // Return user without password
    const { passwordHash, ...userWithoutPassword } = newUser
    res.json({
      success: true,
      message: 'Hunter registered successfully!',
      user: userWithoutPassword
    })

  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

// Login user
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' })
    }

    const users = await loadUsers()
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase())

    if (!user) {
      return res.status(400).json({ success: false, message: 'Hunter not found in the system' })
    }

    const hashedPassword = hashPassword(password)
    if (user.passwordHash !== hashedPassword) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' })
    }

    // Update last login
    user.lastLogin = new Date().toISOString()
    await saveUsers(users)

    // Create session
    const sessions = await loadSessions()
    const sessionId = uuidv4()
    const newSession: Session = {
      userId: user.id,
      sessionId,
      createdAt: new Date().toISOString(),
      lastAccess: new Date().toISOString()
    }
    sessions.push(newSession)
    await saveSessions(sessions)

    // Return user without password
    const { passwordHash, ...userWithoutPassword } = user
    res.json({
      success: true,
      message: 'Welcome back, Hunter!',
      user: userWithoutPassword,
      sessionId
    })

  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

// Update user
app.put('/api/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const updates = req.body

    const users = await loadUsers()
    const userIndex = users.findIndex(user => user.id === userId)

    if (userIndex === -1) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    // Update user data
    users[userIndex] = { ...users[userIndex], ...updates }
    await saveUsers(users)

    // Return updated user without password
    const { passwordHash, ...userWithoutPassword } = users[userIndex]
    res.json({
      success: true,
      message: 'User updated successfully',
      user: userWithoutPassword
    })

  } catch (error) {
    console.error('Update user error:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

// Logout user
app.post('/api/logout', async (req, res) => {
  try {
    const { sessionId } = req.body

    if (sessionId) {
      const sessions = await loadSessions()
      const filteredSessions = sessions.filter(session => session.sessionId !== sessionId)
      await saveSessions(filteredSessions)
    }

    res.json({ success: true, message: 'Logged out successfully' })

  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

// Get current user by session
app.get('/api/user/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params

    const sessions = await loadSessions()
    const session = sessions.find(s => s.sessionId === sessionId)

    if (!session) {
      return res.status(401).json({ success: false, message: 'Invalid session' })
    }

    const users = await loadUsers()
    const user = users.find(u => u.id === session.userId)

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    // Update session last access
    session.lastAccess = new Date().toISOString()
    await saveSessions(sessions)

    // Return user without password
    const { passwordHash, ...userWithoutPassword } = user
    res.json({
      success: true,
      user: userWithoutPassword
    })

  } catch (error) {
    console.error('Get user by session error:', error)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() })
})

// Initialize and start server
async function startServer() {
  await initializeData()
  
  app.listen(PORT, () => {
    console.log(`🚀 Solo Leveling API Server running on http://localhost:${PORT}`)
    console.log(`📁 Data directory: ${DATA_DIR}`)
    console.log(`👥 Users file: ${USERS_FILE}`)
    console.log(`🔐 Sessions file: ${SESSIONS_FILE}`)
  })
}

startServer().catch(console.error)

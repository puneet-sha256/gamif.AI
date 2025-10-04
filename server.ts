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

import type { 
  User, 
  Session, 
  UserRegistration, 
  UserLogin, 
  AuthResponse, 
  UserStats,
  RegisterRequest,
  LoginRequest,
  LogoutRequest,
  ExperienceUpdateRequest,
  ShardsUpdateRequest,
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiResponse
} from './src/shared/types'

// Server-specific validation helper functions
function isValidString(value: any): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value);
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateRegisterRequest(body: any): body is RegisterRequest {
  return (
    isValidString(body.username) &&
    isValidString(body.email) &&
    isValidEmail(body.email) &&
    isValidString(body.password) &&
    body.password.length >= 6
  );
}

function validateLoginRequest(body: any): body is LoginRequest {
  return (
    isValidString(body.email) &&
    isValidEmail(body.email) &&
    isValidString(body.password)
  );
}

function validateExperienceUpdateRequest(body: any): body is ExperienceUpdateRequest {
  return (
    isValidString(body.sessionId) &&
    (body.strengthDelta === undefined || isValidNumber(body.strengthDelta)) &&
    (body.intelligenceDelta === undefined || isValidNumber(body.intelligenceDelta)) &&
    (body.charismaDelta === undefined || isValidNumber(body.charismaDelta))
  );
}

function validateShardsUpdateRequest(body: any): body is ShardsUpdateRequest {
  return (
    isValidString(body.sessionId) &&
    isValidNumber(body.shardsDelta) &&
    (body.reason === undefined || isValidString(body.reason))
  );
}

// Server-specific imports

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
    const users: User[] = await fs.readJson(USERS_FILE)
    console.log(`✅ Server: Loaded ${users.length} users`)
    return Array.isArray(users) ? users : []
  } catch (error) {
    console.error('❌ Server: Error loading users:', error)
    return []
  }
}

async function saveUsers(users: User[]): Promise<void> {
  if (!Array.isArray(users)) {
    throw new Error('Users must be an array')
  }
  
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
    const sessions: Session[] = await fs.readJson(SESSIONS_FILE)
    return Array.isArray(sessions) ? sessions : []
  } catch (error) {
    console.error('Error loading sessions:', error)
    return []
  }
}

async function saveSessions(sessions: Session[]): Promise<void> {
  if (!Array.isArray(sessions)) {
    throw new Error('Sessions must be an array')
  }
  
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
    // Validate request body
    if (!validateRegisterRequest(req.body)) {
      const response: ApiErrorResponse = {
        success: false,
        message: 'Invalid request. Username, valid email, and password (min 6 chars) are required'
      }
      return res.status(400).json(response)
    }

    const { username, email, password }: RegisterRequest = req.body
    const users = await loadUsers()

    // Check if user already exists
    const existingUser = users.find(user => 
      user.email.toLowerCase() === email.toLowerCase() || 
      user.username.toLowerCase() === username.toLowerCase()
    )

    if (existingUser) {
      const response: ApiErrorResponse = {
        success: false,
        message: existingUser.email.toLowerCase() === email.toLowerCase() 
          ? 'Player with this email already exists' 
          : 'Player name already taken'
      }
      return res.status(400).json(response)
    }

    // Create new user
    const newUser: User = {
      id: uuidv4(),
      username,
      email,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
      stats: {
        experience: 0,
        shards: 0,
        strength: 0,
        intelligence: 0,
        charisma: 0
      }
    }

    users.push(newUser)
    await saveUsers(users)

    // Return user without password
    const { passwordHash, ...userWithoutPassword } = newUser
    const response: ApiSuccessResponse = {
      success: true,
      message: 'Player registered successfully!',
      user: userWithoutPassword
    }
    res.json(response)

  } catch (error) {
    console.error('Registration error:', error)
    const response: ApiErrorResponse = {
      success: false,
      message: 'Internal server error'
    }
    res.status(500).json(response)
  }
})

// Login user
app.post('/api/login', async (req, res) => {
  try {
    // Validate request body
    if (!validateLoginRequest(req.body)) {
      const response: ApiErrorResponse = {
        success: false,
        message: 'Invalid request. Valid email and password are required'
      }
      return res.status(400).json(response)
    }

    const { email, password }: LoginRequest = req.body
    const users = await loadUsers()
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase())

    if (!user) {
      const response: ApiErrorResponse = {
        success: false,
        message: 'Player not found in the system'
      }
      return res.status(400).json(response)
    }

    const hashedPassword = hashPassword(password)
    if (user.passwordHash !== hashedPassword) {
      const response: ApiErrorResponse = {
        success: false,
        message: 'Invalid credentials'
      }
      return res.status(400).json(response)
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
    const response: ApiSuccessResponse = {
      success: true,
      message: 'Welcome back, Player!',
      user: userWithoutPassword,
      sessionId
    }
    res.json(response)

  } catch (error) {
    console.error('Login error:', error)
    const response: ApiErrorResponse = {
      success: false,
      message: 'Internal server error'
    }
    res.status(500).json(response)
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
    const { sessionId }: LogoutRequest = req.body

    if (sessionId && isValidString(sessionId)) {
      const sessions = await loadSessions()
      const filteredSessions = sessions.filter(session => session.sessionId !== sessionId)
      await saveSessions(filteredSessions)
    }

    const response: ApiSuccessResponse = {
      success: true,
      message: 'Logged out successfully'
    }
    res.json(response)

  } catch (error) {
    console.error('Logout error:', error)
    const response: ApiErrorResponse = {
      success: false,
      message: 'Internal server error'
    }
    res.status(500).json(response)
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

// Update experience points for attributes
app.patch('/api/user/experience', async (req, res) => {
  try {
    // Validate request body
    if (!validateExperienceUpdateRequest(req.body)) {
      const response: ApiErrorResponse = {
        success: false,
        message: 'Invalid request. Session ID is required and deltas must be valid numbers'
      }
      return res.status(400).json(response)
    }

    const { sessionId, strengthDelta, intelligenceDelta, charismaDelta }: ExperienceUpdateRequest = req.body

    const strengthChange = strengthDelta || 0
    const intelligenceChange = intelligenceDelta || 0
    const charismaChange = charismaDelta || 0

    // Verify session
    const sessions = await loadSessions()
    const session = sessions.find(s => s.sessionId === sessionId)

    if (!session) {
      const response: ApiErrorResponse = {
        success: false,
        message: 'Invalid session'
      }
      return res.status(401).json(response)
    }

    // Load and find user
    const users = await loadUsers()
    const userIndex = users.findIndex(u => u.id === session.userId)

    if (userIndex === -1) {
      const response: ApiErrorResponse = {
        success: false,
        message: 'User not found'
      }
      return res.status(404).json(response)
    }

    const user = users[userIndex]

    // Ensure user has stats with proper typing
    if (!user.stats) {
      user.stats = {
        experience: 0,
        shards: 0,
        strength: 0,
        intelligence: 0,
        charisma: 0
      } as UserStats
    }

    // Calculate new attribute values (prevent negative values)
    const newStrength = Math.max(0, (user.stats.strength || 0) + strengthChange)
    const newIntelligence = Math.max(0, (user.stats.intelligence || 0) + intelligenceChange)
    const newCharisma = Math.max(0, (user.stats.charisma || 0) + charismaChange)

    // Update stats
    user.stats.strength = newStrength
    user.stats.intelligence = newIntelligence
    user.stats.charisma = newCharisma
    
    // Total experience is sum of all attributes
    user.stats.experience = newStrength + newIntelligence + newCharisma

    // Update session last access
    session.lastAccess = new Date().toISOString()
    await saveSessions(sessions)

    // Save updated user data
    await saveUsers(users)

    // Return updated stats
    const { passwordHash, ...userWithoutPassword } = user
    const response: ApiSuccessResponse = {
      success: true,
      message: 'Experience updated successfully',
      user: userWithoutPassword,
      changes: {
        strengthChange,
        intelligenceChange,
        charismaChange,
        totalExperienceChange: strengthChange + intelligenceChange + charismaChange
      }
    }
    res.json(response)

  } catch (error) {
    console.error('Update experience error:', error)
    const response: ApiErrorResponse = {
      success: false,
      message: 'Internal server error'
    }
    res.status(500).json(response)
  }
})

// Update shards (in-game currency)
app.patch('/api/user/shards', async (req, res) => {
  try {
    // Validate request body
    if (!validateShardsUpdateRequest(req.body)) {
      const response: ApiErrorResponse = {
        success: false,
        message: 'Invalid request. Session ID and shards delta (number) are required'
      }
      return res.status(400).json(response)
    }

    const { sessionId, shardsDelta, reason }: ShardsUpdateRequest = req.body

    // Verify session
    const sessions = await loadSessions()
    const session = sessions.find(s => s.sessionId === sessionId)

    if (!session) {
      const response: ApiErrorResponse = {
        success: false,
        message: 'Invalid session'
      }
      return res.status(401).json(response)
    }

    // Load and find user
    const users = await loadUsers()
    const userIndex = users.findIndex(u => u.id === session.userId)

    if (userIndex === -1) {
      const response: ApiErrorResponse = {
        success: false,
        message: 'User not found'
      }
      return res.status(404).json(response)
    }

    const user = users[userIndex]

    // Ensure user has stats
    if (!user.stats) {
      user.stats = {
        experience: 0,
        shards: 0,
        strength: 0,
        intelligence: 0,
        charisma: 0
      } as UserStats
    }

    // Calculate new shards value (prevent negative shards)
    const currentShards = user.stats.shards || 0
    const newShards = Math.max(0, currentShards + shardsDelta)
    
    // Check if user has enough shards for subtraction
    if (shardsDelta < 0 && currentShards + shardsDelta < 0) {
      const response: ApiErrorResponse = {
        success: false,
        message: `Insufficient shards. Current balance: ${currentShards}, attempted to subtract: ${Math.abs(shardsDelta)}`
      }
      return res.status(400).json(response)
    }

    // Update shards
    user.stats.shards = newShards

    // Update session last access
    session.lastAccess = new Date().toISOString()
    await saveSessions(sessions)

    // Save updated user data
    await saveUsers(users)

    // Return updated stats
    const { passwordHash, ...userWithoutPassword } = user
    const response: ApiSuccessResponse = {
      success: true,
      message: reason 
        ? `Shards updated successfully: ${reason}` 
        : `Shards ${shardsDelta >= 0 ? 'added' : 'subtracted'} successfully`,
      user: userWithoutPassword,
      changes: {
        shardsChange: shardsDelta,
        newShardsBalance: newShards,
        reason
      }
    }
    res.json(response)

  } catch (error) {
    console.error('Update shards error:', error)
    const response: ApiErrorResponse = {
      success: false,
      message: 'Internal server error'
    }
    res.status(500).json(response)
  }
})

// Health check
app.get('/api/health', (req, res) => {
  const response = {
    success: true as const,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  }
  res.json(response)
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

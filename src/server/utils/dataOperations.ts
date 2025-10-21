import fs from 'fs-extra'
import path from 'path'
import type { User, Session } from '../../shared/types'

// Data file paths
export const DATA_DIR = path.join(process.cwd(), 'data')
export const USERS_FILE = path.join(DATA_DIR, 'users.json')
export const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json')
export const BACKUP_DIR = path.join(DATA_DIR, 'backup')

// Initialize data directory and files
export async function initializeData() {
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

// User data operations
export async function loadUsers(): Promise<User[]> {
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

export async function saveUsers(users: User[]): Promise<void> {
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

// Session data operations
export async function loadSessions(): Promise<Session[]> {
  try {
    const sessions: Session[] = await fs.readJson(SESSIONS_FILE)
    return Array.isArray(sessions) ? sessions : []
  } catch (error) {
    console.error('Error loading sessions:', error)
    return []
  }
}

export async function saveSessions(sessions: Session[]): Promise<void> {
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

// Helper functions for finding data
export async function findUserByEmail(email: string): Promise<User | undefined> {
  const users = await loadUsers()
  return users.find(user => user.email.toLowerCase() === email.toLowerCase())
}

export async function findUserByUsername(username: string): Promise<User | undefined> {
  const users = await loadUsers()
  return users.find(user => user.username.toLowerCase() === username.toLowerCase())
}

export async function findUserById(id: string): Promise<User | undefined> {
  const users = await loadUsers()
  return users.find(user => user.id === id)
}

export async function findSessionById(sessionId: string): Promise<Session | undefined> {
  const sessions = await loadSessions()
  return sessions.find(session => session.sessionId === sessionId)
}

export async function updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
  const users = await loadUsers()
  const userIndex = users.findIndex(user => user.id === userId)
  
  if (userIndex === -1) {
    return null
  }
  
  users[userIndex] = { ...users[userIndex], ...updates }
  await saveUsers(users)
  
  return users[userIndex]
}

export async function createSession(userId: string, sessionId: string): Promise<Session> {
  const sessions = await loadSessions()
  const newSession: Session = {
    userId,
    sessionId,
    createdAt: new Date().toISOString(),
    lastAccess: new Date().toISOString()
  }
  
  sessions.push(newSession)
  await saveSessions(sessions)
  
  return newSession
}

export async function updateSessionLastAccess(sessionId: string): Promise<void> {
  const sessions = await loadSessions()
  const session = sessions.find(s => s.sessionId === sessionId)
  
  if (session) {
    session.lastAccess = new Date().toISOString()
    await saveSessions(sessions)
  }
}

export async function removeSession(sessionId: string): Promise<void> {
  const sessions = await loadSessions()
  const filteredSessions = sessions.filter(session => session.sessionId !== sessionId)
  await saveSessions(filteredSessions)
}

// Update user's generated tasks
export async function updateUserGeneratedTasks(userId: string, generatedTasks: import('../../shared/types').GeneratedTasks): Promise<void> {
  console.log('🔄 Server: Updating generated tasks for user:', userId)
  const users = await loadUsers()
  const user = users.find(u => u.id === userId)
  
  if (user) {
    // Update generated tasks directly on user object
    user.generatedTasks = generatedTasks
    
    await saveUsers(users)
    console.log('✅ Server: Generated tasks updated successfully for user:', userId)
  } else {
    console.log('❌ Server: User not found for updating generated tasks:', userId)
  }
}

// Get user's generated tasks
export async function getUserGeneratedTasks(userId: string): Promise<import('../../shared/types').GeneratedTasks | null> {
  const user = await findUserById(userId)
  return user?.generatedTasks || null
}

// Update a specific task in user's generated tasks
export async function updateTaskInGeneratedTasks(
  userId: string,
  taskId: string,
  category: 'Strength' | 'Intelligence' | 'Charisma',
  updates: { description?: string; xp?: number; shards?: number }
): Promise<boolean> {
  console.log('🔄 Server: Updating task', taskId, 'in category', category, 'for user:', userId)
  const users = await loadUsers()
  const user = users.find(u => u.id === userId)
  
  if (!user || !user.generatedTasks) {
    console.log('❌ Server: User or generated tasks not found')
    return false
  }
  
  const tasks = user.generatedTasks[category]
  if (!tasks) {
    console.log('❌ Server: Category not found in generated tasks')
    return false
  }
  
  const taskIndex = tasks.findIndex(t => t.id === taskId)
  if (taskIndex === -1) {
    console.log('❌ Server: Task not found in category')
    return false
  }
  
  // Update task properties
  if (updates.description !== undefined) {
    tasks[taskIndex].description = updates.description
  }
  if (updates.xp !== undefined) {
    tasks[taskIndex].xp = updates.xp
  }
  if (updates.shards !== undefined) {
    tasks[taskIndex].shards = updates.shards
  }
  
  await saveUsers(users)
  console.log('✅ Server: Task updated successfully')
  return true
}

// Delete a specific task from user's generated tasks
export async function deleteTaskFromGeneratedTasks(
  userId: string,
  taskId: string,
  category: 'Strength' | 'Intelligence' | 'Charisma'
): Promise<boolean> {
  console.log('🔄 Server: Deleting task', taskId, 'from category', category, 'for user:', userId)
  const users = await loadUsers()
  const user = users.find(u => u.id === userId)
  
  if (!user || !user.generatedTasks) {
    console.log('❌ Server: User or generated tasks not found')
    return false
  }
  
  const tasks = user.generatedTasks[category]
  if (!tasks) {
    console.log('❌ Server: Category not found in generated tasks')
    return false
  }
  
  const taskIndex = tasks.findIndex(t => t.id === taskId)
  if (taskIndex === -1) {
    console.log('❌ Server: Task not found in category')
    return false
  }
  
  // Remove the task from the array
  tasks.splice(taskIndex, 1)
  
  await saveUsers(users)
  console.log('✅ Server: Task deleted successfully')
  return true
}
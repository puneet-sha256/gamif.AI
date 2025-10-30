import fs from 'fs-extra'
import path from 'path'
import type { User, Session } from '../../shared/types'
import { logger } from '../../utils/logger'

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
      logger.custom('📄', 'Creating users.json file...')
      await fs.writeJson(USERS_FILE, [], { spaces: 2 })
      logger.success('Created users.json')
    } else {
      logger.success('users.json already exists')
    }

    // Initialize sessions.json if it doesn't exist
    if (!(await fs.pathExists(SESSIONS_FILE))) {
      logger.custom('📄', 'Creating sessions.json file...')
      await fs.writeJson(SESSIONS_FILE, [], { spaces: 2 })
      logger.success('Created sessions.json')
    } else {
      logger.success('sessions.json already exists')
    }

    logger.success('Data directory initialized')
    logger.custom('📁', `Data directory: ${DATA_DIR}`)
    logger.custom('👥', `Users file: ${USERS_FILE}`)
    logger.custom('🔐', `Sessions file: ${SESSIONS_FILE}`)
  } catch (error) {
    logger.error('Error initializing data directory:', error)
    throw error
  }
}

// User data operations
export async function loadUsers(): Promise<User[]> {
  logger.custom('🔄', 'Loading users from file...')
  try {
    const users: User[] = await fs.readJson(USERS_FILE)
    logger.success(`Loaded ${users.length} users`)
    return Array.isArray(users) ? users : []
  } catch (error) {
    logger.error('Error loading users:', error)
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
    logger.error('Error saving users:', error)
    throw error
  }
}

// Session data operations
export async function loadSessions(): Promise<Session[]> {
  try {
    const sessions: Session[] = await fs.readJson(SESSIONS_FILE)
    return Array.isArray(sessions) ? sessions : []
  } catch (error) {
    logger.error('Error loading sessions:', error)
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
    logger.error('Error saving sessions:', error)
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
  logger.custom('🔄', `Updating generated tasks for user: ${userId}`)
  const users = await loadUsers()
  const user = users.find(u => u.id === userId)
  
  if (user) {
    // Update generated tasks directly on user object
    user.generatedTasks = generatedTasks
    
    await saveUsers(users)
    logger.success(`Generated tasks updated successfully for user: ${userId}`)
  } else {
    logger.error(`User not found for updating generated tasks: ${userId}`)
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
  updates: { title?: string; description?: string; xp?: number; shards?: number }
): Promise<boolean> {
  logger.custom('🔄', `Updating task ${taskId} in category ${category} for user: ${userId}`)
  const users = await loadUsers()
  const user = users.find(u => u.id === userId)
  
  if (!user || !user.generatedTasks) {
    logger.error('User or generated tasks not found')
    return false
  }
  
  const tasks = user.generatedTasks[category]
  if (!tasks) {
    logger.error('Category not found in generated tasks')
    return false
  }
  
  const taskIndex = tasks.findIndex(t => t.id === taskId)
  if (taskIndex === -1) {
    logger.error('Task not found in category')
    return false
  }
  
  // Update task properties
  if (updates.title !== undefined) {
    if (updates.title === '') {
      // Empty string means remove the title (convert custom task back to AI-generated)
      delete tasks[taskIndex].title
    } else {
      // Non-empty string means set/update the title
      tasks[taskIndex].title = updates.title
    }
  }
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
  logger.success('Task updated successfully')
  return true
}

// Delete a specific task from user's generated tasks
export async function deleteTaskFromGeneratedTasks(
  userId: string,
  taskId: string,
  category: 'Strength' | 'Intelligence' | 'Charisma'
): Promise<boolean> {
  logger.custom('🔄', `Deleting task ${taskId} from category ${category} for user: ${userId}`)
  const users = await loadUsers()
  const user = users.find(u => u.id === userId)
  
  if (!user || !user.generatedTasks) {
    logger.error('User or generated tasks not found')
    return false
  }
  
  const tasks = user.generatedTasks[category]
  if (!tasks) {
    logger.error('Category not found in generated tasks')
    return false
  }
  
  const taskIndex = tasks.findIndex(t => t.id === taskId)
  if (taskIndex === -1) {
    logger.error('Task not found in category')
    return false
  }
  
  // Remove the task from the array
  tasks.splice(taskIndex, 1)
  
  await saveUsers(users)
  logger.success('Task deleted successfully')
  return true
}
// Add a task to user's generated tasks (supports both AI and user-created tasks)
export async function addTaskToGeneratedTasks(
  userId: string,
  task: {
    title?: string; // Optional title for user-created tasks
    description: string;
    category: 'Strength' | 'Intelligence' | 'Charisma';
    xp: number;
    shards: number;
  }
): Promise<boolean> {
  logger.info(`Adding task for user: ${userId}`)
  const users = await loadUsers()
  const user = users.find(u => u.id === userId)
  
  if (!user) {
    logger.error('User not found')
    return false
  }
  
  // Initialize generatedTasks if it doesn't exist
  if (!user.generatedTasks) {
    user.generatedTasks = {}
  }
  
  // Initialize category array if it doesn't exist
  if (!user.generatedTasks[task.category]) {
    user.generatedTasks[task.category] = []
  }
  
  // Create the task with ID
  const newTask = {
    id: `${task.title ? 'custom' : 'ai'}-${task.category.toLowerCase()}-${Date.now()}`,
    ...(task.title && { title: task.title }), // Only add title if provided
    description: task.description,
    xp: task.xp,
    shards: task.shards
  }
  
  // Add task to category
  user.generatedTasks[task.category]!.push(newTask)
  
  await saveUsers(users)
  logger.success('Task added successfully')
  return true
}

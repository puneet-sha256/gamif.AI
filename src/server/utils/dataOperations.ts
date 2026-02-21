import fs from 'fs-extra'
import path from 'path'
import type { User, Session } from '../../shared/types'
import { logger } from '../../utils/logger'

// Data file paths
export const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'data'))
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
  
  // Merge updates with existing user
  const updatedUser = { ...users[userIndex], ...updates }
  
  // Remove properties that are explicitly set to null or undefined
  Object.keys(updates).forEach(key => {
    if (updates[key as keyof User] === null || updates[key as keyof User] === undefined) {
      delete updatedUser[key as keyof User]
    }
  })
  
  users[userIndex] = updatedUser
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
  updates: { title?: string; description?: string; expected_duration_minutes?: number; xp?: number; shards?: number }
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
  if (updates.expected_duration_minutes !== undefined) {
    tasks[taskIndex].expected_duration_minutes = updates.expected_duration_minutes
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
    expected_duration_minutes?: number;
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
    ...(task.expected_duration_minutes && { expected_duration_minutes: task.expected_duration_minutes }),
    xp: task.xp,
    shards: task.shards
  }
  
  // Add task to category
  user.generatedTasks[task.category]!.push(newTask)
  
  await saveUsers(users)
  logger.success('Task added successfully')
  return true
}

// Shop item operations
export async function addShopItem(
  userId: string,
  item: {
    title: string;
    description?: string;
    price: number;
    image?: string;
    isConsumable?: boolean;
    isKeyItem?: boolean;
    allowMultiplePurchases?: boolean;
  }
): Promise<boolean> {
  logger.info(`Adding shop item for user: ${userId}`)
  const users = await loadUsers()
  const user = users.find(u => u.id === userId)
  
  if (!user) {
    logger.error('User not found')
    return false
  }
  
  // Initialize shopItems if it doesn't exist
  if (!user.shopItems) {
    user.shopItems = []
  }
  
  // Create the shop item with ID
  const newItem = {
    id: `shop-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    title: item.title,
    description: item.description,
    price: item.price,
    image: item.image || '🎁',
    createdAt: new Date().toISOString(),
    isConsumable: item.isConsumable || false,
    isKeyItem: item.isKeyItem || false,
    allowMultiplePurchases: item.allowMultiplePurchases || false
  }
  
  // Add item to shop
  user.shopItems.push(newItem)
  
  await saveUsers(users)
  logger.success('Shop item added successfully')
  return true
}

export async function deleteShopItem(
  userId: string,
  itemId: string
): Promise<boolean> {
  logger.info(`Deleting shop item ${itemId} for user: ${userId}`)
  const users = await loadUsers()
  const user = users.find(u => u.id === userId)
  
  if (!user || !user.shopItems) {
    logger.error('User not found or no shop items')
    return false
  }
  
  const initialLength = user.shopItems.length
  user.shopItems = user.shopItems.filter(item => item.id !== itemId)
  
  if (user.shopItems.length === initialLength) {
    logger.error('Shop item not found')
    return false
  }
  
  await saveUsers(users)
  logger.success('Shop item deleted successfully')
  return true
}

export async function getUserShopItems(userId: string) {
  logger.info(`Getting shop items for user: ${userId}`)
  const users = await loadUsers()
  const user = users.find(u => u.id === userId)
  
  if (!user) {
    logger.error('User not found')
    return null
  }
  
  return user.shopItems || []
}

export async function buyShopItem(
  userId: string,
  itemId: string,
  itemPrice: number,
  itemDetails?: {
    title: string
    description?: string
    image?: string
    isConsumable?: boolean
    isKeyItem?: boolean
    allowMultiplePurchases?: boolean
  }
): Promise<{ success: boolean; message?: string }> {
  logger.info(`User ${userId} attempting to buy shop item ${itemId} for ${itemPrice} shards`)
  const users = await loadUsers()
  const user = users.find(u => u.id === userId)
  
  if (!user) {
    logger.error('User not found')
    return { success: false, message: 'User not found' }
  }
  
  // Ensure user has stats
  if (!user.stats) {
    user.stats = {
      experience: 0,
      shards: 0,
      strength: 0,
      intelligence: 0,
      charisma: 0
    }
  }
  
  const currentShards = user.stats.shards || 0
  
  // Check if user has enough shards
  if (currentShards < itemPrice) {
    logger.error(`Insufficient shards. User has ${currentShards}, needs ${itemPrice}`)
    return { 
      success: false, 
      message: `Insufficient shards. You have ${currentShards} 💎, but need ${itemPrice} 💎` 
    }
  }
  
  // Check if item is in user's wishlist (user-created item)
  const shopItem = user.shopItems?.find(item => item.id === itemId)
  const isWishlistItem = !!shopItem
  
  // If not a wishlist item, it must be a built-in shop item - require itemDetails
  if (!isWishlistItem && !itemDetails) {
    logger.error('Built-in shop item requires itemDetails parameter')
    return { 
      success: false, 
      message: 'Invalid purchase request' 
    }
  }
  
  // Get item information from either wishlist or itemDetails
  const itemInfo = isWishlistItem ? shopItem : {
    id: itemId,
    title: itemDetails!.title,
    description: itemDetails?.description,
    price: itemPrice,
    image: itemDetails?.image,
    isConsumable: itemDetails?.isConsumable || false,
    isKeyItem: itemDetails?.isKeyItem || false,
    allowMultiplePurchases: itemDetails?.allowMultiplePurchases || false
  }
  
  // Deduct shards
  user.stats.shards = currentShards - itemPrice
  
  // Remove item from shopItems (wishlist) ONLY if:
  // 1. It's a user-created wishlist item, AND
  // 2. allowMultiplePurchases is NOT set to true
  if (isWishlistItem && user.shopItems && !shopItem?.allowMultiplePurchases) {
    user.shopItems = user.shopItems.filter(item => item.id !== itemId)
    logger.info(`Removed item "${itemInfo.title}" from wishlist (single-purchase item)`)
  } else if (isWishlistItem && shopItem?.allowMultiplePurchases) {
    logger.info(`Kept item "${itemInfo.title}" in wishlist (multi-purchase item)`)
  }
  
  // Initialize inventory if it doesn't exist
  if (!user.inventory) {
    user.inventory = []
  }
  
  // Check if item with the same title already exists in inventory (for counting duplicates)
  const existingInventoryItem = user.inventory.find(item => 
    item.title === itemInfo.title && 
    item.description === itemInfo.description &&
    item.price === itemInfo.price
  )
  
  if (existingInventoryItem) {
    // Item already in inventory, increment count
    existingInventoryItem.count += 1
    logger.info(`Incremented count for item "${itemInfo.title}" in inventory to ${existingInventoryItem.count}`)
  } else {
    // Add new item to inventory with count 1
    const inventoryItem = {
      id: itemInfo.id,
      title: itemInfo.title,
      description: itemInfo.description,
      price: itemInfo.price,
      image: itemInfo.image,
      count: 1,
      purchasedAt: new Date().toISOString(),
      isConsumable: itemInfo.isConsumable || false,
      isKeyItem: itemInfo.isKeyItem || false
    }
    user.inventory.push(inventoryItem)
    logger.info(`Added new item "${itemInfo.title}" to inventory`)
  }
  
  await saveUsers(users)
  logger.success(`Shop item purchased successfully. New shard balance: ${user.stats.shards}`)
  return { 
    success: true, 
    message: `Successfully purchased item for ${itemPrice} 💎. Remaining shards: ${user.stats.shards} 💎` 
  }
}

// Use a consumable item from inventory
export async function useInventoryItem(
  userId: string,
  itemId: string
): Promise<{ success: boolean; message?: string }> {
  logger.info(`User ${userId} attempting to use inventory item ${itemId}`)
  const users = await loadUsers()
  const user = users.find(u => u.id === userId)
  
  if (!user) {
    logger.error('User not found')
    return { success: false, message: 'User not found' }
  }
  
  // Check if user has an inventory
  if (!user.inventory || user.inventory.length === 0) {
    logger.error('User has no inventory items')
    return { success: false, message: 'No items in inventory' }
  }
  
  // Find the item in inventory
  const itemIndex = user.inventory.findIndex(item => item.id === itemId)
  
  if (itemIndex === -1) {
    logger.error('Item not found in inventory')
    return { success: false, message: 'Item not found in inventory' }
  }
  
  const item = user.inventory[itemIndex]
  
  // Check if item is consumable
  if (!item.isConsumable) {
    logger.error('Item is not consumable')
    return { success: false, message: 'This item cannot be used' }
  }
  
  // Decrease count by 1
  item.count -= 1
  
  // If count reaches 0, remove the item from inventory
  if (item.count <= 0) {
    user.inventory.splice(itemIndex, 1)
    logger.info(`Item "${item.title}" removed from inventory (count reached 0)`)
  } else {
    logger.info(`Item "${item.title}" count decreased to ${item.count}`)
  }
  
  await saveUsers(users)
  logger.success(`Item used successfully`)
  return { 
    success: true, 
    message: `Used "${item.title}" successfully` 
  }
}

import fs from 'fs-extra'
import path from 'path'
import type { User, GeneratedTasks } from '../../shared/types'
import type { IUserRepository } from './interfaces'
import { logger } from '../../utils/logger'

const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'data'))
const USERS_FILE = path.join(DATA_DIR, 'users.json')
const BACKUP_DIR = path.join(DATA_DIR, 'backup')

export class FileUserRepository implements IUserRepository {
  async initialize(): Promise<void> {
    await fs.ensureDir(DATA_DIR)
    await fs.ensureDir(BACKUP_DIR)
    if (!(await fs.pathExists(USERS_FILE))) {
      logger.custom('📄', 'Creating users.json file...')
      await fs.writeJson(USERS_FILE, [], { spaces: 2 })
      logger.success('Created users.json')
    } else {
      logger.success('users.json already exists')
    }
  }

  private async loadUsers(): Promise<User[]> {
    try {
      const users: User[] = await fs.readJson(USERS_FILE)
      return Array.isArray(users) ? users : []
    } catch (error) {
      logger.error('Error loading users:', error)
      return []
    }
  }

  private async saveUsers(users: User[]): Promise<void> {
    // Create backup
    const timestamp = new Date().toISOString().split('T')[0]
    const backupFile = path.join(BACKUP_DIR, `users_backup_${timestamp}.json`)
    if (await fs.pathExists(USERS_FILE)) {
      await fs.copy(USERS_FILE, backupFile)
    }
    await fs.writeJson(USERS_FILE, users, { spaces: 2 })
  }

  // ─── Core CRUD ───────────────────────────────────────────────────────────

  async findById(userId: string): Promise<User | undefined> {
    const users = await this.loadUsers()
    return users.find(user => user.id === userId)
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const users = await this.loadUsers()
    return users.find(user => user.email.toLowerCase() === email.toLowerCase())
  }

  async findByUsername(username: string): Promise<User | undefined> {
    const users = await this.loadUsers()
    return users.find(user => user.username.toLowerCase() === username.toLowerCase())
  }

  async createUser(user: User): Promise<void> {
    const users = await this.loadUsers()
    users.push(user)
    await this.saveUsers(users)
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    const users = await this.loadUsers()
    const userIndex = users.findIndex(user => user.id === userId)

    if (userIndex === -1) return null

    const updatedUser = { ...users[userIndex], ...updates }

    // Remove properties that are explicitly set to null or undefined
    Object.keys(updates).forEach(key => {
      if (updates[key as keyof User] === null || updates[key as keyof User] === undefined) {
        delete updatedUser[key as keyof User]
      }
    })

    users[userIndex] = updatedUser
    await this.saveUsers(users)
    return users[userIndex]
  }

  // ─── Generated tasks ────────────────────────────────────────────────────

  async getUserGeneratedTasks(userId: string): Promise<GeneratedTasks | null> {
    const user = await this.findById(userId)
    return user?.generatedTasks || null
  }

  async updateUserGeneratedTasks(userId: string, generatedTasks: GeneratedTasks): Promise<void> {
    logger.custom('🔄', `Updating generated tasks for user: ${userId}`)
    const users = await this.loadUsers()
    const user = users.find(u => u.id === userId)

    if (user) {
      user.generatedTasks = generatedTasks
      await this.saveUsers(users)
      logger.success(`Generated tasks updated successfully for user: ${userId}`)
    } else {
      logger.error(`User not found for updating generated tasks: ${userId}`)
    }
  }

  async updateTaskInGeneratedTasks(
    userId: string,
    taskId: string,
    category: 'Strength' | 'Intelligence' | 'Charisma',
    updates: { title?: string; description?: string; expected_duration_minutes?: number; xp?: number; shards?: number }
  ): Promise<boolean> {
    logger.custom('🔄', `Updating task ${taskId} in category ${category} for user: ${userId}`)
    const users = await this.loadUsers()
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

    if (updates.title !== undefined) {
      if (updates.title === '') {
        delete tasks[taskIndex].title
      } else {
        tasks[taskIndex].title = updates.title
      }
    }
    if (updates.description !== undefined) tasks[taskIndex].description = updates.description
    if (updates.xp !== undefined) tasks[taskIndex].xp = updates.xp
    if (updates.shards !== undefined) tasks[taskIndex].shards = updates.shards
    if (updates.expected_duration_minutes !== undefined) {
      tasks[taskIndex].expected_duration_minutes = updates.expected_duration_minutes
    }

    await this.saveUsers(users)
    logger.success('Task updated successfully')
    return true
  }

  async deleteTaskFromGeneratedTasks(
    userId: string,
    taskId: string,
    category: 'Strength' | 'Intelligence' | 'Charisma'
  ): Promise<boolean> {
    logger.custom('🔄', `Deleting task ${taskId} from category ${category} for user: ${userId}`)
    const users = await this.loadUsers()
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

    tasks.splice(taskIndex, 1)
    await this.saveUsers(users)
    logger.success('Task deleted successfully')
    return true
  }

  async addTaskToGeneratedTasks(
    userId: string,
    task: {
      title?: string
      description: string
      category: 'Strength' | 'Intelligence' | 'Charisma'
      expected_duration_minutes?: number
      xp: number
      shards: number
    }
  ): Promise<boolean> {
    logger.info(`Adding task for user: ${userId}`)
    const users = await this.loadUsers()
    const user = users.find(u => u.id === userId)

    if (!user) {
      logger.error('User not found')
      return false
    }

    if (!user.generatedTasks) user.generatedTasks = {}
    if (!user.generatedTasks[task.category]) user.generatedTasks[task.category] = []

    const newTask = {
      id: `${task.title ? 'custom' : 'ai'}-${task.category.toLowerCase()}-${Date.now()}`,
      ...(task.title && { title: task.title }),
      description: task.description,
      ...(task.expected_duration_minutes && { expected_duration_minutes: task.expected_duration_minutes }),
      xp: task.xp,
      shards: task.shards,
    }

    user.generatedTasks[task.category]!.push(newTask)
    await this.saveUsers(users)
    logger.success('Task added successfully')
    return true
  }

  // ─── Shop operations ────────────────────────────────────────────────────

  async addShopItem(
    userId: string,
    item: {
      title: string
      description?: string
      price: number
      image?: string
      isConsumable?: boolean
      isKeyItem?: boolean
      allowMultiplePurchases?: boolean
    }
  ): Promise<boolean> {
    logger.info(`Adding shop item for user: ${userId}`)
    const users = await this.loadUsers()
    const user = users.find(u => u.id === userId)

    if (!user) {
      logger.error('User not found')
      return false
    }

    if (!user.shopItems) user.shopItems = []

    const newItem = {
      id: `shop-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      title: item.title,
      description: item.description,
      price: item.price,
      image: item.image || '🎁',
      createdAt: new Date().toISOString(),
      isConsumable: item.isConsumable || false,
      isKeyItem: item.isKeyItem || false,
      allowMultiplePurchases: item.allowMultiplePurchases || false,
    }

    user.shopItems.push(newItem)
    await this.saveUsers(users)
    logger.success('Shop item added successfully')
    return true
  }

  async deleteShopItem(userId: string, itemId: string): Promise<boolean> {
    logger.info(`Deleting shop item ${itemId} for user: ${userId}`)
    const users = await this.loadUsers()
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

    await this.saveUsers(users)
    logger.success('Shop item deleted successfully')
    return true
  }

  async getUserShopItems(userId: string) {
    logger.info(`Getting shop items for user: ${userId}`)
    const users = await this.loadUsers()
    const user = users.find(u => u.id === userId)
    if (!user) return null
    return user.shopItems || []
  }

  async buyShopItem(
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
    const users = await this.loadUsers()
    const user = users.find(u => u.id === userId)

    if (!user) return { success: false, message: 'User not found' }

    if (!user.stats) {
      user.stats = { experience: 0, shards: 0, strength: 0, intelligence: 0, charisma: 0 }
    }

    const currentShards = user.stats.shards || 0
    if (currentShards < itemPrice) {
      return {
        success: false,
        message: `Insufficient shards. You have ${currentShards} 💎, but need ${itemPrice} 💎`,
      }
    }

    const shopItem = user.shopItems?.find(item => item.id === itemId)
    const isWishlistItem = !!shopItem

    if (!isWishlistItem && !itemDetails) {
      return { success: false, message: 'Invalid purchase request' }
    }

    const itemInfo = isWishlistItem
      ? shopItem
      : {
          id: itemId,
          title: itemDetails!.title,
          description: itemDetails?.description,
          price: itemPrice,
          image: itemDetails?.image,
          isConsumable: itemDetails?.isConsumable || false,
          isKeyItem: itemDetails?.isKeyItem || false,
          allowMultiplePurchases: itemDetails?.allowMultiplePurchases || false,
        }

    user.stats.shards = currentShards - itemPrice

    if (isWishlistItem && user.shopItems && !shopItem?.allowMultiplePurchases) {
      user.shopItems = user.shopItems.filter(item => item.id !== itemId)
    }

    if (!user.inventory) user.inventory = []

    const existingInventoryItem = user.inventory.find(
      item =>
        item.title === itemInfo.title &&
        item.description === itemInfo.description &&
        item.price === itemInfo.price
    )

    if (existingInventoryItem) {
      existingInventoryItem.count += 1
    } else {
      user.inventory.push({
        id: itemInfo.id,
        title: itemInfo.title,
        description: itemInfo.description,
        price: itemInfo.price,
        image: itemInfo.image,
        count: 1,
        purchasedAt: new Date().toISOString(),
        isConsumable: itemInfo.isConsumable || false,
        isKeyItem: itemInfo.isKeyItem || false,
      })
    }

    await this.saveUsers(users)
    logger.success(`Shop item purchased successfully. New shard balance: ${user.stats.shards}`)
    return {
      success: true,
      message: `Successfully purchased item for ${itemPrice} 💎. Remaining shards: ${user.stats.shards} 💎`,
    }
  }

  async useInventoryItem(
    userId: string,
    itemId: string
  ): Promise<{ success: boolean; message?: string }> {
    logger.info(`User ${userId} attempting to use inventory item ${itemId}`)
    const users = await this.loadUsers()
    const user = users.find(u => u.id === userId)

    if (!user) return { success: false, message: 'User not found' }

    if (!user.inventory || user.inventory.length === 0) {
      return { success: false, message: 'No items in inventory' }
    }

    const itemIndex = user.inventory.findIndex(item => item.id === itemId)
    if (itemIndex === -1) {
      return { success: false, message: 'Item not found in inventory' }
    }

    const item = user.inventory[itemIndex]
    if (!item.isConsumable) {
      return { success: false, message: 'This item cannot be used' }
    }

    item.count -= 1
    if (item.count <= 0) {
      user.inventory.splice(itemIndex, 1)
    }

    await this.saveUsers(users)
    logger.success('Item used successfully')
    return { success: true, message: `Used "${item.title}" successfully` }
  }

  // ─── Push notification queries ────────────────────────────────────────

  async findAllWithPushSubscriptions(): Promise<User[]> {
    const users = await this.loadUsers()
    return users.filter(
      u => u.pushNotifications?.subscriptions?.length &&
           u.pushNotifications?.preferences?.enabled
    )
  }
}

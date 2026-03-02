import type { Container, JSONObject } from '@azure/cosmos'
import type { User, GeneratedTasks } from '../../shared/types'
import type { IUserRepository } from './interfaces'
import type { SubDoc, SubDocType, ProfileSubDoc, TasksSubDoc, ShopSubDoc, HistorySubDoc, RewardsSubDoc } from './types'
import { FIELD_TO_SUBDOC } from './types'
import { getUsersContainer } from './cosmosClient'
import { logger } from '../../utils/logger'

export class CosmosUserRepository implements IUserRepository {
  private get container(): Container {
    return getUsersContainer()
  }

  // ─── Assembly helpers ────────────────────────────────────────────────────

  /** Reconstruct a full User object from sub-documents in a partition. */
  private assembleUser(subDocs: SubDoc[]): User | undefined {
    const profile = subDocs.find(d => d.type === 'profile') as ProfileSubDoc | undefined
    if (!profile) return undefined

    const tasks = subDocs.find(d => d.type === 'tasks') as TasksSubDoc | undefined
    const shop = subDocs.find(d => d.type === 'shop') as ShopSubDoc | undefined
    const history = subDocs.find(d => d.type === 'history') as HistorySubDoc | undefined
    const rewards = subDocs.find(d => d.type === 'rewards') as RewardsSubDoc | undefined

    return {
      id: profile.userId,
      username: profile.username,
      email: profile.email,
      passwordHash: profile.passwordHash,
      createdAt: profile.createdAt,
      lastLogin: profile.lastLogin,
      profileData: profile.profileData,
      goalsData: profile.goalsData,
      stats: profile.stats,
      generatedTasks: tasks?.generatedTasks,
      shopItems: shop?.shopItems,
      inventory: shop?.inventory,
      activityHistory: history?.activityHistory,
      taskHistory: history?.taskHistory,
      unclaimedRewards: rewards?.unclaimedRewards,
      pushNotifications: profile.pushNotifications,
    }
  }

  /** Read all sub-docs in a user partition. */
  private async readPartition(userId: string): Promise<SubDoc[]> {
    const { resources } = await this.container.items
      .query<SubDoc>({
        query: 'SELECT * FROM c WHERE c.userId = @userId',
        parameters: [{ name: '@userId', value: userId }],
      })
      .fetchAll()
    return resources
  }

  /** Read a single sub-doc by type within a user partition. */
  private async readSubDoc<T extends SubDoc>(userId: string, type: SubDocType): Promise<T | undefined> {
    try {
      const { resource } = await this.container
        .item(type, userId)
        .read<T>()
      return resource
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 404) return undefined
      throw err
    }
  }

  /** Upsert a sub-doc (create or replace). */
  private async upsertSubDoc(doc: SubDoc): Promise<void> {
    await this.container.items.upsert(doc)
  }

  // ─── Core CRUD ───────────────────────────────────────────────────────────

  async findById(userId: string): Promise<User | undefined> {
    const subDocs = await this.readPartition(userId)
    if (subDocs.length === 0) return undefined
    return this.assembleUser(subDocs)
  }

  async findByEmail(email: string): Promise<User | undefined> {
    // Cross-partition query on profile docs
    const { resources } = await this.container.items
      .query<ProfileSubDoc>({
        query: 'SELECT * FROM c WHERE c.type = "profile" AND LOWER(c.email) = @email',
        parameters: [{ name: '@email', value: email.toLowerCase() }],
      })
      .fetchAll()

    if (resources.length === 0) return undefined
    const profile = resources[0]
    // Now read the full partition for this user
    return this.findById(profile.userId)
  }

  async findByUsername(username: string): Promise<User | undefined> {
    const { resources } = await this.container.items
      .query<ProfileSubDoc>({
        query: 'SELECT * FROM c WHERE c.type = "profile" AND LOWER(c.username) = @username',
        parameters: [{ name: '@username', value: username.toLowerCase() }],
      })
      .fetchAll()

    if (resources.length === 0) return undefined
    const profile = resources[0]
    return this.findById(profile.userId)
  }

  async createUser(user: User): Promise<void> {
    logger.custom('📝', `Creating user in Cosmos DB: ${user.username}`)

    // Build all sub-docs that need to be written
    const operations: { operationType: 'Upsert'; resourceBody: JSONObject }[] = []

    const profileDoc: ProfileSubDoc = {
      id: 'profile',
      type: 'profile',
      userId: user.id,
      username: user.username,
      email: user.email,
      passwordHash: user.passwordHash,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      profileData: user.profileData,
      goalsData: user.goalsData,
      stats: user.stats,
      pushNotifications: user.pushNotifications,
    }
    operations.push({ operationType: 'Upsert', resourceBody: profileDoc as unknown as JSONObject })

    if (user.generatedTasks) {
      operations.push({
        operationType: 'Upsert',
        resourceBody: {
          id: 'tasks', type: 'tasks', userId: user.id,
          generatedTasks: user.generatedTasks,
        } as unknown as JSONObject,
      })
    }
    if (user.shopItems || user.inventory) {
      operations.push({
        operationType: 'Upsert',
        resourceBody: {
          id: 'shop', type: 'shop', userId: user.id,
          shopItems: user.shopItems,
          inventory: user.inventory,
        } as unknown as JSONObject,
      })
    }
    if (user.activityHistory || user.taskHistory) {
      operations.push({
        operationType: 'Upsert',
        resourceBody: {
          id: 'history', type: 'history', userId: user.id,
          activityHistory: user.activityHistory,
          taskHistory: user.taskHistory,
        } as unknown as JSONObject,
      })
    }
    if (user.unclaimedRewards) {
      operations.push({
        operationType: 'Upsert',
        resourceBody: {
          id: 'rewards', type: 'rewards', userId: user.id,
          unclaimedRewards: user.unclaimedRewards,
        } as unknown as JSONObject,
      })
    }

    // Use transactional batch — all sub-docs written atomically (same partition)
    // If any fails, none are committed
    try {
      await this.container.items.batch(operations, user.id)
    } catch {
      // Fallback for environments where batch isn't supported — write sequentially
      for (const op of operations) {
        await this.container.items.upsert(op.resourceBody)
      }
    }

    logger.success(`User created in Cosmos DB: ${user.username}`)
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    // Group update fields by sub-doc type
    const subdocUpdates = new Map<SubDocType, Record<string, unknown>>()

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'id') continue // never update the id
      const subdocType = FIELD_TO_SUBDOC[key]
      if (!subdocType) continue // unknown field, skip

      if (!subdocUpdates.has(subdocType)) {
        subdocUpdates.set(subdocType, {})
      }
      subdocUpdates.get(subdocType)![key] = value
    }

    // Read-merge-upsert each affected sub-doc
    for (const [subdocType, fields] of subdocUpdates) {
      const existing = await this.readSubDoc(userId, subdocType)

      if (existing) {
        // Merge updates into existing doc
        const merged = { ...existing }
        for (const [key, value] of Object.entries(fields)) {
          if (value === null || value === undefined) {
            delete (merged as Record<string, unknown>)[key]
          } else {
            (merged as Record<string, unknown>)[key] = value
          }
        }
        await this.upsertSubDoc(merged as SubDoc)
      } else {
        // Create new sub-doc with defaults
        const newDoc: Record<string, unknown> = {
          id: subdocType,
          type: subdocType,
          userId,
          ...fields,
        }
        // Remove null/undefined fields
        for (const [key, value] of Object.entries(fields)) {
          if (value === null || value === undefined) {
            delete newDoc[key]
          }
        }
        await this.upsertSubDoc(newDoc as unknown as SubDoc)
      }
    }

    // Return the fully assembled user
    return (await this.findById(userId)) ?? null
  }

  // ─── Generated tasks ────────────────────────────────────────────────────

  async getUserGeneratedTasks(userId: string): Promise<GeneratedTasks | null> {
    const tasksDoc = await this.readSubDoc<TasksSubDoc>(userId, 'tasks')
    return tasksDoc?.generatedTasks ?? null
  }

  async updateUserGeneratedTasks(userId: string, generatedTasks: GeneratedTasks): Promise<void> {
    logger.custom('🔄', `Updating generated tasks for user: ${userId}`)
    const existing = await this.readSubDoc<TasksSubDoc>(userId, 'tasks')
    const doc: TasksSubDoc = {
      id: 'tasks',
      type: 'tasks',
      userId,
      generatedTasks,
      ...(existing ? {} : {}),
    }
    await this.upsertSubDoc(doc)
    logger.success(`Generated tasks updated successfully for user: ${userId}`)
  }

  async updateTaskInGeneratedTasks(
    userId: string,
    taskId: string,
    category: 'Strength' | 'Intelligence' | 'Charisma',
    updates: { title?: string; description?: string; expected_duration_minutes?: number; xp?: number; shards?: number }
  ): Promise<boolean> {
    logger.custom('🔄', `Updating task ${taskId} in category ${category} for user: ${userId}`)
    const tasksDoc = await this.readSubDoc<TasksSubDoc>(userId, 'tasks')

    if (!tasksDoc?.generatedTasks) {
      logger.error('User or generated tasks not found')
      return false
    }

    const tasks = tasksDoc.generatedTasks[category]
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

    await this.upsertSubDoc(tasksDoc)
    logger.success('Task updated successfully')
    return true
  }

  async deleteTaskFromGeneratedTasks(
    userId: string,
    taskId: string,
    category: 'Strength' | 'Intelligence' | 'Charisma'
  ): Promise<boolean> {
    logger.custom('🔄', `Deleting task ${taskId} from category ${category} for user: ${userId}`)
    const tasksDoc = await this.readSubDoc<TasksSubDoc>(userId, 'tasks')

    if (!tasksDoc?.generatedTasks) {
      logger.error('User or generated tasks not found')
      return false
    }

    const tasks = tasksDoc.generatedTasks[category]
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
    await this.upsertSubDoc(tasksDoc)
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
    let tasksDoc = await this.readSubDoc<TasksSubDoc>(userId, 'tasks')

    if (!tasksDoc) {
      tasksDoc = { id: 'tasks', type: 'tasks', userId, generatedTasks: {} }
    }
    if (!tasksDoc.generatedTasks) {
      tasksDoc.generatedTasks = {}
    }
    if (!tasksDoc.generatedTasks[task.category]) {
      tasksDoc.generatedTasks[task.category] = []
    }

    const newTask = {
      id: `${task.title ? 'custom' : 'ai'}-${task.category.toLowerCase()}-${Date.now()}`,
      ...(task.title && { title: task.title }),
      description: task.description,
      ...(task.expected_duration_minutes && { expected_duration_minutes: task.expected_duration_minutes }),
      xp: task.xp,
      shards: task.shards,
    }

    tasksDoc.generatedTasks[task.category]!.push(newTask)
    await this.upsertSubDoc(tasksDoc)
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
    let shopDoc = await this.readSubDoc<ShopSubDoc>(userId, 'shop')

    if (!shopDoc) {
      shopDoc = { id: 'shop', type: 'shop', userId, shopItems: [], inventory: [] }
    }
    if (!shopDoc.shopItems) {
      shopDoc.shopItems = []
    }

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

    shopDoc.shopItems.push(newItem)
    await this.upsertSubDoc(shopDoc)
    logger.success('Shop item added successfully')
    return true
  }

  async deleteShopItem(userId: string, itemId: string): Promise<boolean> {
    logger.info(`Deleting shop item ${itemId} for user: ${userId}`)
    const shopDoc = await this.readSubDoc<ShopSubDoc>(userId, 'shop')

    if (!shopDoc?.shopItems) {
      logger.error('User not found or no shop items')
      return false
    }

    const initialLength = shopDoc.shopItems.length
    shopDoc.shopItems = shopDoc.shopItems.filter(item => item.id !== itemId)

    if (shopDoc.shopItems.length === initialLength) {
      logger.error('Shop item not found')
      return false
    }

    await this.upsertSubDoc(shopDoc)
    logger.success('Shop item deleted successfully')
    return true
  }

  async getUserShopItems(userId: string) {
    logger.info(`Getting shop items for user: ${userId}`)
    const shopDoc = await this.readSubDoc<ShopSubDoc>(userId, 'shop')
    return shopDoc?.shopItems ?? []
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

    // Read profile and shop sub-docs
    const profileDoc = await this.readSubDoc<ProfileSubDoc>(userId, 'profile')
    if (!profileDoc) {
      return { success: false, message: 'User not found' }
    }

    if (!profileDoc.stats) {
      profileDoc.stats = { experience: 0, shards: 0, strength: 0, intelligence: 0, charisma: 0 }
    }

    const currentShards = profileDoc.stats.shards || 0
    if (currentShards < itemPrice) {
      return {
        success: false,
        message: `Insufficient shards. You have ${currentShards} 💎, but need ${itemPrice} 💎`,
      }
    }

    let shopDoc = await this.readSubDoc<ShopSubDoc>(userId, 'shop')
    if (!shopDoc) {
      shopDoc = { id: 'shop', type: 'shop', userId, shopItems: [], inventory: [] }
    }

    const shopItem = shopDoc.shopItems?.find(item => item.id === itemId)
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

    // Deduct shards
    profileDoc.stats.shards = currentShards - itemPrice

    // Remove from shop if single-purchase wishlist item
    if (isWishlistItem && shopDoc.shopItems && !shopItem?.allowMultiplePurchases) {
      shopDoc.shopItems = shopDoc.shopItems.filter(item => item.id !== itemId)
    }

    // Add to inventory
    if (!shopDoc.inventory) {
      shopDoc.inventory = []
    }

    const existingInventoryItem = shopDoc.inventory.find(
      item =>
        item.title === itemInfo.title &&
        item.description === itemInfo.description &&
        item.price === itemInfo.price
    )

    if (existingInventoryItem) {
      existingInventoryItem.count += 1
    } else {
      shopDoc.inventory.push({
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

    // Use transactional batch (same partition) for atomicity
    try {
      const batch = this.container.items.batch(
        [
          { operationType: 'Upsert', resourceBody: profileDoc as unknown as JSONObject },
          { operationType: 'Upsert', resourceBody: shopDoc as unknown as JSONObject },
        ],
        userId
      )
      await batch
    } catch {
      // Fallback to individual upserts if batch not supported
      await this.upsertSubDoc(profileDoc)
      await this.upsertSubDoc(shopDoc)
    }

    logger.success(`Shop item purchased successfully. New shard balance: ${profileDoc.stats.shards}`)
    return {
      success: true,
      message: `Successfully purchased item for ${itemPrice} 💎. Remaining shards: ${profileDoc.stats.shards} 💎`,
    }
  }

  async useInventoryItem(
    userId: string,
    itemId: string
  ): Promise<{ success: boolean; message?: string }> {
    logger.info(`User ${userId} attempting to use inventory item ${itemId}`)

    const shopDoc = await this.readSubDoc<ShopSubDoc>(userId, 'shop')
    if (!shopDoc?.inventory || shopDoc.inventory.length === 0) {
      return { success: false, message: 'No items in inventory' }
    }

    const itemIndex = shopDoc.inventory.findIndex(item => item.id === itemId)
    if (itemIndex === -1) {
      return { success: false, message: 'Item not found in inventory' }
    }

    const item = shopDoc.inventory[itemIndex]
    if (!item.isConsumable) {
      return { success: false, message: 'This item cannot be used' }
    }

    item.count -= 1
    if (item.count <= 0) {
      shopDoc.inventory.splice(itemIndex, 1)
    }

    await this.upsertSubDoc(shopDoc)
    logger.success('Item used successfully')
    return { success: true, message: `Used "${item.title}" successfully` }
  }

  // ─── Push notification queries ────────────────────────────────────────

  async findAllWithPushSubscriptions(): Promise<User[]> {
    // Query profile sub-docs that have push notifications enabled with subscriptions
    const { resources } = await this.container.items
      .query<ProfileSubDoc>({
        query: `SELECT * FROM c WHERE c.type = "profile"
                AND c.pushNotifications.preferences.enabled = true
                AND ARRAY_LENGTH(c.pushNotifications.subscriptions) > 0`,
      })
      .fetchAll()

    // Assemble full user for each matching profile
    const users: User[] = []
    for (const profile of resources) {
      const user = await this.findById(profile.userId)
      if (user) users.push(user)
    }
    return users
  }
}

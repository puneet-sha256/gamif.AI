import type { User, Session, GeneratedTasks } from '../../shared/types'
import type { IUserRepository, ISessionRepository } from './interfaces'
import { logger } from '../../utils/logger'

// ─── Migrating User Repository ──────────────────────────────────────────────
// Checks Cosmos first; falls back to file; migrates on first access.

export class MigratingUserRepository implements IUserRepository {
  constructor(
    private cosmos: IUserRepository,
    private file: IUserRepository
  ) {}

  /** Check Cosmos first, fall back to file and migrate if found. */
  private async findAndMigrate(
    cosmosLookup: () => Promise<User | undefined>,
    fileLookup: () => Promise<User | undefined>
  ): Promise<User | undefined> {
    // Try Cosmos first
    const cosmosUser = await cosmosLookup()
    if (cosmosUser) return cosmosUser

    // Fall back to file
    const fileUser = await fileLookup()
    if (!fileUser) return undefined

    // Migrate file user to Cosmos
    // If migration fails, return file data anyway — the user shouldn't be blocked.
    // Next request will retry migration since Cosmos still won't have the data.
    try {
      logger.custom('🔄', `Migrating user ${fileUser.username} from file to Cosmos DB...`)
      await this.cosmos.createUser(fileUser)
      logger.success(`User ${fileUser.username} migrated to Cosmos DB`)
    } catch (error) {
      logger.error(`Migration failed for user ${fileUser.username}, serving from file:`, error)
    }

    return fileUser
  }

  async findById(userId: string): Promise<User | undefined> {
    return this.findAndMigrate(
      () => this.cosmos.findById(userId),
      () => this.file.findById(userId)
    )
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return this.findAndMigrate(
      () => this.cosmos.findByEmail(email),
      () => this.file.findByEmail(email)
    )
  }

  async findByUsername(username: string): Promise<User | undefined> {
    return this.findAndMigrate(
      () => this.cosmos.findByUsername(username),
      () => this.file.findByUsername(username)
    )
  }

  /** Check if user exists in Cosmos (i.e. migration succeeded). */
  private async isInCosmos(userId: string): Promise<boolean> {
    const user = await this.cosmos.findById(userId)
    return !!user
  }

  async createUser(user: User): Promise<void> {
    // New users go directly to Cosmos
    return this.cosmos.createUser(user)
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    await this.findById(userId) // trigger migration attempt
    if (await this.isInCosmos(userId)) {
      return this.cosmos.updateUser(userId, updates)
    }
    return this.file.updateUser(userId, updates)
  }

  async getUserGeneratedTasks(userId: string): Promise<GeneratedTasks | null> {
    await this.findById(userId)
    if (await this.isInCosmos(userId)) {
      return this.cosmos.getUserGeneratedTasks(userId)
    }
    return this.file.getUserGeneratedTasks(userId)
  }

  async updateUserGeneratedTasks(userId: string, generatedTasks: GeneratedTasks): Promise<void> {
    await this.findById(userId)
    if (await this.isInCosmos(userId)) {
      return this.cosmos.updateUserGeneratedTasks(userId, generatedTasks)
    }
    return this.file.updateUserGeneratedTasks(userId, generatedTasks)
  }

  async updateTaskInGeneratedTasks(
    userId: string,
    taskId: string,
    category: 'Strength' | 'Intelligence' | 'Charisma',
    updates: { title?: string; description?: string; expected_duration_minutes?: number; xp?: number; shards?: number }
  ): Promise<boolean> {
    await this.findById(userId)
    if (await this.isInCosmos(userId)) {
      return this.cosmos.updateTaskInGeneratedTasks(userId, taskId, category, updates)
    }
    return this.file.updateTaskInGeneratedTasks(userId, taskId, category, updates)
  }

  async deleteTaskFromGeneratedTasks(
    userId: string,
    taskId: string,
    category: 'Strength' | 'Intelligence' | 'Charisma'
  ): Promise<boolean> {
    await this.findById(userId)
    if (await this.isInCosmos(userId)) {
      return this.cosmos.deleteTaskFromGeneratedTasks(userId, taskId, category)
    }
    return this.file.deleteTaskFromGeneratedTasks(userId, taskId, category)
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
    await this.findById(userId)
    if (await this.isInCosmos(userId)) {
      return this.cosmos.addTaskToGeneratedTasks(userId, task)
    }
    return this.file.addTaskToGeneratedTasks(userId, task)
  }

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
    await this.findById(userId)
    if (await this.isInCosmos(userId)) {
      return this.cosmos.addShopItem(userId, item)
    }
    return this.file.addShopItem(userId, item)
  }

  async deleteShopItem(userId: string, itemId: string): Promise<boolean> {
    await this.findById(userId)
    if (await this.isInCosmos(userId)) {
      return this.cosmos.deleteShopItem(userId, itemId)
    }
    return this.file.deleteShopItem(userId, itemId)
  }

  async getUserShopItems(userId: string) {
    await this.findById(userId)
    if (await this.isInCosmos(userId)) {
      return this.cosmos.getUserShopItems(userId)
    }
    return this.file.getUserShopItems(userId)
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
    await this.findById(userId)
    if (await this.isInCosmos(userId)) {
      return this.cosmos.buyShopItem(userId, itemId, itemPrice, itemDetails)
    }
    return this.file.buyShopItem(userId, itemId, itemPrice, itemDetails)
  }

  async useInventoryItem(userId: string, itemId: string): Promise<{ success: boolean; message?: string }> {
    await this.findById(userId)
    if (await this.isInCosmos(userId)) {
      return this.cosmos.useInventoryItem(userId, itemId)
    }
    return this.file.useInventoryItem(userId, itemId)
  }

  async findAllWithPushSubscriptions(): Promise<User[]> {
    // Merge results from both backends, deduplicating by user id
    const cosmosUsers = await this.cosmos.findAllWithPushSubscriptions()
    const fileUsers = await this.file.findAllWithPushSubscriptions()
    const seen = new Set(cosmosUsers.map(u => u.id))
    const merged = [...cosmosUsers]
    for (const u of fileUsers) {
      if (!seen.has(u.id)) merged.push(u)
    }
    return merged
  }
}

// ─── Migrating Session Repository ───────────────────────────────────────────

export class MigratingSessionRepository implements ISessionRepository {
  constructor(
    private cosmos: ISessionRepository,
    private file: ISessionRepository
  ) {}

  async findById(sessionId: string): Promise<Session | undefined> {
    // Try Cosmos first
    const cosmosSession = await this.cosmos.findById(sessionId)
    if (cosmosSession) return cosmosSession

    // Fall back to file
    const fileSession = await this.file.findById(sessionId)
    if (!fileSession) return undefined

    // Migrate to Cosmos — if it fails, serve from file and retry next time
    try {
      logger.custom('🔄', `Migrating session ${sessionId} from file to Cosmos DB...`)
      await this.cosmos.create(fileSession.userId, fileSession.sessionId)
      logger.success(`Session ${sessionId} migrated to Cosmos DB`)
    } catch (error) {
      logger.error(`Session migration failed for ${sessionId}, serving from file:`, error)
    }

    return fileSession
  }

  async create(userId: string, sessionId: string): Promise<Session> {
    // New sessions go directly to Cosmos
    return this.cosmos.create(userId, sessionId)
  }

  async updateLastAccess(sessionId: string): Promise<void> {
    // Try Cosmos first, fall back to file
    try {
      await this.cosmos.updateLastAccess(sessionId)
    } catch {
      await this.file.updateLastAccess(sessionId)
    }
  }

  async remove(sessionId: string): Promise<void> {
    // Remove from both stores to be safe
    try { await this.cosmos.remove(sessionId) } catch { /* ignore */ }
    try { await this.file.remove(sessionId) } catch { /* ignore */ }
  }
}

import type { User, Session, GeneratedTasks, GeneratedTask } from '../../shared/types'

// ─── User Repository Interface ──────────────────────────────────────────────
// All data access for user data goes through this interface.
// Implementations: FileUserRepository, CosmosUserRepository, MigratingUserRepository

export interface IUserRepository {
  // Core CRUD
  findById(userId: string): Promise<User | undefined>
  findByEmail(email: string): Promise<User | undefined>
  findByUsername(username: string): Promise<User | undefined>
  createUser(user: User): Promise<void>
  updateUser(userId: string, updates: Partial<User>): Promise<User | null>

  // Generated tasks
  getUserGeneratedTasks(userId: string): Promise<GeneratedTasks | null>
  updateUserGeneratedTasks(userId: string, generatedTasks: GeneratedTasks): Promise<void>
  updateTaskInGeneratedTasks(
    userId: string,
    taskId: string,
    category: 'Strength' | 'Intelligence' | 'Charisma',
    updates: { title?: string; description?: string; expected_duration_minutes?: number; xp?: number; shards?: number }
  ): Promise<boolean>
  deleteTaskFromGeneratedTasks(
    userId: string,
    taskId: string,
    category: 'Strength' | 'Intelligence' | 'Charisma'
  ): Promise<boolean>
  addTaskToGeneratedTasks(
    userId: string,
    task: {
      title?: string
      description: string
      category: 'Strength' | 'Intelligence' | 'Charisma'
      expected_duration_minutes?: number
      xp: number
      shards: number
    }
  ): Promise<boolean>

  // Shop operations
  addShopItem(
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
  ): Promise<boolean>
  deleteShopItem(userId: string, itemId: string): Promise<boolean>
  getUserShopItems(userId: string): Promise<import('../../shared/types').ShopItem[] | null>
  buyShopItem(
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
  ): Promise<{ success: boolean; message?: string }>
  useInventoryItem(userId: string, itemId: string): Promise<{ success: boolean; message?: string }>
}

// ─── Session Repository Interface ───────────────────────────────────────────
// All data access for session data goes through this interface.

export interface ISessionRepository {
  findById(sessionId: string): Promise<Session | undefined>
  create(userId: string, sessionId: string): Promise<Session>
  updateLastAccess(sessionId: string): Promise<void>
  remove(sessionId: string): Promise<void>
}

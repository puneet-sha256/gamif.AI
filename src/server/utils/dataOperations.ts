import path from 'path'
import type { User, Session, GeneratedTasks } from '../../shared/types'
import { logger } from '../../utils/logger'
import { initializeDatabase, getUserRepository, getSessionRepository } from '../db'

// ─── Legacy exports for backwards compat ────────────────────────────────────
export const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'data'))
export const USERS_FILE = path.join(DATA_DIR, 'users.json')
export const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json')

// ─── Initialization ─────────────────────────────────────────────────────────

export async function initializeData() {
  try {
    await initializeDatabase()
    logger.success('Data storage initialized')
    logger.custom('💾', `Storage mode: ${process.env.STORAGE_MODE || 'file'}`)
  } catch (error) {
    logger.error('Error initializing data storage:', error)
    throw error
  }
}

// ─── User operations (thin facade over repository) ──────────────────────────

export async function findUserByEmail(email: string): Promise<User | undefined> {
  return getUserRepository().findByEmail(email)
}

export async function findUserByUsername(username: string): Promise<User | undefined> {
  return getUserRepository().findByUsername(username)
}

export async function findUserById(id: string): Promise<User | undefined> {
  return getUserRepository().findById(id)
}

export async function createUser(user: User): Promise<void> {
  return getUserRepository().createUser(user)
}

export async function updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
  return getUserRepository().updateUser(userId, updates)
}

// ─── Session operations ─────────────────────────────────────────────────────

export async function findSessionById(sessionId: string): Promise<Session | undefined> {
  return getSessionRepository().findById(sessionId)
}

export async function createSession(userId: string, sessionId: string): Promise<Session> {
  return getSessionRepository().create(userId, sessionId)
}

export async function updateSessionLastAccess(sessionId: string): Promise<void> {
  return getSessionRepository().updateLastAccess(sessionId)
}

export async function removeSession(sessionId: string): Promise<void> {
  return getSessionRepository().remove(sessionId)
}

// ─── Generated tasks ────────────────────────────────────────────────────────

export async function updateUserGeneratedTasks(userId: string, generatedTasks: GeneratedTasks): Promise<void> {
  return getUserRepository().updateUserGeneratedTasks(userId, generatedTasks)
}

export async function getUserGeneratedTasks(userId: string): Promise<GeneratedTasks | null> {
  return getUserRepository().getUserGeneratedTasks(userId)
}

export async function updateTaskInGeneratedTasks(
  userId: string,
  taskId: string,
  category: 'Strength' | 'Intelligence' | 'Charisma',
  updates: { title?: string; description?: string; expected_duration_minutes?: number; xp?: number; shards?: number }
): Promise<boolean> {
  return getUserRepository().updateTaskInGeneratedTasks(userId, taskId, category, updates)
}

export async function deleteTaskFromGeneratedTasks(
  userId: string,
  taskId: string,
  category: 'Strength' | 'Intelligence' | 'Charisma'
): Promise<boolean> {
  return getUserRepository().deleteTaskFromGeneratedTasks(userId, taskId, category)
}

export async function addTaskToGeneratedTasks(
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
  return getUserRepository().addTaskToGeneratedTasks(userId, task)
}

// ─── Shop operations ────────────────────────────────────────────────────────

export async function addShopItem(
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
  return getUserRepository().addShopItem(userId, item)
}

export async function deleteShopItem(userId: string, itemId: string): Promise<boolean> {
  return getUserRepository().deleteShopItem(userId, itemId)
}

export async function getUserShopItems(userId: string) {
  return getUserRepository().getUserShopItems(userId)
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
  return getUserRepository().buyShopItem(userId, itemId, itemPrice, itemDetails)
}

export async function useInventoryItem(
  userId: string,
  itemId: string
): Promise<{ success: boolean; message?: string }> {
  return getUserRepository().useInventoryItem(userId, itemId)
}

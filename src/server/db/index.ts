import type { IUserRepository, ISessionRepository } from './interfaces'
import { FileUserRepository } from './fileUserRepository'
import { FileSessionRepository } from './fileSessionRepository'
import { CosmosUserRepository } from './cosmosUserRepository'
import { CosmosSessionRepository } from './cosmosSessionRepository'
import { MigratingUserRepository, MigratingSessionRepository } from './migrationRepository'
import { initializeCosmos } from './cosmosClient'
import { logger } from '../../utils/logger'

export type StorageMode = 'file' | 'cosmos' | 'migration'

let userRepository: IUserRepository | null = null
let sessionRepository: ISessionRepository | null = null

export function getStorageMode(): StorageMode {
  const mode = (process.env.STORAGE_MODE || 'file').toLowerCase()
  if (mode === 'cosmos' || mode === 'migration') return mode
  return 'file'
}

export async function initializeDatabase(): Promise<void> {
  const mode = getStorageMode()
  logger.custom('💾', `Storage mode: ${mode}`)

  switch (mode) {
    case 'file': {
      const fileUsers = new FileUserRepository()
      const fileSessions = new FileSessionRepository()
      await fileUsers.initialize()
      await fileSessions.initialize()
      userRepository = fileUsers
      sessionRepository = fileSessions
      logger.success('File-based storage initialized')
      break
    }

    case 'cosmos': {
      await initializeCosmos()
      userRepository = new CosmosUserRepository()
      sessionRepository = new CosmosSessionRepository()
      logger.success('Cosmos DB storage initialized')
      break
    }

    case 'migration': {
      // Initialize both backends
      const fileUsers = new FileUserRepository()
      const fileSessions = new FileSessionRepository()
      await fileUsers.initialize()
      await fileSessions.initialize()
      await initializeCosmos()
      const cosmosUsers = new CosmosUserRepository()
      const cosmosSessions = new CosmosSessionRepository()
      userRepository = new MigratingUserRepository(cosmosUsers, fileUsers)
      sessionRepository = new MigratingSessionRepository(cosmosSessions, fileSessions)
      logger.success('Migration storage initialized (file → Cosmos DB)')
      break
    }
  }
}

export function getUserRepository(): IUserRepository {
  if (!userRepository) {
    throw new Error('Database not initialized. Call initializeDatabase() first.')
  }
  return userRepository
}

export function getSessionRepository(): ISessionRepository {
  if (!sessionRepository) {
    throw new Error('Database not initialized. Call initializeDatabase() first.')
  }
  return sessionRepository
}

import type { Container } from '@azure/cosmos'
import type { Session } from '../../shared/types'
import type { ISessionRepository } from './interfaces'
import type { SessionDoc } from './types'
import { getSessionsContainer } from './cosmosClient'
import { logger } from '../../utils/logger'

const SESSION_TTL = 86400 // 24 hours

export class CosmosSessionRepository implements ISessionRepository {
  private get container(): Container {
    return getSessionsContainer()
  }

  async findById(sessionId: string): Promise<Session | undefined> {
    try {
      // Point read: (id, partitionKey) — 1 RU
      const { resource } = await this.container
        .item(sessionId, sessionId)
        .read<SessionDoc>()

      if (!resource) return undefined

      return {
        userId: resource.userId,
        sessionId: resource.sessionId,
        createdAt: resource.createdAt,
        lastAccess: resource.lastAccess,
      }
    } catch (err: unknown) {
      // 404 = expired or deleted session
      if ((err as { code?: number }).code === 404) return undefined
      throw err
    }
  }

  async create(userId: string, sessionId: string): Promise<Session> {
    const now = new Date().toISOString()
    const doc: SessionDoc = {
      id: sessionId,
      sessionId,
      userId,
      createdAt: now,
      lastAccess: now,
      ttl: SESSION_TTL,
    }

    await this.container.items.create(doc)
    logger.success(`Session created in Cosmos DB: ${sessionId}`)

    return {
      userId,
      sessionId,
      createdAt: now,
      lastAccess: now,
    }
  }

  async updateLastAccess(sessionId: string): Promise<void> {
    try {
      const { resource } = await this.container
        .item(sessionId, sessionId)
        .read<SessionDoc>()

      if (resource) {
        resource.lastAccess = new Date().toISOString()
        resource.ttl = SESSION_TTL // refresh TTL
        await this.container.item(sessionId, sessionId).replace(resource)
      }
    } catch (err: unknown) {
      // Gracefully ignore if session expired
      if ((err as { code?: number }).code === 404) return
      throw err
    }
  }

  async remove(sessionId: string): Promise<void> {
    try {
      await this.container.item(sessionId, sessionId).delete()
    } catch (err: unknown) {
      // Gracefully ignore if session already expired/deleted
      if ((err as { code?: number }).code === 404) return
      throw err
    }
  }
}

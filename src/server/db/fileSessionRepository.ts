import fs from 'fs-extra'
import path from 'path'
import type { Session } from '../../shared/types'
import type { ISessionRepository } from './interfaces'
import { logger } from '../../utils/logger'
import { atomicWriteJson } from './atomicJsonWrite'

const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'data'))
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json')

export class FileSessionRepository implements ISessionRepository {
  private mutationQueue: Promise<void> = Promise.resolve()

  async initialize(): Promise<void> {
    if (!(await fs.pathExists(SESSIONS_FILE))) {
      logger.custom('📄', 'Creating sessions.json file...')
      await fs.writeJson(SESSIONS_FILE, [], { spaces: 2 })
      logger.success('Created sessions.json')
    } else {
      logger.success('sessions.json already exists')
    }
  }

  private async loadSessions(): Promise<Session[]> {
    try {
      const sessions: Session[] = await fs.readJson(SESSIONS_FILE)
      return Array.isArray(sessions) ? sessions : []
    } catch (error) {
      logger.error('Error loading sessions:', error)
      return []
    }
  }

  private async saveSessions(sessions: Session[]): Promise<void> {
    await atomicWriteJson(SESSIONS_FILE, sessions)
  }

  private mutateSessions<T>(mutation: (sessions: Session[]) => Promise<T> | T): Promise<T> {
    const operation = this.mutationQueue.then(async () => {
      const sessions = await this.loadSessions()
      const result = await mutation(sessions)
      await this.saveSessions(sessions)
      return result
    })
    this.mutationQueue = operation.then(() => undefined, () => undefined)
    return operation
  }

  async findById(sessionId: string): Promise<Session | undefined> {
    await this.mutationQueue
    const sessions = await this.loadSessions()
    return sessions.find(session => session.sessionId === sessionId)
  }

  async create(userId: string, sessionId: string): Promise<Session> {
    return this.mutateSessions(sessions => {
      const newSession: Session = {
        userId,
        sessionId,
        createdAt: new Date().toISOString(),
        lastAccess: new Date().toISOString(),
      }
      sessions.push(newSession)
      return newSession
    })
  }

  async updateLastAccess(sessionId: string): Promise<void> {
    await this.mutateSessions(sessions => {
      const session = sessions.find(s => s.sessionId === sessionId)
      if (session) session.lastAccess = new Date().toISOString()
    })
  }

  async remove(sessionId: string): Promise<void> {
    await this.mutateSessions(sessions => {
      const index = sessions.findIndex(session => session.sessionId === sessionId)
      if (index >= 0) sessions.splice(index, 1)
    })
  }
}

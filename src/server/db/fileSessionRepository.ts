import fs from 'fs-extra'
import path from 'path'
import type { Session } from '../../shared/types'
import type { ISessionRepository } from './interfaces'
import { logger } from '../../utils/logger'

const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'data'))
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json')

export class FileSessionRepository implements ISessionRepository {
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
    await fs.writeJson(SESSIONS_FILE, sessions, { spaces: 2 })
  }

  async findById(sessionId: string): Promise<Session | undefined> {
    const sessions = await this.loadSessions()
    return sessions.find(session => session.sessionId === sessionId)
  }

  async create(userId: string, sessionId: string): Promise<Session> {
    const sessions = await this.loadSessions()
    const newSession: Session = {
      userId,
      sessionId,
      createdAt: new Date().toISOString(),
      lastAccess: new Date().toISOString(),
    }
    sessions.push(newSession)
    await this.saveSessions(sessions)
    return newSession
  }

  async updateLastAccess(sessionId: string): Promise<void> {
    const sessions = await this.loadSessions()
    const session = sessions.find(s => s.sessionId === sessionId)
    if (session) {
      session.lastAccess = new Date().toISOString()
      await this.saveSessions(sessions)
    }
  }

  async remove(sessionId: string): Promise<void> {
    const sessions = await this.loadSessions()
    const filteredSessions = sessions.filter(session => session.sessionId !== sessionId)
    await this.saveSessions(filteredSessions)
  }
}

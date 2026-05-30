/**
 * Playwright global setup.
 *
 * Seeds a roster of test users directly into data/users.json (file storage
 * mode). Each user represents a specific onboarding state so individual specs
 * can pick the closest starting point.
 *
 * Runs once per test session before any specs.
 */

import fs from 'fs'
import path from 'path'
import { buildSeedUsers, SEED_USER_EMAILS } from './fixtures/seedUsers'

// Re-export for legacy onboardingTour.spec.ts compatibility.
export { USERS as SEED_USERS, TEST_PASSWORD } from './fixtures/seedUsers'
import { USERS } from './fixtures/seedUsers'
export const TEST_USER = {
  id: USERS.tour.id,
  username: USERS.tour.username,
  email: USERS.tour.email,
  password: 'TestPass123!',
}

export default async function globalSetup() {
  const dataDir = path.resolve(__dirname, '..', '..', 'data')
  const usersFile = path.join(dataDir, 'users.json')
  const sessionsFile = path.join(dataDir, 'sessions.json')

  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

  // Read existing users, strip any we're about to re-seed (idempotent).
  let users: Array<Record<string, unknown>> = []
  if (fs.existsSync(usersFile)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(usersFile, 'utf-8'))
      if (Array.isArray(parsed)) {
        users = parsed.filter(
          u => !SEED_USER_EMAILS.includes(u.email as string)
        )
      }
    } catch {
      users = []
    }
  }

  // Add fresh seed users
  users.push(...buildSeedUsers())
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2))

  // Clear stale sessions for these users (so previous runs' tokens don't
  // confuse session lookups).
  if (fs.existsSync(sessionsFile)) {
    try {
      const sessions = JSON.parse(fs.readFileSync(sessionsFile, 'utf-8'))
      if (Array.isArray(sessions)) {
        const seededIds = buildSeedUsers().map(u => u.id as string)
        const filtered = sessions.filter(
          (s: { userId?: string }) => !seededIds.includes(s.userId ?? '')
        )
        fs.writeFileSync(sessionsFile, JSON.stringify(filtered, null, 2))
      }
    } catch {
      // best-effort
    }
  }

  // eslint-disable-next-line no-console
  console.log(`[E2E setup] Seeded ${buildSeedUsers().length} test users → ${usersFile}`)
}

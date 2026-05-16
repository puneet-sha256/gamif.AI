import fs from 'fs'
import path from 'path'

// Mirrors src/server/utils/authUtils.ts hashPassword.
function hashPassword(password: string): string {
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString()
}

export const TEST_USER = {
  id: 'tour-test-user-id',
  username: 'tourtester',
  email: 'tour-test@example.com',
  password: 'TourTest123!',
}

export default async function globalSetup() {
  const dataDir = path.resolve(__dirname, '..', '..', 'data')
  const usersFile = path.join(dataDir, 'users.json')

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  let users: Array<Record<string, unknown>> = []
  if (fs.existsSync(usersFile)) {
    try {
      const raw = fs.readFileSync(usersFile, 'utf-8')
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) users = parsed
    } catch {
      users = []
    }
  }

  // Remove any prior tour-test user so we start from a clean state each run.
  users = users.filter(u => u.id !== TEST_USER.id && u.email !== TEST_USER.email)

  users.push({
    id: TEST_USER.id,
    username: TEST_USER.username,
    email: TEST_USER.email,
    passwordHash: hashPassword(TEST_USER.password),
    createdAt: '2026-04-01T00:00:00.000Z',
    profileData: {
      name: 'Tour Tester',
      dateOfBirth: '2001-01-01',
    },
    goalsData: {
      longTermGoals:
        'Build muscle through consistent strength training, learn TypeScript and React deeply for career growth, and develop public-speaking confidence.',
    },
    stats: {
      experience: 0,
      shards: 0,
      strength: 0,
      intelligence: 0,
      charisma: 0,
    },
    generatedTasks: {
      Strength: [
        { id: 'seed-str-1', description: 'Complete a 30-minute strength workout focused on compound lifts.', xp: 30, shards: 8 },
      ],
      Intelligence: [
        { id: 'seed-int-1', description: 'Read a chapter on advanced TypeScript types and take notes.', xp: 30, shards: 8 },
      ],
      Charisma: [
        { id: 'seed-cha-1', description: 'Practice a 2-minute extemporaneous speech on a topic of choice.', xp: 30, shards: 8 },
      ],
      lastUpdated: '2026-04-01T00:00:00.000Z',
    },
  })

  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2))
}

/**
 * Test user fixtures.
 *
 * Each test scenario uses a dedicated seeded user so tests don't interfere with
 * each other. The seed function below writes directly to data/users.json (file
 * storage mode) so we never hit Cosmos in tests.
 */

import fs from 'fs'
import path from 'path'

// Mirrors src/server/utils/authUtils.ts hashPassword.
export function hashPassword(password: string): string {
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString()
}

// Common password for all seeded users.
export const TEST_PASSWORD = 'TestPass123!'

export interface TestUserDef {
  id: string
  username: string
  email: string
  description: string
}

/**
 * Roster of test users seeded by globalSetup.
 *
 * Each user represents a specific onboarding state so individual specs can
 * pick the closest starting point and skip irrelevant setup.
 */
export const USERS = {
  /** Tour test user (pre-existing onboardingTour.spec.ts dependency). */
  tour: {
    id: 'tour-test-user-id',
    username: 'tourtester',
    email: 'tour-test@example.com',
    description: 'Used by onboardingTour.spec.ts',
  },

  /** Fully onboarded with goals + tasks + catalog ready for activity tests. */
  v2Ready: {
    id: 'v2-ready-user-id',
    username: 'v2ready',
    email: 'v2-ready@example.com',
    description: 'Catalog seeded, used by v2-rewards.spec.ts',
  },

  /** Has profile + goals but NO catalog. Used by intake.spec.ts (modal fires). */
  needsIntake: {
    id: 'needs-intake-user-id',
    username: 'needsintake',
    email: 'needs-intake@example.com',
    description: 'Profile+goals done, no catalog — intake modal will fire',
  },

  /** Empty user (no profile yet). Used by profile-goals.spec.ts. */
  needsProfile: {
    id: 'needs-profile-user-id',
    username: 'needsprofile',
    email: 'needs-profile@example.com',
    description: 'No profile, profile setup screen will show',
  },

  /** Has profile but no goals. Used by goals-completion tests. */
  needsGoals: {
    id: 'needs-goals-user-id',
    username: 'needsgoals',
    email: 'needs-goals@example.com',
    description: 'Profile done, goals setup screen will show',
  },

  /** Veteran with history for streak/heatmap tests. */
  veteran: {
    id: 'veteran-user-id',
    username: 'veteran',
    email: 'veteran@example.com',
    description: 'Has activityHistory + taskHistory + catalog',
  },
} as const

export type UserKey = keyof typeof USERS

// ─── Catalog helper ────────────────────────────────────────────────────────

interface SeedTemplateLite {
  id: string
  tag: string
  category: 'Strength' | 'Intelligence' | 'Charisma'
  modifier: string
  modifier_dimension: string
  unit: 'time' | 'count' | 'event'
  xp_per_min_floor?: number
  shards_per_min_floor?: number
  xp_per_unit_floor?: number
  shards_per_unit_floor?: number
  xp_flat_floor?: number
  shards_flat_floor?: number
  soft_cap_min?: number
  typical_duration_min?: number
  daily_cap?: number
  typical_count?: number
  effort_pair?: string | null
  secondary_category?: 'Strength' | 'Intelligence' | 'Charisma'
  secondary_category_split?: number
}

interface SeedJson {
  version: number
  templates: SeedTemplateLite[]
}

/**
 * Build a fully-populated catalog at neutral difficulty (3 across all categories).
 * Mirrors generatePersonalCatalog() logic enough that downstream code can read it.
 *
 * Used when a test needs a user with a catalog without running the intake AI.
 */
export function buildNeutralCatalog(
  goalTags: string[] = [
    'workout_session', 'cardio_session', 'mobility_work',
    'problem_solving', 'focused_study', 'skill_practice', 'reading_session', 'educational_content',
    'conversation_initiation', 'presentation', 'feedback_exchange',
  ]
) {
  const seedPath = path.resolve(__dirname, '..', '..', '..', 'src', 'server', 'data', 'catalog', 'seed-v1.json')
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf-8')) as SeedJson
  const now = new Date().toISOString()
  const difficulty = 3
  const mult = 0.75 + difficulty * 0.25 // 1.5x at difficulty 3

  const rows: Record<string, unknown> = {}
  for (const t of seed.templates) {
    const row: Record<string, unknown> = {
      id: t.id,
      tag: t.tag,
      category: t.category,
      modifier: t.modifier,
      modifier_dimension: t.modifier_dimension,
      unit: t.unit,
      intake_difficulty: difficulty,
      difficulty_source: 'category_default',
      effort_pair: t.effort_pair ?? null,
      stability_score: 0,
      feedback_count: 0,
      auto_added: false,
      seeded_at: now,
    }
    if (t.secondary_category) {
      row.secondary_category = t.secondary_category
      row.secondary_category_split = t.secondary_category_split
    }
    if (t.unit === 'time') {
      if (t.xp_per_min_floor !== undefined) row.xp_per_min = round2(t.xp_per_min_floor * mult)
      if (t.shards_per_min_floor !== undefined) row.shards_per_min = round2(t.shards_per_min_floor * mult)
      row.soft_cap_min = t.soft_cap_min
      row.typical_duration_min = t.typical_duration_min
    } else if (t.unit === 'count') {
      if (t.xp_per_unit_floor !== undefined) row.xp_per_unit = round2(t.xp_per_unit_floor * mult)
      if (t.shards_per_unit_floor !== undefined) row.shards_per_unit = round2(t.shards_per_unit_floor * mult)
      row.daily_cap = t.daily_cap
      row.typical_count = t.typical_count
    } else {
      if (t.xp_flat_floor !== undefined) row.xp_flat = round2(t.xp_flat_floor * mult)
      if (t.shards_flat_floor !== undefined) row.shards_flat = round2(t.shards_flat_floor * mult)
      row.daily_cap = t.daily_cap
    }
    rows[t.id] = row
  }

  return {
    rows,
    calibration: {
      rawAnswers: [],
      extractedSignals: [
        { tag: 'workout_session', category: 'Strength', modifier: 'moderate', difficulty: 3, source: 'option' },
        { tag: 'problem_solving', category: 'Intelligence', modifier: 'moderate', difficulty: 3, source: 'option' },
        { tag: 'conversation_initiation', category: 'Charisma', modifier: 'acquaintance', difficulty: 3, source: 'option' },
      ],
      categoryDefaults: { Strength: 3, Intelligence: 3, Charisma: 3 },
      goalTags,
      completedAt: now,
    },
    seedVersion: 1,
    createdAt: now,
    lastUpdated: now,
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// ─── User record builders ─────────────────────────────────────────────────

const STANDARD_GOALS =
  'Build muscle through consistent strength training and improve cardiovascular health. ' +
  'Learn TypeScript and Python to advance my programming career. ' +
  'Develop better communication skills for leadership roles.'

const STANDARD_TASKS = {
  Strength: [
    { id: 'seed-str-1', description: 'Complete a 30-minute moderate strength workout.', expected_duration_minutes: 30, xp: 25, shards: 50, tag: 'workout_session', modifier: 'moderate', signature: 'workout_session|Strength|moderate' },
  ],
  Intelligence: [
    { id: 'seed-int-1', description: 'Solve 2 medium-level coding problems.', expected_duration_minutes: 60, xp: 36, shards: 72, tag: 'problem_solving', modifier: 'moderate', signature: 'problem_solving|Intelligence|moderate' },
  ],
  Charisma: [
    { id: 'seed-cha-1', description: 'Initiate one substantive conversation with a colleague.', expected_duration_minutes: 15, xp: 9, shards: 18, tag: 'conversation_initiation', modifier: 'acquaintance', signature: 'conversation_initiation|Charisma|acquaintance' },
  ],
  lastUpdated: '2026-04-01T00:00:00.000Z',
}

function baseUser(def: TestUserDef) {
  return {
    id: def.id,
    username: def.username,
    email: def.email,
    passwordHash: hashPassword(TEST_PASSWORD),
    createdAt: '2026-04-01T00:00:00.000Z',
    stats: { experience: 0, shards: 0, strength: 0, intelligence: 0, charisma: 0 },
  }
}

export function buildSeedUsers(): Array<Record<string, unknown>> {
  return [
    {
      ...baseUser(USERS.tour),
      profileData: { name: 'Tour Tester', dateOfBirth: '2001-01-01' },
      goalsData: { longTermGoals: STANDARD_GOALS },
      generatedTasks: STANDARD_TASKS,
      catalog: buildNeutralCatalog(),
    },
    {
      ...baseUser(USERS.v2Ready),
      profileData: { name: 'V2 Ready', dateOfBirth: '2000-06-15' },
      goalsData: { longTermGoals: STANDARD_GOALS },
      generatedTasks: STANDARD_TASKS,
      catalog: buildNeutralCatalog(),
    },
    {
      ...baseUser(USERS.needsIntake),
      profileData: { name: 'Needs Intake', dateOfBirth: '1995-03-22' },
      goalsData: { longTermGoals: STANDARD_GOALS },
      generatedTasks: STANDARD_TASKS,
      // NO catalog → intake modal fires
    },
    {
      ...baseUser(USERS.needsProfile),
      // No profileData → profile setup screen
    },
    {
      ...baseUser(USERS.needsGoals),
      profileData: { name: 'Needs Goals', dateOfBirth: '1998-11-08' },
      // No goalsData → goals setup screen
    },
    {
      ...baseUser(USERS.veteran),
      profileData: { name: 'Veteran', dateOfBirth: '1990-04-10' },
      goalsData: { longTermGoals: STANDARD_GOALS },
      generatedTasks: STANDARD_TASKS,
      catalog: buildNeutralCatalog(),
      stats: { experience: 1500, shards: 800, strength: 600, intelligence: 600, charisma: 300 },
      activityHistory: {
        dailyActivities: [
          { date: '2026-05-25', strength: 30, intelligence: 25, charisma: 0, total: 55 },
          { date: '2026-05-26', strength: 25, intelligence: 30, charisma: 10, total: 65 },
          { date: '2026-05-27', strength: 20, intelligence: 15, charisma: 0, total: 35 },
        ],
        lastUpdated: '2026-05-27T18:00:00.000Z',
      },
    },
  ]
}

export const SEED_USER_EMAILS = Object.values(USERS).map(u => u.email)

/**
 * Reset one seed user back to its original state by re-applying buildSeedUsers().
 *
 * Use from a spec's beforeEach when the test mutates user state (e.g. intake
 * tests that persist a catalog) and you need a fresh starting point for the
 * next test. Operates on the on-disk data/users.json directly — the file
 * repository reads from disk on every operation, so changes are picked up
 * immediately by the server.
 */
export function resetSeedUser(userKey: UserKey): void {
  const dataDir = path.resolve(__dirname, '..', '..', '..', 'data')
  const usersFile = path.join(dataDir, 'users.json')
  if (!fs.existsSync(usersFile)) return
  const users: Array<Record<string, unknown>> = JSON.parse(
    fs.readFileSync(usersFile, 'utf-8')
  )
  const targetEmail = USERS[userKey].email
  const freshUser = buildSeedUsers().find(u => u.email === targetEmail)
  if (!freshUser) return
  const filtered = users.filter(u => (u.email as string) !== targetEmail)
  filtered.push(freshUser)
  fs.writeFileSync(usersFile, JSON.stringify(filtered, null, 2))
}

/**
 * Reset ALL seed users (and prune ad-hoc registration users) to baseline.
 * Cheap (file I/O only). Use in test.beforeEach to guarantee isolation across
 * specs and projects (desktop/mobile chromium share the same data file).
 */
export function resetAllSeedUsers(): void {
  const dataDir = path.resolve(__dirname, '..', '..', '..', 'data')
  const usersFile = path.join(dataDir, 'users.json')
  if (!fs.existsSync(usersFile)) return
  const fresh = buildSeedUsers()
  const freshEmails = new Set(fresh.map(u => u.email))
  const existing: Array<Record<string, unknown>> = JSON.parse(
    fs.readFileSync(usersFile, 'utf-8')
  )
  // Keep any ad-hoc users (e.g. registration test users) intact, replace seeds.
  const kept = existing.filter(u => !freshEmails.has(u.email as string))
  fs.writeFileSync(usersFile, JSON.stringify([...kept, ...fresh], null, 2))
}

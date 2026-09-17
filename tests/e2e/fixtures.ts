import fs from 'fs'
import path from 'path'
import type { Page } from '@playwright/test'
import type {
  ActivityHistory,
  CatalogData,
  GeneratedTasks,
  GoalsData,
  InventoryItem,
  ProfileData,
  ShopItem,
  TaskHistory,
  User,
  UserStats,
} from '../../src/shared/types'
import { generatePersonalCatalog } from '../../src/server/utils/catalogGenerator'

export interface TestUserCredentials {
  id: string
  username: string
  email: string
  password: string
}

export interface SeedUserFixture extends TestUserCredentials {
  createdAt?: string
  lastLogin?: string
  profileData?: ProfileData
  goalsData?: GoalsData
  stats?: Partial<UserStats>
  generatedTasks?: GeneratedTasks
  shopItems?: ShopItem[]
  inventory?: InventoryItem[]
  unclaimedRewards?: User['unclaimedRewards']
  activityHistory?: ActivityHistory
  taskHistory?: TaskHistory
  catalog?: CatalogData
}

export const TEST_USER: TestUserCredentials = {
  id: 'tour-test-user-id',
  username: 'tourtester',
  email: 'tour-test@example.com',
  password: 'TourTest123!',
}

export const AUTH_USER: TestUserCredentials = {
  id: 'auth-test-user-id',
  username: 'authtester',
  email: 'auth-test@example.com',
  password: 'AuthTest123!',
}

export const ONBOARDING_USER: TestUserCredentials = {
  id: 'onboarding-test-user-id',
  username: 'onboardingtester',
  email: 'onboarding-test@example.com',
  password: 'Onboarding123!',
}

export const TASKS_USER: TestUserCredentials = {
  id: 'tasks-test-user-id',
  username: 'tasktester',
  email: 'tasks-test@example.com',
  password: 'TasksTest123!',
}

export const AUTO_TASKS_USER: TestUserCredentials = {
  id: 'auto-tasks-test-user-id',
  username: 'autotasktester',
  email: 'auto-tasks-test@example.com',
  password: 'AutoTasks123!',
}

export const DAILY_ACTIVITY_USER: TestUserCredentials = {
  id: 'daily-activity-test-user-id',
  username: 'dailyactivitytester',
  email: 'daily-activity-test@example.com',
  password: 'DailyActivity123!',
}

export const SHOP_USER: TestUserCredentials = {
  id: 'shop-test-user-id',
  username: 'shoptester',
  email: 'shop-test@example.com',
  password: 'ShopTest123!',
}

const DEFAULT_CREATED_AT = '2026-04-01T00:00:00.000Z'
const DEFAULT_PROFILE: ProfileData = {
  name: 'Test Player',
  dateOfBirth: '2001-01-01',
}
const DEFAULT_GOALS: GoalsData = {
  longTermGoals:
    'Build lasting fitness habits, deepen software engineering skills with deliberate study, and improve communication confidence through consistent practice.',
}

function getDataPaths() {
  const dataDir = path.resolve(__dirname, '..', '..', 'data')
  return {
    dataDir,
    usersFile: path.join(dataDir, 'users.json'),
    sessionsFile: path.join(dataDir, 'sessions.json'),
  }
}

export function hashPassword(password: string): string {
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString()
}

function readJsonArray(filePath: string): Array<Record<string, any>> {
  if (!fs.existsSync(filePath)) return []

  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeJson(filePath: string, value: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2))
}

export function createDefaultCatalog(): CatalogData {
  return generatePersonalCatalog(
    [],
    {
      Strength: 3,
      Intelligence: 3,
      Charisma: 3,
    },
    []
  )
}

export function createGeneratedTasks(partial?: Partial<GeneratedTasks>): GeneratedTasks {
  return {
    Strength: [
      {
        id: 'seed-str-1',
        description: 'Complete a 30-minute strength workout focused on compound lifts.',
        expected_duration_minutes: 30,
        xp: 30,
        shards: 8,
      },
    ],
    Intelligence: [
      {
        id: 'seed-int-1',
        description: 'Read a chapter on advanced TypeScript types and take notes.',
        expected_duration_minutes: 45,
        xp: 35,
        shards: 9,
      },
    ],
    Charisma: [
      {
        id: 'seed-cha-1',
        description: 'Practice a 2-minute extemporaneous speech on a topic of choice.',
        expected_duration_minutes: 20,
        xp: 25,
        shards: 7,
      },
    ],
    lastUpdated: DEFAULT_CREATED_AT,
    ...partial,
  }
}

export function createSeedUser(fixture: SeedUserFixture): User {
  const baseStats: UserStats = {
    experience: 0,
    shards: 0,
    strength: 0,
    intelligence: 0,
    charisma: 0,
    ...fixture.stats,
  }

  const user: User = {
    id: fixture.id,
    username: fixture.username,
    email: fixture.email,
    passwordHash: hashPassword(fixture.password),
    createdAt: fixture.createdAt || DEFAULT_CREATED_AT,
    stats: baseStats,
  }

  if (fixture.lastLogin) user.lastLogin = fixture.lastLogin
  if (fixture.profileData) user.profileData = fixture.profileData
  if (fixture.goalsData) user.goalsData = fixture.goalsData
  if (fixture.generatedTasks) user.generatedTasks = fixture.generatedTasks
  if (fixture.shopItems) user.shopItems = fixture.shopItems
  if (fixture.inventory) user.inventory = fixture.inventory
  if (fixture.unclaimedRewards) user.unclaimedRewards = fixture.unclaimedRewards
  if (fixture.activityHistory) user.activityHistory = fixture.activityHistory
  if (fixture.taskHistory) user.taskHistory = fixture.taskHistory
  if (fixture.catalog) user.catalog = fixture.catalog

  return user
}

export function seedUsers(fixtures: SeedUserFixture[]) {
  const { dataDir, usersFile, sessionsFile } = getDataPaths()

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  const fixtureUsers = fixtures.map(createSeedUser)
  const fixtureIds = new Set(fixtureUsers.map(user => user.id))
  const fixtureEmails = new Set(fixtureUsers.map(user => user.email))

  const existingUsers = readJsonArray(usersFile) as User[]
  const nextUsers = existingUsers.filter(
    user => !fixtureIds.has(user.id) && !fixtureEmails.has(user.email)
  )

  nextUsers.push(...fixtureUsers)
  writeJson(usersFile, nextUsers)

  const existingSessions = readJsonArray(sessionsFile)
  const nextSessions = existingSessions.filter(
    session => !fixtureIds.has(session.userId)
  )
  writeJson(sessionsFile, nextSessions)
}

export function seedDefaultAppUser(
  credentials: TestUserCredentials,
  overrides: Partial<Omit<SeedUserFixture, keyof TestUserCredentials>> = {}
) {
  seedUsers([
    {
      ...credentials,
      profileData: DEFAULT_PROFILE,
      goalsData: DEFAULT_GOALS,
      catalog: createDefaultCatalog(),
      generatedTasks: createGeneratedTasks(),
      ...overrides,
    },
  ])
}

export async function loginAs(page: Page, user: TestUserCredentials) {
  await page.goto('/')
  await page.locator('input#email').fill(user.email)
  await page.locator('input#password').fill(user.password)
  await page.getByRole('button', { name: 'Enter System' }).click()
}

export async function fillOtpInputs(page: Page, otp: string) {
  await page.locator('.otp-input').first().click()
  await page.keyboard.type(otp, { delay: 30 })
}

export async function dismissTourIfPresent(page: Page) {
  const skipButton = page.getByRole('button', { name: 'Skip tour' })
  if (await skipButton.isVisible().catch(() => false)) {
    await skipButton.click()
  }
}

export async function suppressTour(page: Page, userId: string) {
  await page.addInitScript((id: string) => {
    window.localStorage.setItem(`gamifai_tour_completed_v2_${id}`, 'true')
  }, userId)
}

export function sanitizeUser(user: User): Omit<User, 'passwordHash'> {
  const { passwordHash: _passwordHash, ...rest } = user
  return rest
}

export function successResponse({
  message,
  data,
  user,
  sessionId,
  changes,
  metadata,
}: {
  message: string
  data?: unknown
  user?: Omit<User, 'passwordHash'>
  sessionId?: string
  changes?: unknown
  metadata?: unknown
}) {
  return {
    success: true,
    message,
    ...(data !== undefined ? { data } : {}),
    ...(user !== undefined ? { user } : {}),
    ...(sessionId !== undefined ? { sessionId } : {}),
    ...(changes !== undefined ? { changes } : {}),
    ...(metadata !== undefined ? { metadata } : {}),
  }
}

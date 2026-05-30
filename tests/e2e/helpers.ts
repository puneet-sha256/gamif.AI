/**
 * Playwright helpers used across specs.
 *
 * Goal: keep individual spec files focused on assertions, not click choreography.
 */

import { expect, Page } from '@playwright/test'
import { TEST_PASSWORD, USERS, UserKey, resetSeedUser, resetAllSeedUsers } from './fixtures/seedUsers'

/**
 * Reset one or more seed users back to baseline (rolls back any in-test
 * mutations like added shop items, persisted catalogs, unclaimed rewards).
 * Re-export so specs only need to import from helpers.
 */
export function resetUsers(...keys: UserKey[]) {
  for (const k of keys) resetSeedUser(k)
}

/**
 * Reset every seed user. Cheap; use in beforeEach to guarantee isolation
 * across specs and across desktop/mobile projects that share the data file.
 */
export { resetAllSeedUsers }

export const E2E_OTP_BYPASS_CODE = '000000'

// ─── Authentication ───────────────────────────────────────────────────────

/**
 * Log in as a seeded user. Bypasses registration; goes straight from the auth
 * screen to whichever onboarding step the user is at. Also pre-dismisses the
 * onboarding tour so it doesn't intercept clicks in test scenarios that don't
 * specifically exercise it.
 */
export async function loginAs(page: Page, userKey: UserKey, password = TEST_PASSWORD) {
  const user = USERS[userKey]
  await page.goto('/')
  // Pre-dismiss the onboarding tour for this user so it doesn't block clicks.
  await page.evaluate((uid) => {
    window.localStorage.setItem(`gamifai_tour_completed_${uid}`, 'true')
  }, user.id)
  await page.waitForSelector('input#email', { state: 'visible' })
  await page.fill('input#email', user.email)
  await page.fill('input#password', password)
  await page.getByRole('button', { name: 'Enter System' }).click()
}

/**
 * Register a brand-new user via the UI. Uses the OTP bypass.
 */
export async function registerNewUser(
  page: Page,
  username: string,
  email: string,
  password = TEST_PASSWORD
) {
  await page.goto('/')
  // Switch to register mode via the "Register here" link
  const registerLink = page.getByRole('button', { name: /Register here/i })
  if (await registerLink.isVisible().catch(() => false)) {
    await registerLink.click()
  }
  await page.waitForSelector('input#username', { state: 'visible' })
  await page.fill('input#username', username)
  await page.fill('input#email', email)
  await page.fill('input#password', password)
  await page.fill('input#confirmPassword', password)
  // Registration form submit -> "Register Player" -> triggers handleSendOtp
  await page.getByRole('button', { name: 'Register Player' }).click()
  // OTP entry — six .otp-input boxes. AuthScreen's onPaste handler accepts a
  // full digit string and distributes it across all six inputs in one go,
  // which sidesteps focus-advance races that break per-input fill/type.
  await page.waitForSelector('input.otp-input', { timeout: 30_000 })
  await page.evaluate((otp) => {
    const first = document.querySelector('input.otp-input') as HTMLInputElement | null
    if (!first) return
    first.focus()
    const data = new DataTransfer()
    data.setData('text/plain', otp)
    first.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true }))
  }, E2E_OTP_BYPASS_CODE)
  const verifyBtn = page.getByRole('button', { name: /Verify & Register/i })
  await expect(verifyBtn).toBeEnabled({ timeout: 5_000 })
  await verifyBtn.click()
}

// ─── Onboarding steps ─────────────────────────────────────────────────────

export async function completeProfile(page: Page, name: string, year = 2000, month = 1, day = 15) {
  await page.waitForSelector('.profile-setup-card, [data-tour="profile-card"]', { state: 'visible', timeout: 15_000 })
  await page.fill('input#name', name)
  // DOB picker dropdowns are id-prefixed "dob-setup" and month/day values are
  // zero-padded ("01"-"12", "01"-"31"). Year is unpadded.
  const pad = (n: number) => String(n).padStart(2, '0')
  await page.selectOption('select#dob-setup-year', String(year))
  await page.selectOption('select#dob-setup-month', pad(month))
  await page.selectOption('select#dob-setup-day', pad(day))
  await page.getByRole('button', { name: /Continue to Goals Setup/i }).click()
}

export async function completeGoals(page: Page, goalsText: string) {
  await page.waitForSelector('.goal-textarea', { state: 'visible', timeout: 15_000 })
  await page.fill('.goal-textarea', goalsText)
  // Submit button label changes during AI task generation; match the idle text.
  await page.getByRole('button', { name: /Complete Setup & Generate Tasks/i }).click()
}

// ─── Intake calibration ───────────────────────────────────────────────────

/**
 * Walk through the 12-card intake by picking the first option on each card.
 * Returns once the modal closes (catalog persisted).
 */
export async function completeIntake(page: Page) {
  // The modal renders as .intake-overlay
  await page.waitForSelector('.intake-overlay', { state: 'visible', timeout: 30_000 })
  await page.getByRole('button', { name: /Begin/i }).click()
  // Cards load — wait for first card
  await page.waitForSelector('.intake-question-card', { timeout: 60_000 })

  // Walk cards. Each card has radio options + a Continue button.
  for (let i = 0; i < 12; i++) {
    const radios = page.locator('.intake-options input[type="radio"]')
    await radios.first().waitFor({ state: 'visible', timeout: 15_000 })
    await radios.first().check()
    const continueBtn = page.getByRole('button', { name: /Continue|Next|Submit/i })
    await continueBtn.click()
  }

  // Summary card → Confirm
  await page.waitForSelector('.intake-summary-card', { timeout: 60_000 })
  await page.getByRole('button', { name: /Confirm/i }).click()

  // Modal closes
  await expect(page.locator('.intake-overlay')).toBeHidden({ timeout: 15_000 })
}

// ─── Activity logging ─────────────────────────────────────────────────────

/**
 * Log a daily activity from the dashboard. Returns once the modal closes
 * and the success alert appears.
 */
export async function logActivity(
  page: Page,
  text: string,
  options?: { activityDate?: string }
) {
  // "Log Daily Activities" button only renders on the Tasks tab — navigate first.
  // Use .first() because the tab nav and any tasks-tab content can both render
  // a "Tasks" label.
  const tasksTab = page.getByRole('button', { name: /^📋 Tasks$|^Tasks$/ }).first()
  if (await tasksTab.isVisible().catch(() => false)) {
    await tasksTab.click()
  }
  await page.getByRole('button', { name: /Log Daily Activit/i }).click()
  // Modal opens
  await page.waitForSelector('textarea, .daily-activity-modal', { state: 'visible', timeout: 10_000 })
  if (options?.activityDate) {
    // Date input in the modal
    const dateInput = page.locator('input[type="date"]').first()
    if (await dateInput.isVisible().catch(() => false)) {
      await dateInput.fill(options.activityDate)
    }
  }
  await page.fill('.daily-activity-modal textarea, textarea[name="activity"], textarea', text)
  // Submit — actual label is "✨ Analyze & Earn XP". Anchor to "Analyze & Earn"
  // so the regex doesn't collide with "Log Daily Activities" or "Logout".
  await page.getByRole('button', { name: /Analyze & Earn/i }).click()
  // Wait for either modal close or the alert toast confirming analysis
  await page.waitForSelector('.daily-activity-modal', { state: 'detached', timeout: 60_000 }).catch(() => {})
}

// ─── Backend API helpers (faster than UI for state setup) ────────────────

/**
 * Issue an authenticated API call. Pulls sessionId from the page's localStorage.
 */
const SESSION_KEY = 'solo_leveling_session_id'

export async function getSessionId(page: Page): Promise<string> {
  const sessionId = await page.evaluate((k) => window.localStorage.getItem(k), SESSION_KEY)
  if (!sessionId) throw new Error('No sessionId in localStorage — is the user logged in?')
  return sessionId
}

export async function fetchUser(page: Page) {
  const sessionId = await getSessionId(page)
  const res = await page.request.get(`http://localhost:3001/api/user/session/${sessionId}`)
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  return body.user
}

export async function submitFeedback(
  page: Page,
  signature: string,
  vote: 'up' | 'over' | 'under'
) {
  const sessionId = await getSessionId(page)
  const res = await page.request.post('http://localhost:3001/api/user/catalog/feedback', {
    data: { sessionId, signature, vote },
  })
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  return body.data.row
}

/**
 * Wait for unclaimedRewards.activities to reach a target count.
 * Useful after logActivity() so subsequent assertions read fresh state.
 */
export async function waitForUnclaimedCount(page: Page, target: number, timeoutMs = 60_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const user = await fetchUser(page)
    const count = user.unclaimedRewards?.activities?.length ?? 0
    if (count === target) return user
    await page.waitForTimeout(500)
  }
  throw new Error(`Timeout waiting for unclaimed activities to reach ${target}`)
}

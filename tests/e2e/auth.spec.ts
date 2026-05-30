/**
 * Auth + onboarding flow.
 *
 * Verifies:
 *   - Login with seeded user → lands on correct onboarding step
 *   - Register new user via UI with OTP bypass → lands on profile setup
 *   - Session persistence after page refresh
 *   - Logout clears session
 */

import { test, expect } from '@playwright/test'
import { loginAs, registerNewUser, getSessionId, resetAllSeedUsers } from './helpers'
import { USERS, TEST_PASSWORD } from './fixtures/seedUsers'

test.describe('Auth + onboarding', () => {
  test.beforeEach(() => {
    resetAllSeedUsers()
  })
  test('login as fully-onboarded user → dashboard renders', async ({ page }) => {
    await loginAs(page, 'v2Ready')
    await expect(page.locator('.dashboard-container')).toBeVisible({ timeout: 30_000 })
  })

  test('login as user without profileData → routed to profile setup', async ({ page }) => {
    await loginAs(page, 'needsProfile')
    await expect(page.locator('.profile-setup-card')).toBeVisible({ timeout: 15_000 })
  })

  test('login as user without goalsData → routed to goals setup', async ({ page }) => {
    await loginAs(page, 'needsGoals')
    await expect(page.locator('.goals-setup-card')).toBeVisible({ timeout: 15_000 })
  })

  test('register brand-new user with OTP bypass → lands on profile setup', async ({ page }) => {
    const stamp = Date.now()
    const email = `e2e-reg-${stamp}@example.com`
    const username = `e2ereg${stamp}`

    await registerNewUser(page, username, email, TEST_PASSWORD)

    // New user has no profile → profile setup is the first onboarding screen
    await expect(page.locator('.profile-setup-card')).toBeVisible({ timeout: 30_000 })
  })

  test('session persists after refresh', async ({ page }) => {
    await loginAs(page, 'v2Ready')
    await expect(page.locator('.dashboard-container')).toBeVisible({ timeout: 30_000 })
    const sid = await getSessionId(page)
    expect(sid).toBeTruthy()

    await page.reload()
    await expect(page.locator('.dashboard-container')).toBeVisible({ timeout: 30_000 })
    const sidAfter = await getSessionId(page)
    expect(sidAfter).toBe(sid)
  })

  test('logout clears session and routes back to auth screen', async ({ page }) => {
    await loginAs(page, 'v2Ready')
    await expect(page.locator('.dashboard-container')).toBeVisible({ timeout: 30_000 })
    // Logout button label varies — try a few common ones
    const logoutBtn = page.getByRole('button', { name: /Logout|Sign Out|Log Out/i })
    await logoutBtn.first().click()
    await expect(page.locator('input#email')).toBeVisible({ timeout: 10_000 })
    const sid = await page.evaluate(() => window.localStorage.getItem('solo_leveling_session_id'))
    expect(sid).toBeNull()
  })
})

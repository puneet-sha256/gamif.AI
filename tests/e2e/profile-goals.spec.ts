/**
 * Profile + goals onboarding steps.
 *
 * Verifies:
 *   - Profile setup with DOB picker (year / month / day dropdowns)
 *   - Goals validation (min length)
 *   - After completion, user data is persisted server-side
 */

import { test, expect } from '@playwright/test'
import { loginAs, completeProfile, completeGoals, fetchUser, resetAllSeedUsers } from './helpers'

test.describe('Profile + goals', () => {
  test.beforeEach(() => {
    resetAllSeedUsers()
  })
  test('profile setup with DOB picker persists name + dateOfBirth', async ({ page }) => {
    await loginAs(page, 'needsProfile')
    await expect(page.locator('.profile-setup-card')).toBeVisible({ timeout: 15_000 })

    await completeProfile(page, 'Profile Test User', 1995, 6, 15)

    // Next step: goals setup (since this user has no goals)
    await expect(page.locator('.goals-setup-card')).toBeVisible({ timeout: 30_000 })

    const user = await fetchUser(page)
    expect(user.profileData?.name).toBe('Profile Test User')
    expect(user.profileData?.dateOfBirth).toBeTruthy()
  })

  test('goals min-length is enforced (≥ 50 chars)', async ({ page }) => {
    await loginAs(page, 'needsGoals')
    await expect(page.locator('.goals-setup-card')).toBeVisible({ timeout: 15_000 })

    // Try too-short goals — submit button should be disabled (minLength=50).
    await page.fill('.goal-textarea', 'Short goal')
    const submitBtn = page.getByRole('button', { name: /Complete Setup & Generate Tasks/i })
    await expect(submitBtn).toBeDisabled({ timeout: 5_000 })
  })

  test('goals setup completes → dashboard renders (catalog already absent, so intake modal fires)', async ({ page }) => {
    await loginAs(page, 'needsGoals')
    await expect(page.locator('.goals-setup-card')).toBeVisible({ timeout: 15_000 })

    await completeGoals(
      page,
      'Build muscle and improve cardiovascular health. Learn programming with TypeScript and Python. Improve my communication skills for leadership roles.'
    )

    // After goals: either dashboard with intake modal, or directly intake/dashboard
    await page.waitForSelector('.dashboard-container, .intake-overlay', { timeout: 60_000 })

    const user = await fetchUser(page)
    expect(user.goalsData?.longTermGoals?.length).toBeGreaterThanOrEqual(50)
  })
})

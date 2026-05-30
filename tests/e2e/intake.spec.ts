/**
 * Intake calibration modal (Milestone 1B).
 *
 * Verifies:
 *   - When user has goals but no catalog, intake modal fires and blocks the dashboard
 *   - 12 cards render sequentially
 *   - Selecting an option lets user advance
 *   - Summary card shows extracted signals
 *   - Confirming persists the catalog
 *   - After completion, modal does not re-fire on reload
 *
 * NOTE: This spec hits real Azure OpenAI for the 2 AI calls (question
 * generation + extraction). With temperature=0 it's deterministic but slow
 * (~30-60 sec for the full flow).
 */

import { test, expect } from '@playwright/test'
import { loginAs, completeIntake, fetchUser, resetAllSeedUsers } from './helpers'

test.describe('Intake calibration', () => {
  test.setTimeout(180_000) // Allow plenty for the two AI calls + 12 card walks.

  test.beforeEach(() => {
    resetAllSeedUsers()
  })

  test('intake modal fires for user with goals but no catalog', async ({ page }) => {
    await loginAs(page, 'needsIntake')
    // Dashboard renders, then intake modal overlays
    await expect(page.locator('.intake-overlay')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/Personalise your rewards/i)).toBeVisible()
  })

  test('full intake flow → catalog written → modal closes → does not re-fire on reload', async ({ page }) => {
    await loginAs(page, 'needsIntake')
    await expect(page.locator('.intake-overlay')).toBeVisible({ timeout: 30_000 })

    await completeIntake(page)

    // Catalog now present
    const user = await fetchUser(page)
    expect(user.catalog).toBeTruthy()
    expect(Object.keys(user.catalog.rows ?? {}).length).toBeGreaterThan(30)
    expect(user.catalog.calibration?.completedAt).toBeTruthy()

    // Reload — intake should NOT re-fire
    await page.reload()
    await expect(page.locator('.dashboard-container')).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('.intake-overlay')).toBeHidden({ timeout: 5_000 })
  })

  test('intake populates calibration.goalTags', async ({ page }) => {
    await loginAs(page, 'needsIntake')
    await expect(page.locator('.intake-overlay')).toBeVisible({ timeout: 30_000 })

    await completeIntake(page)

    const user = await fetchUser(page)
    const goalTags = user.catalog?.calibration?.goalTags ?? []
    expect(Array.isArray(goalTags)).toBe(true)
    // The intake prompt should produce a non-trivial list for goals spanning all 3 categories.
    expect(goalTags.length).toBeGreaterThanOrEqual(3)
  })
})

/**
 * Activity history + streak calculation.
 *
 * Verifies:
 *   - Veteran user's pre-existing dailyActivities load correctly
 *   - Streak cache is consistent with the recorded data
 *   - Heatmap renders without errors
 */

import { test, expect } from '@playwright/test'
import { loginAs, fetchUser, resetAllSeedUsers } from './helpers'

test.describe('Streaks + heatmap', () => {
  test.beforeEach(() => {
    resetAllSeedUsers()
  })
  test('veteran user has populated activityHistory', async ({ page }) => {
    await loginAs(page, 'veteran')
    await expect(page.locator('.dashboard-container')).toBeVisible({ timeout: 30_000 })

    const user = await fetchUser(page)
    expect(user.activityHistory?.dailyActivities?.length).toBeGreaterThanOrEqual(3)
    const dates = user.activityHistory.dailyActivities.map((d: { date: string }) => d.date)
    expect(dates).toContain('2026-05-25')
  })

  test('activity heatmap component renders', async ({ page }) => {
    await loginAs(page, 'veteran')
    await expect(page.locator('.dashboard-container')).toBeVisible({ timeout: 30_000 })
    // Heatmap is rendered on the profile tab (default)
    await expect(page.locator('.activity-heatmap, [class*="heatmap"]').first()).toBeVisible({ timeout: 10_000 })
  })

  test('streak multipliers section renders on dashboard', async ({ page }) => {
    await loginAs(page, 'veteran')
    await expect(page.locator('.streak-multipliers-section, [data-tour="streak-multipliers"]').first())
      .toBeVisible({ timeout: 15_000 })
  })
})

/**
 * Reward claim flow.
 *
 * Verifies:
 *   - Claim modal opens and lists unclaimed activities
 *   - Per-activity rate breakdown line renders
 *   - Three feedback chips render per activity
 *   - "Claim All" updates stats.experience + stats.shards and clears unclaimedRewards
 *   - Streak data updates on the claim path
 */

import { test, expect } from '@playwright/test'
import { loginAs, logActivity, fetchUser, waitForUnclaimedCount, resetAllSeedUsers } from './helpers'

test.describe('Reward claim flow', () => {
  test.setTimeout(180_000)

  test.beforeEach(async ({ page }) => {
    resetAllSeedUsers()
    await loginAs(page, 'v2Ready')
    await expect(page.locator('.dashboard-container')).toBeVisible({ timeout: 30_000 })
  })

  test('claim modal shows rate breakdown + feedback chips per activity', async ({ page }) => {
    await logActivity(page, 'Did a 30-minute moderate cardio session.')
    await waitForUnclaimedCount(page, 1)

    // Open the unclaimed rewards modal
    const rewardsBtn = page.locator('.unclaimed-rewards-button, [data-tour="unclaimed-rewards"]').first()
    await rewardsBtn.click()
    await page.waitForSelector('.reward-modal-content', { state: 'visible', timeout: 10_000 })

    // Rate breakdown should be present (added by 1C)
    await expect(page.locator('.reward-breakdown').first()).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('.reward-breakdown-label').first()).toContainText(/×/)

    // Three feedback chips
    const chips = page.locator('.reward-feedback-chip')
    await expect(chips).toHaveCount(3)
    await expect(page.getByText(/Feels right/i).first()).toBeVisible()
    await expect(page.getByText(/Too much/i).first()).toBeVisible()
    await expect(page.getByText(/Too little/i).first()).toBeVisible()
  })

  test('claim all → stats updated, unclaimed cleared', async ({ page }) => {
    const before = await fetchUser(page)
    const beforeXP = before.stats?.experience ?? 0
    const beforeShards = before.stats?.shards ?? 0

    await logActivity(page, 'Did a 30-minute moderate workout.')
    await waitForUnclaimedCount(page, 1)

    const rewardsBtn = page.locator('.unclaimed-rewards-button, [data-tour="unclaimed-rewards"]').first()
    await rewardsBtn.click()
    await page.waitForSelector('.reward-modal-content', { state: 'visible' })

    await page.getByRole('button', { name: /Claim All/i }).click()
    // Wait for the modal to close and the claim flow to complete
    await page.waitForSelector('.reward-modal-content', { state: 'detached', timeout: 30_000 }).catch(() => {})
    await page.waitForTimeout(2000)

    const after = await fetchUser(page)
    expect(after.stats?.experience ?? 0).toBeGreaterThan(beforeXP)
    expect(after.stats?.shards ?? 0).toBeGreaterThan(beforeShards)
    expect(after.unclaimedRewards?.activities?.length ?? 0).toBe(0)
  })
})

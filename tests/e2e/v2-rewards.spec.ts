/**
 * v2 reward calculation end-to-end (Milestones 1C + 1D).
 *
 * Verifies the entire reward pipeline against a pre-seeded catalog user:
 *   - Activity extraction maps natural language to catalog tags
 *   - Tier classification (goal-aligned, category-aligned, unrelated)
 *   - Content-aware goal_advancement (same tag, different content → different tier)
 *   - Soft cap on time-based activities
 *   - Daily cap on count-based activities
 *   - Effort-pair swap on unsuccessful attempts
 *   - Inferred-effort penalty
 *   - Negation / aspirational filtering
 *   - Consistency guarantee (same activity twice → identical reward)
 *   - Feedback loop (up / over / under votes mutate row state)
 *   - Stability convergence (post-stability adjustments are tighter)
 *
 * NOTE: hits real Azure OpenAI for each activity log. temperature=0 +
 * seed pinning give us determinism in principle, but small jitter is
 * possible. Tests assert structural properties (tier, signature, presence
 * of expected fields) rather than exact XP/shard values where AI judgment
 * is involved.
 */

import { test, expect } from '@playwright/test'
import {
  loginAs,
  logActivity,
  fetchUser,
  submitFeedback,
  waitForUnclaimedCount,
  resetAllSeedUsers,
} from './helpers'

test.describe('v2 reward calculation', () => {
  test.setTimeout(180_000)

  test.beforeEach(async ({ page }) => {
    resetAllSeedUsers()
    await loginAs(page, 'v2Ready')
    await expect(page.locator('.dashboard-container')).toBeVisible({ timeout: 30_000 })
  })

  test('logging a single workout activity → goal-aligned reward with rateBreakdown + signature', async ({ page }) => {
    await logActivity(page, 'Did a 30-minute moderate workout.')
    const user = await waitForUnclaimedCount(page, 1)
    const a = user.unclaimedRewards.activities[0]

    expect(a.systemVersion).toBe('v2')
    expect(a.signature).toMatch(/^workout_session\|Strength\|/)
    expect(a.tier).toMatch(/goal-aligned|goal-similar|goal-exact/)
    expect(a.rateBreakdown).toBeTruthy()
    expect(a.rateBreakdown.unit).toBe('time')
    expect(a.rateBreakdown.value).toBeGreaterThan(0)
    expect(a.xpEarned).toBeGreaterThan(0)
  })

  test('logging a count-based activity → count rateBreakdown', async ({ page }) => {
    await logActivity(page, 'Solved 3 medium coding problems.')
    const user = await waitForUnclaimedCount(page, 1)
    const a = user.unclaimedRewards.activities[0]

    expect(a.signature).toMatch(/^problem_solving\|Intelligence\|/)
    expect(a.rateBreakdown.unit).toBe('count')
    expect(a.rateBreakdown.value).toBeLessThanOrEqual(3)
  })

  test('content-aware goal_advancement: same reading_session tag, different tier by content', async ({ page }) => {
    // Article about Python → advances programming goal
    await logActivity(page, 'Read a 20-minute article about Python async patterns.')
    let user = await waitForUnclaimedCount(page, 1)
    const pythonRead = user.unclaimedRewards.activities[0]
    expect(pythonRead.signature).toMatch(/^reading_session\|Intelligence\|/)
    expect(pythonRead.tier).toBe('goal-aligned')

    // Sci-fi novel — Intelligence-category but doesn't advance programming
    await logActivity(page, 'Read a 20-minute sci-fi novel.')
    user = await waitForUnclaimedCount(page, 2)
    const scifiRead = user.unclaimedRewards.activities[1]
    expect(scifiRead.signature).toMatch(/^reading_session\|Intelligence\|/)
    expect(scifiRead.tier).toBe('category-aligned')

    // Same tag, opposite tiers → content-aware judgment confirmed
    expect(pythonRead.signature).toBe(scifiRead.signature)
    expect(pythonRead.xpEarned).toBeGreaterThan(scifiRead.xpEarned)
  })

  test('soft cap on time-based activity: 200-min workout caps at soft_cap_min', async ({ page }) => {
    await logActivity(page, 'Did a 200-minute intense workout today.')
    const user = await waitForUnclaimedCount(page, 1)
    const a = user.unclaimedRewards.activities[0]

    expect(a.signature).toMatch(/^workout_session\|Strength\|/)
    // Effective value should be ≤ stated 200 (soft_cap_min is 75 or 90 depending on intensity)
    expect(a.rateBreakdown.value).toBeLessThan(200)
    expect(a.rateBreakdown.value).toBeLessThanOrEqual(90)
    expect(a.calculationNotes).toContain('[capped]')
  })

  test('count daily_cap: 15 hard leetcodes credits 5', async ({ page }) => {
    await logActivity(page, 'Did 15 hard leetcode problems today.')
    const user = await waitForUnclaimedCount(page, 1)
    const a = user.unclaimedRewards.activities[0]

    expect(a.signature).toMatch(/^problem_solving\|Intelligence\|hard$/)
    expect(a.rateBreakdown.unit).toBe('count')
    expect(a.rateBreakdown.value).toBeLessThanOrEqual(5)
    expect(a.calculationNotes).toContain('[capped]')
  })

  test('effort-pair swap: unsuccessful attempt → *_attempt time-based, not count-based', async ({ page }) => {
    await logActivity(page, 'Tried a hard leetcode problem for 60 minutes but couldn\'t crack it.')
    const user = await waitForUnclaimedCount(page, 1)
    const a = user.unclaimedRewards.activities[0]

    expect(a.signature).toBe('problem_solving_attempt|Intelligence|hard')
    expect(a.rateBreakdown.unit).toBe('time')
    expect(a.rateBreakdown.value).toBe(60)
    expect(a.xpEarned).toBeGreaterThan(0)  // Trying still pays
  })

  test('inferred-effort penalty: no stated duration → × 0.85 in notes', async ({ page }) => {
    await logActivity(page, 'I worked out today.')
    const user = await waitForUnclaimedCount(page, 1)
    const a = user.unclaimedRewards.activities[0]

    expect(a.signature).toMatch(/^workout_session\|Strength\|/)
    expect(a.calculationNotes).toMatch(/inferred/)
  })

  test('negation + aspirational filtering: nothing extracted', async ({ page }) => {
    await logActivity(page, "I didn't manage to work out today. Going to read tonight after dinner.")
    // Should produce 0 unclaimed entries (or none added beyond prior state).
    const before = await fetchUser(page)
    const beforeCount = before.unclaimedRewards?.activities?.length ?? 0
    // Wait a bit for analyze to settle
    await page.waitForTimeout(2000)
    const after = await fetchUser(page)
    const afterCount = after.unclaimedRewards?.activities?.length ?? 0
    expect(afterCount).toBe(beforeCount)
  })

  test('multiple activities in one log → multiple entries', async ({ page }) => {
    await logActivity(
      page,
      'Did a 30-minute workout, solved 2 medium leetcodes, and had a substantive conversation with a coworker.'
    )
    const user = await waitForUnclaimedCount(page, 3)
    const acts = user.unclaimedRewards.activities
    expect(acts).toHaveLength(3)
    const sigs = acts.map((a: { signature: string }) => a.signature).sort()
    expect(sigs.some((s: string) => s.startsWith('workout_session|Strength'))).toBe(true)
    expect(sigs.some((s: string) => s.startsWith('problem_solving|Intelligence'))).toBe(true)
    expect(sigs.some((s: string) => s.startsWith('conversation_initiation|Charisma') || s.startsWith('substantive_conversation|Charisma'))).toBe(true)
  })

  test('consistency guarantee: same activity → identical XP/shards', async ({ page }) => {
    await logActivity(page, 'Did a 30-minute moderate cardio session.')
    let user = await waitForUnclaimedCount(page, 1)
    const first = user.unclaimedRewards.activities[0]

    await logActivity(page, '30-min moderate cardio session.')
    user = await waitForUnclaimedCount(page, 2)
    const second = user.unclaimedRewards.activities[1]

    expect(second.signature).toBe(first.signature)
    expect(second.tier).toBe(first.tier)
    expect(second.xpEarned).toBe(first.xpEarned)
    expect(second.shardsEarned).toBe(first.shardsEarned)
    expect(second.rateBreakdown).toEqual(first.rateBreakdown)
  })

  test('feedback loop: up vote → +1 stability, no rate change', async ({ page }) => {
    const signature = 'cardio_session|Strength|moderate'
    const before = await fetchUser(page)
    const beforeRow = before.catalog.rows[signature]
    const row = await submitFeedback(page, signature, 'up')
    expect(row.stability_score).toBe(beforeRow.stability_score + 1)
    expect(row.xp_per_min).toBe(beforeRow.xp_per_min)
    expect(row.feedback_count).toBe(beforeRow.feedback_count + 1)
  })

  test('feedback loop: under vote pre-stability → rate × 1.10', async ({ page }) => {
    const signature = 'reading_session|Intelligence|moderate'
    const before = await fetchUser(page)
    const beforeRate = before.catalog.rows[signature].xp_per_min
    const row = await submitFeedback(page, signature, 'under')
    expect(row.feedback_count).toBe(before.catalog.rows[signature].feedback_count + 1)
    // Pre-stability multiplier 1.10, but clamped at 2x seed_floor.
    expect(row.xp_per_min).toBeGreaterThan(beforeRate)
    expect(row.xp_per_min).toBeLessThanOrEqual(beforeRate * 1.15)
  })

  test('feedback loop: stability convergence — under at stability=10 produces tighter ±5% adjustment', async ({ page }) => {
    const signature = 'workout_session|Strength|moderate'

    // Push stability to 10 via 10 up votes
    for (let i = 0; i < 10; i++) {
      await submitFeedback(page, signature, 'up')
    }
    const atTen = await fetchUser(page)
    const rowAtTen = atTen.catalog.rows[signature]
    expect(rowAtTen.stability_score).toBe(10)
    const rateAtTen = rowAtTen.xp_per_min

    // First under vote with stability=10 → ×1.05 (tight), not ×1.10
    const row = await submitFeedback(page, signature, 'under')
    const expectedTight = rateAtTen * 1.05
    const expectedLoose = rateAtTen * 1.10
    const actual = row.xp_per_min
    // actual should be closer to tight (1.05) than to loose (1.10)
    expect(Math.abs(actual - expectedTight)).toBeLessThan(Math.abs(actual - expectedLoose))
  })
})

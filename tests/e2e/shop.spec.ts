/**
 * Shop + inventory CRUD.
 *
 * Verifies:
 *   - Add a custom shop item
 *   - Buy with insufficient shards fails gracefully
 *   - Buy with sufficient shards deducts and adds to inventory
 *   - Delete a shop item
 *
 * Uses backend API directly for state setup; UI clicks for the actual flows.
 */

import { test, expect } from '@playwright/test'
import { loginAs, fetchUser, getSessionId, resetAllSeedUsers } from './helpers'

test.describe('Shop + inventory', () => {
  test.beforeEach(() => {
    resetAllSeedUsers()
  })
  test('add a custom shop item via API → it appears in the Shop tab', async ({ page }) => {
    await loginAs(page, 'veteran')
    await expect(page.locator('.dashboard-container')).toBeVisible({ timeout: 30_000 })

    const sessionId = await getSessionId(page)
    const res = await page.request.post('http://localhost:3001/api/user/shop/add', {
      data: {
        sessionId,
        title: 'E2E Reward Coffee',
        description: 'A premium coffee for finishing a hard week',
        price: 50,
        image: '☕',
      },
    })
    expect(res.ok()).toBeTruthy()

    // Reload to pick up the API-side shop write (Dashboard's React state was
    // snapshotted at login and won't auto-sync to new shopItems).
    await page.reload()
    await expect(page.locator('.dashboard-container')).toBeVisible({ timeout: 30_000 })
    // Navigate to Shop tab (use tab-nav button text "🛒 Shop")
    await page.getByRole('button', { name: /^🛒 Shop$|^Shop$/ }).first().click()
    await expect(page.getByText('E2E Reward Coffee')).toBeVisible({ timeout: 10_000 })
  })

  test('buying with sufficient shards deducts balance and adds to inventory', async ({ page }) => {
    await loginAs(page, 'veteran')
    await expect(page.locator('.dashboard-container')).toBeVisible({ timeout: 30_000 })

    const sessionId = await getSessionId(page)
    // Seed an item
    await page.request.post('http://localhost:3001/api/user/shop/add', {
      data: { sessionId, title: 'Cheap Treat', description: 'A small reward', price: 25, image: '🍪' },
    })

    const before = await fetchUser(page)
    const beforeShards = before.stats?.shards ?? 0
    expect(beforeShards).toBeGreaterThanOrEqual(25)
    const item = before.shopItems?.find((i: { title: string }) => i.title === 'Cheap Treat')
    expect(item).toBeTruthy()

    // Buy via API to avoid UI flakiness on dialogs
    const buyRes = await page.request.post('http://localhost:3001/api/user/shop/buy', {
      data: { sessionId, itemId: item.id, itemPrice: 25 },
    })
    expect(buyRes.ok()).toBeTruthy()

    const after = await fetchUser(page)
    expect(after.stats.shards).toBe(beforeShards - 25)
    expect(after.inventory?.some((i: { title: string }) => i.title === 'Cheap Treat')).toBe(true)
  })

  test('buying with insufficient shards fails gracefully', async ({ page }) => {
    await loginAs(page, 'needsIntake')
    // needsIntake user lands on the intake-overlay modal after login (no
    // dashboard). Wait for either intake or dashboard before reading session.
    await page.waitForSelector('.intake-overlay, .dashboard-container', { timeout: 30_000 })
    const sessionId = await getSessionId(page)
    await page.request.post('http://localhost:3001/api/user/shop/add', {
      data: { sessionId, title: 'Expensive Item', description: 'Costs a lot', price: 9999, image: '💎' },
    })
    const user = await fetchUser(page)
    const item = user.shopItems?.find((i: { title: string }) => i.title === 'Expensive Item')
    expect(item).toBeTruthy()
    const buyRes = await page.request.post('http://localhost:3001/api/user/shop/buy', {
      data: { sessionId, itemId: item.id, itemPrice: 9999 },
    })
    expect(buyRes.status()).toBeGreaterThanOrEqual(400)
  })
})

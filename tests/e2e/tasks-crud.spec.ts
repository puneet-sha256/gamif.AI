/**
 * Task CRUD via backend API.
 *
 * Verifies:
 *   - Add a user-created task
 *   - Update task fields
 *   - Delete a task
 *
 * Uses backend API for state changes (UI modals tested in onboardingTour spec).
 */

import { test, expect } from '@playwright/test'
import { loginAs, fetchUser, getSessionId, resetAllSeedUsers } from './helpers'

test.describe('Task CRUD', () => {
  test.beforeEach(() => {
    resetAllSeedUsers()
  })

  test('add → update → delete a custom task via API', async ({ page }) => {
    await loginAs(page, 'v2Ready')
    await expect(page.locator('.dashboard-container')).toBeVisible({ timeout: 30_000 })
    const sessionId = await getSessionId(page)

    // Add
    const addRes = await page.request.post('http://localhost:3001/api/user/tasks/add', {
      data: {
        sessionId,
        title: 'E2E Custom Task',
        description: 'A user-created task for E2E testing',
        category: 'Strength',
        expected_duration_minutes: 20,
        xp: 15,
        shards: 30,
      },
    })
    expect(addRes.ok()).toBeTruthy()

    let user = await fetchUser(page)
    const added = user.generatedTasks.Strength.find((t: { title: string }) => t.title === 'E2E Custom Task')
    expect(added).toBeTruthy()
    expect(added.xp).toBe(15)

    // Update
    const updRes = await page.request.put('http://localhost:3001/api/user/tasks/update', {
      data: {
        sessionId,
        taskId: added.id,
        category: 'Strength',
        updates: { xp: 22, shards: 44 },
      },
    })
    expect(updRes.ok()).toBeTruthy()

    user = await fetchUser(page)
    const updated = user.generatedTasks.Strength.find((t: { id: string }) => t.id === added.id)
    expect(updated.xp).toBe(22)
    expect(updated.shards).toBe(44)

    // Delete
    const delRes = await page.request.delete('http://localhost:3001/api/user/tasks/delete', {
      data: { sessionId, taskId: added.id, category: 'Strength' },
    })
    expect(delRes.ok()).toBeTruthy()

    user = await fetchUser(page)
    expect(user.generatedTasks.Strength.find((t: { id: string }) => t.id === added.id)).toBeUndefined()
  })
})

import { test, expect, Page } from '@playwright/test'
import { TEST_USER } from './globalSetup'

const TOUR_TOTAL_STEPS = 13

async function loginAsTestUser(page: Page) {
  await page.goto('/')
  await page.waitForSelector('input#email', { state: 'visible' })
  await page.fill('input#email', TEST_USER.email)
  await page.fill('input#password', TEST_USER.password)
  await page.getByRole('button', { name: 'Enter System' }).click()
  // Dashboard renders the GAMIF.AI logo
  await expect(page.locator('.dashboard-container')).toBeVisible({ timeout: 30_000 })
}

async function clearTourFlag(page: Page) {
  await page.evaluate((userId) => {
    window.localStorage.removeItem(`gamifai_tour_completed_${userId}`)
  }, TEST_USER.id)
}

test.describe('First-time user onboarding tour', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page)
    // Ensure a fresh tour state for every test
    await clearTourFlag(page)
    await page.reload()
    await expect(page.locator('.dashboard-container')).toBeVisible({ timeout: 30_000 })
  })

  test('tour shows on first dashboard load and completes through all 13 steps', async ({ page }) => {
    const card = page.getByRole('dialog')
    await expect(card).toBeVisible({ timeout: 10_000 })

    // Step 1 — welcome
    await expect(card).toContainText(`Step 1 of ${TOUR_TOTAL_STEPS}`)
    await expect(card).toContainText('Welcome to Gamif.AI')

    // Walk through to step 13
    for (let i = 2; i <= TOUR_TOTAL_STEPS; i++) {
      await page.getByRole('button', { name: 'Next' }).click()
      await expect(card).toContainText(`Step ${i} of ${TOUR_TOTAL_STEPS}`)
    }

    // Final step shows "Start playing" instead of "Next"
    const finishBtn = page.getByRole('button', { name: 'Start playing' })
    await expect(finishBtn).toBeVisible()
    await finishBtn.click()

    // Tour dismissed
    await expect(card).toBeHidden()

    // Persistence: localStorage flag should be set
    const flag = await page.evaluate(
      (userId) => window.localStorage.getItem(`gamifai_tour_completed_${userId}`),
      TEST_USER.id
    )
    expect(flag).toBe('true')

    // Reload — tour should NOT show again
    await page.reload()
    await expect(page.locator('.dashboard-container')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 5_000 })
  })

  test('tour switches tabs as it advances and spotlights the right anchors', async ({ page }) => {
    const card = page.getByRole('dialog')
    await expect(card).toBeVisible({ timeout: 10_000 })

    // Steps 1–10 should keep us on the Profile tab
    for (let i = 2; i <= 10; i++) {
      await page.getByRole('button', { name: 'Next' }).click()
      await expect(card).toContainText(`Step ${i} of ${TOUR_TOTAL_STEPS}`)
    }
    // Profile tab is active
    await expect(page.locator('.nav-tab.active')).toContainText('Profile')

    // Step 11 — Tasks tab
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(card).toContainText(`Step 11 of ${TOUR_TOTAL_STEPS}`)
    await expect(page.locator('.nav-tab.active')).toContainText('Tasks')
    // Anchor: tasks header
    await expect(page.locator('[data-tour="tasks-tab"]')).toBeVisible()

    // Step 12 — Log Daily Activities button (still on Tasks)
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(card).toContainText(`Step 12 of ${TOUR_TOTAL_STEPS}`)
    await expect(page.locator('[data-tour="log-activity-btn"]')).toBeVisible()

    // Step 13 — Shop tab
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(card).toContainText(`Step 13 of ${TOUR_TOTAL_STEPS}`)
    await expect(page.locator('.nav-tab.active')).toContainText('Shop')
    await expect(page.locator('[data-tour="shop-tab"]')).toBeVisible()
  })

  test('skip button dismisses tour and persists completion', async ({ page }) => {
    const card = page.getByRole('dialog')
    await expect(card).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: 'Skip tour' }).click()
    await expect(card).toBeHidden()

    const flag = await page.evaluate(
      (userId) => window.localStorage.getItem(`gamifai_tour_completed_${userId}`),
      TEST_USER.id
    )
    expect(flag).toBe('true')
  })

  test('Esc key skips the tour', async ({ page }) => {
    const card = page.getByRole('dialog')
    await expect(card).toBeVisible({ timeout: 10_000 })

    await page.keyboard.press('Escape')
    await expect(card).toBeHidden()
  })

  test('arrow keys navigate forward and back', async ({ page }) => {
    const card = page.getByRole('dialog')
    await expect(card).toBeVisible({ timeout: 10_000 })
    await expect(card).toContainText(`Step 1 of ${TOUR_TOTAL_STEPS}`)

    await page.keyboard.press('ArrowRight')
    await expect(card).toContainText(`Step 2 of ${TOUR_TOTAL_STEPS}`)

    await page.keyboard.press('ArrowRight')
    await expect(card).toContainText(`Step 3 of ${TOUR_TOTAL_STEPS}`)

    await page.keyboard.press('ArrowLeft')
    await expect(card).toContainText(`Step 2 of ${TOUR_TOTAL_STEPS}`)
  })

  test('relaunch link reopens the tour after completion', async ({ page }) => {
    // Skip first to mark complete
    await page.getByRole('button', { name: 'Skip tour' }).click()
    await expect(page.getByRole('dialog')).toBeHidden()

    // Click the "Show tour" relaunch link from the Profile tab
    await page.getByRole('button', { name: /Replay the onboarding tour/i }).click()

    const card = page.getByRole('dialog')
    await expect(card).toBeVisible()
    await expect(card).toContainText(`Step 1 of ${TOUR_TOTAL_STEPS}`)
  })
})

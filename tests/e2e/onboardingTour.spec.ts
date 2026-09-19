import { test, expect, Page } from '@playwright/test'
import { TEST_USER } from './globalSetup'

const TOUR_TOTAL_STEPS = 15

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
    window.localStorage.removeItem(`gamifai_tour_completed_v2_${userId}`)
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

  test('tour shows on first dashboard load and completes through all 15 steps', async ({ page }) => {
    const card = page.getByRole('dialog')
    await expect(card).toBeVisible({ timeout: 10_000 })

    // Step 1 — welcome
    await expect(card).toContainText(`Step 1 of ${TOUR_TOTAL_STEPS}`)
    await expect(card).toContainText('Welcome to Gamif.AI')

    // Walk through to step 15
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
      (userId) => window.localStorage.getItem(`gamifai_tour_completed_v2_${userId}`),
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

    // Step 14 — Journey tab
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(card).toContainText(`Step 14 of ${TOUR_TOTAL_STEPS}`)
    await expect(page.locator('.nav-tab.active')).toContainText('Journey')
    await expect(page.locator('[data-tour="journey-hub"]')).toBeVisible()

    // Step 15 — Guild tab
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(card).toContainText(`Step 15 of ${TOUR_TOTAL_STEPS}`)
    await expect(page.locator('.nav-tab.active')).toContainText('Guild')
    await expect(page.locator('[data-tour="guild-hub"]')).toBeVisible()
  })

  test('keeps the highlighted navigation visible and renders SVG tab icons', async ({ page }) => {
    await expect(page.locator('.nav-tab svg')).toHaveCount(6)

    const card = page.getByRole('dialog')
    for (let step = 2; step <= 5; step++) {
      await page.getByRole('button', { name: 'Next' }).click()
      await expect(card).toContainText(`Step ${step} of ${TOUR_TOTAL_STEPS}`)
    }

    await expect(page.locator('[data-tour="tab-nav"]')).toBeVisible()
    await expect.poll(async () => {
      const ringBox = await page.locator('.onboarding-tour__ring').boundingBox()
      const navigationBox = await page.locator('[data-tour="tab-nav"]').boundingBox()
      if (!ringBox || !navigationBox) return false
      return (
        Math.abs(ringBox.x - Math.max(0, navigationBox.x - 8)) < 2
        && Math.abs(ringBox.y - Math.max(0, navigationBox.y - 8)) < 2
        && Math.abs(ringBox.width - (navigationBox.width + 16)) < 2
      )
    }).toBe(true)

    const viewport = page.viewportSize()
    if (viewport && viewport.width < 768) {
      const cardBox = await card.boundingBox()
      const navigationBox = await page.locator('[data-tour="tab-nav"]').boundingBox()
      expect(cardBox).not.toBeNull()
      expect(navigationBox).not.toBeNull()

      const overlaps = !(
        cardBox!.x + cardBox!.width <= navigationBox!.x
        || navigationBox!.x + navigationBox!.width <= cardBox!.x
        || cardBox!.y + cardBox!.height <= navigationBox!.y
        || navigationBox!.y + navigationBox!.height <= cardBox!.y
      )
      expect(overlaps).toBe(false)
      expect(cardBox!.y).toBeLessThan(navigationBox!.y)
    }
  })

  test('fits all navigation and header actions at 320px', async ({ page }) => {
    await page.getByRole('button', { name: 'Skip tour' }).click()
    await page.setViewportSize({ width: 320, height: 720 })

    const viewportWidth = await page.evaluate(() => window.innerWidth)
    const tabs = page.locator('.nav-tab')
    await expect(tabs).toHaveCount(6)
    for (let index = 0; index < 6; index++) {
      const box = await tabs.nth(index).boundingBox()
      expect(box).not.toBeNull()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewportWidth)
      await expect(tabs.nth(index).locator('svg')).toBeVisible()
    }

    const bottomNavigationBox = await page.locator('.dashboard-navigation').boundingBox()
    const contentBottomPadding = await page.locator('.dashboard-content').evaluate(element =>
      Number.parseFloat(window.getComputedStyle(element).paddingBottom)
    )
    expect(bottomNavigationBox).not.toBeNull()
    expect(contentBottomPadding).toBeGreaterThanOrEqual(bottomNavigationBox!.height + 16)

    for (const buttonName of [
      /Unclaimed Rewards/,
      /Guild notifications/,
      'Open account menu',
    ]) {
      const button = page.getByRole('button', { name: buttonName })
      if (await button.count()) {
        const box = await button.boundingBox()
        expect(box).not.toBeNull()
        expect(box!.x).toBeGreaterThanOrEqual(0)
        expect(box!.x + box!.width).toBeLessThanOrEqual(viewportWidth)
      }
    }

    const headerControls = [
      page.getByRole('button', { name: /Unclaimed Rewards/ }),
      page.getByRole('button', { name: /Guild notifications/ }),
      page.getByRole('button', { name: 'Open account menu' }),
    ]
    const visibleControlBoxes = []
    for (const control of headerControls) {
      if (await control.count()) {
        const box = await control.boundingBox()
        if (box) visibleControlBoxes.push(box)
      }
    }
    const firstControl = visibleControlBoxes[0]
    for (const box of visibleControlBoxes.slice(1)) {
      expect(Math.abs(box.y - firstControl.y)).toBeLessThanOrEqual(1)
      expect(Math.abs(box.height - firstControl.height)).toBeLessThanOrEqual(1)
    }
    for (const control of headerControls.slice(0, 2)) {
      if (await control.count()) {
        const buttonBox = await control.boundingBox()
        const iconBox = await control.locator('svg').boundingBox()
        expect(buttonBox).not.toBeNull()
        expect(iconBox).not.toBeNull()
        const buttonCenterY = buttonBox!.y + buttonBox!.height / 2
        const iconCenterY = iconBox!.y + iconBox!.height / 2
        expect(Math.abs(iconCenterY - buttonCenterY)).toBeLessThanOrEqual(1)
      }
    }
    const avatarBox = await page.locator('.account-menu__avatar').boundingBox()
    const accountButtonBox = await page.getByRole('button', { name: 'Open account menu' }).boundingBox()
    expect(avatarBox).not.toBeNull()
    expect(accountButtonBox).not.toBeNull()
    expect(Math.abs(avatarBox!.y - accountButtonBox!.y)).toBeLessThanOrEqual(1)
    expect(Math.abs(avatarBox!.height - accountButtonBox!.height)).toBeLessThanOrEqual(1)

    await page.getByRole('button', { name: 'Open account menu' }).click()
    const menuAvatar = page.locator('.account-menu__identity > .account-menu__avatar')
    await expect(menuAvatar).toBeVisible()
    const menuAvatarStyles = await menuAvatar.evaluate(element => {
      const styles = window.getComputedStyle(element)
      return {
        display: styles.display,
        marginTop: styles.marginTop,
        fontSize: Number.parseFloat(styles.fontSize),
        color: styles.color,
      }
    })
    expect(menuAvatarStyles.display).toBe('grid')
    expect(menuAvatarStyles.marginTop).toBe('0px')
    expect(menuAvatarStyles.fontSize).toBeGreaterThan(0)
    expect(menuAvatarStyles.color).toBe('rgb(255, 255, 255)')
    await page.getByRole('button', { name: 'Open account menu' }).click()

    const badges = page.locator('.reward-badge, .guild-notification-count')
    for (let index = 0; index < await badges.count(); index++) {
      const badgeBox = await badges.nth(index).boundingBox()
      const buttonBox = await badges.nth(index).locator('xpath=..').boundingBox()
      expect(badgeBox).not.toBeNull()
      expect(buttonBox).not.toBeNull()
      expect(badgeBox!.x).toBeGreaterThanOrEqual(buttonBox!.x)
      expect(badgeBox!.y).toBeGreaterThanOrEqual(buttonBox!.y)
      expect(badgeBox!.x + badgeBox!.width).toBeLessThanOrEqual(buttonBox!.x + buttonBox!.width)
      expect(badgeBox!.y + badgeBox!.height).toBeLessThanOrEqual(buttonBox!.y + buttonBox!.height)
    }

    await page.getByRole('button', { name: /Unclaimed Rewards/ }).click()
    const rewardModal = page.locator('.reward-modal-content')
    await expect(rewardModal).toBeVisible()
    const modalBox = await rewardModal.boundingBox()
    const viewportHeight = await page.evaluate(() => window.innerHeight)
    expect(modalBox).not.toBeNull()
    expect(modalBox!.x).toBeGreaterThanOrEqual(16)
    expect(modalBox!.y).toBeGreaterThanOrEqual(16)
    expect(modalBox!.x + modalBox!.width).toBeLessThanOrEqual(viewportWidth - 16)
    expect(modalBox!.y + modalBox!.height).toBeLessThanOrEqual(viewportHeight - 16)

    await page.getByRole('button', { name: 'Close unclaimed rewards' }).click()
    await page.locator('.nav-tab').filter({ hasText: 'Tasks' }).click()
    const taskHeaderPadding = await page.locator('.tasks-header').evaluate(element => {
      const styles = window.getComputedStyle(element)
      return {
        top: Number.parseFloat(styles.paddingTop),
        right: Number.parseFloat(styles.paddingRight),
        bottom: Number.parseFloat(styles.paddingBottom),
        left: Number.parseFloat(styles.paddingLeft),
      }
    })
    for (const padding of Object.values(taskHeaderPadding)) {
      expect(padding).toBeGreaterThanOrEqual(16)
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewportWidth)
  })

  test('skip button dismisses tour and persists completion', async ({ page }) => {
    const card = page.getByRole('dialog')
    await expect(card).toBeVisible({ timeout: 10_000 })

    await page.getByRole('button', { name: 'Skip tour' }).click()
    await expect(card).toBeHidden()

    const flag = await page.evaluate(
      (userId) => window.localStorage.getItem(`gamifai_tour_completed_v2_${userId}`),
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

    // Reopen the guide from the account menu
    await page.getByRole('button', { name: 'Open account menu' }).click()
    await page.getByRole('menuitem', { name: /Replay the onboarding tour/i }).click()

    const card = page.getByRole('dialog')
    await expect(card).toBeVisible()
    await expect(card).toContainText(`Step 1 of ${TOUR_TOTAL_STEPS}`)
  })
})

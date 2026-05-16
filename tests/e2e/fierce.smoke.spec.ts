import { test, expect, Page } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'
import { TEST_USER } from './globalSetup'

// Smoke tests for the fierce UI feature flag.
// Verifies the flag toggles between old + new and that the new UI renders the
// big-impact pieces (logo, hero, subnav, etc.). Also captures screenshots so
// I can eyeball them after the run.

const SCREENS_DIR = path.join(process.cwd(), 'test-screenshots', 'fierce')
fs.mkdirSync(SCREENS_DIR, { recursive: true })

const BASE_URL = 'http://localhost:5173'

async function snap(page: Page, name: string) {
  const file = path.join(SCREENS_DIR, name + '.png')
  await page.screenshot({ path: file, fullPage: true })
}

async function enableFierce(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('gamifai-fierce-ui', '1')
  })
}

async function disableFierce(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('gamifai-fierce-ui', '0')
  })
}

test.describe('feature flag', () => {
  test('flag off → legacy UI renders, no .fierce-app on root', async ({ page }) => {
    await disableFierce(page)
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })

    // The legacy auth screen says "GAMIF.AI" or "Solo Leveling"-style copy.
    // We don't depend on exact copy — but the html should NOT have data-ui="fierce".
    const dataUi = await page.evaluate(() => document.documentElement.getAttribute('data-ui'))
    expect(dataUi).toBeNull()

    // .fierce-app shouldn't be in the DOM
    const fierceApp = await page.locator('.fierce-app').count()
    expect(fierceApp).toBe(0)

    await snap(page, '01-flag-off-auth')
  })

  test('flag on → fierce UI renders auth screen', async ({ page }) => {
    await enableFierce(page)
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })

    // data-ui="fierce" applied
    const dataUi = await page.evaluate(() => document.documentElement.getAttribute('data-ui'))
    expect(dataUi).toBe('fierce')

    // .fierce-app present
    await expect(page.locator('.fierce-app').first()).toBeVisible()

    // Brand mark + name are visible
    await expect(page.locator('.fierce-brand__mark').first()).toBeVisible()
    await expect(page.locator('.fierce-brand__name').first()).toContainText(/gamif\.ai/i)

    // Auth heading should be uppercase fierce copy ("Back to the grind" etc.)
    const heading = page.locator('.fierce-auth h1').first()
    await expect(heading).toBeVisible()

    await snap(page, '02-flag-on-auth')
  })

  test('?fierce=1 query param activates the flag', async ({ page }) => {
    await page.goto(BASE_URL + '/?fierce=1', { waitUntil: 'networkidle' })
    const dataUi = await page.evaluate(() => document.documentElement.getAttribute('data-ui'))
    expect(dataUi).toBe('fierce')

    const stored = await page.evaluate(() => window.localStorage.getItem('gamifai-fierce-ui'))
    expect(stored).toBe('1')
  })

  test('?fierce=0 query param turns the flag off', async ({ page }) => {
    await page.goto(BASE_URL + '/?fierce=0', { waitUntil: 'networkidle' })
    const dataUi = await page.evaluate(() => document.documentElement.getAttribute('data-ui'))
    expect(dataUi).toBeNull()
  })
})

test.describe('fierce auth screen pieces', () => {
  test.beforeEach(async ({ page }) => {
    await enableFierce(page)
  })

  test('register tab toggles to show name field', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })

    // Click register
    const registerBtn = page.getByRole('button', { name: /register/i }).first()
    await registerBtn.click()

    // The name field should be visible
    const nameInput = page.locator('#fa-name')
    await expect(nameInput).toBeVisible()

    // Confirm-password field should also appear
    await expect(page.locator('#fa-cpw')).toBeVisible()

    await snap(page, '03-fierce-register')
  })

  test('forgot password flow opens email step', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })

    // Should be on login tab by default — click "Forgot?"
    const forgot = page.getByRole('button', { name: /forgot/i })
    await forgot.click()

    await expect(page.locator('#ff-email')).toBeVisible()
    await snap(page, '04-fierce-forgot-email')
  })

  test('theme toggle FAB switches data-theme', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })

    const initial = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
    await page.locator('.fierce-theme-fab').click()

    await page.waitForTimeout(300)
    const after = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
    expect(after).not.toBe(initial)

    await snap(page, '05-fierce-theme-toggled')
  })
})

test.describe('mobile viewport', () => {
  test.use({ viewport: { width: 390, height: 760 } })

  test.beforeEach(async ({ page }) => {
    await enableFierce(page)
  })

  test('mobile auth screen renders without overflow', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })

    await expect(page.locator('.fierce-auth').first()).toBeVisible()

    // No horizontal overflow
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(2)

    await snap(page, 'mobile-01-auth')
  })
})

// ---------- Logged-in dashboard tests ----------

async function loginFierce(page: Page) {
  await enableFierce(page)
  await page.goto(BASE_URL, { waitUntil: 'networkidle' })

  // Fierce sign-in form
  await page.locator('#fa-email').fill(TEST_USER.email)
  await page.locator('#fa-pw').fill(TEST_USER.password)
  await page.getByRole('button', { name: /^enter\s*$/i }).first().click()

  // Wait for fierce dashboard hero (works on both desktop + mobile)
  await expect(page.locator('.fierce-hero').first()).toBeVisible({ timeout: 30_000 })
}

test.describe('fierce dashboard', () => {
  test('user can sign in and land on the fierce overview', async ({ page }) => {
    await loginFierce(page)

    // Subnav has 4 tabs
    const tabs = page.locator('.fierce-subnav__btn')
    await expect(tabs).toHaveCount(4)

    // Hero with title
    await expect(page.locator('.fierce-hero__title').first()).toBeVisible()
    await expect(page.locator('.fierce-hero__title').first()).toContainText(/now earn it/i)

    // Tier badge present
    await expect(page.locator('.fierce-tier').first()).toBeVisible()

    // Stat cells
    await expect(page.locator('.fierce-stat-cell').first()).toBeVisible()

    // Heatmap rendered (cells exist)
    const heatmapCells = await page.locator('.fierce-heatmap__cell').count()
    expect(heatmapCells).toBeGreaterThan(0)

    await snap(page, 'dash-01-overview')
  })

  test('switches to tasks tab and shows missions', async ({ page }) => {
    await loginFierce(page)

    await page.locator('.fierce-subnav__btn').nth(1).click()
    await expect(page.getByRole('heading', { name: /today's missions/i })).toBeVisible()
    await snap(page, 'dash-02-tasks')
  })

  test('switches to loadout tab', async ({ page }) => {
    await loginFierce(page)

    await page.locator('.fierce-subnav__btn').nth(2).click()
    await expect(page.getByRole('heading', { name: /your loadout/i })).toBeVisible()
    await snap(page, 'dash-03-loadout')
  })

  test('switches to vault tab', async ({ page }) => {
    await loginFierce(page)

    await page.locator('.fierce-subnav__btn').nth(3).click()
    await expect(page.getByRole('heading', { name: /spend what you've earned/i })).toBeVisible()
    // Wallet visible
    await expect(page.locator('.fierce-wallet').first()).toBeVisible()
    await snap(page, 'dash-04-vault')
  })

  test('add task modal opens from tasks tab', async ({ page }) => {
    await loginFierce(page)
    await page.locator('.fierce-subnav__btn').nth(1).click()

    await page.getByRole('button', { name: /add mission/i }).click()
    await expect(page.locator('.fierce-modal').first()).toBeVisible()
    await expect(page.locator('#ft-title')).toBeVisible()
    await snap(page, 'dash-05-task-modal')
  })

  test('rewards bell opens reward modal', async ({ page }) => {
    await loginFierce(page)

    await page.getByRole('button', { name: /unclaimed rewards/i }).first().click()
    await expect(page.locator('.fierce-modal').first()).toBeVisible()
    await snap(page, 'dash-06-reward-modal')
  })

  test('add reward modal opens from vault', async ({ page }) => {
    await loginFierce(page)
    await page.locator('.fierce-subnav__btn').nth(3).click()

    await page.getByRole('button', { name: /add reward/i }).first().click()
    await expect(page.locator('#fs-title')).toBeVisible()
    await snap(page, 'dash-07-add-reward-modal')
  })

  test('logout via avatar returns to fierce auth', async ({ page }) => {
    await loginFierce(page)

    await page.locator('.fierce-avatar').first().click()
    // Confirm the sign-out dialog
    await page.getByRole('button', { name: /^sign out$/i }).click()
    await expect(page.locator('.fierce-auth').first()).toBeVisible({ timeout: 15_000 })
  })
})

test.describe('fierce dashboard mobile', () => {
  test.use({ viewport: { width: 390, height: 760 } })

  test('bottom nav is visible and switches tabs on mobile', async ({ page }) => {
    await loginFierce(page)

    // Bottom nav should be visible
    await expect(page.locator('.fierce-bottomnav').first()).toBeVisible()
    // Subnav (desktop tabs) hidden
    await expect(page.locator('.fierce-subnav').first()).toBeHidden()

    // Hero collapses but still visible
    await expect(page.locator('.fierce-hero').first()).toBeVisible()
    await snap(page, 'mobile-02-overview')

    // Click Tasks tab via bottom nav
    await page.locator('.fierce-bottomnav__btn').nth(1).click()
    await expect(page.getByRole('heading', { name: /today's missions/i })).toBeVisible()
    await snap(page, 'mobile-03-tasks')

    // Loadout
    await page.locator('.fierce-bottomnav__btn').nth(2).click()
    await snap(page, 'mobile-04-loadout')

    // Vault
    await page.locator('.fierce-bottomnav__btn').nth(3).click()
    await expect(page.locator('.fierce-wallet').first()).toBeVisible()
    await snap(page, 'mobile-05-vault')
  })
})

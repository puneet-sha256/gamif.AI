import { test, expect } from '@playwright/test'
import {
  SHOP_USER,
  createDefaultCatalog,
  createGeneratedTasks,
  loginAs,
  seedUsers,
  suppressTour,
} from './fixtures'

test.describe('Shop and inventory flows', () => {
  test.beforeEach(() => {
    seedUsers([
      {
        ...SHOP_USER,
        profileData: {
          name: 'Shop Tester',
          dateOfBirth: '1994-07-14',
        },
        goalsData: {
          longTermGoals:
            'Stay active, keep learning deeply, and reward consistent progress with meaningful treats and consumable boosts.',
        },
        stats: {
          experience: 20,
          shards: 50,
          strength: 10,
          intelligence: 5,
          charisma: 5,
        },
        catalog: createDefaultCatalog(),
        generatedTasks: createGeneratedTasks(),
        shopItems: [
          {
            id: 'focus-potion',
            title: 'Focus Potion',
            description: 'A consumable reward for a deep-work session.',
            price: 15,
            image: '🧪',
            createdAt: '2026-09-16T08:00:00.000Z',
            isConsumable: true,
            allowMultiplePurchases: false,
          },
        ],
      },
    ])
  })

  test('purchases a shop item and then uses it from inventory', async ({ page }) => {
    await suppressTour(page, SHOP_USER.id)
    await loginAs(page, SHOP_USER)
    await expect(page.locator('.dashboard-container')).toBeVisible()

    await page.getByRole('button', { name: /Shop/ }).click()
    await expect(page.getByText('Focus Potion')).toBeVisible()
    await expect(page.getByText('50.00 💎 Shards')).toBeVisible()

    await page.getByTitle('Buy Focus Potion for 15.00 💎').click()
    await page.locator('.confirm-container .confirm-btn-primary').click()

    await expect(page.getByText('35.00 💎 Shards')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Your Shop is Empty')).toBeVisible()
    if (await page.locator('.alert-close').isVisible().catch(() => false)) {
      await page.locator('.alert-close').click()
    }

    await page.getByRole('button', { name: /Inventory/ }).click()
    await expect(page.getByText('Focus Potion')).toBeVisible()
    await expect(page.getByText('Owned: 1x')).toBeVisible()

    await page.getByTitle('Use Focus Potion').click()
    await page.locator('.confirm-container .confirm-btn-primary').click()

    await expect(page.getByText('Your Inventory is Empty')).toBeVisible({ timeout: 15_000 })
  })
})

import { test, expect } from '@playwright/test'
import {
  SHOP_USER,
  createDefaultCatalog,
  createGeneratedTasks,
  loginAs,
  seedUsers,
  suppressTour,
  successResponse,
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

  test('creates a linked wishlist item from fetched product details', async ({ page }) => {
    let submittedBody: Record<string, unknown> | undefined
    let previewBody: Record<string, unknown> | undefined
    await page.route('**/api/product/preview', async route => {
      previewBody = JSON.parse(route.request().postData() || '{}')
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(successResponse({
          message: 'Product details retrieved successfully',
          data: {
            title: 'Noise Cancelling Headphones',
            description: 'Wireless over-ear headphones',
            imageUrl: 'https://images.example.com/headphones.jpg',
            price: 2499,
            currency: 'INR',
            sourceUrl: 'https://www.amazon.in/example-headphones',
            sourceName: 'Amazon',
            fetchedAt: '2026-09-17T12:00:00.000Z',
            shardRate: 0.1,
            priceSource: 'live',
            shardPrice: 249.9,
          },
        })),
      })
    })
    await page.route('**/api/user/shop/add', async route => {
      submittedBody = JSON.parse(route.request().postData() || '{}')
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(successResponse({
          message: 'Shop item added successfully',
          data: { shopItems: [] },
        })),
      })
    })

    await suppressTour(page, SHOP_USER.id)
    await loginAs(page, SHOP_USER)
    await page.getByRole('button', { name: /Shop/ }).click()
    await page.getByRole('button', { name: '➕ Add Item' }).click()

    await page.getByLabel('Paste product link or full shared message *').fill([
      'Noise Cancelling Headphones',
      'Deal Price: ₹2,499',
      'https://www.amazon.in/example-headphones',
    ].join('\n'))
    await page.getByRole('button', { name: 'Fetch' }).click()

    await expect(page.getByText('Noise Cancelling Headphones')).toBeVisible()
    await expect(page.getByText('INR 2,499')).toBeVisible()
    await expect(page.getByText('× 0.1 = 249.90 💎 shards')).toBeVisible()
    await page.getByRole('button', { name: 'Add Linked Item' }).click()

    expect(previewBody?.url).toContain('Deal Price: ₹2,499')
    expect(submittedBody).toMatchObject({
      sourceUrl: 'https://www.amazon.in/example-headphones',
      title: 'Noise Cancelling Headphones',
      price: 249.9,
    })
    await expect(page.getByRole('heading', { name: 'Add Shop Item' })).toHaveCount(0)
  })

  test('renders linked product details and refreshes its price', async ({ page }) => {
    seedUsers([
      {
        ...SHOP_USER,
        profileData: { name: 'Shop Tester', dateOfBirth: '1994-07-14' },
        goalsData: {
          longTermGoals:
            'Stay active, keep learning deeply, and reward consistent progress with meaningful treats and consumable boosts.',
        },
        stats: {
          experience: 20,
          shards: 500,
          strength: 10,
          intelligence: 5,
          charisma: 5,
        },
        catalog: createDefaultCatalog(),
        generatedTasks: createGeneratedTasks(),
        shopItems: [{
          id: 'linked-headphones',
          title: 'Linked Headphones',
          description: 'Fetched product',
          price: 249.9,
          image: 'https://images.example.com/headphones.jpg',
          createdAt: '2026-09-17T12:00:00.000Z',
          sourceUrl: 'https://www.amazon.in/example-headphones',
          sourceName: 'Amazon',
          currency: 'INR',
          livePrice: 2499,
          priceFetchedAt: '2026-09-17T12:00:00.000Z',
          shardRate: 0.1,
        }],
      },
    ])
    let refreshCalls = 0
    await page.route('**/api/user/shop/refresh-price', async route => {
      refreshCalls += 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(successResponse({
          message: 'Product price refreshed successfully',
          data: { shopItems: [] },
        })),
      })
    })

    await suppressTour(page, SHOP_USER.id)
    await loginAs(page, SHOP_USER)
    await page.getByRole('button', { name: /Shop/ }).click()

    await expect(page.getByText('Linked Headphones')).toBeVisible()
    await expect(page.getByRole('link', { name: 'View on Amazon ↗' })).toHaveAttribute(
      'href',
      'https://www.amazon.in/example-headphones'
    )
    await expect(page.getByText(/INR 2,499/)).toBeVisible()
    await page.getByTitle('Refresh price for Linked Headphones').click()
    await expect.poll(() => refreshCalls).toBe(1)
  })

  test('keeps manual wishlist entry and rejects private product URLs', async ({ page, request }) => {
    await suppressTour(page, SHOP_USER.id)
    await loginAs(page, SHOP_USER)
    await page.getByRole('button', { name: /Shop/ }).click()
    await page.getByRole('button', { name: '➕ Add Item' }).click()
    await page.getByRole('button', { name: '✍️ Manual item' }).click()
    await expect(page.getByLabel('Item Name *')).toBeVisible()
    await expect(page.getByLabel('Price (Shards) *')).toBeVisible()

    const loginResponse = await request.post('http://localhost:3001/api/login', {
      data: { email: SHOP_USER.email, password: SHOP_USER.password },
    })
    const login = await loginResponse.json()
    const privateUrlResponse = await request.post('http://localhost:3001/api/product/preview', {
      data: { sessionId: login.sessionId, url: 'http://127.0.0.1:3001/api/health' },
    })
    expect(privateUrlResponse.status()).toBe(422)
  })

  test('preserves a blocked retailer link for manual completion', async ({ page }) => {
    let submittedBody: Record<string, unknown> | undefined
    await page.route('**/api/product/preview', async route => {
      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Retailer blocks automated price checks',
        }),
      })
    })
    await page.route('**/api/user/shop/add', async route => {
      submittedBody = JSON.parse(route.request().postData() || '{}')
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(successResponse({
          message: 'Shop item added successfully',
          data: { shopItems: [] },
        })),
      })
    })

    await suppressTour(page, SHOP_USER.id)
    await loginAs(page, SHOP_USER)
    await page.getByRole('button', { name: /Shop/ }).click()
    await page.getByRole('button', { name: '➕ Add Item' }).click()
    await page.getByLabel('Paste product link or full shared message *').fill(
      'https://www.meesho.com/blocked-product/p/abc123'
    )
    await page.getByRole('button', { name: 'Fetch' }).click()
    await expect(page.getByText(/keep this link and enter the details manually/i)).toBeVisible()
    await page.getByRole('button', { name: 'Keep link and enter details manually' }).click()
    await expect(page.getByText(/Product link saved/)).toBeVisible()

    await page.getByLabel('Item Name *').fill('Blocked Meesho Product')
    await page.getByLabel('Price (Shards) *').fill('42')
    await page.getByRole('button', { name: 'Add Item', exact: true }).click()

    expect(submittedBody).toMatchObject({
      title: 'Blocked Meesho Product',
      price: 42,
      referenceUrl: 'https://www.meesho.com/blocked-product/p/abc123',
    })
  })

  test('refreshes linked price before purchase confirmation', async ({ page }) => {
    seedUsers([{
      ...SHOP_USER,
      profileData: { name: 'Shop Tester', dateOfBirth: '1994-07-14' },
      goalsData: {
        longTermGoals:
          'Stay active, keep learning deeply, and reward consistent progress with meaningful treats and consumable boosts.',
      },
      stats: {
        experience: 20,
        shards: 500,
        strength: 10,
        intelligence: 5,
        charisma: 5,
      },
      catalog: createDefaultCatalog(),
      generatedTasks: createGeneratedTasks(),
      shopItems: [{
        id: 'live-linked-item',
        title: 'Live Linked Item',
        price: 250,
        image: '🎧',
        createdAt: '2026-09-17T12:00:00.000Z',
        sourceUrl: 'https://www.amazon.in/dp/example',
        sourceName: 'Amazon',
        currency: 'INR',
        livePrice: 2500,
        priceFetchedAt: '2026-09-17T12:00:00.000Z',
        shardRate: 0.1,
        priceSource: 'live',
      }],
    }])
    let buyBody: Record<string, unknown> | undefined
    await page.route('**/api/user/shop/refresh-price', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(successResponse({
          message: 'Product price refreshed successfully',
          data: {
            shopItems: [{
              id: 'live-linked-item',
              title: 'Live Linked Item',
              price: 199,
              createdAt: '2026-09-17T12:00:00.000Z',
            }],
          },
        })),
      })
    })
    await page.route('**/api/user/shop/buy', async route => {
      buyBody = JSON.parse(route.request().postData() || '{}')
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(successResponse({ message: 'Purchased' })),
      })
    })

    await suppressTour(page, SHOP_USER.id)
    await loginAs(page, SHOP_USER)
    await page.getByRole('button', { name: /Shop/ }).click()
    await page.getByTitle('Refresh price and buy Live Linked Item').click()
    await expect(page.locator('.confirm-container')).toContainText('199.00 💎')
    await page.locator('.confirm-container .confirm-btn-primary').click()
    await expect.poll(() => buyBody).toMatchObject({ itemPrice: 199 })
  })

  test('uses the stored wishlist cost instead of a client-supplied price', async ({ request }) => {
    const loginResponse = await request.post('http://localhost:3001/api/login', {
      data: { email: SHOP_USER.email, password: SHOP_USER.password },
    })
    const login = await loginResponse.json()
    const buyResponse = await request.post('http://localhost:3001/api/user/shop/buy', {
      data: {
        sessionId: login.sessionId,
        itemId: 'focus-potion',
        itemPrice: 1,
      },
    })
    expect(buyResponse.ok()).toBeTruthy()

    const userResponse = await request.get(
      `http://localhost:3001/api/user/session/${login.sessionId}`
    )
    const current = await userResponse.json()
    expect(current.user.stats.shards).toBe(35)
  })
})

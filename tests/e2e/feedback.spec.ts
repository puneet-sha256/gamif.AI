import { test, expect } from '@playwright/test'
import {
  AUTH_USER,
  loginAs,
  seedDefaultAppUser,
  successResponse,
  suppressTour,
} from './fixtures'

test.describe('Feedback flows', () => {
  async function openFeedback(page: import('@playwright/test').Page) {
    await page.getByRole('button', { name: 'Open account menu' }).click()
    await page.getByRole('menuitem', { name: /Send feedback/ }).click()
  }

  test.beforeEach(() => {
    seedDefaultAppUser(AUTH_USER, {
      profileData: {
        name: 'Feedback Tester',
        dateOfBirth: '1998-05-20',
      },
    })
  })

  test('submits a complete bug report with automatic diagnostics', async ({ page }) => {
    let submittedBody: Record<string, unknown> | undefined
    await page.route('**/api/feedback', async route => {
      submittedBody = JSON.parse(route.request().postData() || '{}')
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(successResponse({
          message: 'Thank you. Your feedback was sent successfully.',
          data: {
            reportId: 'GAM-20260917-ABCD1234',
            submittedAt: '2026-09-17T06:00:00.000Z',
          },
        })),
      })
    })

    await suppressTour(page, AUTH_USER.id)
    await loginAs(page, AUTH_USER)
    await openFeedback(page)

    await expect(page.getByRole('heading', {
      name: 'Report a bug or request a feature',
    })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Close feedback form' })).toBeFocused()
    await page.getByLabel('Title *').fill('Rewards modal does not close')
    await page.getByLabel('Category *').selectOption('Rewards & XP')
    await page.getByLabel('Severity *').selectOption('high')
    await page.getByLabel('What happened? *').fill(
      'The reward claim modal remains visible after the claim completes successfully.'
    )
    await page.getByLabel('Steps to reproduce *').fill(
      '1. Open rewards\n2. Claim all rewards\n3. Observe the modal'
    )
    await page.getByLabel('Expected behavior *').fill('The modal closes after a successful claim.')
    await page.getByLabel('Actual behavior *').fill('The modal remains open and blocks the dashboard.')
    await page.getByRole('button', { name: 'Send bug report' }).click()

    await expect(page.getByText('Feedback sent successfully. Reference: GAM-20260917-ABCD1234')).toBeVisible()
    expect(submittedBody).toMatchObject({
      type: 'bug',
      title: 'Rewards modal does not close',
      category: 'Rewards & XP',
      severity: 'high',
      contactAllowed: true,
    })
    expect(submittedBody?.sessionId).toEqual(expect.any(String))
    expect(submittedBody?.diagnostics).toMatchObject({
      pageUrl: expect.stringContaining('localhost'),
      userAgent: expect.any(String),
      viewport: expect.stringMatching(/^\d+x\d+$/),
      language: expect.any(String),
      platform: expect.any(String),
      timezone: expect.any(String),
    })
  })

  test('switches to a feature request and sends the relevant fields', async ({ page }) => {
    let submittedBody: Record<string, unknown> | undefined
    await page.route('**/api/feedback', async route => {
      submittedBody = JSON.parse(route.request().postData() || '{}')
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(successResponse({
          message: 'Thank you. Your feedback was sent successfully.',
          data: {
            reportId: 'GAM-20260917-EFGH5678',
            submittedAt: '2026-09-17T06:05:00.000Z',
          },
        })),
      })
    })

    await suppressTour(page, AUTH_USER.id)
    await loginAs(page, AUTH_USER)
    await openFeedback(page)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Open account menu' })).toBeFocused()
    await openFeedback(page)
    await page.getByRole('button', { name: '✨ Feature request' }).click()

    await expect(page.getByLabel('Severity *')).toHaveCount(0)
    await page.getByLabel('Title *').fill('Add calendar reminders')
    await page.getByLabel('Category *').selectOption('Tasks & AI')
    await page.getByLabel('What problem should this feature solve? *').fill(
      'Players need reminders before planned activities so they do not miss daily goals.'
    )
    await page.getByLabel('Who benefits and how? *').fill(
      'Busy players can schedule their commitments and maintain consistent routines.'
    )
    await page.getByLabel('Suggested solution (optional)').fill(
      'Allow tasks to be exported to Outlook or Google Calendar.'
    )
    await page.getByLabel('You may contact me at my account email for clarification.').uncheck()
    await page.getByRole('button', { name: 'Send feature request' }).click()

    await expect(page.getByText('Feedback sent successfully. Reference: GAM-20260917-EFGH5678')).toBeVisible()
    expect(submittedBody).toMatchObject({
      type: 'feature',
      title: 'Add calendar reminders',
      category: 'Tasks & AI',
      userBenefit: expect.stringContaining('Busy players'),
      proposedSolution: expect.stringContaining('Outlook'),
      contactAllowed: false,
    })
    expect(submittedBody).not.toHaveProperty('severity')
  })

  test('rejects malformed or unauthenticated feedback before email delivery', async ({ request }) => {
    const malformed = await request.post('http://localhost:3001/api/feedback', {
      data: { type: 'bug' },
    })
    expect(malformed.status()).toBe(400)

    const unauthenticated = await request.post('http://localhost:3001/api/feedback', {
      data: {
        sessionId: 'missing-session',
        type: 'feature',
        title: 'A valid feature title',
        description: 'A sufficiently detailed problem description for validation.',
        category: 'Other',
        userBenefit: 'This would benefit players in a clear and measurable way.',
        contactAllowed: false,
        diagnostics: {
          pageUrl: 'http://localhost:5173',
          userAgent: 'E2E test',
          viewport: '1280x800',
          language: 'en-US',
          platform: 'test',
          timezone: 'UTC',
        },
      },
    })
    expect(unauthenticated.status()).toBe(401)
  })
})

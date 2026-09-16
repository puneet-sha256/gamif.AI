import { test, expect } from '@playwright/test'
import {
  AUTH_USER,
  fillOtpInputs,
  loginAs,
  seedDefaultAppUser,
  successResponse,
  suppressTour,
} from './fixtures'

test.describe('Authentication flows', () => {
  test.beforeEach(() => {
    seedDefaultAppUser(AUTH_USER, {
      profileData: {
        name: 'Auth Tester',
        dateOfBirth: '1998-05-20',
      },
      goalsData: {
        longTermGoals:
          'Build consistent fitness routines, deepen frontend engineering expertise, and become a calmer, clearer communicator in collaborative settings.',
      },
    })
  })

  test('logs in successfully with a seeded user', async ({ page }) => {
    await suppressTour(page, AUTH_USER.id)
    await loginAs(page, AUTH_USER)

    await expect(page.locator('.dashboard-container')).toBeVisible()
    await expect(page.locator('.profile-details')).toContainText('Auth Tester')
  })

  test('shows an error for a wrong password', async ({ page }) => {
    await suppressTour(page, AUTH_USER.id)
    await page.goto('/')
    await page.locator('input#email').fill(AUTH_USER.email)
    await page.locator('input#password').fill('WrongPass123!')
    await page.getByRole('button', { name: 'Enter System' }).click()

    await expect(page.getByText('Invalid email or password')).toBeVisible()
    await expect(page.locator('.dashboard-container')).toHaveCount(0)
  })

  test('shows an error for an unknown email', async ({ page }) => {
    await suppressTour(page, AUTH_USER.id)
    await page.goto('/')
    await page.locator('input#email').fill('missing-player@example.com')
    await page.locator('input#password').fill('Missing123!')
    await page.getByRole('button', { name: 'Enter System' }).click()

    await expect(page.getByText('Player not found in the system')).toBeVisible()
  })

  test('validates registration client-side before calling the backend', async ({ page }) => {
    let sendOtpCalls = 0

    await page.route('**/api/auth/send-otp', async route => {
      sendOtpCalls += 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(successResponse({ message: 'Verification code sent to your email' })),
      })
    })

    await suppressTour(page, AUTH_USER.id)
    await page.goto('/')
    await page.getByRole('button', { name: 'Register', exact: true }).click()

    await page.locator('input#username').fill('New Tester')
    await page.locator('input#email').fill('invalid-email')
    await page.locator('input#password').fill('StrongPass123!')
    await page.locator('input#confirmPassword').fill('StrongPass123!')
    await page.getByRole('button', { name: 'Register Player' }).click()

    const emailValidity = await page.locator('input#email').evaluate(input => ({
      valid: (input as HTMLInputElement).validity.valid,
      typeMismatch: (input as HTMLInputElement).validity.typeMismatch,
      message: (input as HTMLInputElement).validationMessage,
    }))

    expect(emailValidity.valid).toBe(false)
    expect(emailValidity.typeMismatch).toBe(true)
    expect(emailValidity.message.length).toBeGreaterThan(0)
    expect(sendOtpCalls).toBe(0)

    await page.locator('input#email').fill('new-player@example.com')
    await page.locator('input#password').fill('12345')
    await page.locator('input#confirmPassword').fill('12345')
    await page.getByRole('button', { name: 'Register Player' }).click()
    await expect(page.getByText('Password must be at least 6 characters long')).toBeVisible()
    expect(sendOtpCalls).toBe(0)

    await page.locator('input#password').fill('StrongPass123!')
    await page.locator('input#confirmPassword').fill('DifferentPass123!')
    await page.getByRole('button', { name: 'Register Player' }).click()
    await expect(page.getByText('Passwords do not match')).toBeVisible()
    expect(sendOtpCalls).toBe(0)
  })

  test('reaches the registration OTP step when send-otp succeeds', async ({ page }) => {
    await page.route('**/api/auth/send-otp', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(successResponse({ message: 'Verification code sent to your email' })),
      })
    })

    await suppressTour(page, AUTH_USER.id)
    await page.goto('/')
    await page.getByRole('button', { name: 'Register', exact: true }).click()
    await page.locator('input#username').fill('Fresh Player')
    await page.locator('input#email').fill('fresh-player@example.com')
    await page.locator('input#password').fill('FreshPass123!')
    await page.locator('input#confirmPassword').fill('FreshPass123!')
    await page.getByRole('button', { name: 'Register Player' }).click()

    await expect(page.getByText('Verification code sent to your email')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Verify & Register' })).toBeVisible()
    await expect(page.locator('.otp-input')).toHaveCount(6)
    await expect(page.getByText('Enter the 6-digit code sent to')).toBeVisible()
  })

  test('walks through the forgot-password UI with mocked OTP endpoints', async ({ page }) => {
    await page.route('**/api/auth/forgot-password/send-otp', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(successResponse({ message: 'Password reset code sent to your email' })),
      })
    })

    await page.route('**/api/auth/forgot-password/verify-otp', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(successResponse({ message: 'Verification code is valid' })),
      })
    })

    await page.route('**/api/auth/forgot-password/reset', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(successResponse({ message: 'Password reset successfully! You can now log in with your new password' })),
      })
    })

    await suppressTour(page, AUTH_USER.id)
    await page.goto('/')
    await page.getByRole('button', { name: 'Forgot Password?' }).click()

    await expect(page.getByText('Enter your email to receive a password reset code')).toBeVisible()
    await page.locator('input#forgot-email').fill(AUTH_USER.email)
    await page.getByRole('button', { name: 'Send Reset Code' }).click()

    await expect(page.getByText('Password reset code sent to your email')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Verify Code' })).toBeVisible()
    await expect(page.locator('.otp-input')).toHaveCount(6)

    await fillOtpInputs(page, '123456')
    await page.getByRole('button', { name: 'Verify Code' }).click()

    await expect(page.getByText('Code verified! Enter your new password.')).toBeVisible()
    await expect(page.locator('input#new-password')).toBeVisible()
    await expect(page.locator('input#confirm-new-password')).toBeVisible()

    await page.locator('input#new-password').fill('UpdatedPass123!')
    await page.locator('input#confirm-new-password').fill('UpdatedPass123!')
    await page.getByRole('button', { name: 'Reset Password' }).click()

    await expect(page.getByText('Password reset! You can now log in.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Enter System' })).toBeVisible()
  })

  test('logs out back to the auth screen', async ({ page }) => {
    await suppressTour(page, AUTH_USER.id)
    await loginAs(page, AUTH_USER)
    await expect(page.locator('.dashboard-container')).toBeVisible()

    await page.getByRole('button', { name: 'Logout' }).click()

    await expect(page.locator('input#email')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Enter System' })).toBeVisible()
    await expect(page.locator('.dashboard-container')).toHaveCount(0)
  })
})

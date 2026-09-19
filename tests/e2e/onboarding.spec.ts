import { test, expect } from '@playwright/test'
import {
  ONBOARDING_USER,
  createDefaultCatalog,
  createSeedUser,
  dismissTourIfPresent,
  loginAs,
  sanitizeUser,
  seedUsers,
  successResponse,
} from './fixtures'

const ONBOARDING_GOALS =
  'Build a sustainable strength-training routine, deepen my React and TypeScript skills with deliberate practice, and become much more confident speaking up in group discussions.'

test.describe('Onboarding flow', () => {
  test.beforeEach(() => {
    seedUsers([
      {
        ...ONBOARDING_USER,
        stats: {
          experience: 0,
          shards: 0,
          strength: 0,
          intelligence: 0,
          charisma: 0,
        },
      },
    ])
  })

  test('takes a fresh user through profile setup, goals setup, intake calibration, and onto the dashboard', async ({ page }) => {
    let catalogConfirmed = false

    const dashboardUser = createSeedUser({
      ...ONBOARDING_USER,
      profileData: {
        name: 'Fresh Hero',
        dateOfBirth: '1999-08-16',
      },
      goalsData: {
        longTermGoals: ONBOARDING_GOALS,
      },
      catalog: createDefaultCatalog(),
    })

    await page.route('**/api/user/session/*', async route => {
      if (!catalogConfirmed) {
        await route.fallback()
        return
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          successResponse({
            message: 'User data retrieved successfully',
            user: sanitizeUser(dashboardUser),
          })
        ),
      })
    })

    await page.route('**/api/ai/intake/generate-questions', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          successResponse({
            message: 'Intake questions generated',
            data: {
              cards: [
                {
                  id: 'goal-0-q1',
                  goal_id: 'goal-0',
                  question: 'How challenging are full-body gym sessions for you right now?',
                  options: [
                    { value: 'moderate', label: 'Manageable with focus' },
                    { value: 'hard', label: 'Pretty challenging' },
                  ],
                  free_text_placeholder: 'Add workout details if useful',
                },
                {
                  id: 'goal-1-q1',
                  goal_id: 'goal-1',
                  question: 'How hard is focused TypeScript study for you today?',
                  options: [
                    { value: 'focused', label: 'Focused study feels good' },
                    { value: 'deep', label: 'Deep study is still hard' },
                  ],
                  free_text_placeholder: 'Mention how you usually study',
                },
                {
                  id: 'goal-2-q1',
                  goal_id: 'goal-2',
                  question: 'How difficult is speaking up with unfamiliar groups?',
                  options: [
                    { value: 'small_group', label: 'Small groups are manageable' },
                    { value: 'unfamiliar_audience', label: 'New groups still feel tough' },
                  ],
                  free_text_placeholder: 'Describe your speaking comfort level',
                },
              ],
            },
          })
        ),
      })
    })

    await page.route('**/api/ai/intake/submit', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          successResponse({
            message: 'Intake submitted; catalog generated',
            data: {
              catalog: dashboardUser.catalog,
              summary: [
                {
                  signature: 'workout_session|Strength|moderate',
                  display_label: 'Moderate workouts',
                  difficulty: 3,
                  difficulty_label: 'Moderate',
                },
                {
                  signature: 'deep_study|Intelligence|deep',
                  display_label: 'Deep study sessions',
                  difficulty: 4,
                  difficulty_label: 'Challenging',
                },
                {
                  signature: 'presentation|Charisma|small_group',
                  display_label: 'Speaking in small groups',
                  difficulty: 3,
                  difficulty_label: 'Moderate',
                },
              ],
            },
          })
        ),
      })
    })

    await page.route('**/api/ai/intake/confirm', async route => {
      catalogConfirmed = true
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          successResponse({
            message: 'Intake confirmed',
            data: {
              catalog: dashboardUser.catalog,
            },
          })
        ),
      })
    })

    await loginAs(page, ONBOARDING_USER)

    await expect(page.getByText('PROFILE SETUP')).toBeVisible()
    await page.locator('input#name').fill('Fresh Hero')
    await page.locator('#dob-setup-year').selectOption('1999')
    await page.locator('#dob-setup-month').selectOption('08')
    await page.locator('#dob-setup-day').selectOption('16')
    await page.getByRole('button', { name: 'Continue to goals' }).click()

    await expect(page.getByText('GOAL SETUP')).toBeVisible()

    const submitButton = page.getByRole('button', { name: 'Continue to personalisation' })
    await page.locator('textarea.goal-textarea').fill(' '.repeat(60))
    await expect(submitButton).toBeDisabled()

    await page.locator('textarea.goal-textarea').fill(ONBOARDING_GOALS)
    await expect(submitButton).toBeEnabled()
    await submitButton.click()

    await expect(page.getByText('Personalise your rewards')).toBeVisible({ timeout: 20_000 })
    await dismissTourIfPresent(page)
    await page.getByRole('button', { name: 'Begin →' }).click()

    await expect(page.getByText('1 of 3')).toBeVisible()
    await page.locator('.intake-option').first().click()
    await page.getByRole('button', { name: 'Next →' }).click()

    await expect(page.getByText('2 of 3')).toBeVisible()
    await page.locator('.intake-option').first().click()
    await page.getByRole('button', { name: 'Next →' }).click()

    await expect(page.getByText('3 of 3')).toBeVisible()
    await page.locator('.intake-option').first().click()
    await page.getByRole('button', { name: 'Submit →' }).click()

    await expect(page.getByText("Here's what we understood")).toBeVisible()
    await expect(page.getByText('Moderate workouts')).toBeVisible()
    await page.getByRole('button', { name: 'Confirm →' }).click()

    await expect(page.locator('.dashboard-container')).toBeVisible()
    await expect(page.locator('.profile-details')).toContainText('Fresh Hero')
    await expect(page.getByText('Personalise your rewards')).toHaveCount(0)
  })
})

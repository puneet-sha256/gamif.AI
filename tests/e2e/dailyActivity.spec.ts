import { test, expect } from '@playwright/test'
import {
  DAILY_ACTIVITY_USER,
  createDefaultCatalog,
  createGeneratedTasks,
  loginAs,
  seedUsers,
  successResponse,
  suppressTour,
} from './fixtures'

test.describe('Daily activity analysis flow', () => {
  test.beforeEach(() => {
    seedUsers([
      {
        ...DAILY_ACTIVITY_USER,
        profileData: {
          name: 'Daily Analyst',
          dateOfBirth: '1995-11-09',
        },
        goalsData: {
          longTermGoals:
            'Train consistently, keep improving my engineering craft through focused study, and communicate ideas with more clarity and confidence.',
        },
        stats: {
          experience: 40,
          shards: 10,
          strength: 20,
          intelligence: 10,
          charisma: 10,
        },
        catalog: createDefaultCatalog(),
        generatedTasks: createGeneratedTasks({
          Strength: [
            {
              id: 'daily-strength-task',
              title: 'Workout Block',
              description: 'Complete a 30-minute strength workout.',
              expected_duration_minutes: 30,
              xp: 20,
              shards: 5,
            },
          ],
          Intelligence: [
            {
              id: 'daily-int-task',
              title: 'Study Block',
              description: 'Do a focused coding or study session.',
              expected_duration_minutes: 45,
              xp: 16,
              shards: 3,
            },
          ],
        }),
      },
    ])
  })

  test('analyzes daily activities with mocked AI and claims rewards through the real backend', async ({ page }) => {
    let rewardsPending = false

    const mockedRewards = {
      activities: [
        {
          activityName: 'Completed my workout block',
          matchType: 'goal-exact',
          category: 'Strength',
          matchedTask: 'Workout Block',
          effortRatio: 1.2,
          xpEarned: 20,
          shardsEarned: 5,
          calculationNotes: '0.4 × 30 min × 1.2 (goal-exact) = 20 XP',
          timestamp: '2026-09-16T10:00:00.000Z',
          activityDate: '2026-09-16',
          signature: 'workout_session|Strength|moderate',
          tier: 'goal-exact',
          tierMultiplier: 1.2,
          systemVersion: 'v2',
          rateBreakdown: {
            rate: 0.4,
            value: 30,
            unit: 'time',
          },
        },
        {
          activityName: 'Finished a focused TypeScript study block',
          matchType: 'goal-similar',
          category: 'Intelligence',
          matchedTask: 'Study Block',
          effortRatio: 1.1,
          xpEarned: 16,
          shardsEarned: 3,
          calculationNotes: '0.32 × 45 min × 1.1 (goal-similar) = 16 XP',
          timestamp: '2026-09-16T10:10:00.000Z',
          activityDate: '2026-09-16',
          signature: 'deep_study|Intelligence|focused',
          tier: 'goal-similar',
          tierMultiplier: 1.1,
          systemVersion: 'v2',
          rateBreakdown: {
            rate: 0.32,
            value: 45,
            unit: 'time',
          },
        },
      ],
      totalXP: 36,
      totalShards: 8,
      categoryBreakdown: {
        Strength: { xp: 20, shards: 5 },
        Intelligence: { xp: 16, shards: 3 },
        Charisma: { xp: 0, shards: 0 },
      },
      lastUpdated: '2026-09-16T10:10:00.000Z',
    }

    await page.route('**/api/ai/analyze-activity', async route => {
      rewardsPending = true
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          successResponse({
            message: 'Daily activity analyzed successfully',
            data: {
              matches: [
                {
                  name: 'Completed my workout block',
                  match_type: 'goal-exact',
                  matched_task: 'Workout Block',
                  category: 'Strength',
                  goal_link: null,
                  similarity_score: null,
                  alignment_factor: null,
                  effort_ratio: 1.2,
                  notes: 'Matched planned workout',
                },
                {
                  name: 'Finished a focused TypeScript study block',
                  match_type: 'goal-similar',
                  matched_task: 'Study Block',
                  category: 'Intelligence',
                  goal_link: null,
                  similarity_score: null,
                  alignment_factor: null,
                  effort_ratio: 1.1,
                  notes: 'Aligned with study goal',
                },
              ],
              rewards: {
                totalXP: mockedRewards.totalXP,
                totalShards: mockedRewards.totalShards,
                categoryBreakdown: mockedRewards.categoryBreakdown,
                activityRewards: mockedRewards.activities,
                skippedActivities: [],
                processedCount: 2,
                skippedCount: 0,
              },
              rawResponse: JSON.stringify({ activities: mockedRewards.activities }),
              processingTime: 42,
            },
            metadata: {
              processingTime: 42,
              agentUsed: 'azure-openai-foundry-v2',
            },
          })
        ),
      })
    })

    await page.route('**/api/user/session/*', async route => {
      const response = await route.fetch()
      const body = await response.json()

      if (rewardsPending && body?.user) {
        body.user.unclaimedRewards = mockedRewards
      }

      await route.fulfill({
        response,
        contentType: 'application/json',
        body: JSON.stringify(body),
      })
    })

    await page.route(`**/api/user/${DAILY_ACTIVITY_USER.id}`, async route => {
      const rawBody = route.request().postData() || '{}'
      const requestBody = JSON.parse(rawBody)

      if (requestBody.unclaimedRewards === null) {
        rewardsPending = false
      }

      await route.fallback()
    })

    await suppressTour(page, DAILY_ACTIVITY_USER.id)
    await loginAs(page, DAILY_ACTIVITY_USER)
    await expect(page.locator('.dashboard-container')).toBeVisible()

    await page.getByRole('button', { name: /Tasks/ }).click()
    await page.getByRole('button', { name: 'Log Daily Activities' }).click()

    await expect(page.getByText('Daily Activity Analysis')).toBeVisible()
    await page.locator('textarea.activity-input-modal').fill(
      'I completed my workout block and finished a focused TypeScript study block today.'
    )
    await page.getByRole('button', { name: 'Analyze & Earn XP' }).click()

    await expect(page.locator('.reward-badge')).toHaveText('2', { timeout: 15_000 })

    await page.locator('.unclaimed-rewards-button').click()
    await expect(page.getByText('Completed my workout block')).toBeVisible()
    await expect(page.getByText('Finished a focused TypeScript study block')).toBeVisible()
    await expect(page.getByText('+36')).toBeVisible()
    await expect(page.getByText('+8.00')).toBeVisible()

    await page.getByRole('button', { name: 'Claim All Rewards' }).click()

    await expect(page.locator('.reward-badge')).toHaveCount(0, { timeout: 15_000 })
    if (await page.locator('.alert-close').isVisible().catch(() => false)) {
      await page.locator('.alert-close').click()
    }
    await page.getByRole('button', { name: /Profile/ }).click()
    await expect(page.locator('.player-stats-section')).toContainText('18.00')
    await expect(page.locator('.experience-card')).toContainText('76')
  })
})

import { test, expect } from '@playwright/test'
import {
  AUTO_TASKS_USER,
  TASKS_USER,
  createDefaultCatalog,
  createGeneratedTasks,
  createSeedUser,
  loginAs,
  sanitizeUser,
  seedUsers,
  successResponse,
  suppressTour,
} from './fixtures'

const HISTORY_DATE = '2026-09-15'

test.describe('Task flows', () => {
  test.beforeEach(() => {
    seedUsers([
      {
        ...TASKS_USER,
        profileData: {
          name: 'Task Tester',
          dateOfBirth: '1997-04-03',
        },
        goalsData: {
          longTermGoals:
            'Build stronger workout consistency, sharpen TypeScript problem-solving skills, and become a more confident communicator during team discussions.',
        },
        stats: {
          experience: 90,
          shards: 12,
          strength: 30,
          intelligence: 30,
          charisma: 30,
        },
        catalog: createDefaultCatalog(),
        generatedTasks: createGeneratedTasks({
          Strength: [
            {
              id: 'task-strength-1',
              title: 'Gym Session',
              description: 'Complete a focused 30-minute full-body strength workout.',
              expected_duration_minutes: 30,
              xp: 25,
              shards: 5,
            },
          ],
          Intelligence: [
            {
              id: 'task-intelligence-1',
              title: 'TypeScript Deep Dive',
              description: 'Work through an advanced TypeScript exercise set and note what you learn.',
              expected_duration_minutes: 40,
              xp: 30,
              shards: 6,
            },
          ],
          Charisma: [
            {
              id: 'task-charisma-1',
              title: 'Speaking Practice',
              description: 'Practice explaining a technical concept out loud for five minutes.',
              expected_duration_minutes: 15,
              xp: 20,
              shards: 4,
            },
          ],
        }),
        unclaimedRewards: {
          activities: [
            {
              activityName: 'Completed my gym session',
              matchType: 'goal-exact',
              category: 'Strength',
              matchedTask: 'Gym Session',
              effortRatio: 1.2,
              xpEarned: 25,
              shardsEarned: 5,
              calculationNotes: 'flat 25 × 1.0 = 25 XP',
              timestamp: '2026-09-15T12:00:00.000Z',
              activityDate: HISTORY_DATE,
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
          ],
          totalXP: 25,
          totalShards: 5,
          categoryBreakdown: {
            Strength: { xp: 25, shards: 5 },
            Intelligence: { xp: 0, shards: 0 },
            Charisma: { xp: 0, shards: 0 },
          },
          lastUpdated: '2026-09-15T12:00:00.000Z',
        },
        activityHistory: {
          dailyActivities: [
            {
              date: HISTORY_DATE,
              strength: 25,
              intelligence: 0,
              charisma: 0,
              total: 25,
            },
          ],
          lastUpdated: '2026-09-15T12:00:00.000Z',
        },
        taskHistory: {
          dailyTasks: [
            {
              date: HISTORY_DATE,
              tasks: [
                {
                  activityName: 'Completed my gym session',
                  matchType: 'goal-exact',
                  category: 'Strength',
                  matchedTask: 'Gym Session',
                  effortRatio: 1.2,
                  xpEarned: 25,
                  shardsEarned: 5,
                  calculationNotes: 'flat 25 × 1.0 = 25 XP',
                  timestamp: '2026-09-15T12:00:00.000Z',
                },
              ],
            },
          ],
          lastUpdated: '2026-09-15T12:00:00.000Z',
        },
      },
    ])
  })

  test('shows seeded tasks and lets the user claim a seeded task reward', async ({ page }) => {
    await suppressTour(page, TASKS_USER.id)
    await loginAs(page, TASKS_USER)
    await expect(page.locator('.dashboard-container')).toBeVisible()

    await page.getByRole('button', { name: /Tasks/ }).click()
    await expect(page.getByText('Gym Session: Complete a focused 30-minute full-body strength workout.')).toBeVisible()
    await expect(page.getByText('TypeScript Deep Dive: Work through an advanced TypeScript exercise set and note what you learn.')).toBeVisible()
    await expect(page.getByText('Speaking Practice: Practice explaining a technical concept out loud for five minutes.')).toBeVisible()

    await page.locator('.unclaimed-rewards-button').click()
    await expect(page.getByText('Completed my gym session')).toBeVisible()
    await page.locator('.activity-claim-btn').click()

    await expect(page.getByText('No unclaimed rewards yet!')).toBeVisible({ timeout: 15_000 })
    await page.locator('.reward-modal-close').click()
    if (await page.locator('.alert-close').isVisible().catch(() => false)) {
      await page.locator('.alert-close').click()
    }
    await page.getByRole('button', { name: /Profile/ }).click()
    await expect(page.getByText('Level 2')).toBeVisible()
    await expect(page.locator('.player-stats-section')).toContainText('17.00')
  })

  test('opens the task history modal from the activity heatmap', async ({ page }) => {
    await suppressTour(page, TASKS_USER.id)
    await loginAs(page, TASKS_USER)
    await expect(page.locator('.dashboard-container')).toBeVisible()

    await page.locator(`.heatmap-cell[title*="Sep 15, 2026"]`).click()

    await expect(page.getByText('Activity History')).toBeVisible()
    await expect(page.getByText('Completed my gym session')).toBeVisible()
    await expect(page.getByText('Matched Task:')).toBeVisible()
    await expect(page.getByText('Matched Task: Gym Session')).toBeVisible()
    await expect(page.getByText('Total XP Earned')).toBeVisible()
    await expect(page.locator('.summary-value.xp-value')).toHaveText('25')
  })

  test('auto-generates tasks on dashboard load when a cataloged user has goals but no tasks', async ({ page }) => {
    let generatedTasksAvailable = false

    const generatedTasks = createGeneratedTasks({
      Strength: [
        {
          id: 'generated-strength-1',
          title: 'Mobility Circuit',
          description: 'Complete a 20-minute mobility and bodyweight strength circuit.',
          expected_duration_minutes: 20,
          xp: 18,
          shards: 4.5,
        },
      ],
      Intelligence: [
        {
          id: 'generated-intelligence-1',
          title: 'Algorithm Review',
          description: 'Review a data-structures topic and solve two focused practice problems.',
          expected_duration_minutes: 35,
          xp: 28,
          shards: 6,
        },
      ],
      Charisma: [
        {
          id: 'generated-charisma-1',
          title: 'Conversation Drill',
          description: 'Practice a short explanation of your current project with a confident delivery.',
          expected_duration_minutes: 10,
          xp: 14,
          shards: 3.5,
        },
      ],
    })

    const refreshedUser = createSeedUser({
      ...AUTO_TASKS_USER,
      profileData: {
        name: 'Auto Task Tester',
        dateOfBirth: '1996-02-11',
      },
      goalsData: {
        longTermGoals:
          'Build stronger movement habits, expand engineering depth with daily study, and communicate more clearly and confidently every day.',
      },
      stats: {
        experience: 0,
        shards: 0,
        strength: 0,
        intelligence: 0,
        charisma: 0,
      },
      catalog: createDefaultCatalog(),
      generatedTasks,
    })

    seedUsers([
      {
        ...AUTO_TASKS_USER,
        profileData: refreshedUser.profileData,
        goalsData: refreshedUser.goalsData,
        stats: refreshedUser.stats,
        catalog: refreshedUser.catalog,
      },
    ])

    await page.route('**/api/ai/generate-tasks', async route => {
      generatedTasksAvailable = true
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          successResponse({
            message: 'Tasks generated successfully',
            data: {
              generatedTasks,
              rawResponse: JSON.stringify(generatedTasks),
            },
          })
        ),
      })
    })

    await page.route('**/api/user/session/*', async route => {
      if (!generatedTasksAvailable) {
        await route.fallback()
        return
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          successResponse({
            message: 'User data retrieved successfully',
            user: sanitizeUser(refreshedUser),
          })
        ),
      })
    })

    await suppressTour(page, AUTO_TASKS_USER.id)
    await loginAs(page, AUTO_TASKS_USER)
    await page.getByRole('button', { name: /Tasks/ }).click()

    await expect(page.getByText('Mobility Circuit: Complete a 20-minute mobility and bodyweight strength circuit.')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Algorithm Review: Review a data-structures topic and solve two focused practice problems.')).toBeVisible()
    await expect(page.getByText('Conversation Drill: Practice a short explanation of your current project with a confident delivery.')).toBeVisible()
  })
})

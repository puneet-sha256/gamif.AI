import { test, expect } from '@playwright/test'
import {
  createDefaultCatalog,
  createGeneratedTasks,
  loginAs,
  seedUsers,
  suppressTour,
} from './fixtures'

const LEADER = {
  id: 'progression-leader-id',
  username: 'progressionleader',
  email: 'progression-leader@example.com',
  password: 'Progression123!',
}

const ALLY = {
  id: 'progression-ally-id',
  username: 'progressionally',
  email: 'progression-ally@example.com',
  password: 'Progression123!',
}

const SCOUT = {
  id: 'progression-scout-id',
  username: 'progressionscout',
  email: 'progression-scout@example.com',
  password: 'Progression123!',
}

const TARGET = {
  id: 'progression-target-id',
  username: 'progressiontarget',
  email: 'progression-target@example.com',
  password: 'Progression123!',
}

const LEVEL_FIVE_PLAYER = {
  id: 'level-five-player-id',
  username: 'levelfiveplayer',
  email: 'level-five@example.com',
  password: 'Progression123!',
}

test.describe('Journey and Guild flows', () => {
  test.beforeEach(() => {
    const today = new Date().toISOString().split('T')[0]
    seedUsers([
      {
        ...LEADER,
        profileData: { name: 'Progression Leader', dateOfBirth: '1993-06-10' },
        goalsData: {
          longTermGoals:
            'Build a consistent training practice, improve engineering depth, and develop confident leadership habits.',
        },
        stats: {
          experience: 900,
          shards: 20,
          strength: 400,
          intelligence: 300,
          charisma: 200,
        },
        catalog: createDefaultCatalog(),
        generatedTasks: createGeneratedTasks(),
        activityHistory: {
          dailyActivities: [
            {
              date: today,
              strength: 40,
              intelligence: 30,
              charisma: 20,
              total: 90,
            },
          ],
          lastUpdated: new Date().toISOString(),
        },
      },
      {
        ...ALLY,
        profileData: { name: 'Progression Ally', dateOfBirth: '1994-08-12' },
        goalsData: {
          longTermGoals:
            'Stay active, learn deliberately, and support friends while building sustainable personal routines.',
        },
        stats: {
          experience: 150,
          shards: 10,
          strength: 50,
          intelligence: 50,
          charisma: 50,
        },
        catalog: createDefaultCatalog(),
        generatedTasks: createGeneratedTasks(),
      },
      {
        ...SCOUT,
        profileData: { name: 'Progression Scout', dateOfBirth: '1992-04-08' },
        goalsData: {
          longTermGoals:
            'Build reliable health routines, improve technical judgment, and encourage a small group of accountability partners.',
        },
        stats: {
          experience: 120,
          shards: 5,
          strength: 40,
          intelligence: 40,
          charisma: 40,
        },
        catalog: createDefaultCatalog(),
        generatedTasks: createGeneratedTasks(),
      },
      {
        ...TARGET,
        profileData: { name: 'Progression Target', dateOfBirth: '1991-02-14' },
        goalsData: {
          longTermGoals:
            'Train steadily, keep learning, and build supportive connections with people pursuing meaningful personal goals.',
        },
        stats: {
          experience: 90,
          shards: 5,
          strength: 30,
          intelligence: 30,
          charisma: 30,
        },
        catalog: createDefaultCatalog(),
        generatedTasks: createGeneratedTasks(),
      },
      {
        ...LEVEL_FIVE_PLAYER,
        profileData: { name: 'Level Five Player', dateOfBirth: '1990-12-03' },
        goalsData: {
          longTermGoals:
            'Build dependable routines, improve technical skill, and communicate progress with confidence.',
        },
        stats: {
          experience: 400,
          shards: 5,
          strength: 150,
          intelligence: 150,
          charisma: 100,
        },
        catalog: createDefaultCatalog(),
        generatedTasks: createGeneratedTasks(),
      },
    ])
  })

  test('shows analytics, achievements, and seasonal boss progress', async ({ page }) => {
    await suppressTour(page, LEADER.id)
    await loginAs(page, LEADER)

    await page.getByRole('button', { name: 'Journey' }).click()

    await expect(page.getByText('Campaigns, achievements & insights')).toBeVisible()
    await expect(page.getByText('SEASONAL CAMPAIGN')).toBeVisible()
    await expect(page.getByText('90 damage')).toBeVisible()
    await expect(page.getByRole('article').filter({ hasText: 'XP in 30 days' })).toContainText('90')
    await expect(page.getByText('First Step')).toBeVisible()
    await expect(page.getByText('Unlocked', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('How Journey works')).toBeVisible()
  })

  test('shows unlock messages below the required levels', async ({ page }) => {
    await suppressTour(page, TARGET.id)
    await loginAs(page, TARGET)

    await page.getByRole('button', { name: 'Journey' }).click()
    await expect(page.getByRole('heading', {
      name: 'Reach Level 5 to unlock Achievements',
    })).toBeVisible()
    await expect(page.getByText('4 levels to go')).toBeVisible()

    await page.getByRole('button', { name: /Guild/ }).click()
    await expect(page.getByRole('heading', {
      name: 'Reach Level 10 to unlock Guilds',
    })).toBeVisible()
    await expect(page.getByText('9 levels to go')).toBeVisible()
  })

  test('unlocks achievements at level 5 while Guild remains locked', async ({ page }) => {
    await suppressTour(page, LEVEL_FIVE_PLAYER.id)
    await loginAs(page, LEVEL_FIVE_PLAYER)

    await page.getByRole('button', { name: 'Journey' }).click()
    await expect(page.getByText('First Step')).toBeVisible()
    await expect(page.getByText('Reach Level 5 to unlock Achievements')).toHaveCount(0)

    await page.getByRole('button', { name: /Guild/ }).click()
    await expect(page.getByRole('heading', {
      name: 'Reach Level 10 to unlock Guilds',
    })).toBeVisible()
    await expect(page.getByText('5 levels to go')).toBeVisible()
  })

  test('follows an ally, forms a party, invites them, and accepts the invite', async ({
    page,
    request,
  }) => {
    await suppressTour(page, LEADER.id)
    await loginAs(page, LEADER)
    await page.getByRole('button', { name: 'Guild' }).click()

    await page.locator('#follow-username').fill('Progression All')
    const results = page.locator('.player-search-results')
    await expect(results).toContainText('Progression Ally')
    await expect(results).toContainText(`@${ALLY.username} · Level 2`)
    await page.getByRole('button', { name: `Follow @${ALLY.username}` }).click()
    await expect(page.getByText(`@${ALLY.username} · Level 2`)).toBeVisible()

    await page.locator('#party-name').fill('Night Raiders')
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Night Raiders' })).toBeVisible()

    await page.locator('#party-invite-username').fill(ALLY.username)
    await page.getByRole('button', { name: 'Invite', exact: true }).click()
    await expect(page.getByText(`Invitation sent to @${ALLY.username}.`)).toBeVisible()

    const loginResponse = await request.post('http://localhost:3001/api/login', {
      data: { email: ALLY.email, password: ALLY.password },
    })
    expect(loginResponse.ok()).toBeTruthy()
    const loginBody = await loginResponse.json()

    const communityResponse = await request.get(
      `http://localhost:3001/api/community/${loginBody.sessionId}`
    )
    expect(communityResponse.ok()).toBeTruthy()
    const communityBody = await communityResponse.json()
    const inviteId = communityBody.data.partyInvites[0].id

    const acceptResponse = await request.post(
      'http://localhost:3001/api/community/party/accept',
      { data: { sessionId: loginBody.sessionId, inviteId } }
    )
    expect(acceptResponse.ok()).toBeTruthy()

    await page.reload()
    await page.getByRole('button', { name: 'Guild' }).click()
    await expect(page.getByText('@progressionally · 150 XP')).toBeVisible()
    await expect(page.locator('.guild-counts')).toContainText('1 Following')
    await expect(page.getByText('How Guild works')).toBeVisible()
  })

  test('lets a player follow a follower back', async ({ page, request }) => {
    const allyLoginResponse = await request.post('http://localhost:3001/api/login', {
      data: { email: ALLY.email, password: ALLY.password },
    })
    expect(allyLoginResponse.ok()).toBeTruthy()
    const allyLogin = await allyLoginResponse.json()
    const followResponse = await request.post('http://localhost:3001/api/community/follow', {
      data: { sessionId: allyLogin.sessionId, username: LEADER.username },
    })
    expect(followResponse.ok()).toBeTruthy()

    await suppressTour(page, LEADER.id)
    await loginAs(page, LEADER)
    await page.getByRole('button', { name: 'Guild' }).click()

    const followersColumn = page.locator('.social-columns > div').nth(1)
    await expect(followersColumn).toContainText('Progression Ally')
    await followersColumn.getByRole('button', { name: 'Follow back' }).click()

    await expect(page.getByText(`You followed @${ALLY.username} back.`)).toBeVisible()
    await expect(page.locator('.guild-counts')).toContainText('1 Following')
    await expect(followersColumn.getByRole('button', { name: 'Follow back' })).toHaveCount(0)
  })

  test('preserves concurrent follows and party joins', async ({ request }) => {
    const login = async (credentials: typeof LEADER) => {
      const response = await request.post('http://localhost:3001/api/login', {
        data: { email: credentials.email, password: credentials.password },
      })
      expect(response.ok()).toBeTruthy()
      return (await response.json()).sessionId as string
    }

    const [leaderSession, allySession, scoutSession, targetSession] = await Promise.all([
      login(LEADER),
      login(ALLY),
      login(SCOUT),
      login(TARGET),
    ])

    const followResponses = await Promise.all([
      request.post('http://localhost:3001/api/community/follow', {
        data: { sessionId: leaderSession, username: TARGET.username },
      }),
      request.post('http://localhost:3001/api/community/follow', {
        data: { sessionId: scoutSession, username: TARGET.username },
      }),
    ])
    expect(followResponses.every(response => response.ok())).toBeTruthy()

    const targetStateResponse = await request.get(
      `http://localhost:3001/api/community/${targetSession}`
    )
    const targetState = await targetStateResponse.json()
    expect(targetState.data.followers).toHaveLength(2)

    const createResponse = await request.post(
      'http://localhost:3001/api/community/party/create',
      { data: { sessionId: leaderSession, name: 'Concurrency Guard' } }
    )
    expect(createResponse.ok()).toBeTruthy()

    const inviteResponses = await Promise.all([
      request.post('http://localhost:3001/api/community/party/invite', {
        data: { sessionId: leaderSession, username: ALLY.username },
      }),
      request.post('http://localhost:3001/api/community/party/invite', {
        data: { sessionId: leaderSession, username: SCOUT.username },
      }),
    ])
    expect(inviteResponses.every(response => response.ok())).toBeTruthy()

    const [allyStateResponse, scoutStateResponse] = await Promise.all([
      request.get(`http://localhost:3001/api/community/${allySession}`),
      request.get(`http://localhost:3001/api/community/${scoutSession}`),
    ])
    const allyState = await allyStateResponse.json()
    const scoutState = await scoutStateResponse.json()

    const acceptResponses = await Promise.all([
      request.post('http://localhost:3001/api/community/party/accept', {
        data: { sessionId: allySession, inviteId: allyState.data.partyInvites[0].id },
      }),
      request.post('http://localhost:3001/api/community/party/accept', {
        data: { sessionId: scoutSession, inviteId: scoutState.data.partyInvites[0].id },
      }),
    ])
    expect(acceptResponses.every(response => response.ok())).toBeTruthy()

    const leaderStateResponse = await request.get(
      `http://localhost:3001/api/community/${leaderSession}`
    )
    const leaderState = await leaderStateResponse.json()
    expect(leaderState.data.party.members).toHaveLength(3)
  })
})

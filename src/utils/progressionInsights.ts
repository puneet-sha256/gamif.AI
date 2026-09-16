import type { ActivityHistory, User } from '../shared/types'
import { calculateActualLevel } from './levelCalculation'

export interface AchievementView {
  id: string
  icon: string
  title: string
  description: string
  unlocked: boolean
  progress: number
  target: number
}

export interface ProgressAnalytics {
  totalActiveDays: number
  currentActiveStreak: number
  last30DaysXp: number
  averageXpPerActiveDay: number
  bestDayXp: number
  bestCategory: 'Strength' | 'Intelligence' | 'Charisma' | 'Balanced'
  categoryXp: {
    Strength: number
    Intelligence: number
    Charisma: number
  }
}

export interface SeasonalCampaign {
  id: string
  name: string
  bossName: string
  icon: string
  startsAt: string
  endsAt: string
  targetXp: number
  personalDamage: number
  daysRemaining: number
}

function isoDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function getActivities(history?: ActivityHistory) {
  return history?.dailyActivities || []
}

export function calculateProgressAnalytics(user: User, now = new Date()): ProgressAnalytics {
  const activities = getActivities(user.activityHistory)
  const cutoff = new Date(now)
  cutoff.setUTCDate(cutoff.getUTCDate() - 29)
  const cutoffDate = isoDate(cutoff)
  const recent = activities.filter(activity => activity.date >= cutoffDate)
  const active = activities.filter(activity => activity.total > 0)
  const categoryXp = activities.reduce(
    (totals, activity) => ({
      Strength: totals.Strength + activity.strength,
      Intelligence: totals.Intelligence + activity.intelligence,
      Charisma: totals.Charisma + activity.charisma,
    }),
    { Strength: 0, Intelligence: 0, Charisma: 0 }
  )

  const categoryEntries = Object.entries(categoryXp) as Array<
    ['Strength' | 'Intelligence' | 'Charisma', number]
  >
  const sortedCategories = [...categoryEntries].sort((a, b) => b[1] - a[1])
  const bestCategory =
    sortedCategories[0][1] === sortedCategories[1][1] ? 'Balanced' : sortedCategories[0][0]

  const activeDates = new Set(active.map(activity => activity.date))
  let currentActiveStreak = 0
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  if (!activeDates.has(isoDate(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  while (activeDates.has(isoDate(cursor))) {
    currentActiveStreak += 1
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }

  const totalXp = active.reduce((sum, activity) => sum + activity.total, 0)

  return {
    totalActiveDays: active.length,
    currentActiveStreak,
    last30DaysXp: recent.reduce((sum, activity) => sum + activity.total, 0),
    averageXpPerActiveDay: active.length ? Math.round(totalXp / active.length) : 0,
    bestDayXp: active.reduce((best, activity) => Math.max(best, activity.total), 0),
    bestCategory,
    categoryXp,
  }
}

export function getAchievements(
  user: User,
  socialCounts: { followers: number; following: number; partyMembers: number } = {
    followers: 0,
    following: 0,
    partyMembers: 0,
  }
): AchievementView[] {
  const analytics = calculateProgressAnalytics(user)
  const level = calculateActualLevel(user.stats?.experience || 0)
  const balanceValues = Object.values(analytics.categoryXp)
  const hasBalancedGrowth =
    balanceValues.every(value => value >= 100) &&
    Math.max(...balanceValues) - Math.min(...balanceValues) <= Math.max(...balanceValues) * 0.35

  const definitions = [
    {
      id: 'first-step',
      icon: '⚡',
      title: 'First Step',
      description: 'Log your first active day.',
      value: analytics.totalActiveDays,
      target: 1,
    },
    {
      id: 'week-warrior',
      icon: '🔥',
      title: 'Week Warrior',
      description: 'Build a 7-day activity streak.',
      value: analytics.currentActiveStreak,
      target: 7,
    },
    {
      id: 'centurion',
      icon: '💯',
      title: 'Centurion',
      description: 'Earn 100 XP in a single day.',
      value: analytics.bestDayXp,
      target: 100,
    },
    {
      id: 'level-ten',
      icon: '👑',
      title: 'Awakened',
      description: 'Reach level 10.',
      value: level,
      target: 10,
    },
    {
      id: 'balanced-build',
      icon: '⚖️',
      title: 'Balanced Build',
      description: 'Earn 100 XP in every attribute while keeping them balanced.',
      value: hasBalancedGrowth ? 1 : 0,
      target: 1,
    },
    {
      id: 'first-ally',
      icon: '🤝',
      title: 'First Ally',
      description: 'Follow another player.',
      value: socialCounts.following,
      target: 1,
    },
    {
      id: 'party-up',
      icon: '🛡️',
      title: 'Party Up',
      description: 'Join a party with at least two members.',
      value: socialCounts.partyMembers,
      target: 2,
    },
    {
      id: 'guild-beacon',
      icon: '🌟',
      title: 'Guild Beacon',
      description: 'Gain five followers.',
      value: socialCounts.followers,
      target: 5,
    },
  ]

  return definitions.map(({ value, ...achievement }) => ({
    ...achievement,
    unlocked: value >= achievement.target,
    progress: Math.min(value, achievement.target),
  }))
}

export function getCurrentCampaign(user: User, now = new Date()): SeasonalCampaign {
  const year = now.getUTCFullYear()
  const quarter = Math.floor(now.getUTCMonth() / 3)
  const campaigns = [
    ['Winter Awakening', 'The Frostbound Titan', '❄️'],
    ['Spring Ascension', 'The Verdant Colossus', '🌿'],
    ['Summer Vanguard', 'The Solar Wyrm', '☀️'],
    ['Autumn Eclipse', 'The Hollow Sovereign', '🌘'],
  ] as const
  const startsAt = new Date(Date.UTC(year, quarter * 3, 1))
  const endsAt = new Date(Date.UTC(year, quarter * 3 + 3, 0, 23, 59, 59))
  const targetXp = 5000
  const personalDamage = getActivities(user.activityHistory)
    .filter(activity => activity.date >= isoDate(startsAt) && activity.date <= isoDate(endsAt))
    .reduce((sum, activity) => sum + activity.total, 0)

  return {
    id: `${year}-q${quarter + 1}`,
    name: campaigns[quarter][0],
    bossName: campaigns[quarter][1],
    icon: campaigns[quarter][2],
    startsAt: isoDate(startsAt),
    endsAt: isoDate(endsAt),
    targetXp,
    personalDamage,
    daysRemaining: Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / 86_400_000)),
  }
}

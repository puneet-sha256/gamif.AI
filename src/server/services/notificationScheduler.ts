import cron from 'node-cron'
import { findAllUsersWithPushSubscriptions, updateUser } from '../utils/dataOperations'
import { sendPushNotification } from './pushNotificationService'
import { calculateDisplayStreaks } from '../../utils/streakCalculation'
import type { User, PushSubscriptionData } from '../../shared/types'
import { logger } from '../../utils/logger'

/**
 * Compose a streak-aware notification message.
 * Uses the max display streak across all categories.
 */
function composeStreakMessage(user: User): { title: string; body: string } {
  const today = new Date().toISOString().split('T')[0]
  const displayStreaks = calculateDisplayStreaks(
    user.activityHistory?.dailyActivities || [],
    today
  )

  const maxStreak = Math.max(
    displayStreaks.strengthStreak,
    displayStreaks.intelligenceStreak,
    displayStreaks.charismaStreak
  )

  if (maxStreak >= 10) {
    return {
      title: 'Your streak is at risk!',
      body: `Your incredible ${maxStreak}-day streak will break! Don't let it slip away.`,
    }
  }
  if (maxStreak >= 3) {
    return {
      title: 'Keep your streak alive!',
      body: `Your ${maxStreak}-day streak is at risk! Log your activities to keep it alive.`,
    }
  }
  if (maxStreak >= 1) {
    return {
      title: 'Keep the momentum!',
      body: "Keep the momentum going! Don't forget to log your activities today.",
    }
  }
  return {
    title: 'Welcome back, Hunter!',
    body: 'Start a new streak by logging today\'s activities.',
  }
}

/**
 * Check whether the user has already logged activity today.
 */
function hasLoggedToday(user: User): boolean {
  const today = new Date().toISOString().split('T')[0]
  return user.activityHistory?.dailyActivities?.some(a => a.date === today) ?? false
}

/**
 * Check if the current UTC hour falls within the user's quiet hours.
 */
function isInQuietHours(user: User): boolean {
  const prefs = user.pushNotifications?.preferences
  if (prefs?.quietHoursStart == null || prefs?.quietHoursEnd == null) return false

  const currentHour = new Date().getUTCHours()
  const start = prefs.quietHoursStart
  const end = prefs.quietHoursEnd

  // Handle ranges that cross midnight (e.g., 22 -> 6)
  if (start <= end) {
    return currentHour >= start && currentHour < end
  }
  return currentHour >= start || currentHour < end
}

/**
 * Run a single notification sweep: check all subscribed users and send
 * notifications to those who haven't logged activity today.
 */
export async function runNotificationSweep(): Promise<void> {
  const today = new Date().toISOString().split('T')[0]

  let users: User[]
  try {
    users = await findAllUsersWithPushSubscriptions()
  } catch (err) {
    logger.error('Notification sweep: failed to fetch users:', err)
    return
  }

  logger.custom('🔔', `Notification sweep: ${users.length} subscribed user(s) found`)

  for (const user of users) {
    try {
      // Skip if already notified today
      if (user.pushNotifications?.lastNotifiedDate === today) continue

      // Skip if user already logged activity today
      if (hasLoggedToday(user)) continue

      // Skip if in quiet hours
      if (isInQuietHours(user)) continue

      const { title, body } = composeStreakMessage(user)
      const subs = user.pushNotifications?.subscriptions || []
      const expiredEndpoints: string[] = []

      for (const sub of subs) {
        const result = await sendPushNotification(sub, {
          title,
          body,
          icon: '/favicon.ico',
          tag: `streak-reminder-${today}`,
          data: { url: '/' },
          actions: [
            { action: 'log', title: 'Log Activities' },
            { action: 'later', title: 'Later' },
          ],
        })

        if (result.expired) {
          expiredEndpoints.push(sub.endpoint)
        }
      }

      // Build update: set lastNotifiedDate and remove expired subscriptions
      const updatedSubs = expiredEndpoints.length > 0
        ? subs.filter((s: PushSubscriptionData) => !expiredEndpoints.includes(s.endpoint))
        : subs

      await updateUser(user.id, {
        pushNotifications: {
          ...user.pushNotifications!,
          subscriptions: updatedSubs,
          lastNotifiedDate: today,
        },
      })

      logger.custom('🔔', `Notified user ${user.username} (streak reminder)`)
    } catch (err) {
      logger.error(`Notification sweep: error for user ${user.id}:`, err)
    }
  }
}

/**
 * Start the notification scheduler.
 * Runs hourly between 17:00-22:00 UTC (roughly 5-10 PM UTC).
 */
export function startNotificationScheduler(): void {
  // Only start if VAPID keys are configured
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    logger.custom('🔔', 'Push notifications disabled: VAPID keys not configured')
    return
  }

  cron.schedule('0 17-22 * * *', () => {
    logger.custom('🔔', 'Running notification sweep...')
    runNotificationSweep().catch(err => {
      logger.error('Notification sweep failed:', err)
    })
  })

  logger.custom('🔔', 'Notification scheduler started (17:00-22:00 UTC, hourly)')
}

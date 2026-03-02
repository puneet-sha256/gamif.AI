import type { Request, Response } from 'express'
import { findSessionById, findUserById, updateUser } from '../utils/dataOperations'
import { createSuccessResponse, createErrorResponse } from '../utils/responseHelpers'
import { getVapidPublicKey } from '../services/pushNotificationService'
import type { PushSubscriptionData, NotificationPreferences } from '../../shared/types'
import { logger } from '../../utils/logger'

// ─── Helper: validate session and return userId ──────────────────────────────

async function validateSession(sessionId: string): Promise<string | null> {
  const session = await findSessionById(sessionId)
  return session?.userId ?? null
}

// ─── GET /api/notifications/vapid-public-key ─────────────────────────────────

export async function getVapidKey(_req: Request, res: Response) {
  try {
    const key = getVapidPublicKey()
    return res.json(createSuccessResponse('VAPID public key', { vapidPublicKey: key }))
  } catch {
    return res.status(500).json(createErrorResponse('Push notifications not configured'))
  }
}

// ─── POST /api/notifications/subscribe ───────────────────────────────────────

export async function subscribe(req: Request, res: Response) {
  try {
    const { sessionId, subscription } = req.body as {
      sessionId?: string
      subscription?: PushSubscriptionData
    }

    if (!sessionId || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return res.status(400).json(createErrorResponse('sessionId and valid subscription are required'))
    }

    const userId = await validateSession(sessionId)
    if (!userId) {
      return res.status(401).json(createErrorResponse('Invalid session'))
    }

    const user = await findUserById(userId)
    if (!user) {
      return res.status(404).json(createErrorResponse('User not found'))
    }

    const existing = user.pushNotifications || {
      subscriptions: [],
      preferences: { enabled: true },
    }

    // Avoid duplicate subscriptions (by endpoint)
    const alreadyExists = existing.subscriptions.some(
      (s: PushSubscriptionData) => s.endpoint === subscription.endpoint
    )
    if (!alreadyExists) {
      existing.subscriptions.push(subscription)
    }

    // Ensure preferences are enabled when subscribing
    existing.preferences.enabled = true

    await updateUser(userId, { pushNotifications: existing })
    logger.custom('🔔', `User ${user.username} subscribed to push notifications`)

    return res.json(createSuccessResponse('Subscribed to push notifications'))
  } catch (err) {
    logger.error('Subscribe error:', err)
    return res.status(500).json(createErrorResponse('Failed to subscribe'))
  }
}

// ─── POST /api/notifications/unsubscribe ─────────────────────────────────────

export async function unsubscribe(req: Request, res: Response) {
  try {
    const { sessionId, endpoint } = req.body as {
      sessionId?: string
      endpoint?: string
    }

    if (!sessionId || !endpoint) {
      return res.status(400).json(createErrorResponse('sessionId and endpoint are required'))
    }

    const userId = await validateSession(sessionId)
    if (!userId) {
      return res.status(401).json(createErrorResponse('Invalid session'))
    }

    const user = await findUserById(userId)
    if (!user || !user.pushNotifications) {
      return res.status(404).json(createErrorResponse('User not found or not subscribed'))
    }

    user.pushNotifications.subscriptions = user.pushNotifications.subscriptions.filter(
      (s: PushSubscriptionData) => s.endpoint !== endpoint
    )

    // If no subscriptions left, disable notifications
    if (user.pushNotifications.subscriptions.length === 0) {
      user.pushNotifications.preferences.enabled = false
    }

    await updateUser(userId, { pushNotifications: user.pushNotifications })
    logger.custom('🔔', `User ${user.username} unsubscribed from push notifications`)

    return res.json(createSuccessResponse('Unsubscribed from push notifications'))
  } catch (err) {
    logger.error('Unsubscribe error:', err)
    return res.status(500).json(createErrorResponse('Failed to unsubscribe'))
  }
}

// ─── PUT /api/notifications/preferences ──────────────────────────────────────

export async function updatePreferences(req: Request, res: Response) {
  try {
    const { sessionId, preferences } = req.body as {
      sessionId?: string
      preferences?: Partial<NotificationPreferences>
    }

    if (!sessionId || !preferences) {
      return res.status(400).json(createErrorResponse('sessionId and preferences are required'))
    }

    const userId = await validateSession(sessionId)
    if (!userId) {
      return res.status(401).json(createErrorResponse('Invalid session'))
    }

    const user = await findUserById(userId)
    if (!user) {
      return res.status(404).json(createErrorResponse('User not found'))
    }

    const existing = user.pushNotifications || {
      subscriptions: [],
      preferences: { enabled: true },
    }

    existing.preferences = {
      ...existing.preferences,
      ...preferences,
    }

    await updateUser(userId, { pushNotifications: existing })

    return res.json(createSuccessResponse('Notification preferences updated'))
  } catch (err) {
    logger.error('Update preferences error:', err)
    return res.status(500).json(createErrorResponse('Failed to update preferences'))
  }
}

// ─── GET /api/notifications/status/:sessionId ────────────────────────────────

export async function getNotificationStatus(req: Request, res: Response) {
  try {
    const { sessionId } = req.params

    if (!sessionId) {
      return res.status(400).json(createErrorResponse('sessionId is required'))
    }

    const userId = await validateSession(sessionId)
    if (!userId) {
      return res.status(401).json(createErrorResponse('Invalid session'))
    }

    const user = await findUserById(userId)
    if (!user) {
      return res.status(404).json(createErrorResponse('User not found'))
    }

    const data = {
      enabled: user.pushNotifications?.preferences?.enabled ?? false,
      subscriptionCount: user.pushNotifications?.subscriptions?.length ?? 0,
      preferences: user.pushNotifications?.preferences ?? { enabled: false },
    }

    return res.json(createSuccessResponse('Notification status', data))
  } catch (err) {
    logger.error('Get status error:', err)
    return res.status(500).json(createErrorResponse('Failed to get notification status'))
  }
}

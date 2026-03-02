import webpush from 'web-push'
import type { PushSubscriptionData } from '../../shared/types'
import { logger } from '../../utils/logger'

let initialized = false

function ensureInitialized(): void {
  if (initialized) return

  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@gamifai.com'

  if (!publicKey || !privateKey) {
    throw new Error(
      'VAPID keys not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY env vars. ' +
      'Generate with: npx web-push generate-vapid-keys'
    )
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)
  initialized = true
  logger.success('Web Push VAPID details configured')
}

export interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: Record<string, unknown>
  actions?: Array<{ action: string; title: string }>
}

export interface SendResult {
  success: boolean
  expired: boolean
}

export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: PushPayload
): Promise<SendResult> {
  try {
    ensureInitialized()

    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      JSON.stringify(payload)
    )

    return { success: true, expired: false }
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode

    // 410 Gone or 404 Not Found means the subscription has expired
    if (statusCode === 410 || statusCode === 404) {
      logger.custom('🗑️', `Push subscription expired (${statusCode}): ${subscription.endpoint.slice(0, 60)}...`)
      return { success: false, expired: true }
    }

    logger.error('Failed to send push notification:', err)
    return { success: false, expired: false }
  }
}

export function getVapidPublicKey(): string {
  const key = process.env.VAPID_PUBLIC_KEY
  if (!key) {
    throw new Error('VAPID_PUBLIC_KEY environment variable is not set')
  }
  return key
}

/**
 * Push Notification Client Service
 * Handles browser push subscription lifecycle and backend communication.
 */

import { apiClient } from './apiClient'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

class NotificationService {
  private swRegistration: ServiceWorkerRegistration | null = null

  /** Check if the browser supports push notifications. */
  isSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    )
  }

  /** Return the current browser permission state. */
  getPermissionState(): NotificationPermission {
    if (!this.isSupported()) return 'denied'
    return Notification.permission
  }

  /** Register the push-only service worker. */
  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported()) return null

    try {
      this.swRegistration = await navigator.serviceWorker.register('/sw.js')
      return this.swRegistration
    } catch (err) {
      console.error('SW registration failed:', err)
      return null
    }
  }

  /** Get existing SW registration (or register). */
  private async getRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (this.swRegistration) return this.swRegistration
    return this.registerServiceWorker()
  }

  /**
   * Subscribe the user to push notifications.
   * Requests browser permission, creates a PushSubscription, and sends it to backend.
   */
  async subscribe(sessionId: string): Promise<boolean> {
    try {
      const reg = await this.getRegistration()
      if (!reg) {
        console.error('[NotificationService] Service worker registration failed')
        return false
      }
      console.log('[NotificationService] SW registered:', reg.scope)

      // Request notification permission
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        console.error('[NotificationService] Permission denied:', permission)
        return false
      }
      console.log('[NotificationService] Permission granted')

      // Get the VAPID public key
      const vapidKey = await this.getVapidPublicKey()
      if (!vapidKey) {
        console.error('[NotificationService] No VAPID public key available')
        return false
      }
      console.log('[NotificationService] VAPID key obtained')

      // Create push subscription
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidKey),
      })
      console.log('[NotificationService] Push subscription created:', subscription.endpoint.slice(0, 60))

      const json = subscription.toJSON()
      if (!json.endpoint || !json.keys) {
        console.error('[NotificationService] Subscription JSON missing endpoint or keys')
        return false
      }

      // Send to backend
      await apiClient.post('/notifications/subscribe', {
        sessionId,
        subscription: {
          endpoint: json.endpoint,
          keys: {
            p256dh: json.keys.p256dh,
            auth: json.keys.auth,
          },
        },
      })
      console.log('[NotificationService] Subscription saved to backend')

      return true
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.error('[NotificationService] Subscribe failed:', errorMsg)

      // AbortError from pushManager.subscribe means the browser's push service
      // (FCM for Chrome, WNS for Edge) is unreachable — typically a network/firewall issue.
      if (errorMsg.includes('push service') || errorMsg.includes('AbortError')) {
        console.error(
          '[NotificationService] The browser push service is unreachable. ' +
          'This usually means a corporate firewall is blocking FCM/WNS endpoints. ' +
          'Try: (1) a different network, (2) a VPN, or (3) allowlist *.googleapis.com and *.notify.windows.com'
        )
      }
      return false
    }
  }

  /**
   * Unsubscribe from push notifications.
   * Removes from browser and backend.
   */
  async unsubscribe(sessionId: string): Promise<boolean> {
    try {
      const reg = await this.getRegistration()
      if (!reg) return false

      const subscription = await reg.pushManager.getSubscription()
      if (!subscription) return true // Already unsubscribed

      const endpoint = subscription.endpoint

      // Unsubscribe from browser
      await subscription.unsubscribe()

      // Remove from backend
      await apiClient.post('/notifications/unsubscribe', {
        sessionId,
        endpoint,
      })

      return true
    } catch (err) {
      console.error('Push unsubscribe failed:', err)
      return false
    }
  }

  /** Update notification preferences (enabled, quiet hours). */
  async updatePreferences(
    sessionId: string,
    preferences: { enabled?: boolean; quietHoursStart?: number; quietHoursEnd?: number }
  ): Promise<boolean> {
    try {
      await apiClient.put('/notifications/preferences', {
        sessionId,
        preferences,
      })
      return true
    } catch (err) {
      console.error('Update notification preferences failed:', err)
      return false
    }
  }

  /** Fetch current notification status from backend. */
  async getStatus(sessionId: string): Promise<{
    enabled: boolean
    subscriptionCount: number
    preferences: { enabled: boolean; quietHoursStart?: number; quietHoursEnd?: number }
  } | null> {
    try {
      const res = await apiClient.get<{
        enabled: boolean
        subscriptionCount: number
        preferences: { enabled: boolean; quietHoursStart?: number; quietHoursEnd?: number }
      }>(`/notifications/status/${sessionId}`)
      return res.data ?? null
    } catch {
      return null
    }
  }

  /** Check if this browser currently has an active push subscription. */
  async isCurrentlySubscribed(): Promise<boolean> {
    try {
      const reg = await this.getRegistration()
      if (!reg) return false
      const sub = await reg.pushManager.getSubscription()
      return !!sub
    } catch {
      return false
    }
  }

  /** Get VAPID public key — prefer env var, fall back to API. */
  private async getVapidPublicKey(): Promise<string | null> {
    if (VAPID_PUBLIC_KEY) return VAPID_PUBLIC_KEY

    try {
      const res = await apiClient.get<{ vapidPublicKey: string }>('/notifications/vapid-public-key')
      return res.data?.vapidPublicKey ?? null
    } catch {
      return null
    }
  }

  /** Convert a URL-safe base64 string to a Uint8Array (for applicationServerKey). */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; i++) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }
}

export const notificationService = new NotificationService()

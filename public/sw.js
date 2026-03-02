/**
 * GAMIF.AI Push Notification Service Worker
 *
 * PURPOSE: Handle push notifications ONLY.
 * This service worker intentionally does NOT use the Cache API, the fetch event,
 * or any install/activate cache logic. It will never serve stale content or
 * interfere with app updates. Do NOT add caching here.
 */

// Push event — display notification from server payload
self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'GAMIF.AI', body: event.data.text() }
  }

  const today = new Date().toISOString().split('T')[0]

  const options = {
    body: payload.body || '',
    icon: payload.icon || '/favicon.png',
    badge: payload.badge || '/favicon.png',
    tag: payload.tag || `streak-reminder-${today}`,
    data: payload.data || { url: '/' },
    actions: payload.actions || [
      { action: 'log', title: 'Log Activities' },
      { action: 'later', title: 'Later' }
    ],
    renotify: false
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'GAMIF.AI', options)
  )
})

// Notification click — focus or open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const urlToOpen = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(urlToOpen)
    })
  )
})

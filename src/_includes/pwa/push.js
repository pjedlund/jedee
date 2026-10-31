// Push for the service worker (settings.pwa.push). ⚠ A push must always show a notification, or the browser may drop the subscription: nothing here may throw before showNotification.
const PUSH_DEFAULTS = { title: {{ meta.siteName | dump | safe }}, icon: '/icon-192x192.png' }

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data.json() ?? {}
  } catch (error) {
    // Not JSON (or no data at all): a plain-text payload becomes the body.
    try { payload = { body: event.data.text() } } catch (error) {}
  }
  const title = payload.title || PUSH_DEFAULTS.title
  const options = { body: payload.body || '', icon: payload.icon || PUSH_DEFAULTS.icon }
  if (payload.tag) options.tag = payload.tag
  event.waitUntil(self.registration.showNotification(title, options))
})

// A tap focuses a window that is already open, or opens the start page.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((windows) => (windows[0] ? windows[0].focus() : self.clients.openWindow('/')))
  )
})

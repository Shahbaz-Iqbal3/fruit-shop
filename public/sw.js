self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))
self.addEventListener('push', e => {
  let d = {}
  try { d = e.data.json() } catch {}
  e.waitUntil(self.registration.showNotification(d.title || 'New order', { body: d.body || '', tag: d.tag || 'order', renotify: true, requireInteraction: true, vibrate: [300, 120, 300, 120, 600], icon: '/icon-192.png', badge: '/badge-96.png', data: { url: d.url || '/admin' } }))
})
self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = e.notification.data?.url || '/admin'
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(l => { const c = l.find(w => w.url.includes('/admin')); return c ? c.focus() : clients.openWindow(url) }))
})

/* Push notification handler — imported by Workbox via importScripts */

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.title || 'Dynabolic';
    const options = {
      body: payload.body || '',
      icon: payload.icon || '/pwa-192x192.png',
      badge: payload.badge || '/favicon.ico',
      data: payload.data || {},
      vibrate: [200, 100, 200],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('SW push parse error:', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const rawPath = event.notification.data?.coachUrl || '/messages';
  const targetUrl = new URL(rawPath, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then((c) => {
            if (!c) return;
            // Give mobile webview 100ms to unfreeze before routing via React Router
            setTimeout(() => {
              c.postMessage({ type: 'PUSH_NAVIGATE', url: rawPath });
            }, 100);
          });
        }
      }
      // App is completely closed — hard open
      return clients.openWindow(targetUrl);
    })
  );
});

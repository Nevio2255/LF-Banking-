// LF Banking Service Worker — handles real Web Push + delayed local notifications
self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

// ── ECHTE PUSH-NACHRICHT vom Server (funktioniert auch bei geschlossener App) ──
self.addEventListener('push', (event) => {
  let data = { title: 'LuxeFinds E-Banking', body: 'Du hast eine neue Mitteilung.' };
  try {
    if (event.data) data = event.data.json();
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'LuxeFinds E-Banking', {
      body: data.body || '',
      tag: 'lf-push-' + Date.now(),
      requireInteraction: false,
      vibrate: [200, 100, 200],
      data: { url: self.registration.scope }
    })
  );
});

// Message from page: schedule a delayed local notification (used only for the in-app test
// while the app stays open or briefly backgrounded; real delivery uses the 'push' event above)
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'DELAYED_NOTIFICATION') {
    const { delay, title, body, tag } = data;
    setTimeout(() => {
      self.registration.showNotification(title, {
        body: body,
        tag: tag || 'lf-banking',
        requireInteraction: false,
        vibrate: [200, 100, 200],
        data: { url: self.registration.scope }
      }).catch(()=>{});
    }, delay);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(event.notification.data?.url || './');
      }
    })
  );
});

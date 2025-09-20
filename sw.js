const CACHE_NAME = 'qgo-cargo-v1';
const urlsToCache = [
  '/qgocargo/',
  '/qgocargo/wh.html',
  '/qgocargo/manifest.json',
  '/qgocargo/sw.js',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/feather-icons/dist/feather.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.23/jspdf.plugin.autotable.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

// Push notification event listener
self.addEventListener('push', event => {
  let data = {};
  if (event.data) {
    data = event.data.json();
  }

  const options = {
    body: data.body || 'New notification from Qgo Cargo',
    icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"%3E%3Crect width="192" height="192" fill="%233182ce" rx="24"/%3E%3Cpath d="M48 64h96v8H48v-8zm0 24h96v8H48v-8zm0 24h64v8H48v-8z" fill="white"/%3E%3Ccircle cx="80" cy="120" r="16" fill="white"/%3E%3Ccircle cx="112" cy="120" r="16" fill="white"/%3E%3Crect x="72" y="136" width="48" height="8" fill="white" rx="4"/%3E%3C/svg%3E',
    badge: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"%3E%3Crect width="192" height="192" fill="%233182ce" rx="24"/%3E%3Cpath d="M48 64h96v8H48v-8zm0 24h96v8H48v-8zm0 24h64v8H48v-8z" fill="white"/%3E%3Ccircle cx="80" cy="120" r="16" fill="white"/%3E%3Ccircle cx="112" cy="120" r="16" fill="white"/%3E%3Crect x="72" y="136" width="48" height="8" fill="white" rx="4"/%3E%3C/svg%3E',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: data.id || 1,
      url: '/qgocargo/wh.html'
    },
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"%3E%3Cpath d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/%3E%3C/svg%3E'
      },
      {
        action: 'close',
        title: 'Close',
        icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"%3E%3Cpath d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/%3E%3C/svg%3E'
      }
    ],
    requireInteraction: true,
    silent: false
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Qgo Cargo', options)
  );
});

// Notification click event listener
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/qgocargo/wh.html')
    );
  } else if (event.action === 'close') {
    // Just close the notification, no action needed
  } else {
    // Default action when notification is clicked (not an action button)
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/qgocargo/wh.html')
    );
  }
});

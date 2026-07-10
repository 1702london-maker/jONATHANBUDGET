// Minimal service worker — required for PWA installability on Chrome/Android/Desktop
// No caching. All data always fetched live from the server.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', (e) => e.respondWith(fetch(e.request)))

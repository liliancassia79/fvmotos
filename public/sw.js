// Minimal service worker to enable PWA install prompt on Android Chrome.
// Network-first for everything (no offline cache) to avoid stale content.
self.addEventListener("install", (e) => { self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener("fetch", (event) => {
  // Pass-through: required for installability, but never cache.
  event.respondWith(fetch(event.request).catch(() => Response.error()));
});

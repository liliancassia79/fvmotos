// Kill-switch service worker: unregisters this worker and clears its own caches
// so mobile users stuck on an old cached bundle get the latest app on next load.
// Only touches caches created by previous versions of this SW ("static-fvmotos-*",
// "runtime-fvmotos-*") — leaves Firebase Messaging / other origins alone.
function isOwnCache(name) {
  return /^static-fvmotos-|^runtime-fvmotos-/.test(name);
}

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      try {
        const names = await caches.keys();
        await Promise.allSettled(names.filter(isOwnCache).map((n) => caches.delete(n)));
        await self.clients.claim();
        const clients = await self.clients.matchAll({ type: "window" });
        await Promise.allSettled(clients.map((c) => c.navigate(c.url)));
      } finally {
        await self.registration.unregister();
      }
    })(),
  ),
);

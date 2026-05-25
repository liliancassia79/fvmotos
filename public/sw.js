// FV Motos service worker — cache leve para reduzir consumo em 3G/4G/5G.
// Estratégia:
//  - HTML/navegação: network-first (sempre busca atualização, cai pro cache offline)
//  - Assets estáticos (JS, CSS, imagens, fontes, logo): cache-first (não re-baixa)
const VERSION = "fvmotos-v2";
const STATIC_CACHE = `static-${VERSION}`;
const RUNTIME_CACHE = `runtime-${VERSION}`;

// Pré-cache do essencial (logo + manifest + ícones)
const PRECACHE_URLS = [
  "/",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE_URLS).catch(() => null))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  return /\.(?:js|mjs|css|png|jpg|jpeg|webp|svg|gif|ico|woff2?|ttf|otf)$/i.test(url.pathname)
    || url.pathname.startsWith("/assets/");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Não cachear chamadas de API (supabase, etc.)
  if (url.origin !== self.location.origin) return;

  if (isStaticAsset(url)) {
    // Cache-first: economiza dados; assets têm hash no nome
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }).catch(() => cached || Response.error());
      })
    );
    return;
  }

  if (req.mode === "navigate") {
    // Network-first para HTML — pega versão nova, fallback offline
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then((c) => c || caches.match("/")))
    );
  }
});

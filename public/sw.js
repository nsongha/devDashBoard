/**
 * Service Worker — Dev Dashboard PWA
 * Strategy:
 *   - Shell assets (HTML/CSS/JS): Cache-first
 *   - API calls (/api/*): Network-first, no caching
 *   - Navigation (new pages): Network → offline.html fallback
 */

const CACHE_NAME = 'devdash-v2';

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/css/tokens.css',
  '/css/dashboard.css',
  '/js/app.mjs',
  '/js/charts.mjs',
  '/js/sidebar.mjs',
  '/js/tabs.mjs',
  '/js/toast.mjs',
  '/js/search.mjs',
  '/js/deep-links.mjs',
  '/js/editor.mjs',
  '/js/export.mjs',
  '/js/github.mjs',
  '/js/insights.mjs',
  '/js/notifications.mjs',
  '/js/realtime.mjs',
  '/js/pwa.mjs',
  '/js/team.mjs',
  '/vendor/chart.umd.min.js',
];


// ─── Install: Precache shell ──────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

// ─── Activate: Cleanup old caches ────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

// ─── Fetch: Route strategy ────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests (Google Fonts CDN etc)
  if (url.origin !== self.location.origin) return;

  // API calls: Network-first, no cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Offline — no network connection', offline: true }),
          { headers: { 'Content-Type': 'application/json' } },
        );
      }),
    );
    return;
  }

  // Navigation requests: Network-first → offline.html fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache fresh shell responses
          const toCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, toCache));
          return response;
        })
        .catch(() => caches.match('/offline.html')),
    );
    return;
  }

  // Static assets: Cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        // Only cache successful responses
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, toCache));
        return response;
      });
    }),
  );
});

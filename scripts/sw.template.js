/* global self, caches, fetch, Response */
/**
 * Chartoon's service worker: the installed app opens and works offline, and a new version
 * waits until the learner taps "update" (or next opens the app), so nothing swaps mid-lesson.
 *
 * This is a template: `scripts/build-sw.ts` fills in VERSION and PRECACHE after `expo export`
 * and writes the result to dist/sw.js.
 *
 * - Pages: the network first, so an online visit always gets the latest release. When the
 *   network is down or slower than NETWORK_WAIT_MS, the saved app shell opens instead.
 * - App files (hashed bundles, fonts, sounds, icons): from the cache, saved at install.
 * - Other servers (Supabase, Binance) and the relay to them (/proxy/): never touched here, so
 *   account data, chat and prices are always live and never served stale.
 */
const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;
const SHELL = `chartoon-shell-${VERSION}`;
const RUNTIME = 'chartoon-runtime';
const NETWORK_WAIT_MS = 4000;

// A redirected response can't answer a page request, so keep a clean copy.
async function clean(res) {
  if (!res.redirected) return res;
  return new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers: res.headers });
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL).then((cache) =>
      Promise.all(
        PRECACHE.map(async (url) => {
          // The page is checked with the server; hashed files can come from the HTTP cache.
          const res = await fetch(url, { cache: url === '/' ? 'no-cache' : 'default' });
          if (!res.ok) throw new Error(`Could not save ${url} (${res.status})`);
          await cache.put(url, await clean(res));
        }),
      ),
    ),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Old releases and files picked up on the way are dropped; this release is complete.
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith('chartoon-') && key !== SHELL).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(page(event));
    return;
  }
  // The relay to Binance and Supabase (vercel.json) is always live, like the other servers.
  if (url.pathname === '/sw.js' || url.pathname.startsWith('/proxy/')) return;
  event.respondWith(file(request));
});

async function page(event) {
  const network = fetch(event.request);
  const saved = await caches.match('/', { cacheName: SHELL });
  if (!saved) return network;
  // Keep the request alive if the saved shell wins the race.
  event.waitUntil(network.catch(() => undefined));
  const slow = new Promise((resolve) => setTimeout(() => resolve(saved), NETWORK_WAIT_MS));
  return Promise.race([network.then((res) => (res.ok ? res : saved)).catch(() => saved), slow]);
}

async function file(request) {
  const hit = await caches.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  const path = new URL(request.url).pathname;
  // Files of a newer release that the page asked for before this worker updated.
  if (res.ok && (path.startsWith('/_expo/') || path.startsWith('/assets/'))) {
    const cache = await caches.open(RUNTIME);
    await cache.put(request, res.clone());
  }
  return res;
}

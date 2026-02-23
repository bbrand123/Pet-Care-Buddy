// Import shared version constant so cache version lives in one place
importScripts('./js/version.js');
importScripts('./sw-assets.generated.js');
const CACHE_VERSION = (typeof APP_VERSION !== 'undefined') ? APP_VERSION : 12;
const CACHE_NAME = `my-little-friend-v${CACHE_VERSION}`;
const ASSETS = Array.isArray(self.SW_GENERATED_ASSETS) ? self.SW_GENERATED_ASSETS.slice() : [];

const OFFLINE_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>My Little Friend</title>
  <style>
    body { font-family: Nunito, system-ui, -apple-system, sans-serif; margin: 0; background: #fff8f0; color: #3e2723; }
    main { min-height: 100vh; display: grid; place-items: center; padding: 24px; text-align: center; }
    h1 { margin: 0 0 12px; font-size: 1.8rem; }
    p { margin: 0; max-width: 34rem; line-height: 1.5; }
  </style>
</head>
<body>
  <main>
    <div>
      <h1>You're offline</h1>
      <p>My Little Friend will load automatically once your connection returns.</p>
    </div>
  </main>
</body>
</html>`;

async function cacheCoreAssets() {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(
        ASSETS.map(async (asset) => {
            try {
                await cache.add(asset);
            } catch (err) {
                console.warn('[SW] Failed to precache asset:', asset, err);
            }
        })
    );
}

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        try {
            await cacheCoreAssets();
        } catch (err) {
            // Install should still complete so one missing asset does not brick the SW.
            console.error('[SW] Install encountered errors:', err);
        }
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(
            keys
                .filter((key) => key !== CACHE_NAME)
                .map((key) => caches.delete(key))
        );
        await self.clients.claim();
    })());
});

async function handleNavigationFallback() {
    const cachedIndex = await caches.match('./index.html');
    if (cachedIndex) return cachedIndex;
    return new Response(OFFLINE_HTML, {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/html; charset=UTF-8' }
    });
}

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith((async () => {
        const cached = await caches.match(event.request);

        const fetchPromise = fetch(event.request)
            .then(async (response) => {
                if (response && response.ok && event.request.url.startsWith(self.location.origin)) {
                    const clone = response.clone();
                    const cache = await caches.open(CACHE_NAME);
                    if (cached) {
                        try {
                            const oldBody = await cached.clone().text();
                            const newBody = await clone.clone().text();
                            if (oldBody !== newBody) {
                                const clients = await self.clients.matchAll({ type: 'window' });
                                clients.forEach((client) => client.postMessage({ type: 'SW_UPDATED' }));
                            }
                        } catch (_) {
                            // Skip update comparison for non-text responses.
                        }
                    }
                    cache.put(event.request, clone).catch(() => {});
                }
                return response;
            })
            .catch(() => null);

        if (cached) return cached;

        const response = await fetchPromise;
        if (response) return response;

        if (event.request.mode === 'navigate') {
            return handleNavigationFallback();
        }

        const url = event.request.url;
        if (url.endsWith('.js')) {
            return new Response('/* offline */', {
                status: 503,
                headers: { 'Content-Type': 'application/javascript' }
            });
        }
        if (url.endsWith('.css')) {
            return new Response('/* offline */', {
                status: 503,
                headers: { 'Content-Type': 'text/css' }
            });
        }

        return new Response('Service Unavailable', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
        });
    })());
});

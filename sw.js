// Import shared version constant so cache version lives in one place
importScripts('./js/version.js');
const CACHE_VERSION = (typeof APP_VERSION !== 'undefined') ? APP_VERSION : 12;
const CACHE_NAME = `my-little-friend-v${CACHE_VERSION}`;

const ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './css/base.css',
    './css/layout.css',
    './css/components.css',
    './css/pets.css',
    './css/rooms.css',
    './css/animations.css',
    './css/minigames.css',
    './css/accessibility.css',
    './js/version.js',
    './js/utils.js',
    './js/balance.js',
    './js/eventbus.js',
    './js/state.js',
    './js/constants.js',
    './js/garden-features-core.js',
    './js/modal-manager.js',
    './js/svg.js',
    './js/sound.js',
    './js/game.js',
    './js/ui.js',
    './js/minigames.js',
    './js/competition.js',
    './js/data/pet-types.js',
    './js/data/items.js',
    './js/data/rooms.js',
    './js/data/achievements.js',
    './js/data/narrative.js',
    './js/core.js',
    './js/economy.js',
    './js/exploration.js',
    './js/achievements.js',
    './js/breeding.js',
    './js/garden.js',
    './js/decay.js',
    './js/growth.js',
    './js/weather.js',
    './js/rooms.js',
    './js/personality.js',
    './js/caretaker.js',
    './js/ui/rendering.js',
    './js/ui/notifications.js',
    './js/ui/animations.js',
    './js/ui/modals.js',
    './js/ui/settings.js',
    './js/ui/furniture.js',
    './js/ui/economy.js',
    './js/ui/exploration.js',
    './js/ui/breeding.js',
    './js/ui/actions.js',
    './js/minigames/framework.js',
    './js/minigames/fetch.js',
    './js/minigames/hideseek.js',
    './js/minigames/bubblepop.js',
    './js/minigames/matching.js',
    './js/minigames/simonsays.js',
    './js/minigames/coloring.js',
    './js/minigames/racing.js',
    './js/minigames/cooking.js',
    './js/minigames/fishing.js',
    './js/minigames/rhythm.js',
    './js/minigames/slider.js',
    './js/minigames/trivia.js',
    './js/minigames/runner.js',
    './js/minigames/tournament.js',
    './js/minigames/coop.js',
    './assets/audio/README.md',
    './assets/audio/music/cozy_day_loop.wav',
    './assets/audio/music/cozy_night_loop.wav',
    './assets/audio/sfx/achievement.wav',
    './assets/audio/sfx/bubblePop.wav',
    './assets/audio/sfx/catch.wav',
    './assets/audio/sfx/celebration.wav',
    './assets/audio/sfx/cuddle.wav',
    './assets/audio/sfx/exercise.wav',
    './assets/audio/sfx/feed.wav',
    './assets/audio/sfx/groom.wav',
    './assets/audio/sfx/hit.wav',
    './assets/audio/sfx/match.wav',
    './assets/audio/sfx/medicine.wav',
    './assets/audio/sfx/miss.wav',
    './assets/audio/sfx/petExcited.wav',
    './assets/audio/sfx/petHappy.wav',
    './assets/audio/sfx/petSad.wav',
    './assets/audio/sfx/play.wav',
    './assets/audio/sfx/roomTransition.wav',
    './assets/audio/sfx/sleep.wav',
    './assets/audio/sfx/throw.wav',
    './assets/audio/sfx/treat.wav',
    './assets/audio/sfx/wash.wav',
    './manifest.json',
    './icon-512.svg',
    './icon-512-maskable.svg',
    './icon-192.svg',
    './icon-192-maskable.svg',
    './apple-touch-icon.svg',
    './apple-touch-icon.png',
    './icon-192.png',
    './icon-512.png'
];

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

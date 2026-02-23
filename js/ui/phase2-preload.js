(function phase2PreloadBootstrap() {
    if (window.__phase2PreloadBootstrap) return;
    window.__phase2PreloadBootstrap = true;

    const PRELOAD_STATE = {
        criticalTotal: 0,
        criticalLoaded: 0,
        lazyTotal: 0,
        lazyLoaded: 0,
        ready: false,
        startedAt: Date.now(),
        readyResolved: false
    };

    const CRITICAL_IMAGE_ASSETS = [
        'assets/icons/ui/state.svg',
        'assets/icons/ui/feed.svg',
        'assets/icons/ui/wash.svg',
        'assets/icons/ui/play.svg',
        'assets/icons/ui/gamepad.svg',
        'assets/icons/ui/coin.svg',
        'assets/icons/ui/reward.svg',
        'assets/icons/ui/trophy.svg',
        'assets/icons/ui/badge.svg',
        'assets/icons/ui/hunger.svg',
        'assets/icons/ui/clean.svg',
        'assets/icons/ui/mood.svg',
        'assets/icons/ui/energy.svg',
        'assets/icons/ui/streak.svg',
        'assets/props/room-art/shared-front.svg',
        'assets/props/room-art/bedroom-back.svg',
        'assets/props/room-art/kitchen-back.svg',
        'assets/props/room-art/garden-back.svg',
        'assets/props/toy-bin.svg',
        'assets/props/towel-rack.svg'
    ];

    const LAZY_IMAGE_ASSETS = [
        'assets/props/room-art/park-back.svg',
        'assets/props/room-art/backyard-back.svg',
        'assets/props/room-art/bathroom-back.svg',
        'assets/props/room-art/library-back.svg',
        'assets/props/room-art/spa-back.svg',
        'assets/props/room-art/observatory-back.svg',
        'assets/props/room-art/arcade-back.svg',
        'assets/props/room-art/workshop-back.svg',
        'assets/props/flower-pot.svg',
        'assets/props/wall-plant.svg',
        'assets/props/watering-can.svg',
        'assets/props/picnic-basket.svg',
        'assets/props/soap-stack.svg',
        'assets/props/garden-lantern.svg',
        'assets/props/tea-shelf.svg',
        'assets/props/bench-plaque.svg'
    ];

    // Assumption: pets are largely generated SVG/DOM, so there are no heavy sprite sheets to preload.
    // We focus on UI iconography + room art that visibly pops in on early renders.
    const CRITICAL_AUDIO_HINTS = [
        'assets/audio/sfx/room-transition.ogg',
        'assets/audio/sfx/achievement.ogg',
        'assets/audio/ui/ui-confirm.ogg',
        'assets/audio/ui/ui-error.ogg'
    ];

    const listeners = new Set();
    let splashProgressEl = null;
    let splashProgressFillEl = null;
    let splashLabelEl = null;
    let pendingSplashDismissArgs = null;
    let pendingSplashDismissRequested = false;
    let splashDismissPatched = false;
    let splashDismissForceTimer = null;

    function ensurePhase2ReadyPromise() {
        if (!window.__phase2Ready || typeof window.__phase2Ready.then !== 'function') {
            window.__phase2Ready = new Promise((resolve) => {
                window.__resolvePhase2Ready = function resolvePhase2Ready(detail) {
                    resolve(detail || getState());
                };
            });
            return;
        }
        if (typeof window.__resolvePhase2Ready !== 'function') {
            window.__resolvePhase2Ready = function resolvePhase2Ready() {};
        }
    }

    function resolvePhase2Ready() {
        if (PRELOAD_STATE.readyResolved) return;
        PRELOAD_STATE.readyResolved = true;
        try {
            if (typeof window.__resolvePhase2Ready === 'function') {
                window.__resolvePhase2Ready(getState());
            }
        } catch (e) {}
    }

    function emitProgress(kind, asset, ok) {
        const detail = {
            kind,
            asset,
            ok: ok !== false,
            state: getState()
        };
        listeners.forEach((fn) => {
            try { fn(detail); } catch (e) {}
        });
        try {
            window.dispatchEvent(new CustomEvent('phase2:assets-progress', { detail }));
        } catch (e) {}
        syncSplashProgressUI();
    }

    function getState() {
        return {
            criticalTotal: PRELOAD_STATE.criticalTotal,
            criticalLoaded: PRELOAD_STATE.criticalLoaded,
            lazyTotal: PRELOAD_STATE.lazyTotal,
            lazyLoaded: PRELOAD_STATE.lazyLoaded,
            ready: PRELOAD_STATE.ready,
            progress: PRELOAD_STATE.criticalTotal > 0 ? (PRELOAD_STATE.criticalLoaded / PRELOAD_STATE.criticalTotal) : 1,
            elapsedMs: Date.now() - PRELOAD_STATE.startedAt
        };
    }

    function onProgress(fn) {
        if (typeof fn !== 'function') return function noop() {};
        listeners.add(fn);
        return () => listeners.delete(fn);
    }

    function ensureSplashProgressUI() {
        const splash = document.getElementById('splash-screen');
        if (!splash) return;
        if (splashProgressEl && splashProgressEl.isConnected) return;
        let holder = splash.querySelector('.phase2-splash-progress');
        if (!holder) {
            holder = document.createElement('div');
            holder.className = 'phase2-splash-progress';
            holder.setAttribute('aria-hidden', 'true');
            holder.style.cssText = 'width:min(240px,70vw);margin-top:10px;display:flex;flex-direction:column;gap:6px;';
            holder.innerHTML = [
                '<div class="phase2-splash-progress-track" style="height:8px;border-radius:999px;background:rgba(93,64,55,0.12);overflow:hidden;box-shadow:inset 0 1px 2px rgba(0,0,0,0.08);">',
                '  <div class="phase2-splash-progress-fill" style="height:100%;width:8%;border-radius:999px;background:linear-gradient(90deg,#8ED1C6,#A8D8EA,#FFD166);transition:width 160ms ease;"></div>',
                '</div>',
                '<div class="phase2-splash-progress-label" style="font:600 12px/1.2 Nunito,sans-serif;color:#6D4C41;text-align:center;">Loading art & UI…</div>'
            ].join('');
            splash.appendChild(holder);
        }
        splashProgressEl = holder;
        splashProgressFillEl = holder.querySelector('.phase2-splash-progress-fill');
        splashLabelEl = holder.querySelector('.phase2-splash-progress-label');
    }

    function syncSplashProgressUI() {
        ensureSplashProgressUI();
        if (!splashProgressEl) return;
        const state = getState();
        const pct = Math.max(0, Math.min(100, Math.round(state.progress * 100)));
        if (splashProgressFillEl) splashProgressFillEl.style.width = `${Math.max(8, pct)}%`;
        if (splashLabelEl) {
            if (!state.ready) {
                splashLabelEl.textContent = `Loading art & UI… ${pct}%`;
            } else {
                splashLabelEl.textContent = 'Ready!';
            }
        }
    }

    function patchSplashDismiss() {
        if (splashDismissPatched) return;
        splashDismissPatched = true;
        const originalDismiss = typeof window.dismissSplashScreen === 'function' ? window.dismissSplashScreen.bind(window) : null;
        if (!originalDismiss) return;

        window.dismissSplashScreen = function patchedDismissSplashScreen(options) {
            if (PRELOAD_STATE.ready) {
                originalDismiss(options);
                return;
            }
            pendingSplashDismissRequested = true;
            pendingSplashDismissArgs = options;
            if (!splashDismissForceTimer) {
                splashDismissForceTimer = setTimeout(() => {
                    const args = pendingSplashDismissArgs;
                    pendingSplashDismissRequested = false;
                    pendingSplashDismissArgs = null;
                    splashDismissForceTimer = null;
                    originalDismiss(args || {});
                }, 1800);
            }
        };

        const tryRelease = () => {
            if (!PRELOAD_STATE.ready || !pendingSplashDismissRequested) return;
            if (splashDismissForceTimer) {
                clearTimeout(splashDismissForceTimer);
                splashDismissForceTimer = null;
            }
            const args = pendingSplashDismissArgs;
            pendingSplashDismissRequested = false;
            pendingSplashDismissArgs = null;
            originalDismiss(args || {});
        };

        onProgress(() => tryRelease());
    }

    function markCriticalDone(asset, ok) {
        PRELOAD_STATE.criticalLoaded += 1;
        emitProgress('critical', asset, ok);
        if (PRELOAD_STATE.criticalLoaded >= PRELOAD_STATE.criticalTotal && !PRELOAD_STATE.ready) {
            PRELOAD_STATE.ready = true;
            document.documentElement.classList.add('phase2-assets-ready');
            document.documentElement.classList.remove('phase2-assets-preloading');
            emitProgress('ready', null, true);
            resolvePhase2Ready();
            try {
                window.dispatchEvent(new CustomEvent('phase2:assets-ready', { detail: getState() }));
            } catch (e) {}
            if (typeof window.dismissSplashScreen === 'function') {
                window.dismissSplashScreen();
            }
        }
    }

    function markLazyDone(asset, ok) {
        PRELOAD_STATE.lazyLoaded += 1;
        emitProgress('lazy', asset, ok);
    }

    function preloadImage(src, onDone) {
        try {
            const img = new Image();
            let finished = false;
            const finish = (ok) => {
                if (finished) return;
                finished = true;
                onDone(ok);
            };
            img.decoding = 'async';
            img.onload = () => finish(true);
            img.onerror = () => finish(false);
            img.src = src;
            if (img.complete) {
                // Cached hits may already be complete.
                queueMicrotask(() => finish(true));
            }
            return img;
        } catch (e) {
            onDone(false);
            return null;
        }
    }

    function preloadAudioHint(src, onDone) {
        try {
            const audio = new Audio();
            audio.preload = 'auto';
            let finished = false;
            const finish = (ok) => {
                if (finished) return;
                finished = true;
                audio.oncanplaythrough = null;
                audio.onerror = null;
                onDone(ok);
            };
            audio.oncanplaythrough = () => finish(true);
            audio.onerror = () => finish(false);
            audio.src = src;
            audio.load();
            setTimeout(() => finish(true), 900);
            return audio;
        } catch (e) {
            onDone(false);
            return null;
        }
    }

    function scheduleIdle(fn, timeout) {
        if (typeof window.requestIdleCallback === 'function') {
            return window.requestIdleCallback(fn, { timeout: timeout || 1200 });
        }
        return setTimeout(fn, Math.min(timeout || 1200, 450));
    }

    function runCriticalPreload() {
        const imageAssets = Array.from(new Set(CRITICAL_IMAGE_ASSETS));
        const audioAssets = Array.from(new Set(CRITICAL_AUDIO_HINTS));
        PRELOAD_STATE.criticalTotal = imageAssets.length + audioAssets.length;
        PRELOAD_STATE.criticalLoaded = 0;
        document.documentElement.classList.add('phase2-assets-preloading');
        syncSplashProgressUI();

        if (PRELOAD_STATE.criticalTotal === 0) {
            PRELOAD_STATE.ready = true;
            emitProgress('ready', null, true);
            resolvePhase2Ready();
            return;
        }

        imageAssets.forEach((src) => preloadImage(src, (ok) => markCriticalDone(src, ok)));
        audioAssets.forEach((src) => preloadAudioHint(src, (ok) => markCriticalDone(src, ok)));
    }

    function runLazyPreload() {
        const lazyAssets = Array.from(new Set(LAZY_IMAGE_ASSETS));
        PRELOAD_STATE.lazyTotal = lazyAssets.length;
        PRELOAD_STATE.lazyLoaded = 0;
        if (!lazyAssets.length) return;

        let idx = 0;
        const pump = () => {
            const chunk = lazyAssets.slice(idx, idx + 2);
            idx += chunk.length;
            chunk.forEach((src) => preloadImage(src, (ok) => markLazyDone(src, ok)));
            if (idx < lazyAssets.length) scheduleIdle(pump, 1800);
        };
        scheduleIdle(pump, 1200);
    }

    function primeLinkPreloads() {
        const head = document.head;
        if (!head) return;
        CRITICAL_IMAGE_ASSETS.slice(0, 6).forEach((href) => {
            if (head.querySelector(`link[rel="preload"][href="${href}"]`)) return;
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = href;
            head.appendChild(link);
        });
    }

    function start() {
        ensurePhase2ReadyPromise();
        patchSplashDismiss();
        primeLinkPreloads();
        ensureSplashProgressUI();
        runCriticalPreload();
        runLazyPreload();
    }

    window.Phase2AssetPreloader = {
        start,
        getState,
        onProgress,
        scheduleIdle,
        isReady: () => PRELOAD_STATE.ready
    };

    start();
})();

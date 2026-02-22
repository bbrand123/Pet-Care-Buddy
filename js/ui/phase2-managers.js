(function phase2PolishRuntime() {
    if (window.__phase2PolishRuntime) return;
    window.__phase2PolishRuntime = true;

    const STORAGE = {
        qualityMode: 'phase2.quality.mode',
        reduceEffects: 'phase2.effects.reduce',
        favorites: 'phase2.quickActions.favorites'
    };

    const OVERLAY_SELECTOR = [
        '.settings-overlay',
        '.modal-overlay',
        '.welcome-back-overlay',
        '.naming-overlay',
        '.feed-menu-overlay',
        '.minigame-menu-overlay',
        '.minigame-summary-overlay',
        '.competition-overlay',
        '.tutorial-overlay',
        '[role="dialog"]',
        '[role="alertdialog"]'
    ].join(',');

    const UI = {
        isElement(value) {
            return value && typeof value === 'object' && value.nodeType === 1;
        },
        getTextLabel(el) {
            if (!UI.isElement(el)) return '';
            const labeledChild = el.querySelector ? el.querySelector('[aria-label]') : null;
            return (
                el.getAttribute('aria-label') ||
                el.getAttribute('title') ||
                (labeledChild && labeledChild.getAttribute && labeledChild.getAttribute('aria-label')) ||
                (el.textContent || '')
            ).replace(/\s+/g, ' ').trim();
        },
        safeStorageGet(key, fallback) {
            try {
                const value = localStorage.getItem(key);
                return value == null ? fallback : value;
            } catch (e) {
                return fallback;
            }
        },
        safeStorageSet(key, value) {
            try { localStorage.setItem(key, value); } catch (e) {}
        },
        isReducedMotion() {
            const attr = document.documentElement.getAttribute('data-reduced-motion') === 'true';
            const media = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
            return attr || media;
        },
        isReducedTransparency() {
            try {
                return !!(window.matchMedia && window.matchMedia('(prefers-reduced-transparency: reduce)').matches);
            } catch (e) {
                return false;
            }
        },
        hasOpenDialog() {
            return !!document.querySelector(OVERLAY_SELECTOR);
        },
        topOverlay() {
            const overlays = Array.from(document.querySelectorAll(OVERLAY_SELECTOR)).filter((el) => el && el.isConnected);
            if (!overlays.length) return null;
            return overlays[overlays.length - 1];
        },
        nextFrame() {
            return new Promise((resolve) => requestAnimationFrame(resolve));
        },
        clamp(n, min, max) {
            return Math.max(min, Math.min(max, n));
        },
        readFavorites() {
            try {
                const raw = localStorage.getItem(STORAGE.favorites);
                if (!raw) return {};
                const parsed = JSON.parse(raw);
                return parsed && typeof parsed === 'object' ? parsed : {};
            } catch (e) {
                return {};
            }
        },
        writeFavorites(map) {
            try { localStorage.setItem(STORAGE.favorites, JSON.stringify(map || {})); } catch (e) {}
        }
    };

    const QualityManager = (() => {
        let autoTier = 'high';
        let effectiveTier = 'high';
        let mode = normalizeMode(UI.safeStorageGet(STORAGE.qualityMode, 'auto'));
        let reduceEffects = UI.safeStorageGet(STORAGE.reduceEffects, 'false') === 'true';
        let sampleInFlight = false;
        let lastSample = null;

        function normalizeMode(value) {
            const v = String(value || 'auto').toLowerCase();
            return ['auto', 'high', 'medium', 'low'].includes(v) ? v : 'auto';
        }

        function detectTierHeuristic() {
            if (UI.isReducedMotion()) return 'low';
            const mem = Number(navigator.deviceMemory || 0);
            const cores = Number(navigator.hardwareConcurrency || 0);
            const mobileTouch = !!(document.documentElement.classList.contains('mobile-ui') || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches));
            let score = 0;
            if (mem >= 6) score += 2;
            else if (mem >= 4) score += 1;
            else if (mem > 0 && mem <= 2) score -= 2;
            if (cores >= 6) score += 2;
            else if (cores >= 4) score += 1;
            else if (cores > 0 && cores <= 2) score -= 1;
            if (mobileTouch) score -= 1;
            if (UI.isReducedTransparency()) score -= 1;
            if (score <= -1) return 'low';
            if (score <= 1) return 'medium';
            return 'high';
        }

        function apply() {
            autoTier = detectTierHeuristic();
            effectiveTier = mode === 'auto' ? autoTier : mode;
            if (reduceEffects && effectiveTier === 'high') effectiveTier = 'medium';
            if (UI.isReducedMotion()) effectiveTier = 'low';
            document.documentElement.setAttribute('data-quality-mode', mode);
            document.documentElement.setAttribute('data-quality-tier', effectiveTier);
            document.documentElement.setAttribute('data-reduce-effects', reduceEffects ? 'true' : 'false');
            document.documentElement.setAttribute('data-reduced-transparency', UI.isReducedTransparency() ? 'true' : 'false');
            try {
                window.dispatchEvent(new CustomEvent('phase2:quality-changed', {
                    detail: { mode, autoTier, effectiveTier, reduceEffects, lastSample }
                }));
            } catch (e) {}
        }

        function setMode(nextMode) {
            mode = normalizeMode(nextMode);
            UI.safeStorageSet(STORAGE.qualityMode, mode);
            apply();
            return getState();
        }

        function setReduceEffects(enabled) {
            reduceEffects = !!enabled;
            UI.safeStorageSet(STORAGE.reduceEffects, reduceEffects ? 'true' : 'false');
            apply();
            return getState();
        }

        function getState() {
            return { mode, autoTier, effectiveTier, reduceEffects, lastSample };
        }

        function getParticleBudget(base) {
            const n = Math.max(1, Number(base) || 1);
            if (effectiveTier === 'low') return Math.max(1, Math.floor(n * 0.35));
            if (effectiveTier === 'medium') return Math.max(1, Math.floor(n * 0.65));
            return n;
        }

        function getAnimationScale() {
            if (UI.isReducedMotion()) return 0;
            if (reduceEffects) return 0.6;
            if (effectiveTier === 'low') return 0.45;
            if (effectiveTier === 'medium') return 0.8;
            return 1;
        }

        function sampleFrames(durationMs = 1200) {
            if (sampleInFlight || document.visibilityState === 'hidden') return Promise.resolve(lastSample);
            sampleInFlight = true;
            const deltas = [];
            let rafId = 0;
            const started = performance.now();
            let prev = started;
            return new Promise((resolve) => {
                const tick = (now) => {
                    deltas.push(now - prev);
                    prev = now;
                    if ((now - started) < durationMs && deltas.length < 120) {
                        rafId = requestAnimationFrame(tick);
                        return;
                    }
                    if (rafId) cancelAnimationFrame(rafId);
                    sampleInFlight = false;
                    const trimmed = deltas.slice(5);
                    const sorted = trimmed.slice().sort((a, b) => a - b);
                    const avg = trimmed.length ? trimmed.reduce((sum, n) => sum + n, 0) / trimmed.length : 16.7;
                    const p90 = sorted.length ? sorted[Math.floor(sorted.length * 0.9)] : avg;
                    lastSample = { avgMs: avg, p90Ms: p90, count: trimmed.length, at: Date.now() };
                    if (mode === 'auto') {
                        if (p90 > 28 || avg > 24) autoTier = 'low';
                        else if (p90 > 21 || avg > 18.5) autoTier = 'medium';
                        else autoTier = detectTierHeuristic();
                        apply();
                    }
                    resolve(lastSample);
                };
                rafId = requestAnimationFrame(tick);
            });
        }

        apply();
        setTimeout(() => sampleFrames(1500), 900);
        window.addEventListener('pageshow', () => setTimeout(() => sampleFrames(1000), 500));
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') setTimeout(() => sampleFrames(900), 300);
        });

        return {
            getState,
            setMode,
            setReduceEffects,
            sampleFrames,
            getParticleBudget,
            getAnimationScale,
            getEffectiveTier: () => effectiveTier,
            isReduceEffectsOn: () => reduceEffects
        };
    })();
    window.UIQualityManager = QualityManager;

    const GameTransitions = (() => {
        const originalRemove = Element.prototype.remove;
        const noAnimate = new WeakSet();
        let removePatched = false;

        function durationFor(kind) {
            if (UI.isReducedMotion()) return 0;
            const scale = QualityManager.getAnimationScale();
            if (kind === 'overlay') return Math.round(220 * Math.max(0.45, scale));
            if (kind === 'toast') return Math.round(150 * Math.max(0.5, scale));
            if (kind === 'reward') return Math.round(200 * Math.max(0.5, scale));
            return Math.round(170 * Math.max(0.45, scale));
        }

        function classify(el) {
            if (!UI.isElement(el)) return null;
            if (el.classList.contains('phase2-particle') || el.id === 'phase2-fx-layer') return null;
            if (el.matches('.toast')) return 'toast';
            if (el.matches('.reward-card-pop')) return 'reward';
            if (el.matches('.phase2-quick-actions-overlay')) return 'overlay';
            return null;
        }

        function enter(el, kindHint) {
            if (!UI.isElement(el) || !el.isConnected) return;
            const kind = kindHint || classify(el);
            if (!kind) return;
            el.classList.add('phase2-enter');
            el.classList.add(`phase2-enter-${kind}`);
            requestAnimationFrame(() => {
                if (!el.isConnected) return;
                el.classList.add('phase2-enter-active');
                const ms = durationFor(kind);
                setTimeout(() => {
                    el.classList.remove('phase2-enter', 'phase2-enter-active', `phase2-enter-${kind}`);
                }, ms + 40);
            });
        }

        function exit(el, kindHint, onDone) {
            const kind = kindHint || classify(el);
            if (!UI.isElement(el) || !kind) {
                if (typeof onDone === 'function') onDone();
                return;
            }
            const ms = durationFor(kind);
            if (ms <= 0 || noAnimate.has(el) || el.dataset.phase2Exiting === 'true') {
                if (typeof onDone === 'function') onDone();
                return;
            }
            el.dataset.phase2Exiting = 'true';
            el.classList.add('phase2-exit');
            el.classList.add(`phase2-exit-${kind}`);
            setTimeout(() => {
                delete el.dataset.phase2Exiting;
                if (typeof onDone === 'function') onDone();
            }, ms);
        }

        function markNoAnimate(el) {
            if (UI.isElement(el)) noAnimate.add(el);
        }

        function patchRemove() {
            if (removePatched) return;
            removePatched = true;
            Element.prototype.remove = function patchedRemove() {
                const el = this;
                const kind = classify(el);
                if (!kind || !el.isConnected || UI.isReducedMotion() || noAnimate.has(el) || el.dataset.phase2Exiting === 'true') {
                    return originalRemove.call(el);
                }
                return exit(el, kind, () => originalRemove.call(el));
            };
        }

        function animateGameContentSwap() {
            const content = document.getElementById('game-content');
            if (!content) return;
            content.classList.remove('phase2-screen-swap');
            requestAnimationFrame(() => {
                content.classList.add('phase2-screen-swap');
                setTimeout(() => content.classList.remove('phase2-screen-swap'), durationFor('overlay') + 80);
            });
        }

        function patchRenderFns() {
            ['renderPetPhase', 'renderEggPhase'].forEach((name) => {
                const original = window[name];
                if (typeof original !== 'function' || original.__phase2Wrapped) return;
                const wrapped = function phase2WrappedRender() {
                    const result = original.apply(this, arguments);
                    animateGameContentSwap();
                    queueMicrotask(() => {
                        document.querySelectorAll('.pet-area, .top-action-bar, .room-nav, .core-care-dock, .settings-overlay, .modal-overlay').forEach((el) => enter(el));
                    });
                    return result;
                };
                wrapped.__phase2Wrapped = true;
                window[name] = wrapped;
            });
        }

        function observeAddedNodes() {
            if (!document.body || typeof MutationObserver === 'undefined') return;
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (!UI.isElement(node)) return;
                        if (node.matches && (node.matches(OVERLAY_SELECTOR) || node.matches('.toast, .reward-card-pop, .pet-area, .top-action-bar, .room-nav'))) {
                            enter(node);
                        }
                        if (node.querySelectorAll) {
                            node.querySelectorAll(`${OVERLAY_SELECTOR}, .toast, .reward-card-pop`).forEach((el) => enter(el));
                        }
                    });
                });
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }

        patchRemove();
        patchRenderFns();
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', observeAddedNodes, { once: true });
        } else {
            observeAddedNodes();
        }

        return { enter, exit, markNoAnimate, animateGameContentSwap };
    })();
    window.GameTransitions = GameTransitions;

    const UIParticles = (() => {
        const pool = [];
        let layer = null;
        let activeCount = 0;
        const MAX_POOL = 36;

        function ensureLayer() {
            if (layer && layer.isConnected) return layer;
            layer = document.createElement('div');
            layer.id = 'phase2-fx-layer';
            layer.setAttribute('aria-hidden', 'true');
            document.body.appendChild(layer);
            return layer;
        }

        function acquire() {
            if (pool.length) return pool.pop();
            const el = document.createElement('span');
            el.className = 'phase2-particle';
            return el;
        }

        function release(el) {
            if (!el) return;
            el.className = 'phase2-particle';
            el.textContent = '';
            el.removeAttribute('style');
            if (el.parentNode) {
                GameTransitions.markNoAnimate(el);
                el.remove();
            }
            if (pool.length < MAX_POOL) pool.push(el);
            activeCount = Math.max(0, activeCount - 1);
        }

        function pointFromAnchor(anchor) {
            if (anchor && anchor.clientX != null && anchor.clientY != null) {
                return { x: anchor.clientX, y: anchor.clientY };
            }
            if (UI.isElement(anchor)) {
                const rect = anchor.getBoundingClientRect();
                return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            }
            const pet = document.getElementById('pet-container');
            if (pet) {
                const rect = pet.getBoundingClientRect();
                return { x: rect.left + rect.width / 2, y: rect.top + rect.height * 0.35 };
            }
            return { x: window.innerWidth / 2, y: window.innerHeight * 0.42 };
        }

        function emit(type, anchor) {
            const reducedMotion = UI.isReducedMotion();
            const point = pointFromAnchor(anchor);
            const fxLayer = ensureLayer();
            if (!fxLayer) return;

            if (reducedMotion) {
                const pulse = document.createElement('div');
                pulse.className = `phase2-impact-flash ${type || 'success'}`;
                pulse.style.left = `${point.x}px`;
                pulse.style.top = `${point.y}px`;
                fxLayer.appendChild(pulse);
                setTimeout(() => pulse.remove(), 220);
                return;
            }

            const spec = {
                success: { glyphs: ['✦', '•', '✧'], count: 10, life: 620, hue: ['#ffe082', '#80deea', '#a5d6a7'] },
                reward: { glyphs: ['✦', '★', '•'], count: 14, life: 760, hue: ['#ffd54f', '#ffcc80', '#fff59d'] },
                failure: { glyphs: ['•', '✕'], count: 7, life: 420, hue: ['#ef9a9a', '#b0bec5'] },
                poof: { glyphs: ['•', '·'], count: 8, life: 360, hue: ['#cfd8dc', '#b0bec5'] },
                glow: { glyphs: ['✧'], count: 6, life: 520, hue: ['#b39ddb', '#80cbc4'] }
            }[type || 'success'] || { glyphs: ['•'], count: 8, life: 500, hue: ['#ffffff'] };

            const count = QualityManager.getParticleBudget(spec.count);
            const budgetCap = QualityManager.getEffectiveTier() === 'low' ? 10 : (QualityManager.getEffectiveTier() === 'medium' ? 18 : 28);
            if (activeCount >= budgetCap) return;

            for (let i = 0; i < count && activeCount < budgetCap; i++) {
                const el = acquire();
                activeCount += 1;
                const angle = (Math.PI * 2 * i) / Math.max(1, count) + (Math.random() * 0.45);
                const radius = 18 + Math.random() * (type === 'reward' ? 44 : 30);
                const dx = Math.cos(angle) * radius;
                const dy = Math.sin(angle) * radius - (type === 'failure' || type === 'poof' ? 4 : 10);
                const driftX = (Math.random() - 0.5) * 14;
                const driftY = -14 - Math.random() * 28;
                const life = Math.round(spec.life * (0.75 + Math.random() * 0.35));
                el.className = `phase2-particle ${type}`;
                el.textContent = spec.glyphs[Math.floor(Math.random() * spec.glyphs.length)];
                el.style.left = `${point.x}px`;
                el.style.top = `${point.y}px`;
                el.style.setProperty('--dx', `${dx + driftX}px`);
                el.style.setProperty('--dy', `${dy + driftY}px`);
                el.style.setProperty('--particle-life', `${life}ms`);
                el.style.setProperty('--particle-color', spec.hue[Math.floor(Math.random() * spec.hue.length)]);
                el.style.fontSize = `${10 + Math.random() * 8}px`;
                fxLayer.appendChild(el);
                setTimeout(() => release(el), life + 50);
            }
        }

        function shake(target, intensity) {
            if (UI.isReducedMotion()) return;
            const el = target || document.querySelector('.game-container');
            if (!UI.isElement(el)) return;
            el.style.setProperty('--shake-intensity', `${Math.round(intensity || 4)}px`);
            el.style.setProperty('--shake-duration', `${QualityManager.getEffectiveTier() === 'low' ? 160 : 220}ms`);
            el.classList.remove('screen-shake');
            void el.offsetWidth;
            el.classList.add('screen-shake');
        }

        return { emit, shake };
    })();
    window.UIParticles = UIParticles;

    const UIFeedbackManager = (() => {
        const throttleMap = new Map();

        function now() { return Date.now(); }

        function throttled(key, minMs) {
            const t = now();
            const last = throttleMap.get(key) || 0;
            if (t - last < minMs) return true;
            throttleMap.set(key, t);
            return false;
        }

        function hapticsEnabled() {
            try {
                if (typeof STORAGE_KEYS !== 'undefined' && STORAGE_KEYS && STORAGE_KEYS.hapticOff) {
                    return localStorage.getItem(STORAGE_KEYS.hapticOff) !== 'true';
                }
                return true;
            } catch (e) {
                return true;
            }
        }

        function fireHaptic(type, options = {}) {
            if (!hapticsEnabled()) return false;
            if (options.throttleKey && throttled(`h:${options.throttleKey}`, options.throttleMs || 120)) return false;
            try {
                if (typeof window.postNativeHaptic === 'function') {
                    return !!window.postNativeHaptic(type, options);
                }
                const handler = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.haptics;
                if (handler && typeof handler.postMessage === 'function') {
                    handler.postMessage({ type, strength: options.strength || null, action: options.action || null });
                    return true;
                }
                if (navigator.vibrate) {
                    const pattern = options.pattern || (type === 'success' ? [20, 18, 26] : type === 'error' ? [28, 28, 28] : [12]);
                    navigator.vibrate(pattern);
                    return true;
                }
            } catch (e) {}
            return false;
        }

        function playSfx(name, throttleKey, throttleMs) {
            if (throttleKey && throttled(`s:${throttleKey}`, throttleMs || 90)) return false;
            try {
                if (typeof SoundManager === 'undefined' || !SoundManager || typeof SoundManager.playSFXByName !== 'function') return false;
                if (typeof SoundManager.getEnabled === 'function' && !SoundManager.getEnabled()) return false;
                SoundManager.playSFXByName(name, (SoundManager.sfx && (SoundManager.sfx[name] || SoundManager.sfx.play)) || null);
                return true;
            } catch (e) {
                return false;
            }
        }

        function semanticFromText(message, color) {
            const text = String(message || '').toLowerCase();
            const c = String(color || '').toLowerCase();
            if (/achievement|reward|unlocked|earned|success|ready|joined your family|found/.test(text)) return 'success';
            if (/warning|cannot|can't|failed|unavailable|need |error|locked|cooldown/.test(text)) return 'warning';
            if (c === '#ffd700' || c.includes('ffd700')) return 'success';
            if (c === '#ffa726' || c.includes('ffa726')) return 'warning';
            return 'neutral';
        }

        function feedbackForToast(meta, toastEl) {
            const semantic = semanticFromText(meta.message, meta.color);
            if (semantic === 'success') {
                fireHaptic(/achievement|reward|unlocked|earned/.test(String(meta.message || '').toLowerCase()) ? 'success' : 'confirm', { strength: 'light', throttleKey: 'toast-success', throttleMs: 180 });
                if (/achievement|reward|unlocked|earned/.test(String(meta.message || '').toLowerCase())) {
                    playSfx('reward-pop', 'toast-reward', 260);
                    if (!throttled('toast-reward-particles', 260)) UIParticles.emit('reward', toastEl || document.getElementById('pet-container'));
                } else {
                    if (!throttled('toast-success-particles', 180)) UIParticles.emit('success', toastEl || document.getElementById('pet-container'));
                }
                return;
            }
            if (semantic === 'warning') {
                fireHaptic(/error|failed/.test(String(meta.message || '').toLowerCase()) ? 'error' : 'warning', { strength: 'medium', throttleKey: 'toast-warning', throttleMs: 220 });
                if (/error|failed|cannot|can't|locked/.test(String(meta.message || '').toLowerCase())) {
                    playSfx('error-soft', 'toast-error-sfx', 220);
                    if (!throttled('toast-error-particles', 220)) UIParticles.emit('poof', toastEl || document.querySelector('.game-container'));
                    if (!throttled('toast-error-shake', 220)) UIParticles.shake(document.querySelector('.game-container'), 3);
                }
            }
        }

        function buttonTap(target) {
            if (!UI.isElement(target)) return;
            const btn = target.closest('.top-action-btn, .core-care-btn, .action-btn, .room-btn, .settings-toggle, .settings-choice, .settings-preset-btn');
            if (!btn || btn.disabled || btn.getAttribute('aria-disabled') === 'true') return;
            if (throttled(`tap:${btn.id || btn.className}`, 90)) return;
            fireHaptic('confirm', { strength: btn.matches('.room-btn, .top-action-btn') ? 'light' : 'light', throttleKey: 'btn', throttleMs: 60 });
        }

        function overlayOpened(overlay) {
            if (!overlay) return;
            fireHaptic('confirm', { strength: 'light', throttleKey: 'overlay-open', throttleMs: 100 });
            playSfx('menu-open', 'overlay-open', 150);
        }

        function overlayDismissed() {
            fireHaptic('confirm', { strength: 'light', throttleKey: 'overlay-close', throttleMs: 100 });
        }

        function rewardMoment(anchor) {
            fireHaptic('success', { throttleKey: 'reward', throttleMs: 180 });
            playSfx('reward-pop', 'reward', 180);
            UIParticles.emit('reward', anchor || document.getElementById('pet-container'));
        }

        return {
            fireHaptic,
            playSfx,
            feedbackForToast,
            buttonTap,
            overlayOpened,
            overlayDismissed,
            rewardMoment,
            semanticFromText
        };
    })();
    window.UIFeedbackManager = UIFeedbackManager;

    const ToastSystemEnhancer = (() => {
        let showToastOriginal = null;
        const pendingMeta = [];
        let observer = null;

        function extractMeta(message, color, options) {
            return {
                message: String(message || '').replace(/<[^>]*>/g, ''),
                color: color || '#66BB6A',
                options: options || {},
                at: Date.now()
            };
        }

        function iconForSemantic(meta, plainText) {
            const text = String(plainText || meta.message || '');
            const semantic = UIFeedbackManager.semanticFromText(text, meta.color);
            if (semantic === 'success') return '✨';
            if (semantic === 'warning') return '⚠️';
            return '🔔';
        }

        function classifyToastEl(toastEl, meta) {
            if (!toastEl) return;
            const textEl = toastEl.querySelector('.toast-text');
            const plainText = (textEl && textEl.textContent) || (toastEl.textContent || '');
            const semantic = UIFeedbackManager.semanticFromText(plainText, meta && meta.color);
            toastEl.dataset.toastSemantic = semantic;
            toastEl.setAttribute('aria-hidden', 'true');
            const iconEl = toastEl.querySelector('.toast-icon');
            if (iconEl && !iconEl.dataset.phase2Enhanced) {
                iconEl.dataset.phase2Enhanced = 'true';
                const iconText = iconForSemantic(meta || {}, plainText);
                iconEl.innerHTML = `<span class="phase2-toast-icon-badge" aria-hidden="true">${iconText}</span>`;
            }
            if (textEl) {
                const sanitized = plainText.replace(/\s+/g, ' ').trim();
                if (sanitized.length > 110) {
                    textEl.title = sanitized;
                }
            }
            const anchorBottom = 14 + Math.max(0, Math.round((window.visualViewport ? window.visualViewport.offsetTop : 0) / 4));
            const container = toastEl.parentElement;
            if (container) {
                container.style.setProperty('--phase2-toast-bottom', `calc(max(84px, env(safe-area-inset-bottom, 0px) + ${anchorBottom}px))`);
            }
            UIFeedbackManager.feedbackForToast(meta || { message: plainText, color: '#90A4AE' }, toastEl);
        }

        function attachObserver() {
            if (!document.body || observer) return;
            const dialogOverlayClassPattern = /(^|\\s)(settings-overlay|modal-overlay|welcome-back-overlay|naming-overlay|feed-menu-overlay|minigame-menu-overlay|minigame-summary-overlay|competition-overlay|tutorial-overlay|phase2-quick-actions-overlay)(\\s|$)/;
            observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (!UI.isElement(node)) return;
                        if (node.matches('.toast')) {
                            const meta = pendingMeta.shift() || null;
                            classifyToastEl(node, meta);
                        }
                        if (node.matches('.reward-card-pop')) {
                            UIFeedbackManager.rewardMoment(node);
                        }
                        if (node.matches('.offline-update-banner')) {
                            node.classList.add('phase2-world-banner');
                        }
                        if (node.matches(OVERLAY_SELECTOR) || dialogOverlayClassPattern.test(node.className || '')) {
                            UIFeedbackManager.overlayOpened(node);
                        }
                        node.querySelectorAll && node.querySelectorAll('.toast, .reward-card-pop, .offline-update-banner').forEach((child) => {
                            if (child.matches('.toast')) {
                                const meta = pendingMeta.shift() || null;
                                classifyToastEl(child, meta);
                            }
                            if (child.matches('.reward-card-pop')) UIFeedbackManager.rewardMoment(child);
                            if (child.matches('.offline-update-banner')) child.classList.add('phase2-world-banner');
                        });
                    });
                    mutation.removedNodes.forEach((node) => {
                        if (!UI.isElement(node)) return;
                        if (node.matches && (node.matches(OVERLAY_SELECTOR) || dialogOverlayClassPattern.test(node.className || ''))) {
                            UIFeedbackManager.overlayDismissed();
                        }
                    });
                });
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }

        function patchShowToast() {
            if (typeof window.showToast !== 'function' || window.showToast.__phase2Wrapped) return;
            showToastOriginal = window.showToast;
            const wrapped = function phase2ShowToast(message, color, options) {
                pendingMeta.push(extractMeta(message, color, options));
                return showToastOriginal.apply(this, arguments);
            };
            wrapped.__phase2Wrapped = true;
            wrapped.__phase2Original = showToastOriginal;
            window.showToast = wrapped;
        }

        function patchAlertConfirmSurface() {
            if (!window.alert || window.alert.__phase2Wrapped) return;
            const originalAlert = window.alert.bind(window);
            const wrappedAlert = function phase2Alert(message) {
                if (typeof window.showToast === 'function') {
                    window.showToast(String(message || 'Notice'), '#FFA726', { announce: true, priority: 'critical' });
                    return;
                }
                return originalAlert(message);
            };
            wrappedAlert.__phase2Wrapped = true;
            window.alert = wrappedAlert;
        }

        function init() {
            patchShowToast();
            patchAlertConfirmSurface();
            attachObserver();
        }

        return { init };
    })();

    const GestureManager = (() => {
        const config = {
            swipeMinDistance: 74,
            swipeMaxTime: 520,
            swipeAxisRatio: 1.25,
            longPressMs: 420,
            longPressMoveTolerance: 12
        };

        let pointerState = null;
        let longPressTimer = null;
        let quickActionsOverlay = null;

        function isInteractiveTarget(target) {
            if (!UI.isElement(target)) return false;
            return !!target.closest('button, a, input, select, textarea, [role="button"], [role="switch"], [role="slider"]');
        }

        function roomButtons() {
            return Array.from(document.querySelectorAll('.room-btn[data-room]')).filter((btn) => {
                if (!btn || btn.disabled) return false;
                if (btn.getAttribute('aria-disabled') === 'true') return false;
                if (btn.classList.contains('locked')) return false;
                return true;
            });
        }

        function petTabs() {
            return Array.from(document.querySelectorAll('.pet-tab')).filter((btn) => !btn.disabled && btn.getAttribute('aria-disabled') !== 'true');
        }

        function dismissTopOverlayByGesture() {
            const overlay = UI.topOverlay();
            if (!overlay) return false;
            if (!(overlay.matches('.settings-overlay, .modal-overlay, .welcome-back-overlay, .feed-menu-overlay, .minigame-menu-overlay, .minigame-summary-overlay, .competition-overlay') || /overlay/.test(overlay.className || ''))) {
                return false;
            }
            overlay.classList.add('gesture-dismissing');
            if (typeof overlay._closeOverlay === 'function') {
                overlay.style.pointerEvents = 'none';
                GameTransitions.exit(overlay, 'overlay', () => {
                    try { overlay._closeOverlay(); } catch (e) {}
                });
                return true;
            }
            const closeBtn = overlay.querySelector('#settings-close, .modal-close-btn, [data-summary-close], [id$="-close"], .settings-close, .notif-history-close, .tools-menu-close');
            if (closeBtn && typeof closeBtn.click === 'function') {
                closeBtn.click();
                return true;
            }
            if (overlay.parentNode) {
                overlay.remove();
                return true;
            }
            return false;
        }

        function switchRoomBySwipe(direction) {
            if (typeof window.switchRoom !== 'function') return false;
            const buttons = roomButtons();
            if (buttons.length < 2) return false;
            const currentIdx = buttons.findIndex((btn) => btn.classList.contains('active') || btn.getAttribute('aria-current') === 'page');
            if (currentIdx < 0) return false;
            const nextIdx = (currentIdx + (direction === 'left' ? 1 : -1) + buttons.length) % buttons.length;
            const nextBtn = buttons[nextIdx];
            if (!nextBtn) return false;
            window.switchRoom(nextBtn.dataset.room);
            UIFeedbackManager.fireHaptic('confirm', { strength: 'light', throttleKey: 'swipe-room', throttleMs: 120 });
            return true;
        }

        function switchPetTabBySwipe(direction) {
            const tabs = petTabs();
            if (tabs.length < 2) return false;
            const currentIdx = tabs.findIndex((tab) => tab.classList.contains('active') || tab.getAttribute('aria-pressed') === 'true' || tab.getAttribute('aria-current') === 'page');
            if (currentIdx < 0) return false;
            const nextIdx = (currentIdx + (direction === 'left' ? 1 : -1) + tabs.length) % tabs.length;
            const next = tabs[nextIdx];
            if (!next) return false;
            next.click();
            return true;
        }

        function quickActionKeyForTarget(target) {
            if (!UI.isElement(target)) return null;
            return target.dataset.room || target.dataset.itemId || target.dataset.feed || target.id || UI.getTextLabel(target).slice(0, 32);
        }

        function toggleFavoriteForTarget(target) {
            const key = quickActionKeyForTarget(target);
            if (!key) return false;
            const favorites = UI.readFavorites();
            favorites[key] = !favorites[key];
            UI.writeFavorites(favorites);
            target.classList.toggle('phase2-favorite', !!favorites[key]);
            target.setAttribute('data-phase2-favorite', favorites[key] ? 'true' : 'false');
            if (typeof window.showToast === 'function') {
                window.showToast(favorites[key] ? '⭐ Saved to quick favorites' : 'Removed from quick favorites', '#90A4AE', { announce: false });
            }
            return true;
        }

        function inspectTarget(target) {
            const label = UI.getTextLabel(target) || 'Item';
            let detail = '';
            if (target.matches('.room-btn[data-room]') && window.ROOMS && target.dataset.room && ROOMS[target.dataset.room]) {
                const room = ROOMS[target.dataset.room];
                detail = room && room.bonus && room.bonus.label ? ` ${room.name} bonus: ${room.bonus.label}.` : ` ${room.name}.`;
            }
            if (typeof window.showToast === 'function') {
                window.showToast(`🔎 ${label}.${detail}`, '#4FC3F7', { announce: true });
            }
        }

        function openQuickActions(target, point) {
            closeQuickActions();
            const label = UI.getTextLabel(target) || 'Quick actions';
            try { target.dataset.phase2SuppressClickUntil = String(Date.now() + 700); } catch (e) {}
            const overlay = document.createElement('div');
            overlay.className = 'phase2-quick-actions-overlay modal-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', `${label} quick actions`);

            const supportsActivate = typeof target.click === 'function' && !target.disabled;
            const x = UI.clamp(Math.round(point.clientX || window.innerWidth / 2), 32, window.innerWidth - 32);
            const y = UI.clamp(Math.round(point.clientY || window.innerHeight * 0.65), 72, window.innerHeight - 72);
            overlay.innerHTML = `
                <div class="phase2-quick-actions-panel" style="--qa-x:${x}px;--qa-y:${y}px;">
                    <div class="phase2-quick-actions-title">${label.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                    <div class="phase2-quick-actions-list" role="group" aria-label="Quick actions">
                        ${supportsActivate ? '<button type="button" class="phase2-quick-actions-btn" data-qa="activate">Open</button>' : ''}
                        <button type="button" class="phase2-quick-actions-btn" data-qa="inspect">Inspect</button>
                        <button type="button" class="phase2-quick-actions-btn" data-qa="favorite">Favorite</button>
                    </div>
                    <button type="button" class="phase2-quick-actions-close" data-qa="close">Close</button>
                </div>
            `;
            document.body.appendChild(overlay);
            quickActionsOverlay = overlay;

            const close = () => {
                if (!overlay || !overlay.isConnected) return;
                if (typeof popModalEscape === 'function') popModalEscape(close);
                overlay.remove();
                quickActionsOverlay = null;
                if (target && typeof target.focus === 'function') target.focus();
            };
            overlay._closeOverlay = close;

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    close();
                    return;
                }
                const btn = e.target.closest('[data-qa]');
                if (!btn) return;
                const action = btn.getAttribute('data-qa');
                if (action === 'close') {
                    close();
                    return;
                }
                if (action === 'activate' && supportsActivate) {
                    close();
                    target.click();
                    return;
                }
                if (action === 'inspect') {
                    inspectTarget(target);
                    close();
                    return;
                }
                if (action === 'favorite') {
                    toggleFavoriteForTarget(target);
                    close();
                }
            });

            if (typeof pushModalEscape === 'function') pushModalEscape(close);
            if (typeof trapFocus === 'function') trapFocus(overlay);
            const firstBtn = overlay.querySelector('.phase2-quick-actions-btn') || overlay.querySelector('.phase2-quick-actions-close');
            firstBtn && firstBtn.focus();
            UIFeedbackManager.overlayOpened(overlay);
        }

        function closeQuickActions() {
            if (quickActionsOverlay && quickActionsOverlay.isConnected) {
                if (typeof quickActionsOverlay._closeOverlay === 'function') quickActionsOverlay._closeOverlay();
                else quickActionsOverlay.remove();
            }
            quickActionsOverlay = null;
        }

        function maybeStartLongPress(event) {
            if (!event || event.pointerType !== 'touch') return;
            const target = UI.isElement(event.target) ? event.target.closest('.room-btn, .feed-menu-item, .top-action-btn, .action-btn, .core-care-btn, [data-item-id], .shop-item, .inventory-item') : null;
            if (!target) return;
            if (target.disabled || target.getAttribute('aria-disabled') === 'true') return;
            clearTimeout(longPressTimer);
            longPressTimer = setTimeout(() => {
                if (!pointerState || pointerState.cancelled) return;
                pointerState.longPressTriggered = true;
                UIFeedbackManager.fireHaptic('confirm', { strength: 'medium', throttleKey: 'long-press', throttleMs: 100 });
                openQuickActions(target, { clientX: pointerState.lastX, clientY: pointerState.lastY });
            }, config.longPressMs);
        }

        function clearLongPress() {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        }

        function onPointerDown(event) {
            if (!event || event.pointerType !== 'touch') return;
            pointerState = {
                id: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                lastX: event.clientX,
                lastY: event.clientY,
                startedAt: performance.now(),
                target: event.target,
                cancelled: false,
                longPressTriggered: false
            };
            maybeStartLongPress(event);
        }

        function onPointerMove(event) {
            if (!pointerState || event.pointerId !== pointerState.id) return;
            pointerState.lastX = event.clientX;
            pointerState.lastY = event.clientY;
            const moved = Math.hypot(event.clientX - pointerState.startX, event.clientY - pointerState.startY);
            if (moved > config.longPressMoveTolerance) clearLongPress();
        }

        function onPointerCancel(event) {
            if (!pointerState || event.pointerId !== pointerState.id) return;
            pointerState.cancelled = true;
            clearLongPress();
            pointerState = null;
        }

        function onPointerUp(event) {
            if (!pointerState || event.pointerId !== pointerState.id) return;
            clearLongPress();
            const state = pointerState;
            pointerState = null;
            if (state.longPressTriggered) return;
            const dt = performance.now() - state.startedAt;
            const dx = event.clientX - state.startX;
            const dy = event.clientY - state.startY;
            const ax = Math.abs(dx);
            const ay = Math.abs(dy);
            if (dt > config.swipeMaxTime) return;

            const topOverlay = UI.topOverlay();
            if (topOverlay && state.target instanceof Element && state.target.closest(OVERLAY_SELECTOR) && dy > config.swipeMinDistance && ay > ax * config.swipeAxisRatio) {
                const rect = topOverlay.getBoundingClientRect();
                const startedNearTop = (state.startY - rect.top) < (rect.height * 0.38);
                if (startedNearTop) {
                    dismissTopOverlayByGesture();
                    return;
                }
            }

            if (UI.hasOpenDialog()) return;
            const targetEl = state.target instanceof Element ? state.target : null;
            const swipeEligible = !!(targetEl && targetEl.closest('.pet-area, .room-nav, .top-action-bar, #game-content, .pet-switcher'));
            if (!swipeEligible) return;
            if (ax > config.swipeMinDistance && ax > ay * config.swipeAxisRatio) {
                const direction = dx < 0 ? 'left' : 'right';
                if (!switchPetTabBySwipe(direction)) {
                    switchRoomBySwipe(direction);
                }
            }
        }

        function attach() {
            document.addEventListener('click', (event) => {
                const target = UI.isElement(event.target) ? event.target.closest('[data-phase2-suppress-click-until]') : null;
                if (!target) return;
                const until = Number(target.getAttribute('data-phase2-suppress-click-until') || 0);
                if (until && Date.now() < until) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                } else {
                    target.removeAttribute('data-phase2-suppress-click-until');
                }
            }, true);
            document.addEventListener('pointerdown', onPointerDown, { passive: true });
            document.addEventListener('pointermove', onPointerMove, { passive: true });
            document.addEventListener('pointerup', onPointerUp, { passive: true });
            document.addEventListener('pointercancel', onPointerCancel, { passive: true });
        }

        return { attach, closeQuickActions, config };
    })();
    window.UIGestureManager = GestureManager;

    const SettingsPolishEnhancer = (() => {
        function updateSwitchStateText(row, on) {
            const stateEl = row && row.querySelector('.settings-toggle-state');
            if (stateEl) stateEl.textContent = on ? 'On' : 'Off';
        }

        function bindReduceEffectsToggle(toggleBtn) {
            if (!toggleBtn || toggleBtn.dataset.phase2Bound === 'true') return;
            toggleBtn.dataset.phase2Bound = 'true';
            toggleBtn.addEventListener('click', function () {
                const next = !(this.getAttribute('aria-checked') === 'true');
                this.classList.toggle('on', next);
                this.setAttribute('aria-checked', String(next));
                QualityManager.setReduceEffects(next);
                updateSwitchStateText(this.closest('.settings-row'), next);
                if (typeof window.showToast === 'function') {
                    window.showToast(next ? 'Reduce Effects enabled' : 'Reduce Effects disabled', '#90A4AE', { announce: true });
                }
            });
        }

        function bindQualityButtons(group) {
            if (!group || group.dataset.phase2Bound === 'true') return;
            group.dataset.phase2Bound = 'true';
            group.addEventListener('click', (event) => {
                const btn = event.target.closest('[data-quality-mode]');
                if (!btn) return;
                const nextMode = btn.getAttribute('data-quality-mode');
                QualityManager.setMode(nextMode);
                syncQualityUi(group.closest('.settings-overlay'));
                if (typeof window.showToast === 'function') {
                    window.showToast(`Visual quality: ${nextMode === 'auto' ? 'Auto' : nextMode.charAt(0).toUpperCase() + nextMode.slice(1)}`, '#A8D8EA', { announce: false });
                }
            });
        }

        function syncQualityUi(overlay) {
            if (!overlay) return;
            const state = QualityManager.getState();
            overlay.querySelectorAll('[data-quality-mode]').forEach((btn) => {
                const active = btn.getAttribute('data-quality-mode') === state.mode;
                btn.classList.toggle('active', active);
                btn.setAttribute('aria-pressed', active ? 'true' : 'false');
            });
            const autoBadge = overlay.querySelector('[data-quality-auto-tier]');
            if (autoBadge) autoBadge.textContent = `Auto currently: ${state.autoTier}`;
            const reduceToggle = overlay.querySelector('#setting-reduce-effects-phase2');
            if (reduceToggle) {
                reduceToggle.classList.toggle('on', !!state.reduceEffects);
                reduceToggle.setAttribute('aria-checked', String(!!state.reduceEffects));
                updateSwitchStateText(reduceToggle.closest('.settings-row'), !!state.reduceEffects);
            }
        }

        function injectSettingsSection(overlay) {
            if (!overlay || overlay.querySelector('.settings-group.phase2-settings-quality')) {
                syncQualityUi(overlay);
                return;
            }
            if (typeof overlay._closeOverlay === 'function' && !overlay._closeOverlay.__phase2Wrapped) {
                const originalClose = overlay._closeOverlay.bind(overlay);
                const wrappedClose = function phase2SettingsOverlayClose() {
                    overlay.style.pointerEvents = 'none';
                    GameTransitions.exit(overlay, 'overlay', () => originalClose());
                };
                wrappedClose.__phase2Wrapped = true;
                overlay._closeOverlay = wrappedClose;
            }
            if (overlay.dataset.phase2SettingsCloseIntercept !== 'true') {
                overlay.dataset.phase2SettingsCloseIntercept = 'true';
                overlay.addEventListener('click', (event) => {
                    const target = event.target;
                    if (!(target instanceof Element)) return;
                    const closeBtn = target.closest('#settings-close');
                    const backdrop = target === overlay;
                    if (!closeBtn && !backdrop) return;
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    if (typeof overlay._closeOverlay === 'function') overlay._closeOverlay();
                }, true);
            }
            const list = overlay.querySelector('.settings-list');
            if (!list) return;
            const state = QualityManager.getState();
            const fieldset = document.createElement('fieldset');
            fieldset.className = 'settings-group phase2-settings-quality';
            fieldset.innerHTML = `
                <legend class="settings-group-heading">Effects & Performance</legend>
                <div class="settings-row settings-row-verbosity phase2-quality-row">
                    <span class="settings-row-label">🎛️ Visual Quality</span>
                    <button class="settings-choice" type="button" data-quality-mode="auto" aria-pressed="false">Auto</button>
                    <button class="settings-choice" type="button" data-quality-mode="high" aria-pressed="false">High</button>
                    <button class="settings-choice" type="button" data-quality-mode="medium" aria-pressed="false">Medium</button>
                    <button class="settings-choice" type="button" data-quality-mode="low" aria-pressed="false">Low</button>
                    <small class="settings-row-help phase2-quality-auto" data-quality-auto-tier>Auto currently: ${state.autoTier}</small>
                </div>
                <div class="settings-row">
                    <span class="settings-row-label">✨ Reduce Effects</span>
                    <button class="settings-toggle ${state.reduceEffects ? 'on' : ''}" id="setting-reduce-effects-phase2" role="switch" aria-checked="${state.reduceEffects ? 'true' : 'false'}" aria-label="Reduce visual effects">
                        <span class="settings-toggle-knob"></span>
                    </button>
                    <span class="settings-toggle-state">${state.reduceEffects ? 'On' : 'Off'}</span>
                </div>
                <div class="settings-row phase2-quality-meta-row" role="note" aria-label="Performance notes">
                    <small class="settings-row-help">Auto uses device heuristics + frame sampling to cap particles, shadow depth, and animation intensity on older iPhones.</small>
                </div>
            `;

            const accessibilityGroup = Array.from(list.querySelectorAll('.settings-group')).find((el) => /accessibility/i.test(el.textContent || ''));
            if (accessibilityGroup && accessibilityGroup.nextSibling) {
                list.insertBefore(fieldset, accessibilityGroup.nextSibling);
            } else {
                list.appendChild(fieldset);
            }

            bindQualityButtons(fieldset.querySelector('.phase2-quality-row'));
            bindReduceEffectsToggle(fieldset.querySelector('#setting-reduce-effects-phase2'));
            syncQualityUi(overlay);

            const keyboardHints = overlay.querySelector('.settings-keyboard-hints');
            if (keyboardHints && document.documentElement.classList.contains('mobile-ui')) {
                keyboardHints.setAttribute('hidden', '');
                keyboardHints.setAttribute('aria-hidden', 'true');
            }
        }

        function patchShowSettingsModal() {
            if (typeof window.showSettingsModal !== 'function' || window.showSettingsModal.__phase2Wrapped) return;
            const original = window.showSettingsModal;
            const wrapped = function phase2ShowSettingsModal() {
                const result = original.apply(this, arguments);
                setTimeout(() => {
                    const overlay = document.querySelector('.settings-overlay');
                    if (overlay) injectSettingsSection(overlay);
                }, 0);
                return result;
            };
            wrapped.__phase2Wrapped = true;
            window.showSettingsModal = wrapped;
        }

        function observeSettingsOverlay() {
            if (!document.body || typeof MutationObserver === 'undefined') return;
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((m) => {
                    m.addedNodes.forEach((node) => {
                        if (!UI.isElement(node)) return;
                        if (node.matches('.settings-overlay')) injectSettingsSection(node);
                        node.querySelectorAll && node.querySelectorAll('.settings-overlay').forEach(injectSettingsSection);
                    });
                });
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }

        return { patchShowSettingsModal, observeSettingsOverlay, injectSettingsSection, syncQualityUi };
    })();

    const AssetPopinPolish = (() => {
        function markLoaded(img) {
            if (!img || img.dataset.phase2ImgReady === 'true') return;
            img.dataset.phase2ImgReady = 'true';
            img.classList.add('phase2-img-ready');
            if (img.parentElement) img.parentElement.classList.add('phase2-has-loaded-img');
        }

        function enhanceImage(img) {
            if (!img || img.dataset.phase2ImgEnhanced === 'true') return;
            img.dataset.phase2ImgEnhanced = 'true';
            if (!img.hasAttribute('decoding')) img.decoding = 'async';
            if (img.classList.contains('ui-icon')) img.loading = 'eager';
            img.classList.add('phase2-img');
            if (img.complete) {
                markLoaded(img);
                return;
            }
            img.addEventListener('load', () => markLoaded(img), { once: true });
            img.addEventListener('error', () => markLoaded(img), { once: true });
            if (typeof img.decode === 'function') {
                img.decode().then(() => markLoaded(img)).catch(() => {});
            }
        }

        function scan(root) {
            if (!root) return;
            if (root.matches && root.matches('img')) enhanceImage(root);
            root.querySelectorAll && root.querySelectorAll('img').forEach(enhanceImage);
        }

        function observe() {
            if (!document.body || typeof MutationObserver === 'undefined') return;
            scan(document.body);
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((m) => m.addedNodes.forEach((node) => UI.isElement(node) && scan(node)));
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }

        return { observe };
    })();

    function patchModalManager() {
        if (typeof window.ModalManager === 'undefined' || !ModalManager || ModalManager.__phase2Patched) return;
        ModalManager.__phase2Patched = true;
        const originalOpen = ModalManager.open && ModalManager.open.bind(ModalManager);
        const originalClose = ModalManager.close && ModalManager.close.bind(ModalManager);
        if (originalOpen) {
            ModalManager.open = function phase2ModalOpen(config) {
                const overlay = originalOpen(config);
                if (overlay) {
                    overlay.classList.add('phase2-game-overlay');
                    GameTransitions.enter(overlay, 'overlay');
                    UIFeedbackManager.overlayOpened(overlay);
                }
                return overlay;
            };
        }
        if (originalClose) {
            ModalManager.close = function phase2ModalClose(id) {
                const overlay = ModalManager.getOverlay ? ModalManager.getOverlay(id) : null;
                if (overlay) {
                    UIFeedbackManager.overlayDismissed();
                }
                return originalClose(id);
            };
        }
    }

    function patchRoomSwitchFeedback() {
        if (typeof window.switchRoom !== 'function' || window.switchRoom.__phase2Wrapped) return;
        const original = window.switchRoom;
        const wrapped = function phase2SwitchRoom(roomId) {
            const previous = window.gameState && gameState.currentRoom;
            const result = original.apply(this, arguments);
            if (previous !== (window.gameState && gameState.currentRoom)) {
                QualityManager.sampleFrames(700);
            }
            return result;
        };
        wrapped.__phase2Wrapped = true;
        window.switchRoom = wrapped;
    }

    function bindGlobalFeedbackTap() {
        document.addEventListener('click', (event) => {
            UIFeedbackManager.buttonTap(event.target);
        }, true);
    }

    function installReducedMotionWatchers() {
        if (!window.matchMedia) return;
        const motionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
        const transparencyMedia = (() => {
            try { return window.matchMedia('(prefers-reduced-transparency: reduce)'); } catch (e) { return null; }
        })();
        const apply = () => {
            document.documentElement.setAttribute('data-reduced-transparency', transparencyMedia && transparencyMedia.matches ? 'true' : 'false');
            QualityManager.sampleFrames(500);
        };
        if (typeof motionMedia.addEventListener === 'function') motionMedia.addEventListener('change', apply);
        else if (typeof motionMedia.addListener === 'function') motionMedia.addListener(apply);
        if (transparencyMedia) {
            if (typeof transparencyMedia.addEventListener === 'function') transparencyMedia.addEventListener('change', apply);
            else if (typeof transparencyMedia.addListener === 'function') transparencyMedia.addListener(apply);
        }
        apply();
    }

    function initPhase2Polish() {
        ToastSystemEnhancer.init();
        GestureManager.attach();
        SettingsPolishEnhancer.patchShowSettingsModal();
        SettingsPolishEnhancer.observeSettingsOverlay();
        AssetPopinPolish.observe();
        patchModalManager();
        patchRoomSwitchFeedback();
        bindGlobalFeedbackTap();
        installReducedMotionWatchers();

        document.documentElement.classList.add('phase2-polish-ready');

        if (window.Phase2AssetPreloader && typeof Phase2AssetPreloader.onProgress === 'function') {
            Phase2AssetPreloader.onProgress((evt) => {
                if (evt && evt.kind === 'ready') {
                    QualityManager.sampleFrames(900);
                }
            });
        }

        // Style/feedback uplift for any already-mounted UI.
        document.querySelectorAll('.toast').forEach((el) => {
            const text = (el.querySelector('.toast-text') && el.querySelector('.toast-text').textContent) || el.textContent || '';
            UIFeedbackManager.feedbackForToast({ message: text, color: '#90A4AE' }, el);
        });
        document.querySelectorAll(`${OVERLAY_SELECTOR}, .reward-card-pop`).forEach((el) => {
            if (el.matches('.reward-card-pop')) UIFeedbackManager.rewardMoment(el);
            else GameTransitions.enter(el, 'overlay');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPhase2Polish, { once: true });
    } else {
        initPhase2Polish();
    }
})();

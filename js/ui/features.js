// ============================================================
// ui/features.js  —  20-feature polish pack
// Features: 3, 7, 8, 9, 12, 13, 14, 15, 18, 19
// (Features 1,2,4,5,6,10,11,16,17,20 are implemented as
//  targeted edits to their owning modules.)
// ============================================================

        // ==================== HELPERS ====================

        function _isReducedMotion() {
            if (document.documentElement.getAttribute('data-reduced-motion') === 'true') return true;
            try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; }
        }

        function _isCaptionsEnabled() {
            if (typeof GameAudio !== 'undefined' && GameAudio && typeof GameAudio.getSoundCueCaptionsEnabled === 'function') {
                return GameAudio.getSoundCueCaptionsEnabled();
            }
            return false;
        }

        let _featuresInitialized = false;
        const _featureUnsubs = [];

        // ==================== FEATURE 3: CRITICAL-NEED SPEECH BUBBLES ====================

        const _critBubbleQueue = [];
        let _critBubbleActive = false;
        let _critBubbleTimer = null;
        let _critBubbleInterval = null;

        const CRIT_BUBBLE_THRESHOLD = 25;
        const CRIT_BUBBLE_DISMISS_MS = 4000;

        const CRITICAL_NEED_TEXTS = {
            playful:   { hunger: "I'm starving! 🍎", cleanliness: "I need a bath! 🛁", happiness: "I'm so bored! 🙁", energy: "So sleepy… 😴" },
            lazy:      { hunger: "Can I have food? 🥱", cleanliness: "Smelly…🛁", happiness: "Meh… 😶", energy: "Need a nap… 😪" },
            energetic: { hunger: "Feed me, now! 🍖", cleanliness: "Eww, I'm dirty! 🚿", happiness: "Let's do something! 😤", energy: "Running low! ⚡" },
            curious:   { hunger: "Is that food? 👀🍎", cleanliness: "Can we wash up? 🫧", happiness: "I'm wondering if… 🤔", energy: "Getting tired… 😮‍💨" },
            shy:       { hunger: "Um… hungry…🍎", cleanliness: "I'm a bit dirty… 🛁", happiness: "Feeling lonely… 🥹", energy: "A little tired… 😴" },
            grumpy:    { hunger: "FOOD. NOW. 😠", cleanliness: "I smell terrible! 🤬", happiness: "Leave me alone! 😒", energy: "I'm exhausted! 😤" }
        };

        const STAT_PRIORITY = { hunger: 4, happiness: 3, energy: 2, cleanliness: 1 };

        function _getCritBubbleText(statKey, personality) {
            const map = CRITICAL_NEED_TEXTS[personality] || CRITICAL_NEED_TEXTS.playful;
            return map[statKey] || '…';
        }

        function _showNextCritBubble() {
            if (_critBubbleActive || _critBubbleQueue.length === 0) return;
            const { statKey, text, petContainer } = _critBubbleQueue.shift();
            const container = petContainer || document.querySelector('.pet-container');
            if (!container) return;

            // Remove existing bubble
            container.querySelectorAll('.pet-critical-bubble').forEach(b => b.remove());

            const bubble = document.createElement('div');
            bubble.className = 'pet-critical-bubble';
            bubble.setAttribute('aria-live', 'polite');
            bubble.setAttribute('aria-label', text);
            bubble.textContent = text;
            container.style.position = container.style.position || 'relative';
            container.appendChild(bubble);

            _critBubbleActive = true;
            _critBubbleTimer = setTimeout(() => _dismissCritBubble(container, bubble), CRIT_BUBBLE_DISMISS_MS);
        }

        function _dismissCritBubble(container, bubble) {
            if (!bubble || !bubble.parentNode) {
                _critBubbleActive = false;
                _showNextCritBubble();
                return;
            }
            if (!_isReducedMotion()) {
                bubble.classList.add('bubble-dismiss');
                setTimeout(() => { bubble.remove(); _critBubbleActive = false; _showNextCritBubble(); }, 260);
            } else {
                bubble.remove();
                _critBubbleActive = false;
                _showNextCritBubble();
            }
        }

        function _checkCriticalNeeds() {
            if (typeof gameState === 'undefined' || !gameState || !gameState.pet || gameState.phase !== 'pet') return;
            const pet = gameState.pet;
            const personality = (pet.personality || 'playful');
            const container = document.querySelector('.pet-container');
            if (!container) return;

            // Collect critical stats, sorted by priority
            const crits = ['hunger', 'happiness', 'energy', 'cleanliness']
                .filter(s => typeof pet[s] === 'number' && pet[s] < CRIT_BUBBLE_THRESHOLD)
                .sort((a, b) => (STAT_PRIORITY[b] || 0) - (STAT_PRIORITY[a] || 0));

            if (crits.length === 0) {
                // If stat recovered, dismiss current bubble
                if (_critBubbleActive && container) {
                    const bubble = container.querySelector('.pet-critical-bubble');
                    if (bubble) _dismissCritBubble(container, bubble);
                }
                return;
            }

            // Only queue the most-critical stat (don't spam)
            const topStat = crits[0];
            // Avoid re-queuing the same stat that's already displayed or queued
            const alreadyQueued = _critBubbleQueue.some(q => q.statKey === topStat);
            const currentBubble = container.querySelector('.pet-critical-bubble');
            if (alreadyQueued || (currentBubble && _critBubbleActive)) return;

            _critBubbleQueue.push({
                statKey: topStat,
                text: _getCritBubbleText(topStat, personality),
                petContainer: container
            });
            _showNextCritBubble();
        }

        function initCriticalNeedBubbles() {
            if (_critBubbleInterval) clearInterval(_critBubbleInterval);
            // Check every 8 seconds — avoid spamming the player
            _critBubbleInterval = setInterval(_checkCriticalNeeds, 8000);
            // Also hook into state changes if EventBus is available
            if (typeof EventBus !== 'undefined' && EventBus && typeof EVENTS !== 'undefined') {
                const handler = () => _checkCriticalNeeds();
                ['pet:fed','pet:washed','pet:played','pet:slept','pet:medicated','pet:groomed','pet:exercised','pet:treated','pet:cuddled']
                    .forEach(ev => {
                        try { _featureUnsubs.push(EventBus.on(ev, handler)); } catch (_) {}
                    });
            }
        }

        // ==================== FEATURE 7: PET SLEEPING VISUAL STATE ====================

        const PET_SLEEP_ENERGY_THRESHOLD = 85; // energy ≥ this = sleeping visual
        let _sleepStateActive = false;
        let _sleepStateInterval = null;

        function _applySleepState(petContainer, isSleeping) {
            if (!petContainer) return;
            if (isSleeping === _sleepStateActive) return;
            _sleepStateActive = isSleeping;

            if (isSleeping) {
                petContainer.classList.add('pet-sleeping');
                // Add Z bubbles if not already present
                if (!petContainer.querySelector('.pet-sleep-z')) {
                    if (!_isReducedMotion()) {
                        for (let i = 0; i < 3; i++) {
                            const z = document.createElement('div');
                            z.className = 'pet-sleep-z';
                            z.setAttribute('aria-hidden', 'true');
                            z.textContent = 'Z';
                            petContainer.appendChild(z);
                        }
                    }
                }
            } else {
                petContainer.classList.remove('pet-sleeping');
                petContainer.querySelectorAll('.pet-sleep-z').forEach(z => z.remove());
            }
        }

        function _checkSleepState() {
            if (typeof gameState === 'undefined' || !gameState || !gameState.pet || gameState.phase !== 'pet') {
                // Clear sleep state if phase changed
                const c = document.querySelector('.pet-container');
                if (c) _applySleepState(c, false);
                return;
            }
            const pet = gameState.pet;
            const container = document.querySelector('.pet-container');
            if (!container) return;

            // Sleeping if energy is very high (just slept) OR energy is at max
            const isSleeping = pet.energy >= PET_SLEEP_ENERGY_THRESHOLD;
            _applySleepState(container, isSleeping);
        }

        function initSleepingVisualState() {
            if (_sleepStateInterval) clearInterval(_sleepStateInterval);
            _sleepStateInterval = setInterval(_checkSleepState, 3000);
            // Also respond immediately after sleep action
            if (typeof EventBus !== 'undefined' && EventBus) {
                try {
                    _featureUnsubs.push(EventBus.on('pet:slept', () => setTimeout(_checkSleepState, 200)));
                } catch (_) {}
            }
        }

        // ==================== FEATURE 8: DAILY TASK COMPLETION BURST ====================

        function _spawnTaskBurst(rowEl) {
            if (!rowEl || _isReducedMotion()) return;
            const rect = rowEl.getBoundingClientRect();
            const colors = ['#FFD700','#FF6B6B','#4CAF50','#7C4DFF','#FF9800'];
            const count = 7;
            for (let i = 0; i < count; i++) {
                const el = document.createElement('div');
                el.className = 'task-sparkle-burst';
                el.textContent = ['✨','⭐','💛','🌟','💫'][i % 5];
                const angle = (360 / count * i) * (Math.PI / 180);
                const dist = 30 + Math.random() * 20;
                el.style.setProperty('--tx', `${Math.cos(angle) * dist}px`);
                el.style.setProperty('--ty', `${Math.sin(angle) * dist}px`);
                el.style.left = `${rect.width * (0.3 + Math.random() * 0.4)}px`;
                el.style.top = `${rect.height * 0.5}px`;
                el.style.animationDelay = `${i * 30}ms`;
                // Position relative to the row
                const rowParent = rowEl.parentElement || document.body;
                const parentRect = rowParent.getBoundingClientRect();
                el.style.position = 'absolute';
                el.style.left = `${rect.left - parentRect.left + rect.width * (0.3 + Math.random() * 0.4)}px`;
                el.style.top = `${rect.top - parentRect.top + rect.height * 0.5}px`;
                (rowEl.offsetParent || rowParent).appendChild(el);
                setTimeout(() => el.remove(), 650);
            }
        }

        function initDailyTaskBurst() {
            if (typeof EventBus === 'undefined' || !EventBus || typeof EVENTS === 'undefined') return;
            try {
                _featureUnsubs.push(EventBus.on(EVENTS.DAILY_TASK_COMPLETED || 'reward:dailyTaskCompleted', (data) => {
                    // Find the completed task row by taskId or just the last checked item
                    const taskId = data && (data.taskId || data.id);
                    let rowEl = null;
                    if (taskId) {
                        rowEl = document.querySelector(`[data-task-id="${taskId}"]`);
                    }
                    if (!rowEl) {
                        // Fallback: find the most recently checked checklist item
                        rowEl = document.querySelector('.coach-checklist-item.completed:last-child') ||
                                document.querySelector('.daily-task-item.done:last-child') ||
                                document.querySelector('[data-coach-task].checked:last-child');
                    }
                    if (rowEl) _spawnTaskBurst(rowEl);
                }));
            } catch (_) {}
        }

        // ==================== FEATURE 9: FIRST-OF-DAY GREETING ====================

        const FIRST_OF_DAY_MIN_HOURS = 8;
        const FIRST_OF_DAY_MAX_HOURS = 24;
        let _firstOfDayGreetingShown = false;

        function checkFirstOfDayGreeting() {
            if (_firstOfDayGreetingShown) return;
            if (typeof gameState === 'undefined' || !gameState || !gameState.pet) return;
            const lastUpdate = Number(gameState.lastUpdate) || 0;
            if (!lastUpdate) return;
            const hoursAway = (Date.now() - lastUpdate) / 3600000;
            if (hoursAway < FIRST_OF_DAY_MIN_HOURS || hoursAway >= FIRST_OF_DAY_MAX_HOURS) return;

            _firstOfDayGreetingShown = true;
            const pet = gameState.pet;
            const petName = (pet.name || '').trim() || 'Your pet';

            setTimeout(() => {
                // Trigger excited bounce on pet
                const container = document.querySelector('.pet-container');
                if (container) {
                    if (!_isReducedMotion()) {
                        container.classList.add('pet-happy-bounce');
                        setTimeout(() => container.classList.remove('pet-happy-bounce'), 1100);
                    }
                }
                if (typeof showToast === 'function') {
                    showToast(`🥰 ${petName} is so happy you're back!`, '#FF6B6B');
                }
            }, 1200);
        }

        // ==================== FEATURE 12: ACHIEVEMENT TOAST POP-IN ====================

        function showAchievementToast(icon, name, color) {
            if (typeof showToast !== 'function') return;
            // Inject a small wrapper that also applies the achievement CSS class
            // We hook into the existing showToast and then style the last toast
            const msg = `${icon} ${name}`;
            showToast(msg, color || '#FFD700');
            // Style the most recent toast with the achievement variant
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const container = document.querySelector('#toast-container');
                    if (!container) return;
                    const toasts = container.querySelectorAll('.toast');
                    if (toasts.length === 0) return;
                    const last = toasts[toasts.length - 1];
                    if (last && last.textContent && last.textContent.includes(name)) {
                        last.classList.add('toast-achievement');
                    }
                });
            });
            if (typeof GameAudio !== 'undefined' && GameAudio.playSFX) {
                try { GameAudio.playSFX(GameAudio.sfx.achievement || GameAudio.sfx.celebration); } catch (_) {}
            }
        }

        function initAchievementToasts() {
            if (typeof EventBus === 'undefined' || !EventBus || typeof EVENTS === 'undefined') return;
            // Hook into badge and achievement unlock events
            try {
                _featureUnsubs.push(EventBus.on(EVENTS.BADGE_UNLOCKED || 'reward:badgeUnlocked', (data) => {
                    if (!data) return;
                    showAchievementToast(data.icon || '🏅', data.name || 'Badge unlocked', '#FFD700');
                }));
            } catch (_) {}
            // Achievement unlocked event
            try {
                _featureUnsubs.push(EventBus.on(EVENTS.ACHIEVEMENT_UNLOCKED || 'reward:achievementUnlocked', (data) => {
                    if (!data) return;
                    showAchievementToast(data.icon || '🏆', data.name || 'Achievement unlocked', '#FFD700');
                }));
            } catch (_) {}
        }

        // ==================== FEATURE 13: LONG-ABSENCE DRAMATIC MOMENT ====================

        const LONG_ABSENCE_THRESHOLD_HOURS = 24;
        let _longAbsenceCutsceneDone = false;

        function showLongAbsenceCutscene(pet, onComplete) {
            if (_longAbsenceCutsceneDone) { if (onComplete) onComplete(); return; }
            _longAbsenceCutsceneDone = true;

            const overlay = document.createElement('div');
            overlay.className = 'absence-cutscene-overlay';
            overlay.setAttribute('aria-label', 'Welcome back cutscene');
            overlay.setAttribute('role', 'status');

            const petName = (pet && pet.name && pet.name.trim()) ? pet.name : 'Your pet';
            const petEmoji = (function() {
                if (typeof PET_TYPES !== 'undefined' && pet && pet.type && PET_TYPES[pet.type]) {
                    return PET_TYPES[pet.type].emoji || '🐾';
                }
                return '🐾';
            })();

            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('tabindex', '-1');
            overlay.innerHTML = `
                <div class="absence-cutscene-card" role="img" aria-label="${petName} looking around, then looking relieved">
                    <span class="absence-pet-anim" id="absence-anim" aria-hidden="true">${petEmoji}</span>
                    <p id="absence-msg" style="font-size:0.92rem;font-weight:700;color:#5D4037;margin:8px 0 0;">
                        ${petName} wonders where you've been…
                    </p>
                </div>
            `;
            document.body.appendChild(overlay);
            // a11y: save focus, trap within overlay, register ESC to skip
            const _prevFocus = document.activeElement;
            overlay.focus();
            const _skipCutscene = () => {
                if (typeof popModalEscape === 'function') popModalEscape(_skipCutscene);
                overlay.remove();
                if (_prevFocus && typeof _prevFocus.focus === 'function') _prevFocus.focus();
                if (onComplete) onComplete();
            };
            if (typeof pushModalEscape === 'function') pushModalEscape(_skipCutscene);
            if (typeof trapFocus === 'function') trapFocus(overlay);

            const animEl = overlay.querySelector('#absence-anim');
            const msgEl = overlay.querySelector('#absence-msg');

            const _finishCutscene = () => {
                if (typeof popModalEscape === 'function') popModalEscape(_skipCutscene);
                overlay.remove();
                if (_prevFocus && typeof _prevFocus.focus === 'function') _prevFocus.focus();
                if (onComplete) onComplete();
            };

            if (!_isReducedMotion()) {
                // Phase 1: confused (1.5s)
                animEl.classList.add('confused');
                setTimeout(() => {
                    if (!overlay.isConnected) return; // skipped via ESC
                    animEl.classList.remove('confused');
                    animEl.classList.add('relieved');
                    if (msgEl) msgEl.textContent = `${petName} is so relieved you're back! 💛`;
                    // Phase 2: relieved (1s), then dismiss
                    setTimeout(() => {
                        if (!overlay.isConnected) return;
                        overlay.style.transition = 'opacity 0.3s ease';
                        overlay.style.opacity = '0';
                        setTimeout(() => { if (overlay.isConnected) _finishCutscene(); }, 320);
                    }, 1000);
                }, 1500);
            } else {
                // Reduced motion: show for 1.5s then dismiss instantly
                if (msgEl) msgEl.textContent = `${petName} is so relieved you're back! 💛`;
                setTimeout(() => { if (overlay.isConnected) _finishCutscene(); }, 1500);
            }
        }

        function checkLongAbsenceOnLoad() {
            if (typeof gameState === 'undefined' || !gameState || !gameState.pet) return false;
            const lastUpdate = Number(gameState.lastUpdate) || 0;
            if (!lastUpdate) return false;
            const hoursAway = (Date.now() - lastUpdate) / 3600000;
            return hoursAway >= LONG_ABSENCE_THRESHOLD_HOURS;
        }

        // ==================== FEATURE 14: MEMORIAL GARDEN VIEW ====================

        function openMemorialGarden() {
            const memorials = (typeof gameState !== 'undefined' && gameState && Array.isArray(gameState.memorials))
                ? gameState.memorials
                : [];

            const overlay = document.createElement('div');
            overlay.className = 'memorial-garden-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-labelledby', 'memorial-garden-title');

            const getPetEmoji = (m) => {
                if (typeof PET_TYPES !== 'undefined' && m.type && PET_TYPES[m.type]) return PET_TYPES[m.type].emoji || '🐾';
                return '🐾';
            };

            const formatDate = (ts) => {
                if (!ts) return '?';
                try {
                    const d = new Date(ts);
                    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
                } catch (_) { return '?'; }
            };

            const stonesHTML = memorials.length > 0
                ? memorials.map(m => {
                    const emoji = getPetEmoji(m);
                    const born = m.birthdate ? formatDate(m.birthdate) : '?';
                    const retired = m.retiredAt ? formatDate(m.retiredAt) : '?';
                    const epitaph = (m.farewellMessage || m.title || '').replace(/</g,'&lt;').replace(/>/g,'&gt;');
                    const stageName = (typeof GROWTH_STAGES !== 'undefined' && m.growthStage && GROWTH_STAGES[m.growthStage])
                        ? GROWTH_STAGES[m.growthStage].label || m.growthStage
                        : m.growthStage || '';
                    const species = (typeof PET_TYPES !== 'undefined' && m.type && PET_TYPES[m.type])
                        ? PET_TYPES[m.type].name || m.type : m.type || '';
                    return `
                        <article class="memorial-stone" role="listitem" aria-label="${(m.name||'Pet').replace(/</g,'&lt;')}, ${species}">
                            <div class="memorial-stone-emoji" aria-hidden="true">${emoji}</div>
                            <div class="memorial-stone-info">
                                <div class="memorial-stone-name">${(m.name || 'Pet').replace(/</g,'&lt;')} <span style="font-weight:400;font-size:0.82rem;color:#888;">${species}</span></div>
                                <div class="memorial-stone-dates">Born: ${born} &nbsp;·&nbsp; Retired: ${retired}${stageName ? `&nbsp;·&nbsp;${stageName}` : ''}</div>
                                ${epitaph ? `<div class="memorial-stone-epitaph">"${epitaph}"</div>` : ''}
                            </div>
                        </article>`;
                  }).join('')
                : '<p style="text-align:center;color:#888;padding:20px 0;">No pets have been retired yet. Your first garden stone will appear here.</p>';

            overlay.innerHTML = `
                <div class="memorial-garden-modal" tabindex="-1">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
                        <h2 style="margin:0;font-size:1.2rem;" id="memorial-garden-title">🌿 Memorial Garden</h2>
                        <button id="memorial-garden-close" aria-label="Close memorial garden" style="background:none;border:none;font-size:1.4rem;cursor:pointer;padding:4px 8px;border-radius:8px;">✕</button>
                    </div>
                    <p style="font-size:0.82rem;color:#7B5E7B;margin-bottom:14px;text-align:center;">A quiet place to remember friends who've moved on.</p>
                    <div role="list">${stonesHTML}</div>
                </div>
            `;

            document.body.appendChild(overlay);

            const modal = overlay.querySelector('.memorial-garden-modal');
            if (modal) modal.focus();

            function closeGarden() {
                if (typeof popModalEscape === 'function') popModalEscape(closeGarden);
                const triggerBtn = document.querySelector('[data-tool-action="memorial"]') ||
                                   document.getElementById('memorial-garden-trigger');
                if (_isReducedMotion()) {
                    overlay.remove();
                } else {
                    overlay.style.transition = 'opacity 0.2s ease';
                    overlay.style.opacity = '0';
                    setTimeout(() => overlay.remove(), 220);
                }
                if (triggerBtn) triggerBtn.focus();
            }

            overlay.querySelector('#memorial-garden-close').addEventListener('click', closeGarden);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeGarden(); });
            overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeGarden(); });
            if (typeof pushModalEscape === 'function') pushModalEscape(closeGarden);
            if (typeof trapFocus === 'function') trapFocus(overlay);
        }

        // Wire memorial garden button in tools menu
        function _bindMemorialGardenTrigger() {
            document.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-tool-action="memorial"]');
                if (btn) {
                    // Check if existing memorial hall handler would fire; if not, open garden
                    if (typeof openMemorialHall !== 'function' && typeof showMemorialHall !== 'function') {
                        e.stopImmediatePropagation();
                        // Close tools menu first
                        const toolsOverlay = document.querySelector('.tools-menu-overlay');
                        if (toolsOverlay) toolsOverlay.remove();
                        document.body.classList.remove('minigame-menu-open');
                        openMemorialGarden();
                    }
                }
            });
            // Also allow direct trigger by keyboard from a '#memorial-garden-trigger' button if added
            const directBtn = document.getElementById('memorial-garden-trigger');
            if (directBtn) directBtn.addEventListener('click', openMemorialGarden);
        }

        // ==================== FEATURE 15: ANIMATED WEATHER EDGE EFFECTS ====================

        let _weatherEdgeLayer = null;
        let _weatherEdgeCurrent = null;

        const WEATHER_EDGE_ROOMS = new Set(['bedroom', 'backyard', 'park']);

        function _buildWeatherEdgeHTML(weather) {
            if (weather === 'rainy') {
                let strips = '';
                for (let i = 0; i < 12; i++) {
                    const left = (i / 12 * 100) + Math.random() * 6;
                    const dur = (0.6 + Math.random() * 0.5).toFixed(2);
                    const delay = (Math.random() * 0.6).toFixed(2);
                    strips += `<div class="weather-edge-rain-strip" style="left:${left}%;animation-duration:${dur}s;animation-delay:-${delay}s;opacity:${0.3+Math.random()*0.3};"></div>`;
                }
                return strips;
            }
            if (weather === 'snowy') {
                let dots = '';
                for (let i = 0; i < 10; i++) {
                    const left = Math.random() * 90;
                    const dur = (2.5 + Math.random() * 2).toFixed(2);
                    const delay = (Math.random() * 2.5).toFixed(2);
                    const size = 3 + Math.round(Math.random() * 4);
                    dots += `<div class="weather-edge-snow-dot" style="left:${left}%;width:${size}px;height:${size}px;animation-duration:${dur}s;animation-delay:-${delay}s;"></div>`;
                }
                return dots;
            }
            if (weather === 'sunny') {
                return `<div class="weather-edge-shimmer"></div>`;
            }
            return '';
        }

        function _updateWeatherEdge() {
            if (typeof gameState === 'undefined' || !gameState) return;
            const room = gameState.currentRoom || 'bedroom';
            const weather = gameState.weather || 'sunny';
            const isOutdoorOrWindow = WEATHER_EDGE_ROOMS.has(room);
            const petArea = document.querySelector('.pet-area');
            if (!petArea) return;

            if (!isOutdoorOrWindow) {
                if (_weatherEdgeLayer) { _weatherEdgeLayer.remove(); _weatherEdgeLayer = null; _weatherEdgeCurrent = null; }
                return;
            }

            const key = `${weather}:${room}`;
            if (key === _weatherEdgeCurrent && _weatherEdgeLayer && _weatherEdgeLayer.parentNode) return; // no change needed

            // Remove old layer
            if (_weatherEdgeLayer) _weatherEdgeLayer.remove();

            const layer = document.createElement('div');
            layer.className = 'weather-edge-layer';
            layer.setAttribute('aria-hidden', 'true');

            if (_isReducedMotion()) {
                // Static tint only
                const tints = { rainy: 'rgba(100,149,237,0.08)', snowy: 'rgba(200,220,255,0.10)', sunny: 'rgba(255,235,59,0.07)' };
                layer.style.background = tints[weather] || 'transparent';
            } else {
                layer.innerHTML = _buildWeatherEdgeHTML(weather);
            }

            // Insert behind other children (z-index:1)
            petArea.insertBefore(layer, petArea.firstChild);
            _weatherEdgeLayer = layer;
            _weatherEdgeCurrent = key;
        }

        function initWeatherEdgeEffects() {
            // Update immediately and on room/weather changes
            setTimeout(_updateWeatherEdge, 500);
            if (typeof EventBus !== 'undefined' && EventBus && typeof EVENTS !== 'undefined') {
                try {
                    _featureUnsubs.push(EventBus.on(EVENTS.ROOM_CHANGED || 'game:roomChanged', () => {
                        _weatherEdgeCurrent = null; // force rebuild
                        setTimeout(_updateWeatherEdge, 50);
                    }));
                    _featureUnsubs.push(EventBus.on(EVENTS.WEATHER_CHANGED || 'game:weatherChanged', () => {
                        _weatherEdgeCurrent = null;
                        setTimeout(_updateWeatherEdge, 50);
                    }));
                } catch (_) {}
            }
            // Fallback polling every 30s
            setInterval(() => {
                if (typeof gameState !== 'undefined' && gameState) {
                    const key = `${gameState.weather}:${gameState.currentRoom}`;
                    if (key !== _weatherEdgeCurrent) _updateWeatherEdge();
                }
            }, 30000);
        }

        // ==================== FEATURE 18: MOOD-REACTIVE IDLE ANIMATIONS ====================

        let _moodIdleInterval = null;
        let _currentMoodIdleClass = null;

        function _updateMoodIdleClass() {
            if (typeof gameState === 'undefined' || !gameState || !gameState.pet || gameState.phase !== 'pet') return;
            const pet = gameState.pet;
            const container = document.querySelector('.pet-container');
            if (!container) return;

            const mood = (typeof getMood === 'function') ? getMood(pet) : null;
            // Calculate numeric mood from stats
            const avg = ((pet.hunger || 0) + (pet.happiness || 0) + (pet.energy || 0) + (pet.cleanliness || 0)) / 4;

            let targetClass = null;
            if (avg >= 70 || mood === 'happy') {
                targetClass = 'mood-idle-happy';
            } else if (avg >= 30) {
                targetClass = 'mood-idle-sad';
            } else {
                targetClass = 'mood-idle-neglected';
            }

            if (targetClass === _currentMoodIdleClass) return;

            // Remove old class
            if (_currentMoodIdleClass) container.classList.remove(_currentMoodIdleClass);
            // Add new class — but only if not sleeping (sleeping has its own look)
            if (!container.classList.contains('pet-sleeping')) {
                container.classList.add(targetClass);
            }
            _currentMoodIdleClass = targetClass;
        }

        function initMoodIdleAnimations() {
            if (_moodIdleInterval) clearInterval(_moodIdleInterval);
            _moodIdleInterval = setInterval(_updateMoodIdleClass, 5000);
            // Update immediately
            setTimeout(_updateMoodIdleClass, 1000);

            // Update after any care action
            if (typeof EventBus !== 'undefined' && EventBus) {
                ['pet:fed','pet:washed','pet:played','pet:slept','pet:medicated','pet:groomed','pet:exercised','pet:treated','pet:cuddled']
                    .forEach(ev => {
                        try { _featureUnsubs.push(EventBus.on(ev, () => setTimeout(_updateMoodIdleClass, 300))); } catch (_) {}
                    });
            }
        }

        // ==================== FEATURE 19: PET FAVORITE FOOD HINT ====================

        // Personality → preferred food IDs (from ECONOMY_SHOP_ITEMS.food + GARDEN_CROPS)
        const PERSONALITY_FOOD_PREFS = Object.freeze({
            playful:   ['deluxePlatter', 'strawberry'],
            lazy:      ['kibbleBag', 'carrot'],
            energetic: ['veggieMix', 'tomato'],
            curious:   ['deluxePlatter', 'apple'],
            shy:       ['kibbleBag', 'strawberry'],
            grumpy:    ['deluxePlatter', 'pumpkin']
        });

        function getPersonalityFoodPrefs(personality) {
            return PERSONALITY_FOOD_PREFS[personality] || PERSONALITY_FOOD_PREFS.playful;
        }

        // Called from openFeedMenu to mark favorite items
        function markFavoriteFoodItems(menuContainer, pet) {
            if (!menuContainer || !pet) return;
            const prefs = getPersonalityFoodPrefs(pet.personality || 'playful');
            const petName = (pet.name || '').trim() || 'Your pet';

            menuContainer.querySelectorAll('[data-food-id],[data-item-id],[data-crop-id]').forEach(itemEl => {
                const foodId = itemEl.dataset.foodId || itemEl.dataset.itemId || itemEl.dataset.cropId;
                if (foodId && prefs.includes(foodId)) {
                    // Don't add twice
                    if (itemEl.querySelector('.food-fave-label')) return;
                    const badge = document.createElement('span');
                    badge.className = 'food-fave-label';
                    badge.setAttribute('aria-label', `${petName} especially loves this`);
                    badge.title = `${petName} especially loves this`;
                    badge.innerHTML = '&#9829; Fave';
                    badge.style.cssText = `
                        display:inline-block;font-size:0.65rem;font-weight:800;
                        background:#fce4ec;color:#c2185b;border-radius:6px;
                        padding:1px 5px;margin-left:4px;vertical-align:middle;
                        border:1px solid #f48fb1;
                    `;
                    itemEl.appendChild(badge);
                    itemEl.style.outline = '2px solid #f8bbd0';
                    itemEl.style.outlineOffset = '1px';
                }
            });
        }

        // ==================== FEATURE 21: PET RELATIONSHIP DUO BONUS TOASTS ====================

        const _REL_CARE_EVENTS = ['pet:fed', 'pet:played', 'pet:cuddled', 'pet:treated', 'pet:exercised'];
        let _lastDuoBonusToastMs = 0;
        const _DUO_BONUS_TOAST_COOLDOWN_MS = 45000;

        function _onCareActionRelCheck() {
            if (typeof gameState === 'undefined' || !gameState || !gameState.pet || gameState.phase !== 'pet') return;
            if (!gameState.household || !gameState.household.petsById) return;
            const Rel = (typeof MLFSimRelationships !== 'undefined') ? MLFSimRelationships : null;
            if (!Rel || typeof Rel.getDuoBonus !== 'function') return;
            const activePetId = String((gameState.pet && gameState.pet.id) || '');
            if (!activePetId) return;
            const petsById = gameState.household.petsById;
            const relationships = gameState.household.relationships || {};
            const otherIds = Object.keys(petsById).filter(id => id !== activePetId);
            let bestBonus = null;
            let bestBonusPetName = '';
            otherIds.forEach(otherId => {
                const key = Rel.relationshipKey(activePetId, otherId);
                const rel = relationships[key];
                if (!rel) return;
                const bonus = Rel.getDuoBonus(rel);
                if (!bonus) return;
                if (!bestBonus || bonus.careMultiplier > bestBonus.careMultiplier) {
                    bestBonus = bonus;
                    const op = petsById[otherId];
                    bestBonusPetName = (op && op.name) ? op.name : 'your companion';
                }
            });
            if (bestBonus) {
                const now = Date.now();
                if (now - _lastDuoBonusToastMs >= _DUO_BONUS_TOAST_COOLDOWN_MS) {
                    _lastDuoBonusToastMs = now;
                    const pct = Math.round((bestBonus.careMultiplier - 1) * 100);
                    showToast(bestBonus.icon + ' ' + bestBonus.label + ' with ' + bestBonusPetName + ': +' + pct + '% when socializing!', '#FFD54F', { duration: 2800 });
                }
            }
        }

        function initRelationshipFeature() {
            if (typeof EventBus === 'undefined' || !EventBus) return;
            _REL_CARE_EVENTS.forEach(ev => {
                try { _featureUnsubs.push(EventBus.on(ev, _onCareActionRelCheck)); } catch (_) {}
            });
        }

        // ==================== INITIALIZATION ====================

        function initAllFeatures() {
            if (_featuresInitialized) return;
            _featuresInitialized = true;

            // Feature 3: Critical need bubbles
            initCriticalNeedBubbles();

            // Feature 7: Sleeping visual state
            initSleepingVisualState();

            // Feature 8: Daily task burst (EventBus hook)
            initDailyTaskBurst();

            // Feature 12: Achievement toast styling (EventBus hook)
            initAchievementToasts();

            // Feature 14: Memorial garden trigger binding
            _bindMemorialGardenTrigger();

            // Feature 15: Weather edge effects
            initWeatherEdgeEffects();

            // Feature 18: Mood idle animations
            initMoodIdleAnimations();

            // Feature 9: First-of-day greeting (checked on load with delay)
            setTimeout(checkFirstOfDayGreeting, 800);

            // Feature 21: Pet relationship duo bonus toasts
            initRelationshipFeature();
        }

        function teardownAllFeatures() {
            _featureUnsubs.forEach(fn => { try { fn(); } catch (_) {} });
            _featureUnsubs.length = 0;
            _featuresInitialized = false;
        }

        // Run after DOM is ready and game is initialized
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => setTimeout(initAllFeatures, 1200));
        } else {
            setTimeout(initAllFeatures, 1200);
        }

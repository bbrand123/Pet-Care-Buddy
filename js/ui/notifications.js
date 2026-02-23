// ============================================================
// ui/notifications.js  --  Toast notifications, event bus,
//                         reward card system
// Extracted from ui.js (lines 2511-3005)
// ============================================================

        // ==================== TOAST NOTIFICATIONS ====================

        const MAX_VISIBLE_TOASTS = 3;

        // Notification history (keeps last 20 for review)
        const MAX_NOTIFICATION_HISTORY = 20;
        let _notificationHistory = [];
        const _toastDecodeEl = document.createElement('textarea');

        function decodeEntities(text) {
            _toastDecodeEl.innerHTML = text;
            return _toastDecodeEl.value;
        }

        function sanitizeToastText(message) {
            const decoded = decodeEntities(String(message || ''));
            return decoded.replace(/[\x00-\x1F\x7F]+/g, ' ').trim();
        }

        function sanitizeCssColor(value) {
            const color = String(value || '').trim();
            if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)) return color;
            return '#D4A574';
        }

        function addToNotificationHistory(message) {
            const plainText = sanitizeToastText(message);
            if (!plainText) return;
            _notificationHistory.push({
                text: plainText,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
            if (_notificationHistory.length > MAX_NOTIFICATION_HISTORY) {
                _notificationHistory.shift();
            }
        }

        function showNotificationHistory() {
            const existing = document.querySelector('.notif-history-overlay');
            if (existing) { existing.remove(); return; }

            const overlay = document.createElement('div');
            overlay.className = 'notif-history-overlay modal-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-labelledby', 'notif-history-title');

            const items = _notificationHistory.length > 0
                ? _notificationHistory.slice().reverse().map(n =>
                    `<li class="notif-history-item"><time class="notif-history-time" aria-label="Time ${escapeHTML(n.time)}">${escapeHTML(n.time)}</time><span class="notif-history-message">${escapeHTML(n.text)}</span></li>`
                ).join('')
                : '<li class="notif-history-empty" aria-live="off">No recent notifications</li>';

            overlay.innerHTML = `
                <div class="modal-content notif-history-modal">
                    <h2 class="notif-history-title" id="notif-history-title">Recent Notifications</h2>
                    <ul class="notif-history-list" role="log" aria-live="off" aria-label="Recent notifications list">${items}</ul>
                    <button class="notif-history-close" id="notif-history-close" data-focus-key="notif-history-close" aria-label="Close notification history">Close</button>
                </div>
            `;

            document.body.appendChild(overlay);

            function closeHistory() {
                popModalEscape(closeHistory);
                animateModalClose(overlay, () => {
                    const trigger = document.getElementById('notif-history-btn');
                    if (trigger) trigger.focus();
                });
            }
            overlay.querySelector('#notif-history-close').addEventListener('click', closeHistory);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeHistory(); });
            pushModalEscape(closeHistory);
            trapFocus(overlay);
            overlay.querySelector('#notif-history-close').focus();
        }

        function showToolsMenu(triggerEl) {
            const existing = document.querySelector('.tools-menu-overlay');
            if (existing) {
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }

            const overlay = document.createElement('div');
            overlay.className = 'tools-menu-overlay modal-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'More tools');
            overlay.innerHTML = `
                <div class="modal-content tools-menu-modal">
                    <h2 class="tools-menu-title" id="tools-menu-title">More tools</h2>
                    <div class="tools-menu-list" role="group" aria-label="More tools">
                        <button class="tools-menu-btn" data-tool-action="furniture" data-focus-key="tool-furniture" aria-label="Decor">🛋️ Decor</button>
                        <button class="tools-menu-btn" data-tool-action="journal" data-focus-key="tool-journal" aria-label="Journal">📔 Journal</button>
                        <button class="tools-menu-btn" data-tool-action="diary" data-focus-key="tool-diary" aria-label="Diary">📖 Diary</button>
                        <button class="tools-menu-btn" data-tool-action="memorial" data-focus-key="tool-memorial" aria-label="Hall of fame">🏛️ Hall</button>
                        <button class="tools-menu-btn" data-tool-action="alerts" data-focus-key="tool-alerts" aria-label="Alerts">🔔 Alerts</button>
                        <button class="tools-menu-btn" data-tool-action="settings" data-focus-key="tool-settings" aria-label="Settings">⚙️ Settings</button>
                    </div>
                    <button class="tools-menu-close" id="tools-menu-close" data-focus-key="tools-menu-close" aria-label="Close tools menu">Close</button>
                </div>
            `;
            overlay.setAttribute('aria-labelledby', 'tools-menu-title');
            document.body.appendChild(overlay);

            const runAction = (action) => {
                if (action === 'furniture' && typeof showFurnitureModal === 'function') showFurnitureModal();
                if (action === 'journal' && typeof showJournalModal === 'function') showJournalModal();
                if (action === 'diary' && typeof showDiaryModal === 'function') showDiaryModal();
                if (action === 'memorial' && typeof showMemorialHall === 'function') showMemorialHall();
                if (action === 'alerts' && typeof showNotificationHistory === 'function') showNotificationHistory();
                if (action === 'settings' && typeof showSettingsModal === 'function') showSettingsModal();
            };

            function closeToolsMenu() {
                popModalEscape(closeToolsMenu);
                overlay.remove();
                if (triggerEl && typeof triggerEl.focus === 'function') triggerEl.focus();
            }

            overlay.querySelectorAll('.tools-menu-btn').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const action = btn.getAttribute('data-tool-action');
                    closeToolsMenu();
                    runAction(action);
                });
            });
            overlay.querySelector('#tools-menu-close').addEventListener('click', closeToolsMenu);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeToolsMenu(); });
            pushModalEscape(closeToolsMenu);
            overlay._closeOverlay = closeToolsMenu;
            trapFocus(overlay);
            overlay.querySelector('.tools-menu-btn')?.focus();
        }

        // Batch rapid care-action toasts into a single notification
        const CARE_TOAST_BATCH_MS = 800;
        let _careToastTimer = null;
        let _careToastQueue = []; // [{action, emoji}]

        const CARE_ACTION_VERBS = {
            feed: 'fed', wash: 'washed', play: 'played with',
            sleep: 'put to sleep', medicine: 'gave medicine to',
            groom: 'groomed', exercise: 'exercised', treat: 'treated', cuddle: 'cuddled'
        };

        function queueCareToast(action, emoji) {
            _careToastQueue.push({ action, emoji });
            if (_careToastTimer) clearTimeout(_careToastTimer);
            _careToastTimer = setTimeout(flushCareToasts, CARE_TOAST_BATCH_MS);
        }

        function flushCareToasts() {
            _careToastTimer = null;
            if (_careToastQueue.length === 0) return;
            const items = _careToastQueue.splice(0);
            const petName = escapeHTML((gameState.pet && gameState.pet.name) || 'your pet');
            if (items.length === 1) {
                const { action, emoji } = items[0];
                const verb = CARE_ACTION_VERBS[action] || action;
                const cap = verb.charAt(0).toUpperCase() + verb.slice(1);
                showToast(`${emoji} ${cap} ${petName}!`, TOAST_COLORS[action] || '#66BB6A');
            } else {
                const verbs = items.map(i => CARE_ACTION_VERBS[i.action] || i.action);
                const emojis = items.map(i => i.emoji).join(' ');
                const joined = verbs.length > 2
                    ? verbs.slice(0, -1).join(', ') + ', and ' + verbs[verbs.length - 1]
                    : verbs.join(' and ');
                const cap = joined.charAt(0).toUpperCase() + joined.slice(1);
                showToast(`${emojis} ${cap} ${petName}!`, TOAST_COLORS[items[items.length - 1].action] || '#66BB6A');
            }
        }

        // Show a brief visual reaction bubble above the pet (visual SFX equivalent)
        function showPetReaction(container, emoji) {
            const bubble = document.createElement('div');
            bubble.className = 'pet-reaction-bubble';
            bubble.setAttribute('aria-hidden', 'true');
            bubble.textContent = emoji;
            container.appendChild(bubble);
            setTimeout(() => bubble.remove(), 1200);
        }

        // Wrap emoji characters in aria-hidden spans so screen readers skip them
        function wrapEmojiForAria(text) {
            // Match common emoji: emoticons, symbols, pictographs, transport, misc, flags, modifiers
            // Exclude ASCII digits/symbols (#, *, 0-9) that \p{Emoji} can match
            // Note: callers are responsible for HTML-escaping user input via escapeHTML()
            // before passing to showToast/wrapEmojiForAria to avoid double-escaping.
            const emojiRegex = /(\p{Emoji_Presentation}|(?![0-9#*])\p{Emoji}\uFE0F)/gu;
            return text.replace(emojiRegex, '<span aria-hidden="true">$1</span>');
        }

        // Animated modal close: adds closing class, waits for animation, then removes
        function animateModalClose(overlay, callback) {
            if (!overlay) { if (callback) callback(); return; }
            overlay.classList.add('modal-closing');
            setTimeout(() => {
                overlay.remove();
                if (callback) callback();
            }, 220);
        }

        const TOAST_ANNOUNCE_PATTERNS = [
            /achievement/i,
            /badge/i,
            /trophy/i,
            /daily task/i,
            /warning/i,
            /critical/i,
            /error/i,
            /failed/i,
            /can(?:not|n't)/i,
            /ready/i,
            /bonus/i,
            /joined your family/i
        ];
        const _toastAnnounceLastByText = new Map();
        const _audioCaptionToastLastByText = new Map();
        const _toastQueue = [];
        let _toastQueueTimer = null;
        const _deferredToastBatch = [];
        let _deferredToastTimer = null;
        const DEFERRED_TOAST_FLUSH_MS = 3200;
        const CRITICAL_TOAST_PATTERNS = [
            /warning/i,
            /critical/i,
            /error/i,
            /failed/i,
            /can(?:not|n't)/i,
            /unavailable/i,
            /need/i
        ];
        const COACH_CHECKLIST_MINIMIZED_KEY = STORAGE_KEYS.coachChecklistMinimized;

        function isNarrowViewport() {
            return window.matchMedia('(max-width: 720px)').matches;
        }

        function getCoachChecklistMinimizedPref() {
            try {
                const raw = localStorage.getItem(COACH_CHECKLIST_MINIMIZED_KEY);
                if (raw === 'true') return true;
                if (raw === 'false') return false;
            } catch (e) {}
            return isNarrowViewport();
        }

        function setCoachChecklistMinimizedPref(minimized) {
            try {
                localStorage.setItem(COACH_CHECKLIST_MINIMIZED_KEY, minimized ? 'true' : 'false');
            } catch (e) {}
        }

        function setCoachChecklistMinimized(minimized, source = 'manual') {
            const panel = document.querySelector('.coach-checklist');
            if (!panel) return;
            panel.classList.toggle('minimized', !!minimized);
            panel.classList.toggle('traffic-minimized', !!minimized && source === 'traffic');
            panel.classList.toggle('user-minimized', !!minimized && source !== 'traffic');
            panel.setAttribute('data-minimized', minimized ? 'true' : 'false');
            const toggleBtn = panel.querySelector('[data-coach-toggle]');
            if (toggleBtn) {
                toggleBtn.setAttribute('aria-pressed', minimized ? 'true' : 'false');
                toggleBtn.textContent = minimized ? 'Show' : 'Hide';
            }
            if (source !== 'traffic') {
                setCoachChecklistMinimizedPref(!!minimized);
            }
            setUiBusyState();
        }

        function isCoachChecklistExpanded() {
            const panel = document.querySelector('.coach-checklist');
            return !!(panel && !panel.classList.contains('minimized'));
        }

        function trafficMinimizeCoachChecklist() {
            if (isCoachChecklistExpanded()) {
                setCoachChecklistMinimized(true, 'traffic');
            }
        }

        function renderToastNow(safeMessage, color) {
            let container = document.getElementById('toast-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'toast-container';
                document.body.appendChild(container);
            }
            if (!container.classList.contains('toast-container')) {
                container.classList.add('toast-container');
            }
            const existingToasts = container.querySelectorAll('.toast:not(.toast-exiting)');
            if (existingToasts.length >= MAX_VISIBLE_TOASTS) {
                const toRemove = existingToasts.length - MAX_VISIBLE_TOASTS + 1;
                for (let i = 0; i < toRemove; i++) {
                    const old = existingToasts[i];
                    old.classList.add('toast-exiting');
                    setTimeout(() => old.remove(), 300);
                }
            }
            const toast = document.createElement('div');
            toast.className = 'toast';
            toast.style.setProperty('--toast-color', color);
            toast.innerHTML = `<span class="toast-icon">${renderUiIcon('state', '🔔', '')}</span><span class="toast-text">${wrapEmojiForAria(safeMessage)}</span>`;
            container.appendChild(toast);
            setTimeout(() => {
                toast.remove();
                setUiBusyState();
            }, 3500);
            setUiBusyState();
        }

        function isMiniGameActive() {
            return !!document.querySelector('.fetch-game-overlay, .hideseek-game-overlay, .bubblepop-game-overlay, .matching-game-overlay, .simonsays-game-overlay, .coloring-game-overlay');
        }

        function isGameplayTrafficHigh() {
            return isMiniGameActive() || !!actionCooldown;
        }

        function isCriticalToast(plainText, options = {}) {
            if (options.priority === 'critical') return true;
            if (options.assertive) return true;
            const text = String(plainText || '');
            return CRITICAL_TOAST_PATTERNS.some((pattern) => pattern.test(text));
        }

        function queueDeferredToast(entry) {
            if (!entry) return;
            _deferredToastBatch.push(entry);
            if (_deferredToastTimer) return;
            _deferredToastTimer = setTimeout(() => flushDeferredToasts(), DEFERRED_TOAST_FLUSH_MS);
        }

        function flushDeferredToasts(force = false) {
            if (_deferredToastTimer) {
                clearTimeout(_deferredToastTimer);
                _deferredToastTimer = null;
            }
            if (_deferredToastBatch.length === 0) return;
            if (!force && (isGameplayTrafficHigh() || document.querySelector('.onboarding-tooltip') || document.querySelector('.reward-card-pop.show'))) {
                _deferredToastTimer = setTimeout(() => flushDeferredToasts(), 1200);
                return;
            }
            const batch = _deferredToastBatch.splice(0);
            const first = batch.slice(0, 2).map((item) => item.plainText).filter(Boolean);
            const remainder = Math.max(0, batch.length - first.length);
            const summary = remainder > 0
                ? `Updates: ${first.join(' • ')} (+${remainder} more)`
                : first.join(' • ');
            trafficMinimizeCoachChecklist();
            renderToastNow(escapeHTML(summary || 'New updates available.'), '#90A4AE');
        }

        function flushToastQueue() {
            _toastQueueTimer = null;
            if (_toastQueue.length === 0) {
                flushDeferredToasts();
                return;
            }
            if (document.querySelector('.onboarding-tooltip') || document.querySelector('.reward-card-pop.show')) {
                _toastQueueTimer = setTimeout(flushToastQueue, 600);
                return;
            }
            if (isGameplayTrafficHigh()) {
                let moved = 0;
                for (let i = _toastQueue.length - 1; i >= 0; i--) {
                    if (_toastQueue[i].priority !== 'critical') {
                        queueDeferredToast(_toastQueue[i]);
                        _toastQueue.splice(i, 1);
                        moved++;
                    }
                }
                if (moved > 0 && _toastQueue.length === 0) {
                    _toastQueueTimer = setTimeout(flushToastQueue, 900);
                    return;
                }
            }
            trafficMinimizeCoachChecklist();
            const next = _toastQueue.shift();
            renderToastNow(next.safeMessage, next.color);
            if (_toastQueue.length > 0) _toastQueueTimer = setTimeout(flushToastQueue, 520);
            else flushDeferredToasts();
        }

        function shouldAnnounceToast(plainText, options) {
            if (options && options.announce === true) return true;
            if (options && options.announce === false) return false;
            return TOAST_ANNOUNCE_PATTERNS.some((pattern) => pattern.test(plainText));
        }

        function showToast(message, color = '#66BB6A', options = {}) {
            const plainText = sanitizeToastText(message);
            const safeMessage = escapeHTML(plainText);
            const priority = isCriticalToast(plainText, options) ? 'critical' : 'normal';
            addToNotificationHistory(plainText);
            const item = { safeMessage, color, plainText, priority };
            if (isGameplayTrafficHigh() && priority !== 'critical') {
                queueDeferredToast(item);
            } else {
                _toastQueue.push(item);
                if (!_toastQueueTimer) _toastQueueTimer = setTimeout(flushToastQueue, 60);
            }

            clearOnboardingTooltips();

            if (plainText && typeof announce === 'function' && shouldAnnounceToast(plainText, options) && !(isGameplayTrafficHigh() && priority !== 'critical')) {
                const key = plainText.trim().toLowerCase();
                const now = Date.now();
                const last = _toastAnnounceLastByText.get(key) || 0;
                if (now - last > 1800) {
                    _toastAnnounceLastByText.set(key, now);
                    announce(plainText, { assertive: !!options.assertive, source: 'toast', dedupeMs: 1800 });
                }
            }
        }

        function soundCueCaptionsEnabled() {
            if (typeof GameAudio !== 'undefined' && typeof GameAudio.getSoundCueCaptionsEnabled === 'function') {
                return !!GameAudio.getSoundCueCaptionsEnabled();
            }
            try {
                return !!(typeof STORAGE_KEYS !== 'undefined' && STORAGE_KEYS.soundCueCaptions && localStorage.getItem(STORAGE_KEYS.soundCueCaptions) === 'true');
            } catch (e) {
                return false;
            }
        }

        // ==================== EVENT BUS SUBSCRIPTIONS ====================
        // Wire EventBus to UI notification functions so game logic
        // can emit events instead of calling UI functions directly.
        if (typeof EventBus !== 'undefined' && typeof EVENTS !== 'undefined') {
            EventBus.on(EVENTS.TOAST_REQUESTED, function (data) {
                if (data && data.message) {
                    showToast(data.message, data.color || data.type, data.options);
                }
            });
            EventBus.on(EVENTS.ANNOUNCEMENT_REQUESTED, function (data) {
                if (data && data.message && typeof announce === 'function') {
                    announce(data.message, data.options || data.assertive || false);
                }
            });
        }
	        window.addEventListener('mlf-audio-caption', (event) => {
            if (!soundCueCaptionsEnabled()) return;
            const detail = event && event.detail ? event.detail : null;
            if (!detail || !detail.text) return;
            const captionText = String(detail.text).trim();
            if (!captionText) return;
            const category = detail.category ? String(detail.category).trim() : '';
            const dedupeKey = `${category.toLowerCase()}|${captionText.toLowerCase()}`;
            const now = Date.now();
            const last = _audioCaptionToastLastByText.get(dedupeKey) || 0;
            if (now - last < 1000) return;
            _audioCaptionToastLastByText.set(dedupeKey, now);
            const categoryPrefix = category ? `[${category}] ` : '';
	            showToast(`🔊 ${categoryPrefix}${captionText}`, '#90A4AE', { announce: true });
	        });

            const REWARD_PRESENTATION_TOKENS = Object.freeze({
                coinColors: ['#FFD54F', '#FFEE58', '#FFC107'],
                badgeToneColors: {
                    soft: '#90CAF9',
                    bronze: '#CD7F32',
                    silver: '#B0BEC5',
                    gold: '#FFD700'
                }
            });

            function isRewardFxReducedMotion() {
                try {
                    if (document.documentElement.getAttribute('data-reduced-motion') === 'true') return true;
                    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
                } catch (e) {
                    return false;
                }
            }

            function showRewardBurstFX(anchorEl, options = {}) {
                if (typeof document === 'undefined') return null;
                const anchor = anchorEl || document.body;
                const rect = (anchor && anchor.getBoundingClientRect) ? anchor.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
                const reduced = isRewardFxReducedMotion();
                const layer = document.createElement('div');
                layer.className = 'reward-fx-layer';
                layer.setAttribute('aria-hidden', 'true');
                const cx = Math.max(20, Math.min(window.innerWidth - 20, rect.left + (rect.width / 2)));
                const cy = Math.max(20, Math.min(window.innerHeight - 20, rect.top + (rect.height / 2)));
                layer.style.left = `${cx}px`;
                layer.style.top = `${cy}px`;

                const coinCount = Math.max(0, Math.min(12, Number(options.coinCount) || 0));
                for (let i = 0; i < coinCount; i++) {
                    const coin = document.createElement('span');
                    coin.className = 'reward-coin-particle';
                    coin.textContent = '🪙';
                    coin.style.setProperty('--rx', `${(Math.random() * 2 - 1) * (34 + Math.random() * 22)}px`);
                    coin.style.setProperty('--ry', `${-18 - Math.random() * 26}px`);
                    coin.style.setProperty('--delay', `${(i % 4) * 0.02}s`);
                    if (reduced) coin.style.animation = 'none';
                    layer.appendChild(coin);
                }

                if (options.ribbonText) {
                    const ribbon = document.createElement('div');
                    ribbon.className = 'reward-ribbon-pop';
                    ribbon.textContent = String(options.ribbonText);
                    if (reduced) ribbon.classList.add('reduced');
                    layer.appendChild(ribbon);
                }

                if (options.badgeText) {
                    const badge = document.createElement('div');
                    badge.className = 'reward-badge-pop';
                    const tone = String(options.badgeTone || 'soft');
                    badge.style.setProperty('--reward-badge-tone', REWARD_PRESENTATION_TOKENS.badgeToneColors[tone] || REWARD_PRESENTATION_TOKENS.badgeToneColors.soft);
                    badge.textContent = String(options.badgeText);
                    if (reduced) badge.classList.add('reduced');
                    layer.appendChild(badge);
                }

                document.body.appendChild(layer);
                setTimeout(() => { if (layer.parentNode) layer.remove(); }, reduced ? 900 : 1600);
                return layer;
            }

        const REWARD_CARD_META = {
            achievement: { title: 'Achievement Unlocked', fallbackIcon: '🏆' },
            badge: { title: 'Badge Earned', fallbackIcon: '🎖️' },
            sticker: { title: 'Sticker Collected', fallbackIcon: '📓' },
            trophy: { title: 'Trophy Earned', fallbackIcon: '🥇' }
        };
        let _rewardCardQueue = [];
        let _rewardCardActive = false;
        let _rewardCardTimer = null;

        function queueRewardCard(type, reward, color) {
            if (!reward) return;
            const meta = REWARD_CARD_META[type];
            if (!meta) return;
            _rewardCardQueue.push({
                type,
                title: meta.title,
                icon: reward.icon || reward.emoji || meta.fallbackIcon,
                name: reward.name || 'New reward',
                color: sanitizeCssColor(color || '#FFD700')
            });
            if (!_rewardCardActive) showNextRewardCard();
        }

        function showNextRewardCard() {
            if (_rewardCardQueue.length === 0) {
                _rewardCardActive = false;
                return;
            }
            _rewardCardActive = true;
            if (document.querySelector('.toast') || isGameplayTrafficHigh()) {
                _rewardCardTimer = setTimeout(showNextRewardCard, 380);
                return;
            }
            trafficMinimizeCoachChecklist();
            const cardData = _rewardCardQueue.shift();
            const existing = document.querySelector('.reward-card-pop');
            if (existing) existing.remove();

            const card = document.createElement('aside');
            card.className = 'reward-card-pop';
            card.setAttribute('aria-live', 'polite');
            card.innerHTML = `
                <div class="reward-card-icon">${renderUiIcon(cardData.type === 'streak' ? 'streak' : (cardData.type === 'trophy' ? 'trophy' : 'badge'), cardData.icon, cardData.title)}</div>
                <div class="reward-card-copy">
                    <div class="reward-card-title">${escapeHTML(cardData.title)}</div>
                    <div class="reward-card-name">${escapeHTML(cardData.name)}</div>
                </div>
            `;
            card.style.setProperty('--reward-card-accent', cardData.color);
            card.style.cursor = 'pointer';
            card.title = 'Click to dismiss';
            card.setAttribute('aria-label', `${escapeHTML(cardData.title)}: ${escapeHTML(cardData.name)}. Click to dismiss.`);
	            document.body.appendChild(card);
	            if (typeof GameAudio !== 'undefined' && GameAudio.playSFXByName) {
	                GameAudio.playSFXByName('reward-pop', GameAudio.sfx.achievement);
	            }
                if (typeof showRewardBurstFX === 'function') {
                    showRewardBurstFX(card, {
                        badgeText: (cardData.type === 'badge' || cardData.type === 'achievement') ? `${cardData.icon} ${cardData.name}` : cardData.title,
                        badgeTone: (cardData.type === 'trophy' || cardData.type === 'achievement') ? 'gold' : 'soft',
                        coinCount: cardData.type === 'trophy' ? 4 : 0
                    });
                }
	            requestAnimationFrame(() => card.classList.add('show'));

            function dismissRewardCard() {
                if (_rewardCardTimer) clearTimeout(_rewardCardTimer);
                card.classList.remove('show');
                setTimeout(() => {
                    card.remove();
                    showNextRewardCard();
                }, 240);
            }

            card.addEventListener('click', dismissRewardCard);

            if (_rewardCardTimer) clearTimeout(_rewardCardTimer);
            _rewardCardTimer = setTimeout(dismissRewardCard, 3500);
        }

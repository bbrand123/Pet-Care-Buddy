// ============================================================
// ui/actions.js  --  Care actions, feed menu, favorites bar,
//                    welcome back summary, onboarding hints,
//                    mini-game cleanup
// Extracted from ui.js (lines 241-1208, 2406-2510, 3006-3865,
//                        4255-4474, 4876-4888)
// ============================================================

        // ==================== FAVORITES BAR (Feature 5) ====================
        const FAVORITE_ACTIONS = {
            feed: { icon: '🍎', label: 'Feed' },
            wash: { icon: '🛁', label: 'Wash' },
            sleep: { icon: '🛏️', label: 'Sleep' },
            cuddle: { icon: '🤗', label: 'Pet' },
            play: { icon: '⚽', label: 'Play' },
            treat: { icon: '🍪', label: 'Treat' },
            medicine: { icon: '💊', label: 'Medicine' },
            groom: { icon: '✂️', label: 'Groom' },
            exercise: { icon: '💪', label: 'Exercise' }
        };

        function getFavorites() {
            try {
                const saved = localStorage.getItem(STORAGE_KEYS.favorites);
                if (saved) return JSON.parse(saved);
            } catch (e) {}
            return [null, null, null];
        }

        function saveFavorites(favs) {
            try {
                localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(favs));
            } catch (e) {}
        }

        function generateFavoritesBarHTML() {
            const favs = getFavorites();
            let html = '<div class="favorites-label">Quick Actions</div><div class="favorites-bar" role="group" aria-label="Favorite actions">';
            for (let i = 0; i < 3; i++) {
                const action = favs[i];
                const data = action ? FAVORITE_ACTIONS[action] : null;
                if (data) {
                    html += `<div class="favorite-slot-wrap filled">
                        <button class="favorite-slot filled" type="button" data-fav-idx="${i}" data-fav-action="${action}" title="${data.label}" aria-label="Quick ${data.label}">
                            <span aria-hidden="true">${data.icon}</span>
                        </button>
                        <button class="fav-remove" type="button" data-fav-remove="${i}" title="Remove" aria-label="Remove ${data.label} from favorites">&times;</button>
                    </div>`;
                } else {
                    html += `<div class="favorite-slot-wrap empty">
                        <button class="favorite-slot favorite-slot-empty" type="button" data-fav-idx="${i}" title="Add a favorite action" aria-label="Empty favorite slot ${i + 1}, choose a quick action">
                            <span class="favorite-slot-plus" aria-hidden="true">+</span>
                            <span class="favorite-slot-hint">Add action</span>
                        </button>
                    </div>`;
                }
            }
            html += '</div>';
            return html;
        }

        function showFavoritesPicker(slotIdx, triggerEl) {
            const favs = getFavorites();
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Choose a favorite action');
            let html = '<div class="modal-content" style="max-width:300px;text-align:center;padding:20px;">';
            html += '<h3 style="margin:0 0 12px;font-size:1.1rem;">Choose Action</h3>';
            html += '<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">';
            for (const [action, data] of Object.entries(FAVORITE_ACTIONS)) {
                const alreadySet = favs.includes(action);
                html += `<button class="action-btn" style="min-width:70px;${alreadySet ? 'opacity:0.4;pointer-events:none;' : ''}" data-pick-action="${action}">
                    <span class="btn-icon" aria-hidden="true">${data.icon}</span>
                    <span style="font-size:0.7rem;">${data.label}</span>
                </button>`;
            }
            html += '</div>';
            html += '<button class="modal-close-btn" style="margin-top:12px;padding:8px 20px;border:1px solid #ccc;border-radius:8px;background:white;cursor:pointer;font-family:inherit;">Cancel</button>';
            html += '</div>';
            overlay.innerHTML = html;
            document.body.appendChild(overlay);

            function closePicker() {
                popModalEscape(closePicker);
                overlay.remove();
                const fallback = document.querySelector(`.favorite-slot[data-fav-idx="${slotIdx}"]`);
                const returnTarget = (triggerEl && document.contains(triggerEl)) ? triggerEl : fallback;
                if (returnTarget && typeof returnTarget.focus === 'function') returnTarget.focus();
            }

            overlay.querySelector('.modal-close-btn').addEventListener('click', closePicker);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closePicker(); });
            overlay.querySelectorAll('[data-pick-action]').forEach(btn => {
                btn.addEventListener('click', () => {
                    favs[slotIdx] = btn.dataset.pickAction;
                    saveFavorites(favs);
                    closePicker();
                    updateFavoritesBar();
                });
            });
            pushModalEscape(closePicker);
            trapFocus(overlay);
            const closeBtn = overlay.querySelector('.modal-close-btn');
            if (closeBtn) closeBtn.focus();
        }

        function updateFavoritesBar() {
            const existing = document.querySelector('.favorites-bar');
            const label = document.querySelector('.favorites-label');
            if (existing) existing.remove();
            if (label) label.remove();
            const section = document.querySelector('.actions-section');
            if (section) {
                section.insertAdjacentHTML('beforebegin', generateFavoritesBarHTML());
                bindFavoritesEvents();
            }
        }

        function bindFavoritesEvents() {
            document.querySelectorAll('.favorite-slot').forEach(slot => {
                slot.addEventListener('click', (e) => {
                    if (e.target.closest('.fav-remove')) return;
                    const action = slot.dataset.favAction;
                    if (action && typeof careAction === 'function') {
                        careAction(action);
                    } else {
                        showFavoritesPicker(parseInt(slot.dataset.favIdx), slot);
                    }
                });
            });
            document.querySelectorAll('.fav-remove').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const idx = parseInt(btn.dataset.favRemove);
                    const favs = getFavorites();
                    favs[idx] = null;
                    saveFavorites(favs);
                    updateFavoritesBar();
                });
            });
        }

        const MORE_ACTIONS_PREF_KEY = STORAGE_KEYS.moreActionsExpanded;

        function getMoreActionsExpandedPref() {
            try {
                return localStorage.getItem(MORE_ACTIONS_PREF_KEY) === 'true';
            } catch (e) {
                return false;
            }
        }

        function setMoreActionsExpandedPref(expanded) {
            try {
                localStorage.setItem(MORE_ACTIONS_PREF_KEY, expanded ? 'true' : 'false');
            } catch (e) {}
        }

        function isElementKeyboardVisible(el) {
            if (!el || !(el instanceof HTMLElement)) return false;
            if (!el.isConnected) return false;
            if (el.hidden) return false;
            if (el.getAttribute('aria-hidden') === 'true') return false;
            if (el.closest('[hidden], [aria-hidden="true"], [inert]')) return false;
            const style = window.getComputedStyle(el);
            if (!style || style.display === 'none' || style.visibility === 'hidden') return false;
            return el.getClientRects().length > 0;
        }

        function isTextEntryElement(el) {
            if (!el || !(el instanceof HTMLElement)) return false;
            if (el.isContentEditable) return true;
            return !!el.closest('input:not([type="button"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="submit"]):not([type="reset"]):not([type="file"]), textarea, [contenteditable="true"]');
        }

        let _focusContinuityLastTextEntryAt = 0;

        function setupRovingTabindex(container, itemSelector) {
            if (!container) return;
            const items = Array.from(container.querySelectorAll(itemSelector))
                .filter((el) => !el.disabled && isElementKeyboardVisible(el));
            if (items.length === 0) return;
            let activeIdx = Math.max(0, items.findIndex((el) => el === document.activeElement));
            if (activeIdx < 0) activeIdx = 0;
            items.forEach((el, idx) => el.setAttribute('tabindex', idx === activeIdx ? '0' : '-1'));

            container.__mlfRovingItemSelector = itemSelector;
            if (!container.__mlfRovingKeydownBound) {
                container.__mlfRovingKeydownBound = true;
                container.addEventListener('keydown', (e) => {
                    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
                    const selector = container.__mlfRovingItemSelector || itemSelector;
                    const enabledItems = Array.from(container.querySelectorAll(selector))
                        .filter((el) => !el.disabled && isElementKeyboardVisible(el));
                    if (enabledItems.length === 0) return;
                    const current = enabledItems.indexOf(document.activeElement);
                    let next = current >= 0 ? current : 0;
                    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (next - 1 + enabledItems.length) % enabledItems.length;
                    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (next + 1) % enabledItems.length;
                    if (e.key === 'Home') next = 0;
                    if (e.key === 'End') next = enabledItems.length - 1;
                    e.preventDefault();
                    enabledItems.forEach((el, idx) => el.setAttribute('tabindex', idx === next ? '0' : '-1'));
                    enabledItems[next].focus();
                });
            }
        }

        function ensureContinuousTabFocus() {
            if ((typeof isDialogOpen === 'function' && isDialogOpen()) || document.querySelector('.modal-overlay, [role="dialog"], [role="alertdialog"], .settings-overlay')) return;
            const active = document.activeElement;
            if (active && active !== document.body && active !== document.documentElement) return;
            if (Date.now() - _focusContinuityLastTextEntryAt < 250) return;
            const firstFocusable = Array.from(document.querySelectorAll('.skip-link, .top-action-btn, .room-btn, .core-care-btn, .action-btn:not(.duplicate-core-action)'))
                .find((el) => !el.disabled && isElementKeyboardVisible(el));
            if (firstFocusable && typeof firstFocusable.focus === 'function') {
                firstFocusable.focus({ preventScroll: true });
            }
        }

        if (!window.__mlfFocusContinuityListener) {
            window.__mlfFocusContinuityListener = true;
            document.addEventListener('focusin', () => {
                const active = document.activeElement;
                if (isTextEntryElement(active)) {
                    _focusContinuityLastTextEntryAt = Date.now();
                    return;
                }
                if (active !== document.body && active !== document.documentElement) return;
                setTimeout(() => ensureContinuousTabFocus(), 0);
            });
        }

        function setUiBusyState() {
            const activeOverlays = document.querySelectorAll('[role="dialog"], [role="alertdialog"], .modal-overlay, .settings-overlay').length;
            const busyNoise = document.querySelectorAll('.toast, .onboarding-tooltip, .reward-card-pop, .coach-checklist:not(.minimized)').length;
            document.body.classList.toggle('ui-busy', activeOverlays > 0 || busyNoise > 2);
        }

        if (typeof window !== 'undefined') {
            window.setUiBusyState = setUiBusyState;
        }

        // ==================== WELCOME BACK SUMMARY SCREEN (Feature 7) ====================
        function showWelcomeBackModal(offlineChanges, pet) {
            if (!offlineChanges || !pet) return;
            const petData = (typeof getAllPetTypeData === 'function' ? getAllPetTypeData(pet.type) : null) || PET_TYPES[pet.type] || { emoji: '🐾', name: 'Pet' };
            const hrs = Math.floor(offlineChanges.minutes / 60);
            const mins = offlineChanges.minutes % 60;
            const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

            // Lead with the pet's emotional state (personality-aware)
            let emotionalMessage = '';
            if (typeof getWelcomeBackMessage === 'function') {
                emotionalMessage = getWelcomeBackMessage(pet, offlineChanges.minutes);
            }
            const safeEmotionalMessage = escapeHTML(emotionalMessage);

            // Generate pet SVG for display
            const petSVGHTML = pet ? (typeof generatePetSVG === 'function' ? generatePetSVG(pet, offlineChanges.minutes >= 720 ? 'sad' : offlineChanges.minutes >= 240 ? 'idle' : 'happy') : '') : '';

            function statLine(icon, label, change) {
                const cls = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
                const prefix = change > 0 ? '+' : '';
                return `<div class="welcome-back-stat">
                    <span class="stat-icon" aria-hidden="true">${icon}</span>
                    <span>${label}</span>
                    <span class="stat-change ${cls}">${prefix}${change}</span>
                </div>`;
            }

            let gardenHTML = '';
            const garden = gameState.garden;
            if (garden && garden.plots && garden.plots.some(p => p && p.stage >= 3)) {
                const readyCount = garden.plots.filter(p => p && p.stage >= 3).length;
                gardenHTML = `<div class="welcome-back-garden">🌱 ${readyCount} crop${readyCount > 1 ? 's' : ''} ready to harvest!</div>`;
            }

            let streakHTML = '';
            const streak = gameState.streak;
            if (streak && streak.current > 0) {
                streakHTML = `<div class="welcome-back-streak">🔥 ${streak.current}-day streak!${!streak.todayBonusClaimed ? ' Claim your bonus!' : ''}</div>`;
            }

            const overlay = document.createElement('div');
            overlay.className = 'welcome-back-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Welcome back summary');
            overlay.innerHTML = `
                <div class="welcome-back-modal">
                    ${petSVGHTML ? `<div class="welcome-back-pet-svg" aria-hidden="true" style="width:80px;height:80px;margin:0 auto 8px;">${petSVGHTML}</div>` : `<div class="welcome-back-pet-emoji" aria-hidden="true">${petData.emoji}</div>`}
                    ${safeEmotionalMessage ? `<p class="welcome-back-emotional" style="font-style:italic;color:#5D4037;margin-bottom:10px;font-size:0.92rem;line-height:1.4;">${safeEmotionalMessage}</p>` : ''}
                    <h2 class="welcome-back-title">Welcome Back!</h2>
                    <p class="welcome-back-subtitle">You were away for ${timeStr}</p>
                    <div class="welcome-back-stats">
                        ${statLine('🍎', 'Hunger', offlineChanges.hunger)}
                        ${statLine('🛁', 'Cleanliness', offlineChanges.cleanliness)}
                        ${statLine('💖', 'Happiness', offlineChanges.happiness)}
                        ${statLine('⚡', 'Energy', offlineChanges.energy)}
                    </div>
                    ${gardenHTML}
                    ${streakHTML}
                    <button class="welcome-back-close" id="welcome-back-close">Let's Go!</button>
                </div>
            `;
            document.body.appendChild(overlay);
            overlay.querySelector('#welcome-back-close').addEventListener('click', () => {
                overlay.classList.add('modal-closing');
                setTimeout(() => overlay.remove(), 220);
            });
            // Auto-dismiss after 8 seconds
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.classList.add('modal-closing');
                    setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 220);
                }
            }, 8000);
        }

        // Color name helper for VoiceOver accessibility
        function getColorName(hex) {
            const colorNames = {
                '#D4A574': 'Sandy Brown', '#8B7355': 'Dark Tan', '#F5DEB3': 'Wheat',
                '#A0522D': 'Sienna', '#FFE4C4': 'Peach', '#FFA500': 'Orange',
                '#808080': 'Gray', '#FFFFFF': 'White', '#000000': 'Black',
                '#DEB887': 'Tan', '#FFB6C1': 'Light Pink', '#FFD700': 'Gold',
                '#87CEEB': 'Sky Blue', '#98FB98': 'Pale Green', '#FF6347': 'Tomato Red',
                '#DDA0DD': 'Plum', '#228B22': 'Forest Green', '#556B2F': 'Dark Olive',
                '#6B8E23': 'Olive Green', '#8FBC8F': 'Sea Green', '#2E8B57': 'Emerald',
                '#4169E1': 'Royal Blue', '#FF69B4': 'Hot Pink', '#00CED1': 'Turquoise',
                '#32CD32': 'Lime Green', '#9ACD32': 'Yellow Green', '#00FA9A': 'Spring Green',
                '#D2B48C': 'Light Tan', '#C4A882': 'Sandy', '#F5F5F5': 'Snow White',
                '#FFFAF0': 'Floral White', '#FFF8DC': 'Cornsilk', '#FAEBD7': 'Antique White',
                '#2F4F4F': 'Dark Slate', '#36454F': 'Charcoal', '#1C1C1C': 'Jet Black',
                '#4A4A4A': 'Dark Gray', '#333333': 'Dark Charcoal', '#E6E6FA': 'Lavender',
                '#F0E68C': 'Khaki', '#B0E0E6': 'Powder Blue', '#DC143C': 'Crimson',
                '#8B0000': 'Dark Red', '#FF4500': 'Orange Red', '#B22222': 'Firebrick Red'
            };
            if (!hex) return 'Unknown';
            return colorNames[hex.toUpperCase()] || colorNames[hex] || hex;
        }

        let globalActivateBound = false;

        function setupGlobalActivateDelegates() {
            if (globalActivateBound) return;
            globalActivateBound = true;

            const safeInvoke = (element, handler, event) => {
                if (!element || typeof handler !== 'function') return;
                if (element.disabled || element.getAttribute('aria-disabled') === 'true') return;
                const now = Date.now();
                const last = Number(element.dataset.lastActivate || 0);
                if (now - last < 200) return;
                element.dataset.lastActivate = String(now);
                if (typeof GameAudio !== 'undefined' && GameAudio.playSFXByName) {
                    GameAudio.playSFXByName('button-tap', GameAudio.sfx.play);
                    if (element.getAttribute('aria-haspopup') === 'dialog' || element.classList.contains('room-coming-toggle')) {
                        GameAudio.playSFXByName('menu-open', GameAudio.sfx.roomTransition);
                    }
                }
                handler(event);
            };

            const dispatch = (event) => {
                const target = event.target;
                if (!(target instanceof Element)) return;

                const roomBtn = target.closest('.room-btn');
                if (roomBtn) {
                    if (event.type === 'touchend') event.preventDefault();
                    if (typeof switchRoom === 'function') {
                        safeInvoke(roomBtn, () => switchRoom(roomBtn.dataset.room), event);
                    }
                    return;
                }

                const roomComingToggle = target.closest('#room-coming-toggle');
                if (roomComingToggle) {
                    if (event.type === 'touchend') event.preventDefault();
                    safeInvoke(roomComingToggle, () => {
                        const panel = document.getElementById('room-coming-panel');
                        if (!panel) return;
                        const expanded = roomComingToggle.getAttribute('aria-expanded') === 'true';
                        roomComingToggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
                        panel.hidden = expanded;
                    }, event);
                    return;
                }

                const newPetBtn = target.closest('#new-pet-btn');
                if (newPetBtn) {
                    if (event.type === 'touchend') event.preventDefault();
                    safeInvoke(newPetBtn, typeof startNewPet === 'function' ? startNewPet : null, event);
                    return;
                }

                const codexBtn = target.closest('#codex-btn');
                if (codexBtn) {
                    if (event.type === 'touchend') event.preventDefault();
                    safeInvoke(codexBtn, typeof showPetCodex === 'function' ? showPetCodex : null, event);
                    return;
                }

                const statsBtn = target.closest('#stats-btn');
                if (statsBtn) {
                    if (event.type === 'touchend') event.preventDefault();
                    safeInvoke(statsBtn, typeof showStatsScreen === 'function' ? showStatsScreen : null, event);
                    return;
                }

                const furnitureBtn = target.closest('#furniture-btn');
                if (furnitureBtn) {
                    if (event.type === 'touchend') event.preventDefault();
                    safeInvoke(furnitureBtn, typeof showFurnitureModal === 'function' ? showFurnitureModal : null, event);
                    return;
                }

                const soundBtn = target.closest('#sound-toggle-btn');
                if (soundBtn) {
                    if (event.type === 'touchend') event.preventDefault();
                    safeInvoke(soundBtn, () => {
                        if (typeof GameAudio !== 'undefined') {
                            const enabled = GameAudio.toggle();
                            soundBtn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
                            const iconSpan = soundBtn.querySelector('.top-action-btn-icon');
                            if (iconSpan) iconSpan.textContent = enabled ? '🔊' : '🔇';
                            if (enabled && gameState.currentRoom) {
                                GameAudio.enterRoom(gameState.currentRoom);
                            }
                        }
                    }, event);
                    return;
                }

                const achievementsBtn = target.closest('#achievements-btn');
                if (achievementsBtn) {
                    if (event.type === 'touchend') event.preventDefault();
                    safeInvoke(achievementsBtn, typeof showAchievementsModal === 'function' ? showAchievementsModal : null, event);
                    return;
                }

                const dailyBtn = target.closest('#daily-btn');
                if (dailyBtn) {
                    if (event.type === 'touchend') event.preventDefault();
                    safeInvoke(dailyBtn, typeof showDailyChecklistModal === 'function' ? showDailyChecklistModal : null, event);
                    return;
                }

                const rewardsBtn = target.closest('#rewards-btn');
                if (rewardsBtn) {
                    if (event.type === 'touchend') event.preventDefault();
                    safeInvoke(rewardsBtn, typeof showRewardsHub === 'function' ? showRewardsHub : null, event);
                    return;
                }

                const exploreBtn = target.closest('#explore-btn');
                if (exploreBtn) {
                    if (event.type === 'touchend') event.preventDefault();
                    safeInvoke(exploreBtn, typeof showExplorationModal === 'function' ? showExplorationModal : null, event);
                    return;
                }

                const economyBtn = target.closest('#economy-btn');
                if (economyBtn) {
                    if (event.type === 'touchend') event.preventDefault();
                    safeInvoke(economyBtn, typeof showEconomyModal === 'function' ? showEconomyModal : null, event);
                    return;
                }

                const toolsBtn = target.closest('#tools-btn');
                if (toolsBtn) {
                    if (event.type === 'touchend') event.preventDefault();
                    safeInvoke(toolsBtn, typeof showToolsMenu === 'function' ? () => showToolsMenu(toolsBtn) : null, event);
                    return;
                }

                const journalBtn = target.closest('#journal-btn');
                if (journalBtn) {
                    if (event.type === 'touchend') event.preventDefault();
                    safeInvoke(journalBtn, typeof showJournalModal === 'function' ? showJournalModal : null, event);
                    return;
                }

                const memorialBtn = target.closest('#memorial-btn');
                if (memorialBtn) {
                    if (event.type === 'touchend') event.preventDefault();
                    safeInvoke(memorialBtn, typeof showMemorialHall === 'function' ? showMemorialHall : null, event);
                    return;
                }

                const notifHistBtn = target.closest('#notif-history-btn');
                if (notifHistBtn) {
                    if (event.type === 'touchend') event.preventDefault();
                    safeInvoke(notifHistBtn, typeof showNotificationHistory === 'function' ? showNotificationHistory : null, event);
                    return;
                }

                const settingsBtn = target.closest('#settings-btn');
                if (settingsBtn) {
                    if (event.type === 'touchend') event.preventDefault();
                    safeInvoke(settingsBtn, typeof showSettingsModal === 'function' ? showSettingsModal : null, event);
                    return;
                }

                // Legacy sound/dark mode buttons (kept for backward compat if rendered)
                const darkModeBtn = target.closest('#dark-mode-btn');
                if (darkModeBtn) {
                    if (event.type === 'touchend') event.preventDefault();
                    safeInvoke(darkModeBtn, () => {
                        const html = document.documentElement;
                        const current = html.getAttribute('data-theme');
                        const isDark = current === 'dark' ||
                            (!current && window.matchMedia('(prefers-color-scheme: dark)').matches);
                        const newTheme = isDark ? 'light' : 'dark';
                        html.setAttribute('data-theme', newTheme);
                        try { localStorage.setItem(STORAGE_KEYS.theme, newTheme); } catch (e) {}
                        // Update button state
                        darkModeBtn.setAttribute('aria-pressed', newTheme === 'dark' ? 'true' : 'false');
                        const iconSpan = darkModeBtn.querySelector('.top-action-btn-icon');
                        if (iconSpan) iconSpan.textContent = newTheme === 'dark' ? '🌙' : '☀️';
                        // Update meta theme-color
                        const meta = document.querySelector('meta[name="theme-color"]');
                        if (meta) meta.content = newTheme === 'dark' ? '#1a1a2e' : '#A8D8EA';
                    }, event);
                }
            };

            document.addEventListener('click', dispatch, true);
            document.addEventListener('touchend', dispatch, { passive: false, capture: true });
        }

        function setCareActionsSkipLinkVisible(isVisible) {
            const skipLinks = [
                { selector: '.skip-link-secondary', targetId: 'care-actions' },
                { selector: '.skip-link-rooms', targetId: 'room-nav' },
                { selector: '.skip-link-status', targetId: 'status-heading' }
            ];
            skipLinks.forEach(({ selector }) => {
                const skipLink = document.querySelector(selector);
                if (!skipLink) return;
                const shouldShow = !!isVisible;
                skipLink.hidden = !shouldShow;
                skipLink.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
                skipLink.setAttribute('aria-disabled', shouldShow ? 'false' : 'true');
                if (!shouldShow) {
                    skipLink.setAttribute('tabindex', '-1');
                } else {
                    skipLink.removeAttribute('tabindex');
                }
            });
        }

        function setupSkipLinkFocusFlow() {
            document.querySelectorAll('.skip-link').forEach((skipLink) => {
                if (skipLink.dataset.focusFlowBound === 'true') return;
                skipLink.dataset.focusFlowBound = 'true';
                skipLink.addEventListener('click', (e) => {
                    const href = skipLink.getAttribute('href') || '';
                    if (!href.startsWith('#')) return;
                    const target = document.getElementById(href.slice(1));
                    if (!target) return;
                    e.preventDefault();
                    const hadTabindex = target.hasAttribute('tabindex');
                    if (!hadTabindex) target.setAttribute('tabindex', '-1');
                    target.focus({ preventScroll: true });
                    target.scrollIntoView({ block: 'start', behavior: isReducedMotionEnabled() ? 'auto' : 'smooth' });
                    if (!hadTabindex) {
                        target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
                    }
                });
            });
        }

        function renderEggPhase(maintainFocus = false) {
            document.body.classList.remove('has-core-care-dock');
            setCareActionsSkipLinkVisible(false);
            // Initialize egg if not set
            if (!gameState.eggType || !gameState.pendingPetType) {
                initializeNewEgg();
            }

            const content = document.getElementById('game-content');
            if (!content) return;
            const preRenderFocusSnapshot = (typeof captureUiFocusSnapshot === 'function')
                ? captureUiFocusSnapshot({ scope: content, context: 'egg-phase' })
                : null;
            const crackLevel = Math.min(gameState.eggTaps, 3);
            const eggData = EGG_TYPES[gameState.eggType] || EGG_TYPES['furry'];

            // Generate progress dots
            let progressDots = '';
            for (let i = 0; i < 5; i++) {
                progressDots += `<div class="egg-progress-dot ${i < gameState.eggTaps ? 'filled' : ''}" aria-hidden="true"></div>`;
            }

            const isAdopting = gameState.adoptingAdditional && gameState.pets && gameState.pets.length > 0;

            content.innerHTML = `
                <div class="pet-area" role="region" aria-label="Egg hatching area">
                    <div class="sparkles" id="sparkles"></div>
                    ${isAdopting ? `<div class="adopt-banner">🥚 Adopting pet #${gameState.pets.length + 1}!</div>` : ''}
                    <button class="egg-container" id="egg-button"
                            aria-label="Tap the ${eggData.name} to help it hatch! Tapped ${gameState.eggTaps} of 5 times. ${5 - gameState.eggTaps} more taps needed."
                            aria-describedby="tap-hint">
                        ${generateEggSVG(crackLevel, gameState.eggType)}
                    </button>
                    <p class="hatch-message" aria-live="polite">${eggData.description} - what could be inside?</p>
                    <div class="egg-progress" role="progressbar" aria-valuenow="${gameState.eggTaps}" aria-valuemin="0" aria-valuemax="5" aria-label="Hatching progress: ${gameState.eggTaps} of 5 taps">
                        ${progressDots}
                    </div>
                    <p class="tap-hint" id="tap-hint">Tap the egg to hatch it!</p>
                    ${isAdopting ? `<button class="cancel-adopt-btn" id="cancel-adopt-btn" type="button">Cancel & Return to Pets</button>` : ''}
                </div>
            `;

            const eggButton = document.getElementById('egg-button');

            // Use named function to allow proper removal if needed
            function onEggClick(e) {
                e.preventDefault();
                handleEggTap();
            }

            function onEggKeydown(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleEggTap();
                }
            }

            eggButton.addEventListener('click', onEggClick);
            eggButton.addEventListener('keydown', onEggKeydown);

            // Cancel adoption button
            const cancelAdoptBtn = document.getElementById('cancel-adopt-btn');
            if (cancelAdoptBtn) {
                cancelAdoptBtn.addEventListener('click', () => {
                    gameState.adoptingAdditional = false;
                    gameState.phase = 'pet';
                    gameState.eggTaps = 0;
                    // Restore active pet with bounds check
                    if (gameState.pets.length > 0) {
                        if (gameState.activePetIndex >= gameState.pets.length) {
                            gameState.activePetIndex = 0;
                        }
                        gameState.pet = gameState.pets[gameState.activePetIndex];
                    }
                    saveGame();
                    renderPetPhase();
                    showToast('Returned to your pets!', '#4ECDC4');
                });
            }

            // Maintain focus for keyboard users / VoiceOver
            if (maintainFocus) {
                eggButton.focus();
            } else if (preRenderFocusSnapshot && preRenderFocusSnapshot.descriptor && typeof restoreFocusFromSnapshot === 'function') {
                restoreFocusFromSnapshot(preRenderFocusSnapshot, { scope: content });
            }
        }

        // Prevent rapid tapping issues
        let eggTapCooldown = false;

        function handleEggTap() {
            if (eggTapCooldown) return;
            if (gameState.phase !== 'egg') return;

            eggTapCooldown = true;
            setTimeout(() => { eggTapCooldown = false; }, 200);

            const eggButton = document.getElementById('egg-button');
            const sparkles = document.getElementById('sparkles');
            if (!eggButton) return;
            if (gameState.eggTaps >= 5) return; // Already at max
            gameState.eggTaps++;

            // Haptic feedback on egg tap
            if (typeof hapticBuzz === 'function') hapticBuzz(50);

            // Add shake animation
            eggButton.classList.add('egg-shake');
            setTimeout(() => eggButton.classList.remove('egg-shake'), 300);

            // Add sparkles
            if (sparkles) createSparkles(sparkles, 2);

            // Announce progress — only on first tap and penultimate tap to avoid rapid-fire announcements
            const remaining = 5 - gameState.eggTaps;
            if (gameState.eggTaps === 1) {
                announce(`Tap 1 of 5. ${remaining} more to hatch!`);
            } else if (gameState.eggTaps === 4) {
                announce('One more tap to hatch!');
            }

            if (gameState.eggTaps >= 5) {
                // Hatch the egg!
                gameState.phase = 'hatching';
                announce('The egg is hatching! Here comes your pet!', true);
                setTimeout(hatchPet, 1000);
            } else {
                // Update egg display with more cracks, maintain focus for keyboard users
                renderEggPhase(true);
            }

            saveGame();
        }

        function hatchPet() {
            // Reset egg tap cooldown
            eggTapCooldown = false;

            // Haptic buzz for the big hatch moment
            if (typeof hapticBuzz === 'function') hapticBuzz(120);

            const newPet = createPet();
            gameState.pet = newPet;
            gameState.phase = 'pet';
            gameState.eggTaps = 0;
            gameState.eggType = null;
            gameState.pendingPetType = null;
            gameState.adoptingAdditional = false;

            // Add to pets array
            addPetToFamily(newPet);
            gameState.activePetIndex = gameState.pets.length - 1;

            saveGame();

            const petData = getAllPetTypeData(newPet.type) || PET_TYPES[newPet.type] || { name: 'Pet', emoji: '🐾' };
            const isMythical = petData.mythical || petData.hybrid;
            const mythicalNote = isMythical ? ' A mythical creature!' : '';
            const familyNote = gameState.pets.length > 1 ? ' Welcome to the family!' : '';
            announce(`Congratulations! You hatched a baby ${petData.name}! ${petData.emoji}${mythicalNote}${familyNote}`, true);
            addJournalEntry(petData.emoji, `Hatched a new ${petData.name}! Welcome to the family!`);

            showNamingModal(petData);
        }

        function showNamingModal(petData, options) {
            const existingOverlay = document.querySelector('.naming-overlay');
            if (existingOverlay) existingOverlay.remove();

            const pet = gameState.pet;
            const namingOptions = options || {};
            const initialColor = (typeof namingOptions.initialColor === 'string' && namingOptions.initialColor)
                ? namingOptions.initialColor
                : ((pet && typeof pet.color === 'string' && pet.color) ? pet.color : (petData.colors[0] || '#D4A574'));
            const initialPattern = (typeof namingOptions.initialPattern === 'string' && namingOptions.initialPattern)
                ? namingOptions.initialPattern
                : ((pet && typeof pet.pattern === 'string' && pet.pattern) ? pet.pattern : 'solid');
            const initialAccessory = Object.prototype.hasOwnProperty.call(namingOptions, 'initialAccessory')
                ? namingOptions.initialAccessory
                : ((pet && Array.isArray(pet.accessories) && pet.accessories.length > 0) ? pet.accessories[0] : null);
            const overlay = document.createElement('div');
            overlay.className = 'naming-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-labelledby', 'naming-title');

            // Generate color options
            let colorOptions = petData.colors.map((color) => {
                const colorName = getColorName(color);
                return `
                <button class="color-option ${color === initialColor ? 'selected' : ''}" data-color="${color}" style="--swatch-color: ${color};" aria-label="${colorName}${color === initialColor ? ', selected' : ''}">
                    <span class="color-option-swatch" aria-hidden="true"></span>
                    <span class="color-option-name">${escapeHTML(colorName)}</span>
                    <span class="color-option-check" aria-hidden="true">${color === initialColor ? '✓' : ''}</span>
                </button>
            `;
            }).join('');

            // Generate pattern options
            let patternOptions = Object.entries(PET_PATTERNS).map(([id, pattern]) => `
                <button class="pattern-option ${id === initialPattern ? 'selected' : ''}" data-pattern="${id}" aria-label="${pattern.name}${id === initialPattern ? ', selected' : ''}">
                    <span class="pattern-label">${pattern.name}</span>
                </button>
            `).join('');

            // Generate accessory options (just a few basic ones to start)
            const defaultAccessory = initialAccessory || 'none';
            let accessoryOptions = `
                <button class="accessory-option ${defaultAccessory === 'none' ? 'selected' : ''}" data-accessory="none" aria-label="None${defaultAccessory === 'none' ? ', selected' : ''}">None</button>
                <button class="accessory-option ${defaultAccessory === 'bow' ? 'selected' : ''}" data-accessory="bow" aria-label="Bow${defaultAccessory === 'bow' ? ', selected' : ''}"><span aria-hidden="true">🎀</span> Bow</button>
                <button class="accessory-option ${defaultAccessory === 'glasses' ? 'selected' : ''}" data-accessory="glasses" aria-label="Glasses${defaultAccessory === 'glasses' ? ', selected' : ''}"><span aria-hidden="true">👓</span> Glasses</button>
                <button class="accessory-option ${defaultAccessory === 'partyHat' ? 'selected' : ''}" data-accessory="partyHat" aria-label="Party Hat${defaultAccessory === 'partyHat' ? ', selected' : ''}"><span aria-hidden="true">🎉</span> Party Hat</button>
            `;

            overlay.innerHTML = `
                <div class="naming-modal">
                    <div class="naming-modal-icon">${petData.emoji}</div>
                    <h2 class="naming-modal-title" id="naming-title">Customize Your ${petData.name}!</h2>
                    ${petData.mythical ? '<p class="naming-modal-mythical">Mythical Pet!</p>' : ''}

                    <div class="pet-preview-container" id="pet-preview-container" aria-label="Live preview of your pet" style="margin:0.5em auto;width:90px;height:90px;">
                    </div>

                    <div class="customization-section">
                        <h3 class="customization-title">Name</h3>
                        <input type="text" class="naming-input" id="pet-name-input"
                               placeholder="${petData.name}" maxlength="14" autocomplete="off"
                               aria-label="Enter a name for your pet, maximum 14 characters"
                               aria-describedby="name-char-count">
                        <span class="name-char-count" id="name-char-count" aria-live="polite">0/14 characters</span>
                        <button class="tts-button" id="tts-button" aria-label="Hear name spoken">🔊 Hear Name</button>
                    </div>

                    <div class="customization-section">
                        <h3 class="customization-title">Choose Color</h3>
                        <div class="color-options" id="color-options">
                            ${colorOptions}
                        </div>
                    </div>

                    <button class="advanced-toggle" id="advanced-toggle" type="button" aria-expanded="false" aria-controls="advanced-options">
                        Advanced Options <span class="advanced-toggle-arrow" aria-hidden="true">&#9654;</span>
                    </button>
                    <div class="advanced-options" id="advanced-options" hidden>
                        <div class="customization-section">
                            <h3 class="customization-title">Choose Pattern</h3>
                            <div class="pattern-options" id="pattern-options">
                                ${patternOptions}
                            </div>
                        </div>

                        <div class="customization-section">
                            <h3 class="customization-title">Add Accessory (Optional)</h3>
                            <div class="accessory-options" id="accessory-options">
                                ${accessoryOptions}
                            </div>
                        </div>
                    </div>

                    <button class="naming-submit-btn" id="naming-submit">Create My Pet!</button>
                    <button class="naming-skip-btn" id="naming-skip">Use Defaults</button>
                </div>
            `;
            document.body.appendChild(overlay);

            const input = document.getElementById('pet-name-input');
            const submitBtn = document.getElementById('naming-submit');
            const skipBtn = document.getElementById('naming-skip');
            const ttsBtn = document.getElementById('tts-button');

            // Selected customization values
            let selectedColor = initialColor;
            let selectedPattern = initialPattern;
            let selectedAccessory = initialAccessory || null;

            // Live preview updater
            const previewEl = document.getElementById('pet-preview-container');
            function updatePreview() {
                if (!previewEl) return;
                const previewPet = {
                    type: pet.type,
                    color: selectedColor,
                    pattern: selectedPattern,
                    accessories: selectedAccessory ? [selectedAccessory] : [],
                    growthStage: pet.growthStage || 'baby',
                    careVariant: pet.careVariant || 'normal',
                    evolutionStage: pet.evolutionStage || 'base'
                };
                previewEl.innerHTML = generatePetSVG(previewPet, 'happy');
            }
            updatePreview();

            // Color selection (scoped to overlay to avoid leaking to other modals)
            overlay.querySelectorAll('.color-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    overlay.querySelectorAll('.color-option').forEach(b => {
                        b.classList.remove('selected');
                        const check = b.querySelector('.color-option-check');
                        if (check) check.textContent = '';
                        b.setAttribute('aria-label', getColorName(b.dataset.color));
                    });
                    btn.classList.add('selected');
                    const check = btn.querySelector('.color-option-check');
                    if (check) check.textContent = '✓';
                    btn.setAttribute('aria-label', getColorName(btn.dataset.color) + ', selected');
                    selectedColor = btn.dataset.color;
                    updatePreview();
                });
            });

            // Pattern selection (scoped to overlay)
            overlay.querySelectorAll('.pattern-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    overlay.querySelectorAll('.pattern-option').forEach(b => {
                        b.classList.remove('selected');
                        const name = PET_PATTERNS[b.dataset.pattern]?.name || b.dataset.pattern;
                        b.setAttribute('aria-label', name);
                    });
                    btn.classList.add('selected');
                    const selectedName = PET_PATTERNS[btn.dataset.pattern]?.name || btn.dataset.pattern;
                    btn.setAttribute('aria-label', selectedName + ', selected');
                    selectedPattern = btn.dataset.pattern;
                    updatePreview();
                });
            });

            // Accessory selection (scoped to overlay)
            const accessoryNames = { none: 'None', bow: 'Bow', glasses: 'Glasses', partyHat: 'Party Hat' };
            overlay.querySelectorAll('.accessory-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    overlay.querySelectorAll('.accessory-option').forEach(b => {
                        b.classList.remove('selected');
                        b.setAttribute('aria-label', accessoryNames[b.dataset.accessory] || b.dataset.accessory);
                    });
                    btn.classList.add('selected');
                    btn.setAttribute('aria-label', (accessoryNames[btn.dataset.accessory] || btn.dataset.accessory) + ', selected');
                    const accessory = btn.dataset.accessory;
                    selectedAccessory = accessory === 'none' ? null : accessory;
                    updatePreview();
                });
            });

            // Advanced options toggle
            const advancedToggle = document.getElementById('advanced-toggle');
            const advancedPanel = document.getElementById('advanced-options');
            if (advancedToggle && advancedPanel) {
                advancedToggle.addEventListener('click', () => {
                    const expanded = advancedPanel.hidden;
                    advancedPanel.hidden = !expanded;
                    advancedToggle.setAttribute('aria-expanded', String(expanded));
                    advancedToggle.querySelector('.advanced-toggle-arrow').textContent = expanded ? '\u25BC' : '\u25B6';
                });
            }

            const ttsEnabled = () => {
                try {
                    return localStorage.getItem(STORAGE_KEYS.ttsOff) !== 'true';
                } catch (e) {
                    return true;
                }
            };

            // Text-to-speech
            ttsBtn.addEventListener('click', () => {
                const name = input.value.trim() || petData.name;
                if (!ttsEnabled()) {
                    showToast('Text-to-speech is turned off in Settings', '#FFA726');
                } else if ('speechSynthesis' in window) {
                    const utterance = new SpeechSynthesisUtterance(name);
                    utterance.rate = 0.9;
                    utterance.pitch = 1.1;
                    window.speechSynthesis.cancel(); // Cancel any ongoing speech
                    window.speechSynthesis.speak(utterance);
                    showToast(`🔊 "${escapeHTML(name)}"`, '#4ECDC4');
                } else {
                    showToast('Text-to-speech not supported', '#FFA726');
                }
            });

            // Live character counter for naming input
            const charCount = document.getElementById('name-char-count');
            input.addEventListener('input', () => {
                const len = input.value.length;
                if (charCount) charCount.textContent = `${len}/14 characters`;
            });

            setTimeout(() => input.focus(), 100);

            function finishNaming(customName, useDefaults = false) {
                const raw = customName ? customName.trim() : '';
                const name = raw.length > 0 ? sanitizePetName(raw) : null;
                if (name) {
                    gameState.pet.name = name;
                    // Text-to-speech on submit — cancel any ongoing speech first
                    if ('speechSynthesis' in window && !useDefaults && ttsEnabled()) {
                        window.speechSynthesis.cancel();
                        const utterance = new SpeechSynthesisUtterance(name);
                        utterance.rate = 0.9;
                        utterance.pitch = 1.1;
                        window.speechSynthesis.speak(utterance);
                    }
                } else {
                    gameState.pet.name = petData.name;
                }

                // Apply customizations
                if (!useDefaults) {
                    gameState.pet.color = selectedColor;
                    gameState.pet.pattern = selectedPattern;
                    gameState.pet.accessories = selectedAccessory ? [selectedAccessory] : [];
                }

                if (typeof syncProgressiveOnboardingMilestones === 'function') {
                    syncProgressiveOnboardingMilestones({ firstPetCreated: true });
                }
                saveGame();
                overlay.remove();
                renderPetPhase();
                showToast(`Welcome home, ${escapeHTML(gameState.pet.name)}!`, '#4ECDC4');
            }

            function closeNaming() {
                popModalEscape(closeNaming);
                finishNaming('', true);
            }

            submitBtn.addEventListener('click', () => { popModalEscape(closeNaming); finishNaming(input.value, false); });
            skipBtn.addEventListener('click', () => closeNaming());
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { popModalEscape(closeNaming); finishNaming(input.value, false); }
            });
            pushModalEscape(closeNaming);
            trapFocus(overlay);
        }

        // Exposed on window so game.js can read/write these flags reliably
        // even if files are loaded as modules in the future.
        // Use conditional check matching game.js to avoid resetting values already set.
        if (typeof _petPhaseTimersRunning === 'undefined') var _petPhaseTimersRunning = false;
        if (typeof _petPhaseLastRoom === 'undefined') var _petPhaseLastRoom = null;


        // ==================== ONBOARDING HINTS ====================
        // Lightweight first-time tooltip system stored in localStorage
        const ONBOARDING_HINTS = [
            { id: 'room_bonus', trigger: 'first_render', message: 'Tip: Each room gives a bonus to certain actions! Look for the +% badges on buttons.' },
            { id: 'garden_intro', trigger: 'garden', message: 'Tip: Plant seeds and water them to grow food for your pet!' },
            { id: 'minigames_intro', trigger: 'first_render', message: 'Tip: Play mini-games to earn happiness and unlock achievements!' },
            { id: 'explore_intro', trigger: 'first_render', message: 'Tip: Open the 🗺️ button for world map biomes, expeditions, dungeons, and wild NPC pets.' },
            { id: 'multi_pet', trigger: 'multi_pet', message: 'Tip: With multiple pets, they can interact and build relationships!' },
            { id: 'growth_system', trigger: 'first_render', message: 'Tip: Your pet grows based on both care actions and time. Keep taking good care!' }
        ];

        let _onboardingShownThisSession = {};

        function getShownHints() {
            try {
                const raw = localStorage.getItem(STORAGE_KEYS.onboardingShown);
                return raw ? JSON.parse(raw) : {};
            } catch (e) { return {}; }
        }

        function markHintShown(hintId) {
            try {
                const shown = getShownHints();
                shown[hintId] = true;
                localStorage.setItem(STORAGE_KEYS.onboardingShown, JSON.stringify(shown));
            } catch (e) {}
        }

        function isDialogOpen() {
            if (typeof _modalEscapeStack !== 'undefined' && Array.isArray(_modalEscapeStack) && _modalEscapeStack.length > 0) {
                return true;
            }
            return !!document.querySelector('[role="dialog"], [role="alertdialog"], .modal-overlay, .naming-overlay, .settings-overlay, .interaction-overlay, .feed-menu-overlay, .minigame-menu-overlay, .competition-overlay, .tutorial-overlay');
        }

        function clearOnboardingTooltips() {
            document.querySelectorAll('.onboarding-tooltip').forEach((el) => el.remove());
        }

        function showOnboardingHints(currentRoom) {
            const shown = getShownHints();
            if (isDialogOpen() || document.querySelector('.toast')) return;

            for (const hint of ONBOARDING_HINTS) {
                if (shown[hint.id] || _onboardingShownThisSession[hint.id]) continue;

                let shouldShow = false;
                if (hint.trigger === 'first_render') shouldShow = true;
                if (hint.trigger === 'garden' && currentRoom === 'garden') shouldShow = true;
                if (hint.trigger === 'multi_pet' && gameState.pets && gameState.pets.length >= 2) shouldShow = true;

                if (shouldShow) {
                    _onboardingShownThisSession[hint.id] = 'pending';
                    // Small fixed delay for hint display (avoids ever-growing stagger accumulation)
                    const delay = 0;
                    setTimeout(() => {
                        if (isDialogOpen() || document.querySelector('.toast')) {
                            delete _onboardingShownThisSession[hint.id];
                            return;
                        }
                        _onboardingShownThisSession[hint.id] = true;
                        markHintShown(hint.id);
                        showOnboardingTooltip(hint.message);
                    }, 1500 + delay);
                    // Only show one hint per render to avoid overwhelming
                    return;
                }
            }
        }

        function showOnboardingTooltip(message) {
            if (!message || isDialogOpen() || document.querySelector('.toast')) return;
            clearOnboardingTooltips();
            const tooltip = document.createElement('div');
            tooltip.className = 'onboarding-tooltip';
            if (!isDialogOpen()) tooltip.setAttribute('role', 'status');
            tooltip.innerHTML = `
                <span class="onboarding-icon" aria-hidden="true">💡</span>
                <span class="onboarding-text">${escapeHTML(message)}</span>
                <button class="onboarding-dismiss" aria-label="Dismiss tip">✕</button>
            `;
            document.body.appendChild(tooltip);

            const dismiss = tooltip.querySelector('.onboarding-dismiss');
            let removed = false;
            let busyWatcher = null;
            const dismissOnInteract = (event) => {
                if (!tooltip.contains(event.target)) removeTooltip();
            };
            function removeTooltip() {
                if (removed) return;
                removed = true;
                document.removeEventListener('pointerdown', dismissOnInteract, true);
                if (busyWatcher) clearInterval(busyWatcher);
                tooltip.remove();
            }
            dismiss.addEventListener('click', removeTooltip);
            document.addEventListener('pointerdown', dismissOnInteract, true);
            busyWatcher = setInterval(() => {
                if (isDialogOpen()) removeTooltip();
            }, 250);
            // Auto-dismiss after 8 seconds
            setTimeout(() => { if (tooltip.parentNode) removeTooltip(); }, 8000);
        }


        // Toast color map for actions
        const TOAST_COLORS = {
            feed: '#FF8C42',
            wash: '#4FC3F7',
            play: '#AED581',
            sleep: '#9575CD',
            medicine: '#F48FB1',
            groom: '#CE93D8',
            exercise: '#FFB74D',
            treat: '#FF7EB3',
            cuddle: '#FFB4A2'
        };

        // Track whether an action animation is playing (guards idle anims)
        let actionAnimating = false;

        // Track button cooldowns
        let actionCooldown = false;
        let actionCooldownTimer = null;
        let _cooldownRAF = null;
        const ACTION_COOLDOWN_MS = GAME_BALANCE.timing.actionCooldownMs;
        let _lastCooldownAnnouncement = 0;
        const _cooldownToastByKey = {};

        function announceCooldownOnce() {
            const now = Date.now();
            if (now - _lastCooldownAnnouncement < 1600) return;
            _lastCooldownAnnouncement = now;
            if (typeof announce === 'function') announce('Actions are cooling down. Please wait a moment.');
        }

        function showCooldownToast(key, message) {
            const now = Date.now();
            const last = _cooldownToastByKey[key] || 0;
            if (now - last < 1800) return;
            _cooldownToastByKey[key] = now;
            showToast(message, '#FFA726', { announce: false });
        }

        function isActionCooldownActive() {
            return actionCooldown;
        }

        function ensureActionUnavailableReason(btn, message) {
            if (!btn) return null;
            let reasonId = btn.getAttribute('data-unavailable-reason-id');
            let reasonEl = reasonId ? document.getElementById(reasonId) : null;
            if (!reasonEl) {
                reasonId = `action-unavailable-${btn.id || Math.random().toString(36).slice(2, 8)}`;
                reasonEl = document.createElement('span');
                reasonEl.className = 'sr-only action-unavailable-reason';
                reasonEl.id = reasonId;
                btn.appendChild(reasonEl);
                btn.setAttribute('data-unavailable-reason-id', reasonId);
            }
            reasonEl.textContent = message;
            const describedBy = (btn.getAttribute('aria-describedby') || '')
                .split(/\s+/)
                .filter(Boolean)
                .filter((id) => id !== reasonId);
            describedBy.push(reasonId);
            btn.setAttribute('aria-describedby', describedBy.join(' '));
            return reasonEl;
        }

        function setActionButtonCooldownState(btn, seconds) {
            if (!btn) return;
            const remaining = Math.max(1, Math.ceil(seconds || (ACTION_COOLDOWN_MS / 1000)));
            const reasonText = `Cooling down. Available in ${remaining} second${remaining !== 1 ? 's' : ''}.`;
            btn.classList.add('cooldown');
            btn.disabled = true;
            btn.setAttribute('aria-disabled', 'true');
            if (!btn.dataset.originalLabel) {
                btn.dataset.originalLabel = btn.getAttribute('aria-label') || btn.querySelector('span:not(.btn-icon):not(.action-btn-tooltip):not(.cooldown-count):not(.kbd-hint):not(.room-bonus-badge):not(.feed-crop-badge)')?.textContent.trim() || '';
            }
            btn.setAttribute('aria-label', `${btn.dataset.originalLabel || 'Action'} (${reasonText})`);
            ensureActionUnavailableReason(btn, reasonText);
            const cooldownCount = btn.querySelector('.cooldown-count');
            if (cooldownCount) {
                cooldownCount.textContent = `Wait ${remaining}s`;
                cooldownCount.setAttribute('data-visible', 'true');
            }
        }

        function startActionCooldownWindow() {
            actionCooldown = true;
            const buttons = document.querySelectorAll('.action-btn');
            buttons.forEach(btn => {
                setActionButtonCooldownState(btn, ACTION_COOLDOWN_MS / 1000);
            });
            if (actionCooldownTimer) {
                clearTimeout(actionCooldownTimer);
            }
            actionCooldownTimer = setTimeout(() => {
                actionCooldown = false;
                actionCooldownTimer = null;
                restoreActionButtonsFromCooldown();
            }, ACTION_COOLDOWN_MS);
        }

        // Spawn themed particles above the pet on care actions
        function spawnCareParticles(container, emojis, count) {
            if (!container) return;
            const visualLoad = document.querySelectorAll('.toast, .onboarding-tooltip').length;
            count = count || (visualLoad > 0 ? 3 : 4);
            for (let i = 0; i < count; i++) {
                const p = document.createElement('span');
                p.className = 'care-particle';
                p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
                const dx = (Math.random() - 0.5) * 80;
                const dy = -30 - Math.random() * 40;
                p.style.setProperty('--dx', dx + 'px');
                p.style.setProperty('--dy', dy + 'px');
                p.style.left = (40 + Math.random() * 20) + '%';
                p.style.top = (20 + Math.random() * 20) + '%';
                p.style.animationDelay = (i * 0.08) + 's';
                container.appendChild(p);
                setTimeout(() => p.remove(), 1500);
            }
        }

        // Show floating stat change text above pet
        function showFloatingStatChange(container, label, amount) {
            if (!container || amount === 0) return;
            const el = document.createElement('div');
            el.className = 'stat-change-float ' + (amount > 0 ? 'positive' : 'negative');
            el.textContent = (amount > 0 ? '+' : '') + amount + ' ' + label;
            el.style.left = (40 + Math.random() * 20) + '%';
            container.appendChild(el);
            setTimeout(() => el.remove(), 1600);
        }

        const STAT_DELTA_TARGETS = {
            hunger: { id: 'hunger-bubble', label: 'Hunger' },
            cleanliness: { id: 'clean-bubble', label: 'Cleanliness' },
            happiness: { id: 'happy-bubble', label: 'Happiness' },
            energy: { id: 'energy-bubble', label: 'Energy' }
        };

        function showNeedBubbleStatDelta(statKey, amount) {
            if (!amount || amount === 0) return;
            const target = STAT_DELTA_TARGETS[statKey];
            if (!target) return;
            const bubble = document.getElementById(target.id);
            if (!bubble) return;
            const delta = document.createElement('div');
            delta.className = `stat-bar-delta ${amount > 0 ? 'positive' : 'negative'}`;
            delta.textContent = `${amount > 0 ? '+' : ''}${amount}`;
            delta.setAttribute('aria-hidden', 'true');
            delta.style.left = `${44 + (Math.random() * 12 - 6)}%`;
            bubble.appendChild(delta);
            setTimeout(() => delta.remove(), 1150);
        }

        // Debounced aria-live announcements for stat changes (batches decay ticks)
        let _statChangeAnnounceTimer = null;
        let _statChangeBatch = {};
        function _flushStatChangeAnnouncement() {
            _statChangeAnnounceTimer = null;
            const entries = Object.entries(_statChangeBatch).filter(([, v]) => v !== 0);
            _statChangeBatch = {};
            if (entries.length === 0 || typeof announce !== 'function') return;
            const parts = entries.map(([key, amount]) => {
                const target = STAT_DELTA_TARGETS[key];
                const label = target ? target.label : key;
                return `${label} ${amount > 0 ? '+' : ''}${amount}`;
            });
            announce(parts.join(', '));
        }

        function showStatDeltaNearNeedBubbles(deltas) {
            if (!deltas || typeof deltas !== 'object') return;
            Object.entries(deltas).forEach(([key, amount]) => {
                showNeedBubbleStatDelta(key, amount);
                // Batch for debounced screen reader announcement
                _statChangeBatch[key] = (_statChangeBatch[key] || 0) + amount;
            });
            if (_statChangeAnnounceTimer) clearTimeout(_statChangeAnnounceTimer);
            _statChangeAnnounceTimer = setTimeout(_flushStatChangeAnnouncement, 2000);
        }

        // Map care actions to themed particle emojis
        const CARE_PARTICLE_EMOJIS = {
            feed: ['🍎', '🥕', '🍖', '🧁'],
            wash: ['🫧', '💧', '✨', '🧼'],
            play: ['❤️', '⭐', '🎾', '🎈'],
            sleep: ['💤', '✨', '🌙'],
            medicine: ['💊', '✨', '💗'],
            groom: ['✂️', '✨', '🪮'],
            exercise: ['💪', '🏃', '⭐'],
            treat: ['🍬', '🍪', '🧁', '⭐'],
            cuddle: ['❤️', '💕', '💗', '🥰']
        };

        const CARE_PRIMARY_NEED_MAP = {
            feed: 'hunger',
            wash: 'cleanliness',
            play: 'happiness',
            sleep: 'energy',
            groom: 'cleanliness',
            exercise: 'happiness',
            cuddle: 'happiness',
            treat: 'hunger'
        };

        function getCarePrimaryNeed(action) {
            if (typeof getCareActionPrimaryNeed === 'function') {
                const key = getCareActionPrimaryNeed(action);
                if (key) return key;
            }
            return CARE_PRIMARY_NEED_MAP[action] || null;
        }

        function getCareLoopRuntimeState(pet) {
            if (!pet || typeof pet !== 'object') return null;
            if (!pet._careLoopRuntime || typeof pet._careLoopRuntime !== 'object') {
                Object.defineProperty(pet, '_careLoopRuntime', {
                    value: { lastAction: null, lastAt: 0, repeatChain: 0, lastHintAt: 0 },
                    enumerable: false,
                    writable: true,
                    configurable: true
                });
            }
            return pet._careLoopRuntime;
        }

        function getLowestNeedFromSnapshot(pet, snapshot) {
            if (typeof getLowestNeedStatKey === 'function') return getLowestNeedStatKey(pet, snapshot);
            const stats = snapshot || (typeof getPetNeedSnapshot === 'function' ? getPetNeedSnapshot(pet) : null);
            if (!stats) return 'hunger';
            return Object.entries(stats).sort((a, b) => (a[1] || 0) - (b[1] || 0))[0][0];
        }

        function getCareDecisionMultiplier(action, pet, snapshot) {
            const tuning = (typeof getCareLoopTuning === 'function') ? getCareLoopTuning() : null;
            const runtime = getCareLoopRuntimeState(pet);
            if (!tuning || !pet || !runtime) {
                return { gainMultiplier: 1, repeatApplied: false, focused: false, offTarget: false, repeatChain: 0 };
            }

            const now = Date.now();
            const windowMs = Math.max(5000, Number(tuning.repeatWindowMs) || 12000);
            const maxStack = Math.max(1, Number(tuning.repeatMaxStack) || 4);
            const minRepeatMultiplier = Math.max(0.25, Math.min(1, Number(tuning.repeatMinMultiplier) || 0.56));
            const basePenalty = Math.max(0, Number(tuning.repeatBasePenalty) || 0.12);
            const stepPenalty = Math.max(0, Number(tuning.repeatStepPenalty) || 0.08);
            const elapsed = now - (Number(runtime.lastAt) || 0);
            const sameActionRepeat = runtime.lastAction === action && elapsed >= 0 && elapsed <= windowMs;

            let repeatChain = 0;
            let repeatMultiplier = 1;
            let repeatApplied = false;
            if (sameActionRepeat) {
                repeatChain = Math.min(maxStack, (Number(runtime.repeatChain) || 0) + 1);
                const freshnessRatio = 1 - Math.min(1, elapsed / windowMs);
                const penalty = (basePenalty + (repeatChain * stepPenalty)) * (0.6 + freshnessRatio * 0.4);
                repeatMultiplier = Math.max(minRepeatMultiplier, 1 - penalty);
                repeatApplied = repeatMultiplier < 0.999;
            }

            const stage = pet.growthStage && GROWTH_STAGES[pet.growthStage] ? pet.growthStage : 'baby';
            const stageBalance = getStageBalance(stage);
            const primaryNeed = getCarePrimaryNeed(action);
            const lowestNeed = getLowestNeedFromSnapshot(pet, snapshot);
            const baseFocus = (typeof getCareFocusMultiplier === 'function')
                ? Math.max(1, Number(getCareFocusMultiplier(action, pet, snapshot)) || 1)
                : 1;
            const extraFocusedBonus = Math.max(0, Number(tuning.extraFocusedBonus) || 0);
            const focusStageWeight = Math.max(0, Number(tuning.focusStageWeight) || 0.75);
            const offTargetMultiplier = Math.max(0.65, Math.min(1, Number(tuning.offTargetMultiplier) || 0.9));

            let focusMultiplier = baseFocus;
            let focused = false;
            let offTarget = false;
            if (primaryNeed && lowestNeed) {
                if (primaryNeed === lowestNeed) {
                    focused = true;
                    const stageFocus = Math.max(0, Number(stageBalance.focusedCareBonus) || 0);
                    focusMultiplier *= (1 + extraFocusedBonus + (stageFocus * focusStageWeight));
                } else {
                    offTarget = true;
                    focusMultiplier *= offTargetMultiplier;
                }
            }

            const minTotal = Math.max(0.35, Number(tuning.minTotalMultiplier) || 0.55);
            const maxTotal = Math.max(minTotal, Number(tuning.maxTotalMultiplier) || 1.65);
            const gainMultiplier = Math.max(minTotal, Math.min(maxTotal, focusMultiplier * repeatMultiplier));

            runtime.lastAction = action;
            runtime.lastAt = now;
            runtime.repeatChain = repeatChain;

            return { gainMultiplier, repeatApplied, focused, offTarget, repeatChain };
        }

        // Shared standard-feed logic used by both careAction('feed') and openFeedMenu
        function performStandardFeed(pet, careDecision) {
            const focusSnapshot = (typeof getPetNeedSnapshot === 'function') ? getPetNeedSnapshot(pet) : null;
            const feedPersonality = typeof getPersonalityCareModifier === 'function' ? getPersonalityCareModifier(pet, 'feed') : 1;
            const feedPref = typeof getPreferenceModifier === 'function' ? getPreferenceModifier(pet, 'feed') : 1;
            const feedWisdom = typeof getElderWisdomBonus === 'function' ? getElderWisdomBonus(pet) : 0;
            const decision = careDecision || getCareDecisionMultiplier('feed', pet, focusSnapshot);
            const rewardCareMult = (typeof getRewardCareGainMultiplier === 'function') ? getRewardCareGainMultiplier() : 1;
            const feedBonus = Math.round((GAME_BALANCE.petCare.baseCareBonus + feedWisdom) * getRoomBonus('feed') * feedPersonality * feedPref * decision.gainMultiplier * rewardCareMult);
            pet.hunger = clamp(pet.hunger + feedBonus, 0, 100);
            // Track lifetime feed count for feed-specific badges/achievements
            if (typeof gameState.totalFeedCount !== 'number') gameState.totalFeedCount = 0;
            gameState.totalFeedCount++;
            const msg = (typeof getExpandedFeedbackMessage === 'function')
                ? getExpandedFeedbackMessage('feed', pet.personality, pet.growthStage)
                : randomFromArray(FEEDBACK_MESSAGES.feed);
            const petContainer = document.getElementById('pet-container');
            const sparkles = document.getElementById('sparkles');
            if (petContainer) petContainer.classList.add('bounce', 'pet-munch-loop');
            if (sparkles) createFoodParticles(sparkles);
            if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.feed);
            return msg;
        }

        function restoreActionButtonsFromCooldown() {
            document.querySelectorAll('.action-btn').forEach(btn => {
                btn.classList.remove('cooldown');
                btn.disabled = false;
                btn.removeAttribute('aria-disabled');
                btn.style.removeProperty('--cooldown-progress');
                if (btn.dataset.originalLabel) {
                    btn.setAttribute('aria-label', btn.dataset.originalLabel);
                }
                const reasonId = btn.getAttribute('data-unavailable-reason-id');
                if (reasonId) {
                    const reasonEl = document.getElementById(reasonId);
                    if (reasonEl) reasonEl.remove();
                    const describedBy = (btn.getAttribute('aria-describedby') || '')
                        .split(/\s+/)
                        .filter(Boolean)
                        .filter((id) => id !== reasonId);
                    if (describedBy.length > 0) btn.setAttribute('aria-describedby', describedBy.join(' '));
                    else btn.removeAttribute('aria-describedby');
                    btn.removeAttribute('data-unavailable-reason-id');
                }
                const cooldownCount = btn.querySelector('.cooldown-count');
                if (cooldownCount) {
                    cooldownCount.textContent = '';
                    cooldownCount.removeAttribute('data-visible');
                }
                // Pulse glow to signal availability
                btn.classList.add('cooldown-ready');
                setTimeout(() => btn.classList.remove('cooldown-ready'), 600);
            });
        }

        function cancelActionCooldownAndRestoreButtons() {
            actionCooldown = false;
            if (actionCooldownTimer) {
                clearTimeout(actionCooldownTimer);
                actionCooldownTimer = null;
            }
            restoreActionButtonsFromCooldown();
        }

        function careAction(action) {
            // Prevent rapid clicking
            if (actionCooldown) {
                announceCooldownOnce();
                return;
            }

            actionCooldown = true;
            const buttons = document.querySelectorAll('.action-btn');
            buttons.forEach(btn => {
                setActionButtonCooldownState(btn, ACTION_COOLDOWN_MS / 1000);
            });

            if (actionCooldownTimer) {
                clearTimeout(actionCooldownTimer);
                actionCooldownTimer = null;
            }

            // C27: Animate radial cooldown progress
            const cooldownStart = Date.now();
            if (_cooldownRAF) cancelAnimationFrame(_cooldownRAF);
            (function animateCooldownProgress() {
                const elapsed = Date.now() - cooldownStart;
                const progress = Math.min(100, (elapsed / ACTION_COOLDOWN_MS) * 100);
                document.querySelectorAll('.action-btn.cooldown').forEach(b => {
                    b.style.setProperty('--cooldown-progress', progress + '%');
                });
                if (progress < 100) {
                    _cooldownRAF = requestAnimationFrame(animateCooldownProgress);
                }
            })();

            actionCooldownTimer = setTimeout(() => {
                actionCooldown = false;
                actionCooldownTimer = null;
                if (_cooldownRAF) cancelAnimationFrame(_cooldownRAF);
                // Re-query current buttons in case renderPetPhase() rebuilt the DOM.
                restoreActionButtonsFromCooldown();
            }, ACTION_COOLDOWN_MS);

            const pet = gameState.pet;
            const petData = (typeof getAllPetTypeData === 'function' ? getAllPetTypeData(pet.type) : null) || PET_TYPES[pet.type] || { emoji: '🐾', name: 'Pet' };
            const petContainer = document.getElementById('pet-container');
            const sparkles = document.getElementById('sparkles');
            const beforeStats = {
                hunger: pet.hunger,
                cleanliness: pet.cleanliness,
                happiness: pet.happiness,
                energy: pet.energy
            };
            const rewardCareMult = (typeof getRewardCareGainMultiplier === 'function') ? getRewardCareGainMultiplier() : 1;
            const rewardHappyFlat = (typeof getRewardHappinessFlatBonus === 'function') ? getRewardHappinessFlatBonus() : 0;
            let message = '';
            let careDecisionResult = null;

            switch (action) {
                case 'feed': {
                    // Check if garden has crops available
                    const gardenInv = gameState.garden && gameState.garden.inventory ? gameState.garden.inventory : {};
                    const availableCrops = Object.keys(gardenInv).filter(k => gardenInv[k] > 0);
                    if (availableCrops.length === 1) {
                        // Quick feed: only one crop type, skip the menu
                        // Return early since feedFromGarden handles careActions increment itself.
                        // Keep current cooldown active because a feed action occurred.
                        const fed = feedFromGarden(availableCrops[0], { enforceCooldown: false });
                        if (!fed) {
                            cancelActionCooldownAndRestoreButtons();
                            return;
                        }
                        if (typeof syncProgressiveOnboardingMilestones === 'function') {
                            syncProgressiveOnboardingMilestones({ firstCareAction: true });
                        }
                        markCoachChecklistProgress('feed');
                        return;
                    } else if (availableCrops.length > 1) {
                        // Multiple crop types: show the feed menu
                        openFeedMenu();
                        // Reset cooldown since we opened a menu
                        cancelActionCooldownAndRestoreButtons();
                        return;
                    }
                    careDecisionResult = getCareDecisionMultiplier('feed', pet, beforeStats);
                    message = performStandardFeed(pet, careDecisionResult);
                    break;
                }
                case 'wash': {
                    const washPersonality = typeof getPersonalityCareModifier === 'function' ? getPersonalityCareModifier(pet, 'wash') : 1;
                    const washPref = typeof getPreferenceModifier === 'function' ? getPreferenceModifier(pet, 'wash') : 1;
                    const washWisdom = typeof getElderWisdomBonus === 'function' ? getElderWisdomBonus(pet) : 0;
                    careDecisionResult = getCareDecisionMultiplier('wash', pet, beforeStats);
                    const washBonus = Math.round((GAME_BALANCE.petCare.baseCareBonus + washWisdom) * getRoomBonus('wash') * washPersonality * washPref * careDecisionResult.gainMultiplier * rewardCareMult);
                    pet.cleanliness = clamp(pet.cleanliness + washBonus, 0, 100);
                    message = (typeof getExpandedFeedbackMessage === 'function')
                        ? getExpandedFeedbackMessage('wash', pet.personality, pet.growthStage)
                        : randomFromArray(FEEDBACK_MESSAGES.wash);
                    if (washPref < 1) message = `😨 ${pet.name || 'Pet'} didn't enjoy that... ${message}`;
                    else if (washPref > 1) message = `💕 ${pet.name || 'Pet'} loved that! ${message}`;
                    if (petContainer) petContainer.classList.add('sparkle', 'pet-scrub-shake');
                    if (sparkles) createBubbles(sparkles);
                    if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.wash);
                    break;
                }
                case 'play': {
                    const playPersonality = typeof getPersonalityCareModifier === 'function' ? getPersonalityCareModifier(pet, 'play') : 1;
                    const playPref = typeof getPreferenceModifier === 'function' ? getPreferenceModifier(pet, 'play') : 1;
                    const playWisdom = typeof getElderWisdomBonus === 'function' ? getElderWisdomBonus(pet) : 0;
                    careDecisionResult = getCareDecisionMultiplier('play', pet, beforeStats);
                    const playBonus = Math.round((GAME_BALANCE.petCare.baseCareBonus + playWisdom) * getRoomBonus('play') * playPersonality * playPref * careDecisionResult.gainMultiplier * rewardCareMult);
                    pet.happiness = clamp(pet.happiness + playBonus, 0, 100);
                    message = (typeof getExpandedFeedbackMessage === 'function')
                        ? getExpandedFeedbackMessage('play', pet.personality, pet.growthStage)
                        : randomFromArray(FEEDBACK_MESSAGES.play);
                    if (playPref < 1) message = `😨 ${pet.name || 'Pet'} wasn't into it... ${message}`;
                    else if (playPref > 1) message = `💕 ${pet.name || 'Pet'} LOVED playing! ${message}`;
                    if (petContainer) petContainer.classList.add('wiggle', 'pet-happy-bounce');
                    if (sparkles) createHearts(sparkles);
                    if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.play);
                    break;
                }
                case 'sleep': {
                    const sleepPersonality = typeof getPersonalityCareModifier === 'function' ? getPersonalityCareModifier(pet, 'sleep') : 1;
                    const sleepPref = typeof getPreferenceModifier === 'function' ? getPreferenceModifier(pet, 'sleep') : 1;
                    const sleepWisdom = typeof getElderWisdomBonus === 'function' ? getElderWisdomBonus(pet) : 0;
                    careDecisionResult = getCareDecisionMultiplier('sleep', pet, beforeStats);
                    // Sleep is more effective at night (deep sleep) and less during the day (just a nap)
                    const sleepTime = gameState.timeOfDay || 'day';
                    let sleepBonus = 22; // default nap
                    let sleepAnnounce = 'Your pet had a nice nap!';
                    if (sleepTime === 'night') {
                        sleepBonus = 35; // deep sleep at night
                        sleepAnnounce = 'Your pet had a wonderful deep sleep!';
                    } else if (sleepTime === 'sunset') {
                        sleepBonus = 27; // good evening rest
                        sleepAnnounce = 'Your pet had a cozy evening rest!';
                    } else if (sleepTime === 'sunrise') {
                        sleepBonus = 27; // nice morning sleep-in
                        sleepAnnounce = 'Your pet slept in a little!';
                    }
                    sleepBonus = Math.round((sleepBonus + sleepWisdom) * getRoomBonus('sleep') * sleepPersonality * sleepPref * careDecisionResult.gainMultiplier * rewardCareMult);
                    pet.energy = clamp(pet.energy + sleepBonus, 0, 100);
                    message = sleepAnnounce;
                    if (petContainer) petContainer.classList.add('sleep-anim', 'pet-sleepy-nod');
                    if (sparkles) createZzz(sparkles);
                    if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.sleep);
                    break;
                }
                case 'medicine': {
                    const medPersonality = typeof getPersonalityCareModifier === 'function' ? getPersonalityCareModifier(pet, 'medicine') : 1;
                    const medPref = typeof getPreferenceModifier === 'function' ? getPreferenceModifier(pet, 'medicine') : 1;
                    const medMod = medPersonality * medPref;
                    careDecisionResult = getCareDecisionMultiplier('medicine', pet, beforeStats);
                    // Medicine gives a gentle boost to all stats - helps pet feel better
                    pet.hunger = clamp(pet.hunger + Math.round(10 * medMod * rewardCareMult * careDecisionResult.gainMultiplier), 0, 100);
                    pet.cleanliness = clamp(pet.cleanliness + Math.round(10 * medMod * rewardCareMult * careDecisionResult.gainMultiplier), 0, 100);
                    pet.happiness = clamp(pet.happiness + Math.round(15 * medMod * rewardCareMult * careDecisionResult.gainMultiplier), 0, 100);
                    pet.energy = clamp(pet.energy + Math.round(10 * medMod * rewardCareMult * careDecisionResult.gainMultiplier), 0, 100);
                    message = (typeof getExpandedFeedbackMessage === 'function')
                        ? getExpandedFeedbackMessage('medicine', pet.personality, pet.growthStage)
                        : randomFromArray(FEEDBACK_MESSAGES.medicine);
                    if (medPref < 1) message = `😨 ${pet.name || 'Pet'} doesn't like medicine! ${message}`;
                    if (petContainer) petContainer.classList.add('heal-anim');
                    if (sparkles) createMedicineParticles(sparkles);
                    if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.medicine);
                    break;
                }
                case 'groom': {
                    const groomPersonality = typeof getPersonalityCareModifier === 'function' ? getPersonalityCareModifier(pet, 'groom') : 1;
                    const groomPref = typeof getPreferenceModifier === 'function' ? getPreferenceModifier(pet, 'groom') : 1;
                    const groomWisdom = typeof getElderWisdomBonus === 'function' ? getElderWisdomBonus(pet) : 0;
                    careDecisionResult = getCareDecisionMultiplier('groom', pet, beforeStats);
                    // Grooming - brush fur/feathers and trim nails
                    const groomBonus = getRoomBonus('groom');
                    const groomMod = groomPersonality * groomPref;
                    const groomClean = Math.round((13 + groomWisdom) * groomBonus * groomMod * careDecisionResult.gainMultiplier * rewardCareMult);
                    const groomHappy = Math.round((8 + groomWisdom) * groomBonus * groomMod * careDecisionResult.gainMultiplier * rewardCareMult);
                    pet.cleanliness = clamp(pet.cleanliness + groomClean, 0, 100);
                    pet.happiness = clamp(pet.happiness + groomHappy, 0, 100);
                    message = (typeof getExpandedFeedbackMessage === 'function')
                        ? getExpandedFeedbackMessage('groom', pet.personality, pet.growthStage)
                        : randomFromArray(FEEDBACK_MESSAGES.groom);
                    if (groomPref < 1) message = `😨 ${pet.name || 'Pet'} squirmed through grooming! ${message}`;
                    else if (groomPref > 1) message = `💕 ${pet.name || 'Pet'} loved the pampering! ${message}`;
                    if (petContainer) petContainer.classList.add('groom-anim');
                    if (sparkles) createGroomParticles(sparkles);
                    if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.groom);
                    break;
                }
                case 'exercise': {
                    const exPersonality = typeof getPersonalityCareModifier === 'function' ? getPersonalityCareModifier(pet, 'exercise') : 1;
                    const exPref = typeof getPreferenceModifier === 'function' ? getPreferenceModifier(pet, 'exercise') : 1;
                    const exWisdom = typeof getElderWisdomBonus === 'function' ? getElderWisdomBonus(pet) : 0;
                    careDecisionResult = getCareDecisionMultiplier('exercise', pet, beforeStats);
                    // Exercise - take walks or play fetch
                    const exMod = exPersonality * exPref;
                    const exBonus = Math.round((GAME_BALANCE.petCare.baseCareBonus + exWisdom) * getRoomBonus('exercise') * exMod * careDecisionResult.gainMultiplier * rewardCareMult);
                    pet.happiness = clamp(pet.happiness + exBonus, 0, 100);
                    pet.energy = clamp(pet.energy - 10, 0, 100);
                    pet.hunger = clamp(pet.hunger - 5, 0, 100);
                    message = (typeof getExpandedFeedbackMessage === 'function')
                        ? getExpandedFeedbackMessage('exercise', pet.personality, pet.growthStage)
                        : randomFromArray(FEEDBACK_MESSAGES.exercise);
                    if (exPref < 1) message = `😨 ${pet.name || 'Pet'} got tired quickly! ${message}`;
                    else if (exPref > 1) message = `💕 ${pet.name || 'Pet'} had an amazing workout! ${message}`;
                    if (petContainer) petContainer.classList.add('exercise-anim');
                    if (sparkles) createExerciseParticles(sparkles);
                    if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.exercise);
                    break;
                }
                case 'treat': {
                    const treatPersonality = typeof getPersonalityCareModifier === 'function' ? getPersonalityCareModifier(pet, 'treat') : 1;
                    const treatWisdom = typeof getElderWisdomBonus === 'function' ? getElderWisdomBonus(pet) : 0;
                    careDecisionResult = getCareDecisionMultiplier('treat', pet, beforeStats);
                    // Treats - special snacks that give bonus happiness
                    const treat = randomFromArray(TREAT_TYPES);
                    // Check if this is the pet's favorite treat
                    const prefs = typeof PET_PREFERENCES !== 'undefined' ? PET_PREFERENCES[pet.type] : null;
                    let treatMod = treatPersonality;
                    if (prefs && treat.name === prefs.favoriteTreat) {
                        treatMod *= 1.5;
                    }
                    pet.happiness = clamp(pet.happiness + Math.round((25 + treatWisdom) * treatMod * rewardCareMult * careDecisionResult.gainMultiplier), 0, 100);
                    pet.hunger = clamp(pet.hunger + Math.round(10 * treatMod * rewardCareMult * careDecisionResult.gainMultiplier), 0, 100);
                    const treatMsg = (typeof getExpandedFeedbackMessage === 'function')
                        ? getExpandedFeedbackMessage('treat', pet.personality, pet.growthStage)
                        : randomFromArray(FEEDBACK_MESSAGES.treat);
                    message = `${treat.emoji} ${treatMsg}`;
                    if (prefs && treat.name === prefs.favoriteTreat) {
                        message = `${treat.emoji} 💕 FAVORITE treat! ${treatMsg}`;
                    }
                    if (petContainer) petContainer.classList.add('treat-anim');
                    if (sparkles) createTreatParticles(sparkles, treat.emoji);
                    if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.treat);
                    break;
                }
                case 'cuddle': {
                    const cuddlePersonality = typeof getPersonalityCareModifier === 'function' ? getPersonalityCareModifier(pet, 'cuddle') : 1;
                    const cuddlePref = typeof getPreferenceModifier === 'function' ? getPreferenceModifier(pet, 'cuddle') : 1;
                    const cuddleWisdom = typeof getElderWisdomBonus === 'function' ? getElderWisdomBonus(pet) : 0;
                    careDecisionResult = getCareDecisionMultiplier('cuddle', pet, beforeStats);
                    const cuddleMod = cuddlePersonality * cuddlePref;
                    // Petting/Cuddling - direct affection boosts happiness and energy
                    pet.happiness = clamp(pet.happiness + Math.round((13 + cuddleWisdom) * cuddleMod * careDecisionResult.gainMultiplier * rewardCareMult), 0, 100);
                    pet.energy = clamp(pet.energy + Math.round(4 * cuddleMod * rewardCareMult * careDecisionResult.gainMultiplier), 0, 100);
                    message = (typeof getExpandedFeedbackMessage === 'function')
                        ? getExpandedFeedbackMessage('cuddle', pet.personality, pet.growthStage)
                        : randomFromArray(FEEDBACK_MESSAGES.cuddle);
                    if (cuddlePref < 1) message = `😨 ${pet.name || 'Pet'} squirmed away! ${message}`;
                    else if (cuddleMod > 1.2) message = `💕 ${pet.name || 'Pet'} melted into your arms! ${message}`;
                    if (petContainer) petContainer.classList.add('cuddle-anim');
                    if (sparkles) createCuddleParticles(sparkles);
                    if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.cuddle);
                    break;
                }
            }

            if (careDecisionResult && (careDecisionResult.repeatApplied || careDecisionResult.offTarget)) {
                const runtime = getCareLoopRuntimeState(pet);
                const now = Date.now();
                const hintCooldown = Math.max(8000, Number((typeof getCareLoopTuning === 'function' ? getCareLoopTuning().hintCooldownMs : 0)) || 18000);
                if (runtime && now - (runtime.lastHintAt || 0) >= hintCooldown) {
                    runtime.lastHintAt = now;
                    if (careDecisionResult.repeatApplied) {
                        showToast('🔁 Repeating the same action quickly gives smaller gains. Rotate actions for better results.', '#FFA726', { announce: false });
                        announce('Tip: repeating the same action too quickly gives reduced gains.');
                    } else if (careDecisionResult.offTarget) {
                        showToast('🎯 Focused care works best on your pet\'s lowest need right now.', '#4FC3F7', { announce: false });
                        announce('Tip: caring for the lowest need is more efficient.');
                    }
                }
            }

            if (rewardHappyFlat > 0) {
                pet.happiness = clamp(pet.happiness + rewardHappyFlat, 0, 100);
            }

            // Spawn themed particles, emoji burst, and floating stat text
            if (petContainer) {
                spawnCareParticles(petContainer, CARE_PARTICLE_EMOJIS[action] || ['✨'], 5);
                spawnEmojiBurst(petContainer, action);
            }
            const statDeltas = {
                hunger: pet.hunger - beforeStats.hunger,
                cleanliness: pet.cleanliness - beforeStats.cleanliness,
                happiness: pet.happiness - beforeStats.happiness,
                energy: pet.energy - beforeStats.energy
            };
            showStatDeltaNearNeedBubbles(statDeltas);
            if (typeof showStatChangeSummary === 'function') {
                const summaryChanges = Object.entries(statDeltas)
                    .filter(([, amount]) => amount !== 0)
                    .map(([key, amount]) => ({ label: STAT_DELTA_TARGETS[key] ? STAT_DELTA_TARGETS[key].label : key, amount }));
                showStatChangeSummary(summaryChanges, { action });
            }

            // Haptic feedback per action type
            if (typeof hapticPattern === 'function') hapticPattern(action);

            // Track care actions for growth
            if (typeof pet.careActions !== 'number') pet.careActions = 0;
            pet.careActions++;
            if (typeof syncProgressiveOnboardingMilestones === 'function') {
                syncProgressiveOnboardingMilestones({ firstCareAction: true });
            }
            if (typeof trackCareAction === 'function') trackCareAction(action);
            markCoachChecklistProgress(action);

            // Apply incubation bonus to breeding eggs from care actions
            if (typeof applyBreedingEggCareBonus === 'function') {
                applyBreedingEggCareBonus(action);
            }

            // Play pet voice sound on interactions + show visual reaction bubble
            {
                const petType = pet.type;
                let reactionEmoji = '';
                if (action === 'feed' || action === 'treat' || action === 'cuddle') {
                    if (typeof GameAudio !== 'undefined') GameAudio.playSFXByName('petHappy', (ctx) => GameAudio.sfx.petHappy(ctx, petType));
                    reactionEmoji = action === 'feed' ? '😋' : action === 'treat' ? '🤤' : '🥰';
                } else if (action === 'play' || action === 'exercise') {
                    if (typeof GameAudio !== 'undefined') GameAudio.playSFXByName('petExcited', (ctx) => GameAudio.sfx.petExcited(ctx, petType));
                    reactionEmoji = action === 'play' ? '😄' : '💪';
                } else if (action === 'wash') {
                    reactionEmoji = '✨';
                } else if (action === 'sleep') {
                    reactionEmoji = '😴';
                } else if (action === 'medicine') {
                    reactionEmoji = '💊';
                } else if (action === 'groom') {
                    reactionEmoji = '💇';
                }
	                if (reactionEmoji && petContainer) {
	                    showPetReaction(petContainer, reactionEmoji);
	                }
                    if (typeof triggerPetMicroReaction === 'function' && petContainer) triggerPetMicroReaction(action, { container: petContainer });
	            }

            // Track daily checklist progress
            if (typeof incrementDailyProgress === 'function') {
                const dailyCompleted = [];
                if (action === 'feed') {
                    dailyCompleted.push(...incrementDailyProgress('feedCount'));
                }
                dailyCompleted.push(...incrementDailyProgress('totalCareActions'));
                dailyCompleted.push(...incrementDailyProgress('masteryPoints', 1));
                dailyCompleted.forEach(task => showToast(`${task.icon} Daily task done: ${task.name}!`, '#FFD700'));
            }

            if (typeof consumeCareActionRewardModifiers === 'function') consumeCareActionRewardModifiers();

            // Track medicine and groom counts for trophies
            if (action === 'medicine') {
                if (typeof gameState.totalMedicineUses !== 'number') gameState.totalMedicineUses = 0;
                gameState.totalMedicineUses++;
            }
            if (action === 'groom') {
                if (typeof gameState.totalGroomCount !== 'number') gameState.totalGroomCount = 0;
                gameState.totalGroomCount++;
            }

            // Check achievements
            if (typeof checkAchievements === 'function') {
                const newAch = checkAchievements();
                newAch.forEach(ach => {
                    if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.achievement);
                    if (typeof hapticPattern === 'function') hapticPattern('achievement');
                    setTimeout(() => {
                        showToast(`${ach.icon} Achievement: ${ach.name}!`, '#FFD700');
                        queueRewardCard('achievement', ach, '#FFD700');
                    }, 300);
                });
            }

            // Check badges, stickers, and trophies
            if (typeof checkBadges === 'function') {
                const newBadges = checkBadges();
                newBadges.forEach(badge => {
                    const badgeColor = BADGE_TIERS[badge.tier] ? BADGE_TIERS[badge.tier].color : '#FFD700';
                    setTimeout(() => {
                        showToast(`${badge.icon} Badge: ${badge.name}!`, badgeColor);
                        queueRewardCard('badge', badge, badgeColor);
                    }, 500);
                    // Personality reaction to earning this badge
                    if (typeof getMilestoneReaction === 'function') {
                        const reaction = getMilestoneReaction(badge.id, pet.personality, pet.name);
                        if (reaction) {
                            setTimeout(() => showToast(reaction, '#FFF59D'), 1500);
                        }
                    }
                });
            }
            if (typeof checkPetActionSticker === 'function') {
                const newStickers = checkPetActionSticker(action);
                newStickers.forEach(sticker => {
                    setTimeout(() => {
                        showToast(`${sticker.emoji} Sticker: ${sticker.name}!`, '#E040FB');
                        queueRewardCard('sticker', sticker, '#E040FB');
                    }, 700);
                });
            }
            if (typeof checkStickers === 'function') {
                const newStickers = checkStickers();
                newStickers.forEach(sticker => {
                    setTimeout(() => {
                        showToast(`${sticker.emoji} Sticker: ${sticker.name}!`, '#E040FB');
                        queueRewardCard('sticker', sticker, '#E040FB');
                    }, 700);
                });
            }
            if (typeof checkTrophies === 'function') {
                const newTrophies = checkTrophies();
                newTrophies.forEach(trophy => {
                    setTimeout(() => {
                        showToast(`${trophy.icon} Trophy: ${trophy.name}!`, '#FFD700');
                        queueRewardCard('trophy', trophy, '#FFD700');
                    }, 900);
                    // Personality reaction to earning this trophy
                    if (typeof getMilestoneReaction === 'function') {
                        const reaction = getMilestoneReaction(trophy.id, pet.personality, pet.name);
                        if (reaction) {
                            setTimeout(() => showToast(reaction, '#FFF59D'), 1800);
                        }
                    }
                });
            }

            // Check for memory moments at growth milestones
            if (typeof checkAndShowMemoryMoment === 'function') checkAndShowMemoryMoment(pet);

            // Check for growth stage transition (uses checkGrowthMilestone which
            // handles lastGrowthStage tracking, birthday celebrations, and adultsRaised)
            if (checkGrowthMilestone(pet)) {
                // Growth happened — checkGrowthMilestone already saves internally.
                // Defer re-render so celebration modal is not disrupted.
                saveGame();
                setTimeout(() => renderPetPhase(), 100);
                return;
            }

            // Room-specific flavor text (~30% chance, supplements care feedback)
            if (typeof getRoomFlavorText === 'function') {
                const flavorRoom = (gameState && gameState.currentRoom) || 'bedroom';
                const flavorText = getRoomFlavorText(action, flavorRoom, pet.name || 'Your pet');
                if (flavorText && Math.random() < 0.30) {
                    setTimeout(() => showToast(flavorText, '#81C784'), 800);
                }
            }

            // Check for micro-event (supplementary flavor text ~12% of care actions)
            if (typeof getMicroEvent === 'function') {
                const currentRoom = (gameState && gameState.currentRoom) || 'bedroom';
                const currentSeason = (typeof getCurrentSeason === 'function') ? getCurrentSeason() : 'spring';
                const currentWeather = (gameState && gameState.weather) || 'sunny';
                const microEvent = getMicroEvent(pet, action, currentRoom, currentSeason, currentWeather);
                if (microEvent && microEvent.text) {
                    setTimeout(() => showToast(microEvent.text, '#B39DDB'), 1200);
                }
            }

            // Batch rapid care toasts into a single notification
            queueCareToast(action, petData.emoji);

            // C21: Undo toast for care actions
            (function showUndoToast() {
                const container = document.querySelector('.toast-container');
                if (!container) return;
                const undoToast = document.createElement('div');
                undoToast.className = 'toast';
                undoToast.style.setProperty('--toast-color', '#90A4AE');
                undoToast.style.animation = 'toastIn 0.24s ease-out forwards';
                undoToast.style.pointerEvents = 'auto';
                undoToast.innerHTML = `<span class="toast-text">${escapeHTML(action)} — <button class="undo-toast-btn" aria-label="Undo ${escapeHTML(action)}" style="background:none;border:1px solid #90A4AE;border-radius:6px;padding:2px 8px;font-weight:700;cursor:pointer;font-family:inherit;color:inherit;">Undo</button></span>`;
                container.appendChild(undoToast);
                const undoBtn = undoToast.querySelector('.undo-toast-btn');
                let undone = false;
                undoBtn.addEventListener('click', () => {
                    if (undone) return;
                    undone = true;
                    pet.hunger = beforeStats.hunger;
                    pet.cleanliness = beforeStats.cleanliness;
                    pet.happiness = beforeStats.happiness;
                    pet.energy = beforeStats.energy;
                    updateNeedDisplays();
                    updatePetMood();
                    updateWellnessBar();
                    saveGame();
                    undoToast.remove();
                    showToast('Action undone', '#90A4AE');
                });
                setTimeout(() => {
                    if (!undone && undoToast.parentNode) {
                        undoToast.classList.add('toast-exiting');
                        setTimeout(() => undoToast.remove(), 300);
                    }
                }, 4000);
            })();

            // Update displays
            updateNeedDisplays();
            updatePetMood();
            updateWellnessBar();
            updateGrowthDisplay();

            // Remove animation class on animationend (avoids flash from idle anim overlap)
            const actionAnimClasses = ['bounce', 'wiggle', 'sparkle', 'sleep-anim', 'heal-anim', 'groom-anim', 'exercise-anim', 'treat-anim', 'cuddle-anim', 'pet-munch-loop', 'pet-scrub-shake', 'pet-sleepy-nod', 'pet-happy-bounce'];
            actionAnimating = true;
            if (petContainer) {
                // If reduced motion is preferred, skip animation entirely
                const reducedMotion = (document.documentElement.getAttribute('data-reduced-motion') === 'true')
                    || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
                if (reducedMotion) {
                    actionAnimClasses.forEach(c => petContainer.classList.remove(c));
                    actionAnimating = false;
                } else {
                const onAnimEnd = () => {
                    petContainer.removeEventListener('animationend', onAnimEnd);
                    actionAnimClasses.forEach(c => petContainer.classList.remove(c));
                    actionAnimating = false;
                };
                petContainer.addEventListener('animationend', onAnimEnd);
                // Fallback timeout in case animationend doesn't fire (e.g., display:none)
                setTimeout(() => {
                    petContainer.removeEventListener('animationend', onAnimEnd);
                    actionAnimClasses.forEach(c => petContainer.classList.remove(c));
                    actionAnimating = false;
                }, 1200);
                }
            } else {
                actionAnimating = false;
            }

            saveGame();
        }

        // Track previous stat values for glow animation detection
        let _prevStats = { hunger: -1, cleanliness: -1, happiness: -1, energy: -1 };

        function updateNeedDisplays(silent) {
            const pet = gameState.pet;
            if (!pet) return;
            const labels = {
                hunger: 'Hunger',
                cleanliness: 'Cleanliness',
                happiness: 'Happiness',
                energy: 'Energy'
            };
            const statusForA11y = (value) => {
                if (value <= 15) return 'critical';
                if (value <= 25) return 'very low';
                if (value <= 45) return 'low';
                if (value <= 70) return 'fair';
                return 'good';
            };

            // Helper to update a bubble indicator with enhanced warning classes.
            function updateBubble(id, value, statKey) {
                const bubble = document.getElementById(id);
                if (!bubble) return;
                bubble.style.setProperty('--progress', value);
                bubble.style.setProperty('--ring-color', getNeedColor(value));
                bubble.classList.remove('low', 'warning', 'critical');
                if (value <= 15) {
                    bubble.classList.add('critical');
                } else if (value <= 25) {
                    bubble.classList.add('low', 'warning');
                } else if (value <= 45) {
                    bubble.classList.add('warning');
                }
                bubble.setAttribute('aria-valuenow', value);
                if (labels[statKey]) {
                    bubble.setAttribute('aria-valuetext', `${labels[statKey]} ${value} percent, ${statusForA11y(value)}`);
                }
                // Update status icon for colorblind accessibility
                const statusIcon = getNeedStatusIcon(value);
                let iconEl = bubble.querySelector('.need-status-icon');
                if (statusIcon) {
                    if (!iconEl) {
                        iconEl = document.createElement('span');
                        iconEl.className = 'need-status-icon';
                        iconEl.setAttribute('aria-hidden', 'true');
                        bubble.appendChild(iconEl);
                    }
                    iconEl.textContent = statusIcon;
                } else if (iconEl) {
                    iconEl.remove();
                }
                const explicitState = value <= 15 ? 'Critical' : value <= 45 ? 'Low' : '';
                let stateTextEl = bubble.querySelector('.need-state-text');
                if (explicitState) {
                    if (!stateTextEl) {
                        stateTextEl = document.createElement('span');
                        stateTextEl.className = 'need-state-text';
                        stateTextEl.setAttribute('aria-hidden', 'true');
                        bubble.appendChild(stateTextEl);
                    }
                    stateTextEl.textContent = explicitState;
                } else if (stateTextEl) {
                    stateTextEl.remove();
                }
                // Animate glow when stat increased (care action, not passive decay)
                if (!silent && statKey && _prevStats[statKey] >= 0 && value > _prevStats[statKey]) {
                    bubble.classList.remove('stat-increased');
                    void bubble.offsetWidth; // Force reflow for re-triggering
                    bubble.classList.add('stat-increased');
                    setTimeout(() => bubble.classList.remove('stat-increased'), 700);
                }
                if (statKey) _prevStats[statKey] = value;
            }

            // Update circular indicators
            updateBubble('hunger-bubble', pet.hunger, 'hunger');
            updateBubble('clean-bubble', pet.cleanliness, 'cleanliness');
            updateBubble('happy-bubble', pet.happiness, 'happiness');
            updateBubble('energy-bubble', pet.energy, 'energy');

            // Update values (with null checks for when called during mini-games)
            const hungerVal = document.getElementById('hunger-value');
            const cleanVal = document.getElementById('clean-value');
            const happyVal = document.getElementById('happy-value');
            const energyVal = document.getElementById('energy-value');
            if (hungerVal) hungerVal.textContent = `${pet.hunger}%`;
            if (cleanVal) cleanVal.textContent = `${pet.cleanliness}%`;
            if (happyVal) happyVal.textContent = `${pet.happiness}%`;
            if (energyVal) energyVal.textContent = `${pet.energy}%`;

            // Update low stat warnings on room nav
            if (typeof updateLowStatWarnings === 'function') updateLowStatWarnings();

            // Update mini needs (quick status)
            function updateMini(id, value, label) {
                const el = document.getElementById(id);
                if (!el) return;
                el.style.setProperty('--mini-color', getNeedColor(value));
                el.style.setProperty('--mini-level', value);
                el.setAttribute('aria-label', `${label} ${value}%`);
                el.setAttribute('title', `${label} ${value}%`);
            }
            updateMini('mini-hunger', pet.hunger, 'Food');
            updateMini('mini-clean', pet.cleanliness, 'Bath');
            updateMini('mini-happy', pet.happiness, 'Happy');
            updateMini('mini-energy', pet.energy, 'Energy');

            // Update needs attention dot (Feature 4)
            if (typeof updateNeedsAttentionDot === 'function') updateNeedsAttentionDot();
        }

        let _previousMood = null;

        function updatePetMood() {
            const pet = gameState.pet;
            if (!pet) return;
            const petData = getAllPetTypeData(pet.type) || PET_TYPES[pet.type];
            if (!petData) return;
            const mood = getMood(pet);

            // Announce mood transitions to screen readers
            if (_previousMood && _previousMood !== mood) {
                const moodLabels = { happy: 'happy', neutral: 'okay', sad: 'sad', sleepy: 'sleepy', energetic: 'energetic' };
                const label = moodLabels[mood] || mood;
                announce(`Your pet is now feeling ${label}.`);
            }
            _previousMood = mood;

            // Update pet SVG expression without destroying dynamically-appended children
            const petContainer = document.getElementById('pet-container');
            if (!petContainer) return;
            const existingSvg = petContainer.querySelector('svg.pet-svg');
            const newSvgHTML = generatePetSVG(pet, mood);
            if (existingSvg) {
                const temp = document.createElement('div');
                temp.innerHTML = newSvgHTML;
                const newSvg = temp.querySelector('svg');
                if (newSvg) {
                    petContainer.replaceChild(newSvg, existingSvg);
                } else {
                    petContainer.insertAdjacentHTML('afterbegin', newSvgHTML);
                }
            } else {
                petContainer.insertAdjacentHTML('afterbegin', newSvgHTML);
            }

            // Update mood face indicator
            const moodFace = document.getElementById('mood-face');
            if (moodFace) {
                const newEmoji = getMoodFaceEmoji(mood, pet);
                if (moodFace.textContent !== newEmoji) {
                    moodFace.textContent = newEmoji;
                    moodFace.setAttribute('aria-label', 'Mood: ' + mood);
                    moodFace.setAttribute('title', mood.charAt(0).toUpperCase() + mood.slice(1));
                }
            }
        }

        // Per-pet growth milestone tracker keyed by pet id
        const _growthMilestones = {};

        function _getGrowthMilestone(pet) {
            const id = pet && pet.id;
            if (id == null) return 0;
            return _growthMilestones[id] || 0;
        }

        function _setGrowthMilestone(pet, value) {
            const id = pet && pet.id;
            if (id == null) return;
            _growthMilestones[id] = value;
        }

        function updateGrowthDisplay() {
            const pet = gameState.pet;
            if (!pet) return;
            const stage = GROWTH_STAGES[pet.growthStage] ? pet.growthStage : 'baby';
            const stageData = GROWTH_STAGES[stage];
            if (!stageData) return;
            const progress = getGrowthProgress(pet.careActions || 0, getPetAge(pet), stage, pet.careQuality || 'average');
            const nextStage = getNextGrowthStage(stage);
            const isMythical = (getAllPetTypeData(pet.type) || {}).mythical;

            const compactFill = document.querySelector('.growth-compact-fill');
            if (compactFill) {
                compactFill.style.width = `${progress}%`;
            }
            const compactPct = document.querySelector('.growth-compact-pct');
            if (compactPct) {
                compactPct.textContent = `${Math.round(progress)}%`;
            }

            // Announce growth milestones for screen readers
            if (nextStage) {
                const rounded = Math.round(progress);
                const milestones = [50, 75, 99];
                const lastMilestone = _getGrowthMilestone(pet);
                for (const m of milestones) {
                    if (rounded >= m && lastMilestone < m) {
                        _setGrowthMilestone(pet, m);
                        const petName = getPetDisplayName(pet);
                        const nextLabel = GROWTH_STAGES[nextStage].label;
                        if (m === 99) {
                            announce(`${petName} is about to evolve to ${nextLabel}!`, true);
                        } else {
                            announce(`${petName} growth progress: ${m}% toward ${nextLabel}.`);
                        }
                        break;
                    }
                }
            } else {
                _setGrowthMilestone(pet, 100);
            }
        }


        // ==================== FEED MENU ====================

        function openFeedMenu() {
            const existing = document.querySelector('.feed-menu-overlay');
            if (existing) {
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }

            const gardenInv = gameState.garden && gameState.garden.inventory ? gameState.garden.inventory : {};
            const pet = gameState.pet;
            if (!pet) return;

            const overlay = document.createElement('div');
            overlay.className = 'feed-menu-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Feed your pet');

            let itemsHTML = '';

            // Standard meal option
            const rewardCareMult = (typeof getRewardCareGainMultiplier === 'function') ? getRewardCareGainMultiplier() : 1;
            const feedBonus = Math.round(17 * getRoomBonus('feed') * rewardCareMult);
            const standardEffectText = `+${feedBonus} Food${getRoomBonus('feed') > 1 ? ' (room bonus!)' : ''}`;
            itemsHTML += `
                <button class="feed-menu-item standard-meal" data-feed="standard" aria-label="Standard Meal: plus ${feedBonus} hunger">
                    <span class="feed-item-icon">🍽️</span>
                    <span class="feed-item-name">Standard Meal</span>
                    <span class="feed-item-count">Unlimited</span>
                    <span class="feed-item-effect">${standardEffectText}</span>
                </button>
            `;

            // Garden crop options
            for (const [cropId, count] of Object.entries(gardenInv)) {
                if (count <= 0) continue;
                const crop = GARDEN_CROPS[cropId];
                if (!crop) continue;

                let effectParts = [];
                if (crop.hungerValue) effectParts.push(`+${crop.hungerValue} Food`);
                if (crop.happinessValue) effectParts.push(`+${crop.happinessValue} Happy`);
                if (crop.energyValue) effectParts.push(`+${crop.energyValue} Energy`);
                const effectText = effectParts.join(', ');

                itemsHTML += `
                    <button class="feed-menu-item crop-item" data-feed-crop="${cropId}" aria-label="${crop.name}: ${effectText}. ${count} available.">
                        <span class="feed-item-icon">${crop.seedEmoji}</span>
                        <span class="feed-item-name">${crop.name}</span>
                        <span class="feed-item-count">x${count}</span>
                        <span class="feed-item-effect">${effectText}</span>
                    </button>
                `;
            }

            overlay.innerHTML = `
                <div class="feed-menu">
                    <h3 class="feed-menu-title">🍽️ Feed ${getPetDisplayName(pet)}</h3>
                    <p class="feed-menu-subtitle">Choose what to feed your pet</p>
                    <div class="feed-menu-items">${itemsHTML}</div>
                    <button class="feed-menu-close" id="feed-menu-close">Cancel</button>
                </div>
            `;

            document.body.appendChild(overlay);

            function closeMenu() {
                popModalEscape(closeMenu);
                overlay.remove();
                // Restore focus to feed button
                const feedBtn = document.getElementById('feed-btn');
                if (feedBtn) feedBtn.focus();
            }

            pushModalEscape(closeMenu);
            overlay._closeOverlay = closeMenu;

            // Focus trap for Tab key
            overlay.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    const focusable = overlay.querySelectorAll('button');
                    const first = focusable[0];
                    const last = focusable[focusable.length - 1];
                    if (e.shiftKey && document.activeElement === first) {
                        e.preventDefault();
                        last.focus();
                    } else if (!e.shiftKey && document.activeElement === last) {
                        e.preventDefault();
                        first.focus();
                    }
                }
            });

            // Standard meal
            const standardBtn = overlay.querySelector('[data-feed="standard"]');
            if (standardBtn) {
                standardBtn.addEventListener('click', () => {
                    // Re-read active pet at click time to avoid stale closure reference
                    const currentPet = gameState.pet;
                    if (!currentPet) return;
                    closeMenu();

                    // Set global action cooldown (same as careAction) so that
                    // subsequent care actions respect the 600ms cooldown window.
                    startActionCooldownWindow();

                    const msg = performStandardFeed(currentPet);
                    showToast(`${(getAllPetTypeData(currentPet.type) || {}).emoji || '🐾'} ${msg}`, TOAST_COLORS.feed);
                    const petContainer = document.getElementById('pet-container');
                    if (petContainer) {
                        const onEnd = () => { petContainer.removeEventListener('animationend', onEnd); petContainer.classList.remove('bounce', 'pet-munch-loop'); };
                        petContainer.addEventListener('animationend', onEnd);
                        setTimeout(() => { petContainer.removeEventListener('animationend', onEnd); petContainer.classList.remove('bounce', 'pet-munch-loop'); }, 1200);
                    }
                    if (typeof currentPet.careActions !== 'number') currentPet.careActions = 0;
                    currentPet.careActions++;
                    if (typeof syncProgressiveOnboardingMilestones === 'function') {
                        syncProgressiveOnboardingMilestones({ firstCareAction: true });
                    }
                    markCoachChecklistProgress('feed');

                    // Play pet voice sound
                    if (typeof GameAudio !== 'undefined') {
                        GameAudio.playSFXByName('petHappy', (ctx) => GameAudio.sfx.petHappy(ctx, currentPet.type));
                    }

                    // Track daily checklist progress
                    if (typeof incrementDailyProgress === 'function') {
                        const dailyCompleted = [];
                        dailyCompleted.push(...incrementDailyProgress('feedCount'));
                        dailyCompleted.push(...incrementDailyProgress('totalCareActions'));
                        dailyCompleted.push(...incrementDailyProgress('masteryPoints', 1));
                        dailyCompleted.forEach(task => showToast(`${task.icon} Daily task done: ${task.name}!`, '#FFD700'));
                    }
                    if (typeof consumeCareActionRewardModifiers === 'function') consumeCareActionRewardModifiers();

                    // Check achievements
                    if (typeof checkAchievements === 'function') {
                        const newAch = checkAchievements();
                        newAch.forEach(ach => {
                            if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.achievement);
                            setTimeout(() => {
                                showToast(`${ach.icon} Achievement: ${ach.name}!`, '#FFD700');
                                queueRewardCard('achievement', ach, '#FFD700');
                            }, 300);
                        });
                    }
                    // Check badges, stickers, trophies
                    if (typeof checkBadges === 'function') {
                        const newBadges = checkBadges();
                        newBadges.forEach(badge => {
                            const badgeColor = BADGE_TIERS[badge.tier] ? BADGE_TIERS[badge.tier].color : '#FFD700';
                            setTimeout(() => {
                                showToast(`${badge.icon} Badge: ${badge.name}!`, badgeColor);
                                queueRewardCard('badge', badge, badgeColor);
                            }, 600);
                        });
                    }
                    if (typeof checkStickers === 'function') {
                        const newStickers = checkStickers();
                        newStickers.forEach(sticker => {
                            setTimeout(() => {
                                showToast(`${sticker.emoji} Sticker: ${sticker.name}!`, '#E040FB');
                                queueRewardCard('sticker', sticker, '#E040FB');
                            }, 700);
                        });
                    }
                    if (typeof checkPetActionSticker === 'function') {
                        const actionStickers = checkPetActionSticker('feed');
                        actionStickers.forEach(sticker => {
                            setTimeout(() => {
                                showToast(`${sticker.emoji} Sticker: ${sticker.name}!`, '#E040FB');
                                queueRewardCard('sticker', sticker, '#E040FB');
                            }, 800);
                        });
                    }
                    if (typeof checkTrophies === 'function') {
                        const newTrophies = checkTrophies();
                        newTrophies.forEach(trophy => {
                            setTimeout(() => {
                                showToast(`${trophy.icon} Trophy: ${trophy.name}!`, '#FFD700');
                                queueRewardCard('trophy', trophy, '#FFD700');
                            }, 900);
                        });
                    }

                    // Check for growth stage transition
                    if (checkGrowthMilestone(currentPet)) {
                        saveGame();
                        renderPetPhase();
                        return;
                    }

                    updateNeedDisplays();
                    updatePetMood();
                    updateWellnessBar();
                    updateGrowthDisplay();
                    saveGame();
                });
            }

            // Garden crops
            overlay.querySelectorAll('[data-feed-crop]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const cropId = btn.getAttribute('data-feed-crop');
                    closeMenu();
                    const fed = feedFromGarden(cropId);
                    if (fed) {
                        if (typeof syncProgressiveOnboardingMilestones === 'function') {
                            syncProgressiveOnboardingMilestones({ firstCareAction: true });
                        }
                        markCoachChecklistProgress('feed');
                    }
                });
            });

            const closeBtn = overlay.querySelector('#feed-menu-close');
            if (closeBtn) closeBtn.addEventListener('click', closeMenu);
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeMenu();
            });

            // Focus first item
            const firstItem = overlay.querySelector('.feed-menu-item');
            if (firstItem) firstItem.focus();
        }


        // ==================== MINI-GAME CLEANUP ====================

        function cleanupAllMiniGames() {
            if (typeof fetchState !== 'undefined' && fetchState && typeof endFetchGame === 'function') endFetchGame();
            if (typeof hideSeekState !== 'undefined' && hideSeekState && typeof endHideSeekGame === 'function') endHideSeekGame();
            if (typeof bubblePopState !== 'undefined' && bubblePopState && typeof endBubblePopGame === 'function') endBubblePopGame();
            if (typeof matchingState !== 'undefined' && matchingState && typeof endMatchingGame === 'function') endMatchingGame();
            if (typeof simonState !== 'undefined' && simonState && typeof endSimonSaysGame === 'function') endSimonSaysGame();
            if (typeof coloringState !== 'undefined' && coloringState && typeof endColoringGame === 'function') endColoringGame();
            // Stop idle animations and earcons during mini-games
            if (typeof stopIdleAnimations === 'function') stopIdleAnimations();
        }

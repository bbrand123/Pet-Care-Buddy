        // ==================== MINI GAMES ====================

        // R8: Difficulty tiers — session variable (not persisted)
        var _minigameDifficulty = 'normal';
        var _DIFFICULTY_CONFIG = {
            easy:   { label: 'Easy',   coinMult: 0.8,  icon: '\uD83C\uDF31' },
            normal: { label: 'Normal', coinMult: 1.0,  icon: '\u2B50' },
            hard:   { label: 'Hard',   coinMult: 1.3,  icon: '\uD83D\uDD25' }
        };

        // R8: Show difficulty selection modal, call onConfirm() when a tier is chosen
        function showDifficultySelector(gameId, onConfirm) {
            var _dsExisting = document.querySelector('.mg-difficulty-overlay');
            if (_dsExisting) _dsExisting.remove();

            // Fix 4: Gate Hard mode behind Child growth stage
            var _hardLocked = (typeof gameState !== 'undefined' && gameState && gameState.pet && gameState.pet.growthStage === 'baby');
            var _hardBtn = _hardLocked
                ? '<button class="mg-diff-btn mg-diff-btn--locked" data-diff="hard" type="button" disabled aria-label="Hard — locked until Child stage" aria-disabled="true">' +
                    '<span class="mg-diff-icon" aria-hidden="true">\uD83D\uDD25</span>' +
                    '<span class="mg-diff-label">Hard</span>' +
                    '<span class="mg-diff-mult">\uD83D\uDD12 Unlock at Child stage</span>' +
                  '</button>'
                : '<button class="mg-diff-btn" data-diff="hard" type="button" aria-label="Hard — 1.3x coins">' +
                    '<span class="mg-diff-icon" aria-hidden="true">\uD83D\uDD25</span>' +
                    '<span class="mg-diff-label">Hard</span>' +
                    '<span class="mg-diff-mult">\u00D71.3 coins</span>' +
                  '</button>';

            var _dsOverlay = document.createElement('div');
            _dsOverlay.className = 'mg-difficulty-overlay';
            _dsOverlay.setAttribute('role', 'dialog');
            _dsOverlay.setAttribute('aria-modal', 'true');
            _dsOverlay.setAttribute('aria-label', 'Select difficulty');

            _dsOverlay.innerHTML = '<div class="mg-difficulty-card">' +
                '<h3 class="mg-difficulty-title">Select Difficulty</h3>' +
                '<div class="mg-difficulty-btns">' +
                  '<button class="mg-diff-btn" data-diff="easy" type="button" aria-label="Easy — 0.8x coins">' +
                    '<span class="mg-diff-icon" aria-hidden="true">\uD83C\uDF31</span>' +
                    '<span class="mg-diff-label">Easy</span>' +
                    '<span class="mg-diff-mult">\u00D70.8 coins</span>' +
                  '</button>' +
                  '<button class="mg-diff-btn mg-diff-btn--selected" data-diff="normal" type="button" aria-label="Normal — 1.0x coins" aria-pressed="true">' +
                    '<span class="mg-diff-icon" aria-hidden="true">\u2B50</span>' +
                    '<span class="mg-diff-label">Normal</span>' +
                    '<span class="mg-diff-mult">\u00D71.0 coins</span>' +
                  '</button>' +
                  _hardBtn +
                '</div>' +
                '<button class="mg-difficulty-cancel" type="button">Cancel</button>' +
                '</div>';

            function _dsClose() {
                if (typeof popModalEscape === 'function') popModalEscape(_dsClose);
                if (_dsOverlay.parentNode) _dsOverlay.remove();
            }

            // Highlight the last-used difficulty
            _dsOverlay.querySelectorAll('.mg-diff-btn:not([disabled])').forEach(function(btn) {
                var d = btn.getAttribute('data-diff');
                if (d === _minigameDifficulty) {
                    btn.classList.add('mg-diff-btn--selected');
                    btn.setAttribute('aria-pressed', 'true');
                } else {
                    btn.classList.remove('mg-diff-btn--selected');
                    btn.removeAttribute('aria-pressed');
                }
                btn.addEventListener('click', function() {
                    _minigameDifficulty = btn.getAttribute('data-diff') || 'normal';
                    _dsClose();
                    if (typeof onConfirm === 'function') onConfirm();
                });
            });

            _dsOverlay.querySelector('.mg-difficulty-cancel').addEventListener('click', _dsClose);
            _dsOverlay.addEventListener('click', function(e) { if (e.target === _dsOverlay) _dsClose(); });

            document.body.appendChild(_dsOverlay);
            if (typeof pushModalEscape === 'function') pushModalEscape(_dsClose);
            if (typeof trapFocus === 'function') trapFocus(_dsOverlay);
            // Focus the currently selected difficulty button
            var _dsSelectedBtn = _dsOverlay.querySelector('.mg-diff-btn--selected') || _dsOverlay.querySelector('.mg-diff-btn');
            if (_dsSelectedBtn) _dsSelectedBtn.focus();
        }

        // Fisher-Yates shuffle for unbiased randomization
        function shuffleArray(arr) {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        }

        function getMiniGameContentSelection(scope, key, pool, options) {
            const items = Array.isArray(pool) ? pool.filter(Boolean) : [];
            if (items.length === 0) return null;
            if (typeof chooseRotatingContentWithHistory === 'function') {
                return chooseRotatingContentWithHistory(items, Object.assign({
                    scope: `minigame:${scope || 'shared'}`,
                    key: key || 'default',
                    recentWindow: 4,
                    idKey: 'id',
                    state: gameState
                }, options || {}));
            }
            return items[Math.floor(Math.random() * items.length)];
        }

        function getMinigameRuleModifier(gameId) {
            if (typeof getDeterministicRuleModifier !== 'function') return null;
            return getDeterministicRuleModifier(gameId, 'minigameRule', 'minigames');
        }

        function getPackedTriviaPool(baseQuestions) {
            if (typeof getPackTriviaQuestions === 'function') return getPackTriviaQuestions(baseQuestions);
            return Array.isArray(baseQuestions) ? baseQuestions.slice() : [];
        }

        function getPackedMatchingDeckPool(baseItems) {
            if (typeof getPackMatchingDecks === 'function') return getPackMatchingDecks(baseItems);
            return [{ id: 'base_matching', theme: 'Classic', pairs: Array.isArray(baseItems) ? baseItems.slice() : [] }];
        }

        function getPackedCookingCatalog(baseIngredients) {
            if (typeof getPackCookingRecipes === 'function') return getPackCookingRecipes(baseIngredients);
            return {
                ingredients: Array.isArray(baseIngredients) ? baseIngredients.slice() : [],
                recipes: []
            };
        }

        function getPackedFishingCatchPool() {
            if (typeof getPackFishingCatches === 'function') return getPackFishingCatches();
            return [];
        }

        function getPackedColoringTemplatePool() {
            if (typeof getPackColoringTemplates === 'function') return getPackColoringTemplates();
            return [];
        }

        function getPackedTournamentRivalNames(baseNames) {
            if (typeof getPackTournamentRivals === 'function') return getPackTournamentRivals(baseNames);
            return Array.isArray(baseNames) ? baseNames.slice() : [];
        }

        function miniGameTouchMode() {
            try {
                if (typeof isMobileTouchUiActive === 'function') return !!isMobileTouchUiActive();
            } catch (e) {}
            try {
                return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches && window.innerWidth <= 900);
            } catch (e) {
                return false;
            }
        }

        // SVG thumbnail previews for mini-game menu cards
	        const MINI_GAME_THUMBNAILS = {
            fetch: '<svg viewBox="0 0 40 40" class="minigame-thumb" aria-hidden="true"><circle cx="20" cy="16" r="9" fill="#8BC34A" stroke="#558B2F" stroke-width="1.5"/><path d="M14 16h12M20 10v12" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/><path d="M20 28q-3 4 0 6q3-2 0-6" fill="#A5D6A7" opacity="0.6"/></svg>',
            hideseek: '<svg viewBox="0 0 40 40" class="minigame-thumb" aria-hidden="true"><rect x="5" y="18" width="30" height="18" rx="4" fill="#8D6E63"/><circle cx="15" cy="14" r="7" fill="#FFCC80" stroke="#F57C00" stroke-width="1.5"/><circle cx="12" cy="13" r="1.5" fill="#5D4037"/><circle cx="18" cy="13" r="1.5" fill="#5D4037"/></svg>',
            bubblepop: '<svg viewBox="0 0 40 40" class="minigame-thumb" aria-hidden="true"><circle cx="13" cy="15" r="7" fill="none" stroke="#64B5F6" stroke-width="1.5" opacity="0.8"/><circle cx="27" cy="12" r="5" fill="none" stroke="#90CAF9" stroke-width="1.5" opacity="0.7"/><circle cx="20" cy="28" r="6" fill="none" stroke="#42A5F5" stroke-width="1.5" opacity="0.9"/><circle cx="10" cy="14" r="2" fill="#fff" opacity="0.5"/></svg>',
            matching: '<svg viewBox="0 0 40 40" class="minigame-thumb" aria-hidden="true"><rect x="4" y="6" width="14" height="18" rx="2" fill="#E1BEE7" stroke="#9C27B0" stroke-width="1"/><rect x="22" y="6" width="14" height="18" rx="2" fill="#E1BEE7" stroke="#9C27B0" stroke-width="1"/><text x="11" y="18" text-anchor="middle" font-size="10">⭐</text><text x="29" y="18" text-anchor="middle" font-size="10">⭐</text><path d="M11 28h18" stroke="#CE93D8" stroke-width="1.5" stroke-dasharray="2 2"/></svg>',
            simonsays: '<svg viewBox="0 0 40 40" class="minigame-thumb" aria-hidden="true"><rect x="3" y="3" width="15" height="15" rx="3" fill="#EF5350"/><rect x="22" y="3" width="15" height="15" rx="3" fill="#42A5F5"/><rect x="3" y="22" width="15" height="15" rx="3" fill="#66BB6A"/><rect x="22" y="22" width="15" height="15" rx="3" fill="#FDD835"/></svg>',
            coloring: '<svg viewBox="0 0 40 40" class="minigame-thumb" aria-hidden="true"><circle cx="12" cy="12" r="5" fill="#F44336"/><circle cx="28" cy="12" r="5" fill="#2196F3"/><circle cx="20" cy="26" r="5" fill="#FFEB3B"/><circle cx="20" cy="18" r="3" fill="#4CAF50" opacity="0.7"/></svg>',
            racing: '<svg viewBox="0 0 40 40" class="minigame-thumb" aria-hidden="true"><rect x="4" y="10" width="32" height="20" rx="3" fill="#E0E0E0" stroke="#9E9E9E" stroke-width="1"/><line x1="20" y1="10" x2="20" y2="30" stroke="#fff" stroke-width="2" stroke-dasharray="3 3"/><circle cx="12" cy="20" r="4" fill="#F44336"/><circle cx="28" cy="20" r="4" fill="#2196F3"/></svg>',
            cooking: '<svg viewBox="0 0 40 40" class="minigame-thumb" aria-hidden="true"><ellipse cx="20" cy="28" rx="14" ry="8" fill="#795548"/><rect x="8" y="16" width="24" height="14" rx="2" fill="#8D6E63"/><path d="M14 14q0-6 6-6q6 0 6 6" fill="none" stroke="#BCAAA4" stroke-width="2"/><path d="M16 12q-2-4 0-4M20 10q-1-4 1-4M24 12q2-4 0-4" stroke="#B0BEC5" stroke-width="1" fill="none" opacity="0.6"/></svg>',
            fishing: '<svg viewBox="0 0 40 40" class="minigame-thumb" aria-hidden="true"><rect x="2" y="24" width="36" height="14" rx="2" fill="#64B5F6" opacity="0.4"/><path d="M30 4v20" stroke="#795548" stroke-width="1.5"/><path d="M30 4l-4 2" stroke="#795548" stroke-width="1.5"/><path d="M26 6q-4 8-6 18" stroke="#90A4AE" stroke-width="0.8" fill="none"/><ellipse cx="18" cy="30" rx="5" ry="3" fill="#FF8A65"/><circle cx="16" cy="29" r="1" fill="#333"/></svg>',
            rhythm: '<svg viewBox="0 0 40 40" class="minigame-thumb" aria-hidden="true"><circle cx="12" cy="28" r="5" fill="#333"/><line x1="17" y1="28" x2="17" y2="8" stroke="#333" stroke-width="2"/><path d="M17 8q6-2 6 2v4q-6 2-6-2" fill="#333"/><circle cx="28" cy="22" r="4" fill="#333"/><line x1="32" y1="22" x2="32" y2="6" stroke="#333" stroke-width="2"/><path d="M32 6q5-2 5 2v3q-5 2-5-2" fill="#333"/></svg>',
            slider: '<svg viewBox="0 0 40 40" class="minigame-thumb" aria-hidden="true"><rect x="4" y="4" width="10" height="10" rx="1" fill="#BBDEFB"/><rect x="15" y="4" width="10" height="10" rx="1" fill="#C8E6C9"/><rect x="26" y="4" width="10" height="10" rx="1" fill="#FFE0B2"/><rect x="4" y="15" width="10" height="10" rx="1" fill="#F8BBD0"/><rect x="15" y="15" width="10" height="10" rx="1" fill="#E0E0E0" stroke="#BDBDBD" stroke-width="0.5" stroke-dasharray="2 1"/><rect x="26" y="15" width="10" height="10" rx="1" fill="#D1C4E9"/><rect x="4" y="26" width="10" height="10" rx="1" fill="#FFCCBC"/><rect x="15" y="26" width="10" height="10" rx="1" fill="#B2EBF2"/><rect x="26" y="26" width="10" height="10" rx="1" fill="#DCEDC8"/></svg>',
            trivia: '<svg viewBox="0 0 40 40" class="minigame-thumb" aria-hidden="true"><circle cx="20" cy="18" r="12" fill="#FFF9C4" stroke="#F9A825" stroke-width="1.5"/><path d="M17 14q0-4 3-4t3 4q0 2-3 4v2h0" stroke="#F57F17" stroke-width="1.5" fill="none" stroke-linecap="round"/><circle cx="20" cy="24" r="1" fill="#F57F17"/><rect x="16" y="32" width="8" height="3" rx="1" fill="#F9A825"/></svg>',
            runner: '<svg viewBox="0 0 40 40" class="minigame-thumb" aria-hidden="true"><circle cx="20" cy="8" r="4" fill="#FFAB91"/><path d="M20 12v10M16 16l4 4 4-4M16 28l4-6 4 6" stroke="#FF7043" stroke-width="2" fill="none" stroke-linecap="round"/><line x1="2" y1="34" x2="38" y2="34" stroke="#A5D6A7" stroke-width="2"/></svg>',
            tournament: '<svg viewBox="0 0 40 40" class="minigame-thumb" aria-hidden="true"><path d="M14 10h12l-2 14h-8z" fill="#FFD54F" stroke="#F9A825" stroke-width="1"/><path d="M14 10q-6 0-4 6t4 2" fill="none" stroke="#F9A825" stroke-width="1.5"/><path d="M26 10q6 0 4 6t-4 2" fill="none" stroke="#F9A825" stroke-width="1.5"/><rect x="16" y="24" width="8" height="3" rx="1" fill="#F9A825"/><rect x="13" y="27" width="14" height="3" rx="1" fill="#FFE082"/><text x="20" y="20" text-anchor="middle" font-size="8" fill="#F57F17">1</text></svg>',
	            coop: '<svg viewBox="0 0 40 40" class="minigame-thumb" aria-hidden="true"><circle cx="13" cy="14" r="6" fill="#FFCCBC"/><circle cx="27" cy="14" r="6" fill="#B2DFDB"/><path d="M13 20v8M10 24h6" stroke="#FF8A65" stroke-width="2" stroke-linecap="round"/><path d="M27 20v8M24 24h6" stroke="#4DB6AC" stroke-width="2" stroke-linecap="round"/><path d="M17 18q3 4 6 0" stroke="#BDBDBD" stroke-width="1" fill="none"/></svg>'
	        };

            const MINIGAME_CARD_ART = Object.freeze({
                fetch: { badge: 'Speed', mood: 'Skill', c1: '#FCE38A', c2: '#F38181', pattern: 'ball' },
                hideseek: { badge: 'Focus', mood: 'Memory', c1: '#C7CEEA', c2: '#8EC5FC', pattern: 'mask' },
                bubblepop: { badge: 'Tap', mood: 'Speed', c1: '#89F7FE', c2: '#66A6FF', pattern: 'bubbles' },
                matching: { badge: 'Memory', mood: 'Skill', c1: '#E3D5FF', c2: '#CDB4DB', pattern: 'tiles' },
                simonsays: { badge: 'Rhythm', mood: 'Memory', c1: '#F6D365', c2: '#FDA085', pattern: 'pads' },
                coloring: { badge: 'Calm', mood: 'Creative', c1: '#A1FFCE', c2: '#FAFFD1', pattern: 'dots' },
                racing: { badge: 'Speed', mood: 'Reflex', c1: '#DCE35B', c2: '#45B649', pattern: 'track' },
                cooking: { badge: 'Timing', mood: 'Skill', c1: '#FFD3A5', c2: '#FD6585', pattern: 'steam' },
                fishing: { badge: 'Patience', mood: 'Timing', c1: '#9CECFB', c2: '#65C7F7', pattern: 'waves' },
                rhythm: { badge: 'Rhythm', mood: 'Speed', c1: '#FBD786', c2: '#C6FFDD', pattern: 'beats' },
                slider: { badge: 'Logic', mood: 'Puzzle', c1: '#FBC2EB', c2: '#A6C1EE', pattern: 'grid' },
                trivia: { badge: 'Brain', mood: 'Quiz', c1: '#FFF1A6', c2: '#FFB88C', pattern: 'spark' },
                runner: { badge: 'Speed', mood: 'Reflex', c1: '#84FAB0', c2: '#8FD3F4', pattern: 'lane' },
                tournament: { badge: 'Skill', mood: 'Challenge', c1: '#F6D365', c2: '#FDA085', pattern: 'laurel' },
                coop: { badge: 'Team', mood: 'Coordination', c1: '#C2FFD8', c2: '#7DE2FC', pattern: 'hearts' }
            });

            function getMiniGameCardArt(gameId) {
                return MINIGAME_CARD_ART[gameId] || { badge: 'Play', mood: 'Fun', c1: '#DDE8FF', c2: '#BBD1FF', pattern: 'dots' };
            }

        function getMiniGameDescriptors() {
            if (typeof MiniGameRegistry !== 'undefined' && MiniGameRegistry && typeof MiniGameRegistry.getAll === 'function') {
                const items = MiniGameRegistry.getAll();
                if (items.length > 0) return items;
            }
            if (typeof console !== 'undefined' && console.warn) {
                console.warn('[Minigames] MiniGameRegistry is empty; menu metadata is unavailable.');
            }
            return [];
        }

        // P1-11: Do NOT cache the descriptor list at module-load time.
        // MiniGameRegistry may not yet be populated when this file is evaluated.
        // Call getMiniGameDescriptors() lazily at each use site instead.

        // Feature 5: Personality → preferred mini-game IDs (1–3 per type)
        const PERSONALITY_GAME_PREFS = {
            playful:   ['fetch', 'bubblepop', 'racing'],
            lazy:      ['coloring', 'fishing', 'matching'],
            curious:   ['trivia', 'simonsays', 'slider'],
            shy:       ['hideseek', 'coloring', 'fishing'],
            energetic: ['racing', 'runner', 'rhythm'],
            grumpy:    ['hideseek', 'trivia', 'cooking']
        };

        // ==================== CELEBRATION EFFECTS ====================

        // Spawn confetti particles for minigame wins
        function showMinigameConfetti() {
            if (document.documentElement.getAttribute('data-reduced-motion') === 'true') return;
            const container = document.createElement('div');
            container.className = 'minigame-celebration';
            container.setAttribute('aria-hidden', 'true');
            document.body.appendChild(container);

            const colors = ['#FF4444', '#FFD700', '#4CAF50', '#2196F3', '#FF69B4', '#FF9800', '#9C27B0'];
            for (let i = 0; i < 30; i++) {
                const piece = document.createElement('div');
                piece.className = 'confetti-piece';
                piece.style.left = (Math.random() * 100) + '%';
                piece.style.top = '-10px';
                piece.style.background = colors[Math.floor(Math.random() * colors.length)];
                piece.style.animationDelay = (Math.random() * 0.8) + 's';
                piece.style.animationDuration = (1.5 + Math.random() * 1) + 's';
                piece.style.width = (6 + Math.random() * 6) + 'px';
                piece.style.height = (6 + Math.random() * 6) + 'px';
                piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
                container.appendChild(piece);
            }
            setTimeout(() => container.remove(), 3000);
        }

        // Show "New High Score!" banner
        function showHighScoreBanner(gameName, score) {
            if (document.documentElement.getAttribute('data-reduced-motion') === 'true') return;
            const banner = document.createElement('div');
            banner.className = 'new-highscore-banner';
            banner.setAttribute('aria-hidden', 'true');
            banner.textContent = `New High Score! ${gameName}: ${score}`;
            document.body.appendChild(banner);
            if (typeof hapticPattern === 'function') hapticPattern('highscore');
            setTimeout(() => banner.remove(), 2500);
        }

        // Feature 4: Track last mini-game result for reaction beat
        let _lastMgWon = false;

        // Feature 4: Show a 1.5s pet reaction beat before restoring post-game state
        function showMinigameReactionBeat(won, callback) {
            const reducedMotion = document.documentElement.getAttribute('data-reduced-motion') === 'true' ||
                (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
            if (reducedMotion) { if (callback) callback(); return; }

            const petArea = document.querySelector('.pet-area');
            if (!petArea) { if (callback) callback(); return; }

            const reactionOverlay = document.createElement('div');
            reactionOverlay.className = 'minigame-reaction-overlay';
            reactionOverlay.setAttribute('aria-hidden', 'true');

            let petEmoji = '🐾';
            if (typeof gameState !== 'undefined' && gameState && gameState.pet) {
                const pt = (typeof PET_TYPES !== 'undefined') ? PET_TYPES[gameState.pet.type] : null;
                if (pt && pt.emoji) petEmoji = pt.emoji;
            }

            const reactionClass = won ? 'reaction-win' : 'reaction-lose';
            const labelEl = document.createElement('div');
            labelEl.style.cssText = 'position:absolute;bottom:30%;left:50%;transform:translateX(-50%);font-size:1.1rem;font-weight:800;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,0.5);opacity:0;transition:opacity 0.3s ease;white-space:nowrap;';
            labelEl.textContent = won ? '🎉 Great game!' : '😊 Good try!';

            const petEl = document.createElement('div');
            petEl.className = `minigame-reaction-pet ${reactionClass}`;
            petEl.style.cssText = 'position:absolute;bottom:35%;left:50%;transform:translateX(-50%);';
            petEl.textContent = petEmoji;

            reactionOverlay.appendChild(petEl);
            reactionOverlay.appendChild(labelEl);
            document.body.appendChild(reactionOverlay);

            // Show label with slight delay
            setTimeout(() => { labelEl.style.opacity = '1'; }, 400);

            setTimeout(() => {
                reactionOverlay.style.transition = 'opacity 0.25s ease';
                reactionOverlay.style.opacity = '0';
                setTimeout(() => {
                    reactionOverlay.remove();
                    if (callback) callback();
                }, 260);
            }, 1500);
        }

        // Restore idle animations and room earcons after a mini-game ends
        function restorePostMiniGameState() {
            if (gameState.phase === 'pet') {
                if (typeof startIdleAnimations === 'function') {
                    startIdleAnimations();
                }
                if (typeof GameAudio !== 'undefined' && gameState.currentRoom) {
                    GameAudio.enterRoom(gameState.currentRoom);
                }
                // Return focus to the mini-games button so keyboard/screen reader
                // users don't lose their place after a game ends
                const minigamesBtn = document.getElementById('minigames-btn');
                if (minigamesBtn) {
                    minigamesBtn.focus();
                }
            }
        }

        let _activeMiniGameExitClose = null;
        function dismissMiniGameExitDialog() {
            if (typeof _activeMiniGameExitClose === 'function') {
                _activeMiniGameExitClose();
            }
        }

        function ensureMiniGameRuntimeTracker(state) {
            if (!state || typeof state !== 'object') return null;
            if (!state._runtimeTracker || typeof state._runtimeTracker !== 'object') {
                state._runtimeTracker = {
                    intervals: new Set(),
                    timeouts: new Set(),
                    listeners: [],
                    overlay: null,
                    overlaySelector: '',
                    escapeHandler: null,
                    audioStops: []
                };
            }
            return state._runtimeTracker;
        }

        function initMiniGameRuntimeTracking(state, config) {
            const tracker = ensureMiniGameRuntimeTracker(state);
            if (!tracker) return state;
            const cfg = (config && typeof config === 'object') ? config : {};
            tracker.overlaySelector = typeof cfg.overlaySelector === 'string' ? cfg.overlaySelector : (tracker.overlaySelector || '');
            return state;
        }

        function trackMiniGameOverlay(state, overlay) {
            const tracker = ensureMiniGameRuntimeTracker(state);
            if (tracker) tracker.overlay = overlay || null;
            return overlay;
        }

        function bindMiniGameEvent(state, target, type, handler, options) {
            if (!target || typeof target.addEventListener !== 'function' || typeof handler !== 'function') return handler;
            const tracker = ensureMiniGameRuntimeTracker(state);
            target.addEventListener(type, handler, options);
            if (tracker) tracker.listeners.push({ target, type, handler, options });
            return handler;
        }

        function trackMiniGameInterval(state, fn, ms) {
            const id = setInterval(fn, ms);
            const tracker = ensureMiniGameRuntimeTracker(state);
            if (tracker) tracker.intervals.add(id);
            return id;
        }

        function trackMiniGameTimeout(state, fn, ms) {
            const id = setTimeout(fn, ms);
            const tracker = ensureMiniGameRuntimeTracker(state);
            if (tracker) tracker.timeouts.add(id);
            return id;
        }

        function registerMiniGameEscapeHandler(state, closeHandler) {
            if (typeof closeHandler !== 'function') return null;
            if (typeof pushModalEscape === 'function') pushModalEscape(closeHandler);
            const tracker = ensureMiniGameRuntimeTracker(state);
            if (tracker) tracker.escapeHandler = closeHandler;
            state._escapeHandler = closeHandler;
            return closeHandler;
        }

        function registerMiniGameAudioStop(state, stopFn) {
            if (typeof stopFn !== 'function') return;
            const tracker = ensureMiniGameRuntimeTracker(state);
            if (tracker) tracker.audioStops.push(stopFn);
        }

        function teardownMiniGameRuntime(state, options) {
            const opts = (options && typeof options === 'object') ? options : {};
            if (opts.dismissExitDialog !== false) dismissMiniGameExitDialog();
            if (!state || typeof state !== 'object') return;
            const tracker = ensureMiniGameRuntimeTracker(state);

            if (tracker) {
                tracker.intervals.forEach((id) => clearInterval(id));
                tracker.intervals.clear();
                tracker.timeouts.forEach((id) => clearTimeout(id));
                tracker.timeouts.clear();
                while (tracker.listeners.length > 0) {
                    const rec = tracker.listeners.pop();
                    if (!rec || !rec.target || typeof rec.target.removeEventListener !== 'function') continue;
                    try { rec.target.removeEventListener(rec.type, rec.handler, rec.options); } catch (e) {}
                }
                const _escHandler = tracker.escapeHandler || (state && state._escapeHandler) || null;
                tracker.escapeHandler = null;
                if (state) state._escapeHandler = null;
                if (_escHandler && typeof popModalEscape === 'function') popModalEscape(_escHandler);
                while (tracker.audioStops.length > 0) {
                    const stopFn = tracker.audioStops.pop();
                    try { stopFn(); } catch (e) {}
                }
            }

            if (state.timerId) {
                clearInterval(state.timerId);
                state.timerId = null;
            }
            if (state.timeoutId) {
                clearTimeout(state.timeoutId);
                state.timeoutId = null;
            }
            // _escapeHandler already cleared above in tracker block

            let overlay = tracker && tracker.overlay && tracker.overlay.isConnected ? tracker.overlay : null;
            if (!overlay) {
                const selector = (tracker && tracker.overlaySelector) || opts.overlaySelector;
                if (selector && typeof document !== 'undefined' && document.querySelector) {
                    overlay = document.querySelector(selector);
                }
            }
            if (overlay && overlay.parentNode) {
                overlay.innerHTML = '';
                overlay.remove();
            }
            if (tracker) tracker.overlay = null;
        }

        function getMiniGameRuntimeTrackingSnapshot(state) {
            if (!state || typeof state !== 'object') return null;
            const tracker = ensureMiniGameRuntimeTracker(state);
            if (!tracker) return null;
            return {
                intervals: tracker.intervals.size,
                timeouts: tracker.timeouts.size,
                listeners: tracker.listeners.length,
                hasEscapeHandler: !!tracker.escapeHandler,
                hasOverlay: !!(tracker.overlay && tracker.overlay.isConnected)
            };
        }

        // Confirm exit when the player has made progress to prevent accidental loss
        function requestMiniGameExit(score, onConfirm, options = {}) {
            if (options && typeof options.canExit === 'function' && !options.canExit()) {
                if (typeof showToast === 'function') {
                    showToast(options.busyMessage || 'Please wait for the current action to finish.', '#FFA726', { announce: false });
                }
                return;
            }
            let latestScore = score;
            if (options && typeof options.resolveScore === 'function') {
                try {
                    const resolved = options.resolveScore();
                    if (typeof resolved === 'number' && Number.isFinite(resolved)) latestScore = resolved;
                } catch (e) {}
            }
            if (latestScore <= 0) {
                dismissMiniGameExitDialog();
                onConfirm();
                return;
            }
            dismissMiniGameExitDialog();
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.style.zIndex = 'var(--z-overlay-alert)';
            overlay.setAttribute('role', 'alertdialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Quit game?');
            overlay.innerHTML = `
                <div class="modal-content" style="max-width:280px;text-align:center;">
                    <p style="margin-bottom:16px;font-weight:600;">Quit this game?</p>
                    <p style="margin-bottom:16px;font-size:0.9rem;color:var(--color-text-secondary);">Your current ${options.scoreLabel || 'score'} of ${latestScore} will be kept.</p>
                    <div style="display:flex;gap:10px;justify-content:center;">
                        <button id="exit-cancel" style="padding:var(--btn-pad-md);border:1px solid #ccc;border-radius:var(--radius-sm);background:white;cursor:pointer;font-weight:600;">Keep Playing</button>
                        <button id="exit-confirm" style="padding:var(--btn-pad-md);border:none;border-radius:var(--radius-sm);background:var(--color-primary);color:white;cursor:pointer;font-weight:600;">Quit</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            function close() {
                _activeMiniGameExitClose = null;
                popModalEscape(close);
                if (overlay.parentNode) { overlay.innerHTML = ''; overlay.remove(); }
            }
            _activeMiniGameExitClose = close;
            overlay.querySelector('#exit-cancel').addEventListener('click', () => close());
            overlay.querySelector('#exit-confirm').addEventListener('click', () => { close(); onConfirm(); });
            overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
            pushModalEscape(close);
            trapFocus(overlay);
            overlay.querySelector('#exit-cancel').focus();
            announce('Quit game? Your current score will be kept.');
        }

        function openMiniGamesMenu() {
            // Remove any existing menu
            const existing = document.querySelector('.minigame-menu-overlay');
            if (existing) {
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }

            const overlay = document.createElement('div');
            overlay.className = 'minigame-menu-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-labelledby', 'minigame-menu-title');

            const highScores = gameState.minigameHighScores || {};
            const scoreHistory = gameState.minigameScoreHistory || {};
            const playCounts = gameState.minigamePlayCounts || {};

            // Feature 5: Resolve active pet personality for preference badges
            const _activePet = (typeof getActivePet === 'function' ? getActivePet() : null) ||
                (gameState && gameState.activePet) || null;
            const _petPersonality = _activePet && _activePet.personality ? _activePet.personality : null;
            const _petPreferredGames = _petPersonality && PERSONALITY_GAME_PREFS[_petPersonality]
                ? new Set(PERSONALITY_GAME_PREFS[_petPersonality]) : new Set();

            const startedGames = [];
            const newGames = [];
            getMiniGameDescriptors().forEach(game => {
                const best = highScores[game.id];
                const label = game.scoreLabel || '';
                const bestHTML = best ? `<span class="minigame-card-best">Best: ${best}${label ? ' ' + label : ''}</span>` : '';
                const history = scoreHistory[game.id];
                let historyHTML = '';
                if (history && history.length > 0) {
                    const historyItems = history.slice(-3).map(s => `${s}`).join(', ');
                    historyHTML = `<span class="minigame-card-history">Recent: ${historyItems}</span>`;
                }
                const plays = playCounts[game.id] || 0;
                const diffLevel = Math.min(plays, 10);
                let difficultyHTML = '';
                if (plays > 0) {
                    const pips = Array.from({length: 10}, (_, i) => {
                        const filled = i < diffLevel;
                        const high = filled && diffLevel >= 7;
                        return `<span class="difficulty-pip${filled ? ' filled' : ''}${high ? ' high' : ''}"></span>`;
                    }).join('');
                    difficultyHTML = `<div class="minigame-difficulty-meter" id="diff-${game.id}" aria-label="Difficulty ${diffLevel} of 10"><span class="difficulty-label">Difficulty:</span><div class="difficulty-bar">${pips}</div></div>`;
                }
                const a11yNoteHTML = game.a11yNote ? `<div class="minigame-a11y-note"><span class="a11y-icon" aria-hidden="true">⌨️</span> ${game.a11yNote}</div>` : '';
                const shortDescription = String(game.description || '').split(/[.!?]/)[0] || game.description || '';
	                const thumbSVG = MINI_GAME_THUMBNAILS[game.id] || '';
                    const cardArt = getMiniGameCardArt(game.id);
                // Feature 5: personality preference badge
                const _isFave = _petPreferredGames.has(game.id);
                const _faveBadgeHTML = _isFave
                    ? `<span class="mg-personality-badge" aria-label="${escapeHTML(_petPersonality || '')} favourite">♥</span>`
                    : '';
	                const cardHTML = `
	                    <button class="minigame-card" data-game="${game.id}" data-art-pattern="${cardArt.pattern}" style="--minigame-card-c1:${cardArt.c1};--minigame-card-c2:${cardArt.c2};" aria-label="Play ${game.name}${_isFave ? ', ' + (_petPersonality || 'pet') + '\'s favourite' : ''}${best ? ', best: ' + best : ''}${plays > 0 ? ', difficulty ' + diffLevel + ' of 10' : ''}"${plays > 0 ? ` aria-describedby="diff-${game.id}"` : ''}>
	                        <div class="minigame-card-visual" aria-hidden="true">
                                <div class="minigame-card-badges">
                                    <span class="minigame-card-badge">${escapeHTML(cardArt.badge)}</span>
                                    <span class="minigame-card-badge soft">${escapeHTML(cardArt.mood)}</span>
                                    ${_faveBadgeHTML}
                                </div>
                                <div class="minigame-card-pattern"></div>
	                            ${thumbSVG}
	                            <span class="minigame-card-icon">${game.icon}</span>
	                        </div>
                        <span class="minigame-card-name">${game.name}</span>
                        <span class="minigame-card-desc">${shortDescription}</span>
                        ${a11yNoteHTML}
                        ${bestHTML}
                        ${difficultyHTML}
                        ${historyHTML}
                    </button>
                `;
                if (plays > 0) startedGames.push(cardHTML);
                else newGames.push(cardHTML);
            });

            const cardsHTML = `
                <section class="minigame-menu-section" aria-label="Continue playing">
                    <h3 class="minigame-menu-section-title">Continue</h3>
                    <div class="minigame-list">${startedGames.length > 0 ? startedGames.join('') : '<p class="minigame-section-empty">Play any game once to track progress here.</p>'}</div>
                </section>
                <section class="minigame-menu-section" aria-label="Try new games">
                    <h3 class="minigame-menu-section-title">Try New</h3>
                    <div class="minigame-list">${newGames.length > 0 ? newGames.join('') : '<p class="minigame-section-empty">You have tried all available games.</p>'}</div>
                </section>
            `;

            overlay.innerHTML = `
                <div class="minigame-menu" tabindex="-1">
                    <h2 class="minigame-menu-title" id="minigame-menu-title"><span aria-hidden="true">🎮</span> Mini Games</h2>
                    <p class="minigame-menu-subtitle">Pick a game.</p>
                    <p class="minigame-menu-keyboard-note"><span aria-hidden="true">⌨️</span> Keyboard: Use Tab to navigate, Enter or Space to play</p>
                    ${cardsHTML}
                    <button class="minigame-close-btn" id="minigame-close">Close</button>
                </div>
            `;

            document.body.appendChild(overlay);
            document.body.classList.add('minigame-menu-open');

            const triggerBtn = document.getElementById('minigames-btn');

            function closeMenu() {
                document.body.classList.remove('minigame-menu-open');
                popModalEscape(closeMenu);
                if (overlay && overlay.parentNode) { overlay.innerHTML = ''; overlay.remove(); }
                if (triggerBtn) triggerBtn.focus();
            }

            // Event listeners
            overlay.querySelector('#minigame-close').addEventListener('click', () => closeMenu());
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeMenu();
            });

            // Game card listeners — R8: show difficulty selector before starting
            overlay.querySelectorAll('.minigame-card').forEach(card => {
                card.addEventListener('click', () => {
                    const gameId = card.getAttribute('data-game');
                    closeMenu();
                    showDifficultySelector(gameId, () => startMiniGame(gameId));
                });
            });

            pushModalEscape(closeMenu);
            overlay._closeOverlay = closeMenu;
            trapFocus(overlay);

            // Focus the first card only after ensuring it is visible inside the scrollable menu.
            const firstCard = overlay.querySelector('.minigame-card');
            const menuPanel = overlay.querySelector('.minigame-menu');
            if (firstCard) {
                requestAnimationFrame(() => {
                    firstCard.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                    firstCard.focus({ preventScroll: true });
                });
            } else if (menuPanel) {
                menuPanel.focus();
            }

            announce('Mini Games menu opened. Pick a game to play!');
        }

        function showMiniGameSummaryCard(options = {}) {
            const gameName = options.gameName || 'Mini-game';
            const score = Number.isFinite(options.score) ? options.score : 0;
            const coinReward = Number.isFinite(options.coinReward) ? options.coinReward : 0;
            const statChanges = Array.isArray(options.statChanges) ? options.statChanges : [];
            const isNewBest = !!options.isNewBest;
            const personalBest = Number.isFinite(options.personalBest) ? options.personalBest : null;
            const medal = options.medal && options.medal.tier ? options.medal : null;
            const rewardHint = typeof options.rewardHint === 'string' ? options.rewardHint : '';
            const difficultyLabel = typeof options.difficultyLabel === 'string' ? options.difficultyLabel : ''; // R8

            const existing = document.querySelector('.minigame-summary-overlay');
            if (existing) existing.remove();

            const statsHTML = statChanges.map((item) => {
                const val = Number(item.value) || 0;
                const sign = val >= 0 ? '+' : '';
                return `<div class="minigame-summary-stat">${escapeHTML(item.label)}: ${sign}${val}</div>`;
            }).join('');

            const overlay = document.createElement('div');
            overlay.className = 'minigame-summary-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', `${gameName} summary`);
            const medalHTML = medal
                ? `<div class="minigame-medal-badge ${escapeHTML(medal.tier)}" aria-label="${escapeHTML(medal.label)} medal">${escapeHTML(medal.icon)} ${escapeHTML(medal.label)}</div>`
                : '';
            const personalBestHTML = isNewBest
                ? `<div class="minigame-pb-card" aria-live="polite">⭐ New personal best${personalBest !== null ? `: <strong>${personalBest}</strong>` : ''}</div>`
                : '';
            overlay.innerHTML = `
                <div class="minigame-summary-card">
                    <h3 class="minigame-summary-title">${escapeHTML(gameName)} Results</h3>
                    ${medalHTML}
                    ${personalBestHTML}
                    <p class="minigame-summary-scoreline">Score: <strong>${score}</strong> • Coins: <strong>+${coinReward}</strong>${difficultyLabel ? ` • <span class="mg-summary-diff-tag">${escapeHTML(difficultyLabel)}</span>` : ''}</p>
                    ${rewardHint ? `<p class="minigame-summary-scoreline" style="font-size:0.86rem;color:#546E7A;">${escapeHTML(rewardHint)}</p>` : ''}
                    <div class="minigame-summary-grid">${statsHTML}</div>
                    <div class="minigame-summary-actions">
                        <button class="minigame-summary-btn primary" type="button" data-summary-close>Done</button>
                    </div>
                </div>
            `;
	            document.body.appendChild(overlay);
	            if (typeof GameAudio !== 'undefined' && GameAudio.playSFXByName) {
                GameAudio.playSFXByName('reward-pop', GameAudio.sfx.achievement);
                if (coinReward > 0) {
                    GameAudio.playSFXByName('coin-jingle', GameAudio.sfx.celebration);
	                }
                // Feature 20: minigame win/lose caption
                if (GameAudio.getSoundCueCaptionsEnabled && GameAudio.getSoundCueCaptionsEnabled() && typeof GameAudio.dispatchCaption === 'function') {
                    const _mgWon = score > 0 || coinReward > 0 || medal !== null;
                    GameAudio.dispatchCaption(_mgWon ? 'minigame-win' : 'minigame-lose', 'minigame',
                        _mgWon ? '🎉 Mini-game won!' : '😔 Mini-game over');
                }
	            }
                if (typeof showRewardBurstFX === 'function') {
                    const burstCoinCount = Math.max(0, Math.min(12, Math.ceil(coinReward / 12)));
                    const badgeText = medal ? `${medal.icon} ${medal.label} Medal` : (isNewBest ? '⭐ New Best!' : '');
                    showRewardBurstFX(overlay.querySelector('.minigame-summary-card') || overlay, {
                        coinCount: burstCoinCount,
                        badgeText,
                        badgeTone: medal ? medal.tier : (isNewBest ? 'gold' : 'soft')
                    });
                }

            function close() {
                popModalEscape(close);
                if (overlay.parentNode) overlay.remove();
                // Feature 4: determine win/lose then show 1.5s reaction beat
                _lastMgWon = score > 0 || coinReward > 0 || medal !== null;
                showMinigameReactionBeat(_lastMgWon, () => restorePostMiniGameState());
            }

            overlay.querySelector('[data-summary-close]')?.addEventListener('click', close);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
            pushModalEscape(close);
            trapFocus(overlay);
            overlay.querySelector('[data-summary-close]')?.focus();
        }

        function getMiniGameMedal(score, thresholds) {
            const safeScore = Number(score) || 0;
            if (!thresholds || safeScore <= 0) return null;
            if (safeScore >= (Number(thresholds.gold) || Infinity)) return { tier: 'gold', label: 'Gold', icon: '🥇' };
            if (safeScore >= (Number(thresholds.silver) || Infinity)) return { tier: 'silver', label: 'Silver', icon: '🥈' };
            if (safeScore >= (Number(thresholds.bronze) || Infinity)) return { tier: 'bronze', label: 'Bronze', icon: '🥉' };
            return null;
        }

        function startMiniGame(gameId) {
            // Feature 20: minigame-start caption
            if (typeof GameAudio !== 'undefined' && GameAudio.getSoundCueCaptionsEnabled && GameAudio.getSoundCueCaptionsEnabled() && typeof GameAudio.dispatchCaption === 'function') {
                GameAudio.dispatchCaption('minigame-start', 'minigame', '🎮 Mini-game starting!');
            }
            switch (gameId) {
                case 'fetch':
                    startFetchGame();
                    break;
                case 'hideseek':
                    startHideSeekGame();
                    break;
                case 'bubblepop':
                    startBubblePopGame();
                    break;
                case 'matching':
                    startMatchingGame();
                    break;
                case 'simonsays':
                    startSimonSaysGame();
                    break;
                case 'coloring':
                    startColoringGame();
                    break;
                case 'racing':
                    startRacingGame();
                    break;
                case 'cooking':
                    startCookingGame();
                    break;
                case 'fishing':
                    startFishingGame();
                    break;
                case 'rhythm':
                    startRhythmGame();
                    break;
                case 'slider':
                    startSliderPuzzleGame();
                    break;
                case 'trivia':
                    startTriviaGame();
                    break;
                case 'runner':
                    startRunnerGame();
                    break;
                case 'tournament':
                    startTournamentGame();
                    break;
                case 'coop':
                    startCoopRelayGame();
                    break;
            }
        }

        // ==================== MINI-GAME EXPANSION HELPERS ====================

        function ensureMiniGameExpansionMeta() {
            if (typeof ensureMiniGameExpansionState === 'function') {
                return ensureMiniGameExpansionState();
            }
            if (!gameState.minigameExpansion || typeof gameState.minigameExpansion !== 'object') {
                gameState.minigameExpansion = {
                    specialFoodStock: 0,
                    tournament: { season: 1, round: 0, wins: 0, championships: 0, lastBracket: [], leaderboard: [] },
                    coop: { sessions: 0, bestScore: 0 }
                };
            }
            return gameState.minigameExpansion;
        }

        function getStatLabel(statKey) {
            const labels = {
                hunger: 'Hunger',
                cleanliness: 'Cleanliness',
                happiness: 'Happiness',
                energy: 'Energy'
            };
            return labels[statKey] || statKey;
        }

        function applyMiniGameStatChangesToPets(pets, statDelta) {
            const petList = Array.isArray(pets) ? pets.filter(Boolean) : [];
            const aggregate = {};
            petList.forEach((pet, index) => {
                const delta = (typeof statDelta === 'function') ? (statDelta(pet, index) || {}) : (statDelta || {});
                Object.entries(delta).forEach(([statKey, change]) => {
                    const amount = Math.round(Number(change) || 0);
                    if (!amount || typeof pet[statKey] !== 'number') return;
                    pet[statKey] = clamp(pet[statKey] + amount, 0, 100);
                    aggregate[statKey] = (aggregate[statKey] || 0) + amount;
                });
            });
            return aggregate;
        }

        function finalizeExpandedMiniGame(config) {
            if (!config || !config.gameId) return null;
            const gameId = config.gameId;
            const gameName = config.gameName || gameId;
            const score = Math.max(0, Math.round(Number(config.score) || 0));
            const coinScore = Number.isFinite(config.coinScore) ? Number(config.coinScore) : score;
            const pets = Array.isArray(config.pets) && config.pets.length > 0
                ? config.pets.filter(Boolean)
                : (gameState.pet ? [gameState.pet] : []);

            if (!config.skipPlayCount) incrementMinigamePlayCount(gameId, score);
            const statAggregate = applyMiniGameStatChangesToPets(pets, config.statDelta);

            // R8: Apply difficulty multiplier to coin score
            const _r8Diff = (_DIFFICULTY_CONFIG && _DIFFICULTY_CONFIG[_minigameDifficulty]) ? _minigameDifficulty : 'normal';
            const _r8DiffConf = _DIFFICULTY_CONFIG[_r8Diff] || { label: 'Normal', coinMult: 1.0 };
            const _r8CoinScore = Math.round(coinScore * _r8DiffConf.coinMult);

            // R3: Hot streak multiplier — track win/loss, apply multiplier before per-game cap
            const _r3IsWin = score > 0;
            if (!Number.isFinite(gameState.minigameWinStreak)) gameState.minigameWinStreak = 0;
            const _r3PrevStreak = Number(gameState.minigameWinStreak) || 0;
            if (_r3IsWin) {
                gameState.minigameWinStreak = _r3PrevStreak + 1;
            } else {
                if (_r3PrevStreak >= 2 && typeof showToast === 'function') {
                    showToast('\uD83D\uDCA8 Streak broken.', '#90A4AE', { duration: 1800 });
                }
                gameState.minigameWinStreak = 0;
            }
            const _r3StreakMult = _r3IsWin ? Math.min(1 + (gameState.minigameWinStreak - 1) * 0.05, 1.15) : 1;
            const _r3CoinScore = Math.round(_r8CoinScore * _r3StreakMult);
            if (_r3IsWin && gameState.minigameWinStreak >= 2) {
                const _r3Pct = Math.round((_r3StreakMult - 1) * 100);
                if (_r3Pct > 0 && typeof showToast === 'function') {
                    showToast(`\uD83D\uDD25 Win streak \xD7${gameState.minigameWinStreak}! +${_r3Pct}% bonus`, '#FF9800', { duration: 2000 });
                }
            }

            const coinReward = (typeof awardMiniGameCoins === 'function') ? awardMiniGameCoins(gameId, _r3CoinScore) : 0;
            const rewardContext = (gameState && gameState._lastMinigameRewardContext && gameState._lastMinigameRewardContext.source === 'minigame' && gameState._lastMinigameRewardContext.gameId === gameId)
                ? gameState._lastMinigameRewardContext
                : null;
            const previousBest = Number((gameState.minigameHighScores || {})[gameId] || 0);
            const isNewBest = updateMinigameHighScore(gameId, score);

            // R8: Track per-difficulty high scores
            if (!gameState.minigameHighScoresByDiff) gameState.minigameHighScoresByDiff = {};
            if (!gameState.minigameHighScoresByDiff[gameId]) gameState.minigameHighScoresByDiff[gameId] = {};
            const _r8PrevDiffBest = Number(gameState.minigameHighScoresByDiff[gameId][_r8Diff] || 0);
            if (score > _r8PrevDiffBest) gameState.minigameHighScoresByDiff[gameId][_r8Diff] = score;

            updateNeedDisplays();
            updatePetMood();
            updateWellnessBar();
            saveGame();

            // Show floating stat deltas near need bubbles for mini-game rewards
            if (typeof showStatDeltaNearNeedBubbles === 'function' && statAggregate) {
                showStatDeltaNearNeedBubbles(statAggregate);
            }

            if (typeof config.onAfterRewards === 'function') {
                config.onAfterRewards({ score, coinReward, isNewBest, previousBest });
            }

            if (isNewBest) {
                showToast(`New high score in ${gameName}: ${score}!`, '#FFD700');
                showMinigameConfetti();
                showHighScoreBanner(gameName, score);
            } else if (score > 0) {
                showMinigameConfetti();
            }

            const statChanges = Array.isArray(config.summaryStats) && config.summaryStats.length > 0
                ? config.summaryStats
                : Object.entries(statAggregate).map(([statKey, value]) => ({
                    label: `${getStatLabel(statKey)}${pets.length > 1 ? ' (Team)' : ''}`,
                    value
                }));
            showMiniGameSummaryCard({
                gameName,
                score,
                coinReward,
                statChanges,
                isNewBest,
                personalBest: isNewBest ? Math.max(score, previousBest) : null,
                medal: getMiniGameMedal(score, config.medalThresholds || null),
                rewardHint: rewardContext && rewardContext.inDiminishingRewards ? rewardContext.summaryHint : '',
                difficultyLabel: _r8DiffConf.icon + ' ' + _r8DiffConf.label  // R8
            });
            return { score, coinReward, isNewBest };
        }

        function grantSpecialPetFood(amount) {
            const add = Math.max(0, Math.floor(Number(amount) || 0));
            if (add <= 0) return 0;
            const expansion = ensureMiniGameExpansionMeta();
            expansion.specialFoodStock = Math.max(0, Math.floor(expansion.specialFoodStock || 0)) + add;
            return add;
        }

        function getCoopPetPair() {
            const pets = (Array.isArray(gameState.pets) ? gameState.pets : []).filter(Boolean);
            if (pets.length >= 2) {
                const left = pets[gameState.activePetIndex] || pets[0];
                const right = pets.find((p) => p && left && p.id !== left.id) || pets[1];
                return [left, right].filter(Boolean);
            }
            return [];
        }

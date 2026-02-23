        // ==================== MINI GAMES ====================

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

        function getCompetitionStyleRuleModifier(modeId) {
            if (typeof getDeterministicRuleModifier !== 'function') return null;
            return getDeterministicRuleModifier(modeId, 'competitionRule', 'competition');
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

        let _minigameDomWriteRAF = 0;
        const _minigameDomWriteQueue = [];
        function queueMinigameDOMWrite(fn) {
            if (typeof fn !== 'function') return;
            _minigameDomWriteQueue.push(fn);
            if (_minigameDomWriteRAF) return;
            _minigameDomWriteRAF = requestAnimationFrame(() => {
                _minigameDomWriteRAF = 0;
                const queued = _minigameDomWriteQueue.splice(0);
                for (let i = 0; i < queued.length; i++) {
                    try { queued[i](); } catch (e) {}
                }
            });
        }

        const MINI_GAMES = [
            { id: 'fetch', name: 'Fetch', icon: '🎾', description: 'Throw a ball for your pet and bring it back.', a11y: 'keyboard', a11yNote: 'Touch and keyboard supported' },
            { id: 'hideseek', name: 'Hide & Seek', icon: '🍪', description: 'Find hidden treats around the play field.', a11y: 'keyboard', a11yNote: 'Touch and keyboard supported' },
            { id: 'bubblepop', name: 'Bubble Pop', icon: '🫧', description: 'Pop bubbles during bath time before they float away.', a11y: 'keyboard', a11yNote: 'Touch and keyboard supported' },
            { id: 'matching', name: 'Matching', icon: '🃏', description: 'Match food and accessory pairs for points.', a11y: 'keyboard', a11yNote: 'Touch and keyboard supported' },
            { id: 'simonsays', name: 'Simon Says', icon: '🎵', description: 'Follow the color and sound pattern.', a11y: 'keyboard', a11yNote: 'Touch and keyboard supported' },
            { id: 'coloring', name: 'Coloring', icon: '🎨', description: 'Color your pet or backgrounds with different swatches.', a11y: 'keyboard', a11yNote: 'Touch and keyboard supported' },
            { id: 'racing', name: 'Lane Racing', icon: '🏁', description: 'Switch lanes and dodge obstacles on the race track.', a11y: 'keyboard', a11yNote: 'Touch and keyboard supported' },
            { id: 'cooking', name: 'Cooking Lab', icon: '🍲', description: 'Combine ingredients to cook special pet food.', a11y: 'keyboard', a11yNote: 'Touch and keyboard supported' },
            { id: 'fishing', name: 'Pond Fishing', icon: '🎣', description: 'Time your catch in the fishing zone.', a11y: 'keyboard', a11yNote: 'Touch and keyboard supported' },
            { id: 'rhythm', name: 'Rhythm Beats', icon: '🥁', description: 'Match beats and keep your combo going.', a11y: 'keyboard', a11yNote: 'Touch and keyboard supported' },
            { id: 'slider', name: 'Slider Puzzle', icon: '🧩', description: 'Rebuild your pet portrait by sliding tiles.', a11y: 'keyboard', a11yNote: 'Touch and keyboard supported' },
            { id: 'trivia', name: 'Animal Trivia', icon: '🦉', description: 'Answer animal fact questions for rewards.', a11y: 'keyboard', a11yNote: 'Touch and keyboard supported' },
            { id: 'runner', name: 'Endless Runner', icon: '🏃', description: 'Jump over obstacles and chase distance.', a11y: 'keyboard', a11yNote: 'Touch and keyboard supported' },
            { id: 'tournament', name: 'Tournament Cup', icon: '🏆', description: 'Play bracket rounds and climb the leaderboard.', a11y: 'keyboard', a11yNote: 'Touch and keyboard supported' },
            { id: 'coop', name: 'Co-op Relay', icon: '🤝', description: 'Control two pets in a cooperative relay.', a11y: 'keyboard', a11yNote: 'Touch and keyboard supported' }
        ];

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
                    <p style="margin-bottom:16px;font-size:0.9rem;color:var(--color-text-secondary);">Your current score of ${latestScore} will be kept.</p>
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
            const scoreLabels = {
                fetch: 'catches',
                hideseek: 'treats',
                bubblepop: 'pops',
                matching: 'score',
                simonsays: 'rounds',
                coloring: 'points',
                racing: 'dodges',
                cooking: 'recipes',
                fishing: 'catches',
                rhythm: 'beats',
                slider: 'tiles',
                trivia: 'facts',
                runner: 'meters',
                tournament: 'wins',
                coop: 'relay'
            };

            const playCounts = gameState.minigamePlayCounts || {};
            const touchMode = miniGameTouchMode();

            const startedGames = [];
            const newGames = [];
            MINI_GAMES.forEach(game => {
                const best = highScores[game.id];
                const label = scoreLabels[game.id] || '';
                const bestHTML = best ? `<span class="minigame-card-best">Best: ${best}${label ? ' ' + label : ''}</span>` : '';
                const history = scoreHistory[game.id];
                let historyHTML = '';
                if (history && history.length > 0) {
                    const historyItems = history.slice(-3).map(s => `${s}`).join(', ');
                    historyHTML = `<span class="minigame-card-history">Recent: ${historyItems}</span>`;
                }
                const plays = playCounts[game.id] || 0;
                const diffLevel = plays > 0 ? getMiniGameDifficultyMeterLevel(game.id) : 0;
                let difficultyHTML = '';
                if (plays > 0) {
                    const pips = Array.from({length: 10}, (_, i) => {
                        const filled = i < diffLevel;
                        const high = filled && diffLevel >= 7;
                        return `<span class="difficulty-pip${filled ? ' filled' : ''}${high ? ' high' : ''}"></span>`;
                    }).join('');
                    difficultyHTML = `<div class="minigame-difficulty-meter" id="diff-${game.id}" aria-label="Difficulty ${diffLevel} of 10"><span class="difficulty-label">Difficulty:</span><div class="difficulty-bar">${pips}</div></div>`;
                }
                const a11yNoteHTML = (!touchMode && game.a11yNote) ? `<div class="minigame-a11y-note"><span class="a11y-icon" aria-hidden="true">⌨️</span> ${game.a11yNote}</div>` : '';
                const shortDescription = String(game.description || '').split(/[.!?]/)[0] || game.description || '';
                const cardHTML = `
                    <button class="minigame-card" data-game="${game.id}" aria-label="Play ${game.name}${best ? ', best: ' + best : ''}${plays > 0 ? ', difficulty ' + diffLevel + ' of 10' : ''}"${plays > 0 ? ` aria-describedby="diff-${game.id}"` : ''}>
                        <span class="minigame-card-icon" aria-hidden="true">${game.icon}</span>
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
                    ${touchMode ? '<p class="minigame-menu-keyboard-note mobile-touch-note"><span aria-hidden="true">👆</span> Tap any game card to play</p>' : '<p class="minigame-menu-keyboard-note"><span aria-hidden="true">⌨️</span> Keyboard: Use Tab to navigate, Enter or Space to play</p>'}
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

            // Game card listeners
            overlay.querySelectorAll('.minigame-card').forEach(card => {
                card.addEventListener('click', () => {
                    const gameId = card.getAttribute('data-game');
                    closeMenu();
                    startMiniGame(gameId);
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
                    <p class="minigame-summary-scoreline">Score: <strong>${score}</strong> • Coins: <strong>+${coinReward}</strong></p>
                    <div class="minigame-summary-grid">${statsHTML}</div>
                    <div class="minigame-summary-actions">
                        <button class="minigame-summary-btn primary" type="button" data-summary-close>Done</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            if (typeof GameAudio !== 'undefined' && GameAudio.playSFXByName) {
                if (typeof GameAudio.playRewardCue === 'function') {
                    GameAudio.playRewardCue(personalBest ? 'milestone' : 'big');
                } else {
                    GameAudio.playSFXByName('reward-pop', GameAudio.sfx.achievement);
                }
                if (coinReward > 0) {
                    if (typeof GameAudio.playRewardCue === 'function') GameAudio.playRewardCue('medium');
                    else GameAudio.playSFXByName('coin-jingle', GameAudio.sfx.celebration);
                }
            }

            function close() {
                popModalEscape(close);
                if (overlay.parentNode) overlay.remove();
                restorePostMiniGameState();
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

        function getEscalatedMinigameDifficulty(gameId) {
            const baseDifficulty = typeof getMinigameDifficulty === 'function' ? Math.max(0.6, Number(getMinigameDifficulty(gameId)) || 1) : 1;
            const tuning = (typeof getMinigameEscalationTuning === 'function') ? getMinigameEscalationTuning() : null;
            if (!tuning) return baseDifficulty;
            const cap = Math.max(1, Number(tuning.difficultyCap) || 2.7);
            // Report #4: remove second replay-scaling layer; baseDifficulty already includes replay pressure.
            const boosted = baseDifficulty;
            return Math.max(0.7, Math.min(cap, Number(boosted.toFixed(2))));
        }

        function getMinigameDifficultyBand(gameId, runDifficulty) {
            const tuning = (typeof getMinigameEscalationTuning === 'function') ? getMinigameEscalationTuning() : null;
            const diff = Math.max(0.6, Number(runDifficulty) || getEscalatedMinigameDifficulty(gameId));
            if (!tuning || !Array.isArray(tuning.difficultyBands) || tuning.difficultyBands.length === 0) {
                return { id: 'steady', rewardScoreMultiplier: 1, difficulty: diff };
            }
            for (const band of tuning.difficultyBands) {
                if (diff <= (Number(band.maxDifficulty) || 99)) {
                    return {
                        id: band.id || 'steady',
                        rewardScoreMultiplier: Math.max(0.8, Number(band.rewardScoreMultiplier) || 1),
                        difficulty: diff
                    };
                }
            }
            const fallback = tuning.difficultyBands[tuning.difficultyBands.length - 1] || {};
            return {
                id: fallback.id || 'steady',
                rewardScoreMultiplier: Math.max(0.8, Number(fallback.rewardScoreMultiplier) || 1),
                difficulty: diff
            };
        }

        function getMiniGameDifficultyMeterLevel(gameId) {
            const diff = getEscalatedMinigameDifficulty(gameId);
            return Math.max(1, Math.min(10, Math.round(diff * 3.4)));
        }

        function awardScaledMiniGameCoins(gameId, baseCoinScore, runDifficulty) {
            if (typeof awardMiniGameCoins !== 'function') return 0;
            const safeBase = Math.max(0, Number(baseCoinScore) || 0);
            if (safeBase <= 0) return 0;
            const band = getMinigameDifficultyBand(gameId, runDifficulty);
            const roomMult = (typeof getRoomSystemMultiplier === 'function') ? getRoomSystemMultiplier('minigame') : 1;
            const tunedScore = Math.max(1, Math.round(safeBase * band.rewardScoreMultiplier * roomMult));
            return awardMiniGameCoins(gameId, tunedScore);
        }

        function startMiniGame(gameId) {
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

        // ==================== FETCH MINI-GAME ====================

        let fetchState = null;

        function startFetchGame() {
            if (!gameState.pet) {
                if (typeof showToast === 'function') {
                    showToast('You need a pet to play this game.', '#FFA726');
                }
                return;
            }
            const fetchDiff = getEscalatedMinigameDifficulty('fetch');
            fetchState = {
                score: 0,
                phase: 'ready', // 'ready', 'thrown', 'fetching', 'returning'
                ballX: 50,
                ballY: 160,
                petX: 45,
                targetX: 0,
                difficulty: fetchDiff,
                _timeouts: []
            };

            renderFetchGame();
            announce('Fetch game started! Click the field or press Enter to throw the ball!');
        }

        function renderFetchGame() {
            // Remove any existing game
            const existing = document.querySelector('.fetch-game-overlay');
            if (existing) existing.remove();

            const pet = gameState.pet;
            const mood = getMood(pet);

            const overlay = document.createElement('div');
            overlay.className = 'fetch-game-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Fetch mini game');

            overlay.innerHTML = `
                <div class="fetch-game">
                    <h2 class="fetch-game-title">🎾 Fetch!</h2>
                    <p class="fetch-game-score" id="fetch-score">Fetched: ${fetchState.score}</p>
                    <div class="fetch-field" id="fetch-field" role="button" aria-label="Click or press Enter to throw the ball" tabindex="0">
                        <div class="fetch-field-clouds" aria-hidden="true">☁️ ☁️</div>
                        <div class="fetch-field-flowers" aria-hidden="true">🌸 🌼 🌷 🌻</div>
                        <div class="fetch-ball" id="fetch-ball" style="left: ${fetchState.ballX}%; top: ${fetchState.ballY}px;">🎾</div>
                        <div class="fetch-ball-shadow" id="fetch-ball-shadow" style="left: ${fetchState.ballX}%; top: 185px;"></div>
                        <div class="fetch-pet" id="fetch-pet" style="left: ${fetchState.petX}%;">
                            ${generatePetSVG(pet, mood)}
                        </div>
                    </div>
                    <p class="fetch-instruction" id="fetch-instruction" aria-live="polite">Click the field or press Enter to throw the ball!</p>
                    <div class="fetch-buttons">
                        <button class="fetch-throw-btn" id="fetch-throw-btn">🎾 Throw!</button>
                        <button class="fetch-done-btn" id="fetch-done-btn">Done</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            // Event listeners
            const field = overlay.querySelector('#fetch-field');
            const throwBtn = overlay.querySelector('#fetch-throw-btn');
            const doneBtn = overlay.querySelector('#fetch-done-btn');
            const updateFetchExitButtons = () => {
                if (!fetchState || !doneBtn) return;
                const busy = fetchState.phase !== 'ready';
                doneBtn.disabled = busy;
                doneBtn.setAttribute('aria-disabled', busy ? 'true' : 'false');
                doneBtn.setAttribute('aria-describedby', 'fetch-instruction');
                if (busy) {
                    doneBtn.setAttribute('title', 'Wait for the current throw to finish before exiting.');
                } else {
                    doneBtn.removeAttribute('title');
                }
            };

            field.addEventListener('click', (e) => handleFetchThrow(e));
            field.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleFetchThrow(e);
                }
            });

            throwBtn.addEventListener('click', (e) => handleFetchThrow(e));

            doneBtn.addEventListener('click', () => {
                if (!fetchState || fetchState.phase !== 'ready') {
                    if (typeof showToast === 'function') {
                        showToast('Finish the current throw before ending.', '#FFA726', { announce: false, priority: 'critical' });
                    }
                    return;
                }
                endFetchGame();
            });

            // Close on overlay click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    requestMiniGameExit(fetchState ? fetchState.score : 0, () => endFetchGame(), {
                        canExit: () => !!fetchState && fetchState.phase === 'ready',
                        busyMessage: 'Finish the current throw before quitting.'
                    });
                }
            });

            // Escape to exit
            function fetchEscapeHandler() {
                requestMiniGameExit(fetchState ? fetchState.score : 0, () => endFetchGame(), {
                    canExit: () => !!fetchState && fetchState.phase === 'ready',
                    busyMessage: 'Finish the current throw before quitting.'
                });
            }
            pushModalEscape(fetchEscapeHandler);
            fetchState._escapeHandler = fetchEscapeHandler;
            trapFocus(overlay);

            throwBtn.focus();
            updateFetchExitButtons();
            fetchState._updateExitButtons = updateFetchExitButtons;
        }

        function handleFetchThrow(e) {
            if (!fetchState || fetchState._ended || fetchState.phase !== 'ready') return;

            fetchState.phase = 'thrown';

            const field = document.getElementById('fetch-field');
            const ball = document.getElementById('fetch-ball');
            const shadow = document.getElementById('fetch-ball-shadow');
            const pet = document.getElementById('fetch-pet');
            const instruction = document.getElementById('fetch-instruction');
            const throwBtn = document.getElementById('fetch-throw-btn');

            if (throwBtn) {
                throwBtn.disabled = true;
                throwBtn.setAttribute('aria-disabled', 'true');
                throwBtn.setAttribute('title', 'Wait for your pet to bring the ball back.');
            }
            if (fetchState._updateExitButtons) fetchState._updateExitButtons();

            // Calculate where the ball lands (random position on the right side)
            const targetX = 60 + Math.random() * 25;
            fetchState.targetX = targetX;

            // Animate ball flying to the right with an arc
            instruction.textContent = 'Nice throw!';
            instruction.className = 'fetch-instruction highlight';
            announce('Nice throw!');
            if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.throw);

            // Ball arc animation - first goes up, then lands
            ball.style.transition = 'none';
            ball.offsetHeight; // force reflow

            // Phase 1: Ball arcs up and to the right
            ball.classList.add('arc');
            ball.style.left = targetX + '%';
            ball.style.top = '60px';

            if (shadow) {
                shadow.style.transition = 'left 0.8s ease-out, opacity 0.3s';
                shadow.style.left = targetX + '%';
                shadow.style.opacity = '0.05';
            }

            // Duration multiplier: higher difficulty → lower value → shorter timeouts → faster game
            const fetchSpeed = 1 / fetchState.difficulty;

            // Phase 2: Ball drops down to ground
            fetchState._timeouts.push(setTimeout(() => {
                if (!fetchState || fetchState._ended) return;
                ball.style.transition = `top ${0.35 * fetchSpeed}s cubic-bezier(0.55, 0, 1, 0.45)`;
                ball.style.top = '155px';
                if (shadow) {
                    shadow.style.opacity = '0.15';
                }
            }, 700 * fetchSpeed));

            // Phase 3: Pet runs to fetch the ball
            fetchState._timeouts.push(setTimeout(() => {
                if (!fetchState || fetchState._ended) return;
                fetchState.phase = 'fetching';
                instruction.textContent = `${(getAllPetTypeData(gameState.pet.type) || PET_TYPES[gameState.pet.type] || {emoji:'🐾'}).emoji} Running to get it!`;
                announce('Running to get it!');

                pet.classList.add('running');
                pet.style.left = (targetX - 5) + '%';
            }, 1100 * fetchSpeed));

            // Phase 4: Pet reaches ball
            fetchState._timeouts.push(setTimeout(() => {
                if (!fetchState || fetchState._ended) return;
                // Hide the ball (pet picked it up)
                ball.style.opacity = '0';
                ball.style.transition = 'opacity 0.15s';

                instruction.textContent = `${(getAllPetTypeData(gameState.pet.type) || PET_TYPES[gameState.pet.type] || {emoji:'🐾'}).emoji} Got it!`;
                instruction.className = 'fetch-instruction highlight';
                announce('Got it!');

                // Show a reward particle
                showFetchReward(field, targetX);
                if (typeof hapticBuzz === 'function') hapticBuzz(50);
                if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.catch);
            }, 2000 * fetchSpeed));

            // Phase 5: Pet returns to start
            fetchState._timeouts.push(setTimeout(() => {
                if (!fetchState || fetchState._ended) return;
                fetchState.phase = 'returning';
                instruction.textContent = `${(getAllPetTypeData(gameState.pet.type) || PET_TYPES[gameState.pet.type] || {emoji:'🐾'}).emoji} Bringing it back!`;
                instruction.className = 'fetch-instruction';
                announce('Bringing it back!');

                pet.classList.remove('running');
                pet.classList.add('returning');
                pet.style.left = '45%';
            }, 2400 * fetchSpeed));

            // Phase 6: Complete - pet is back, ready for another throw
            fetchState._timeouts.push(setTimeout(() => {
                if (!fetchState || fetchState._ended) return;
                fetchState.score++;
                fetchState.phase = 'ready';

                // Update score display
                const scoreEl = document.getElementById('fetch-score');
                if (scoreEl) scoreEl.textContent = `Fetched: ${fetchState.score}`;

                // Reset ball position
                ball.classList.remove('arc');
                ball.style.transition = 'none';
                ball.style.left = '50%';
                ball.style.top = '160px';
                ball.style.opacity = '1';

                if (shadow) {
                    shadow.style.transition = 'none';
                    shadow.style.left = '50%';
                    shadow.style.opacity = '0.15';
                }

                pet.classList.remove('returning');
                pet.style.transition = 'none';
                pet.style.left = '45%';
                pet.offsetHeight; // force reflow
                pet.style.transition = '';

                instruction.textContent = 'Throw again! Click or press Enter!';
                instruction.className = 'fetch-instruction highlight';

                if (throwBtn) {
                    throwBtn.disabled = false;
                    throwBtn.setAttribute('aria-disabled', 'false');
                    throwBtn.removeAttribute('title');
                }
                if (fetchState._updateExitButtons) fetchState._updateExitButtons();

                announce(`Great fetch! Score: ${fetchState.score}. Throw again!`);
            }, 3400 * fetchSpeed));
        }

        function showFetchReward(container, xPercent) {
            const reward = document.createElement('div');
            reward.className = 'fetch-reward';
            reward.textContent = '+1 🎾';
            reward.style.left = xPercent + '%';
            reward.style.top = '120px';
            container.appendChild(reward);
            setTimeout(() => reward.remove(), 1000);
        }

        function endFetchGame() {
            dismissMiniGameExitDialog();
            if (fetchState && fetchState._escapeHandler) {
                popModalEscape(fetchState._escapeHandler);
            }
            if (fetchState) {
                fetchState._ended = true;
            }
            if (fetchState && fetchState._timeouts) {
                fetchState._timeouts.forEach(id => clearTimeout(id));
            }

            const overlay = document.querySelector('.fetch-game-overlay');
            if (overlay) { overlay.innerHTML = ''; overlay.remove(); }

            incrementMinigamePlayCount('fetch', fetchState ? fetchState.score : 0);

            // Apply rewards based on score
            if (fetchState && fetchState.score > 0 && gameState.pet) {
                const bonus = Math.min(fetchState.score * 5, 30);
                const energyLoss = Math.min(fetchState.score * 2, 10);
                const hungerLoss = Math.min(fetchState.score, 5);
                gameState.pet.happiness = clamp(gameState.pet.happiness + bonus, 0, 100);
                gameState.pet.energy = clamp(gameState.pet.energy - energyLoss, 0, 100);
                gameState.pet.hunger = clamp(gameState.pet.hunger - hungerLoss, 0, 100);
                const coinReward = awardScaledMiniGameCoins('fetch', fetchState.score, fetchState.difficulty);
                const previousBest = Number((gameState.minigameHighScores || {}).fetch || 0);
                const isNewBest = updateMinigameHighScore('fetch', fetchState.score);
                const bestMsg = isNewBest ? ' New best!' : '';

                // Update displays
                updateNeedDisplays();
                updatePetMood();
                updateWellnessBar();
                saveGame();

                announce(`Fetch game over! ${fetchState.score} catches! Happiness +${bonus}! Coins +${coinReward}!${bestMsg}`);
                if (isNewBest) {
                    showToast(`New high score in Fetch: ${fetchState.score}!`, '#FFD700');
                    showMinigameConfetti();
                    showHighScoreBanner('Fetch', fetchState.score);
                } else if (fetchState.score > 0) {
                    showMinigameConfetti();
                }
                showMiniGameSummaryCard({
                    gameName: 'Fetch',
                    score: fetchState.score,
                    coinReward,
                    statChanges: [
                        { label: 'Happiness', value: bonus },
                        { label: 'Energy', value: -energyLoss },
                        { label: 'Hunger', value: -hungerLoss }
                    ],
                    isNewBest,
                    personalBest: isNewBest ? Math.max(fetchState.score, previousBest) : null,
                    medal: getMiniGameMedal(fetchState.score, { bronze: 3, silver: 5, gold: 8 })
                });
            } else {
                restorePostMiniGameState();
            }

            fetchState = null;
        }

        // ==================== HIDE & SEEK MINI-GAME ====================

        let hideSeekState = null;

        const HIDESEEK_OBJECTS = [
            { emoji: '🌳', name: 'tree' },
            { emoji: '🪨', name: 'rock' },
            { emoji: '🌻', name: 'sunflower' },
            { emoji: '🍄', name: 'mushroom' },
            { emoji: '🪵', name: 'log' },
            { emoji: '🌿', name: 'bush' },
            { emoji: '🏠', name: 'house' },
            { emoji: '📦', name: 'box' },
            { emoji: '🪣', name: 'bucket' },
            { emoji: '🧺', name: 'basket' },
            { emoji: '🎪', name: 'tent' },
            { emoji: '🪴', name: 'plant' }
        ];

        const HIDESEEK_TREATS = ['🍪', '🦴', '🧀', '🥕', '🍎', '🐟'];

        function startHideSeekGame() {
            if (!gameState.pet) {
                if (typeof showToast === 'function') {
                    showToast('You need a pet to play this game.', '#FFA726');
                }
                return;
            }
            const hideSeekDiff = getEscalatedMinigameDifficulty('hideseek');
            // More treats to find with difficulty, less time
            const totalTreats = Math.min(5 + Math.floor((hideSeekDiff - 1) * 5), 8);
            const spotCount = Math.min(8 + Math.floor((hideSeekDiff - 1) * 4), 12);

            // Pick random hiding spots from available objects
            const shuffled = shuffleArray([...HIDESEEK_OBJECTS]);
            const spots = shuffled.slice(0, spotCount);

            // Assign positions that don't overlap
            const positions = generateHideSeekPositions(spotCount);

            // Pick which spots have treats hidden under them
            const treatIndices = [];
            const indexPool = Array.from({ length: spotCount }, (_, i) => i);
            shuffleArray(indexPool);
            const safeTreatCount = Math.min(totalTreats, indexPool.length);
            for (let i = 0; i < safeTreatCount; i++) {
                treatIndices.push(indexPool[i]);
            }

            // Pick a random treat emoji for this round
            const treatEmoji = HIDESEEK_TREATS[Math.floor(Math.random() * HIDESEEK_TREATS.length)];

            hideSeekState = {
                totalTreats: totalTreats,
                treatsFound: 0,
                spots: spots.map((obj, i) => ({
                    ...obj,
                    x: positions[i].x,
                    y: positions[i].y,
                    hasTreat: treatIndices.includes(i),
                    searched: false
                })),
                treatEmoji: treatEmoji,
                timeLeft: Math.max(15, Math.round(30 / hideSeekDiff)),
                timerId: null,
                difficulty: hideSeekDiff,
                phase: 'playing' // 'playing', 'finished'
            };

            renderHideSeekGame();
            startHideSeekTimer();
            announce(`Hide and Seek started! Find ${totalTreats} hidden treats! Click or tap objects to search under them.`);
        }

        function generateHideSeekPositions(count) {
            const positions = [];
            const minDist = 18;

            for (let i = 0; i < count; i++) {
                let attempts = 0;
                let pos;
                let currentMinDist = minDist;
                do {
                    pos = {
                        x: 8 + Math.random() * 72,
                        y: 5 + Math.random() * 65
                    };
                    attempts++;
                    // Progressively relax distance to avoid giving up with overlap
                    if (attempts === 50) currentMinDist = minDist * 0.6;
                    if (attempts === 80) currentMinDist = minDist * 0.3;
                    if (attempts === 120) currentMinDist = minDist * 0.1;
                } while (
                    attempts < 150 &&
                    positions.some(p => Math.hypot(p.x - pos.x, p.y - pos.y) < currentMinDist)
                );
                positions.push(pos);
            }
            return positions;
        }

        function renderHideSeekGame() {
            const existing = document.querySelector('.hideseek-game-overlay');
            if (existing) existing.remove();

            const pet = gameState.pet;
            const mood = getMood(pet);

            const overlay = document.createElement('div');
            overlay.className = 'hideseek-game-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Hide and Seek mini game');

            let spotsHTML = '';
            hideSeekState.spots.forEach((spot, i) => {
                // Provide spatial position hints for keyboard/screen reader users
                const colLabel = spot.x < 33 ? 'left' : spot.x < 66 ? 'center' : 'right';
                const rowLabel = spot.y < 33 ? 'top' : spot.y < 66 ? 'middle' : 'bottom';
                spotsHTML += `<div class="hideseek-hiding-spot" data-index="${i}"
                    style="left: ${spot.x}%; top: ${spot.y}%;"
                    role="button" tabindex="0"
                    aria-label="Search under ${spot.name}, ${rowLabel}-${colLabel}, ${i + 1} of ${hideSeekState.spots.length}">${spot.emoji}</div>`;
            });

            let progressDots = '';
            for (let i = 0; i < hideSeekState.totalTreats; i++) {
                progressDots += `<div class="hideseek-progress-dot" id="hideseek-dot-${i}"></div>`;
            }

            overlay.innerHTML = `
                <div class="hideseek-game">
                    <h2 class="hideseek-game-title">${hideSeekState.treatEmoji} Hide & Seek!</h2>
                    <p class="hideseek-game-score" id="hideseek-score">Found: ${hideSeekState.treatsFound} / ${hideSeekState.totalTreats}</p>
                    <div class="hideseek-progress" id="hideseek-progress">${progressDots}</div>
                    <p class="hideseek-game-timer" id="hideseek-timer">Time: ${hideSeekState.timeLeft}s</p>
                    <div class="hideseek-field" id="hideseek-field">
                        ${spotsHTML}
                        <div class="hideseek-pet" id="hideseek-pet">
                            ${generatePetSVG(pet, mood)}
                        </div>
                    </div>
                    <p class="hideseek-instruction" id="hideseek-instruction" aria-live="polite">Click or tap objects to find the hidden treats!</p>
                    <div class="hideseek-buttons">
                        <button class="hideseek-done-btn" id="hideseek-done-btn">Done</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            // Event listeners for each hiding spot
            overlay.querySelectorAll('.hideseek-hiding-spot').forEach(el => {
                el.addEventListener('click', () => handleHideSeekTap(parseInt(el.dataset.index)));
                el.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleHideSeekTap(parseInt(el.dataset.index));
                    }
                });
            });

            const doneBtn = overlay.querySelector('#hideseek-done-btn');
            doneBtn.addEventListener('click', () => {
                endHideSeekGame();
            });

            // Close on overlay click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    requestMiniGameExit(hideSeekState ? hideSeekState.treatsFound : 0, () => endHideSeekGame());
                }
            });

            // Escape to exit
            function hideSeekEscapeHandler() {
                requestMiniGameExit(hideSeekState ? hideSeekState.treatsFound : 0, () => endHideSeekGame());
            }
            pushModalEscape(hideSeekEscapeHandler);
            hideSeekState._escapeHandler = hideSeekEscapeHandler;
            trapFocus(overlay);

            // Focus the first hiding spot
            const firstSpot = overlay.querySelector('.hideseek-hiding-spot');
            if (firstSpot) firstSpot.focus();
        }

        function startHideSeekTimer() {
            if (hideSeekState.timerId) clearInterval(hideSeekState.timerId);

            hideSeekState.timerId = setInterval(() => {
                if (!hideSeekState || hideSeekState.phase !== 'playing') return;

                hideSeekState.timeLeft--;
                const timerEl = document.getElementById('hideseek-timer');
                if (timerEl) timerEl.textContent = `Time: ${hideSeekState.timeLeft}s`;

                if (hideSeekState.timeLeft <= 5 && timerEl) {
                    timerEl.style.color = '#F44336';
                    timerEl.style.fontWeight = 'bold';
                    if (hideSeekState.timeLeft === 5) {
                        announce('5 seconds left!');
                    }
                }

                if (hideSeekState.timeLeft <= 0) {
                    hideSeekState.phase = 'finished';
                    clearInterval(hideSeekState.timerId);
                    finishHideSeekRound();
                }
            }, 1000);
        }

        function handleHideSeekTap(index) {
            if (!hideSeekState || hideSeekState.phase !== 'playing') return;

            const spot = hideSeekState.spots[index];
            if (spot.searched) return;

            spot.searched = true;

            const spotEl = document.querySelectorAll('.hideseek-hiding-spot')[index];
            const field = document.getElementById('hideseek-field');
            const instruction = document.getElementById('hideseek-instruction');
            const petEl = document.getElementById('hideseek-pet');

            // Move pet toward the tapped spot
            if (petEl) {
                petEl.style.left = spot.x + '%';
                petEl.style.top = spot.y + '%';
            }

            if (spot.hasTreat) {
                // Found a treat!
                hideSeekState.treatsFound++;

                spotEl.classList.add('found');

                // Show treat emoji popping up
                const treat = document.createElement('div');
                treat.className = 'hideseek-treat';
                treat.textContent = hideSeekState.treatEmoji;
                treat.style.left = spot.x + '%';
                treat.style.top = spot.y + '%';
                field.appendChild(treat);

                // Collect animation
                setTimeout(() => treat.classList.add('collected'), 400);
                setTimeout(() => treat.remove(), 1000);

                // Show reward float
                const reward = document.createElement('div');
                reward.className = 'hideseek-reward';
                reward.textContent = `+1 ${hideSeekState.treatEmoji}`;
                reward.style.left = spot.x + '%';
                reward.style.top = (spot.y - 5) + '%';
                field.appendChild(reward);
                setTimeout(() => reward.remove(), 1000);

                // Update score
                const scoreEl = document.getElementById('hideseek-score');
                if (scoreEl) scoreEl.textContent = `Found: ${hideSeekState.treatsFound} / ${hideSeekState.totalTreats}`;

                // Update progress dots
                const dot = document.getElementById(`hideseek-dot-${hideSeekState.treatsFound - 1}`);
                if (dot) dot.classList.add('found');

                // Pet celebrates
                if (petEl) {
                    petEl.classList.add('celebrating');
                    setTimeout(() => petEl.classList.remove('celebrating'), 500);
                }

                if (instruction) {
                    instruction.textContent = `Found a treat! ${hideSeekState.treatEmoji}`;
                    instruction.className = 'hideseek-instruction highlight';
                }
                if (typeof hapticBuzz === 'function') hapticBuzz(50);
                if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.hit);

                announce(`Found a treat! ${hideSeekState.treatsFound} of ${hideSeekState.totalTreats} found.`);

                // Mark spot as searched visually after animation
                setTimeout(() => spotEl.classList.add('searched'), 600);

                // Check if all treats found
                if (hideSeekState.treatsFound >= hideSeekState.totalTreats) {
                    hideSeekState.phase = 'finished';
                    clearInterval(hideSeekState.timerId);
                    setTimeout(() => finishHideSeekRound(), 800);
                }
            } else {
                // No treat here
                spotEl.classList.add('searched');

                const miss = document.createElement('div');
                miss.className = 'hideseek-miss';
                miss.textContent = '❌';
                miss.style.left = spot.x + '%';
                miss.style.top = spot.y + '%';
                field.appendChild(miss);
                setTimeout(() => miss.remove(), 700);

                if (instruction) {
                    instruction.textContent = 'Nothing here... keep looking!';
                    instruction.className = 'hideseek-instruction';
                }
                if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.miss);

                announce('Nothing under this one. Keep searching!');
            }
        }

        function finishHideSeekRound() {
            if (!hideSeekState) return;
            const instruction = document.getElementById('hideseek-instruction');
            const allFound = hideSeekState.treatsFound >= hideSeekState.totalTreats;

            if (allFound) {
                if (instruction) {
                    instruction.textContent = `Amazing! Found all ${hideSeekState.totalTreats} treats! ${hideSeekState.treatEmoji}`;
                    instruction.className = 'hideseek-instruction highlight';
                }
                announce(`Fantastic! All ${hideSeekState.totalTreats} treats found!`);
            } else {
                if (instruction) {
                    instruction.textContent = `Time's up! Found ${hideSeekState.treatsFound} of ${hideSeekState.totalTreats} treats.`;
                    instruction.className = 'hideseek-instruction';
                }
                announce(`Time is up! Found ${hideSeekState.treatsFound} of ${hideSeekState.totalTreats} treats.`);
            }

            // Reveal unfound treats
            hideSeekState.spots.forEach((spot, i) => {
                if (spot.hasTreat && !spot.searched) {
                    const spotEl = document.querySelectorAll('.hideseek-hiding-spot')[i];
                    if (spotEl) {
                        spotEl.classList.add('searched');
                        const field = document.getElementById('hideseek-field');
                        const reveal = document.createElement('div');
                        reveal.className = 'hideseek-treat';
                        reveal.textContent = hideSeekState.treatEmoji;
                        reveal.style.left = spot.x + '%';
                        reveal.style.top = spot.y + '%';
                        reveal.style.opacity = '0.5';
                        field.appendChild(reveal);
                    }
                }
            });

            // Disable all spots
            document.querySelectorAll('.hideseek-hiding-spot').forEach(el => {
                el.style.pointerEvents = 'none';
            });

            // Auto-end the game after a brief pause (consistent with other mini-games)
            if (hideSeekState && !hideSeekState._ending && !hideSeekState._autoEndTimeout) {
                hideSeekState._autoEndTimeout = setTimeout(() => {
                    endHideSeekGame();
                }, 2500);
            }
        }

        function endHideSeekGame() {
            if (!hideSeekState) {
                dismissMiniGameExitDialog();
                return;
            }
            if (hideSeekState._ending) return;
            hideSeekState._ending = true;
            dismissMiniGameExitDialog();

            if (hideSeekState && hideSeekState._escapeHandler) {
                popModalEscape(hideSeekState._escapeHandler);
            }

            if (hideSeekState && hideSeekState.timerId) {
                clearInterval(hideSeekState.timerId);
            }
            if (hideSeekState && hideSeekState._autoEndTimeout) {
                clearTimeout(hideSeekState._autoEndTimeout);
            }

            const overlay = document.querySelector('.hideseek-game-overlay');
            if (overlay) { overlay.innerHTML = ''; overlay.remove(); }

            incrementMinigamePlayCount('hideseek', hideSeekState ? hideSeekState.treatsFound : 0);

            // Apply rewards based on treats found
            if (hideSeekState && hideSeekState.treatsFound > 0 && gameState.pet) {
                const bonus = Math.min(hideSeekState.treatsFound * 6, 30);
                gameState.pet.happiness = clamp(gameState.pet.happiness + bonus, 0, 100);
                gameState.pet.energy = clamp(gameState.pet.energy - Math.min(hideSeekState.treatsFound * 2, 8), 0, 100);
                gameState.pet.hunger = clamp(gameState.pet.hunger + Math.min(hideSeekState.treatsFound * 2, 10), 0, 100);
                const coinReward = awardScaledMiniGameCoins('hideseek', hideSeekState.treatsFound, hideSeekState.difficulty);
                const previousBest = Number((gameState.minigameHighScores || {}).hideseek || 0);
                const isNewBest = updateMinigameHighScore('hideseek', hideSeekState.treatsFound);
                const bestMsg = isNewBest ? ' New best!' : '';

                updateNeedDisplays();
                updatePetMood();
                updateWellnessBar();
                saveGame();

                announce(`Hide and Seek over! ${hideSeekState.treatsFound} treats found! Happiness +${bonus}! Coins +${coinReward}!${bestMsg}`);
                if (isNewBest) {
                    showToast(`New high score in Hide & Seek: ${hideSeekState.treatsFound}!`, '#FFD700');
                    showMinigameConfetti();
                    showHighScoreBanner('Hide & Seek', hideSeekState.treatsFound);
                } else if (hideSeekState.treatsFound > 0) {
                    showMinigameConfetti();
                }
                showMiniGameSummaryCard({
                    gameName: 'Hide & Seek',
                    score: hideSeekState.treatsFound,
                    coinReward,
                    statChanges: [
                        { label: 'Happiness', value: bonus },
                        { label: 'Energy', value: -Math.min(hideSeekState.treatsFound * 2, 8) },
                        { label: 'Hunger', value: Math.min(hideSeekState.treatsFound * 2, 10) }
                    ],
                    isNewBest,
                    personalBest: isNewBest ? Math.max(hideSeekState.treatsFound, previousBest) : null,
                    medal: getMiniGameMedal(hideSeekState.treatsFound, { bronze: 2, silver: 4, gold: 6 })
                });
            } else {
                restorePostMiniGameState();
            }
            hideSeekState = null;
        }

        // ==================== BUBBLE POP MINI-GAME ====================

        let bubblePopState = null;

        const BUBBLE_SIZES = [
            { size: 58, points: 1 },
            { size: 50, points: 2 },
            { size: 44, points: 3 }
        ];

        const BUBBLE_SPLASH_EMOJIS = ['💧', '✨', '💦', '🫧', '🧼'];

        function startBubblePopGame() {
            if (!gameState.pet) return;

            const existing = document.querySelector('.bubblepop-game-overlay');
            if (existing) existing.remove();

            const bubbleDiff = getEscalatedMinigameDifficulty('bubblepop');
            bubblePopState = {
                score: 0,
                timeLeft: 30,
                bubbles: [],
                bubbleIdCounter: 0,
                spawnInterval: null,
                timerInterval: null,
                floatIntervals: [],
                difficulty: bubbleDiff,
                active: true
            };

            renderBubblePopGame();
            startBubblePopTimer();
            startBubbleSpawner();

            announce('Bubble Pop! Click or tap the bubbles to pop them! 30 seconds!');
        }

        function renderBubblePopGame() {
            const overlay = document.createElement('div');
            overlay.className = 'bubblepop-game-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Bubble Pop mini-game');

            const pet = gameState.pet;
            const mood = getMood(pet);
            const petSVG = generatePetSVG(pet, mood);

            overlay.innerHTML = `
                <div class="bubblepop-game">
                    <h2 class="bubblepop-game-title">🫧 Bubble Pop!</h2>
                    <p class="bubblepop-game-score" id="bubblepop-score" aria-live="polite">Bubbles popped: 0</p>
                    <p class="bubblepop-game-timer" id="bubblepop-timer">⏱️ 30s</p>
                    <div class="bubblepop-field" id="bubblepop-field" aria-label="Bath area - click or tap bubbles to pop them">
                        <div class="bubblepop-suds"></div>
                        <div class="bubblepop-pet" id="bubblepop-pet">${petSVG}</div>
                    </div>
                    <p class="bubblepop-instruction" id="bubblepop-instruction" aria-live="polite">Click or tap the bubbles to pop them! Use Tab to navigate between bubbles.</p>
                    <div class="bubblepop-buttons">
                        <button class="bubblepop-done-btn" id="bubblepop-done" aria-label="Stop playing Bubble Pop">Done</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            // Delegated event handlers on the field for bubble clicks/keyboard (Item 3 - keyboard accessible)
            const field = overlay.querySelector('#bubblepop-field');
            if (field) {
                field.addEventListener('click', (e) => {
                    const bubble = e.target.closest('.bubblepop-bubble');
                    if (bubble) {
                        e.stopPropagation();
                        popBubble(bubble);
                    }
                });
                field.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        const bubble = e.target.closest('.bubblepop-bubble');
                        if (bubble) {
                            e.preventDefault();
                            popBubble(bubble);
                        }
                    }
                    // Arrow key navigation between bubbles
                    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        const bubbles = Array.from(field.querySelectorAll('.bubblepop-bubble:not(.popping)'));
                        if (bubbles.length === 0) return;
                        const current = document.activeElement;
                        const idx = bubbles.indexOf(current);
                        const forward = e.key === 'ArrowRight' || e.key === 'ArrowDown';
                        const next = forward ? bubbles[(idx + 1) % bubbles.length] : bubbles[(idx - 1 + bubbles.length) % bubbles.length];
                        if (next) next.focus();
                    }
                });
            }

            // Done button
            overlay.querySelector('#bubblepop-done').addEventListener('click', () => {
                endBubblePopGame();
            });

            // Close on overlay click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    requestMiniGameExit(bubblePopState ? bubblePopState.score : 0, () => endBubblePopGame());
                }
            });

            // Escape to close
            function bubblePopEscapeHandler() {
                requestMiniGameExit(bubblePopState ? bubblePopState.score : 0, () => endBubblePopGame());
            }
            pushModalEscape(bubblePopEscapeHandler);
            bubblePopState._escapeHandler = bubblePopEscapeHandler;
            trapFocus(overlay);

            // Focus done button
            overlay.querySelector('#bubblepop-done').focus();

            // Spawn initial batch of bubbles after the overlay has been laid out
            // to avoid zero-dimension reads from offsetWidth/offsetHeight.
            if (!bubblePopState._initialSpawnTimers) bubblePopState._initialSpawnTimers = [];
            requestAnimationFrame(() => {
                if (!bubblePopState) return;
                for (let i = 0; i < 5; i++) {
                    const id = setTimeout(() => spawnBubble(), i * 200);
                    bubblePopState._initialSpawnTimers.push(id);
                }
            });
        }

        function startBubblePopTimer() {
            if (!bubblePopState) return;

            bubblePopState.timerInterval = setInterval(() => {
                if (!bubblePopState || !bubblePopState.active) return;

                bubblePopState.timeLeft--;
                const timerEl = document.getElementById('bubblepop-timer');
                if (timerEl) {
                    timerEl.textContent = `⏱️ ${bubblePopState.timeLeft}s`;
                    if (bubblePopState.timeLeft <= 5) {
                        timerEl.style.color = '#EF5350';
                        timerEl.style.fontWeight = 'bold';
                        if (bubblePopState.timeLeft === 5) {
                            announce('5 seconds left!');
                        }
                    }
                }

                if (bubblePopState.timeLeft <= 0) {
                    bubblePopState.active = false;
                    finishBubblePopRound();
                }
            }, 1000);
        }

        function startBubbleSpawner() {
            if (!bubblePopState) return;

            const spawnRate = Math.max(300, Math.round(800 / (bubblePopState.difficulty || 1)));
            bubblePopState.spawnInterval = setInterval(() => {
                if (!bubblePopState || !bubblePopState.active) return;

                const field = document.getElementById('bubblepop-field');
                if (!field) return;

                // Keep bubbles on screen — max scales with difficulty
                const maxBubbles = Math.min(8 + Math.floor(((bubblePopState.difficulty || 1) - 1) * 5), 14);
                const currentBubbles = field.querySelectorAll('.bubblepop-bubble:not(.popping)');
                if (currentBubbles.length < maxBubbles) {
                    spawnBubble();
                }
            }, spawnRate);
        }

        function spawnBubble() {
            if (!bubblePopState || !bubblePopState.active) return;

            const field = document.getElementById('bubblepop-field');
            if (!field) return;

            const sizeData = BUBBLE_SIZES[Math.floor(Math.random() * BUBBLE_SIZES.length)];
            const bubbleSize = sizeData.size;
            const fieldW = field.offsetWidth;
            const fieldH = field.offsetHeight;

            // Skip if the field hasn't been laid out yet (dimensions are 0)
            if (fieldW === 0 || fieldH === 0) return;

            // Random position, keep within bounds and above the pet
            const x = Math.random() * (fieldW - bubbleSize - 10) + 5;
            const y = Math.random() * (fieldH - bubbleSize - 80) + 5;

            const bubbleId = bubblePopState.bubbleIdCounter++;

            const bubble = document.createElement('div');
            bubble.className = 'bubblepop-bubble';
            bubble.setAttribute('role', 'button');
            bubble.setAttribute('aria-label', `Bubble - click or tap to pop`);
            bubble.setAttribute('tabindex', '0');
            bubble.dataset.bubbleId = bubbleId;
            bubble.dataset.points = sizeData.points;

            bubble.style.width = `${bubbleSize}px`;
            bubble.style.height = `${bubbleSize}px`;
            bubble.style.left = `${x}px`;
            bubble.style.top = `${y}px`;
            bubble.style.opacity = '0';
            bubble.style.transform = 'scale(0)';

            field.appendChild(bubble);

            // Animate in
            requestAnimationFrame(() => {
                bubble.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                bubble.style.opacity = '1';
                bubble.style.transform = 'scale(1)';
            });

            // Gentle floating animation with random offset (skip if user prefers reduced motion)
            const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (!prefersReducedMotion) {
                const floatDuration = 2 + Math.random() * 2;
                const floatDelay = Math.random() * 2;
                bubble.style.animation = `bubbleFloat ${floatDuration}s ease-in-out ${floatDelay}s infinite`;
            }

            // Click/keyboard handled by delegated listener on the field

            // Auto-remove bubble after a while if not popped — shorter at higher difficulty
            const bubbleLifetime = Math.max(2000, Math.round((4000 + Math.random() * 3000) / (bubblePopState.difficulty || 1)));
            if (!bubblePopState._bubbleRemovalTimers) bubblePopState._bubbleRemovalTimers = [];
            const removalId = setTimeout(() => {
                if (bubble.parentNode && !bubble.classList.contains('popping')) {
                    bubble.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                    bubble.style.opacity = '0';
                    bubble.style.transform = 'scale(0.5)';
                    setTimeout(() => {
                        if (bubble.parentNode) bubble.remove();
                    }, 500);
                }
                // Remove fired timer from array to prevent unbounded growth
                if (bubblePopState && bubblePopState._bubbleRemovalTimers) {
                    const idx = bubblePopState._bubbleRemovalTimers.indexOf(removalId);
                    if (idx !== -1) bubblePopState._bubbleRemovalTimers.splice(idx, 1);
                }
            }, bubbleLifetime);
            bubblePopState._bubbleRemovalTimers.push(removalId);
        }

        function popBubble(bubble) {
            if (!bubblePopState || !bubblePopState.active) return;
            if (bubble.classList.contains('popping')) return;

            bubble.classList.add('popping');
            const points = parseInt(bubble.dataset.points) || 1;

            bubblePopState.score += points;
            if (typeof hapticBuzz === 'function') hapticBuzz(30);
            if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.bubblePop);

            // Update score display
            const scoreEl = document.getElementById('bubblepop-score');
            if (scoreEl) {
                scoreEl.textContent = `Bubbles popped: ${bubblePopState.score}`;
            }

            // Show splash effect
            const field = document.getElementById('bubblepop-field');
            if (field) {
                const splash = document.createElement('div');
                splash.className = 'bubblepop-splash';
                splash.textContent = randomFromArray(BUBBLE_SPLASH_EMOJIS);
                splash.style.left = bubble.style.left;
                splash.style.top = bubble.style.top;
                field.appendChild(splash);
                setTimeout(() => splash.remove(), 600);

                // Show point reward
                const reward = document.createElement('div');
                reward.className = 'bubblepop-reward';
                reward.textContent = `+${points}`;
                reward.style.left = `${parseInt(bubble.style.left) + 10}px`;
                reward.style.top = `${parseInt(bubble.style.top) - 5}px`;
                field.appendChild(reward);
                setTimeout(() => reward.remove(), 1000);
            }

            // Make pet react on milestones
            if (bubblePopState.score % 5 === 0) {
                const petEl = document.getElementById('bubblepop-pet');
                if (petEl) {
                    petEl.classList.add('splashing');
                    setTimeout(() => petEl.classList.remove('splashing'), 400);
                }

                const instruction = document.getElementById('bubblepop-instruction');
                if (instruction) {
                    const messages = ['Splashy!', 'So bubbly!', 'Pop pop pop!', 'Bath time fun!', 'Squeaky clean!', 'Bubble master!'];
                    const msg = randomFromArray(messages);
                    instruction.textContent = msg;
                    instruction.classList.add('highlight');
                    setTimeout(() => instruction.classList.remove('highlight'), 500);
                    announce(`${msg} ${bubblePopState.score} bubbles popped!`);
                }
            }

            // Remove bubble after pop animation
            setTimeout(() => {
                if (bubble.parentNode) bubble.remove();
            }, 350);
        }

        function finishBubblePopRound() {
            if (!bubblePopState) return;
            if (bubblePopState._finishing) return;
            bubblePopState._finishing = true;

            // Stop spawning
            if (bubblePopState.timerInterval) clearInterval(bubblePopState.timerInterval);
            if (bubblePopState.spawnInterval) clearInterval(bubblePopState.spawnInterval);

            // Pop all remaining bubbles for a satisfying finale
            const field = document.getElementById('bubblepop-field');
            if (field) {
                const remaining = field.querySelectorAll('.bubblepop-bubble:not(.popping)');
                remaining.forEach((bubble, i) => {
                    setTimeout(() => {
                        bubble.classList.add('popping');
                        const splash = document.createElement('div');
                        splash.className = 'bubblepop-splash';
                        splash.textContent = '💧';
                        splash.style.left = bubble.style.left;
                        splash.style.top = bubble.style.top;
                        field.appendChild(splash);
                        setTimeout(() => splash.remove(), 600);
                        setTimeout(() => { if (bubble.parentNode) bubble.remove(); }, 350);
                    }, i * 100);
                });
            }

            // Update instruction
            const instruction = document.getElementById('bubblepop-instruction');
            if (instruction) {
                instruction.textContent = `🛁 Bath time over! ${bubblePopState.score} bubbles popped!`;
                instruction.classList.add('highlight');
                announce(`Bath time over! ${bubblePopState.score} bubbles popped!`);
            }

            // Auto-end after showing results
            if (!bubblePopState._autoEndTimeout) {
                bubblePopState._autoEndTimeout = setTimeout(() => endBubblePopGame(), 2500);
            }
        }

        function endBubblePopGame() {
            if (!bubblePopState) {
                dismissMiniGameExitDialog();
                return;
            }
            if (bubblePopState._ending) return;
            bubblePopState._ending = true;
            dismissMiniGameExitDialog();

            if (bubblePopState && bubblePopState.timerInterval) clearInterval(bubblePopState.timerInterval);
            if (bubblePopState && bubblePopState.spawnInterval) clearInterval(bubblePopState.spawnInterval);
            if (bubblePopState && bubblePopState._autoEndTimeout) clearTimeout(bubblePopState._autoEndTimeout);
            if (bubblePopState && bubblePopState._initialSpawnTimers) {
                bubblePopState._initialSpawnTimers.forEach(id => clearTimeout(id));
            }
            if (bubblePopState && bubblePopState._bubbleRemovalTimers) {
                bubblePopState._bubbleRemovalTimers.forEach(id => clearTimeout(id));
            }

            if (bubblePopState && bubblePopState._escapeHandler) {
                popModalEscape(bubblePopState._escapeHandler);
            }

            const overlay = document.querySelector('.bubblepop-game-overlay');
            if (overlay) { overlay.innerHTML = ''; overlay.remove(); }

            incrementMinigamePlayCount('bubblepop', bubblePopState ? bubblePopState.score : 0);

            // Apply rewards: bath-themed game boosts cleanliness and happiness
            if (bubblePopState && bubblePopState.score > 0 && gameState.pet) {
                const happinessBonus = Math.min(bubblePopState.score, 30);
                const cleanlinessBonus = Math.min(Math.floor(bubblePopState.score * 1.5), 30);

                gameState.pet.happiness = clamp(gameState.pet.happiness + happinessBonus, 0, 100);
                gameState.pet.cleanliness = clamp(gameState.pet.cleanliness + cleanlinessBonus, 0, 100);
                gameState.pet.energy = clamp(gameState.pet.energy - Math.min(bubblePopState.score, 10), 0, 100);
                const coinReward = awardScaledMiniGameCoins('bubblepop', bubblePopState.score, bubblePopState.difficulty);
                const previousBest = Number((gameState.minigameHighScores || {}).bubblepop || 0);
                const isNewBest = updateMinigameHighScore('bubblepop', bubblePopState.score);
                const bestMsg = isNewBest ? ' New best!' : '';

                updateNeedDisplays();
                updatePetMood();
                updateWellnessBar();
                saveGame();

                announce(`Bubble Pop over! ${bubblePopState.score} bubbles popped! Happiness +${happinessBonus}! Cleanliness +${cleanlinessBonus}! Coins +${coinReward}!${bestMsg}`);
                if (isNewBest) {
                    showToast(`New high score in Bubble Pop: ${bubblePopState.score}!`, '#FFD700');
                    showMinigameConfetti();
                    showHighScoreBanner('Bubble Pop', bubblePopState.score);
                } else if (bubblePopState.score > 0) {
                    showMinigameConfetti();
                }
                showMiniGameSummaryCard({
                    gameName: 'Bubble Pop',
                    score: bubblePopState.score,
                    coinReward,
                    statChanges: [
                        { label: 'Happiness', value: happinessBonus },
                        { label: 'Cleanliness', value: cleanlinessBonus },
                        { label: 'Energy', value: -Math.min(bubblePopState.score, 10) }
                    ],
                    isNewBest,
                    personalBest: isNewBest ? Math.max(bubblePopState.score, previousBest) : null,
                    medal: getMiniGameMedal(bubblePopState.score, { bronze: 10, silver: 20, gold: 35 })
                });
            } else {
                restorePostMiniGameState();
            }
            bubblePopState = null;
        }

        // ==================== MATCHING MINI-GAME ====================

        const MATCHING_ITEMS = [
            { emoji: '🍎', name: 'Apple' },
            { emoji: '🥕', name: 'Carrot' },
            { emoji: '🍌', name: 'Banana' },
            { emoji: '🧀', name: 'Cheese' },
            { emoji: '🦴', name: 'Bone' },
            { emoji: '🐟', name: 'Fish' },
            { emoji: '🎀', name: 'Bow' },
            { emoji: '🧸', name: 'Teddy' },
            { emoji: '⭐', name: 'Star' },
            { emoji: '🎾', name: 'Ball' },
            { emoji: '🌸', name: 'Flower' },
            { emoji: '🍖', name: 'Meat' }
        ];

        let matchingState = null;

        function matchingCardAriaLabel(card, index) {
            if (!card) return `Card ${index + 1}.`;
            if (card.matched) return `Card ${index + 1}: ${card.name}. Matched pair.`;
            if (card.flipped) return `Card ${index + 1}: ${card.name}. Revealed.`;
            return `Card ${index + 1}. Face down. Activate to reveal.`;
        }

        function announceMatchingLive(message) {
            const live = document.getElementById('matching-live');
            if (live) live.textContent = message;
        }

        function startMatchingGame() {
            if (!gameState.pet) {
                if (typeof showToast === 'function') {
                    showToast('You need a pet to play this game.', '#FFA726');
                }
                return;
            }

            const existing = document.querySelector('.matching-game-overlay');
            if (existing) existing.remove();

            const matchDiff = getEscalatedMinigameDifficulty('matching');
            const deckPool = getPackedMatchingDeckPool(MATCHING_ITEMS);
            const selectedDeck = getMiniGameContentSelection('matching', 'decks', deckPool, {
                recentWindow: 3,
                idKey: 'id'
            }) || deckPool[0] || { id: 'base_matching', theme: 'Classic', pairs: [] };
            const ruleModifier = getMinigameRuleModifier('matching');
            const deckPairs = Array.isArray(selectedDeck.pairs) ? selectedDeck.pairs : [];
            const pairCapBonus = Math.max(0, Math.floor(Number(ruleModifier && ruleModifier.effect && ruleModifier.effect.extraPairs) || 0));
            // Scale pairs: 6 at base, up to 10 at max difficulty (capped by available items)
            const pairCount = Math.min(6 + Math.floor((matchDiff - 1) * 4) + pairCapBonus, deckPairs.length || MATCHING_ITEMS.length);

            // Pick random items to make pairs — assign a pairId so matching is
            // based on pair identity rather than emoji equality alone.
            const shuffledItems = shuffleArray(deckPairs.map((pair, idx) => ({
                id: pair.id || `pair_${idx + 1}`,
                emoji: pair.emoji,
                name: pair.name || pair.label || `Pair ${idx + 1}`
            })));
            const selected = shuffledItems.slice(0, pairCount);
            const paired = selected.flatMap((item, i) => [
                { ...item, pairId: i },
                { ...item, pairId: i }
            ]);
            const cards = shuffleArray(paired)
                .map((item, index) => ({
                    id: index,
                    emoji: item.emoji,
                    name: item.name,
                    pairId: item.pairId,
                    flipped: false,
                    matched: false
                }));

            matchingState = {
                cards: cards,
                flippedCards: [],
                matchesFound: 0,
                totalPairs: pairCount,
                moves: 0,
                difficulty: matchDiff,
                deck: selectedDeck,
                ruleModifier,
                locked: false,
                _timeouts: []
            };

            renderMatchingGame();
            const modNote = ruleModifier && ruleModifier.name ? ` Rule: ${ruleModifier.name}.` : '';
            announce(`Matching game started! Theme: ${selectedDeck.theme || 'Classic'}. Flip cards to find matching pairs!${modNote}`);
        }

        function renderMatchingGame() {
            const overlay = document.createElement('div');
            overlay.className = 'matching-game-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Matching mini-game');

            let cardsHTML = '';
            matchingState.cards.forEach((card, i) => {
                cardsHTML += `
                    <button class="matching-card" data-index="${i}" aria-label="${matchingCardAriaLabel(card, i)}" aria-pressed="false">
                        <div class="matching-card-inner">
                            <div class="matching-card-front">❓</div>
                            <div class="matching-card-back">${card.emoji}</div>
                        </div>
                    </button>
                `;
            });

            overlay.innerHTML = `
                <div class="matching-game">
                    <h2 class="matching-game-title">🃏 Matching Game${matchingState.deck && matchingState.deck.theme ? ` · ${escapeHTML(matchingState.deck.theme)}` : ''}!</h2>
                    <p class="matching-game-score" id="matching-score" aria-live="polite">Pairs found: 0 / ${matchingState.totalPairs}</p>
                    <p class="matching-game-moves" id="matching-moves">Moves: 0</p>
                    <p class="sr-only" id="matching-live" aria-live="assertive" aria-atomic="true"></p>
                    <div class="matching-grid" id="matching-grid">
                        ${cardsHTML}
                    </div>
                    <p class="matching-instruction" id="matching-instruction">${matchingState.ruleModifier && matchingState.ruleModifier.name ? `Rule: ${escapeHTML(matchingState.ruleModifier.name)}. ` : ''}Flip two cards to find a match!</p>
                    <div class="matching-buttons">
                        <button class="matching-done-btn" id="matching-done" aria-label="Stop playing Matching Game">Done</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            // Card click listeners
            overlay.querySelectorAll('.matching-card').forEach(card => {
                card.addEventListener('click', () => {
                    const index = parseInt(card.getAttribute('data-index'));
                    flipMatchingCard(index);
                });
            });

            // Done button
            overlay.querySelector('#matching-done').addEventListener('click', () => {
                endMatchingGame();
            });

            // Close on overlay click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    requestMiniGameExit(matchingState ? matchingState.matchesFound : 0, () => endMatchingGame());
                }
            });

            // Escape to close
            function matchingEscapeHandler() {
                requestMiniGameExit(matchingState ? matchingState.matchesFound : 0, () => endMatchingGame());
            }
            pushModalEscape(matchingEscapeHandler);
            matchingState._escapeHandler = matchingEscapeHandler;
            trapFocus(overlay);

            // Focus first card
            const firstCard = overlay.querySelector('.matching-card');
            if (firstCard) firstCard.focus();
        }

        function flipMatchingCard(index) {
            if (!matchingState || matchingState.locked) return;

            const card = matchingState.cards[index];
            if (card.flipped || card.matched) return;

            // Flip the card
            card.flipped = true;
            matchingState.flippedCards.push(index);

            const cardEl = document.querySelector(`.matching-card[data-index="${index}"]`);
            if (cardEl) {
                cardEl.classList.add('flipped');
                cardEl.setAttribute('aria-label', matchingCardAriaLabel(card, index));
                cardEl.setAttribute('aria-pressed', 'true');
            }
            announceMatchingLive(`Card ${index + 1} reveals ${card.name}.`);

            // Check if two cards are flipped
            if (matchingState.flippedCards.length === 2) {
                matchingState.moves++;
                matchingState.locked = true;

                const movesEl = document.getElementById('matching-moves');
                if (movesEl) movesEl.textContent = `Moves: ${matchingState.moves}`;

                const [first, second] = matchingState.flippedCards;
                const card1 = matchingState.cards[first];
                const card2 = matchingState.cards[second];

                if (card1.pairId === card2.pairId) {
                    // Match found!
                    card1.matched = true;
                    card2.matched = true;
                    matchingState.matchesFound++;
                    if (typeof hapticBuzz === 'function') hapticBuzz(50);
                    if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.match);

                    const scoreEl = document.getElementById('matching-score');
                    if (scoreEl) scoreEl.textContent = `Pairs found: ${matchingState.matchesFound} / ${matchingState.totalPairs}`;

                    // Mark cards as matched visually
                    const el1 = document.querySelector(`.matching-card[data-index="${first}"]`);
                    const el2 = document.querySelector(`.matching-card[data-index="${second}"]`);
                    if (el1) {
                        el1.classList.add('matched');
                        el1.setAttribute('aria-label', matchingCardAriaLabel(card1, first));
                        el1.setAttribute('aria-pressed', 'true');
                        el1.setAttribute('aria-disabled', 'true');
                    }
                    if (el2) {
                        el2.classList.add('matched');
                        el2.setAttribute('aria-label', matchingCardAriaLabel(card2, second));
                        el2.setAttribute('aria-pressed', 'true');
                        el2.setAttribute('aria-disabled', 'true');
                    }
                    announceMatchingLive(`${card1.name} pair matched.`);

                    // Show encouraging message
                    const instruction = document.getElementById('matching-instruction');
                    if (instruction) {
                        const messages = ['Great match!', 'You found one!', 'Awesome!', 'Well done!', 'Nice pair!', 'Super!'];
                        const msg = randomFromArray(messages);
                        instruction.textContent = msg;
                        instruction.classList.add('highlight');
                        setTimeout(() => instruction.classList.remove('highlight'), 500);
                        announce(`${msg} ${matchingState.matchesFound} of ${matchingState.totalPairs} pairs found.`);
                    }

                    matchingState.flippedCards = [];
                    matchingState.locked = false;

                    // Check if game is complete
                    if (matchingState.matchesFound === matchingState.totalPairs) {
                        matchingState._timeouts.push(setTimeout(() => finishMatchingGame(), 600));
                    }
                } else {
                    // No match - flip back after a delay
                    if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.miss);
                    matchingState._timeouts.push(setTimeout(() => {
                        if (!matchingState) return;
                        card1.flipped = false;
                        card2.flipped = false;

                        const el1 = document.querySelector(`.matching-card[data-index="${first}"]`);
                        const el2 = document.querySelector(`.matching-card[data-index="${second}"]`);
                        if (el1) {
                            el1.classList.remove('flipped');
                            el1.setAttribute('aria-label', matchingCardAriaLabel(card1, first));
                            el1.setAttribute('aria-pressed', 'false');
                        }
                        if (el2) {
                            el2.classList.remove('flipped');
                            el2.setAttribute('aria-label', matchingCardAriaLabel(card2, second));
                            el2.setAttribute('aria-pressed', 'false');
                        }
                        announceMatchingLive(`No match. ${card1.name} and ${card2.name}.`);

                        const instruction = document.getElementById('matching-instruction');
                        if (instruction) {
                            const messages = ['Try again!', 'Keep looking!', 'Almost!', 'Not quite!', 'So close!'];
                            const msg = randomFromArray(messages);
                            instruction.textContent = msg;
                            announce(msg);
                        }

                        matchingState.flippedCards = [];
                        matchingState.locked = false;
                    }, 800));
                }
            }
        }

        function finishMatchingGame() {
            if (!matchingState) return;
            if (matchingState._finishing) return;
            matchingState._finishing = true;

            const instruction = document.getElementById('matching-instruction');
            if (instruction) {
                const moves = matchingState.moves;
                const pairs = matchingState.totalPairs || 6;
                let message = '🎉 You matched them all! ';
                if (moves <= pairs) message += 'Amazing memory!';
                else if (moves <= pairs * 1.5) message += 'Great job!';
                else if (moves <= pairs * 2.5) message += 'Well done!';
                else message += 'You did it!';
                instruction.textContent = message;
                instruction.classList.add('highlight');
            }

            // Celebrate animation on all cards
            document.querySelectorAll('.matching-card.matched').forEach((card, i) => {
                setTimeout(() => {
                    card.classList.add('celebrating');
                }, i * 80);
            });

            if (!matchingState._autoEndTimeout) {
                matchingState._autoEndTimeout = setTimeout(() => endMatchingGame(), 2500);
            }
        }

        function endMatchingGame() {
            if (!matchingState) {
                dismissMiniGameExitDialog();
                return;
            }
            if (matchingState._ending) return;
            matchingState._ending = true;
            dismissMiniGameExitDialog();

            if (matchingState && matchingState._autoEndTimeout) clearTimeout(matchingState._autoEndTimeout);
            if (matchingState && matchingState._escapeHandler) {
                popModalEscape(matchingState._escapeHandler);
            }
            if (matchingState && matchingState._timeouts) {
                matchingState._timeouts.forEach(id => clearTimeout(id));
            }

            const overlay = document.querySelector('.matching-game-overlay');
            if (overlay) { overlay.innerHTML = ''; overlay.remove(); }

            incrementMinigamePlayCount('matching', matchingState ? matchingState.matchesFound : 0);

            // Apply rewards based on performance
            if (matchingState && matchingState.matchesFound > 0 && gameState.pet) {
                const happinessBonus = Math.min(matchingState.matchesFound * 5, 30);
                const energyCost = Math.min(matchingState.moves, 10);

                gameState.pet.happiness = clamp(gameState.pet.happiness + happinessBonus, 0, 100);
                gameState.pet.energy = clamp(gameState.pet.energy - energyCost, 0, 100);

                // Score for matching: fewer moves = better. Use pairs * 100 / moves for a score ratio
                const matchScore = matchingState.matchesFound === matchingState.totalPairs
                    ? Math.max(1, Math.round(matchingState.totalPairs * 100 / matchingState.moves))
                    : 0;
                const coinBasis = Math.max(matchingState.matchesFound * 8, Math.round(matchScore / 5));
                const coinReward = awardScaledMiniGameCoins('matching', coinBasis, matchingState.difficulty);
                const previousBest = Number((gameState.minigameHighScores || {}).matching || 0);
                const isNewBest = matchScore > 0 && updateMinigameHighScore('matching', matchScore);
                const bestMsg = isNewBest ? ' New best!' : '';

                updateNeedDisplays();
                updatePetMood();
                updateWellnessBar();
                saveGame();

                announce(`Matching Game over! ${matchingState.matchesFound} pairs found in ${matchingState.moves} moves! Happiness +${happinessBonus}! Coins +${coinReward}!${bestMsg}`);
                if (isNewBest) {
                    showToast(`New high score in Matching: ${matchScore}!`, '#FFD700');
                    showMinigameConfetti();
                    showHighScoreBanner('Matching', matchScore);
                } else if (matchingState.matchesFound > 0) {
                    showMinigameConfetti();
                }
                showMiniGameSummaryCard({
                    gameName: 'Matching',
                    score: matchScore,
                    coinReward,
                    statChanges: [
                        { label: 'Pairs', value: matchingState.matchesFound },
                        { label: 'Moves', value: -matchingState.moves },
                        { label: 'Happiness', value: happinessBonus },
                        { label: 'Energy', value: -energyCost }
                    ],
                    isNewBest,
                    personalBest: isNewBest ? Math.max(matchScore, previousBest) : null,
                    medal: getMiniGameMedal(matchScore, { bronze: 40, silver: 65, gold: 90 })
                });
            } else {
                restorePostMiniGameState();
            }
            matchingState = null;
        }

        // ==================== SIMON SAYS MINI-GAME ====================

        const SIMON_COLORS = ['green', 'red', 'yellow', 'blue'];
        const SIMON_ICONS = { green: '🟢', red: '🔴', yellow: '🟡', blue: '🔵' };
        const SIMON_FREQUENCIES = { green: 392, red: 523.25, yellow: 659.25, blue: 783.99 };

        let simonState = null;

        function simonGetAudioCtx() {
            if (typeof GameAudio !== 'undefined' && GameAudio.getContext) {
                return GameAudio.getContext();
            }
            return null;
        }

        function simonPlayTone(color, duration) {
            if (typeof GameAudio !== 'undefined' && !GameAudio.getEnabled()) return;
            try {
                if (typeof GameAudio !== 'undefined' && typeof GameAudio.playMiniGameTone === 'function') {
                    GameAudio.playMiniGameTone({
                        bus: 'gameplay',
                        type: 'sine',
                        frequency: SIMON_FREQUENCIES[color],
                        durationMs: duration,
                        gain: 0.22
                    });
                    return;
                }
                const ctx = simonGetAudioCtx();
                if (!ctx) return;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = SIMON_FREQUENCIES[color];
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
                osc.connect(gain);
                const dest = (typeof GameAudio !== 'undefined' && GameAudio.getBusInputNode && GameAudio.getBusInputNode('gameplay')) ||
                    (typeof GameAudio !== 'undefined' && GameAudio.getMasterGain && GameAudio.getMasterGain());
                if (!dest) return;
                gain.connect(dest);
                osc.start();
                osc.stop(ctx.currentTime + duration / 1000);
                osc.onended = () => { osc.disconnect(); gain.disconnect(); };
            } catch (e) {
                // Audio not supported — game works visually without it
            }
        }

        function simonPlayErrorTone() {
            if (typeof GameAudio !== 'undefined' && !GameAudio.getEnabled()) return;
            try {
                if (typeof GameAudio !== 'undefined' && typeof GameAudio.playMiniGameTone === 'function') {
                    GameAudio.playMiniGameTone({
                        bus: 'gameplay',
                        type: 'sawtooth',
                        frequency: 150,
                        durationMs: 600,
                        gain: 0.2
                    });
                    if (typeof GameAudio.emitAccessibilityCue === 'function') {
                        GameAudio.emitAccessibilityCue('error', { playSound: false });
                    }
                    return;
                }
                const ctx = simonGetAudioCtx();
                if (!ctx) return;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.value = 150;
                gain.gain.setValueAtTime(0.25, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
                osc.connect(gain);
                const dest = (typeof GameAudio !== 'undefined' && GameAudio.getBusInputNode && GameAudio.getBusInputNode('gameplay')) ||
                    (typeof GameAudio !== 'undefined' && GameAudio.getMasterGain && GameAudio.getMasterGain());
                if (!dest) return;
                gain.connect(dest);
                osc.start();
                osc.stop(ctx.currentTime + 0.6);
                osc.onended = () => { osc.disconnect(); gain.disconnect(); };
            } catch (e) {
                // Audio not supported
            }
        }

        function startSimonSaysGame() {
            if (!gameState.pet) {
                if (typeof showToast === 'function') {
                    showToast('You need a pet to play this game.', '#FFA726');
                }
                return;
            }

            const existing = document.querySelector('.simonsays-game-overlay');
            if (existing) existing.remove();

            const simonDiff = getEscalatedMinigameDifficulty('simonsays');
            simonState = {
                pattern: [],
                playerIndex: 0,
                round: 0,
                score: 0,
                highestRound: 0,
                phase: 'watching', // 'watching', 'playing', 'gameover'
                playbackIndex: 0,
                playbackTimer: null,
                difficulty: simonDiff,
                active: true
            };

            renderSimonSaysGame();
            if (simonState._roundTransitionTimer) clearTimeout(simonState._roundTransitionTimer);
            simonState._roundTransitionTimer = setTimeout(() => simonNextRound(), 800);
            if (typeof GameAudio !== 'undefined' && typeof GameAudio.emitAccessibilityCue === 'function') {
                GameAudio.emitAccessibilityCue('objectiveStart', { playSound: false, caption: 'Simon Says started' });
            }

            announce('Simon Says! Watch the pattern, then repeat it!');
        }

        function renderSimonSaysGame() {
            const overlay = document.createElement('div');
            overlay.className = 'simonsays-game-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Simon Says mini-game');

            const pet = gameState.pet;
            const mood = getMood(pet);
            const petSVG = generatePetSVG(pet, mood);

            overlay.innerHTML = `
                <div class="simonsays-game">
                    <h2 class="simonsays-game-title">🎵 Simon Says!</h2>
                    <p class="simonsays-game-score" id="simon-score" aria-live="polite">Score: 0</p>
                    <p class="simonsays-game-round" id="simon-round">Round: 1</p>
                    <div class="simonsays-board">
                        <div class="simonsays-pad-container">
                            <button class="simonsays-pad disabled" data-color="green" aria-label="Green pad (triangle, top-left)"></button>
                            <button class="simonsays-pad disabled" data-color="red" aria-label="Red pad (circle, top-right)"></button>
                            <button class="simonsays-pad disabled" data-color="yellow" aria-label="Yellow pad (square, bottom-left)"></button>
                            <button class="simonsays-pad disabled" data-color="blue" aria-label="Blue pad (star, bottom-right)"></button>
                        </div>
                        <div class="simonsays-center">
                            <div class="simonsays-center-pet" id="simon-pet">${petSVG}</div>
                        </div>
                    </div>
                    <p class="simonsays-instruction watching" id="simon-instruction" aria-live="polite">Watch the pattern...</p>
                    <div class="simonsays-buttons">
                        <button class="simonsays-done-btn" id="simon-done" aria-label="Stop playing Simon Says">Done</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);
            if (typeof GameAudio !== 'undefined' && typeof GameAudio.emitAccessibilityCue === 'function') {
                GameAudio.emitAccessibilityCue('focusPlayfield', { playSound: false, caption: 'Focus on Simon game board' });
            }

            // Pad click listeners
            overlay.querySelectorAll('.simonsays-pad').forEach(pad => {
                pad.addEventListener('click', () => {
                    if (!simonState || simonState.phase !== 'playing') return;
                    const color = pad.getAttribute('data-color');
                    simonHandleInput(color);
                });
            });

            // Done button
            overlay.querySelector('#simon-done').addEventListener('click', () => {
                endSimonSaysGame();
            });

            // Close on overlay click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    const rounds = simonState ? (simonState.highestRound || 0) : 0;
                    requestMiniGameExit(rounds, () => endSimonSaysGame());
                }
            });

            // Escape to close
            function simonEscapeHandler() {
                const rounds = simonState ? (simonState.highestRound || 0) : 0;
                requestMiniGameExit(rounds, () => endSimonSaysGame());
            }
            pushModalEscape(simonEscapeHandler);
            simonState._escapeHandler = simonEscapeHandler;
            trapFocus(overlay);

            // Focus done button
            overlay.querySelector('#simon-done').focus();
        }

        function simonNextRound() {
            if (!simonState || !simonState.active) return;

            simonState.round++;
            simonState.playerIndex = 0;
            simonState.phase = 'watching';

            // Add a new random color to the pattern
            const nextColor = SIMON_COLORS[Math.floor(Math.random() * SIMON_COLORS.length)];
            simonState.pattern.push(nextColor);

            // Update round display
            const roundEl = document.getElementById('simon-round');
            if (roundEl) roundEl.textContent = `Round: ${simonState.round}`;

            // Update instruction
            const instruction = document.getElementById('simon-instruction');
            if (instruction) {
                instruction.textContent = 'Watch the pattern...';
                instruction.className = 'simonsays-instruction watching';
                announce(`Round ${simonState.round}. Watch the pattern.`);
            }

            // Disable pads during playback
            simonSetPadsDisabled(true);

            // Play the pattern
            simonState.playbackIndex = 0;
            const baseSpeed = Math.max(350, 600 - simonState.round * 25);
            const speed = Math.max(200, Math.round(baseSpeed / (simonState.difficulty || 1)));

            if (simonState._roundTransitionTimer) clearTimeout(simonState._roundTransitionTimer);
            simonState._roundTransitionTimer = setTimeout(() => simonPlayPattern(speed), 400);
        }

        function simonPlayPattern(speed) {
            if (!simonState || !simonState.active || simonState.phase !== 'watching') return;

            const idx = simonState.playbackIndex;
            if (idx >= simonState.pattern.length) {
                // Pattern playback done — player's turn
                simonState.phase = 'playing';
                simonState.playerIndex = 0;
                simonSetPadsDisabled(false);

                const instruction = document.getElementById('simon-instruction');
                if (instruction) {
                    instruction.textContent = 'Your turn! Repeat the pattern!';
                    instruction.className = 'simonsays-instruction your-turn';
                }
                announce('Your turn! Repeat the pattern.');
                return;
            }

            const color = simonState.pattern[idx];
            simonLightPad(color, speed * 0.7);
            simonPlayTone(color, speed * 0.7);

            simonState.playbackIndex++;
            simonState.playbackTimer = setTimeout(() => simonPlayPattern(speed), speed);
        }

        function simonLightPad(color, duration) {
            const pad = document.querySelector(`.simonsays-pad[data-color="${color}"]`);
            if (!pad) return;

            pad.classList.add('lit');
            setTimeout(() => pad.classList.remove('lit'), duration);
        }

        function simonSetPadsDisabled(disabled) {
            document.querySelectorAll('.simonsays-pad').forEach(pad => {
                if (disabled) {
                    pad.classList.add('disabled');
                    pad.disabled = true;
                    pad.setAttribute('aria-disabled', 'true');
                } else {
                    pad.classList.remove('disabled');
                    pad.disabled = false;
                    pad.removeAttribute('aria-disabled');
                }
            });
        }

        function simonHandleInput(color) {
            if (!simonState || simonState.phase !== 'playing') return;

            const expected = simonState.pattern[simonState.playerIndex];

            // Light the pad and play the tone regardless
            simonLightPad(color, 250);
            simonPlayTone(color, 250);

            if (color === expected) {
                // Correct!
                simonState.playerIndex++;
                simonState.score++;
                if (typeof hapticBuzz === 'function') hapticBuzz(30);

                // Update score
                const scoreEl = document.getElementById('simon-score');
                if (scoreEl) scoreEl.textContent = `Score: ${simonState.score}`;

                // Pet bounces on correct input
                const petEl = document.getElementById('simon-pet');
                if (petEl) {
                    petEl.classList.add('bouncing');
                    setTimeout(() => petEl.classList.remove('bouncing'), 400);
                }

                // Check if player completed the full pattern
                if (simonState.playerIndex >= simonState.pattern.length) {
                    simonState.highestRound = simonState.round;
                    simonState.phase = 'watching';
                    simonSetPadsDisabled(true);

                    const instruction = document.getElementById('simon-instruction');
                    if (instruction) {
                        const messages = ['Great job!', 'Well done!', 'Awesome!', 'Perfect!', 'Amazing!', 'Super!'];
                        instruction.textContent = randomFromArray(messages);
                        instruction.className = 'simonsays-instruction highlight';
                    }

                    announce(`Round ${simonState.round} complete!`);

                    // Next round after a brief pause
                    if (simonState._roundTransitionTimer) clearTimeout(simonState._roundTransitionTimer);
                    simonState._roundTransitionTimer = setTimeout(() => simonNextRound(), 1000);
                }
            } else {
                // Wrong!
                simonState.phase = 'gameover';
                simonPlayErrorTone();
                simonSetPadsDisabled(true);

                // Flash all pads to indicate error
                document.querySelectorAll('.simonsays-pad').forEach(pad => {
                    pad.classList.add('lit');
                    setTimeout(() => pad.classList.remove('lit'), 500);
                });

                const instruction = document.getElementById('simon-instruction');
                if (instruction) {
                    const completedRound = simonState.highestRound || (simonState.round - 1);
                    let message = completedRound > 0
                        ? `Oops! You completed ${completedRound} round${completedRound !== 1 ? 's' : ''}! `
                        : 'Oops! ';
                    if (completedRound >= 8) message += 'Incredible memory!';
                    else if (completedRound >= 5) message += 'Great job!';
                    else if (completedRound >= 3) message += 'Nice try!';
                    else message += 'Keep practicing!';
                    instruction.textContent = message;
                    instruction.className = 'simonsays-instruction wrong';
                }

                const completedRound = simonState.highestRound || (simonState.round - 1);
                announce(`Game over! You completed ${completedRound} round${completedRound !== 1 ? 's' : ''}.`);

                // Auto-end after showing result
                if (simonState._autoEndTimeout) clearTimeout(simonState._autoEndTimeout);
                simonState._autoEndTimeout = setTimeout(() => endSimonSaysGame(), 2500);
            }
        }

        function endSimonSaysGame() {
            if (!simonState) {
                dismissMiniGameExitDialog();
                return;
            }
            if (simonState._ending) return;
            simonState._ending = true;
            dismissMiniGameExitDialog();

            if (simonState && simonState.playbackTimer) clearTimeout(simonState.playbackTimer);
            if (simonState && simonState._autoEndTimeout) clearTimeout(simonState._autoEndTimeout);
            if (simonState && simonState._roundTransitionTimer) clearTimeout(simonState._roundTransitionTimer);

            if (simonState && simonState._escapeHandler) {
                popModalEscape(simonState._escapeHandler);
            }

            const overlay = document.querySelector('.simonsays-game-overlay');
            if (overlay) { overlay.innerHTML = ''; overlay.remove(); }
            if (typeof GameAudio !== 'undefined' && typeof GameAudio.emitAccessibilityCue === 'function') {
                GameAudio.emitAccessibilityCue('objectiveEnd', { playSound: false, caption: 'Simon Says ended' });
            }

            incrementMinigamePlayCount('simonsays', simonState ? simonState.score : 0);

            // Apply rewards based on rounds completed
            if (simonState && simonState.score > 0 && gameState.pet) {
                const roundsCompleted = Math.max(simonState.highestRound || 0, 0);
                const happinessBonus = Math.min(roundsCompleted * 4, 30);
                const energyCost = Math.min(roundsCompleted * 2, 10);

                gameState.pet.happiness = clamp(gameState.pet.happiness + happinessBonus, 0, 100);
                gameState.pet.energy = clamp(gameState.pet.energy - energyCost, 0, 100);
                const coinReward = awardScaledMiniGameCoins('simonsays', roundsCompleted * 10, simonState.difficulty);
                const previousBest = Number((gameState.minigameHighScores || {}).simonsays || 0);
                const isNewBest = updateMinigameHighScore('simonsays', roundsCompleted);
                const bestMsg = isNewBest ? ' New best!' : '';

                updateNeedDisplays();
                updatePetMood();
                updateWellnessBar();
                saveGame();

                announce(`Simon Says over! Reached round ${roundsCompleted}! Happiness +${happinessBonus}! Coins +${coinReward}!${bestMsg}`);
                if (isNewBest) {
                    showToast(`New high score in Simon Says: Round ${roundsCompleted}!`, '#FFD700');
                    showMinigameConfetti();
                    showHighScoreBanner('Simon Says', 'Round ' + roundsCompleted);
                } else if (simonState.score > 0) {
                    showMinigameConfetti();
                }
                showMiniGameSummaryCard({
                    gameName: 'Simon Says',
                    score: roundsCompleted,
                    coinReward,
                    statChanges: [
                        { label: 'Happiness', value: happinessBonus },
                        { label: 'Energy', value: -energyCost }
                    ],
                    isNewBest,
                    personalBest: isNewBest ? Math.max(roundsCompleted, previousBest) : null,
                    medal: getMiniGameMedal(roundsCompleted, { bronze: 3, silver: 5, gold: 8 })
                });
            } else {
                restorePostMiniGameState();
            }

            // Audio context is shared via GameAudio — no cleanup needed here

            simonState = null;
        }

        // ==================== COLORING MINI-GAME ====================

        const COLORING_PALETTE = [
            { name: 'Red', hex: '#FF4444' },
            { name: 'Orange', hex: '#FF9933' },
            { name: 'Yellow', hex: '#FFD700' },
            { name: 'Light Green', hex: '#8BC34A' },
            { name: 'Green', hex: '#4CAF50' },
            { name: 'Sky Blue', hex: '#64B5F6' },
            { name: 'Blue', hex: '#1E88E5' },
            { name: 'Purple', hex: '#9C27B0' },
            { name: 'Pink', hex: '#FF69B4' },
            { name: 'Brown', hex: '#795548' },
            { name: 'Tan', hex: '#D2B48C' },
            { name: 'White', hex: '#FFFFFF' }
        ];

        let coloringState = null;

        function startColoringGame() {
            if (!gameState.pet) {
                if (typeof showToast === 'function') {
                    showToast('You need a pet to play this game.', '#FFA726');
                }
                return;
            }

            const existing = document.querySelector('.coloring-game-overlay');
            if (existing) existing.remove();
            const templatePool = getPackedColoringTemplatePool();
            const selectedTemplate = getMiniGameContentSelection('coloring', 'templates', templatePool, {
                recentWindow: 4,
                idKey: 'id'
            }) || { id: 'classic_meadow', name: 'Sunny Meadow', variant: 'meadow' };

            coloringState = {
                selectedColor: COLORING_PALETTE[0].hex,
                regionsColored: new Set(),
                totalRegions: 0,
                template: selectedTemplate
            };

            renderColoringGame();
            announce(`Coloring time! Template: ${selectedTemplate.name || 'Classic Scene'}. Pick a color and click or tap parts of the picture to color them!`);
        }

        function renderColoringGame() {
            const overlay = document.createElement('div');
            overlay.className = 'coloring-game-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Coloring mini-game');

            const petType = gameState.pet.type;
            const scene = generateColoringScene(petType, coloringState && coloringState.template);

            let paletteHTML = '';
            COLORING_PALETTE.forEach((color) => {
                const selected = color.hex === coloringState.selectedColor ? 'selected' : '';
                paletteHTML += `<button class="coloring-swatch ${selected}"
                    data-color="${color.hex}"
                    aria-label="${color.name}"
                    style="background-color: ${color.hex}; ${color.hex === '#FFFFFF' ? 'border-color: #bbb;' : ''}"
                    title="${color.name}"></button>`;
            });

            overlay.innerHTML = `
                <div class="coloring-game">
                    <h2 class="coloring-game-title">🎨 Coloring Time${coloringState && coloringState.template && coloringState.template.name ? ` · ${escapeHTML(coloringState.template.name)}` : ''}!</h2>
                    <p class="coloring-game-hint" id="coloring-hint" aria-live="polite">${coloringState && coloringState.template && coloringState.template.description ? escapeHTML(coloringState.template.description) + ' ' : ''}Pick a color, then click or tap to paint! Use Tab to move between regions.</p>
                    <div class="coloring-canvas-wrap">
                        ${scene}
                    </div>
                    <div class="coloring-palette" role="toolbar" aria-label="Color palette">
                        ${paletteHTML}
                    </div>
                    <div class="coloring-buttons">
                        <button class="coloring-clear-btn" id="coloring-clear" aria-label="Clear all colors">Clear</button>
                        <button class="coloring-done-btn" id="coloring-done" aria-label="Finish coloring">Done</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            // Count total regions
            coloringState.totalRegions = overlay.querySelectorAll('.coloring-region').length;

            // Region click listeners
            overlay.querySelectorAll('.coloring-region').forEach(region => {
                // Make regions keyboard-accessible
                region.setAttribute('tabindex', '0');
                region.setAttribute('role', 'button');
                region.setAttribute('aria-label', 'Coloring region ' + (region.getAttribute('data-region') || ''));

                function applyColor() {
                    const regionId = region.getAttribute('data-region');
                    region.setAttribute('fill', coloringState.selectedColor);
                    region.style.fill = coloringState.selectedColor;
                    coloringState.regionsColored.add(regionId);

                    // Feedback flash
                    region.style.transition = 'none';
                    region.style.opacity = '0.7';
                    setTimeout(() => {
                        region.style.transition = 'opacity 0.2s';
                        region.style.opacity = '1';
                    }, 50);
                }

                region.addEventListener('click', (e) => {
                    e.stopPropagation();
                    applyColor();
                });

                region.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        applyColor();
                    }
                });

                region.addEventListener('mouseenter', () => {
                    region.style.cursor = 'pointer';
                    region.style.strokeWidth = '3';
                });
                region.addEventListener('mouseleave', () => {
                    region.style.strokeWidth = '2';
                });
                region.addEventListener('focus', () => {
                    region.style.strokeWidth = '3';
                });
                region.addEventListener('blur', () => {
                    region.style.strokeWidth = '2';
                });
            });

            // Palette click/keyboard listeners (Item 2 - keyboard accessible)
            overlay.querySelectorAll('.coloring-swatch').forEach(swatch => {
                function selectSwatch() {
                    coloringState.selectedColor = swatch.getAttribute('data-color');
                    overlay.querySelectorAll('.coloring-swatch').forEach(s => s.classList.remove('selected'));
                    swatch.classList.add('selected');
                    announce('Selected color: ' + (swatch.getAttribute('aria-label') || 'color'));
                }
                swatch.addEventListener('click', selectSwatch);
                swatch.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        selectSwatch();
                    }
                    // Arrow key navigation between swatches
                    const swatches = Array.from(overlay.querySelectorAll('.coloring-swatch'));
                    const idx = swatches.indexOf(swatch);
                    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        const next = swatches[(idx + 1) % swatches.length];
                        next.focus();
                    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        const prev = swatches[(idx - 1 + swatches.length) % swatches.length];
                        prev.focus();
                    }
                });
            });

            // Clear button
            overlay.querySelector('#coloring-clear').addEventListener('click', () => {
                overlay.querySelectorAll('.coloring-region').forEach(region => {
                    region.setAttribute('fill', '#F5F5F5');
                    region.style.fill = '#F5F5F5';
                });
                coloringState.regionsColored.clear();
                announce('Colors cleared!');
            });

            // Done button
            overlay.querySelector('#coloring-done').addEventListener('click', () => {
                endColoringGame();
            });

            // Close on overlay click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    const colored = coloringState ? coloringState.regionsColored.size : 0;
                    requestMiniGameExit(colored, () => endColoringGame());
                }
            });

            // Escape to close
            function coloringEscapeHandler() {
                const colored = coloringState ? coloringState.regionsColored.size : 0;
                requestMiniGameExit(colored, () => endColoringGame());
            }
            pushModalEscape(coloringEscapeHandler);
            coloringState._escapeHandler = coloringEscapeHandler;
            trapFocus(overlay);

            // Focus done button
            overlay.querySelector('#coloring-done').focus();
        }

        function generateColoringScene(petType, template) {
            const petParts = getColoringPetParts(petType);
            const variant = (template && template.variant) ? String(template.variant) : 'meadow';

            let petPartsHTML = '';
            petParts.forEach(part => {
                petPartsHTML += part;
            });

            let extraSceneRegions = '';
            if (variant === 'moonlight') {
                extraSceneRegions = `
                    <circle class="coloring-region" data-region="moon" cx="245" cy="52" r="22" fill="#F5F5F5" stroke="#333" stroke-width="2"/>
                    <path class="coloring-region" data-region="hill-back" d="M0 230 Q70 180 140 230 Z" fill="#F5F5F5" stroke="#333" stroke-width="2"/>
                    <path class="coloring-region" data-region="hill-front" d="M120 230 Q210 165 300 230 Z" fill="#F5F5F5" stroke="#333" stroke-width="2"/>
                `;
            } else if (variant === 'pond') {
                extraSceneRegions = `
                    <ellipse class="coloring-region" data-region="pond" cx="165" cy="260" rx="62" ry="22" fill="#F5F5F5" stroke="#333" stroke-width="2"/>
                    <path class="coloring-region" data-region="reeds-left" d="M110 250 Q108 235 113 220 Q118 235 116 250 Z" fill="#F5F5F5" stroke="#333" stroke-width="1.5"/>
                    <path class="coloring-region" data-region="reeds-right" d="M215 252 Q213 236 219 222 Q224 237 222 252 Z" fill="#F5F5F5" stroke="#333" stroke-width="1.5"/>
                `;
            } else if (variant === 'festival') {
                extraSceneRegions = `
                    <path class="coloring-region" data-region="banner" d="M70 85 Q150 40 230 85 L228 100 Q150 58 72 100 Z" fill="#F5F5F5" stroke="#333" stroke-width="2"/>
                    <circle class="coloring-region" data-region="lantern-left" cx="92" cy="112" r="10" fill="#F5F5F5" stroke="#333" stroke-width="2"/>
                    <circle class="coloring-region" data-region="lantern-right" cx="208" cy="112" r="10" fill="#F5F5F5" stroke="#333" stroke-width="2"/>
                `;
            }

            return `
                <svg class="coloring-scene" viewBox="0 0 300 360" xmlns="http://www.w3.org/2000/svg">
                    <!-- Sky -->
                    <rect class="coloring-region" data-region="sky" x="0" y="0" width="300" height="230" fill="#F5F5F5" stroke="#555" stroke-width="2"/>
                    <!-- Ground -->
                    <rect class="coloring-region" data-region="ground" x="0" y="230" width="300" height="130" fill="#F5F5F5" stroke="#555" stroke-width="2"/>

                    <!-- Sun -->
                    <circle class="coloring-region" data-region="sun" cx="255" cy="50" r="28" fill="#F5F5F5" stroke="#333" stroke-width="2"/>
                    <!-- Sun rays -->
                    <g stroke="#333" stroke-width="1.5" stroke-linecap="round">
                        <line x1="255" y1="15" x2="255" y2="8"/>
                        <line x1="255" y1="85" x2="255" y2="92"/>
                        <line x1="220" y1="50" x2="213" y2="50"/>
                        <line x1="290" y1="50" x2="297" y2="50"/>
                        <line x1="230" y1="25" x2="225" y2="20"/>
                        <line x1="280" y1="25" x2="285" y2="20"/>
                        <line x1="230" y1="75" x2="225" y2="80"/>
                        <line x1="280" y1="75" x2="285" y2="80"/>
                    </g>

                    <!-- Cloud -->
                    <path class="coloring-region" data-region="cloud" d="M40 70 Q50 40 75 55 Q85 30 110 48 Q125 35 138 58 Q140 75 110 78 Q80 80 50 78 Z" fill="#F5F5F5" stroke="#333" stroke-width="2"/>
                    ${extraSceneRegions}

                    <!-- Tree trunk -->
                    <rect class="coloring-region" data-region="trunk" x="32" y="175" width="22" height="60" rx="3" fill="#F5F5F5" stroke="#333" stroke-width="2"/>
                    <!-- Tree canopy -->
                    <ellipse class="coloring-region" data-region="leaves" cx="43" cy="160" rx="38" ry="35" fill="#F5F5F5" stroke="#333" stroke-width="2"/>

                    <!-- Flower 1 -->
                    <rect class="coloring-region" data-region="stem1" x="98" y="305" width="4" height="25" fill="#F5F5F5" stroke="#333" stroke-width="1.5"/>
                    <circle class="coloring-region" data-region="flower1" cx="100" cy="298" r="12" fill="#F5F5F5" stroke="#333" stroke-width="2"/>
                    <circle class="coloring-region" data-region="flower1center" cx="100" cy="298" r="4" fill="#F5F5F5" stroke="#333" stroke-width="1.5"/>

                    <!-- Flower 2 -->
                    <rect class="coloring-region" data-region="stem2" x="228" y="310" width="4" height="25" fill="#F5F5F5" stroke="#333" stroke-width="1.5"/>
                    <circle class="coloring-region" data-region="flower2" cx="230" cy="303" r="12" fill="#F5F5F5" stroke="#333" stroke-width="2"/>
                    <circle class="coloring-region" data-region="flower2center" cx="230" cy="303" r="4" fill="#F5F5F5" stroke="#333" stroke-width="1.5"/>

                    <!-- Grass blades -->
                    <g stroke="#333" stroke-width="1" stroke-linecap="round" fill="none">
                        <path d="M15 233 Q18 220 20 233"/>
                        <path d="M55 232 Q58 218 61 232"/>
                        <path d="M135 233 Q138 222 141 233"/>
                        <path d="M195 232 Q198 220 201 232"/>
                        <path d="M265 233 Q268 221 271 233"/>
                    </g>

                    <!-- Pet -->
                    <g class="coloring-pet-group">
                        ${petPartsHTML}
                    </g>

                    <!-- Pet face details -->
                    ${getColoringPetFace(petType)}
                </svg>
            `;
        }

        function getColoringPetParts(petType) {
            const cx = 175, cy = 270;

            switch (petType) {
                case 'dog':
                    return [
                        `<ellipse class="coloring-region" data-region="pet-body" cx="${cx}" cy="${cy+15}" rx="38" ry="30" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<path class="coloring-region" data-region="pet-tail" d="M${cx+35} ${cy+10} Q${cx+55} ${cy-15} ${cx+50} ${cy-25}" fill="none" stroke="#333" stroke-width="8" stroke-linecap="round"/>`,
                        `<circle class="coloring-region" data-region="pet-head" cx="${cx}" cy="${cy-25}" r="28" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<ellipse class="coloring-region" data-region="pet-ear-left" cx="${cx-22}" cy="${cy-45}" rx="10" ry="18" fill="#F5F5F5" stroke="#333" stroke-width="2" transform="rotate(-15 ${cx-22} ${cy-45})"/>`,
                        `<ellipse class="coloring-region" data-region="pet-ear-right" cx="${cx+22}" cy="${cy-45}" rx="10" ry="18" fill="#F5F5F5" stroke="#333" stroke-width="2" transform="rotate(15 ${cx+22} ${cy-45})"/>`,
                        `<ellipse class="coloring-region" data-region="pet-snout" cx="${cx}" cy="${cy-17}" rx="13" ry="10" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                    ];
                case 'cat':
                    return [
                        `<ellipse class="coloring-region" data-region="pet-body" cx="${cx}" cy="${cy+15}" rx="35" ry="28" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<path class="coloring-region" data-region="pet-tail" d="M${cx+32} ${cy+20} Q${cx+60} ${cy+5} ${cx+50} ${cy-15} Q${cx+42} ${cy-30} ${cx+55} ${cy-35}" fill="none" stroke="#333" stroke-width="7" stroke-linecap="round"/>`,
                        `<circle class="coloring-region" data-region="pet-head" cx="${cx}" cy="${cy-25}" r="26" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<polygon class="coloring-region" data-region="pet-ear-left" points="${cx-25},${cy-38} ${cx-12},${cy-60} ${cx-5},${cy-38}" fill="#F5F5F5" stroke="#333" stroke-width="2" stroke-linejoin="round"/>`,
                        `<polygon class="coloring-region" data-region="pet-ear-right" points="${cx+5},${cy-38} ${cx+12},${cy-60} ${cx+25},${cy-38}" fill="#F5F5F5" stroke="#333" stroke-width="2" stroke-linejoin="round"/>`,
                    ];
                case 'bunny':
                    return [
                        `<ellipse class="coloring-region" data-region="pet-body" cx="${cx}" cy="${cy+15}" rx="33" ry="28" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<circle class="coloring-region" data-region="pet-tail" cx="${cx+30}" cy="${cy+25}" r="10" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<circle class="coloring-region" data-region="pet-head" cx="${cx}" cy="${cy-22}" r="26" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<ellipse class="coloring-region" data-region="pet-ear-left" cx="${cx-12}" cy="${cy-65}" rx="9" ry="28" fill="#F5F5F5" stroke="#333" stroke-width="2" transform="rotate(-8 ${cx-12} ${cy-65})"/>`,
                        `<ellipse class="coloring-region" data-region="pet-ear-right" cx="${cx+12}" cy="${cy-65}" rx="9" ry="28" fill="#F5F5F5" stroke="#333" stroke-width="2" transform="rotate(8 ${cx+12} ${cy-65})"/>`,
                        `<ellipse class="coloring-region" data-region="pet-inner-ear-left" cx="${cx-12}" cy="${cy-65}" rx="5" ry="20" fill="#F5F5F5" stroke="#333" stroke-width="1.5" transform="rotate(-8 ${cx-12} ${cy-65})"/>`,
                        `<ellipse class="coloring-region" data-region="pet-inner-ear-right" cx="${cx+12}" cy="${cy-65}" rx="5" ry="20" fill="#F5F5F5" stroke="#333" stroke-width="1.5" transform="rotate(8 ${cx+12} ${cy-65})"/>`,
                    ];
                case 'bird':
                    return [
                        `<ellipse class="coloring-region" data-region="pet-body" cx="${cx}" cy="${cy+10}" rx="30" ry="25" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<path class="coloring-region" data-region="pet-wing-left" d="M${cx-28} ${cy+5} Q${cx-55} ${cy-5} ${cx-45} ${cy+25} Q${cx-35} ${cy+30} ${cx-25} ${cy+20} Z" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<path class="coloring-region" data-region="pet-wing-right" d="M${cx+28} ${cy+5} Q${cx+55} ${cy-5} ${cx+45} ${cy+25} Q${cx+35} ${cy+30} ${cx+25} ${cy+20} Z" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<path class="coloring-region" data-region="pet-tail-feathers" d="M${cx-5} ${cy+33} L${cx-15} ${cy+55} L${cx} ${cy+48} L${cx+15} ${cy+55} L${cx+5} ${cy+33} Z" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<ellipse class="coloring-region" data-region="pet-belly" cx="${cx}" cy="${cy+12}" rx="18" ry="16" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<circle class="coloring-region" data-region="pet-head" cx="${cx}" cy="${cy-22}" r="22" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                    ];
                case 'hamster':
                    return [
                        `<ellipse class="coloring-region" data-region="pet-body" cx="${cx}" cy="${cy+12}" rx="35" ry="30" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<circle class="coloring-region" data-region="pet-head" cx="${cx}" cy="${cy-20}" r="28" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<circle class="coloring-region" data-region="pet-ear-left" cx="${cx-24}" cy="${cy-42}" r="10" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<circle class="coloring-region" data-region="pet-ear-right" cx="${cx+24}" cy="${cy-42}" r="10" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<ellipse class="coloring-region" data-region="pet-cheek-left" cx="${cx-20}" cy="${cy-12}" rx="10" ry="8" fill="#F5F5F5" stroke="#333" stroke-width="1.5"/>`,
                        `<ellipse class="coloring-region" data-region="pet-cheek-right" cx="${cx+20}" cy="${cy-12}" rx="10" ry="8" fill="#F5F5F5" stroke="#333" stroke-width="1.5"/>`,
                    ];
                case 'turtle':
                    return [
                        `<ellipse class="coloring-region" data-region="pet-leg-left" cx="${cx-30}" cy="${cy+35}" rx="10" ry="8" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<ellipse class="coloring-region" data-region="pet-leg-right" cx="${cx+30}" cy="${cy+35}" rx="10" ry="8" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<path class="coloring-region" data-region="pet-tail" d="M${cx+43} ${cy+15} L${cx+58} ${cy+20} L${cx+45} ${cy+22} Z" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                        `<ellipse class="coloring-region" data-region="pet-shell" cx="${cx}" cy="${cy+5}" rx="45" ry="35" fill="#F5F5F5" stroke="#333" stroke-width="2.5"/>`,
                        `<ellipse class="coloring-region" data-region="pet-shell-inner" cx="${cx}" cy="${cy+5}" rx="30" ry="22" fill="#F5F5F5" stroke="#333" stroke-width="1.5"/>`,
                        `<circle class="coloring-region" data-region="pet-head" cx="${cx-38}" cy="${cy-5}" r="18" fill="#F5F5F5" stroke="#333" stroke-width="2"/>`,
                    ];
                default:
                    return getColoringPetParts('dog');
            }
        }

        function getColoringPetFace(petType) {
            const cx = 175, cy = 270;

            switch (petType) {
                case 'dog':
                    return `
                        <circle cx="${cx-10}" cy="${cy-30}" r="4" fill="#333"/>
                        <circle cx="${cx+10}" cy="${cy-30}" r="4" fill="#333"/>
                        <circle cx="${cx-9}" cy="${cy-31}" r="1.5" fill="white"/>
                        <circle cx="${cx+11}" cy="${cy-31}" r="1.5" fill="white"/>
                        <ellipse cx="${cx}" cy="${cy-20}" rx="5" ry="4" fill="#333"/>
                        <path d="M${cx-8} ${cy-13} Q${cx} ${cy-6} ${cx+8} ${cy-13}" stroke="#333" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                    `;
                case 'cat':
                    return `
                        <ellipse cx="${cx-9}" cy="${cy-28}" rx="4" ry="5" fill="#333"/>
                        <ellipse cx="${cx+9}" cy="${cy-28}" rx="4" ry="5" fill="#333"/>
                        <ellipse cx="${cx-8}" cy="${cy-28}" rx="2" ry="3" fill="#7CCC70"/>
                        <ellipse cx="${cx+10}" cy="${cy-28}" rx="2" ry="3" fill="#7CCC70"/>
                        <polygon points="${cx},${cy-19} ${cx-4},${cy-15} ${cx+4},${cy-15}" fill="#FFB6C1"/>
                        <g stroke="#333" stroke-width="1" stroke-linecap="round">
                            <line x1="${cx-25}" y1="${cy-18}" x2="${cx-10}" y2="${cy-16}"/>
                            <line x1="${cx-23}" y1="${cy-12}" x2="${cx-10}" y2="${cy-13}"/>
                            <line x1="${cx+25}" y1="${cy-18}" x2="${cx+10}" y2="${cy-16}"/>
                            <line x1="${cx+23}" y1="${cy-12}" x2="${cx+10}" y2="${cy-13}"/>
                        </g>
                        <path d="M${cx} ${cy-15} L${cx-5} ${cy-10}" stroke="#333" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                        <path d="M${cx} ${cy-15} L${cx+5} ${cy-10}" stroke="#333" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                    `;
                case 'bunny':
                    return `
                        <circle cx="${cx-9}" cy="${cy-26}" r="4" fill="#333"/>
                        <circle cx="${cx+9}" cy="${cy-26}" r="4" fill="#333"/>
                        <circle cx="${cx-8}" cy="${cy-27}" r="1.5" fill="white"/>
                        <circle cx="${cx+10}" cy="${cy-27}" r="1.5" fill="white"/>
                        <ellipse cx="${cx}" cy="${cy-18}" rx="4" ry="3" fill="#FFB6C1"/>
                        <path d="M${cx} ${cy-15} L${cx-4} ${cy-11}" stroke="#333" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                        <path d="M${cx} ${cy-15} L${cx+4} ${cy-11}" stroke="#333" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                        <rect x="${cx-3}" y="${cy-15}" width="3" height="4" rx="1" fill="white" stroke="#333" stroke-width="1"/>
                        <rect x="${cx}" y="${cy-15}" width="3" height="4" rx="1" fill="white" stroke="#333" stroke-width="1"/>
                    `;
                case 'bird':
                    return `
                        <circle cx="${cx-8}" cy="${cy-26}" r="3.5" fill="#333"/>
                        <circle cx="${cx+8}" cy="${cy-26}" r="3.5" fill="#333"/>
                        <circle cx="${cx-7}" cy="${cy-27}" r="1.3" fill="white"/>
                        <circle cx="${cx+9}" cy="${cy-27}" r="1.3" fill="white"/>
                        <polygon points="${cx},${cy-18} ${cx-6},${cy-13} ${cx+6},${cy-13}" fill="#FF9800" stroke="#333" stroke-width="1.5"/>
                    `;
                case 'hamster':
                    return `
                        <circle cx="${cx-10}" cy="${cy-24}" r="4.5" fill="#333"/>
                        <circle cx="${cx+10}" cy="${cy-24}" r="4.5" fill="#333"/>
                        <circle cx="${cx-9}" cy="${cy-25}" r="2" fill="white"/>
                        <circle cx="${cx+11}" cy="${cy-25}" r="2" fill="white"/>
                        <circle cx="${cx}" cy="${cy-16}" r="3" fill="#FFB6C1"/>
                        <path d="M${cx-5} ${cy-12} Q${cx} ${cy-7} ${cx+5} ${cy-12}" stroke="#333" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                    `;
                case 'turtle':
                    return `
                        <circle cx="${cx-43}" cy="${cy-10}" r="3" fill="#333"/>
                        <circle cx="${cx-44}" cy="${cy-11}" r="1.2" fill="white"/>
                        <circle cx="${cx-33}" cy="${cy-10}" r="3" fill="#333"/>
                        <circle cx="${cx-32}" cy="${cy-11}" r="1.2" fill="white"/>
                        <path d="M${cx-48} ${cy} Q${cx-38} ${cy+4} ${cx-33} ${cy}" stroke="#333" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                        <line x1="${cx-10}" y1="${cy-15}" x2="${cx-10}" y2="${cy+25}" stroke="#333" stroke-width="1"/>
                        <line x1="${cx+10}" y1="${cy-15}" x2="${cx+10}" y2="${cy+25}" stroke="#333" stroke-width="1"/>
                        <line x1="${cx-30}" y1="${cy+5}" x2="${cx+30}" y2="${cy+5}" stroke="#333" stroke-width="1"/>
                    `;
                default:
                    return getColoringPetFace('dog');
            }
        }

        function endColoringGame() {
            dismissMiniGameExitDialog();
            if (coloringState && coloringState._escapeHandler) {
                popModalEscape(coloringState._escapeHandler);
            }

            const overlay = document.querySelector('.coloring-game-overlay');
            if (overlay) { overlay.innerHTML = ''; overlay.remove(); }

            // Apply rewards based on regions colored
            if (coloringState && coloringState.regionsColored.size > 0 && gameState.pet) {
                incrementMinigamePlayCount('coloring', coloringState ? coloringState.regionsColored.size : 0);
                const colored = coloringState.regionsColored.size;
                const total = coloringState.totalRegions;
                const ratio = colored / Math.max(total, 1);

                const happinessBonus = Math.min(Math.round(ratio * 30), 30);
                const energyCost = Math.min(Math.round(ratio * 8), 10);

                gameState.pet.happiness = clamp(gameState.pet.happiness + happinessBonus, 0, 100);
                gameState.pet.energy = clamp(gameState.pet.energy - energyCost, 0, 100);
                const coinReward = awardScaledMiniGameCoins('coloring', Math.round(ratio * 100), getEscalatedMinigameDifficulty('coloring'));
                const previousBest = Number((gameState.minigameHighScores || {}).coloring || 0);
                const isNewBest = updateMinigameHighScore('coloring', colored);
                const bestMsg = isNewBest ? ' New best!' : '';

                updateNeedDisplays();
                updatePetMood();
                updateWellnessBar();
                saveGame();

                announce(`Coloring done! You colored ${colored} parts! Happiness +${happinessBonus}! Coins +${coinReward}!${bestMsg}`);
                if (isNewBest) {
                    showToast(`New high score in Coloring: ${colored} parts!`, '#FFD700');
                    showMinigameConfetti();
                    showHighScoreBanner('Coloring', colored);
                } else if (colored > 0) {
                    showMinigameConfetti();
                }
                showMiniGameSummaryCard({
                    gameName: 'Coloring',
                    score: colored,
                    coinReward,
                    statChanges: [
                        { label: 'Coverage', value: Math.round(ratio * 100) },
                        { label: 'Happiness', value: happinessBonus },
                        { label: 'Energy', value: -energyCost }
                    ],
                    isNewBest,
                    personalBest: isNewBest ? Math.max(colored, previousBest) : null,
                    medal: getMiniGameMedal(Math.round(ratio * 100), { bronze: 35, silver: 60, gold: 90 })
                });
            } else {
                restorePostMiniGameState();
            }
            coloringState = null;
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
            const runDifficulty = Number.isFinite(config.runDifficulty) ? Number(config.runDifficulty) : getEscalatedMinigameDifficulty(gameId);
            const coinReward = awardScaledMiniGameCoins(gameId, coinScore, runDifficulty);
            const previousBest = Number((gameState.minigameHighScores || {})[gameId] || 0);
            const isNewBest = updateMinigameHighScore(gameId, score);

            updateNeedDisplays();
            updatePetMood();
            updateWellnessBar();
            saveGame();

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
                medal: getMiniGameMedal(score, config.medalThresholds || null)
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

        // ==================== LANE RACING MINI-GAME ====================

        let racingState = null;

        function startRacingGame() {
            if (!gameState.pet) {
                showToast('You need a pet to race.', '#FFA726');
                return;
            }
            const difficulty = getEscalatedMinigameDifficulty('racing');
            racingState = {
                lane: 1,
                score: 0,
                lives: 3,
                elapsedMs: 0,
                durationMs: 32000,
                difficulty,
                obstacles: [],
                spawnEvery: Math.max(8, Math.round(18 / Math.max(0.7, difficulty))),
                speed: 2.7 * difficulty,
                tick: 0,
                obstacleId: 1,
                timerId: null
            };
            renderRacingGame();
            announce(miniGameTouchMode()
                ? 'Lane racing started. Tap left and right buttons to dodge obstacles.'
                : 'Lane racing started. Use left and right arrows to dodge obstacles.');
        }

        function renderRacingGame() {
            const existing = document.querySelector('.racing-game-overlay');
            if (existing) existing.remove();
            const overlay = document.createElement('div');
            overlay.className = 'racing-game-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Lane racing mini game');
            overlay.innerHTML = `
                <div class="racing-game-shell">
                    <h2 class="exp-game-title">🏁 Lane Racing</h2>
                    <div class="exp-game-hud">
                        <span id="racing-score">Dodges: 0</span>
                        <span id="racing-lives">Lives: 3</span>
                        <span id="racing-time">Time: 32s</span>
                    </div>
                    <div class="racing-track" id="racing-track" tabindex="0" aria-label="${miniGameTouchMode() ? 'Race track. Use left and right buttons to switch lanes.' : 'Race track. Use left and right arrows to switch lanes.'}">
                        <div class="racing-lane lane-0"></div>
                        <div class="racing-lane lane-1"></div>
                        <div class="racing-lane lane-2"></div>
                        <div class="racing-obstacles" id="racing-obstacles"></div>
                        <div class="racing-player lane-1" id="racing-player">🐾</div>
                    </div>
                    <p class="exp-game-note" id="racing-note">Switch lanes to dodge incoming obstacles.</p>
                    <div class="exp-game-controls">
                        <button type="button" id="racing-left">⬅ Left</button>
                        <button type="button" id="racing-right">Right ➡</button>
                        <button type="button" id="racing-done">Done</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            const track = overlay.querySelector('#racing-track');
            overlay.querySelector('#racing-left').addEventListener('click', () => moveRacingLane(-1));
            overlay.querySelector('#racing-right').addEventListener('click', () => moveRacingLane(1));
            overlay.querySelector('#racing-done').addEventListener('click', () => endRacingGame(false));
            track.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    moveRacingLane(-1);
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    moveRacingLane(1);
                }
            });
            function racingEscapeHandler() {
                requestMiniGameExit(racingState ? racingState.score : 0, () => endRacingGame(false));
            }
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) requestMiniGameExit(racingState ? racingState.score : 0, () => endRacingGame(false));
            });
            pushModalEscape(racingEscapeHandler);
            racingState._escapeHandler = racingEscapeHandler;
            trapFocus(overlay);
            track.focus();

            racingState.timerId = setInterval(stepRacingGame, 90);
            updateRacingUI();
        }

        function moveRacingLane(delta) {
            if (!racingState) return;
            racingState.lane = clamp(racingState.lane + delta, 0, 2);
            const player = document.getElementById('racing-player');
            if (player) {
                player.classList.remove('lane-0', 'lane-1', 'lane-2');
                player.classList.add(`lane-${racingState.lane}`);
            }
        }

        function stepRacingGame() {
            if (!racingState) return;
            racingState.tick += 1;
            racingState.elapsedMs += 90;
            if (racingState.tick % racingState.spawnEvery === 0) {
                racingState.obstacles.push({
                    id: racingState.obstacleId++,
                    lane: Math.floor(Math.random() * 3),
                    y: -14
                });
            }
            const next = [];
            racingState.obstacles.forEach((obs) => {
                obs.y += racingState.speed;
                const collided = obs.lane === racingState.lane && obs.y > 74 && obs.y < 92;
                if (collided) {
                    racingState.lives -= 1;
                    if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.hit);
                    return;
                }
                if (obs.y > 108) {
                    racingState.score += 1;
                    return;
                }
                next.push(obs);
            });
            racingState.obstacles = next;
            updateRacingUI();

            const finished = racingState.lives <= 0 || racingState.elapsedMs >= racingState.durationMs;
            if (finished) endRacingGame(true);
        }

        function updateRacingUI() {
            if (!racingState) return;
            const obstacles = document.getElementById('racing-obstacles');
            if (obstacles) {
                obstacles.innerHTML = racingState.obstacles.map((obs) => (
                    `<div class="racing-obstacle lane-${obs.lane}" style="top:${obs.y}%;">🚧</div>`
                )).join('');
            }
            const scoreEl = document.getElementById('racing-score');
            const livesEl = document.getElementById('racing-lives');
            const timeEl = document.getElementById('racing-time');
            if (scoreEl) scoreEl.textContent = `Dodges: ${racingState.score}`;
            if (livesEl) livesEl.textContent = `Lives: ${Math.max(0, racingState.lives)}`;
            if (timeEl) timeEl.textContent = `Time: ${Math.max(0, Math.ceil((racingState.durationMs - racingState.elapsedMs) / 1000))}s`;
        }

        function endRacingGame(fromTimeout) {
            dismissMiniGameExitDialog();
            if (!racingState) return;
            if (racingState.timerId) clearInterval(racingState.timerId);
            if (racingState._escapeHandler) popModalEscape(racingState._escapeHandler);
            const overlay = document.querySelector('.racing-game-overlay');
            if (overlay) { overlay.innerHTML = ''; overlay.remove(); }

            const score = racingState.score;
            if (score > 0 || fromTimeout) {
                finalizeExpandedMiniGame({
                    gameId: 'racing',
                    gameName: 'Lane Racing',
                    score,
                    coinScore: score * 6,
                    runDifficulty: racingState.difficulty,
                    statDelta: {
                        happiness: Math.min(24, Math.round(score * 1.7)),
                        energy: -Math.min(14, Math.round(score * 1.2)),
                        hunger: -Math.min(7, Math.round(score * 0.55))
                    },
                    summaryStats: [
                        { label: 'Dodges', value: score },
                        { label: 'Happiness', value: Math.min(24, Math.round(score * 1.7)) },
                        { label: 'Energy', value: -Math.min(14, Math.round(score * 1.2)) }
                    ],
                    medalThresholds: { bronze: 6, silver: 13, gold: 22 }
                });
            } else {
                restorePostMiniGameState();
            }
            racingState = null;
        }

        // ==================== COOKING MINI-GAME ====================

        const COOKING_INGREDIENTS = [
            { id: 'carrot', icon: '🥕', name: 'Carrot' },
            { id: 'fish', icon: '🐟', name: 'Fish Flakes' },
            { id: 'pumpkin', icon: '🎃', name: 'Pumpkin' },
            { id: 'apple', icon: '🍎', name: 'Apple Bits' },
            { id: 'mint', icon: '🌿', name: 'Mint Leaf' },
            { id: 'oats', icon: '🌾', name: 'Oats' },
            { id: 'berry', icon: '🫐', name: 'Berry Puree' },
            { id: 'egg', icon: '🥚', name: 'Egg Crumble' }
        ];

        let cookingState = null;

        function startCookingGame() {
            if (!gameState.pet) {
                showToast('You need a pet before cooking.', '#FFA726');
                return;
            }
            const cookingContent = getPackedCookingCatalog(COOKING_INGREDIENTS);
            const ruleModifier = getMinigameRuleModifier('cooking');
            const extraRounds = Math.max(0, Math.floor(Number(ruleModifier && ruleModifier.effect && ruleModifier.effect.extraRounds) || 0));
            cookingState = {
                round: 1,
                maxRounds: 5 + extraRounds,
                successes: 0,
                failures: 0,
                selected: [],
                recipe: [],
                recipeMeta: null,
                recipes: Array.isArray(cookingContent.recipes) ? cookingContent.recipes : [],
                ingredientCatalog: Array.isArray(cookingContent.ingredients) ? cookingContent.ingredients : COOKING_INGREDIENTS.slice(),
                ruleModifier,
                dailySpecialTag: ruleModifier && ruleModifier.effect ? ruleModifier.effect.preferTag : null
            };
            cookingState.recipeMeta = generateCookingRecipe();
            cookingState.recipe = (cookingState.recipeMeta && Array.isArray(cookingState.recipeMeta.ingredients))
                ? cookingState.recipeMeta.ingredients.slice()
                : [];
            renderCookingGame();
            const modNote = ruleModifier && ruleModifier.name ? ` Rule: ${ruleModifier.name}.` : '';
            announce(`Cooking mini game started. Match ingredients to craft special pet food.${modNote}`);
        }

        function generateCookingRecipe() {
            if (!cookingState) {
                const picks = shuffleArray([...COOKING_INGREDIENTS]).slice(0, 3);
                return { id: 'fallback_recipe', name: 'Classic Mix', ingredients: picks.map((item) => item.id) };
            }
            const fullPool = Array.isArray(cookingState.recipes) ? cookingState.recipes : [];
            const taggedPool = cookingState.dailySpecialTag
                ? fullPool.filter((recipe) => Array.isArray(recipe.tags) && recipe.tags.includes(cookingState.dailySpecialTag))
                : [];
            const candidatePool = taggedPool.length > 0 ? taggedPool : fullPool;
            const choice = getMiniGameContentSelection('cooking', 'recipes', candidatePool, {
                recentWindow: 4,
                idKey: 'id'
            });
            if (choice && Array.isArray(choice.ingredients) && choice.ingredients.length === 3) return choice;
            const picks = shuffleArray([...(Array.isArray(cookingState.ingredientCatalog) ? cookingState.ingredientCatalog : COOKING_INGREDIENTS)]).slice(0, 3);
            return { id: 'fallback_recipe', name: 'Classic Mix', ingredients: picks.map((item) => item.id), rewardProfile: { specialFood: 1 } };
        }

        function renderCookingGame() {
            const existing = document.querySelector('.cooking-game-overlay');
            if (existing) existing.remove();
            const overlay = document.createElement('div');
            overlay.className = 'cooking-game-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Cooking mini game');
            overlay.innerHTML = `
                <div class="exp-game-shell">
                    <h2 class="exp-game-title">🍲 Cooking Lab${cookingState.recipeMeta && cookingState.recipeMeta.name ? ` · ${escapeHTML(cookingState.recipeMeta.name)}` : ''}</h2>
                    <div class="exp-game-hud">
                        <span id="cooking-round">Round 1/${cookingState.maxRounds}</span>
                        <span id="cooking-success">Recipes: 0</span>
                        <span id="cooking-stock">Special Food: ${Math.floor((ensureMiniGameExpansionMeta().specialFoodStock || 0))}</span>
                    </div>
                    <div class="cooking-recipe" id="cooking-recipe"></div>
                    <div class="cooking-selected" id="cooking-selected" aria-live="polite"></div>
                    <div class="cooking-grid" id="cooking-grid"></div>
                    <p class="exp-game-note" id="cooking-note">${cookingState.ruleModifier && cookingState.ruleModifier.name ? `Rule: ${escapeHTML(cookingState.ruleModifier.name)}. ` : ''}Select exactly 3 ingredients, then cook.</p>
                    <div class="exp-game-controls">
                        <button type="button" id="cook-btn">Cook Recipe</button>
                        <button type="button" id="cook-clear">Clear</button>
                        <button type="button" id="cook-done">Done</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            const grid = overlay.querySelector('#cooking-grid');
            grid.innerHTML = (Array.isArray(cookingState.ingredientCatalog) ? cookingState.ingredientCatalog : COOKING_INGREDIENTS).map((item) => (
                `<button type="button" class="cooking-item" data-ing="${item.id}">${item.icon} ${escapeHTML(item.name)}</button>`
            )).join('');

            grid.querySelectorAll('.cooking-item').forEach((btn) => {
                btn.addEventListener('click', () => toggleCookingIngredient(btn.getAttribute('data-ing')));
            });
            overlay.querySelector('#cook-btn').addEventListener('click', () => submitCookingRecipe());
            overlay.querySelector('#cook-clear').addEventListener('click', () => {
                if (!cookingState) return;
                cookingState.selected = [];
                updateCookingUI();
            });
            overlay.querySelector('#cook-done').addEventListener('click', () => endCookingGame(false));
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) requestMiniGameExit(cookingState ? cookingState.successes : 0, () => endCookingGame(false));
            });
            function cookingEscapeHandler() {
                requestMiniGameExit(cookingState ? cookingState.successes : 0, () => endCookingGame(false));
            }
            pushModalEscape(cookingEscapeHandler);
            cookingState._escapeHandler = cookingEscapeHandler;
            trapFocus(overlay);
            overlay.querySelector('#cook-btn').focus();
            updateCookingUI();
        }

        function toggleCookingIngredient(ingredientId) {
            if (!cookingState) return;
            const selected = cookingState.selected;
            const idx = selected.indexOf(ingredientId);
            if (idx >= 0) {
                selected.splice(idx, 1);
            } else if (selected.length < 3) {
                selected.push(ingredientId);
            } else {
                showToast('Only 3 ingredients per recipe.', '#FFA726', { announce: false });
            }
            updateCookingUI();
        }

        function updateCookingUI() {
            if (!cookingState) return;
            const recipeEl = document.getElementById('cooking-recipe');
            const selectedEl = document.getElementById('cooking-selected');
            const roundEl = document.getElementById('cooking-round');
            const successEl = document.getElementById('cooking-success');
            const stockEl = document.getElementById('cooking-stock');
            const noteEl = document.getElementById('cooking-note');
            if (roundEl) roundEl.textContent = `Round ${Math.min(cookingState.round, cookingState.maxRounds)}/${cookingState.maxRounds}`;
            if (successEl) successEl.textContent = `Recipes: ${cookingState.successes}`;
            if (stockEl) stockEl.textContent = `Special Food: ${Math.floor((ensureMiniGameExpansionMeta().specialFoodStock || 0))}`;
            const ingredientCatalog = Array.isArray(cookingState.ingredientCatalog) ? cookingState.ingredientCatalog : COOKING_INGREDIENTS;
            const recipeDetails = cookingState.recipe.map((id) => ingredientCatalog.find((i) => i.id === id)).filter(Boolean);
            if (recipeEl) {
                const extra = cookingState.recipeMeta && cookingState.recipeMeta.difficulty ? ` <span class="cooking-recipe-meta">(${escapeHTML(String(cookingState.recipeMeta.difficulty))})</span>` : '';
                recipeEl.innerHTML = `<strong>Target Recipe:</strong> ${recipeDetails.map((i) => `${i.icon} ${escapeHTML(i.name)}`).join(' + ')}${extra}`;
            }
            if (selectedEl) {
                selectedEl.innerHTML = cookingState.selected.length > 0
                    ? `<strong>Selected:</strong> ${cookingState.selected.map((id) => {
                        const item = ingredientCatalog.find((i) => i.id === id);
                        return item ? `${item.icon} ${escapeHTML(item.name)}` : id;
                    }).join(' + ')}`
                    : '<strong>Selected:</strong> (none)';
            }
            document.querySelectorAll('.cooking-item').forEach((btn) => {
                const id = btn.getAttribute('data-ing');
                const isSelected = cookingState.selected.includes(id);
                btn.classList.toggle('selected', isSelected);
                btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
            });
            if (noteEl && cookingState.failures > 0) {
                noteEl.textContent = `Mistakes: ${cookingState.failures}/3. Match all 3 ingredients exactly.`;
            }
        }

        function submitCookingRecipe() {
            if (!cookingState) return;
            if (cookingState.selected.length !== 3) {
                showToast('Pick 3 ingredients before cooking.', '#FFA726');
                return;
            }
            const pick = [...cookingState.selected].sort().join('|');
            const target = [...cookingState.recipe].sort().join('|');
            const noteEl = document.getElementById('cooking-note');
            if (pick === target) {
                cookingState.successes += 1;
                const rewardFood = Math.max(1, Math.floor(Number(cookingState.recipeMeta && cookingState.recipeMeta.rewardProfile && cookingState.recipeMeta.rewardProfile.specialFood) || 1));
                grantSpecialPetFood(rewardFood);
                if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.celebration);
                if (noteEl) noteEl.textContent = `Perfect mix! ${cookingState.recipeMeta && cookingState.recipeMeta.name ? escapeHTML(cookingState.recipeMeta.name) + ' crafted. ' : ''}Special pet food +${rewardFood}.`;
            } else {
                cookingState.failures += 1;
                if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.miss);
                if (noteEl) noteEl.textContent = 'Recipe mismatch. Try the next order.';
            }
            cookingState.round += 1;
            cookingState.selected = [];

            const reachedEnd = cookingState.round > cookingState.maxRounds || cookingState.failures >= 3;
            if (reachedEnd) {
                endCookingGame(true);
                return;
            }
            cookingState.recipeMeta = generateCookingRecipe();
            cookingState.recipe = (cookingState.recipeMeta && Array.isArray(cookingState.recipeMeta.ingredients))
                ? cookingState.recipeMeta.ingredients.slice()
                : [];
            updateCookingUI();
        }

        function endCookingGame(completed) {
            dismissMiniGameExitDialog();
            if (!cookingState) return;
            if (cookingState._escapeHandler) popModalEscape(cookingState._escapeHandler);
            const overlay = document.querySelector('.cooking-game-overlay');
            if (overlay) { overlay.innerHTML = ''; overlay.remove(); }

            const recipes = cookingState.successes;
            if (recipes > 0 || completed) {
                const foodsCrafted = recipes;
                finalizeExpandedMiniGame({
                    gameId: 'cooking',
                    gameName: 'Cooking Lab',
                    score: recipes,
                    coinScore: recipes * 10,
                    runDifficulty: getEscalatedMinigameDifficulty('cooking'),
                    statDelta: {
                        hunger: Math.min(24, recipes * 5),
                        happiness: Math.min(20, recipes * 4),
                        energy: -Math.min(10, Math.max(2, cookingState.failures + 2))
                    },
                    summaryStats: [
                        { label: 'Recipes', value: recipes },
                        { label: 'Special Food Crafted', value: foodsCrafted },
                        { label: 'Hunger', value: Math.min(24, recipes * 5) },
                        { label: 'Happiness', value: Math.min(20, recipes * 4) }
                    ],
                    medalThresholds: { bronze: 1, silver: 3, gold: 5 }
                });
            } else {
                restorePostMiniGameState();
            }
            cookingState = null;
        }

        // ==================== FISHING MINI-GAME ====================

        let fishingState = null;

        function getFishingCatchCandidates() {
            const packCatches = getPackedFishingCatchPool();
            if (!Array.isArray(packCatches) || packCatches.length === 0) return [];
            const season = (typeof getCurrentSeason === 'function') ? getCurrentSeason() : null;
            const timeOfDay = gameState && gameState.timeOfDay ? gameState.timeOfDay : null;
            const roomId = gameState && gameState.currentRoom ? gameState.currentRoom : null;
            const biomeHint = roomId === 'beach' ? 'beach'
                : roomId === 'garden' ? 'pond'
                : roomId === 'park' ? 'pond'
                : roomId === 'bathroom' ? 'indoor'
                : 'pond';
            const filtered = packCatches.filter((entry) => {
                if (!entry) return false;
                if (Array.isArray(entry.seasons) && entry.seasons.length && season && !entry.seasons.includes(season)) return false;
                if (Array.isArray(entry.times) && entry.times.length && timeOfDay && !entry.times.includes(timeOfDay)) return false;
                if (Array.isArray(entry.biomes) && entry.biomes.length && !entry.biomes.includes(biomeHint) && !entry.biomes.includes('any')) return false;
                return true;
            });
            return filtered.length ? filtered : packCatches;
        }

        function startFishingGame() {
            if (!gameState.pet) {
                showToast('You need a pet for pond fishing.', '#FFA726');
                return;
            }
            const difficulty = getEscalatedMinigameDifficulty('fishing');
            const ruleModifier = getMinigameRuleModifier('fishing');
            const extraCasts = Math.max(0, Math.floor(Number(ruleModifier && ruleModifier.effect && ruleModifier.effect.extraCasts) || 0));
            fishingState = {
                roundsLeft: 10 + extraCasts,
                catches: 0,
                misses: 0,
                marker: 0,
                difficulty,
                velocity: 1.8 + difficulty * 0.9,
                zoneStart: 35,
                zoneSize: Math.max(20, Math.round(38 / Math.max(difficulty, 0.75))),
                timerId: null,
                ruleModifier,
                caughtFish: [],
                lastCatch: null
            };
            randomizeFishingZone();
            renderFishingGame();
            announce(miniGameTouchMode()
                ? `Fishing started${ruleModifier && ruleModifier.name ? ` (${ruleModifier.name})` : ''}. Tap Catch when the bobber enters the fish zone.`
                : `Fishing started${ruleModifier && ruleModifier.name ? ` (${ruleModifier.name})` : ''}. Reel in when the bobber enters the fish zone.`);
        }

        function randomizeFishingZone() {
            if (!fishingState) return;
            fishingState.zoneSize = Math.max(18, fishingState.zoneSize + (Math.random() * 7 - 3.5));
            fishingState.zoneStart = Math.max(4, Math.min(100 - fishingState.zoneSize - 4, Math.random() * (100 - fishingState.zoneSize - 8)));
        }

        function renderFishingGame() {
            const existing = document.querySelector('.fishing-game-overlay');
            if (existing) existing.remove();
            const overlay = document.createElement('div');
            overlay.className = 'fishing-game-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Pond fishing mini game');
            overlay.innerHTML = `
                <div class="exp-game-shell">
                    <h2 class="exp-game-title">🎣 Pond Fishing${fishingState.ruleModifier && fishingState.ruleModifier.name ? ` · ${escapeHTML(fishingState.ruleModifier.name)}` : ''}</h2>
                    <div class="exp-game-hud">
                        <span id="fishing-rounds">Casts Left: ${fishingState.roundsLeft}</span>
                        <span id="fishing-catches">Catches: 0</span>
                        <span id="fishing-misses">Misses: 0</span>
                    </div>
                    <div class="fishing-meter" id="fishing-meter" tabindex="0" aria-label="${miniGameTouchMode() ? 'Fishing meter. Tap Catch when the marker enters the fish zone.' : 'Fishing meter. Press Space to reel in.'}">
                        <div class="fishing-zone" id="fishing-zone"></div>
                        <div class="fishing-marker" id="fishing-marker"></div>
                    </div>
                    <p class="exp-game-note" id="fishing-note">${miniGameTouchMode() ? 'Tap Catch when the marker is inside the fish zone.' : 'Press Catch when the marker is inside the fish zone.'}</p>
                    <div class="exp-game-controls">
                        <button type="button" id="fishing-catch">Catch</button>
                        <button type="button" id="fishing-done">Done</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            function catchAction() { attemptFishingCatch(); }
            overlay.querySelector('#fishing-catch').addEventListener('click', catchAction);
            overlay.querySelector('#fishing-done').addEventListener('click', () => endFishingGame(false));
            overlay.querySelector('#fishing-meter').addEventListener('keydown', (e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    catchAction();
                }
            });
            overlay.querySelector('#fishing-meter').addEventListener('pointerdown', (e) => {
                if (!miniGameTouchMode() && e.pointerType === 'mouse') return;
                e.preventDefault();
                catchAction();
            });
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) requestMiniGameExit(fishingState ? fishingState.catches : 0, () => endFishingGame(false));
            });
            function fishingEscapeHandler() {
                requestMiniGameExit(fishingState ? fishingState.catches : 0, () => endFishingGame(false));
            }
            pushModalEscape(fishingEscapeHandler);
            fishingState._escapeHandler = fishingEscapeHandler;
            trapFocus(overlay);
            overlay.querySelector('#fishing-meter').focus();

            fishingState.timerId = setInterval(stepFishingMeter, 45);
            updateFishingUI();
        }

        function stepFishingMeter() {
            if (!fishingState) return;
            fishingState.marker += fishingState.velocity;
            if (fishingState.marker >= 100) {
                fishingState.marker = 100;
                fishingState.velocity *= -1;
            } else if (fishingState.marker <= 0) {
                fishingState.marker = 0;
                fishingState.velocity *= -1;
            }
            queueMinigameDOMWrite(() => {
                const marker = document.getElementById('fishing-marker');
                if (marker) marker.style.left = `${fishingState.marker}%`;
            });
        }

        function updateFishingUI() {
            if (!fishingState) return;
            queueMinigameDOMWrite(() => {
                const zone = document.getElementById('fishing-zone');
                const rounds = document.getElementById('fishing-rounds');
                const catches = document.getElementById('fishing-catches');
                const misses = document.getElementById('fishing-misses');
                if (zone) {
                    zone.style.left = `${fishingState.zoneStart}%`;
                    zone.style.width = `${fishingState.zoneSize}%`;
                }
                if (rounds) rounds.textContent = `Casts Left: ${fishingState.roundsLeft}`;
                if (catches) catches.textContent = `Catches: ${fishingState.catches}`;
                if (misses) misses.textContent = `Misses: ${fishingState.misses}`;
            });
        }

        function attemptFishingCatch() {
            if (!fishingState || fishingState.roundsLeft <= 0) return;
            const inZone = fishingState.marker >= fishingState.zoneStart && fishingState.marker <= (fishingState.zoneStart + fishingState.zoneSize);
            const note = document.getElementById('fishing-note');
            fishingState.roundsLeft -= 1;
            if (inZone) {
                fishingState.catches += 1;
                const catchPool = getFishingCatchCandidates();
                const caught = getMiniGameContentSelection('fishing', 'catches', catchPool, {
                    recentWindow: 5,
                    idKey: 'id'
                });
                if (caught) {
                    fishingState.lastCatch = caught;
                    fishingState.caughtFish.push({ id: caught.id, name: caught.name, rarity: caught.rarity });
                    if (note) note.textContent = `Nice catch! ${caught.emoji || '🐟'} ${caught.name}${caught.flavor ? ` — ${caught.flavor}` : ''}`;
                } else if (note) {
                    note.textContent = 'Nice catch! Cast again.';
                }
                if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.catch);
            } else {
                fishingState.misses += 1;
                if (note) note.textContent = 'Missed it! Try timing the next cast.';
                if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.miss);
            }
            if (fishingState.roundsLeft <= 0) {
                endFishingGame(true);
                return;
            }
            randomizeFishingZone();
            updateFishingUI();
        }

        function endFishingGame(completed) {
            dismissMiniGameExitDialog();
            if (!fishingState) return;
            if (fishingState.timerId) clearInterval(fishingState.timerId);
            if (fishingState._escapeHandler) popModalEscape(fishingState._escapeHandler);
            const overlay = document.querySelector('.fishing-game-overlay');
            if (overlay) { overlay.innerHTML = ''; overlay.remove(); }

            const catches = fishingState.catches;
            if (catches > 0 || completed) {
                const attempts = catches + fishingState.misses;
                const accuracy = attempts > 0 ? Math.round((catches / attempts) * 100) : 0;
                const uniqueCatchCount = new Set((fishingState.caughtFish || []).map((c) => c && c.id).filter(Boolean)).size;
                finalizeExpandedMiniGame({
                    gameId: 'fishing',
                    gameName: 'Pond Fishing',
                    score: catches,
                    coinScore: catches * 8,
                    runDifficulty: fishingState.difficulty,
                    statDelta: {
                        happiness: Math.min(22, catches * 4),
                        energy: -Math.min(10, Math.max(2, fishingState.misses + 2)),
                        hunger: -Math.min(6, Math.round(attempts / 3))
                    },
                    summaryStats: [
                        { label: 'Catches', value: catches },
                        { label: 'Accuracy', value: accuracy },
                        { label: 'Unique Fish', value: uniqueCatchCount },
                        { label: 'Happiness', value: Math.min(22, catches * 4) }
                    ],
                    medalThresholds: { bronze: 3, silver: 6, gold: 8 }
                });
            } else {
                restorePostMiniGameState();
            }
            fishingState = null;
        }

        // ==================== RHYTHM MINI-GAME ====================

        let rhythmState = null;

        function playProceduralBeat(accent) {
            if (typeof GameAudio !== 'undefined' && typeof GameAudio.playMiniGameTone === 'function') {
                GameAudio.playMiniGameTone({
                    bus: 'gameplay',
                    type: accent ? 'square' : 'triangle',
                    frequency: accent ? 220 : 160,
                    durationMs: 130,
                    gain: accent ? 0.14 : 0.11
                });
                return;
            }
            const ctx = (typeof GameAudio !== 'undefined' && GameAudio.getContext) ? GameAudio.getContext() : null;
            if (!ctx) return;
            if (ctx.state === 'suspended') ctx.resume().catch(() => {});
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = accent ? 'square' : 'triangle';
            osc.frequency.value = accent ? 220 : 160;
            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.exponentialRampToValueAtTime(0.14, now + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
            osc.connect(gain);
            const dest = (typeof GameAudio !== 'undefined' && GameAudio.getBusInputNode && GameAudio.getBusInputNode('gameplay'));
            if (!dest) return;
            gain.connect(dest);
            osc.start(now);
            osc.stop(now + 0.13);
        }

        function startRhythmGame() {
            if (!gameState.pet) {
                showToast('You need a pet to jam.', '#FFA726');
                return;
            }
            const difficulty = getEscalatedMinigameDifficulty('rhythm');
            rhythmState = {
                beat: 0,
                totalBeats: 24,
                score: 0,
                combo: 0,
                bestCombo: 0,
                difficulty,
                expectedAt: performance.now(),
                lastRegisteredBeat: -1,
                intervalMs: Math.max(440, Math.round(720 / Math.max(0.75, difficulty))),
                timerId: null
            };
            renderRhythmGame();
            if (typeof GameAudio !== 'undefined' && typeof GameAudio.emitAccessibilityCue === 'function') {
                GameAudio.emitAccessibilityCue('objectiveStart', { playSound: false, caption: 'Rhythm game started' });
            }
            announce(miniGameTouchMode()
                ? 'Rhythm game started. Tap Hit Beat on each pulse.'
                : 'Rhythm game started. Press Space on the beat.');
        }

        function renderRhythmGame() {
            const existing = document.querySelector('.rhythm-game-overlay');
            if (existing) existing.remove();
            const overlay = document.createElement('div');
            overlay.className = 'rhythm-game-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Rhythm mini game');
            overlay.innerHTML = `
                <div class="exp-game-shell">
                    <h2 class="exp-game-title">🥁 Rhythm Beats</h2>
                    <div class="exp-game-hud">
                        <span id="rhythm-beat">Beat: 0/24</span>
                        <span id="rhythm-score">Score: 0</span>
                        <span id="rhythm-combo">Combo: 0</span>
                    </div>
                    <div class="rhythm-lights" id="rhythm-lights" tabindex="0" aria-label="${miniGameTouchMode() ? 'Rhythm target. Tap to hit beats on the pulse.' : 'Rhythm target. Press Space to hit beats.'}">
                        <div class="rhythm-light" data-rhythm-light="0"></div>
                        <div class="rhythm-light" data-rhythm-light="1"></div>
                        <div class="rhythm-light" data-rhythm-light="2"></div>
                        <div class="rhythm-light" data-rhythm-light="3"></div>
                    </div>
                    <p class="exp-game-note" id="rhythm-note">${miniGameTouchMode() ? 'Tap on each beat pulse.' : 'Hit Space on each beat pulse.'}</p>
                    <div class="exp-game-controls">
                        <button type="button" id="rhythm-hit">Hit Beat</button>
                        <button type="button" id="rhythm-done">Done</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            const beatAction = () => registerRhythmHit();
            overlay.querySelector('#rhythm-hit').addEventListener('click', beatAction);
            overlay.querySelector('#rhythm-done').addEventListener('click', () => endRhythmGame(false));
            overlay.querySelector('#rhythm-lights').addEventListener('keydown', (e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    beatAction();
                }
            });
            overlay.querySelector('#rhythm-lights').addEventListener('pointerdown', (e) => {
                if (!miniGameTouchMode() && e.pointerType === 'mouse') return;
                e.preventDefault();
                beatAction();
            });
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) requestMiniGameExit(rhythmState ? rhythmState.score : 0, () => endRhythmGame(false));
            });
            function rhythmEscapeHandler() {
                requestMiniGameExit(rhythmState ? rhythmState.score : 0, () => endRhythmGame(false));
            }
            pushModalEscape(rhythmEscapeHandler);
            rhythmState._escapeHandler = rhythmEscapeHandler;
            trapFocus(overlay);
            overlay.querySelector('#rhythm-lights').focus();
            if (typeof GameAudio !== 'undefined' && typeof GameAudio.emitAccessibilityCue === 'function') {
                GameAudio.emitAccessibilityCue('focusPlayfield', { playSound: false, caption: 'Focus on rhythm playfield' });
            }

            rhythmState.timerId = setInterval(stepRhythmBeat, rhythmState.intervalMs);
            stepRhythmBeat();
        }

        function stepRhythmBeat() {
            if (!rhythmState) return;
            rhythmState.beat += 1;
            if (rhythmState.beat > rhythmState.totalBeats) {
                endRhythmGame(true);
                return;
            }
            rhythmState.expectedAt = performance.now();
            rhythmState.lastRegisteredBeat = -1;
            const accent = rhythmState.beat % 4 === 1;
            playProceduralBeat(accent);
            if (typeof GameAudio !== 'undefined' && typeof GameAudio.emitAccessibilityCue === 'function') {
                if (rhythmState.totalBeats - rhythmState.beat <= 3) {
                    GameAudio.emitAccessibilityCue('countdownDanger', { playSound: false, caption: 'Rhythm game ending soon' });
                }
            }
            const lights = document.querySelectorAll('.rhythm-light');
            const lightIndex = (rhythmState.beat - 1) % lights.length;
            lights.forEach((light, idx) => light.classList.toggle('active', idx === lightIndex));
            const note = document.getElementById('rhythm-note');
            if (note) note.textContent = accent ? 'Strong beat!' : 'Keep the rhythm steady.';
            const beatEl = document.getElementById('rhythm-beat');
            if (beatEl) beatEl.textContent = `Beat: ${rhythmState.beat}/${rhythmState.totalBeats}`;
        }

        function registerRhythmHit() {
            if (!rhythmState || rhythmState.beat <= 0 || rhythmState.beat > rhythmState.totalBeats) return;
            if (rhythmState.lastRegisteredBeat === rhythmState.beat) return;
            rhythmState.lastRegisteredBeat = rhythmState.beat;
            const delta = Math.abs(performance.now() - rhythmState.expectedAt);
            const note = document.getElementById('rhythm-note');
            if (delta <= 110) {
                rhythmState.combo += 1;
                rhythmState.bestCombo = Math.max(rhythmState.bestCombo, rhythmState.combo);
                rhythmState.score += 3 + Math.floor(rhythmState.combo / 4);
                if (note) note.textContent = 'Perfect beat!';
                if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.match);
                if (typeof GameAudio !== 'undefined' && typeof GameAudio.playRewardCue === 'function') {
                    GameAudio.playRewardCue(rhythmState.combo >= 8 ? 'medium' : 'small', { comboCount: rhythmState.combo, gain: rhythmState.combo >= 8 ? 0.8 : 0.55 });
                }
                if (typeof GameAudio !== 'undefined' && typeof GameAudio.emitAccessibilityCue === 'function' && rhythmState.combo >= 3 && rhythmState.combo % 3 === 0) {
                    GameAudio.emitAccessibilityCue('comboRise', { playSound: false, caption: `Combo ${rhythmState.combo}` });
                }
            } else if (delta <= 190) {
                rhythmState.combo = Math.max(0, rhythmState.combo - 1);
                rhythmState.score += 1;
                if (note) note.textContent = 'Good timing.';
            } else {
                rhythmState.combo = 0;
                if (note) note.textContent = 'Missed beat. Get back in sync.';
                if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.miss);
            }
            const scoreEl = document.getElementById('rhythm-score');
            const comboEl = document.getElementById('rhythm-combo');
            if (scoreEl) scoreEl.textContent = `Score: ${rhythmState.score}`;
            if (comboEl) comboEl.textContent = `Combo: ${rhythmState.combo}`;
        }

        function endRhythmGame(completed) {
            dismissMiniGameExitDialog();
            if (!rhythmState) return;
            if (rhythmState.timerId) clearInterval(rhythmState.timerId);
            if (rhythmState._escapeHandler) popModalEscape(rhythmState._escapeHandler);
            const overlay = document.querySelector('.rhythm-game-overlay');
            if (overlay) { overlay.innerHTML = ''; overlay.remove(); }
            if (typeof GameAudio !== 'undefined' && typeof GameAudio.emitAccessibilityCue === 'function') {
                GameAudio.emitAccessibilityCue('objectiveEnd', { playSound: false, caption: 'Rhythm game ended' });
            }

            const score = rhythmState.score;
            if (score > 0 || completed) {
                finalizeExpandedMiniGame({
                    gameId: 'rhythm',
                    gameName: 'Rhythm Beats',
                    score,
                    coinScore: Math.round(score * 0.85),
                    runDifficulty: rhythmState.difficulty,
                    statDelta: {
                        happiness: Math.min(28, Math.round(score / 2.2)),
                        energy: -Math.min(12, Math.max(4, Math.round(rhythmState.totalBeats / 3)))
                    },
                    summaryStats: [
                        { label: 'Beats', value: rhythmState.totalBeats },
                        { label: 'Best Combo', value: rhythmState.bestCombo },
                        { label: 'Happiness', value: Math.min(28, Math.round(score / 2.2)) }
                    ],
                    medalThresholds: { bronze: 20, silver: 42, gold: 72 }
                });
            } else {
                restorePostMiniGameState();
            }
            rhythmState = null;
        }

        // ==================== SLIDER PUZZLE MINI-GAME ====================

        let sliderState = null;

        function getSliderPortraitUri() {
            const pet = gameState.pet;
            if (!pet || typeof generatePetSVG !== 'function') return '';
            const mood = (typeof getMood === 'function') ? getMood(pet) : 'happy';
            const svg = generatePetSVG(pet, mood);
            return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        }

        function startSliderPuzzleGame() {
            if (!gameState.pet) {
                showToast('You need a pet for puzzle mode.', '#FFA726');
                return;
            }
            sliderState = {
                board: [1, 2, 3, 4, 5, 6, 7, 8, 0],
                moves: 0,
                startedAt: Date.now(),
                elapsedSec: 0,
                timerId: null,
                portraitUri: getSliderPortraitUri()
            };
            shuffleSliderBoard(sliderState.board, 90);
            renderSliderPuzzleGame();
            announce('Slider puzzle started. Arrange your pet portrait by moving tiles.');
        }

        function shuffleSliderBoard(board, steps) {
            let blank = board.indexOf(0);
            for (let i = 0; i < steps; i++) {
                const neighbors = getSliderNeighbors(blank);
                const target = neighbors[Math.floor(Math.random() * neighbors.length)];
                [board[blank], board[target]] = [board[target], board[blank]];
                blank = target;
            }
        }

        function getSliderNeighbors(blankIndex) {
            const row = Math.floor(blankIndex / 3);
            const col = blankIndex % 3;
            const next = [];
            if (row > 0) next.push(blankIndex - 3);
            if (row < 2) next.push(blankIndex + 3);
            if (col > 0) next.push(blankIndex - 1);
            if (col < 2) next.push(blankIndex + 1);
            return next;
        }

        function renderSliderPuzzleGame() {
            const existing = document.querySelector('.slider-game-overlay');
            if (existing) existing.remove();
            const overlay = document.createElement('div');
            overlay.className = 'slider-game-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Slider puzzle mini game');
            overlay.innerHTML = `
                <div class="exp-game-shell">
                    <h2 class="exp-game-title">🧩 Slider Puzzle</h2>
                    <div class="exp-game-hud">
                        <span id="slider-moves">Moves: 0</span>
                        <span id="slider-time">Time: 0s</span>
                    </div>
                    <div class="slider-grid" id="slider-grid" tabindex="0" aria-label="${miniGameTouchMode() ? 'Slider puzzle board. Tap tiles next to the blank space to move them.' : 'Slider puzzle board. Use arrow keys to move tiles.'}"></div>
                    <p class="exp-game-note">Rebuild your pet portrait in order.</p>
                    <div class="exp-game-controls">
                        <button type="button" id="slider-done">Done</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            overlay.querySelector('#slider-done').addEventListener('click', () => endSliderGame(false, false));
            const grid = overlay.querySelector('#slider-grid');
            grid.addEventListener('keydown', handleSliderKeyDown);
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) requestMiniGameExit(sliderState ? sliderState.moves : 0, () => endSliderGame(false, false));
            });
            function sliderEscapeHandler() {
                requestMiniGameExit(sliderState ? sliderState.moves : 0, () => endSliderGame(false, false));
            }
            pushModalEscape(sliderEscapeHandler);
            sliderState._escapeHandler = sliderEscapeHandler;
            trapFocus(overlay);
            grid.focus();
            sliderState.timerId = setInterval(() => {
                if (!sliderState) return;
                sliderState.elapsedSec = Math.floor((Date.now() - sliderState.startedAt) / 1000);
                const timeEl = document.getElementById('slider-time');
                if (timeEl) timeEl.textContent = `Time: ${sliderState.elapsedSec}s`;
            }, 1000);
            updateSliderUI();
        }

        function handleSliderKeyDown(e) {
            if (!sliderState) return;
            let target = -1;
            const blank = sliderState.board.indexOf(0);
            const row = Math.floor(blank / 3);
            const col = blank % 3;
            if (e.key === 'ArrowUp' && row < 2) target = blank + 3;
            if (e.key === 'ArrowDown' && row > 0) target = blank - 3;
            if (e.key === 'ArrowLeft' && col < 2) target = blank + 1;
            if (e.key === 'ArrowRight' && col > 0) target = blank - 1;
            if (target >= 0) {
                e.preventDefault();
                moveSliderTile(target);
            }
        }

        function updateSliderUI() {
            if (!sliderState) return;
            const grid = document.getElementById('slider-grid');
            if (!grid) return;
            const tilesHTML = sliderState.board.map((value, idx) => {
                if (value === 0) {
                    return `<button type="button" class="slider-tile blank" data-idx="${idx}" aria-label="Blank tile"></button>`;
                }
                const piece = value - 1;
                const row = Math.floor(piece / 3);
                const col = piece % 3;
                const bgPosX = col * 50;
                const bgPosY = row * 50;
                const style = sliderState.portraitUri
                    ? `style="background-image:url('${sliderState.portraitUri}');background-size:300% 300%;background-position:${bgPosX}% ${bgPosY}%"`
                    : '';
                return `<button type="button" class="slider-tile" data-idx="${idx}" ${style} aria-label="Tile ${value}"></button>`;
            }).join('');
            grid.innerHTML = tilesHTML;
            grid.querySelectorAll('.slider-tile').forEach((btn) => {
                const idx = Number(btn.getAttribute('data-idx'));
                btn.addEventListener('click', () => moveSliderTile(idx));
            });
            const movesEl = document.getElementById('slider-moves');
            if (movesEl) movesEl.textContent = `Moves: ${sliderState.moves}`;
        }

        function moveSliderTile(tileIndex) {
            if (!sliderState) return;
            const blank = sliderState.board.indexOf(0);
            const neighbors = getSliderNeighbors(blank);
            if (!neighbors.includes(tileIndex)) return;
            [sliderState.board[blank], sliderState.board[tileIndex]] = [sliderState.board[tileIndex], sliderState.board[blank]];
            sliderState.moves += 1;
            updateSliderUI();
            if (isSliderSolved(sliderState.board)) {
                endSliderGame(true, true);
            }
        }

        function isSliderSolved(board) {
            return board.join(',') === '1,2,3,4,5,6,7,8,0';
        }

        function endSliderGame(completed, solved) {
            dismissMiniGameExitDialog();
            if (!sliderState) return;
            if (sliderState.timerId) clearInterval(sliderState.timerId);
            if (sliderState._escapeHandler) popModalEscape(sliderState._escapeHandler);
            const overlay = document.querySelector('.slider-game-overlay');
            if (overlay) { overlay.innerHTML = ''; overlay.remove(); }

            const moves = sliderState.moves;
            const elapsed = Math.max(1, sliderState.elapsedSec || Math.floor((Date.now() - sliderState.startedAt) / 1000));
            const solvedScore = solved ? Math.max(8, 140 - moves - Math.floor(elapsed / 2)) : Math.max(0, Math.round(60 - moves));
            if (moves > 0 || completed) {
                finalizeExpandedMiniGame({
                    gameId: 'slider',
                    gameName: 'Slider Puzzle',
                    score: solvedScore,
                    coinScore: solved ? Math.round(solvedScore * 0.8) : Math.round(solvedScore * 0.45),
                    runDifficulty: getEscalatedMinigameDifficulty('slider'),
                    statDelta: {
                        happiness: Math.min(24, Math.round(solvedScore / 5)),
                        energy: -Math.min(10, Math.round(elapsed / 18))
                    },
                    summaryStats: [
                        { label: 'Solved', value: solved ? 1 : 0 },
                        { label: 'Moves', value: moves },
                        { label: 'Time (s)', value: elapsed }
                    ],
                    medalThresholds: { bronze: 40, silver: 70, gold: 100 }
                });
            } else {
                restorePostMiniGameState();
            }
            sliderState = null;
        }

        // ==================== TRIVIA MINI-GAME ====================

        const TRIVIA_QUESTIONS = [
            { q: 'What is the largest living species of penguin?', options: ['Emperor penguin', 'King penguin', 'Gentoo penguin', 'Adelie penguin'], answer: 0, fact: 'Emperor penguins can exceed 1.1 meters in height.' },
            { q: 'Which mammal has the most powerful bite force?', options: ['Lion', 'Tiger', 'Jaguar', 'Hippopotamus'], answer: 3, fact: 'Hippos have one of the strongest measured bite forces among mammals.' },
            { q: 'How do dolphins mainly breathe?', options: ['Through gills', 'Through skin', 'Through blowholes', 'Through mouth only'], answer: 2, fact: 'Dolphins are mammals and breathe air through blowholes.' },
            { q: 'What is unique about axolotls?', options: ['They glow naturally', 'They can regenerate limbs', 'They hibernate for years', 'They fly short distances'], answer: 1, fact: 'Axolotls can regenerate limbs and even parts of organs.' },
            { q: 'Which bird is known for hovering while feeding?', options: ['Sparrow', 'Hummingbird', 'Crow', 'Toucan'], answer: 1, fact: 'Hummingbirds can hover and even fly backward.' },
            { q: 'What is the fastest land animal?', options: ['Pronghorn', 'Cheetah', 'Greyhound', 'Lion'], answer: 1, fact: 'Cheetahs can sprint up to about 60-70 mph in short bursts.' },
            { q: 'How many hearts does an octopus have?', options: ['One', 'Two', 'Three', 'Four'], answer: 2, fact: 'Octopuses have three hearts and blue blood.' },
            { q: 'What do pandas mostly eat?', options: ['Bamboo', 'Fish', 'Fruits', 'Insects'], answer: 0, fact: 'Giant pandas eat bamboo for most of their diet.' },
            { q: 'Which animal can sleep while swimming?', options: ['Shark', 'Sea otter', 'Orca', 'Seal'], answer: 1, fact: 'Sea otters hold paws or kelp to avoid drifting apart.' },
            { q: 'What is a group of frogs called?', options: ['Army', 'Knot', 'Colony', 'School'], answer: 0, fact: 'A group of frogs is often called an army.' }
        ];

        let triviaState = null;

        function startTriviaGame() {
            if (!gameState.pet) {
                showToast('A pet is needed for trivia time.', '#FFA726');
                return;
            }
            const ruleModifier = getMinigameRuleModifier('trivia');
            const questionPool = getPackedTriviaPool(TRIVIA_QUESTIONS);
            const questionCount = Math.max(5, Math.min(8, 5 + Math.floor(Number(ruleModifier && ruleModifier.effect && ruleModifier.effect.extraQuestions) || 0)));
            const pickPool = questionPool.slice();
            const selectedQuestions = [];
            while (pickPool.length > 0 && selectedQuestions.length < questionCount) {
                const next = getMiniGameContentSelection('trivia', 'questions', pickPool, {
                    recentWindow: 8,
                    idKey: 'id'
                }) || pickPool[0];
                selectedQuestions.push(next);
                const nextId = String(next.id || next.q || selectedQuestions.length);
                const idx = pickPool.findIndex((item) => String(item.id || item.q) === nextId);
                if (idx >= 0) pickPool.splice(idx, 1);
                else pickPool.shift();
            }
            triviaState = {
                questions: selectedQuestions.length ? selectedQuestions : shuffleArray([...TRIVIA_QUESTIONS]).slice(0, 5),
                index: 0,
                correct: 0,
                answered: false,
                ruleModifier
            };
            renderTriviaGame();
            announce(`Animal trivia started${ruleModifier && ruleModifier.name ? ` (${ruleModifier.name})` : ''}. Choose the best answer for each fact.`);
        }

        function renderTriviaGame() {
            const existing = document.querySelector('.trivia-game-overlay');
            if (existing) existing.remove();
            const overlay = document.createElement('div');
            overlay.className = 'trivia-game-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Animal trivia mini game');
            overlay.innerHTML = `
                <div class="exp-game-shell">
                    <h2 class="exp-game-title">🦉 Animal Trivia${triviaState.ruleModifier && triviaState.ruleModifier.name ? ` · ${escapeHTML(triviaState.ruleModifier.name)}` : ''}</h2>
                    <div class="exp-game-hud">
                        <span id="trivia-progress">Q 1/${triviaState.questions.length}</span>
                        <span id="trivia-score">Correct: 0</span>
                    </div>
                    <div class="trivia-question" id="trivia-question"></div>
                    <div class="trivia-options" id="trivia-options"></div>
                    <p class="exp-game-note" id="trivia-fact">${triviaState.ruleModifier && triviaState.ruleModifier.name ? `Rule: ${escapeHTML(triviaState.ruleModifier.name)}. ` : ''}Pick an answer.</p>
                    <div class="exp-game-controls">
                        <button type="button" id="trivia-next" disabled>Next</button>
                        <button type="button" id="trivia-done">Done</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            overlay.querySelector('#trivia-next').addEventListener('click', nextTriviaQuestion);
            overlay.querySelector('#trivia-done').addEventListener('click', () => endTriviaGame(false));
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) requestMiniGameExit(triviaState ? triviaState.correct : 0, () => endTriviaGame(false));
            });
            function triviaEscapeHandler() {
                requestMiniGameExit(triviaState ? triviaState.correct : 0, () => endTriviaGame(false));
            }
            pushModalEscape(triviaEscapeHandler);
            triviaState._escapeHandler = triviaEscapeHandler;
            trapFocus(overlay);
            updateTriviaUI();
        }

        function updateTriviaUI() {
            if (!triviaState) return;
            const q = triviaState.questions[triviaState.index];
            const progress = document.getElementById('trivia-progress');
            const score = document.getElementById('trivia-score');
            const questionEl = document.getElementById('trivia-question');
            const optionsEl = document.getElementById('trivia-options');
            const factEl = document.getElementById('trivia-fact');
            const nextBtn = document.getElementById('trivia-next');
            if (!q) return;
            const qPrompt = q.prompt || q.q || 'Question';
            const qChoices = Array.isArray(q.choices) ? q.choices : (Array.isArray(q.options) ? q.options : []);
            const qFact = q.fact || q.explanation || 'Pick an answer.';
            if (progress) progress.textContent = `Q ${triviaState.index + 1}/${triviaState.questions.length}`;
            if (score) score.textContent = `Correct: ${triviaState.correct}`;
            if (questionEl) questionEl.textContent = qPrompt;
            if (factEl) factEl.textContent = triviaState.answered ? qFact : 'Pick an answer.';
            if (nextBtn) nextBtn.disabled = !triviaState.answered;
            if (optionsEl) {
                optionsEl.innerHTML = qChoices.map((opt, idx) => (
                    `<button type="button" class="trivia-option" data-opt="${idx}" ${triviaState.answered ? 'disabled' : ''}>${escapeHTML(opt)}</button>`
                )).join('');
                optionsEl.querySelectorAll('.trivia-option').forEach((btn) => {
                    btn.addEventListener('click', () => answerTriviaQuestion(Number(btn.getAttribute('data-opt'))));
                });
                if (triviaState.answered) {
                    optionsEl.querySelectorAll('.trivia-option').forEach((btn) => {
                        const idx = Number(btn.getAttribute('data-opt'));
                        btn.classList.toggle('correct', idx === q.answer);
                        if (idx !== q.answer) btn.classList.toggle('wrong', idx !== q.answer);
                    });
                }
            }
        }

        function answerTriviaQuestion(choice) {
            if (!triviaState || triviaState.answered) return;
            const q = triviaState.questions[triviaState.index];
            triviaState.answered = true;
            if (choice === q.answer) {
                triviaState.correct += 1;
                if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.match);
            } else if (typeof GameAudio !== 'undefined') {
                GameAudio.playSFX(GameAudio.sfx.miss);
            }
            updateTriviaUI();
        }

        function nextTriviaQuestion() {
            if (!triviaState || !triviaState.answered) return;
            triviaState.index += 1;
            triviaState.answered = false;
            if (triviaState.index >= triviaState.questions.length) {
                endTriviaGame(true);
                return;
            }
            updateTriviaUI();
        }

        function endTriviaGame(completed) {
            dismissMiniGameExitDialog();
            if (!triviaState) return;
            if (triviaState._escapeHandler) popModalEscape(triviaState._escapeHandler);
            const overlay = document.querySelector('.trivia-game-overlay');
            if (overlay) { overlay.innerHTML = ''; overlay.remove(); }

            const score = triviaState.correct;
            if (score > 0 || completed) {
                const total = triviaState.questions.length;
                finalizeExpandedMiniGame({
                    gameId: 'trivia',
                    gameName: 'Animal Trivia',
                    score,
                    coinScore: score * 9,
                    runDifficulty: getEscalatedMinigameDifficulty('trivia'),
                    statDelta: {
                        happiness: Math.min(24, score * 5),
                        energy: -Math.max(2, total - score)
                    },
                    summaryStats: [
                        { label: 'Correct Answers', value: score },
                        { label: 'Questions', value: total },
                        { label: 'Accuracy', value: Math.round((score / Math.max(total, 1)) * 100) }
                    ],
                    medalThresholds: { bronze: 2, silver: 4, gold: 5 }
                });
            } else {
                restorePostMiniGameState();
            }
            triviaState = null;
        }

        // ==================== ENDLESS RUNNER MINI-GAME ====================

        let runnerState = null;

        function startRunnerGame() {
            if (!gameState.pet) {
                showToast('You need a pet to run.', '#FFA726');
                return;
            }
            const difficulty = getEscalatedMinigameDifficulty('runner');
            runnerState = {
                y: 0,
                velocity: 0,
                score: 0,
                tick: 0,
                obstacles: [],
                difficulty,
                speed: 1.9 * difficulty,
                spawnEvery: Math.max(24, Math.round(50 / Math.max(0.75, difficulty))),
                timerId: null
            };
            renderRunnerGame();
            announce(miniGameTouchMode()
                ? 'Endless runner started. Tap Jump or tap the track to jump.'
                : 'Endless runner started. Press Space to jump.');
        }

        function renderRunnerGame() {
            const existing = document.querySelector('.runner-game-overlay');
            if (existing) existing.remove();
            const overlay = document.createElement('div');
            overlay.className = 'runner-game-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Endless runner mini game');
            overlay.innerHTML = `
                <div class="exp-game-shell">
                    <h2 class="exp-game-title">🏃 Endless Runner</h2>
                    <div class="exp-game-hud">
                        <span id="runner-score">Meters: 0</span>
                        <span id="runner-speed">Speed: ${runnerState.speed.toFixed(1)}</span>
                    </div>
                    <div class="runner-track" id="runner-track" tabindex="0" aria-label="${miniGameTouchMode() ? 'Runner track. Tap to jump over obstacles.' : 'Runner track. Press space to jump obstacles.'}">
                        <div class="runner-ground"></div>
                        <div class="runner-player" id="runner-player">🐾</div>
                        <div class="runner-obstacles" id="runner-obstacles"></div>
                    </div>
                    <p class="exp-game-note" id="runner-note">Jump over obstacles to keep running.</p>
                    <div class="exp-game-controls">
                        <button type="button" id="runner-jump">Jump</button>
                        <button type="button" id="runner-done">Done</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            const jumpAction = () => runnerJump();
            overlay.querySelector('#runner-jump').addEventListener('click', jumpAction);
            overlay.querySelector('#runner-done').addEventListener('click', () => endRunnerGame(false, false));
            overlay.querySelector('#runner-track').addEventListener('keydown', (e) => {
                if (e.key === ' ' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    jumpAction();
                }
            });
            overlay.querySelector('#runner-track').addEventListener('pointerdown', (e) => {
                if (!miniGameTouchMode() && e.pointerType === 'mouse') return;
                if (e.target && typeof e.target.closest === 'function' && e.target.closest('#runner-done')) return;
                e.preventDefault();
                jumpAction();
            });
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) requestMiniGameExit(runnerState ? runnerState.score : 0, () => endRunnerGame(false, false));
            });
            function runnerEscapeHandler() {
                requestMiniGameExit(runnerState ? runnerState.score : 0, () => endRunnerGame(false, false));
            }
            pushModalEscape(runnerEscapeHandler);
            runnerState._escapeHandler = runnerEscapeHandler;
            trapFocus(overlay);
            overlay.querySelector('#runner-track').focus();
            runnerState.timerId = setInterval(stepRunnerGame, 55);
            updateRunnerUI();
        }

        function runnerJump() {
            if (!runnerState) return;
            if (runnerState.y === 0) {
                runnerState.velocity = 12;
                if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.play);
            }
        }

        function stepRunnerGame() {
            if (!runnerState) return;
            runnerState.tick += 1;
            if (runnerState.tick % runnerState.spawnEvery === 0) {
                runnerState.obstacles.push({ x: 112, width: 8 + Math.random() * 4 });
            }

            runnerState.y = Math.max(0, runnerState.y + runnerState.velocity * 0.22);
            runnerState.velocity -= 1.08;
            if (runnerState.y <= 0) {
                runnerState.y = 0;
                runnerState.velocity = 0;
            }

            const next = [];
            let hit = false;
            runnerState.obstacles.forEach((obs) => {
                obs.x -= runnerState.speed;
                const inHitX = obs.x < 26 && (obs.x + obs.width) > 10;
                const lowJump = runnerState.y < 8;
                if (inHitX && lowJump) {
                    hit = true;
                    return;
                }
                if (obs.x + obs.width > -5) next.push(obs);
            });
            runnerState.obstacles = next;
            runnerState.score += Math.max(1, Math.round(runnerState.speed));
            updateRunnerUI();
            if (hit) {
                if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.hit);
                endRunnerGame(true, true);
            }
        }

        function updateRunnerUI() {
            if (!runnerState) return;
            queueMinigameDOMWrite(() => {
                const scoreEl = document.getElementById('runner-score');
                const speedEl = document.getElementById('runner-speed');
                const playerEl = document.getElementById('runner-player');
                const obstaclesEl = document.getElementById('runner-obstacles');
                if (scoreEl) scoreEl.textContent = `Meters: ${runnerState.score}`;
                if (speedEl) speedEl.textContent = `Speed: ${runnerState.speed.toFixed(1)}`;
                if (playerEl) playerEl.style.transform = `translate3d(0, ${-runnerState.y}px, 0)`;
                if (obstaclesEl) {
                    obstaclesEl.innerHTML = runnerState.obstacles
                        .map((obs) => `<div class="runner-obstacle" style="left:${obs.x}%;width:${obs.width}%"></div>`)
                        .join('');
                }
            });
        }

        function endRunnerGame(completed, crashed) {
            dismissMiniGameExitDialog();
            if (!runnerState) return;
            if (runnerState.timerId) clearInterval(runnerState.timerId);
            if (runnerState._escapeHandler) popModalEscape(runnerState._escapeHandler);
            const overlay = document.querySelector('.runner-game-overlay');
            if (overlay) { overlay.innerHTML = ''; overlay.remove(); }

            const score = runnerState.score;
            if (score > 0 || completed) {
                finalizeExpandedMiniGame({
                    gameId: 'runner',
                    gameName: 'Endless Runner',
                    score,
                    coinScore: Math.round(score / 4),
                    runDifficulty: runnerState.difficulty,
                    statDelta: {
                        happiness: Math.min(28, Math.round(score / 8)),
                        energy: -Math.min(18, Math.round(score / 10)),
                        hunger: -Math.min(10, Math.round(score / 14))
                    },
                    summaryStats: [
                        { label: 'Meters', value: score },
                        { label: 'Crash', value: crashed ? 1 : 0 },
                        { label: 'Happiness', value: Math.min(28, Math.round(score / 8)) }
                    ],
                    medalThresholds: { bronze: 120, silver: 240, gold: 360 }
                });
            } else {
                restorePostMiniGameState();
            }
            runnerState = null;
        }

        // ==================== TOURNAMENT + LEADERBOARD MINI-GAME ====================

        const TOURNAMENT_RIVALS = [
            'Milo', 'Luna', 'Nova', 'Clover', 'Sprout', 'Sunny', 'Shadow', 'Poppy', 'Jasper', 'Nori'
        ];

        let tournamentState = null;

        function pickTournamentRivalNames(count) {
            const targetCount = Math.max(1, Math.floor(Number(count) || 7));
            const pool = getPackedTournamentRivalNames(TOURNAMENT_RIVALS).map((name, idx) => ({ id: `tour_name_${idx}_${name}`, name }));
            const available = pool.slice();
            const picked = [];
            while (available.length > 0 && picked.length < targetCount) {
                const next = getMiniGameContentSelection('tournament', 'rivalNames', available, {
                    recentWindow: 6,
                    idKey: 'id'
                }) || available[0];
                picked.push(next.name);
                const idx = available.findIndex((entry) => entry.id === next.id);
                if (idx >= 0) available.splice(idx, 1);
                else available.shift();
            }
            return picked;
        }

        function getTournamentState() {
            const expansion = ensureMiniGameExpansionMeta();
            if (!expansion.tournament || typeof expansion.tournament !== 'object') {
                expansion.tournament = { season: 1, round: 0, wins: 0, championships: 0, lastBracket: [], leaderboard: [] };
            }
            if (!Array.isArray(expansion.tournament.leaderboard)) expansion.tournament.leaderboard = [];
            if (!Array.isArray(expansion.tournament.lastBracket)) expansion.tournament.lastBracket = [];
            if (!expansion.tournament.lastBracket.length) startNewTournamentSeason(expansion.tournament);
            return expansion.tournament;
        }

        function startNewTournamentSeason(tournament) {
            const entrants = ['You', ...pickTournamentRivalNames(7)];
            const quarter = [];
            for (let i = 0; i < entrants.length; i += 2) {
                quarter.push({ a: entrants[i], b: entrants[i + 1], winner: '', aScore: 0, bScore: 0 });
            }
            tournament.lastBracket = [
                { name: 'Quarterfinals', matches: quarter },
                { name: 'Semifinals', matches: [] },
                { name: 'Final', matches: [] }
            ];
            tournament.round = 0;
            tournament.wins = 0;
            tournament.seasonComplete = false;
            const allNames = [...new Set(entrants)];
            allNames.forEach((name) => ensureTournamentLeaderboardEntry(tournament, name));
        }

        function ensureTournamentLeaderboardEntry(tournament, name) {
            let entry = tournament.leaderboard.find((item) => item && item.name === name);
            if (!entry) {
                entry = { name, wins: 0, played: 0, points: 0 };
                tournament.leaderboard.push(entry);
            }
            return entry;
        }

        function simulateTournamentMatch(match) {
            const petStrength = typeof getPetMiniGameStrength === 'function' ? getPetMiniGameStrength(gameState.pet) : 0.5;
            const ruleModifier = tournamentState && tournamentState.ruleModifier ? tournamentState.ruleModifier : getMinigameRuleModifier('tournament');
            const scoreBias = Number(ruleModifier && ruleModifier.effect && ruleModifier.effect.playerScoreBonus) || 0;
            const varianceMult = Math.max(0.5, Number(ruleModifier && ruleModifier.effect && ruleModifier.effect.scoreVarianceMultiplier) || 1);
            const scoreFor = (name) => {
                const base = 52 + (Math.random() * 42 * varianceMult);
                const playerBoost = name === 'You'
                    ? ((petStrength - 0.45) * 36) + scoreBias
                    : ((Math.random() * 8 - 4) - ((petStrength - 0.5) * 8));
                return Math.max(18, Math.round(base + playerBoost + Math.random() * 18));
            };
            match.aScore = scoreFor(match.a);
            match.bScore = scoreFor(match.b);
            if (match.aScore === match.bScore) {
                if (Math.random() > 0.5) match.aScore += 1;
                else match.bScore += 1;
            }
            match.winner = match.aScore > match.bScore ? match.a : match.b;
            return match.winner;
        }

        function resolveTournamentRound() {
            const tournament = getTournamentState();
            if (tournament.seasonComplete) {
                tournament.season += 1;
                startNewTournamentSeason(tournament);
                saveGame();
                updateTournamentUI();
                return;
            }
            const roundIndex = tournament.round;
            const round = tournament.lastBracket[roundIndex];
            if (!round || !Array.isArray(round.matches) || round.matches.length === 0) return;

            const winners = [];
            round.matches.forEach((match) => {
                const winner = simulateTournamentMatch(match);
                winners.push(winner);
                const winnerEntry = ensureTournamentLeaderboardEntry(tournament, winner);
                winnerEntry.wins += 1;
                winnerEntry.played += 1;
                winnerEntry.points += 3;

                const loser = winner === match.a ? match.b : match.a;
                const loserEntry = ensureTournamentLeaderboardEntry(tournament, loser);
                loserEntry.played += 1;
                loserEntry.points += 1;

                if (winner === 'You') tournament.wins += 1;
            });

            if (roundIndex < tournament.lastBracket.length - 1) {
                const nextMatches = [];
                for (let i = 0; i < winners.length; i += 2) {
                    nextMatches.push({ a: winners[i], b: winners[i + 1], winner: '', aScore: 0, bScore: 0 });
                }
                tournament.lastBracket[roundIndex + 1].matches = nextMatches;
                tournament.round += 1;
            } else {
                tournament.seasonComplete = true;
                const champion = winners[0];
                if (champion === 'You') tournament.championships = (tournament.championships || 0) + 1;
                finalizeTournamentSeason(champion);
                return;
            }
            saveGame();
            updateTournamentUI();
        }

        function finalizeTournamentSeason(champion) {
            const tournament = getTournamentState();
            const wins = tournament.wins || 0;
            const championBonus = champion === 'You' ? 2 : 0;
            const score = wins + championBonus;
            const overlay = document.querySelector('.tournament-game-overlay');
            if (overlay) { overlay.innerHTML = ''; overlay.remove(); }
            if (tournamentState && tournamentState._escapeHandler) popModalEscape(tournamentState._escapeHandler);

            finalizeExpandedMiniGame({
                gameId: 'tournament',
                gameName: 'Tournament Cup',
                score,
                coinScore: Math.round((wins * 12 + championBonus * 8) * Math.max(0.5, Number((tournamentState && tournamentState.ruleModifier && tournamentState.ruleModifier.effect && tournamentState.ruleModifier.effect.coinMultiplier) || 1))),
                runDifficulty: getEscalatedMinigameDifficulty('tournament'),
                statDelta: {
                    happiness: Math.min(30, 8 + wins * 4 + championBonus * 3),
                    energy: -Math.min(14, 6 + wins * 2),
                    hunger: -Math.min(8, 3 + wins)
                },
                summaryStats: [
                    { label: 'Season Wins', value: wins },
                    { label: 'Champion', value: champion === 'You' ? 1 : 0 },
                    { label: 'Championships', value: tournament.championships || 0 }
                ],
                medalThresholds: { bronze: 2, silver: 3, gold: 5 },
                onAfterRewards: () => {
                    showToast(`Tournament complete. Champion: ${champion}`, champion === 'You' ? '#66BB6A' : '#FFA726');
                    tournament.seasonComplete = true;
                    saveGame();
                }
            });
            tournamentState = null;
        }

        function renderTournamentBracket(rounds) {
            return rounds.map((round, rIdx) => {
                const matchesHTML = (round.matches || []).map((match) => {
                    const winner = match.winner || '-';
                    return `<div class="tournament-match">
                        <div>${escapeHTML(match.a || '?')} <span>${match.aScore || 0}</span></div>
                        <div>${escapeHTML(match.b || '?')} <span>${match.bScore || 0}</span></div>
                        <div class="tournament-winner">Winner: ${escapeHTML(winner)}</div>
                    </div>`;
                }).join('');
                return `<div class="tournament-round ${tournamentState && tournamentState.round === rIdx ? 'active' : ''}">
                    <h4>${escapeHTML(round.name || `Round ${rIdx + 1}`)}</h4>
                    ${matchesHTML || '<p class="exp-game-note">Pending...</p>'}
                </div>`;
            }).join('');
        }

        function renderTournamentLeaderboard(leaderboard) {
            const sorted = [...leaderboard].sort((a, b) => b.points - a.points || b.wins - a.wins);
            return sorted.slice(0, 8).map((entry, idx) => (
                `<tr>
                    <td>${idx + 1}</td>
                    <td>${escapeHTML(entry.name)}</td>
                    <td>${entry.wins}</td>
                    <td>${entry.points}</td>
                </tr>`
            )).join('');
        }

        function startTournamentGame() {
            if (!gameState.pet) {
                showToast('You need a pet to enter tournaments.', '#FFA726');
                return;
            }
            tournamentState = getTournamentState();
            tournamentState.ruleModifier = getMinigameRuleModifier('tournament');
            const existing = document.querySelector('.tournament-game-overlay');
            if (existing) existing.remove();
            const overlay = document.createElement('div');
            overlay.className = 'tournament-game-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Mini game tournament');
            overlay.innerHTML = `
                <div class="exp-game-shell tournament-shell">
                    <h2 class="exp-game-title">🏆 Tournament Cup${tournamentState.ruleModifier && tournamentState.ruleModifier.name ? ` · ${escapeHTML(tournamentState.ruleModifier.name)}` : ''}</h2>
                    <div class="exp-game-hud">
                        <span id="tour-season">Season ${tournamentState.season || 1}</span>
                        <span id="tour-round">Round: ${tournamentState.round + 1}</span>
                        <span id="tour-champs">Titles: ${tournamentState.championships || 0}</span>
                    </div>
                    <div class="tournament-layout">
                        <div>
                            <h3>Bracket</h3>
                            <div id="tour-bracket" class="tournament-bracket"></div>
                        </div>
                        <div>
                            <h3>Leaderboard</h3>
                            <table class="tournament-leaderboard">
                                <thead><tr><th>#</th><th>Pet</th><th>W</th><th>Pts</th></tr></thead>
                                <tbody id="tour-leaderboard"></tbody>
                            </table>
                        </div>
                    </div>
                    <p class="exp-game-note" id="tour-note">${tournamentState.ruleModifier && tournamentState.ruleModifier.description ? escapeHTML(tournamentState.ruleModifier.description) : 'Advance the bracket one round at a time.'}</p>
                    <div class="exp-game-controls">
                        <button type="button" id="tour-next">Play Next Round</button>
                        <button type="button" id="tour-done">Done</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            overlay.querySelector('#tour-next').addEventListener('click', resolveTournamentRound);
            overlay.querySelector('#tour-done').addEventListener('click', () => {
                if (tournamentState && tournamentState._escapeHandler) popModalEscape(tournamentState._escapeHandler);
                const root = document.querySelector('.tournament-game-overlay');
                if (root) { root.innerHTML = ''; root.remove(); }
                tournamentState = null;
                restorePostMiniGameState();
            });
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    if (tournamentState && tournamentState._escapeHandler) popModalEscape(tournamentState._escapeHandler);
                    const root = document.querySelector('.tournament-game-overlay');
                    if (root) { root.innerHTML = ''; root.remove(); }
                    tournamentState = null;
                    restorePostMiniGameState();
                }
            });
            function tournamentEscapeHandler() {
                const root = document.querySelector('.tournament-game-overlay');
                if (root) { root.innerHTML = ''; root.remove(); }
                tournamentState = null;
                restorePostMiniGameState();
            }
            pushModalEscape(tournamentEscapeHandler);
            tournamentState._escapeHandler = tournamentEscapeHandler;
            trapFocus(overlay);
            overlay.querySelector('#tour-next').focus();
            updateTournamentUI();
        }

        function updateTournamentUI() {
            if (!tournamentState) return;
            const bracket = document.getElementById('tour-bracket');
            const leaderboardBody = document.getElementById('tour-leaderboard');
            const season = document.getElementById('tour-season');
            const round = document.getElementById('tour-round');
            const champs = document.getElementById('tour-champs');
            const nextBtn = document.getElementById('tour-next');
            const note = document.getElementById('tour-note');
            if (season) season.textContent = `Season ${tournamentState.season || 1}`;
            if (round) round.textContent = tournamentState.seasonComplete ? 'Round: Completed' : `Round: ${tournamentState.round + 1}`;
            if (champs) champs.textContent = `Titles: ${tournamentState.championships || 0}`;
            if (bracket) bracket.innerHTML = renderTournamentBracket(tournamentState.lastBracket || []);
            if (leaderboardBody) leaderboardBody.innerHTML = renderTournamentLeaderboard(tournamentState.leaderboard || []);
            if (nextBtn) nextBtn.textContent = tournamentState.seasonComplete ? 'Start Next Season' : 'Play Next Round';
            if (note) note.textContent = tournamentState.seasonComplete
                ? 'Season complete. Start the next bracket when ready.'
                : 'Each round resolves all matches and updates leaderboard points.';
        }

        // ==================== CO-OP TWO-PET MINI-GAME ====================

        let coopState = null;

        function startCoopRelayGame() {
            const pair = getCoopPetPair();
            if (pair.length < 2) {
                showToast('Adopt a second pet to unlock co-op mini games.', '#FFA726');
                return;
            }
            coopState = {
                pets: pair,
                score: 0,
                combo: 0,
                bestCombo: 0,
                expected: 'a',
                leftProgress: 0,
                rightProgress: 0,
                timeLeftMs: 32000,
                timerId: null
            };
            renderCoopRelayGame();
            announce(miniGameTouchMode()
                ? 'Co-op relay started. Tap left and right to keep the rhythm going.'
                : 'Co-op relay started. Alternate A for left pet and L for right pet.');
        }

        function renderCoopRelayGame() {
            const existing = document.querySelector('.coop-game-overlay');
            if (existing) existing.remove();
            const [leftPet, rightPet] = coopState.pets;
            const leftMood = getMood(leftPet);
            const rightMood = getMood(rightPet);
            const overlay = document.createElement('div');
            overlay.className = 'coop-game-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Co-op relay mini game');
            overlay.innerHTML = `
                <div class="exp-game-shell">
                    <h2 class="exp-game-title">🤝 Co-op Relay</h2>
                    <div class="exp-game-hud">
                        <span id="coop-score">Relay: 0</span>
                        <span id="coop-combo">Combo: 0</span>
                        <span id="coop-time">Time: 32s</span>
                    </div>
                    <div class="coop-lanes" id="coop-lanes" tabindex="0" aria-label="${miniGameTouchMode() ? 'Co-op relay. Tap left and right lanes to alternate.' : 'Co-op relay. Alternate A and L keys.'}">
                        <div class="coop-lane">
                            <div class="coop-pet">${generatePetSVG(leftPet, leftMood)}</div>
                            <div class="coop-bar"><div class="coop-bar-fill" id="coop-left-fill"></div></div>
                            <div class="coop-key">${miniGameTouchMode() ? 'Left' : 'A'}</div>
                        </div>
                        <div class="coop-lane">
                            <div class="coop-pet">${generatePetSVG(rightPet, rightMood)}</div>
                            <div class="coop-bar"><div class="coop-bar-fill" id="coop-right-fill"></div></div>
                            <div class="coop-key">${miniGameTouchMode() ? 'Right' : 'L'}</div>
                        </div>
                    </div>
                    <p class="exp-game-note" id="coop-note">${miniGameTouchMode() ? 'Tap Left to start, then alternate Left and Right.' : 'Press A to start, then alternate A and L.'}</p>
                    <div class="exp-game-controls">
                        <button type="button" id="coop-a">${miniGameTouchMode() ? 'Left' : 'Left (A)'}</button>
                        <button type="button" id="coop-l">${miniGameTouchMode() ? 'Right' : 'Right (L)'}</button>
                        <button type="button" id="coop-done">Done</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            overlay.querySelector('#coop-a').addEventListener('click', () => handleCoopInput('a'));
            overlay.querySelector('#coop-l').addEventListener('click', () => handleCoopInput('l'));
            overlay.querySelector('#coop-done').addEventListener('click', () => endCoopRelayGame(false));
            overlay.querySelector('#coop-lanes').addEventListener('keydown', (e) => {
                const key = e.key.toLowerCase();
                if (key === 'a' || key === 'l') {
                    e.preventDefault();
                    handleCoopInput(key);
                }
            });
            overlay.querySelector('#coop-lanes').addEventListener('pointerdown', (e) => {
                if (!miniGameTouchMode() && e.pointerType === 'mouse') return;
                const lanes = overlay.querySelector('#coop-lanes');
                if (!lanes) return;
                const rect = lanes.getBoundingClientRect();
                const useLeft = (e.clientX - rect.left) < (rect.width / 2);
                handleCoopInput(useLeft ? 'a' : 'l');
            });
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) requestMiniGameExit(coopState ? coopState.score : 0, () => endCoopRelayGame(false));
            });
            function coopEscapeHandler() {
                requestMiniGameExit(coopState ? coopState.score : 0, () => endCoopRelayGame(false));
            }
            pushModalEscape(coopEscapeHandler);
            coopState._escapeHandler = coopEscapeHandler;
            trapFocus(overlay);
            overlay.querySelector('#coop-lanes').focus();

            coopState.timerId = setInterval(stepCoopRelay, 150);
            updateCoopUI();
        }

        function handleCoopInput(key) {
            if (!coopState) return;
            const note = document.getElementById('coop-note');
            if (key === coopState.expected) {
                coopState.combo += 1;
                coopState.bestCombo = Math.max(coopState.bestCombo, coopState.combo);
                const gain = 3 + Math.floor(coopState.combo / 5);
                coopState.score += gain;
                if (key === 'a') {
                    coopState.leftProgress = Math.min(100, coopState.leftProgress + 10);
                    coopState.expected = 'l';
                } else {
                    coopState.rightProgress = Math.min(100, coopState.rightProgress + 10);
                    coopState.expected = 'a';
                }
                if (note) note.textContent = miniGameTouchMode()
                    ? `Great teamwork! Next: ${coopState.expected === 'a' ? 'Left' : 'Right'}`
                    : `Great teamwork! Next key: ${coopState.expected.toUpperCase()}`;
                if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.match);
            } else {
                coopState.combo = 0;
                coopState.score = Math.max(0, coopState.score - 3);
                if (note) note.textContent = miniGameTouchMode()
                    ? `Out of sync. Tap ${coopState.expected === 'a' ? 'Left' : 'Right'} next.`
                    : `Out of sync. Press ${coopState.expected.toUpperCase()} next.`;
                if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.miss);
            }
            updateCoopUI();
        }

        function stepCoopRelay() {
            if (!coopState) return;
            coopState.timeLeftMs -= 150;
            coopState.leftProgress = Math.max(0, coopState.leftProgress - 1.4);
            coopState.rightProgress = Math.max(0, coopState.rightProgress - 1.4);
            if (coopState.timeLeftMs <= 0) {
                endCoopRelayGame(true);
                return;
            }
            updateCoopUI();
        }

        function updateCoopUI() {
            if (!coopState) return;
            const scoreEl = document.getElementById('coop-score');
            const comboEl = document.getElementById('coop-combo');
            const timeEl = document.getElementById('coop-time');
            const leftFill = document.getElementById('coop-left-fill');
            const rightFill = document.getElementById('coop-right-fill');
            if (scoreEl) scoreEl.textContent = `Relay: ${coopState.score}`;
            if (comboEl) comboEl.textContent = `Combo: ${coopState.combo}`;
            if (timeEl) timeEl.textContent = `Time: ${Math.max(0, Math.ceil(coopState.timeLeftMs / 1000))}s`;
            if (leftFill) leftFill.style.width = `${coopState.leftProgress}%`;
            if (rightFill) rightFill.style.width = `${coopState.rightProgress}%`;
        }

        function endCoopRelayGame(completed) {
            dismissMiniGameExitDialog();
            if (!coopState) return;
            if (coopState.timerId) clearInterval(coopState.timerId);
            if (coopState._escapeHandler) popModalEscape(coopState._escapeHandler);
            const overlay = document.querySelector('.coop-game-overlay');
            if (overlay) { overlay.innerHTML = ''; overlay.remove(); }

            const score = coopState.score;
            if (score > 0 || completed) {
                const expansion = ensureMiniGameExpansionMeta();
                expansion.coop.sessions = Math.max(0, Math.floor(expansion.coop.sessions || 0)) + 1;
                expansion.coop.bestScore = Math.max(Math.floor(expansion.coop.bestScore || 0), score);
                finalizeExpandedMiniGame({
                    gameId: 'coop',
                    gameName: 'Co-op Relay',
                    score,
                    coinScore: Math.round(score / 3),
                    runDifficulty: getEscalatedMinigameDifficulty('coop'),
                    pets: coopState.pets,
                    statDelta: () => ({
                        happiness: Math.min(20, Math.round(score / 8)),
                        energy: -Math.min(12, Math.round(score / 10)),
                        hunger: -Math.min(8, Math.round(score / 14))
                    }),
                    summaryStats: [
                        { label: 'Relay Score', value: score },
                        { label: 'Best Combo', value: coopState.bestCombo },
                        { label: 'Sessions', value: expansion.coop.sessions }
                    ],
                    medalThresholds: { bronze: 60, silver: 120, gold: 200 }
                });
            } else {
                restorePostMiniGameState();
            }
            coopState = null;
        }

        // ==================== FISHING MINI-GAME ====================

        let fishingState = null;

        function startFishingGame() {
            if (!gameState.pet) {
                showToast('You need a pet for pond fishing.', '#FFA726');
                return;
            }
            const difficulty = getMinigameDifficulty('fishing');
            fishingState = {
                roundsLeft: 10,
                catches: 0,
                misses: 0,
                marker: 0,
                velocity: 1.8 + difficulty * 0.9,
                zoneStart: 35,
                zoneSize: Math.max(20, Math.round(38 / Math.max(difficulty, 0.75))),
                timerId: null
            };
            initMiniGameRuntimeTracking(fishingState, { overlaySelector: '.fishing-game-overlay' });
            randomizeFishingZone();
            renderFishingGame();
            announce('Fishing started. Reel in when the bobber enters the fish zone.');
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
                    <h2 class="exp-game-title">🎣 Pond Fishing</h2>
                    <div class="exp-game-hud">
                        <span id="fishing-rounds">Casts Left: 10</span>
                        <span id="fishing-catches">Catches: 0</span>
                        <span id="fishing-misses">Misses: 0</span>
                    </div>
                    <div class="fishing-meter" id="fishing-meter" tabindex="0" aria-label="Fishing meter. Press Space to reel in.">
                        <div class="fishing-zone" id="fishing-zone"></div>
                        <div class="fishing-marker" id="fishing-marker"></div>
                    </div>
                    <p class="exp-game-note" id="fishing-note">Press Catch when the marker is inside the fish zone.</p>
                    <div class="exp-game-controls">
                        <button type="button" id="fishing-catch">Catch</button>
                        <button type="button" id="fishing-done">Done</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            trackMiniGameOverlay(fishingState, overlay);

            function catchAction() { attemptFishingCatch(); }
            bindMiniGameEvent(fishingState, overlay.querySelector('#fishing-catch'), 'click', catchAction);
            bindMiniGameEvent(fishingState, overlay.querySelector('#fishing-done'), 'click', () => endFishingGame(false));
            bindMiniGameEvent(fishingState, overlay.querySelector('#fishing-meter'), 'keydown', (e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    catchAction();
                }
            });
            bindMiniGameEvent(fishingState, overlay, 'click', (e) => {
                if (e.target === overlay) requestMiniGameExit(fishingState ? fishingState.catches : 0, () => endFishingGame(false));
            });
            function fishingEscapeHandler() {
                requestMiniGameExit(fishingState ? fishingState.catches : 0, () => endFishingGame(false));
            }
            registerMiniGameEscapeHandler(fishingState, fishingEscapeHandler);
            trapFocus(overlay);
            overlay.querySelector('#fishing-meter').focus();

            fishingState.timerId = trackMiniGameInterval(fishingState, stepFishingMeter, 45);
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
            const marker = document.getElementById('fishing-marker');
            if (marker) marker.style.left = `${fishingState.marker}%`;
        }

        function updateFishingUI() {
            if (!fishingState) return;
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
        }

        function attemptFishingCatch() {
            if (!fishingState || fishingState.roundsLeft <= 0) return;
            const inZone = fishingState.marker >= fishingState.zoneStart && fishingState.marker <= (fishingState.zoneStart + fishingState.zoneSize);
            const note = document.getElementById('fishing-note');
            fishingState.roundsLeft -= 1;
            if (inZone) {
                fishingState.catches += 1;
                if (note) note.textContent = 'Nice catch! Cast again.';
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
            if (!fishingState) {
                dismissMiniGameExitDialog();
                return;
            }
            const finalState = fishingState;
            teardownMiniGameRuntime(finalState, { overlaySelector: '.fishing-game-overlay' });

            const catches = finalState.catches;
            if (catches > 0 || completed) {
                const attempts = catches + finalState.misses;
                const accuracy = attempts > 0 ? Math.round((catches / attempts) * 100) : 0;
                finalizeExpandedMiniGame({
                    gameId: 'fishing',
                    gameName: 'Pond Fishing',
                    score: catches,
                    coinScore: catches * 6,
                    statDelta: {
                        happiness: Math.min(22, catches * 4),
                        energy: -Math.min(10, Math.max(2, finalState.misses + 2)),
                        hunger: -Math.min(6, Math.round(attempts / 3))
                    },
                    summaryStats: [
                        { label: 'Catches', value: catches },
                        { label: 'Accuracy', value: accuracy },
                        { label: 'Happiness', value: Math.min(22, catches * 4) }
                    ],
                    medalThresholds: { bronze: 3, silver: 6, gold: 8 }
                });
            } else {
                restorePostMiniGameState();
            }
            fishingState = null;
        }

        function teardownFishingGame() {
            if (!fishingState) {
                dismissMiniGameExitDialog();
                return false;
            }
            teardownMiniGameRuntime(fishingState, { overlaySelector: '.fishing-game-overlay' });
            fishingState = null;
            return true;
        }

        if (typeof MiniGameRegistry !== 'undefined' && MiniGameRegistry && typeof MiniGameRegistry.registerLifecycle === 'function') {
            MiniGameRegistry.registerLifecycle('fishing', {
                start: startFishingGame,
                teardown: teardownFishingGame,
                getState: () => fishingState,
                overlaySelector: '.fishing-game-overlay'
            });
        }

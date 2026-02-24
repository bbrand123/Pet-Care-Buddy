        // ==================== LANE RACING MINI-GAME ====================

        let racingState = null;

        function startRacingGame() {
            if (!gameState.pet) {
                showToast('You need a pet to race.', '#FFA726');
                return;
            }
            const difficulty = getMinigameDifficulty('racing');
            racingState = {
                lane: 1,
                score: 0,
                lives: 3,
                elapsedMs: 0,
                durationMs: 32000,
                obstacles: [],
                spawnEvery: Math.max(8, Math.round(18 / Math.max(0.7, difficulty))),
                speed: 2.7 * difficulty,
                tick: 0,
                obstacleId: 1,
                timerId: null
            };
            initMiniGameRuntimeTracking(racingState, { overlaySelector: '.racing-game-overlay' });
            renderRacingGame();
            announce('Lane racing started. Use left and right arrows to dodge obstacles.');
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
                    <div class="racing-track" id="racing-track" tabindex="0" aria-label="Race track. Use left and right arrows to switch lanes.">
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
            trackMiniGameOverlay(racingState, overlay);

            const track = overlay.querySelector('#racing-track');
            bindMiniGameEvent(racingState, overlay.querySelector('#racing-left'), 'click', () => moveRacingLane(-1));
            bindMiniGameEvent(racingState, overlay.querySelector('#racing-right'), 'click', () => moveRacingLane(1));
            bindMiniGameEvent(racingState, overlay.querySelector('#racing-done'), 'click', () => endRacingGame(false));
            bindMiniGameEvent(racingState, track, 'keydown', (e) => {
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
            bindMiniGameEvent(racingState, overlay, 'click', (e) => {
                if (e.target === overlay) requestMiniGameExit(racingState ? racingState.score : 0, () => endRacingGame(false));
            });
            registerMiniGameEscapeHandler(racingState, racingEscapeHandler);
            trapFocus(overlay);
            track.focus();

            racingState.timerId = trackMiniGameInterval(racingState, stepRacingGame, 90);
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
                    if (typeof screenShake === 'function') screenShake(2, 200);
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
            if (!racingState) {
                dismissMiniGameExitDialog();
                return;
            }
            const finalState = racingState;
            teardownMiniGameRuntime(finalState, { overlaySelector: '.racing-game-overlay' });

            const score = finalState.score;
            if (score > 0 || fromTimeout) {
                finalizeExpandedMiniGame({
                    gameId: 'racing',
                    gameName: 'Lane Racing',
                    score,
                    coinScore: score * 5,
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

        function teardownRacingGame() {
            if (!racingState) {
                dismissMiniGameExitDialog();
                return false;
            }
            teardownMiniGameRuntime(racingState, { overlaySelector: '.racing-game-overlay' });
            racingState = null;
            return true;
        }

        if (typeof MiniGameRegistry !== 'undefined' && MiniGameRegistry && typeof MiniGameRegistry.registerLifecycle === 'function') {
            MiniGameRegistry.registerLifecycle('racing', {
                start: startRacingGame,
                teardown: teardownRacingGame,
                getState: () => racingState,
                overlaySelector: '.racing-game-overlay'
            });
        }

        // ==================== ENDLESS RUNNER MINI-GAME ====================

        let runnerState = null;

        function startRunnerGame() {
            if (!gameState.pet) {
                showToast('You need a pet to run.', '#FFA726');
                return;
            }
            const difficulty = getMinigameDifficulty('runner');
            runnerState = {
                y: 0,
                velocity: 0,
                score: 0,
                tick: 0,
                obstacles: [],
                speed: 1.9 * difficulty,
                spawnEvery: Math.max(24, Math.round(50 / Math.max(0.75, difficulty))),
                timerId: null
            };
            renderRunnerGame();
            announce('Endless runner started. Press Space to jump.');
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
                    <div class="runner-track" id="runner-track" tabindex="0" aria-label="Runner track. Press space to jump obstacles.">
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
                if (typeof screenShake === 'function') screenShake(2, 200);
                endRunnerGame(true, true);
            }
        }

        function updateRunnerUI() {
            if (!runnerState) return;
            const scoreEl = document.getElementById('runner-score');
            const speedEl = document.getElementById('runner-speed');
            const playerEl = document.getElementById('runner-player');
            const obstaclesEl = document.getElementById('runner-obstacles');
            if (scoreEl) scoreEl.textContent = `Meters: ${runnerState.score}`;
            if (speedEl) speedEl.textContent = `Speed: ${runnerState.speed.toFixed(1)}`;
            if (playerEl) playerEl.style.bottom = `${16 + runnerState.y}px`;
            if (obstaclesEl) {
                obstaclesEl.innerHTML = runnerState.obstacles
                    .map((obs) => `<div class="runner-obstacle" style="left:${obs.x}%;width:${obs.width}%"></div>`)
                    .join('');
            }
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

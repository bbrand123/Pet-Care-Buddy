        // ==================== FETCH MINI-GAME ====================

	        let fetchState = null;
	        const FETCH_GAME_TIME_LIMIT_MS = 30000;

        function startFetchGame() {
            if (!gameState.pet) {
                if (typeof showToast === 'function') {
                    showToast('You need a pet to play this game.', '#FFA726');
                }
                return;
            }
            const fetchDiff = getMinigameDifficulty('fetch');
	            fetchState = {
	                score: 0,
	                phase: 'ready', // 'ready', 'thrown', 'fetching', 'returning'
                ballX: 50,
                ballY: 160,
                petX: 45,
                targetX: 0,
	                difficulty: fetchDiff,
	                startedAt: Date.now(),
	                endsAt: Date.now() + FETCH_GAME_TIME_LIMIT_MS,
	                timeLimitMs: FETCH_GAME_TIME_LIMIT_MS,
	                _timeouts: [],
	                _intervals: []
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
	                    <p class="fetch-game-score" id="fetch-score">Fetched: ${fetchState.score} · Time: <span id="fetch-timer">${Math.ceil(fetchState.timeLimitMs / 1000)}s</span></p>
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
	            startFetchGameTimer();
	            updateFetchExitButtons();
	            fetchState._updateExitButtons = updateFetchExitButtons;
	        }

	        function startFetchGameTimer() {
	            if (!fetchState || fetchState._ended) return;
	            const updateTimerDisplay = () => {
	                if (!fetchState || fetchState._ended) return;
	                const timerEl = document.getElementById('fetch-timer');
	                if (!timerEl) return;
	                const remainingMs = Math.max(0, (Number(fetchState.endsAt) || 0) - Date.now());
	                timerEl.textContent = `${Math.ceil(remainingMs / 1000)}s`;
	            };
	            updateTimerDisplay();
	            fetchState._intervals.push(setInterval(updateTimerDisplay, 250));
	            fetchState._timeouts.push(setTimeout(() => {
	                if (!fetchState || fetchState._ended) return;
	                const instruction = document.getElementById('fetch-instruction');
	                if (instruction) {
	                    instruction.textContent = 'Time is up!';
	                    instruction.className = 'fetch-instruction highlight';
	                }
	                announce(`Fetch time is up! Final score: ${fetchState.score}.`);
	                endFetchGame('timeout');
	            }, Math.max(100, (Number(fetchState.endsAt) || Date.now()) - Date.now())));
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

	            // Keep pacing fixed so difficulty changes do not increase cycles/minute.
	            const fetchSpeed = 1;

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

	        function endFetchGame(endReason) {
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
	            if (fetchState && fetchState._intervals) {
	                fetchState._intervals.forEach(id => clearInterval(id));
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
                const coinReward = (typeof awardMiniGameCoins === 'function') ? awardMiniGameCoins('fetch', fetchState.score) : 0;
                const previousBest = Number((gameState.minigameHighScores || {}).fetch || 0);
                const isNewBest = updateMinigameHighScore('fetch', fetchState.score);
                const bestMsg = isNewBest ? ' New best!' : '';

                // Update displays
                updateNeedDisplays();
                updatePetMood();
                updateWellnessBar();
                saveGame();

	                const reasonSuffix = endReason === 'timeout' ? ' Time limit reached.' : '';
	                announce(`Fetch game over! ${fetchState.score} catches! Happiness +${bonus}! Coins +${coinReward}!${bestMsg}${reasonSuffix}`);
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
	                if (endReason === 'timeout' && typeof showToast === 'function') {
	                    showToast('⏱️ Fetch time is up!', '#90A4AE');
	                }
	                restorePostMiniGameState();
	            }

            fetchState = null;
        }

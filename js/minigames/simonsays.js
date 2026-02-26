        // ==================== SIMON SAYS MINI-GAME ====================

        const SIMON_COLORS = ['green', 'red', 'yellow', 'blue'];
        const SIMON_ICONS = { green: '🟢', red: '🔴', yellow: '🟡', blue: '🔵' };
        const SIMON_FREQUENCIES = { green: 392, red: 523.25, yellow: 659.25, blue: 783.99 };
        const SIMON_TONE_SHAPES = {
            green: { type: 'triangle', harmonic: { frequency: 784, type: 'sine', gainMultiplier: 0.28 } },
            red: { type: 'square', harmonic: { frequency: 1046.5, type: 'triangle', gainMultiplier: 0.22 } },
            yellow: { type: 'sawtooth', harmonic: { frequency: 988.88, type: 'square', gainMultiplier: 0.18 } },
            blue: { type: 'sine', harmonic: { frequency: 391.99, type: 'triangle', gainMultiplier: 0.25 } }
        };

        let simonState = null;

        function simonGetAudioCtx() {
            if (typeof GameAudio !== 'undefined' && GameAudio.getContext) {
                return GameAudio.getContext();
            }
            return null;
        }

        function simonPlayTone(color, duration) {
            if (typeof GameAudio !== 'undefined' && !GameAudio.getEnabled()) return;
            if (typeof GameAudio !== 'undefined' && typeof GameAudio.playMiniGameTone === 'function') {
                const shape = SIMON_TONE_SHAPES[color] || { type: 'sine' };
                const freq = Number(SIMON_FREQUENCIES[color] || 440);
                const durMs = Math.max(70, Number(duration) || 180);
                GameAudio.playMiniGameTone({
                    bus: 'gameplay',
                    type: shape.type,
                    frequency: freq,
                    frequencyEnd: freq * (color === 'red' ? 0.97 : 1.01),
                    durationMs: durMs,
                    gain: 0.16,
                    sustain: 0.25,
                    harmonic: shape.harmonic
                });
                if (color === 'yellow') {
                    setTimeout(() => {
                        if (typeof GameAudio !== 'undefined' && typeof GameAudio.playMiniGameTone === 'function') {
                            GameAudio.playMiniGameTone({ bus: 'gameplay', type: 'square', frequency: freq * 0.5, durationMs: Math.max(50, durMs * 0.45), gain: 0.07 });
                        }
                    }, 28);
                }
                return;
            }
            try {
                const ctx = simonGetAudioCtx();
                if (!ctx) return;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = SIMON_FREQUENCIES[color];
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
                osc.connect(gain);
                const dest = (typeof GameAudio !== 'undefined' && GameAudio.getMasterGain && GameAudio.getMasterGain()) || ctx.destination;
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
            if (typeof GameAudio !== 'undefined' && typeof GameAudio.playMiniGameTone === 'function') {
                GameAudio.playMiniGameTone({
                    bus: 'gameplay',
                    type: 'sawtooth',
                    frequency: 180,
                    frequencyEnd: 120,
                    durationMs: 320,
                    gain: 0.16,
                    sustain: 0.2
                });
                setTimeout(() => {
                    if (typeof GameAudio !== 'undefined' && typeof GameAudio.playMiniGameTone === 'function') {
                        GameAudio.playMiniGameTone({ bus: 'gameplay', type: 'square', frequency: 110, durationMs: 190, gain: 0.1 });
                    }
                }, 120);
                if (typeof GameAudio !== 'undefined' && typeof GameAudio.playAccessibilityCue === 'function') {
                    GameAudio.playAccessibilityCue('error', { gain: 0.78, caption: 'Wrong Simon input' });
                }
                return;
            }
            try {
                const ctx = simonGetAudioCtx();
                if (!ctx) return;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.value = 150;
                gain.gain.setValueAtTime(0.25, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
                osc.connect(gain);
                const dest = (typeof GameAudio !== 'undefined' && GameAudio.getMasterGain && GameAudio.getMasterGain()) || ctx.destination;
                gain.connect(dest);
                osc.start();
                osc.stop(ctx.currentTime + 0.6);
                osc.onended = () => { osc.disconnect(); gain.disconnect(); };
            } catch (e) {
                // Audio not supported
            }
        }

        function startSimonSaysGame() {
            const existingOverlay = document.querySelector('.simonsays-game-overlay');
            if (existingOverlay) { existingOverlay.remove(); }
            if (!gameState.pet) {
                if (typeof showToast === 'function') {
                    showToast('You need a pet to play this game.', '#FFA726');
                }
                return;
            }

            const simonDiff = getMinigameDifficulty('simonsays');
            simonState = {
                pattern: [],
                playerIndex: 0,
                round: 0,
                score: 0,
                highestRound: 0,
                phase: 'watching', // 'watching', 'playing', 'gameover'
                playbackIndex: 0,
                playbackTimers: [],
                difficulty: simonDiff,
                active: true
            };
            // P2-50: Register with runtime tracker for consistent cleanup
            if (typeof initMiniGameRuntimeTracking === 'function') {
                initMiniGameRuntimeTracking(simonState, { overlaySelector: '.simonsays-game-overlay' });
            }
            if (typeof GameAudio !== 'undefined' && typeof GameAudio.setGameplayAudioState === 'function') {
                GameAudio.setGameplayAudioState({ active: true, minigame: 'simonsays', intensity: 0.16, timeOfDay: gameState.timeOfDay || null });
            }
            if (typeof GameAudio !== 'undefined' && typeof GameAudio.playAccessibilityCue === 'function') {
                GameAudio.playAccessibilityCue('objectiveStart', { gain: 0.72, caption: 'Simon Says started' });
            }

            renderSimonSaysGame();
            if (simonState._roundTransitionTimer) clearTimeout(simonState._roundTransitionTimer);
            simonState._roundTransitionTimer = setTimeout(() => simonNextRound(), 800);

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
            if (typeof GameAudio !== 'undefined' && typeof GameAudio.setGameplayAudioIntensity === 'function') {
                GameAudio.setGameplayAudioIntensity(Math.min(0.8, 0.12 + (simonState.round * 0.07)));
            }

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
            if (typeof GameAudio !== 'undefined' && typeof GameAudio.emitAccessibilityCue === 'function') {
                GameAudio.emitAccessibilityCue('simonPad', { playSound: false, caption: `${color} pad` });
            }

            simonState.playbackIndex++;
            simonState.playbackTimers.push(setTimeout(() => simonPlayPattern(speed), speed));
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
                if (typeof GameAudio !== 'undefined' && typeof GameAudio.playRewardCue === 'function' && (simonState.playerIndex % 2 === 0)) {
                    GameAudio.playRewardCue(simonState.playerIndex >= 6 ? 'medium' : 'small', { gain: 0.52, skipAccent: true });
                }
                if (typeof hapticBuzz === 'function') hapticBuzz(30);
                announce(`You pressed ${color}. Correct!`);

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
                    if (typeof GameAudio !== 'undefined' && typeof GameAudio.playAccessibilityCue === 'function') {
                        GameAudio.playAccessibilityCue('comboRise', { gain: 0.64, caption: `Round ${simonState.round} complete` });
                    }

                    // Next round after a brief pause
                    if (simonState._roundTransitionTimer) clearTimeout(simonState._roundTransitionTimer);
                    simonState._roundTransitionTimer = setTimeout(() => simonNextRound(), 1000);
                }
            } else {
                // Wrong!
                simonState.phase = 'gameover';
                simonPlayErrorTone();
                simonSetPadsDisabled(true);
                announce(`You pressed ${color}. Wrong!`);

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
                if (typeof GameAudio !== 'undefined' && typeof GameAudio.setGameplayAudioIntensity === 'function') {
                    GameAudio.setGameplayAudioIntensity(0.08);
                }

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
            // P2-50: Use runtime tracker for consistent cleanup
            if (typeof teardownMiniGameRuntime === 'function') {
                teardownMiniGameRuntime(simonState, { overlaySelector: '.simonsays-game-overlay' });
            } else {
                dismissMiniGameExitDialog();
                if (simonState.playbackTimers) { simonState.playbackTimers.forEach(id => clearTimeout(id)); simonState.playbackTimers = []; }
                if (simonState._autoEndTimeout) clearTimeout(simonState._autoEndTimeout);
                if (simonState._roundTransitionTimer) clearTimeout(simonState._roundTransitionTimer);
                if (simonState._escapeHandler) popModalEscape(simonState._escapeHandler);
                const overlay = document.querySelector('.simonsays-game-overlay');
                if (overlay) { overlay.innerHTML = ''; overlay.remove(); }
            }

            incrementMinigamePlayCount('simonsays', simonState ? simonState.score : 0);

            // Apply rewards based on rounds completed
            if (simonState && simonState.score > 0 && gameState.pet) {
                const roundsCompleted = Math.max(simonState.highestRound || 0, 0);
                const happinessBonus = Math.min(roundsCompleted * 4, 30);
                const energyCost = Math.min(roundsCompleted * 2, 10);

                gameState.pet.happiness = clamp(gameState.pet.happiness + happinessBonus, 0, 100);
                gameState.pet.energy = clamp(gameState.pet.energy - energyCost, 0, 100);
                const coinReward = (typeof awardMiniGameCoins === 'function') ? awardMiniGameCoins('simonsays', roundsCompleted * 8) : 0;
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
            if (typeof GameAudio !== 'undefined' && typeof GameAudio.playAccessibilityCue === 'function') {
                GameAudio.playAccessibilityCue('objectiveEnd', { gain: 0.74, caption: 'Simon Says ended' });
            }
            if (typeof GameAudio !== 'undefined' && typeof GameAudio.clearGameplayAudioState === 'function') {
                GameAudio.clearGameplayAudioState();
            }

            simonState = null;
        }

        // P1-17: Register lifecycle so teardownAll() can clean up Simon Says.
        if (typeof MiniGameRegistry !== 'undefined' && MiniGameRegistry && typeof MiniGameRegistry.registerLifecycle === 'function') {
            MiniGameRegistry.registerLifecycle('simonsays', {
                start: startSimonSaysGame,
                teardown: function teardownSimonSaysGame() {
                    if (!simonState) { dismissMiniGameExitDialog(); return false; }
                    endSimonSaysGame();
                    return true;
                },
                getState: function () { return simonState; },
                overlaySelector: '.simonsays-game-overlay'
            });
        }

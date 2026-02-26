	        // ==================== RHYTHM MINI-GAME ====================

	        let rhythmState = null;

	        function playProceduralBeat(accent) {
	            if (typeof GameAudio !== 'undefined' && typeof GameAudio.playMiniGameTone === 'function') {
	                if (accent) {
	                    GameAudio.playMiniGameTone({
	                        bus: 'gameplay',
	                        type: 'square',
	                        frequency: 220,
	                        frequencyEnd: 205,
	                        durationMs: 130,
	                        gain: 0.16,
	                        sustain: 0.18,
	                        harmonic: { frequency: 440, type: 'triangle', gainMultiplier: 0.24 }
	                    });
	                    setTimeout(() => {
	                        if (typeof GameAudio !== 'undefined' && typeof GameAudio.playMiniGameTone === 'function') {
	                            GameAudio.playMiniGameTone({ bus: 'gameplay', type: 'triangle', frequency: 110, durationMs: 70, gain: 0.08 });
	                        }
	                    }, 36);
	                    if (typeof GameAudio !== 'undefined' && typeof GameAudio.emitAccessibilityCue === 'function') {
	                        GameAudio.emitAccessibilityCue('rhythmBeatAccent', { playSound: false, caption: 'Strong beat' });
	                    }
	                    return;
	                }
	                GameAudio.playMiniGameTone({
	                    bus: 'gameplay',
	                    type: 'triangle',
	                    frequency: 160,
	                    frequencyEnd: 155,
	                    durationMs: 105,
	                    gain: 0.1,
	                    sustain: 0.12
	                });
	                return;
	            }
	        }

        function startRhythmGame() {
            if (!gameState.pet) {
                showToast('You need a pet to jam.', '#FFA726');
                return;
            }
            const difficulty = getMinigameDifficulty('rhythm');
            rhythmState = {
                beat: 0,
                totalBeats: 24,
                score: 0,
                combo: 0,
                bestCombo: 0,
                expectedAt: performance.now(),
                lastRegisteredBeat: -1,
                intervalMs: Math.max(440, Math.round(720 / Math.max(0.75, difficulty))),
                timerId: null
            };
	            initMiniGameRuntimeTracking(rhythmState, { overlaySelector: '.rhythm-game-overlay' });
	            if (typeof GameAudio !== 'undefined' && typeof GameAudio.setGameplayAudioState === 'function') {
	                GameAudio.setGameplayAudioState({ active: true, minigame: 'rhythm', intensity: 0.2, timeOfDay: gameState.timeOfDay || null });
	            }
	            if (typeof GameAudio !== 'undefined' && typeof GameAudio.playAccessibilityCue === 'function') {
	                GameAudio.playAccessibilityCue('objectiveStart', { gain: 0.72, caption: 'Rhythm game started' });
	            }
	            registerMiniGameAudioStop(rhythmState, () => {
	                try {
	                    if (typeof GameAudio !== 'undefined' && typeof GameAudio.clearGameplayAudioState === 'function') GameAudio.clearGameplayAudioState();
	                } catch (e) {}
	            });
	            renderRhythmGame();
            announce('Rhythm game started. Press Space on the beat.');
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
                    <div class="rhythm-lights" id="rhythm-lights" tabindex="0" aria-label="Rhythm target. Press Space to hit beats.">
                        <div class="rhythm-light" data-rhythm-light="0"></div>
                        <div class="rhythm-light" data-rhythm-light="1"></div>
                        <div class="rhythm-light" data-rhythm-light="2"></div>
                        <div class="rhythm-light" data-rhythm-light="3"></div>
                    </div>
                    <p class="exp-game-note" id="rhythm-note">Hit Space on each beat pulse.</p>
                    <div class="exp-game-controls">
                        <button type="button" id="rhythm-hit">Hit Beat</button>
                        <button type="button" id="rhythm-done">Done</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            trackMiniGameOverlay(rhythmState, overlay);

            const beatAction = () => registerRhythmHit();
            bindMiniGameEvent(rhythmState, overlay.querySelector('#rhythm-hit'), 'click', beatAction);
            bindMiniGameEvent(rhythmState, overlay.querySelector('#rhythm-done'), 'click', () => endRhythmGame(false));
            bindMiniGameEvent(rhythmState, overlay.querySelector('#rhythm-lights'), 'keydown', (e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    beatAction();
                }
            });
            bindMiniGameEvent(rhythmState, overlay, 'click', (e) => {
                if (e.target === overlay) requestMiniGameExit(rhythmState ? rhythmState.score : 0, () => endRhythmGame(false));
            });
            function rhythmEscapeHandler() {
                requestMiniGameExit(rhythmState ? rhythmState.score : 0, () => endRhythmGame(false));
            }
            registerMiniGameEscapeHandler(rhythmState, rhythmEscapeHandler);
            trapFocus(overlay);
            overlay.querySelector('#rhythm-lights').focus();

            rhythmState.timerId = trackMiniGameInterval(rhythmState, stepRhythmBeat, rhythmState.intervalMs);
            setTimeout(stepRhythmBeat, 1000); // P3-54: 1 second grace period before first beat
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
	            if (typeof GameAudio !== 'undefined' && typeof GameAudio.setGameplayAudioIntensity === 'function') {
	                const progressIntensity = Math.min(0.88, 0.18 + ((rhythmState.beat / rhythmState.totalBeats) * 0.28) + (Math.min(10, rhythmState.combo || 0) * 0.02));
	                GameAudio.setGameplayAudioIntensity(progressIntensity);
	            }
	            const lights = document.querySelectorAll('.rhythm-light');
            const lightIndex = (rhythmState.beat - 1) % lights.length;
            lights.forEach((light, idx) => light.classList.toggle('active', idx === lightIndex));
            const note = document.getElementById('rhythm-note');
            if (note) note.textContent = accent ? 'Strong beat!' : 'Keep the rhythm steady.';
            const beatEl = document.getElementById('rhythm-beat');
            if (beatEl) beatEl.textContent = `Beat: ${Math.min(rhythmState.beat, rhythmState.totalBeats)}/${rhythmState.totalBeats}`; // P3-53: Cap display at totalBeats
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
	                if (typeof GameAudio !== 'undefined') {
	                    if (typeof GameAudio.playRewardCue === 'function') {
	                        GameAudio.playRewardCue(rhythmState.combo >= 8 ? 'medium' : 'small', { gain: rhythmState.combo >= 8 ? 0.72 : 0.52 });
	                    }
	                    if (GameAudio.playSFX) GameAudio.playSFX(GameAudio.sfx.match);
	                    if (typeof GameAudio.setGameplayAudioIntensity === 'function') {
	                        GameAudio.setGameplayAudioIntensity(Math.min(0.95, 0.22 + (Math.min(12, rhythmState.combo) * 0.05)));
	                    }
	                }
	            } else if (delta <= 190) {
                rhythmState.combo = Math.max(0, rhythmState.combo - 1);
                rhythmState.score += 1;
	                if (note) note.textContent = 'Good timing.';
	                if (typeof GameAudio !== 'undefined' && typeof GameAudio.playMiniGameTone === 'function') {
	                    GameAudio.playMiniGameTone({ bus: 'gameplay', type: 'triangle', frequency: 180, durationMs: 70, gain: 0.06 });
	                }
	            } else {
	                rhythmState.combo = 0;
	                if (note) note.textContent = 'Missed beat. Get back in sync.';
	                if (typeof GameAudio !== 'undefined') {
	                    if (typeof GameAudio.playUiCue === 'function') GameAudio.playUiCue('error', { gain: 0.62 });
	                    if (GameAudio.playSFX) GameAudio.playSFX(GameAudio.sfx.miss);
	                    if (typeof GameAudio.setGameplayAudioIntensity === 'function') GameAudio.setGameplayAudioIntensity(0.14);
	                    if (typeof GameAudio.playAccessibilityCue === 'function') {
	                        GameAudio.playAccessibilityCue('countdownDanger', { gain: 0.58, caption: 'Missed beat' });
	                    }
	                }
	            }
            const scoreEl = document.getElementById('rhythm-score');
            const comboEl = document.getElementById('rhythm-combo');
            if (scoreEl) scoreEl.textContent = `Score: ${rhythmState.score}`;
            if (comboEl) comboEl.textContent = `Combo: ${rhythmState.combo}`;
        }

        function endRhythmGame(completed) {
            if (!rhythmState) {
                dismissMiniGameExitDialog();
                return;
            }
            const finalState = rhythmState;
            teardownMiniGameRuntime(finalState, { overlaySelector: '.rhythm-game-overlay' });

            const score = finalState.score;
            if (score > 0 || completed) {
                finalizeExpandedMiniGame({
                    gameId: 'rhythm',
                    gameName: 'Rhythm Beats',
                    score,
                    coinScore: Math.round(score * 0.85),
                    statDelta: {
                        happiness: Math.min(28, Math.round(score / 2.2)),
                        energy: -Math.min(12, Math.max(4, Math.round(finalState.totalBeats / 3)))
                    },
                    summaryStats: [
                        { label: 'Beats', value: finalState.totalBeats },
                        { label: 'Best Combo', value: finalState.bestCombo },
                        { label: 'Happiness', value: Math.min(28, Math.round(score / 2.2)) }
                    ],
                    medalThresholds: { bronze: 20, silver: 42, gold: 72 }
                });
	            } else {
	                restorePostMiniGameState();
	            }
	            if (typeof GameAudio !== 'undefined' && typeof GameAudio.playAccessibilityCue === 'function') {
	                GameAudio.playAccessibilityCue('objectiveEnd', { gain: 0.72, caption: 'Rhythm game ended' });
	            }
	            // P3-55: clearGameplayAudioState is already called via registerMiniGameAudioStop callback
	            // inside teardownMiniGameRuntime above; explicit duplicate call removed here.
	            rhythmState = null;
	        }

        function teardownRhythmGame() {
            if (!rhythmState) {
                dismissMiniGameExitDialog();
                return false;
            }
	            teardownMiniGameRuntime(rhythmState, { overlaySelector: '.rhythm-game-overlay' });
	            if (typeof GameAudio !== 'undefined' && typeof GameAudio.clearGameplayAudioState === 'function') {
	                GameAudio.clearGameplayAudioState();
	            }
	            rhythmState = null;
	            return true;
	        }

        if (typeof MiniGameRegistry !== 'undefined' && MiniGameRegistry && typeof MiniGameRegistry.registerLifecycle === 'function') {
            MiniGameRegistry.registerLifecycle('rhythm', {
                start: startRhythmGame,
                teardown: teardownRhythmGame,
                getState: () => rhythmState,
                overlaySelector: '.rhythm-game-overlay'
            });
        }

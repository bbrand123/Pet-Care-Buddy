        // ==================== RHYTHM MINI-GAME ====================

        let rhythmState = null;
        let _rhythmAudioCtx = null;

        function getRhythmAudioContext() {
            try {
                const Ctx = window.AudioContext || window.webkitAudioContext;
                if (!Ctx) return null;
                if (!_rhythmAudioCtx) _rhythmAudioCtx = new Ctx();
                return _rhythmAudioCtx;
            } catch (e) {
                return null;
            }
        }

        function playProceduralBeat(accent) {
            const ctx = getRhythmAudioContext();
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
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.13);
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
            registerMiniGameAudioStop(rhythmState, () => {
                try {
                    if (_rhythmAudioCtx && _rhythmAudioCtx.state === 'running') _rhythmAudioCtx.suspend().catch(() => {});
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
            rhythmState = null;
        }

        function teardownRhythmGame() {
            if (!rhythmState) {
                dismissMiniGameExitDialog();
                return false;
            }
            teardownMiniGameRuntime(rhythmState, { overlaySelector: '.rhythm-game-overlay' });
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

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
            announce('Co-op relay started. Alternate A for left pet and L for right pet.');
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
                    <div class="coop-lanes" id="coop-lanes" tabindex="0" aria-label="Co-op relay. Alternate A and L keys.">
                        <div class="coop-lane">
                            <div class="coop-pet">${generatePetSVG(leftPet, leftMood)}</div>
                            <div class="coop-bar"><div class="coop-bar-fill" id="coop-left-fill"></div></div>
                            <div class="coop-key">A</div>
                        </div>
                        <div class="coop-lane">
                            <div class="coop-pet">${generatePetSVG(rightPet, rightMood)}</div>
                            <div class="coop-bar"><div class="coop-bar-fill" id="coop-right-fill"></div></div>
                            <div class="coop-key">L</div>
                        </div>
                    </div>
                    <p class="exp-game-note" id="coop-note">Press A to start, then alternate A and L.</p>
                    <div class="exp-game-controls">
                        <button type="button" id="coop-a">Left (A)</button>
                        <button type="button" id="coop-l">Right (L)</button>
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
                if (note) note.textContent = `Great teamwork! Next key: ${coopState.expected.toUpperCase()}`;
                if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.match);
            } else {
                coopState.combo = 0;
                coopState.score = Math.max(0, coopState.score - 3);
                if (note) note.textContent = `Out of sync. Press ${coopState.expected.toUpperCase()} next.`;
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

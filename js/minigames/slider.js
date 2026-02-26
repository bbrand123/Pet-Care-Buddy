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
            initMiniGameRuntimeTracking(sliderState, { overlaySelector: '.slider-game-overlay' });
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
                    <div class="slider-grid" id="slider-grid" tabindex="0" aria-label="Slider puzzle board. Use arrow keys to move tiles."></div>
                    <p class="exp-game-note">Rebuild your pet portrait in order.</p>
                    <div class="exp-game-controls">
                        <button type="button" id="slider-done">Done</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            trackMiniGameOverlay(sliderState, overlay);
            bindMiniGameEvent(sliderState, overlay.querySelector('#slider-done'), 'click', () => endSliderGame(false, false));
            const grid = overlay.querySelector('#slider-grid');
            bindMiniGameEvent(sliderState, grid, 'keydown', handleSliderKeyDown);
            bindMiniGameEvent(sliderState, overlay, 'click', (e) => {
                if (e.target === overlay) requestMiniGameExit(sliderState ? sliderState.moves : 0, () => endSliderGame(false, false), { scoreLabel: 'moves' });
            });
            function sliderEscapeHandler() {
                requestMiniGameExit(sliderState ? sliderState.moves : 0, () => endSliderGame(false, false), { scoreLabel: 'moves' });
            }
            registerMiniGameEscapeHandler(sliderState, sliderEscapeHandler);
            trapFocus(overlay);
            grid.focus();
            sliderState.timerId = trackMiniGameInterval(sliderState, () => {
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
            // P2-46: Use direct addEventListener on freshly-created tile buttons (grid.innerHTML
            // is rebuilt each call, so old nodes are discarded). Using bindMiniGameEvent here
            // would accumulate stale listener records in the tracker on every UI refresh.
            grid.querySelectorAll('.slider-tile').forEach((btn) => {
                const idx = Number(btn.getAttribute('data-idx'));
                btn.addEventListener('click', () => moveSliderTile(idx), { once: true });
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
            if (!sliderState) {
                dismissMiniGameExitDialog();
                return;
            }
            const finalState = sliderState;
            teardownMiniGameRuntime(finalState, { overlaySelector: '.slider-game-overlay' });

            const moves = finalState.moves;
            const elapsed = Math.max(1, finalState.elapsedSec || Math.floor((Date.now() - finalState.startedAt) / 1000));
            const solvedScore = solved ? Math.max(8, 140 - moves - Math.floor(elapsed / 2)) : Math.max(0, Math.round(60 - moves));
            if (moves > 0 || completed) {
                finalizeExpandedMiniGame({
                    gameId: 'slider',
                    gameName: 'Slider Puzzle',
                    score: solvedScore,
                    coinScore: solved ? Math.round(solvedScore * 0.8) : Math.round(solvedScore * 0.45),
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

        function teardownSliderGame() {
            if (!sliderState) {
                dismissMiniGameExitDialog();
                return false;
            }
            teardownMiniGameRuntime(sliderState, { overlaySelector: '.slider-game-overlay' });
            sliderState = null;
            return true;
        }

        if (typeof MiniGameRegistry !== 'undefined' && MiniGameRegistry && typeof MiniGameRegistry.registerLifecycle === 'function') {
            MiniGameRegistry.registerLifecycle('slider', {
                start: startSliderPuzzleGame,
                teardown: teardownSliderGame,
                getState: () => sliderState,
                overlaySelector: '.slider-game-overlay'
            });
        }

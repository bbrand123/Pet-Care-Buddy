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

            const bubbleDiff = getMinigameDifficulty('bubblepop');
            bubblePopState = {
                score: 0,
                timeLeft: 30,
                bubbles: [],
                bubbleIdCounter: 0,
                spawnInterval: null,
                timerInterval: null,
                difficulty: bubbleDiff,
                active: true
            };
            // P2-50: Register with runtime tracker for consistent cleanup
            if (typeof initMiniGameRuntimeTracking === 'function') {
                initMiniGameRuntimeTracking(bubblePopState, { overlaySelector: '.bubblepop-game-overlay' });
            }

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

            // B14: Announce score every 3rd pop to avoid screen reader spam
            if (bubblePopState.score % 3 === 0) {
                announce(`Score: ${bubblePopState.score}`);
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
            // P2-50: Use runtime tracker for consistent cleanup
            if (typeof teardownMiniGameRuntime === 'function') {
                teardownMiniGameRuntime(bubblePopState, { overlaySelector: '.bubblepop-game-overlay' });
            } else {
                dismissMiniGameExitDialog();
                if (bubblePopState.timerInterval) clearInterval(bubblePopState.timerInterval);
                if (bubblePopState.spawnInterval) clearInterval(bubblePopState.spawnInterval);
                if (bubblePopState._autoEndTimeout) clearTimeout(bubblePopState._autoEndTimeout);
                if (bubblePopState._initialSpawnTimers) bubblePopState._initialSpawnTimers.forEach(id => clearTimeout(id));
                if (bubblePopState._bubbleRemovalTimers) bubblePopState._bubbleRemovalTimers.forEach(id => clearTimeout(id));
                if (bubblePopState._escapeHandler) popModalEscape(bubblePopState._escapeHandler);
                const overlay = document.querySelector('.bubblepop-game-overlay');
                if (overlay) { overlay.innerHTML = ''; overlay.remove(); }
            }

            incrementMinigamePlayCount('bubblepop', bubblePopState ? bubblePopState.score : 0);

            // Apply rewards: bath-themed game boosts cleanliness and happiness
            if (bubblePopState && bubblePopState.score > 0 && gameState.pet) {
                const happinessBonus = Math.min(bubblePopState.score, 30);
                const cleanlinessBonus = Math.min(Math.floor(bubblePopState.score * 1.5), 30);

                gameState.pet.happiness = clamp(gameState.pet.happiness + happinessBonus, 0, 100);
                gameState.pet.cleanliness = clamp(gameState.pet.cleanliness + cleanlinessBonus, 0, 100);
                gameState.pet.energy = clamp(gameState.pet.energy - Math.min(bubblePopState.score, 10), 0, 100);
                const coinReward = (typeof awardMiniGameCoins === 'function') ? awardMiniGameCoins('bubblepop', bubblePopState.score) : 0;
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

        // P1-15: Register lifecycle so teardownAll() can clean up bubble pop.
        if (typeof MiniGameRegistry !== 'undefined' && MiniGameRegistry && typeof MiniGameRegistry.registerLifecycle === 'function') {
            MiniGameRegistry.registerLifecycle('bubblepop', {
                start: startBubblePopGame,
                teardown: function teardownBubblePopGame() {
                    if (!bubblePopState) { dismissMiniGameExitDialog(); return false; }
                    endBubblePopGame();
                    return true;
                },
                getState: function () { return bubblePopState; },
                overlaySelector: '.bubblepop-game-overlay'
            });
        }

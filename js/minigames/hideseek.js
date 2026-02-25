        // ==================== HIDE & SEEK MINI-GAME ====================

        let hideSeekState = null;

        const HIDESEEK_OBJECTS = [
            { emoji: '🌳', name: 'tree' },
            { emoji: '🪨', name: 'rock' },
            { emoji: '🌻', name: 'sunflower' },
            { emoji: '🍄', name: 'mushroom' },
            { emoji: '🪵', name: 'log' },
            { emoji: '🌿', name: 'bush' },
            { emoji: '🏠', name: 'house' },
            { emoji: '📦', name: 'box' },
            { emoji: '🪣', name: 'bucket' },
            { emoji: '🧺', name: 'basket' },
            { emoji: '🎪', name: 'tent' },
            { emoji: '🪴', name: 'plant' }
        ];

        const HIDESEEK_TREATS = ['🍪', '🦴', '🧀', '🥕', '🍎', '🐟'];

        function startHideSeekGame() {
            if (!gameState.pet) {
                if (typeof showToast === 'function') {
                    showToast('You need a pet to play this game.', '#FFA726');
                }
                return;
            }
            const hideSeekDiff = getMinigameDifficulty('hideseek');
            // More treats to find with difficulty, less time
            const totalTreats = Math.min(5 + Math.floor((hideSeekDiff - 1) * 5), 8);
            const spotCount = Math.min(8 + Math.floor((hideSeekDiff - 1) * 4), 12);

            // Pick random hiding spots from available objects
            const shuffled = shuffleArray([...HIDESEEK_OBJECTS]);
            const spots = shuffled.slice(0, spotCount);

            // Assign positions that don't overlap
            const positions = generateHideSeekPositions(spotCount);

            // Pick which spots have treats hidden under them
            const treatIndices = [];
            const indexPool = Array.from({ length: spotCount }, (_, i) => i);
            shuffleArray(indexPool);
            const safeTreatCount = Math.min(totalTreats, indexPool.length);
            for (let i = 0; i < safeTreatCount; i++) {
                treatIndices.push(indexPool[i]);
            }

            // Pick a random treat emoji for this round
            const treatEmoji = HIDESEEK_TREATS[Math.floor(Math.random() * HIDESEEK_TREATS.length)];

            hideSeekState = {
                totalTreats: totalTreats,
                treatsFound: 0,
                spots: spots.map((obj, i) => ({
                    ...obj,
                    x: positions[i].x,
                    y: positions[i].y,
                    hasTreat: treatIndices.includes(i),
                    searched: false
                })),
                treatEmoji: treatEmoji,
                timeLeft: Math.max(15, Math.round(30 / hideSeekDiff)),
                timerId: null,
                difficulty: hideSeekDiff,
                phase: 'playing' // 'playing', 'finished'
            };

            renderHideSeekGame();
            startHideSeekTimer();
            announce(`Hide and Seek started! Find ${totalTreats} hidden treats! Click or tap objects to search under them.`);
        }

        function generateHideSeekPositions(count) {
            const positions = [];
            const minDist = 18;

            for (let i = 0; i < count; i++) {
                let attempts = 0;
                let pos;
                let currentMinDist = minDist;
                do {
                    pos = {
                        x: 8 + Math.random() * 72,
                        y: 5 + Math.random() * 65
                    };
                    attempts++;
                    // Progressively relax distance to avoid giving up with overlap
                    if (attempts === 50) currentMinDist = minDist * 0.6;
                    if (attempts === 80) currentMinDist = minDist * 0.3;
                    if (attempts === 120) currentMinDist = minDist * 0.1;
                } while (
                    attempts < 150 &&
                    positions.some(p => Math.hypot(p.x - pos.x, p.y - pos.y) < currentMinDist)
                );
                positions.push(pos);
            }
            return positions;
        }

        function renderHideSeekGame() {
            const existing = document.querySelector('.hideseek-game-overlay');
            if (existing) existing.remove();

            const pet = gameState.pet;
            const mood = getMood(pet);

            const overlay = document.createElement('div');
            overlay.className = 'hideseek-game-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Hide and Seek mini game');

            let spotsHTML = '';
            hideSeekState.spots.forEach((spot, i) => {
                // Provide spatial position hints for keyboard/screen reader users
                const colLabel = spot.x < 33 ? 'left' : spot.x < 66 ? 'center' : 'right';
                const rowLabel = spot.y < 33 ? 'top' : spot.y < 66 ? 'middle' : 'bottom';
                spotsHTML += `<div class="hideseek-hiding-spot" data-index="${i}"
                    style="left: ${spot.x}%; top: ${spot.y}%;"
                    role="button" tabindex="0"
                    aria-label="Search under ${spot.name}, ${rowLabel}-${colLabel}, ${i + 1} of ${hideSeekState.spots.length}">${spot.emoji}</div>`;
            });

            let progressDots = '';
            for (let i = 0; i < hideSeekState.totalTreats; i++) {
                progressDots += `<div class="hideseek-progress-dot" id="hideseek-dot-${i}"></div>`;
            }

            overlay.innerHTML = `
                <div class="hideseek-game">
                    <h2 class="hideseek-game-title">${hideSeekState.treatEmoji} Hide & Seek!</h2>
                    <p class="hideseek-game-score" id="hideseek-score">Found: ${hideSeekState.treatsFound} / ${hideSeekState.totalTreats}</p>
                    <div class="hideseek-progress" id="hideseek-progress">${progressDots}</div>
                    <p class="hideseek-game-timer" id="hideseek-timer">Time: ${hideSeekState.timeLeft}s</p>
                    <div class="hideseek-field" id="hideseek-field">
                        ${spotsHTML}
                        <div class="hideseek-pet" id="hideseek-pet">
                            ${generatePetSVG(pet, mood)}
                        </div>
                    </div>
                    <p class="hideseek-instruction" id="hideseek-instruction" aria-live="polite">Click or tap objects to find the hidden treats!</p>
                    <div class="hideseek-buttons">
                        <button class="hideseek-done-btn" id="hideseek-done-btn">Done</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            // Event listeners for each hiding spot
            overlay.querySelectorAll('.hideseek-hiding-spot').forEach(el => {
                el.addEventListener('click', () => handleHideSeekTap(parseInt(el.dataset.index)));
                el.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleHideSeekTap(parseInt(el.dataset.index));
                    }
                });
            });

            const doneBtn = overlay.querySelector('#hideseek-done-btn');
            doneBtn.addEventListener('click', () => {
                endHideSeekGame();
            });

            // Close on overlay click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    requestMiniGameExit(hideSeekState ? hideSeekState.treatsFound : 0, () => endHideSeekGame());
                }
            });

            // Escape to exit
            function hideSeekEscapeHandler() {
                requestMiniGameExit(hideSeekState ? hideSeekState.treatsFound : 0, () => endHideSeekGame());
            }
            pushModalEscape(hideSeekEscapeHandler);
            hideSeekState._escapeHandler = hideSeekEscapeHandler;
            trapFocus(overlay);

            // Focus the first hiding spot
            const firstSpot = overlay.querySelector('.hideseek-hiding-spot');
            if (firstSpot) firstSpot.focus();
        }

        function startHideSeekTimer() {
            if (hideSeekState.timerId) clearInterval(hideSeekState.timerId);

            hideSeekState.timerId = setInterval(() => {
                if (!hideSeekState || hideSeekState.phase !== 'playing') return;

                hideSeekState.timeLeft--;
                const timerEl = document.getElementById('hideseek-timer');
                if (timerEl) timerEl.textContent = `Time: ${hideSeekState.timeLeft}s`;

                if (hideSeekState.timeLeft <= 5 && timerEl) {
                    timerEl.style.color = '#F44336';
                    timerEl.style.fontWeight = 'bold';
                    if (hideSeekState.timeLeft === 5) {
                        announce('5 seconds left!');
                    }
                }

                if (hideSeekState.timeLeft <= 0) {
                    hideSeekState.phase = 'finished';
                    clearInterval(hideSeekState.timerId);
                    finishHideSeekRound();
                }
            }, 1000);
        }

        function handleHideSeekTap(index) {
            if (!hideSeekState || hideSeekState.phase !== 'playing') return;

            const spot = hideSeekState.spots[index];
            if (spot.searched) return;

            spot.searched = true;

            const spotEl = document.querySelectorAll('.hideseek-hiding-spot')[index];
            const field = document.getElementById('hideseek-field');
            const instruction = document.getElementById('hideseek-instruction');
            const petEl = document.getElementById('hideseek-pet');

            // Move pet toward the tapped spot
            if (petEl) {
                petEl.style.left = spot.x + '%';
                petEl.style.top = spot.y + '%';
            }

            if (spot.hasTreat) {
                // Found a treat!
                hideSeekState.treatsFound++;

                spotEl.classList.add('found');

                // Show treat emoji popping up
                const treat = document.createElement('div');
                treat.className = 'hideseek-treat';
                treat.textContent = hideSeekState.treatEmoji;
                treat.style.left = spot.x + '%';
                treat.style.top = spot.y + '%';
                field.appendChild(treat);

                // Collect animation
                setTimeout(() => treat.classList.add('collected'), 400);
                setTimeout(() => treat.remove(), 1000);

                // Show reward float
                const reward = document.createElement('div');
                reward.className = 'hideseek-reward';
                reward.textContent = `+1 ${hideSeekState.treatEmoji}`;
                reward.style.left = spot.x + '%';
                reward.style.top = (spot.y - 5) + '%';
                field.appendChild(reward);
                setTimeout(() => reward.remove(), 1000);

                // Update score
                const scoreEl = document.getElementById('hideseek-score');
                if (scoreEl) scoreEl.textContent = `Found: ${hideSeekState.treatsFound} / ${hideSeekState.totalTreats}`;

                // Update progress dots
                const dot = document.getElementById(`hideseek-dot-${hideSeekState.treatsFound - 1}`);
                if (dot) dot.classList.add('found');

                // Pet celebrates
                if (petEl) {
                    petEl.classList.add('celebrating');
                    setTimeout(() => petEl.classList.remove('celebrating'), 500);
                }

                if (instruction) {
                    instruction.textContent = `Found a treat! ${hideSeekState.treatEmoji}`;
                    instruction.className = 'hideseek-instruction highlight';
                }
                if (typeof hapticBuzz === 'function') hapticBuzz(50);
                if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.hit);

                announce(`Found a treat! ${hideSeekState.treatsFound} of ${hideSeekState.totalTreats} found.`);

                // Mark spot as searched visually after animation
                setTimeout(() => spotEl.classList.add('searched'), 600);

                // Check if all treats found
                if (hideSeekState.treatsFound >= hideSeekState.totalTreats) {
                    hideSeekState.phase = 'finished';
                    clearInterval(hideSeekState.timerId);
                    setTimeout(() => finishHideSeekRound(), 800);
                }
            } else {
                // No treat here
                spotEl.classList.add('searched');

                const miss = document.createElement('div');
                miss.className = 'hideseek-miss';
                miss.textContent = '❌';
                miss.style.left = spot.x + '%';
                miss.style.top = spot.y + '%';
                field.appendChild(miss);
                setTimeout(() => miss.remove(), 700);

                if (instruction) {
                    instruction.textContent = 'Nothing here... keep looking!';
                    instruction.className = 'hideseek-instruction';
                }
                if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.miss);

                announce('Nothing under this one. Keep searching!');
            }
        }

        function finishHideSeekRound() {
            if (!hideSeekState) return;
            const instruction = document.getElementById('hideseek-instruction');
            const allFound = hideSeekState.treatsFound >= hideSeekState.totalTreats;

            if (allFound) {
                if (instruction) {
                    instruction.textContent = `Amazing! Found all ${hideSeekState.totalTreats} treats! ${hideSeekState.treatEmoji}`;
                    instruction.className = 'hideseek-instruction highlight';
                }
                announce(`Fantastic! All ${hideSeekState.totalTreats} treats found!`);
            } else {
                if (instruction) {
                    instruction.textContent = `Time's up! Found ${hideSeekState.treatsFound} of ${hideSeekState.totalTreats} treats.`;
                    instruction.className = 'hideseek-instruction';
                }
                announce(`Time is up! Found ${hideSeekState.treatsFound} of ${hideSeekState.totalTreats} treats.`);
            }

            // Reveal unfound treats
            hideSeekState.spots.forEach((spot, i) => {
                if (spot.hasTreat && !spot.searched) {
                    const spotEl = document.querySelectorAll('.hideseek-hiding-spot')[i];
                    if (spotEl) {
                        spotEl.classList.add('searched');
                        const field = document.getElementById('hideseek-field');
                        const reveal = document.createElement('div');
                        reveal.className = 'hideseek-treat';
                        reveal.textContent = hideSeekState.treatEmoji;
                        reveal.style.left = spot.x + '%';
                        reveal.style.top = spot.y + '%';
                        reveal.style.opacity = '0.5';
                        field.appendChild(reveal);
                    }
                }
            });

            // Disable all spots
            document.querySelectorAll('.hideseek-hiding-spot').forEach(el => {
                el.style.pointerEvents = 'none';
            });

            // Auto-end the game after a brief pause (consistent with other mini-games)
            if (hideSeekState && !hideSeekState._ending && !hideSeekState._autoEndTimeout) {
                hideSeekState._autoEndTimeout = setTimeout(() => {
                    endHideSeekGame();
                }, 2500);
            }
        }

        function endHideSeekGame() {
            if (!hideSeekState) {
                dismissMiniGameExitDialog();
                return;
            }
            if (hideSeekState._ending) return;
            hideSeekState._ending = true;
            dismissMiniGameExitDialog();

            if (hideSeekState && hideSeekState._escapeHandler) {
                popModalEscape(hideSeekState._escapeHandler);
            }

            if (hideSeekState && hideSeekState.timerId) {
                clearInterval(hideSeekState.timerId);
            }
            if (hideSeekState && hideSeekState._autoEndTimeout) {
                clearTimeout(hideSeekState._autoEndTimeout);
            }

            const overlay = document.querySelector('.hideseek-game-overlay');
            if (overlay) { overlay.innerHTML = ''; overlay.remove(); }

            incrementMinigamePlayCount('hideseek', hideSeekState ? hideSeekState.treatsFound : 0);

            // Apply rewards based on treats found
            if (hideSeekState && hideSeekState.treatsFound > 0 && gameState.pet) {
                const bonus = Math.min(hideSeekState.treatsFound * 6, 30);
                gameState.pet.happiness = clamp(gameState.pet.happiness + bonus, 0, 100);
                gameState.pet.energy = clamp(gameState.pet.energy - Math.min(hideSeekState.treatsFound * 2, 8), 0, 100);
                gameState.pet.hunger = clamp(gameState.pet.hunger + Math.min(hideSeekState.treatsFound * 2, 10), 0, 100);
                const coinReward = (typeof awardMiniGameCoins === 'function') ? awardMiniGameCoins('hideseek', hideSeekState.treatsFound) : 0;
                const previousBest = Number((gameState.minigameHighScores || {}).hideseek || 0);
                const isNewBest = updateMinigameHighScore('hideseek', hideSeekState.treatsFound);
                const bestMsg = isNewBest ? ' New best!' : '';

                updateNeedDisplays();
                updatePetMood();
                updateWellnessBar();
                saveGame();

                announce(`Hide and Seek over! ${hideSeekState.treatsFound} treats found! Happiness +${bonus}! Coins +${coinReward}!${bestMsg}`);
                if (isNewBest) {
                    showToast(`New high score in Hide & Seek: ${hideSeekState.treatsFound}!`, '#FFD700');
                    showMinigameConfetti();
                    showHighScoreBanner('Hide & Seek', hideSeekState.treatsFound);
                } else if (hideSeekState.treatsFound > 0) {
                    showMinigameConfetti();
                }
                showMiniGameSummaryCard({
                    gameName: 'Hide & Seek',
                    score: hideSeekState.treatsFound,
                    coinReward,
                    statChanges: [
                        { label: 'Happiness', value: bonus },
                        { label: 'Energy', value: -Math.min(hideSeekState.treatsFound * 2, 8) },
                        { label: 'Hunger', value: Math.min(hideSeekState.treatsFound * 2, 10) }
                    ],
                    isNewBest,
                    personalBest: isNewBest ? Math.max(hideSeekState.treatsFound, previousBest) : null,
                    medal: getMiniGameMedal(hideSeekState.treatsFound, { bronze: 2, silver: 4, gold: 6 })
                });
            } else {
                restorePostMiniGameState();
            }
            hideSeekState = null;
        }

        // P1-13: Register lifecycle so teardownAll() can clean up hide & seek.
        if (typeof MiniGameRegistry !== 'undefined' && MiniGameRegistry && typeof MiniGameRegistry.registerLifecycle === 'function') {
            MiniGameRegistry.registerLifecycle('hideseek', {
                start: startHideSeekGame,
                teardown: function teardownHideSeekGame() {
                    if (!hideSeekState) { dismissMiniGameExitDialog(); return false; }
                    endHideSeekGame();
                    return true;
                },
                getState: function () { return hideSeekState; },
                overlaySelector: '.hideseek-game-overlay'
            });
        }

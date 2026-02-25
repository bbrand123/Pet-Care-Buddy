        // ==================== MATCHING MINI-GAME ====================

        const MATCHING_ITEMS = [
            { emoji: '🍎', name: 'Apple' },
            { emoji: '🥕', name: 'Carrot' },
            { emoji: '🍌', name: 'Banana' },
            { emoji: '🧀', name: 'Cheese' },
            { emoji: '🦴', name: 'Bone' },
            { emoji: '🐟', name: 'Fish' },
            { emoji: '🎀', name: 'Bow' },
            { emoji: '🧸', name: 'Teddy' },
            { emoji: '⭐', name: 'Star' },
            { emoji: '🎾', name: 'Ball' },
            { emoji: '🌸', name: 'Flower' },
            { emoji: '🍖', name: 'Meat' }
        ];

        let matchingState = null;

        function matchingCardAriaLabel(card, index) {
            if (!card) return `Card ${index + 1}.`;
            if (card.matched) return `Card ${index + 1}: ${card.name}. Matched pair.`;
            if (card.flipped) return `Card ${index + 1}: ${card.name}. Revealed.`;
            return `Card ${index + 1}. Face down. Activate to reveal.`;
        }

        function announceMatchingLive(message) {
            const live = document.getElementById('matching-live');
            if (live) live.textContent = message;
        }

        function startMatchingGame() {
            if (!gameState.pet) {
                if (typeof showToast === 'function') {
                    showToast('You need a pet to play this game.', '#FFA726');
                }
                return;
            }

            const existing = document.querySelector('.matching-game-overlay');
            if (existing) existing.remove();

            const matchDiff = getMinigameDifficulty('matching');
            const deckPool = getPackedMatchingDeckPool(MATCHING_ITEMS);
            const selectedDeck = getMiniGameContentSelection('matching', 'decks', deckPool, {
                recentWindow: 3,
                idKey: 'id'
            }) || deckPool[0] || { id: 'base_matching', theme: 'Classic', pairs: MATCHING_ITEMS.slice() };
            const ruleModifier = getMinigameRuleModifier('matching');
            const deckPairs = Array.isArray(selectedDeck.pairs) && selectedDeck.pairs.length ? selectedDeck.pairs : MATCHING_ITEMS;
            const pairCapBonus = Math.max(0, Math.floor(Number(ruleModifier && ruleModifier.effect && ruleModifier.effect.extraPairs) || 0));
            // Scale pairs: 6 at base, up to 10 at max difficulty (capped by available items)
            const pairCount = Math.min(6 + Math.floor((matchDiff - 1) * 4) + pairCapBonus, deckPairs.length);

            // Pick random items to make pairs — assign a pairId so matching is
            // based on pair identity rather than emoji equality alone.
            const shuffledItems = shuffleArray(deckPairs.map((pair, idx) => ({
                id: pair.id || `pair_${idx + 1}`,
                emoji: pair.emoji,
                name: pair.name || pair.label || `Pair ${idx + 1}`
            })));
            const selected = shuffledItems.slice(0, pairCount);
            const paired = selected.flatMap((item, i) => [
                { ...item, pairId: i },
                { ...item, pairId: i }
            ]);
            const cards = shuffleArray(paired)
                .map((item, index) => ({
                    id: index,
                    emoji: item.emoji,
                    name: item.name,
                    pairId: item.pairId,
                    flipped: false,
                    matched: false
                }));

            matchingState = {
                cards: cards,
                flippedCards: [],
                matchesFound: 0,
                totalPairs: pairCount,
                moves: 0,
                difficulty: matchDiff,
                deck: selectedDeck,
                ruleModifier,
                locked: false,
                _timeouts: []
            };

            renderMatchingGame();
            const modNote = ruleModifier && ruleModifier.name ? ` Rule: ${ruleModifier.name}.` : '';
            announce(`Matching game started! Theme: ${selectedDeck.theme || 'Classic'}. Flip cards to find matching pairs!${modNote}`);
        }

        function renderMatchingGame() {
            const overlay = document.createElement('div');
            overlay.className = 'matching-game-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Matching mini-game');

            let cardsHTML = '';
            matchingState.cards.forEach((card, i) => {
                cardsHTML += `
                    <button class="matching-card" data-index="${i}" aria-label="${matchingCardAriaLabel(card, i)}" aria-pressed="false">
                        <div class="matching-card-inner">
                            <div class="matching-card-front">❓</div>
                            <div class="matching-card-back">${card.emoji}</div>
                        </div>
                    </button>
                `;
            });

            overlay.innerHTML = `
                <div class="matching-game">
                    <h2 class="matching-game-title">🃏 Matching Game${matchingState.deck && matchingState.deck.theme ? ` · ${escapeHTML(matchingState.deck.theme)}` : ''}!</h2>
                    <p class="matching-game-score" id="matching-score" aria-live="polite">Pairs found: 0 / ${matchingState.totalPairs}</p>
                    <p class="matching-game-moves" id="matching-moves">Moves: 0</p>
                    <p class="sr-only" id="matching-live" aria-live="assertive" aria-atomic="true"></p>
                    <div class="matching-grid" id="matching-grid">
                        ${cardsHTML}
                    </div>
                    <p class="matching-instruction" id="matching-instruction">${matchingState.ruleModifier && matchingState.ruleModifier.name ? `Rule: ${escapeHTML(matchingState.ruleModifier.name)}. ` : ''}Flip two cards to find a match!</p>
                    <div class="matching-buttons">
                        <button class="matching-done-btn" id="matching-done" aria-label="Stop playing Matching Game">Done</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            // Card click listeners
            overlay.querySelectorAll('.matching-card').forEach(card => {
                card.addEventListener('click', () => {
                    const index = parseInt(card.getAttribute('data-index'));
                    flipMatchingCard(index);
                });
            });

            // Done button
            overlay.querySelector('#matching-done').addEventListener('click', () => {
                endMatchingGame();
            });

            // Close on overlay click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    requestMiniGameExit(matchingState ? matchingState.matchesFound : 0, () => endMatchingGame());
                }
            });

            // Escape to close
            function matchingEscapeHandler() {
                requestMiniGameExit(matchingState ? matchingState.matchesFound : 0, () => endMatchingGame());
            }
            pushModalEscape(matchingEscapeHandler);
            matchingState._escapeHandler = matchingEscapeHandler;
            trapFocus(overlay);

            // Focus first card
            const firstCard = overlay.querySelector('.matching-card');
            if (firstCard) firstCard.focus();
        }

        function flipMatchingCard(index) {
            if (!matchingState || matchingState.locked) return;

            const card = matchingState.cards[index];
            if (card.flipped || card.matched) return;

            // Flip the card
            card.flipped = true;
            matchingState.flippedCards.push(index);

            const cardEl = document.querySelector(`.matching-card[data-index="${index}"]`);
            if (cardEl) {
                cardEl.classList.add('flipped');
                cardEl.setAttribute('aria-label', matchingCardAriaLabel(card, index));
                cardEl.setAttribute('aria-pressed', 'true');
            }
            announceMatchingLive(`Card ${index + 1} reveals ${card.name}.`);

            // Check if two cards are flipped
            if (matchingState.flippedCards.length === 2) {
                matchingState.moves++;
                matchingState.locked = true;

                const movesEl = document.getElementById('matching-moves');
                if (movesEl) movesEl.textContent = `Moves: ${matchingState.moves}`;

                const [first, second] = matchingState.flippedCards;
                const card1 = matchingState.cards[first];
                const card2 = matchingState.cards[second];

                if (card1.pairId === card2.pairId) {
                    // Match found!
                    card1.matched = true;
                    card2.matched = true;
                    matchingState.matchesFound++;
                    if (typeof hapticBuzz === 'function') hapticBuzz(50);
                    if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.match);

                    const scoreEl = document.getElementById('matching-score');
                    if (scoreEl) scoreEl.textContent = `Pairs found: ${matchingState.matchesFound} / ${matchingState.totalPairs}`;

                    // Mark cards as matched visually
                    const el1 = document.querySelector(`.matching-card[data-index="${first}"]`);
                    const el2 = document.querySelector(`.matching-card[data-index="${second}"]`);
                    if (el1) {
                        el1.classList.add('matched');
                        el1.setAttribute('aria-label', matchingCardAriaLabel(card1, first));
                        el1.setAttribute('aria-pressed', 'true');
                        el1.setAttribute('aria-disabled', 'true');
                    }
                    if (el2) {
                        el2.classList.add('matched');
                        el2.setAttribute('aria-label', matchingCardAriaLabel(card2, second));
                        el2.setAttribute('aria-pressed', 'true');
                        el2.setAttribute('aria-disabled', 'true');
                    }
                    announceMatchingLive(`${card1.name} pair matched.`);

                    // Show encouraging message
                    const instruction = document.getElementById('matching-instruction');
                    if (instruction) {
                        const messages = ['Great match!', 'You found one!', 'Awesome!', 'Well done!', 'Nice pair!', 'Super!'];
                        const msg = randomFromArray(messages);
                        instruction.textContent = msg;
                        instruction.classList.add('highlight');
                        setTimeout(() => instruction.classList.remove('highlight'), 500);
                        announce(`${msg} ${matchingState.matchesFound} of ${matchingState.totalPairs} pairs found.`);
                    }

                    matchingState.flippedCards = [];
                    matchingState.locked = false;

                    // Check if game is complete
                    if (matchingState.matchesFound === matchingState.totalPairs) {
                        matchingState._timeouts.push(setTimeout(() => finishMatchingGame(), 600));
                    }
                } else {
                    // No match - flip back after a delay
                    if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.miss);
                    matchingState._timeouts.push(setTimeout(() => {
                        if (!matchingState) return;
                        card1.flipped = false;
                        card2.flipped = false;

                        const el1 = document.querySelector(`.matching-card[data-index="${first}"]`);
                        const el2 = document.querySelector(`.matching-card[data-index="${second}"]`);
                        if (el1) {
                            el1.classList.remove('flipped');
                            el1.setAttribute('aria-label', matchingCardAriaLabel(card1, first));
                            el1.setAttribute('aria-pressed', 'false');
                        }
                        if (el2) {
                            el2.classList.remove('flipped');
                            el2.setAttribute('aria-label', matchingCardAriaLabel(card2, second));
                            el2.setAttribute('aria-pressed', 'false');
                        }
                        announceMatchingLive(`No match. ${card1.name} and ${card2.name}.`);

                        const instruction = document.getElementById('matching-instruction');
                        if (instruction) {
                            const messages = ['Try again!', 'Keep looking!', 'Almost!', 'Not quite!', 'So close!'];
                            const msg = randomFromArray(messages);
                            instruction.textContent = msg;
                            announce(msg);
                        }

                        matchingState.flippedCards = [];
                        matchingState.locked = false;
                    }, 800));
                }
            }
        }

        function finishMatchingGame() {
            if (!matchingState) return;
            if (matchingState._finishing) return;
            matchingState._finishing = true;

            const instruction = document.getElementById('matching-instruction');
            if (instruction) {
                const moves = matchingState.moves;
                const pairs = matchingState.totalPairs || 6;
                let message = '🎉 You matched them all! ';
                if (moves <= pairs) message += 'Amazing memory!';
                else if (moves <= pairs * 1.5) message += 'Great job!';
                else if (moves <= pairs * 2.5) message += 'Well done!';
                else message += 'You did it!';
                instruction.textContent = message;
                instruction.classList.add('highlight');
            }

            // Celebrate animation on all cards
            document.querySelectorAll('.matching-card.matched').forEach((card, i) => {
                setTimeout(() => {
                    card.classList.add('celebrating');
                }, i * 80);
            });

            if (!matchingState._autoEndTimeout) {
                matchingState._autoEndTimeout = setTimeout(() => endMatchingGame(), 2500);
            }
        }

        function endMatchingGame() {
            if (!matchingState) {
                dismissMiniGameExitDialog();
                return;
            }
            if (matchingState._ending) return;
            matchingState._ending = true;
            dismissMiniGameExitDialog();

            if (matchingState && matchingState._autoEndTimeout) clearTimeout(matchingState._autoEndTimeout);
            if (matchingState && matchingState._escapeHandler) {
                popModalEscape(matchingState._escapeHandler);
            }
            if (matchingState && matchingState._timeouts) {
                matchingState._timeouts.forEach(id => clearTimeout(id));
            }

            const overlay = document.querySelector('.matching-game-overlay');
            if (overlay) { overlay.innerHTML = ''; overlay.remove(); }

            incrementMinigamePlayCount('matching', matchingState ? matchingState.matchesFound : 0);

            // Apply rewards based on performance
            if (matchingState && matchingState.matchesFound > 0 && gameState.pet) {
                const happinessBonus = Math.min(matchingState.matchesFound * 5, 30);
                const energyCost = Math.min(matchingState.moves, 10);

                gameState.pet.happiness = clamp(gameState.pet.happiness + happinessBonus, 0, 100);
                gameState.pet.energy = clamp(gameState.pet.energy - energyCost, 0, 100);

                // Score for matching: fewer moves = better. Use pairs * 100 / moves for a score ratio
                const matchScore = matchingState.matchesFound === matchingState.totalPairs
                    ? Math.max(1, Math.round(matchingState.totalPairs * 100 / matchingState.moves))
                    : 0;
                const coinBasis = Math.max(matchingState.matchesFound * 8, Math.round(matchScore / 5));
                const coinReward = (typeof awardMiniGameCoins === 'function') ? awardMiniGameCoins('matching', coinBasis) : 0;
                const previousBest = Number((gameState.minigameHighScores || {}).matching || 0);
                const isNewBest = matchScore > 0 && updateMinigameHighScore('matching', matchScore);
                const bestMsg = isNewBest ? ' New best!' : '';

                updateNeedDisplays();
                updatePetMood();
                updateWellnessBar();
                saveGame();

                announce(`Matching Game over! ${matchingState.matchesFound} pairs found in ${matchingState.moves} moves! Happiness +${happinessBonus}! Coins +${coinReward}!${bestMsg}`);
                if (isNewBest) {
                    showToast(`New high score in Matching: ${matchScore}!`, '#FFD700');
                    showMinigameConfetti();
                    showHighScoreBanner('Matching', matchScore);
                } else if (matchingState.matchesFound > 0) {
                    showMinigameConfetti();
                }
                showMiniGameSummaryCard({
                    gameName: 'Matching',
                    score: matchScore,
                    coinReward,
                    statChanges: [
                        { label: 'Pairs', value: matchingState.matchesFound },
                        { label: 'Moves', value: -matchingState.moves },
                        { label: 'Happiness', value: happinessBonus },
                        { label: 'Energy', value: -energyCost }
                    ],
                    isNewBest,
                    personalBest: isNewBest ? Math.max(matchScore, previousBest) : null,
                    medal: getMiniGameMedal(matchScore, { bronze: 40, silver: 65, gold: 90 })
                });
            } else {
                restorePostMiniGameState();
            }
            matchingState = null;
        }

        // P1-16: Register lifecycle so teardownAll() can clean up matching game.
        if (typeof MiniGameRegistry !== 'undefined' && MiniGameRegistry && typeof MiniGameRegistry.registerLifecycle === 'function') {
            MiniGameRegistry.registerLifecycle('matching', {
                start: startMatchingGame,
                teardown: function teardownMatchingGame() {
                    if (!matchingState) { dismissMiniGameExitDialog(); return false; }
                    endMatchingGame();
                    return true;
                },
                getState: function () { return matchingState; },
                overlaySelector: '.matching-game-overlay'
            });
        }

        // ==================== TRIVIA MINI-GAME ====================

        const TRIVIA_QUESTIONS = [
            { q: 'What is the largest living species of penguin?', options: ['Emperor penguin', 'King penguin', 'Gentoo penguin', 'Adelie penguin'], answer: 0, fact: 'Emperor penguins can exceed 1.1 meters in height.' },
            { q: 'Which mammal has the most powerful bite force?', options: ['Lion', 'Tiger', 'Jaguar', 'Hippopotamus'], answer: 3, fact: 'Hippos have one of the strongest measured bite forces among mammals.' },
            { q: 'How do dolphins mainly breathe?', options: ['Through gills', 'Through skin', 'Through blowholes', 'Through mouth only'], answer: 2, fact: 'Dolphins are mammals and breathe air through blowholes.' },
            { q: 'What is unique about axolotls?', options: ['They glow naturally', 'They can regenerate limbs', 'They hibernate for years', 'They fly short distances'], answer: 1, fact: 'Axolotls can regenerate limbs and even parts of organs.' },
            { q: 'Which bird is known for hovering while feeding?', options: ['Sparrow', 'Hummingbird', 'Crow', 'Toucan'], answer: 1, fact: 'Hummingbirds can hover and even fly backward.' },
            { q: 'What is the fastest land animal?', options: ['Pronghorn', 'Cheetah', 'Greyhound', 'Lion'], answer: 1, fact: 'Cheetahs can sprint up to about 60-70 mph in short bursts.' },
            { q: 'How many hearts does an octopus have?', options: ['One', 'Two', 'Three', 'Four'], answer: 2, fact: 'Octopuses have three hearts and blue blood.' },
            { q: 'What do pandas mostly eat?', options: ['Bamboo', 'Fish', 'Fruits', 'Insects'], answer: 0, fact: 'Giant pandas eat bamboo for most of their diet.' },
            { q: 'Which animal can sleep while swimming?', options: ['Shark', 'Sea otter', 'Orca', 'Seal'], answer: 1, fact: 'Sea otters hold paws or kelp to avoid drifting apart.' },
            { q: 'What is a group of frogs called?', options: ['Army', 'Knot', 'Colony', 'School'], answer: 0, fact: 'A group of frogs is often called an army.' }
        ];

        let triviaState = null;

        function startTriviaGame() {
            if (!gameState.pet) {
                showToast('A pet is needed for trivia time.', '#FFA726');
                return;
            }
            triviaState = {
                questions: shuffleArray([...TRIVIA_QUESTIONS]).slice(0, 5),
                index: 0,
                correct: 0,
                answered: false
            };
            renderTriviaGame();
            announce('Animal trivia started. Choose the best answer for each fact.');
        }

        function renderTriviaGame() {
            const existing = document.querySelector('.trivia-game-overlay');
            if (existing) existing.remove();
            const overlay = document.createElement('div');
            overlay.className = 'trivia-game-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Animal trivia mini game');
            overlay.innerHTML = `
                <div class="exp-game-shell">
                    <h2 class="exp-game-title">🦉 Animal Trivia</h2>
                    <div class="exp-game-hud">
                        <span id="trivia-progress">Q 1/5</span>
                        <span id="trivia-score">Correct: 0</span>
                    </div>
                    <div class="trivia-question" id="trivia-question"></div>
                    <div class="trivia-options" id="trivia-options"></div>
                    <p class="exp-game-note" id="trivia-fact">Pick an answer.</p>
                    <div class="exp-game-controls">
                        <button type="button" id="trivia-next" disabled>Next</button>
                        <button type="button" id="trivia-done">Done</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            overlay.querySelector('#trivia-next').addEventListener('click', nextTriviaQuestion);
            overlay.querySelector('#trivia-done').addEventListener('click', () => endTriviaGame(false));
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) requestMiniGameExit(triviaState ? triviaState.correct : 0, () => endTriviaGame(false));
            });
            function triviaEscapeHandler() {
                requestMiniGameExit(triviaState ? triviaState.correct : 0, () => endTriviaGame(false));
            }
            pushModalEscape(triviaEscapeHandler);
            triviaState._escapeHandler = triviaEscapeHandler;
            trapFocus(overlay);
            updateTriviaUI();
        }

        function updateTriviaUI() {
            if (!triviaState) return;
            const q = triviaState.questions[triviaState.index];
            const progress = document.getElementById('trivia-progress');
            const score = document.getElementById('trivia-score');
            const questionEl = document.getElementById('trivia-question');
            const optionsEl = document.getElementById('trivia-options');
            const factEl = document.getElementById('trivia-fact');
            const nextBtn = document.getElementById('trivia-next');
            if (!q) return;
            if (progress) progress.textContent = `Q ${triviaState.index + 1}/${triviaState.questions.length}`;
            if (score) score.textContent = `Correct: ${triviaState.correct}`;
            if (questionEl) questionEl.textContent = q.q;
            if (factEl) factEl.textContent = triviaState.answered ? q.fact : 'Pick an answer.';
            if (nextBtn) nextBtn.disabled = !triviaState.answered;
            if (optionsEl) {
                optionsEl.innerHTML = q.options.map((opt, idx) => (
                    `<button type="button" class="trivia-option" data-opt="${idx}" ${triviaState.answered ? 'disabled' : ''}>${escapeHTML(opt)}</button>`
                )).join('');
                optionsEl.querySelectorAll('.trivia-option').forEach((btn) => {
                    btn.addEventListener('click', () => answerTriviaQuestion(Number(btn.getAttribute('data-opt'))));
                });
                if (triviaState.answered) {
                    optionsEl.querySelectorAll('.trivia-option').forEach((btn) => {
                        const idx = Number(btn.getAttribute('data-opt'));
                        btn.classList.toggle('correct', idx === q.answer);
                        if (idx !== q.answer) btn.classList.toggle('wrong', idx !== q.answer);
                    });
                }
            }
        }

        function answerTriviaQuestion(choice) {
            if (!triviaState || triviaState.answered) return;
            const q = triviaState.questions[triviaState.index];
            triviaState.answered = true;
            if (choice === q.answer) {
                triviaState.correct += 1;
                if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.match);
            } else if (typeof GameAudio !== 'undefined') {
                GameAudio.playSFX(GameAudio.sfx.miss);
            }
            updateTriviaUI();
        }

        function nextTriviaQuestion() {
            if (!triviaState || !triviaState.answered) return;
            triviaState.index += 1;
            triviaState.answered = false;
            if (triviaState.index >= triviaState.questions.length) {
                endTriviaGame(true);
                return;
            }
            updateTriviaUI();
        }

        function endTriviaGame(completed) {
            dismissMiniGameExitDialog();
            if (!triviaState) return;
            if (triviaState._escapeHandler) popModalEscape(triviaState._escapeHandler);
            const overlay = document.querySelector('.trivia-game-overlay');
            if (overlay) { overlay.innerHTML = ''; overlay.remove(); }

            const score = triviaState.correct;
            if (score > 0 || completed) {
                const total = triviaState.questions.length;
                finalizeExpandedMiniGame({
                    gameId: 'trivia',
                    gameName: 'Animal Trivia',
                    score,
                    coinScore: score * 9,
                    statDelta: {
                        happiness: Math.min(24, score * 5),
                        energy: -Math.max(2, total - score)
                    },
                    summaryStats: [
                        { label: 'Correct Answers', value: score },
                        { label: 'Questions', value: total },
                        { label: 'Accuracy', value: Math.round((score / Math.max(total, 1)) * 100) }
                    ],
                    medalThresholds: { bronze: 2, silver: 4, gold: 5 }
                });
            } else {
                restorePostMiniGameState();
            }
            triviaState = null;
        }

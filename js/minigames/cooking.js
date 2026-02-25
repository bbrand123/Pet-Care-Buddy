        // ==================== COOKING MINI-GAME ====================

        const COOKING_INGREDIENTS = [
            { id: 'carrot', icon: '🥕', name: 'Carrot' },
            { id: 'fish', icon: '🐟', name: 'Fish Flakes' },
            { id: 'pumpkin', icon: '🎃', name: 'Pumpkin' },
            { id: 'apple', icon: '🍎', name: 'Apple Bits' },
            { id: 'mint', icon: '🌿', name: 'Mint Leaf' },
            { id: 'oats', icon: '🌾', name: 'Oats' },
            { id: 'berry', icon: '🫐', name: 'Berry Puree' },
            { id: 'egg', icon: '🥚', name: 'Egg Crumble' }
        ];

        let cookingState = null;

        function startCookingGame() {
            if (!gameState.pet) {
                showToast('You need a pet before cooking.', '#FFA726');
                return;
            }
            const cookingContent = getPackedCookingCatalog(COOKING_INGREDIENTS);
            const ruleModifier = getMinigameRuleModifier('cooking');
            const extraRounds = Math.max(0, Math.floor(Number(ruleModifier && ruleModifier.effect && ruleModifier.effect.extraRounds) || 0));
            cookingState = {
                round: 1,
                maxRounds: 5 + extraRounds,
                successes: 0,
                failures: 0,
                selected: [],
                recipe: [],
                recipeMeta: null,
                recipes: Array.isArray(cookingContent && cookingContent.recipes) ? cookingContent.recipes : [],
                ingredientCatalog: Array.isArray(cookingContent && cookingContent.ingredients) ? cookingContent.ingredients : COOKING_INGREDIENTS.slice(),
                ruleModifier,
                dailySpecialTag: ruleModifier && ruleModifier.effect ? ruleModifier.effect.preferTag : null
            };
            initMiniGameRuntimeTracking(cookingState, { overlaySelector: '.cooking-game-overlay' });
            cookingState.recipeMeta = generateCookingRecipe();
            cookingState.recipe = (cookingState.recipeMeta && Array.isArray(cookingState.recipeMeta.ingredients))
                ? cookingState.recipeMeta.ingredients.slice()
                : [];
            renderCookingGame();
            const modNote = ruleModifier && ruleModifier.name ? ` Rule: ${ruleModifier.name}.` : '';
            announce(`Cooking mini game started. Match ingredients to craft special pet food.${modNote}`);
        }

        function generateCookingRecipe() {
            if (!cookingState) {
                const picks = shuffleArray([...COOKING_INGREDIENTS]).slice(0, 3);
                return { id: 'fallback_recipe', name: 'Classic Mix', ingredients: picks.map((item) => item.id), rewardProfile: { specialFood: 1 } };
            }
            const allRecipes = Array.isArray(cookingState.recipes) ? cookingState.recipes : [];
            const taggedRecipes = cookingState.dailySpecialTag
                ? allRecipes.filter((recipe) => Array.isArray(recipe.tags) && recipe.tags.includes(cookingState.dailySpecialTag))
                : [];
            const recipePool = taggedRecipes.length ? taggedRecipes : allRecipes;
            const pickedRecipe = getMiniGameContentSelection('cooking', 'recipes', recipePool, {
                recentWindow: 4,
                idKey: 'id'
            });
            if (pickedRecipe && Array.isArray(pickedRecipe.ingredients) && pickedRecipe.ingredients.length === 3) {
                return pickedRecipe;
            }
            const fallbackPool = Array.isArray(cookingState.ingredientCatalog) && cookingState.ingredientCatalog.length
                ? cookingState.ingredientCatalog
                : COOKING_INGREDIENTS;
            const picks = shuffleArray([...fallbackPool]).slice(0, 3);
            return { id: 'fallback_recipe', name: 'Classic Mix', ingredients: picks.map((item) => item.id), rewardProfile: { specialFood: 1 } };
        }

        function renderCookingGame() {
            const existing = document.querySelector('.cooking-game-overlay');
            if (existing) existing.remove();
            const overlay = document.createElement('div');
            overlay.className = 'cooking-game-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Cooking mini game');
            overlay.innerHTML = `
                <div class="exp-game-shell">
                    <h2 class="exp-game-title">🍲 Cooking Lab${cookingState.recipeMeta && cookingState.recipeMeta.name ? ` · ${escapeHTML(cookingState.recipeMeta.name)}` : ''}</h2>
                    <div class="exp-game-hud">
                        <span id="cooking-round">Round 1/${cookingState.maxRounds}</span>
                        <span id="cooking-success">Recipes: 0</span>
                        <span id="cooking-stock">Special Food: ${Math.floor((ensureMiniGameExpansionMeta().specialFoodStock || 0))}</span>
                    </div>
                    <div class="cooking-recipe" id="cooking-recipe"></div>
                    <div class="cooking-selected" id="cooking-selected" aria-live="polite"></div>
                    <div class="cooking-grid" id="cooking-grid"></div>
                    <p class="exp-game-note" id="cooking-note">${cookingState.ruleModifier && cookingState.ruleModifier.name ? `Rule: ${escapeHTML(cookingState.ruleModifier.name)}. ` : ''}Select exactly 3 ingredients, then cook.</p>
                    <div class="exp-game-controls">
                        <button type="button" id="cook-btn">Cook Recipe</button>
                        <button type="button" id="cook-clear">Clear</button>
                        <button type="button" id="cook-done">Done</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            trackMiniGameOverlay(cookingState, overlay);
            const grid = overlay.querySelector('#cooking-grid');
            grid.innerHTML = (Array.isArray(cookingState.ingredientCatalog) ? cookingState.ingredientCatalog : COOKING_INGREDIENTS).map((item) => (
                `<button type="button" class="cooking-item" data-ing="${item.id}">${item.icon} ${escapeHTML(item.name)}</button>`
            )).join('');

            grid.querySelectorAll('.cooking-item').forEach((btn) => {
                bindMiniGameEvent(cookingState, btn, 'click', () => toggleCookingIngredient(btn.getAttribute('data-ing')));
            });
            bindMiniGameEvent(cookingState, overlay.querySelector('#cook-btn'), 'click', () => submitCookingRecipe());
            bindMiniGameEvent(cookingState, overlay.querySelector('#cook-clear'), 'click', () => {
                if (!cookingState) return;
                cookingState.selected = [];
                updateCookingUI();
            });
            bindMiniGameEvent(cookingState, overlay.querySelector('#cook-done'), 'click', () => endCookingGame(false));
            bindMiniGameEvent(cookingState, overlay, 'click', (e) => {
                if (e.target === overlay) requestMiniGameExit(cookingState ? cookingState.successes : 0, () => endCookingGame(false));
            });
            function cookingEscapeHandler() {
                requestMiniGameExit(cookingState ? cookingState.successes : 0, () => endCookingGame(false));
            }
            registerMiniGameEscapeHandler(cookingState, cookingEscapeHandler);
            trapFocus(overlay);
            overlay.querySelector('#cook-btn').focus();
            updateCookingUI();
        }

        function toggleCookingIngredient(ingredientId) {
            if (!cookingState) return;
            const selected = cookingState.selected;
            const idx = selected.indexOf(ingredientId);
            if (idx >= 0) {
                selected.splice(idx, 1);
            } else if (selected.length < 3) {
                selected.push(ingredientId);
            } else {
                showToast('Only 3 ingredients per recipe.', '#FFA726', { announce: false });
            }
            updateCookingUI();
        }

        function updateCookingUI() {
            if (!cookingState) return;
            const recipeEl = document.getElementById('cooking-recipe');
            const selectedEl = document.getElementById('cooking-selected');
            const roundEl = document.getElementById('cooking-round');
            const successEl = document.getElementById('cooking-success');
            const stockEl = document.getElementById('cooking-stock');
            const noteEl = document.getElementById('cooking-note');
            if (roundEl) roundEl.textContent = `Round ${Math.min(cookingState.round, cookingState.maxRounds)}/${cookingState.maxRounds}`;
            if (successEl) successEl.textContent = `Recipes: ${cookingState.successes}`;
            if (stockEl) stockEl.textContent = `Special Food: ${Math.floor((ensureMiniGameExpansionMeta().specialFoodStock || 0))}`;
            const ingredientCatalog = Array.isArray(cookingState.ingredientCatalog) ? cookingState.ingredientCatalog : COOKING_INGREDIENTS;
            const recipeDetails = cookingState.recipe.map((id) => ingredientCatalog.find((i) => i.id === id)).filter(Boolean);
            if (recipeEl) {
                const diffLabel = cookingState.recipeMeta && cookingState.recipeMeta.difficulty
                    ? ` <span class="cooking-recipe-meta">(${escapeHTML(String(cookingState.recipeMeta.difficulty))})</span>`
                    : '';
                recipeEl.innerHTML = `<strong>Target Recipe:</strong> ${recipeDetails.map((i) => `${i.icon} ${escapeHTML(i.name)}`).join(' + ')}${diffLabel}`;
            }
            if (selectedEl) {
                selectedEl.innerHTML = cookingState.selected.length > 0
                    ? `<strong>Selected:</strong> ${cookingState.selected.map((id) => {
                        const item = ingredientCatalog.find((i) => i.id === id);
                        return item ? `${item.icon} ${escapeHTML(item.name)}` : id;
                    }).join(' + ')}`
                    : '<strong>Selected:</strong> (none)';
            }
            document.querySelectorAll('.cooking-item').forEach((btn) => {
                const id = btn.getAttribute('data-ing');
                const isSelected = cookingState.selected.includes(id);
                btn.classList.toggle('selected', isSelected);
                btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
            });
            if (noteEl && cookingState.failures > 0) {
                noteEl.textContent = `Mistakes: ${cookingState.failures}/3. Match all 3 ingredients exactly.`;
            }
        }

        function submitCookingRecipe() {
            if (!cookingState) return;
            if (cookingState.selected.length !== 3) {
                showToast('Pick 3 ingredients before cooking.', '#FFA726');
                return;
            }
            const pick = [...cookingState.selected].sort().join('|');
            const target = [...cookingState.recipe].sort().join('|');
            const noteEl = document.getElementById('cooking-note');
            if (pick === target) {
                cookingState.successes += 1;
                const rewardFood = Math.max(1, Math.floor(Number(cookingState.recipeMeta && cookingState.recipeMeta.rewardProfile && cookingState.recipeMeta.rewardProfile.specialFood) || 1));
                grantSpecialPetFood(rewardFood);
                if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.celebration);
                if (noteEl) noteEl.textContent = `Perfect mix! ${cookingState.recipeMeta && cookingState.recipeMeta.name ? `${cookingState.recipeMeta.name} crafted. ` : ''}Special pet food +${rewardFood}.`;
            } else {
                cookingState.failures += 1;
                if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.miss);
                if (noteEl) noteEl.textContent = 'Recipe mismatch. Try the next order.';
            }
            cookingState.round += 1;
            cookingState.selected = [];

            const reachedEnd = cookingState.round > cookingState.maxRounds || cookingState.failures >= 3;
            if (reachedEnd) {
                endCookingGame(true);
                return;
            }
            cookingState.recipeMeta = generateCookingRecipe();
            cookingState.recipe = (cookingState.recipeMeta && Array.isArray(cookingState.recipeMeta.ingredients))
                ? cookingState.recipeMeta.ingredients.slice()
                : [];
            updateCookingUI();
        }

        function endCookingGame(completed) {
            if (!cookingState) {
                dismissMiniGameExitDialog();
                return;
            }
            const finalState = cookingState;
            teardownMiniGameRuntime(finalState, { overlaySelector: '.cooking-game-overlay' });

            const recipes = finalState.successes;
            if (recipes > 0 || completed) {
                const foodsCrafted = recipes;
                finalizeExpandedMiniGame({
                    gameId: 'cooking',
                    gameName: 'Cooking Lab',
                    score: recipes,
                    coinScore: recipes * 7,
                    statDelta: {
                        hunger: Math.min(24, recipes * 5),
                        happiness: Math.min(20, recipes * 4),
                        energy: -Math.min(10, Math.max(2, finalState.failures + 2))
                    },
                    summaryStats: [
                        { label: 'Recipes', value: recipes },
                        { label: 'Special Food Crafted', value: foodsCrafted },
                        { label: 'Hunger', value: Math.min(24, recipes * 5) },
                        { label: 'Happiness', value: Math.min(20, recipes * 4) }
                    ],
                    medalThresholds: { bronze: 1, silver: 3, gold: 5 }
                });
            } else {
                restorePostMiniGameState();
            }
            cookingState = null;
        }

        function teardownCookingGame() {
            if (!cookingState) {
                dismissMiniGameExitDialog();
                return false;
            }
            teardownMiniGameRuntime(cookingState, { overlaySelector: '.cooking-game-overlay' });
            cookingState = null;
            return true;
        }

        if (typeof MiniGameRegistry !== 'undefined' && MiniGameRegistry && typeof MiniGameRegistry.registerLifecycle === 'function') {
            MiniGameRegistry.registerLifecycle('cooking', {
                start: startCookingGame,
                teardown: teardownCookingGame,
                getState: () => cookingState,
                overlaySelector: '.cooking-game-overlay'
            });
        }

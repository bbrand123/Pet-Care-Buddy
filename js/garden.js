// ============================================================
// garden.js  –  Garden functions & seasonal activity
// Extracted from game.js (lines 5902-6720)
// ============================================================

        // ==================== GARDEN FUNCTIONS ====================

        function startGardenGrowTimer() {
            if (gardenGrowInterval) clearInterval(gardenGrowInterval);
            gardenGrowInterval = setInterval(() => {
                try {
                    if (gameState.phase === 'pet' && !document.hidden) {
                        tickGardenGrowth();
                    }
                } catch (e) {
                    // Reset interval on error to allow clean restart
                    clearInterval(gardenGrowInterval);
                    gardenGrowInterval = null;
                }
            }, 60000); // Grow tick every 60 seconds
        }

        function stopGardenGrowTimer() {
            if (gardenGrowInterval) {
                clearInterval(gardenGrowInterval);
                gardenGrowInterval = null;
            }
        }

        function tickGardenGrowth() {
            const garden = gameState.garden;
            if (!garden || !garden.plots || garden.plots.length === 0) return;

            const season = gameState.season || getCurrentSeason();
            const growthMult = SEASONS[season] ? SEASONS[season].gardenGrowthMultiplier : 1;
            let anyGrew = false;

            garden.plots.forEach(plot => {
                if (plot && plot.cropId && plot.stage < 3) {
                    const crop = GARDEN_CROPS[plot.cropId];
                    if (!crop) return;
                    const effectiveGrowTime = Math.max(1, Math.round(crop.growTime / growthMult));
                    // Watered plants grow faster
                    const waterBonus = plot.watered ? 2 : 1;
                    plot.growTicks += waterBonus;
                    plot.watered = false; // Water dries up each tick
                    const newStage = Math.min(3, Math.floor(plot.growTicks / effectiveGrowTime));
                    if (newStage > plot.stage) {
                        plot.stage = newStage;
                        anyGrew = true;
                        if (newStage === 3) {
                            showToast(`🌱 Your ${crop.name} is ready to harvest!`, '#66BB6A');
                        }
                    }
                }
            });

            garden.lastGrowTick = Date.now();
            if (gameState.currentRoom === 'garden') {
                renderGardenUI();
            }
            // Update room nav badge when crops become harvestable
            if (anyGrew && typeof updateRoomNavBadge === 'function') {
                updateRoomNavBadge();
            }
            saveGame();
        }

        function plantSeed(plotIndex, cropId) {
            const garden = gameState.garden;
            if (plotIndex >= MAX_GARDEN_PLOTS) return;
            // Prevent planting in locked plots
            const unlockedPlots = getUnlockedPlotCount(garden.totalHarvests || 0);
            if (plotIndex >= unlockedPlots) return;

            // Extend plots array if needed
            while (garden.plots.length <= plotIndex) {
                garden.plots.push(null);
            }

            if (garden.plots[plotIndex] !== null) return; // Plot occupied

            const crop = GARDEN_CROPS[cropId];
            if (!crop) return;
            if (!consumeSeedForCrop(cropId, 1)) {
                showToast(`🌱 You need ${crop.name} seeds. Buy more in the Economy shop.`, '#FFA726');
                return;
            }

            garden.plots[plotIndex] = {
                cropId: cropId,
                stage: 0,
                growTicks: 0,
                watered: false
            };

            showToast(`🌱 Planted ${crop.name}!`, '#66BB6A');

            if (gameState.pet) {
                gameState.pet.happiness = clamp(gameState.pet.happiness + 5, 0, 100);
                updateNeedDisplays();
                updatePetMood();
                updateWellnessBar();
            }

            saveGame();
            if (gameState.currentRoom === 'garden') {
                renderGardenUI();
            }
        }

        function waterPlot(plotIndex) {
            const garden = gameState.garden;
            if (!garden.plots[plotIndex]) return;

            const plot = garden.plots[plotIndex];
            if (plot.stage >= 3) return; // Already ready
            if (plot.watered) {
                showToast('💧 Already watered!', '#64B5F6');
                return;
            }

            plot.watered = true;
            const crop = GARDEN_CROPS[plot.cropId];
            if (!crop) return; // Guard against corrupted save data
            showToast(`💧 Watered the ${crop.name}!`, '#64B5F6');

            saveGame();
            if (gameState.currentRoom === 'garden') {
                renderGardenUI();
            }
        }

        function harvestPlot(plotIndex) {
            const garden = gameState.garden;
            if (!garden.plots[plotIndex]) return;

            const plot = garden.plots[plotIndex];
            if (plot.stage < 3) return; // Not ready

            const crop = GARDEN_CROPS[plot.cropId];
            if (!crop) return; // Guard against corrupted save data
            if (!garden.inventory[plot.cropId]) {
                garden.inventory[plot.cropId] = 0;
            }
            garden.inventory[plot.cropId]++;
            const coinReward = awardHarvestCoins(plot.cropId);

            // Track total harvests for progressive plot unlocking
            if (typeof garden.totalHarvests !== 'number') garden.totalHarvests = 0;
            garden.totalHarvests++;
            if (typeof trackHarvest === 'function') trackHarvest();
            if (garden.totalHarvests === 1) {
                addJournalEntry('🌱', `Harvested first ${crop.name}!`);
            } else if (garden.totalHarvests % 10 === 0) {
                addJournalEntry('🌾', `Total harvests reached ${garden.totalHarvests}!`);
            }

            // Track daily checklist progress for harvests
            if (typeof incrementDailyProgress === 'function') {
                const dailyCompleted = incrementDailyProgress('harvestCount');
                dailyCompleted.forEach(task => showToast(`${task.icon} Daily task done: ${task.name}!`, '#FFD700'));
            }
            // Check achievements after harvest
            if (typeof checkAchievements === 'function') {
                const newAch = checkAchievements();
                newAch.forEach(ach => {
                    setTimeout(() => showToast(`${ach.icon} Achievement: ${ach.name}!`, '#FFD700'), 300);
                });
            }

            // Check badges, stickers, trophies after harvest
            if (typeof checkBadges === 'function') {
                const newBadges = checkBadges();
                newBadges.forEach(badge => {
                    setTimeout(() => showToast(`${badge.icon} Badge: ${badge.name}!`, BADGE_TIERS[badge.tier].color), 500);
                });
            }
            if (typeof checkStickers === 'function') {
                const newStickers = checkStickers();
                newStickers.forEach(sticker => {
                    setTimeout(() => showToast(`${sticker.emoji} Sticker: ${sticker.name}!`, '#E040FB'), 700);
                });
            }
            if (typeof checkTrophies === 'function') {
                const newTrophies = checkTrophies();
                newTrophies.forEach(trophy => {
                    setTimeout(() => showToast(`${trophy.icon} Trophy: ${trophy.name}!`, '#FFD700'), 900);
                });
            }

            // Check if a new plot was unlocked
            const prevUnlocked = getUnlockedPlotCount(garden.totalHarvests - 1);
            const newUnlocked = getUnlockedPlotCount(garden.totalHarvests);
            if (newUnlocked > prevUnlocked) {
                showToast(`${crop.seedEmoji} Harvested a ${crop.name}! +${coinReward} coins. New garden plot unlocked!`, '#FF8C42');
            } else {
                showToast(`${crop.seedEmoji} Harvested a ${crop.name}! +${coinReward} coins.`, '#FF8C42');
            }

            if (gameState.pet) {
                gameState.pet.happiness = clamp(gameState.pet.happiness + 8, 0, 100);
                updateNeedDisplays();
                updatePetMood();
                updateWellnessBar();
            }

            // Clear the plot
            garden.plots[plotIndex] = null;

            saveGame();
            if (gameState.currentRoom === 'garden') {
                renderGardenUI();
            }
        }

        function removeCrop(plotIndex) {
            const garden = gameState.garden;
            if (!garden.plots[plotIndex]) return;

            const plot = garden.plots[plotIndex];
            if (plot.stage >= 3) return; // Ready crops should be harvested, not removed

            const crop = GARDEN_CROPS[plot.cropId];
            if (!crop) {
                // Invalid crop data — just clear the plot silently
                garden.plots[plotIndex] = null;
                saveGame();
                if (gameState.currentRoom === 'garden') renderGardenUI();
                return;
            }

            const existing = document.querySelector('.remove-crop-overlay');
            if (existing) {
                // Pop stale escape handler before removing the old overlay
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }

            const overlay = document.createElement('div');
            overlay.className = 'remove-crop-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-labelledby', 'remove-crop-heading');

            overlay.innerHTML = `
                <div class="remove-crop-dialog">
                    <p class="remove-crop-message" id="remove-crop-heading"><span aria-hidden="true">${crop.seedEmoji}</span> Remove this ${crop.name}?</p>
                    <div class="remove-crop-buttons">
                        <button class="remove-crop-btn cancel" id="remove-crop-cancel">Keep</button>
                        <button class="remove-crop-btn confirm" id="remove-crop-confirm">Remove</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            const cancelBtn = document.getElementById('remove-crop-cancel');
            const confirmBtn = document.getElementById('remove-crop-confirm');
            cancelBtn.focus();

            function closeOverlay() {
                popModalEscape(closeOverlay);
                overlay.remove();
            }
            overlay._closeOverlay = closeOverlay;

            pushModalEscape(closeOverlay);

            confirmBtn.addEventListener('click', () => {
                closeOverlay();
                garden.plots[plotIndex] = null;
                showToast(`Removed ${crop.name}.`, '#EF5350');
                saveGame();
                if (gameState.currentRoom === 'garden') {
                    renderGardenUI();
                }
            });

            cancelBtn.addEventListener('click', closeOverlay);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOverlay(); });
        }

        function feedFromGarden(cropId, options) {
            const garden = gameState.garden;
            const opts = options || {};
            if (!garden.inventory[cropId] || garden.inventory[cropId] <= 0) return false;
            if (!gameState.pet) return false;

            const crop = GARDEN_CROPS[cropId];
            if (!crop) return false;
            if (opts.enforceCooldown !== false && typeof isActionCooldownActive === 'function' && isActionCooldownActive()) {
                if (typeof announceCooldownOnce === 'function') announceCooldownOnce();
                return false;
            }
            if (opts.enforceCooldown !== false && typeof startActionCooldownWindow === 'function') {
                startActionCooldownWindow();
            }
            const beforeStats = {
                hunger: gameState.pet.hunger,
                happiness: gameState.pet.happiness,
                energy: gameState.pet.energy
            };
            const focusSnapshot = getPetNeedSnapshot(gameState.pet);
            garden.inventory[cropId]--;
            if (garden.inventory[cropId] <= 0) {
                delete garden.inventory[cropId];
            }

            // Apply room bonus, preference modifier, and personality modifier
            const feedMultiplier = typeof getRoomBonus === 'function' ? getRoomBonus('feed') : 1.0;
            const feedPrefMod = typeof getPreferenceModifier === 'function' ? getPreferenceModifier(gameState.pet, 'feed', cropId) : 1.0;
            const feedPersonalityMod = typeof getPersonalityCareModifier === 'function' ? getPersonalityCareModifier(gameState.pet, 'feed') : 1.0;
            const feedWisdom = typeof getElderWisdomBonus === 'function' ? getElderWisdomBonus(gameState.pet) : 0;
            const focusMult = typeof getCareFocusMultiplier === 'function' ? getCareFocusMultiplier('feed', gameState.pet, focusSnapshot) : 1.0;
            const rewardCareMult = typeof getRewardCareGainMultiplier === 'function' ? getRewardCareGainMultiplier() : 1;
            const feedTotalMod = feedMultiplier * feedPrefMod * feedPersonalityMod * focusMult * rewardCareMult;
            const flatTuning = 0.92;

            // Track favorite food feeds
            if (feedPrefMod > 1) {
                if (typeof gameState.totalFavoriteFoodFed !== 'number') gameState.totalFavoriteFoodFed = 0;
                gameState.totalFavoriteFoodFed++;
            }

            gameState.pet.hunger = clamp(gameState.pet.hunger + Math.round((crop.hungerValue + feedWisdom) * flatTuning * feedTotalMod), 0, 100);
            if (crop.happinessValue) {
                gameState.pet.happiness = clamp(gameState.pet.happiness + Math.round(crop.happinessValue * flatTuning * feedTotalMod), 0, 100);
            }
            if (crop.energyValue) {
                gameState.pet.energy = clamp(gameState.pet.energy + Math.round(crop.energyValue * flatTuning * feedTotalMod), 0, 100);
            }
            if (typeof getRewardHappinessFlatBonus === 'function') {
                const happyFlat = Math.max(0, Number(getRewardHappinessFlatBonus()) || 0);
                if (happyFlat > 0) gameState.pet.happiness = clamp(gameState.pet.happiness + happyFlat, 0, 100);
            }

            // Track care actions for growth
            if (typeof gameState.pet.careActions !== 'number') gameState.pet.careActions = 0;
            gameState.pet.careActions++;

            // Track caretaker action counts and room action counts
            trackCareAction('feed');

            // Track lifetime feed count for feed-specific badges/achievements
            if (typeof gameState.totalFeedCount !== 'number') gameState.totalFeedCount = 0;
            gameState.totalFeedCount++;

            // Advance breeding egg incubation
            if (typeof applyBreedingEggCareBonus === 'function') applyBreedingEggCareBonus('feed');

            // Check pet-type-specific feeding stickers
            if (typeof checkPetActionSticker === 'function') {
                const actionStickers = checkPetActionSticker('feed');
                if (actionStickers) actionStickers.forEach(s => showToast(`${s.emoji} Sticker: ${s.name}!`, '#E040FB'));
            }

            const petData = getAllPetTypeData(gameState.pet.type) || PET_TYPES[gameState.pet.type];

            // Play pet voice sound
            if (typeof GameAudio !== 'undefined') {
                GameAudio.playSFXByName('petHappy', (ctx) => GameAudio.sfx.petHappy(ctx, gameState.pet.type));
            }

            // Track daily checklist progress
            if (typeof incrementDailyProgress === 'function') {
                const dailyCompleted = [];
                dailyCompleted.push(...incrementDailyProgress('feedCount'));
                dailyCompleted.push(...incrementDailyProgress('totalCareActions'));
                dailyCompleted.push(...incrementDailyProgress('masteryPoints', 1));
                dailyCompleted.forEach(task => showToast(`${task.icon} Daily task done: ${task.name}!`, '#FFD700'));
            }
            if (typeof consumeCareActionRewardModifiers === 'function') consumeCareActionRewardModifiers();

            // Check achievements
            if (typeof checkAchievements === 'function') {
                const newAch = checkAchievements();
                newAch.forEach(ach => {
                    if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.achievement);
                    setTimeout(() => showToast(`${ach.icon} Achievement: ${ach.name}!`, '#FFD700'), 300);
                });
            }

            // Check for memory moments at growth milestones
            checkAndShowMemoryMoment(gameState.pet);

            // Check for growth stage transition
            if (checkGrowthMilestone(gameState.pet)) {
                showToast(`${crop.seedEmoji} Fed ${escapeHTML(gameState.pet.name || petData.name)} a garden-fresh ${crop.name}!`, '#FF8C42');
                saveGame();
                renderPetPhase();
                return true;
            }

            const sparkles = document.getElementById('sparkles');
            const petContainer = document.getElementById('pet-container');

            if (petContainer) petContainer.classList.add('bounce');
            if (sparkles) createFoodParticles(sparkles);
            if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.feed);

            // Build stat change description
            let statChanges = [];
            const hungerDelta = Math.max(0, Math.round(gameState.pet.hunger - beforeStats.hunger));
            const happinessDelta = Math.max(0, Math.round(gameState.pet.happiness - beforeStats.happiness));
            const energyDelta = Math.max(0, Math.round(gameState.pet.energy - beforeStats.energy));
            if (hungerDelta > 0) statChanges.push(`Hunger +${hungerDelta}`);
            if (happinessDelta > 0) statChanges.push(`Happiness +${happinessDelta}`);
            if (energyDelta > 0) statChanges.push(`Energy +${energyDelta}`);
            const statDesc = statChanges.join(', ');

            // Show preference-aware feedback
            let feedFeedback = `${crop.seedEmoji} Fed ${escapeHTML(gameState.pet.name || petData.name)} a garden-fresh ${crop.name}! ${statDesc}`;
            if (feedPrefMod > 1) {
                feedFeedback = `💕 ${escapeHTML(gameState.pet.name || petData.name)} LOVES ${crop.name}! Bonus stats! ${statDesc}`;
            } else if (feedPrefMod < 1) {
                feedFeedback = `😨 ${escapeHTML(gameState.pet.name || petData.name)} doesn't like ${crop.name}... Reduced stats. ${statDesc}`;
            }
            showToast(feedFeedback, feedPrefMod > 1 ? '#E040FB' : feedPrefMod < 1 ? '#FF7043' : '#FF8C42');

            if (petContainer) {
                const onEnd = () => { petContainer.removeEventListener('animationend', onEnd); petContainer.classList.remove('bounce'); };
                petContainer.addEventListener('animationend', onEnd);
                setTimeout(() => { petContainer.removeEventListener('animationend', onEnd); petContainer.classList.remove('bounce'); }, 1200);
            }

            updateNeedDisplays();
            updatePetMood();
            updateWellnessBar();
            updateGrowthDisplay();
            saveGame();

            if (gameState.currentRoom === 'garden') {
                renderGardenUI();
            }
            return true;
        }

        function openSeedPicker(plotIndex) {
            const existing = document.querySelector('.seed-picker-overlay');
            if (existing) {
                // Pop stale escape handler before removing the old overlay
                if (existing._closeOverlay) popModalEscape(existing._closeOverlay);
                existing.remove();
            }

            const season = gameState.season || getCurrentSeason();
            const overlay = document.createElement('div');
            overlay.className = 'seed-picker-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-labelledby', 'seed-picker-heading');

            let seedsHTML = '';
            for (const [id, crop] of Object.entries(GARDEN_CROPS)) {
                const isBonus = crop.seasonBonus.includes(season);
                const bonusLabel = isBonus ? ' (in season!)' : '';
                const growMult = SEASONS[season] ? SEASONS[season].gardenGrowthMultiplier : 1;
                const effectiveTime = Math.max(1, Math.round(crop.growTime / growMult));
                const ownedSeeds = getSeedInventoryCount(id);
                seedsHTML += `
                    <button class="seed-option" data-crop="${id}" aria-label="Plant ${crop.name}${bonusLabel}" ${ownedSeeds <= 0 ? 'disabled' : ''}>
                        <span class="seed-option-emoji" aria-hidden="true">${crop.seedEmoji}</span>
                        <span class="seed-option-name">${crop.name}${isBonus ? ' ⭐' : ''}</span>
                        <span class="seed-option-time">${effectiveTime} min · Seeds: ${ownedSeeds}</span>
                    </button>
                `;
            }

            overlay.innerHTML = `
                <div class="seed-picker">
                    <h3 class="seed-picker-title" id="seed-picker-heading"><span aria-hidden="true">🌱</span> Pick a Seed to Plant!</h3>
                    <div class="seed-list">
                        ${seedsHTML}
                    </div>
                    <button class="seed-picker-close" id="seed-picker-close">Cancel</button>
                </div>
            `;

            document.body.appendChild(overlay);

            function closeOverlay() {
                popModalEscape(closeOverlay);
                if (overlay && overlay.parentNode) overlay.remove();
            }
            overlay._closeOverlay = closeOverlay;

            overlay.querySelectorAll('.seed-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    const cropId = btn.getAttribute('data-crop');
                    closeOverlay();
                    plantSeed(plotIndex, cropId);
                });
            });

            overlay.querySelector('#seed-picker-close').addEventListener('click', () => closeOverlay());
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeOverlay();
            });

            pushModalEscape(closeOverlay);

            // Focus trap for Tab key
            overlay.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    const focusable = overlay.querySelectorAll('button');
                    const first = focusable[0];
                    const last = focusable[focusable.length - 1];
                    if (e.shiftKey && document.activeElement === first) {
                        e.preventDefault();
                        last.focus();
                    } else if (!e.shiftKey && document.activeElement === last) {
                        e.preventDefault();
                        first.focus();
                    }
                }
            });

            const firstSeed = overlay.querySelector('.seed-option:not([disabled])') || overlay.querySelector('#seed-picker-close');
            if (firstSeed) firstSeed.focus();
        }

        // Generate SVG illustrations for garden crop stages
        function generateCropSVG(cropId, stage) {
            const colors = {
                carrot:     { stem: '#4CAF50', fruit: '#FF6D00', ground: '#8D6E63' },
                tomato:     { stem: '#388E3C', fruit: '#F44336', ground: '#8D6E63' },
                strawberry: { stem: '#388E3C', fruit: '#E91E63', ground: '#8D6E63' },
                pumpkin:    { stem: '#388E3C', fruit: '#FF9800', ground: '#8D6E63' },
                sunflower:  { stem: '#388E3C', fruit: '#FFD600', ground: '#8D6E63' },
                apple:      { stem: '#5D4037', fruit: '#F44336', ground: '#8D6E63' }
            };
            const c = colors[cropId] || colors.carrot;

            if (stage === 0) {
                // Seed/soil
                return `<svg viewBox="0 0 40 40" class="garden-plot-svg" aria-hidden="true">
                    <rect x="2" y="28" width="36" height="10" rx="3" fill="${c.ground}"/>
                    <ellipse cx="20" cy="28" rx="4" ry="2" fill="#5D4037"/>
                    <ellipse cx="20" cy="28" rx="2" ry="1" fill="#795548"/>
                </svg>`;
            } else if (stage === 1) {
                // Sprout
                return `<svg viewBox="0 0 40 40" class="garden-plot-svg" aria-hidden="true">
                    <rect x="2" y="28" width="36" height="10" rx="3" fill="${c.ground}"/>
                    <line x1="20" y1="28" x2="20" y2="18" stroke="${c.stem}" stroke-width="2.5" stroke-linecap="round"/>
                    <ellipse cx="16" cy="18" rx="5" ry="3" fill="${c.stem}" transform="rotate(-20 16 18)"/>
                    <ellipse cx="24" cy="18" rx="5" ry="3" fill="${c.stem}" transform="rotate(20 24 18)"/>
                </svg>`;
            } else if (stage === 2) {
                // Growing plant
                return `<svg viewBox="0 0 40 40" class="garden-plot-svg" aria-hidden="true">
                    <rect x="2" y="28" width="36" height="10" rx="3" fill="${c.ground}"/>
                    <line x1="20" y1="28" x2="20" y2="12" stroke="${c.stem}" stroke-width="3" stroke-linecap="round"/>
                    <ellipse cx="14" cy="14" rx="6" ry="3.5" fill="${c.stem}" transform="rotate(-25 14 14)"/>
                    <ellipse cx="26" cy="14" rx="6" ry="3.5" fill="${c.stem}" transform="rotate(25 26 14)"/>
                    <ellipse cx="13" cy="20" rx="5" ry="3" fill="${c.stem}" transform="rotate(-15 13 20)"/>
                    <ellipse cx="27" cy="20" rx="5" ry="3" fill="${c.stem}" transform="rotate(15 27 20)"/>
                </svg>`;
            } else {
                // Harvest-ready with fruit
                const fruitShapes = {
                    carrot: `<rect x="17" y="20" width="6" height="12" rx="3" fill="${c.fruit}"/><polygon points="20,16 17,20 23,20" fill="${c.stem}"/>`,
                    tomato: `<circle cx="20" cy="22" r="7" fill="${c.fruit}"/><ellipse cx="20" cy="16" rx="4" ry="2" fill="${c.stem}"/>`,
                    strawberry: `<path d="M20 14 Q14 20 16 26 Q20 30 24 26 Q26 20 20 14Z" fill="${c.fruit}"/><ellipse cx="20" cy="14" rx="4" ry="2" fill="${c.stem}"/><circle cx="18" cy="22" r="0.8" fill="#FFD600"/><circle cx="22" cy="24" r="0.8" fill="#FFD600"/><circle cx="20" cy="20" r="0.8" fill="#FFD600"/>`,
                    pumpkin: `<ellipse cx="20" cy="24" rx="9" ry="7" fill="${c.fruit}"/><path d="M20 17 Q22 14 20 12" stroke="${c.stem}" stroke-width="2" fill="none"/><ellipse cx="20" cy="24" rx="3" ry="7" fill="rgba(0,0,0,0.08)"/>`,
                    sunflower: `<circle cx="20" cy="18" r="5" fill="#5D4037"/><circle cx="14" cy="16" r="4" fill="${c.fruit}"/><circle cx="26" cy="16" r="4" fill="${c.fruit}"/><circle cx="14" cy="22" r="4" fill="${c.fruit}"/><circle cx="26" cy="22" r="4" fill="${c.fruit}"/><circle cx="20" cy="13" r="4" fill="${c.fruit}"/><circle cx="20" cy="24" r="4" fill="${c.fruit}"/>`,
                    apple: `<circle cx="20" cy="20" r="7" fill="${c.fruit}"/><line x1="20" y1="13" x2="20" y2="10" stroke="${c.stem}" stroke-width="2" stroke-linecap="round"/><ellipse cx="22" cy="12" rx="3" ry="2" fill="${c.stem}"/>`
                };
                const fruit = fruitShapes[cropId] || fruitShapes.carrot;
                return `<svg viewBox="0 0 40 40" class="garden-plot-svg" aria-hidden="true">
                    <rect x="2" y="28" width="36" height="10" rx="3" fill="${c.ground}"/>
                    <line x1="20" y1="28" x2="20" y2="14" stroke="${c.stem}" stroke-width="3" stroke-linecap="round"/>
                    ${fruit}
                </svg>`;
            }
        }

        function renderGardenUI() {
            const gardenSection = document.getElementById('garden-section');
            if (!gardenSection) return;

            const garden = gameState.garden;
            const season = gameState.season || getCurrentSeason();
            const seasonData = SEASONS[season];

            // Render plots
            let plotsHTML = '';
            const unlockedPlots = getUnlockedPlotCount(garden.totalHarvests || 0);
            for (let i = 0; i < MAX_GARDEN_PLOTS; i++) {
                const plot = garden.plots[i] || null;
                const isLocked = i >= unlockedPlots;
                if (isLocked) {
                    const threshold = GARDEN_PLOT_UNLOCK_THRESHOLDS[i] || 0;
                    const remaining = threshold - (garden.totalHarvests || 0);
                    plotsHTML += `
                        <div class="garden-plot locked" aria-label="Locked plot. Harvest ${remaining} more crop${remaining !== 1 ? 's' : ''} to unlock.">
                            <span class="garden-plot-emoji" aria-hidden="true">🔒</span>
                            <span class="garden-plot-label">${remaining} harvest${remaining !== 1 ? 's' : ''} to unlock</span>
                        </div>
                    `;
                } else if (!plot) {
                    plotsHTML += `
                        <div class="garden-plot empty" data-plot="${i}" role="button" tabindex="0" aria-label="Plot ${i + 1}: Empty. Press Enter to plant.">
                            <span class="garden-plot-emoji" aria-hidden="true">➕</span>
                            <span class="garden-plot-label">Plant</span>
                        </div>
                    `;
                } else {
                    const crop = GARDEN_CROPS[plot.cropId];
                    if (!crop) {
                        // Corrupted plot data — treat as empty
                        garden.plots[i] = null;
                        plotsHTML += `
                            <div class="garden-plot empty" data-plot="${i}" role="button" tabindex="0" aria-label="Plot ${i + 1}: Empty. Press Enter to plant.">
                                <span class="garden-plot-emoji" aria-hidden="true">➕</span>
                                <span class="garden-plot-label">Plant</span>
                            </div>
                        `;
                        continue;
                    }
                    const stageEmoji = crop.stages[plot.stage];
                    const cropSVG = generateCropSVG(plot.cropId, plot.stage);
                    const isReady = plot.stage >= 3;
                    const growMult = seasonData ? seasonData.gardenGrowthMultiplier : 1;
                    const effectiveGrowTime = Math.max(1, Math.round(crop.growTime / growMult));
                    const progress = isReady ? 100 : Math.min(100, Math.round((plot.growTicks / (effectiveGrowTime * 3)) * 100));
                    const statusLabel = isReady ? 'Ready to harvest!' : `Growing... ${progress}%${plot.watered ? ' 💧' : ''}`;
                    const plotClass = isReady ? 'ready' : 'growing';

                    // Calculate remaining time for countdown
                    const totalTicksNeeded = effectiveGrowTime * 3;
                    const ticksRemaining = Math.max(0, totalTicksNeeded - plot.growTicks);
                    // Watering speeds up the next tick by 1.5x (water dries after one tick)
                    const effectiveTickRate = plot.watered ? 1.5 : 1;
                    const minsRemaining = isReady ? 0 : Math.ceil(ticksRemaining / effectiveTickRate);
                    const timerText = isReady ? '' : (minsRemaining > 0 ? `~${minsRemaining}m left` : 'Almost...');

                    // Simplified: emoji + progress bar + one status line
                    const statusLine = isReady ? 'Harvest!' : `${progress}%${plot.watered ? ' 💧' : ''}`;
                    const plotActionLabel = isReady ? `Harvest ${crop.name}` : (plot.watered ? `${crop.name} growing` : `Water ${crop.name}`);
                    plotsHTML += `
                        <div class="garden-plot ${plotClass}" data-plot="${i}" role="group"
                             aria-label="Plot ${i + 1}: ${crop.name} - ${statusLabel}">
                            <button class="garden-plot-action" data-plot-action="${i}" aria-label="${plotActionLabel}">
                                ${cropSVG}
                                ${!isReady ? `<div class="garden-plot-progress" role="progressbar" aria-label="${crop.name} growth" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"><div class="garden-plot-progress-fill" style="width:${progress}%"></div></div>` : ''}
                                <span class="garden-plot-status">${statusLine}</span>
                            </button>
                            ${!isReady ? `<button class="garden-plot-remove" data-remove-plot="${i}" aria-label="Remove ${crop.name}"><span aria-hidden="true">✕</span></button>` : ''}
                        </div>
                    `;
                }
            }

            // Render inventory
            let inventoryHTML = '';
            const invKeys = Object.keys(garden.inventory).filter(k => garden.inventory[k] > 0);
            if (invKeys.length > 0) {
                let itemsHTML = '';
                invKeys.forEach(cropId => {
                    const crop = GARDEN_CROPS[cropId];
                    if (crop) {
                        itemsHTML += `<button class="garden-inventory-item" data-feed-crop="${cropId}" aria-label="Feed ${crop.name} to pet (${garden.inventory[cropId]} left)">${crop.seedEmoji} ${crop.name} x${garden.inventory[cropId]}</button>`;
                    }
                });
                inventoryHTML = `
                    <div class="garden-inventory">
                        <strong><span aria-hidden="true">🧺</span> Harvested Food:</strong> <span style="font-size:0.75rem;color:#888;">(tap to feed pet)</span>
                        <div class="garden-inventory-items">${itemsHTML}</div>
                    </div>
                `;
            }

            gardenSection.innerHTML = `
                <div class="garden-title"><span aria-hidden="true">🌱 ${seasonData ? seasonData.icon : ''}</span> My Garden</div>
                <div class="garden-subtitle" style="font-size:0.82rem;color:#6d4c41;margin-bottom:8px;">Seed stock: ${Object.entries((gameState.economy && gameState.economy.inventory && gameState.economy.inventory.seeds) || {}).filter(([, c]) => c > 0).map(([cropId, count]) => `${(GARDEN_CROPS[cropId] ? GARDEN_CROPS[cropId].seedEmoji : '🌱')}x${count}`).join(' · ') || 'None'}</div>
                <div class="garden-plots">${plotsHTML}</div>
                ${inventoryHTML}
            `;

            // Add event listeners to empty plots (role="button" divs)
            gardenSection.querySelectorAll('.garden-plot.empty').forEach(plotEl => {
                const plotIdx = parseInt(plotEl.getAttribute('data-plot'));
                if (isNaN(plotIdx)) return;
                plotEl.addEventListener('click', () => {
                    openSeedPicker(plotIdx);
                });
                plotEl.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        plotEl.click();
                    }
                });
            });

            // Add event listeners to plot action buttons (growing/ready plots)
            gardenSection.querySelectorAll('[data-plot-action]').forEach(btn => {
                const plotIdx = parseInt(btn.getAttribute('data-plot-action'));
                if (isNaN(plotIdx)) return;
                btn.addEventListener('click', () => {
                    const plot = garden.plots[plotIdx] || null;
                    if (!plot) return;
                    if (plot.stage >= 3) {
                        harvestPlot(plotIdx);
                    } else if (!plot.watered) {
                        waterPlot(plotIdx);
                    } else {
                        const crop = GARDEN_CROPS[plot.cropId];
                        showToast(`${crop.seedEmoji} ${escapeHTML(crop.name)} is growing... be patient!`, '#81C784');
                    }
                });
            });

            // Add event listeners to remove buttons
            gardenSection.querySelectorAll('[data-remove-plot]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent triggering the plot click handler
                    const plotIdx = parseInt(btn.getAttribute('data-remove-plot'));
                    removeCrop(plotIdx);
                });
            });

            // Add event listeners to inventory items (feed pet)
            gardenSection.querySelectorAll('[data-feed-crop]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const cropId = btn.getAttribute('data-feed-crop');
                    feedFromGarden(cropId);
                });
            });
        }

        // ==================== SEASONAL ACTIVITY ====================

        function performSeasonalActivity() {
            if (!gameState.pet) return;

            const season = gameState.season || getCurrentSeason();
            const seasonData = SEASONS[season];
            if (!seasonData) return;

            const pet = gameState.pet;
            const petData = getAllPetTypeData(pet.type) || PET_TYPES[pet.type];
            const sparkles = document.getElementById('sparkles');
            const petContainer = document.getElementById('pet-container');

            // Apply effects
            for (const [stat, value] of Object.entries(seasonData.activityEffects)) {
                if (pet[stat] !== undefined) {
                    pet[stat] = clamp(pet[stat] + value, 0, 100);
                }
            }

            // Track care actions for growth
            if (typeof pet.careActions !== 'number') pet.careActions = 0;
            pet.careActions++;

            // Track caretaker action counts
            trackCareAction('play');

            // Play pet voice sound
            if (typeof GameAudio !== 'undefined') {
                GameAudio.playSFXByName('petExcited', (ctx) => GameAudio.sfx.petExcited(ctx, pet.type));
            }

            // Track daily checklist progress
            if (typeof incrementDailyProgress === 'function') {
                const dailyCompleted = [];
                dailyCompleted.push(...incrementDailyProgress('totalCareActions'));
                dailyCompleted.forEach(task => showToast(`${task.icon} Daily task done: ${task.name}!`, '#FFD700'));
            }

            // Advance breeding egg incubation
            if (typeof applyBreedingEggCareBonus === 'function') applyBreedingEggCareBonus('play');

            // Check achievements
            if (typeof checkAchievements === 'function') {
                const newAch = checkAchievements();
                newAch.forEach(ach => {
                    if (typeof GameAudio !== 'undefined') GameAudio.playSFX(GameAudio.sfx.achievement);
                    setTimeout(() => showToast(`${ach.icon} Achievement: ${ach.name}!`, '#FFD700'), 300);
                });
            }
            if (typeof checkBadges === 'function') {
                const nb = checkBadges();
                nb.forEach(b => setTimeout(() => showToast(`${b.icon} Badge: ${b.name}!`, typeof BADGE_TIERS !== 'undefined' && BADGE_TIERS[b.tier] ? BADGE_TIERS[b.tier].color : '#FFD700'), 500));
            }
            if (typeof checkStickers === 'function') {
                const ns = checkStickers();
                ns.forEach(s => setTimeout(() => showToast(`${s.emoji} Sticker: ${s.name}!`, '#E040FB'), 700));
            }
            if (typeof checkTrophies === 'function') {
                const nt = checkTrophies();
                nt.forEach(t => setTimeout(() => showToast(`${t.icon} Trophy: ${t.name}!`, '#FFD700'), 900));
            }

            const message = `${petData.emoji} ${escapeHTML(pet.name || petData.name)} ${randomFromArray(seasonData.activityMessages)}`;
            showToast(message, '#FFB74D');

            // Check for memory moments
            checkAndShowMemoryMoment(pet);

            // Check for growth stage transition
            if (checkGrowthMilestone(pet)) {
                saveGame();
                renderPetPhase();
                return;
            }

            if (petContainer) {
                petContainer.classList.add('wiggle');
                const onEnd = () => { petContainer.removeEventListener('animationend', onEnd); petContainer.classList.remove('wiggle'); };
                petContainer.addEventListener('animationend', onEnd);
                setTimeout(() => { petContainer.removeEventListener('animationend', onEnd); petContainer.classList.remove('wiggle'); }, 1200);
            }
            if (sparkles) createHearts(sparkles);

            updateNeedDisplays();
            updatePetMood();
            updateWellnessBar();
            updateGrowthDisplay();
            saveGame();
        }


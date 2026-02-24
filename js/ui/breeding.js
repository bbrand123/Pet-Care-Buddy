// ============================================================
// ui/breeding.js  --  Breeding and genetics UI
// Extracted from ui.js (lines 6242-6681)
// ============================================================

        // ==================== BREEDING & GENETICS UI ====================

        function generateBreedingEggsHTML() {
            const eggs = gameState.breedingEggs || [];
            const hatched = gameState.hatchedBreedingEggs || [];
            if (eggs.length === 0 && hatched.length === 0) return '';

            let html = '<section class="breeding-eggs-section" id="breeding-eggs-section" aria-label="Breeding Eggs">';
            html += '<h3 class="breeding-eggs-title">🥚 Breeding Eggs</h3>';
            html += '<div class="breeding-eggs-list">';

            // Incubating eggs
            for (const egg of eggs) {
                const progress = getIncubationProgress(egg);
                const typeData = getAllPetTypeData(egg.offspringType);
                const typeName = typeData ? typeData.name : egg.offspringType;
                const roomBonus = INCUBATION_ROOM_BONUSES[gameState.currentRoom || 'bedroom'];
                const careBonusTicks = Math.max(0, Math.round(Number(egg.careBonuses) || 0));
                const roomBonusSummary = Object.entries(egg.roomBonuses || {})
                    .filter(([, bonus]) => Number(bonus) > 0)
                    .slice(0, 3)
                    .map(([stat, bonus]) => {
                        const statData = GENETIC_STATS[stat];
                        const amount = Math.round(Number(bonus) * 10) / 10;
                        return `+${amount} ${(statData && statData.label) || stat}`;
                    })
                    .join(', ');
                html += `
                    <div class="breeding-egg-card incubating" aria-label="Incubating egg: ${typeName}, ${Math.round(progress)}% done">
                        <div class="breeding-egg-icon">🥚</div>
                        <div class="breeding-egg-info">
                            <div class="breeding-egg-parents">${escapeHTML(egg.parent1Name)} + ${escapeHTML(egg.parent2Name)}</div>
                            <div class="breeding-egg-progress-bar">
                                <div class="breeding-egg-progress-fill" style="width: ${progress}%"></div>
                            </div>
                            <div class="breeding-egg-status">${Math.round(progress)}% incubated ${egg.hasMutation ? '🌈' : ''} ${egg.isHybrid ? '🧬' : ''}</div>
                            ${(() => {
                                const remaining = 100 - progress;
                                const estMins = Math.ceil(remaining * 0.5);
                                return remaining > 0 ? `<div class="breeding-egg-timer"><span class="timer-icon" aria-hidden="true">⏱️</span> ~${estMins}m remaining</div>` : '';
                            })()}
                            ${careBonusTicks > 0 ? `<div class="breeding-egg-room-bonus">🤗 Care bonus: +${careBonusTicks} incubation ticks</div>` : ''}
                            ${roomBonus ? `<div class="breeding-egg-room-bonus">${roomBonus.label}</div>` : ''}
                            ${roomBonusSummary ? `<div class="breeding-egg-room-bonus">🏠 Room trait boosts: ${escapeHTML(roomBonusSummary)}</div>` : ''}
                        </div>
                    </div>
                `;
            }

            // Hatched eggs ready to collect
            for (let i = 0; i < hatched.length; i++) {
                const egg = hatched[i];
                const typeData = getAllPetTypeData(egg.offspringType);
                const typeName = typeData ? typeData.name : egg.offspringType;
                const typeEmoji = typeData ? typeData.emoji : '🐾';
                html += `
                    <div class="breeding-egg-card hatched" aria-label="Hatched ${typeName}, ready to collect">
                        <div class="breeding-egg-icon hatched-icon">${typeEmoji}</div>
                        <div class="breeding-egg-info">
                            <div class="breeding-egg-parents">${escapeHTML(egg.parent1Name)} + ${escapeHTML(egg.parent2Name)}</div>
                            <div class="breeding-egg-status hatched-status">
                                Hatched! ${egg.hasMutation ? '🌈 Mutated!' : ''} ${egg.isHybrid ? '🧬 Hybrid!' : ''}
                            </div>
                            <button class="breeding-egg-collect-btn" data-egg-index="${i}">Collect ${typeName}</button>
                        </div>
                    </div>
                `;
            }

            html += '</div></section>';
            return html;
        }

        function updateBreedingEggDisplay() {
            const section = document.getElementById('breeding-eggs-section');
            const newHTML = generateBreedingEggsHTML();
            if (!newHTML && section) {
                section.remove();
                return;
            }
            if (newHTML) {
                if (section) {
                    const temp = document.createElement('div');
                    temp.innerHTML = newHTML;
                    section.replaceWith(temp.firstElementChild);
                } else {
                    // Section doesn't exist yet — insert into game content
                    const content = document.getElementById('game-content');
                    if (content) {
                        const temp = document.createElement('div');
                        temp.innerHTML = newHTML;
                        content.appendChild(temp.firstElementChild);
                    }
                }
                // Re-attach collect buttons
                document.querySelectorAll('.breeding-egg-collect-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const eggIdx = parseInt(btn.dataset.eggIndex);
                        collectHatchedEgg(eggIdx);
                    });
                });
            }
        }

        function collectHatchedEgg(index) {
            if (!gameState.hatchedBreedingEggs || index < 0 || index >= gameState.hatchedBreedingEggs.length) return;

            // Validate capacity before mutating hatch progression state
            if (getPetCount() >= MAX_PETS) {
                showToast(`You have ${MAX_PETS} pets already! Release one to collect this baby.`, '#FFA726');
                return;
            }

            const egg = gameState.hatchedBreedingEggs[index];
            const newPet = hatchBreedingEgg(egg);
            if (!newPet) {
                showToast('Could not hatch this egg. Try again!', '#EF5350');
                return;
            }

            // Add to family
            addPetToFamily(newPet);
            gameState.totalBreedingHatches = (gameState.totalBreedingHatches || 0) + 1;
            if (typeof incrementDailyProgress === 'function') {
                incrementDailyProgress('hatchCount', 1);
                incrementDailyProgress('masteryPoints', 3);
                incrementDailyProgress('discoveryEvents', 1);
            }
            if (typeof addJournalEntry === 'function') {
                const typeData = getAllPetTypeData(newPet.type);
                addJournalEntry('👶', `${newPet.name || (typeData ? typeData.name : 'New Pet')} joined your family.`);
            }

            // Remove from hatched list
            gameState.hatchedBreedingEggs.splice(index, 1);

            // Set as active pet and show naming modal
            const newIndex = gameState.pets.length - 1;
            syncActivePetToArray();
            switchActivePet(newIndex);

            saveGame();

            // Show celebration
            const typeData = getAllPetTypeData(newPet.type);
            const typeName = typeData ? typeData.name : newPet.type;
            let celebMsg = `Welcome, baby ${typeName}!`;
            if (newPet.hasMutation) celebMsg += ' This baby has a rare mutation!';
            if (newPet.isHybrid) celebMsg += ' A unique hybrid creature!';

            showBreedingCelebration(newPet, celebMsg);
        }

        function showBreedingCelebration(pet, message) {
            const typeData = getAllPetTypeData(pet.type);
            const petEmoji = typeData ? typeData.emoji : '🐾';
            const typeName = typeData ? typeData.name : pet.type;

            // Build genetics display
            let geneticsHTML = '';
            if (pet.genetics) {
                geneticsHTML = '<div class="breeding-genetics-display">';
                for (const [stat, value] of Object.entries(pet.genetics)) {
                    const data = GENETIC_STATS[stat];
                    if (data) {
                        const barWidth = (value / data.max) * 100;
                        geneticsHTML += `
                            <div class="genetics-stat-row">
                                <span class="genetics-stat-label">${data.emoji} ${data.label}</span>
                                <div class="genetics-stat-bar"><div class="genetics-stat-fill" style="width: ${barWidth}%"></div></div>
                                <span class="genetics-stat-value">${value}</span>
                            </div>
                        `;
                    }
                }
                geneticsHTML += '</div>';
            }

            let traitsHTML = '';
            if (pet.mutationColor) traitsHTML += `<span class="breeding-trait mutation">🌈 ${pet.mutationColor} Color</span>`;
            if (pet.mutationPattern) traitsHTML += `<span class="breeding-trait mutation">✨ ${pet.mutationPattern} Pattern</span>`;
            if (pet.isHybrid) traitsHTML += `<span class="breeding-trait hybrid">🧬 Hybrid</span>`;
            if (pet.parentNames) traitsHTML += `<span class="breeding-trait lineage">👪 Parents: ${escapeHTML(pet.parentNames[0])} & ${escapeHTML(pet.parentNames[1])}</span>`;
            const safePetColor = sanitizeCssColor(pet.color);
            const mutationPatternMap = (typeof MUTATION_PATTERNS !== 'undefined' && MUTATION_PATTERNS) ? MUTATION_PATTERNS : {};
            const patternDisplayName = (PET_PATTERNS[pet.pattern] || mutationPatternMap[pet.pattern] || { name: pet.pattern }).name;

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay breeding-celebration-modal';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.innerHTML = `
                <div class="modal-content breeding-celebration-content">
                    <div class="breeding-celebration-emoji">${petEmoji}</div>
                    <h2 class="breeding-celebration-title">New Baby ${escapeHTML(typeName)}!</h2>
                    <p class="breeding-celebration-message">${escapeHTML(message)}</p>
                    ${traitsHTML ? `<div class="breeding-traits">${traitsHTML}</div>` : ''}
                    ${geneticsHTML}
                    <div class="breeding-celebration-color">
                        <span class="color-swatch" style="background-color: ${safePetColor}"></span>
                        <span>Color: ${getColorName(safePetColor)}${pet.mutationColor ? ' (Mutation!)' : ''}</span>
                    </div>
                    <div class="breeding-celebration-pattern">Pattern: ${patternDisplayName}${pet.mutationPattern ? ' (Mutation!)' : ''}</div>
                    <div class="modal-buttons">
                        <button class="modal-btn confirm" id="breeding-celebrate-ok">Name Your Pet</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            const closeOverlay = () => {
                popModalEscape(closeOverlay);
                overlay.remove();
                // Open the naming modal
                if (typeof showNamingModal === 'function') {
                    const petTypeData = getAllPetTypeData(pet.type) || PET_TYPES[pet.type] || { name: pet.type, colors: [pet.color || '#D4A574'] };
                    showNamingModal(petTypeData, {
                        initialColor: pet.color,
                        initialPattern: pet.pattern,
                        initialAccessory: Array.isArray(pet.accessories) && pet.accessories.length > 0 ? pet.accessories[0] : null
                    });
                } else {
                    renderPetPhase();
                }
            };

            pushModalEscape(closeOverlay);
            overlay._closeOverlay = closeOverlay;
            document.getElementById('breeding-celebrate-ok').addEventListener('click', closeOverlay);
            document.getElementById('breeding-celebrate-ok').focus();
            trapFocus(overlay);
        }

        function showBreedingModal() {
            if (!gameState.pets || gameState.pets.length < 2) {
                showToast('You need at least 2 pets to breed!', '#FFA726');
                return;
            }

            // Find pets that are old enough to breed (adult or elder by default)
            const ageEligiblePets = [];
            const stageOrder = Array.isArray(GROWTH_ORDER) ? GROWTH_ORDER : ['baby', 'child', 'adult', 'elder'];
            const configuredMinStageIdx = stageOrder.indexOf(BREEDING_CONFIG.minAge);
            const minStageIdx = configuredMinStageIdx >= 0 ? configuredMinStageIdx : stageOrder.indexOf('adult');
            gameState.pets.forEach((p, idx) => {
                if (!p) return;
                const stageIdx = stageOrder.indexOf(p.growthStage);
                if (stageIdx >= minStageIdx) {
                    ageEligiblePets.push({ pet: p, index: idx });
                }
            });

            if (ageEligiblePets.length < 2) {
                showToast('You need at least 2 adult or elder pets to breed!', '#FFA726');
                return;
            }

            const existingModal = document.querySelector('.modal-overlay.breeding-modal');
            if (existingModal) {
                if (existingModal._closeOverlay) popModalEscape(existingModal._closeOverlay);
                existingModal.remove();
            }

            let selectedParent1 = null;
            let selectedParent2 = null;

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay breeding-modal';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-labelledby', 'breeding-modal-title');

            function renderModalContent() {
                // Build pet selection grid
                let parent1Options = '';
                let parent2Options = '';
                for (const { pet, index } of ageEligiblePets) {
                    const typeData = getAllPetTypeData(pet.type) || PET_TYPES[pet.type];
                    const name = escapeHTML(pet.name || (typeData ? typeData.name : 'Pet'));
                    const emoji = typeData ? typeData.emoji : '🐾';
                    const breedCheck = canBreed(pet);
                    const isDisabled = !breedCheck.eligible;
                    const isSelected1 = selectedParent1 === index;
                    const isSelected2 = selectedParent2 === index;
                    const disabledByOther1 = selectedParent2 === index;
                    const disabledByOther2 = selectedParent1 === index;

                    parent1Options += `
                        <button class="breeding-pet-option ${isSelected1 ? 'selected' : ''} ${isDisabled || disabledByOther1 ? 'disabled' : ''}"
                                data-parent="1" data-index="${index}" ${isDisabled || disabledByOther1 ? 'disabled' : ''}>
                            <span class="breeding-pet-emoji">${emoji}</span>
                            <span class="breeding-pet-name">${name}</span>
                            ${isDisabled ? `<span class="breeding-pet-status">${escapeHTML(breedCheck.reason || '')}</span>` : ''}
                        </button>
                    `;
                    parent2Options += `
                        <button class="breeding-pet-option ${isSelected2 ? 'selected' : ''} ${isDisabled || disabledByOther2 ? 'disabled' : ''}"
                                data-parent="2" data-index="${index}" ${isDisabled || disabledByOther2 ? 'disabled' : ''}>
                            <span class="breeding-pet-emoji">${emoji}</span>
                            <span class="breeding-pet-name">${name}</span>
                            ${isDisabled ? `<span class="breeding-pet-status">${escapeHTML(breedCheck.reason || '')}</span>` : ''}
                        </button>
                    `;
                }

                // Compatibility preview
                let compatHTML = '';
                if (selectedParent1 !== null && selectedParent2 !== null) {
                    const p1 = gameState.pets[selectedParent1];
                    const p2 = gameState.pets[selectedParent2];
                    const pairCheck = canBreedPair(p1, p2);
                    const rel = getRelationship(p1.id, p2.id);
                    const level = getRelationshipLevel(rel.points);
                    const levelData = RELATIONSHIP_LEVELS[level];
                    const requiredRelKey = (BREEDING_CONFIG && BREEDING_CONFIG.minRelationship) || 'friend';
                    const requiredRelData = RELATIONSHIP_LEVELS[requiredRelKey] || RELATIONSHIP_LEVELS.friend;
                    const requiredPoints = Math.max(0, Number(requiredRelData.minPoints) || 0);
                    const relPoints = Math.max(0, Number(rel.points) || 0);
                    const relProgressPct = requiredPoints > 0 ? Math.min(100, Math.round((Math.min(relPoints, requiredPoints) / requiredPoints) * 100)) : 100;
                    const relPointsToGate = Math.max(0, requiredPoints - relPoints);
                    const hybridId = getHybridForParents(p1.type, p2.type);
                    const hybridData = hybridId ? HYBRID_PET_TYPES[hybridId] : null;
                    const roomId = gameState.currentRoom || 'bedroom';
                    const incubRoomBonus = INCUBATION_ROOM_BONUSES[roomId] || null;
                    const careBonusSummary = Object.entries(INCUBATION_CARE_BONUSES || {})
                        .map(([actionId, info]) => `${actionId} +${Math.max(0, Number(info && info.tickBonus) || 0)}`)
                        .join(' • ');

                    compatHTML = `
                        <div class="breeding-preview">
                            <div class="breeding-preview-title">Compatibility</div>
                            <div class="breeding-preview-rel">${levelData.emoji} ${levelData.label} (${rel.points} pts)</div>
                            <div class="breeding-egg-progress-bar" aria-hidden="true">
                                <div class="breeding-egg-progress-fill" style="width:${relProgressPct}%"></div>
                            </div>
                            <div class="breeding-preview-mutation">${requiredRelData.emoji} ${requiredRelData.label} gate: ${Math.min(relPoints, requiredPoints)}/${requiredPoints}${relPointsToGate > 0 ? ` (${relPointsToGate} pts to go)` : ' (ready)'}</div>
                            ${hybridData ? `<div class="breeding-preview-hybrid">🧬 Possible Hybrid: ${hybridData.name} (${Math.round(BREEDING_CONFIG.hybridChance * 100)}% chance)</div>` : ''}
                            <div class="breeding-preview-mutation">🌈 Mutation chance: ${Math.round(BREEDING_CONFIG.mutationChance * 100)}%</div>
                            ${incubRoomBonus ? `<div class="breeding-preview-mutation">🏠 Incubation room bonus (${escapeHTML(roomId)}): ${escapeHTML(incubRoomBonus.label)}</div>` : ''}
                            ${careBonusSummary ? `<div class="breeding-preview-mutation">🤗 Care boosts: ${escapeHTML(careBonusSummary)}</div>` : ''}
                            ${!pairCheck.eligible ? `<div class="breeding-preview-error">${escapeHTML(pairCheck.reason || '')}</div>` : ''}
                        </div>
                    `;
                }

                // Breeding eggs count
                const eggCount = (gameState.breedingEggs || []).length;
                const eggsHTML = eggCount > 0 ? `<div class="breeding-egg-count">🥚 ${eggCount}/${BREEDING_CONFIG.maxBreedingEggs} eggs incubating</div>` : '';

                overlay.innerHTML = `
                    <div class="modal-content breeding-modal-content">
                        <h2 class="modal-title" id="breeding-modal-title">💕 Breed Pets</h2>
                        <p class="breeding-modal-desc">Select two adult pets to breed. Their offspring will inherit traits from both parents!</p>
                        ${eggsHTML}
                        <div class="breeding-selection">
                            <div class="breeding-parent-col">
                                <h3>Parent 1</h3>
                                <div class="breeding-pet-options">${parent1Options}</div>
                            </div>
                            <div class="breeding-heart-divider">💕</div>
                            <div class="breeding-parent-col">
                                <h3>Parent 2</h3>
                                <div class="breeding-pet-options">${parent2Options}</div>
                            </div>
                        </div>
                        ${compatHTML}
                        <div class="modal-buttons">
                            <button class="modal-btn cancel" id="breeding-cancel">Cancel</button>
                            <button class="modal-btn confirm" id="breeding-confirm" ${selectedParent1 === null || selectedParent2 === null ? 'disabled' : ''}>🥚 Breed!</button>
                        </div>
                    </div>
                `;

                // Attach event listeners
                overlay.querySelectorAll('.breeding-pet-option').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const parent = btn.dataset.parent;
                        const idx = parseInt(btn.dataset.index);
                        if (parent === '1') {
                            selectedParent1 = selectedParent1 === idx ? null : idx;
                        } else {
                            selectedParent2 = selectedParent2 === idx ? null : idx;
                        }
                        renderModalContent();
                    });
                });

                const cancelBtn = overlay.querySelector('#breeding-cancel');
                const confirmBtn = overlay.querySelector('#breeding-confirm');

                cancelBtn.addEventListener('click', closeOverlay);

                if (confirmBtn && !confirmBtn.disabled) {
                    confirmBtn.addEventListener('click', () => {
                        if (selectedParent1 === null || selectedParent2 === null) return;
                        const p1 = gameState.pets[selectedParent1];
                        const p2 = gameState.pets[selectedParent2];
                        const pairCheck = canBreedPair(p1, p2);
                        if (!pairCheck.eligible) {
                            showToast(pairCheck.reason, '#EF5350');
                            return;
                        }
                        const result = breedPets(selectedParent1, selectedParent2);
                        if (result && result.success) {
                            closeOverlay();
                            let msg = '🥚 Breeding successful! An egg is now incubating!';
                            if (result.isHybrid) {
                                const hData = HYBRID_PET_TYPES[result.offspringType];
                                msg = `🧬 A ${hData ? hData.name : 'hybrid'} egg is incubating!`;
                            }
                            if (result.hasMutation) msg += ' 🌈 A rare mutation was detected!';
                            showToast(msg, '#E040FB');
                            announce(msg, true);
                            if (typeof hapticPattern === 'function') hapticPattern('achievement');
                            // Check achievements
                            if (typeof checkAchievements === 'function') {
                                const newAch = checkAchievements();
                                newAch.forEach(ach => setTimeout(() => {
                                    showToast(`${ach.icon} Achievement: ${ach.name}!`, '#FFD700');
                                    queueRewardCard('achievement', ach, '#FFD700');
                                }, 500));
                            }
                            if (typeof checkBadges === 'function') {
                                const nb = checkBadges();
                                nb.forEach(b => setTimeout(() => {
                                    const badgeColor = BADGE_TIERS[b.tier] ? BADGE_TIERS[b.tier].color : '#FFD700';
                                    showToast(`${b.icon} Badge: ${b.name}!`, badgeColor);
                                    queueRewardCard('badge', b, badgeColor);
                                }, 700));
                            }
                            if (typeof checkStickers === 'function') {
                                const ns = checkStickers();
                                ns.forEach(s => setTimeout(() => {
                                    showToast(`${s.emoji} Sticker: ${s.name}!`, '#E040FB');
                                    queueRewardCard('sticker', s, '#E040FB');
                                }, 900));
                            }
                            if (typeof checkTrophies === 'function') {
                                const nt = checkTrophies();
                                nt.forEach(t => setTimeout(() => {
                                    showToast(`${t.icon} Trophy: ${t.name}!`, '#FFD700');
                                    queueRewardCard('trophy', t, '#FFD700');
                                }, 1100));
                            }
                            renderPetPhase();
                        } else if (result) {
                            showToast(result.reason || 'Breeding failed!', '#EF5350');
                        }
                    });
                }

            }

            function closeOverlay() {
                popModalEscape(closeOverlay);
                overlay.remove();
            }

            document.body.appendChild(overlay);
            pushModalEscape(closeOverlay);
            overlay._closeOverlay = closeOverlay;
            trapFocus(overlay);
            renderModalContent();
            // Focus cancel button only on initial open
            const initialCancel = overlay.querySelector('#breeding-cancel');
            if (initialCancel) initialCancel.focus();
        }

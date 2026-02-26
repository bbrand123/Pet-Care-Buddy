// ============================================================
// growth.js  –  Growth & care quality functions
// Extracted from game.js (lines 5145-5357)
// ============================================================

        // ==================== GROWTH & CARE QUALITY FUNCTIONS ====================

        function getPetAge(pet) {
            if (!pet || !pet.birthdate) return 0;
            const ageInMs = Date.now() - pet.birthdate;
            return ageInMs / (1000 * 60 * 60); // Convert to hours
        }

        function getNeglectRuntimeState(pet) {
            if (!pet || typeof pet !== 'object') return null;
            if (!pet._neglectRuntime || typeof pet._neglectRuntime !== 'object') {
                Object.defineProperty(pet, '_neglectRuntime', {
                    value: { progress: 0 },
                    enumerable: false,
                    writable: true,
                    configurable: true
                });
            }
            return pet._neglectRuntime;
        }

        function applyDeterministicNeglectCount(pet, stage, stageBalance, isNeglected) {
            const runtime = getNeglectRuntimeState(pet);
            if (!runtime) return;
            const decayTuning = getDecayTuning();
            const neglectCfg = ((decayTuning.neglectCount || {})[stage]) || {};
            const gainScale = Math.max(0, Number(neglectCfg.gainScale) || 1);
            const recoveryScale = Math.max(0, Number(neglectCfg.recoveryScale) || 1);
            const gainAmount = Math.max(0, (Number(stageBalance.neglectGainMultiplier) || 1) * gainScale);
            const recoveryAmount = Math.max(0, (Number(stageBalance.neglectRecoveryMultiplier) || 1) * recoveryScale);
            runtime.progress = (Number(runtime.progress) || 0) + (isNeglected ? gainAmount : -recoveryAmount);
            if (typeof pet.neglectCount !== 'number' || !Number.isFinite(pet.neglectCount)) pet.neglectCount = 0;

            while (runtime.progress >= 1) {
                pet.neglectCount += 1;
                runtime.progress -= 1;
            }
            while (runtime.progress <= -1 && pet.neglectCount > 0) {
                pet.neglectCount -= 1;
                runtime.progress += 1;
            }
            pet.neglectCount = Math.max(0, Math.floor(pet.neglectCount));
        }

        function updateCareHistory(pet) {
            if (!pet) return null;
            pet.hunger = normalizePetNeedValue(pet.hunger, 70);
            pet.cleanliness = normalizePetNeedValue(pet.cleanliness, 70);
            pet.happiness = normalizePetNeedValue(pet.happiness, 70);
            pet.energy = normalizePetNeedValue(pet.energy, 70);

            // Initialize care history if missing
            if (!pet.careHistory) pet.careHistory = [];

            // Track previous care quality for change detection
            const previousQuality = pet.careQuality || 'average';

            // Track current stats
            const currentAverage = (pet.hunger + pet.cleanliness + pet.happiness + pet.energy) / 4;
            const timestamp = Date.now();

            // Add to history (keep last 100 entries to calculate trends)
            pet.careHistory.push({ average: currentAverage, timestamp });
            if (pet.careHistory.length > 100) {
                pet.careHistory.shift();
            }

            // Check for neglect (any stat below 20)
            // Only update neglectCount every 5 minutes (10 ticks at 30s) to prevent
            // rapid inflation from the 30-second update cycle
            let petId = pet.id;
            if (!Number.isInteger(petId) || petId <= 0) {
                if (!pet._runtimeNeglectKey) {
                    Object.defineProperty(pet, '_runtimeNeglectKey', {
                        value: `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                        writable: false,
                        configurable: true,
                        enumerable: false
                    });
                }
                petId = pet._runtimeNeglectKey;
            }
            if (!_neglectTickCounters[petId]) _neglectTickCounters[petId] = 0;
            _neglectTickCounters[petId]++;
            const stage = pet.growthStage && GROWTH_STAGES[pet.growthStage] ? pet.growthStage : 'baby';
            const stageBalance = getStageBalance(stage);
            const neglectThreshold = stageBalance.neglectThreshold || 20;
            const isNeglected = pet.hunger < neglectThreshold || pet.cleanliness < neglectThreshold || pet.happiness < neglectThreshold || pet.energy < neglectThreshold;
            if (_neglectTickCounters[petId] >= 10) {
                _neglectTickCounters[petId] = 0;
                applyDeterministicNeglectCount(pet, stage, stageBalance, isNeglected);
            }

            // Calculate overall care quality
            const recentHistory = pet.careHistory.slice(-20); // Last 20 measurements
            const averageStats = recentHistory.reduce((sum, entry) => sum + entry.average, 0) / recentHistory.length;
            const neglectCount = pet.neglectCount || 0;

            // Update care quality
            const newQuality = getCareQuality(averageStats, neglectCount);
            pet.careQuality = newQuality;

            // Update care variant based on quality
            const qualityData = CARE_QUALITY[newQuality];
            if (qualityData) {
                pet.careVariant = qualityData.variant;
            }

            // Return quality change info for notifications
            if (previousQuality !== newQuality) {
                return {
                    changed: true,
                    from: previousQuality,
                    to: newQuality,
                    improved: getCareQualityLevel(newQuality) > getCareQualityLevel(previousQuality)
                };
            }

            return { changed: false };
        }

        // Helper to get numeric level for care quality comparison
        function getCareQualityLevel(quality) {
            const levels = { poor: 0, average: 1, good: 2, excellent: 3 };
            return levels[quality] || 0;
        }

        const _milestoneCheckInProgress = {};
        function checkGrowthMilestone(pet) {
            if (!pet) return false;

            const ageInHours = getPetAge(pet);
            const currentStage = getGrowthStage(pet.careActions, ageInHours, pet.careQuality || 'average');
            const lastStage = pet.lastGrowthStage || 'baby';

            if (currentStage !== lastStage) {
                // Guard against duplicate celebration if called multiple times
                const milestoneKey = pet.id != null ? String(pet.id) : '__active__';
                if (_milestoneCheckInProgress[milestoneKey]) return false;
                _milestoneCheckInProgress[milestoneKey] = true;
                setTimeout(() => { delete _milestoneCheckInProgress[milestoneKey]; }, 100);
                pet.growthStage = currentStage;
                pet.lastGrowthStage = currentStage;

                // Show birthday celebration
                if (currentStage !== 'baby') {
                    hapticBuzz(100);
                    showBirthdayCelebration(currentStage, pet);
                    const petName = getPetDisplayName(pet);
                    const stageLabel = GROWTH_STAGES[currentStage]?.label || currentStage;
                    addJournalEntry('🎉', `${petName} grew to ${stageLabel} stage!`);
                    // Feature 16: Auto-captured memory photo with stage flavor
                    const _stageFlavors = {
                        child:  'The world looks a little bigger now.',
                        adult:  'Standing tall and ready for adventures.',
                        elder:  'Wisdom earned through a life well loved.'
                    };
                    const _stageFlavor = _stageFlavors[currentStage] || `${petName} reached a new stage.`;
                    addJournalEntry('🎂', `${petName} — ${stageLabel}. ${_stageFlavor}`);
                }

                // Announce growth stage transition (Item 25)
                const petName = getPetDisplayName(pet);
                const stageLabel = GROWTH_STAGES[currentStage]?.label || currentStage;
                announce(`${petName} has reached the ${stageLabel} stage!`, true);

                // R2: Grant a free starter egg on the baby→child transition (first pet only)
                if (currentStage === 'child' && getPetCount() === 1 && !gameState.starterEggGranted) {
                    gameState.starterEggGranted = true;
                    // Build a fully-incubated mystery egg for the player to hatch
                    try {
                        if (!Array.isArray(gameState.hatchedBreedingEggs)) gameState.hatchedBreedingEggs = [];
                        const _starterTypes = typeof getUnlockedPetTypes === 'function' ? getUnlockedPetTypes() : Object.keys(PET_TYPES || {});
                        const _starterType = _starterTypes[Math.floor(Math.random() * _starterTypes.length)] || 'furry';
                        const _starterTypeData = (typeof getAllPetTypeData === 'function') ? getAllPetTypeData(_starterType) : (PET_TYPES || {})[_starterType];
                        const _starterColor = (_starterTypeData && Array.isArray(_starterTypeData.colors))
                            ? _starterTypeData.colors[Math.floor(Math.random() * _starterTypeData.colors.length)]
                            : '#F8BBD0';
                        const incBase = (typeof BREEDING_CONFIG !== 'undefined' && BREEDING_CONFIG.incubationBaseTicks) || 20;
                        gameState.hatchedBreedingEggs.push({
                            offspringType: _starterType,
                            incubationTicks: incBase,
                            incubationTarget: incBase,
                            parent1Name: 'Mysterious Visitor',
                            parent2Name: '?',
                            color: _starterColor,
                            pattern: 'none',
                            genetics: {},
                            roomBonuses: {},
                            careBonuses: 0,
                            hasMutation: false,
                            isHybrid: false,
                            isStarterEgg: true
                        });
                        if (typeof showToast === 'function') {
                            setTimeout(() => showToast('\uD83E\uDD5A A mysterious egg appeared \u2014 your pet might enjoy the company!', '#CE93D8'), 2500);
                        }
                    } catch (_e) { /* never block growth */ }
                }

                // Update adults raised counter
                if (currentStage === 'adult') {
                    gameState.adultsRaised = (gameState.adultsRaised || 0) + 1;

                    // Notify if pet can now evolve (adult + excellent care)
                    if (canEvolve(pet)) {
                        setTimeout(() => {
                            showToast('⭐ Your pet can now evolve! Look for the Evolve button.', '#FFD700');
                        }, 2000);
                    }

                    // Check if any mythical pets just got unlocked
                    Object.keys(PET_TYPES).forEach(typeKey => {
                        const typeData = PET_TYPES[typeKey];
                        if (typeData.mythical && gameState.adultsRaised === typeData.unlockRequirement) {
                            setTimeout(() => {
                                showToast(`${typeData.emoji} ${typeData.name} unlocked! A mythical pet is now available!`, '#DDA0DD');
                            }, 1500);
                        }
                    });
                }

                // Track elders raised
                if (currentStage === 'elder') {
                    if (typeof gameState.eldersRaised !== 'number') gameState.eldersRaised = 0;
                    gameState.eldersRaised++;
                    // Grant elder sticker
                    if (typeof grantSticker === 'function') grantSticker('elderSticker');
                }

                saveGame();
                return true;
            }

            return false;
        }

        function canEvolve(pet) {
            if (!pet) return false;
            if (pet.evolutionStage === 'evolved') return false;
            if (pet.growthStage !== 'adult' && pet.growthStage !== 'elder') return false;

            const qualityData = CARE_QUALITY[pet.careQuality];
            if (!qualityData || !qualityData.canEvolve) return false;

            const recentHistory = Array.isArray(pet.careHistory) ? pet.careHistory.slice(-20) : [];
            const historyAvg = recentHistory.length > 0
                ? recentHistory.reduce((sum, entry) => sum + (Number(entry.average) || 0), 0) / recentHistory.length
                : ((Number(pet.hunger) || 0) + (Number(pet.cleanliness) || 0) + (Number(pet.happiness) || 0) + (Number(pet.energy) || 0)) / 4;
            const neglectCount = Number(pet.neglectCount) || 0;
            // Fix 7: Cap neglect penalty at 15 events so one bad offline gap doesn't permanently block evolution
            const cappedNeglect = Math.min(neglectCount, 15);
            const performanceScore = historyAvg - (cappedNeglect * 3.5); // was: neglectCount * 3.5

            // Keep evolution tied to excellent, active care performance instead of passive waiting.
            return performanceScore >= 78 && neglectCount <= 4;
        }

        function evolvePet(pet) {
            if (!canEvolve(pet)) return false;

            const evolutionData = PET_EVOLUTIONS[pet.type];
            if (!evolutionData) return false;

            pet.evolutionStage = 'evolved';

            // Store evolution title separately so the user-chosen name is preserved
            pet.evolutionTitle = evolutionData.name;

            // Show evolution celebration
            showEvolutionCelebration(pet, evolutionData);
            addJournalEntry('✨', `${pet.name || 'Pet'} evolved into ${evolutionData.name}!`);

            saveGame();
            return true;
        }

        // Get time icon based on time of day
        function getTimeIcon(timeOfDay) {
            switch (timeOfDay) {
                case 'sunrise': return '🌅';
                case 'day': return '☀️';
                case 'sunset': return '🌇';
                case 'night': return '🌙';
                default: return '☀️';
            }
        }

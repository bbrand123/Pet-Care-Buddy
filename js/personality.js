// ============================================================
// personality.js  –  Pet memorial system, personality helpers,
//   and pet journal
// Extracted from game.js (lines 3642-3819)
// ============================================================

        // ==================== PET MEMORIAL SYSTEM ====================

        function retirePet(petIndex) {
            if (!gameState.pets || petIndex < 0 || petIndex >= gameState.pets.length) return null;
            const pet = gameState.pets[petIndex];
            if (!pet) return null;

            // Check minimum requirements
            const ageInHours = getPetAge(pet);
            const allowedStages = Array.isArray(MEMORIAL_CONFIG.retirementAllowedStages) && MEMORIAL_CONFIG.retirementAllowedStages.length
                ? MEMORIAL_CONFIG.retirementAllowedStages
                : ['adult', 'elder'];
            if (!allowedStages.includes(pet.growthStage)) {
                return { success: false, reason: `Pet must be ${allowedStages.join(' or ')} stage to retire` };
            }
            if (ageInHours < MEMORIAL_CONFIG.retirementMinAge) {
                return { success: false, reason: `Pet must be at least ${MEMORIAL_CONFIG.retirementMinAge} hours old to retire` };
            }

            // Can't retire if it's the only pet
            if (gameState.pets.length <= 1) {
                return { success: false, reason: 'You need at least one pet! Adopt another before retiring this one.' };
            }

            // Create memorial entry
            const memorial = createMemorial(pet);

            // Add to memorials
            if (!gameState.memorials) gameState.memorials = [];
            gameState.memorials.push(memorial);
            if (gameState.memorials.length > MEMORIAL_CONFIG.maxMemorials) {
                gameState.memorials = gameState.memorials.slice(-MEMORIAL_CONFIG.maxMemorials);
            }

            // Remove pet from family
            const previousActiveIndex = gameState.activePetIndex;
            gameState.pets.splice(petIndex, 1);
            // Adjust active pet index exactly once after removal.
            if (gameState.pets.length === 0) {
                gameState.activePetIndex = 0;
            } else if (previousActiveIndex === petIndex) {
                gameState.activePetIndex = Math.min(petIndex, gameState.pets.length - 1);
            } else if (petIndex < previousActiveIndex) {
                gameState.activePetIndex = previousActiveIndex - 1;
            } else {
                gameState.activePetIndex = Math.min(previousActiveIndex, gameState.pets.length - 1);
            }
            gameState.pet = gameState.pets[gameState.activePetIndex] || null;

            // Remove relationships involving this pet
            if (gameState.relationships) {
                const keysToRemove = Object.keys(gameState.relationships).filter(k => {
                    const parts = k.split('-');
                    return parts.includes(String(pet.id));
                });
                keysToRemove.forEach(k => delete gameState.relationships[k]);
            }

            addJournalEntry('🌅', `${pet.name || 'Pet'} retired to the Hall of Fame. ${getMemorialTitle(pet)}`);
            refreshMasteryTracks();
            saveGame();

            announce(`${pet.name || 'Pet'} has been retired to the Hall of Fame. Thank you for the memories!`, true);

            return { success: true, memorial: memorial };
        }

        function createMemorial(pet) {
            const petData = getAllPetTypeData(pet.type);
            return {
                id: pet.id,
                name: pet.name || (petData ? petData.name : 'Pet'),
                type: pet.type,
                color: pet.color,
                pattern: pet.pattern,
                personality: pet.personality || 'playful',
                growthStage: pet.growthStage,
                evolutionStage: pet.evolutionStage,
                careQuality: pet.careQuality,
                careActions: pet.careActions,
                birthdate: pet.birthdate,
                retiredAt: Date.now(),
                ageHours: Math.round(getPetAge(pet)),
                title: getMemorialTitle(pet),
                accessories: pet.accessories ? [...pet.accessories] : [],
                isHybrid: !!pet.isHybrid,
                hasMutation: !!pet.hasMutation,
                farewellMessage: pet._farewellMessage || ''
            };
        }

        function getMemorials() {
            return gameState.memorials || [];
        }

        // ==================== PERSONALITY HELPERS ====================

        // Get personality-adjusted care modifier for an action
        function getPersonalityCareModifier(pet, action) {
            if (!pet || !pet.personality) return 1.0;
            const trait = PERSONALITY_TRAITS[pet.personality];
            if (!trait || !trait.careModifiers) return 1.0;
            return trait.careModifiers[action] || 1.0;
        }

        // Get elder wisdom bonus for stat gains
        function getElderWisdomBonus(pet) {
            if (!pet || pet.growthStage !== 'elder') return 0;
            return ELDER_CONFIG.wisdomBonusBase;
        }

        // Apply personality modifier to relationship gain for shy pets
        function getPersonalityRelationshipModifier(pet) {
            if (!pet || !pet.personality) return 1.0;
            const trait = PERSONALITY_TRAITS[pet.personality];
            return trait ? trait.relationshipModifier : 1.0;
        }

        // ==================== SAVE/LOAD ====================

        // ==================== PET JOURNAL ====================
        function addJournalEntry(icon, text) {
            if (!gameState.journal) gameState.journal = [];
            gameState.journal.push({
                timestamp: Date.now(),
                icon: icon || '📝',
                text: text || ''
            });
            // Keep journal to a reasonable size (last 100 entries)
            if (gameState.journal.length > 100) {
                gameState.journal = gameState.journal.slice(-100);
            }
        }

        /**
         * Get the full diary including a live entry for today (if applicable).
         * Past entries come from gameState.diary; today's entry is generated on the fly.
         */
        function getDiaryEntries() {
            const entries = Array.isArray(gameState.diary) ? [...gameState.diary] : [];
            // Generate a live entry for today
            if (gameState.pet && gameState.dailyChecklist && typeof generateDiaryEntry === 'function') {
                try {
                    const pet = gameState.pet;
                    const progress = gameState.dailyChecklist.progress || {};
                    const season = (typeof getCurrentSeason === 'function') ? getCurrentSeason() : 'spring';
                    const dayNum = pet.birthdate ? Math.max(1, Math.floor((Date.now() - pet.birthdate) / 86400000)) : 1;
                    const todayEntry = generateDiaryEntry(pet, progress, season, dayNum);
                    if (todayEntry) {
                        todayEntry.date = gameState.dailyChecklist.date || new Date().toISOString().slice(0, 10);
                        todayEntry.isToday = true;
                        entries.push(todayEntry);
                    }
                } catch (e) {
                    // Diary generation failure should not break the UI
                }
            }
            return entries;
        }

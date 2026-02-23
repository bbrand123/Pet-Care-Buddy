// ============================================================
// caretaker.js  –  Caretaker & narrative systems
// Extracted from game.js (lines 7527-7698)
// ============================================================

        // ==================== CARETAKER & NARRATIVE SYSTEMS ====================

        // Track care actions for caretaker title/style and room memory counts
        function trackCareAction(actionType) {
            if (!gameState.caretakerActionCounts) {
                gameState.caretakerActionCounts = { feed: 0, wash: 0, play: 0, sleep: 0, medicine: 0, groom: 0, exercise: 0, treat: 0, cuddle: 0 };
            }
            if (gameState.caretakerActionCounts[actionType] !== undefined) {
                gameState.caretakerActionCounts[actionType]++;
            }

            // Recommendation #1: Care momentum bonus
            // Track recent care action timestamps; grant careRush when 3+ actions in 5 minutes
            if (!Array.isArray(gameState._careActionTimestamps)) gameState._careActionTimestamps = [];
            const now = Date.now();
            gameState._careActionTimestamps.push(now);
            const fiveMinAgo = now - 5 * 60 * 1000;
            gameState._careActionTimestamps = gameState._careActionTimestamps.filter(t => t > fiveMinAgo);
            if (gameState._careActionTimestamps.length >= 3) {
                const alreadyActive = Array.isArray(gameState.rewardModifiers) && gameState.rewardModifiers.some(m => m.typeId === 'careRush' && (!m.expiresAt || m.expiresAt > now) && (m.remainingActions === null || m.remainingActions > 0));
                if (!alreadyActive && typeof addGameplayModifier === 'function') {
                    addGameplayModifier('careRush', 'Care Momentum');
                    if (typeof showToast === 'function') showToast('⚡ Care Rush! 3+ actions in 5 min — bonus activated!', '#FF9800');
                    gameState._careActionTimestamps = [];
                }
            }

            // Track room-specific action counts on the pet
            const pet = gameState.pet;
            if (pet) {
                if (!pet._roomActionCounts) {
                    pet._roomActionCounts = { feedCount: 0, sleepCount: 0, washCount: 0, playCount: 0, parkVisits: 0, harvestCount: 0 };
                }
                const room = gameState.currentRoom || 'bedroom';
                if (actionType === 'feed' || actionType === 'treat') pet._roomActionCounts.feedCount++;
                if (actionType === 'sleep') pet._roomActionCounts.sleepCount++;
                if (actionType === 'wash' || actionType === 'groom') pet._roomActionCounts.washCount++;
                if (actionType === 'play' || actionType === 'exercise') pet._roomActionCounts.playCount++;
                if (room === 'park') pet._roomActionCounts.parkVisits++;

                // Check for neglect recovery arc
                if (pet._isNeglected) {
                    pet._neglectRecoveryStep = (pet._neglectRecoveryStep || 0) + 1;
                    if (typeof getNeglectRecoveryMessage === 'function') {
                        const recoveryMsg = getNeglectRecoveryMessage(pet, pet._neglectRecoveryStep);
                        if (recoveryMsg && pet._neglectRecoveryStep <= 3) {
                            setTimeout(() => showToast(recoveryMsg, '#CE93D8'), 800);
                        }
                    }
                    // After 3 recovery actions, clear neglect state
                    if (pet._neglectRecoveryStep >= 3) {
                        pet._isNeglected = false;
                        pet._neglectRecoveryStep = 0;
                    }
                }
            }

            // Check caretaker title upgrade
            const totalActions = Object.values(gameState.caretakerActionCounts).reduce((s, v) => s + v, 0);
            if (typeof getCaretakerTitle === 'function') {
                const newTitle = getCaretakerTitle(totalActions);
                if (!gameState.lastCaretakerTitle) gameState.lastCaretakerTitle = 'newcomer';
                if (newTitle !== gameState.lastCaretakerTitle) {
                    gameState.caretakerTitle = newTitle;
                    const titleData = typeof getCaretakerTitleData === 'function' ? getCaretakerTitleData(totalActions) : null;
                    if (titleData) {
                        showToast(`${titleData.emoji} Title upgraded: ${titleData.label}! ${titleData.description}`, '#FFD700');
                        addJournalEntry(titleData.emoji, `Earned the title: ${titleData.label}!`);
                    }
                    gameState.lastCaretakerTitle = newTitle;
                }
            }
        }

        // Track garden harvest for room memories
        function trackHarvest() {
            const pet = gameState.pet;
            if (pet) {
                if (!pet._roomActionCounts) {
                    pet._roomActionCounts = { feedCount: 0, sleepCount: 0, washCount: 0, playCount: 0, parkVisits: 0, harvestCount: 0 };
                }
                pet._roomActionCounts.harvestCount++;
            }
        }

        // Check and show memory moments
        function checkAndShowMemoryMoment(pet) {
            if (!pet || typeof getMemoryMoment !== 'function') return;
            const moment = getMemoryMoment(pet);
            if (moment) {
                setTimeout(() => {
                    showToast(`📸 ${moment}`, '#B39DDB');
                    addJournalEntry('📸', moment);
                }, 1200);
            }
        }

        // Check for seasonal narrative events (called from decay timer periodically)
        function checkSeasonalNarrativeEvent() {
            if (!gameState.pet) return;
            const now = Date.now();
            const lastCheck = gameState.lastSeasonalEventCheck || 0;
            // Only check once per hour
            if (now - lastCheck < 3600000) return;
            gameState.lastSeasonalEventCheck = now;

            const season = gameState.season || getCurrentSeason();
            if (typeof getSeasonalEvent !== 'function') return;
            const event = getSeasonalEvent(gameState.pet, season);
            if (event) {
                if (!gameState.pet._seenSeasonalEvents) gameState.pet._seenSeasonalEvents = {};
                gameState.pet._seenSeasonalEvents[event.id] = true;
                showToast(`${event.title} ${event.message}`, '#A5D6A7');
                addJournalEntry('🌿', event.message);
            }
        }

        // Get mentor bonus for a pet (returns multiplier if pet has an elder mentor)
        function getMentorBonus(pet) {
            if (!pet || !pet._mentorId) return 1.0;
            const mentor = gameState.pets ? gameState.pets.find(p => p && p.id === pet._mentorId) : null;
            if (!mentor || mentor.growthStage !== 'elder') {
                pet._mentorId = null;
                return 1.0;
            }
            return typeof MENTOR_CONFIG !== 'undefined' ? MENTOR_CONFIG.mentorBonusCareGain : 1.15;
        }

        // Assign a mentor to a younger pet
        function assignMentor(elderPetId, youngPetId) {
            if (!gameState.pets) return false;
            const elder = gameState.pets.find(p => p && p.id === elderPetId);
            const young = gameState.pets.find(p => p && p.id === youngPetId);
            if (!elder || !young) return false;
            if (elder.growthStage !== 'elder') return false;
            if (young.growthStage === 'elder') return false;
            const ageHours = typeof getPetAge === 'function' ? getPetAge(elder) : 0;
            if (ageHours < (MENTOR_CONFIG ? MENTOR_CONFIG.minElderAge : 20)) return false;

            young._mentorId = elderPetId;
            const elderName = elder.name || 'Elder';
            const youngName = young.name || 'Pet';
            const personality = elder.personality || 'playful';
            const messages = MENTOR_CONFIG && MENTOR_CONFIG.mentorWisdomMessages ? MENTOR_CONFIG.mentorWisdomMessages[personality] : null;
            if (messages && messages.length > 0) {
                const msg = messages[Math.floor(Math.random() * messages.length)]
                    .replace(/\{elder\}/g, elderName)
                    .replace(/\{young\}/g, youngName);
                showToast(msg, '#CE93D8');
            }
            addJournalEntry('🎓', `${elderName} began mentoring ${youngName}!`);
            saveGame();
            return true;
        }

        // Save and cleanup on page unload
        window.addEventListener('beforeunload', () => {
            if (shouldRunUnloadAutosave()) {
                saveGame();
            }
        });

        // Also handle page hide for mobile browsers
        window.addEventListener('pagehide', () => {
            if (shouldRunUnloadAutosave()) {
                saveGame();
            }
            stopDecayTimer();
            stopGardenGrowTimer();
            if (typeof GameAudio !== 'undefined') GameAudio.stopAll();
            if (typeof stopIdleAnimations === 'function') stopIdleAnimations();
        });

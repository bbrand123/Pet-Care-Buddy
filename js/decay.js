// ============================================================
// decay.js  –  Pet stat decay timer
// Extracted from game.js (lines 6721-7177)
// ============================================================

        // ==================== DECAY TIMER ====================

        let decayInterval = null;
        let lastDecayAnnouncement = 0;
        let pendingRenderTimer = null;
        let _decayRuntimeState = {};
        const DECAY_NEED_KEYS = ['hunger', 'cleanliness', 'happiness', 'energy'];

        function getDecayRuntimeKey(pet) {
            if (!pet || typeof pet !== 'object') return null;
            if (Number.isInteger(pet.id) && pet.id > 0) return `pet_${pet.id}`;
            if (!pet._runtimeDecayKey) {
                Object.defineProperty(pet, '_runtimeDecayKey', {
                    value: `decay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    enumerable: false,
                    writable: false,
                    configurable: true
                });
            }
            return pet._runtimeDecayKey;
        }

        function getDecayRuntime(pet) {
            const key = getDecayRuntimeKey(pet);
            if (!key) return null;
            if (!_decayRuntimeState[key]) {
                _decayRuntimeState[key] = {
                    tick: 0,
                    penaltyCarry: { hunger: 0, cleanliness: 0, happiness: 0, energy: 0 },
                    lowNeedTicks: { hunger: 0, cleanliness: 0, happiness: 0, energy: 0 },
                    varianceIndex: 0
                };
            }
            return _decayRuntimeState[key];
        }

        function applyDeterministicNeedPenalty(pet, runtime, statKey, amount) {
            if (!pet || !runtime || !statKey || amount <= 0) return 0;
            if (!runtime.penaltyCarry || typeof runtime.penaltyCarry !== 'object') {
                runtime.penaltyCarry = { hunger: 0, cleanliness: 0, happiness: 0, energy: 0 };
            }
            runtime.penaltyCarry[statKey] = (runtime.penaltyCarry[statKey] || 0) + amount;
            const whole = Math.floor(runtime.penaltyCarry[statKey]);
            if (whole <= 0) return 0;
            runtime.penaltyCarry[statKey] -= whole;
            pet[statKey] = clamp((Number(pet[statKey]) || 0) - whole, 0, 100);
            return whole;
        }

        function applyStageVarianceDecay(pet, stage) {
            const runtime = getDecayRuntime(pet);
            if (!runtime) return;
            runtime.tick = (runtime.tick || 0) + 1;
            const decayTuning = getDecayTuning();
            const stageCfg = ((decayTuning.stageVariance || {})[stage]) || {};
            const cadence = Math.max(0, Number(stageCfg.extraEveryTicks) || 0);
            const amount = Math.max(0, Number(stageCfg.extraNeedDecay) || 0);
            if (!cadence || !amount) return;
            if (runtime.tick % cadence !== 0) return;
            runtime.varianceIndex = ((runtime.varianceIndex || 0) + 1) % DECAY_NEED_KEYS.length;
            const statKey = DECAY_NEED_KEYS[runtime.varianceIndex];
            applyDeterministicNeedPenalty(pet, runtime, statKey, amount);
        }

        function applyTimedNeglectPressure(pet, stage, stageBalance) {
            const runtime = getDecayRuntime(pet);
            if (!runtime) return;
            if (!runtime.lowNeedTicks || typeof runtime.lowNeedTicks !== 'object') {
                runtime.lowNeedTicks = { hunger: 0, cleanliness: 0, happiness: 0, energy: 0 };
            }

            const decayTuning = getDecayTuning();
            const stageCfg = ((decayTuning.neglectPressure || {})[stage]) || {};
            const threshold = Math.max(0, Number(stageBalance.neglectThreshold) || 20);
            const graceTicks = Math.max(1, Number(stageCfg.graceTicks) || 5);
            const pulseEveryTicks = Math.max(1, Number(stageCfg.pulseEveryTicks) || 4);
            const lowestNeedPenalty = Math.max(0, Number(stageCfg.lowestNeedPenalty) || 1);
            const happinessPenalty = Math.max(0, Number(stageCfg.happinessPenalty) || 0);
            const multiNeedPenalty = Math.max(0, Number(stageCfg.multiNeedPenalty) || 0);

            let lowNeedCount = 0;
            DECAY_NEED_KEYS.forEach((need) => {
                if ((Number(pet[need]) || 0) < threshold) {
                    runtime.lowNeedTicks[need] = (runtime.lowNeedTicks[need] || 0) + 1;
                    lowNeedCount++;
                } else {
                    runtime.lowNeedTicks[need] = Math.max(0, (runtime.lowNeedTicks[need] || 0) - 1);
                }
            });
            if (lowNeedCount === 0) return;

            const hasTimedOutNeed = DECAY_NEED_KEYS.some((need) => (runtime.lowNeedTicks[need] || 0) >= graceTicks);
            if (!hasTimedOutNeed) return;
            if ((runtime.tick || 0) % pulseEveryTicks !== 0) return;

            const lowestNeed = getLowestNeedStatKey(pet);
            const multiPenalty = Math.max(0, lowNeedCount - 1) * multiNeedPenalty;
            if (lowestNeed) {
                applyDeterministicNeedPenalty(pet, runtime, lowestNeed, lowestNeedPenalty + multiPenalty);
            }
            if (happinessPenalty > 0) {
                applyDeterministicNeedPenalty(pet, runtime, 'happiness', happinessPenalty + multiPenalty);
            }
        }

        function startDecayTimer() {
            if (decayInterval) clearInterval(decayInterval);
            lastDecayAnnouncement = 0;

            // Decrease needs every 30 seconds (gentle for young children)
            decayInterval = setInterval(() => {
                if (gameState.phase === 'pet' && gameState.pet && !document.hidden) {
                    ensureExplorationState();
                    updateExplorationUnlocks(true);
                    const expeditionResult = resolveExpeditionIfReady(false, false);
                    if (expeditionResult && expeditionResult.ok) {
                        if (typeof updateNeedDisplays === 'function') updateNeedDisplays();
                        if (typeof updateWellnessBar === 'function') updateWellnessBar();
                    }

                    const pet = gameState.pet;
                    const weather = gameState.weather || 'sunny';
                    const weatherData = WEATHER_TYPES[weather] || WEATHER_TYPES['sunny'];
                    const room = ROOMS[gameState.currentRoom || 'bedroom'];
                    const isOutdoor = room ? room.isOutdoor : false;

                    // Snapshot stats before decay to detect low-stat threshold crossing
                    const prevHunger = pet.hunger;
                    const prevClean = pet.cleanliness;
                    const prevHappy = pet.happiness;
                    const prevEnergy = pet.energy;

                    // Day/Night cycle energy modifiers
                    const timeOfDay = gameState.timeOfDay || 'day';
                    let energyDecayBonus = 0;
                    let energyRegenBonus = 0;
                    if (timeOfDay === 'day') {
                        energyDecayBonus = 1; // Pet is active during the day — energy decays faster
                    } else if (timeOfDay === 'night') {
                        energyRegenBonus = 2; // Pet rests at night — energy recovers
                    } else if (timeOfDay === 'sunset') {
                        energyRegenBonus = 1; // Pet starts winding down, slight recovery
                    } else if (timeOfDay === 'sunrise') {
                        energyRegenBonus = 1; // Energy recovers slightly in the morning
                    }

                    // Personality-driven decay multipliers
                    const pTrait = pet.personality && PERSONALITY_TRAITS[pet.personality];
                    const pMods = pTrait ? pTrait.statModifiers : null;
                    const hungerMult = pMods ? pMods.hungerDecayMultiplier : 1;
                    const cleanMult = pMods ? pMods.cleanlinessDecayMultiplier : 1;
                    const happyMult = pMods ? pMods.happinessDecayMultiplier : 1;
                    const energyMult = pMods ? pMods.energyDecayMultiplier : 1;
                    const stage = pet.growthStage && GROWTH_STAGES[pet.growthStage] ? pet.growthStage : 'baby';
                    const stageBalance = getStageBalance(stage);
                    const stageDecayMult = stageBalance.needDecayMultiplier || 1;

                    // Elder wisdom reduces decay
                    const elderReduction = pet.growthStage === 'elder' ? ELDER_CONFIG.wisdomDecayReduction : 1;

                    // Stage-aware base decay with probabilistic fractional handling.
                    pet.hunger = applyProbabilisticDelta(pet.hunger, 1 * hungerMult * elderReduction * stageDecayMult, 'down');
                    pet.cleanliness = applyProbabilisticDelta(pet.cleanliness, 1 * cleanMult * elderReduction * stageDecayMult, 'down');
                    pet.happiness = applyProbabilisticDelta(pet.happiness, 1 * happyMult * elderReduction * stageDecayMult, 'down');
                    const baseEnergyDelta = (1 + energyDecayBonus - energyRegenBonus);
                    if (baseEnergyDelta >= 0) {
                        pet.energy = applyProbabilisticDelta(pet.energy, baseEnergyDelta * energyMult * elderReduction * stageDecayMult, 'down');
                    } else {
                        const energyRecoveryMult = energyMult > 0 ? (1 / energyMult) : 1;
                        const recoveryStageMod = Math.max(0.7, 1 - ((stageDecayMult - 1) * 0.25));
                        pet.energy = applyProbabilisticDelta(pet.energy, Math.abs(baseEnergyDelta) * energyRecoveryMult * recoveryStageMod, 'up');
                    }

                    // Extra weather-based decay when outdoors
                    if (isOutdoor) {
                        pet.happiness = applyProbabilisticDelta(pet.happiness, weatherData.happinessDecayModifier * stageDecayMult, 'down');
                        pet.energy = applyProbabilisticDelta(pet.energy, weatherData.energyDecayModifier * stageDecayMult, 'down');
                        pet.cleanliness = applyProbabilisticDelta(pet.cleanliness, weatherData.cleanlinessDecayModifier * stageDecayMult, 'down');
                    }

                    // Deterministic stage ramp: timed variance pulses + neglect pressure pulses.
                    applyStageVarianceDecay(pet, stage);
                    applyTimedNeglectPressure(pet, stage, stageBalance);

                    // Announce when any stat drops below 20% (threshold crossing)
                    const lowThreshold = stageBalance.neglectThreshold || 20;
                    const petName = getPetDisplayName(pet);
                    const lowStats = [];
                    if (pet.hunger < lowThreshold && prevHunger >= lowThreshold) lowStats.push('hunger');
                    if (pet.cleanliness < lowThreshold && prevClean >= lowThreshold) lowStats.push('cleanliness');
                    if (pet.happiness < lowThreshold && prevHappy >= lowThreshold) lowStats.push('happiness');
                    if (pet.energy < lowThreshold && prevEnergy >= lowThreshold) lowStats.push('energy');
                    if (lowStats.length > 0) {
                        announce(`Warning: ${petName}'s ${lowStats.join(' and ')} ${lowStats.length === 1 ? 'is' : 'are'} critically low!`, true);
                        if (typeof showToast === 'function') {
                            const nowMs = Date.now();
                            const lastCueAt = Number(gameState._lastStagePressureCueAt) || 0;
                            if ((nowMs - lastCueAt) > 90000) {
                                gameState._lastStagePressureCueAt = nowMs;
                                const stageInfo = GROWTH_STAGES[stage] || GROWTH_STAGES.baby;
                                const focusPct = Math.round((Number(stageBalance.focusedCareBonus) || 0) * 100);
                                const thresholdText = Math.round(Number(stageBalance.neglectThreshold) || 20);
                                showToast(`${stageInfo.emoji} ${stageInfo.label} pressure: critical alerts start near ${thresholdText}. Focus bonus is stronger at this stage (+${focusPct}%).`, '#FFB74D');
                            }
                        }
                        // Play sad pet whimper when stats drop critically
                        if (typeof GameAudio !== 'undefined' && pet.type) {
                            GameAudio.playSFXByName('petSad', (ctx) => GameAudio.sfx.petSad(ctx, pet.type));
                        }
                        // Haptic alert for critical stat drop
                        hapticPattern('critical');
                        if (typeof screenShake === 'function') screenShake(3, 300);

                        // Show personality-specific low stat reaction
                        if (typeof getLowStatReaction === 'function') {
                            const reactionStat = lowStats[0];
                            const reaction = getLowStatReaction(pet, reactionStat);
                            if (reaction) {
                                setTimeout(() => showToast(reaction, '#FF7043'), 500);
                            }
                        }

                        // Mark pet as neglected for recovery arc
                        if (!pet._isNeglected && typeof beginNeglectRecoveryArc === 'function') {
                            beginNeglectRecoveryArc(pet, 'critical-need-drop');
                        } else {
                            pet._isNeglected = true;
                            pet._neglectRecoveryStep = 0;
                        }
                    }
                    // Threshold-based status announcements (critical -> recovered -> stable only)
                    const minNeed = Math.min(pet.hunger, pet.cleanliness, pet.happiness, pet.energy);
                    const priorMinNeed = Math.min(prevHunger, prevClean, prevHappy, prevEnergy);
                    const currentNeedStatus = minNeed <= lowThreshold ? 'critical' : (minNeed <= 40 ? 'low' : 'stable');
                    const priorNeedStatus = priorMinNeed <= lowThreshold ? 'critical' : (priorMinNeed <= 40 ? 'low' : 'stable');
                    if (currentNeedStatus !== priorNeedStatus && typeof announce === 'function') {
                        if (priorNeedStatus === 'critical' && currentNeedStatus !== 'critical') {
                            announce(`${petName} has recovered from critical needs.`, { source: 'status', dedupeMs: 3000 });
                        } else if (currentNeedStatus === 'stable' && priorNeedStatus !== 'stable') {
                            announce(`${petName} is stable now.`, { source: 'status', dedupeMs: 3000 });
                        }
                    }

                    let householdBackgroundTickApplied = false;
                    if (gameState.pets && gameState.pets.length > 1 && typeof MLFHouseholdState !== 'undefined' && MLFHouseholdState && typeof MLFHouseholdState.tickHouseholdOnState === 'function') {
                        try {
                            syncActivePetToArray();
                            const nowMs = Date.now();
                            const lastSimulatedAt = gameState.household && Number.isFinite(Number(gameState.household.lastSimulatedAt))
                                ? Number(gameState.household.lastSimulatedAt)
                                : (nowMs - 30000);
                            const dtMs = Math.max(0, nowMs - lastSimulatedAt);
                            if (dtMs >= 5000) {
                                MLFHouseholdState.tickHouseholdOnState(gameState, dtMs, nowMs, {
                                    skipActivePetNeeds: true
                                });
                                householdBackgroundTickApplied = true;
                            } else {
                                MLFHouseholdState.ensureHouseholdState(gameState, nowMs);
                            }
                        } catch (_) {}
                    }

                    // Apply passive decay to non-active pets (gentler rate)
                    if (!householdBackgroundTickApplied && gameState.pets && gameState.pets.length > 1) {
                        // Sync active pet to array first so its decayed stats are preserved
                        syncActivePetToArray();
                        gameState.pets.forEach((p, idx) => {
                            if (!p || idx === gameState.activePetIndex) return;
                            const pStage = p.growthStage && GROWTH_STAGES[p.growthStage] ? p.growthStage : 'baby';
                            const pStageBalance = getStageBalance(pStage);
                            const pDecayMult = pStageBalance.needDecayMultiplier || 1;
                            p.hunger = normalizePetNeedValue(p.hunger, 70);
                            p.cleanliness = normalizePetNeedValue(p.cleanliness, 70);
                            p.happiness = normalizePetNeedValue(p.happiness, 70);
                            p.energy = normalizePetNeedValue(p.energy, 70);
                            p.hunger = applyProbabilisticDelta(p.hunger, 0.5 * pDecayMult, 'down');
                            p.cleanliness = applyProbabilisticDelta(p.cleanliness, 0.5 * pDecayMult, 'down');
                            // Net happiness: -0.5 decay + companion bonus (dynamically calculated)
                            const companionBonus = (gameState.pets.length > 1) ? 0.3 : 0;
                            p.happiness = applyProbabilisticDelta(p.happiness, Math.max(0, (0.5 - companionBonus) * pDecayMult), 'down');
                            p.energy = applyProbabilisticDelta(p.energy, 0.5 * pDecayMult, 'down');
                            applyStageVarianceDecay(p, pStage);
                            applyTimedNeglectPressure(p, pStage, pStageBalance);

                            // Track neglect for non-active pets (reuse per-pet tick counter)
                            const pid = p.id;
                            if (pid != null) {
                                if (!_neglectTickCounters[pid]) _neglectTickCounters[pid] = 0;
                                _neglectTickCounters[pid]++;
                                if (_neglectTickCounters[pid] >= 10) {
                                    _neglectTickCounters[pid] = 0;
                                    const neglectThreshold = pStageBalance.neglectThreshold || 20;
                                    const neglected = p.hunger < neglectThreshold || p.cleanliness < neglectThreshold || p.happiness < neglectThreshold || p.energy < neglectThreshold;
                                    if (neglected) {
                                        p.neglectCount = adjustNeglectCount(p.neglectCount, pStageBalance.neglectGainMultiplier || 1, 'up');
                                    } else if ((p.neglectCount || 0) > 0) {
                                        p.neglectCount = adjustNeglectCount(p.neglectCount, pStageBalance.neglectRecoveryMultiplier || 1, 'down');
                                    }
                                }
                            }

                            // Keep care quality current for inactive pets as their stats drift.
                            updateCareHistory(p);
                        });
                    }

                    // Check for weather changes
                    checkWeatherChange();

                    // Check seasonal narrative events periodically
                    if (typeof checkSeasonalNarrativeEvent === 'function') {
                        checkSeasonalNarrativeEvent();
                    }

                    // Update time of day and refresh display if changed
                    const newTimeOfDay = getTimeOfDay();
                    if (gameState.timeOfDay !== newTimeOfDay) {
                        const previousTime = gameState.timeOfDay;
                        gameState.timeOfDay = newTimeOfDay;
                        updateDayNightDisplay();

                        // Announce time-of-day changes (Item 24)
                        if (_lastAnnouncedTimeOfDay && gameState.timeOfDay !== _lastAnnouncedTimeOfDay) {
                            const timeLabels = { day: 'Daytime', sunset: 'Evening', night: 'Nighttime', sunrise: 'Sunrise' };
                            announce(`Time changed to ${timeLabels[gameState.timeOfDay] || gameState.timeOfDay}.`);
                        }
                        _lastAnnouncedTimeOfDay = gameState.timeOfDay;

                        // Morning energy boost when transitioning to sunrise
                        if (newTimeOfDay === 'sunrise' && previousTime === 'night') {
                            pet.energy = clamp(pet.energy + 15, 0, 100);
                            const morningPetName = getPetDisplayName(pet);
                            announce(`Good morning! ${morningPetName} wakes up feeling refreshed!`);
                        }
                        // Nighttime sleepiness notification
                        if (newTimeOfDay === 'night') {
                            announce(`It's getting late! ${getPetDisplayName(pet)} is getting sleepy...`);
                        }
                        // Sunset wind-down notification
                        if (newTimeOfDay === 'sunset') {
                            announce(`The sun is setting. ${getPetDisplayName(pet)} is starting to wind down.`);
                        }
                    }

                    // Check for season changes
                    const newSeason = getCurrentSeason();
                    if (gameState.season !== newSeason) {
                        gameState.season = newSeason;
                        const activeRoom = gameState.currentRoom || 'bedroom';
                        if (typeof applyRoomArtifactTrigger === 'function') {
                            applyRoomArtifactTrigger(`season:${newSeason}`, { sourceRoom: activeRoom });
                        }
                        if (typeof setAmbientTone === 'function') {
                            setAmbientTone(newSeason === 'winter' ? 'steady' : (newSeason === 'autumn' ? 'softening' : 'bright'), `season:${newSeason}`, 16000);
                        }
                        const seasonData = SEASONS[newSeason];
                        showToast(`${seasonData.icon} ${seasonData.name} has arrived!`, '#FFB74D');
                        // Cancel any deferred render from a previous tick's care-quality change
                        if (pendingRenderTimer) {
                            clearTimeout(pendingRenderTimer);
                            pendingRenderTimer = null;
                        }
                        // Re-render to update seasonal decorations
                        renderPetPhase();
                        return; // renderPetPhase will handle the rest
                    }

                    // Tick breeding eggs once per minute, independent of the 30s decay loop
                    const ticksDue = consumeBreedingIncubationTicks(Date.now());
                    const hatchedEggs = [];
                    for (let t = 0; t < ticksDue; t++) {
                        const newlyHatched = tickBreedingEggs();
                        if (newlyHatched.length > 0) hatchedEggs.push(...newlyHatched);
                    }
                    if (hatchedEggs.length > 0) {
                        for (const egg of hatchedEggs) {
                            const typeData = getAllPetTypeData(egg.offspringType);
                            const typeName = typeData ? typeData.name : egg.offspringType;
                            let msg = `🥚 A breeding egg has hatched into a ${typeName}!`;
                            if (egg.hasMutation) msg += ' It has a rare mutation!';
                            if (egg.isHybrid) msg += ' It\'s a hybrid!';
                            showToast(msg, '#E040FB');
                            announce(msg, true);
                            hapticPattern('achievement');
                            // Store hatched egg for player to collect
                            if (!gameState.hatchedBreedingEggs) gameState.hatchedBreedingEggs = [];
                            gameState.hatchedBreedingEggs.push(egg);
                        }
                        // Update breeding egg display if visible
                        if (typeof updateBreedingEggDisplay === 'function') {
                            updateBreedingEggDisplay();
                        }
                    }

                    // Update care quality tracking
                    const careQualityChange = updateCareHistory(pet);

                    // Check for growth milestones
                    checkGrowthMilestone(pet);

                    // Show floating stat deltas for decay when integer values change
                    if (typeof showStatDeltaNearNeedBubbles === 'function') {
                        const decayDeltas = {};
                        const dH = Math.round(pet.hunger) - Math.round(prevHunger);
                        const dC = Math.round(pet.cleanliness) - Math.round(prevClean);
                        const dHa = Math.round(pet.happiness) - Math.round(prevHappy);
                        const dE = Math.round(pet.energy) - Math.round(prevEnergy);
                        if (dH) decayDeltas.hunger = dH;
                        if (dC) decayDeltas.cleanliness = dC;
                        if (dHa) decayDeltas.happiness = dHa;
                        if (dE) decayDeltas.energy = dE;
                        if (Object.keys(decayDeltas).length > 0) {
                            showStatDeltaNearNeedBubbles(decayDeltas);
                        }
                    }

                    updateNeedDisplays(true);
                    updatePetMood();
                    updateWellnessBar();
                    saveGame();

                    // Notify user of care quality changes (after updates to avoid issues)
                    if (careQualityChange && careQualityChange.changed) {
                        const toData = CARE_QUALITY[careQualityChange.to];
                        const petName = getPetDisplayName(pet);

                        if (careQualityChange.improved) {
                            // Combine quality + evolution into a single toast when applicable
                            if (careQualityChange.to === 'excellent' && pet.growthStage === 'adult') {
                                showToast(`${toData.emoji} Care quality: Excellent! Your pet can now evolve!`, '#FFD700');
                            } else {
                                showToast(`${toData.emoji} Care quality improved to ${toData.label}!`, '#66BB6A');
                            }
                        } else {
                            showToast(`${toData.emoji} Care quality changed to ${toData.label}`, '#FFB74D');
                        }

                        // Re-render to show appearance changes (debounced to avoid rapid re-renders).
                        // Track the timer so a synchronous renderPetPhase() (e.g. from a
                        // season change in a later tick) can cancel it to prevent a double render.
                        if (typeof renderPetPhase === 'function' && !careQualityChange.skipRender) {
                            if (pendingRenderTimer) clearTimeout(pendingRenderTimer);
                            pendingRenderTimer = setTimeout(() => {
                                pendingRenderTimer = null;
                                renderPetPhase();
                            }, 100);
                        }
                    }

                    // Gentle reminders at low levels (no negative messages)
                    // But don't spam - only announce every 2 minutes max
                    const now = Date.now();
                    if (now - lastDecayAnnouncement > 120000) {
                        const mood = getMood(pet);
                        if (mood === 'sad') {
                            const lowNeeds = [];
                            if (pet.hunger <= 20) lowNeeds.push('hungry');
                            if (pet.cleanliness <= 20) lowNeeds.push('needs a bath');
                            if (pet.energy <= 20) lowNeeds.push('tired');
                            if (pet.happiness <= 20) lowNeeds.push('wants to play');
                            if (lowNeeds.length > 0) {
                                announce(`Your pet is ${lowNeeds.join(' and ')}! Can you help?`);
                                lastDecayAnnouncement = now;
                            }
                        }
                    }
                } else if (document.hidden && gameState.phase === 'pet') {
                    // Keep incubation aligned to visible playtime only.
                    gameState.lastBreedingIncubationTick = Date.now();
                }
            }, 30000); // Every 30 seconds
        }

        function updateContextIndicator() {
            const el = document.getElementById('context-indicator');
            if (!el) return;
            const weather = WEATHER_TYPES[gameState.weather] ? gameState.weather : 'sunny';
            const weatherData = WEATHER_TYPES[weather];
            const timeOfDay = gameState.timeOfDay || getTimeOfDay();
            const timeLabel = timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1);
            const timeIcon = getTimeIcon(timeOfDay);
            const season = SEASONS[gameState.season] ? gameState.season : getCurrentSeason();
            const seasonData = SEASONS[season];
            const contextLabel = `${weatherData.name}, ${timeLabel}, ${seasonData.name}`;
            el.innerHTML = `<span aria-hidden="true">${weatherData.icon}</span><span aria-hidden="true">${timeIcon}</span><span aria-hidden="true">${seasonData.icon}</span><span class="status-text" aria-hidden="true">${contextLabel}</span>`;
            el.setAttribute('aria-label', contextLabel);
        }

        function updateDayNightDisplay() {
            const petArea = document.querySelector('.pet-area');
            if (!petArea) return;

            const timeOfDay = gameState.timeOfDay;
            const timeClass = timeOfDay === 'day' ? 'daytime' : timeOfDay === 'night' ? 'nighttime' : timeOfDay;
            const currentRoom = ROOMS[gameState.currentRoom] ? gameState.currentRoom : 'bedroom';
            if (currentRoom !== gameState.currentRoom) {
                gameState.currentRoom = currentRoom;
            }
            const room = ROOMS[currentRoom];
            const isOutdoor = room ? room.isOutdoor : false;

            // Update class
            petArea.classList.remove('daytime', 'nighttime', 'sunset', 'sunrise');
            petArea.classList.add(timeClass);

            // Update room background for new time of day
            petArea.style.background = getRoomBackground(currentRoom, timeOfDay);
            const roomCustom = getRoomCustomization(currentRoom);
            const wallpaper = ROOM_WALLPAPERS[roomCustom.wallpaper] || ROOM_WALLPAPERS.classic;
            const flooring = ROOM_FLOORINGS[roomCustom.flooring] || ROOM_FLOORINGS.natural;
            petArea.style.setProperty('--room-wallpaper-overlay', wallpaper.bg || 'none');
            petArea.style.setProperty('--room-floor-overlay', flooring.bg || 'none');
            const themeMode = getRoomThemeMode(currentRoom, gameState.pet);
            petArea.classList.remove('pet-theme-default', 'pet-theme-aquarium', 'pet-theme-nest');
            petArea.classList.add(`pet-theme-${themeMode}`);

            // Update context indicator (collapsed weather + time + season)
            updateContextIndicator();

            // Update room decor for time of day
            const decor = petArea.querySelector('.room-decor');
            if (decor) {
                decor.innerHTML = getRoomDecor(currentRoom, timeOfDay);
            }

            // Update celestial elements - remove all existing ones first
            const existingStars = petArea.querySelector('.stars-overlay');
            const existingMoon = petArea.querySelector('.moon');
            const existingSun = petArea.querySelector('.sun');
            petArea.querySelectorAll('.cloud').forEach(c => c.remove());

            if (existingStars) existingStars.remove();
            if (existingMoon) existingMoon.remove();
            if (existingSun) existingSun.remove();

            // Only add celestial elements for outdoor rooms
            if (isOutdoor) {
                if (timeOfDay === 'night') {
                    const starsOverlay = document.createElement('div');
                    starsOverlay.className = 'stars-overlay';
                    starsOverlay.innerHTML = generateStarsHTML();
                    petArea.insertBefore(starsOverlay, petArea.firstChild);

                    const moon = document.createElement('div');
                    moon.className = 'moon';
                    petArea.insertBefore(moon, petArea.children[1]);
                } else if (timeOfDay === 'day') {
                    const sun = document.createElement('div');
                    sun.className = 'sun';
                    petArea.insertBefore(sun, petArea.firstChild);

                    const cloud1 = document.createElement('div');
                    cloud1.className = 'cloud';
                    cloud1.style.cssText = 'top:12px;left:-30px;';
                    cloud1.textContent = '☁️';
                    petArea.appendChild(cloud1);

                    const cloud2 = document.createElement('div');
                    cloud2.className = 'cloud';
                    cloud2.style.cssText = 'top:35px;left:20%;';
                    cloud2.textContent = '☁️';
                    petArea.appendChild(cloud2);
                } else if (timeOfDay === 'sunrise' || timeOfDay === 'sunset') {
                    const cloud = document.createElement('div');
                    cloud.className = 'cloud';
                    cloud.style.cssText = 'top:18px;left:10%;';
                    cloud.textContent = '☁️';
                    petArea.appendChild(cloud);
                }
            }

            // Update weather visuals
            updateWeatherDisplay();
        }

        function updateWeatherDisplay() {
            const petArea = document.querySelector('.pet-area');
            if (!petArea) return;

            const weather = WEATHER_TYPES[gameState.weather] ? gameState.weather : 'sunny';
            if (weather !== gameState.weather) {
                gameState.weather = weather;
            }
            const weatherData = WEATHER_TYPES[weather];
            const currentRoom = ROOMS[gameState.currentRoom] ? gameState.currentRoom : 'bedroom';
            if (currentRoom !== gameState.currentRoom) {
                gameState.currentRoom = currentRoom;
            }
            const room = ROOMS[currentRoom];
            const isOutdoor = room ? room.isOutdoor : false;

            // Remove all old weather overlays (querySelectorAll to catch duplicates)
            petArea.querySelectorAll('.weather-overlay').forEach(el => el.remove());

            // Remove old weather classes
            petArea.classList.remove('weather-rainy', 'weather-snowy');

            // Add new weather effects for outdoor rooms
            if (isOutdoor && weather !== 'sunny') {
                petArea.classList.add(`weather-${weather}`);
                const weatherEl = document.createElement('div');
                weatherEl.innerHTML = generateWeatherHTML(weather);
                const overlay = weatherEl.firstChild;
                if (overlay) petArea.appendChild(overlay);
            }

            // Update context indicator (collapsed weather + time + season)
            updateContextIndicator();
        }

        function stopDecayTimer() {
            if (decayInterval) {
                clearInterval(decayInterval);
                decayInterval = null;
            }
            if (pendingRenderTimer) {
                clearTimeout(pendingRenderTimer);
                pendingRenderTimer = null;
            }
        }

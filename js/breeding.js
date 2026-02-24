// ============================================================
// breeding.js  –  Breeding & genetics system
// Extracted from game.js (lines 4654-5144)
// ============================================================

        // ==================== BREEDING & GENETICS SYSTEM ====================

        function canBreed(pet) {
            if (!pet) return { eligible: false, reason: 'No pet selected' };
            const stageOrder = GROWTH_ORDER;
            const petStageIdx = stageOrder.indexOf(pet.growthStage);
            const minStageIdx = stageOrder.indexOf(BREEDING_CONFIG.minAge);
            if (petStageIdx < minStageIdx) return { eligible: false, reason: 'Pet must be adult or elder' };
            const now = Date.now();
            if (pet.lastBreedTime && (now - pet.lastBreedTime) < BREEDING_CONFIG.cooldownMs) {
                const remaining = Math.ceil((BREEDING_CONFIG.cooldownMs - (now - pet.lastBreedTime)) / 60000);
                return { eligible: false, reason: `Cooldown: ${remaining}m remaining` };
            }
            return { eligible: true };
        }

        function ensureBreedingEggData(egg) {
            if (!egg || typeof egg !== 'object') return false;
            if (typeof egg.incubationTicks !== 'number' || !Number.isFinite(egg.incubationTicks) || egg.incubationTicks < 0) {
                egg.incubationTicks = 0;
            }
            if (typeof egg.incubationTarget !== 'number' || !Number.isFinite(egg.incubationTarget) || egg.incubationTarget <= 0) {
                egg.incubationTarget = BREEDING_CONFIG.incubationBaseTicks;
            }
            if (!egg.roomBonuses || typeof egg.roomBonuses !== 'object' || Array.isArray(egg.roomBonuses)) {
                egg.roomBonuses = {};
            }
            if (typeof egg.careBonuses !== 'number' || !Number.isFinite(egg.careBonuses)) {
                egg.careBonuses = 0;
            }
            if (!egg.genetics || typeof egg.genetics !== 'object' || Array.isArray(egg.genetics)) {
                egg.genetics = {};
            }
            return true;
        }

        function canBreedPair(pet1, pet2) {
            if (!pet1 || !pet2) {
                return { eligible: false, reason: 'Both pets must be selected' };
            }
            const check1 = canBreed(pet1);
            const pet1Name = pet1.name || (getAllPetTypeData(pet1.type) || {}).name || 'Pet 1';
            const pet2Name = pet2.name || (getAllPetTypeData(pet2.type) || {}).name || 'Pet 2';
            if (!check1.eligible) return { eligible: false, reason: `${pet1Name}: ${check1.reason}` };
            const check2 = canBreed(pet2);
            if (!check2.eligible) return { eligible: false, reason: `${pet2Name}: ${check2.reason}` };
            if (pet1.id === pet2.id) return { eligible: false, reason: 'Cannot breed a pet with itself' };
            // Check relationship level
            const rel = getRelationship(pet1.id, pet2.id);
            const level = getRelationshipLevel(rel.points);
            const levelIdx = RELATIONSHIP_ORDER.indexOf(level);
            const minIdx = RELATIONSHIP_ORDER.indexOf(BREEDING_CONFIG.minRelationship);
            if (levelIdx < minIdx) {
                return { eligible: false, reason: `Pets need to be at least ${RELATIONSHIP_LEVELS[BREEDING_CONFIG.minRelationship].label} level` };
            }
            // Check max breeding eggs
            const eggs = gameState.breedingEggs || [];
            if (eggs.length >= BREEDING_CONFIG.maxBreedingEggs) {
                return { eligible: false, reason: `Maximum ${BREEDING_CONFIG.maxBreedingEggs} breeding eggs at once` };
            }
            return { eligible: true };
        }

        // Generate hidden genetic stats for a pet (used on first-gen pets)
        function generateBaseGenetics() {
            const genetics = {};
            for (const [stat, data] of Object.entries(GENETIC_STATS)) {
                genetics[stat] = data.default + Math.floor(Math.random() * 7) - 3; // 7-13 range
                genetics[stat] = clamp(genetics[stat], data.min, data.max);
            }
            return genetics;
        }

        // Ensure a pet has genetics (for legacy pets without them)
        function ensureGenetics(pet) {
            if (!pet.genetics) {
                pet.genetics = generateBaseGenetics();
            }
            return pet.genetics;
        }

        // Inherit genetics from two parents with noise
        function inheritGenetics(parent1, parent2) {
            const g1 = ensureGenetics(parent1);
            const g2 = ensureGenetics(parent2);
            const childGenetics = {};
            for (const [stat, data] of Object.entries(GENETIC_STATS)) {
                // Pick from parent1 or parent2 with slight bias toward higher stat
                const avg = (g1[stat] + g2[stat]) / 2;
                const noise = Math.floor(Math.random() * (BREEDING_CONFIG.statInheritanceNoise * 2 + 1)) - BREEDING_CONFIG.statInheritanceNoise;
                childGenetics[stat] = clamp(Math.round(avg + noise), data.min, data.max);
            }
            return childGenetics;
        }

        // Normalize shorthand hex (#F00) to full form (#FF0000)
        function normalizeHex(hex) {
            if (typeof hex !== 'string') return '#D4A574'; // fallback color
            if (hex.length === 4) {
                return '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
            }
            return hex;
        }

        // Blend two hex colors
        function blendColors(hex1, hex2, ratio) {
            hex1 = normalizeHex(hex1);
            hex2 = normalizeHex(hex2);
            const r1 = parseInt(hex1.slice(1, 3), 16);
            const g1 = parseInt(hex1.slice(3, 5), 16);
            const b1 = parseInt(hex1.slice(5, 7), 16);
            const r2 = parseInt(hex2.slice(1, 3), 16);
            const g2 = parseInt(hex2.slice(3, 5), 16);
            const b2 = parseInt(hex2.slice(5, 7), 16);
            const r = Math.round(r1 * ratio + r2 * (1 - ratio));
            const g = Math.round(g1 * ratio + g2 * (1 - ratio));
            const b = Math.round(b1 * ratio + b2 * (1 - ratio));
            return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
        }

        // Determine offspring color from parents
        function inheritColor(parent1, parent2, isMutation) {
            if (isMutation) {
                const mutationKeys = Object.keys(MUTATION_COLORS);
                const mutColor = MUTATION_COLORS[mutationKeys[Math.floor(Math.random() * mutationKeys.length)]];
                return { color: mutColor.hex, mutationColor: mutColor.name, isMutated: true };
            }
            if (Math.random() < BREEDING_CONFIG.colorBlendChance) {
                // Blend the two parent colors
                const ratio = 0.3 + Math.random() * 0.4; // 30%-70% blend
                return { color: blendColors(parent1.color, parent2.color, ratio), isMutated: false };
            }
            // Pick one parent's color
            return { color: Math.random() < 0.5 ? parent1.color : parent2.color, isMutated: false };
        }

        // Determine offspring pattern
        function inheritPattern(parent1, parent2, isMutation) {
            if (isMutation) {
                const mutPatternKeys = Object.keys(MUTATION_PATTERNS);
                const mutPattern = mutPatternKeys[Math.floor(Math.random() * mutPatternKeys.length)];
                return { pattern: mutPattern, mutationPattern: MUTATION_PATTERNS[mutPattern].name, isMutated: true };
            }
            // Inherit from one parent
            if (Math.random() < BREEDING_CONFIG.patternInheritChance) {
                return { pattern: parent1.pattern || 'solid', isMutated: false };
            }
            return { pattern: parent2.pattern || 'solid', isMutated: false };
        }

        // Determine offspring type (same species, or hybrid)
        function determineOffspringType(parent1, parent2) {
            if (parent1.type === parent2.type) {
                return { type: parent1.type, isHybrid: false };
            }
            // Check if a hybrid exists for this combination
            const hybridId = getHybridForParents(parent1.type, parent2.type);
            if (hybridId && Math.random() < BREEDING_CONFIG.hybridChance) {
                return { type: hybridId, isHybrid: true };
            }
            // No hybrid — offspring is randomly one of the parent types
            return { type: Math.random() < 0.5 ? parent1.type : parent2.type, isHybrid: false };
        }

        // Core breeding function — creates a breeding egg
        function breedPets(pet1Index, pet2Index) {
            const pet1 = gameState.pets[pet1Index];
            const pet2 = gameState.pets[pet2Index];
            if (!pet1 || !pet2) return null;

            const check = canBreedPair(pet1, pet2);
            if (!check.eligible) return { success: false, reason: check.reason };

            // Check for mutation
            const hasMutation = Math.random() < BREEDING_CONFIG.mutationChance;

            // Determine offspring type
            const typeResult = determineOffspringType(pet1, pet2);

            // Inherit color
            const colorResult = inheritColor(pet1, pet2, hasMutation && Math.random() < 0.5);

            // Inherit pattern
            const patternResult = inheritPattern(pet1, pet2, hasMutation && !colorResult.isMutated);

            // Inherit genetics
            const childGenetics = inheritGenetics(pet1, pet2);

            // If mutation, boost a random genetic stat
            let geneticMutationApplied = false;
            let mutationStat = null;
            if (hasMutation) {
                const statKeys = Object.keys(GENETIC_STATS);
                const boostStat = statKeys[Math.floor(Math.random() * statKeys.length)];
                const beforeBoost = childGenetics[boostStat];
                const boosted = clamp(beforeBoost + 3, GENETIC_STATS[boostStat].min, GENETIC_STATS[boostStat].max);
                childGenetics[boostStat] = boosted;
                if (boosted !== beforeBoost) {
                    geneticMutationApplied = true;
                    mutationStat = boostStat;
                }
            }

            // Determine if any mutation actually applied (color or pattern or genetic boost)
            const actuallyMutated = hasMutation && (colorResult.isMutated || patternResult.isMutated || geneticMutationApplied);

            // Create the breeding egg
            const breedingEgg = {
                id: Date.now() + '_' + Math.random().toString(36).slice(2, 9),
                parent1Id: pet1.id,
                parent2Id: pet2.id,
                parent1Type: pet1.type,
                parent2Type: pet2.type,
                parent1Name: pet1.name || (getAllPetTypeData(pet1.type) || {}).name || 'Unknown',
                parent2Name: pet2.name || (getAllPetTypeData(pet2.type) || {}).name || 'Unknown',
                offspringType: typeResult.type,
                isHybrid: typeResult.isHybrid,
                color: colorResult.color,
                mutationColor: colorResult.mutationColor || null,
                pattern: patternResult.pattern,
                mutationPattern: patternResult.mutationPattern || null,
                mutationStat: mutationStat,
                hasMutation: actuallyMutated,
                genetics: childGenetics,
                incubationTicks: 0,
                incubationTarget: BREEDING_CONFIG.incubationBaseTicks,
                roomBonuses: {},  // Track accumulated room bonuses
                careBonuses: 0,   // Extra ticks from care actions
                createdAt: Date.now(),
                currentRoom: gameState.currentRoom || 'bedroom'
            };

            // Set cooldowns on parents
            pet1.lastBreedTime = Date.now();
            pet2.lastBreedTime = Date.now();

            // Add to breeding eggs
            if (!gameState.breedingEggs) gameState.breedingEggs = [];
            if (gameState.breedingEggs.length === 0) {
                gameState.lastBreedingIncubationTick = Date.now();
            }
            gameState.breedingEggs.push(breedingEgg);

            // Track breeding stats
            gameState.totalBreedings = (gameState.totalBreedings || 0) + 1;
            const p1Name = pet1.name || 'Pet';
            const p2Name = pet2.name || 'Pet';
            addJournalEntry('🥚', `${p1Name} and ${p2Name} are expecting! A breeding egg has appeared!`);
            if (actuallyMutated) gameState.totalMutations = (gameState.totalMutations || 0) + 1;
            if (typeResult.isHybrid) {
                gameState.totalHybridsCreated = (gameState.totalHybridsCreated || 0) + 1;
                if (!gameState.hybridsDiscovered) gameState.hybridsDiscovered = {};
                gameState.hybridsDiscovered[typeResult.type] = true;
            }

            // Add relationship points for breeding
            addRelationshipPoints(pet1.id, pet2.id, 15);

            // Sync active pet to array first (preserves any stat changes), then re-read
            syncActivePetToArray();
            gameState.pet = gameState.pets[gameState.activePetIndex];
            saveGame();

            return {
                success: true,
                egg: breedingEgg,
                hasMutation: actuallyMutated,
                isHybrid: typeResult.isHybrid,
                offspringType: typeResult.type
            };
        }

        // Advance incubation for all breeding eggs (called from decay timer)
        function tickBreedingEggs() {
            if (!gameState.breedingEggs || gameState.breedingEggs.length === 0) return [];

            const hatched = [];
            const currentRoom = gameState.currentRoom || 'bedroom';
            const roomBonus = INCUBATION_ROOM_BONUSES[currentRoom] || { speedMultiplier: 1.0 };

            for (let i = gameState.breedingEggs.length - 1; i >= 0; i--) {
                const egg = gameState.breedingEggs[i];
                if (!ensureBreedingEggData(egg)) continue;
                // Apply room speed multiplier
                egg.incubationTicks += roomBonus.speedMultiplier;
                egg.currentRoom = currentRoom;

                // Track room bonus for genetics
                if (roomBonus.bonusStat) {
                    if (!egg.roomBonuses[roomBonus.bonusStat]) egg.roomBonuses[roomBonus.bonusStat] = 0;
                    egg.roomBonuses[roomBonus.bonusStat] += 0.1;
                }

                const progressRatio = Math.max(0, Math.min(1, (egg.incubationTicks || 0) / Math.max(1, egg.incubationTarget || 1)));
                if (!egg._nearHatchAlerted && progressRatio >= 0.85 && progressRatio < 1) {
                    egg._nearHatchAlerted = true;
                    const remainingTicks = Math.max(1, Math.ceil((egg.incubationTarget - egg.incubationTicks)));
                    const nearMsg = `🐣 Egg close to hatch! About ${remainingTicks}m left.`;
                    if (typeof showToast === 'function') showToast(nearMsg, '#CE93D8');
                    if (typeof announce === 'function') announce('A breeding egg is close to hatching.', true);
                }

                // Check if hatched
                if (egg.incubationTicks >= egg.incubationTarget) {
                    hatched.push(egg);
                    gameState.breedingEggs.splice(i, 1);
                    announce('Hatch ready: a breeding egg is ready to collect.', true);
                }
            }

            return hatched;
        }

        function consumeBreedingIncubationTicks(nowMs) {
            const now = typeof nowMs === 'number' ? nowMs : Date.now();
            const intervalMs = 60 * 1000; // 1 tick per minute

            if (!gameState.breedingEggs || gameState.breedingEggs.length === 0) {
                gameState.lastBreedingIncubationTick = now;
                return 0;
            }
            if (typeof gameState.lastBreedingIncubationTick !== 'number') {
                gameState.lastBreedingIncubationTick = now;
                return 0;
            }

            const elapsed = Math.max(0, now - gameState.lastBreedingIncubationTick);
            const ticksDue = Math.floor(elapsed / intervalMs);
            if (ticksDue > 0) {
                gameState.lastBreedingIncubationTick += ticksDue * intervalMs;
            }
            return ticksDue;
        }

        // Apply care action bonus to breeding eggs
        function applyBreedingEggCareBonus(action) {
            if (!gameState.breedingEggs || gameState.breedingEggs.length === 0) return;
            const bonus = INCUBATION_CARE_BONUSES[action];
            if (!bonus) return;
            for (const egg of gameState.breedingEggs) {
                if (!ensureBreedingEggData(egg)) continue;
                egg.incubationTicks += bonus.tickBonus;
                egg.careBonuses += bonus.tickBonus;
            }
        }

        // Hatch a breeding egg into an actual pet
        function hatchBreedingEgg(egg) {
            if (!ensureBreedingEggData(egg)) return null;
            const typeData = getAllPetTypeData(egg.offspringType);
            if (!typeData) return null;

            // Generate unique ID
            if (typeof gameState.nextPetId !== 'number' || isNaN(gameState.nextPetId)) {
                let maxId = 0;
                if (gameState.pets) gameState.pets.forEach(p => { if (p && typeof p.id === 'number' && p.id > maxId) maxId = p.id; });
                gameState.nextPetId = maxId + 1;
            }
            const petId = gameState.nextPetId;
            gameState.nextPetId = petId + 1;

            // Apply room bonuses to genetics
            const genetics = { ...egg.genetics };
            for (const [stat, bonus] of Object.entries(egg.roomBonuses)) {
                if (genetics[stat] !== undefined && GENETIC_STATS[stat]) {
                    genetics[stat] = clamp(Math.round(genetics[stat] + bonus), GENETIC_STATS[stat].min, GENETIC_STATS[stat].max);
                }
            }

            const newPet = {
                id: petId,
                type: egg.offspringType,
                name: typeData.name,
                color: egg.color,
                pattern: egg.pattern,
                accessories: [],
                hunger: 70,
                cleanliness: 70,
                happiness: 80,
                energy: 70,
                careActions: 0,
                growthStage: 'baby',
                birthdate: Date.now(),
                careHistory: [],
                neglectCount: 0,
                careQuality: 'average',
                careVariant: 'normal',
                evolutionStage: 'base',
                lastGrowthStage: 'baby',
                unlockedAccessories: [],
                // Breeding-specific data
                genetics: genetics,
                parentIds: [egg.parent1Id, egg.parent2Id],
                parentTypes: [egg.parent1Type, egg.parent2Type],
                parentNames: [egg.parent1Name, egg.parent2Name],
                isHybrid: egg.isHybrid,
                hasMutation: egg.hasMutation,
                mutationColor: egg.mutationColor || null,
                mutationPattern: egg.mutationPattern || null,
                generation: 1 // Track generation depth
            };

            newPet.personality = getRandomPersonality();
            newPet.personalityWarmth = {};
            if (!gameState.personalitiesSeen) gameState.personalitiesSeen = {};
            gameState.personalitiesSeen[newPet.personality] = true;

            // Calculate generation from parents
            const parent1 = gameState.pets.find(p => p && p.id === egg.parent1Id);
            const parent2 = gameState.pets.find(p => p && p.id === egg.parent2Id);
            if (parent1 && parent2) {
                newPet.generation = Math.max(parent1.generation || 0, parent2.generation || 0) + 1;
            }

            return newPet;
        }

        // Get incubation progress as a percentage
        function getIncubationProgress(egg) {
            if (!ensureBreedingEggData(egg)) return 0;
            return Math.min(100, (egg.incubationTicks / egg.incubationTarget) * 100);
        }

        // Get all adult pets eligible for breeding
        function getBreedablePets() {
            if (!gameState.pets) return [];
            const result = [];
            gameState.pets.forEach((p, idx) => {
                if (p && canBreed(p).eligible) {
                    result.push({ pet: p, index: idx });
                }
            });
            return result;
        }

        function getMood(pet) {
            const average = ((pet.hunger || 0) + (pet.cleanliness || 0) + (pet.happiness || 0) + (pet.energy || 0)) / 4;
            // Weather affects mood thresholds when pet is outdoors
            const weather = gameState.weather || 'sunny';
            const weatherData = WEATHER_TYPES[weather];
            const room = ROOMS[gameState.currentRoom || 'bedroom'];
            const isOutdoor = room ? room.isOutdoor : false;
            const weatherBonus = isOutdoor ? weatherData.moodBonus : 0;
            const season = gameState.season || getCurrentSeason();
            const seasonBonus = SEASONS[season] ? SEASONS[season].moodBonus : 0;
            const adjusted = average + weatherBonus + seasonBonus;

            // Day/Night cycle mood overrides
            const timeOfDay = gameState.timeOfDay || 'day';
            const isNightTime = (timeOfDay === 'night' || timeOfDay === 'sunset');
            const isMorning = (timeOfDay === 'sunrise');

            // Personality-driven mood biases
            const personality = pet.personality;
            if (personality === 'lazy') {
                // Lazy pets get sleepy easier
                if (pet.energy < 60) return 'sleepy';
            } else if (personality === 'energetic') {
                // Energetic pets are almost always energetic unless stats are low
                if (adjusted >= 40 && pet.energy >= 40) return 'energetic';
            } else if (personality === 'grumpy') {
                // Grumpy pets need higher stats to be happy
                if (adjusted < 70 && adjusted >= 30) return 'neutral';
            }

            // Sleepy at night when energy is low-ish
            if (isNightTime && pet.energy < 50) return 'sleepy';

            // Energetic in the morning when energy is decent
            if (isMorning && pet.energy >= 50) return 'energetic';

            if (adjusted >= 60) return 'happy';
            if (adjusted >= 30) return 'neutral';
            return 'sad';
        }

        // Get mood face emoji for the mood indicator
        function getMoodFaceEmoji(mood, pet) {
            const avg = pet ? (pet.hunger + pet.cleanliness + pet.happiness + pet.energy) / 4 : 50;
            if (mood === 'sleepy') return '😴';
            if (mood === 'energetic') return '🤩';
            if (avg >= 80) return '😁';
            if (mood === 'happy') return '😊';
            if (mood === 'neutral') return '😐';
            if (avg < 20) return '😰';
            return '😢';
        }

        // Get time of day based on real time
        // Sunrise: 5:00 AM - 5:59 AM | Day: 6:00 AM - 6:00 PM | Sunset: 6:00 PM - 8:00 PM | Night: 8:00 PM - 4:59 AM
        function getTimeOfDay() {
            const now = new Date();
            const hour = now.getHours();
            // Sunrise window at dawn (full hour so players can experience it)
            if (hour === 5) return 'sunrise';
            if (hour >= 6 && hour < 18) return 'day';
            if (hour >= 18 && hour < 20) return 'sunset';
            return 'night';
        }

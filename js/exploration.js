// ============================================================
// exploration.js  –  Exploration system
// Extracted from game.js (lines 620-1279)
// ============================================================

        // ==================== EXPLORATION SYSTEM ====================

        const EXPLORATION_DEFAULT_UNLOCKS = {
            forest: true,
            beach: false,
            mountain: false,
            cave: false,
            skyIsland: false,
            underwater: false,
            skyZone: false
        };

	        function createDefaultExplorationState() {
	            return {
	                biomeUnlocks: Object.assign({}, EXPLORATION_DEFAULT_UNLOCKS),
	                discoveredBiomes: { forest: true },
	                lootInventory: {},
	                lootInventoryStacks: {},
	                expedition: null,
	                expeditionHistory: [],
	                roomTreasureCooldowns: {},
	                treasureHunt: {
	                    globalCooldownEndsAt: 0,
	                    lastRunAt: 0,
	                    lastRoomId: null,
	                    recentRuns: [],
	                    roomSwitchCount: 0,
	                    repeatCount: 0
	                },
	                npcEncounters: [],
                dungeon: {
                    active: false,
                    seed: 0,
                    rooms: [],
                    currentIndex: 0,
                    log: [],
                    rewards: [],
                    startedAt: 0
                },
                stats: {
                    expeditionsCompleted: 0,
                    treasuresFound: 0,
                    dungeonsCleared: 0,
                    npcsBefriended: 0,
                    npcsAdopted: 0
                }
            };
        }

        function ensureExplorationState(stateObj) {
            const state = stateObj || gameState;
            if (!state.exploration || typeof state.exploration !== 'object') {
                state.exploration = createDefaultExplorationState();
            }
            const ex = state.exploration;
            if (!ex.biomeUnlocks || typeof ex.biomeUnlocks !== 'object') ex.biomeUnlocks = {};
            Object.keys(EXPLORATION_DEFAULT_UNLOCKS).forEach((id) => {
                if (typeof ex.biomeUnlocks[id] !== 'boolean') ex.biomeUnlocks[id] = EXPLORATION_DEFAULT_UNLOCKS[id];
            });
	            if (!ex.discoveredBiomes || typeof ex.discoveredBiomes !== 'object') ex.discoveredBiomes = { forest: true };
	            if (typeof ex.discoveredBiomes.forest !== 'boolean') ex.discoveredBiomes.forest = true;
	            if (!ex.lootInventory || typeof ex.lootInventory !== 'object') ex.lootInventory = {};
	            if (!ex.lootInventoryStacks || typeof ex.lootInventoryStacks !== 'object' || Array.isArray(ex.lootInventoryStacks)) ex.lootInventoryStacks = {};
	            if (!Array.isArray(ex.expeditionHistory)) ex.expeditionHistory = [];
	            if (!ex.roomTreasureCooldowns || typeof ex.roomTreasureCooldowns !== 'object') ex.roomTreasureCooldowns = {};
	            if (!ex.treasureHunt || typeof ex.treasureHunt !== 'object') {
	                ex.treasureHunt = { globalCooldownEndsAt: 0, lastRunAt: 0, lastRoomId: null, recentRuns: [], roomSwitchCount: 0, repeatCount: 0 };
	            }
	            if (typeof ex.treasureHunt.globalCooldownEndsAt !== 'number') ex.treasureHunt.globalCooldownEndsAt = 0;
	            if (typeof ex.treasureHunt.lastRunAt !== 'number') ex.treasureHunt.lastRunAt = 0;
	            if (typeof ex.treasureHunt.lastRoomId !== 'string' && ex.treasureHunt.lastRoomId !== null) ex.treasureHunt.lastRoomId = null;
	            if (!Array.isArray(ex.treasureHunt.recentRuns)) ex.treasureHunt.recentRuns = [];
	            if (typeof ex.treasureHunt.roomSwitchCount !== 'number') ex.treasureHunt.roomSwitchCount = 0;
	            if (typeof ex.treasureHunt.repeatCount !== 'number') ex.treasureHunt.repeatCount = 0;
	            if (!Array.isArray(ex.npcEncounters)) ex.npcEncounters = [];
            if (!ex.dungeon || typeof ex.dungeon !== 'object') {
                ex.dungeon = { active: false, seed: 0, rooms: [], currentIndex: 0, log: [], rewards: [], startedAt: 0 };
            }
            if (!Array.isArray(ex.dungeon.rooms)) ex.dungeon.rooms = [];
            if (!Array.isArray(ex.dungeon.log)) ex.dungeon.log = [];
            if (!Array.isArray(ex.dungeon.rewards)) ex.dungeon.rewards = [];
            if (typeof ex.dungeon.currentIndex !== 'number') ex.dungeon.currentIndex = 0;
            if (typeof ex.dungeon.active !== 'boolean') ex.dungeon.active = false;
            if (typeof ex.dungeon.seed !== 'number') ex.dungeon.seed = 0;
            if (typeof ex.dungeon.startedAt !== 'number') ex.dungeon.startedAt = 0;

            if (!ex.stats || typeof ex.stats !== 'object') {
                ex.stats = { expeditionsCompleted: 0, treasuresFound: 0, dungeonsCleared: 0, npcsBefriended: 0, npcsAdopted: 0 };
            }
            ['expeditionsCompleted', 'treasuresFound', 'dungeonsCleared', 'npcsBefriended', 'npcsAdopted'].forEach((k) => {
                if (typeof ex.stats[k] !== 'number') ex.stats[k] = 0;
            });

	            if (ex.expedition && typeof ex.expedition === 'object') {
                if (typeof ex.expedition.startedAt !== 'number') ex.expedition.startedAt = Date.now();
                if (typeof ex.expedition.endAt !== 'number') ex.expedition.endAt = ex.expedition.startedAt;
                if (typeof ex.expedition.lootMultiplier !== 'number') ex.expedition.lootMultiplier = 1;
                if (!ex.expedition.durationId) ex.expedition.durationId = 'scout';
	            }

	            ensureLootInventoryStacks(ex);

	            return ex;
	        }

	        function normalizeLootStackMeta(meta) {
	            const input = (meta && typeof meta === 'object') ? meta : {};
	            return {
	                source: typeof input.source === 'string' ? input.source : 'generic',
	                createdAt: Number.isFinite(input.createdAt) ? Math.floor(input.createdAt) : Date.now(),
	                biomeId: typeof input.biomeId === 'string' ? input.biomeId : null
	            };
	        }

	        function ensureLootInventoryStacks(explorationState) {
	            const ex = explorationState || ensureExplorationState();
	            if (!ex || typeof ex !== 'object') return;
	            if (!ex.lootInventory || typeof ex.lootInventory !== 'object') ex.lootInventory = {};
	            if (!ex.lootInventoryStacks || typeof ex.lootInventoryStacks !== 'object' || Array.isArray(ex.lootInventoryStacks)) ex.lootInventoryStacks = {};

	            Object.keys(ex.lootInventory).forEach((lootId) => {
	                const totalQty = Math.max(0, Math.floor(Number(ex.lootInventory[lootId]) || 0));
	                if (totalQty <= 0) {
	                    delete ex.lootInventory[lootId];
	                    delete ex.lootInventoryStacks[lootId];
	                    return;
	                }
	                const rawStacks = Array.isArray(ex.lootInventoryStacks[lootId]) ? ex.lootInventoryStacks[lootId] : [];
	                const cleanStacks = [];
	                let runningQty = 0;
	                rawStacks.forEach((stack) => {
	                    if (!stack || typeof stack !== 'object') return;
	                    const qty = Math.max(0, Math.floor(Number(stack.qty) || 0));
	                    if (qty <= 0) return;
	                    const nextQty = Math.min(qty, Math.max(0, totalQty - runningQty));
	                    if (nextQty <= 0) return;
	                    cleanStacks.push({ qty: nextQty, meta: normalizeLootStackMeta(stack.meta) });
	                    runningQty += nextQty;
	                });
	                if (runningQty < totalQty) {
	                    cleanStacks.push({ qty: totalQty - runningQty, meta: normalizeLootStackMeta({ source: 'generic' }) });
	                    runningQty = totalQty;
	                }
	                if (runningQty > totalQty) {
	                    let overflow = runningQty - totalQty;
	                    while (overflow > 0 && cleanStacks.length > 0) {
	                        const last = cleanStacks[cleanStacks.length - 1];
	                        const take = Math.min(overflow, last.qty);
	                        last.qty -= take;
	                        overflow -= take;
	                        if (last.qty <= 0) cleanStacks.pop();
	                    }
	                }
	                ex.lootInventoryStacks[lootId] = cleanStacks;
	            });

	            Object.keys(ex.lootInventoryStacks).forEach((lootId) => {
	                if (!ex.lootInventory[lootId] || ex.lootInventory[lootId] <= 0) delete ex.lootInventoryStacks[lootId];
	            });
	        }

        function getExplorationStageKey(pet) {
            const stage = pet && pet.growthStage;
            return GROWTH_STAGES[stage] ? stage : 'baby';
        }

        function getExpeditionCadence(stageKey, completedCount) {
            const stage = GROWTH_STAGES[stageKey] ? stageKey : 'baby';
            const tuning = getAsyncLoopTuning();
            const stageCfg = ((tuning.expeditionStage || {})[stage]) || {};
            let durationMultiplier = Math.max(0.6, Number(stageCfg.durationMultiplier) || 1);
            const lootMultiplier = Math.max(0.75, Number(stageCfg.lootMultiplier) || 1);
            const energyCostMultiplier = Math.max(0.8, Number(stageCfg.energyCostMultiplier) || 1);
            const happinessMultiplier = Math.max(0.8, Number(stageCfg.happinessMultiplier) || 1);
            const progression = Array.isArray(tuning.expeditionProgressionSlowdown) ? tuning.expeditionProgressionSlowdown : [];
            const done = Math.max(0, Number(completedCount) || 0);
            progression.forEach((step) => {
                const threshold = Math.max(0, Number(step.completedAtLeast) || 0);
                if (done >= threshold) {
                    durationMultiplier *= Math.max(1, Number(step.durationMultiplier) || 1);
                }
            });
            return { durationMultiplier, lootMultiplier, energyCostMultiplier, happinessMultiplier };
        }

        function isFishTypePetType(type) {
            if (!type) return false;
            if (type === 'fish') return true;
            return String(type).toLowerCase().includes('fish');
        }

        function isBirdTypePetType(type) {
            if (!type) return false;
            const t = String(type).toLowerCase();
            if (t === 'bird' || t === 'penguin' || t === 'pegasus') return true;
            return t.includes('bird');
        }

        function hasPetTypeMatch(matchFn, stateObj) {
            const state = stateObj || gameState;
            const pets = (state.pets && state.pets.length > 0) ? state.pets : (state.pet ? [state.pet] : []);
            return pets.some((pet) => pet && matchFn(pet.type));
        }

        function updateExplorationUnlocks(silent, stateObj) {
            const state = stateObj || gameState;
            const ex = ensureExplorationState(state);
            const stats = ex.stats || {};
            const hasBirdType = hasPetTypeMatch(isBirdTypePetType, state);
            const hasFishType = hasPetTypeMatch(isFishTypePetType, state);

            const shouldUnlock = {
                forest: true,
                beach: (stats.expeditionsCompleted || 0) >= 1,
                mountain: (stats.expeditionsCompleted || 0) >= 3,
                cave: (stats.dungeonsCleared || 0) >= 1,
                skyIsland: hasBirdType,
                underwater: hasFishType,
                skyZone: hasBirdType
            };

            const newlyUnlocked = [];
            Object.keys(shouldUnlock).forEach((biomeId) => {
                if (shouldUnlock[biomeId] && !ex.biomeUnlocks[biomeId]) {
                    ex.biomeUnlocks[biomeId] = true;
                    newlyUnlocked.push(biomeId);
                }
            });

            if (newlyUnlocked.length > 0 && !silent) {
                newlyUnlocked.forEach((biomeId, idx) => {
                    const biome = EXPLORATION_BIOMES[biomeId];
                    if (!biome) return;
                    setTimeout(() => showToast(`${biome.icon} New biome unlocked: ${biome.name}!`, '#4ECDC4'), idx * 220);
                });
                const names = newlyUnlocked
                    .map((id) => (EXPLORATION_BIOMES[id] ? EXPLORATION_BIOMES[id].name : id))
                    .join(', ');
                announce(`New exploration areas unlocked: ${names}.`);
            }

            return newlyUnlocked;
        }

        function isBiomeUnlocked(biomeId) {
            const ex = ensureExplorationState();
            return !!(ex.biomeUnlocks && ex.biomeUnlocks[biomeId]);
        }

        function getExplorationAlertCount() {
            const ex = ensureExplorationState();
            let count = 0;
            if (ex.expedition && Date.now() >= ex.expedition.endAt) count++;
            count += (ex.npcEncounters || []).filter((n) => n && n.status !== 'adopted' && n.adoptable).length;
            return count;
        }

        function getBiomeLootPool(biomeId) {
            return BIOME_LOOT_POOLS[biomeId] || BIOME_LOOT_POOLS.forest || ['ancientCoin'];
        }

	        function addLootToInventory(lootId, count, meta) {
	            const ex = ensureExplorationState();
	            if (!EXPLORATION_LOOT[lootId]) return;
	            const safeCount = Math.max(1, Math.floor(Number(count) || 1));
	            ex.lootInventory[lootId] = (ex.lootInventory[lootId] || 0) + safeCount;
	            ensureLootInventoryStacks(ex);
	            const normalizedMeta = normalizeLootStackMeta(meta);
	            if (!Array.isArray(ex.lootInventoryStacks[lootId])) ex.lootInventoryStacks[lootId] = [];
	            const stacks = ex.lootInventoryStacks[lootId];
	            const last = stacks.length > 0 ? stacks[stacks.length - 1] : null;
	            if (last && last.meta && last.meta.source === normalizedMeta.source && last.meta.biomeId === normalizedMeta.biomeId) {
	                last.qty = Math.max(0, Math.floor(Number(last.qty) || 0)) + safeCount;
	                if (!Number.isFinite(last.meta.createdAt)) last.meta.createdAt = normalizedMeta.createdAt;
	            } else {
	                stacks.push({ qty: safeCount, meta: normalizedMeta });
	            }
	        }

	        function getLootDropWeight(lootId, options) {
	            const loot = EXPLORATION_LOOT[lootId];
	            const rarity = loot && loot.rarity ? loot.rarity : 'common';
	            let weight = 1;
	            if (rarity === 'rare') weight = 0.3;
	            else if (rarity === 'uncommon') weight = 0.65;
	            const ctx = options && typeof options === 'object' ? options : null;
	            if (ctx && ctx.source === 'expedition' && rarity !== 'common') {
	                const biomeId = ctx.biomeId || 'forest';
	                const biomeMult = (typeof EXPEDITION_BALANCE !== 'undefined' && EXPEDITION_BALANCE && EXPEDITION_BALANCE.biomeRarityWeightMultiplier)
	                    ? (Number(EXPEDITION_BALANCE.biomeRarityWeightMultiplier[biomeId]) || 1)
	                    : 1;
	                weight *= Math.max(0.65, Math.min(1.2, biomeMult));
	            }
	            return Math.max(0.05, weight);
	        }

	        function pickWeightedLootId(pool, options) {
	            const candidates = (Array.isArray(pool) ? pool : [])
	                .filter((lootId) => !!EXPLORATION_LOOT[lootId]);
	            if (candidates.length === 0) return null;
	            let total = 0;
	            candidates.forEach((lootId) => {
	                total += getLootDropWeight(lootId, options);
	            });
	            if (total <= 0) return randomFromArray(candidates);
	            let roll = Math.random() * total;
	            for (const lootId of candidates) {
	                roll -= getLootDropWeight(lootId, options);
	                if (roll <= 0) return lootId;
	            }
	            return candidates[candidates.length - 1];
	        }

	        function generateLootBundle(lootPool, rolls, options) {
	            const pool = Array.isArray(lootPool) && lootPool.length > 0 ? lootPool : ['ancientCoin'];
	            const rewardMap = {};
	            const totalRolls = Math.max(1, Math.floor(rolls || 1));
	            for (let i = 0; i < totalRolls; i++) {
	                const lootId = pickWeightedLootId(pool, options);
	                if (!lootId || !EXPLORATION_LOOT[lootId]) continue;
                const rarity = EXPLORATION_LOOT[lootId].rarity || 'common';
                let amount = 1;
                if (rarity === 'common' && Math.random() < 0.18) amount++;
                if (rarity === 'uncommon' && Math.random() < 0.08) amount++;
                if (rarity === 'rare' && Math.random() < 0.04) amount++;
                rewardMap[lootId] = (rewardMap[lootId] || 0) + amount;
            }
            const rewards = Object.entries(rewardMap).map(([id, count]) => ({
                id,
                count,
	                data: EXPLORATION_LOOT[id]
	            }));
	            const rewardMeta = (options && typeof options === 'object')
	                ? { source: options.source || 'generic', biomeId: options.biomeId || null, createdAt: Date.now() }
	                : { source: 'generic', createdAt: Date.now() };
	            rewards.forEach((reward) => addLootToInventory(reward.id, reward.count, rewardMeta));
	            return rewards;
	        }

        function getTreasureActionLabel(roomId) {
            const room = ROOMS[roomId];
            return room && room.isOutdoor ? 'Dig' : 'Search';
        }

	        function getTreasureHuntEnergyCost() {
	            const base = Math.max(1, Number((TREASURE_HUNT_BALANCE && TREASURE_HUNT_BALANCE.energyCost) || 5));
	            const pet = gameState.pet || (gameState.pets && gameState.pets[gameState.activePetIndex]);
	            const stage = pet && pet.growthStage ? pet.growthStage : 'baby';
	            if (stage === 'baby') return Math.max(1, base - 1);
	            return base;
	        }

	        function clampTreasureSuccessChance(value) {
	            const min = Math.max(0.05, Number((TREASURE_HUNT_BALANCE && TREASURE_HUNT_BALANCE.successChanceMin) || 0.2));
	            return Math.max(min, Math.min(0.9, Number(value) || min));
	        }

	        function getTreasureHuntPreview(roomId) {
	            const ex = ensureExplorationState();
	            const now = Date.now();
	            const t = ex.treasureHunt || {};
	            const antiFarmWindowMs = Math.max(30000, Number((TREASURE_HUNT_BALANCE && TREASURE_HUNT_BALANCE.antiFarmWindowMs) || (3 * 60 * 1000)));
	            const penaltyResetMs = Math.max(30000, Number((TREASURE_HUNT_BALANCE && TREASURE_HUNT_BALANCE.penaltyResetMs) || (4 * 60 * 1000)));
	            const roomSwapPenaltyStep = Math.max(0, Number((TREASURE_HUNT_BALANCE && TREASURE_HUNT_BALANCE.roomSwapPenaltyStep) || 0.07));
	            const repeatPenaltyStep = Math.max(0, Number((TREASURE_HUNT_BALANCE && TREASURE_HUNT_BALANCE.repeatPenaltyStep) || 0.05));
	            const maxPenaltyStacks = Math.max(1, Number((TREASURE_HUNT_BALANCE && TREASURE_HUNT_BALANCE.maxPenaltyStacks) || 6));
	            const cooldownMs = Math.max(1000, Number((TREASURE_HUNT_BALANCE && TREASURE_HUNT_BALANCE.globalCooldownMs) || GAME_BALANCE.timing.treasureCooldownMs));
	            const successChanceBase = Number((TREASURE_HUNT_BALANCE && TREASURE_HUNT_BALANCE.successChanceBase) || 0.48);
	            const extraRollChanceBase = Number((TREASURE_HUNT_BALANCE && TREASURE_HUNT_BALANCE.extraRollChanceBase) || 0.22);

	            const lastRunAt = Number(t.lastRunAt) || 0;
	            const inActiveWindow = (now - lastRunAt) <= antiFarmWindowMs;
	            const resetPenalty = (now - lastRunAt) > penaltyResetMs;
	            let roomSwitchCount = resetPenalty ? 0 : (Number(t.roomSwitchCount) || 0);
	            let repeatCount = resetPenalty ? 0 : (Number(t.repeatCount) || 0);
	            const lastRoomId = typeof t.lastRoomId === 'string' ? t.lastRoomId : null;
	            if (inActiveWindow && lastRoomId) {
	                if (lastRoomId !== roomId) roomSwitchCount += 1;
	                else repeatCount += 1;
	            } else if (!inActiveWindow) {
	                roomSwitchCount = 0;
	                repeatCount = 0;
	            }
	            const penaltyStacks = Math.min(maxPenaltyStacks, Math.max(0, roomSwitchCount + repeatCount));
	            let successChance = successChanceBase - (roomSwitchCount * roomSwapPenaltyStep) - (repeatCount * repeatPenaltyStep);
	            successChance = clampTreasureSuccessChance(successChance);
	            const extraRollChance = Math.max(0, Math.min(0.9, extraRollChanceBase - (penaltyStacks * 0.08)));
	            return {
	                cooldownRemainingMs: Math.max(0, (Number(t.globalCooldownEndsAt) || 0) - now),
	                cooldownMs,
	                energyCost: getTreasureHuntEnergyCost(),
	                penaltyStacks,
	                roomSwitchCount,
	                repeatCount,
	                successChance,
	                extraRollChance
	            };
	        }

	        function getTreasureCooldownRemaining(roomId) {
	            const preview = getTreasureHuntPreview(roomId);
	            return Math.max(0, Number(preview.cooldownRemainingMs) || 0);
	        }

        function resolvePetTypeForNpc(type) {
            if ((typeof getAllPetTypeData === 'function' && getAllPetTypeData(type)) || PET_TYPES[type]) {
                return type;
            }
            const fallback = Object.keys(PET_TYPES).find((id) => !PET_TYPES[id].mythical);
            return fallback || 'dog';
        }

        function registerNpcEncounter(type, sourceBiome, sourceLabel) {
            const ex = ensureExplorationState();
            const resolvedType = resolvePetTypeForNpc(type);
            const existing = ex.npcEncounters.find((npc) =>
                npc && npc.status !== 'adopted' && npc.type === resolvedType && npc.sourceBiome === sourceBiome && (npc.bond || 0) >= 60
            );
            if (existing) return existing;

            const petData = (typeof getAllPetTypeData === 'function' ? getAllPetTypeData(resolvedType) : null) || PET_TYPES[resolvedType];
            const prefixes = ['Curious', 'Gentle', 'Brave', 'Swift', 'Misty', 'Sunny', 'Starry'];
            const suffixes = ['Scout', 'Pal', 'Wanderer', 'Paws', 'Fluff', 'Companion', 'Friend'];
            const npcName = `${randomFromArray(prefixes)} ${randomFromArray(suffixes)}`;
            const npc = {
                id: `npc_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
                type: resolvedType,
                displayType: petData ? petData.name : resolvedType,
                icon: petData ? petData.emoji : '🐾',
                name: npcName,
                sourceBiome: sourceBiome || 'forest',
                sourceLabel: sourceLabel || ((EXPLORATION_BIOMES[sourceBiome] || {}).name || 'Wild'),
                bond: 0,
                adoptable: false,
                status: 'wild',
                befriended: false,
                discoveredAt: Date.now(),
                lastBefriendAt: 0
            };
            ex.npcEncounters.unshift(npc);
            if (ex.npcEncounters.length > 12) ex.npcEncounters = ex.npcEncounters.slice(0, 12);
            return npc;
        }

        function getRoomBiomeForTreasure(roomId) {
            switch (roomId) {
                case 'kitchen':
                case 'bathroom':
                    return 'beach';
                case 'park':
                    return 'mountain';
                case 'garden':
                    return 'forest';
                default:
                    return 'forest';
            }
        }

	        function abandonExpedition(silent) {
            const ex = ensureExplorationState();
            if (!ex.expedition) return { ok: false, reason: 'no-expedition' };
            const abandoned = ex.expedition;
            ex.expedition = null;
            saveGame();
            if (!silent) {
                showToast('🧭 Expedition ended early. No rewards were collected.', '#FFA726');
	        }

	        function getExpeditionUpkeepCost(biomeId, duration) {
	            const safeDuration = duration || EXPEDITION_DURATIONS[0] || { ms: 40000 };
	            const mins = Math.max(0.5, Number(safeDuration.ms || 0) / 60000);
	            const baseCost = Number((EXPEDITION_BALANCE && EXPEDITION_BALANCE.upkeepBaseCoins) || 0);
	            const perMinute = Number((EXPEDITION_BALANCE && EXPEDITION_BALANCE.upkeepPerMinute) || 0);
	            const biomeMult = Number((EXPEDITION_BALANCE && EXPEDITION_BALANCE.biomeUpkeepMultiplier && EXPEDITION_BALANCE.biomeUpkeepMultiplier[biomeId]) || 1);
	            return Math.max(0, Math.round((baseCost + (mins * perMinute)) * biomeMult));
	        }

	        function getExpeditionLootRollCount(baseRolls, lootMultiplier, bonusRolls) {
	            const threshold = Math.max(1, Number((EXPEDITION_BALANCE && EXPEDITION_BALANCE.durationDiminishingThreshold) || 1.95));
	            const exponent = Math.max(0.3, Number((EXPEDITION_BALANCE && EXPEDITION_BALANCE.durationDiminishingExponent) || 0.72));
	            const rawMult = Math.max(0.2, Number(lootMultiplier) || 1);
	            const diminishedMult = rawMult <= threshold
	                ? rawMult
	                : threshold + Math.pow(Math.max(0, rawMult - threshold), exponent);
	            const total = Math.round((Math.max(1, Number(baseRolls) || 1) * diminishedMult) + Math.max(0, Number(bonusRolls) || 0));
	            return Math.max(2, total);
	        }
            return { ok: true, abandoned };
        }

	        function startExpedition(biomeId, durationId) {
            const ex = ensureExplorationState();
            updateExplorationUnlocks(true);
            if (ex.expedition) return { ok: false, reason: 'already-running' };
            if (ex.dungeon && ex.dungeon.active) return { ok: false, reason: 'dungeon-active' };
            if (!EXPLORATION_BIOMES[biomeId]) return { ok: false, reason: 'invalid-biome' };
            if (!isBiomeUnlocked(biomeId)) return { ok: false, reason: 'locked-biome' };

            const duration = EXPEDITION_DURATIONS.find((d) => d.id === durationId) || EXPEDITION_DURATIONS[0];
            const pet = gameState.pet || (gameState.pets && gameState.pets[gameState.activePetIndex]);
            if (!pet) return { ok: false, reason: 'no-pet' };
            const stage = getExplorationStageKey(pet);
            const cadence = getExpeditionCadence(stage, ex.stats && ex.stats.expeditionsCompleted);
	            const roomIdAtStart = (typeof gameState.currentRoom === 'string' && ROOMS[gameState.currentRoom]) ? gameState.currentRoom : 'bedroom';
	            const roomYieldMultiplier = (typeof getRoomSystemMultiplier === 'function') ? getRoomSystemMultiplier('exploration', roomIdAtStart) : 1;
	            const adjustedDurationMs = Math.max(20000, Math.round((Number(duration.ms) || 45000) * cadence.durationMultiplier));
	            const adjustedLootMultiplier = Math.max(0.6, (Number(duration.lootMultiplier) || 1) * cadence.lootMultiplier * roomYieldMultiplier);
	            const upkeepCost = getExpeditionUpkeepCost(biomeId, { ...duration, ms: adjustedDurationMs });
	            if (upkeepCost > 0) {
	                const spend = spendCoins(upkeepCost, 'Expedition Upkeep', true);
	                if (!spend.ok) {
	                    return { ok: false, reason: spend.reason, needed: upkeepCost, balance: spend.balance };
	                }
	            }

	            const now = Date.now();
	            ex.expedition = {
                biomeId,
                petId: pet.id,
                petName: pet.name || ((typeof getAllPetTypeData === 'function' && getAllPetTypeData(pet.type) ? getAllPetTypeData(pet.type).name : 'Pet')),
                durationId: duration.id,
                durationMs: adjustedDurationMs,
                startedAt: now,
                endAt: now + adjustedDurationMs,
                lootMultiplier: adjustedLootMultiplier,
                stageAtStart: stage,
	                roomIdAtStart,
	                roomYieldMultiplier,
	                cadence,
	                upkeepCost
	            };
            saveGame();
            const adjustedDuration = {
                ...duration,
                ms: adjustedDurationMs
            };
	            return { ok: true, expedition: ex.expedition, biome: EXPLORATION_BIOMES[biomeId], duration: adjustedDuration, adjustedDurationMs, upkeepCost };
	        }

        function resolveExpeditionIfReady(forceResolve, silent) {
            const ex = ensureExplorationState();
            if (!ex.expedition) return { ok: false, reason: 'no-expedition' };
            const expedition = ex.expedition;
            const now = Date.now();
            if (now < expedition.endAt) {
                return { ok: false, reason: 'in-progress', remainingMs: expedition.endAt - now };
            }

            const biome = EXPLORATION_BIOMES[expedition.biomeId] || EXPLORATION_BIOMES.forest;
            const duration = EXPEDITION_DURATIONS.find((d) => d.id === expedition.durationId) || EXPEDITION_DURATIONS[0];
            const baseRolls = 2 + Math.floor(Math.random() * 2);
            const bonusRolls = typeof consumeExpeditionRewardBonusRolls === 'function' ? consumeExpeditionRewardBonusRolls() : 0;
	            const totalRolls = getExpeditionLootRollCount(baseRolls, (expedition.lootMultiplier || duration.lootMultiplier || 1), bonusRolls);
	            const rewards = generateLootBundle(getBiomeLootPool(expedition.biomeId), totalRolls, { source: 'expedition', biomeId: expedition.biomeId });
            ex.discoveredBiomes[expedition.biomeId] = true;
            ex.stats.expeditionsCompleted++;

            const targetPet = (gameState.pets || []).find((p) => p && p.id === expedition.petId) || gameState.pet;
            if (targetPet) {
                const stage = getExplorationStageKey(targetPet);
                const cadence = expedition.cadence || getExpeditionCadence(stage, ex.stats.expeditionsCompleted);
                const happinessGain = Math.max(1, Math.round(GAME_BALANCE.petCare.expeditionHappinessGain * Math.max(0.7, Number(cadence.happinessMultiplier) || 1)));
                const energyCost = Math.max(1, Math.round(GAME_BALANCE.petCare.expeditionEnergyCost * Math.max(0.7, Number(cadence.energyCostMultiplier) || 1)));
                targetPet.happiness = clamp(targetPet.happiness + happinessGain, 0, 100);
                targetPet.energy = clamp(targetPet.energy - energyCost, 0, 100);
            }

            let npc = null;
            const npcCandidates = biome && biome.npcTypes ? biome.npcTypes : null;
            if (npcCandidates && npcCandidates.length > 0 && Math.random() < 0.32) {
                npc = registerNpcEncounter(randomFromArray(npcCandidates), biome.id, biome.name);
            }

            const historyEntry = {
                at: now,
                biomeId: expedition.biomeId,
                biomeName: biome.name,
                petName: expedition.petName || 'Pet',
	                durationMs: expedition.durationMs || duration.ms,
	                rewards: rewards.map((r) => ({ id: r.id, count: r.count })),
	                npcId: npc ? npc.id : null,
	                rolls: totalRolls,
	                upkeepCost: expedition.upkeepCost || 0
	            };
            ex.expeditionHistory.unshift(historyEntry);
            if (ex.expeditionHistory.length > 15) ex.expeditionHistory = ex.expeditionHistory.slice(0, 15);
            ex.expedition = null;

            if (typeof incrementDailyProgress === 'function') {
                incrementDailyProgress('expeditionCount');
                incrementDailyProgress('discoveryEvents');
                incrementDailyProgress('masteryPoints', 2);
            }

            const newlyUnlocked = updateExplorationUnlocks(true);
            refreshMasteryTracks();
            saveGame();

            if (!silent) {
                const rewardPreview = rewards.slice(0, 3).map((r) => `${r.data.emoji}x${r.count}`).join(' ');
                const roomYieldPct = Math.round(((Number(expedition.roomYieldMultiplier) || 1) - 1) * 100);
                const roomYieldText = roomYieldPct > 0 ? ` (+${roomYieldPct}% room yield)` : '';
                showToast(`🧭 Expedition complete in ${biome.icon} ${biome.name}${roomYieldText}! ${rewardPreview}`, '#4ECDC4');
                if (typeof announce === 'function') {
                    announce(`Expedition complete in ${biome.name}. Rewards collected.`, { source: 'expedition-ready', dedupeMs: 5000 });
                }
                // Show encounter narrative for this biome
                if (typeof getExplorationNarrative === 'function') {
                    const narrative = getExplorationNarrative(expedition.biomeId, expedition.petName || 'Your pet');
                    if (narrative) {
                        setTimeout(() => showToast(narrative, '#90CAF9'), 400);
                    }
                }
                if (npc) {
                    setTimeout(() => showToast(`${npc.icon} You discovered ${npc.name} in the wild!`, '#FFD54F'), 620);
                }
                if (newlyUnlocked.length > 0) {
                    newlyUnlocked.forEach((id, idx) => {
                        const b = EXPLORATION_BIOMES[id];
                        if (b) setTimeout(() => showToast(`${b.icon} ${b.name} unlocked!`, '#81C784'), 820 + idx * 200);
                    });
                }
            }

	            return { ok: true, rewards, npc, biome, newlyUnlocked, totalRolls, upkeepCost: expedition.upkeepCost || 0 };
	        }

	        function runTreasureHunt(roomId) {
	            const ex = ensureExplorationState();
	            const room = ROOMS[roomId];
	            if (!room) return { ok: false, reason: 'invalid-room' };
	            const preview = getTreasureHuntPreview(roomId);
	            const remaining = Math.max(0, preview.cooldownRemainingMs || 0);
	            if (remaining > 0) return { ok: false, reason: 'cooldown', remainingMs: remaining, preview };
	            const pet = gameState.pet || (gameState.pets && gameState.pets[gameState.activePetIndex]);
	            const energyCost = Math.max(0, preview.energyCost || 0);
	            if (!pet || Number(pet.energy || 0) < energyCost) {
	                return { ok: false, reason: 'insufficient-energy', needed: energyCost, current: pet ? Number(pet.energy || 0) : 0, preview };
	            }
	            pet.energy = clamp((Number(pet.energy) || 0) - energyCost, 0, 100);

	            const now = Date.now();
	            const t = ex.treasureHunt;
	            const antiFarmWindowMs = Math.max(30000, Number((TREASURE_HUNT_BALANCE && TREASURE_HUNT_BALANCE.antiFarmWindowMs) || (3 * 60 * 1000)));
	            const penaltyResetMs = Math.max(30000, Number((TREASURE_HUNT_BALANCE && TREASURE_HUNT_BALANCE.penaltyResetMs) || (4 * 60 * 1000)));
	            const elapsed = now - (Number(t.lastRunAt) || 0);
	            if (elapsed > penaltyResetMs) {
	                t.roomSwitchCount = 0;
	                t.repeatCount = 0;
	            }
	            if (elapsed <= antiFarmWindowMs && t.lastRoomId) {
	                if (t.lastRoomId !== roomId) t.roomSwitchCount = Math.max(0, Number(t.roomSwitchCount || 0) + 1);
	                else t.repeatCount = Math.max(0, Number(t.repeatCount || 0) + 1);
	            } else {
	                t.roomSwitchCount = 0;
	                t.repeatCount = 0;
	            }
	            t.lastRoomId = roomId;
	            t.lastRunAt = now;
	            t.globalCooldownEndsAt = now + Math.max(1000, Number(preview.cooldownMs) || 0);
	            t.recentRuns.push({ at: now, roomId });
	            t.recentRuns = t.recentRuns.filter((entry) => entry && (now - Number(entry.at || 0)) <= antiFarmWindowMs);

	            ex.roomTreasureCooldowns[roomId] = now;
	            const foundTreasure = Math.random() < Math.max(0, Math.min(1, preview.successChance || 0.2));
	            const action = getTreasureActionLabel(roomId);
	            const lootPool = ROOM_TREASURE_POOLS[roomId] || ['ancientCoin'];
	            const rolls = 1 + ((Math.random() < Math.max(0, Math.min(1, preview.extraRollChance || 0))) ? 1 : 0);
	            const rewards = foundTreasure ? generateLootBundle(lootPool, rolls, { source: 'treasure', roomId }) : [];

	            if (foundTreasure) {
	                ex.stats.treasuresFound++;
	                if (gameState.pet) {
	                    gameState.pet.happiness = clamp(gameState.pet.happiness + 6, 0, 100);
	                }
	            }

            let npc = null;
            const biomeId = getRoomBiomeForTreasure(roomId);
            const biome = EXPLORATION_BIOMES[biomeId];
            const npcCandidates = biome && biome.npcTypes ? biome.npcTypes : ['dog', 'cat'];
            const npcChance = room.isOutdoor ? 0.18 : 0.1;
            if (Math.random() < npcChance) {
                npc = registerNpcEncounter(randomFromArray(npcCandidates), biomeId, room.name);
            }

            saveGame();
	            return {
	                ok: true,
	                action,
	                foundTreasure,
	                rewards,
	                npc,
	                room,
	                energyCost,
	                cooldownMs: preview.cooldownMs,
	                penaltyStacks: preview.penaltyStacks,
	                successChance: preview.successChance
	            };
	        }

        function createSeededRng(seed) {
            let s = (seed >>> 0) || 123456789;
            return function nextRandom() {
                s = (1664525 * s + 1013904223) >>> 0;
                return s / 4294967296;
            };
        }

        function generateDungeonRooms(seed, depth) {
            const rand = createSeededRng(seed);
            const weightedTypes = ['combat', 'treasure', 'combat', 'trap', 'npc', 'rest'];
            const count = Math.max(4, depth || 6);
            const rooms = [];
            for (let i = 0; i < count; i++) {
                let type = weightedTypes[Math.floor(rand() * weightedTypes.length)];
                if (i === 0) type = 'combat';
                if (i === count - 1) type = 'treasure';
                const roomType = DUNGEON_ROOM_TYPES.find((r) => r.id === type) || DUNGEON_ROOM_TYPES[0];
                rooms.push({
                    id: `${seed}_${i}`,
                    index: i,
                    type,
                    name: roomType.name,
                    icon: roomType.icon,
                    danger: 1 + Math.floor(rand() * 4) + Math.floor(i / 2)
                });
            }
            return rooms;
        }

        function startDungeonCrawl() {
            const ex = ensureExplorationState();
            if (ex.dungeon && ex.dungeon.active) return { ok: false, reason: 'already-running' };
            if (ex.expedition) return { ok: false, reason: 'expedition-active' };
            const seed = Math.floor(Date.now() % 2147483647);
            const depth = 6 + Math.floor(Math.random() * 3);
            ex.dungeon = {
                active: true,
                seed,
                rooms: generateDungeonRooms(seed, depth),
                currentIndex: 0,
                log: [],
                rewards: [],
                startedAt: Date.now(),
                roomCooldownMs: GAME_BALANCE.timing.dungeonRoomCooldownMs,
                nextRoomAt: Date.now()
            };
            saveGame();
            return { ok: true, dungeon: ex.dungeon };
        }

        function advanceDungeonCrawl() {
            const ex = ensureExplorationState();
            if (!ex.dungeon || !ex.dungeon.active) return { ok: false, reason: 'no-dungeon' };
            const dungeon = ex.dungeon;
            const now = Date.now();
            const remainingMs = Math.max(0, (dungeon.nextRoomAt || 0) - now);
            if (remainingMs > 0) return { ok: false, reason: 'cooldown', remainingMs };
            const room = dungeon.rooms[dungeon.currentIndex];
            if (!room) {
                dungeon.active = false;
                saveGame();
                return { ok: false, reason: 'invalid-room' };
            }

            const pet = gameState.pet;
            const floorLootPool = getBiomeLootPool('cave').concat(getBiomeLootPool('mountain'));
            let message = '';
            let rewards = [];
            let npc = null;
            const danger = Math.max(1, Number(room.danger) || 1);
            const dangerTier = Math.max(0, danger - 1);

            if (pet) {
                if ((pet.energy || 0) < 8) {
                    return { ok: false, reason: 'low-energy', neededEnergy: 8, currentEnergy: pet.energy || 0 };
                }
                const baselineCost = 3 + Math.floor(Math.random() * 3) + Math.floor(dangerTier / 2);
                pet.energy = clamp(pet.energy - baselineCost, 0, 100);
            }

            switch (room.type) {
                case 'combat': {
                    if (pet) {
                        pet.happiness = clamp(pet.happiness + 3 + Math.min(3, Math.floor(dangerTier / 2)), 0, 100);
                        pet.hunger = clamp(pet.hunger - (3 + Math.floor(dangerTier / 2)), 0, 100);
                    }
                    if (Math.random() < Math.min(0.85, 0.42 + (dangerTier * 0.06))) {
                        rewards = generateLootBundle(floorLootPool, 1 + (dangerTier >= 5 ? 1 : 0));
                    }
                    message = `${room.icon} You fought through a danger ${danger} room.`;
                    break;
                }
                case 'treasure': {
                    rewards = generateLootBundle(floorLootPool.concat(['runeFragment', 'mysteryMap']), 2 + Math.floor(dangerTier / 3));
                    if (pet) pet.happiness = clamp(pet.happiness + 8, 0, 100);
                    message = `${room.icon} You found a hidden treasure chamber!`;
                    break;
                }
                case 'trap': {
                    if (pet) {
                        pet.cleanliness = clamp(pet.cleanliness - (6 + dangerTier), 0, 100);
                        pet.happiness = clamp(pet.happiness - (3 + Math.floor(dangerTier / 2)), 0, 100);
                    }
                    message = `${room.icon} A trap slowed you down, but you pushed on.`;
                    break;
                }
                case 'rest': {
                    if (pet) {
                        pet.energy = clamp(pet.energy + 15, 0, 100);
                        pet.happiness = clamp(pet.happiness + 5, 0, 100);
                    }
                    message = `${room.icon} You found a safe campfire and recovered.`;
                    break;
                }
                case 'npc': {
                    const npcs = (EXPLORATION_BIOMES.cave && EXPLORATION_BIOMES.cave.npcTypes) ? EXPLORATION_BIOMES.cave.npcTypes : ['frog'];
                    npc = registerNpcEncounter(randomFromArray(npcs), 'cave', 'Dungeon');
                    message = `${room.icon} You met ${npc.name}, a wild pet in need of a friend.`;
                    break;
                }
                default: {
                    message = `${room.icon} You moved deeper into the dungeon.`;
                    break;
                }
            }

            dungeon.rewards.push(...rewards.map((r) => ({ id: r.id, count: r.count })));
            dungeon.log.unshift({
                at: Date.now(),
                roomType: room.type,
                icon: room.icon,
                message
            });
            if (dungeon.log.length > 15) dungeon.log = dungeon.log.slice(0, 15);

            dungeon.currentIndex++;
            dungeon.nextRoomAt = Date.now() + Math.max(12000, dungeon.roomCooldownMs || GAME_BALANCE.timing.dungeonRoomCooldownMs);
            let cleared = false;
            let clearRewards = [];
            if (dungeon.currentIndex >= dungeon.rooms.length) {
                cleared = true;
                const averageDanger = dungeon.rooms.length > 0
                    ? dungeon.rooms.reduce((sum, r) => sum + Math.max(1, Number(r.danger) || 1), 0) / dungeon.rooms.length
                    : 1;
                const clearRolls = 2 + Math.max(1, Math.round(averageDanger / 2));
                clearRewards = generateLootBundle(getBiomeLootPool('cave').concat(['runeFragment', 'stardust', 'mysteryMap']), clearRolls);
                dungeon.rewards.push(...clearRewards.map((r) => ({ id: r.id, count: r.count })));
                ex.stats.dungeonsCleared++;
                dungeon.active = false;
            }

            const newlyUnlocked = updateExplorationUnlocks(true);
            saveGame();

            return {
                ok: true,
                room,
                message,
                rewards,
                npc,
                cleared,
                clearRewards,
                progress: `${Math.min(dungeon.currentIndex, dungeon.rooms.length)}/${dungeon.rooms.length}`,
                newlyUnlocked
            };
        }

        function befriendNpc(npcId) {
            const ex = ensureExplorationState();
            const npc = (ex.npcEncounters || []).find((n) => n && n.id === npcId);
            if (!npc) return { ok: false, reason: 'not-found' };
            if (npc.status === 'adopted') return { ok: false, reason: 'already-adopted' };

            const now = Date.now();
            const cooldownMs = GAME_BALANCE.timing.npcBefriendCooldownMs;
            if (npc.lastBefriendAt && now - npc.lastBefriendAt < cooldownMs) {
                return { ok: false, reason: 'cooldown', remainingMs: cooldownMs - (now - npc.lastBefriendAt) };
            }

            const gain = 20 + Math.floor(Math.random() * 16);
            npc.bond = clamp((npc.bond || 0) + gain, 0, 100);
            npc.lastBefriendAt = now;
            if (!npc.befriended) {
                npc.befriended = true;
                ex.stats.npcsBefriended++;
            }
            if (npc.bond >= 100) {
                npc.adoptable = true;
            }

            let gift = null;
            if (Math.random() < 0.3) {
                const pool = getBiomeLootPool(npc.sourceBiome || 'forest');
                const gifts = generateLootBundle(pool, 1);
                gift = gifts[0] || null;
            }

            saveGame();
            return { ok: true, npc, gain, gift };
        }

        function adoptNpcPet(npcId) {
            const ex = ensureExplorationState();
            const npc = (ex.npcEncounters || []).find((n) => n && n.id === npcId);
            if (!npc) return { ok: false, reason: 'not-found' };
            if (npc.status === 'adopted') return { ok: false, reason: 'already-adopted' };
            if (!npc.adoptable && (npc.bond || 0) < 100) return { ok: false, reason: 'bond-too-low' };
            if (typeof canAdoptMore === 'function' && !canAdoptMore()) return { ok: false, reason: 'family-full' };

            const newPet = createPet(npc.type);
            const safeName = sanitizePetName(npc.name);
            if (safeName) newPet.name = safeName;
            addPetToFamily(newPet);
            gameState.activePetIndex = gameState.pets.length - 1;
            gameState.pet = gameState.pets[gameState.activePetIndex];

            npc.status = 'adopted';
            npc.adoptedAt = Date.now();
            ex.stats.npcsAdopted++;

            saveGame();
            return { ok: true, pet: newPet, npc };
        }

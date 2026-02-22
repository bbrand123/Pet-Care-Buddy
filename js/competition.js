        // ==================== PET COMPETITION SYSTEM ====================
        // Handles: Pet Battles, Boss Encounters, Pet Shows, Obstacle Courses, Rival Trainers

        // ==================== COMPETITION STATE ====================

        // Initialize competition state on gameState if missing
        function initCompetitionState() {
            if (!gameState.competition || typeof gameState.competition !== 'object' || Array.isArray(gameState.competition)) {
                gameState.competition = {
                    battlesWon: 0,
                    battlesLost: 0,
                    rivalBattlesWon: 0,
                    rivalBattlesLost: 0,
                    bossesDefeated: {},    // { bossId: { defeated: true, bestTime: ms } }
                    showsEntered: 0,
                    bestShowRank: '',
                    bestShowScore: 0,
                    obstacleBestScore: 0,
                    obstacleCompletions: 0,
                    rivalsDefeated: [],     // Array of defeated rival indices
                    currentRivalIndex: 0,   // Next rival to face
                    rewardControl: {
                        daily: { dayKey: '', earnedCoins: 0, lossConsolationCoins: 0, entryFeesPaid: 0, entriesUsed: 0 },
                        perMode: {},
                        bossFirstClearPaid: {},
                        rivalFirstClearPaid: {},
                        lastCapToastAt: 0
                    }
                };
            }
            const comp = gameState.competition;
            if (typeof comp.battlesWon !== 'number' || !Number.isFinite(comp.battlesWon)) comp.battlesWon = 0;
            if (typeof comp.battlesLost !== 'number' || !Number.isFinite(comp.battlesLost)) comp.battlesLost = 0;
            if (typeof comp.rivalBattlesWon !== 'number' || !Number.isFinite(comp.rivalBattlesWon)) comp.rivalBattlesWon = 0;
            if (typeof comp.rivalBattlesLost !== 'number' || !Number.isFinite(comp.rivalBattlesLost)) comp.rivalBattlesLost = 0;
            if (!comp.bossesDefeated || typeof comp.bossesDefeated !== 'object' || Array.isArray(comp.bossesDefeated)) comp.bossesDefeated = {};
            if (typeof comp.showsEntered !== 'number' || !Number.isFinite(comp.showsEntered)) comp.showsEntered = 0;
            if (typeof comp.bestShowRank !== 'string') comp.bestShowRank = '';
            if (typeof comp.bestShowScore !== 'number' || !Number.isFinite(comp.bestShowScore)) comp.bestShowScore = 0;
            if (typeof comp.obstacleBestScore !== 'number' || !Number.isFinite(comp.obstacleBestScore)) comp.obstacleBestScore = 0;
            if (typeof comp.obstacleCompletions !== 'number' || !Number.isFinite(comp.obstacleCompletions)) comp.obstacleCompletions = 0;
            if (!Array.isArray(comp.rivalsDefeated)) comp.rivalsDefeated = [];
            const rivalCount = (typeof RIVAL_TRAINERS !== 'undefined' && Array.isArray(RIVAL_TRAINERS)) ? RIVAL_TRAINERS.length : 0;
            comp.rivalsDefeated = [...new Set(comp.rivalsDefeated
                .map((idx) => Number(idx))
                .filter((idx) => Number.isInteger(idx) && idx >= 0 && (rivalCount === 0 || idx < rivalCount)))];
            if (!Number.isInteger(comp.currentRivalIndex) || comp.currentRivalIndex < 0) comp.currentRivalIndex = 0;
            if (comp.rivalsDefeated.length > 0) {
                const furthestDefeated = Math.max(...comp.rivalsDefeated);
                comp.currentRivalIndex = Math.max(comp.currentRivalIndex, furthestDefeated + 1);
            }
            if (rivalCount > 0) {
                comp.currentRivalIndex = Math.min(comp.currentRivalIndex, rivalCount);
            }
            if (!comp.rewardControl || typeof comp.rewardControl !== 'object' || Array.isArray(comp.rewardControl)) {
                comp.rewardControl = {
                    daily: { dayKey: '', earnedCoins: 0, lossConsolationCoins: 0, entryFeesPaid: 0, entriesUsed: 0 },
                    perMode: {},
                    bossFirstClearPaid: {},
                    rivalFirstClearPaid: {},
                    lastCapToastAt: 0
                };
            }
            if (!comp.rewardControl.daily || typeof comp.rewardControl.daily !== 'object') comp.rewardControl.daily = { dayKey: '', earnedCoins: 0, lossConsolationCoins: 0, entryFeesPaid: 0, entriesUsed: 0 };
            if (typeof comp.rewardControl.daily.dayKey !== 'string') comp.rewardControl.daily.dayKey = '';
            ['earnedCoins', 'lossConsolationCoins', 'entryFeesPaid', 'entriesUsed'].forEach((k) => {
                if (!Number.isFinite(comp.rewardControl.daily[k])) comp.rewardControl.daily[k] = 0;
                comp.rewardControl.daily[k] = Math.max(0, Math.floor(comp.rewardControl.daily[k]));
            });
            if (!comp.rewardControl.perMode || typeof comp.rewardControl.perMode !== 'object' || Array.isArray(comp.rewardControl.perMode)) comp.rewardControl.perMode = {};
            Object.keys(comp.rewardControl.perMode).forEach((modeId) => {
                const entry = comp.rewardControl.perMode[modeId];
                if (!entry || typeof entry !== 'object') comp.rewardControl.perMode[modeId] = { lastAt: 0, repeatCount: 0 };
                if (!Number.isFinite(comp.rewardControl.perMode[modeId].lastAt)) comp.rewardControl.perMode[modeId].lastAt = 0;
                if (!Number.isFinite(comp.rewardControl.perMode[modeId].repeatCount)) comp.rewardControl.perMode[modeId].repeatCount = 0;
            });
            if (!comp.rewardControl.bossFirstClearPaid || typeof comp.rewardControl.bossFirstClearPaid !== 'object') comp.rewardControl.bossFirstClearPaid = {};
            if (!comp.rewardControl.rivalFirstClearPaid || typeof comp.rewardControl.rivalFirstClearPaid !== 'object') comp.rewardControl.rivalFirstClearPaid = {};
            if (!Number.isFinite(comp.rewardControl.lastCapToastAt)) comp.rewardControl.lastCapToastAt = 0;
            return comp;
        }

        function getCompetitionDayKey() {
            return (typeof getTodayStringWithTimeHardening === 'function')
                ? getTodayStringWithTimeHardening()
                : ((typeof getTodayString === 'function') ? getTodayString() : new Date().toISOString().slice(0, 10));
        }

        function resetCompetitionDailyRewardControlIfNeeded(comp) {
            const state = comp || initCompetitionState();
            const rc = state.rewardControl;
            const dayKey = getCompetitionDayKey();
            if (rc.daily.dayKey !== dayKey) {
                rc.daily.dayKey = dayKey;
                rc.daily.earnedCoins = 0;
                rc.daily.lossConsolationCoins = 0;
                rc.daily.entryFeesPaid = 0;
                rc.daily.entriesUsed = 0;
                rc.perMode = {};
                // Boss/rival first clear rewards remain persistent; repeats are still reduced after first claim.
            }
            return rc;
        }

        function maybeShowCompetitionDiminishingToast(comp, message) {
            if (typeof showToast !== 'function') return;
            const rc = (comp || initCompetitionState()).rewardControl;
            const now = Date.now();
            if ((now - (Number(rc.lastCapToastAt) || 0)) < 45000) return;
            rc.lastCapToastAt = now;
            showToast(message || 'Competition rewards are in diminishing returns mode.', '#90A4AE');
        }

        function chargeCompetitionEntryFee(modeId, options) {
            const comp = initCompetitionState();
            resetCompetitionDailyRewardControlIfNeeded(comp);
            const rc = comp.rewardControl;
            const rank = Number((options && options.rank) || getCompetitionProgressRank()) || 1;
            const waiverRank = Math.max(1, Number((COMPETITION_ECONOMY_BALANCE && COMPETITION_ECONOMY_BALANCE.earlyGameFeeWaiverRank) || 2));
            if (rank <= waiverRank) return { ok: true, charged: 0, waived: true, reason: 'early-game-waiver' };

            const freeEntriesPerDay = Math.max(0, Number((COMPETITION_ECONOMY_BALANCE && COMPETITION_ECONOMY_BALANCE.freeEntriesPerDay) || 3));
            const entryIndex = Math.max(0, Math.floor(rc.daily.entriesUsed || 0));
            rc.daily.entriesUsed = entryIndex + 1;
            if (entryIndex < freeEntriesPerDay) {
                return { ok: true, charged: 0, freeEntry: true, remainingFree: Math.max(0, freeEntriesPerDay - rc.daily.entriesUsed) };
            }

            const modeMultTable = (COMPETITION_ECONOMY_BALANCE && COMPETITION_ECONOMY_BALANCE.entryFeeModeMultiplier) || {};
            const modeMult = Number(modeMultTable[modeId]) || 1;
            const baseFee = Math.max(0, Number((COMPETITION_ECONOMY_BALANCE && COMPETITION_ECONOMY_BALANCE.entryFeeBase) || 6));
            const rankStep = Math.max(0, Number((COMPETITION_ECONOMY_BALANCE && COMPETITION_ECONOMY_BALANCE.entryFeeRankStep) || 2));
            const fee = Math.max(1, Math.round((baseFee + Math.max(0, rank - waiverRank) * rankStep) * modeMult));
            const spend = (typeof spendCoins === 'function') ? spendCoins(fee, 'Competition Entry Fee', true) : { ok: true, spent: 0 };
            if (!spend.ok) {
                rc.daily.entriesUsed = Math.max(0, rc.daily.entriesUsed - 1);
                if (typeof showToast === 'function') showToast(`🎟️ Need ${fee} coins for competition entry.`, '#FFA726');
                return { ok: false, reason: spend.reason || 'insufficient-funds', needed: fee, balance: spend.balance };
            }
            rc.daily.entryFeesPaid = Math.max(0, Math.floor(rc.daily.entryFeesPaid || 0)) + fee;
            if (typeof showToast === 'function') showToast(`🎟️ Competition entry fee: ${fee} coins.`, '#90A4AE');
            return { ok: true, charged: fee };
        }

        function awardCompetitionCoins(baseCoins, context) {
            const comp = initCompetitionState();
            resetCompetitionDailyRewardControlIfNeeded(comp);
            const rc = comp.rewardControl;
            const daily = rc.daily;
            const ctx = context && typeof context === 'object' ? context : {};
            const modeId = String(ctx.modeId || 'battle');
            const outcome = ctx.outcome === 'loss' ? 'loss' : 'win';
            const now = Date.now();
            if (!rc.perMode[modeId] || typeof rc.perMode[modeId] !== 'object') rc.perMode[modeId] = { lastAt: 0, repeatCount: 0 };
            const modeTrack = rc.perMode[modeId];

            let coins = Math.max(0, Math.floor(Number(baseCoins) || 0));
            if (coins <= 0) return { coins: 0, baseCoins: 0, credited: 0, multipliers: [], applied: false };

            const appliedMultipliers = [];
            const repeatWindowMs = Math.max(15000, Number((COMPETITION_ECONOMY_BALANCE && COMPETITION_ECONOMY_BALANCE.repeatWindowMs) || (15 * 60 * 1000)));
            const repeatResetMs = Math.max(repeatWindowMs, Number((COMPETITION_ECONOMY_BALANCE && COMPETITION_ECONOMY_BALANCE.repeatCountResetMs) || (25 * 60 * 1000)));
            const sinceLast = now - (Number(modeTrack.lastAt) || 0);
            if (sinceLast <= repeatWindowMs) {
                modeTrack.repeatCount = Math.max(0, Math.floor(modeTrack.repeatCount || 0)) + 1;
            } else if (sinceLast > repeatResetMs) {
                modeTrack.repeatCount = 0;
            }
            modeTrack.lastAt = now;

            if (modeTrack.repeatCount > 0) {
                const penaltyPer = Math.max(0, Number((COMPETITION_ECONOMY_BALANCE && COMPETITION_ECONOMY_BALANCE.repeatPenaltyPerStack) || 0.18));
                const repeatMin = Math.max(0.1, Math.min(1, Number((COMPETITION_ECONOMY_BALANCE && COMPETITION_ECONOMY_BALANCE.repeatMinMultiplier) || 0.35)));
                const repeatMult = Math.max(repeatMin, 1 - (modeTrack.repeatCount * penaltyPer));
                coins = Math.max(1, Math.round(coins * repeatMult));
                appliedMultipliers.push({ key: 'repeat', mult: repeatMult, repeatCount: modeTrack.repeatCount });
            }

            if (outcome === 'loss' && modeId === 'battle') {
                const consolationCap = Math.max(0, Math.floor(Number((COMPETITION_ECONOMY_BALANCE && COMPETITION_ECONOMY_BALANCE.battleLossConsolationDailyCap) || 12)));
                const remainingConsolation = Math.max(0, consolationCap - Math.max(0, Math.floor(daily.lossConsolationCoins || 0)));
                if (remainingConsolation <= 0) {
                    coins = 0;
                    appliedMultipliers.push({ key: 'lossConsolationCap', mult: 0 });
                } else if (coins > remainingConsolation) {
                    const mult = remainingConsolation / coins;
                    coins = remainingConsolation;
                    appliedMultipliers.push({ key: 'lossConsolationCap', mult });
                }
                daily.lossConsolationCoins += coins;
            }

            if (outcome === 'win' && modeId === 'boss' && ctx.targetId) {
                const key = String(ctx.targetId);
                const firstPaid = !!rc.bossFirstClearPaid[key];
                if (firstPaid) {
                    const mult = Math.max(0, Math.min(1, Number((COMPETITION_ECONOMY_BALANCE && COMPETITION_ECONOMY_BALANCE.bossRepeatCoinMultiplier) || 0.2)));
                    coins = Math.max(0, Math.round(coins * mult));
                    appliedMultipliers.push({ key: 'bossRepeat', mult });
                } else {
                    rc.bossFirstClearPaid[key] = true;
                }
            }

            if (outcome === 'win' && modeId === 'rival' && Number.isFinite(ctx.targetId)) {
                const key = String(ctx.targetId);
                const firstPaid = !!rc.rivalFirstClearPaid[key];
                if (firstPaid) {
                    const mult = Math.max(0, Math.min(1, Number((COMPETITION_ECONOMY_BALANCE && COMPETITION_ECONOMY_BALANCE.rivalRepeatCoinMultiplier) || 0.35)));
                    coins = Math.max(0, Math.round(coins * mult));
                    appliedMultipliers.push({ key: 'rivalRepeat', mult });
                } else {
                    rc.rivalFirstClearPaid[key] = true;
                }
            }

            const dailySoftCap = Math.max(10, Math.floor(Number((COMPETITION_ECONOMY_BALANCE && COMPETITION_ECONOMY_BALANCE.dailySoftCapCoins) || 220)));
            const overCap = Math.max(0, (daily.earnedCoins || 0) - dailySoftCap);
            if (overCap > 0 && coins > 0) {
                const falloff = Math.max(0.0001, Number((COMPETITION_ECONOMY_BALANCE && COMPETITION_ECONOMY_BALANCE.dailySoftCapFalloffPerCoin) || 0.0075));
                const minMult = Math.max(0.05, Math.min(1, Number((COMPETITION_ECONOMY_BALANCE && COMPETITION_ECONOMY_BALANCE.dailySoftCapMinMultiplier) || 0.15)));
                const capMult = Math.max(minMult, 1 / (1 + (overCap * falloff)));
                coins = Math.max(1, Math.round(coins * capMult));
                appliedMultipliers.push({ key: 'dailySoftCap', mult: capMult, overCap });
            }

            const credited = (coins > 0 && typeof addCoins === 'function')
                ? addCoins(coins, ctx.reason || 'Competition Reward', true)
                : 0;
            daily.earnedCoins = Math.max(0, Math.floor(daily.earnedCoins || 0)) + Math.max(0, credited);

            const reduced = credited < Math.max(0, Math.floor(Number(baseCoins) || 0));
            if (reduced) {
                maybeShowCompetitionDiminishingToast(comp, 'Competition rewards are reduced by diminishing returns right now.');
            }

            balanceDebugLog('CompetitionAwardCoins', {
                modeId,
                outcome,
                baseCoins,
                credited,
                appliedMultipliers,
                dailyEarned: daily.earnedCoins
            });
            return { coins: credited, baseCoins, credited, multipliers: appliedMultipliers, applied: true };
        }

        // ==================== BATTLE SYSTEM ====================

        function calculateBattleStat(pet) {
            // Calculate a pet's overall battle power from stats
            const h = Number(pet.hunger) || 0;
            const c = Number(pet.cleanliness) || 0;
            const hp = Number(pet.happiness) || 0;
            const e = Number(pet.energy) || 0;
            const avg = (h + c + hp + e) / 4;

            // Growth stage multiplier
            let stageMult = 1.0;
            if (pet.growthStage === 'child') stageMult = 1.2;
            if (pet.growthStage === 'adult') stageMult = 1.5;
            if (pet.growthStage === 'elder') stageMult = 1.7;

            // Evolution bonus
            const evoMult = pet.evolutionStage === 'evolved' ? 1.3 : 1.0;

            // Care quality bonus
            const careBonus = { poor: 0.8, average: 1.0, good: 1.15, excellent: 1.3 };
            const careMult = careBonus[pet.careQuality] || 1.0;

            return Math.round(avg * stageMult * evoMult * careMult);
        }

        function calculateBattleHP(pet) {
            const base = 30;
            const statBonus = calculateBattleStat(pet) * 0.5;
            return Math.round(base + statBonus);
        }

        function getStageRewardWeight(stage) {
            if (stage === 'elder') return 1.2;
            if (stage === 'adult') return 1.1;
            if (stage === 'child') return 1.0;
            return 0.9;
        }

        function getCompetitionRewardMultiplier(pet, difficultyScale) {
            const stageWeight = getStageRewardWeight((pet && pet.growthStage) || 'baby');
            const power = Math.max(0, Number(calculateBattleStat(pet)) || 0);
            const powerNorm = Math.max(GAME_BALANCE.combat.powerNormMin, Math.min(GAME_BALANCE.combat.powerNormMax, power / GAME_BALANCE.combat.powerNormDivisor));
            const powerDamp = Math.max(GAME_BALANCE.combat.powerDampMin, GAME_BALANCE.combat.powerDampBase - ((powerNorm - 1) * GAME_BALANCE.combat.powerDampFactor));
            const difficulty = Math.max(0.75, Number(difficultyScale) || 1);
            const difficultyWeight = Math.max(GAME_BALANCE.combat.difficultyWeightMin, Math.min(GAME_BALANCE.combat.difficultyWeightMax, GAME_BALANCE.combat.difficultyWeightBase + (difficulty - 1) * GAME_BALANCE.combat.difficultyWeightFactor));
            const roomWeight = (typeof getRoomSystemMultiplier === 'function') ? getRoomSystemMultiplier('competition') : 1;
            return Math.max(GAME_BALANCE.combat.rewardMultMin, Math.min(GAME_BALANCE.combat.rewardMultMax, stageWeight * powerDamp * difficultyWeight * roomWeight));
        }

        function getCompetitionProgressRank() {
            const comp = initCompetitionState();
            const points = (comp.battlesWon || 0)
                + ((comp.rivalBattlesWon || 0) * 2)
                + (Object.keys(comp.bossesDefeated || {}).length * 3)
                + Math.floor((comp.showsEntered || 0) / 2)
                + Math.floor((comp.obstacleCompletions || 0) / 2);
            return Math.max(1, 1 + Math.floor(points / 6));
        }

        function buildCompetitionVictoryRewards(modeId, baseCoins, difficultyScale, won) {
            if (!won) return { coins: 0, loot: null, summary: [] };
            const ecoMult = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.competitionCoinRewardMultiplier === 'number')
                ? ECONOMY_BALANCE.competitionCoinRewardMultiplier
                : 0.9;
            const rank = getCompetitionProgressRank();
            const rankBonus = Math.max(0, rank - 1) * ((COMPETITION_ECONOMY_BALANCE && COMPETITION_ECONOMY_BALANCE.rankStepCoins) || 4);
            const diffScale = Math.max(0.7, Number(difficultyScale) || 1);
            const diffBonus = 1 + Math.min(((COMPETITION_ECONOMY_BALANCE && COMPETITION_ECONOMY_BALANCE.maxCoinMultiplier) || 2.4) - 1, Math.max(0, diffScale - 1) * ((COMPETITION_ECONOMY_BALANCE && COMPETITION_ECONOMY_BALANCE.difficultyCoinScale) || 0.24));
            const prestigeCompMult = Number(getPrestigeEffectValue('premiumNursery', 'competitionCoinMultiplier', 1)) || 1;
            const coins = Math.max(1, Math.round((Math.max(0, Number(baseCoins) || 0) + rankBonus) * diffBonus * ecoMult * prestigeCompMult));

            let loot = null;
            const suspiciousLootPenalty = (typeof isSuspiciousEconomyState === 'function' && isSuspiciousEconomyState())
                ? (typeof getSuspiciousRewardMultiplier === 'function' ? getSuspiciousRewardMultiplier() : 0.12)
                : 1;
            const lootChance = Math.max(0, Math.min(1, Number((COMPETITION_ECONOMY_BALANCE && COMPETITION_ECONOMY_BALANCE.victoryLootDropChance) || 0.18) * suspiciousLootPenalty));
            if (typeof addLootToInventory === 'function' && Math.random() < lootChance) {
                const pool = modeId === 'boss' ? ['runeFragment', 'mysteryMap', 'stardust'] : ['ancientCoin', 'forestCharm', 'windCompass'];
                const lootId = pool[Math.floor(Math.random() * pool.length)];
                if (lootId) {
                    addLootToInventory(lootId, 1, { source: 'competition', createdAt: Date.now() });
                    loot = EXPLORATION_LOOT[lootId] || null;
                }
            }

            const summary = [`🪙 ${coins} coins`];
            if (loot) summary.push(`${loot.emoji} ${loot.name}`);
            balanceDebugLog('CompetitionRewards', { // Report #5
                modeId,
                baseCoins,
                coins,
                rank,
                difficultyScale: diffScale,
                lootId: loot ? loot.id : null
            });
            return { coins, loot, summary, rank };
        }

        function formatVictoryRewardsSummary(rewards) {
            if (!rewards || !Array.isArray(rewards.summary) || rewards.summary.length === 0) return '<p class="battle-stats-summary">Victory Rewards: none</p>';
            return `<p class="battle-stats-summary">Victory Rewards: ${rewards.summary.join(' · ')}</p>`;
        }

        function calculateMoveDamage(move, attacker, defender) {
            const stat = attacker[move.stat] ?? 50;
            const statMult = stat / 50; // 1.0 at 50, 2.0 at 100
            let damage = Math.round(move.basePower * statMult);

            // Type advantage check — look up base type for hybrids too (check both parent types)
            const attackerTypeData = typeof getAllPetTypeData === 'function' ? getAllPetTypeData(attacker.type) : null;
            const parentTypes = (attackerTypeData && (attackerTypeData.parentTypes || attackerTypeData.parents)) || [];
            let advantages = PET_TYPE_ADVANTAGES[attacker.type] || [];
            if (advantages.length === 0 && parentTypes.length > 0) {
                // Combine advantages from both parent types for hybrids
                const combined = new Set();
                for (const pt of parentTypes) {
                    const adv = PET_TYPE_ADVANTAGES[pt] || [];
                    adv.forEach(a => combined.add(a));
                }
                advantages = [...combined];
            }
            // Also check defender's base types for hybrid defenders
            const defenderTypeData = typeof getAllPetTypeData === 'function' ? getAllPetTypeData(defender.type) : null;
            const defenderTypes = [defender.type];
            if (defenderTypeData && (defenderTypeData.parentTypes || defenderTypeData.parents)) {
                defenderTypes.push(...(defenderTypeData.parentTypes || defenderTypeData.parents));
            }
            if (defenderTypes.some(dt => advantages.includes(dt))) {
                damage = Math.round(damage * GAME_BALANCE.combat.typeAdvantageMultiplier);
            }

            // Add some randomness (+/- 15%)
            const variance = GAME_BALANCE.combat.damageVarianceMin + Math.random() * GAME_BALANCE.combat.damageVarianceRange;
            damage = Math.round(damage * variance);

            return Math.max(1, damage);
        }

        function selectAIMove(aiPet, aiHP, aiMaxHP) {
            const moves = Object.keys(BATTLE_MOVES);
            // AI logic: heal when low HP, otherwise attack
            if (aiHP < aiMaxHP * GAME_BALANCE.combat.aiHealThreshold && Math.random() < GAME_BALANCE.combat.aiHealProbability) {
                return BATTLE_MOVES.rest;
            }
            // Pick random attack move (exclude rest most of the time)
            const attackMoves = moves.filter(m => m !== 'rest');
            const moveId = attackMoves[Math.floor(Math.random() * attackMoves.length)];
            return BATTLE_MOVES[moveId];
        }

        // ==================== BATTLE UI ====================

        function openBattleArena() {
            const pet = gameState.pet;
            if (!pet) {
                showToast('You need a pet to battle!', '#EF5350');
                return;
            }

            const comp = initCompetitionState();
            const battleEntry = chargeCompetitionEntryFee('battle');
            if (!battleEntry.ok) return;
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay competition-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Pet Battle Arena');

            // Generate a random opponent
            let opponentTypes = Object.keys(PET_TYPES).filter(t => !PET_TYPES[t].mythical && t !== pet.type);
            if (opponentTypes.length === 0) {
                opponentTypes = Object.keys(PET_TYPES).filter(t => !PET_TYPES[t].mythical);
            }
            const oppType = opponentTypes[Math.floor(Math.random() * opponentTypes.length)];
            const oppData = PET_TYPES[oppType];
            // Scale opponent to match the player's pet growth stage for fairer battles
            const playerStage = pet.growthStage || 'child';
            const opponent = {
                type: oppType,
                name: oppData.name,
                color: oppData.colors[Math.floor(Math.random() * oppData.colors.length)],
                hunger: 40 + Math.floor(Math.random() * 40),
                cleanliness: 40 + Math.floor(Math.random() * 40),
                happiness: 40 + Math.floor(Math.random() * 40),
                energy: 40 + Math.floor(Math.random() * 40),
                growthStage: playerStage,
                careQuality: 'average',
                evolutionStage: 'base'
            };

            const playerMaxHP = calculateBattleHP(pet);
            const oppMaxHP = calculateBattleHP(opponent);
            let playerHP = playerMaxHP;
            let oppHP = oppMaxHP;
            let battleOver = false;
            let turnCount = 0;

            function renderBattle() {
                const petName = getPetDisplayName(pet);
                const oppName = escapeHTML(opponent.name);
                const playerPct = Math.max(0, Math.round((playerHP / playerMaxHP) * 100));
                const oppPct = Math.max(0, Math.round((oppHP / oppMaxHP) * 100));

                overlay.innerHTML = `
                    <div class="modal-content competition-modal battle-modal">
                        <button class="competition-close-btn" id="battle-close" aria-label="Close battle">&times;</button>
                        <h2 class="competition-title"><span aria-hidden="true">⚔️</span> Pet Battle!</h2>
                        <div class="battle-field">
                            <div class="battle-pet player-pet">
                                <span class="battle-pet-name">${petName}</span>
                                <span class="battle-pet-emoji">${(getAllPetTypeData(pet.type) || {}).emoji || '🐾'}</span>
                                <div class="battle-hp-bar" role="progressbar" aria-valuenow="${playerPct}" aria-valuemin="0" aria-valuemax="100" aria-label="${petName} HP: ${playerHP} of ${playerMaxHP}">
                                    <div class="battle-hp-fill player-hp" style="width:${playerPct}%"></div>
                                </div>
                                <span class="battle-hp-text">${playerHP}/${playerMaxHP} HP</span>
                            </div>
                            <span class="battle-vs">VS</span>
                            <div class="battle-pet opponent-pet">
                                <span class="battle-pet-name">${oppName}</span>
                                <span class="battle-pet-emoji">${oppData.emoji}</span>
                                <div class="battle-hp-bar" role="progressbar" aria-valuenow="${oppPct}" aria-valuemin="0" aria-valuemax="100" aria-label="${oppName} HP: ${oppHP} of ${oppMaxHP}">
                                    <div class="battle-hp-fill opponent-hp" style="width:${oppPct}%"></div>
                                </div>
                                <span class="battle-hp-text">${oppHP}/${oppMaxHP} HP</span>
                            </div>
                        </div>
                        <div class="battle-log" id="battle-log" aria-live="polite"></div>
                        <div class="battle-moves" id="battle-moves">
                            ${Object.entries(BATTLE_MOVES).map(([id, move]) => `
                                <button class="battle-move-btn" data-move="${id}" ${battleOver ? 'disabled' : ''} aria-describedby="move-desc-${id}" aria-label="${move.name}: ${move.description}">
                                    <span class="battle-move-emoji" aria-hidden="true">${move.emoji}</span>
                                    <span class="battle-move-name">${move.name}</span>
                                    <span class="battle-move-desc" id="move-desc-${id}">${move.description}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                `;

                const battleCloseBtn = overlay.querySelector('#battle-close');
                if (battleCloseBtn) {
                    // Replace node to remove any stale handlers from previous renders
                    const freshBtn = battleCloseBtn.cloneNode(true);
                    battleCloseBtn.replaceWith(freshBtn);
                    freshBtn.addEventListener('click', closeBattle);
                }
                if (!overlay._overlayClickBound) {
                    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeBattle(); });
                    overlay._overlayClickBound = true;
                }

                if (!battleOver) {
                    overlay.querySelectorAll('.battle-move-btn').forEach(btn => {
                        btn.addEventListener('click', () => {
                            const moveId = btn.dataset.move;
                            executeTurn(moveId);
                        });
                    });
                }
            }

            let battleLogHistory = [];
            let turnLocked = false;

            let _battleLogAnnounceTimer = null;
            let _battleLogAnnounceQueue = [];

            function logMessage(msg) {
                battleLogHistory.push(msg);
                const log = overlay.querySelector('#battle-log');
                if (log) {
                    const entry = document.createElement('div');
                    entry.className = 'battle-log-entry';
                    entry.textContent = msg;
                    log.appendChild(entry);
                    log.scrollTop = log.scrollHeight;
                }
                // Batch rapid log messages for screen readers
                _battleLogAnnounceQueue.push(msg);
                if (_battleLogAnnounceTimer) clearTimeout(_battleLogAnnounceTimer);
                _battleLogAnnounceTimer = setTimeout(() => {
                    if (_battleLogAnnounceQueue.length > 0) {
                        announce(_battleLogAnnounceQueue.join('. '));
                        _battleLogAnnounceQueue = [];
                    }
                    _battleLogAnnounceTimer = null;
                }, 300);
            }

            function restoreBattleLog() {
                restoreLog('#battle-log', battleLogHistory, null, overlay);
            }

            function executeTurn(moveId) {
                if (battleOver || turnLocked) return;
                turnLocked = true;
                turnCount++;

                const move = BATTLE_MOVES[moveId];
                if (!move) {
                    turnLocked = false;
                    return;
                }
                const petName = getPetDisplayName(pet);
                const oppName = opponent.name;

                // Player turn
                if (move.heal) {
                    playerHP = Math.min(playerMaxHP, playerHP + move.heal);
                    logMessage(`${petName} rests and recovers ${move.heal} HP!`);
                } else {
                    const dmg = calculateMoveDamage(move, pet, opponent);
                    oppHP = Math.max(0, oppHP - dmg);
                    logMessage(`${petName} uses ${move.name}! Deals ${dmg} damage!`);
                }

                // Announce HP changes (Item 4)
                announce(`${petName}: ${playerHP} of ${playerMaxHP} HP. ${oppName}: ${oppHP} of ${oppMaxHP} HP.`);

                // Check if opponent fainted
                if (oppHP <= 0) {
                    battleOver = true;
                    renderBattle();
                    restoreBattleLog();
                    logMessage(`${oppName} is defeated! You win!`);
                    announce(`${oppName} is defeated! You win!`, true);
                    endBattle(true);
                    turnLocked = false;
                    return;
                }

                // AI turn
                const aiMove = selectAIMove(opponent, oppHP, oppMaxHP);
                if (aiMove.heal) {
                    oppHP = Math.min(oppMaxHP, oppHP + aiMove.heal);
                    logMessage(`${oppName} rests and recovers ${aiMove.heal} HP!`);
                } else {
                    const aiDmg = calculateMoveDamage(aiMove, opponent, pet);
                    playerHP = Math.max(0, playerHP - aiDmg);
                    logMessage(`${oppName} uses ${aiMove.name}! Deals ${aiDmg} damage!`);
                }

                // Announce updated HP after AI turn (Item 4)
                announce(`${petName}: ${playerHP} of ${playerMaxHP} HP. ${oppName}: ${oppHP} of ${oppMaxHP} HP.`);

                // Check if player fainted
                if (playerHP <= 0) {
                    battleOver = true;
                    renderBattle();
                    restoreBattleLog();
                    logMessage(`${petName} is defeated! You lose...`);
                    announce(`${petName} is defeated! You lose.`, true);
                    endBattle(false);
                    turnLocked = false;
                    return;
                }

                renderBattle();
                restoreBattleLog();
                turnLocked = false;
            }

            function endBattle(won) {
                const comp = initCompetitionState();
                const battleDifficulty = Math.max(0.8, oppMaxHP / Math.max(1, playerMaxHP));
                const rewardMult = getCompetitionRewardMultiplier(pet, battleDifficulty) * (typeof getRewardCompetitionMultiplier === 'function' ? getRewardCompetitionMultiplier() : 1);
                const roomCompPct = Math.round((((typeof getRoomSystemMultiplier === 'function') ? getRoomSystemMultiplier('competition') : 1) - 1) * 100);
                let victoryRewards = { coins: 0, summary: [] };
                if (won) {
                    comp.battlesWon++;
                    // Recommendation #7: Mastery competition rank 3+ gives +2% battle happiness gain
                    const masteryBattleBonus = typeof getMasteryBattleHappinessBonus === 'function' ? getMasteryBattleHappinessBonus() : 0;
                    const happyGain = Math.max(8, Math.round(11 * rewardMult * (1 + masteryBattleBonus)));
                    // Report #5: Battle wins now pay economy rewards.
                    victoryRewards = buildCompetitionVictoryRewards('battle', (COMPETITION_ECONOMY_BALANCE && COMPETITION_ECONOMY_BALANCE.battleWinBaseCoins) || 14, battleDifficulty, true);
                    if (victoryRewards.coins > 0) {
                        const award = awardCompetitionCoins(victoryRewards.coins, { modeId: 'battle', outcome: 'win', reason: 'Competition Victory' });
                        victoryRewards.coins = award.coins || 0;
                        victoryRewards.summary = [`🪙 ${victoryRewards.coins} coins`].concat(victoryRewards.loot ? [`${victoryRewards.loot.emoji} ${victoryRewards.loot.name}`] : []);
                    }
                    pet.happiness = clamp(pet.happiness + happyGain, 0, 100);
                    pet.careActions = (pet.careActions || 0) + 1;
                    if (typeof addJournalEntry === 'function') {
                        const petName = pet.name || 'Pet';
                        if (comp.battlesWon === 1) addJournalEntry('⚔️', `${petName} won their first battle!`);
                        else if (comp.battlesWon % 5 === 0) addJournalEntry('⚔️', `${petName} has won ${comp.battlesWon} battles!`);
                    }
                    setTimeout(() => {
                        const roomText = roomCompPct > 0 ? ` (room +${roomCompPct}%)` : '';
                        showToast(`⚔️ Battle Won! +${happyGain} Happiness, +${victoryRewards.coins}🪙${roomText}!`, '#FFD700');
                        announce(`Victory! You won the battle! Rewards: ${happyGain} happiness and ${victoryRewards.coins} coins${roomText}.`, true);
                    }, 500);
                } else {
                    comp.battlesLost++;
                    const consolationCoins = Math.max(0, Number((COMPETITION_ECONOMY_BALANCE && COMPETITION_ECONOMY_BALANCE.battleLoseConsolationCoins) || 0));
                    if (consolationCoins > 0) {
                        const award = awardCompetitionCoins(consolationCoins, { modeId: 'battle', outcome: 'loss', reason: 'Competition Consolation' });
                        victoryRewards = { coins: award.coins || 0, summary: [`🪙 ${(award.coins || 0)} consolation coins`] };
                    }
                    setTimeout(() => {
                        showToast(consolationCoins > 0 ? `⚔️ Defeat. Consolation +${consolationCoins}🪙.` : '⚔️ Defeat. No rewards this time.', '#64B5F6');
                        announce(consolationCoins > 0 ? `Defeat. You received ${consolationCoins} consolation coins.` : 'Defeat. No rewards this time.', true);
                    }, 500);
                }
                if (won && typeof incrementDailyProgress === 'function') {
                    incrementDailyProgress('battleCount', 1);
                    incrementDailyProgress('masteryPoints', 2);
                }
                if (typeof consumeCompetitionRewardModifiers === 'function') consumeCompetitionRewardModifiers();
                if (typeof refreshMasteryTracks === 'function') refreshMasteryTracks();
                saveGame();
                if (typeof updateNeedDisplays === 'function') updateNeedDisplays();
                if (typeof updateWellnessBar === 'function') updateWellnessBar();
                if (typeof updatePetMood === 'function') updatePetMood();

                // Show result overlay
                setTimeout(() => {
                    if (!overlay.isConnected) return;
                    const modal = overlay.querySelector('.battle-modal');
                    if (!modal) return;
                    const resultDiv = document.createElement('div');
                    resultDiv.className = 'battle-result';
                    resultDiv.innerHTML = `
                        <div class="battle-result-content">
                            <h3>${won ? '🎉 Victory!' : '😢 Defeat'}</h3>
                            <p>${won ? 'Your pet showed great strength!' : 'Better luck next time!'}</p>
                            ${formatVictoryRewardsSummary(victoryRewards)}
                            <p class="battle-stats-summary">Record: ${comp.battlesWon}W / ${comp.battlesLost}L</p>
                            <div class="battle-result-actions">
                                <button class="competition-btn primary" id="battle-done">Done</button>
                                <button class="competition-btn secondary" id="battle-back-hub">Back to Hub</button>
                            </div>
                        </div>
                    `;
                    modal.appendChild(resultDiv);
                    const doneBtn = overlay.querySelector('#battle-done');
                    if (doneBtn) doneBtn.addEventListener('click', closeBattle);
                    const hubBtn = overlay.querySelector('#battle-back-hub');
                    if (hubBtn) hubBtn.addEventListener('click', () => { closeBattle(); setTimeout(openCompetitionHub, 100); });
                }, 800);
            }

            function closeBattle() {
                popModalEscape(closeBattle);
                if (_battleLogAnnounceTimer) {
                    clearTimeout(_battleLogAnnounceTimer);
                    _battleLogAnnounceTimer = null;
                }
                _battleLogAnnounceQueue = [];
                if (overlay.parentNode) overlay.remove();
                if (gameState.phase === 'pet') {
                    if (typeof updateNeedDisplays === 'function') updateNeedDisplays();
                    if (typeof updatePetMood === 'function') updatePetMood();
                    if (typeof updateWellnessBar === 'function') updateWellnessBar();
                }
            }

            document.body.appendChild(overlay);
            pushModalEscape(closeBattle);
            trapFocus(overlay);
            renderBattle();
            announce('Pet battle started!');
        }

        // ==================== BOSS ENCOUNTER SYSTEM ====================

        function getCompetitionRivalRoster() {
            const base = Array.isArray(RIVAL_TRAINERS) ? RIVAL_TRAINERS : [];
            return base.map((trainer, idx) => {
                const id = trainer && trainer.id ? trainer.id : `rival_${idx}`;
                return { id, ...trainer, _index: idx };
            });
        }

        function getCompetitionRuleModifier(modeId) {
            if (typeof getDeterministicRuleModifier !== 'function') return null;
            return getDeterministicRuleModifier(modeId, 'competitionRule', 'competition');
        }

        function recordCompetitionRotation(scope, id) {
            if (typeof recordContentRotationSelection !== 'function') return;
            recordContentRotationSelection('competition', scope, id, { state: gameState, recentWindow: 4 });
        }

        function sortByLeastRecentCompetitionHistory(scope, list) {
            if (!Array.isArray(list) || list.length <= 1 || typeof ensureContentRotationHistoryBucket !== 'function') return list || [];
            const history = ensureContentRotationHistoryBucket('competition', scope, gameState);
            const seen = history && history.lastSeenOrder ? history.lastSeenOrder : {};
            const counter = Number(history && history.count) || 0;
            return [...list].sort((a, b) => {
                const aId = String((a && (a.id || a._index)) || '');
                const bId = String((b && (b.id || b._index)) || '');
                const aSeen = Number(seen[aId]) || 0;
                const bSeen = Number(seen[bId]) || 0;
                const aDistance = aSeen ? (counter - aSeen) : Number.MAX_SAFE_INTEGER;
                const bDistance = bSeen ? (counter - bSeen) : Number.MAX_SAFE_INTEGER;
                if (aDistance !== bDistance) return bDistance - aDistance;
                return aId.localeCompare(bId);
            });
        }

        function getAvailableBosses() {
            const season = gameState.season || getCurrentSeason();
            const bosses = [];
            for (const [id, boss] of Object.entries(BOSS_ENCOUNTERS)) {
                const rematchReq = Math.max(0, Number(boss && boss.rematchRequiresBossesDefeated) || 0);
                const defeatedCount = Object.keys((gameState.competition && gameState.competition.bossesDefeated) || {}).length;
                const seasonOk = (boss.season === null || boss.season === season);
                if (seasonOk && defeatedCount >= rematchReq) {
                    bosses.push({ id, ...boss });
                }
            }
            return sortByLeastRecentCompetitionHistory('bosses', bosses);
        }

        function openBossEncounter() {
            const pet = gameState.pet;
            if (!pet) {
                showToast('You need a pet to fight bosses!', '#EF5350');
                return;
            }

            const comp = initCompetitionState();
            const bosses = getAvailableBosses();
            const bossRuleModifier = getCompetitionRuleModifier('boss');
            if (bosses.length === 0) {
                showToast('No bosses available right now!', '#FFA726');
                return;
            }

            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay competition-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Boss Encounters');

            function renderBossSelect() {
                overlay.innerHTML = `
                    <div class="modal-content competition-modal boss-select-modal">
                        <button class="competition-close-btn" id="boss-close" aria-label="Close">&times;</button>
                        <h2 class="competition-title"><span aria-hidden="true">👹</span> Boss Encounters</h2>
                        <p class="competition-subtitle">Team up with your pets to defeat powerful bosses!${bossRuleModifier && bossRuleModifier.name ? ` Rule: ${bossRuleModifier.name}.` : ''}</p>
                        <div class="boss-list">
                            ${bosses.map(boss => {
                                const defeated = comp.bossesDefeated[boss.id];
                                return `
                                    <button class="boss-card ${defeated ? 'defeated' : ''}" data-boss="${boss.id}">
                                        <span class="boss-emoji">${boss.emoji}</span>
                                        <span class="boss-name">${boss.name}</span>
                                        <span class="boss-hp-label">HP: ${boss.maxHP}</span>
                                        ${defeated ? '<span class="boss-defeated-badge">Defeated!</span>' : ''}
                                        ${boss.rematchTier ? `<span class="boss-season">↺ Rematch T${boss.rematchTier}</span>` : ''}
                                        ${boss.season && SEASONS[boss.season] ? `<span class="boss-season">${SEASONS[boss.season].icon} ${SEASONS[boss.season].name}</span>` : '<span class="boss-season">⭐ Special</span>'}
                                    </button>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;

                overlay.querySelector('#boss-close').addEventListener('click', closeBossUI);
                if (!overlay._overlayClickBound) {
                    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeBossUI(); });
                    overlay._overlayClickBound = true;
                }

                overlay.querySelectorAll('.boss-card').forEach(card => {
                    card.addEventListener('click', () => {
                        const bossId = card.dataset.boss;
                        startBossFight(bossId);
                    });
                });
            }

            function startBossFight(bossId) {
                const bossEntry = chargeCompetitionEntryFee('boss');
                if (!bossEntry.ok) return;
                const boss = BOSS_ENCOUNTERS[bossId];
                if (!boss) return;
                const activeBossModifier = getCompetitionRuleModifier('boss');
                const bossHpMult = Math.max(0.75, Number(activeBossModifier && activeBossModifier.effect && activeBossModifier.effect.bossHpMultiplier) || 1);

                // Gather all pets for cooperative fight
                const allPets = (gameState.pets && gameState.pets.length > 0) ? gameState.pets.filter(p => p) : [pet];
                let bossHP = Math.max(1, Math.round(boss.maxHP * bossHpMult));
                const bossMaxHP = Math.max(1, Math.round(boss.maxHP * bossHpMult));
                let currentPetIdx = 0;
                let petHPs = allPets.map(p => calculateBattleHP(p));
                let petMaxHPs = [...petHPs];
                let fightOver = false;
                let bossTurnLocked = false;
                const bossDefender = { type: boss.type || 'dragon' };

                function renderBossFight() {
                    const currentPet = allPets[currentPetIdx];
                    const currentPetName = getPetDisplayName(currentPet);
                    const bossPct = Math.max(0, Math.round((bossHP / bossMaxHP) * 100));
                    const petPct = Math.max(0, Math.round((petHPs[currentPetIdx] / petMaxHPs[currentPetIdx]) * 100));

                    overlay.innerHTML = `
                        <div class="modal-content competition-modal boss-fight-modal">
                            <button class="competition-close-btn" id="boss-fight-close" aria-label="Close">&times;</button>
                            <h2 class="competition-title"><span aria-hidden="true">${boss.emoji}</span> ${boss.name}${activeBossModifier && activeBossModifier.name ? ` · ${activeBossModifier.name}` : ''}</h2>
                            <div class="battle-field boss-field">
                                <div class="battle-pet player-pet">
                                    <span class="battle-pet-name">${currentPetName}</span>
                                    <span class="battle-pet-emoji">${(getAllPetTypeData(currentPet.type) || {}).emoji || '🐾'}</span>
                                    <div class="battle-hp-bar" role="progressbar" aria-valuenow="${petPct}" aria-valuemin="0" aria-valuemax="100" aria-label="${currentPetName} HP: ${petHPs[currentPetIdx]} of ${petMaxHPs[currentPetIdx]}"><div class="battle-hp-fill player-hp" style="width:${petPct}%"></div></div>
                                    <span class="battle-hp-text">${petHPs[currentPetIdx]}/${petMaxHPs[currentPetIdx]} HP</span>
                                </div>
                                <span class="battle-vs">VS</span>
                                <div class="battle-pet boss-pet">
                                    <span class="battle-pet-name">${boss.name}</span>
                                    <span class="battle-pet-emoji boss-emoji-large">${boss.emoji}</span>
                                    <div class="battle-hp-bar" role="progressbar" aria-valuenow="${bossPct}" aria-valuemin="0" aria-valuemax="100" aria-label="${boss.name} HP: ${bossHP} of ${bossMaxHP}"><div class="battle-hp-fill boss-hp" style="width:${bossPct}%"></div></div>
                                    <span class="battle-hp-text">${bossHP}/${bossMaxHP} HP</span>
                                </div>
                            </div>
                            ${allPets.length > 1 ? `
                                <div class="boss-team-roster">
                                    ${allPets.map((p, i) => `
                                        <span class="boss-team-member ${i === currentPetIdx ? 'active' : ''} ${petHPs[i] <= 0 ? 'fainted' : ''}"
                                              title="${p.name || (getAllPetTypeData(p.type) || {}).name || 'Pet'}">
                                            ${(getAllPetTypeData(p.type) || {}).emoji || '🐾'}${petHPs[i] <= 0 ? '💫' : ''}
                                        </span>
                                    `).join('')}
                                </div>
                            ` : ''}
                            <div class="battle-log" id="boss-log" aria-live="polite"></div>
                            <div class="battle-moves" id="boss-moves">
                                ${Object.entries(BATTLE_MOVES).map(([id, move]) => `
                                    <button class="battle-move-btn" data-move="${id}" ${fightOver ? 'disabled' : ''}>
                                        <span class="battle-move-emoji" aria-hidden="true">${move.emoji}</span>
                                        <span class="battle-move-name">${move.name}</span>
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    `;

                    overlay.querySelector('#boss-fight-close').addEventListener('click', closeBossUI);
                    if (!fightOver) {
                        overlay.querySelectorAll('.battle-move-btn').forEach(btn => {
                            btn.addEventListener('click', () => executeBossTurn(btn.dataset.move));
                        });
                    }
                }

                let bossLogHistory = [];

                function bossLog(msg) {
                    bossLogHistory.push(msg);
                    const log = overlay.querySelector('#boss-log');
                    if (log) {
                        const entry = document.createElement('div');
                        entry.className = 'battle-log-entry';
                        entry.textContent = msg;
                        log.appendChild(entry);
                        log.scrollTop = log.scrollHeight;
                    }
                }

                function restoreBossLog() {
                    restoreLog('#boss-log', bossLogHistory, null, overlay);
                }

                function executeBossTurn(moveId) {
                    if (fightOver || bossTurnLocked) return;
                    bossTurnLocked = true;
                    const currentPet = allPets[currentPetIdx];
                    const petName = getPetDisplayName(currentPet);
                    const move = BATTLE_MOVES[moveId];
                    if (!move) {
                        bossTurnLocked = false;
                        return;
                    }

                    // Player attack
                    if (move.heal) {
                        petHPs[currentPetIdx] = Math.min(petMaxHPs[currentPetIdx], petHPs[currentPetIdx] + move.heal);
                        bossLog(`${petName} rests and recovers ${move.heal} HP!`);
                    } else {
                        let dmg = calculateMoveDamage(move, currentPet, bossDefender);
                        dmg = Math.max(1, dmg - Math.floor(boss.defense / 3));
                        bossHP = Math.max(0, bossHP - dmg);
                        bossLog(`${petName} uses ${move.name}! Deals ${dmg} damage!`);
                    }

                    if (bossHP <= 0) {
                        fightOver = true;
                        renderBossFight();
                        restoreBossLog();
                        bossLog(boss.victoryMessage);
                        endBossFight(bossId, true);
                        bossTurnLocked = false;
                        return;
                    }

                    // Boss turn
                    const bossMove = boss.moves[Math.floor(Math.random() * boss.moves.length)];
                    if (bossMove.power) {
                        const bossDmg = Math.max(1, Math.round(bossMove.power * (0.85 + Math.random() * 0.3)));
                        petHPs[currentPetIdx] = Math.max(0, petHPs[currentPetIdx] - bossDmg);
                        bossLog(`${boss.name} uses ${bossMove.name}! Deals ${bossDmg} damage!`);
                    }
                    if (bossMove.healSelf) {
                        bossHP = Math.min(bossMaxHP, bossHP + bossMove.healSelf);
                        bossLog(`${boss.name} uses ${bossMove.name}! Heals ${bossMove.healSelf} HP!`);
                    }

                    // Check if current pet fainted
                    if (petHPs[currentPetIdx] <= 0) {
                        bossLog(`${petName} has fainted!`);
                        // Switch to next alive pet
                        const nextAlive = petHPs.findIndex((hp, i) => i > currentPetIdx && hp > 0);
                        const fallback = petHPs.findIndex((hp) => hp > 0);
                        if (nextAlive !== -1) {
                            currentPetIdx = nextAlive;
                            const nextName = allPets[currentPetIdx].name || (getAllPetTypeData(allPets[currentPetIdx].type) || {}).name || 'Pet';
                            bossLog(`${nextName} jumps into the fight!`);
                        } else if (fallback !== -1) {
                            currentPetIdx = fallback;
                        } else {
                            fightOver = true;
                            renderBossFight();
                            restoreBossLog();
                            bossLog('All pets have fainted! The boss wins...');
                            endBossFight(bossId, false);
                            bossTurnLocked = false;
                            return;
                        }
                    }

                    renderBossFight();
                    restoreBossLog();
                    bossTurnLocked = false;
                }

                function endBossFight(bossId, won) {
                    const comp = initCompetitionState();
                    const avgTeamPower = allPets.length > 0
                        ? allPets.reduce((sum, p) => sum + (Number(calculateBattleStat(p)) || 0), 0) / allPets.length
                        : (Number(calculateBattleStat(gameState.pet)) || 60);
                    const bossDifficulty = Math.max(1, boss.maxHP / Math.max(40, avgTeamPower));
                    const rewardMult = getCompetitionRewardMultiplier(gameState.pet || allPets[0], bossDifficulty) * (typeof getRewardCompetitionMultiplier === 'function' ? getRewardCompetitionMultiplier() : 1);
                    const roomCompPct = Math.round((((typeof getRoomSystemMultiplier === 'function') ? getRoomSystemMultiplier('competition') : 1) - 1) * 100);
                    let victoryRewards = { coins: 0, summary: [] };
                    if (won) {
                        recordCompetitionRotation('bosses', bossId);
                        comp.bossesDefeated[bossId] = { defeated: true, defeatedAt: Date.now() };
                        // Report #5: Boss wins now have an economy payout lane.
                        victoryRewards = buildCompetitionVictoryRewards('boss', (COMPETITION_ECONOMY_BALANCE && COMPETITION_ECONOMY_BALANCE.bossWinBaseCoins) || 40, bossDifficulty, true);
                        if (victoryRewards.coins > 0) {
                            const modCoinMult = Math.max(0.5, Number(activeBossModifier && activeBossModifier.effect && activeBossModifier.effect.coinMultiplier) || 1);
                            const adjustedCoinBase = Math.max(0, Math.round(victoryRewards.coins * modCoinMult));
                            const award = awardCompetitionCoins(adjustedCoinBase, { modeId: 'boss', outcome: 'win', targetId: bossId, reason: 'Boss Victory' });
                            victoryRewards.coins = award.coins || 0;
                            victoryRewards.summary = [`🪙 ${victoryRewards.coins} coins`].concat(victoryRewards.loot ? [`${victoryRewards.loot.emoji} ${victoryRewards.loot.name}`] : []);
                        }
                        // Apply rewards only to alive pets (skip fainted ones)
                        const rewards = boss.rewards;
                        allPets.forEach((p, idx) => {
                            if (!p || petHPs[idx] <= 0) return;
                            if (rewards.happiness) p.happiness = clamp(p.happiness + Math.max(4, Math.round(rewards.happiness * 0.85 * rewardMult)), 0, 100);
                            if (rewards.energy) p.energy = clamp(p.energy + Math.max(4, Math.round(rewards.energy * 0.85 * rewardMult)), 0, 100);
                            if (rewards.hunger) p.hunger = clamp(p.hunger + Math.max(3, Math.round(rewards.hunger * 0.85 * rewardMult)), 0, 100);
                            p.careActions = (p.careActions || 0) + 1;
                        });
                        // Grant sticker reward if defined
                        if (rewards.sticker && typeof grantSticker === 'function') {
                            grantSticker(rewards.sticker);
                        }
                        if (gameState.pets && gameState.pets[gameState.activePetIndex]) {
                            gameState.pet = gameState.pets[gameState.activePetIndex];
                        }
                        setTimeout(() => {
                            const roomText = roomCompPct > 0 ? ` Room bonus +${roomCompPct}% applied.` : '';
                            showToast(`👹 Boss Defeated: ${boss.name}! +${victoryRewards.coins}🪙.${roomText}`, '#FFD700');
                            announce(`Victory! Boss ${boss.name} defeated. Rewards include ${victoryRewards.coins} coins.${roomText}`, true);
                        }, 500);
                    } else {
                        // Consolation rewards apply even if all pets fainted.
                        const consolation = Math.max(2, Math.round(4 * rewardMult));
                        allPets.forEach((p) => {
                            if (!p) return;
                            p.happiness = clamp(p.happiness + consolation, 0, 100);
                        });
                        if (gameState.pets && gameState.pets[gameState.activePetIndex]) {
                            gameState.pet = gameState.pets[gameState.activePetIndex];
                        }
                        setTimeout(() => {
                            showToast('👹 The boss was too strong! Try again when your pets are stronger!', '#64B5F6');
                            announce('Defeat. The boss was too strong. Try again when your pets are stronger.', true);
                        }, 500);
                    }
                    if (typeof incrementDailyProgress === 'function') {
                        incrementDailyProgress('battleCount', 1);
                        incrementDailyProgress('masteryPoints', won ? 3 : 1);
                    }
                    if (typeof consumeCompetitionRewardModifiers === 'function') consumeCompetitionRewardModifiers();
                    if (typeof refreshMasteryTracks === 'function') refreshMasteryTracks();
                    saveGame();

                    setTimeout(() => {
                        if (!overlay.isConnected) return;
                        const modal = overlay.querySelector('.boss-fight-modal, .boss-select-modal');
                        if (!modal) return;
                        const resultDiv = document.createElement('div');
                        resultDiv.className = 'battle-result';
                        resultDiv.innerHTML = `
                            <div class="battle-result-content">
                                <h3>${won ? '🏆 Boss Defeated!' : '😢 Defeat'}</h3>
                                <p>${won ? boss.victoryMessage : 'Train harder and come back!'}</p>
                                ${formatVictoryRewardsSummary(victoryRewards)}
                                <div class="battle-result-actions">
                                    <button class="competition-btn primary" id="boss-done">Done</button>
                                    <button class="competition-btn secondary" id="boss-back-hub">Back to Hub</button>
                                </div>
                            </div>
                        `;
                        modal.appendChild(resultDiv);
                        const doneBtn = overlay.querySelector('#boss-done');
                        if (doneBtn) doneBtn.addEventListener('click', closeBossUI);
                        const hubBtn2 = overlay.querySelector('#boss-back-hub');
                        if (hubBtn2) hubBtn2.addEventListener('click', () => { closeBossUI(); setTimeout(openCompetitionHub, 100); });
                    }, 800);
                }

                renderBossFight();
            }

            function closeBossUI() {
                popModalEscape(closeBossUI);
                if (overlay.parentNode) overlay.remove();
                if (gameState.phase === 'pet') {
                    if (typeof updateNeedDisplays === 'function') updateNeedDisplays();
                    if (typeof updatePetMood === 'function') updatePetMood();
                    if (typeof updateWellnessBar === 'function') updateWellnessBar();
                }
            }

            document.body.appendChild(overlay);
            pushModalEscape(closeBossUI);
            trapFocus(overlay);
            renderBossSelect();
            announce('Boss encounters opened!');
        }

        // ==================== PET SHOW / PAGEANT SYSTEM ====================

        function calculateShowScore(pet) {
            const scores = {};

            // Care Quality score (0-100)
            const careScores = { poor: 15, average: 40, good: 70, excellent: 95 };
            scores.care = careScores[pet.careQuality] || 30;

            // Appearance score (based on accessories, pattern, evolution)
            let appearanceScore = 30; // base
            if (pet.accessories && pet.accessories.length > 0) {
                appearanceScore += pet.accessories.length * 12;
            }
            if (pet.pattern !== 'solid') appearanceScore += 10;
            if (pet.evolutionStage === 'evolved') appearanceScore += 25;
            if (pet.careVariant === 'shiny') appearanceScore += 15;
            scores.appearance = Math.min(100, appearanceScore);

            // Happiness score (direct stat)
            scores.happiness = Math.round(pet.happiness);

            // Tricks score (based on care actions / experience)
            const actionsScore = Math.min(100, (pet.careActions || 0) * 2);
            scores.tricks = actionsScore;

            // Bond score (based on relationship level if multi-pet)
            let bondScore = 40; // base
            if (gameState.relationships && pet && pet.id != null) {
                const petId = String(pet.id);
                const rels = Object.entries(gameState.relationships)
                    .filter(([relKey]) => relKey.split('-').includes(petId))
                    .map(([, rel]) => rel);
                if (rels.length > 0) {
                    const bestRel = Math.max(...rels.map(r => r.points || 0));
                    bondScore = Math.min(100, 30 + Math.round(bestRel / 3));
                }
            }
            // Streak bonus
            if (gameState.streak && gameState.streak.current > 0) {
                bondScore = Math.min(100, bondScore + gameState.streak.current * 2);
            }
            scores.bond = bondScore;

            // Calculate weighted total
            let totalScore = 0;
            for (const [catId, catData] of Object.entries(PET_SHOW_CATEGORIES)) {
                totalScore += (scores[catId] || 0) * (catData.weight / 100);
            }
            totalScore = Math.round(totalScore);

            // Determine rank
            let rank = PET_SHOW_RANKS[0];
            for (const r of PET_SHOW_RANKS) {
                if (totalScore >= r.minScore) rank = r;
            }

            return { scores, totalScore, rank };
        }

        function openPetShow() {
            const pet = gameState.pet;
            if (!pet) {
                showToast('You need a pet to enter the show!', '#EF5350');
                return;
            }

            const comp = initCompetitionState();
            const obstacleEntry = chargeCompetitionEntryFee('obstacle');
            if (!obstacleEntry.ok) return;
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay competition-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Pet Show');

            const result = calculateShowScore(pet);
            const petName = getPetDisplayName(pet);

            // Prevent stat farming by enforcing a cooldown between shows
            const now = Date.now();
            const SHOW_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
            const cooldownRemainingMs = comp.lastShowTime ? Math.max(0, SHOW_COOLDOWN_MS - (now - comp.lastShowTime)) : 0;
            const onCooldown = cooldownRemainingMs > 0;
            const cooldownRemainingMinutes = Math.ceil(cooldownRemainingMs / 60000);
            let showRewards = { coins: 0, summary: [] };
            if (!onCooldown) {
                const showEntry = chargeCompetitionEntryFee('show');
                if (!showEntry.ok) return;
                comp.showsEntered++;
                if (result.totalScore > comp.bestShowScore) {
                    comp.bestShowScore = result.totalScore;
                    comp.bestShowRank = result.rank.name;
                }
                if (typeof addJournalEntry === 'function') {
                    if (comp.showsEntered === 1) addJournalEntry('🏅', `${petName} entered their first Pet Show! Rank: ${result.rank.name}`);
                }
                // Reward pet for participating
                const showDifficulty = 0.95 + (result.totalScore / 120);
                const showRewardMult = getCompetitionRewardMultiplier(pet, showDifficulty) * (typeof getRewardCompetitionMultiplier === 'function' ? getRewardCompetitionMultiplier() : 1);
                const showGain = Math.max(6, Math.round(8 * showRewardMult));
                // Report #5: Pet show now includes economy rewards.
                showRewards = buildCompetitionVictoryRewards('show', (COMPETITION_ECONOMY_BALANCE && COMPETITION_ECONOMY_BALANCE.showBaseCoins) || 18, showDifficulty, true);
                if (showRewards.coins > 0) {
                    const award = awardCompetitionCoins(showRewards.coins, { modeId: 'show', outcome: 'win', reason: 'Pet Show Rewards' });
                    showRewards.coins = award.coins || 0;
                    showRewards.summary = [`🪙 ${showRewards.coins} coins`].concat(showRewards.loot ? [`${showRewards.loot.emoji} ${showRewards.loot.name}`] : []);
                }
                pet.happiness = clamp(pet.happiness + showGain, 0, 100);
                pet.careActions = (pet.careActions || 0) + 1;
                comp.lastShowTime = now;
                if (typeof incrementDailyProgress === 'function') {
                    incrementDailyProgress('battleCount', 1);
                    incrementDailyProgress('masteryPoints', 2);
                }
                if (typeof consumeCompetitionRewardModifiers === 'function') consumeCompetitionRewardModifiers();
                if (typeof refreshMasteryTracks === 'function') refreshMasteryTracks();
                saveGame();
            } else {
                showToast(`Pet Show rewards are on cooldown for ${cooldownRemainingMinutes} more minute${cooldownRemainingMinutes === 1 ? '' : 's'}.`, '#FFA726');
            }

            // Generate NPC competitors for flavor
            const npcScores = [
                Math.floor(Math.random() * 40) + 30,
                Math.floor(Math.random() * 50) + 25,
                Math.floor(Math.random() * 45) + 35
            ].sort((a, b) => b - a);

            const leaderboard = [
                { id: 'player', score: result.totalScore },
                ...npcScores.map((score, i) => ({ id: `npc-${i}`, score }))
            ];
            leaderboard.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                if (a.id === 'player') return -1;
                if (b.id === 'player') return 1;
                return 0;
            });
            const placement = leaderboard.findIndex((entry) => entry.id === 'player') + 1;

            overlay.innerHTML = `
                <div class="modal-content competition-modal show-modal">
                    <button class="competition-close-btn" id="show-close" aria-label="Close">&times;</button>
                    <h2 class="competition-title"><span aria-hidden="true">🏆</span> Pet Show Results</h2>
                    ${onCooldown ? `<p class="competition-subtitle">Cooldown active: rewards unavailable for ${cooldownRemainingMinutes} more minute${cooldownRemainingMinutes === 1 ? '' : 's'}.</p>` : ''}
                    <div class="show-pet-display">
                        <span class="show-pet-emoji">${(getAllPetTypeData(pet.type) || {}).emoji || '🐾'}</span>
                        <span class="show-pet-name">${petName}</span>
                    </div>
                    <div class="show-rank">
                        <span class="show-rank-emoji">${result.rank.emoji}</span>
                        <span class="show-rank-name">${result.rank.name}</span>
                        <span class="show-rank-score">${result.totalScore}/100</span>
                    </div>
                    <div class="show-placement">${placement === 1 ? '1st Place!' : placement === 2 ? '2nd Place!' : placement === 3 ? '3rd Place!' : '4th Place'}</div>
                    <div class="show-categories">
                        ${Object.entries(PET_SHOW_CATEGORIES).map(([catId, cat]) => {
                            const score = result.scores[catId] || 0;
                            return `
                                <div class="show-category">
                                    <span class="show-cat-label" id="show-cat-${catId}">${cat.emoji} ${cat.name}</span>
                                    <div class="show-cat-bar" role="progressbar" aria-valuenow="${score}" aria-valuemin="0" aria-valuemax="100" aria-labelledby="show-cat-${catId}" aria-label="${cat.name}: ${score} out of 100">
                                        <div class="show-cat-fill" style="width:${score}%"></div>
                                    </div>
                                    <span class="show-cat-score">${score}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <p class="show-tip">${getShowTip(result.scores)}</p>
                    ${formatVictoryRewardsSummary(showRewards)}
                    <div class="show-stats-summary">Shows entered: ${comp.showsEntered} | Best: ${comp.bestShowRank} (${comp.bestShowScore})${onCooldown ? ` | Cooldown: ${cooldownRemainingMinutes}m` : ''}</div>
                    <div class="battle-result-actions">
                        <button class="competition-btn primary" id="show-done">Done</button>
                        <button class="competition-btn secondary" id="show-back-hub">Back to Hub</button>
                    </div>
                </div>
            `;

            function closeShow() {
                popModalEscape(closeShow);
                if (overlay.parentNode) overlay.remove();
                if (gameState.phase === 'pet') {
                    if (typeof updateNeedDisplays === 'function') updateNeedDisplays();
                    if (typeof updatePetMood === 'function') updatePetMood();
                    if (typeof updateWellnessBar === 'function') updateWellnessBar();
                }
            }

            overlay.querySelector('#show-close').addEventListener('click', closeShow);
            overlay.querySelector('#show-done').addEventListener('click', closeShow);
            overlay.querySelector('#show-back-hub').addEventListener('click', () => { closeShow(); setTimeout(openCompetitionHub, 100); });
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeShow(); });

            document.body.appendChild(overlay);
            pushModalEscape(closeShow);
            trapFocus(overlay);

            showToast(`${result.rank.emoji} Pet Show: ${result.rank.name}! Score: ${result.totalScore}${showRewards.coins > 0 ? ` · +${showRewards.coins}🪙` : ''}`, '#FFD700');
            announce(`Pet show results: ${result.rank.name} with score ${result.totalScore}${showRewards.coins > 0 ? ` and ${showRewards.coins} coin rewards` : ''}.`);
        }

        function getShowTip(scores) {
            const lowest = Object.entries(scores).sort((a, b) => a[1] - b[1])[0];
            const tips = {
                care: 'Tip: Keep all stats high for better care quality!',
                appearance: 'Tip: Add accessories and evolve your pet for better appearance!',
                happiness: 'Tip: Play and interact more to boost happiness!',
                tricks: 'Tip: More care actions help your pet learn more tricks!',
                bond: 'Tip: Build relationships and maintain daily streaks for a stronger bond!'
            };
            return tips[lowest[0]] || 'Keep caring for your pet to improve!';
        }

        // ==================== OBSTACLE COURSE ====================

        function openObstacleCourse() {
            const pet = gameState.pet;
            if (!pet) {
                showToast('You need a pet to run the course!', '#EF5350');
                return;
            }

            const comp = initCompetitionState();
            const rivals = getCompetitionRivalRoster();
            const rivalRuleModifier = getCompetitionRuleModifier('rival');
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay competition-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Obstacle Course');

            let currentStage = 0;
            let totalScore = 0;
            let courseOver = false;
            const stageResults = [];
            const coursePet = { ...pet };

            function renderCourse() {
                const petName = getPetDisplayName(pet);
                const stage = OBSTACLE_COURSE_STAGES[currentStage];
                const progress = Math.round((currentStage / OBSTACLE_COURSE_STAGES.length) * 100);

                overlay.innerHTML = `
                    <div class="modal-content competition-modal obstacle-modal">
                        <button class="competition-close-btn" id="obstacle-close" aria-label="Close">&times;</button>
                        <h2 class="competition-title"><span aria-hidden="true">🏅</span> Obstacle Course</h2>
                        <div class="obstacle-progress">
                            <div class="obstacle-progress-bar">
                                <div class="obstacle-progress-fill" style="width:${progress}%"></div>
                            </div>
                            <span class="obstacle-progress-text">Stage ${currentStage + 1}/${OBSTACLE_COURSE_STAGES.length}</span>
                        </div>
                        <div class="obstacle-stage">
                            <span class="obstacle-stage-emoji">${stage.emoji}</span>
                            <h3 class="obstacle-stage-name">${stage.name}</h3>
                            <p class="obstacle-stage-desc">${stage.description}</p>
                            <p class="obstacle-stage-stat">Tests: ${stage.stat.charAt(0).toUpperCase() + stage.stat.slice(1)} (need ${stage.threshold}+)</p>
                            <p class="obstacle-stage-your-stat">Your ${stage.stat}: ${Math.round(coursePet[stage.stat] || 0)}</p>
                        </div>
                        <div class="obstacle-score">Score: ${totalScore}</div>
                        ${!courseOver ? `
                            <button class="competition-btn primary obstacle-go-btn" id="obstacle-go">
                                <span aria-hidden="true">${stage.emoji}</span> Go!
                            </button>
                        ` : ''}
                        <div class="obstacle-results" id="obstacle-results">
                            ${stageResults.map(r => `
                                <div class="obstacle-result-entry ${r.passed ? 'passed' : 'failed'}">
                                    ${r.emoji} ${r.name}: ${r.passed ? `+${r.points} pts` : 'Failed'}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;

                overlay.querySelector('#obstacle-close').addEventListener('click', closeObstacle);
                if (!overlay._overlayClickBound) {
                    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeObstacle(); });
                    overlay._overlayClickBound = true;
                }

                const goBtn = overlay.querySelector('#obstacle-go');
                if (goBtn) {
                    goBtn.addEventListener('click', attemptStage);
                }
            }

            function attemptStage() {
                if (courseOver) return;
                if (currentStage < 0 || currentStage >= OBSTACLE_COURSE_STAGES.length) return;
                const stage = OBSTACLE_COURSE_STAGES[currentStage];
                const petStat = coursePet[stage.stat] || 0;

                // Success based on stat vs threshold with randomness
                const roll = petStat + (Math.random() * 20 - 10); // +/- 10 random
                const passed = roll >= stage.threshold;

                if (passed) {
                    totalScore += stage.points;
                    stageResults.push({ ...stage, passed: true });
                    // Small stat cost for effort
                    coursePet.energy = clamp(coursePet.energy - 3, 0, 100);
                } else {
                    stageResults.push({ ...stage, passed: false });
                    coursePet.energy = clamp(coursePet.energy - 5, 0, 100);
                }

                currentStage++;
                if (currentStage >= OBSTACLE_COURSE_STAGES.length) {
                    courseOver = true;
                    finishCourse();
                } else {
                    renderCourse();
                }
            }

            function finishCourse() {
                comp.obstacleCompletions++;
                if (totalScore > comp.obstacleBestScore) {
                    comp.obstacleBestScore = totalScore;
                }

                const maxPossible = OBSTACLE_COURSE_STAGES.reduce((s, st) => s + st.points, 0);
                const pct = Math.round((totalScore / maxPossible) * 100);
                const obstacleDifficulty = 0.9 + (pct / 100);
                const obstacleRewardMult = getCompetitionRewardMultiplier(pet, obstacleDifficulty) * (typeof getRewardCompetitionMultiplier === 'function' ? getRewardCompetitionMultiplier() : 1);
                const obstacleGain = Math.max(6, Math.round(9 * obstacleRewardMult));
                // Report #5: Obstacle completion now contributes to economy progression.
                const obstacleRewards = buildCompetitionVictoryRewards('obstacle', (COMPETITION_ECONOMY_BALANCE && COMPETITION_ECONOMY_BALANCE.obstacleBaseCoins) || 16, obstacleDifficulty, true);
                if (obstacleRewards.coins > 0) {
                    const award = awardCompetitionCoins(obstacleRewards.coins, { modeId: 'obstacle', outcome: 'win', reason: 'Obstacle Rewards' });
                    obstacleRewards.coins = award.coins || 0;
                    obstacleRewards.summary = [`🪙 ${obstacleRewards.coins} coins`].concat(obstacleRewards.loot ? [`${obstacleRewards.loot.emoji} ${obstacleRewards.loot.name}`] : []);
                }
                pet.happiness = clamp(pet.happiness + obstacleGain, 0, 100);
                pet.careActions = (pet.careActions || 0) + 1;
                if (typeof incrementDailyProgress === 'function') {
                    incrementDailyProgress('battleCount', 1);
                    incrementDailyProgress('masteryPoints', 2);
                }
                if (typeof consumeCompetitionRewardModifiers === 'function') consumeCompetitionRewardModifiers();
                if (typeof refreshMasteryTracks === 'function') refreshMasteryTracks();
                saveGame();

                let grade = 'D';
                if (pct >= 90) grade = 'S';
                else if (pct >= 75) grade = 'A';
                else if (pct >= 60) grade = 'B';
                else if (pct >= 40) grade = 'C';

                overlay.innerHTML = `
                    <div class="modal-content competition-modal obstacle-modal">
                        <button class="competition-close-btn" id="obstacle-close" aria-label="Close">&times;</button>
                        <h2 class="competition-title"><span aria-hidden="true">🏁</span> Course Complete!</h2>
                        <div class="obstacle-final-grade">Grade: ${grade}</div>
                        <div class="obstacle-final-score">${totalScore}/${maxPossible} points</div>
                        <div class="obstacle-results" id="obstacle-results">
                            ${stageResults.map(r => `
                                <div class="obstacle-result-entry ${r.passed ? 'passed' : 'failed'}">
                                    ${r.emoji} ${r.name}: ${r.passed ? `+${r.points} pts` : 'Failed'}
                                </div>
                            `).join('')}
                        </div>
                        ${formatVictoryRewardsSummary(obstacleRewards)}
                        <div class="show-stats-summary">Completions: ${comp.obstacleCompletions} | Best: ${comp.obstacleBestScore}</div>
                        <div class="battle-result-actions">
                            <button class="competition-btn primary" id="obstacle-done">Done</button>
                            <button class="competition-btn secondary" id="obstacle-back-hub">Back to Hub</button>
                        </div>
                    </div>
                `;

                overlay.querySelector('#obstacle-close').addEventListener('click', closeObstacle);
                overlay.querySelector('#obstacle-done').addEventListener('click', closeObstacle);
                overlay.querySelector('#obstacle-back-hub').addEventListener('click', () => { closeObstacle(); setTimeout(openCompetitionHub, 100); });

                showToast(`🏁 Obstacle Course: Grade ${grade}! ${totalScore} points · +${obstacleRewards.coins}🪙`, '#FFD700');
                announce(`Obstacle course complete. Grade ${grade}. ${totalScore} out of ${maxPossible} points with ${obstacleRewards.coins} coin rewards.`, true);
            }

            function closeObstacle() {
                popModalEscape(closeObstacle);
                if (overlay.parentNode) overlay.remove();
                if (gameState.phase === 'pet') {
                    if (typeof updateNeedDisplays === 'function') updateNeedDisplays();
                    if (typeof updatePetMood === 'function') updatePetMood();
                    if (typeof updateWellnessBar === 'function') updateWellnessBar();
                }
            }

            document.body.appendChild(overlay);
            pushModalEscape(closeObstacle);
            trapFocus(overlay);
            renderCourse();
            announce('Obstacle course started!');
        }

        // ==================== RIVAL TRAINER SYSTEM ====================

        function openRivalTrainers() {
            const pet = gameState.pet;
            if (!pet) {
                showToast('You need a pet to challenge rivals!', '#EF5350');
                return;
            }

            const comp = initCompetitionState();
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay competition-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Rival Trainers');

            function renderTrainerSelect() {
                overlay.innerHTML = `
                    <div class="modal-content competition-modal rival-modal">
                        <button class="competition-close-btn" id="rival-close" aria-label="Close">&times;</button>
                        <h2 class="competition-title"><span aria-hidden="true">🏅</span> Rival Trainers</h2>
                        <p class="competition-subtitle">Defeat trainers to progress! Each one is tougher than the last. Rival record: ${comp.rivalBattlesWon}W / ${comp.rivalBattlesLost}L.${rivalRuleModifier && rivalRuleModifier.name ? ` Rule: ${rivalRuleModifier.name}.` : ''}</p>
                        <div class="rival-list">
                            ${rivals.map((trainer, idx) => {
                                const isDefeated = comp.rivalsDefeated.includes(idx);
                                const minDefeated = Math.max(0, Number(trainer.minRivalsDefeated) || 0);
                                const gateIndex = Number.isFinite(trainer.unlockAfterIndex) ? Math.max(0, Math.floor(trainer.unlockAfterIndex)) : idx;
                                const gateLocked = gateIndex > comp.currentRivalIndex && !isDefeated;
                                const progressLocked = comp.rivalsDefeated.length < minDefeated && !isDefeated;
                                const isLocked = gateLocked || progressLocked;
                                const isNext = !isLocked && (idx === comp.currentRivalIndex || !!trainer.variantOf);
                                return `
                                    <button class="rival-card ${isDefeated ? 'defeated' : ''} ${isNext ? 'next' : ''} ${isLocked ? 'locked' : ''}"
                                            data-rival="${idx}" ${isLocked ? 'disabled' : ''}
                                            aria-label="${trainer.name}, ${trainer.title}. ${isDefeated ? 'Defeated' : isNext ? 'Available to challenge' : 'Locked'}. Pet: ${trainer.petName}">
                                        <span class="rival-emoji">${trainer.emoji}</span>
                                        <div class="rival-info">
                                            <span class="rival-name">${trainer.name}</span>
                                            <span class="rival-title">${trainer.title}</span>
                                            <span class="rival-pet">${PET_TYPES[trainer.petType] ? PET_TYPES[trainer.petType].emoji : '?'} ${trainer.petName}</span>
                                            ${trainer.rematchTier ? `<span class="rival-title">Rematch Tier ${trainer.rematchTier}</span>` : ''}
                                        </div>
                                        <div class="rival-status">
                                            ${isDefeated ? '<span class="rival-badge defeated-badge">Defeated!</span>' :
                                              isNext ? '<span class="rival-badge next-badge">Challenge!</span>' :
                                              '<span class="rival-badge locked-badge">Locked</span>'}
                                        </div>
                                    </button>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;

                overlay.querySelector('#rival-close').addEventListener('click', closeRivalUI);
                if (!overlay._overlayClickBound) {
                    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeRivalUI(); });
                    overlay._overlayClickBound = true;
                }

                overlay.querySelectorAll('.rival-card:not([disabled])').forEach(card => {
                    card.addEventListener('click', () => {
                        const rivalIdx = parseInt(card.dataset.rival);
                        startRivalBattle(rivalIdx);
                    });
                });
            }

            function startRivalBattle(rivalIdx) {
                const rivalEntry = chargeCompetitionEntryFee('rival');
                if (!rivalEntry.ok) return;
                const trainer = rivals[rivalIdx];
                if (!trainer) return;
                const activeRivalModifier = getCompetitionRuleModifier('rival');
                const rivalHpMult = Math.max(0.75, Number(activeRivalModifier && activeRivalModifier.effect && activeRivalModifier.effect.rivalHpMultiplier) || 1);

                // Create rival pet from trainer data
                const rivalPet = {
                    ...trainer.stats,
                    type: trainer.petType,
                    name: trainer.petName,
                    growthStage: rivalIdx < 3 ? 'child' : 'adult',
                    careQuality: rivalIdx < 2 ? 'average' : rivalIdx < 5 ? 'good' : 'excellent',
                    evolutionStage: rivalIdx >= 6 ? 'evolved' : 'base'
                };

                const playerMaxHP = calculateBattleHP(pet);
                const rivalMaxHP = Math.max(1, Math.round(Math.max(calculateBattleHP(rivalPet), trainer.battleHP || 0) * rivalHpMult));
                let playerHP = playerMaxHP;
                let rivalHP = rivalMaxHP;
                let fightOver = false;

                function renderRivalFight() {
                    const petName = getPetDisplayName(pet);
                    const playerPct = Math.max(0, Math.round((playerHP / playerMaxHP) * 100));
                    const rivalPct = Math.max(0, Math.round((rivalHP / rivalMaxHP) * 100));

                    overlay.innerHTML = `
                        <div class="modal-content competition-modal rival-fight-modal">
                            <button class="competition-close-btn" id="rival-fight-close" aria-label="Close">&times;</button>
                            <h2 class="competition-title">
                                <span aria-hidden="true">${trainer.emoji}</span> VS ${trainer.name}${activeRivalModifier && activeRivalModifier.name ? ` · ${activeRivalModifier.name}` : ''}
                            </h2>
                            <div class="battle-field">
                                <div class="battle-pet player-pet">
                                    <span class="battle-pet-name">${petName}</span>
                                    <span class="battle-pet-emoji">${(getAllPetTypeData(pet.type) || {}).emoji || '🐾'}</span>
                                    <div class="battle-hp-bar" role="progressbar" aria-valuenow="${playerPct}" aria-valuemin="0" aria-valuemax="100" aria-label="${petName} HP: ${playerHP} of ${playerMaxHP}"><div class="battle-hp-fill player-hp" style="width:${playerPct}%"></div></div>
                                    <span class="battle-hp-text">${playerHP}/${playerMaxHP} HP</span>
                                </div>
                                <span class="battle-vs">VS</span>
                                <div class="battle-pet opponent-pet">
                                    <span class="battle-pet-name">${trainer.petName}</span>
                                    <span class="battle-pet-emoji">${PET_TYPES[trainer.petType] ? PET_TYPES[trainer.petType].emoji : '?'}</span>
                                    <div class="battle-hp-bar" role="progressbar" aria-valuenow="${rivalPct}" aria-valuemin="0" aria-valuemax="100" aria-label="${trainer.petName} HP: ${rivalHP} of ${rivalMaxHP}"><div class="battle-hp-fill opponent-hp" style="width:${rivalPct}%"></div></div>
                                    <span class="battle-hp-text">${rivalHP}/${rivalMaxHP} HP</span>
                                </div>
                            </div>
                            <div class="battle-log" id="rival-log" aria-live="polite"></div>
                            <div class="battle-moves" id="rival-moves">
                                ${Object.entries(BATTLE_MOVES).map(([id, move]) => `
                                    <button class="battle-move-btn" data-move="${id}" ${fightOver ? 'disabled' : ''}>
                                        <span class="battle-move-emoji" aria-hidden="true">${move.emoji}</span>
                                        <span class="battle-move-name">${move.name}</span>
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    `;

                    overlay.querySelector('#rival-fight-close').addEventListener('click', closeRivalUI);
                    if (!fightOver) {
                        overlay.querySelectorAll('.battle-move-btn').forEach(btn => {
                            btn.addEventListener('click', () => executeRivalTurn(btn.dataset.move));
                        });
                    }
                }

                const _rivalLogHistory = [];
                let rivalTurnLocked = false;
                function rivalLog(msg) {
                    _rivalLogHistory.push(msg);
                    const log = overlay.querySelector('#rival-log');
                    if (log) {
                        const entry = document.createElement('div');
                        entry.className = 'battle-log-entry';
                        entry.textContent = msg;
                        log.appendChild(entry);
                        log.scrollTop = log.scrollHeight;
                    }
                }
                function restoreRivalLog() {
                    const log = overlay.querySelector('#rival-log');
                    if (log) log.innerHTML = '';
                    restoreLog('#rival-log', _rivalLogHistory, null, overlay);
                }

                function executeRivalTurn(moveId) {
                    if (fightOver || rivalTurnLocked) return;
                    rivalTurnLocked = true;
                    const move = BATTLE_MOVES[moveId];
                    if (!move) {
                        rivalTurnLocked = false;
                        return;
                    }
                    const petName = getPetDisplayName(pet);

                    // Player attack
                    if (move.heal) {
                        playerHP = Math.min(playerMaxHP, playerHP + move.heal);
                        rivalLog(`${petName} rests and recovers ${move.heal} HP!`);
                    } else {
                        const dmg = calculateMoveDamage(move, pet, rivalPet);
                        rivalHP = Math.max(0, rivalHP - dmg);
                        rivalLog(`${petName} uses ${move.name}! Deals ${dmg} damage!`);
                    }

                    if (rivalHP <= 0) {
                        fightOver = true;
                        renderRivalFight();
                        restoreRivalLog();
                        rivalLog(`${trainer.petName} is defeated! ${trainer.winMessage}`);
                        endRivalFight(rivalIdx, true);
                        rivalTurnLocked = false;
                        return;
                    }

                    // Rival AI turn (slightly smarter based on difficulty)
                    const aiMove = selectAIMove(rivalPet, rivalHP, rivalMaxHP);
                    if (aiMove.heal) {
                        rivalHP = Math.min(rivalMaxHP, rivalHP + aiMove.heal);
                        rivalLog(`${trainer.petName} rests and recovers ${aiMove.heal} HP!`);
                    } else {
                        const aiDmg = calculateMoveDamage(aiMove, rivalPet, pet);
                        // Scale damage by difficulty
                        const scaledDmg = Math.round(aiDmg * (1 + trainer.difficulty * 0.08));
                        playerHP = Math.max(0, playerHP - scaledDmg);
                        rivalLog(`${trainer.petName} uses ${aiMove.name}! Deals ${scaledDmg} damage!`);
                    }

                    if (playerHP <= 0) {
                        fightOver = true;
                        renderRivalFight();
                        restoreRivalLog();
                        rivalLog(`${petName} is defeated! ${trainer.loseMessage}`);
                        endRivalFight(rivalIdx, false);
                        rivalTurnLocked = false;
                        return;
                    }

                    renderRivalFight();
                    restoreRivalLog();
                    rivalTurnLocked = false;
                }

                function endRivalFight(rivalIdx, won) {
                    const comp = initCompetitionState();
                    const rivalDifficulty = 1 + ((trainer.difficulty + Math.max(0, Number(trainer.rematchTier) || 0)) * 0.14);
                    const rewardMult = getCompetitionRewardMultiplier(pet, rivalDifficulty) * (typeof getRewardCompetitionMultiplier === 'function' ? getRewardCompetitionMultiplier() : 1);
                    const roomCompPct = Math.round((((typeof getRoomSystemMultiplier === 'function') ? getRoomSystemMultiplier('competition') : 1) - 1) * 100);
                    let rivalRewards = { coins: 0, summary: [] };
                    if (won) {
                        comp.rivalBattlesWon++;
                        recordCompetitionRotation('rivals', trainer.id || rivalIdx);
                        const isFirstDefeat = !comp.rivalsDefeated.includes(rivalIdx);
                        if (isFirstDefeat) {
                            comp.rivalsDefeated.push(rivalIdx);
                        }
                        if (!trainer.variantOf && rivalIdx >= comp.currentRivalIndex) {
                            comp.currentRivalIndex = rivalIdx + 1;
                        }
                        const happyGain = Math.max(8, Math.round((8 + trainer.difficulty * 1.8) * rewardMult));
                        // Report #5: Rival victories now award coins and possible tradable loot.
                        rivalRewards = buildCompetitionVictoryRewards('rival', (COMPETITION_ECONOMY_BALANCE && COMPETITION_ECONOMY_BALANCE.rivalWinBaseCoins) || 22, rivalDifficulty, true);
                        if (rivalRewards.coins > 0) {
                            const modCoinMult = Math.max(0.5, Number(activeRivalModifier && activeRivalModifier.effect && activeRivalModifier.effect.coinMultiplier) || 1);
                            const award = awardCompetitionCoins(Math.max(0, Math.round(rivalRewards.coins * modCoinMult)), { modeId: 'rival', outcome: 'win', targetId: rivalIdx, reason: 'Rival Victory' });
                            rivalRewards.coins = award.coins || 0;
                            rivalRewards.summary = [`🪙 ${rivalRewards.coins} coins`].concat(rivalRewards.loot ? [`${rivalRewards.loot.emoji} ${rivalRewards.loot.name}`] : []);
                        }
                        pet.happiness = clamp(pet.happiness + happyGain, 0, 100);
                        pet.careActions = (pet.careActions || 0) + 1;
                        setTimeout(() => {
                            const roomText = roomCompPct > 0 ? ` (room +${roomCompPct}%)` : '';
                            showToast(`🏅 Defeated ${trainer.name}! +${happyGain} Happiness, +${rivalRewards.coins}🪙${roomText}!`, '#FFD700');
                            announce(`Victory! Rival ${trainer.name} defeated. Rewards include ${happyGain} happiness and ${rivalRewards.coins} coins${roomText}.`, true);
                        }, 500);
                    } else {
                        comp.rivalBattlesLost++;
                        setTimeout(() => {
                            showToast(`Defeat. ${trainer.name} offered no rewards.`, '#64B5F6');
                            announce(`Defeat. ${trainer.name} offered no rewards.`, true);
                        }, 500);
                    }
                    if (won && typeof incrementDailyProgress === 'function') {
                        incrementDailyProgress('battleCount', 1);
                        incrementDailyProgress('masteryPoints', 3);
                    }
                    if (typeof consumeCompetitionRewardModifiers === 'function') consumeCompetitionRewardModifiers();
                    if (typeof refreshMasteryTracks === 'function') refreshMasteryTracks();
                    saveGame();

                    setTimeout(() => {
                        const resultDiv = document.createElement('div');
                        resultDiv.className = 'battle-result';
                        resultDiv.innerHTML = `
                            <div class="battle-result-content">
                                <h3>${won ? '🏅 Rival Defeated!' : '😢 Defeat'}</h3>
                                <p>${won ? trainer.winMessage : trainer.loseMessage}</p>
                                ${formatVictoryRewardsSummary(rivalRewards)}
                                <p class="battle-stats-summary">Rivals defeated: ${comp.rivalsDefeated.length}/${rivals.length} | Rival record: ${comp.rivalBattlesWon}W / ${comp.rivalBattlesLost}L</p>
                                <div class="battle-result-actions">
                                    <button class="competition-btn primary" id="rival-done">Done</button>
                                    <button class="competition-btn secondary" id="rival-back-hub">Back to Hub</button>
                                </div>
                            </div>
                        `;
                        const modal = overlay.querySelector('.rival-fight-modal');
                        if (modal) modal.appendChild(resultDiv);
                        const doneBtn = overlay.querySelector('#rival-done');
                        if (doneBtn) doneBtn.addEventListener('click', () => {
                            closeRivalUI();
                        });
                        const hubBtn3 = overlay.querySelector('#rival-back-hub');
                        if (hubBtn3) hubBtn3.addEventListener('click', () => { closeRivalUI(); setTimeout(openCompetitionHub, 100); });
                    }, 800);
                }

                renderRivalFight();
                restoreRivalLog();
            }

            function closeRivalUI() {
                popModalEscape(closeRivalUI);
                if (overlay.parentNode) overlay.remove();
                if (gameState.phase === 'pet') {
                    if (typeof updateNeedDisplays === 'function') updateNeedDisplays();
                    if (typeof updatePetMood === 'function') updatePetMood();
                    if (typeof updateWellnessBar === 'function') updateWellnessBar();
                }
            }

            document.body.appendChild(overlay);
            pushModalEscape(closeRivalUI);
            trapFocus(overlay);
            renderTrainerSelect();
            announce('Rival trainers opened!');
        }

        // ==================== COMPETITION HUB ====================

        function openCompetitionHub() {
            const pet = gameState.pet;
            if (!pet) {
                showToast('You need a pet to compete!', '#EF5350');
                return;
            }

            const comp = initCompetitionState();
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay competition-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Competition Hub');

            const season = gameState.season || getCurrentSeason();
            const seasonData = SEASONS[season];
            const bossCount = Object.keys(comp.bossesDefeated).length;
            const totalBosses = Object.keys(BOSS_ENCOUNTERS).length;
            const mastery = typeof refreshMasteryTracks === 'function' ? refreshMasteryTracks() : (gameState.mastery || null);
            const compMastery = mastery && mastery.competitionSeason ? mastery.competitionSeason : { rank: 1, title: 'Bronze Circuit' };
            const rc = (comp.rewardControl && comp.rewardControl.daily) ? comp.rewardControl.daily : { earnedCoins: 0, entriesUsed: 0 };
            const compSoftCap = Math.max(10, Math.floor(Number((COMPETITION_ECONOMY_BALANCE && COMPETITION_ECONOMY_BALANCE.dailySoftCapCoins) || 220)));

            overlay.innerHTML = `
                <div class="modal-content competition-modal hub-modal">
                    <button class="competition-close-btn" id="hub-close" aria-label="Close">&times;</button>
                    <h2 class="competition-title"><span aria-hidden="true">🏟️</span> Competition Hub</h2>
                    <p class="competition-subtitle">${seasonData.icon} ${seasonData.name} Season · Rank ${compMastery.rank} ${compMastery.title}</p>
                    <p class="competition-subtitle" style="font-size:0.82rem;opacity:0.9;">${Math.max(0, rc.entriesUsed || 0)} entries today · ${Math.max(0, rc.earnedCoins || 0)}/${compSoftCap} coin soft cap · Repeat runs pay less for a while.</p>
                    <div class="hub-menu">
                        <button class="hub-option" id="hub-battle">
                            <span class="hub-option-emoji">⚔️</span>
                            <div class="hub-option-info">
                                <span class="hub-option-name">Pet Battle</span>
                                <span class="hub-option-desc">Battle a random opponent!</span>
                                <span class="hub-option-stat">${comp.battlesWon}W / ${comp.battlesLost}L</span>
                            </div>
                        </button>
                        <button class="hub-option" id="hub-boss">
                            <span class="hub-option-emoji">👹</span>
                            <div class="hub-option-info">
                                <span class="hub-option-name">Boss Encounter</span>
                                <span class="hub-option-desc">Fight seasonal bosses with your team!</span>
                                <span class="hub-option-stat">${bossCount}/${totalBosses} defeated</span>
                            </div>
                        </button>
                        <button class="hub-option" id="hub-show">
                            <span class="hub-option-emoji">🏆</span>
                            <div class="hub-option-info">
                                <span class="hub-option-name">Pet Show</span>
                                <span class="hub-option-desc">Enter a pageant and get judged!</span>
                                <span class="hub-option-stat">${comp.bestShowRank ? `Best: ${comp.bestShowRank} (${comp.bestShowScore})` : 'Not entered yet'}</span>
                            </div>
                        </button>
                        <button class="hub-option" id="hub-obstacle">
                            <span class="hub-option-emoji">🏅</span>
                            <div class="hub-option-info">
                                <span class="hub-option-name">Obstacle Course</span>
                                <span class="hub-option-desc">Test all your pet's stats!</span>
                                <span class="hub-option-stat">${comp.obstacleBestScore > 0 ? `Best: ${comp.obstacleBestScore} pts` : 'Not attempted yet'}</span>
                            </div>
                        </button>
                        <button class="hub-option" id="hub-rivals">
                            <span class="hub-option-emoji">🎯</span>
                            <div class="hub-option-info">
                                <span class="hub-option-name">Rival Trainers</span>
                                <span class="hub-option-desc">Challenge escalating rivals!</span>
                                <span class="hub-option-stat">${comp.rivalsDefeated.length}/${RIVAL_TRAINERS.length} defeated | ${comp.rivalBattlesWon}W / ${comp.rivalBattlesLost}L</span>
                            </div>
                        </button>
                    </div>
                </div>
            `;

            function closeHub() {
                popModalEscape(closeHub);
                if (overlay.parentNode) overlay.remove();
            }

            overlay.querySelector('#hub-close').addEventListener('click', closeHub);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeHub(); });

            overlay.querySelector('#hub-battle').addEventListener('click', () => { closeHub(); openBattleArena(); });
            overlay.querySelector('#hub-boss').addEventListener('click', () => { closeHub(); openBossEncounter(); });
            overlay.querySelector('#hub-show').addEventListener('click', () => { closeHub(); openPetShow(); });
            overlay.querySelector('#hub-obstacle').addEventListener('click', () => { closeHub(); openObstacleCourse(); });
            overlay.querySelector('#hub-rivals').addEventListener('click', () => { closeHub(); openRivalTrainers(); });

            document.body.appendChild(overlay);
            pushModalEscape(closeHub);
            trapFocus(overlay);
            announce('Competition hub opened!');
        }

        (function installCompetitionEconomyDebugHook() {
            if (typeof window === 'undefined') return;
            if (!window.__debugEconomy || typeof window.__debugEconomy !== 'object') window.__debugEconomy = {};
            window.__debugEconomy.testCompetitionCaps = function testCompetitionCaps() {
                try {
                    const comp = initCompetitionState();
                    const eco = (typeof ensureEconomyState === 'function') ? ensureEconomyState() : (gameState.economy || {});
                    const beforeCoins = Number(eco.coins || 0);
                    const snapshot = JSON.parse(JSON.stringify(comp.rewardControl || {}));
                    comp.rewardControl = {
                        daily: { dayKey: getCompetitionDayKey(), earnedCoins: 0, lossConsolationCoins: 0, entryFeesPaid: 0, entriesUsed: 0 },
                        perMode: {},
                        bossFirstClearPaid: {},
                        rivalFirstClearPaid: {},
                        lastCapToastAt: 0
                    };
                    const runs = [];
                    for (let i = 0; i < 8; i++) {
                        const result = awardCompetitionCoins(30, { modeId: 'battle', outcome: 'win', reason: 'Debug Competition' });
                        runs.push({ run: i + 1, coins: result.coins, multipliers: result.multipliers || [] });
                    }
                    const lossRuns = [];
                    for (let i = 0; i < 6; i++) {
                        const result = awardCompetitionCoins(4, { modeId: 'battle', outcome: 'loss', reason: 'Debug Consolation' });
                        lossRuns.push({ run: i + 1, coins: result.coins, multipliers: result.multipliers || [] });
                    }
                    const afterCoins = Number(eco.coins || 0);
                    eco.coins = beforeCoins; // restore test side effects
                    if (comp.rewardControl) comp.rewardControl = snapshot;
                    const output = {
                        ok: true,
                        battleRuns: runs,
                        lossRuns: lossRuns,
                        totalAwarded: Math.max(0, afterCoins - beforeCoins)
                    };
                    console.log('[DEBUG_ECONOMY] testCompetitionCaps', output);
                    return output;
                } catch (e) {
                    console.error('[DEBUG_ECONOMY] testCompetitionCaps failed', e);
                    return { ok: false, error: String(e && e.message || e) };
                }
            };
        }());

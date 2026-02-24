// ============================================================
// achievements.js  –  Achievement checking, daily checklist,
//   post-cap mastery, mastery rank perks, goal ladder,
//   memory hooks, local reminders, badges, stickers,
//   trophies, and daily streaks
// Extracted from game.js (lines 2610-3641)
// ============================================================

        // ==================== ACHIEVEMENT SYSTEM ====================

        function checkAchievements() {
            if (!gameState.achievements) gameState.achievements = {};
            const newUnlocks = [];
            for (const [id, ach] of Object.entries(ACHIEVEMENTS)) {
                if (gameState.achievements[id]) continue; // Already unlocked
                try {
                    if (ach.check(gameState)) {
                        gameState.achievements[id] = { unlocked: true, unlockedAt: Date.now() };
                        newUnlocks.push(ach);
                        addJournalEntry('🏆', `Achievement unlocked: ${ach.name}!`);
                    }
                } catch (e) { /* safe guard */ }
            }
            return newUnlocks;
        }

        function getAchievementCount() {
            if (!gameState.achievements) return 0;
            return Object.values(gameState.achievements).filter(a => a.unlocked).length;
        }

        // ==================== DAILY CHECKLIST ====================

        function getTodayString() {
            const d = new Date();
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }

        function getCurrentMonthKey() {
            const d = new Date();
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }

        function getWeekKey() {
            const d = new Date();
            const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
            const day = utc.getUTCDay() || 7;
            utc.setUTCDate(utc.getUTCDate() + 4 - day);
            const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
            const weekNo = Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
            return `${utc.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
        }

        function getStageRank(stage) {
            const order = ['baby', 'child', 'adult', 'elder'];
            const idx = order.indexOf(stage);
            return idx === -1 ? 0 : idx;
        }

        function canUseWildcardTask(task, stage) {
            if (!task || !task.minStage) return true;
            return getStageRank(stage) >= getStageRank(task.minStage);
        }

        function hashDailySeed(seed) {
            if (typeof hashStringToUint === 'function') return hashStringToUint(seed);
            let h = 2166136261 >>> 0;
            const s = String(seed || '');
            for (let i = 0; i < s.length; i++) {
                h ^= s.charCodeAt(i);
                h = Math.imul(h, 16777619);
            }
            return h >>> 0;
        }

        function getDailyModeUsageCounts() {
            const minigameCounts = gameState.minigamePlayCounts || {};
            const minigameTotal = Object.values(minigameCounts).reduce((sum, value) => sum + (Number(value) || 0), 0);
            const garden = gameState.garden || {};
            const exploration = gameState.exploration || {};
            const exStats = exploration.stats || {};
            const comp = gameState.competition || {};
            const battleTotal = Math.max(0, Number(comp.battlesWon || 0)) + Math.max(0, Number(comp.battlesLost || 0));
            return {
                minigameCount: minigameTotal,
                harvestCount: Math.max(0, Number(garden.totalHarvests || 0)),
                parkVisits: Math.max(0, Number(gameState.parkVisitCount || gameState.parkVisits || 0)),
                expeditionCount: Math.max(0, Number(exStats.expeditionsCompleted || 0)),
                battleCount: battleTotal
            };
        }

        function getRecentDailyModeTaskIds() {
            const history = Array.isArray(gameState._dailyModeTaskHistory) ? gameState._dailyModeTaskHistory : [];
            const recent = history.slice(-3);
            const ids = new Set();
            recent.forEach((entry) => {
                (entry && Array.isArray(entry.ids) ? entry.ids : []).forEach((id) => ids.add(id));
            });
            return ids;
        }

        function pickDailyModeTasks(dateKey) {
            const pool = Array.isArray(DAILY_MODE_TASKS) ? [...DAILY_MODE_TASKS] : [];
            if (pool.length <= 2) return pool;
            const usage = getDailyModeUsageCounts();
            const recentIds = getRecentDailyModeTaskIds();
            const selected = [];
            let seed = hashDailySeed(`mode:${dateKey}`);
            while (pool.length > 0 && selected.length < 2) {
                const trackValues = pool.map((task) => Math.max(0, Number(usage[task.trackKey]) || 0));
                const minUsage = trackValues.length > 0 ? Math.min(...trackValues) : 0;
                const weights = pool.map((task) => {
                    const count = Math.max(0, Number(usage[task.trackKey]) || 0);
                    const underuseBoost = 1 + Math.max(0, (minUsage + 8 - count)) * 0.08;
                    const repeatPenalty = recentIds.has(task.id) ? 0.68 : 1;
                    return Math.max(0.25, underuseBoost * repeatPenalty);
                });
                const totalWeight = weights.reduce((sum, w) => sum + w, 0);
                let pick = totalWeight > 0 ? ((seed >>> 0) / 4294967296) * totalWeight : 0;
                let idx = 0;
                for (; idx < pool.length - 1; idx++) {
                    pick -= weights[idx];
                    if (pick <= 0) break;
                }
                selected.push(pool.splice(idx, 1)[0]);
                seed = Math.imul(seed ^ 0x9E3779B9, 1664525) >>> 0;
            }
            if (!Array.isArray(gameState._dailyModeTaskHistory)) gameState._dailyModeTaskHistory = [];
            gameState._dailyModeTaskHistory.push({
                date: String(dateKey || ''),
                ids: selected.map((task) => task.id)
            });
            if (gameState._dailyModeTaskHistory.length > 14) {
                gameState._dailyModeTaskHistory = gameState._dailyModeTaskHistory.slice(-14);
            }
            if (typeof balanceDebugLog === 'function') {
                balanceDebugLog('DailyTaskModeSelection', {
                    dateKey,
                    selected: selected.map((task) => ({ id: task.id, trackKey: task.trackKey })),
                    usage
                });
            }
            return selected;
        }

        function pickDailyWildcardTask(stage, dateKey) {
            const pool = (Array.isArray(DAILY_WILDCARD_TASKS) ? DAILY_WILDCARD_TASKS : []).filter((task) => canUseWildcardTask(task, stage));
            if (pool.length === 0) return null;
            const idx = hashDailySeed(`wild:${dateKey}:${stage}`) % pool.length;
            return pool[idx];
        }

        function buildDailyTaskEntry(task, stage) {
            const source = task || {};
            const target = typeof getDailyTaskTarget === 'function' ? getDailyTaskTarget(source, stage) : (source.target || 1);
            return {
                id: source.id || `task_${Date.now()}`,
                icon: source.icon || '📌',
                lane: source.lane || 'mode',
                trackKey: source.trackKey || 'totalCareActions',
                target,
                done: false,
                _partialClaims: {},
                name: typeof getDailyTaskName === 'function' ? getDailyTaskName(source, target) : (source.name || 'Daily task')
            };
        }

        function getRewardPhaseStage() {
            const stage = gameState && gameState.pet && gameState.pet.growthStage;
            return GROWTH_STAGES[stage] ? stage : 'baby';
        }

        function grantPhaseModifier(stage, laneKey, sourceLabel) {
            const modifierId = (typeof getPhaseModifierForLane === 'function') ? getPhaseModifierForLane(stage, laneKey) : null;
            if (!modifierId) return null;
            return addGameplayModifier(modifierId, sourceLabel || 'Phase Reward');
        }

        function pickStageWeightedPrestigeReward(rewards, stage, seedKey) {
            const pool = Array.isArray(rewards) ? rewards : [];
            if (pool.length === 0) return null;
            const weights = (typeof getStageWeightedPrestigeWeights === 'function') ? getStageWeightedPrestigeWeights(stage) : {};
            const weighted = pool.map((reward) => {
                const modifier = reward && reward.modifierId;
                const w = Math.max(1, Number(weights[modifier] || 1));
                return { reward, weight: w };
            });
            const total = weighted.reduce((sum, row) => sum + row.weight, 0);
            if (total <= 0) return weighted[0].reward;
            let roll = hashDailySeed(seedKey) % total;
            for (const row of weighted) {
                roll -= row.weight;
                if (roll < 0) return row.reward;
            }
            return weighted[weighted.length - 1].reward;
        }

        function addGameplayModifier(modifierId, source) {
            if (!modifierId || !REWARD_MODIFIERS || !REWARD_MODIFIERS[modifierId]) return null;
            if (!Array.isArray(gameState.rewardModifiers)) gameState.rewardModifiers = [];
            const now = Date.now();
            gameState.rewardModifiers = gameState.rewardModifiers.filter((m) => !m.expiresAt || m.expiresAt > now);
            const def = REWARD_MODIFIERS[modifierId];
            const effect = def.effect || {};
            const modifier = {
                id: `${modifierId}:${now}`,
                typeId: modifierId,
                name: def.name,
                emoji: def.emoji,
                source: source || 'Reward',
                createdAt: now,
                expiresAt: effect.durationMs ? (now + effect.durationMs) : null,
                remainingActions: Number.isFinite(effect.remainingActions) ? Math.max(0, effect.remainingActions) : null,
                remainingMatches: Number.isFinite(effect.remainingMatches) ? Math.max(0, effect.remainingMatches) : null,
                nextExpeditionBonusRolls: Number.isFinite(effect.rolls) ? Math.max(0, effect.rolls) : 0
            };
            gameState.rewardModifiers.push(modifier);
            return modifier;
        }

        function cleanupRewardModifiers() {
            if (!Array.isArray(gameState.rewardModifiers)) {
                gameState.rewardModifiers = [];
                return [];
            }
            const now = Date.now();

            // Recommendation #6: Modifier expiry coin conversion
            // When a modifier expires with unused actions/duration, convert leftovers into coins
            let expiryCoins = 0;
            gameState.rewardModifiers.forEach((modifier) => {
                if (!modifier.expiresAt || modifier.expiresAt > now) return; // not expired
                // Convert unused remaining actions: 1 coin per unused action (careRush-style)
                if (typeof modifier.remainingActions === 'number' && modifier.remainingActions > 0) {
                    expiryCoins += modifier.remainingActions;
                }
                // Convert unused remaining time: 1 coin per 5 min remaining (happyHour-style)
                if (modifier.expiresAt && modifier.expiresAt > now) {
                    const remainingMs = modifier.expiresAt - now;
                    expiryCoins += Math.floor(remainingMs / (5 * 60 * 1000));
                }
            });
            if (expiryCoins > 0) {
                addCoins(expiryCoins, 'Modifier Expiry', true);
                if (typeof showToast === 'function') showToast(`🪙 +${expiryCoins} coins from expired modifiers`, '#FFD700');
            }

            gameState.rewardModifiers = gameState.rewardModifiers.filter((modifier) => !modifier.expiresAt || modifier.expiresAt > now);
            return gameState.rewardModifiers;
        }

        function getModifierEffect(modifier) {
            if (!modifier || !modifier.typeId || !REWARD_MODIFIERS || !REWARD_MODIFIERS[modifier.typeId]) return null;
            return REWARD_MODIFIERS[modifier.typeId].effect || null;
        }

        function getRewardCareGainMultiplier() {
            let mult = 1;
            cleanupRewardModifiers().forEach((modifier) => {
                const effect = getModifierEffect(modifier);
                if (!effect || effect.type !== 'careGainMultiplier') return;
                mult *= Math.max(1, Number(effect.multiplier) || 1);
            });
            mult *= (1 + getMasteryCareGainBonus());
            return mult;
        }

        function getRewardHappinessFlatBonus() {
            let total = 0;
            cleanupRewardModifiers().forEach((modifier) => {
                const effect = getModifierEffect(modifier);
                if (!effect || effect.type !== 'happinessFlatBonus') return;
                total += Math.max(0, Number(effect.value) || 0);
            });
            return total;
        }

        function consumeCareActionRewardModifiers() {
            cleanupRewardModifiers().forEach((modifier) => {
                if (typeof modifier.remainingActions !== 'number') return;
                modifier.remainingActions = Math.max(0, modifier.remainingActions - 1);
            });
            // Recommendation #6: Convert remaining time on action-exhausted modifiers
            let expiryCoins = 0;
            gameState.rewardModifiers.forEach((modifier) => {
                if (modifier.remainingActions !== null && modifier.remainingActions <= 0 && modifier.expiresAt) {
                    const now = Date.now();
                    if (modifier.expiresAt > now) {
                        expiryCoins += Math.floor((modifier.expiresAt - now) / (5 * 60 * 1000));
                    }
                }
            });
            if (expiryCoins > 0) {
                addCoins(expiryCoins, 'Modifier Expiry', true);
            }
            gameState.rewardModifiers = gameState.rewardModifiers.filter((modifier) => modifier.remainingActions === null || modifier.remainingActions > 0);
        }

        function consumeExpeditionRewardBonusRolls() {
            let rolls = 0;
            cleanupRewardModifiers().forEach((modifier) => {
                if (typeof modifier.nextExpeditionBonusRolls !== 'number' || modifier.nextExpeditionBonusRolls <= 0) return;
                rolls += modifier.nextExpeditionBonusRolls;
                modifier.nextExpeditionBonusRolls = 0;
            });
            gameState.rewardModifiers = gameState.rewardModifiers.filter((modifier) => !(typeof modifier.nextExpeditionBonusRolls === 'number' && modifier.nextExpeditionBonusRolls <= 0 && !modifier.expiresAt && modifier.remainingActions === null && modifier.remainingMatches === null));
            rolls += getMasteryExpeditionRollBonus();
            return rolls;
        }

        function getRewardCompetitionMultiplier() {
            let mult = 1;
            cleanupRewardModifiers().forEach((modifier) => {
                const effect = getModifierEffect(modifier);
                if (!effect || effect.type !== 'competitionRewardMultiplier') return;
                mult *= Math.max(1, Number(effect.multiplier) || 1);
            });
            mult *= (1 + getMasteryCompetitionPayoutBonus());
            return mult;
        }

        function consumeCompetitionRewardModifiers() {
            cleanupRewardModifiers().forEach((modifier) => {
                if (typeof modifier.remainingMatches !== 'number') return;
                modifier.remainingMatches = Math.max(0, modifier.remainingMatches - 1);
            });
            gameState.rewardModifiers = gameState.rewardModifiers.filter((modifier) => modifier.remainingMatches === null || modifier.remainingMatches > 0);
        }

        function getRewardRelationshipMultiplier() {
            let mult = 1;
            cleanupRewardModifiers().forEach((modifier) => {
                const effect = getModifierEffect(modifier);
                if (!effect || effect.type !== 'relationshipMultiplier') return;
                mult *= Math.max(1, Number(effect.multiplier) || 1);
            });
            return mult;
        }

        function grantBundleCollectible(collectible) {
            if (!collectible || typeof collectible !== 'object') return false;
            if (collectible.type === 'sticker') return grantSticker(collectible.id);
            if (collectible.type === 'accessory' && gameState.pet) {
                if (!Array.isArray(gameState.pet.unlockedAccessories)) gameState.pet.unlockedAccessories = [];
                if (!gameState.pet.unlockedAccessories.includes(collectible.id)) {
                    gameState.pet.unlockedAccessories.push(collectible.id);
                    return true;
                }
            }
            return false;
        }

        function applyRewardBundle(bundleId, sourceLabel) {
            if (!bundleId || !REWARD_BUNDLES || !REWARD_BUNDLES[bundleId]) return null;
            const bundle = REWARD_BUNDLES[bundleId];
            const source = sourceLabel || 'Bundle Reward';
            const earnedCoins = Number(bundle.coins) > 0 ? addCoins(bundle.coins, source, true) : 0;
            const modifier = bundle.modifierId ? addGameplayModifier(bundle.modifierId, source) : null;
            const collectibleGranted = bundle.collectible ? grantBundleCollectible(bundle.collectible) : false;
            return { bundle, earnedCoins, modifier, collectibleGranted };
        }

        function getDailyTaskTemplateMap() {
            const map = {};
            (Array.isArray(DAILY_TASKS) ? DAILY_TASKS : []).forEach((task) => { if (task && task.id) map[task.id] = task; });
            return map;
        }

        function getProgressionRewardTuning() {
            const cfg = (typeof PROGRESSION_REWARD_TUNING === 'object' && PROGRESSION_REWARD_TUNING) ? PROGRESSION_REWARD_TUNING : null;
            if (cfg) return cfg;
            return {
                dailyTaskPartial: {
                    minTarget: 2,
                    thresholds: [{ id: 'half', ratio: 0.5, coinsByLane: { default: 9 } }]
                },
                weeklyArcStep: {
                    coinsByTrackKey: { default: 16 }
                }
            };
        }

        function getProgressionCoinsFromMap(map, key) {
            if (!map || typeof map !== 'object') return 0;
            const value = Number((key && map[key] != null) ? map[key] : map.default);
            return Math.max(0, Math.floor(value || 0));
        }

        function ensureRewardRecapState() {
            const dayKey = getTodayString();
            if (!gameState._rewardRecap || typeof gameState._rewardRecap !== 'object') {
                gameState._rewardRecap = {
                    dayKey,
                    short: 0,
                    mid: 0,
                    long: 0,
                    events: [],
                    lastPulseAt: 0
                };
            }
            const recap = gameState._rewardRecap;
            if (typeof recap.dayKey !== 'string' || recap.dayKey !== dayKey) {
                recap.dayKey = dayKey;
                recap.short = 0;
                recap.mid = 0;
                recap.long = 0;
                recap.events = [];
                recap.lastPulseAt = 0;
            }
            if (!Array.isArray(recap.events)) recap.events = [];
            ['short', 'mid', 'long'].forEach((k) => {
                if (!Number.isFinite(recap[k])) recap[k] = 0;
                recap[k] = Math.max(0, Math.floor(recap[k]));
            });
            if (!Number.isFinite(recap.lastPulseAt)) recap.lastPulseAt = 0;
            return recap;
        }

        function recordRewardRecapEvent(tier, label, meta) {
            const key = (tier === 'long' || tier === 'mid') ? tier : 'short';
            const recap = ensureRewardRecapState();
            recap[key] = Math.max(0, Math.floor(recap[key] || 0)) + 1;
            recap.events.push({
                at: Date.now(),
                tier: key,
                label: String(label || 'Reward'),
                meta: (meta && typeof meta === 'object') ? { ...meta } : null
            });
            if (recap.events.length > 30) recap.events = recap.events.slice(-30);
            if (typeof showToast === 'function' && key !== 'short') {
                const now = Date.now();
                if ((now - (Number(recap.lastPulseAt) || 0)) > 90000) {
                    recap.lastPulseAt = now;
                    showToast(`🎁 Session recap: ${recap.short} short · ${recap.mid} mid · ${recap.long} long`, '#B39DDB');
                }
            }
            return recap;
        }

        function getRewardRecapSummary() {
            const recap = ensureRewardRecapState();
            const total = (recap.short || 0) + (recap.mid || 0) + (recap.long || 0);
            if (total <= 0) return null;
            return {
                short: recap.short || 0,
                mid: recap.mid || 0,
                long: recap.long || 0,
                total,
                text: `${recap.short || 0} short · ${recap.mid || 0} mid · ${recap.long || 0} long`
            };
        }

        function getProgressionSubTuning(key, fallbackValue) {
            const tuning = getProgressionRewardTuning();
            if (!tuning || typeof tuning !== 'object') return fallbackValue;
            return (tuning[key] && typeof tuning[key] === 'object') ? tuning[key] : fallbackValue;
        }

        function claimFirstOfDayModeBonus(modeKey, sourceLabel) {
            const cl = initDailyChecklist();
            if (!cl) return null;
            if (!cl.firstModeBonuses || typeof cl.firstModeBonuses !== 'object') cl.firstModeBonuses = {};
            if (cl.firstModeBonuses[modeKey]) return null;

            const cfg = getProgressionSubTuning('firstOfDayModeBonus', {});
            const bonus = (cfg && typeof cfg === 'object' && cfg[modeKey]) ? cfg[modeKey] : null;
            if (!bonus) return null;

            cl.firstModeBonuses[modeKey] = true;
            const label = bonus.label || `First ${modeKey}`;
            const coins = Math.max(0, Math.floor(Number(bonus.coins) || 0));
            const earnedCoins = coins > 0 ? addCoins(coins, sourceLabel || `${label} Bonus`, true) : 0;
            const modifier = (bonus.modifierId && typeof addGameplayModifier === 'function')
                ? addGameplayModifier(bonus.modifierId, sourceLabel || `${label} Bonus`)
                : null;
            if ((earnedCoins > 0 || modifier) && typeof showToast === 'function') {
                const modifierText = modifier ? ` + ${modifier.emoji} ${modifier.name}` : '';
                showToast(`🌟 ${label} bonus! +${earnedCoins} coins${modifierText}`, '#FFD54F');
            }
            if (earnedCoins > 0 || modifier) recordRewardRecapEvent('mid', `${label} bonus`, { modeKey, earnedCoins, modifierId: modifier ? modifier.typeId : null });
            return { modeKey, earnedCoins, modifier, label };
        }

        function applyScaledRewardBundle(baseBundleId, scale, sourceLabel, options) {
            const bundle = (baseBundleId && REWARD_BUNDLES && REWARD_BUNDLES[baseBundleId]) ? REWARD_BUNDLES[baseBundleId] : null;
            if (!bundle) return null;
            const ratio = Math.max(0, Number(scale) || 0);
            const coins = Math.max(0, Math.floor((Number(bundle.coins) || 0) * ratio));
            const earnedCoins = coins > 0 ? addCoins(coins, sourceLabel || 'Reward', true) : 0;
            const grantModifier = !(options && options.grantModifier === false);
            const modifier = (grantModifier && bundle.modifierId) ? addGameplayModifier(bundle.modifierId, sourceLabel || 'Reward') : null;
            return { bundle, earnedCoins, modifier, collectibleGranted: false, scaledFrom: baseBundleId, scale: ratio };
        }

        function getNextStreakMilestoneHint() {
            const streak = gameState.streak || {};
            const current = Math.max(0, Number(streak.current) || 0);
            const milestones = Array.isArray(STREAK_MILESTONES) ? STREAK_MILESTONES : [];
            const next = milestones.find((m) => m && Number(m.days) > current);
            if (!next) return null;
            const remaining = Math.max(1, Number(next.days) - current);
            return {
                key: 'streak',
                icon: '🔥',
                text: `${remaining} day${remaining === 1 ? '' : 's'} to next streak milestone`
            };
        }

        function getNextStickerSetHint() {
            if (typeof STICKERS !== 'object' || !STICKERS) return null;
            const collected = gameState.stickers || {};
            let best = null;
            Object.keys(STICKER_CATEGORIES || {}).forEach((catKey) => {
                const stickersInCategory = Object.entries(STICKERS).filter(([, s]) => s && s.category === catKey);
                if (stickersInCategory.length <= 0) return;
                const total = stickersInCategory.length;
                const count = stickersInCategory.reduce((sum, [id]) => sum + ((collected[id] && collected[id].collected) ? 1 : 0), 0);
                if (count >= total) return;
                const remaining = total - count;
                if (!best || remaining < best.remaining) {
                    best = {
                        key: 'stickers',
                        icon: (STICKER_CATEGORIES[catKey] && STICKER_CATEGORIES[catKey].icon) || '📓',
                        text: `${remaining} sticker${remaining === 1 ? '' : 's'} to ${((STICKER_CATEGORIES[catKey] || {}).label || catKey)} set bonus`
                    };
                }
            });
            return best;
        }

        function getNextGardenPlotHint() {
            const garden = gameState.garden;
            if (!garden || typeof getUnlockedPlotCount !== 'function' || typeof getGardenPlotCapacity !== 'function') return null;
            const totalHarvests = Math.max(0, Math.floor(Number(garden.totalHarvests) || 0));
            const expansionTier = Math.max(0, Math.floor(Number(garden.expansionTier) || 0));
            const capacity = getGardenPlotCapacity(expansionTier);
            const unlocked = getUnlockedPlotCount(totalHarvests, expansionTier);
            if (unlocked >= capacity) return null;
            const thresholds = Array.isArray(GARDEN_PLOT_UNLOCK_THRESHOLDS) ? GARDEN_PLOT_UNLOCK_THRESHOLDS : [];
            const nextThreshold = thresholds[Math.max(0, unlocked)];
            if (!Number.isFinite(nextThreshold)) return null;
            const remaining = Math.max(0, Math.floor(nextThreshold - totalHarvests));
            if (remaining <= 0) return null;
            return {
                key: 'garden',
                icon: '🌱',
                text: `${remaining} harvest${remaining === 1 ? '' : 's'} to next plot`
            };
        }

        function getGoalBreakpointHints(limit) {
            const hints = [getNextGardenPlotHint(), getNextStreakMilestoneHint(), getNextStickerSetHint()]
                .filter(Boolean);
            const max = Math.max(1, Math.floor(Number(limit) || 2));
            return hints.slice(0, max);
        }

        function checkBreedingDiscoveryMilestones() {
            const cfg = getProgressionSubTuning('breedingDiscoveryMilestones', {});
            if (!cfg || typeof cfg !== 'object') return [];
            if (!gameState._breedingDiscoveryMilestonesClaimed || typeof gameState._breedingDiscoveryMilestonesClaimed !== 'object') {
                gameState._breedingDiscoveryMilestonesClaimed = {};
            }
            const claimedRoot = gameState._breedingDiscoveryMilestonesClaimed;
            const counters = {
                totalBreedings: Math.max(0, Math.floor(Number(gameState.totalBreedings) || 0)),
                totalHybridsCreated: Math.max(0, Math.floor(Number(gameState.totalHybridsCreated) || 0)),
                totalMutations: Math.max(0, Math.floor(Number(gameState.totalMutations) || 0))
            };
            const rewards = [];
            Object.entries(counters).forEach(([key, value]) => {
                const milestones = Array.isArray(cfg[key]) ? cfg[key] : [];
                if (!claimedRoot[key] || typeof claimedRoot[key] !== 'object') claimedRoot[key] = {};
                milestones.forEach((milestone) => {
                    if (!milestone || typeof milestone !== 'object') return;
                    const target = Math.max(1, Math.floor(Number(milestone.value) || 0));
                    if (value < target) return;
                    const claimKey = String(target);
                    if (claimedRoot[key][claimKey]) return;
                    claimedRoot[key][claimKey] = true;
                    const source = `Breeding Discovery (${key} ${target})`;
                    const result = (milestone.bundleId && typeof applyRewardBundle === 'function')
                        ? applyRewardBundle(milestone.bundleId, source)
                        : null;
                    if (result && typeof showToast === 'function') {
                        showToast(`🧬 Breeding milestone reached! +${result.earnedCoins || 0} coins`, '#CE93D8');
                    }
                    if (typeof addJournalEntry === 'function') {
                        addJournalEntry('🧬', `Breeding milestone reached: ${key} ${target}.`);
                    }
                    recordRewardRecapEvent(target >= 3 ? 'mid' : 'short', `Breeding milestone ${key}`, { key, target, value });
                    rewards.push({ counter: key, target, result });
                });
            });
            return rewards;
        }

        function grantWeeklyArcStepReward(task, arc) {
            if (!task) return null;
            const tuning = getProgressionRewardTuning();
            const coinMap = (((tuning || {}).weeklyArcStep) || {}).coinsByTrackKey;
            const coins = getProgressionCoinsFromMap(coinMap, task.trackKey);
            if (coins <= 0) return null;
            const source = `${arc && arc.icon ? arc.icon : '🏅'} ${arc && arc.theme ? arc.theme : 'Weekly Arc'} Task`;
            const earnedCoins = addCoins(coins, source, true);
            if (earnedCoins > 0 && typeof showToast === 'function') {
                showToast(`${task.icon || '🏅'} Arc task complete! +${earnedCoins} coins`, '#FFB74D');
            }
            if (earnedCoins > 0) recordRewardRecapEvent('short', 'Weekly arc task', { trackKey: task.trackKey, earnedCoins });
            return { earnedCoins, source };
        }

        function tryGrantDailyTaskPartialRewards(task, progressValue) {
            if (!task || task.done) return [];
            const target = Math.max(1, Number(task.target) || 1);
            const current = Math.max(0, Number(progressValue) || 0);
            const tuning = getProgressionRewardTuning();
            const partialCfg = (tuning && tuning.dailyTaskPartial) ? tuning.dailyTaskPartial : {};
            const minTarget = Math.max(1, Number(partialCfg.minTarget) || 1);
            if (target < minTarget) return [];
            const thresholds = Array.isArray(partialCfg.thresholds) ? partialCfg.thresholds : [];
            if (!task._partialClaims || typeof task._partialClaims !== 'object') task._partialClaims = {};

            const granted = [];
            thresholds.forEach((thresholdDef, idx) => {
                if (!thresholdDef || typeof thresholdDef !== 'object') return;
                const ratio = Number(thresholdDef.ratio);
                if (!(ratio > 0 && ratio < 1)) return;
                const thresholdId = thresholdDef.id || `t${idx}`;
                if (task._partialClaims[thresholdId]) return;
                const thresholdValue = Math.max(1, Math.ceil(target * ratio));
                if (current < thresholdValue) return;
                task._partialClaims[thresholdId] = true;
                const coins = getProgressionCoinsFromMap(thresholdDef.coinsByLane, task.lane);
                const earnedCoins = coins > 0 ? addCoins(coins, `Daily Task Milestone (${task.name || task.id})`, true) : 0;
                if (earnedCoins > 0 && typeof showToast === 'function') {
                    const pct = Math.round(ratio * 100);
                    showToast(`${task.icon || '📋'} ${pct}% daily task milestone! +${earnedCoins} coins`, '#FFE082');
                }
                if (earnedCoins > 0) recordRewardRecapEvent('short', 'Daily task partial', { taskId: task.id, thresholdId, earnedCoins });
                granted.push({ thresholdId, ratio, thresholdValue, earnedCoins });
            });
            return granted;
        }

        function initWeeklyArc() {
            const weekKey = getWeekKey();
            if (!gameState.weeklyArc || gameState.weeklyArc.weekKey !== weekKey) {
                const arcs = Array.isArray(WEEKLY_THEMED_ARCS) ? WEEKLY_THEMED_ARCS : [];
                if (arcs.length === 0) return null;
                const arc = arcs[hashDailySeed(`arc:${weekKey}`) % arcs.length];
                gameState.weeklyArc = {
                    weekKey,
                    arcId: arc.id,
                    theme: arc.theme,
                    icon: arc.icon,
                    tasks: (arc.tasks || []).map((task) => ({ ...task, done: false })),
                    progress: {},
                    completed: false,
                    rewardClaimed: false,
                    reward: arc.finaleReward || null
                };
            }
            return gameState.weeklyArc;
        }

        function incrementWeeklyArcProgress(key, amount) {
            const arc = initWeeklyArc();
            if (!arc || !key) return [];
            if (!arc.progress || typeof arc.progress !== 'object') arc.progress = {};
            arc.progress[key] = (arc.progress[key] || 0) + (amount ?? 1);
            const completed = [];
            (arc.tasks || []).forEach((task) => {
                if (!task || task.done || task.trackKey !== key) return;
                const target = Math.max(1, Number(task.target) || 1);
                if ((arc.progress[key] || 0) >= target) {
                    task.done = true;
                    completed.push(task);
                    grantWeeklyArcStepReward(task, arc);
                }
            });
            if (!arc.completed && (arc.tasks || []).length > 0 && arc.tasks.every((task) => task.done)) {
                arc.completed = true;
                if (!arc.rewardClaimed) {
                    arc.rewardClaimed = true;
                    const stage = getRewardPhaseStage();
                    if (arc.reward && arc.reward.bundleId) {
                        const bundleId = (typeof getRewardBundleForPhase === 'function')
                            ? getRewardBundleForPhase('weekly', stage, arc.reward.bundleId)
                            : arc.reward.bundleId;
                        if (bundleId) applyRewardBundle(bundleId, `${arc.icon || '🏅'} ${arc.theme || 'Weekly Arc'}`);
                    }
                    grantPhaseModifier(stage, 'weekly', `${arc.icon || '🏅'} Weekly Emphasis`);
                    if (arc.reward && arc.reward.collectible) grantBundleCollectible(arc.reward.collectible);
                    recordRewardRecapEvent('long', 'Weekly arc finale', { arcId: arc.arcId, theme: arc.theme });
                    addJournalEntry('🏅', `${arc.theme || 'Weekly arc'} completed! Exclusive finale reward unlocked.`);
                }
            }
            return completed;
        }

        function initDailyChecklist() {
            const today = getTodayString();
            if (!gameState.dailyChecklist || gameState.dailyChecklist.date !== today) {
                // Generate diary entry for previous day before resetting
                if (gameState.dailyChecklist && gameState.dailyChecklist.date && gameState.pet) {
                    if (typeof generateDiaryEntry === 'function') {
                        try {
                            const prevProgress = gameState.dailyChecklist.progress || {};
                            const pet = gameState.pet;
                            const season = (typeof getCurrentSeason === 'function') ? getCurrentSeason() : 'spring';
                            const dayNum = pet.birthdate ? Math.max(1, Math.floor((Date.now() - pet.birthdate) / 86400000)) : 1;
                            const entry = generateDiaryEntry(pet, prevProgress, season, dayNum);
                            if (entry) {
                                entry.date = gameState.dailyChecklist.date; // Use the actual day being summarized
                                if (!Array.isArray(gameState.diary)) gameState.diary = [];
                                gameState.diary.push(entry);
                                // Keep last 30 diary entries
                                if (gameState.diary.length > 30) {
                                    gameState.diary = gameState.diary.slice(-30);
                                }
                            }
                        } catch (e) {
                            // Diary generation should never block daily reset
                        }
                    }
                }
                // Rec 11: Apply coin decay on new day (before daily tasks reset)
	                if (gameState.dailyChecklist && gameState.dailyChecklist.date) {
	                    if (typeof applyCoinDecay === 'function') applyCoinDecay();
	                    if (typeof applyWealthPressureFee === 'function') applyWealthPressureFee();
	                }
                // Rec 1: Reset daily minigame earnings counter
                gameState._dailyMinigameEarnings = 0;
                gameState._dailyMinigameEarningsDay = today;

                const stage = (gameState.pet && GROWTH_STAGES[gameState.pet.growthStage]) ? gameState.pet.growthStage : 'baby';
                const fixedTasks = (Array.isArray(DAILY_FIXED_TASKS) ? DAILY_FIXED_TASKS : []).slice(0, 2);
                const modeTasks = pickDailyModeTasks(today);
                const wildcard = pickDailyWildcardTask(stage, today);
                const taskList = [...fixedTasks, ...modeTasks];
                if (wildcard) taskList.push(wildcard);
                // Add seasonal daily task if available
                if (typeof DAILY_SEASONAL_TASKS === 'object' && typeof getCurrentSeason === 'function') {
                    const seasonTask = DAILY_SEASONAL_TASKS[getCurrentSeason()];
                    if (seasonTask) taskList.push(seasonTask);
                }
                gameState.dailyChecklist = {
                    date: today,
                    stage,
                    progress: { feedCount: 0, minigameCount: 0, harvestCount: 0, parkVisits: 0, totalCareActions: 0, expeditionCount: 0, battleCount: 0, hatchCount: 0, masteryPoints: 0, bondEvents: 0, discoveryEvents: 0 },
                    tasks: taskList.map((t) => buildDailyTaskEntry(t, stage)),
                    firstModeBonuses: { minigame: false, harvest: false, expedition: false, arena: false },
                    _completionCounted: false,
                    _rewardGranted: false
                };
            }
            initWeeklyArc();
            return gameState.dailyChecklist;
        }

        function incrementDailyProgress(key, amount) {
            const cl = initDailyChecklist();
            if (!cl.progress[key]) cl.progress[key] = 0;
            cl.progress[key] += (amount ?? 1);
            if (typeof balanceDebugLog === 'function') {
                const matchingTasks = (cl.tasks || [])
                    .filter((task) => task && task.trackKey === key)
                    .map((task) => ({ id: task.id, lane: task.lane, done: !!task.done, target: task.target }));
                balanceDebugLog('LaneUsage', {
                    key,
                    amount: amount ?? 1,
                    total: cl.progress[key],
                    tasks: matchingTasks
                });
            }
            // Check completions
            const templates = getDailyTaskTemplateMap();
            const newlyCompleted = [];
            cl.tasks.forEach((task) => {
                if (!task || task.done || task.trackKey !== key) return;
                const scaledTarget = Number(task.target || 1);
                tryGrantDailyTaskPartialRewards(task, cl.progress[key] || 0);
                if ((cl.progress[key] || 0) >= scaledTarget) {
                    task.done = true;
                    newlyCompleted.push({
                        ...(templates[task.id] || task),
                        icon: task.icon || (templates[task.id] && templates[task.id].icon) || '✅',
                        target: scaledTarget,
                        name: task.name
                    });
                }
            });
            incrementWeeklyArcProgress(key, amount);
            // Track daily completion count for trophies
            if (typeof trackDailyCompletion === 'function') trackDailyCompletion();
            return newlyCompleted;
        }

        function isDailyComplete() {
            const cl = initDailyChecklist();
            return cl.tasks.every(t => t.done);
        }

        // Track daily completions count (for trophies)
        function trackDailyCompletion() {
            if (isDailyComplete()) {
                // Only count once per day
                const cl = gameState.dailyChecklist;
                if (cl && !cl._completionCounted) {
                    cl._completionCounted = true;
                    if (typeof triggerUiHaptic === 'function') triggerUiHaptic('dailyComplete');
                    if (typeof showRewardBurstFX === 'function') {
                        showRewardBurstFX(document.getElementById('daily-btn') || document.body, {
                            ribbonText: 'Daily Complete',
                            badgeText: 'Checklist Cleared',
                            badgeTone: 'gold',
                            coinCount: 6
                        });
                    }
                    if (typeof gameState.totalDailyCompletions !== 'number') gameState.totalDailyCompletions = 0;
                    gameState.totalDailyCompletions++;
                    if (!cl._rewardGranted) {
                        cl._rewardGranted = true;
                        const stage = (cl.stage && GROWTH_STAGES[cl.stage]) ? cl.stage : 'baby';
                        const bundleId = (typeof getRewardBundleForPhase === 'function')
                            ? getRewardBundleForPhase('daily', stage, 'dailyFinish')
                            : 'dailyFinish';
                        const bundled = bundleId ? applyRewardBundle(bundleId, 'Daily Tasks') : null;
                        grantPhaseModifier(stage, 'daily', 'Daily Emphasis');
                        const stageMult = Math.max(1, Number(getStageBalance(stage).dailyTaskMultiplier) || 1);
                        const stageBonusCoins = Math.max(0, Math.round((stageMult - 1) * 45));
                        // Recommendation #7: Mastery rank daily bonus (+1 coin if Family Legacy tier 2+)
                        const masteryDailyBonus = typeof getMasteryDailyBonus === 'function' ? getMasteryDailyBonus() : 0;
                        // Recommendation #10: Elder legacy passive income
                        // Each retired elder pet adds +2 coins/day, non-elder retired pets add +1 coin/day
                        let elderLegacyBonus = 0;
                        if (Array.isArray(gameState.memorials)) {
                            gameState.memorials.forEach(m => {
                                elderLegacyBonus += (m.growthStage === 'elder') ? 2 : 1;
                            });
                        }
                        const totalBonusCoins = stageBonusCoins + masteryDailyBonus + elderLegacyBonus;
                        if (totalBonusCoins > 0) {
                            addCoins(totalBonusCoins, 'Daily Tasks (Stage + Mastery + Legacy Bonus)', true);
                        }
                        if (bundled && typeof showToast === 'function') {
                            const modifierText = bundled.modifier ? ` + ${bundled.modifier.emoji} ${bundled.modifier.name}` : '';
                            const elderText = elderLegacyBonus > 0 ? ` + ${elderLegacyBonus} elder legacy` : '';
                            const bonusText = (stageBonusCoins > 0 || elderLegacyBonus > 0) ? ` + ${stageBonusCoins + elderLegacyBonus} bonus` : '';
                            showToast(`📋 Daily tasks complete! +${bundled.earnedCoins} coins${bonusText}${modifierText}`, '#FFD700');
                        } else {
                            const dailyRewardBase = (typeof ECONOMY_BALANCE !== 'undefined' && typeof ECONOMY_BALANCE.dailyCompletionReward === 'number')
                                ? ECONOMY_BALANCE.dailyCompletionReward
                                : 85;
                            const dailyReward = dailyRewardBase + totalBonusCoins;
                            const payout = addCoins(dailyReward, 'Daily Tasks', true);
                            if (payout > 0 && typeof showToast === 'function') {
                                showToast(`📋 Daily tasks complete! Earned ${payout} coins.`, '#FFD700');
                            }
                        }
                        recordRewardRecapEvent('long', 'Daily checklist complete', { stage });
                    }
                }
            }
        }

        // Track room visits for achievements
        function trackRoomVisit(roomId) {
            if (!gameState.roomsVisited) gameState.roomsVisited = {};
            gameState.roomsVisited[roomId] = true;
        }

        // Track weather for achievements
        function trackWeather() {
            if (!gameState.weatherSeen) gameState.weatherSeen = {};
            gameState.weatherSeen[gameState.weather] = true;
        }

        // ==================== POST-CAP MASTERY ====================

        function getCompetitionSeasonTitle(rank) {
            if (rank >= 10) return 'Mythic League';
            if (rank >= 7) return 'Diamond Circuit';
            if (rank >= 5) return 'Gold Circuit';
            if (rank >= 3) return 'Silver Circuit';
            return 'Bronze Circuit';
        }

        function getBiomeRankTitle(rank) {
            if (rank >= 10) return 'Biome Sovereign';
            if (rank >= 7) return 'Master Ranger';
            if (rank >= 5) return 'Senior Scout';
            if (rank >= 3) return 'Trail Keeper';
            return 'Field Explorer';
        }

        function getLegacyTitle(tier) {
            if (tier >= 8) return 'Eternal Lineage';
            if (tier >= 6) return 'Heritage Dynasty';
            if (tier >= 4) return 'Ancestral House';
            if (tier >= 2) return 'Growing Legacy';
            return 'Founding Family';
        }

        function refreshMasteryTracks() {
            const mastery = ensureMasteryState();
            const comp = normalizeCompetitionState(gameState.competition);
            const compPoints = (comp.battlesWon || 0) + ((comp.showsEntered || 0) * 2) + ((comp.obstacleCompletions || 0) * 2) + ((comp.rivalsDefeated || []).length * 4);
            mastery.competitionSeason.points = compPoints;
            mastery.competitionSeason.rank = Math.max(1, Math.floor(compPoints / 12) + 1);
            mastery.competitionSeason.title = getCompetitionSeasonTitle(mastery.competitionSeason.rank);

            const history = (((gameState.exploration || {}).expeditionHistory) || []);
            const biomeCounts = {};
            history.forEach((entry) => {
                if (!entry || !entry.biomeId) return;
                biomeCounts[entry.biomeId] = (biomeCounts[entry.biomeId] || 0) + 1;
            });
            Object.entries(biomeCounts).forEach(([biomeId, count]) => {
                const rank = Math.max(1, Math.floor(count / 3) + 1);
                mastery.biomeRanks[biomeId] = {
                    points: count,
                    rank,
                    title: getBiomeRankTitle(rank)
                };
            });

            const legacyPoints = ((gameState.memorials || []).length * 8) + ((gameState.eldersRaised || 0) * 5) + ((gameState.totalBreedingHatches || 0) * 2);
            mastery.familyLegacy.points = legacyPoints;
            mastery.familyLegacy.tier = Math.max(1, Math.floor(legacyPoints / 20) + 1);
            mastery.familyLegacy.title = getLegacyTitle(mastery.familyLegacy.tier);
            return mastery;
        }

        // ==================== MASTERY RANK PERKS (Recommendation #7) ====================

        // Competition rank 3+: +2% battle happiness gain
        function getMasteryBattleHappinessBonus() {
            const mastery = ensureMasteryState();
            if (mastery.competitionSeason && mastery.competitionSeason.rank >= 3) return 0.02;
            return 0;
        }

        // Biome rank 3+: +5% loot sell price for that biome
        function getMasteryLootSellBonus(biomeId) {
            const mastery = ensureMasteryState();
            if (biomeId && mastery.biomeRanks && mastery.biomeRanks[biomeId] && mastery.biomeRanks[biomeId].rank >= 3) return 0.05;
            return 0;
        }

        // Family Legacy rank 2+: +1 base coin on daily completion
        function getMasteryDailyBonus() {
            const mastery = ensureMasteryState();
            if (mastery.familyLegacy && mastery.familyLegacy.tier >= 2) return 1;
            return 0;
        }

        function getMasteryCareGainBonus() {
            const mastery = ensureMasteryState();
            const stage = getRewardPhaseStage();
            const stageBonus = (typeof getMasteryPhaseBonus === 'function') ? getMasteryPhaseBonus(stage, 'care') : 0;
            if (!mastery.familyLegacy) return stageBonus;
            const tier = Math.max(1, Number(mastery.familyLegacy.tier) || 1);
            if (tier < 2) return stageBonus;
            return stageBonus + Math.min(0.08, 0.01 * (tier - 1));
        }

        function getMasteryExpeditionRollBonus() {
            const mastery = ensureMasteryState();
            const stage = getRewardPhaseStage();
            const stageBonus = Math.max(0, Math.floor((typeof getMasteryPhaseBonus === 'function') ? getMasteryPhaseBonus(stage, 'expeditionRolls') : 0));
            const biomeRanks = mastery.biomeRanks || {};
            const highRanks = Object.values(biomeRanks).filter((entry) => entry && Number(entry.rank) >= 4).length;
            const rankBonus = highRanks >= 2 ? 1 : 0;
            return stageBonus + rankBonus;
        }

        function getMasteryCompetitionPayoutBonus() {
            const mastery = ensureMasteryState();
            const stage = getRewardPhaseStage();
            const stageBonus = Math.max(0, Number((typeof getMasteryPhaseBonus === 'function') ? getMasteryPhaseBonus(stage, 'competition') : 0));
            const rank = Math.max(1, Number((mastery.competitionSeason || {}).rank) || 1);
            const masteryBonus = rank >= 7 ? 0.06 : rank >= 5 ? 0.04 : rank >= 3 ? 0.02 : 0;
            return stageBonus + masteryBonus;
        }

        // ==================== GOAL LADDER ====================

        function getGoalLadder() {
            const cl = initDailyChecklist();
            const arc = initWeeklyArc();
            const mastery = refreshMasteryTracks();
            const nowTask = (cl.tasks || []).find((task) => !task.done) || null;
            const nowProgress = nowTask ? `${Math.min(cl.progress[nowTask.trackKey] || 0, nowTask.target)}/${nowTask.target}` : 'Done';
            const modeTasks = (cl.tasks || []).filter((task) => task.lane === 'mode');
            const pendingMode = modeTasks.find((task) => !task.done);
            const nextTask = pendingMode || nowTask;
            const nextProgress = nextTask ? `${Math.min(cl.progress[nextTask.trackKey] || 0, nextTask.target)}/${nextTask.target}` : 'Done';
            const longTerm = arc && !arc.completed
                ? `${arc.icon || '🏅'} ${arc.theme}: ${((arc.tasks || []).filter((t) => t.done).length)}/${(arc.tasks || []).length}`
                : `🏛️ Legacy Tier ${mastery.familyLegacy.tier}: ${mastery.familyLegacy.title}`;
            const breakpointHints = getGoalBreakpointHints(2);
            const recap = getRewardRecapSummary();

            gameState.goalLadder = {
                generatedAt: Date.now(),
                now: nowTask ? { label: nowTask.name, progress: nowProgress, window: '5 min' } : { label: 'Claim your streak bonus', progress: 'Ready', window: '5 min' },
                next: nextTask ? { label: nextTask.name, progress: nextProgress, window: '20 min' } : { label: 'Run one expedition', progress: '0/1', window: '20 min' },
                longTerm: { label: longTerm, progress: breakpointHints.length > 0 ? breakpointHints.map((h) => `${h.icon} ${h.text}`).join(' • ') : '', window: 'Milestone' },
                breakpointHints,
                recap
            };
            return gameState.goalLadder;
        }

        // ==================== MEMORY HOOKS ====================

        function runLoginMemoryHooks() {
            if (!gameState.pet) return;
            const pet = gameState.pet;
            const today = getTodayString();
            const monthDay = today.slice(5);
            if (!gameState.memoryHooks || typeof gameState.memoryHooks !== 'object') gameState.memoryHooks = {};
            if (!gameState.memoryHooks.anniversaries || typeof gameState.memoryHooks.anniversaries !== 'object') gameState.memoryHooks.anniversaries = {};

            if (pet.birthdate) {
                const b = new Date(pet.birthdate);
                const petMonthDay = `${String(b.getMonth() + 1).padStart(2, '0')}-${String(b.getDate()).padStart(2, '0')}`;
                const key = `${pet.id}:${today}`;
                if (petMonthDay === monthDay && !gameState.memoryHooks.anniversaries[key]) {
                    const ageDays = Math.max(1, Math.floor((Date.now() - pet.birthdate) / 86400000));
                    addJournalEntry('🎂', `${pet.name || 'Pet'} anniversary day! ${ageDays} days together.`);
                    gameState.memoryHooks.anniversaries[key] = true;
                }
            }

            const journal = Array.isArray(gameState.journal) ? gameState.journal : [];
            if (journal.length > 4) {
                const callback = journal[Math.max(0, journal.length - 1 - (hashDailySeed(today) % Math.min(10, journal.length)))];
                if (callback && callback.text) {
                    gameState.goalLadderMemory = `Remember: ${callback.text}`;
                }
            }
        }

        // ==================== LOCAL REMINDERS ====================

        function requestLocalReminderPermission() {
            ensureReminderState();
            if (typeof MLFNativeNotifications !== 'undefined' && MLFNativeNotifications && typeof MLFNativeNotifications.hasNativeBridge === 'function' && MLFNativeNotifications.hasNativeBridge()) {
                return MLFNativeNotifications.requestPermission().then((permission) => {
                    gameState.reminders.permission = permission;
                    try { saveGame(); } catch (e) {}
                    return permission;
                });
            }
            if (typeof Notification === 'undefined') return Promise.resolve('unsupported');
            if (Notification.permission === 'granted') {
                gameState.reminders.permission = 'granted';
                return Promise.resolve('granted');
            }
            return Notification.requestPermission().then((permission) => {
                gameState.reminders.permission = permission;
                saveGame();
                return permission;
            }).catch(() => 'denied');
        }

        function maybeSendLocalReminder(key, title, body) {
            const reminders = ensureReminderState();
            if (!reminders.enabled) return false;
            const today = getTodayString();
            if (reminders.lastSent && reminders.lastSent[key] === today) return false;
            reminders.lastSent[key] = today;
            const nativeRouteByKey = {
                streakRisk: 'streak',
                expeditionReady: 'explore',
                harvestReady: 'garden',
                hatchReady: 'journey',
                eggNearHatch: 'journey'
            };
            if (typeof MLFNativeNotifications !== 'undefined' && MLFNativeNotifications && typeof MLFNativeNotifications.hasNativeBridge === 'function' && MLFNativeNotifications.hasNativeBridge()) {
                try {
                    MLFNativeNotifications.scheduleReminder({
                        id: `mlf.${key}.${today}`,
                        title,
                        body,
                        route: nativeRouteByKey[key] || 'journey',
                        reminderType: key,
                        delaySeconds: 3
                    });
                } catch (e) {}
                return true;
            }
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                try { new Notification(title, { body, icon: 'icon-192.png' }); } catch (e) {}
            } else if (typeof showToast === 'function') {
                showToast(`${title} ${body}`, '#FFA726');
            }
            return true;
        }

        function getHarvestReadyReminderCount() {
            const garden = gameState.garden;
            if (!garden || !Array.isArray(garden.plots)) return 0;
            return garden.plots.filter((plot) => plot && (plot.stage >= 3 || plot.harvestReady)).length;
        }

        function getNearHatchReminderCount() {
            const eggs = Array.isArray(gameState.breedingEggs) ? gameState.breedingEggs : [];
            return eggs.filter((egg) => {
                const target = Math.max(1, Number(egg && egg.incubationTarget) || 1);
                const ticks = Math.max(0, Number(egg && egg.incubationTicks) || 0);
                return (ticks / target) >= 0.8 && (ticks / target) < 1;
            }).length;
        }

        function checkReminderSignals() {
            const reminders = ensureReminderState();
            if (!reminders.enabled) return;
            const expedition = ((gameState.exploration || {}).expedition) || null;
            if (expedition && Date.now() >= (expedition.endAt || 0)) {
                maybeSendLocalReminder('expeditionReady', '🧭 Expedition ready', 'Collect your expedition rewards.');
            }
            const harvestReady = getHarvestReadyReminderCount();
            if (harvestReady > 0) {
                maybeSendLocalReminder('harvestReady', '🌾 Harvest ready', 'Crops are ready to collect in the garden.');
            }
            const hatched = Array.isArray(gameState.hatchedBreedingEggs) ? gameState.hatchedBreedingEggs.length : 0;
            if (hatched > 0) {
                maybeSendLocalReminder('hatchReady', '🥚 Hatch ready', 'A new family member is ready to hatch.');
            }
            const nearHatch = getNearHatchReminderCount();
            if (nearHatch > 0 && hatched <= 0) {
                maybeSendLocalReminder('eggNearHatch', '🐣 Egg close to hatch', 'An incubating egg is almost ready.');
            }
            const streak = gameState.streak || {};
            const lastPlay = streak.lastPlayDate;
            const today = getTodayString();
            if (lastPlay && lastPlay !== today) {
                maybeSendLocalReminder('streakRisk', '🔥 Streak risk!', 'Log in to protect your streak.');
            }
        }

        function startReminderMonitor() {
            if (localReminderInterval) clearInterval(localReminderInterval);
            localReminderInterval = setInterval(() => {
                try { checkReminderSignals(); } catch (e) {}
            }, 60 * 1000);
        }

        // ==================== BADGES ====================

        function checkBadges() {
            if (!gameState.badges) gameState.badges = {};
            const newUnlocks = [];
            for (const [id, badge] of Object.entries(BADGES)) {
                if (gameState.badges[id]) continue;
                try {
                    if (badge.check(gameState)) {
                        gameState.badges[id] = { unlocked: true, unlockedAt: Date.now() };
                        newUnlocks.push(badge);
                    }
                } catch (e) { /* safe guard */ }
            }
            return newUnlocks;
        }

        function getBadgeCount() {
            if (!gameState.badges) return 0;
            return Object.values(gameState.badges).filter(b => b.unlocked).length;
        }

        // ==================== STICKER COLLECTION ====================

        function grantSticker(stickerId) {
            if (!gameState.stickers) gameState.stickers = {};
            if (gameState.stickers[stickerId]) return false; // Already collected
            if (!STICKERS[stickerId]) return false; // Invalid sticker
            gameState.stickers[stickerId] = { collected: true, collectedAt: Date.now() };
            // Recommendation #9: Check for sticker set completion after each grant
            const setRewards = checkStickerSetCompletions();
            if (setRewards.length > 0 && typeof showToast === 'function') {
                setRewards.forEach(r => {
                    const catLabel = (STICKER_CATEGORIES[r.category] || {}).label || r.category;
                    const coins = r.earnedCoins || 0;
                    if (r.kind === 'partial') {
                        const pct = Math.round((Number(r.ratio) || 0) * 100);
                        const modifierText = r.modifier ? ` + ${r.modifier.emoji} ${r.modifier.name}` : '';
                        showToast(`📓 ${catLabel} set ${pct}% bonus! +${coins} coins${modifierText}`, '#CE93D8');
                    } else {
                        showToast(`📓 ${catLabel} set complete! +${coins} coins`, '#E040FB');
                    }
                });
            }
            return true;
        }

        function getStickerCount() {
            if (!gameState.stickers) return 0;
            return Object.values(gameState.stickers).filter(s => s.collected).length;
        }

        // Recommendation #9: Sticker set completion bonuses
        // When all stickers in a category are collected, grant a one-time bundle
        function checkStickerSetCompletions() {
            if (!gameState.stickers) return [];
            if (!gameState._claimedStickerSets) gameState._claimedStickerSets = {};
            if (!gameState._claimedStickerSetThresholds || typeof gameState._claimedStickerSetThresholds !== 'object') gameState._claimedStickerSetThresholds = {};
            const collected = gameState.stickers;
            const rewards = [];
            const stage = getRewardPhaseStage();
            const partialCfg = getProgressionSubTuning('stickerSetPartial', {});
            const partialThresholds = Array.isArray(partialCfg.thresholds) ? partialCfg.thresholds : [];
            const setBundles = {
                animals: 'stickerSetAnimals',
                nature: 'stickerSetNature',
                fun: 'stickerSetFun',
                special: 'stickerSetSpecial'
            };
            for (const [catKey, bundleId] of Object.entries(setBundles)) {
                const stickersInCategory = Object.entries(STICKERS).filter(([, s]) => s.category === catKey);
                if (stickersInCategory.length === 0) continue;
                const categoryMeta = STICKER_CATEGORIES[catKey] || { icon: '📓', label: catKey };
                if (!gameState._claimedStickerSetThresholds[catKey] || typeof gameState._claimedStickerSetThresholds[catKey] !== 'object') {
                    gameState._claimedStickerSetThresholds[catKey] = {};
                }
                const collectedCount = stickersInCategory.reduce((sum, [id]) => sum + ((collected[id] && collected[id].collected) ? 1 : 0), 0);
                const totalCount = stickersInCategory.length;
                const phaseBundleId = (typeof getRewardBundleForPhase === 'function')
                    ? getRewardBundleForPhase('achievement', stage, bundleId)
                    : bundleId;
                partialThresholds.forEach((thresholdDef, idx) => {
                    if (!thresholdDef || typeof thresholdDef !== 'object') return;
                    const ratio = Number(thresholdDef.ratio);
                    if (!(ratio > 0 && ratio < 1)) return;
                    const thresholdId = String(thresholdDef.id || `t${idx}`);
                    if (gameState._claimedStickerSetThresholds[catKey][thresholdId]) return;
                    const needed = Math.max(1, Math.ceil(totalCount * ratio));
                    if (collectedCount < needed) return;
                    gameState._claimedStickerSetThresholds[catKey][thresholdId] = true;
                    const scaled = applyScaledRewardBundle(
                        phaseBundleId,
                        Math.max(0, Number(thresholdDef.coinScale) || 0),
                        `${categoryMeta.icon} ${categoryMeta.label} Set ${Math.round(ratio * 100)}%`,
                        { grantModifier: !!thresholdDef.grantModifier }
                    );
                    if (scaled) {
                        rewards.push({ kind: 'partial', category: catKey, ratio, thresholdId, ...scaled });
                        recordRewardRecapEvent('short', 'Sticker set partial', { category: catKey, ratio, earnedCoins: scaled.earnedCoins || 0 });
                    }
                });

                if (gameState._claimedStickerSets[catKey]) continue;
                const allCollected = stickersInCategory.every(([id]) => collected[id] && collected[id].collected);
                if (allCollected) {
                    gameState._claimedStickerSets[catKey] = true;
                    const result = applyRewardBundle(phaseBundleId, `${categoryMeta.icon} ${categoryMeta.label} Set Complete`);
                    grantPhaseModifier(stage, 'achievement', `${categoryMeta.icon} Achievement Emphasis`);
                    if (result) {
                        rewards.push({ kind: 'complete', category: catKey, ...result });
                        recordRewardRecapEvent('mid', 'Sticker set complete', { category: catKey, earnedCoins: result.earnedCoins || 0 });
                    }
                    if (typeof addJournalEntry === 'function') {
                        addJournalEntry(categoryMeta.icon, `Completed the ${categoryMeta.label} sticker set! Bonus reward unlocked.`);
                    }
                }
            }
            return rewards;
        }

        function checkStickers() {
            if (!gameState.stickers) gameState.stickers = {};
            const newStickers = [];

            // Check condition-based stickers
            const gs = gameState;
            const pet = gs.pet;

            // Weather stickers
            const ws = gs.weatherSeen || {};
            if (ws.sunny && ws.rainy && ws.snowy && grantSticker('rainbowSticker')) {
                newStickers.push(STICKERS.rainbowSticker);
            }
            if (gs.weather === 'snowy' && grantSticker('snowflakeSticker')) {
                newStickers.push(STICKERS.snowflakeSticker);
            }

            // Season stickers
            if (gs.season === 'spring' && grantSticker('cherryBlossom')) {
                newStickers.push(STICKERS.cherryBlossom);
            }

            // Garden stickers
            if (gs.garden && gs.garden.totalHarvests >= 1 && grantSticker('sproutSticker')) {
                newStickers.push(STICKERS.sproutSticker);
            }
            if (gs.garden && gs.garden.inventory && gs.garden.inventory.sunflower > 0 && grantSticker('sunflowerSticker')) {
                newStickers.push(STICKERS.sunflowerSticker);
            }

            // Mini-game stickers
            const scores = gs.minigameHighScores || {};
            if (Object.values(scores).some(s => s >= 25) && grantSticker('starSticker')) {
                newStickers.push(STICKERS.starSticker);
            }
            if (Object.values(scores).some(s => s >= 50) && grantSticker('trophySticker')) {
                newStickers.push(STICKERS.trophySticker);
            }
            const counts = gs.minigamePlayCounts || {};
            if (counts.simonsays > 0 && grantSticker('musicSticker')) {
                newStickers.push(STICKERS.musicSticker);
            }
            if (counts.coloring > 0 && grantSticker('artSticker')) {
                newStickers.push(STICKERS.artSticker);
            }

            // Daily completion sticker
            if (gs.dailyChecklist && gs.dailyChecklist.tasks && gs.dailyChecklist.tasks.every(t => t.done) && grantSticker('partySticker')) {
                newStickers.push(STICKERS.partySticker);
            }

            // Special milestone stickers
            if (pet && pet.evolutionStage === 'evolved' && grantSticker('crownSticker')) {
                newStickers.push(STICKERS.crownSticker);
            }
            if (pet && pet.careQuality === 'excellent' && grantSticker('sparkleSticker')) {
                newStickers.push(STICKERS.sparkleSticker);
            }
            if ((gs.adultsRaised || 0) >= 2 && grantSticker('unicornSticker')) {
                newStickers.push(STICKERS.unicornSticker);
            }
            if ((gs.adultsRaised || 0) >= 3 && grantSticker('dragonSticker')) {
                newStickers.push(STICKERS.dragonSticker);
            }
            const rels = gs.relationships || {};
            if (Object.values(rels).some(r => r.points >= 180) && grantSticker('heartSticker')) {
                newStickers.push(STICKERS.heartSticker);
            }

            // Streak stickers
            if (gs.streak && gs.streak.current >= 7 && grantSticker('streakFlame')) {
                newStickers.push(STICKERS.streakFlame);
            }

            return newStickers;
        }

        // Recommendation #3: Sticker progress pips — expose partial progress toward existing stickers
        function getStickerProgress() {
            const gs = gameState;
            const progress = [];
            const owned = gs.stickers || {};

            // Mini-game score stickers
            const scores = gs.minigameHighScores || {};
            const bestScore = Math.max(0, ...Object.values(scores));
            if (!owned.starSticker) progress.push({ stickerId: 'starSticker', label: 'Gold Star', emoji: '⭐', current: Math.min(bestScore, 25), target: 25, unit: 'best score' });
            if (!owned.trophySticker) progress.push({ stickerId: 'trophySticker', label: 'Trophy', emoji: '🏆', current: Math.min(bestScore, 50), target: 50, unit: 'best score' });

            // Weather stickers
            const ws = gs.weatherSeen || {};
            const weatherCount = (ws.sunny ? 1 : 0) + (ws.rainy ? 1 : 0) + (ws.snowy ? 1 : 0);
            if (!owned.rainbowSticker) progress.push({ stickerId: 'rainbowSticker', label: 'Rainbow', emoji: '🌈', current: weatherCount, target: 3, unit: 'weather types seen' });

            // Garden stickers
            const harvests = (gs.garden && gs.garden.totalHarvests) || 0;
            if (!owned.sproutSticker) progress.push({ stickerId: 'sproutSticker', label: 'Little Sprout', emoji: '🌱', current: Math.min(harvests, 1), target: 1, unit: 'harvests' });

            // Streak sticker
            const streakDays = (gs.streak && gs.streak.current) || 0;
            if (!owned.streakFlame) progress.push({ stickerId: 'streakFlame', label: 'Eternal Flame', emoji: '🔥', current: Math.min(streakDays, 7), target: 7, unit: 'day streak' });

            // Relationship sticker
            const rels = gs.relationships || {};
            const bestRel = Math.max(0, ...Object.values(rels).map(r => r.points || 0));
            if (!owned.heartSticker) progress.push({ stickerId: 'heartSticker', label: 'Big Heart', emoji: '💖', current: Math.min(bestRel, 180), target: 180, unit: 'relationship points' });

            // Adults raised stickers
            const adults = gs.adultsRaised || 0;
            if (!owned.unicornSticker) progress.push({ stickerId: 'unicornSticker', label: 'Unicorn', emoji: '🦄', current: Math.min(adults, 2), target: 2, unit: 'adults raised' });
            if (!owned.dragonSticker) progress.push({ stickerId: 'dragonSticker', label: 'Dragon', emoji: '🐉', current: Math.min(adults, 3), target: 3, unit: 'adults raised' });

            // Breeding stickers
            const breeds = gs.totalBreedings || 0;
            if (!owned.breedingEgg) progress.push({ stickerId: 'breedingEgg', label: 'Love Egg', emoji: '🥚', current: Math.min(breeds, 1), target: 1, unit: 'breedings' });
            if (!owned.familyTree) progress.push({ stickerId: 'familyTree', label: 'Family Tree', emoji: '🌳', current: Math.min(breeds, 3), target: 3, unit: 'breedings' });

            // Memorial stickers
            const memCount = (gs.memorials || []).length;
            if (!owned.wisdomSticker) progress.push({ stickerId: 'wisdomSticker', label: 'Book of Wisdom', emoji: '📖', current: Math.min(memCount, 5), target: 5, unit: 'memorials' });

            return progress;
        }

        // Grant pet-type-specific stickers based on care actions
        function checkPetActionSticker(action) {
            const pet = gameState.pet;
            if (!pet) return [];
            const newStickers = [];
            const type = pet.type;

            const stickerMap = {
                dog: { action: 'feed', stickerId: 'happyPup' },
                cat: { action: 'cuddle', stickerId: 'sleepyKitty' },
                bunny: { action: 'play', stickerId: 'bouncyBunny' },
                turtle: { action: 'wash', stickerId: 'tinyTurtle' },
                fish: { action: 'feed', stickerId: 'goldenFish' },
                bird: { action: 'play', stickerId: 'sweetBird' },
                panda: { action: 'cuddle', stickerId: 'cuddlyPanda' },
                penguin: { action: 'exercise', stickerId: 'royalPenguin' },
                hamster: { action: 'feed', stickerId: 'fuzzyHamster' },
                frog: { action: 'play', stickerId: 'happyFrog' },
                hedgehog: { action: 'cuddle', stickerId: 'spinyHedgehog' },
                unicorn: { action: 'play', stickerId: 'magicUnicorn' },
                dragon: { action: 'feed', stickerId: 'fierceDragon' }
            };

            const mapping = stickerMap[type];
            if (mapping && mapping.action === action && STICKERS[mapping.stickerId]) {
                if (grantSticker(mapping.stickerId)) {
                    newStickers.push(STICKERS[mapping.stickerId]);
                }
            }
            return newStickers;
        }

        // ==================== TROPHIES ====================

        function checkTrophies() {
            if (!gameState.trophies) gameState.trophies = {};
            const newTrophies = [];
            for (const [id, trophy] of Object.entries(TROPHIES)) {
                if (gameState.trophies[id]) continue;
                try {
                    if (trophy.check(gameState)) {
                        gameState.trophies[id] = { earned: true, earnedAt: Date.now() };
                        newTrophies.push(trophy);
                    }
                } catch (e) { /* safe guard */ }
            }
            return newTrophies;
        }

        function getTrophyCount() {
            if (!gameState.trophies) return 0;
            return Object.values(gameState.trophies).filter(t => t.earned).length;
        }

        // ==================== DAILY STREAKS ====================

        function updateStreak() {
            if (!gameState.streak) {
                gameState.streak = { current: 0, longest: 0, lastPlayDate: null, todayBonusClaimed: false, claimedMilestones: [] };
            }
            const streak = gameState.streak;
            if (!streak.prestige || typeof streak.prestige !== 'object') {
                streak.prestige = { cycleMonth: '', cycleBest: 0, lifetimeTier: 0, completedCycles: 0, claimedMonthlyReward: '' };
            }
            const today = getTodayString();
            const monthKey = getCurrentMonthKey();

            // Monthly prestige loop after day 30: reset cycle progress while preserving tier.
            if (streak.prestige.cycleMonth && streak.prestige.cycleMonth !== monthKey && (streak.current || 0) >= 30) {
                streak.prestige.completedCycles = (streak.prestige.completedCycles || 0) + 1;
                streak.prestige.lifetimeTier = Math.max(streak.prestige.lifetimeTier || 0, Math.floor((streak.prestige.completedCycles || 0) / 2));
                streak.current = 0;
                streak.claimedMilestones = [];
                streak.todayBonusClaimed = false;
                streak.prestige.claimedMonthlyReward = '';
            }
            if (!streak.prestige.cycleMonth) streak.prestige.cycleMonth = monthKey;
            if (streak.prestige.cycleMonth !== monthKey) streak.prestige.cycleMonth = monthKey;

            if (streak.lastPlayDate === today) {
                // Already updated today
                return;
            }

            // Check if last play was yesterday
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

            if (streak.lastPlayDate === yesterdayStr) {
                // Streak continues
                streak.current++;
            } else if (streak.lastPlayDate === null) {
                // First time playing
                streak.current = 1;
            } else {
                // Streak broken
                streak.current = 1;
            }

            streak.lastPlayDate = today;
            streak.todayBonusClaimed = false;
            if (streak.current > streak.longest) {
                streak.longest = streak.current;
            }
            streak.prestige.cycleBest = Math.max(streak.prestige.cycleBest || 0, streak.current || 0);
        }

        function claimStreakBonus() {
            const streak = gameState.streak;
            if (!streak || streak.todayBonusClaimed) return null;

            const bonus = getStreakBonus(streak.current);
            if (bonus.happiness === 0 && bonus.energy === 0) return null;

            const pet = gameState.pet;
            if (pet) {
                pet.happiness = clamp(pet.happiness + bonus.happiness, 0, 100);
                pet.energy = clamp(pet.energy + bonus.energy, 0, 100);
            }

            streak.todayBonusClaimed = true;

            // Check for unclaimed milestone rewards
            const unclaimedMilestones = [];
            if (!Array.isArray(streak.claimedMilestones)) streak.claimedMilestones = [];
            let hitMilestoneToday = false;
            for (const milestone of STREAK_MILESTONES) {
                if (streak.current >= milestone.days && !streak.claimedMilestones.includes(milestone.days)) {
                    streak.claimedMilestones.push(milestone.days);
                    const bundle = milestone.bundleId ? applyRewardBundle(milestone.bundleId, `Streak ${milestone.days}`) : null;
                    unclaimedMilestones.push({
                        ...milestone,
                        bundle
                    });
                    recordRewardRecapEvent('mid', `Streak milestone ${milestone.days}`, { days: milestone.days, bundleId: milestone.bundleId || null });
                    hitMilestoneToday = true;
                }
            }

            // Recommendation #4: Streak gap coin drip
            // Between major milestones (dead zones), grant streakDays × 2 coins daily as a fallback
            let streakDripCoins = 0;
            if (!hitMilestoneToday && streak.current > 1) {
                streakDripCoins = streak.current;
                addCoins(streakDripCoins, 'Streak Drip', true);
            }

            let prestigeReward = null;
            if (streak.current >= 30) {
                if (!streak.prestige || typeof streak.prestige !== 'object') {
                    streak.prestige = { cycleMonth: getCurrentMonthKey(), cycleBest: streak.current, lifetimeTier: 0, completedCycles: 0, claimedMonthlyReward: '' };
                }
                const monthKey = getCurrentMonthKey();
                const rewards = Array.isArray(STREAK_PRESTIGE_REWARDS) ? STREAK_PRESTIGE_REWARDS : [];
                if (rewards.length > 0 && streak.prestige.claimedMonthlyReward !== monthKey) {
                    const stage = getRewardPhaseStage();
                    prestigeReward = pickStageWeightedPrestigeReward(rewards, stage, `prestige:${monthKey}:${stage}`);
                    // Recommendation #8: Prestige escalation — +20 coins per completed cycle, cap 400
                    const prestigeBaseCoins = prestigeReward.coins || 280;
                    const prestigeEscalation = Math.min(400, prestigeBaseCoins + ((streak.prestige.completedCycles || 0) * 20));
                    if (prestigeEscalation > 0) addCoins(prestigeEscalation, `${prestigeReward.icon} Prestige`, true);
                    if (prestigeReward.modifierId) addGameplayModifier(prestigeReward.modifierId, `${prestigeReward.icon} Prestige`);
                    if (prestigeReward.collectible) grantBundleCollectible(prestigeReward.collectible);
                    streak.prestige.claimedMonthlyReward = monthKey;
                    streak.prestige.completedCycles = Math.max(1, streak.prestige.completedCycles || 0);
                    streak.prestige.lifetimeTier = Math.max(streak.prestige.lifetimeTier || 0, Math.floor((streak.prestige.completedCycles || 0) / 2));
                    if (typeof addJournalEntry === 'function') {
                        addJournalEntry('🌠', `Prestige reward unlocked: ${prestigeReward.icon} ${prestigeReward.label}.`);
                    }
                    recordRewardRecapEvent('long', 'Streak prestige reward', { monthKey, rewardId: prestigeReward.id || null });
                }
            }

            saveGame();
            return { bonus, milestones: unclaimedMilestones, prestigeReward, streakDripCoins: streakDripCoins || 0 };
        }

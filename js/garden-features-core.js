(function(root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.GardenFeaturesCore = factory();
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function() {
    'use strict';

    const MINUTE_MS = 60 * 1000;
    const HOUR_MS = 60 * MINUTE_MS;
    const DAY_MS = 24 * HOUR_MS;

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function safeNumber(value, fallback) {
        return Number.isFinite(value) ? value : fallback;
    }

    function formatFriendlyDuration(ms) {
        const remaining = Math.max(0, Math.floor(safeNumber(ms, 0)));
        if (remaining <= 0) return 'Ready now';
        const totalMinutes = Math.ceil(remaining / MINUTE_MS);
        if (totalMinutes < 60) {
            return `Ready in ${totalMinutes} minute${totalMinutes === 1 ? '' : 's'}`;
        }
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        if (hours < 24) {
            if (minutes === 0) return `Ready in ${hours} hour${hours === 1 ? '' : 's'}`;
            return `Ready in ${hours}h ${minutes}m`;
        }
        const days = Math.floor(hours / 24);
        const remHours = hours % 24;
        if (remHours === 0) return `Ready in ${days} day${days === 1 ? '' : 's'}`;
        return `Ready in ${days}d ${remHours}h`;
    }

    function getPlotCapacity(expansionTier, expansionTiers, basePlots) {
        const base = Math.max(1, Math.floor(safeNumber(basePlots, 6)));
        const tiers = Array.isArray(expansionTiers) ? expansionTiers : [];
        const tierCount = Math.max(0, Math.floor(safeNumber(expansionTier, 0)));
        let total = base;
        for (let i = 0; i < tierCount && i < tiers.length; i++) {
            total += Math.max(0, Math.floor(safeNumber(tiers[i].additionalPlots, 0)));
        }
        return Math.max(base, total);
    }

    function getUnlockedPlots(totalHarvests, expansionTier, config) {
        const cfg = config || {};
        const thresholds = Array.isArray(cfg.unlockThresholds) ? cfg.unlockThresholds : [0, 2, 5, 10, 16, 24];
        const capacity = getPlotCapacity(expansionTier, cfg.expansionTiers || [], safeNumber(cfg.basePlots, 6));
        let unlocked = 0;
        for (let i = 0; i < thresholds.length && i < capacity; i++) {
            if (safeNumber(totalHarvests, 0) >= thresholds[i]) unlocked = i + 1;
            else break;
        }
        return clamp(unlocked, 0, capacity);
    }

    function isSeasonAllowed(plantDef, season) {
        if (!plantDef || !Array.isArray(plantDef.seasons) || plantDef.seasons.length === 0) return true;
        return plantDef.seasons.includes(season);
    }

    function getPlantFirstMatureMs(plantDef) {
        if (!plantDef) return 3 * MINUTE_MS;
        if (Number.isFinite(plantDef.firstMatureMinutes)) {
            return Math.max(MINUTE_MS, Math.floor(plantDef.firstMatureMinutes * MINUTE_MS));
        }
        if (Number.isFinite(plantDef.growTime)) {
            return Math.max(MINUTE_MS, Math.floor(plantDef.growTime * 3 * MINUTE_MS));
        }
        return 3 * MINUTE_MS;
    }

    function getFruitHarvestCooldownMs(plantDef) {
        if (!plantDef) return 6 * HOUR_MS;
        if (Number.isFinite(plantDef.harvestCooldownMinutes)) {
            return Math.max(MINUTE_MS, Math.floor(plantDef.harvestCooldownMinutes * MINUTE_MS));
        }
        return 6 * HOUR_MS;
    }

    function getPlotSpeedMultiplier(plot, options) {
        const opts = options || {};
        let speed = safeNumber(opts.baseMultiplier, 1);
        speed *= safeNumber(opts.seasonMultiplier, 1);
        if (opts.offSeason) speed *= safeNumber(opts.offSeasonGrowthMultiplier, 0.35);

        const waterBoost = safeNumber(opts.waterGrowthMultiplier, 1.22);
        const fertBoost = safeNumber(opts.fertilizerGrowthBoost, 0.2);
        const pestMult = safeNumber(opts.pestSlowMultiplier, 0.65);

        if (safeNumber(plot.wateredUntil, 0) > safeNumber(opts.now, 0)) speed *= waterBoost;
        if (safeNumber(plot.fertilizerCharges, 0) > 0) speed *= (1 + (Math.min(3, plot.fertilizerCharges) * fertBoost));
        if (safeNumber(plot.pestUntil, 0) > safeNumber(opts.now, 0)) speed *= pestMult;

        return Math.max(0.01, speed);
    }

    function advancePlantPlot(plot, plantDef, options) {
        if (!plot || !plantDef) return { stageChanged: false, becameReady: false, firstMature: false, ready: false };

        const now = safeNumber(options && options.now, Date.now());
        const lastUpdatedAt = safeNumber(plot.lastUpdatedAt, safeNumber(plot.plantedAt, now));
        const elapsedMs = Math.max(0, now - lastUpdatedAt);

        if (!Number.isFinite(plot.growthProgressMs)) {
            const legacyTicks = safeNumber(plot.growTicks, 0);
            plot.growthProgressMs = legacyTicks * MINUTE_MS;
        }
        if (!Number.isFinite(plot.plantedAt)) plot.plantedAt = now;
        if (!Number.isFinite(plot.lastUpdatedAt)) plot.lastUpdatedAt = lastUpdatedAt;
        if (!Number.isFinite(plot.stage)) plot.stage = 0;

        const offSeason = !!(options && options.offSeason);
        const speed = getPlotSpeedMultiplier(plot, {
            now,
            baseMultiplier: safeNumber(options && options.baseMultiplier, 1),
            seasonMultiplier: safeNumber(options && options.seasonMultiplier, 1),
            offSeason,
            offSeasonGrowthMultiplier: safeNumber(options && options.offSeasonGrowthMultiplier, 0.35),
            waterGrowthMultiplier: safeNumber(options && options.waterGrowthMultiplier, 1.22),
            fertilizerGrowthBoost: safeNumber(options && options.fertilizerGrowthBoost, 0.2),
            pestSlowMultiplier: safeNumber(options && options.pestSlowMultiplier, 0.65)
        });

        if (elapsedMs > 0 && plot.stage < 3) {
            plot.growthProgressMs += elapsedMs * speed;
        }

        const firstMatureMs = getPlantFirstMatureMs(plantDef);
        const rawStage = Math.floor((plot.growthProgressMs / firstMatureMs) * 3);
        const computedStage = clamp(rawStage, 0, 3);
        const previousStage = plot.stage;
        let firstMature = false;

        if (computedStage > plot.stage) {
            plot.stage = computedStage;
            if (computedStage >= 3 && !Number.isFinite(plot.firstMatureAt)) {
                plot.firstMatureAt = now;
                firstMature = true;
            }
        }

        const isFruitTree = plantDef.plantType === 'fruitTree';
        if (isFruitTree && plot.stage >= 3) {
            const cooldownMs = getFruitHarvestCooldownMs(plantDef);
            if (!Number.isFinite(plot.nextHarvestAt)) plot.nextHarvestAt = safeNumber(plot.firstMatureAt, now);
            plot.harvestReady = now >= plot.nextHarvestAt;
            if (!plot.harvestReady) {
                // Mature but waiting for next cycle.
                plot.stage = 2;
            } else {
                plot.stage = 3;
            }
        } else if (plot.stage >= 3) {
            plot.harvestReady = true;
        }

        plot.lastUpdatedAt = now;

        const stageChanged = plot.stage !== previousStage;
        return {
            stageChanged,
            becameReady: plot.stage >= 3 && previousStage < 3,
            firstMature,
            ready: plot.stage >= 3,
            nextHarvestAt: safeNumber(plot.nextHarvestAt, 0)
        };
    }

    function getHarvestYield(plot, plantDef, options) {
        const opts = options || {};
        const baseYield = Math.max(1, Math.floor(safeNumber(plantDef && plantDef.harvestYield, 1)));
        let total = baseYield;

        if (safeNumber(plot && plot.fertilizerCharges, 0) > 0) {
            total += Math.max(0, Math.floor(safeNumber(opts.fertilizerYieldBonus, 1) * Math.min(2, plot.fertilizerCharges)));
        }
        if (opts.offSeason) {
            total = Math.max(1, Math.floor(total * safeNumber(opts.offSeasonYieldMultiplier, 0.75)));
        }
        if (safeNumber(plot && plot.pestUntil, 0) > safeNumber(opts.now, Date.now())) {
            total = Math.max(1, Math.floor(total * safeNumber(opts.pestYieldMultiplier, 0.7)));
        }

        return total;
    }

    function afterHarvest(plot, plantDef, options) {
        const now = safeNumber(options && options.now, Date.now());
        if (!plot || !plantDef) return { keepPlot: false };

        if (safeNumber(plot.fertilizerCharges, 0) > 0) {
            plot.fertilizerCharges = Math.max(0, plot.fertilizerCharges - 1);
        }

        if (plantDef.plantType === 'fruitTree') {
            const cooldownMs = getFruitHarvestCooldownMs(plantDef);
            plot.stage = 2;
            plot.harvestReady = false;
            plot.nextHarvestAt = now + cooldownMs;
            plot.lastHarvestAt = now;
            return { keepPlot: true, nextHarvestAt: plot.nextHarvestAt };
        }

        return { keepPlot: false };
    }

    function computeFlowerMoodBonus(flowerIds, plantRegistry, config) {
        const cfg = config || {};
        const ids = Array.isArray(flowerIds) ? flowerIds : [];
        const defs = plantRegistry || {};
        const diminish = clamp(safeNumber(cfg.diminishingRate, 0.76), 0.2, 1);
        const maxMoodPerDay = Math.max(0, safeNumber(cfg.maxMoodPerDay, 24));

        const values = ids
            .map((id) => {
                const def = defs[id];
                return Math.max(0, safeNumber(def && def.moodPerMinute, 0));
            })
            .filter((value) => value > 0)
            .sort((a, b) => b - a);

        let perMinute = 0;
        for (let i = 0; i < values.length; i++) {
            perMinute += values[i] * Math.pow(diminish, i);
        }
        const perDay = clamp(perMinute * 1440, 0, maxMoodPerDay);

        return {
            perMinute: perDay / 1440,
            perDay,
            flowerCount: values.length
        };
    }

    function createDefaultCompostState(now) {
        const ts = safeNumber(now, Date.now());
        return {
            queue: [],
            active: null,
            readyFertilizer: 0,
            maxQueue: 8,
            lastUpdatedAt: ts
        };
    }

    function enqueueCompostItem(compostState, entry) {
        const state = compostState || createDefaultCompostState(Date.now());
        if (!entry || !entry.itemId) return { ok: false, reason: 'invalid-entry', state };

        const queueCount = Array.isArray(state.queue) ? state.queue.length : 0;
        const maxQueue = Math.max(1, Math.floor(safeNumber(state.maxQueue, 8)));
        if (queueCount >= maxQueue) return { ok: false, reason: 'queue-full', state };

        if (!Array.isArray(state.queue)) state.queue = [];
        state.queue.push({
            itemId: entry.itemId,
            amount: Math.max(1, Math.floor(safeNumber(entry.amount, 1))),
            durationMs: Math.max(MINUTE_MS, Math.floor(safeNumber(entry.durationMs, 30 * MINUTE_MS))),
            fertilizerYield: Math.max(1, Math.floor(safeNumber(entry.fertilizerYield, 1))),
            enqueuedAt: safeNumber(entry.enqueuedAt, Date.now())
        });
        return { ok: true, state };
    }

    function tickCompostState(compostState, now) {
        const state = compostState || createDefaultCompostState(now);
        const ts = safeNumber(now, Date.now());

        if (!Array.isArray(state.queue)) state.queue = [];
        if (!Number.isFinite(state.readyFertilizer)) state.readyFertilizer = 0;

        if (!state.active && state.queue.length > 0) {
            const next = state.queue.shift();
            const startAt = Number.isFinite(next.enqueuedAt) ? next.enqueuedAt : ts;
            state.active = {
                itemId: next.itemId,
                amount: next.amount,
                fertilizerYield: next.fertilizerYield,
                startedAt: startAt,
                completeAt: startAt + next.durationMs
            };
        }

        let produced = 0;
        let safety = 0;
        while (state.active && ts >= state.active.completeAt && safety < 64) {
            const previousCompleteAt = state.active.completeAt;
            produced += Math.max(1, Math.floor(safeNumber(state.active.fertilizerYield, 1)));
            state.readyFertilizer += Math.max(1, Math.floor(safeNumber(state.active.fertilizerYield, 1)));
            state.active = null;
            if (state.queue.length > 0) {
                const next = state.queue.shift();
                const startAt = Number.isFinite(next.enqueuedAt) ? Math.max(next.enqueuedAt, previousCompleteAt) : previousCompleteAt;
                state.active = {
                    itemId: next.itemId,
                    amount: next.amount,
                    fertilizerYield: next.fertilizerYield,
                    startedAt: startAt,
                    completeAt: startAt + Math.max(MINUTE_MS, Math.floor(safeNumber(next.durationMs, 30 * MINUTE_MS)))
                };
            }
            safety++;
        }

        state.lastUpdatedAt = ts;
        return {
            state,
            produced,
            activeProgress: state.active
                ? clamp((ts - state.active.startedAt) / Math.max(1, state.active.completeAt - state.active.startedAt), 0, 1)
                : 0
        };
    }

    function collectCompostFertilizer(compostState) {
        const state = compostState || createDefaultCompostState(Date.now());
        const amount = Math.max(0, Math.floor(safeNumber(state.readyFertilizer, 0)));
        state.readyFertilizer = 0;
        return amount;
    }

    function sprinklerCoversPlot(sprinkler, plotIndex) {
        if (!sprinkler) return false;
        const center = Math.floor(safeNumber(sprinkler.plotIndex, 0));
        const radius = Math.max(0, Math.floor(safeNumber(sprinkler.radius, 1)));
        return Math.abs(center - plotIndex) <= radius;
    }

    function runSprinklers(sprinklers, plots, now, options) {
        const list = Array.isArray(sprinklers) ? sprinklers : [];
        const plotList = Array.isArray(plots) ? plots : [];
        const ts = safeNumber(now, Date.now());
        const opts = options || {};
        const defaultIntervalMs = Math.max(MINUTE_MS, Math.floor(safeNumber(opts.defaultIntervalMs, 6 * HOUR_MS)));
        const waterDurationMs = Math.max(MINUTE_MS, Math.floor(safeNumber(opts.waterDurationMs, 2 * HOUR_MS)));
        let wateredPlots = 0;

        list.forEach((sprinkler) => {
            if (!sprinkler) return;
            if (!Number.isFinite(sprinkler.nextWaterAt)) sprinkler.nextWaterAt = ts + defaultIntervalMs;
            const intervalMs = Math.max(MINUTE_MS, Math.floor(safeNumber(sprinkler.intervalMs, defaultIntervalMs)));
            if (ts < sprinkler.nextWaterAt) return;

            const intervalsPassed = Math.floor((ts - sprinkler.nextWaterAt) / intervalMs) + 1;
            sprinkler.nextWaterAt += intervalsPassed * intervalMs;

            plotList.forEach((plot, index) => {
                if (!plot || plot.stage >= 3) return;
                if (!sprinklerCoversPlot(sprinkler, index)) return;
                // Skip fruit trees in cooldown (stage 2 with nextHarvestAt in future) — watering has no effect
                if (plot.type === 'fruittree' && plot.stage === 2 && Number.isFinite(plot.nextHarvestAt) && ts < plot.nextHarvestAt) return;
                plot.wateredUntil = ts + waterDurationMs;
                wateredPlots++;
            });
        });

        return { wateredPlots };
    }

    function computePestRisk(plantDef, coveredByScarecrow, options) {
        const opts = options || {};
        const baseDailyRisk = clamp(safeNumber(plantDef && plantDef.pestRiskPerDay, safeNumber(opts.defaultDailyRisk, 0.08)), 0, 1);
        const seasonMultiplier = Math.max(0, safeNumber(opts.seasonRiskMultiplier, 1));
        const scarecrowReduction = clamp(safeNumber(opts.scarecrowReduction, 0.65), 0, 1);
        let daily = baseDailyRisk * seasonMultiplier;
        if (coveredByScarecrow) daily *= (1 - scarecrowReduction);
        return clamp(daily, 0, 1);
    }

    function rollPestEvent(dailyRisk, elapsedMinutes, randomValue) {
        const minutes = Math.max(1, Math.floor(safeNumber(elapsedMinutes, 1)));
        const pMinute = clamp(safeNumber(dailyRisk, 0) / 1440, 0, 1);
        const intervalRisk = 1 - Math.pow(1 - pMinute, minutes);
        return clamp(safeNumber(randomValue, Math.random()), 0, 1) < intervalRisk;
    }

    function runCrossbreeding(plots, recipes, options) {
        const plotList = Array.isArray(plots) ? plots : [];
        const recipeList = Array.isArray(recipes) ? recipes : [];
        const opts = options || {};
        const discovered = opts.discovered || {};
        const logs = [];
        const unlocks = [];

        function matches(recipe, leftId, rightId) {
            const a = recipe && recipe.parentA;
            const b = recipe && recipe.parentB;
            if (!a || !b) return false;
            return (leftId === a && rightId === b) || (leftId === b && rightId === a);
        }

        for (let i = 0; i < plotList.length - 1; i++) {
            const left = plotList[i];
            const right = plotList[i + 1];
            if (!left || !right) continue;
            if (safeNumber(left.stage, 0) < 1 || safeNumber(right.stage, 0) < 1) continue;
            const leftId = left.cropId;
            const rightId = right.cropId;
            if (!leftId || !rightId) continue;

            for (let r = 0; r < recipeList.length; r++) {
                const recipe = recipeList[r];
                if (!matches(recipe, leftId, rightId)) continue;
                const seedId = recipe.result;
                if (!seedId) continue;

                const chance = clamp(safeNumber(recipe.chance, 0.2), 0, 1);
                const roll = clamp(safeNumber(typeof opts.rng === 'function' ? opts.rng() : Math.random(), Math.random()), 0, 1);
                const msgBase = `${leftId} + ${rightId} -> ${seedId}`;
                if (roll <= chance) {
                    logs.push(`${msgBase}: success (${roll.toFixed(3)} <= ${chance.toFixed(3)})`);
                    if (!discovered[seedId]) {
                        discovered[seedId] = true;
                        unlocks.push(seedId);
                    }
                } else {
                    logs.push(`${msgBase}: miss (${roll.toFixed(3)} > ${chance.toFixed(3)})`);
                }
            }
        }

        return { discovered, unlocks, logs };
    }

    function createDefaultBeehiveState(now) {
        const ts = safeNumber(now, Date.now());
        return {
            placed: false,
            storedHoney: 0,
            capacity: 20,
            progress: 0,
            lastUpdatedAt: ts
        };
    }

    function tickBeehive(beehiveState, now, options) {
        const hive = beehiveState || createDefaultBeehiveState(now);
        const ts = safeNumber(now, Date.now());
        const opts = options || {};
        if (!hive.placed) {
            hive.lastUpdatedAt = ts;
            return { produced: 0, stored: hive.storedHoney || 0 };
        }

        const elapsedMs = Math.max(0, ts - safeNumber(hive.lastUpdatedAt, ts));
        const elapsedHours = elapsedMs / HOUR_MS;
        const baseRate = Math.max(0, safeNumber(opts.baseHoneyPerHour, 0.5));
        const flowers = Math.max(0, Math.floor(safeNumber(opts.flowerCount, 0)));
        const flowerBoostPerFlower = Math.max(0, safeNumber(opts.flowerBoostPerFlower, 0.12));
        const maxFlowerBoost = Math.max(0, safeNumber(opts.maxFlowerBoost, 1.0));
        const boost = Math.min(maxFlowerBoost, flowers * flowerBoostPerFlower);
        const effectiveRate = baseRate * (1 + boost);

        if (!Number.isFinite(hive.progress)) hive.progress = 0;
        hive.progress += elapsedHours * effectiveRate;

        let produced = 0;
        if (hive.progress >= 1) {
            produced = Math.floor(hive.progress);
            hive.progress -= produced;
            const capacity = Math.max(1, Math.floor(safeNumber(hive.capacity, 20)));
            const current = Math.max(0, Math.floor(safeNumber(hive.storedHoney, 0)));
            hive.storedHoney = clamp(current + produced, 0, capacity);
            if (hive.storedHoney >= capacity) hive.progress = 0;
        }

        hive.lastUpdatedAt = ts;
        return { produced, stored: hive.storedHoney };
    }

    function collectBeehiveHoney(beehiveState) {
        const hive = beehiveState || createDefaultBeehiveState(Date.now());
        const amount = Math.max(0, Math.floor(safeNumber(hive.storedHoney, 0)));
        hive.storedHoney = 0;
        return amount;
    }

    return {
        MINUTE_MS,
        HOUR_MS,
        DAY_MS,
        clamp,
        formatFriendlyDuration,
        getPlotCapacity,
        getUnlockedPlots,
        isSeasonAllowed,
        getPlantFirstMatureMs,
        getFruitHarvestCooldownMs,
        advancePlantPlot,
        getHarvestYield,
        afterHarvest,
        computeFlowerMoodBonus,
        createDefaultCompostState,
        enqueueCompostItem,
        tickCompostState,
        collectCompostFertilizer,
        sprinklerCoversPlot,
        runSprinklers,
        computePestRisk,
        rollPestEvent,
        runCrossbreeding,
        createDefaultBeehiveState,
        tickBeehive,
        collectBeehiveHoney
    };
}));
